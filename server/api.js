// Server-side API (Strava OAuth + sync). Runs on Cloudflare, never in the browser.
// Required environment variables (set in Cloudflare, not in the repo):
//   VITE_SUPABASE_URL (or SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
//   STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET

const STRAVA_API = 'https://www.strava.com/api/v3'
const STRAVA_OAUTH = 'https://www.strava.com/oauth'
const RUN_TYPES = ['Run', 'TrailRun', 'VirtualRun']
const INITIAL_SYNC_DAYS = 60
const RESYNC_OVERLAP_DAYS = 3
const MAX_ACTIVITY_PAGES = 3
// Cloudflare limits outgoing requests per invocation; remaining laps are fetched on the next sync
const LAPS_PER_SYNC = 20
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function handleApi(request, env) {
  const url = new URL(request.url)
  const route = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '')

  try {
    switch (route) {
      case 'strava/status':
        return await status(url, env)
      case 'strava/connect':
        return connect(url, env)
      case 'strava/callback':
        return await callback(url, env)
      case 'strava/sync':
        if (request.method !== 'POST') return json({ error: 'Use POST' }, 405)
        return await sync(request, env)
      default:
        return json({ error: 'Not found' }, 404)
    }
  } catch (err) {
    if (!err.status || err.status >= 500) console.error(err)
    return json({ error: err.message }, err.status || 500)
  }
}

// ---------- routes ----------

async function status(url, env) {
  const missing = missingEnv(env)
  if (missing.length) return json({ configured: false, missing })

  const userId = requireUserId(url.searchParams.get('user_id'))
  const rows = await db(env)(
    `strava_connections?user_id=eq.${userId}&select=athlete_id,last_sync_at`
  )
  const conn = rows[0]
  return json({
    configured: true,
    connected: Boolean(conn),
    last_sync_at: conn?.last_sync_at ? parseUtc(conn.last_sync_at).toISOString() : null
  })
}

function connect(url, env) {
  assertEnv(env)
  const userId = requireUserId(url.searchParams.get('user_id'))
  const params = new URLSearchParams({
    client_id: env.STRAVA_CLIENT_ID,
    redirect_uri: `${url.origin}/api/strava/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
    state: userId
  })
  return Response.redirect(`${STRAVA_OAUTH}/authorize?${params}`, 302)
}

async function callback(url, env) {
  assertEnv(env)
  const back = (result) => Response.redirect(`${url.origin}/calendar?strava=${result}`, 302)

  if (url.searchParams.get('error')) return back('denied')
  const scope = url.searchParams.get('scope') || ''
  if (!scope.includes('activity:read')) return back('missing-scope')

  const userId = requireUserId(url.searchParams.get('state'))
  const token = await stravaToken(env, {
    grant_type: 'authorization_code',
    code: url.searchParams.get('code')
  })

  await db(env)('strava_connections?on_conflict=user_id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: {
      user_id: userId,
      athlete_id: token.athlete.id,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      token_expires_at: new Date(token.expires_at * 1000).toISOString(),
      connected_at: new Date().toISOString()
    }
  })
  return back('connected')
}

async function sync(request, env) {
  assertEnv(env)
  const body = await request.json().catch(() => ({}))
  const userId = requireUserId(body.user_id)
  const query = db(env)

  const [conn] = await query(`strava_connections?user_id=eq.${userId}&select=*`)
  if (!conn) return json({ error: 'Strava is not connected' }, 400)
  const accessToken = await validAccessToken(env, conn)

  // Fetch everything since shortly before the newest stored activity (edits on Strava get picked up)
  const [latest] = await query(
    `activities?user_id=eq.${userId}&select=start_time&order=start_time.desc&limit=1`
  )
  const afterMs = latest
    ? new Date(latest.start_time).getTime() - RESYNC_OVERLAP_DAYS * 86400000
    : Date.now() - INITIAL_SYNC_DAYS * 86400000
  const after = Math.floor(afterMs / 1000)

  const fetched = []
  for (let page = 1; page <= MAX_ACTIVITY_PAGES; page++) {
    const batch = await strava(accessToken, `/athlete/activities?after=${after}&per_page=100&page=${page}`)
    fetched.push(...batch)
    if (batch.length < 100) break
  }

  if (fetched.length) {
    await query('activities?on_conflict=strava_id', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: fetched.map(a => mapActivity(a, userId))
    })
  }

  // Laps need one request per activity, so only runs and only a limited number per sync
  const needLaps = await query(
    `activities?user_id=eq.${userId}&laps=is.null&sport_type=in.(${RUN_TYPES.join(',')})` +
    `&select=id,strava_id&order=start_time.desc&limit=${LAPS_PER_SYNC}`
  )
  let lapsFetched = 0
  for (const activity of needLaps) {
    let laps
    try {
      laps = await strava(accessToken, `/activities/${activity.strava_id}/laps`)
    } catch (err) {
      if (err.status === 429) break // rate limited, continue next sync
      if (err.status === 404) laps = [] // deleted on Strava
      else throw err
    }
    await query(`activities?id=eq.${activity.id}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: { laps: laps.map(mapLap) }
    })
    lapsFetched++
  }

  await query(`strava_connections?user_id=eq.${userId}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: { last_sync_at: new Date().toISOString() }
  })

  return json({
    activities: fetched.length,
    laps_fetched: lapsFetched,
    laps_pending: Math.max(0, needLaps.length - lapsFetched)
  })
}

// ---------- Strava ----------

async function validAccessToken(env, conn) {
  if (parseUtc(conn.token_expires_at).getTime() - Date.now() > 5 * 60 * 1000) return conn.access_token

  const token = await stravaToken(env, {
    grant_type: 'refresh_token',
    refresh_token: conn.refresh_token
  })
  await db(env)(`strava_connections?user_id=eq.${conn.user_id}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: {
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      token_expires_at: new Date(token.expires_at * 1000).toISOString()
    }
  })
  return token.access_token
}

