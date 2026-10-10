import { parseISODate } from '../../utils/dates'

// Consistency at a glance: this week's progress plus the last weeks as bars
export default function WeekStrip({ weeks, hasPlan }) {
  const current = weeks[weeks.length - 1]
  const maxCount = Math.max(1, ...weeks.map(w => (w.planned > 0 ? w.planned : w.extras)))

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 flex items-center gap-4">
      <div className="shrink-0">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">This week</div>
        <div className="text-2xl font-bold text-gray-900">
          {hasPlan ? (
            <>{current.done}<span className="text-gray-400">/{current.planned}</span></>
          ) : (
            current.extras
          )}
        </div>
        <div className="text-xs text-gray-500">
          {hasPlan ? 'planned sessions done' : 'sessions'}
          {hasPlan && current.extras > 0 && ` · +${current.extras} extra`}
        </div>
      </div>

      <div className="flex-1 min-w-0 flex items-end justify-end gap-1 md:gap-2 h-14">
        {weeks.map(week => {
          // Weeks without a plan show everything that was done
          const planned = week.planned > 0
          const total = planned ? week.planned : week.extras
          const done = planned ? week.done : week.extras
          const ratio = planned ? week.done / week.planned : null
          const color = ratio === null ? 'bg-violet-400' : ratio >= 0.8 ? 'bg-emerald-500' : ratio >= 0.5 ? 'bg-amber-400' : 'bg-red-400'
          const label = parseISODate(week.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          return (
            <div
              key={week.start}
              className="flex-1 max-w-[2rem] min-w-0 flex flex-col items-center gap-0.5"
              title={`Week of ${label}: ${done}/${total}${week.extras ? ` (+${week.extras} extra)` : ''}`}
            >
              <div className="w-full h-10 relative">
                <div
                  className="absolute bottom-0 w-full bg-gray-200 rounded-sm"
                  style={{ height: `${Math.max(total / maxCount, 0.04) * 100}%` }}
                />
                <div
                  className={`absolute bottom-0 w-full rounded-sm ${color}`}
                  style={{ height: `${(done / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-[9px] md:text-[10px] text-gray-400 leading-none">{label.split(' ')[0]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
