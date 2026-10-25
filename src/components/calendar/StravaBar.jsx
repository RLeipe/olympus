import { SyncIcon } from '../icons'

function timeAgo(iso) {
  const minutes = Math.round((Date.now() - new Date(iso)) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return `${Math.round(hours / 24)} d ago`
}

export default function StravaBar({ strava }) {
  const { status, syncing, syncError, sync, connectUrl } = strava

  if (status.state === 'loading') return null

  if (status.state === 'unavailable') {
    return <p className="text-xs text-ink-faint">Strava sync unavailable (server functions not deployed).</p>
  }

  if (status.state === 'not-configured') {
    return (
      <p className="text-xs text-ink-faint">
        Strava not configured yet. Missing in Cloudflare: {status.missing.join(', ')}
      </p>
    )
  }

  if (status.state === 'disconnected') {
    return (
      <a href={connectUrl} className="btn h-9 px-4 text-sm bg-strava text-white hover:brightness-95">
        Connect Strava
      </a>
    )
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="inline-flex items-center gap-2 h-9 pl-3 pr-1 rounded-full bg-sunken text-ink-soft font-semibold">
        <span className={`w-2 h-2 rounded-full bg-strava ${syncing ? 'animate-pulse' : ''}`} />
        <span>
          Strava {syncing ? 'syncing…' : status.lastSyncAt ? timeAgo(status.lastSyncAt) : 'connected'}
        </span>
        <button
          onClick={sync}
          disabled={syncing}
          className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-surface hover:text-ink disabled:opacity-50"
          aria-label="Sync Strava"
          title="Sync now"
        >
          <SyncIcon className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {syncError && <span className="text-missed font-medium">Sync failed: {syncError}</span>}
    </div>
  )
}
