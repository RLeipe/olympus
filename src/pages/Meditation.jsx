import { useEffect, useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { useUser } from '../contexts/UserContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { isMissingTable } from '../hooks/useTrainingData'
import { addDays, parseISODate, toISODate, today } from '../utils/dates'
import { PageHeader, Loading, Banner, Stepper } from '../components/ui'
import { CheckIcon, TrashIcon } from '../components/icons'

const STEP = 5

// Typed values are rounded to the 5-minute grid the log uses
function roundMinutes(value) {
  return Math.max(STEP, Math.round(Number(value) / STEP) * STEP)
}

export default function Meditation() {
  const { currentUser } = useUser()
  const toast = useToast()
  const [minutes, setMinutes] = useState('')
  const [date, setDate] = useState(new Date())
  const [notes, setNotes] = useState('')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsMigration, setNeedsMigration] = useState(false)

  useEffect(() => {
    if (currentUser) fetchLogs()
  }, [currentUser])

  async function fetchLogs() {
    try {
      const { data, error } = await supabase
        .from('meditations')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(60)

      if (error) throw error
      setNeedsMigration(false)
      setLogs(data || [])
    } catch (err) {
      if (isMissingTable(err)) setNeedsMigration(true)
      else console.error('Error fetching meditations:', err)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const rounded = roundMinutes(minutes)
      const { error: insertError } = await supabase
        .from('meditations')
        .insert({ user_id: currentUser.id, date: toISODate(date), minutes: rounded, notes: notes.trim() || null })

      if (insertError) throw insertError

      setMinutes('')
      setNotes('')
      setDate(new Date())
      fetchLogs()
      toast(`${rounded} min saved`)
    } catch (err) {
      console.error('Error logging meditation:', err)
      setError('Failed to save: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this meditation?')) return

    try {
      const { error } = await supabase.from('meditations').delete().eq('id', id)
      if (error) throw error
      fetchLogs()
      toast('Entry deleted')
    } catch (err) {
      console.error('Error deleting meditation:', err)
      toast('Failed to delete: ' + err.message, 'error')
    }
  }

  if (!currentUser) return <Loading />

  const thisYear = String(new Date().getFullYear())
  const since = addDays(today(), -29)
  const recent = logs.filter(log => log.date >= since)
  const recentMinutes = recent.reduce((sum, log) => sum + log.minutes, 0)
  const recentDays = new Set(recent.map(log => log.date)).size

  return (
    <div>
      <PageHeader title="Meditation" />

      {needsMigration && (
        <div className="mb-3">
          <Banner>
            Database update missing: run <code>supabase/migrations/003_meditations.sql</code> in the Supabase SQL editor.
          </Banner>
        </div>
      )}

      <div className="grid md:grid-cols-5 gap-3 items-start">
        <div className="md:col-span-3 space-y-3">
          <div className="card p-4 md:p-5">
            <div className="eyebrow">Last 30 days</div>
            <div className="mt-1 flex items-baseline gap-5">
              <div className="flex items-baseline gap-1.5">
                <span className="num text-6xl font-semibold leading-none">{recentMinutes}</span>
                <span className="text-base font-semibold text-ink-faint">min</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="num text-3xl font-semibold leading-none">{recentDays}</span>
                <span className="text-sm font-semibold text-ink-faint">{recentDays === 1 ? 'day' : 'days'}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="card p-4 md:p-5">
            <h2 className="font-bold">Log meditation</h2>
            <div className="border-b border-line/70">
              <Stepper
                label="Length"
                hint="minutes"
                value={minutes}
                onChange={setMinutes}
                step={STEP}
                min={STEP}
                start={10}
                placeholder="10"
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

            <div className="mt-4">
              <label className="label" htmlFor="meditation-notes">Notes</label>
              <textarea
                id="meditation-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
                rows={3}
                className="input h-auto py-3 md:text-sm leading-relaxed resize-y"
              />
            </div>

            {error && <div className="mt-4"><Banner tone="error">{error}</Banner></div>}

            <button type="submit" disabled={loading || !minutes || needsMigration} className="btn-primary w-full mt-5 h-14 text-base">
              {loading ? 'Saving…' : <><CheckIcon className="w-5 h-5" strokeWidth={2.5} /> Save {minutes ? `${roundMinutes(minutes)} min` : 'meditation'}</>}
            </button>
          </form>
        </div>

        <div className="md:col-span-2 card p-4 md:p-5">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="font-bold">History</h2>
            {logs.length > 0 && <span className="text-xs text-ink-faint">Last {logs.length}</span>}
          </div>

          {logs.length === 0 ? (
            <p className="text-sm text-ink-faint">No meditations yet.</p>
          ) : (
            <ul className="divide-y divide-line/70">
              {logs.map(log => (
                <li key={log.id} className="flex items-start gap-3 py-2">
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="text-sm font-semibold">
                      {parseISODate(log.date).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: log.date.startsWith(thisYear) ? undefined : 'numeric'
                      })}
                    </div>
                    {log.notes && <p className="text-xs text-ink-soft mt-0.5 whitespace-pre-wrap">{log.notes}</p>}
                  </div>
                  <div className="shrink-0 flex items-baseline gap-1 pt-0.5">
                    <span className="num text-xl font-semibold">{log.minutes}</span>
                    <span className="text-xs font-semibold text-ink-faint">min</span>
                  </div>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="h-9 w-9 shrink-0 rounded flex items-center justify-center text-ink-faint hover:text-missed hover:bg-missed/10"
                    aria-label="Delete entry"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
