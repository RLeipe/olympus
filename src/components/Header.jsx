import { NavLink, Link } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import { Logo, StatsIcon, CalendarIcon, PlusIcon, ScaleIcon } from './icons'

const NAV = [
  { to: '/', label: 'Stats', icon: StatsIcon },
  { to: '/calendar', label: 'Calendar', icon: CalendarIcon },
  { to: '/log', label: 'Log', icon: PlusIcon, primary: true },
  { to: '/bodyweight', label: 'Weight', icon: ScaleIcon }
]

function UserSwitcher() {
  const { users, currentUser, setCurrentUser } = useUser()
  if (!currentUser) return null

  return (
    <div className="flex items-center bg-sunken rounded p-1 gap-0.5" role="group" aria-label="User">
      {users.map(user => {
        const active = user.id === currentUser.id
        return (
          <button
            key={user.id}
            onClick={() => setCurrentUser(user)}
            aria-pressed={active}
            title={user.name}
            className={`h-8 min-w-8 rounded-sm text-sm font-bold transition px-2.5 md:px-3.5
              ${active ? 'bg-line text-ink' : 'text-ink-soft hover:text-ink'}`}
          >
            <span className="md:hidden">{user.name[0]}</span>
            <span className="hidden md:inline">{user.name}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function Header() {
  return (
    <>
      <header className="sticky top-0 z-40 bg-bg/85 backdrop-blur-md border-b border-line/70 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-6xl px-4 md:px-6 h-14 md:h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <Logo className="w-8 h-8" />
            <span className="title text-lg tracking-[0.16em]">Olympus</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 flex-1 ml-6">
            {NAV.filter(item => !item.primary).map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `h-9 px-3.5 rounded text-sm font-semibold flex items-center transition
                  ${isActive ? 'bg-sunken text-ink' : 'text-ink-soft hover:text-ink'}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <NavLink to="/log" className="hidden md:inline-flex btn-primary h-10 px-4 text-sm">
              <PlusIcon className="w-4 h-4" strokeWidth={2.5} /> Log
            </NavLink>
            <UserSwitcher />
          </div>
        </div>
      </header>

      {/* Tab bar on phones */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/90 backdrop-blur-md border-t border-line pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4 h-16">
          {NAV.map(({ to, label, icon: Icon, primary }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition
                ${isActive ? 'text-ink' : 'text-ink-faint'}`}
            >
              {({ isActive }) => (
                <>
                  {primary ? (
                    <span className={`w-11 h-8 rounded flex items-center justify-center text-accent-strong ring-1 ring-inset ring-accent/55 ${isActive ? 'bg-accent/25' : 'bg-accent/10'}`}>
                      <Icon className="w-5 h-5" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <span className={`w-11 h-8 rounded flex items-center justify-center transition ${isActive ? 'bg-sunken' : ''}`}>
                      <Icon className="w-5 h-5" />
                    </span>
                  )}
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}
