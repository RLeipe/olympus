// Prints a markdown summary of recent training (plan vs. actual, notes, long-term trends)
// for planning sessions with Claude.
//
//   npm run snapshot -- [user] [weeks]        (defaults: Roman, 6 weeks)
//
// Reads through the public REST API with the anon key, the same access the website has.
// Needs SUPABASE_URL and SUPABASE_ANON_KEY (or the VITE_-prefixed names) in the environment.
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parsePlanFile, mergePlans, formatPace } from '../src/utils/planCore.js'
import { buildActuals, matchPlan, RUN_SPORTS } from '../src/utils/matching.js'
import { addDays, addMonths, startOfMonth, startOfWeek, today, parseISODate } from '../src/utils/dates.js'

const [userName = 'Roman', weeksArg = '6'] = process.argv.slice(2)
const weeks = Number(weeksArg)
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY')
  process.exit(1)
}

const PAGE_SIZE = 1000

// GET from the REST API, following pagination
async function rest(path) {
  const rows = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const res = await fetch(`${url}/rest/v1/${path}&limit=${PAGE_SIZE}&offset=${offset}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    })
    if (!res.ok) throw new Error(`GET ${path.split('?')[0]} failed (${res.status}): ${await res.text()}`)
    const page = await res.json()
    rows.push(...page)
    if (page.length < PAGE_SIZE) return rows
  }
}

// Tables from the latest migration may not exist yet
async function restOrEmpty(path) {
  try {
    return await rest(path)
  } catch (err) {
    if (/\((404|400)\)/.test(err.message) && /does not exist|Could not find/.test(err.message)) return []
    throw err
  }
}

const todayIso = today()
const from = addDays(startOfWeek(todayIso), -7 * (weeks - 1))
const planUntil = addDays(startOfWeek(todayIso), 13)
const strengthSince = addMonths(todayIso, -5)
const runsSince = addMonths(todayIso, -11)

const users = await rest('users?select=id,name')
const user = users.find(u => u.name.toLowerCase() === userName.toLowerCase())
if (!user) {
  console.error(`No user named ${userName}`)
  process.exit(1)
}

const allSets = await rest(
  `workout_sets?select=workout_date,reps,weight,set_number,exercises(name,metric_type)` +
  `&user_id=eq.${user.id}&workout_date=gte.${[strengthSince, addDays(from, -1)].sort()[0]}` +
  `&order=workout_date,set_number`)
const allActivities = await restOrEmpty(
  `activities?select=strava_id,activity_date,sport_type,name,distance_m,moving_time_s,elevation_m,avg_hr,max_hr,avg_speed,laps` +
  `&user_id=eq.${user.id}&activity_date=gte.${[runsSince, addDays(from, -1)].sort()[0]}&order=start_time`)
const notes = await restOrEmpty(`day_notes?select=date,note&user_id=eq.${user.id}&date=gte.${from}&order=date`)

const toNumber = v => (v == null ? null : Number(v))
for (const a of allActivities) {
  for (const k of ['distance_m', 'elevation_m', 'avg_hr', 'max_hr', 'avg_speed']) a[k] = toNumber(a[k])
}
const recentStart = addDays(from, -1)
const sets = allSets.filter(s => s.workout_date >= recentStart)
const activities = allActivities.filter(a => a.activity_date >= recentStart)

// Plan files from the repo
const planDir = new URL(`../plan/${user.name.toLowerCase()}/`, import.meta.url).pathname
const parsed = existsSync(planDir)
  ? readdirSync(planDir).filter(f => f.endsWith('.yaml'))
      .map(f => parsePlanFile(readFileSync(join(planDir, f), 'utf8'), f))
  : []
const plan = mergePlans(parsed)
const sessions = plan.sessions.filter(s => s.date >= addDays(from, -1) && s.date <= planUntil)
const { results, extras } = matchPlan(sessions, buildActuals(sets, activities), todayIso)

const out = []
out.push(`# Training snapshot: ${user.name}, ${from} to ${todayIso}\n`)
if (plan.errors.length) out.push(`**Plan errors:** ${plan.errors.join('; ')}\n`)

out.push('## Day by day (plan vs. actual)\n')
const notesByDate = Object.fromEntries(notes.map(n => [n.date, n.note]))
for (let date = from; date <= planUntil; date = addDays(date, 1)) {
  if (date === startOfWeek(date)) out.push(`\n### Week of ${date}`)
  const lines = []
  for (const r of results.filter(r => r.session.date === date)) {
    const e = r.evaluation
    const detail = [...(e.issues || []), ...(e.flags || [])].join('; ')
    const moved = r.actual && r.actual.date !== date ? ` (done ${r.actual.date})` : ''
    lines.push(`- PLAN ${describePlan(r.session)} → **${e.status}**${moved}${detail ? `: ${detail}` : ''}`)
    if (r.actual) lines.push(`  - actual: ${describeActual(r.actual)}`)
  }
  for (const a of extras.filter(a => a.date === date)) lines.push(`- UNPLANNED ${describeActual(a)}`)
  if (notesByDate[date]) lines.push(`- NOTE: ${notesByDate[date].replace(/\n/g, ' / ')}`)
  if (lines.length) out.push(`**${date} ${parseISODate(date).toLocaleDateString('en-GB', { weekday: 'short' })}**\n${lines.join('\n')}`)
}

out.push('\n## Running per month (last 12 months)\n')
const runMonths = {}
for (const a of allActivities.filter(a => RUN_SPORTS.includes(a.sport_type) && a.activity_date >= startOfMonth(runsSince))) {
  const m = (runMonths[a.activity_date.slice(0, 7)] ||= { runs: 0, km: 0, longest_km: 0, hr: [] })
  m.runs++
  m.km += a.distance_m / 1000
  m.longest_km = Math.max(m.longest_km, a.distance_m / 1000)
  if (a.avg_hr) m.hr.push(a.avg_hr)
}
out.push(table(['month', 'runs', 'km', 'longest_km', 'avg_hr'], Object.entries(runMonths).sort().map(([month, m]) => ({
  month,
  runs: m.runs,
  km: m.km.toFixed(1),
  longest_km: m.longest_km.toFixed(1),
  avg_hr: m.hr.length ? Math.round(m.hr.reduce((x, y) => x + y, 0) / m.hr.length) : ''
}))))

out.push('\n## Strength bests per month (last 6 months)\n')
const bests = {}
for (const s of allSets.filter(s => s.workout_date >= startOfMonth(strengthSince))) {
  const name = s.exercises?.name || 'Unknown'
  const k = `${name}|${s.workout_date.slice(0, 7)}`
  const b = (bests[k] ||= { exercise: name, month: s.workout_date.slice(0, 7), sets: 0, max_kg: null, max_reps: 0, timed: s.exercises?.metric_type === 'time_based' })
  b.sets++
  if (s.weight != null) b.max_kg = Math.max(b.max_kg ?? 0, Number(s.weight))
  b.max_reps = Math.max(b.max_reps, s.reps)
}
out.push(table(['exercise', 'month', 'sets', 'max_kg', 'max_reps'], Object.keys(bests).sort().map(k => ({
  ...bests[k],
  max_reps: bests[k].timed ? `${bests[k].max_reps}s` : bests[k].max_reps
}))))

console.log(out.join('\n'))

function describePlan(s) {
  if (s.type === 'strength') {
    return `strength: ${s.exercises.map(e => `${e.name} ${e.sets}x${e.seconds !== undefined ? `${e.seconds}s` : e.reps}${e.weight ? `@${e.weight}` : ''}`).join(', ')}`
  }
  if (s.type === 'run') {
    const iv = s.intervals ? `, ${s.intervals.reps}x${s.intervals.distance_m}m${s.intervals.pace ? `@${s.intervals.pace}` : ''}` : ''
    return `${s.kind} run ${s.distance_km ?? '?'} km${s.max_hr ? `, HR<${s.max_hr}` : ''}${s.pace ? `, ${s.pace}/km` : ''}${iv}`
  }
  return `${s.type}${s.title ? `: ${s.title}` : ''}`
}

function describeActual(a) {
  if (a.source === 'log') {
    return `strength: ${a.exercises.map(e => `${e.name} ${e.sets.map(s => (e.metricType === 'time_based' ? `${s.reps}s` : s.reps)).join('/')}${e.sets[0].weight ? `@${e.sets[0].weight}` : ''}`).join(', ')}`
  }
  const x = a.activity
  const km = x.distance_m / 1000
  const parts = [`${x.sport_type} ${km.toFixed(1)} km`, `${Math.round(x.moving_time_s / 60)} min`]
  if (km > 0.5) parts.push(`${formatPace(x.moving_time_s / km)}/km`)
  if (x.avg_hr) parts.push(`HR ${Math.round(x.avg_hr)}/${Math.round(x.max_hr)}`)
  if (x.elevation_m) parts.push(`+${Math.round(x.elevation_m)} m`)
  if (x.laps?.length > 1) parts.push(`laps ${x.laps.map(l => `${Math.round(l.distance_m)}m@${formatPace(1000 / l.avg_speed)}`).join(' ')}`)
  return parts.join(', ')
}

function table(columns, rows) {
  if (!rows.length) return '(no data)'
  return [
    `| ${columns.join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map(r => `| ${columns.map(c => r[c] ?? '').join(' | ')} |`)
  ].join('\n')
}
