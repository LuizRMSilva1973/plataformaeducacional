import React from 'react'
import { api, getSchoolId } from '../lib/api'
import { downloadCSV } from '../lib/export'

export default function ClassAttendanceReport() {
  const schoolId = getSchoolId() || 'seed-school'
  const [classes, setClasses] = React.useState<any[]>([])
  const [students, setStudents] = React.useState<any[]>([])
  const [items, setItems] = React.useState<any[]>([])
  const [classId, setClassId] = React.useState('')
  const [studentUserId, setStudentUserId] = React.useState('')
  const [status, setStatus] = React.useState('')
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [limit] = React.useState(50)

  const [loading, setLoading] = React.useState(true)
  const load = React.useCallback(async () => {
    const [cls, us] = await Promise.all([
      api<{ items:any[] }>(`/${schoolId}/classes?page=1&limit=200`),
      api<{ items:any[] }>(`/${schoolId}/users?page=1&limit=500&role=STUDENT`),
    ])
    setClasses(cls.items)
    setStudents(us.items.map((m:any)=> ({ id: m.id ?? m.user?.id, name: m.name ?? m.user?.name })))
  }, [schoolId])

  const query = React.useCallback(async () => {
    const qs = new URLSearchParams()
    qs.set('page', String(page))
    qs.set('limit', String(limit))
    if (classId) qs.set('classId', classId)
    if (studentUserId) qs.set('studentUserId', studentUserId)
    if (status) qs.set('status', status)
    if (dateFrom) qs.set('dateFrom', dateFrom)
    if (dateTo) qs.set('dateTo', dateTo)
    const r = await api<{ items:any[] }>(`/${schoolId}/attendance?${qs.toString()}`)
    setItems(r.items)
  }, [schoolId, classId, studentUserId, status, dateFrom, dateTo, page, limit])

  React.useEffect(()=>{ load().catch(()=>{}) },[load])
  React.useEffect(()=>{ query().then(()=>setLoading(false)).catch(()=>setLoading(false)) },[query])

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr'}}>
      <section className="card">
        <h3>Relatório de Presenças</h3>
        <div className="row">
          <select className="select" value={classId} onChange={e=>{ setPage(1); setClassId(e.target.value) }}>
            <option value="">(Todas) Turmas</option>
            {classes.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="select" value={studentUserId} onChange={e=>{ setPage(1); setStudentUserId(e.target.value) }}>
            <option value="">(Todos) Alunos</option>
            {students.map((s:any)=> <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="select" value={status} onChange={e=>{ setPage(1); setStatus(e.target.value) }}>
            <option value="">(Todos) Status</option>
            <option value="PRESENT">Presente</option>
            <option value="ABSENT">Faltou</option>
            <option value="LATE">Atraso</option>
          </select>
          <input className="input" type="date" value={dateFrom} onChange={e=>{ setPage(1); setDateFrom(e.target.value) }} />
          <input className="input" type="date" value={dateTo} onChange={e=>{ setPage(1); setDateTo(e.target.value) }} />
        </div>
        <div className="row">
          <button className="button" onClick={()=> setPage(Math.max(1, page-1))}>Anterior</button>
          <span className="muted">Página {page}</span>
          <button className="button" onClick={()=> setPage(page+1)}>Próxima</button>
          <button className="button" onClick={()=>{
            const rows = items.map((a:any)=> ({ id: a.id, date: a.date, status: a.status, class: a.class?.name || a.classId, student: a.student?.name || a.studentUserId }))
            downloadCSV('presencas.csv', rows)
          }}>Exportar CSV</button>
        </div>
        {!loading ? (
          <ul className="list">
            {items.map((a:any)=> (
              <li key={a.id}>
                {new Date(a.date).toLocaleDateString()} • {a.status}
                <div className="muted">Turma: {a.class?.name || a.classId} • Aluno: {a.student?.name || a.studentUserId}</div>
              </li>
            ))}
            {items.length===0 && <li className="muted">Nenhum registro encontrado.</li>}
          </ul>
        ) : (
          <div className="skeleton-list">
            {Array.from({length:6}).map((_,i)=> <div key={i} className="skeleton-item" />)}
          </div>
        )}
      </section>
    </div>
  )
}
