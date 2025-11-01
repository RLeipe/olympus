/**
 * Parses workout set input strings like "3x5@80, 1x1@90" into structured data
 *
 * Supported formats:
 * - "3x5@80" → 3 sets of 5 reps at 80kg
 * - "5x5" → 5 sets of 5 reps (bodyweight)
 * - "1x1@90" → 1 set of 1 rep at 90kg
 * - Multiple groups separated by commas: "3x5@80, 1x1@90"
 *
 * @param {string} input - The input string to parse
 * @param {number|null} defaultWeight - Default weight for bodyweight exercises
 * @returns {Array} Array of set objects with { set_number, reps, weight }
 */
export function parseSets(input, defaultWeight = null) {
  if (!input || typeof input !== 'string') {
    return []
  }

  const setGroups = input.split(',').map(s => s.trim())
  const allSets = []
  let setNumber = 1

  setGroups.forEach(group => {
    // Match patterns like "3x5@80" or "5x5" (bodyweight)
    const match = group.match(/(\d+)x(\d+)(?:@([\d.]+))?/)
    if (!match) return

    const [_, numSets, reps, weight] = match

    for (let i = 0; i < parseInt(numSets); i++) {
      allSets.push({
        set_number: setNumber++,
        reps: parseInt(reps),
        weight: weight ? parseFloat(weight) : defaultWeight
      })
    }
  })

  return allSets
}

/**
 * Validates parsed sets
 * @param {Array} sets - Array of set objects
 * @returns {Object} { valid: boolean, error: string }
 */
export function validateSets(sets) {
  if (!sets || sets.length === 0) {
    return { valid: false, error: 'No valid sets found. Try format like "3x5@80" or "5x5"' }
  }

  for (const set of sets) {
    if (set.reps <= 0) {
      return { valid: false, error: 'Reps must be greater than 0' }
    }
    if (set.weight !== null && set.weight < 0) {
      return { valid: false, error: 'Weight cannot be negative' }
    }
  }

  return { valid: true }
}
