import { useEffect, useState } from 'react'
import { saveDayNote } from '../hooks/useTrainingData'

// Edits the free-text note for one day. Saving an empty note deletes it.
export default function DayNoteEditor({ userId, date, initialNote = '', onSaved, onCancel, autoFocus = false }) {
  const [text, setText] = useState(initialNote)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { setText(initialNote) }, [initialNote, date])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const saved = await saveDayNote(userId, date, text)
      onSaved?.(saved)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const unchanged = text.trim() === (initialNote || '').trim()

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="How did it go? Pain, sleep, energy, anything worth remembering..."
        rows={3}
        autoFocus={autoFocus}
        className="input h-auto py-3 md:text-sm leading-relaxed resize-y"
      />
      {error && <p className="text-sm text-missed">{error}</p>}
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || unchanged}
          className="btn-primary h-9 px-4 text-sm"
        >
          {saving ? 'Saving...' : 'Save note'}
        </button>
      </div>
    </div>
  )
}