async function stravaToken(env, params) {
  const res = await fetch(`${STRAVA_OAUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      ...params
    })
  })
  if (!res.ok) throw httpError(res.status, `Strava token request failed: ${await res.text()}`)
  return res.json()
}

async function strava(accessToken, path) {
  const res = await fetch(`${STRAVA_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!res.ok) throw httpError(res.status, `Strava ${path.split('?')[0]}: ${res.status}`)
  return res.json()
}

function mapActivity(a, userId) {
  return {
    user_id: userId,
    strava_id: a.id,
    activity_date: a.start_date_local.slice(0, 10),
    start_time: a.start_date,
    sport_type: a.sport_type || a.type,
    name: a.name,
    distance_m: a.distance,
    moving_time_s: a.moving_time,
    elapsed_time_s: a.elapsed_time,
    elevation_m: a.total_elevation_gain,
    avg_hr: a.average_heartrate ?? null,
    max_hr: a.max_heartrate ?? null,
    avg_speed: a.average_speed,
    updated_at: new Date().toISOString()
  }
}

function mapLap(l) {
  return {
    distance_m: l.distance,
    moving_time_s: l.moving_time,
    elapsed_time_s: l.elapsed_time,
    avg_speed: l.average_speed,
    avg_hr: l.average_heartrate ?? null,
    max_hr: l.max_heartrate ?? null
  }
}

// ---------- Supabase (service role, plain REST so it runs on any edge runtime) ----------

function db(env) {
  const base = `${env.SUPABASE_URL || env.VITE_SUPABASE_URL}/rest/v1`
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  const headers = { apikey: key, 'Content-Type': 'application/json' }
  // Legacy service_role keys are JWTs; new sb_secret_ keys only go in the apikey header
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`

  return async (path, { method = 'GET', body, prefer } = {}) => {
    const res = await fetch(`${base}/${path}`, {
      method,
      headers: prefer ? { ...headers, Prefer: prefer } : headers,
      body: body ? JSON.stringify(body) : undefined
    })
    if (!res.ok) {
      throw new Error(`Supabase ${method} ${path.split('?')[0]} failed: ${res.status} ${await res.text()}`)
    }
    const text = await res.text()
    return text ? JSON.parse(text) : null
  }
}

// ---------- helpers ----------

function missingEnv(env) {
  const missing = ['STRAVA_CLIENT_ID', 'STRAVA_CLIENT_SECRET', 'SUPABASE_SERVICE_ROLE_KEY']
    .filter(name => !env[name])
  if (!env.SUPABASE_URL && !env.VITE_SUPABASE_URL) missing.push('SUPABASE_URL')
  return missing
}

// strava_connections uses TIMESTAMP without time zone; values are stored as UTC
function parseUtc(value) {
  return new Date(/(Z|[+-]\d\d:?\d\d)$/i.test(value) ? value : `${value}Z`)
}

function assertEnv(env) {
  const missing = missingEnv(env)
  if (missing.length) throw httpError(500, `Missing environment variables: ${missing.join(', ')}`)
}

function requireUserId(value) {
  if (!value || !UUID_RE.test(value)) throw httpError(400, 'Invalid user_id')
  return value
}

function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  })
}
