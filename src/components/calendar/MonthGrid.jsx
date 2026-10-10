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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 md:p-3">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
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
              className={`min-h-[64px] md:min-h-[88px] rounded-lg border p-1 text-left flex flex-col gap-1 transition-colors hover:border-blue-300
                ${inMonth ? 'bg-white' : 'bg-gray-50 opacity-50'}
                ${isToday ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-100'}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${isToday ? 'text-blue-700' : 'text-gray-600'}`}>
                  {parseISODate(date).getDate()}
                </span>
                {notes[date] && <span className="text-[10px] text-yellow-600" title="Has a note">✎</span>}
              </div>
              <div className="flex flex-wrap gap-0.5">
                {markers.map((m, i) => (
                  <span
                    key={i}
                    title={`${m.type} · ${STATUS_STYLES[m.status].label}`}
                    className={`w-5 h-5 md:w-6 md:h-6 rounded text-[10px] md:text-xs font-bold flex items-center justify-center
                      ${m.status === 'planned' || m.status === 'today'
                        ? `border ${m.status === 'today' ? 'border-blue-400 text-blue-600' : 'border-gray-300 text-gray-400'} border-dashed`
                        : `${STATUS_STYLES[m.status].dot} text-white`}`}
                  >
                    {TYPE_LETTER[m.type]}
                  </span>
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
