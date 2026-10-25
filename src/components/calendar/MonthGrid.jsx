import { addDays, addMonths, dateRange, parseISODate, startOfWeek } from '../../utils/dates'
import { STATUS_STYLES, TYPE_LETTER } from './format'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Compact month overview: one marker per session, colored by outcome. Tap a day for details.
export default function MonthGrid({ monthStart, days, notes, todayIso, onSelect }) {
  const month = monthStart.slice(0, 7)
  const lastOfMonth = addDays(addMonths(monthStart, 1), -1)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = addDays(startOfWeek(lastOfMonth), 6)

  return (
    <div className="card p-2 md:p-4">
      <div className="grid grid-cols-7 gap-1 md:gap-1.5 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="eyebrow text-center py-1.5 tracking-[0.08em]">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 md:gap-1.5">
        {dateRange(gridStart, gridEnd).map(date => {
          const inMonth = date.startsWith(month)
          const day = days[date]
          const markers = [
            ...(day?.results || [])
              .filter(r => r.session.type !== 'rest')
              .map(r => ({ status: r.evaluation.status, type: r.session.type })),
            ...(day?.extras || []).map(a => ({ status: 'extra', type: a.type }))
          ]
          const isToday = date === todayIso

          return (
            <button
              key={date}
              onClick={() => onSelect(date)}
              className={`min-h-[68px] md:min-h-[92px] rounded-xl p-1.5 text-left flex flex-col gap-1.5 transition
                ${inMonth ? 'bg-sunken/60 hover:bg-sunken' : 'opacity-35 hover:opacity-60'}`}
            >
              <div className="flex items-center justify-between">
                <span className={`num text-sm md:text-base font-semibold leading-none
                  ${isToday ? 'bg-accent text-accent-ink rounded-full w-6 h-6 -m-0.5 flex items-center justify-center' : 'text-ink-soft'}`}>
                  {parseISODate(date).getDate()}
                </span>
                {notes[date] && <span className="w-1.5 h-1.5 rounded-full bg-partial" title="Has a note" />}
              </div>
              <div className="flex flex-wrap gap-0.5 md:gap-1">
                {markers.map((m, i) => (
                  <span
                    key={i}
                    title={`${m.type} · ${STATUS_STYLES[m.status].label}`}
                    className={`w-[18px] h-[18px] md:w-6 md:h-6 rounded-md text-[10px] md:text-xs font-extrabold flex items-center justify-center ${STATUS_STYLES[m.status].marker}`}
                  >
                    {TYPE_LETTER[m.type]}
                  </span>
                ))}
              </div>
            </button>
          )
        })}
      </div>
      <Legend />
    </div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 px-1 text-[11px] text-ink-faint font-semibold">
      {['done', 'partial', 'missed', 'extra', 'planned'].map(status => (
        <span key={status} className="inline-flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-[3px] ${STATUS_STYLES[status].marker}`} />
          {STATUS_STYLES[status].label}
        </span>
      ))}
      <span className="ml-auto">R run · S strength · O other</span>
    </div>
  )
}
