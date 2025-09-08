import React from 'react'
import { api } from '../lib/api'
import { getSchoolId } from '../lib/api'

export default function AssignmentsPage() {
  const [items, setItems] = React.useState<any[]>([])
  const [classes, setClasses] = React.useState<any[]>([])
  const [subjects, setSubjects] = React.useState<any[]>([])
  const [msg, setMsg] = React.useState('')
  const [title, setTitle] = React.useState('')
  const [classId, setClassId] = React.useState('')
  const [subjectId, setSubjectId] = React.useState('')
  const [dueAt, setDueAt] = React.useState('')
  const schoolId = getSchoolId() || 'seed-school'

  async function load() {
    const [a, c, s] = await Promise.all([
      api<{ items: any[] }>(`/${schoolId}/assignments?page=1&limit=50`),
      api<{ items: any[] }>(`/${schoolId}/classes?page=1&limit=50`),
      api<{ items: any[] }>(`/${schoolId}/subjects?page=1&limit=50`),
    ])
    setItems(a.items); setClasses(c.items); setSubjects(s.items)
  }
  React.useEffect(()=>{ load().catch(()=>{}) },[schoolId])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    try {
      const body:any = { title, classId, subjectId }
      if (dueAt) body.dueAt = new Date(dueAt).toISOString()
      const item = await api<any>(`/${schoolId}/assignments`, { method:'POST', body: JSON.stringify(body) })
      setItems([item, ...items])
      setTitle(''); setClassId(''); setSubjectId(''); setDueAt('')
      setMsg('Tarefa criada')
    } catch(e:any) { setMsg(e?.message||'Erro'); }
  }

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr'}}>
      <section className="card">
        <h3>Tarefas</h3>
        <form className="form" onSubmit={create}>
          <div className="row">
            <input className="input" placeholder="Título" value={title} onChange={e=>setTitle(e.target.value)} required />
            <select className="select" value={classId} onChange={e=>setClassId(e.target.value)} required>
              <option value="">Turma</option>
              {classes.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="select" value={subjectId} onChange={e=>setSubjectId(e.target.value)} required>
              <option value="">Disciplina</option>
              {subjects.map((s:any)=> <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input className="input" type="date" value={dueAt} onChange={e=>setDueAt(e.target.value)} />
            <button className="button primary" type="submit">Criar</button>
          </div>
          {msg && <span className="muted">{msg}</span>}
        </form>
        <ul className="list">
          {items.map((a:any)=> (
            <li key={a.id}>{a.title} {a.dueAt ? `(até ${new Date(a.dueAt).toLocaleDateString()})` : ''}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}

