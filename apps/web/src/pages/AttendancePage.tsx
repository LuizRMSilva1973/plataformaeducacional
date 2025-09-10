import React from 'react'
import { api, getSchoolId } from '../lib/api'
import { useToast } from '../components/Toast'

export default function AttendancePage() {
  const { show } = useToast()
  const schoolId = getSchoolId() || 'seed-school'
  const [classes, setClasses] = React.useState<any[]>([])
  const [students, setStudents] = React.useState<any[]>([])
  const [items, setItems] = React.useState<any[]>([])
  const [classId, setClassId] = React.useState('')
  const [studentUserId, setStudentUserId] = React.useState('')
  const [date, setDate] = React.useState<string>(new Date().toISOString().slice(0,10))
  const [status, setStatus] = React.useState<'PRESENT'|'ABSENT'|'LATE'>('PRESENT')

  const load = React.useCallback(async () => {
    const [cls, us, atts] = await Promise.all([
      api<{ items:any[] }>(`/${schoolId}/classes?page=1&limit=200`),
      api<{ items:any[] }>(`/${schoolId}/users?page=1&limit=500&role=STUDENT`),
      api<{ items:any[] }>(`/${schoolId}/attendance?page=1&limit=50&order=desc`),
    ])
    setClasses(cls.items)
    setStudents(us.items.map((m:any)=> ({ id: m.id ?? m.user?.id, name: m.name ?? m.user?.name })))
    setItems(atts.items)
  }, [schoolId])

  React.useEffect(()=>{ load().catch(()=>{}) },[load])

  async function create(e: React.FormEvent){
    e.preventDefault()
    const payload = { classId, studentUserId, date: new Date(date), status }
    const item = await api<any>(`/${schoolId}/attendance`, { method:'POST', body: JSON.stringify(payload) })
    setItems([item, ...items])
    show('Presença registrada','success')
  }

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr'}}>
      <section className="card">
        <h3>Presenças</h3>
        <form className="form" onSubmit={create}>
          <div className="row">
            <select className="select" value={classId} onChange={e=>setClassId(e.target.value)} required>
              <option value="">Turma</option>
              {classes.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="select" value={studentUserId} onChange={e=>setStudentUserId(e.target.value)} required>
              <option value="">Aluno</option>
              {students.map((s:any)=> <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} required />
            <select className="select" value={status} onChange={e=>setStatus(e.target.value as any)}>
              <option value="PRESENT">Presente</option>
              <option value="ABSENT">Faltou</option>
              <option value="LATE">Atraso</option>
            </select>
            <button className="button primary">Registrar</button>
          </div>
        </form>
        <ul className="list">
          {items.map((a:any)=> (
            <li key={a.id}>
              {new Date(a.date).toLocaleDateString()} • {a.status}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

