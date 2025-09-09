import React from 'react'
import { isRouteErrorResponse, useRouteError, Link } from 'react-router-dom'

export default function ErrorPage() {
  const err = useRouteError()
  let title = 'Algo deu errado'
  let detail = ''
  if (isRouteErrorResponse(err)) {
    title = `Erro ${err.status}`
    detail = err.statusText || ''
  } else if (err instanceof Error) {
    detail = err.message
  }
  return (
    <div style={{ display:'grid', placeItems:'center', height:'100vh' }}>
      <div className="card" style={{ maxWidth: 520 }}>
        <h2 style={{ marginTop:0 }}>{title}</h2>
        {detail && <p className="muted">{detail}</p>}
        <div className="row">
          <Link className="button" to="/">Voltar ao painel</Link>
        </div>
      </div>
    </div>
  )
}

