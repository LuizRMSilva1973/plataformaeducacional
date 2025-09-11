import React from 'react'
import { api, getSchoolId } from '../lib/api'

export default function TeacherReportPage(){
  const schoolId = getSchoolId()
  const [items, setItems] = React.useState<any[]>([])
  React.useEffect(()=>{ if (schoolId) api(`/${schoolId}/profile/teacher/report`).then((r:any)=>setItems(r.items||[])).catch(()=>{}) },[schoolId])
  function pct(x?: number|null){ return x==null? '-' : (x*100).toFixed(1)+'%' }
  return (
    <div>
      <h2>Relatório do Professor</h2>
      <table className="table">
        <thead><tr><th>Turma</th><th>Disciplina</th><th>Média de Notas</th><th>Qtd. Notas</th><th>Taxa de Presença</th></tr></thead>
        <tbody>
          {items.map((r:any,idx:number)=>(
            <tr key={idx}>
              <td>{r.class?.name}</td>
              <td>{r.subject?.name}</td>
              <td>{r.avgGrade==null?'-':r.avgGrade.toFixed(2)}</td>
              <td>{r.gradesCount||0}</td>
              <td>{pct(r.attendanceRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

