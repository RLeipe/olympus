// Small stroke icons, 24×24 grid, colored with currentColor
function Icon({ className = 'w-5 h-5', strokeWidth = 2, children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const StatsIcon = props => (
  <Icon {...props}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Icon>
)

export const CalendarIcon = props => (
  <Icon {...props}><rect x="3" y="4.5" width="18" height="16.5" rx="3" /><path d="M3 10h18M8 2.5v4M16 2.5v4" /></Icon>
)

export const PlusIcon = props => (
  <Icon {...props}><path d="M12 5v14M5 12h14" /></Icon>
)

export const MinusIcon = props => (
  <Icon {...props}><path d="M5 12h14" /></Icon>
)

export const ScaleIcon = props => (
  <Icon {...props}><rect x="3" y="3" width="18" height="18" rx="5" /><path d="M7.5 10a6 6 0 0 1 9 0M12 10.5l1.8-2.3" /></Icon>
)

export const ChevronLeftIcon = props => (
  <Icon {...props}><path d="m15 18-6-6 6-6" /></Icon>
)

export const ChevronRightIcon = props => (
  <Icon {...props}><path d="m9 18 6-6-6-6" /></Icon>
)

export const ChevronDownIcon = props => (
  <Icon {...props}><path d="m6 9 6 6 6-6" /></Icon>
)

export const CheckIcon = props => (
  <Icon {...props}><path d="M20 6 9 17l-5-5" /></Icon>
)

export const XIcon = props => (
  <Icon {...props}><path d="M18 6 6 18M6 6l12 12" /></Icon>
)

export const TrashIcon = props => (
  <Icon {...props}><path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></Icon>
)

export const NoteIcon = props => (
  <Icon {...props}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></Icon>
)

export const SyncIcon = props => (
  <Icon {...props}><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 13a8 8 0 0 0 14.3 4.9L20 16" /><path d="M4 3v5h5M20 21v-5h-5" /></Icon>
)

export const DumbbellIcon = props => (
  <Icon {...props}><path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11" /></Icon>
)

export const RunIcon = props => (
  <Icon {...props}><circle cx="15" cy="4.5" r="1.8" /><path d="M5 11.5 8.5 8l4 .5 2 3.5 3.5 1M11.5 9.5 9 15l4 2.5V22M8.5 15.5 6 21" /></Icon>
)

export const PulseIcon = props => (
  <Icon {...props}><path d="M2 12h4l3-7 6 14 3-7h4" /></Icon>
)

export const MoonIcon = props => (
  <Icon {...props}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></Icon>
)

export const ClockIcon = props => (
  <Icon {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>
)

export const CircleIcon = props => (
  <Icon {...props}><circle cx="12" cy="12" r="7" /></Icon>
)

export const HalfCircleIcon = props => (
  <Icon {...props}><circle cx="12" cy="12" r="7" /><path d="M12 5a7 7 0 0 1 0 14Z" fill="currentColor" /></Icon>
)

export const ArrowUpIcon = props => (
  <Icon {...props}><path d="M12 19V5M6 11l6-6 6 6" /></Icon>
)

export const ArrowDownIcon = props => (
  <Icon {...props}><path d="M12 5v14M6 13l6 6 6-6" /></Icon>
)

// The Olympus mark: two brass peaks on a slate tile
export function Logo({ className = 'w-8 h-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="0.5" y="0.5" width="31" height="31" rx="3.5" className="fill-surface stroke-line" />
      <path d="M4 25 13 9l4.5 8 3-5L28 25Z" className="fill-accent" />
    </svg>
  )
}
