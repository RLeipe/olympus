import { useUser } from '../contexts/UserContext'
import { Link } from 'react-router-dom'

export default function Header() {
  const { users, currentUser, setCurrentUser } = useUser()

  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-xl border-b border-blue-800/20">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center gap-4">
          {/* Navigation */}
          <nav className="flex items-center gap-3 md:gap-6 flex-wrap">
            <Link
              to="/"
              className="font-semibold hover:text-blue-100 transition-colors text-sm md:text-base tracking-wide"
            >
              Dashboard
            </Link>
            <Link
              to="/bodyweight"
              className="font-semibold hover:text-blue-100 transition-colors text-sm md:text-base whitespace-nowrap tracking-wide"
            >
              Body Weight
            </Link>
            <Link
              to="/log"
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg font-semibold transition-all text-sm md:text-base tracking-wide border border-white/30 shadow-sm"
            >
              Log
            </Link>
          </nav>

          {/* User Switcher */}
          {currentUser && (
            <div className="flex items-center gap-2">
              <select
                value={currentUser.id}
                onChange={(e) => {
                  const user = users.find(u => u.id === e.target.value)
                  setCurrentUser(user)
                }}
                className="bg-white/10 backdrop-blur-sm text-white font-medium px-3 py-2 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm hover:bg-white/20 transition-colors cursor-pointer"
              >
                {users.map(user => (
                  <option key={user.id} value={user.id} className="bg-blue-700 text-white">
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
