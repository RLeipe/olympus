import { useState } from 'react'
import { parseISODate } from '../../utils/dates'
import DayNoteEditor from '../DayNoteEditor'
import { DumbbellIcon, MoonIcon, NoteIcon, PulseIcon, RunIcon } from '../icons'
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

const TYPE_ICON = { run: RunIcon, strength: DumbbellIcon, other: PulseIcon, rest: MoonIcon }

// Everything for one day: planned sessions with their outcome, unplanned activities and the day note
export default function DayCard({ date, day, note, isToday, userId, onNoteSaved, bare = false }) {
  const [editing, setEditing] = useState(false)
  const results = day?.results || []
  const extras = day?.extras || []
  const isEmpty = results.length === 0 && extras.length === 0
  const dateObj = parseISODate(date)
  const compact = isEmpty && !note && !editing && !bare

  return (
    <div className={bare ? '' : `card ${compact ? 'px-4 py-3' : 'p-3.5 md:p-4'} ${isToday ? 'ring-1 ring-accent/70 border-transparent' : ''}`}>
      <div className={`flex items-center justify-between gap-2 ${compact ? '' : 'mb-3'}`}>
        <div className="flex items-baseline gap-2 whitespace-nowrap min-w-0">
          {!bare && (
            <>
              <span className="num text-2xl font-semibold leading-none">{dateObj.getDate()}</span>
              <span className="eyebrow">
                {dateObj.toLocaleDateString('en-GB', { weekday: 'short' })} · {dateObj.toLocaleDateString('en-GB', { month: 'short' })}
              </span>
            </>
          )}
          {isToday && <span className="chip text-accent-strong">Today</span>}
        </div>
        <div className="flex items-center gap-2">
          {compact && <span className="text-xs text-ink-faint whitespace-nowrap">Nothing planned</span>}
          {!note && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="h-7 rounded flex items-center justify-center gap-1.5 px-1.5 text-xs font-semibold text-ink-faint hover:text-ink hover:bg-sunken"
              aria-label="Add note"
              title="Add note"
            >
              <NoteIcon className="w-4 h-4" />
              {bare && 'Add note'}
            </button>
          )}
        </div>
      </div>

      {!compact && (
        <div className="space-y-2">
          {isEmpty && <p className="text-sm text-ink-faint">Nothing planned</p>}
          {results.map((result, i) => (
            <PlannedSession key={i} result={result} />
          ))}
          {extras.map(actual => (
            <ExtraSession key={actual.id} actual={actual} />
          ))}
        </div>
      )}

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
          className="mt-3 w-full flex gap-2 text-left text-sm text-ink-soft rounded-xl px-3 py-2.5 bg-partial/[0.07] hover:bg-partial/[0.12] transition"
        >
          <NoteIcon className="w-4 h-4 shrink-0 mt-0.5 text-partial" />
          <span className="whitespace-pre-wrap min-w-0">{note}</span>
        </button>
      )}
    </div>
  )
}

function StatusChip({ status, movedTo }) {
  const style = STATUS_STYLES[status]
  let label = style.label
  if (movedTo) label += ` ${parseISODate(movedTo).toLocaleDateString('en-GB', { weekday: 'short' })}`
  return <span className={`chip ${style.chip}`}>{label}</span>
}

function SessionTitle({ type, title }) {
  const Icon = TYPE_ICON[type] || PulseIcon
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon className="w-4 h-4 shrink-0 text-ink-faint" />
      <span className="font-bold text-sm truncate">{title}</span>
    </div>
  )
}

