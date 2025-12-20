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

// Helper function to format seconds as MM:SS
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function TimeBasedExerciseChart({ data, exerciseName }) {
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

        <p className="text-blue-600 text-sm">Max: {formatDuration(data.maxDuration)}</p>
        <p className="text-gray-600 text-sm">Total: {formatDuration(data.totalDuration)}</p>

        <div className="mt-2 pt-2 border-t text-xs text-gray-500">
          <p className="font-medium mb-1">Sets logged:</p>
          {sets.map((set, idx) => (
            <p key={idx}>
              Set {set.set_number}: {formatDuration(set.reps)}
            </p>
          ))}
        </div>
      </div>
    )
  }

  // Custom Y-axis tick formatter
  const yAxisFormatter = (value) => formatDuration(value)

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

        <XAxis
          dataKey="date"
          tickFormatter={formatChartDate}
          stroke="#888"
        />

        {/* Left Y-axis for max duration */}
        <YAxis
          yAxisId="left"
          label={{ value: 'Max Duration', angle: -90, position: 'insideLeft' }}
          stroke="#888"
          tickFormatter={yAxisFormatter}
        />

        {/* Right Y-axis for total duration */}
        <YAxis
          yAxisId="right"
          orientation="right"
          label={{ value: 'Total Duration', angle: 90, position: 'insideRight' }}
          stroke="#888"
          tickFormatter={yAxisFormatter}
        />

        <Tooltip content={<CustomTooltip />} />

        <Legend />

        {/* Total duration bars (on right axis) */}
        <Bar
          yAxisId="right"
          dataKey="totalDuration"
          fill="#e5e7eb"
          name="Total Duration"
          opacity={0.5}
        />

        {/* Max duration line (on left axis) */}
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="maxDuration"
          stroke="#3b82f6"
          strokeWidth={3}
          name="Max Duration"
          dot={{ fill: '#3b82f6', r: 5 }}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
