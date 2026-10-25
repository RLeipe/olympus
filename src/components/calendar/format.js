import { formatPace, intervalRepLength } from '../../utils/planCore'

export const STATUS_STYLES = {
  done: { label: 'Done', icon: '✓', dot: 'bg-emerald-500', text: 'text-emerald-700', card: 'bg-emerald-50 border-emerald-200' },
  partial: { label: 'Partial', icon: '◐', dot: 'bg-amber-500', text: 'text-amber-700', card: 'bg-amber-50 border-amber-200' },
  missed: { label: 'Missed', icon: '✕', dot: 'bg-red-400', text: 'text-red-600', card: 'bg-red-50 border-red-200' },
  today: { label: 'Today', icon: '○', dot: 'bg-blue-500', text: 'text-blue-700', card: 'bg-white border-blue-300 border-dashed' },
  planned: { label: 'Planned', icon: '○', dot: 'bg-gray-300', text: 'text-gray-500', card: 'bg-white border-gray-200 border-dashed' },
  rest: { label: 'Rest', icon: '–', dot: 'bg-gray-200', text: 'text-gray-400', card: 'bg-gray-50 border-gray-100' },
  extra: { label: 'Unplanned', icon: '+', dot: 'bg-violet-500', text: 'text-violet-700', card: 'bg-violet-50 border-violet-200' }
}

export const TYPE_LETTER = { run: 'R', strength: 'S', other: 'O', rest: '–' }

const RUN_KIND_LABEL = {
  easy: 'Easy run',
  long: 'Long run',
  tempo: 'Tempo run',
  intervals: 'Intervals',
  recovery: 'Recovery run',
  race: 'Race'
}

export function formatDuration(seconds) {
  if (!seconds) return '–'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

export function formatKm(meters) {
  return `${(meters / 1000).toFixed(1)} km`
}

export function sessionTitle(session) {
  if (session.title) return session.title
  if (session.type === 'run') return RUN_KIND_LABEL[session.kind] || 'Run'
  if (session.type === 'strength') return 'Strength'
  if (session.type === 'rest') return 'Rest'
  return 'Session'
}

// Short description of what a planned run asks for
export function runTarget(session) {
  const parts = []
  if (session.distance_km) parts.push(`${session.distance_km} km`)
  if (session.elevation_m) parts.push(`↑${session.elevation_m} m`)
  if (session.max_hr) parts.push(`HR < ${session.max_hr}`)
  if (session.pace) parts.push(`${session.pace}/km`)
  if (session.intervals) {
    const iv = session.intervals
    let text = `${iv.reps} × ${intervalRepLength(iv)}`
    if (iv.pace) text += ` @ ${iv.pace}`
    if (iv.recovery) text += `, ${iv.recovery}`
    parts.push(text)
  }
  return parts.join(' · ')
}

export function plannedExercise(ex) {
  const amount = ex.seconds !== undefined ? `${ex.seconds} s` : ex.reps
  const weight = ex.weight ? ` @ ${ex.weight} kg` : ''
  return `${ex.sets}×${amount}${weight}`
}

export function activitySummary(activity) {
  const parts = []
  if (activity.distance_m) parts.push(formatKm(activity.distance_m))
  parts.push(formatDuration(activity.moving_time_s))
  if (activity.distance_m && activity.moving_time_s && activity.distance_m > 500) {
    parts.push(`${formatPace(activity.moving_time_s / (activity.distance_m / 1000))}/km`)
  }
  if (activity.avg_hr) parts.push(`♥ ${Math.round(activity.avg_hr)}`)
  if (activity.elevation_m >= 10) parts.push(`↑${Math.round(activity.elevation_m)} m`)
  return parts.join(' · ')
}

export function lapPace(lap) {
  return lap.avg_speed ? formatPace(1000 / lap.avg_speed) : '–'
}

// "5,5,5,4 @ 80 kg" style summary of logged sets
export function loggedSets(sets, metricType) {
  if (!sets.length) return 'nothing logged'
  const reps = sets.map(s => (metricType === 'time_based' ? `${s.reps}s` : s.reps)).join(', ')
  const weights = [...new Set(sets.map(s => s.weight).filter(w => w != null))]
  return weights.length ? `${reps} @ ${weights.join('/')} kg` : reps
}

export function sportLabel(sportType) {
  return sportType.replace(/([a-z])([A-Z])/g, '$1 $2')
}
