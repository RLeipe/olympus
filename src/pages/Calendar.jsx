import { useEffect, useMemo, useState } from 'react'
import { useUser } from '../contexts/UserContext'
import { useTrainingData } from '../hooks/useTrainingData'
import { useStrava } from '../hooks/useStrava'
import { getPlan } from '../utils/plan'
import { buildActuals, matchPlan, weekSummaries, weekStartsBetween } from '../utils/matching'
import { addDays, addMonths, dateRange, parseISODate, startOfMonth, startOfWeek, today } from '../utils/dates'
import DayCard from '../components/calendar/DayCard'
import MonthGrid from '../components/calendar/MonthGrid'
import WeekStrip from '../components/calendar/WeekStrip'
import StravaBar from '../components/calendar/StravaBar'

const STRIP_WEEKS = 8
const VIEW_KEY = 'olympus.calendarView'

const STRAVA_MESSAGES = {
  connected: { text: 'Strava connected. Syncing your activities...', className: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  denied: { text: 'Strava connection was cancelled.', className: 'bg-amber-50 border-amber-200 text-amber-800' },
  'missing-scope': { text: 'Strava needs permission to read your activities. Please connect again and keep the activity checkbox ticked.', className: 'bg-amber-50 border-amber-200 text-amber-800' }
}

function readView() {
  try { return localStorage.getItem(VIEW_KEY) || 'weeks' } catch { return 'weeks' }
}

function visibleRange(view, anchor) {
  if (view === 'weeks') {
    const start = startOfWeek(anchor)
    return { start, end: addDays(start, 13) }
  }
  const monthStart = startOfMonth(anchor)
  const lastOfMonth = addDays(addMonths(monthStart, 1), -1)
  return { start: startOfWeek(monthStart), end: addDays(startOfWeek(lastOfMonth), 6) }
}

function rangeTitle(view, anchor, range) {
  if (view === 'month') {
    return parseISODate(startOfMonth(anchor)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }
  const fmt = iso => parseISODate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${fmt(range.start)} – ${fmt(range.end)}`
}

export default function Calendar() {
  const { currentUser } = useUser()
  const todayIso = today()
  const [view, setView] = useState(readView)
  const [anchor, setAnchor] = useState(todayIso)
  const [selectedDate, setSelectedDate] = useState(null)
  const [stravaMessage, setStravaMessage] = useState(() => new URLSearchParams(window.location.search).get('strava'))

  const range = visibleRange(view, anchor)
  const stripStart = addDays(startOfWeek(todayIso), -7 * (STRIP_WEEKS - 1))
  // One extra day on each side so sessions done a day early or late still match
  const fetchFrom = addDays(range.start < stripStart ? range.start : stripStart, -1)
  const fetchTo = addDays(range.end > todayIso ? range.end : todayIso, 1)

  const training = useTrainingData(currentUser?.id, fetchFrom, fetchTo)
  const strava = useStrava(currentUser?.id, training.reload)
  const plan = useMemo(() => getPlan(currentUser?.name), [currentUser?.name])

  useEffect(() => {
    if (stravaMessage) window.history.replaceState(null, '', window.location.pathname)
  }, [stravaMessage])

  const { days, weeks, visibleWeeks } = useMemo(() => {
    const sessions = plan.sessions.filter(s => s.date >= fetchFrom && s.date <= fetchTo)
    const actuals = buildActuals(training.workoutSets, training.activities)
    const { results, extras } = matchPlan(sessions, actuals, todayIso)

    const byDay = {}
    const dayEntry = date => (byDay[date] = byDay[date] || { results: [], extras: [] })
    results.forEach(r => dayEntry(r.session.date).results.push(r))
    extras.forEach(a => dayEntry(a.date).extras.push(a))

    return {
      days: byDay,
      weeks: weekSummaries(weekStartsBetween(stripStart, todayIso), results, extras),
      visibleWeeks: weekSummaries(weekStartsBetween(range.start, range.end), results, extras)
    }
  }, [plan, training.workoutSets, training.activities, fetchFrom, fetchTo, todayIso, stripStart, range.start, range.end])

  function changeView(next) {
    setView(next)
    try { localStorage.setItem(VIEW_KEY, next) } catch { /* private mode */ }
  }

  function move(direction) {
    setAnchor(view === 'weeks' ? addDays(anchor, 7 * direction) : addMonths(anchor, direction))
  }

  if (!currentUser) return <div className="p-8">Loading...</div>

  const hasPlan = plan.sessions.length > 0
  const message = STRAVA_MESSAGES[stravaMessage]

  return (
    <div className="container mx-auto px-3 md:px-4 py-4 md:py-8 max-w-6xl space-y-4">
      {message && (
        <div className={`border rounded-lg px-4 py-3 text-sm flex justify-between gap-2 ${message.className}`}>
          <span>{message.text}</span>
          <button onClick={() => setStravaMessage(null)} className="font-bold">×</button>
        </div>
      )}

      {training.needsMigration && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
          Database update missing: run <code>supabase/migrations/002_plan_notes_strava.sql</code> in the Supabase SQL editor.
        </div>
      )}

      {plan.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">
          <p className="font-semibold mb-1">Some plan entries could not be read and are hidden:</p>
          <ul className="list-disc pl-5">{plan.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

      {training.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          Failed to load data: {training.error}
        </div>
      )}

      <WeekStrip weeks={weeks} hasPlan={hasPlan} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => move(-1)} className="w-9 h-9 rounded-lg bg-white border hover:bg-gray-50 font-bold text-gray-600" aria-label="Previous">‹</button>
          <button onClick={() => setAnchor(todayIso)} className="h-9 px-3 rounded-lg bg-white border hover:bg-gray-50 text-sm font-medium">Today</button>
          <button onClick={() => move(1)} className="w-9 h-9 rounded-lg bg-white border hover:bg-gray-50 font-bold text-gray-600" aria-label="Next">›</button>
          <h1 className="ml-2 text-base md:text-xl font-bold text-gray-900">{rangeTitle(view, anchor, range)}</h1>
        </div>
        <div className="flex bg-white border rounded-lg p-0.5 text-sm font-medium">
          {[['weeks', '2 weeks'], ['month', 'Month']].map(([value, label]) => (
            <button
              key={value}
              onClick={() => changeView(value)}
              className={`px-3 py-1.5 rounded-md ${view === value ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <StravaBar strava={strava} />

      <div className={training.loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        {view === 'weeks' ? (
          <TwoWeeks
            range={range}
            days={days}
            weeks={visibleWeeks}
            notes={training.notes}
            todayIso={todayIso}
            userId={currentUser.id}
            onNoteSaved={training.setNote}
          />
        ) : (
          <MonthGrid
            monthStart={startOfMonth(anchor)}
            days={days}
            notes={training.notes}
            todayIso={todayIso}
            onSelect={setSelectedDate}
          />
        )}
      </div>

      {!hasPlan && (
        <p className="text-xs text-gray-400 text-center">
          No training plan yet for {currentUser.name}. Plans live in <code>plan/{currentUser.name.toLowerCase()}/</code>.
        </p>
      )}

      {selectedDate && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center p-3 z-50" onClick={() => setSelectedDate(null)}>
          <div className="bg-white rounded-xl p-4 w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end -mt-1 mb-1">
              <button onClick={() => setSelectedDate(null)} className="text-sm text-gray-500 hover:text-gray-800 font-medium">Close</button>
            </div>
            <DayCard
              bare
              date={selectedDate}
              day={days[selectedDate]}
              note={training.notes[selectedDate]}
              isToday={selectedDate === todayIso}
              userId={currentUser.id}
              onNoteSaved={training.setNote}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function TwoWeeks({ range, days, weeks, notes, todayIso, userId, onNoteSaved }) {
  const weekStarts = [range.start, addDays(range.start, 7)]

  return (
    <div className="space-y-4">
      {weekStarts.map(weekStart => {
        const summary = weeks.find(w => w.start === weekStart)
        return (
          <section key={weekStart}>
            <div className="flex items-baseline justify-between mb-2 px-1">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Week of {parseISODate(weekStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </h2>
              {summary?.planned > 0 && (
                <span className="text-xs text-gray-500">{summary.done}/{summary.planned} done</span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
              {dateRange(weekStart, addDays(weekStart, 6)).map(date => (
                <DayCard
                  key={date}
                  date={date}
                  day={days[date]}
                  note={notes[date]}
                  isToday={date === todayIso}
                  userId={userId}
                  onNoteSaved={onNoteSaved}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
