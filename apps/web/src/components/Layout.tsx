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
  const [role, setRole] = React.useState<string|undefined>(undefined)
  const [isAdmin, setIsAdmin] = React.useState<boolean>(false)
  const navigate = useNavigate()

  const applySchools = React.useCallback((list: School[]) => {
    setSchools(list)
    const current = schoolId
    const hasCurrent = current && list.some(s => s.id === current)
    const nextId = hasCurrent ? current : (list[0]?.id || '')
    if (nextId && nextId !== current) {
      setSchool(nextId)
      setSchoolId(nextId)
      window.dispatchEvent(new CustomEvent('school-change', { detail: nextId }))
    }
  }, [schoolId])

  React.useEffect(() => {
    if (!token) return
    // Tenta carregar escolas como admin; se 403, carrega escolas do usuário
    api<{ items: School[] }>(`/admin/schools?page=1&limit=50`).then((r) => {
      applySchools(r.items)
    }).catch(async () => {
      try {
        const r = await api<{ items: School[] }>(`/profile/schools`)
        applySchools(r.items)
      } catch {
        // sem escolas — mantém estado atual
      }
    })
  }, [token, applySchools])

  React.useEffect(() => {
    if (!token || !schoolId) return
    api<{ role: string|null, isAdmin: boolean }>(`/${schoolId}/profile/me`).then((r)=>{
      setRole(r.role || undefined)
      setIsAdmin(!!r.isAdmin)
    }).catch(()=>{})
  }, [token, schoolId])

  function changeSchool(id: string) {
    setSchool(id)
    setSchoolId(id)
    window.dispatchEvent(new CustomEvent('school-change', { detail: id }))
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
          {(isAdmin || role === 'DIRECTOR') && <NavLink to="/users">Usuários</NavLink>}
          {(isAdmin || role === 'DIRECTOR') && <NavLink to="/classes">Turmas</NavLink>}
          {(isAdmin || role === 'DIRECTOR') && <NavLink to="/subjects">Disciplinas</NavLink>}
          {(isAdmin || role === 'DIRECTOR') && <NavLink to="/enrollments">Matrículas</NavLink>}
          {(isAdmin || role === 'DIRECTOR') && <NavLink to="/teaching">Atribuições</NavLink>}
          {(isAdmin || role === 'TEACHER' || role === 'DIRECTOR') && <NavLink to="/assignments">Tarefas</NavLink>}
          {(isAdmin || role === 'TEACHER' || role === 'DIRECTOR') && <NavLink to="/attendance">Presenças</NavLink>}
          {(isAdmin || role === 'TEACHER' || role === 'DIRECTOR') && <NavLink to="/grades">Notas</NavLink>}
          {(isAdmin || role === 'TEACHER' || role === 'DIRECTOR') && <NavLink to="/reports/attendance">Relatório Presenças</NavLink>}
          {(isAdmin || role === 'TEACHER' || role === 'DIRECTOR') && <NavLink to="/reports/grades">Relatório Notas</NavLink>}
          {(isAdmin || role === 'DIRECTOR' || role === 'TEACHER' || role === 'STUDENT') && <NavLink to="/announcements">Avisos</NavLink>}
          {(isAdmin || role === 'DIRECTOR' || role === 'TEACHER' || role === 'STUDENT') && <NavLink to="/messages">Mensagens</NavLink>}
          {(role === 'STUDENT') && <NavLink to="/me/grades">Minhas Notas</NavLink>}
          {(role === 'STUDENT') && <NavLink to="/me/attendance">Minhas Presenças</NavLink>}
          {isAdmin && <NavLink to="/admin/schools">Admin: Escolas</NavLink>}
        </nav>
      </aside>
      <main className="content">
        <div className="topbar">
          <div className="title">Painel</div>
          <span className="muted">Escola:</span>
          <select className="select" value={schoolId} onChange={(e) => changeSchool(e.target.value)}>
            {schools.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
          <span className="muted">{isAdmin ? 'Admin' : (role || '')}</span>
          <div className="spacer"></div>
          <button className="button" onClick={doLogout}>Sair</button>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
