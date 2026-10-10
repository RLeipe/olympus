import { useState } from 'react'
import { parseISODate } from '../../utils/dates'
import DayNoteEditor from '../DayNoteEditor'
import {
  STATUS_STYLES,
  sessionTitle,
  runTarget,
  plannedExercise,
  activitySummary,
  lapPace,
  loggedSets,
  sportLabel
} from './format'

// Everything for one day: planned sessions with their outcome, unplanned activities and the day note
export default function DayCard({ date, day, note, isToday, userId, onNoteSaved, bare = false }) {
  const [editing, setEditing] = useState(false)
  const results = day?.results || []
  const extras = day?.extras || []
  const isEmpty = results.length === 0 && extras.length === 0
  const dateObj = parseISODate(date)

  return (
    <div className={bare ? '' : `bg-white rounded-xl shadow-sm border p-3 md:p-4 ${isToday ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-100'}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-baseline gap-2 whitespace-nowrap">
          <span className={`font-bold ${isToday ? 'text-blue-700' : 'text-gray-900'}`}>
            {dateObj.toLocaleDateString('en-GB', { weekday: 'short' })}
          </span>
          <span className="text-sm text-gray-500">
            {dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
          {isToday && <span className="text-xs font-semibold bg-blue-600 text-white px-2 py-0.5 rounded-full">Today</span>}
        </div>
        {!note && !editing && (
          <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-blue-600 font-medium whitespace-nowrap">
            + Note
          </button>
        )}
      </div>

      <div className="space-y-2">
        {isEmpty && <p className="text-sm text-gray-400">Nothing planned</p>}
        {results.map((result, i) => (
          <PlannedSession key={i} result={result} />
        ))}
        {extras.map(actual => (
          <ExtraSession key={actual.id} actual={actual} />
        ))}
      </div>

      {editing ? (
        <div className="mt-3">
          <DayNoteEditor
            userId={userId}
            date={date}
            initialNote={note || ''}
            autoFocus
            onSaved={(saved) => { setEditing(false); onNoteSaved(date, saved) }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : note && (
        <button
          onClick={() => setEditing(true)}
          className="mt-3 w-full text-left text-sm text-gray-700 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2 whitespace-pre-wrap hover:border-yellow-300"
        >
          {note}
        </button>
      )}
    </div>
  )
}

function StatusBadge({ status, movedTo }) {
  const style = STATUS_STYLES[status]
  let label = style.label
  if (movedTo) label += ` ${parseISODate(movedTo).toLocaleDateString('en-GB', { weekday: 'short' })}`
  return (
    <span className={`text-xs font-semibold whitespace-nowrap ${style.text}`}>
      {style.icon} {label}
    </span>
  )
}

function PlannedSession({ result }) {
  const { session, actual, evaluation } = result
  const style = STATUS_STYLES[evaluation.status]
  const movedTo = actual && actual.date !== session.date ? actual.date : null

  if (session.type === 'rest') {
    return (
      <div className={`rounded-lg border px-3 py-2 ${style.card}`}>
        <span className="text-sm text-gray-500">{sessionTitle(session)}</span>
        {session.notes && <p className="text-xs text-gray-500 italic mt-1">{session.notes}</p>}
      </div>
    )
  }

  return (
    <div className={`rounded-lg border px-3 py-2 ${style.card}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-sm text-gray-900">{sessionTitle(session)}</div>
          {session.type === 'run' && <div className="text-xs text-gray-600">{runTarget(session)}</div>}
          {session.type === 'other' && session.duration_min && (
            <div className="text-xs text-gray-600">{session.duration_min} min</div>
          )}
        </div>
        <StatusBadge status={evaluation.status} movedTo={movedTo} />
      </div>

      {session.type === 'strength' && <StrengthDetails session={session} evaluation={evaluation} matched={Boolean(actual)} />}

      {session.type !== 'strength' && actual?.activity && (
        <div className="mt-1 text-xs text-gray-800 font-medium">{activitySummary(actual.activity)}</div>
      )}

      {evaluation.intervals?.pending && <div className="mt-1 text-xs text-gray-500">Laps not synced yet</div>}
      {evaluation.intervals?.laps?.length > 0 && (
        <div className="mt-1 text-xs text-gray-700">
          Reps: {evaluation.intervals.laps.map(lapPace).join(' · ')}
        </div>
      )}

      {actual && session.type !== 'strength' && evaluation.issues?.length > 0 && (
        <div className="mt-1 text-xs text-amber-700">{evaluation.issues.join(' · ')}</div>
      )}
      {evaluation.flags?.length > 0 && (
        <div className="mt-1 text-xs text-amber-700">{evaluation.flags.join(' · ')}</div>
      )}
      {session.notes && <p className="text-xs text-gray-500 italic mt-1">{session.notes}</p>}
    </div>
  )
}

function StrengthDetails({ session, evaluation, matched }) {
  if (!matched || !evaluation.exercises?.length) {
    return (
      <ul className="mt-1 space-y-0.5">
        {session.exercises.map((ex, i) => (
          <li key={i} className="text-xs text-gray-700 flex justify-between gap-2">
            <span>{ex.name}</span>
            <span className="text-gray-500 whitespace-nowrap">{plannedExercise(ex)}</span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul className="mt-1 space-y-1">
      {evaluation.exercises.map((ex, i) => {
        const complete = ex.completed >= ex.planned.sets
        return (
          <li key={i} className="text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-gray-800 font-medium">{ex.planned.name}</span>
              <span className={`whitespace-nowrap font-semibold ${complete ? 'text-emerald-700' : 'text-amber-700'}`}>
                {ex.completed}/{ex.planned.sets} sets
              </span>
            </div>
            <div className="flex justify-between gap-2 text-gray-500">
              <span>plan {plannedExercise(ex.planned)}</span>
              <span className="text-right">{loggedSets(ex.logged, ex.planned.seconds !== undefined ? 'time_based' : null)}</span>
            </div>
          </li>
        )
      })}
      {evaluation.extraExercises.map((ex, i) => (
        <li key={`extra-${i}`} className="text-xs text-violet-700">
          + {ex.name} {loggedSets(ex.sets, ex.metricType)}
        </li>
      ))}
    </ul>
  )
}

function ExtraSession({ actual }) {
  const style = STATUS_STYLES.extra
  const title = actual.source === 'log'
    ? 'Strength'
    : actual.activity.name || sportLabel(actual.activity.sport_type)

  return (
    <div className={`rounded-lg border px-3 py-2 ${style.card}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold text-sm text-gray-900 min-w-0 truncate">{title}</div>
        <StatusBadge status="extra" />
      </div>
      {actual.source === 'log' ? (
        <ul className="mt-1 space-y-0.5">
          {actual.exercises.map((ex, i) => (
            <li key={i} className="text-xs text-gray-700 flex justify-between gap-2">
              <span>{ex.name}</span>
              <span className="text-gray-500 text-right">{loggedSets(ex.sets, ex.metricType)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-1 text-xs text-gray-800">
          <span className="text-gray-500">{sportLabel(actual.activity.sport_type)} · </span>
          {activitySummary(actual.activity)}
        </div>
      )}
    </div>
  )
}
