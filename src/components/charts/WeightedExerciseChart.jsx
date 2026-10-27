import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { COLORS, xAxisProps, spacedData, yAxisProps, gridProps, cursorProps, lineDot, activeDot, ChartLegend, TooltipCard, EmptyChart } from './chartTheme'

function WeightedTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const day = payload[0].payload
  return (
    <TooltipCard
      date={day.date}
      rows={[
        day.rm5 && { label: '5RM', value: `${day.rm5} kg`, color: COLORS.primary },
        day.rm1 && { label: '1RM', value: `${day.rm1} kg`, color: COLORS.secondary },
        day.volume > 0 && { label: 'Volume', value: `${day.volume.toLocaleString('en-GB')} kg` }
      ]}
      sets={(day.sets || []).map(set => `Set ${set.set_number}: ${set.reps} × ${set.weight ?? 0} kg`)}
    />
  )
}

export default function WeightedExerciseChart({ data, spacing }) {
  if (!data || data.length === 0) return <EmptyChart />

  return (
    <div>
      <ChartLegend items={[
        { label: '5RM (kg)', color: COLORS.primary },
        { label: '1RM (kg)', color: COLORS.secondary },
        { label: 'Volume', color: COLORS.bar, kind: 'bar' }
      ]} />
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={spacedData(data, spacing)} margin={{ top: 8, right: 4, left: -6, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis {...xAxisProps(spacing)} />
          <YAxis yAxisId="left" {...yAxisProps} domain={['auto', 'auto']} />
          <YAxis yAxisId="right" orientation="right" hide />
          <Tooltip content={<WeightedTooltip />} cursor={cursorProps} />
          <Bar yAxisId="right" dataKey="volume" fill={COLORS.bar} radius={[4, 4, 0, 0]} maxBarSize={18} />
          <Line yAxisId="left" type="linear" dataKey="rm1" stroke={COLORS.secondary} strokeWidth={2} dot={lineDot(COLORS.secondary)} activeDot={activeDot(COLORS.secondary)} connectNulls />
          <Line yAxisId="left" type="linear" dataKey="rm5" stroke={COLORS.primary} strokeWidth={2} dot={lineDot(COLORS.primary)} activeDot={activeDot(COLORS.primary)} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
