import React from 'react'
import { api } from '../lib/api'
import { downloadCSV } from '../lib/export'
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

  function exportCSV(){
    const rows = items.map((m:any)=> ({
      id: m.id ?? m.user?.id,
      name: m.name ?? m.user?.name,
      email: m.email ?? m.user?.email,
      role: m.role
    }))
    downloadCSV('usuarios.csv', rows)
  }

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr'}}>
      <section className="card">
        <h3>Usuários</h3>
        <div className="row">
          <input className="input" placeholder="Buscar por nome/email" value={q} onChange={e=>setQ(e.target.value)} />
          <button className="button" onClick={load}>Buscar</button>
          <button className="button" onClick={exportCSV}>Exportar CSV</button>
        </div>
        <ul className="list">
          {items.map((m:any)=> {
            // Backend retorna itens flatten { id, name, email, role }
            // ou, em versões antigas, { user: { id, name, email }, role }
            const id = m.id ?? m.user?.id
            const name = m.name ?? m.user?.name
            const email = m.email ?? m.user?.email
            return (
              <li key={id}>{name} &lt;{email}&gt; — {m.role}</li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
