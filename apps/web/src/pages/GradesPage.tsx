import React from 'react'
import { api, getSchoolId } from '../lib/api'
import { useToast } from '../components/Toast'

export default function GradesPage() {
  const { show } = useToast()
  const schoolId = getSchoolId() || 'seed-school'
  const [classes, setClasses] = React.useState<any[]>([])
  const [subjects, setSubjects] = React.useState<any[]>([])
  const [students, setStudents] = React.useState<any[]>([])
  const [items, setItems] = React.useState<any[]>([])
  const [classId, setClassId] = React.useState('')
  const [subjectId, setSubjectId] = React.useState('')
  const [studentUserId, setStudentUserId] = React.useState('')
  const [assignmentId, setAssignmentId] = React.useState('')
  const [value, setValue] = React.useState<string>('')

  const load = React.useCallback(async () => {
    const [cls, sub, us, gr] = await Promise.all([
      api<{ items:any[] }>(`/${schoolId}/classes?page=1&limit=200`),
      api<{ items:any[] }>(`/${schoolId}/subjects?page=1&limit=200`),
      api<{ items:any[] }>(`/${schoolId}/users?page=1&limit=500&role=STUDENT`),
      api<{ items:any[] }>(`/${schoolId}/grades?page=1&limit=50&order=desc`),
    ])
    setClasses(cls.items)
    setSubjects(sub.items)
    setStudents(us.items.map((m:any)=> ({ id: m.id ?? m.user?.id, name: m.name ?? m.user?.name })))
    setItems(gr.items)
  }, [schoolId])

  React.useEffect(()=>{ load().catch(()=>{}) },[load])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    const payload: any = { studentUserId, classId, subjectId, value: Number(value) }
    if (assignmentId) payload.assignmentId = assignmentId
    const item = await api<any>(`/${schoolId}/grades`, { method:'POST', body: JSON.stringify(payload) })
    setItems([item, ...items])
    setStudentUserId(''); setClassId(''); setSubjectId(''); setAssignmentId(''); setValue('')
    show('Nota lançada','success')
  }

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr'}}>
      <section className="card">
        <h3>Notas</h3>
        <form className="form" onSubmit={create}>
          <div className="row">
            <select className="select" value={studentUserId} onChange={e=>setStudentUserId(e.target.value)} required>
              <option value="">Aluno</option>
              {students.map((s:any)=> <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className="select" value={classId} onChange={e=>setClassId(e.target.value)} required>
              <option value="">Turma</option>
              {classes.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="select" value={subjectId} onChange={e=>setSubjectId(e.target.value)} required>
              <option value="">Disciplina</option>
              {subjects.map((s:any)=> <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input className="input" placeholder="Valor" type="number" step="0.1" value={value} onChange={e=>setValue(e.target.value)} required />
            <button className="button primary">Lançar</button>
          </div>
        </form>
        <ul className="list">
          {items.map((g:any)=> (
            <li key={g.id}>
              {new Date(g.gradedAt).toLocaleString()} • {g.value}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

