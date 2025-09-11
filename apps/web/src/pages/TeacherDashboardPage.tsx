import React from 'react'
import { api, getSchoolId } from '../lib/api'

export default function TeacherDashboardPage(){
  const schoolId = getSchoolId()
  const [data, setData] = React.useState<any>(null)

  React.useEffect(()=>{
    if (!schoolId) return
    api(`/${schoolId}/profile/teacher/overview`).then(setData).catch(()=>{})
  },[schoolId])

  function money(cents: number){ return `R$ ${(cents/100).toLocaleString('pt-BR',{minimumFractionDigits:2})}` }

  return (
    <div>
      <h2>Painel do Professor</h2>
      <div className="grid" style={{gridTemplateColumns:'repeat(3, 1fr)', gap:8}}>
        <Card title="Minhas Turmas/Disciplinas" value={`${data?.classes?.length||0}`} />
        <Card title="Entregas pendentes de correção" value={`${data?.pendingUngraded||0}`} />
        <Card title="Próximas tarefas" value={`${data?.upcomingAssignments?.length||0}`} />
      </div>

      <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12}}>
        <div className="card">
          <h3>Correção Rápida</h3>
          <p className="muted">Últimas 5 entregas sem nota</p>
          <QuickGradeList items={data?.recentUngraded||[]} onGraded={()=>{ api(`/${schoolId}/profile/teacher/overview`).then(setData).catch(()=>{}) }} />
        </div>
        <div className="card">
          <h3>Próximas Tarefas</h3>
          <ul className="list">
            {(data?.upcomingAssignments||[]).map((a:any)=>(
              <li key={a.id}>{a.title} — {a.dueAt ? new Date(a.dueAt).toLocaleDateString() : 'sem prazo'}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card" style={{marginTop:12}}>
        <h3>Minhas Turmas e Disciplinas</h3>
        <ul className="list">
          {(data?.classes||[]).map((t:any, idx:number)=>(
            <li key={idx}>{t.class?.name} — {t.subject?.name}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Card({ title, value }: { title: string, value: string }){
  return (
    <div className="card">
      <div className="muted">{title}</div>
      <div style={{fontWeight:700, fontSize:22}}>{value}</div>
    </div>
  )
}

function QuickGradeList({ items, onGraded }: { items:any[], onGraded: ()=>void }){
  const schoolId = getSchoolId()
  return (
    <ul className="list">
      {items.map((s:any)=> <QuickGradeItem key={s.id} s={s} onGraded={onGraded} schoolId={schoolId!} />)}
      {!items.length && <li className="muted">Sem pendências</li>}
    </ul>
  )
}

function QuickGradeItem({ s, schoolId, onGraded }: { s:any, schoolId: string, onGraded: ()=>void }){
  const [val, setVal] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  async function grade(){
    try{
      setBusy(true)
      const v = Math.max(0, Math.min(10, Number(val)))
      if (isNaN(v)) return
      // Precisa de classId e subjectId do assignment
      const ass = s.assignment
      await api(`/${schoolId}/grades`, { method:'POST', body: JSON.stringify({ studentUserId: s.studentUserId, classId: ass.classId, subjectId: ass.subjectId, assignmentId: ass.id, value: v }) })
      onGraded()
    } finally { setBusy(false) }
  }
  return (
    <li>
      <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center'}}>
        <div>
          <div><b>{s.student?.name}</b> — {s.assignment?.title}</div>
          <div className="muted" style={{fontSize:12}}>Enviado em {new Date(s.submittedAt).toLocaleString()}</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input className="input" style={{width:80}} placeholder="Nota" value={val} onChange={e=>setVal(e.target.value)} />
          <button className={`button${busy?' loading':''}`} onClick={grade}>Lançar</button>
        </div>
      </div>
    </li>
  )
}

