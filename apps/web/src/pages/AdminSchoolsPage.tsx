import React from 'react'
import { api } from '../lib/api'

export default function AdminSchoolsPage() {
  const [items, setItems] = React.useState<any[]>([])
  const [name, setName] = React.useState('')
  const [msg, setMsg] = React.useState('')

  async function load() {
    const r = await api<{ items:any[] }>(`/admin/schools?page=1&limit=50`)
    setItems(r.items)
  }
  React.useEffect(()=>{ load().catch(()=>{}) },[])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    try {
      const s = await api<any>(`/admin/schools`, { method:'POST', body: JSON.stringify({ name }) })
      setItems([s, ...items])
      setName(''); setMsg('Escola criada')
    } catch(e:any){ setMsg(e?.message || 'Erro') }
  }

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr'}}>
      <section className="card">
        <h3>Admin · Escolas</h3>
        <form className="form" onSubmit={create}>
          <div className="row">
            <input className="input" placeholder="Nome da escola" value={name} onChange={e=>setName(e.target.value)} required />
            <button className="button primary" type="submit">Criar</button>
          </div>
          {msg && <span className="muted">{msg}</span>}
        </form>
        <ul className="list">
          {items.map((s:any)=> <li key={s.id}>{s.name}</li>)}
        </ul>
      </section>
    </div>
  )
}

