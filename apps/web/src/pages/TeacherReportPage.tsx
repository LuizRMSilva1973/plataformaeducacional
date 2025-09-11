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
      <div className="row" style={{gap:8, marginBottom:8}}>
        <a className="button" href={`${(import.meta as any).env?.VITE_API_URL || 'http://localhost:3000'}/${schoolId}/profile/teacher/report?format=csv`}>Exportar CSV</a>
        <a className="button" href={`${(import.meta as any).env?.VITE_API_URL || 'http://localhost:3000'}/${schoolId}/profile/teacher/report?format=xlsx`}>Exportar Excel</a>
        <a className="button" href={`/teacher/submissions`}>Minhas Submissões</a>
      </div>
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
      <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:8, marginTop:12}}>
        <BarChart data={items.map((r:any)=>({ x: `${r.class?.name}-${r.subject?.name}`, y: Math.round((r.avgGrade||0)*10) }))} title="Média de Notas (x10)" color="#2563eb" />
        <BarChart data={items.map((r:any)=>({ x: `${r.class?.name}-${r.subject?.name}`, y: Math.round((r.attendanceRate||0)*100) }))} title="Presença (%)" color="#16a34a" />
      </div>
    </div>
  )
}

function BarChart({ data, title, color }: { data: { x: string, y: number }[], title: string, color: string }){
  const max = Math.max(1, ...data.map(d=>d.y))
  return (
    <div className="card">
      <div className="muted">{title}</div>
      <div>
        {data.map((d,i)=> (
          <div key={i} style={{display:'flex', alignItems:'center', gap:8, marginTop:4}}>
            <div className="muted" style={{width:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}} title={d.x}>{d.x}</div>
            <div style={{background:'#e5e7eb', height:10, borderRadius:4, flexGrow:1}}>
              <div style={{width:`${(d.y/max)*100}%`, height:10, background: color}} title={String(d.y)}></div>
            </div>
            <div style={{width:40, textAlign:'right'}}>{d.y}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
