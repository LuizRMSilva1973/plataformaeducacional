import React from 'react'
import { api, getSchoolId } from '../lib/api'
import { useToast } from '../components/Toast'
import { RichTextEditor } from '../components/RichTextEditor'

type ContentType = 'TEXT'|'HTML'|'VIDEO'|'FILE'

export default function LessonsPage() {
  const schoolId = getSchoolId() || 'seed-school'
  const [classes, setClasses] = React.useState<any[]>([])
  const [subjects, setSubjects] = React.useState<any[]>([])
  const [items, setItems] = React.useState<any[]>([])
  const [classId, setClassId] = React.useState('')
  const [subjectId, setSubjectId] = React.useState('')
  const [q, setQ] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [limit] = React.useState(20)
  const [role, setRole] = React.useState<string|undefined>(undefined)

  const [loading, setLoading] = React.useState(true)
  const load = React.useCallback(async () => {
    const qs = new URLSearchParams()
    qs.set('page', String(page))
    qs.set('limit', String(limit))
    if (classId) qs.set('classId', classId)
    if (subjectId) qs.set('subjectId', subjectId)
    if (q) qs.set('q', q)
    const [ls, cls, sub, me] = await Promise.all([
      api<{ items:any[] }>(`/${schoolId}/lessons?${qs.toString()}`),
      api<{ items:any[] }>(`/${schoolId}/classes?page=1&limit=200`),
      api<{ items:any[] }>(`/${schoolId}/subjects?page=1&limit=200`),
      api<{ role: string|null }>(`/${schoolId}/profile/me`).catch(()=>({ role:null } as any)),
    ])
    setItems(ls.items); setClasses(cls.items); setSubjects(sub.items); setRole(me.role || undefined)
    setLoading(false)
  }, [schoolId, classId, subjectId, q, page, limit])

  React.useEffect(()=>{ load().catch(()=>{}) },[load])

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr'}}>
      <section className="card">
        <h3>Conteúdos</h3>
        <div className="row">
          <select className="select" value={classId} onChange={e=>{ setPage(1); setClassId(e.target.value) }}>
            <option value="">(Todas) Turmas</option>
            {classes.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="select" value={subjectId} onChange={e=>{ setPage(1); setSubjectId(e.target.value) }}>
            <option value="">(Todas) Disciplinas</option>
            {subjects.map((s:any)=> <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input className="input" placeholder="Buscar por título" value={q} onChange={e=>{ setPage(1); setQ(e.target.value) }} />
        </div>
        {role==='TEACHER' && <CreateLesson onCreated={(it)=> setItems([it,...items])} />}
        <div className="row">
          <button className="button" onClick={()=> setPage(Math.max(1, page-1))}>Anterior</button>
          <span className="muted">Página {page}</span>
          <button className="button" onClick={()=> setPage(page+1)}>Próxima</button>
        </div>
        {!loading ? (
          <ul className="list">
            {items.map((l:any)=> <LessonItem key={l.id} item={l} role={role} onDeleted={(id)=>setItems(items.filter((x:any)=>x.id!==id))} />)}
          </ul>
        ) : (
          <div className="skeleton-list">
            {Array.from({length:4}).map((_,i)=> <div key={i} className="skeleton-item" />)}
          </div>
        )}
      </section>
    </div>
  )
}

function CreateLesson({ onCreated }: { onCreated: (x:any)=>void }){
  const schoolId = getSchoolId() || 'seed-school'
  const { show } = useToast()
  const [title, setTitle] = React.useState('')
  const [contentType, setType] = React.useState<ContentType>('TEXT')
  const [body, setBody] = React.useState('')
  const [file, setFile] = React.useState<File|null>(null)
  const [classes, setClasses] = React.useState<any[]>([])
  const [subjects, setSubjects] = React.useState<any[]>([])
  const [classId, setClassId] = React.useState('')
  const [subjectId, setSubjectId] = React.useState('')

  React.useEffect(()=>{ (async ()=>{
    const [cls, sub] = await Promise.all([
      api<{ items:any[] }>(`/${schoolId}/classes?page=1&limit=200`),
      api<{ items:any[] }>(`/${schoolId}/subjects?page=1&limit=200`),
    ])
    setClasses(cls.items); setSubjects(sub.items)
  })().catch(()=>{}) }, [schoolId])

  async function submit(e: React.FormEvent){
    e.preventDefault()
    try {
      const btn = (e.target as HTMLFormElement).querySelector('button[type="submit"]') as HTMLButtonElement | null
      if (btn) btn.classList.add('loading')
      ;(e.target as HTMLFormElement).querySelectorAll('input,select,textarea,button').forEach(el=> (el as HTMLInputElement).disabled = true)
      let fileId: string | undefined
      if (contentType === 'FILE' && file) {
        const base64 = await toBase64(file)
        const up = await api<{ id:string }>(`/${schoolId}/files`, { method:'POST', body: JSON.stringify({ filename: file.name, mimeType: file.type||'application/octet-stream', data: String(base64) }) })
        fileId = up.id
      }
      const payload: any = { title, contentType, classId: classId||undefined, subjectId: subjectId||undefined }
      if (contentType === 'TEXT' || contentType === 'HTML' || contentType === 'VIDEO') payload.body = body
      if (fileId) payload.fileId = fileId
      const created = await api<any>(`/${schoolId}/lessons`, { method:'POST', body: JSON.stringify(payload) })
      onCreated(created)
      setTitle(''); setBody(''); setFile(null); setClassId(''); setSubjectId('')
      show('Conteúdo criado','success')
    } catch (e:any) { show(e?.message || 'Falha ao criar','error') }
    finally {
      const form = (e.target as HTMLFormElement)
      const btn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null
      if (btn) btn.classList.remove('loading')
      form.querySelectorAll('input,select,textarea,button').forEach(el=> (el as HTMLInputElement).disabled = false)
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <h4>Criar conteúdo</h4>
      <div className="row">
        <input className="input" placeholder="Título" value={title} onChange={e=>setTitle(e.target.value)} required />
        <select className="select" value={contentType} onChange={e=>setType(e.target.value as any)}>
          <option value="TEXT">Texto</option>
          <option value="HTML">HTML</option>
          <option value="VIDEO">Vídeo (URL)</option>
          <option value="FILE">Arquivo (PDF/DOCX)</option>
        </select>
      </div>
      <div className="row">
        <select className="select" value={classId} onChange={e=>setClassId(e.target.value)}>
          <option value="">(Opcional) Turma</option>
          {classes.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="select" value={subjectId} onChange={e=>setSubjectId(e.target.value)}>
          <option value="">(Opcional) Disciplina</option>
          {subjects.map((s:any)=> <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      {(contentType==='TEXT') && (
        <textarea className="textarea" placeholder={'Conteúdo em texto'} value={body} onChange={e=>setBody(e.target.value)} required />
      )}
      {(contentType==='HTML') && (
        <RichTextEditor value={body} onChange={setBody} placeholder="Conteúdo (HTML)" />
      )}
      {(contentType==='VIDEO') && (
        <input className="input" placeholder="URL do vídeo (YouTube, Vimeo, etc.)" value={body} onChange={e=>setBody(e.target.value)} required />
      )}
      {contentType==='FILE' && (
        <input className="input" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e=>setFile(e.target.files?.[0]||null)} required />
      )}
      <button className="button primary" type="submit">Salvar</button>
    </form>
  )
}

function LessonItem({ item, role, onDeleted }: { item:any, role?: string, onDeleted:(id:string)=>void }){
  const schoolId = getSchoolId() || 'seed-school'
  const { show } = useToast()
  async function openFile(){
    try {
      const token = localStorage.getItem('edu_token') || ''
      const resp = await fetch(`${(import.meta as any).env?.VITE_API_URL || 'http://localhost:3000'}/${schoolId}/files/${item.fileId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
      })
      if (!resp.ok) throw new Error('Falha ao baixar arquivo')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(()=> URL.revokeObjectURL(url), 60_000)
    } catch (e:any) {
      show(e?.message || 'Erro ao abrir arquivo','error')
    }
  }
  function render(){
    if (item.contentType === 'TEXT') return <div style={{whiteSpace:'pre-wrap'}}>{item.body}</div>
    if (item.contentType === 'HTML') return <div dangerouslySetInnerHTML={{ __html: item.body || '' }} />
    if (item.contentType === 'VIDEO') return <a href={item.body} target="_blank" rel="noreferrer">Assistir vídeo</a>
    if (item.contentType === 'FILE') return <button className="button" onClick={openFile}>Abrir arquivo</button>
    return null
  }
  async function del(){
    if (!confirm('Excluir conteúdo?')) return
    await api<void>(`/${schoolId}/lessons/${item.id}`, { method:'DELETE' })
    onDeleted(item.id); show('Conteúdo excluído','success')
  }
  return (
    <li>
      <strong>{item.title}</strong>
      <div className="muted">{item.contentType}</div>
      {render()}
      {(role==='TEACHER') && (
        <div style={{marginTop:8}}>
          <button className="button" onClick={del}>Excluir</button>
        </div>
      )}
    </li>
  )
}

async function toBase64(file: File){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
