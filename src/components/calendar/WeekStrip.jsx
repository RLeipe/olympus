import { parseISODate } from '../../utils/dates'

// Consistency at a glance: this week's progress plus the last weeks as bars
export default function WeekStrip({ weeks, hasPlan }) {
  const current = weeks[weeks.length - 1]
  const maxCount = Math.max(1, ...weeks.map(w => (w.planned > 0 ? w.planned : w.extras)))

  return (
    <div className="card p-4 md:p-5 flex items-stretch gap-5">
      <div className="shrink-0 flex flex-col justify-between">
        <div className="eyebrow">This week</div>
        <div className="num text-5xl font-semibold leading-none mt-2">
          {hasPlan ? (
            <>{current.done}<span className="text-ink-faint">/{current.planned}</span></>
          ) : (
            current.extras
          )}
        </div>
        <div className="text-xs text-ink-faint mt-1.5">
          {hasPlan ? 'planned sessions done' : 'sessions'}
          {hasPlan && current.extras > 0 && ` · +${current.extras} extra`}
        </div>
      </div>

      <div className="flex-1 min-w-0 flex items-end justify-end gap-1.5 md:gap-2.5">
        {weeks.map((week, index) => {
          // Weeks without a plan show everything that was done
          const planned = week.planned > 0
          const total = planned ? week.planned : week.extras
          const done = planned ? week.done : week.extras
          const ratio = planned ? week.done / week.planned : null
          const color = ratio === null || ratio >= 0.8 ? 'bg-accent' : ratio >= 0.5 ? 'bg-partial' : 'bg-missed'
          const label = parseISODate(week.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          const isCurrent = index === weeks.length - 1
          return (
            <div
              key={week.start}
              className="flex-1 max-w-[2.25rem] min-w-0 flex flex-col items-center gap-1.5"
              title={`Week of ${label}: ${done}/${total}${week.extras ? ` (+${week.extras} extra)` : ''}`}
            >
              <div className="w-full h-16 relative rounded-md bg-sunken overflow-hidden">
                <div
                  className="absolute bottom-0 w-full bg-line"
                  style={{ height: `${(total / maxCount) * 100}%` }}
                />
                <div
                  className={`absolute bottom-0 w-full rounded-t-[3px] ${color}`}
                  style={{ height: `${(done / maxCount) * 100}%` }}
                />
              </div>
              <span className={`text-[10px] leading-none tabular-nums ${isCurrent ? 'font-bold text-ink' : 'text-ink-faint'}`}>
                {label.split(' ')[0]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
