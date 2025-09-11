import React from 'react'
import { api, getSchoolId } from '../lib/api'

export default function StudentDashboardPage(){
  const schoolId = getSchoolId()
  const [me, setMe] = React.useState<any>(null)
  const [pending, setPending] = React.useState<any[]>([])
  const [recentFeedback, setRecentFeedback] = React.useState<any|null>(null)
  const [lessons, setLessons] = React.useState<any[]>([])

  React.useEffect(()=>{
    if (!schoolId) return
    ;(async ()=>{
      const prof = await api<any>(`/${schoolId}/profile/me`)
      setMe(prof)
      // Enrollments -> classes
      const enr = await api<{ items:any[] }>(`/${schoolId}/enrollments?studentUserId=${prof.user?.id}&limit=200`).catch(()=>({ items: [] } as any))
      const classIds = Array.from(new Set(enr.items.map((e:any)=>e.classId)))
      // Assignments and submissions
      const [ass, subs] = await Promise.all([
        Promise.all(classIds.map(cid=> api<{ items:any[] }>(`/${schoolId}/assignments?classId=${cid}&limit=200`))).then(arr=>arr.flatMap(a=>a.items)),
        api<{ items:any[] }>(`/${schoolId}/submissions?studentUserId=${prof.user?.id}&limit=500`).then(r=>r.items)
      ])
      const submitted = new Set(subs.map((s:any)=>s.assignmentId))
      const now = Date.now()
      setPending(ass.filter((a:any)=> !submitted.has(a.id) && (!a.dueAt || new Date(a.dueAt).getTime() > now)).slice(0,5))
      // Recent feedback: find submissions with feedback
      const withFb = await Promise.all(subs.slice(0,50).map(async (s:any)=> api<any>(`/${schoolId}/submissions/${s.id}`).catch(()=>null)))
      const latest = withFb.filter(Boolean).find((s:any)=> !!s?.SubmissionFeedback)
      setRecentFeedback(latest || null)
      // Lessons: latest lessons for enrolled classes
      const lessonCalls = classIds.map(cid=> api<{ items:any[] }>(`/${schoolId}/lessons?classId=${cid}&limit=5`).catch(()=>({ items: [] } as any)))
      const ll = (await Promise.all(lessonCalls)).flatMap(x=>x.items).slice(0,5)
      setLessons(ll)
    })().catch(()=>{})
  },[schoolId])

  return (
    <div>
      <h2>Meu Painel</h2>
      <div className="grid" style={{gridTemplateColumns:'repeat(3, 1fr)', gap:8}}>
        <Card title="Tarefas pendentes" value={`${pending.length}`} />
        <Card title="Último feedback" value={recentFeedback ? new Date(recentFeedback.SubmissionFeedback?.createdAt || recentFeedback.submittedAt).toLocaleDateString() : '—'} />
        <Card title="Aulas recentes" value={`${lessons.length}`} />
      </div>
      <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12}}>
        <div className="card">
          <h3>Próximas Tarefas</h3>
          <ul className="list">
            {pending.map(a=>(<li key={a.id}>{a.title} {a.dueAt?`— até ${new Date(a.dueAt).toLocaleDateString()}`:''}</li>))}
            {!pending.length && <li className="muted">Sem pendências imediatas.</li>}
          </ul>
        </div>
        <div className="card">
          <h3>Aulas Recentes</h3>
          <ul className="list">
            {lessons.map(l=>(<li key={l.id}>{l.title} — {new Date(l.createdAt).toLocaleDateString()}</li>))}
            {!lessons.length && <li className="muted">Sem novidades.</li>}
          </ul>
        </div>
      </div>
      <div className="card" style={{marginTop:12}}>
        <h3>Último Feedback</h3>
        {!recentFeedback ? (<div className="muted">Nenhum feedback recente.</div>) : (
          <>
            <div><b>Tarefa:</b> {recentFeedback.assignment?.title || recentFeedback.assignmentId}</div>
            {recentFeedback.SubmissionFeedback?.items?.length ? (
              <ul className="list" style={{marginTop:8}}>
                {recentFeedback.SubmissionFeedback.items.map((it:any)=> <li key={it.id}><b>{it.criterion?.label}:</b> {it.score} {it.comment?`— ${it.comment}`:''}</li>)}
              </ul>
            ) : null}
            {recentFeedback.SubmissionFeedback?.comment && <div className="muted" style={{marginTop:8}}>{recentFeedback.SubmissionFeedback.comment}</div>}
            <div style={{marginTop:8}}><a className="button" href={`/me/submissions/${recentFeedback.id}`}>Ver entrega</a></div>
          </>
        )}
      </div>
    </div>
  )
}

function Card({ title, value }: { title:string, value:string }){
  return (
    <div className="card">
      <div className="muted">{title}</div>
      <div style={{fontWeight:700,fontSize:22}}>{value}</div>
    </div>
  )
}

