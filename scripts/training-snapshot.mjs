// Prints a markdown summary of recent training (plan vs. actual, notes, long-term trends)
// for planning sessions with Claude.
//
//   SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=... npm run snapshot -- [user] [weeks]
//
// Uses the Supabase Management API (read-only SQL). Defaults: user "Roman", 6 weeks.
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parsePlanFile, mergePlans, formatPace } from '../src/utils/planCore.js'
import { buildActuals, matchPlan } from '../src/utils/matching.js'
import { addDays, startOfWeek, today, parseISODate } from '../src/utils/dates.js'

const [userName = 'Roman', weeksArg = '6'] = process.argv.slice(2)
const weeks = Number(weeksArg)
const { SUPABASE_ACCESS_TOKEN: token, SUPABASE_PROJECT_REF: ref } = process.env
if (!token || !ref) {
  console.error('Set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF')
  process.exit(1)
}

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  })
  if (!res.ok) throw new Error(`SQL failed (${res.status}): ${await res.text()}`)
  return res.json()
}

async function sqlOrEmpty(query) {
  try {
    return await sql(query)
  } catch (err) {
    if (/does not exist/.test(err.message)) return []
    throw err
  }
}

const quote = value => `'${String(value).replace(/'/g, "''")}'`

const todayIso = today()
const from = addDays(startOfWeek(todayIso), -7 * (weeks - 1))
const planUntil = addDays(startOfWeek(todayIso), 13)

const [user] = await sql(`select id, name from users where lower(name) = lower(${quote(userName)})`)
if (!user) {
  console.error(`No user named ${userName}`)
  process.exit(1)
}
const uid = quote(user.id)

const sets = await sql(`
  select ws.workout_date::text, ws.reps, ws.weight::float, ws.set_number,
         json_build_object('name', e.name, 'metric_type', e.metric_type) as exercises
  from workout_sets ws join exercises e on e.id = ws.exercise_id
  where ws.user_id = ${uid} and ws.workout_date >= ${quote(addDays(from, -1))}
  order by ws.workout_date, e.name, ws.set_number`)
const activities = await sqlOrEmpty(`
  select strava_id, activity_date::text, sport_type, name, distance_m::float, moving_time_s,
         elevation_m::float, avg_hr::float, max_hr::float, avg_speed::float, laps
  from activities where user_id = ${uid} and activity_date >= ${quote(addDays(from, -1))}
  order by start_time`)
const notes = await sqlOrEmpty(`
  select date::text, note from day_notes where user_id = ${uid} and date >= ${quote(from)} order by date`)

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
const runMonths = await sqlOrEmpty(`
  select to_char(activity_date, 'YYYY-MM') as month, count(*) as runs,
         round(sum(distance_m)::numeric / 1000, 1) as km, round(max(distance_m)::numeric / 1000, 1) as longest_km,
         round(avg(avg_hr)::numeric) as avg_hr
  from activities
  where user_id = ${uid} and sport_type in ('Run', 'TrailRun', 'VirtualRun')
    and activity_date >= (current_date - interval '12 months')
  group by 1 order by 1`)
out.push(table(['month', 'runs', 'km', 'longest_km', 'avg_hr'], runMonths))

out.push('\n## Strength bests per month (last 6 months)\n')
const bests = await sql(`
  select to_char(ws.workout_date, 'YYYY-MM') as month, e.name as exercise, e.metric_type,
         max(ws.weight)::float as max_kg, max(ws.reps) as max_reps, count(*) as sets
  from workout_sets ws join exercises e on e.id = ws.exercise_id
  where ws.user_id = ${uid} and ws.workout_date >= (current_date - interval '6 months')
  group by 1, 2, 3 order by 2, 1`)
out.push(table(['exercise', 'month', 'sets', 'max_kg', 'max_reps'], bests.map(b => ({
  ...b,
  max_reps: b.metric_type === 'time_based' ? `${b.max_reps}s` : b.max_reps
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
    return `strength: ${a.exercises.map(e => `${e.name} ${e.sets.map(s => s.reps).join('/')}${e.sets[0].weight ? `@${e.sets[0].weight}` : ''}`).join(', ')}`
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
