import { useState, useEffect } from 'react'
import { useUser } from '../contexts/UserContext'
import { supabase } from '../lib/supabase'

export default function BodyWeight() {
  const { currentUser } = useUser()
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (currentUser) {
      fetchLogs()
    }
  }, [currentUser])

  async function fetchLogs() {
    try {
      const { data, error } = await supabase
        .from('body_weight_logs')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('date', { ascending: false })
        .limit(30)

      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error('Error fetching logs:', err)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: insertError } = await supabase
        .from('body_weight_logs')
        .upsert({
          user_id: currentUser.id,
          date,
          weight: parseFloat(weight)
        }, {
          onConflict: 'user_id,date'
        })

      if (insertError) throw insertError

      // Success - reset and refresh
      setWeight('')
      setDate(new Date().toISOString().split('T')[0])
      fetchLogs()
      alert('Body weight logged successfully!')
    } catch (err) {
      console.error('Error logging weight:', err)
      setError('Failed to log weight: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this weight entry?')) return

    try {
      const { error } = await supabase
        .from('body_weight_logs')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchLogs()
    } catch (err) {
      console.error('Error deleting log:', err)
      alert('Failed to delete: ' + err.message)
    }
  }

  if (!currentUser) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Body Weight Tracking</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Log Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Log Weight</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="75.5"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Logging...' : 'Log Weight'}
            </button>
          </form>
        </div>

        {/* Recent Logs */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Entries</h2>

          {logs.length === 0 ? (
            <p className="text-gray-500">No weight entries yet.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{log.weight} kg</div>
                    <div className="text-sm text-gray-500">{log.date}</div>
                  </div>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
