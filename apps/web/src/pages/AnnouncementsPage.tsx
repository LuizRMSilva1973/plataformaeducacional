import React from 'react'
import { api } from '../lib/api'
import { getSchoolId } from '../lib/api'

export default function AnnouncementsPage() {
  const [items, setItems] = React.useState<any[]>([])
  const [classes, setClasses] = React.useState<any[]>([])
  const [title, setTitle] = React.useState('')
  const [content, setContent] = React.useState('')
  const [classId, setClassId] = React.useState('')
  const [msg, setMsg] = React.useState('')
  const schoolId = getSchoolId() || 'seed-school'

  async function load() {
    const [an, cls] = await Promise.all([
      api<{ items:any[] }>(`/${schoolId}/communications/announcements?page=1&limit=50`),
      api<{ items:any[] }>(`/${schoolId}/classes?page=1&limit=50`),
    ])
    setItems(an.items); setClasses(cls.items)
  }
  React.useEffect(()=>{ load().catch(()=>{}) },[schoolId])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    try {
      const body:any = { title, content }
      if (classId) body.classId = classId
      const item = await api<any>(`/${schoolId}/communications/announcements`, { method:'POST', body: JSON.stringify(body) })
      setItems([item, ...items])
      setTitle(''); setContent(''); setClassId('')
      setMsg('Aviso criado')
    } catch(e:any) { setMsg(e?.message||'Erro'); }
  }

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr'}}>
      <section className="card">
        <h3>Avisos</h3>
        <form className="form" onSubmit={create}>
          <input className="input" placeholder="Título" value={title} onChange={e=>setTitle(e.target.value)} required />
          <textarea className="textarea" placeholder="Conteúdo" value={content} onChange={e=>setContent(e.target.value)} required />
          <div className="row">
            <select className="select" value={classId} onChange={e=>setClassId(e.target.value)}>
              <option value="">(Opcional) Turma</option>
              {classes.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="button primary" type="submit">Criar</button>
          </div>
          {msg && <span className="muted">{msg}</span>}
        </form>
        <ul className="list">
          {items.map((an:any)=> (
            <li key={an.id}><strong>{an.title}</strong>
              <button className="button" style={{ float:'right' }} onClick={async ()=>{
                if (!confirm('Excluir aviso?')) return
                await api<void>(`/${getSchoolId()||'seed-school'}/communications/announcements/${an.id}`, { method:'DELETE' })
                setItems(items.filter((x:any)=>x.id!==an.id))
              }}>Excluir</button>
              <div className="muted">{new Date(an.createdAt).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
