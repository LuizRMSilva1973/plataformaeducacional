import React from 'react'
import { api, getSchoolId } from '../lib/api'
import { useToast } from '../components/Toast'
import { downloadCSV } from '../lib/export'

export default function TeachingPage() {
  const { show } = useToast()
  const [schoolId, setSchoolIdState] = React.useState<string>(getSchoolId() || '')
  const [items, setItems] = React.useState<any[]>([])
  const [classes, setClasses] = React.useState<any[]>([])
  const [subjects, setSubjects] = React.useState<any[]>([])
  const [teachers, setTeachers] = React.useState<any[]>([])
  const [teacherUserId, setTeacherUserId] = React.useState('')
  const [classId, setClassId] = React.useState('')
  const [subjectId, setSubjectId] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [fTeacher, setFTeacher] = React.useState('')
  const [fClass, setFClass] = React.useState('')
  const [fSubject, setFSubject] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [limit] = React.useState(20)

  const load = React.useCallback(async () => {
    const qs = new URLSearchParams()
    qs.set('page', String(page))
    qs.set('limit', String(limit))
    if (fTeacher) qs.set('teacherUserId', fTeacher)
    if (fClass) qs.set('classId', fClass)
    if (fSubject) qs.set('subjectId', fSubject)
    const [tas, cls, sub, us] = await Promise.all([
      api<{ items:any[] }>(`/${schoolId}/teaching-assignments?${qs.toString()}`),
      api<{ items:any[] }>(`/${schoolId}/classes?page=1&limit=200`),
      api<{ items:any[] }>(`/${schoolId}/subjects?page=1&limit=200`),
      api<{ items:any[] }>(`/${schoolId}/users?page=1&limit=200&role=TEACHER`),
    ])
    setItems(tas.items)
    setClasses(cls.items)
    setSubjects(sub.items)
    setTeachers(us.items.map((m:any)=> ({ id: m.id ?? m.user?.id, name: m.name ?? m.user?.name, email: m.email ?? m.user?.email })))
  }, [schoolId, fTeacher, fClass, fSubject, page, limit])
  React.useEffect(()=>{ if (schoolId) load().catch(()=>{}) },[schoolId, load])
  React.useEffect(()=>{
    function onChange(){ const id = getSchoolId(); if (id) setSchoolIdState(id) }
    window.addEventListener('school-change', onChange)
    return ()=> window.removeEventListener('school-change', onChange)
  },[])

  function exportCSV(){
    const rows = items.map((i:any)=> ({ id: i.id, teacher: i.teacher?.name, class: i.class?.name, subject: i.subject?.name }))
    downloadCSV('atribuicoes.csv', rows)
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const item = await api<any>(`/${schoolId}/teaching-assignments`, { method:'POST', body: JSON.stringify({ teacherUserId, classId, subjectId }) })
      setItems([item, ...items])
      setTeacherUserId(''); setClassId(''); setSubjectId('')
      show('Atribuição criada','success')
    } catch(e:any){ show(e?.message||'Erro ao atribuir','error') } finally { setBusy(false) }
  }

  // removido: função 'remove' não utilizada (uso consolidado em TeachingItem)

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr'}}>
      <section className="card">
        <h3>Atribuições de Docência</h3>
        <div className="row">
          <button className="button" onClick={exportCSV}>Exportar CSV</button>
        </div>
        <div className="row">
          <select className="select" value={fTeacher} onChange={e=>{ setPage(1); setFTeacher(e.target.value) }}>
            <option value="">(Todos) Professores</option>
            {teachers.map((t:any)=> <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="select" value={fClass} onChange={e=>{ setPage(1); setFClass(e.target.value) }}>
            <option value="">(Todas) Turmas</option>
            {classes.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="select" value={fSubject} onChange={e=>{ setPage(1); setFSubject(e.target.value) }}>
            <option value="">(Todas) Disciplinas</option>
            {subjects.map((s:any)=> <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="row">
          <button className="button" onClick={()=> setPage(Math.max(1, page-1))}>Anterior</button>
          <span className="muted">Página {page}</span>
          <button className="button" onClick={()=> setPage(page+1)}>Próxima</button>
        </div>
        <form className="form" onSubmit={create}>
          <div className="row">
            <select className="select" value={teacherUserId} onChange={e=>setTeacherUserId(e.target.value)} required>
              <option value="">Professor</option>
              {teachers.map((t:any)=> <option key={t.id} value={t.id}>{t.name} &lt;{t.email}&gt;</option>)}
            </select>
            <select className="select" value={classId} onChange={e=>setClassId(e.target.value)} required>
              <option value="">Turma</option>
              {classes.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="select" value={subjectId} onChange={e=>setSubjectId(e.target.value)} required>
              <option value="">Disciplina</option>
              {subjects.map((s:any)=> <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button className={`button primary${busy?' loading':''}`} disabled={busy}>Atribuir</button>
          </div>
        </form>
        <ul className="list">
          {items.map((i:any)=> <TeachingItem key={i.id} item={i} classes={classes} subjects={subjects} teachers={teachers}
            onRemoved={(id)=>setItems(items.filter(x=>x.id!==id))}
            onUpdated={(u)=>setItems(items.map(x=>x.id===u.id?u:x))} />)}
        </ul>
      </section>
    </div>
  )
}

function TeachingItem({ item, classes, subjects, teachers, onRemoved, onUpdated }: { item:any, classes:any[], subjects:any[], teachers:any[], onRemoved:(id:string)=>void, onUpdated:(u:any)=>void }){
  const { show } = useToast()
  const [edit, setEdit] = React.useState(false)
  const [teacherUserId, setTeacherUserId] = React.useState(item.teacherUserId)
  const [classId, setClassId] = React.useState(item.classId)
  const [subjectId, setSubjectId] = React.useState(item.subjectId)
  async function save(){
    const schoolId = getSchoolId() || 'seed-school'
    const btn = document.activeElement as HTMLButtonElement | null
    try { if (btn) btn.classList.add('loading')
      const u = await api<any>(`/${schoolId}/teaching-assignments/${item.id}`, { method:'PATCH', body: JSON.stringify({ teacherUserId, classId, subjectId }) })
      onUpdated(u); setEdit(false); show('Atribuição atualizada','success')
    } finally { if (btn) btn?.classList.remove('loading') }
  }
  async function del(){
    if(!confirm('Remover atribuição?')) return
    const schoolId = getSchoolId() || 'seed-school'
    const btn = document.activeElement as HTMLButtonElement | null
    try { if (btn) btn.classList.add('loading')
      await api<void>(`/${schoolId}/teaching-assignments/${item.id}`, { method:'DELETE' })
      onRemoved(item.id); show('Atribuição removida','success')
    } finally { if (btn) btn?.classList.remove('loading') }
  }
  return (
    <li>
      {!edit ? (
        <>
          {item.teacher?.name} • {item.class?.name} • {item.subject?.name}
          <span style={{ float:'right', display:'flex', gap:8 }}>
            <button className="button" onClick={()=>setEdit(true)}>Editar</button>
            <button className="button" onClick={del}>Remover</button>
          </span>
        </>
      ) : (
        <div className="row">
          <select className="select" value={teacherUserId} onChange={e=>setTeacherUserId(e.target.value)}>
            {teachers.map((t:any)=> <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="select" value={classId} onChange={e=>setClassId(e.target.value)}>
            {classes.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="select" value={subjectId} onChange={e=>setSubjectId(e.target.value)}>
            {subjects.map((s:any)=> <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="button primary" onClick={save}>Salvar</button>
          <button className="button" onClick={()=>setEdit(false)}>Cancelar</button>
        </div>
      )}
    </li>
  )
}
