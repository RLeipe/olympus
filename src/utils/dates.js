// Date helpers that work on local calendar days (YYYY-MM-DD), never UTC.
// Using toISOString() for dates shifts them by a day in Europe around midnight.

export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso, days) {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export function today() {
  return toISODate(new Date())
}

// Monday-based weeks
export function startOfWeek(iso) {
  const day = parseISODate(iso).getDay()
  return addDays(iso, -((day + 6) % 7))
}

export function startOfMonth(iso) {
  return `${iso.slice(0, 7)}-01`
}

export function addMonths(iso, months) {
  const date = parseISODate(startOfMonth(iso))
  date.setMonth(date.getMonth() + months)
  return toISODate(date)
}

export function daysBetween(fromIso, toIso) {
  return Math.round((parseISODate(toIso) - parseISODate(fromIso)) / 86400000)
}

export function dateRange(fromIso, toIso) {
  const days = []
  for (let d = fromIso; d <= toIso; d = addDays(d, 1)) days.push(d)
  return days
}

// "today", "yesterday", "3 d ago" for the last week, otherwise "23 Oct"
export function relativeDay(iso, todayIso = today()) {
  const days = daysBetween(iso, todayIso)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days > 1 && days < 7) return `${days} d ago`
  return parseISODate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
