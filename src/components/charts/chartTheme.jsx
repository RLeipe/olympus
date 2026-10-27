import { formatChartDate } from '../../utils/chartData'

// Chart colors follow the CSS tokens in src/index.css
export const COLORS = {
  primary: 'rgb(var(--accent-strong))',
  secondary: 'rgb(var(--extra))',
  bar: 'rgb(var(--ink-soft) / 0.32)',
  grid: 'rgb(var(--line))',
  axis: 'rgb(var(--ink-soft))',
  surface: 'rgb(var(--surface))'
}

const tick = { fontSize: 12.5, fill: COLORS.axis, fontWeight: 500 }

// Sessions are spaced evenly, whatever the time between them, so a long break
// doesn't squeeze everything else to the edges
export const xAxisProps = {
  dataKey: 'date',
  tickFormatter: formatChartDate,
  tick,
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
  minTickGap: 28
}

export const yAxisProps = {
  tick,
  tickLine: false,
  axisLine: false,
  width: 40
}

export const gridProps = { stroke: COLORS.grid, strokeDasharray: '3 4', vertical: false }

export const cursorProps = { stroke: COLORS.axis, strokeWidth: 1, strokeDasharray: '3 3' }

export function lineDot(color) {
  return { r: 2.5, fill: COLORS.surface, stroke: color, strokeWidth: 2 }
}

export function activeDot(color) {
  return { r: 5, fill: color, stroke: COLORS.surface, strokeWidth: 2 }
}

// Legend shown above a chart: items are { label, color, kind: 'line' | 'bar' }
export function ChartLegend({ items }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
      {items.map(item => (
        <span key={item.label} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
          <span
            className={item.kind === 'bar' ? 'w-2.5 h-2.5 rounded-sm' : 'w-3 h-[3px] rounded-full'}
            style={{ background: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  )
}

// Tooltip card: a date, headline rows and the sets logged that day
export function TooltipCard({ date, rows, sets }) {
  return (
    <div className="bg-surface border border-line rounded-xl shadow-pop px-3 py-2.5 text-xs min-w-[9rem]">
      <p className="font-bold text-ink mb-1.5">{formatChartDate(date)}</p>
      {rows.filter(Boolean).map(row => (
        <div key={row.label} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-ink-soft">
            {row.color && <span className="w-2 h-2 rounded-full" style={{ background: row.color }} />}
            {row.label}
          </span>
          <span className="font-bold text-ink tabular-nums">{row.value}</span>
        </div>
      ))}
      {sets?.length > 0 && (
        <div className="mt-2 pt-2 border-t border-line text-ink-faint space-y-0.5">
          {sets.map((text, i) => <p key={i} className="tabular-nums">{text}</p>)}
        </div>
      )}
    </div>
  )
}

export function EmptyChart({ children = 'No data in this range' }) {
  return (
    <div className="h-40 flex items-center justify-center text-sm text-ink-faint rounded-xl bg-sunken/50">
      {children}
    </div>
  )
}
