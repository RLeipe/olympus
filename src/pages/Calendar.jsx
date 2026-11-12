import { useEffect, useMemo, useState } from 'react'
import { useUser } from '../contexts/UserContext'
import { useTrainingData } from '../hooks/useTrainingData'
import { useStrava } from '../hooks/useStrava'
import { getPlan } from '../utils/plan'
import { buildActuals, matchPlan, weekVolumes, weekStartsBetween } from '../utils/matching'
import { addDays, addMonths, dateRange, parseISODate, startOfMonth, startOfWeek, today } from '../utils/dates'
import DayCard from '../components/calendar/DayCard'
import WeekStrip from '../components/calendar/WeekStrip'
import StravaBar from '../components/calendar/StravaBar'
import { Banner, Loading } from '../components/ui'
import { ChevronLeftIcon, ChevronRightIcon } from '../components/icons'

const STRIP_WEEKS = 8

const STRAVA_MESSAGES = {
  connected: { text: 'Strava connected. Syncing your activities...', tone: 'success' },
  denied: { text: 'Strava connection was cancelled.', tone: 'warn' },
  'missing-scope': { text: 'Strava needs permission to read your activities. Please connect again and keep the activity checkbox ticked.', tone: 'warn' }
}

// Whole weeks (Monday to Sunday) covering the month of `anchor`
function monthRange(anchor) {
  const monthStart = startOfMonth(anchor)
  const lastOfMonth = addDays(addMonths(monthStart, 1), -1)
  return { start: startOfWeek(monthStart), end: addDays(startOfWeek(lastOfMonth), 6) }
}

export default function Calendar() {
  const { currentUser } = useUser()
  const todayIso = today()
  const [anchor, setAnchor] = useState(todayIso)
  const [jumpToToday, setJumpToToday] = useState(0)
  const [stravaMessage, setStravaMessage] = useState(() => new URLSearchParams(window.location.search).get('strava'))

  const range = monthRange(anchor)
  const month = anchor.slice(0, 7)
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

  // After "Today", scroll to today's card once it is rendered
  useEffect(() => {
    if (jumpToToday) document.getElementById(`day-${todayIso}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [jumpToToday, todayIso])

  const { days, weeks } = useMemo(() => {
    const sessions = plan.sessions.filter(s => s.date >= fetchFrom && s.date <= fetchTo)
    const actuals = buildActuals(training.workoutSets, training.activities)
    const { results, extras } = matchPlan(sessions, actuals, todayIso)

    const byDay = {}
    const dayEntry = date => (byDay[date] = byDay[date] || { results: [], extras: [] })
    results.forEach(r => dayEntry(r.session.date).results.push(r))
    extras.forEach(a => dayEntry(a.date).extras.push(a))

    return {
      days: byDay,
      weeks: weekVolumes(weekStartsBetween(stripStart, todayIso), plan.sessions, actuals)
    }
  }, [plan, training.workoutSets, training.activities, fetchFrom, fetchTo, todayIso, stripStart])

  function goToToday() {
    setAnchor(todayIso)
    setJumpToToday(n => n + 1)
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

      <div className="flex items-center justify-between gap-3">
        <h1 className="title text-[1.35rem] md:text-4xl tracking-[0.04em] md:tracking-[0.08em] truncate min-w-0">
          {parseISODate(startOfMonth(anchor)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </h1>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setAnchor(addMonths(anchor, -1))} className="icon-btn" aria-label="Previous month"><ChevronLeftIcon /></button>
          <button onClick={goToToday} className="btn-secondary px-3.5">Today</button>
          <button onClick={() => setAnchor(addMonths(anchor, 1))} className="icon-btn" aria-label="Next month"><ChevronRightIcon /></button>
        </div>
      </div>

      <WeekStrip weeks={weeks} />

      <StravaBar strava={strava} />

      <div className={training.loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        <Weeks
          range={range}
          month={month}
          days={days}
          notes={training.notes}
          todayIso={todayIso}
          userId={currentUser.id}
          onNoteSaved={training.setNote}
        />
      </div>

      {!hasPlan && (
        <p className="text-xs text-ink-faint text-center">
          No training plan yet for {currentUser.name}. Plans live in <code>plan/{currentUser.name.toLowerCase()}/</code>.
        </p>
      )}

    </div>
  )
}

// The month's weeks as rows of day cards, separated by hairlines; cards in a row share a
// height. Days of the neighbouring months that complete the first and last week are dimmed.
function Weeks({ range, month, days, notes, todayIso, userId, onNoteSaved }) {
  const weekStarts = weekStartsBetween(range.start, range.end)

  return (
    <div className="space-y-5">
      {weekStarts.map((weekStart, index) => (
        <section key={weekStart} className={index > 0 ? 'pt-5 border-t border-line' : ''}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {dateRange(weekStart, addDays(weekStart, 6)).map(date => (
              <DayCard
                key={date}
                date={date}
                day={days[date]}
                note={notes[date]}
                isToday={date === todayIso}
                muted={!date.startsWith(month)}
                userId={userId}
                onNoteSaved={onNoteSaved}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
