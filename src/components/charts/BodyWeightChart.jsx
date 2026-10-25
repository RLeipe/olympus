import { useId } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { withTime } from '../../utils/chartData'
import { COLORS, xAxisProps, yAxisProps, gridProps, cursorProps, lineDot, activeDot, TooltipCard, EmptyChart } from './chartTheme'

function WeightTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const day = payload[0].payload
  return <TooltipCard date={day.date} rows={[{ label: 'Weight', value: `${day.weight} kg`, color: COLORS.primary }]} />
}

// data: body_weight_logs rows in any order
export default function BodyWeightChart({ data, height = 220 }) {
  const gradientId = useId().replace(/:/g, '')

  if (!data || data.length === 0) return <EmptyChart>No body weight in this range</EmptyChart>

  const chartData = withTime(data
    .map(log => ({ date: log.date, weight: parseFloat(log.weight) }))
    .sort((a, b) => a.date.localeCompare(b.date)))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.28} />
            <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis {...xAxisProps} />
        <YAxis {...yAxisProps} domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={v => Math.round(v)} />
        <Tooltip content={<WeightTooltip />} cursor={cursorProps} />
        <Area
          type="linear"
          dataKey="weight"
          stroke={COLORS.primary}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={chartData.length <= 40 ? lineDot(COLORS.primary) : false}
          activeDot={activeDot(COLORS.primary)}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
