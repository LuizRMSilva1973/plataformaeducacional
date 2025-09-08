import React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { getSchoolId, setSchoolId } from '../lib/api'

type School = { id: string; name: string }

export function Layout() {
  const { token, logout } = useAuth()
  const [schools, setSchools] = React.useState<School[]>([])
  const [schoolId, setSchool] = React.useState(getSchoolId() || '')
  const navigate = useNavigate()

  React.useEffect(() => {
    if (!token) return
    api<{ items: School[] }>(`/admin/schools?page=1&limit=50`).then((r) => {
      setSchools(r.items)
      if (!schoolId) {
        const id = r.items[0]?.id || 'seed-school'
        setSchool(id)
        setSchoolId(id)
      }
    }).catch(() => {
      if (!schoolId) {
        setSchool('seed-school')
        setSchoolId('seed-school')
      }
    })
  }, [token])

  function changeSchool(id: string) {
    setSchool(id)
    setSchoolId(id)
  }

  function doLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">Plataforma Edu</div>
        <nav className="nav">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/users">Usuários</NavLink>
          <NavLink to="/classes">Turmas</NavLink>
          <NavLink to="/subjects">Disciplinas</NavLink>
          <NavLink to="/assignments">Tarefas</NavLink>
          <NavLink to="/announcements">Avisos</NavLink>
        </nav>
      </aside>
      <main className="content">
        <div className="topbar">
          <div className="title">Painel</div>
          <span className="muted">Escola:</span>
          <select className="select" value={schoolId} onChange={(e) => changeSchool(e.target.value)}>
            {schools.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            {!schools.find(s=>s.id==='seed-school') && (<option value="seed-school">Seed School</option>)}
          </select>
          <div className="spacer"></div>
          <button className="button" onClick={doLogout}>Sair</button>
        </div>
        <Outlet />
      </main>
    </div>
  )
}

