import React from 'react'
import { api, getSchoolId } from '../lib/api'

export default function TeacherSubmissionsPage(){
  const schoolId = getSchoolId()
  const [items, setItems] = React.useState<any[]>([])
  React.useEffect(()=>{ if (schoolId) api<{items:any[]}>(`/${schoolId}/submissions/teacher`).then(r=>setItems(r.items)).catch(()=>{}) },[schoolId])
  return (
    <div>
      <h2>Minhas Submissões (Professor)</h2>
      <table className="table">
        <thead><tr><th>Data</th><th>Aluno</th><th>Tarefa</th><th>Ações</th></tr></thead>
        <tbody>
          {items.map(s => (
            <tr key={s.id}>
              <td>{new Date(s.submittedAt).toLocaleString()}</td>
              <td>{s.student?.name||s.studentUserId}</td>
              <td>{s.assignment?.title}</td>
              <td><a className="button" href={`/teacher/evaluate/${s.id}`}>Avaliar</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

