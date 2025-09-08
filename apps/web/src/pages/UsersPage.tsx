import React from 'react'
import { api } from '../lib/api'
import { getSchoolId } from '../lib/api'

export default function UsersPage() {
  const [items, setItems] = React.useState<any[]>([])
  const [q, setQ] = React.useState('')
  const schoolId = getSchoolId() || 'seed-school'

  async function load() {
    const r = await api<{ items: any[] }>(`/${schoolId}/users?page=1&limit=20${q?`&q=${encodeURIComponent(q)}`:''}`)
    setItems(r.items)
  }
  React.useEffect(() => { load().catch(()=>{}) }, [schoolId])

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr'}}>
      <section className="card">
        <h3>Usuários</h3>
        <div className="row">
          <input className="input" placeholder="Buscar por nome/email" value={q} onChange={e=>setQ(e.target.value)} />
          <button className="button" onClick={load}>Buscar</button>
        </div>
        <ul className="list">
          {items.map((m:any)=> (
            <li key={m.user.id}>{m.user.name} &lt;{m.user.email}&gt; — {m.role}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}

