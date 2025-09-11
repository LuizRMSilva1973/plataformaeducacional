import React from 'react'
import { api, getSchoolId } from '../lib/api'

export default function MySubmissionsPage(){
  const schoolId = getSchoolId()
  const [items, setItems] = React.useState<any[]>([])
  const [me, setMe] = React.useState<any>(null)
  React.useEffect(()=>{
    if (!schoolId) return
    ;(async ()=>{
      const me = await api<any>(`/${schoolId}/profile/me`)
      setMe(me)
      const s = await api<{ items:any[] }>(`/${schoolId}/submissions?studentUserId=${me.user?.id}&limit=200`)
      setItems(s.items)
    })().catch(()=>{})
  },[schoolId])
  return (
    <div>
      <h2>Minhas Entregas</h2>
      <table className="table">
        <thead><tr><th>Data</th><th>Tarefa</th><th>Ações</th></tr></thead>
        <tbody>
          {items.map(s => (
            <tr key={s.id}>
              <td>{new Date(s.submittedAt).toLocaleString()}</td>
              <td>{s.assignmentId}</td>
              <td><a className="button" href={`/me/submissions/${s.id}`}>Ver feedback</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

