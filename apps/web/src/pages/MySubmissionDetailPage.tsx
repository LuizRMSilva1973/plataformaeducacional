import React from 'react'
import { api, getSchoolId } from '../lib/api'
import { useParams } from 'react-router-dom'

export default function MySubmissionDetailPage(){
  const schoolId = getSchoolId()
  const { id } = useParams()
  const [sub, setSub] = React.useState<any>(null)
  React.useEffect(()=>{ if (schoolId && id) api<any>(`/${schoolId}/submissions/${id}`).then(setSub).catch(()=>{}) },[schoolId, id])
  return (
    <div>
      <h2>Minha Entrega</h2>
      {!sub ? (<div>Carregando...</div>) : (
        <>
          <div className="card">
            <div><b>Tarefa:</b> {sub.assignment?.title || sub.assignmentId}</div>
            <div><b>Enviado em:</b> {new Date(sub.submittedAt).toLocaleString()}</div>
          </div>
          <div className="card" style={{marginTop:12}}>
            <h3>Feedback</h3>
            {!sub.SubmissionFeedback ? (
              <div className="muted">Sem feedback ainda.</div>
            ) : (
              <>
                {sub.SubmissionFeedback?.items?.length ? (
                  <table className="table">
                    <thead><tr><th>Critério</th><th>Pontuação</th><th>Comentário</th></tr></thead>
                    <tbody>
                      {sub.SubmissionFeedback.items.map((it:any)=>(
                        <tr key={it.id}><td>{it.criterion?.label}</td><td>{it.score}</td><td>{it.comment||''}</td></tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
                {sub.SubmissionFeedback?.comment && <div style={{marginTop:8}}><b>Comentário do professor:</b> {sub.SubmissionFeedback.comment}</div>}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

