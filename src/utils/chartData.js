import { parseISODate } from './dates'

/**
 * Aggregates workout sets into chart data for weighted exercises
 * Groups by date and calculates 1RM, 5RM, and total volume
 *
 * @param {Array} workoutSets - Array of workout_sets from Supabase
 * @returns {Array} Chart data with { date, rm1, rm5, volume, topWeight, topReps }
 */
export function aggregateWeightedExercise(workoutSets) {
  // Group by date
  const byDate = {}

  workoutSets.forEach(set => {
    const date = set.workout_date
    if (!byDate[date]) {
      byDate[date] = []
    }
    byDate[date].push(set)
  })

  // Calculate metrics per date
  const chartData = Object.entries(byDate).map(([date, sets]) => {
    // 1RM: only from sets with exactly 1 rep
    const rm1Sets = sets.filter(s => s.reps === 1 && s.weight)
    const rm1 = rm1Sets.length > 0 ? Math.max(...rm1Sets.map(s => s.weight)) : null

    // 5RM: from sets with 5 or more reps (take the highest weight)
    const rm5Sets = sets.filter(s => s.reps >= 5 && s.weight)
    const rm5 = rm5Sets.length > 0 ? Math.max(...rm5Sets.map(s => s.weight)) : null

    // Total volume: sum of (weight × reps) for all sets
    const volume = sets.reduce((sum, s) => {
      return sum + (s.weight || 0) * s.reps
    }, 0)

    // Top set: heaviest weight of the day, with the most reps done at that weight
    const weighted = sets.filter(s => s.weight)
    const topWeight = weighted.length > 0 ? Math.max(...weighted.map(s => s.weight)) : null
    const topReps = topWeight ? Math.max(...weighted.filter(s => s.weight === topWeight).map(s => s.reps)) : null

    return {
      date,
      rm1,
      rm5,
      volume,
      topWeight,
      topReps,
      sets // Keep original sets for tooltip
    }
  })

  // Sort by date
  return chartData.sort((a, b) => new Date(a.date) - new Date(b.date))
}

/**
 * Aggregates workout sets into chart data for reps-based exercises
 * Groups by date and calculates max consecutive and total reps
 *
 * @param {Array} workoutSets - Array of workout_sets from Supabase
 * @returns {Array} Chart data with { date, maxReps, totalReps }
 */
export function aggregateRepsExercise(workoutSets) {
  // Group by date
  const byDate = {}

  workoutSets.forEach(set => {
    const date = set.workout_date
    if (!byDate[date]) {
      byDate[date] = []
    }
    byDate[date].push(set)
  })

  // Calculate metrics per date
  const chartData = Object.entries(byDate).map(([date, sets]) => {
    // Max consecutive: highest reps in any single set
    const maxReps = Math.max(...sets.map(s => s.reps))

    // Total reps: sum of all reps
    const totalReps = sets.reduce((sum, s) => sum + s.reps, 0)

    return {
      date,
      maxReps,
      totalReps,
      sets // Keep original sets for tooltip
    }
  })

  // Sort by date
  return chartData.sort((a, b) => new Date(a.date) - new Date(b.date))
}

/**
 * Aggregates workout sets into chart data for time-based exercises
 * Groups by date and calculates max duration and total duration
 *
 * @param {Array} workoutSets - Array of workout_sets from Supabase
 * @returns {Array} Chart data with { date, maxDuration, totalDuration }
 */
export function aggregateTimeBasedExercise(workoutSets) {
  // Group by date
  const byDate = {}

  workoutSets.forEach(set => {
    const date = set.workout_date
    if (!byDate[date]) {
      byDate[date] = []
    }
    byDate[date].push(set)
  })

  // Calculate metrics per date
  const chartData = Object.entries(byDate).map(([date, sets]) => {
    // Max duration: highest duration (stored in reps field) in any single set
    const maxDuration = Math.max(...sets.map(s => s.reps))

    // Total duration: sum of all durations
    const totalDuration = sets.reduce((sum, s) => sum + s.reps, 0)

    return {
      date,
      maxDuration,
      totalDuration,
      sets // Keep original sets for tooltip
    }
  })

  // Sort by date
  return chartData.sort((a, b) => new Date(a.date) - new Date(b.date))
}

// Headline number per metric type, used for the cards on the Stats page
const HEADLINE_KEY = {
  one_rep_max: 'topWeight',
  max_consecutive: 'maxReps',
  time_based: 'maxDuration'
}

/**
 * Latest, previous and best headline value of an exercise's aggregated chart data
 * @param {string} metricType - exercises.metric_type
 * @param {Array} data - output of one of the aggregate functions above
 * @returns {Object|null} { key, latest, previous, best, lastDate, sessions, last }
 */
export function summarizeExercise(metricType, data) {
  const key = HEADLINE_KEY[metricType]
  if (!key || !data.length) return null

  const withValue = data.filter(d => d[key] != null)
  const last = withValue[withValue.length - 1] || null
  const previous = withValue.length > 1 ? withValue[withValue.length - 2][key] : null

  return {
    key,
    latest: last ? last[key] : null,
    previous,
    best: withValue.length ? Math.max(...withValue.map(d => d[key])) : null,
    lastDate: data[data.length - 1].date,
    sessions: data.length,
    last
  }
}

/**
 * Formats seconds as m:ss
 * @param {number} seconds
 * @returns {string} e.g. "1:05"
 */
export function formatSeconds(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Adds a timestamp `t` to each point so charts can use a real time axis,
 * where a two-month gap looks like two months
 * @param {Array} data - points with a `date` (YYYY-MM-DD)
 * @returns {Array} same points with `t`
 */
export function withTime(data) {
  return data.map(d => ({ ...d, t: parseISODate(d.date).getTime() }))
}

/**
 * Formats a timestamp from withTime() as a short date ("15 Jan")
 * @param {number} t
 * @returns {string}
 */
export function formatTimeTick(t) {
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/**
 * Formats a date for display in charts
 * @param {string} dateString - ISO date string (YYYY-MM-DD)
 * @returns {string} Formatted date (e.g., "15 Jan")
 */
export function formatChartDate(dateString) {
  return parseISODate(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
