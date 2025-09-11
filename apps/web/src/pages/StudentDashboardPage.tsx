import React from 'react'
import { api, getSchoolId } from '../lib/api'

export default function StudentDashboardPage(){
  const schoolId = getSchoolId()
  const [me, setMe] = React.useState<any>(null)
  const [pending, setPending] = React.useState<any[]>([])
  const [recentFeedback, setRecentFeedback] = React.useState<any|null>(null)
  const [lessons, setLessons] = React.useState<any[]>([])
  const [pendingBuckets, setPendingBuckets] = React.useState<{ label:string, count:number }[]>([])

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
      // Buckets: <=7 dias, 8-14, >14, sem prazo
      const buckets = { 'Até 7 dias':0, '8-14 dias':0, '15+ dias':0, 'Sem prazo':0 } as Record<string, number>
      ass.forEach((a:any)=>{
        if (submitted.has(a.id)) return
        if (!a.dueAt) { buckets['Sem prazo']++; return }
        const diff = Math.ceil((new Date(a.dueAt).getTime() - now)/86400000)
        if (diff <= 7) buckets['Até 7 dias']++
        else if (diff <= 14) buckets['8-14 dias']++
        else buckets['15+ dias']++
      })
      setPendingBuckets(Object.entries(buckets).map(([label,count])=>({ label, count })))
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
      <div className="card" style={{marginTop:12}}>
        <h3>Tarefas Pendentes por Prazo</h3>
        <BarChart data={pendingBuckets.map(b=>({ x: b.label, y: b.count }))} title="Pendências" color="#f59e0b" />
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

function BarChart({ data, title, color }: { data: { x: string, y: number }[], title: string, color: string }){
  const max = Math.max(1, ...data.map(d=>d.y))
  return (
    <div>
      <div className="muted">{title}</div>
      <div>
        {data.map((d,i)=> (
          <div key={i} style={{display:'flex', alignItems:'center', gap:8, marginTop:4}}>
            <div className="muted" style={{width:120}}>{d.x}</div>
            <div style={{background:'#e5e7eb', height:10, borderRadius:4, flexGrow:1}}>
              <div style={{width:`${(d.y/max)*100}%`, height:10, background: color}} title={String(d.y)}></div>
            </div>
            <div style={{width:30, textAlign:'right'}}>{d.y}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
