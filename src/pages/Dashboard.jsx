import { useUser } from '../contexts/UserContext'
import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'
import {
  aggregateWeightedExercise,
  aggregateRepsExercise,
  aggregateTimeBasedExercise,
  summarizeExercise,
  formatSeconds,
  withTime
} from '../utils/chartData'
import { addDays, parseISODate, relativeDay, today } from '../utils/dates'
import WeightedExerciseChart from '../components/charts/WeightedExerciseChart'
import RepsExerciseChart from '../components/charts/RepsExerciseChart'
import TimeBasedExerciseChart from '../components/charts/TimeBasedExerciseChart'
import BodyWeightChart from '../components/charts/BodyWeightChart'
import { COLORS } from '../components/charts/chartTheme'
import { PageHeader, Loading, Segmented } from '../components/ui'
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon, PlusIcon } from '../components/icons'

const RANGES = [['3m', '3M', 91], ['6m', '6M', 182], ['1y', '1Y', 365], ['all', 'All', null]]
const RANGE_KEY = 'olympus.statsRange'

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

// How each metric type shows its headline number
const METRIC = {
  one_rep_max: { label: 'Top set', tag: 'Weighted', format: v => `${v}`, unit: 'kg' },
  max_consecutive: { label: 'Max reps', tag: 'Reps', format: v => `${v}`, unit: 'reps' },
  time_based: { label: 'Longest', tag: 'Time', format: formatSeconds, unit: '' }
}

function readRange() {
  try { return localStorage.getItem(RANGE_KEY) || '6m' } catch { return '6m' }
}

