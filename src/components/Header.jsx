import { useUser } from '../contexts/UserContext'
import { Link } from 'react-router-dom'

export default function Header() {
  const { users, currentUser, setCurrentUser } = useUser()

  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center gap-4">
          {/* Navigation */}
          <nav className="flex items-center gap-3 md:gap-6 flex-wrap">
            <Link to="/" className="hover:text-blue-100 text-sm md:text-base">
              Dashboard
            </Link>
            <Link to="/log" className="hover:text-blue-100 text-sm md:text-base">
              Quick Log
            </Link>
            <Link to="/bodyweight" className="hover:text-blue-100 text-sm md:text-base whitespace-nowrap">
              Body Weight
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
                className="bg-blue-700 text-white px-2 py-1 rounded border border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>
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
