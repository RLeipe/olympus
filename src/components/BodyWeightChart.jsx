import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { formatChartDate } from '../utils/chartData'

export default function BodyWeightChart({ data, userName }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No body weight data yet
      </div>
    )
  }

  // Format data for chart
  const chartData = data
    .map(log => ({
      date: log.date,
      weight: parseFloat(log.weight)
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload

    return (
      <div className="bg-white border border-gray-300 rounded shadow-lg p-3">
        <p className="font-semibold mb-1">{formatChartDate(data.date)}</p>
        <p className="text-blue-600">{data.weight} kg</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

        <XAxis
          dataKey="date"
          tickFormatter={formatChartDate}
          stroke="#888"
        />

        <YAxis
          label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft' }}
          stroke="#888"
          domain={['dataMin - 2', 'dataMax + 2']}
        />

        <Tooltip content={<CustomTooltip />} />

        <Line
          type="monotone"
          dataKey="weight"
          stroke="#10b981"
          strokeWidth={3}
          dot={{ fill: '#10b981', r: 5 }}
          name="Body Weight"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
