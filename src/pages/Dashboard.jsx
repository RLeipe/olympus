import { useUser } from '../contexts/UserContext'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { aggregateWeightedExercise, aggregateRepsExercise } from '../utils/chartData'
import WeightedExerciseChart from '../components/WeightedExerciseChart'
import RepsExerciseChart from '../components/RepsExerciseChart'
import BodyWeightChart from '../components/BodyWeightChart'

export default function Dashboard() {
  const { currentUser } = useUser()
  const [exercises, setExercises] = useState([])
  const [exerciseData, setExerciseData] = useState({})
  const [bodyWeightData, setBodyWeightData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData()
    }
  }, [currentUser])

  async function fetchDashboardData() {
    setLoading(true)
    try {
      // Fetch all exercises
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('exercises')
        .select('*')
        .eq('category', 'strength')
        .order('name')

      if (exercisesError) throw exercisesError
      setExercises(exercisesData || [])

      // Fetch workout sets for each exercise
      const dataByExercise = {}

      for (const exercise of exercisesData || []) {
        const { data: setsData, error: setsError } = await supabase
          .from('workout_sets')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('exercise_id', exercise.id)
          .order('workout_date')

        if (setsError) throw setsError

        // Aggregate data based on metric type
        if (exercise.metric_type === 'one_rep_max') {
          dataByExercise[exercise.id] = aggregateWeightedExercise(setsData || [])
        } else if (exercise.metric_type === 'max_consecutive') {
          dataByExercise[exercise.id] = aggregateRepsExercise(setsData || [])
        }
      }

      setExerciseData(dataByExercise)

      // Fetch body weight logs
      const { data: weightData, error: weightError } = await supabase
        .from('body_weight_logs')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('date')

      if (weightError) throw weightError
      setBodyWeightData(weightData || [])

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!currentUser) {
    return <div className="p-8">Loading...</div>
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-500">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        {currentUser.name}'s Progress
      </h1>

      {/* Body Weight Chart */}
      {bodyWeightData.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Body Weight</h2>
          <BodyWeightChart data={bodyWeightData} userName={currentUser.name} />
        </div>
      )}

      {/* Exercise Charts */}
      {exercises.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">
            No exercises yet. Start by logging your first workout!
          </p>
          <a
            href="/log"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Log Workout
          </a>
        </div>
      ) : (
        <div className="space-y-8">
          {exercises.map(exercise => {
            const data = exerciseData[exercise.id] || []

            return (
              <div key={exercise.id} className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">{exercise.name}</h2>

                {exercise.metric_type === 'one_rep_max' ? (
                  <WeightedExerciseChart
                    data={data}
                    exerciseName={exercise.name}
                  />
                ) : exercise.metric_type === 'max_consecutive' ? (
                  <RepsExerciseChart
                    data={data}
                    exerciseName={exercise.name}
                  />
                ) : (
                  <div className="text-gray-500">Unknown metric type</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
