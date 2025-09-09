import React from 'react'

type Toast = { id: number; message: string; type?: 'success'|'error'|'info' }

const ToastContext = React.createContext<{
  show: (message: string, type?: Toast['type']) => void
} | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const show = React.useCallback((message: string, type?: Toast['type']) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000)
  }, [])
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div style={{ position:'fixed', right:16, bottom:16, display:'grid', gap:8, zIndex:9999 }}>
        {toasts.map(t => (
          <div key={t.id} className="card" style={{ borderLeft: `4px solid ${
            t.type==='success' ? '#22c55e' : t.type==='error' ? '#ef4444' : '#60a5fa'}` }}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

