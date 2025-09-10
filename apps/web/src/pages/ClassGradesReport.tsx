import React from 'react'
import { api, getSchoolId } from '../lib/api'
import { downloadCSV } from '../lib/export'

export default function ClassGradesReport() {
  const schoolId = getSchoolId() || 'seed-school'
  const [classes, setClasses] = React.useState<any[]>([])
  const [subjects, setSubjects] = React.useState<any[]>([])
  const [students, setStudents] = React.useState<any[]>([])
  const [items, setItems] = React.useState<any[]>([])
  const [classId, setClassId] = React.useState('')
  const [subjectId, setSubjectId] = React.useState('')
  const [studentUserId, setStudentUserId] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [limit] = React.useState(50)

  const load = React.useCallback(async () => {
    const [cls, sub, us] = await Promise.all([
      api<{ items:any[] }>(`/${schoolId}/classes?page=1&limit=200`),
      api<{ items:any[] }>(`/${schoolId}/subjects?page=1&limit=200`),
      api<{ items:any[] }>(`/${schoolId}/users?page=1&limit=500&role=STUDENT`),
    ])
    setClasses(cls.items)
    setSubjects(sub.items)
    setStudents(us.items.map((m:any)=> ({ id: m.id ?? m.user?.id, name: m.name ?? m.user?.name })))
  }, [schoolId])

  const query = React.useCallback(async () => {
    const qs = new URLSearchParams()
    qs.set('page', String(page))
    qs.set('limit', String(limit))
    if (classId) qs.set('classId', classId)
    if (subjectId) qs.set('subjectId', subjectId)
    if (studentUserId) qs.set('studentUserId', studentUserId)
    const r = await api<{ items:any[] }>(`/${schoolId}/grades?${qs.toString()}`)
    setItems(r.items)
  }, [schoolId, classId, subjectId, studentUserId, page, limit])

  React.useEffect(()=>{ load().catch(()=>{}) },[load])
  React.useEffect(()=>{ query().catch(()=>{}) },[query])

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr'}}>
      <section className="card">
        <h3>Relatório de Notas</h3>
        <div className="row">
          <select className="select" value={classId} onChange={e=>{ setPage(1); setClassId(e.target.value) }}>
            <option value="">(Todas) Turmas</option>
            {classes.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="select" value={subjectId} onChange={e=>{ setPage(1); setSubjectId(e.target.value) }}>
            <option value="">(Todas) Disciplinas</option>
            {subjects.map((s:any)=> <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="select" value={studentUserId} onChange={e=>{ setPage(1); setStudentUserId(e.target.value) }}>
            <option value="">(Todos) Alunos</option>
            {students.map((s:any)=> <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="row">
          <button className="button" onClick={()=> setPage(Math.max(1, page-1))}>Anterior</button>
          <span className="muted">Página {page}</span>
          <button className="button" onClick={()=> setPage(page+1)}>Próxima</button>
          <button className="button" onClick={()=>{
            const rows = items.map((g:any)=> ({ id: g.id, gradedAt: g.gradedAt, value: g.value, class: g.class?.name || g.classId, subject: g.subject?.name || g.subjectId, student: g.student?.name || g.studentUserId }))
            downloadCSV('notas.csv', rows)
          }}>Exportar CSV</button>
        </div>
        <ul className="list">
          {items.map((g:any)=> (
            <li key={g.id}>
              {new Date(g.gradedAt).toLocaleString()} • {g.value}
              <div className="muted">Turma: {g.class?.name || g.classId} • Disciplina: {g.subject?.name || g.subjectId} • Aluno: {g.student?.name || g.studentUserId}</div>
            </li>
          ))}
          {items.length===0 && <li className="muted">Nenhuma nota encontrada.</li>}
        </ul>
      </section>
    </div>
  )
}
