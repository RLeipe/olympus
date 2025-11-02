import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { UserProvider } from './contexts/UserContext'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import QuickLog from './pages/QuickLog'
import BodyWeight from './pages/BodyWeight'

function App() {
  return (
    <Router>
      <UserProvider>
        <div className="min-h-screen bg-gray-100">
          <Header />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/log" element={<QuickLog />} />
            <Route path="/bodyweight" element={<BodyWeight />} />
          </Routes>
        </div>
      </UserProvider>
    </Router>
  )
}

export default App
