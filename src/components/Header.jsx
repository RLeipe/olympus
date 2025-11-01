import { useUser } from '../contexts/UserContext'
import { Link } from 'react-router-dom'

export default function Header() {
  const { users, currentUser, setCurrentUser } = useUser()

  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo/Title */}
          <Link to="/" className="text-2xl font-bold hover:text-blue-100">
            Olympus
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            <Link to="/" className="hover:text-blue-100">
              Dashboard
            </Link>
            <Link to="/log" className="hover:text-blue-100">
              Quick Log
            </Link>
            <Link to="/exercises" className="hover:text-blue-100">
              Exercises
            </Link>
            <Link to="/bodyweight" className="hover:text-blue-100">
              Body Weight
            </Link>

            {/* User Switcher */}
            {currentUser && (
              <div className="flex items-center gap-2 ml-4 pl-4 border-l border-blue-400">
                <span className="text-sm">User:</span>
                <select
                  value={currentUser.id}
                  onChange={(e) => {
                    const user = users.find(u => u.id === e.target.value)
                    setCurrentUser(user)
                  }}
                  className="bg-blue-700 text-white px-3 py-1 rounded border border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
