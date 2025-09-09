import React from 'react'
import { api } from '../lib/api'
import { getSchoolId } from '../lib/api'

export default function SubjectsPage() {
  const [items, setItems] = React.useState<any[]>([])
  const [name, setName] = React.useState('')
  const [msg, setMsg] = React.useState('')
  const schoolId = getSchoolId() || 'seed-school'

  async function load() {
    const r = await api<{ items: any[] }>(`/${schoolId}/subjects?page=1&limit=50`)
    setItems(r.items)
  }
  React.useEffect(()=>{ load().catch(()=>{}) },[schoolId])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    try {
      const s = await api<any>(`/${schoolId}/subjects`, { method:'POST', body: JSON.stringify({ name }) })
      setItems([s, ...items])
      setName('')
      setMsg('Disciplina criada')
    } catch(e:any) { setMsg(e?.message||'Erro'); }
  }

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr'}}>
      <section className="card">
        <h3>Disciplinas</h3>
        <form className="form" onSubmit={create}>
          <div className="row">
            <input className="input" placeholder="Nome" value={name} onChange={e=>setName(e.target.value)} required />
            <button className="button primary" type="submit">Criar</button>
          </div>
          {msg && <span className="muted">{msg}</span>}
        </form>
        <ul className="list">
          {items.map((s:any)=> (
            <li key={s.id}>{s.name}
              <button className="button" style={{ float:'right' }} onClick={async ()=>{
                if (!confirm('Excluir disciplina?')) return
                await api<void>(`/${getSchoolId()||'seed-school'}/subjects/${s.id}`, { method:'DELETE' })
                setItems(items.filter((x:any)=>x.id!==s.id))
              }}>Excluir</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
