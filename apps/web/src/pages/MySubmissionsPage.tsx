import React from 'react'
import { api, getSchoolId } from '../lib/api'

export default function MySubmissionsPage(){
  const schoolId = getSchoolId()
  const [items, setItems] = React.useState<any[]>([])
  const [q, setQ] = React.useState('')
  const [filtered, setFiltered] = React.useState<any[]>([])
  const [me, setMe] = React.useState<any>(null)
  React.useEffect(()=>{
    if (!schoolId) return
    ;(async ()=>{
      const me = await api<any>(`/${schoolId}/profile/me`)
      setMe(me)
      const s = await api<{ items:any[] }>(`/${schoolId}/submissions?studentUserId=${me.user?.id}&limit=200`)
      setItems(s.items)
      setFiltered(s.items)
    })().catch(()=>{})
  },[schoolId])
  function search(val: string){
    setQ(val)
    const v = val.toLowerCase()
    setFiltered(items.filter(it=> String(it.assignmentId||'').toLowerCase().includes(v) || new Date(it.submittedAt).toLocaleString().toLowerCase().includes(v)))
  }
  function exportCSV(){
    const rows = filtered.map(it=>({ id: it.id, assignmentId: it.assignmentId, submittedAt: new Date(it.submittedAt).toISOString() }))
    const csv = ['id,assignmentId,submittedAt', ...rows.map(r=>[r.id, r.assignmentId, r.submittedAt].join(','))].join('\n')
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'minhas-entregas.csv'; a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div>
      <h2>Minhas Entregas</h2>
      <div className="row" style={{gap:8, marginBottom:8}}>
        <input className="input" placeholder="Buscar por tarefa ou data" value={q} onChange={e=>search(e.target.value)} />
        <button className="button" onClick={exportCSV}>Exportar CSV</button>
      </div>
      <table className="table">
        <thead><tr><th>Data</th><th>Tarefa</th><th>Ações</th></tr></thead>
        <tbody>
          {filtered.map(s => (
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
