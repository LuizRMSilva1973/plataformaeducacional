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
  const [theme, setTheme] = React.useState<string>(() => localStorage.getItem('theme') || 'dark')

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

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  function changeSchool(id: string) {
    setSchool(id)
    setSchoolId(id)
    window.dispatchEvent(new CustomEvent('school-change', { detail: id }))
  }

  function doLogout() {
    logout()
    navigate('/login')
  }

  function toggleTheme(){
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  function Icon({ name }: { name: string }){
    const common = { width:16, height:16, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round' } as any
    switch(name){
      case 'dashboard': return <svg {...common}><path d="M3 13h8V3H3v10z"/><path d="M13 21h8V3h-8v18z"/></svg>
      case 'users': return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
      case 'classes': return <svg {...common}><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>
      case 'subjects': return <svg {...common}><path d="M4 19.5V4.5A2.5 2.5 0 0 1 6.5 2H14l6 6v11.5A2.5 2.5 0 0 1 17.5 22h-11A2.5 2.5 0 0 1 4 19.5z"/></svg>
      case 'enroll': return <svg {...common}><path d="M20 21v-2a4 4 0 0 0-3-3.87"/><path d="M4 21v-2a4 4 0 0 1 3-3.87"/><circle cx="12" cy="7" r="4"/></svg>
      case 'teaching': return <svg {...common}><path d="M22 2H2v16h20V2z"/><path d="M7 22l5-5 5 5"/></svg>
      case 'assign': return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>
      case 'announce': return <svg {...common}><path d="M3 11l19-7-7 19-2-7-7-5z"/></svg>
      case 'messages': return <svg {...common}><path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z"/></svg>
      case 'attendance': return <svg {...common}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5l-4 4V5a2 2 0 0 1 2-2h11"/></svg>
      case 'grades': return <svg {...common}><path d="M3 3h18v4H3z"/><path d="M7 7v14l5-3 5 3V7"/></svg>
      case 'report': return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 12h10M7 8h10M7 16h6"/></svg>
      case 'school': return <svg {...common}><path d="M4 10l8-6 8 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M12 22V12"/></svg>
      case 'lesson': return <svg {...common}><path d="M4 19.5V4.5A2.5 2.5 0 0 1 6.5 2H14l6 6v11.5A2.5 2.5 0 0 1 17.5 22h-11A2.5 2.5 0 0 1 4 19.5z"/><path d="M12 18h5"/></svg>
      default: return null
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">Plataforma Edu</div>
        <nav className="nav">
          <NavLink to="/" end><span style={{display:'inline-flex',alignItems:'center',gap:8}}><Icon name="dashboard"/>Dashboard</span></NavLink>
          {(isAdmin || role === 'DIRECTOR') && <NavLink to="/users"><span style={{display:'inline-flex',alignItems:'center',gap:8}}><Icon name="users"/>Usuários</span></NavLink>}
          {(isAdmin || role === 'DIRECTOR') && <NavLink to="/classes"><span style={{display:'inline-flex',alignItems:'center',gap:8}}><Icon name="classes"/>Turmas</span></NavLink>}
          {(isAdmin || role === 'DIRECTOR') && <NavLink to="/subjects"><span style={{display:'inline-flex',alignItems:'center',gap:8}}><Icon name="subjects"/>Disciplinas</span></NavLink>}
          {(isAdmin || role === 'DIRECTOR') && <NavLink to="/enrollments"><span style={{display:'inline-flex',alignItems:'center',gap:8}}><Icon name="enroll"/>Matrículas</span></NavLink>}
          {(isAdmin || role === 'DIRECTOR') && <NavLink to="/teaching"><span style={{display:'inline-flex',alignItems:'center',gap:8}}><Icon name="teaching"/>Atribuições</span></NavLink>}
          {(isAdmin || role === 'TEACHER' || role === 'DIRECTOR') && <NavLink to="/assignments"><span style={{display:'inline-flex',alignItems:'center',gap:8}}><Icon name="assign"/>Tarefas</span></NavLink>}
          {(isAdmin || role === 'TEACHER' || role === 'DIRECTOR') && <NavLink to="/attendance"><span style={{display:'inline-flex',alignItems:'center',gap:8}}><Icon name="attendance"/>Presenças</span></NavLink>}
          {(isAdmin || role === 'TEACHER' || role === 'DIRECTOR') && <NavLink to="/grades"><span style={{display:'inline-flex',alignItems:'center',gap:8}}><Icon name="grades"/>Notas</span></NavLink>}
          {(isAdmin || role === 'TEACHER' || role === 'DIRECTOR') && <NavLink to="/reports/attendance"><span style={{display:'inline-flex',alignItems:'center',gap:8}}><Icon name="report"/>Relatório Presenças</span></NavLink>}
          {(isAdmin || role === 'TEACHER' || role === 'DIRECTOR') && <NavLink to="/reports/grades"><span style={{display:'inline-flex',alignItems:'center',gap:8}}><Icon name="report"/>Relatório Notas</span></NavLink>}
          {(isAdmin || role === 'DIRECTOR' || role === 'TEACHER' || role === 'STUDENT') && <NavLink to="/announcements"><span style={{display:'inline-flex',alignItems:'center',gap:8}}><Icon name="announce"/>Avisos</span></NavLink>}
          {(isAdmin || role === 'DIRECTOR' || role === 'TEACHER' || role === 'STUDENT') && <NavLink to="/lessons"><span style={{display:'inline-flex',alignItems:'center',gap:8}}><Icon name="lesson"/>Conteúdos</span></NavLink>}
          {(isAdmin || role === 'DIRECTOR' || role === 'TEACHER' || role === 'STUDENT') && <NavLink to="/messages"><span style={{display:'inline-flex',alignItems:'center',gap:8}}><Icon name="messages"/>Mensagens</span></NavLink>}
          {(role === 'STUDENT') && <NavLink to="/me/grades"><span style={{display:'inline-flex',alignItems:'center',gap:8}}><Icon name="grades"/>Minhas Notas</span></NavLink>}
          {(role === 'STUDENT') && <NavLink to="/me/attendance"><span style={{display:'inline-flex',alignItems:'center',gap:8}}><Icon name="attendance"/>Minhas Presenças</span></NavLink>}
          {isAdmin && <NavLink to="/admin/schools"><span style={{display:'inline-flex',alignItems:'center',gap:8}}><Icon name="school"/>Admin: Escolas</span></NavLink>}
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
          <button className="button" onClick={toggleTheme} title="Alternar tema">{theme==='dark'?'🌙':'☀️'}</button>
          <button className="button" onClick={doLogout}>Sair</button>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
