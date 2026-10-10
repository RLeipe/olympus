import { useCallback, useEffect, useRef, useState } from 'react'

const AUTO_SYNC_AFTER_MS = 15 * 60 * 1000

async function getJson(response) {
  // Without deployed server functions, /api/* falls through to index.html
  const type = response.headers.get('content-type') || ''
  if (!type.includes('application/json')) throw new Error('unavailable')
  const body = await response.json()
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`)
  return body
}

// Strava connection status for a user; syncs automatically when the last sync is stale.
// onSynced is called after a sync that imported something, so the caller can reload data.
export function useStrava(userId, onSynced) {
  const [status, setStatus] = useState({ state: 'loading' })
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState(null)
  const onSyncedRef = useRef(onSynced)
  onSyncedRef.current = onSynced

  const sync = useCallback(async () => {
    setSyncing(true)
    setSyncError(null)
    try {
      const result = await getJson(await fetch('/api/strava/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      }))
      setStatus(prev => ({ ...prev, lastSyncAt: new Date().toISOString() }))
      if (result.activities > 0 || result.laps_fetched > 0) onSyncedRef.current?.()
    } catch (err) {
      setSyncError(err.message)
    } finally {
      setSyncing(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setStatus({ state: 'loading' })

    fetch(`/api/strava/status?user_id=${userId}`)
      .then(getJson)
      .then(body => {
        if (cancelled) return
        if (!body.configured) return setStatus({ state: 'not-configured', missing: body.missing })
        if (!body.connected) return setStatus({ state: 'disconnected' })
        setStatus({ state: 'connected', lastSyncAt: body.last_sync_at })
        const stale = !body.last_sync_at || Date.now() - new Date(body.last_sync_at) > AUTO_SYNC_AFTER_MS
        const justConnected = new URLSearchParams(window.location.search).get('strava') === 'connected'
        if (stale || justConnected) sync()
      })
      .catch(err => !cancelled && setStatus({ state: 'unavailable', error: err.message }))

    return () => { cancelled = true }
  }, [userId, sync])

  const connectUrl = `/api/strava/connect?user_id=${userId}`
  return { status, syncing, syncError, sync, connectUrl }
}
