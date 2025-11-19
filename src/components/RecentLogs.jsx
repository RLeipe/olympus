import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RecentLogs({ workoutSets, onDelete }) {
  const [deleting, setDeleting] = useState(null)

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
      alert('Log entry deleted successfully')
    } catch (err) {
      console.error('Error deleting log:', err)
      alert('Failed to delete log entry: ' + err.message)
    } finally {
      setDeleting(null)
    }
  }

  if (!workoutSets || workoutSets.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Logs</h2>
        <p className="text-gray-500">No recent logs to show.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Recent Logs (Last 10)</h2>
      <p className="text-sm text-gray-600 mb-4">Delete entries if you made a mistake</p>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Exercise</th>
              <th className="px-3 py-2 text-left">Set</th>
              <th className="px-3 py-2 text-left">Reps/Duration</th>
              <th className="px-3 py-2 text-left">Weight</th>
              <th className="px-3 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {workoutSets.map((set) => (
              <tr key={set.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap">{set.workout_date}</td>
                <td className="px-3 py-2 font-medium">{set.exercises?.name || 'Unknown'}</td>
                <td className="px-3 py-2">{set.set_number}</td>
                <td className="px-3 py-2">
                  {set.exercises?.metric_type === 'time_based'
                    ? `${set.reps}s`
                    : set.reps}
                </td>
                <td className="px-3 py-2">{set.weight ? `${set.weight}kg` : '-'}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => handleDelete(set.id)}
                    disabled={deleting === set.id}
                    className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                  >
                    {deleting === set.id ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
