import { useUser } from '../contexts/UserContext'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const { currentUser } = useUser()
  const [recentWorkouts, setRecentWorkouts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentUser) {
      fetchRecentWorkouts()
    }
  }, [currentUser])

  async function fetchRecentWorkouts() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('workout_sets')
        .select(`
          *,
          exercises (name, metric_type)
        `)
        .eq('user_id', currentUser.id)
        .order('workout_date', { ascending: false })
        .order('set_number', { ascending: true })
        .limit(20)

      if (error) throw error
      setRecentWorkouts(data || [])
    } catch (error) {
      console.error('Error fetching workouts:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!currentUser) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">
        Welcome, {currentUser.name}!
      </h1>

      {/* Recent Workouts */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">Recent Workouts</h2>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : recentWorkouts.length === 0 ? (
          <p className="text-gray-500">
            No workouts logged yet. Start by clicking "Quick Log" above!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Exercise</th>
                  <th className="px-4 py-2 text-left">Set</th>
                  <th className="px-4 py-2 text-left">Reps</th>
                  <th className="px-4 py-2 text-left">Weight (kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentWorkouts.map((set) => (
                  <tr key={set.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{set.workout_date}</td>
                    <td className="px-4 py-2 font-medium">{set.exercises.name}</td>
                    <td className="px-4 py-2">{set.set_number}</td>
                    <td className="px-4 py-2">{set.reps}</td>
                    <td className="px-4 py-2">{set.weight || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
