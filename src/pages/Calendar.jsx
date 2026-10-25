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
import { Banner, Loading, Segmented, Sheet } from '../components/ui'
import { ChevronLeftIcon, ChevronRightIcon } from '../components/icons'

const STRIP_WEEKS = 8
const VIEW_KEY = 'olympus.calendarView'

const STRAVA_MESSAGES = {
  connected: { text: 'Strava connected. Syncing your activities...', tone: 'success' },
  denied: { text: 'Strava connection was cancelled.', tone: 'warn' },
  'missing-scope': { text: 'Strava needs permission to read your activities. Please connect again and keep the activity checkbox ticked.', tone: 'warn' }
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

  if (!currentUser) return <Loading />

  const hasPlan = plan.sessions.length > 0
  const message = STRAVA_MESSAGES[stravaMessage]

  return (
    <div className="space-y-4">
      {message && (
        <Banner tone={message.tone} onClose={() => setStravaMessage(null)}>{message.text}</Banner>
      )}

      {training.needsMigration && (
        <Banner>
          Database update missing: run <code>supabase/migrations/002_plan_notes_strava.sql</code> in the Supabase SQL editor.
        </Banner>
      )}

      {plan.errors.length > 0 && (
        <Banner tone="error">
          <p className="font-bold mb-1">Some plan entries could not be read and are hidden:</p>
          <ul className="list-disc pl-5 font-normal">{plan.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </Banner>
      )}

      {training.error && (
        <Banner tone="error">Failed to load data: {training.error}</Banner>
      )}

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="eyebrow mb-1">{currentUser.name} · {view === 'weeks' ? 'Two weeks' : 'Month'}</div>
          <h1 className="title text-[1.35rem] md:text-4xl tracking-[0.04em] md:tracking-[0.08em] truncate">
            {rangeTitle(view, anchor, range)}
          </h1>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => move(-1)} className="icon-btn" aria-label="Previous"><ChevronLeftIcon /></button>
          <button onClick={() => setAnchor(todayIso)} className="btn-secondary px-3.5">Today</button>
          <button onClick={() => move(1)} className="icon-btn" aria-label="Next"><ChevronRightIcon /></button>
        </div>
      </div>

      <WeekStrip weeks={weeks} hasPlan={hasPlan} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented value={view} onChange={changeView} options={[['weeks', '2 weeks'], ['month', 'Month']]} />
        <StravaBar strava={strava} />
      </div>

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
        <p className="text-xs text-ink-faint text-center">
          No training plan yet for {currentUser.name}. Plans live in <code>plan/{currentUser.name.toLowerCase()}/</code>.
        </p>
      )}

      {selectedDate && (
        <Sheet
          title={parseISODate(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          onClose={() => setSelectedDate(null)}
        >
          <DayCard
            bare
            date={selectedDate}
            day={days[selectedDate]}
            note={training.notes[selectedDate]}
            isToday={selectedDate === todayIso}
            userId={currentUser.id}
            onNoteSaved={training.setNote}
          />
        </Sheet>
      )}
    </div>
  )
}

function TwoWeeks({ range, days, weeks, notes, todayIso, userId, onNoteSaved }) {
  const weekStarts = [range.start, addDays(range.start, 7)]

  return (
    <div className="space-y-6">
      {weekStarts.map(weekStart => {
        const summary = weeks.find(w => w.start === weekStart)
        return (
          <section key={weekStart}>
            <div className="flex items-center justify-between gap-3 mb-2.5 px-1">
              <h2 className="eyebrow">
                Week of {parseISODate(weekStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </h2>
              {summary?.planned > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 rounded-full bg-sunken overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(1, summary.done / summary.planned) * 100}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-ink-soft tabular-nums">{summary.done}/{summary.planned}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 items-start">
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