export default function Dashboard() {
  const { currentUser } = useUser()
  const [exercises, setExercises] = useState([])
  const [exerciseData, setExerciseData] = useState({})
  const [bodyWeightData, setBodyWeightData] = useState([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(readRange)
  const [expanded, setExpanded] = useState(null)

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
    try { localStorage.setItem(RANGE_KEY, next) } catch { /* private mode */ }
  }

  const todayIso = today()
  const rangeDays = RANGES.find(([value]) => value === range)?.[2]
  const rangeStart = rangeDays ? addDays(todayIso, -rangeDays) : '0000-00-00'

  // Exercises with data, most recently trained first
  const trained = useMemo(() => exercises
    .map(exercise => ({ exercise, data: exerciseData[exercise.id] || [] }))
    .filter(({ data }) => data.length > 0)
    .sort((a, b) => b.data[b.data.length - 1].date.localeCompare(a.data[a.data.length - 1].date)),
  [exercises, exerciseData])

  if (!currentUser || loading) {
    return <Loading label="Loading stats" />
  }

  const weightInRange = bodyWeightData.filter(log => log.date >= rangeStart)

  return (
    <div>
      <PageHeader eyebrow={`${currentUser.name} · Progress`} title="Stats">
        <Segmented size="sm" value={range} onChange={changeRange} options={RANGES.map(([value, label]) => [value, label])} />
      </PageHeader>

      {trained.length > 0 && <SummaryTiles trained={trained} bodyWeight={bodyWeightData} todayIso={todayIso} />}

      {bodyWeightData.length > 0 && (
        <BodyWeightCard all={bodyWeightData} inRange={weightInRange} />
      )}

      {trained.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-ink-soft mb-5">No workouts logged yet. Start by logging your first workout.</p>
          <Link to="/log" className="btn-primary"><PlusIcon className="w-5 h-5" /> Log workout</Link>
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-between mt-8 mb-3">
            <h2 className="eyebrow">Exercises</h2>
            <span className="text-xs text-ink-faint">{trained.length} tracked</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 grid-flow-row-dense">
            {trained.map(({ exercise, data }) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                data={data}
                rangeData={data.filter(d => d.date >= rangeStart)}
                expanded={expanded === exercise.id}
                onToggle={() => setExpanded(expanded === exercise.id ? null : exercise.id)}
                todayIso={todayIso}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SummaryTiles({ trained, bodyWeight, todayIso }) {
  const since = addDays(todayIso, -30)
  const days = new Set()
  let sets = 0
  let lastDate = null
  for (const { data } of trained) {
    for (const day of data) {
      if (day.date >= since) {
        days.add(day.date)
        sets += day.sets.length
      }
      if (!lastDate || day.date > lastDate) lastDate = day.date
    }
  }
  const latestWeight = bodyWeight.length ? bodyWeight[bodyWeight.length - 1] : null

  const tiles = [
    { label: 'Strength days', value: days.size, sub: 'last 30 days' },
    { label: 'Sets', value: sets, sub: 'last 30 days' },
    {
      label: 'Last session',
      value: lastDate ? parseISODate(lastDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '–',
      sub: lastDate ? relativeDay(lastDate, todayIso) : ''
    },
    { label: 'Body weight', value: latestWeight ? Number(latestWeight.weight).toFixed(1) : '–', unit: latestWeight ? 'kg' : '', sub: latestWeight ? relativeDay(latestWeight.date, todayIso) : 'not logged' }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
      {tiles.map(tile => (
        <div key={tile.label} className="card px-4 py-3.5">
          <div className="eyebrow">{tile.label}</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="num text-3xl md:text-4xl font-semibold leading-none">{tile.value}</span>
            {tile.unit && <span className="text-sm font-semibold text-ink-faint">{tile.unit}</span>}
          </div>
          <div className="text-xs text-ink-faint mt-1">{tile.sub}</div>
        </div>
      ))}
    </div>
  )
}

function Delta({ value, format, unit }) {
  if (value == null || value === 0) return null
  const up = value > 0
  const Arrow = up ? ArrowUpIcon : ArrowDownIcon
  return (
    <span className={`chip gap-0.5 ${up ? 'text-accent-strong' : 'text-ink-soft'}`}>
      <Arrow className="w-3 h-3" strokeWidth={3} />
      {format(Math.abs(Math.round(value * 10) / 10))}{unit && ` ${unit}`}
    </span>
  )
}

function BodyWeightCard({ all, inRange }) {
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
      <BodyWeightChart data={inRange} height={180} />
    </div>
  )
}

function Sparkline({ data, dataKey }) {
  const gradientId = useId().replace(/:/g, '')
  const points = withTime(data.filter(d => d[dataKey] != null))
  if (points.length < 2) {
    return <div className="h-12 flex items-center text-xs text-ink-faint">{points.length ? 'One session in this range' : 'No sessions in this range'}</div>
  }

  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={points} margin={{ top: 4, right: 2, left: 2, bottom: 2 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.25} />
            <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} hide />
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <Area
          type="linear"
          dataKey={dataKey}
          stroke={COLORS.primary}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
          dot={({ index, cx, cy }) => index === points.length - 1
            ? <circle key="last" cx={cx} cy={cy} r={3.5} fill={COLORS.primary} />
            : <g key={index} />}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function ExerciseCard({ exercise, data, rangeData, expanded, onToggle, todayIso }) {
  const metric = METRIC[exercise.metric_type]
  const summary = summarizeExercise(exercise.metric_type, data)
  const Chart = CHART[exercise.metric_type]

  if (!metric || !summary) return null

  const delta = summary.previous != null && summary.latest != null ? summary.latest - summary.previous : null
  const isBest = summary.latest != null && summary.latest === summary.best && summary.sessions > 1

  return (
    <div className={`card overflow-hidden transition ${expanded ? 'md:col-span-2 xl:col-span-3' : ''}`}>
      <button onClick={onToggle} className="w-full text-left p-4 pb-3 hover:bg-sunken/40 transition" aria-expanded={expanded}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold truncate">{exercise.name}</h3>
            <div className="text-xs text-ink-faint">
              {metric.label} · {relativeDay(summary.lastDate, todayIso)}
            </div>
          </div>
          <ChevronDownIcon className={`w-5 h-5 shrink-0 text-ink-faint transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="num text-4xl font-semibold leading-none">
              {summary.latest != null ? metric.format(summary.latest) : '–'}
            </span>
            {metric.unit && <span className="text-sm font-semibold text-ink-faint">{metric.unit}</span>}
            {exercise.metric_type === 'one_rep_max' && summary.last?.topReps && (
              <span className="text-sm font-semibold text-ink-soft">× {summary.last.topReps}</span>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {isBest ? (
              <span className="chip text-accent-strong">Best</span>
            ) : (
              summary.best != null && <span className="text-[11px] font-semibold text-ink-faint">Best {metric.format(summary.best)}{metric.unit && ` ${metric.unit}`}</span>
            )}
            <Delta value={delta} format={metric.format} unit={metric.unit} />
          </div>
        </div>

        {!expanded && (
          <div className="mt-3 -mx-1">
            <Sparkline data={rangeData} dataKey={summary.key} />
          </div>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-line/70">
          <div className="flex gap-4 text-xs text-ink-faint py-3">
            <span><b className="text-ink">{rangeData.length}</b> sessions in range</span>
            <span><b className="text-ink">{summary.sessions}</b> total</span>
          </div>
          <Chart data={rangeData} />
        </div>
      )}
    </div>
  )
}
