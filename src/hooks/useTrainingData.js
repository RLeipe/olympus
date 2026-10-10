import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 1000

// Supabase returns at most 1000 rows per request
async function fetchAll(buildQuery) {
  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < PAGE_SIZE) return rows
  }
}

function isMissingTable(error) {
  return error?.code === '42P01' || error?.code === 'PGRST205'
}

// Logged sets, Strava activities and day notes for one user between two dates (inclusive)
export function useTrainingData(userId, fromIso, toIso) {
  const [data, setData] = useState({ workoutSets: [], activities: [], notes: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [needsMigration, setNeedsMigration] = useState(false)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const workoutSets = await fetchAll(() => supabase
        .from('workout_sets')
        .select('id, workout_date, reps, weight, set_number, exercises(name, metric_type)')
        .eq('user_id', userId)
        .gte('workout_date', fromIso)
        .lte('workout_date', toIso)
        .order('workout_date')
        .order('set_number'))

      let activities = []
      let noteRows = []
      let missing = false
      try {
        activities = await fetchAll(() => supabase
          .from('activities')
          .select('*')
          .eq('user_id', userId)
          .gte('activity_date', fromIso)
          .lte('activity_date', toIso)
          .order('start_time'))
        noteRows = await fetchAll(() => supabase
          .from('day_notes')
          .select('date, note')
          .eq('user_id', userId)
          .gte('date', fromIso)
          .lte('date', toIso))
      } catch (err) {
        if (!isMissingTable(err)) throw err
        missing = true
      }

      setNeedsMigration(missing)
      setData({
        workoutSets,
        activities,
        notes: Object.fromEntries(noteRows.map(n => [n.date, n.note]))
      })
    } catch (err) {
      console.error('Error loading training data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId, fromIso, toIso])

  useEffect(() => { load() }, [load])

  const setNote = useCallback((date, note) => {
    setData(prev => {
      const notes = { ...prev.notes }
      if (note) notes[date] = note
      else delete notes[date]
      return { ...prev, notes }
    })
  }, [])

  return { ...data, loading, error, needsMigration, reload: load, setNote }
}

// Saves (or deletes, when empty) the note for one day
export async function saveDayNote(userId, date, note) {
  const text = note.trim()
  if (!text) {
    const { error } = await supabase.from('day_notes').delete().eq('user_id', userId).eq('date', date)
    if (error) throw error
    return ''
  }
  const { error } = await supabase
    .from('day_notes')
    .upsert({ user_id: userId, date, note: text, updated_at: new Date().toISOString() }, { onConflict: 'user_id,date' })
  if (error) throw error
  return text
}
