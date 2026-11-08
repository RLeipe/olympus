import { parseISODate } from '../../utils/dates'

function formatKm(km) {
  return km > 0 && km < 100 ? km.toFixed(1) : String(Math.round(km))
}

// Training volume at a glance: running km per week as bars (done in brass over planned
// in grey) and one mark per strength session under each week. weeks: from weekVolumes.
export default function WeekStrip({ weeks }) {
  const current = weeks[weeks.length - 1]
  const maxKm = Math.max(1, ...weeks.map(w => Math.max(w.runKm, w.plannedKm)))

  return (
    <div className="card p-4 md:p-5 flex items-stretch gap-5">
      <div className="shrink-0 flex flex-col justify-between">
        <div className="eyebrow">This week</div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="num text-5xl leading-none">{formatKm(current.runKm)}</span>
          <span className="text-sm font-semibold text-ink-faint">km</span>
        </div>
        <div className="text-xs text-ink-faint mt-1.5 space-y-0.5">
          {current.plannedKm > 0 && <div>of {formatKm(current.plannedKm)} km planned</div>}
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-[1px] bg-ink-soft" />
            {current.strength}{current.plannedStrength > 0 && `/${current.plannedStrength}`} strength
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 flex items-end justify-end gap-1.5 md:gap-2.5">
        {weeks.map((week, index) => {
          const label = parseISODate(week.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          const isCurrent = index === weeks.length - 1
          const planned = week.plannedKm > 0 ? ` of ${formatKm(week.plannedKm)} planned` : ''
          return (
            <div
              key={week.start}
              className="flex-1 max-w-[2.25rem] min-w-0 flex flex-col items-center gap-1.5"
              title={`Week of ${label}: ${formatKm(week.runKm)} km${planned}, ${week.strength} strength`}
            >
              <div className="w-full h-16 relative rounded-md bg-sunken overflow-hidden">
                <div
                  className="absolute bottom-0 w-full bg-line"
                  style={{ height: `${(week.plannedKm / maxKm) * 100}%` }}
                />
                <div
                  className="absolute bottom-0 w-full rounded-t-[3px] bg-accent"
                  style={{ height: `${(week.runKm / maxKm) * 100}%` }}
                />
              </div>
              <div className="h-1 flex gap-[2px]">
                {Array.from({ length: Math.min(week.strength, 6) }, (_, i) => (
                  <span key={i} className="w-1 h-1 rounded-[1px] bg-ink-soft" />
                ))}
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
