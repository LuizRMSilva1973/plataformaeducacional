import React from 'react'
import { api } from '../lib/api'
import { getSchoolId } from '../lib/api'

export default function ClassesPage() {
  const [items, setItems] = React.useState<any[]>([])
  const [name, setName] = React.useState('')
  const [year, setYear] = React.useState<number>(new Date().getFullYear())
  const [msg, setMsg] = React.useState('')
  const schoolId = getSchoolId() || 'seed-school'

  async function load() {
    const r = await api<{ items: any[] }>(`/${schoolId}/classes?page=1&limit=50`)
    setItems(r.items)
  }
  React.useEffect(()=>{ load().catch(()=>{}) },[schoolId])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    try {
      const c = await api<any>(`/${schoolId}/classes`, { method:'POST', body: JSON.stringify({ name, year }) })
      setItems([c, ...items])
      setName('')
      setYear(new Date().getFullYear())
      setMsg('Turma criada')
    } catch(e:any) { setMsg(e?.message||'Erro'); }
  }

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr'}}>
      <section className="card">
        <h3>Turmas</h3>
        <form className="form" onSubmit={create}>
          <div className="row">
            <input className="input" placeholder="Nome" value={name} onChange={e=>setName(e.target.value)} required />
            <input className="input" type="number" value={year} onChange={e=>setYear(parseInt(e.target.value||'0'))} required />
            <button className="button primary" type="submit">Criar</button>
          </div>
          {msg && <span className="muted">{msg}</span>}
        </form>
        <ul className="list">
          {items.map((c:any)=> (
            <li key={c.id}>{c.name} — {c.year}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}

