import React from 'react'
import { api, getSchoolId } from '../lib/api'
import { useToast } from '../components/Toast'

export default function RubricsPage(){
  const schoolId = getSchoolId()
  const { show } = useToast()
  const [items, setItems] = React.useState<any[]>([])
  const [name, setName] = React.useState('')
  const [criteria, setCriteria] = React.useState<{ label: string, maxScore: number, weight?: number }[]>([{ label: '', maxScore: 10 }])
  const [attach, setAttach] = React.useState<{ assignmentId: string, rubricId: string }>({ assignmentId: '', rubricId: '' })

  async function load(){
    const r = await api<{ items:any[] }>(`/${schoolId}/rubrics`)
    setItems(r.items)
  }
  React.useEffect(()=>{ if (schoolId) load().catch(()=>{}) },[schoolId])

  function addRow(){ setCriteria(cs => [...cs, { label: '', maxScore: 10 }]) }
  function updateRow(i: number, patch: Partial<{ label: string, maxScore: number, weight?: number }>){ setCriteria(cs => cs.map((c,idx)=> idx===i? { ...c, ...patch }: c)) }
  function removeRow(i: number){ setCriteria(cs => cs.filter((_,idx)=> idx!==i)) }

  async function create(){
    try{
      const clean = criteria.filter(c=>c.label && c.maxScore>0)
      if (!name || !clean.length){ show('Preencha nome e ao menos um critério','error'); return }
      await api(`/${schoolId}/rubrics`, { method:'POST', body: JSON.stringify({ name, criteria: clean }) })
      setName(''); setCriteria([{ label:'', maxScore: 10 }])
      load(); show('Rubrica criada','success')
    }catch(e:any){ show(e?.message || 'Falha ao criar rubrica','error') }
  }

  async function attachRubric(){
    try{
      if (!attach.assignmentId || !attach.rubricId){ show('Preencha assignmentId e rubric','error'); return }
      await api(`/${schoolId}/rubrics/attach`, { method:'POST', body: JSON.stringify(attach) })
      show('Rubrica associada à tarefa','success')
    }catch(e:any){ show(e?.message || 'Falha ao associar','error') }
  }

  return (
    <div>
      <h2>Rubricas</h2>
      <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:12}}>
        <div className="card">
          <h3>Criar Rubrica</h3>
          <div className="row" style={{gap:8}}>
            <input className="input" placeholder="Nome da rubrica" value={name} onChange={e=>setName(e.target.value)} />
            <button className="button" onClick={create}>Salvar</button>
          </div>
          <div style={{marginTop:8}}>
            {criteria.map((c,i)=> (
              <div key={i} className="row" style={{gap:8, alignItems:'end'}}>
                <label style={{flexGrow:1}}>
                  <div className="muted">Critério</div>
                  <input className="input" value={c.label} onChange={e=>updateRow(i,{ label: e.target.value })} />
                </label>
                <label>
                  <div className="muted">Máx.</div>
                  <input type="number" className="input" value={c.maxScore} onChange={e=>updateRow(i,{ maxScore: Number(e.target.value) })} />
                </label>
                <label>
                  <div className="muted">Peso</div>
                  <input type="number" className="input" placeholder="1" onChange={e=>updateRow(i,{ weight: Number(e.target.value) })} />
                </label>
                <button className="button" onClick={()=>removeRow(i)}>Remover</button>
              </div>
            ))}
            <button className="button" onClick={addRow} style={{marginTop:8}}>Adicionar critério</button>
          </div>
        </div>
        <div className="card">
          <h3>Associar Rubrica à Tarefa</h3>
          <div className="row" style={{gap:8, alignItems:'end'}}>
            <label>
              <div className="muted">Rubrica</div>
              <select className="select" value={attach.rubricId} onChange={e=>setAttach(a=>({ ...a, rubricId: e.target.value }))}>
                <option value="">Selecione</option>
                {items.map(r=> <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
            <label style={{flexGrow:1}}>
              <div className="muted">Assignment ID</div>
              <input className="input" placeholder="ID da tarefa" value={attach.assignmentId} onChange={e=>setAttach(a=>({ ...a, assignmentId: e.target.value }))} />
            </label>
            <button className="button" onClick={attachRubric}>Associar</button>
          </div>
        </div>
      </div>
      <div className="card" style={{marginTop:12}}>
        <h3>Minhas Rubricas</h3>
        <ul className="list">
          {items.map(r => (
            <li key={r.id}><b>{r.name}</b> — {r.criteria.map((c:any)=>`${c.label}(${c.maxScore})`).join(', ')}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

