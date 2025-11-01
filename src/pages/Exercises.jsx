import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Exercises() {
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchExercises()
  }, [])

  async function fetchExercises() {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('category')
        .order('name')

      if (error) throw error
      setExercises(data || [])
    } catch (err) {
      console.error('Error fetching exercises:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete exercise "${name}"? This will also delete all associated workout data.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Refresh list
      fetchExercises()
    } catch (err) {
      console.error('Error deleting exercise:', err)
      alert('Failed to delete exercise: ' + err.message)
    }
  }

  const metricTypeLabels = {
    one_rep_max: '1 Rep Max',
    max_consecutive: 'Max Consecutive',
    total_volume: 'Total Volume'
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Exercises</h1>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : exercises.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">
            No exercises yet. Add your first exercise when logging a workout!
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Metric Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {exercises.map((exercise) => (
                <tr key={exercise.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{exercise.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      exercise.category === 'strength'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {exercise.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {metricTypeLabels[exercise.metric_type]}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {exercise.notes || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(exercise.id, exercise.name)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
