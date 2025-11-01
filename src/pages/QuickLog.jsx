import { useState, useEffect } from 'react'
import { useUser } from '../contexts/UserContext'
import { supabase } from '../lib/supabase'
import { parseSets, validateSets } from '../utils/setParser'
import { useNavigate } from 'react-router-dom'

export default function QuickLog() {
  const { currentUser } = useUser()
  const navigate = useNavigate()
  const [exercises, setExercises] = useState([])
  const [selectedExercise, setSelectedExercise] = useState('')
  const [setsInput, setSetsInput] = useState('')
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showNewExercise, setShowNewExercise] = useState(false)

  useEffect(() => {
    fetchExercises()
  }, [])

  async function fetchExercises() {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('category', 'strength')
        .order('name')

      if (error) throw error
      setExercises(data || [])
    } catch (err) {
      console.error('Error fetching exercises:', err)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!selectedExercise) {
      setError('Please select an exercise')
      return
    }

    const sets = parseSets(setsInput)
    const validation = validateSets(sets)

    if (!validation.valid) {
      setError(validation.error)
      return
    }

    setLoading(true)

    try {
      // Prepare sets for insertion
      const setsToInsert = sets.map(set => ({
        user_id: currentUser.id,
        exercise_id: selectedExercise,
        workout_date: workoutDate,
        reps: set.reps,
        weight: set.weight,
        set_number: set.set_number,
        notes: notes || null
      }))

      const { error: insertError } = await supabase
        .from('workout_sets')
        .insert(setsToInsert)

      if (insertError) throw insertError

      // Success - reset form
      setSetsInput('')
      setNotes('')
      setWorkoutDate(new Date().toISOString().split('T')[0])
      alert('Workout logged successfully!')
      navigate('/')
    } catch (err) {
      console.error('Error logging workout:', err)
      setError('Failed to log workout: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!currentUser) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Quick Log Workout</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Exercise Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Exercise
            </label>
            <div className="flex gap-2">
              <select
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select an exercise...</option>
                {exercises.map(ex => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewExercise(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                + New
              </button>
            </div>
          </div>

          {/* Sets Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Sets (e.g., "3x5@80, 1x1@90" or "5x5" for bodyweight)
            </label>
            <input
              type="text"
              value={setsInput}
              onChange={(e) => setSetsInput(e.target.value)}
              placeholder="3x5@80, 1x1@90"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Format: [sets]x[reps]@[weight]. Separate multiple groups with commas.
            </p>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Date
            </label>
            <input
              type="date"
              value={workoutDate}
              onChange={(e) => setWorkoutDate(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel?"
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging...' : 'Log Workout'}
          </button>
        </form>
      </div>

      {/* New Exercise Modal (simple version) */}
      {showNewExercise && (
        <NewExerciseModal
          onClose={() => setShowNewExercise(false)}
          onSuccess={() => {
            setShowNewExercise(false)
            fetchExercises()
          }}
        />
      )}
    </div>
  )
}

function NewExerciseModal({ onClose, onSuccess }) {
  const [name, setName] = useState('')
  const [metricType, setMetricType] = useState('one_rep_max')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: insertError } = await supabase
        .from('exercises')
        .insert({
          name,
          category: 'strength',
          metric_type: metricType,
          notes: notes || null
        })

      if (insertError) throw insertError

      onSuccess()
    } catch (err) {
      console.error('Error creating exercise:', err)
      setError('Failed to create exercise: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Add New Exercise</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Deadlift"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Metric Type</label>
            <select
              value={metricType}
              onChange={(e) => setMetricType(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="one_rep_max">1 Rep Max (Deadlift, Squat, Bench)</option>
              <option value="max_consecutive">Max Consecutive Reps (Pull-ups, Push-ups)</option>
              <option value="total_volume">Total Volume (sets × reps × weight)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Form cues, variations, etc."
              rows={2}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Adding...' : 'Add Exercise'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
