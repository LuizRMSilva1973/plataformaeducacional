import React from 'react'
import { api } from '../lib/api'
import { downloadCSV } from '../lib/export'
import { useDebouncedValue } from '../lib/hooks'
import { getSchoolId } from '../lib/api'

export default function UsersPage() {
  const [items, setItems] = React.useState<any[]>([])
  const [q, setQ] = React.useState('')
  const [role, setRole] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [limit] = React.useState(20)
  const dq = useDebouncedValue(q, 300)
  const schoolId = getSchoolId() || 'seed-school'

  async function load() {
    const qs = new URLSearchParams()
    qs.set('page', String(page))
    qs.set('limit', String(limit))
    if (dq) qs.set('q', dq)
    if (role) qs.set('role', role as any)
    const r = await api<{ items: any[] }>(`/${schoolId}/users?${qs.toString()}`)
    setItems(r.items)
  }
  React.useEffect(() => { load().catch(()=>{}) }, [schoolId, dq, role, page, limit])

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
          <input className="input" placeholder="Buscar por nome/email" value={q} onChange={e=>{ setPage(1); setQ(e.target.value) }} />
          <select className="select" value={role} onChange={e=>{ setPage(1); setRole(e.target.value) }}>
            <option value="">Todos os papéis</option>
            <option value="DIRECTOR">Diretor</option>
            <option value="TEACHER">Professor</option>
            <option value="STUDENT">Aluno</option>
          </select>
          <button className="button" onClick={exportCSV}>Exportar CSV</button>
        </div>
        <div className="row">
          <button className="button" onClick={()=> setPage(Math.max(1, page-1))}>Anterior</button>
          <span className="muted">Página {page}</span>
          <button className="button" onClick={()=> setPage(page+1)}>Próxima</button>
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
