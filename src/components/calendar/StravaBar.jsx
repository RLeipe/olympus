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
    return <p className="text-xs text-gray-400">Strava sync unavailable (server functions not deployed).</p>
  }

  if (status.state === 'not-configured') {
    return (
      <p className="text-xs text-gray-500">
        Strava not configured yet. Missing in Cloudflare: {status.missing.join(', ')}
      </p>
    )
  }

  if (status.state === 'disconnected') {
    return (
      <a
        href={connectUrl}
        className="inline-flex items-center gap-2 bg-[#fc4c02] hover:bg-[#e34402] text-white text-sm font-semibold px-4 py-2 rounded-lg"
      >
        Connect Strava
      </a>
    )
  }

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span className="w-2 h-2 rounded-full bg-[#fc4c02]" />
      <span>
        Strava {syncing ? 'syncing...' : status.lastSyncAt ? `synced ${timeAgo(status.lastSyncAt)}` : 'connected'}
      </span>
      {!syncing && (
        <button onClick={sync} className="text-blue-600 hover:text-blue-800 font-medium">
          Sync
        </button>
      )}
      {syncError && <span className="text-red-600">Sync failed: {syncError}</span>}
    </div>
  )
}
