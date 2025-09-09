import React from 'react'
import { api, getSchoolId } from '../lib/api'
import { useToast } from '../components/Toast'

export default function TeachingPage() {
  const { show } = useToast()
  const schoolId = getSchoolId() || 'seed-school'
  const [items, setItems] = React.useState<any[]>([])
  const [classes, setClasses] = React.useState<any[]>([])
  const [subjects, setSubjects] = React.useState<any[]>([])
  const [teachers, setTeachers] = React.useState<any[]>([])
  const [teacherUserId, setTeacherUserId] = React.useState('')
  const [classId, setClassId] = React.useState('')
  const [subjectId, setSubjectId] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  async function load() {
    const [tas, cls, sub, us] = await Promise.all([
      api<{ items:any[] }>(`/${schoolId}/teaching-assignments?page=1&limit=100`),
      api<{ items:any[] }>(`/${schoolId}/classes?page=1&limit=100`),
      api<{ items:any[] }>(`/${schoolId}/subjects?page=1&limit=100`),
      api<{ items:any[] }>(`/${schoolId}/users?page=1&limit=200&role=TEACHER`),
    ])
    setItems(tas.items)
    setClasses(cls.items)
    setSubjects(sub.items)
    setTeachers(us.items.map((m:any)=> ({ id: m.id ?? m.user?.id, name: m.name ?? m.user?.name, email: m.email ?? m.user?.email })))
  }
  React.useEffect(()=>{ load().catch(()=>{}) },[schoolId])

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

  async function remove(id: string) {
    if (!confirm('Remover atribuição?')) return
    await api<void>(`/${schoolId}/teaching-assignments/${id}`, { method:'DELETE' })
    setItems(items.filter(i=>i.id!==id))
    show('Atribuição removida','success')
  }

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr'}}>
      <section className="card">
        <h3>Atribuições de Docência</h3>
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
            <button className="button primary" disabled={busy}>Atribuir</button>
          </div>
        </form>
        <ul className="list">
          {items.map((i:any)=> (
            <li key={i.id}>
              {i.teacher?.name} • {i.class?.name} • {i.subject?.name}
              <button className="button" style={{ float:'right' }} onClick={()=>remove(i.id)}>Remover</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

