import React from 'react'
import { api, getSchoolId } from '../lib/api'

export default function MyGradesPage() {
  const schoolId = getSchoolId() || 'seed-school'
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    (async () => {
      try {
        const me = await api<{ user: { id: string } }>(`/${schoolId}/profile/me`)
        const r = await api<{ items:any[] }>(`/${schoolId}/grades?page=1&limit=100&order=desc&studentUserId=${me.user.id}`)
        setItems(r.items)
      } finally {
        setLoading(false)
      }
    })().catch(() => setLoading(false))
  }, [schoolId])

  if (loading) return <div className="card">Carregando...</div>

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr'}}>
      <section className="card">
        <h3>Minhas Notas</h3>
        <ul className="list">
          {items.map((g:any)=> (
            <li key={g.id}>{new Date(g.gradedAt).toLocaleString()} • {g.value}</li>
          ))}
          {items.length===0 && <li className="muted">Nenhuma nota encontrada.</li>}
        </ul>
      </section>
    </div>
  )
}

