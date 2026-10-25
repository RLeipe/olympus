import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { UserProvider } from './contexts/UserContext'
import { ToastProvider } from './contexts/ToastContext'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import QuickLog from './pages/QuickLog'
import BodyWeight from './pages/BodyWeight'
import Calendar from './pages/Calendar'

function App() {
  return (
    <Router>
      <UserProvider>
        <ToastProvider>
          <div className="min-h-screen">
            <Header />
            <main className="mx-auto max-w-6xl px-4 md:px-6 pt-5 md:pt-8 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-16">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/log" element={<QuickLog />} />
                <Route path="/bodyweight" element={<BodyWeight />} />
              </Routes>
            </main>
          </div>
        </ToastProvider>
      </UserProvider>
    </Router>
  )
}

export default App
