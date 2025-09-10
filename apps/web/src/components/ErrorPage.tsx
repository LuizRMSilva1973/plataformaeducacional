import React from 'react'
import { isRouteErrorResponse, useRouteError, Link } from 'react-router-dom'

export default function ErrorPage() {
  const err = useRouteError()
  let title = 'Algo deu errado'
  let detail = ''
  let requestId: string | undefined
  if (isRouteErrorResponse(err)) {
    title = `Erro ${err.status}`
    detail = err.statusText || ''
  } else if (err instanceof Error) {
    detail = err.message
    const m = detail.match(/\(req\s+([^)]+)\)\s*$/)
    if (m) {
      requestId = m[1]
      detail = detail.replace(m[0], '').trim()
    }
  }
  return (
    <div style={{ display:'grid', placeItems:'center', height:'100vh' }}>
      <div className="card" style={{ maxWidth: 520 }}>
        <h2 style={{ marginTop:0 }}>{title}</h2>
        {detail && <p className="muted">{detail}</p>}
        {requestId && (
          <div className="muted" style={{ display:'flex', gap:8, alignItems:'center' }}>
            <code style={{ background:'#0b1220', padding:'2px 6px', borderRadius:4 }}>req {requestId}</code>
            <button className="button" style={{ padding:'2px 8px' }} onClick={()=> navigator.clipboard?.writeText(requestId!)}>Copiar</button>
          </div>
        )}
        <div className="row">
          <Link className="button" to="/">Voltar ao painel</Link>
        </div>
      </div>
    </div>
  )
}
