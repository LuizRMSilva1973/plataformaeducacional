import React from 'react'
import { api, getSchoolId } from '../lib/api'
import { downloadCSV } from '../lib/export'
import { useToast } from '../components/Toast'

export default function EnrollmentsPage() {
  const { show } = useToast()
  const schoolId = getSchoolId() || 'seed-school'
  const [items, setItems] = React.useState<any[]>([])
  const [classes, setClasses] = React.useState<any[]>([])
  const [students, setStudents] = React.useState<any[]>([])
  const [classId, setClassId] = React.useState('')
  const [studentUserId, setStudentUserId] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const canSubmit = !!classId && !!studentUserId && !busy

  async function load() {
    const [en, cls, us] = await Promise.all([
      api<{ items:any[] }>(`/${schoolId}/enrollments?page=1&limit=100`),
      api<{ items:any[] }>(`/${schoolId}/classes?page=1&limit=100`),
      api<{ items:any[] }>(`/${schoolId}/users?page=1&limit=200&role=STUDENT`),
    ])
    setItems(en.items)
    setClasses(cls.items)
    // usuários no formato flatten: { id,name,email,role }
    setStudents(us.items.map((m:any)=> ({ id: m.id ?? m.user?.id, name: m.name ?? m.user?.name, email: m.email ?? m.user?.email })))
  }
  React.useEffect(()=>{ load().catch(()=>{}) },[schoolId])

  function exportCSV(){
    const rows = items.map((i:any)=> ({ id: i.id, class: i.class?.name, student: i.student?.name, email: i.student?.email }))
    downloadCSV('matriculas.csv', rows)
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!classId || !studentUserId) return
    setBusy(true)
    try {
      const item = await api<any>(`/${schoolId}/enrollments`, { method:'POST', body: JSON.stringify({ classId, studentUserId }) })
      setItems([item, ...items])
      setClassId(''); setStudentUserId('')
      show('Matrícula criada', 'success')
    } catch(e:any){ show(e?.message||'Erro ao matricular','error') } finally { setBusy(false) }
  }

  // Removal moved to item-level component with modal confirm

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr'}}>
      <section className="card">
        <h3>Matrículas</h3>
        <div className="row">
          <button className="button" onClick={exportCSV}>Exportar CSV</button>
        </div>
        <form className="form" onSubmit={create}>
          <div className="row">
            <select className="select" value={classId} onChange={e=>setClassId(e.target.value)} required>
              <option value="">Turma</option>
              {classes.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="select" value={studentUserId} onChange={e=>setStudentUserId(e.target.value)} required>
              <option value="">Aluno</option>
              {students.length === 0 ? (
                <option value="" disabled>Nenhum aluno disponível — crie em Usuários</option>
              ) : (
                students.map((s:any)=> <option key={s.id} value={s.id}>{s.name} &lt;{s.email}&gt;</option>)
              )}
            </select>
            <button className="button primary" disabled={!canSubmit}>{busy ? 'Matriculando...' : 'Matricular'}</button>
          </div>
          {(classes.length === 0) && (
            <div className="muted">Nenhuma turma encontrada. Crie uma em “Turmas”.</div>
          )}
          {(students.length === 0) && (
            <div className="muted">Nenhum aluno listado. Vá em “Usuários” para criar e vinculá-lo com papel Aluno.</div>
          )}
        </form>
        <ul className="list">
          {items.map((i:any)=> (
            <EnrollmentItem key={i.id} item={i} classes={classes} students={students}
              onRemoved={(id)=>setItems(items.filter(x=>x.id!==id))}
              onUpdated={(u)=>setItems(items.map(x=>x.id===u.id?u:x))} />
          ))}
        </ul>
      </section>
    </div>
  )
}

function EnrollmentItem({ item, classes, students, onRemoved, onUpdated }: { item:any, classes:any[], students:any[], onRemoved:(id:string)=>void, onUpdated:(u:any)=>void }){
  const { show } = useToast()
  const [edit, setEdit] = React.useState(false)
  const [classId, setClassId] = React.useState(item.classId)
  const [studentUserId, setStudentUserId] = React.useState(item.studentUserId)
  async function save(){
    const schoolId = getSchoolId() || 'seed-school'
    const u = await api<any>(`/${schoolId}/enrollments/${item.id}`, { method:'PATCH', body: JSON.stringify({ classId, studentUserId }) })
    onUpdated(u); setEdit(false); show('Matrícula atualizada','success')
  }
  async function del(){
    if(!confirm('Remover matrícula?')) return
    const schoolId = getSchoolId() || 'seed-school'
    await api<void>(`/${schoolId}/enrollments/${item.id}`, { method:'DELETE' })
    onRemoved(item.id); show('Matrícula removida','success')
  }
  return (
    <li>
      {!edit ? (
        <>
          {item.student?.name} &lt;{item.student?.email}&gt; • {item.class?.name}
          <span style={{ float:'right', display:'flex', gap:8 }}>
            <button className="button" onClick={()=>setEdit(true)}>Editar</button>
            <button className="button" onClick={del}>Remover</button>
          </span>
        </>
      ) : (
        <div className="row">
          <select className="select" value={studentUserId} onChange={e=>setStudentUserId(e.target.value)}>
            {students.map((s:any)=> <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="select" value={classId} onChange={e=>setClassId(e.target.value)}>
            {classes.map((c:any)=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="button primary" onClick={save}>Salvar</button>
          <button className="button" onClick={()=>setEdit(false)}>Cancelar</button>
        </div>
      )}
    </li>
  )
}
