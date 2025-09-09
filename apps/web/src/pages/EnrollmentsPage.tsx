import React from 'react'
import { api, getSchoolId } from '../lib/api'
import { useToast } from '../components/Toast'

export default function EnrollmentsPage() {
  const { show } = useToast()
  const schoolId = getSchoolId() || 'seed-school'
  const [items, setItems] = React.useState<any[]>([])
  const [classes, setClasses] = React.useState<any[]>([])
  const [students, setStudents] = React.useState<any[]>([])
  const [classId, setClassId] = React.useState('')
  const [studentUserId, setStudentUserId] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  async function load() {
    const [en, cls, us] = await Promise.all([
      api<{ items:any[] }>(`/${schoolId}/enrollments?page=1&limit=100`),
      api<{ items:any[] }>(`/${schoolId}/classes?page=1&limit=100`),
      api<{ items:any[] }>(`/${schoolId}/users?page=1&limit=200&role=STUDENT`),
    ])
    setItems(en.items)
    setClasses(cls.items)
    // usuários no formato flatten: { id,name,email,role }
    setStudents(us.items.map((m:any)=> ({ id: m.id ?? m.user?.id, name: m.name ?? m.user?.name, email: m.email ?? m.user?.email })))
  }
  React.useEffect(()=>{ load().catch(()=>{}) },[schoolId])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const item = await api<any>(`/${schoolId}/enrollments`, { method:'POST', body: JSON.stringify({ classId, studentUserId }) })
      setItems([item, ...items])
      setClassId(''); setStudentUserId('')
      show('Matrícula criada', 'success')
    } catch(e:any){ show(e?.message||'Erro ao matricular','error') } finally { setBusy(false) }
  }

  async function remove(id: string) {
    if (!confirm('Remover matrícula?')) return
    await api<void>(`/${schoolId}/enrollments/${id}`, { method:'DELETE' })
    setItems(items.filter(i=>i.id!==id))
    show('Matrícula removida', 'success')
  }

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr'}}>
      <section className="card">
        <h3>Matrículas</h3>
        <form className="form" onSubmit={create}>
          <div className="row">
            <select className="select" value={classId} onChange={e=>setClassId(e.target.value)} required>
              <option value="">Turma</option>
              {classes.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="select" value={studentUserId} onChange={e=>setStudentUserId(e.target.value)} required>
              <option value="">Aluno</option>
              {students.map((s:any)=> <option key={s.id} value={s.id}>{s.name} &lt;{s.email}&gt;</option>)}
            </select>
            <button className="button primary" disabled={busy}>Matricular</button>
          </div>
        </form>
        <ul className="list">
          {items.map((i:any)=> (
            <li key={i.id}>
              {i.student?.name} &lt;{i.student?.email}&gt; • {i.class?.name}
              <button className="button" style={{ float:'right' }} onClick={()=>remove(i.id)}>Remover</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

