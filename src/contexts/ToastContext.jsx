import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckIcon, XIcon } from '../components/icons'

const ToastContext = createContext(null)
const DURATION_MS = 2600

// Short confirmations ("Saved") that don't block like alert() does
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const show = useCallback((message, tone = 'success') => {
    clearTimeout(timer.current)
    setToast({ message, tone, key: Date.now() })
    timer.current = setTimeout(() => setToast(null), tone === 'error' ? DURATION_MS * 2 : DURATION_MS)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-6 z-[60] flex justify-center px-4 pointer-events-none">
        {toast && (
          <div
            key={toast.key}
            role="status"
            className="pointer-events-auto flex items-center gap-2.5 bg-sunken text-ink ring-1 ring-line rounded pl-2 pr-4 py-2 shadow-pop text-sm font-semibold max-w-full"
          >
            <span className={`w-6 h-6 shrink-0 rounded-sm flex items-center justify-center ${toast.tone === 'error' ? 'bg-missed/20 text-missed' : 'bg-accent/20 text-accent-strong'}`}>
              {toast.tone === 'error' ? <XIcon className="w-3.5 h-3.5" strokeWidth={3} /> : <CheckIcon className="w-3.5 h-3.5" strokeWidth={3} />}
            </span>
            <span className="truncate">{toast.message}</span>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}
