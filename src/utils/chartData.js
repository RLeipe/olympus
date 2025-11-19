/**
 * Aggregates workout sets into chart data for weighted exercises
 * Groups by date and calculates 1RM, 5RM, and total volume
 *
 * @param {Array} workoutSets - Array of workout_sets from Supabase
 * @returns {Array} Chart data with { date, rm1, rm5, volume }
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

    return {
      date,
      rm1,
      rm5,
      volume,
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

/**
 * Formats a date for display in charts
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date (e.g., "Jan 15")
 */
export function formatChartDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
