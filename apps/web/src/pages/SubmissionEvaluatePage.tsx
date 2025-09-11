import React from 'react'
import { api, getSchoolId } from '../lib/api'
import { useToast } from '../components/Toast'
import { useParams } from 'react-router-dom'

export default function SubmissionEvaluatePage(){
  const { id } = useParams()
  const schoolId = getSchoolId()
  const { show } = useToast()
  const [sub, setSub] = React.useState<any>(null)
  const [items, setItems] = React.useState<{ criterionId: string, score: number, comment?: string }[]>([])
  const [comment, setComment] = React.useState('')

  React.useEffect(()=>{
    if (!schoolId || !id) return
    api<any>(`/${schoolId}/submissions/${id}`).then(r=>{
      setSub(r)
      const crits = r?.assignment?.AssignmentRubric?.rubric?.criteria || []
      setItems(crits.map((c:any)=>({ criterionId: c.id, score: 0 })))
    }).catch(()=>{})
  },[schoolId, id])

  function update(i: number, patch: Partial<{ score: number, comment: string }>) { setItems(arr => arr.map((it,idx)=> idx===i? { ...it, ...patch }: it)) }

  async function save(){
    try{
      if (!items.length){ show('Rubrica não associada a esta tarefa','error'); return }
      await api(`/${schoolId}/rubrics/feedback`, { method:'POST', body: JSON.stringify({ submissionId: id, comment: comment || undefined, items }) })
      show('Feedback registrado','success')
    }catch(e:any){ show(e?.message || 'Falha ao salvar','error') }
  }

  return (
    <div>
      <h2>Avaliar Submissão</h2>
      {!sub ? (<div>Carregando...</div>) : (
        <>
          <div className="card">
            <div><b>Aluno:</b> {sub.student?.name}</div>
            <div><b>Tarefa:</b> {sub.assignment?.title}</div>
          </div>
          <div className="card" style={{marginTop:12}}>
            <h3>Rubrica</h3>
            {items.length ? items.map((it,i)=> (
              <div key={i} className="row" style={{gap:8, alignItems:'end', marginBottom:6}}>
                <div style={{flexGrow:1}}>
                  <div className="muted">{sub.assignment?.AssignmentRubric?.rubric?.criteria?.find((c:any)=>c.id===it.criterionId)?.label}</div>
                </div>
                <input className="input" type="number" placeholder="Score" value={it.score} onChange={e=>update(i,{ score: Number(e.target.value) })} />
                <input className="input" placeholder="Comentário" onChange={e=>update(i,{ comment: e.target.value })} />
              </div>
            )) : <div className="muted">Nenhuma rubrica associada a esta tarefa.</div>}
            <div className="row" style={{gap:8, marginTop:8}}>
              <input className="input" style={{flexGrow:1}} placeholder="Comentário geral (opcional)" value={comment} onChange={e=>setComment(e.target.value)} />
              <button className="button" onClick={save}>Salvar</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

