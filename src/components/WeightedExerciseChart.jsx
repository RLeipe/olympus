import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { formatChartDate } from '../utils/chartData'

export default function WeightedExerciseChart({ data, exerciseName }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No workout data yet
      </div>
    )
  }

  // Custom tooltip to show workout details
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload
    const sets = data.sets || []

    return (
      <div className="bg-white border border-gray-300 rounded shadow-lg p-3">
        <p className="font-semibold mb-2">{formatChartDate(data.date)}</p>

        {data.rm1 && (
          <p className="text-blue-600 text-sm">1RM: {data.rm1}kg</p>
        )}

        {data.rm5 && (
          <p className="text-red-600 text-sm">5RM: {data.rm5}kg</p>
        )}

        {data.volume > 0 && (
          <p className="text-gray-600 text-sm">Volume: {data.volume}kg</p>
        )}

        <div className="mt-2 pt-2 border-t text-xs text-gray-500">
          <p className="font-medium mb-1">Sets logged:</p>
          {sets.map((set, idx) => (
            <p key={idx}>
              Set {set.set_number}: {set.reps}x{set.weight}kg
            </p>
          ))}
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data} margin={{ top: 20, right: 60, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

        <XAxis
          dataKey="date"
          tickFormatter={formatChartDate}
          stroke="#888"
        />

        {/* Left Y-axis for weight (1RM, 5RM) */}
        <YAxis
          yAxisId="left"
          label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft' }}
          stroke="#888"
        />

        {/* Right Y-axis for volume */}
        <YAxis
          yAxisId="right"
          orientation="right"
          label={{ value: 'Volume (kg)', angle: 90, position: 'insideRight' }}
          stroke="#888"
        />

        <Tooltip content={<CustomTooltip />} />

        <Legend />

        {/* Volume bars (on right axis) */}
        <Bar
          yAxisId="right"
          dataKey="volume"
          fill="#e5e7eb"
          name="Volume"
          opacity={0.5}
        />

        {/* 5RM line (on left axis) */}
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="rm5"
          stroke="#ef4444"
          strokeWidth={2}
          name="5RM"
          dot={{ fill: '#ef4444', r: 4 }}
          connectNulls={false}
        />

        {/* 1RM line (on left axis) */}
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="rm1"
          stroke="#3b82f6"
          strokeWidth={3}
          name="1RM"
          dot={{ fill: '#3b82f6', r: 5 }}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
