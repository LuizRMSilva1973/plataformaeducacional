import React from 'react'
import { api, getSchoolId } from '../lib/api'
import { useToast } from '../components/Toast'
import { downloadCSV } from '../lib/export'
import { useDebouncedValue } from '../lib/hooks'
import { getSchoolId } from '../lib/api'

export default function AnnouncementsPage() {
  const { show } = useToast()
  const [items, setItems] = React.useState<any[]>([])
  const [classes, setClasses] = React.useState<any[]>([])
  const [title, setTitle] = React.useState('')
  const [content, setContent] = React.useState('')
  const [classId, setClassId] = React.useState('')
  const [msg, setMsg] = React.useState('')
  const [q, setQ] = React.useState('')
  const [order, setOrder] = React.useState<'asc'|'desc'>('desc')
  const [page, setPage] = React.useState(1)
  const [limit] = React.useState(20)
  const dq = useDebouncedValue(q, 300)
  const schoolId = getSchoolId() || 'seed-school'

  async function load() {
    const qs = new URLSearchParams()
    qs.set('page', String(page))
    qs.set('limit', String(limit))
    if (dq) qs.set('q', dq)
    if (classId) qs.set('classId', classId)
    qs.set('order', order)
    const [an, cls] = await Promise.all([
      api<{ items:any[] }>(`/${schoolId}/communications/announcements?${qs.toString()}`),
      api<{ items:any[] }>(`/${schoolId}/classes?page=1&limit=200`),
    ])
    setItems(an.items); setClasses(cls.items)
  }
  React.useEffect(()=>{ load().catch(()=>{}) },[schoolId, dq, classId, order, page, limit])

  function exportCSV(){
    const rows = items.map((an:any)=> ({ id: an.id, title: an.title, createdAt: an.createdAt }))
    downloadCSV('avisos.csv', rows)
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    try {
      const body:any = { title, content }
      if (classId) body.classId = classId
      const item = await api<any>(`/${schoolId}/communications/announcements`, { method:'POST', body: JSON.stringify(body) })
      setItems([item, ...items])
      setTitle(''); setContent(''); setClassId('')
      setMsg('')
      show('Aviso criado','success')
    } catch(e:any) { setMsg(e?.message||'Erro'); show('Erro ao criar aviso','error') }
  }

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr'}}>
      <section className="card">
        <h3>Avisos</h3>
        <div className="row">
          <select className="select" value={classId} onChange={e=>{ setPage(1); setClassId(e.target.value) }}>
            <option value="">(Todas) Turmas</option>
            {classes.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="input" placeholder="Buscar por título" value={q} onChange={e=>{ setPage(1); setQ(e.target.value) }} />
          <select className="select" value={order} onChange={e=>{ setPage(1); setOrder(e.target.value as any) }}>
            <option value="desc">Mais recentes</option>
            <option value="asc">Mais antigos</option>
          </select>
          <button className="button" onClick={exportCSV}>Exportar CSV</button>
        </div>
        <div className="row">
          <button className="button" onClick={()=> setPage(Math.max(1, page-1))}>Anterior</button>
          <span className="muted">Página {page}</span>
          <button className="button" onClick={()=> setPage(page+1)}>Próxima</button>
        </div>
        <div className="row">
          <button className="button" onClick={exportCSV}>Exportar CSV</button>
        </div>
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
          {items.map((an:any)=> <AnnouncementItem key={an.id} item={an} onDeleted={(id)=>setItems(items.filter((x:any)=>x.id!==id))} onUpdated={(u)=>setItems(items.map((it:any)=> it.id===u.id?u:it))} />)}
        </ul>
      </section>
    </div>
  )
}

function AnnouncementItem({ item, onDeleted, onUpdated }: { item:any, onDeleted:(id:string)=>void, onUpdated:(u:any)=>void }){
  const { show } = useToast()
  const [edit, setEdit] = React.useState(false)
  const [title, setTitle] = React.useState(item.title)
  const [content, setContent] = React.useState(item.content || '')
  const [classId, setClassId] = React.useState(item.classId || '')
  async function save(){
    const schoolId = getSchoolId() || 'seed-school'
    const u = await api<any>(`/${schoolId}/communications/announcements/${item.id}`, { method:'PATCH', body: JSON.stringify({ title, content, classId: classId || undefined }) })
    onUpdated(u); setEdit(false); show('Aviso atualizado','success')
  }
  async function del(){
    if(!confirm('Excluir aviso?')) return
    const schoolId = getSchoolId() || 'seed-school'
    await api<void>(`/${schoolId}/communications/announcements/${item.id}`, { method:'DELETE' })
    onDeleted(item.id); show('Aviso excluído','success')
  }
  return (
    <li>
      {!edit ? (
        <>
          <strong>{item.title}</strong>
          <span style={{ float:'right', display:'flex', gap:8 }}>
            <button className="button" onClick={()=>setEdit(true)}>Editar</button>
            <button className="button" onClick={del}>Excluir</button>
          </span>
          <div className="muted">{new Date(item.createdAt).toLocaleString()}</div>
        </>
      ) : (
        <div className="form">
          <input className="input" value={title} onChange={e=>setTitle(e.target.value)} />
          <textarea className="textarea" value={content} onChange={e=>setContent(e.target.value)} />
          <div className="row">
            <input className="input" placeholder="(Opcional) classId" value={classId} onChange={e=>setClassId(e.target.value)} />
            <button className="button primary" onClick={save}>Salvar</button>
            <button className="button" onClick={()=>setEdit(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </li>
  )
}
