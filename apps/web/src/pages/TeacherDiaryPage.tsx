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
    api<{ items:any[] }>(`/${schoolId}/enrollments?classId=${classId}&limit=200`).then(r=>{
      setStudents(r.items.map((e:any)=>({ id: e.studentUserId, name: e.student?.name || e.studentUserId })))
      setMarks({})
    }).catch(()=>{})
  },[schoolId, classId])

  async function save(){
    try{
      const entries = Object.entries(marks).filter(([,st])=>st)
      if (!entries.length){ show('Marque pelo menos um aluno','error'); return }
      for (const [studentUserId, status] of entries){
        await api(`/${schoolId}/attendance`, { method:'POST', body: JSON.stringify({ classId, studentUserId, date: new Date(date), status }) })
      }
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
        <div style={{display:'flex',alignItems:'end'}}>
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

