import { useUser } from '../contexts/UserContext'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { aggregateWeightedExercise, aggregateRepsExercise, aggregateTimeBasedExercise } from '../utils/chartData'
import { addDays, today } from '../utils/dates'
import WeightedExerciseChart from '../components/charts/WeightedExerciseChart'
import RepsExerciseChart from '../components/charts/RepsExerciseChart'
import TimeBasedExerciseChart from '../components/charts/TimeBasedExerciseChart'
import BodyWeightChart from '../components/charts/BodyWeightChart'
import { SPACINGS } from '../components/charts/chartTheme'
import { PageHeader, Loading, Segmented } from '../components/ui'
import { PlusIcon } from '../components/icons'

const RANGES = [['3m', '3M', 91], ['1y', '1Y', 365], ['all', 'All', null]]
const RANGE_KEY = 'olympus.statsRange'
const SPACING_KEY = 'olympus.statsSpacing'

const AGGREGATE = {
  one_rep_max: aggregateWeightedExercise,
  max_consecutive: aggregateRepsExercise,
  time_based: aggregateTimeBasedExercise
}

const CHART = {
  one_rep_max: WeightedExerciseChart,
  max_consecutive: RepsExerciseChart,
  time_based: TimeBasedExerciseChart
}

// A remembered choice, if it is still one of the options
function readChoice(key, options, fallback) {
  try {
    const stored = localStorage.getItem(key)
    return options.some(([value]) => value === stored) ? stored : fallback
  } catch {
    return fallback
  }
}

function saveChoice(key, value) {
  try { localStorage.setItem(key, value) } catch { /* private mode */ }
}

export default function Dashboard() {
  const { currentUser } = useUser()
  const [exercises, setExercises] = useState([])
  const [exerciseData, setExerciseData] = useState({})
  const [bodyWeightData, setBodyWeightData] = useState([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(() => readChoice(RANGE_KEY, RANGES, 'all'))
  const [spacing, setSpacing] = useState(() => readChoice(SPACING_KEY, SPACINGS, 'even'))

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData()
    }
  }, [currentUser])

  async function fetchDashboardData() {
    setLoading(true)
    try {
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('exercises')
        .select('*')
        .eq('category', 'strength')
        .order('name')

      if (exercisesError) throw exercisesError
      setExercises(exercisesData || [])

      // Sets per exercise, fetched in parallel and aggregated by metric type
      const results = await Promise.all((exercisesData || []).map(async exercise => {
        const { data: setsData, error: setsError } = await supabase
          .from('workout_sets')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('exercise_id', exercise.id)
          .order('workout_date')

        if (setsError) throw setsError
        const aggregate = AGGREGATE[exercise.metric_type]
        return [exercise.id, aggregate ? aggregate(setsData || []) : []]
      }))
      setExerciseData(Object.fromEntries(results))

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

  function changeRange(next) {
    setRange(next)
    saveChoice(RANGE_KEY, next)
  }

  function changeSpacing(next) {
    setSpacing(next)
    saveChoice(SPACING_KEY, next)
  }

  const todayIso = today()
  const rangeDays = RANGES.find(([value]) => value === range)?.[2]
  const rangeStart = rangeDays ? addDays(todayIso, -rangeDays) : '0000-00-00'

  // Exercises with data, alphabetically (the query sorts by name)
  const trained = exercises
    .map(exercise => ({ exercise, data: exerciseData[exercise.id] || [] }))
    .filter(({ data }) => data.length > 0)

  if (!currentUser || loading) {
    return <Loading label="Loading stats" />
  }

  const weightInRange = bodyWeightData.filter(log => log.date >= rangeStart)

  return (
    <div>
      <PageHeader title="Stats">
        <div className="flex items-center gap-2">
          <Segmented size="sm" value={range} onChange={changeRange} options={RANGES.map(([value, label]) => [value, label])} />
          <Segmented size="sm" value={spacing} onChange={changeSpacing} options={SPACINGS} />
        </div>
      </PageHeader>

      {bodyWeightData.length > 0 && (
        <BodyWeightCard all={bodyWeightData} inRange={weightInRange} spacing={spacing} />
      )}

      {trained.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-ink-soft mb-5">No workouts logged yet. Start by logging your first workout.</p>
          <Link to="/log" className="btn-primary"><PlusIcon className="w-5 h-5" /> Log workout</Link>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 mt-3">
          {trained.map(({ exercise, data }) => (
            <ExerciseCard key={exercise.id} exercise={exercise} data={data.filter(d => d.date >= rangeStart)} spacing={spacing} />
          ))}
        </div>
      )}
    </div>
  )
}

function BodyWeightCard({ all, inRange, spacing }) {
  const latest = Number(all[all.length - 1].weight)
  const first = inRange.length > 1 ? Number(inRange[0].weight) : null
  const change = first === null ? null : latest - first

  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="eyebrow">Body weight</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="num text-4xl font-semibold leading-none">{latest.toFixed(1)}</span>
            <span className="text-sm font-semibold text-ink-faint">kg</span>
          </div>
        </div>
        {change !== null && (
          <div className="text-right">
            <span className="chip text-ink-soft">
              {change > 0 ? '+' : change < 0 ? '−' : '±'}{Math.abs(change).toFixed(1)} kg
            </span>
            <div className="text-[11px] text-ink-faint mt-1">in this range</div>
          </div>
        )}
      </div>
      <BodyWeightChart data={inRange} height={180} spacing={spacing} />
    </div>
  )
}

function ExerciseCard({ exercise, data, spacing }) {
  const Chart = CHART[exercise.metric_type]
  if (!Chart) return null

  return (
    <div className="card p-4">
      <h3 className="font-bold mb-2">{exercise.name}</h3>
      <Chart data={data} spacing={spacing} />
    </div>
  )
}
