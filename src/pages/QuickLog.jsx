import { useState, useEffect } from 'react'
import { useUser } from '../contexts/UserContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import RecentLogs from '../components/RecentLogs'
import DayNoteEditor from '../components/DayNoteEditor'
import { PageHeader, Loading, Banner, Stepper, Sheet } from '../components/ui'
import { PlusIcon, CheckIcon } from '../components/icons'
import { toISODate } from '../utils/dates'

// Where the steppers start when there is no recent set of the exercise to start from
const DEFAULT_START = { reps: 5, weight: 20, seconds: 30 }

const METRIC_TYPES = [
  { value: 'one_rep_max', title: 'Weighted', description: 'Sets × reps × kg, tracks 1RM, 5RM and volume' },
  { value: 'max_consecutive', title: 'Reps', description: 'Bodyweight reps, tracks max and total reps' },
  { value: 'time_based', title: 'Time', description: 'Holds and hangs, tracks duration' }
]

export default function QuickLog() {
  const { currentUser } = useUser()
  const toast = useToast()
  const [exercises, setExercises] = useState([])
  const [selectedExercise, setSelectedExercise] = useState('')
  const [numSets, setNumSets] = useState('1')
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [workoutDate, setWorkoutDate] = useState(new Date())
  const [dayNote, setDayNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showNewExercise, setShowNewExercise] = useState(false)
  const [recentLogs, setRecentLogs] = useState([])
  const selectedEx = exercises.find(ex => ex.id === selectedExercise)

  useEffect(() => {
    fetchExercises()
    if (currentUser) {
      fetchRecentLogs()
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser) fetchDayNote()
  }, [currentUser, workoutDate])

  async function fetchDayNote() {
    const { data, error } = await supabase
      .from('day_notes')
      .select('note')
      .eq('user_id', currentUser.id)
      .eq('date', toISODate(workoutDate))
      .maybeSingle()
    if (error) {
      console.error('Error fetching day note:', error)
      return
    }
    setDayNote(data?.note || '')
  }

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

  async function fetchRecentLogs() {
    try {
      const { data, error } = await supabase
        .from('workout_sets')
        .select('*, exercises(name, metric_type)')
        .eq('user_id', currentUser.id)
        .order('workout_date', { ascending: false })
        .order('id', { ascending: false })
        .limit(10)

      if (error) throw error
      setRecentLogs(data || [])
    } catch (err) {
      console.error('Error fetching recent logs:', err)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!selectedExercise) {
      setError('Please select an exercise')
      return
    }

    if (!reps || reps <= 0) {
      setError('Please enter a valid number of reps')
      return
    }

    if (!numSets || numSets <= 0) {
      setError('Please enter a valid number of sets')
      return
    }

    setLoading(true)

    try {
      // Create multiple sets with the same reps and weight
      const setsToInsert = []
      const formattedDate = toISODate(workoutDate)
      for (let i = 1; i <= numSets; i++) {
        setsToInsert.push({
          user_id: currentUser.id,
          exercise_id: selectedExercise,
          workout_date: formattedDate,
          reps: parseInt(reps),
          weight: weight ? parseFloat(weight) : null,
          set_number: i
        })
      }

      const { error: insertError } = await supabase
        .from('workout_sets')
        .insert(setsToInsert)

      if (insertError) throw insertError

      // Success - reset form and refresh recent logs
      setNumSets('1')
      setReps('')
      setWeight('')
      fetchRecentLogs()
      toast(`${selectedEx?.name || 'Workout'} logged`)
    } catch (err) {
      console.error('Error logging workout:', err)
      setError('Failed to log workout: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!currentUser) {
    return <Loading />
  }

  const metricType = selectedEx?.metric_type
  const isTime = metricType === 'time_based'
  const isWeighted = !metricType || metricType === 'one_rep_max'

  // Recently logged exercises as one-tap shortcuts, and the last set of the selected one as a starting point
  const recentExercises = [...new Map(recentLogs
    .filter(set => set.exercises)
    .map(set => [set.exercise_id, set.exercises.name])).entries()].slice(0, 6)
  const lastSet = recentLogs.find(set => set.exercise_id === selectedExercise)
  const startReps = lastSet?.reps ?? (isTime ? DEFAULT_START.seconds : DEFAULT_START.reps)
  const startWeight = lastSet?.weight ?? DEFAULT_START.weight

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const selectedIso = toISODate(workoutDate)

  const summary = reps
    ? `${numSets || 1} × ${reps}${isTime ? ' s' : ''}${isWeighted && weight ? ` @ ${weight} kg` : ''}`
    : null

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader eyebrow={`${currentUser.name} · ${workoutDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}`} title="Log" />

      <form onSubmit={handleSubmit} className="card p-4 md:p-5">
        {/* Exercise Selection */}
        <label className="label" htmlFor="exercise">Exercise</label>
        <div className="flex gap-2">
          <select
            id="exercise"
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="input flex-1 font-semibold appearance-none bg-[length:16px] bg-no-repeat bg-[right_1rem_center] pr-10"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%238a8d93%27 stroke-width=%272.5%27 stroke-linecap=%27round%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E")' }}
            required
          >
            <option value="">Choose an exercise…</option>
            {exercises.map(ex => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowNewExercise(true)}
            className="icon-btn h-12 w-12"
            aria-label="New exercise"
            title="New exercise"
          >
            <PlusIcon />
          </button>
        </div>

        {recentExercises.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap mt-2.5 pb-1 [scrollbar-width:none]">
            {recentExercises.map(([id, name]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedExercise(id)}
                className={`h-8 px-3 rounded-full text-xs font-bold whitespace-nowrap transition
                  ${selectedExercise === id ? 'bg-ink text-bg' : 'bg-sunken text-ink-soft hover:text-ink'}`}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {/* Dynamic Input Fields based on Exercise Type */}
        <div className="mt-4 divide-y divide-line/70 border-y border-line/70">
          <Stepper label="Sets" value={numSets} onChange={setNumSets} min={1} start={1} />
          <Stepper
            label={isTime ? 'Duration' : 'Reps'}
            hint={isTime ? 'seconds per set' : 'per set'}
            value={reps}
            onChange={setReps}
            min={1}
            step={isTime ? 5 : 1}
            start={startReps}
            placeholder={String(startReps)}
            suffix={isTime ? 's' : undefined}
          />
          {isWeighted && (
            <Stepper
              label="Weight"
              hint="kg · optional"
              value={weight}
              onChange={setWeight}
              step={2.5}
              start={startWeight}
              placeholder={String(startWeight)}
              decimal
            />
          )}
        </div>

        {/* Date */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="label mb-0">Date</span>
            <div className="flex gap-1">
              {[['Today', new Date()], ['Yesterday', yesterday]].map(([label, date]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setWorkoutDate(date)}
                  className={`h-7 px-2.5 rounded-full text-xs font-bold transition
                    ${selectedIso === toISODate(date) ? 'bg-ink text-bg' : 'text-ink-soft hover:bg-sunken'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <DatePicker
            selected={workoutDate}
            onChange={(date) => date && setWorkoutDate(date)}
            dateFormat="EEEE, d MMM yyyy"
            className="input font-semibold"
            required
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4">
            <Banner tone="error">{error}</Banner>
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={loading} className="btn-primary w-full mt-5 h-14 text-base">
          {loading ? 'Logging…' : (
            <>
              <CheckIcon className="w-5 h-5" strokeWidth={2.5} />
              {summary ? `Log ${summary}` : 'Log sets'}
            </>
          )}
        </button>
      </form>

      {/* Session note for the selected date */}
      <div className="card p-4 md:p-5 mt-3">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-bold">Session note</h2>
          <span className="text-xs text-ink-faint">
            {workoutDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>
        <DayNoteEditor
          userId={currentUser.id}
          date={toISODate(workoutDate)}
          initialNote={dayNote}
          onSaved={(saved) => { setDayNote(saved); toast(saved ? 'Note saved' : 'Note removed') }}
        />
      </div>

      {/* Recent Logs */}
      <div className="mt-3">
        <RecentLogs workoutSets={recentLogs} onDelete={fetchRecentLogs} />
      </div>

      {showNewExercise && (
        <NewExerciseModal
          onClose={() => setShowNewExercise(false)}
          onSuccess={(exercise) => {
            setShowNewExercise(false)
            fetchExercises()
            if (exercise) setSelectedExercise(exercise.id)
            toast(`${exercise?.name || 'Exercise'} added`)
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
      const { data, error: insertError } = await supabase
        .from('exercises')
        .insert({
          name,
          category: 'strength',
          metric_type: metricType,
          notes: notes || null
        })
        .select()
        .single()

      if (insertError) throw insertError

      onSuccess(data)
    } catch (err) {
      console.error('Error creating exercise:', err)
      setError('Failed to create exercise: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet title="New exercise" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="exercise-name">Name</label>
          <input
            id="exercise-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Deadlift"
            className="input"
            required
          />
        </div>

        <div>
          <span className="label">How it's tracked</span>
          <div className="space-y-2">
            {METRIC_TYPES.map(type => (
              <button
                key={type.value}
                type="button"
                onClick={() => setMetricType(type.value)}
                aria-pressed={metricType === type.value}
                className={`w-full text-left rounded-xl px-4 py-3 border transition flex items-center gap-3
                  ${metricType === type.value ? 'border-ink bg-sunken' : 'border-line hover:bg-sunken/60'}`}
              >
                <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${metricType === type.value ? 'border-ink bg-ink shadow-[inset_0_0_0_2px_rgb(var(--sunken))]' : 'border-line'}`} />
                <span>
                  <span className="block text-sm font-bold">{type.title}</span>
                  <span className="block text-xs text-ink-faint">{type.description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="exercise-notes">Notes (optional)</label>
          <textarea
            id="exercise-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Form cues, variations, etc."
            rows={2}
            className="input h-auto py-3"
          />
        </div>

        {error && <Banner tone="error">{error}</Banner>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Adding…' : 'Add exercise'}
        </button>
      </form>
    </Sheet>
  )
}
