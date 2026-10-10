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
        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || unchanged}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300"
        >
          {saving ? 'Saving...' : 'Save note'}
        </button>
      </div>
    </div>
  )
}
