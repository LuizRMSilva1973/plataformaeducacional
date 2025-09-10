import React from 'react'
import { api, getSchoolId } from '../lib/api'
import { useToast } from '../components/Toast'

export default function MessagesPage() {
  const { show } = useToast()
  const schoolId = getSchoolId() || 'seed-school'
  const [items, setItems] = React.useState<any[]>([])
  const [classes, setClasses] = React.useState<any[]>([])
  const [users, setUsers] = React.useState<any[]>([])
  const [content, setContent] = React.useState('')
  const [classId, setClassId] = React.useState('')
  const [toUserId, setToUserId] = React.useState('')
  const [q, setQ] = React.useState('')
  const [fClass, setFClass] = React.useState('')
  const [fFrom, setFFrom] = React.useState('')
  const [fTo, setFTo] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [limit] = React.useState(20)

  const load = React.useCallback(async () => {
    const qs = new URLSearchParams()
    qs.set('page', String(page))
    qs.set('limit', String(limit))
    if (q) qs.set('q', q)
    if (fClass) qs.set('classId', fClass)
    if (fFrom) qs.set('fromUserId', fFrom)
    if (fTo) qs.set('toUserId', fTo)
    const [msgs, cls, us] = await Promise.all([
      api<{ items:any[] }>(`/${schoolId}/communications/messages?${qs.toString()}`),
      api<{ items:any[] }>(`/${schoolId}/classes?page=1&limit=200`),
      api<{ items:any[] }>(`/${schoolId}/users?page=1&limit=200`),
    ])
    setItems(msgs.items)
    setClasses(cls.items)
    setUsers(us.items.map((m:any)=> ({ id: m.id ?? m.user?.id, name: m.name ?? m.user?.name, email: m.email ?? m.user?.email })))
  }, [schoolId, q, page, limit, fClass, fFrom, fTo])

  React.useEffect(()=>{ load().catch(()=>{}) },[load])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const body:any = { content }
    if (classId) body.classId = classId
    if (toUserId) body.toUserId = toUserId
    const item = await api<any>(`/${schoolId}/communications/messages`, { method:'POST', body: JSON.stringify(body) })
    setItems([item, ...items]); setContent(''); setClassId(''); setToUserId('')
    show('Mensagem enviada','success')
  }

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr'}}>
      <section className="card">
        <h3>Mensagens</h3>
        <div className="row">
          <input className="input" placeholder="Buscar texto" value={q} onChange={e=>{ setPage(1); setQ(e.target.value) }} />
          <select className="select" value={fClass} onChange={e=>{ setPage(1); setFClass(e.target.value) }}>
            <option value="">(Filtro) Turma</option>
            {classes.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="select" value={fFrom} onChange={e=>{ setPage(1); setFFrom(e.target.value) }}>
            <option value="">(Filtro) De (usuário)</option>
            {users.map((u:any)=> <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select className="select" value={fTo} onChange={e=>{ setPage(1); setFTo(e.target.value) }}>
            <option value="">(Filtro) Para (usuário)</option>
            {users.map((u:any)=> <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button className="button" onClick={()=> setPage(Math.max(1, page-1))}>Anterior</button>
          <span className="muted">Página {page}</span>
          <button className="button" onClick={()=> setPage(page+1)}>Próxima</button>
        </div>
        <form className="form" onSubmit={send}>
          <textarea className="textarea" placeholder="Mensagem" value={content} onChange={e=>setContent(e.target.value)} required />
          <div className="row">
            <select className="select" value={classId} onChange={e=>setClassId(e.target.value)}>
              <option value="">(Opcional) Para turma</option>
              {classes.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="select" value={toUserId} onChange={e=>setToUserId(e.target.value)}>
              <option value="">(Opcional) Para usuário</option>
              {users.map((u:any)=> <option key={u.id} value={u.id}>{u.name} &lt;{u.email}&gt;</option>)}
            </select>
            <button className="button primary">Enviar</button>
          </div>
        </form>
        <ul className="list">
          {items.map((m:any)=> (
            <li key={m.id}>
              {new Date(m.createdAt).toLocaleString()} • {m.content}
            </li>
          ))}
          {items.length===0 && <li className="muted">Nenhuma mensagem ainda.</li>}
        </ul>
      </section>
    </div>
  )
}
