import React from 'react'
import { api, getSchoolId } from '../lib/api'
import { useToast } from '../components/Toast'

export default function TeacherDiaryPage(){
  const schoolId = getSchoolId()
  const { show } = useToast()
  const [teacher, setTeacher] = React.useState<any>(null)
  const [classId, setClassId] = React.useState('')
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0,10))
  const [students, setStudents] = React.useState<any[]>([])
  const [marks, setMarks] = React.useState<Record<string,string>>({})

  React.useEffect(()=>{
    if (!schoolId) return
    api(`/${schoolId}/profile/teacher/overview`).then(setTeacher).catch(()=>{})
  },[schoolId])

  React.useEffect(()=>{
    if (!schoolId || !classId) return
    ;(async ()=>{
      try{
        const [enr, att] = await Promise.all([
          api<{ items:any[] }>(`/${schoolId}/enrollments?classId=${classId}&limit=500`),
          api<{ items:any[] }>(`/${schoolId}/attendance?classId=${classId}&dateFrom=${new Date(date).toISOString()}&dateTo=${new Date(date).toISOString()}&limit=500`).catch(()=>({ items: [] } as any))
        ])
        const studs = enr.items.map((e:any)=>({ id: e.studentUserId, name: e.student?.name || e.studentUserId }))
        setStudents(studs)
        const current: Record<string,string> = {}
        for (const a of att.items){ current[a.studentUserId] = a.status }
        setMarks(current)
      }catch{}
    })()
  },[schoolId, classId, date])

  async function save(){
    try{
      const entries = Object.entries(marks).filter(([,st])=>st).map(([studentUserId, status])=>({ studentUserId, status }))
      if (!entries.length){ show('Marque pelo menos um aluno','error'); return }
      await api(`/${schoolId}/attendance/bulk`, { method:'POST', body: JSON.stringify({ classId, date: new Date(date), items: entries }) })
      show('Presenças lançadas','success')
    }catch(e:any){ show(e?.message || 'Falha ao lançar presenças','error') }
  }

  function setMark(id: string, status: string){ setMarks(m => ({ ...m, [id]: status })) }

  return (
    <div>
      <h2>Diário do Professor</h2>
      <div className="row" style={{gap:8}}>
        <label>
          <div className="muted">Turma</div>
          <select className="select" value={classId} onChange={e=>setClassId(e.target.value)}>
            <option value="">Selecione</option>
            {(teacher?.classes||[]).map((t:any,i:number)=> <option key={i} value={t.class?.id}>{t.class?.name} — {t.subject?.name}</option>)}
          </select>
        </label>
        <label>
          <div className="muted">Data</div>
          <input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
        </label>
        <div style={{display:'flex',alignItems:'end',gap:8}}>
          <button className="button" onClick={()=>{ const all:Record<string,string>={}; students.forEach(s=>all[s.id]='PRESENT'); setMarks(all) }}>Todos Presentes</button>
          <button className="button" onClick={()=>{ const all:Record<string,string>={}; students.forEach(s=>all[s.id]='ABSENT'); setMarks(all) }}>Todos Faltaram</button>
          <button className="button" onClick={save}>Salvar</button>
        </div>
      </div>

      <div className="card" style={{marginTop:12}}>
        <h3>Chamada</h3>
        <table className="table">
          <thead><tr><th>Aluno</th><th>Presente</th><th>Falta</th><th>Atraso</th></tr></thead>
          <tbody>
            {students.map(st => (
              <tr key={st.id}>
                <td>{st.name}</td>
                <td><input type="radio" name={`m-${st.id}`} checked={marks[st.id]==='PRESENT'} onChange={()=>setMark(st.id,'PRESENT')} /></td>
                <td><input type="radio" name={`m-${st.id}`} checked={marks[st.id]==='ABSENT'} onChange={()=>setMark(st.id,'ABSENT')} /></td>
                <td><input type="radio" name={`m-${st.id}`} checked={marks[st.id]==='LATE'} onChange={()=>setMark(st.id,'LATE')} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