function PlannedSession({ result }) {
  const { session, actual, evaluation } = result
  const style = STATUS_STYLES[evaluation.status]
  const movedTo = actual && actual.date !== session.date ? actual.date : null

  if (session.type === 'rest') {
    return (
      <div className={`rounded-xl px-3 py-2.5 ${style.tile}`}>
        <SessionTitle type="rest" title={sessionTitle(session)} />
        {session.notes && <p className="text-xs text-ink-faint mt-1 pl-6">{session.notes}</p>}
      </div>
    )
  }

  return (
    <div className={`rounded-xl px-3 py-2.5 ${style.tile}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <SessionTitle type={session.type} title={sessionTitle(session)} />
          {session.type === 'run' && <div className="text-xs text-ink-soft mt-0.5 pl-6">{runTarget(session)}</div>}
          {session.type === 'other' && session.duration_min && (
            <div className="text-xs text-ink-soft mt-0.5 pl-6">{session.duration_min} min</div>
          )}
        </div>
        <StatusChip status={evaluation.status} movedTo={movedTo} />
      </div>

      <div className="pl-6">
        {session.type === 'strength' && <StrengthDetails session={session} evaluation={evaluation} matched={Boolean(actual)} />}

        {session.type !== 'strength' && actual?.activity && (
          <div className="mt-1.5 text-xs font-semibold tabular-nums">{activitySummary(actual.activity)}</div>
        )}

        {evaluation.intervals?.pending && <div className="mt-1 text-xs text-ink-faint">Laps not synced yet</div>}
        {evaluation.intervals?.laps?.length > 0 && (
          <div className="mt-1 text-xs text-ink-soft tabular-nums">
            Reps: {evaluation.intervals.laps.map(lapPace).join(' · ')}
          </div>
        )}

        {actual && session.type !== 'strength' && evaluation.issues?.length > 0 && (
          <div className="mt-1 text-xs font-medium text-partial">{evaluation.issues.join(' · ')}</div>
        )}
        {evaluation.flags?.length > 0 && (
          <div className="mt-1 text-xs font-medium text-partial">{evaluation.flags.join(' · ')}</div>
        )}
        {session.notes && <p className="text-xs text-ink-faint italic mt-1.5">{session.notes}</p>}
      </div>
    </div>
  )
}

function StrengthDetails({ session, evaluation, matched }) {
  if (!matched || !evaluation.exercises?.length) {
    return (
      <ul className="mt-1.5 space-y-0.5">
        {session.exercises.map((ex, i) => (
          <li key={i} className="text-xs flex justify-between gap-2">
            <span className="text-ink-soft">{ex.name}</span>
            <span className="text-ink-faint whitespace-nowrap tabular-nums">{plannedExercise(ex)}</span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul className="mt-1.5 space-y-1.5">
      {evaluation.exercises.map((ex, i) => {
        const complete = ex.completed >= ex.planned.sets
        return (
          <li key={i} className="text-xs">
            <div className="flex justify-between gap-2">
              <span className="font-semibold">{ex.planned.name}</span>
              <span className={`whitespace-nowrap font-bold tabular-nums ${complete ? 'text-accent-strong' : 'text-partial'}`}>
                {ex.completed}/{ex.planned.sets} sets
              </span>
            </div>
            <div className="flex justify-between gap-2 text-ink-faint tabular-nums">
              <span>{plannedExercise(ex.planned)}</span>
              <span className="text-right">{loggedSets(ex.logged, ex.planned.seconds !== undefined ? 'time_based' : null)}</span>
            </div>
          </li>
        )
      })}
      {evaluation.extraExercises.map((ex, i) => (
        <li key={`extra-${i}`} className="text-xs text-extra tabular-nums">
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
    <div className={`rounded-xl px-3 py-2.5 ${style.tile}`}>
      <div className="flex items-start justify-between gap-2">
        <SessionTitle type={actual.type} title={title} />
        <StatusChip status="extra" />
      </div>
      <div className="pl-6">
        {actual.source === 'log' ? (
          <ul className="mt-1.5 space-y-0.5">
            {actual.exercises.map((ex, i) => (
              <li key={i} className="text-xs flex justify-between gap-2">
                <span className="text-ink-soft">{ex.name}</span>
                <span className="text-ink-faint text-right tabular-nums">{loggedSets(ex.sets, ex.metricType)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-1.5 text-xs tabular-nums">
            <span className="text-ink-faint">{sportLabel(actual.activity.sport_type)} · </span>
            <span className="font-semibold">{activitySummary(actual.activity)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
