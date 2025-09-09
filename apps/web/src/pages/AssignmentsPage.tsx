import React from 'react'
import { api, getSchoolId } from '../lib/api'
import { useToast } from '../components/Toast'
import { downloadCSV } from '../lib/export'
import { getSchoolId } from '../lib/api'

export default function AssignmentsPage() {
  const { show } = useToast()
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

  function exportCSV(){
    const rows = items.map((a:any)=> ({ id: a.id, title: a.title, dueAt: a.dueAt || '' }))
    downloadCSV('tarefas.csv', rows)
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    try {
      const body:any = { title, classId, subjectId }
      if (dueAt) body.dueAt = new Date(dueAt).toISOString()
      const item = await api<any>(`/${schoolId}/assignments`, { method:'POST', body: JSON.stringify(body) })
      setItems([item, ...items])
      setTitle(''); setClassId(''); setSubjectId(''); setDueAt('')
      setMsg('')
      show('Tarefa criada','success')
    } catch(e:any) { setMsg(e?.message||'Erro'); show('Erro ao criar tarefa','error') }
  }

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr'}}>
      <section className="card">
        <h3>Tarefas</h3>
        <div className="row">
          <button className="button" onClick={exportCSV}>Exportar CSV</button>
        </div>
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
          {items.map((a:any)=> <AssignmentItem key={a.id} item={a} onDeleted={(id)=>setItems(items.filter((x:any)=>x.id!==id))} onUpdated={(u)=>setItems(items.map((it:any)=> it.id===u.id?u:it))} />)}
        </ul>
      </section>
    </div>
  )
}

function AssignmentItem({ item, onDeleted, onUpdated }: { item:any, onDeleted:(id:string)=>void, onUpdated:(u:any)=>void }){
  const { show } = useToast()
  const [edit, setEdit] = React.useState(false)
  const [title, setTitle] = React.useState(item.title)
  const [dueAt, setDueAt] = React.useState<string>(item.dueAt ? new Date(item.dueAt).toISOString().slice(0,10) : '')
  async function save(){
    const schoolId = getSchoolId() || 'seed-school'
    const body:any = { title }
    if (dueAt) body.dueAt = new Date(dueAt)
    const u = await api<any>(`/${schoolId}/assignments/${item.id}`, { method:'PATCH', body: JSON.stringify(body) })
    onUpdated(u); setEdit(false); show('Tarefa atualizada','success')
  }
  async function del(){
    if(!confirm('Excluir tarefa?')) return
    const schoolId = getSchoolId() || 'seed-school'
    await api<void>(`/${schoolId}/assignments/${item.id}`, { method:'DELETE' })
    onDeleted(item.id); show('Tarefa excluída','success')
  }
  return (
    <li>
      {!edit ? (
        <>
          {item.title} {item.dueAt ? `(até ${new Date(item.dueAt).toLocaleDateString()})` : ''}
          <span style={{ float:'right', display:'flex', gap:8 }}>
            <button className="button" onClick={()=>setEdit(true)}>Editar</button>
            <button className="button" onClick={del}>Excluir</button>
          </span>
        </>
      ) : (
        <div className="row">
          <input className="input" value={title} onChange={e=>setTitle(e.target.value)} />
          <input className="input" type="date" value={dueAt} onChange={e=>setDueAt(e.target.value)} />
          <button className="button primary" onClick={save}>Salvar</button>
          <button className="button" onClick={()=>setEdit(false)}>Cancelar</button>
        </div>
      )}
    </li>
  )
}
