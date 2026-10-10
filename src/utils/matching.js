// Plan vs. actual: turns logged sets and Strava activities into "actual sessions",
// matches them to planned sessions and evaluates how well each plan was hit.
// Pure ES module: used by the app and by scripts/training-snapshot.mjs.
import { addDays, startOfWeek } from './dates.js'
import { paceToSeconds } from './planCore.js'

export const RUN_SPORTS = ['Run', 'TrailRun', 'VirtualRun']
const STRENGTH_SPORTS = ['WeightTraining', 'Workout', 'Crossfit']

// A planned session may be done one day early or late and still count
const MATCH_OFFSETS = [0, -1, 1]
const DISTANCE_TOLERANCE = 0.9
const LAP_DISTANCE_TOLERANCE = 0.15
const LAP_PACE_SLACK_S = 10

// workoutSets: rows with exercises(name, metric_type); activities: rows from the activities table
export function buildActuals(workoutSets, activities) {
  const items = []
  const strengthByDate = {}

  for (const set of workoutSets) {
    const date = set.workout_date
    let item = strengthByDate[date]
    if (!item) {
      item = strengthByDate[date] = { id: `log-${date}`, type: 'strength', source: 'log', date, exercises: [] }
      items.push(item)
    }
    const name = set.exercises?.name || 'Unknown'
    let exercise = item.exercises.find(e => e.name === name)
    if (!exercise) {
      exercise = { name, metricType: set.exercises?.metric_type, sets: [] }
      item.exercises.push(exercise)
    }
    exercise.sets.push({ reps: set.reps, weight: set.weight == null ? null : Number(set.weight) })
  }

  for (const activity of activities) {
    const type = RUN_SPORTS.includes(activity.sport_type)
      ? 'run'
      : STRENGTH_SPORTS.includes(activity.sport_type) ? 'strength' : 'other'
    // A gym session recorded on the watch duplicates the sets logged in the app
    if (type === 'strength' && strengthByDate[activity.activity_date]) continue
    items.push({ id: `strava-${activity.strava_id}`, type, source: 'strava', date: activity.activity_date, activity })
  }

  return items.sort((a, b) => a.date.localeCompare(b.date))
}

// Returns { results: [{ session, actual, evaluation }], extras: [actual] }
export function matchPlan(sessions, actuals, todayIso) {
  const results = sessions.map(session => ({ session, actual: null }))
  const used = new Set()

  for (const offset of MATCH_OFFSETS) {
    for (const result of results) {
      if (result.actual || result.session.type === 'rest') continue
      const date = addDays(result.session.date, offset)
      const candidate = actuals.find(a => !used.has(a.id) && a.date === date && a.type === result.session.type)
      if (candidate) {
        result.actual = candidate
        used.add(candidate.id)
      }
    }
  }

  for (const result of results) result.evaluation = evaluate(result, todayIso)
  return { results, extras: actuals.filter(a => !used.has(a.id)) }
}

function evaluate({ session, actual }, todayIso) {
  if (session.type === 'rest') return { status: 'rest' }
  if (!actual) {
    const status = session.date < todayIso ? 'missed' : session.date === todayIso ? 'today' : 'planned'
    return { status }
  }
  if (session.type === 'run') return evaluateRun(session, actual.activity)
  if (session.type === 'strength') return evaluateStrength(session, actual)
  return { status: 'done', issues: [], flags: [] }
}

function evaluateRun(session, activity) {
  const issues = []
  const flags = []
  const km = activity.distance_m / 1000

  if (session.distance_km && km < session.distance_km * DISTANCE_TOLERANCE) {
    issues.push(`${km.toFixed(1)} of ${session.distance_km} km`)
  }
  if (session.max_hr && activity.avg_hr && activity.avg_hr > session.max_hr) {
    flags.push(`avg HR ${Math.round(activity.avg_hr)} above ${session.max_hr}`)
  }

  let intervals = null
  if (session.intervals) {
    if (activity.laps == null) {
      intervals = { pending: true }
    } else {
      const work = detectIntervals(activity, session.intervals)
      intervals = { planned: session.intervals.reps, detected: work.length, laps: work }
      if (work.length < session.intervals.reps) {
        issues.push(work.length ? `${work.length}/${session.intervals.reps} intervals` : 'no intervals in laps')
      }
    }
  }

  return { status: issues.length ? 'partial' : 'done', issues, flags, intervals }
}

// Work intervals = laps close to the planned rep distance that were run fast
export function detectIntervals(activity, plan) {
  const laps = activity.laps || []
  const targetPace = plan.pace ? paceToSeconds(plan.pace) : null
  const overallSpeed = activity.avg_speed || 0

  return laps.filter(lap => {
    const distanceOk = Math.abs(lap.distance_m - plan.distance_m) <= Math.max(plan.distance_m * LAP_DISTANCE_TOLERANCE, 50)
    if (!distanceOk || !lap.avg_speed) return false
    if (targetPace) return 1000 / lap.avg_speed <= targetPace + LAP_PACE_SLACK_S
    return lap.avg_speed >= overallSpeed * 1.05
  })
}

function evaluateStrength(session, actual) {
  if (actual.source === 'strava') {
    return { status: 'done', issues: [], flags: ['recorded on Strava, no sets logged'], exercises: [], extraExercises: [] }
  }

  const logged = new Map(actual.exercises.map(e => [normalizeName(e.name), e]))
  const exercises = session.exercises.map(planned => {
    const sets = logged.get(normalizeName(planned.name))?.sets || []
    const hits = sets.filter(set => meetsTarget(set, planned)).length
    return { planned, logged: sets, completed: Math.min(hits, planned.sets) }
  })
  const plannedNames = new Set(session.exercises.map(e => normalizeName(e.name)))
  const extraExercises = actual.exercises.filter(e => !plannedNames.has(normalizeName(e.name)))

  const plannedSets = exercises.reduce((sum, e) => sum + e.planned.sets, 0)
  const completedSets = exercises.reduce((sum, e) => sum + e.completed, 0)
  const issues = exercises
    .filter(e => e.completed < e.planned.sets)
    .map(e => `${e.planned.name} ${e.completed}/${e.planned.sets}`)

  return {
    status: completedSets >= plannedSets ? 'done' : 'partial',
    issues,
    flags: [],
    exercises,
    extraExercises
  }
}

function meetsTarget(set, planned) {
  if (planned.seconds !== undefined) {
    if (set.reps < planned.seconds) return false
  } else if (typeof planned.reps === 'number' && set.reps < planned.reps) {
    return false
  }
  if (planned.weight !== undefined && (set.weight ?? 0) < planned.weight - 0.01) return false
  return true
}

function normalizeName(name) {
  return String(name).trim().toLowerCase()
}

// Per-week counts for the given Monday week starts
export function weekSummaries(weekStarts, results, extras) {
  return weekStarts.map(start => {
    const end = addDays(start, 6)
    const inWeek = date => date >= start && date <= end
    const planned = results.filter(r => r.session.type !== 'rest' && inWeek(r.session.date))
    return {
      start,
      planned: planned.length,
      done: planned.filter(r => r.actual).length,
      extras: extras.filter(a => inWeek(a.date)).length
    }
  })
}

export function weekStartsBetween(fromIso, toIso) {
  const weeks = []
  for (let w = startOfWeek(fromIso); w <= toIso; w = addDays(w, 7)) weeks.push(w)
  return weeks
}
