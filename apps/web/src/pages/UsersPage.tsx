import React from 'react'
import { api } from '../lib/api'
import { downloadCSV } from '../lib/export'
import { useDebouncedValue } from '../lib/hooks'
import { getSchoolId } from '../lib/api'

export default function UsersPage() {
  const [items, setItems] = React.useState<any[]>([])
  const [q, setQ] = React.useState('')
  const [role, setRole] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [limit] = React.useState(20)
  const [creating, setCreating] = React.useState(false)
  const [cName, setCName] = React.useState('')
  const [cEmail, setCEmail] = React.useState('')
  const [cPass, setCPass] = React.useState('')
  const [cRole, setCRole] = React.useState<'DIRECTOR'|'TEACHER'|'STUDENT'>('STUDENT')
  const [error, setError] = React.useState<string>('')
  const dq = useDebouncedValue(q, 300)
  const [schoolId, setSchoolIdState] = React.useState<string>(getSchoolId() || '')

  async function load() {
    const qs = new URLSearchParams()
    qs.set('page', String(page))
    qs.set('limit', String(limit))
    if (dq) qs.set('q', dq)
    if (role) qs.set('role', role as any)
    const r = await api<{ items: any[] }>(`/${schoolId}/users?${qs.toString()}`)
    setItems(r.items)
  }
  React.useEffect(() => { if (schoolId) load().catch(()=>{}) }, [schoolId, dq, role, page, limit])
  React.useEffect(() => {
    function onChange(){ const id = getSchoolId(); if (id) setSchoolIdState(id) }
    window.addEventListener('school-change', onChange)
    return () => window.removeEventListener('school-change', onChange)
  }, [])

  function exportCSV(){
    const rows = items.map((m:any)=> ({
      id: m.id ?? m.user?.id,
      name: m.name ?? m.user?.name,
      email: m.email ?? m.user?.email,
      role: m.role
    }))
    downloadCSV('usuarios.csv', rows)
  }

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr'}}>
      <section className="card">
        <h3>Usuários</h3>
        {error && <div className="error" style={{color:'#b00020'}}>{error}</div>}
        <div className="row">
          <input className="input" placeholder="Buscar por nome/email" value={q} onChange={e=>{ setPage(1); setQ(e.target.value) }} />
          <select className="select" value={role} onChange={e=>{ setPage(1); setRole(e.target.value) }}>
            <option value="">Todos os papéis</option>
            <option value="DIRECTOR">Diretor</option>
            <option value="TEACHER">Professor</option>
            <option value="STUDENT">Aluno</option>
          </select>
          <button className="button" onClick={exportCSV}>Exportar CSV</button>
          <button className="button" onClick={()=> setCreating(v=>!v)}>{creating ? 'Cancelar' : 'Criar usuário'}</button>
        </div>
        {creating && (
          <div className="row" style={{gap:8, flexWrap:'wrap', marginTop:8}}>
            <input className="input" placeholder="Nome" value={cName} onChange={e=>setCName(e.target.value)} />
            <input className="input" placeholder="Email" value={cEmail} onChange={e=>setCEmail(e.target.value)} />
            <input className="input" placeholder="Senha" type="password" value={cPass} onChange={e=>setCPass(e.target.value)} />
            <select className="select" value={cRole} onChange={e=>setCRole(e.target.value as any)}>
              <option value="DIRECTOR">Diretor</option>
              <option value="TEACHER">Professor</option>
              <option value="STUDENT">Aluno</option>
            </select>
            <button className="button" disabled={!cName || !cEmail || !cPass} onClick={async ()=>{
              setError('')
              try {
                // 1) cria o usuário (rota de desenvolvimento)
                const u = await api<{ id: string }>(`/auth/dev-register`, {
                  method: 'POST',
                  body: JSON.stringify({ name: cName.trim(), email: cEmail.trim(), password: cPass, isAdmin: false })
                })
                // 2) vincula à escola atual com papel escolhido
                await api(`/${schoolId}/members`, {
                  method: 'POST',
                  body: JSON.stringify({ userId: u.id, role: cRole })
                })
                // 3) limpa e recarrega
                setCName(''); setCEmail(''); setCPass(''); setCRole('STUDENT'); setCreating(false)
                await load()
              } catch (e:any) {
                setError(e?.message || 'Falha ao criar usuário')
              }
            }}>Salvar</button>
          </div>
        )}
        <div className="row">
          <button className="button" onClick={()=> setPage(Math.max(1, page-1))}>Anterior</button>
          <span className="muted">Página {page}</span>
          <button className="button" onClick={()=> setPage(page+1)}>Próxima</button>
        </div>
        <ul className="list">
          {items.map((m:any)=> {
            // Backend retorna itens flatten { id, name, email, role }
            // ou, em versões antigas, { user: { id, name, email }, role }
            const id = m.id ?? m.user?.id
            const name = m.name ?? m.user?.name
            const email = m.email ?? m.user?.email
            const valueRole = m.role as 'DIRECTOR'|'TEACHER'|'STUDENT'
            return (
              <li key={id} className="row" style={{alignItems:'center', gap:8, flexWrap:'wrap'}}>
                <span style={{flex:1}}>{name} &lt;{email}&gt;</span>
                <select className="select" defaultValue={valueRole} onChange={async (e)=>{
                  const newRole = e.target.value as 'DIRECTOR'|'TEACHER'|'STUDENT'
                  try {
                    setError('')
                    await api(`/${schoolId}/members/${id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({ role: newRole })
                    })
                    await load()
                  } catch (err:any) {
                    setError(err?.message || 'Falha ao mudar papel')
                    // restaurar visualmente
                    e.currentTarget.value = valueRole
                  }
                }}>
                  <option value="DIRECTOR">Diretor</option>
                  <option value="TEACHER">Professor</option>
                  <option value="STUDENT">Aluno</option>
                </select>
                <button className="button" onClick={async ()=>{
                  if (!confirm('Remover vínculo deste usuário com a escola?')) return
                  try {
                    setError('')
                    await api(`/${schoolId}/members/${id}`, { method: 'DELETE' })
                    await load()
                  } catch (err:any) {
                    setError(err?.message || 'Falha ao remover')
                  }
                }}>Remover</button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
