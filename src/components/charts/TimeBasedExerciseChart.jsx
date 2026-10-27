import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatSeconds } from '../../utils/chartData'
import { COLORS, xAxisProps, spacedData, yAxisProps, gridProps, cursorProps, lineDot, activeDot, ChartLegend, TooltipCard, EmptyChart } from './chartTheme'

function TimeTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const day = payload[0].payload
  return (
    <TooltipCard
      date={day.date}
      rows={[
        { label: 'Max', value: formatSeconds(day.maxDuration), color: COLORS.primary },
        { label: 'Total', value: formatSeconds(day.totalDuration) }
      ]}
      sets={(day.sets || []).map(set => `Set ${set.set_number}: ${formatSeconds(set.reps)}`)}
    />
  )
}

export default function TimeBasedExerciseChart({ data, spacing }) {
  if (!data || data.length === 0) return <EmptyChart />

  return (
    <div>
      <ChartLegend items={[
        { label: 'Longest set', color: COLORS.primary },
        { label: 'Total time', color: COLORS.bar, kind: 'bar' }
      ]} />
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={spacedData(data, spacing)} margin={{ top: 8, right: 4, left: -6, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis {...xAxisProps(spacing)} />
          <YAxis yAxisId="left" {...yAxisProps} tickFormatter={formatSeconds} />
          <YAxis yAxisId="right" orientation="right" hide />
          <Tooltip content={<TimeTooltip />} cursor={cursorProps} />
          <Bar yAxisId="right" dataKey="totalDuration" fill={COLORS.bar} radius={[4, 4, 0, 0]} maxBarSize={18} />
          <Line yAxisId="left" type="linear" dataKey="maxDuration" stroke={COLORS.primary} strokeWidth={2} dot={lineDot(COLORS.primary)} activeDot={activeDot(COLORS.primary)} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
