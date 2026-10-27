import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { COLORS, xAxisProps, spacedData, yAxisProps, gridProps, cursorProps, lineDot, activeDot, ChartLegend, TooltipCard, EmptyChart } from './chartTheme'

function RepsTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const day = payload[0].payload
  return (
    <TooltipCard
      date={day.date}
      rows={[
        { label: 'Max', value: `${day.maxReps} reps`, color: COLORS.primary },
        { label: 'Total', value: `${day.totalReps} reps` }
      ]}
      sets={(day.sets || []).map(set => `Set ${set.set_number}: ${set.reps} reps${set.weight ? ` @ ${set.weight} kg` : ''}`)}
    />
  )
}

export default function RepsExerciseChart({ data, spacing }) {
  if (!data || data.length === 0) return <EmptyChart />

  return (
    <div>
      <ChartLegend items={[
        { label: 'Max consecutive', color: COLORS.primary },
        { label: 'Total reps', color: COLORS.bar, kind: 'bar' }
      ]} />
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={spacedData(data, spacing)} margin={{ top: 8, right: 4, left: -6, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis {...xAxisProps(spacing)} />
          <YAxis yAxisId="left" {...yAxisProps} allowDecimals={false} />
          <YAxis yAxisId="right" orientation="right" hide />
          <Tooltip content={<RepsTooltip />} cursor={cursorProps} />
          <Bar yAxisId="right" dataKey="totalReps" fill={COLORS.bar} radius={[4, 4, 0, 0]} maxBarSize={18} />
          <Line yAxisId="left" type="linear" dataKey="maxReps" stroke={COLORS.primary} strokeWidth={2} dot={lineDot(COLORS.primary)} activeDot={activeDot(COLORS.primary)} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
