import { useState, useEffect } from 'react'
import { useUser } from '../contexts/UserContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { daysBetween, parseISODate, relativeDay, toISODate } from '../utils/dates'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import BodyWeightChart from '../components/charts/BodyWeightChart'
import { PageHeader, Loading, Banner, Stepper } from '../components/ui'
import { CheckIcon, TrashIcon } from '../components/icons'

function signed(value) {
  if (Math.abs(value) < 0.05) return '±0.0'
  return `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}`
}

export default function BodyWeight() {
  const { currentUser } = useUser()
  const toast = useToast()
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(new Date())
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
      const formattedDate = toISODate(date)
      const { error: insertError } = await supabase
        .from('body_weight_logs')
        .upsert({
          user_id: currentUser.id,
          date: formattedDate,
          weight: parseFloat(weight)
        }, {
          onConflict: 'user_id,date'
        })

      if (insertError) throw insertError

      // Success - reset and refresh
      setWeight('')
      setDate(new Date())
      fetchLogs()
      toast(`${parseFloat(weight)} kg saved`)
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
      toast('Entry deleted')
    } catch (err) {
      console.error('Error deleting log:', err)
      toast('Failed to delete: ' + err.message, 'error')
    }
  }

  if (!currentUser) {
    return <Loading />
  }

  const thisYear = String(new Date().getFullYear())
  // logs are newest first
  const latest = logs[0]
  const latestWeight = latest ? Number(latest.weight) : null
  // Closest entry at least a week / a month before the latest one
  const before = days => logs.find(log => latest && daysBetween(log.date, latest.date) >= days)
  const changes = latest
    ? [['7 days', before(7)], ['30 days', before(30)]].filter(([, log]) => log)
    : []

  return (
    <div>
      <PageHeader eyebrow={`${currentUser.name} · Body`} title="Weight" />

      <div className="grid md:grid-cols-5 gap-3 items-start">
        <div className="md:col-span-3 space-y-3">
          {/* Current weight and trend */}
          <div className="card p-4 md:p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="eyebrow">Current</div>
                {latest ? (
                  <>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="num text-6xl font-semibold leading-none">{latestWeight.toFixed(1)}</span>
                      <span className="text-base font-semibold text-ink-faint">kg</span>
                    </div>
                    <div className="text-xs text-ink-faint mt-1.5">Logged {relativeDay(latest.date)}</div>
                  </>
                ) : (
                  <div className="text-sm text-ink-faint mt-2">No entries yet</div>
                )}
              </div>
              {changes.length > 0 && (
                <div className="flex flex-col items-end gap-1.5">
                  {changes.map(([label, log]) => (
                    <div key={label} className="text-right">
                      <span className="num text-xl font-semibold">{signed(latestWeight - Number(log.weight))}</span>
                      <span className="text-[11px] text-ink-faint font-semibold"> kg · {label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {logs.length > 1 && <BodyWeightChart data={logs} height={200} />}
          </div>

          {/* Log Form */}
          <form onSubmit={handleSubmit} className="card p-4 md:p-5">
            <h2 className="font-bold">Log weight</h2>
            <div className="border-b border-line/70">
              <Stepper
                label="Weight"
                hint="kg"
                value={weight}
                onChange={setWeight}
                step={0.1}
                start={latestWeight ?? 75}
                placeholder={latestWeight ? latestWeight.toFixed(1) : '75.0'}
                decimal
              />
            </div>

            <div className="mt-4">
              <label className="label">Date</label>
              <DatePicker
                selected={date}
                onChange={(selectedDate) => selectedDate && setDate(selectedDate)}
                dateFormat="EEEE, d MMM yyyy"
                className="input font-semibold"
                required
              />
            </div>

            {error && <div className="mt-4"><Banner tone="error">{error}</Banner></div>}

            <button type="submit" disabled={loading || !weight} className="btn-primary w-full mt-5 h-14 text-base">
              {loading ? 'Saving…' : <><CheckIcon className="w-5 h-5" strokeWidth={2.5} /> Save {weight ? `${weight} kg` : 'weight'}</>}
            </button>
          </form>
        </div>

        {/* Recent Logs */}
        <div className="md:col-span-2 card p-4 md:p-5">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="font-bold">History</h2>
            {logs.length > 0 && <span className="text-xs text-ink-faint">Last {logs.length}</span>}
          </div>

          {logs.length === 0 ? (
            <p className="text-sm text-ink-faint">No weight entries yet.</p>
          ) : (
            <ul className="divide-y divide-line/70">
              {logs.map((log, i) => {
                const previous = logs[i + 1]
                const diff = previous ? Number(log.weight) - Number(previous.weight) : null
                return (
                  <li key={log.id} className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">
                        {parseISODate(log.date).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: log.date.startsWith(thisYear) ? undefined : 'numeric'
                        })}
                      </div>
                    </div>
                    {diff !== null && (
                      <span className="text-xs font-semibold text-ink-faint tabular-nums">{signed(diff)}</span>
                    )}
                    <div className="num text-xl font-semibold w-16 text-right">{Number(log.weight).toFixed(1)}</div>
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="h-9 w-9 rounded-full flex items-center justify-center text-ink-faint hover:text-missed hover:bg-missed/10"
                      aria-label="Delete entry"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
