import React from 'react'

type Toast = { id: number; message: string; type?: 'success'|'error'|'info' }

function parseMessage(msg: string): { text: string; requestId?: string } {
  const m = msg.match(/\(req\s+([^)]+)\)\s*$/)
  if (m) {
    return { text: msg.replace(m[0], '').trim(), requestId: m[1] }
  }
  return { text: msg }
}

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
        {toasts.map(t => {
          const { text, requestId } = parseMessage(t.message)
          return (
            <div key={t.id} className="card" style={{ borderLeft: `4px solid ${
              t.type==='success' ? '#22c55e' : t.type==='error' ? '#ef4444' : '#60a5fa'}` }}>
              <div>{text}</div>
              {requestId && (
                <div className="muted" style={{ marginTop: 4, display:'flex', alignItems:'center', gap:8 }}>
                  <code style={{ background:'#0b1220', padding:'2px 6px', borderRadius:4 }}>req {requestId}</code>
                  <button
                    className="button"
                    onClick={() => navigator.clipboard?.writeText(requestId)}
                    title="Copiar requestId"
                    style={{ padding:'2px 8px' }}
                  >Copiar</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
