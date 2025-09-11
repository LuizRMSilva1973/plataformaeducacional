import React from 'react'
import { api } from '../lib/api'
import { useToast } from '../components/Toast'
import { getSchoolId } from '../lib/api'

export default function SubjectsPage() {
  const { show } = useToast()
  const [items, setItems] = React.useState<any[]>([])
  const [name, setName] = React.useState('')
  const [msg, setMsg] = React.useState('')
  const [schoolId, setSchoolIdState] = React.useState<string>(getSchoolId() || '')
  const [busy, setBusy] = React.useState(false)

  const load = React.useCallback(async () => {
    const r = await api<{ items: any[] }>(`/${schoolId}/subjects?page=1&limit=50`)
    setItems(r.items)
  }, [schoolId])
  React.useEffect(()=>{ if (schoolId) load().catch(()=>{}) },[schoolId, load])
  React.useEffect(()=>{
    // Scroll to subject if hash present
    const hash = location.hash
    if (hash && hash.startsWith('#subject-')){
      const el = document.querySelector(hash)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  },[])
  React.useEffect(()=>{
    function onChange(){ const id = getSchoolId(); if (id) setSchoolIdState(id) }
    window.addEventListener('school-change', onChange)
    return ()=> window.removeEventListener('school-change', onChange)
  },[])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    try {
      setBusy(true)
      const s = await api<any>(`/${schoolId}/subjects`, { method:'POST', body: JSON.stringify({ name }) })
      setItems([s, ...items])
      setName('')
      setMsg('')
      show('Disciplina criada','success')
    } catch(e:any) { setMsg(e?.message||'Erro'); show('Erro ao criar disciplina','error') } finally { setBusy(false) }
  }

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr'}}>
      <section className="card">
        <h3>Disciplinas</h3>
        <form className="form" onSubmit={create}>
          <div className="row">
            <input className="input" placeholder="Nome" value={name} onChange={e=>setName(e.target.value)} required />
            <button className={`button primary${busy?' loading':''}`} disabled={busy} type="submit">Criar</button>
          </div>
          {msg && <span className="muted">{msg}</span>}
        </form>
        <ul className="list">
          {items.map((s:any)=> <SubjectItem key={s.id} item={s} onDeleted={(id)=>setItems(items.filter((x:any)=>x.id!==id))} onUpdated={(u)=>setItems(items.map((it:any)=> it.id===u.id?u:it))} />)}
        </ul>
      </section>
    </div>
  )
}

function SubjectItem({ item, onDeleted, onUpdated }: { item:any, onDeleted:(id:string)=>void, onUpdated:(u:any)=>void }){
  const { show } = useToast()
  const [edit, setEdit] = React.useState(false)
  const [name, setName] = React.useState(item.name)
  async function save(){
    const schoolId = getSchoolId() || 'seed-school'
    const btn = document.activeElement as HTMLButtonElement | null
    try { if (btn) btn.classList.add('loading')
      const u = await api<any>(`/${schoolId}/subjects/${item.id}`, { method:'PATCH', body: JSON.stringify({ name }) })
      onUpdated(u); setEdit(false); show('Disciplina atualizada','success')
    } finally { if (btn) btn?.classList.remove('loading') }
  }
  async function del(){
    if(!confirm('Excluir disciplina?')) return
    const schoolId = getSchoolId() || 'seed-school'
    const btn = document.activeElement as HTMLButtonElement | null
    try { if (btn) btn.classList.add('loading')
      await api<void>(`/${schoolId}/subjects/${item.id}`, { method:'DELETE' })
      onDeleted(item.id); show('Disciplina excluída','success')
    } finally { if (btn) btn?.classList.remove('loading') }
  }
  return (
    <li id={`subject-${item.id}`}>
      {!edit ? (
        <>
          {item.name}
          <span style={{ float:'right', display:'flex', gap:8 }}>
            <button className="button" onClick={()=>setEdit(true)}>Editar</button>
            <button className="button" onClick={del}>Excluir</button>
          </span>
        </>
      ) : (
        <div className="row">
          <input className="input" value={name} onChange={e=>setName(e.target.value)} />
          <button className="button primary" onClick={save}>Salvar</button>
          <button className="button" onClick={()=>setEdit(false)}>Cancelar</button>
        </div>
      )}
    </li>
  )
}
