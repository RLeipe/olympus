// Training plan parsing and validation. Pure ES module: used by the app and by scripts/check-plan.mjs.
// The file format is documented in plan/README.md.
import yaml from 'js-yaml'

export const SESSION_TYPES = ['run', 'strength', 'other', 'rest']
export const RUN_KINDS = ['easy', 'long', 'tempo', 'intervals', 'recovery', 'race']

const SESSION_KEYS = {
  common: ['date', 'type', 'title', 'notes'],
  run: ['kind', 'distance_km', 'elevation_m', 'max_hr', 'pace', 'intervals'],
  strength: ['exercises'],
  other: ['duration_min'],
  rest: []
}
const EXERCISE_KEYS = ['name', 'sets', 'reps', 'weight', 'seconds', 'notes']
const INTERVAL_KEYS = ['reps', 'distance_m', 'duration_s', 'pace', 'recovery']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const PACE_RE = /^\d{1,2}:\d{2}$/

// "800 m", "1 min" or "90 s": the length of one interval rep
export function intervalRepLength(iv) {
  if (iv.duration_s) return iv.duration_s % 60 === 0 ? `${iv.duration_s / 60} min` : `${iv.duration_s} s`
  return `${iv.distance_m} m`
}

// Parses one plan file. Returns { sessions, errors, warnings }; invalid sessions are dropped.
export function parsePlanFile(text, fileName) {
  const errors = []
  const warnings = []
  let doc
  try {
    // CORE_SCHEMA keeps dates as plain strings
    doc = yaml.load(text, { schema: yaml.CORE_SCHEMA }) || {}
  } catch (err) {
    return { sessions: [], errors: [`${fileName}: YAML error: ${err.message}`], warnings }
  }

  if (!Array.isArray(doc.sessions)) {
    if (doc.sessions !== undefined) errors.push(`${fileName}: "sessions" must be a list`)
    return { sessions: [], errors, warnings }
  }

  const sessions = []
  doc.sessions.forEach((raw, index) => {
    const where = `${fileName} session ${index + 1}${raw?.date ? ` (${raw.date})` : ''}`
    const problems = validateSession(raw, where, warnings)
    if (problems.length) errors.push(...problems)
    else sessions.push(normalizeSession(raw))
  })

  return { sessions, errors, warnings }
}

function validateSession(s, where, warnings) {
  const errors = []
  if (!s || typeof s !== 'object') return [`${where}: must be a mapping`]
  if (!DATE_RE.test(String(s.date))) errors.push(`${where}: "date" must be YYYY-MM-DD`)
  if (!SESSION_TYPES.includes(s.type)) {
    errors.push(`${where}: "type" must be one of ${SESSION_TYPES.join(', ')}`)
    return errors
  }

  const allowed = [...SESSION_KEYS.common, ...SESSION_KEYS[s.type]]
  for (const key of Object.keys(s)) {
    if (!allowed.includes(key)) warnings.push(`${where}: unknown field "${key}" for type ${s.type}`)
  }

  if (s.type === 'run') {
    if (s.kind && !RUN_KINDS.includes(s.kind)) errors.push(`${where}: "kind" must be one of ${RUN_KINDS.join(', ')}`)
    if (s.distance_km !== undefined && !(Number(s.distance_km) > 0)) errors.push(`${where}: "distance_km" must be a positive number`)
    if (s.pace !== undefined && !PACE_RE.test(String(s.pace))) errors.push(`${where}: "pace" must look like "5:30"`)
    if (s.intervals) {
      const iv = s.intervals
      for (const key of Object.keys(iv)) {
        if (!INTERVAL_KEYS.includes(key)) warnings.push(`${where}: unknown interval field "${key}"`)
      }
      if (!(Number(iv.reps) > 0)) errors.push(`${where}: intervals need "reps"`)
      const hasDistance = iv.distance_m !== undefined
      const hasDuration = iv.duration_s !== undefined
      if (hasDistance === hasDuration) errors.push(`${where}: intervals need exactly one of "distance_m" or "duration_s"`)
      if (hasDistance && !(Number(iv.distance_m) > 0)) errors.push(`${where}: interval "distance_m" must be a positive number`)
      if (hasDuration && !(Number(iv.duration_s) > 0)) errors.push(`${where}: interval "duration_s" must be a positive number`)
      if (iv.pace !== undefined && !PACE_RE.test(String(iv.pace))) errors.push(`${where}: interval "pace" must look like "4:10"`)
    }
  }

  if (s.type === 'strength') {
    if (!Array.isArray(s.exercises) || s.exercises.length === 0) {
      errors.push(`${where}: strength sessions need an "exercises" list`)
    } else {
      s.exercises.forEach((ex, i) => {
        const exWhere = `${where} exercise ${i + 1}`
        if (!ex?.name) errors.push(`${exWhere}: needs "name"`)
        if (!(Number(ex?.sets) > 0)) errors.push(`${exWhere}: needs "sets"`)
        if (ex?.reps === undefined && ex?.seconds === undefined) errors.push(`${exWhere}: needs "reps" or "seconds"`)
        for (const key of Object.keys(ex || {})) {
          if (!EXERCISE_KEYS.includes(key)) warnings.push(`${exWhere}: unknown field "${key}"`)
        }
      })
    }
  }

  return errors
}

function normalizeSession(s) {
  const session = { ...s, date: String(s.date) }
  if (s.type === 'run') {
    session.kind = s.kind || 'easy'
    if (s.distance_km !== undefined) session.distance_km = Number(s.distance_km)
    if (s.intervals) {
      session.intervals = { ...s.intervals, reps: Number(s.intervals.reps) }
      if (s.intervals.distance_m !== undefined) session.intervals.distance_m = Number(s.intervals.distance_m)
      if (s.intervals.duration_s !== undefined) session.intervals.duration_s = Number(s.intervals.duration_s)
    }
  }
  if (s.type === 'strength') {
    session.exercises = s.exercises.map(ex => ({
      ...ex,
      sets: Number(ex.sets),
      // "max" is allowed for reps (as many as possible)
      reps: ex.reps === 'max' || ex.reps === undefined ? ex.reps : Number(ex.reps),
      weight: ex.weight === undefined ? undefined : Number(ex.weight),
      seconds: ex.seconds === undefined ? undefined : Number(ex.seconds)
    }))
  }
  return session
}

// Combines several parsed files into one date-sorted session list
export function mergePlans(parsedFiles) {
  const sessions = parsedFiles.flatMap(f => f.sessions)
  sessions.sort((a, b) => a.date.localeCompare(b.date))
  return {
    sessions,
    errors: parsedFiles.flatMap(f => f.errors),
    warnings: parsedFiles.flatMap(f => f.warnings)
  }
}

export function paceToSeconds(pace) {
  const [m, s] = String(pace).split(':').map(Number)
  return m * 60 + s
}

export function formatPace(secondsPerKm) {
  if (!secondsPerKm || !isFinite(secondsPerKm)) return '–'
  const rounded = Math.round(secondsPerKm)
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`
}
