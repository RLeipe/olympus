import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { TrashIcon } from './icons'
import { parseISODate } from '../utils/dates'

export default function RecentLogs({ workoutSets, onDelete }) {
  const [deleting, setDeleting] = useState(null)
  const toast = useToast()

  async function handleDelete(setId) {
    if (!confirm('Delete this log entry? This cannot be undone.')) {
      return
    }

    setDeleting(setId)
    try {
      const { error } = await supabase
        .from('workout_sets')
        .delete()
        .eq('id', setId)

      if (error) throw error

      // Notify parent to refresh data
      onDelete()
      toast('Set deleted')
    } catch (err) {
      console.error('Error deleting log:', err)
      toast('Failed to delete: ' + err.message, 'error')
    } finally {
      setDeleting(null)
    }
  }

  if (!workoutSets || workoutSets.length === 0) {
    return (
      <div className="card p-4 md:p-5">
        <h2 className="font-bold mb-1">Recent sets</h2>
        <p className="text-sm text-ink-faint">Nothing logged yet.</p>
      </div>
    )
  }

  // Group the sets by day, newest first (the query already sorts them)
  const byDate = []
  for (const set of workoutSets) {
    const group = byDate[byDate.length - 1]
    if (group?.date === set.workout_date) group.sets.push(set)
    else byDate.push({ date: set.workout_date, sets: [set] })
  }

  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="font-bold">Recent sets</h2>
        <span className="text-xs text-ink-faint">Last {workoutSets.length}</span>
      </div>

      {byDate.map(group => (
        <div key={group.date} className="mt-3">
          <div className="eyebrow mb-1">
            {parseISODate(group.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
          <ul className="divide-y divide-line/70">
            {group.sets.map(set => {
              const isTime = set.exercises?.metric_type === 'time_based'
              return (
                <li key={set.id} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{set.exercises?.name || 'Unknown'}</div>
                    <div className="text-xs text-ink-faint">Set {set.set_number}</div>
                  </div>
                  <div className="num text-xl font-semibold whitespace-nowrap">
                    {set.reps}{isTime ? ' s' : ''}
                    {set.weight ? <span className="text-ink-faint"> × </span> : null}
                    {set.weight ? <>{set.weight}<span className="text-sm text-ink-faint font-sans font-semibold"> kg</span></> : null}
                  </div>
                  <button
                    onClick={() => handleDelete(set.id)}
                    disabled={deleting === set.id}
                    className="h-9 w-9 rounded-full flex items-center justify-center text-ink-faint hover:text-missed hover:bg-missed/10 disabled:opacity-40"
                    aria-label="Delete set"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
