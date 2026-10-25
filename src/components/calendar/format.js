import { formatPace, intervalRepLength } from '../../utils/planCore'

// Brass means done. tile: session box with a colored left edge, chip: outlined status label (text color),
// marker: month-grid square
export const STATUS_STYLES = {
  done: { label: 'Done', chip: 'text-accent-strong', marker: 'bg-accent text-accent-ink', tile: 'bg-sunken shadow-[inset_2px_0_0_rgb(var(--accent-strong))]' },
  partial: { label: 'Partial', chip: 'text-partial', marker: 'bg-partial text-surface', tile: 'bg-sunken shadow-[inset_2px_0_0_rgb(var(--partial))]' },
  missed: { label: 'Missed', chip: 'text-missed', marker: 'bg-missed text-surface', tile: 'bg-sunken shadow-[inset_2px_0_0_rgb(var(--missed))]' },
  today: { label: 'Today', chip: 'text-ink', marker: 'border border-dashed border-ink-soft text-ink', tile: 'border border-dashed border-ink-faint/60' },
  planned: { label: 'Planned', chip: 'text-ink-faint border-dashed', marker: 'border border-dashed border-ink-faint/70 text-ink-faint', tile: 'border border-dashed border-line' },
  rest: { label: 'Rest', chip: 'text-ink-faint', marker: 'text-ink-faint', tile: 'bg-sunken/50' },
  extra: { label: 'Unplanned', chip: 'text-extra', marker: 'bg-extra text-surface', tile: 'bg-sunken shadow-[inset_2px_0_0_rgb(var(--extra))]' }
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
