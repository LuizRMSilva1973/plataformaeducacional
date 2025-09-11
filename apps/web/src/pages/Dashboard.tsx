import React from 'react';
import { api, API_URL, getSchoolId, setSchoolId } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Link, useNavigate } from 'react-router-dom';

type School = { id: string; name: string }

export function Dashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [health, setHealth] = React.useState<string>('checking...');
  const [role, setRole] = React.useState<string|undefined>(undefined)
  const [isAdmin, setIsAdmin] = React.useState<boolean>(false)
  const [_schools, setSchools] = React.useState<School[]>([]);
  const [schoolId, setSchool] = React.useState<string>(getSchoolId() || '');
  const [users, setUsers] = React.useState<any[]>([]);
  const [byRole, setByRole] = React.useState<Record<string, number>>({});
  const [assignments, setAssignments] = React.useState<any[]>([]);
  const [announcements, setAnnouncements] = React.useState<any[]>([]);

  React.useEffect(() => {
    api<{ ok: boolean }>('/health')
      .then((d) => setHealth(d.ok ? 'ok' : 'not ok'))
      .catch(() => setHealth('unavailable'));
  }, []);

  React.useEffect(() => {
    if (!token || !schoolId) return
    api<{ role: string|null, isAdmin: boolean }>(`/${schoolId}/profile/me`).then((r)=>{
      setRole(r.role || undefined)
      setIsAdmin(!!r.isAdmin)
      // Redirect by role: Students -> /me, Teachers -> /teacher
      if (!r.isAdmin && r.role === 'STUDENT') navigate('/me')
      if (!r.isAdmin && r.role === 'TEACHER') navigate('/teacher')
    }).catch(()=>{})
  }, [token, schoolId])

  React.useEffect(() => {
    if (!token) return;
    // Tenta listar escolas (admin). Se 403, mantém seed-school como padrão
    api<{ items: School[] }>(`/admin/schools?page=1&limit=50`).then((r) => {
      setSchools(r.items);
      if (!schoolId) {
        const id = r.items[0]?.id || 'seed-school';
        setSchool(id); setSchoolId(id);
      }
    }).catch(() => {
      if (!schoolId) { setSchool('seed-school'); setSchoolId('seed-school'); }
    });
  }, [token, schoolId]);

  React.useEffect(() => {
    if (!token || !schoolId) return;
    (async () => {
      try {
        const [u, a, an] = await Promise.all([
          api<{ items: any[] }>(`/${schoolId}/users?page=1&limit=10`),
          api<{ items: any[] }>(`/${schoolId}/assignments?page=1&limit=10`),
          api<{ items: any[] }>(`/${schoolId}/communications/announcements?page=1&limit=10`),
        ]);
        setUsers(u.items);
        setAssignments(a.items);
        setAnnouncements(an.items);
        const counts: Record<string, number> = { DIRECTOR:0, TEACHER:0, STUDENT:0 }
        u.items.forEach((m:any)=> { counts[m.role] = (counts[m.role]||0)+1 })
        setByRole(counts)
      } catch {}
    })();
  }, [token, schoolId]);

  return (
    <div className="grid">
      <section className="card">
        <h3>Status</h3>
        <div className="muted">API: {API_URL} — Health: {health}</div>
      </section>
      <section className="card">
        <h3>Resumo {isAdmin ? '· Admin' : role ? `· ${role}` : ''}</h3>
        <div className="muted">Escola: {schoolId || '—'}</div>
        <div className="muted">Usuários: {users.length} • Tarefas: {assignments.length} • Avisos: {announcements.length}</div>
      </section>
      <section className="card">
        <h3>Ações rápidas</h3>
        {isAdmin && (
          <div className="row">
            <Link className="button" to="/admin/schools">Gerir escolas</Link>
            <Link className="button" to="/users">Usuários</Link>
            <Link className="button" to="/classes">Turmas</Link>
            <Link className="button" to="/subjects">Disciplinas</Link>
          </div>
        )}
        {!isAdmin && role === 'DIRECTOR' && (
          <div className="row">
            <Link className="button" to="/users">Usuários</Link>
            <Link className="button" to="/enrollments">Matrículas</Link>
            <Link className="button" to="/teaching">Atribuições</Link>
            <Link className="button" to="/assignments">Tarefas</Link>
            <Link className="button" to="/announcements">Avisos</Link>
          </div>
        )}
        {!isAdmin && role === 'TEACHER' && (
          <div className="row">
            <Link className="button" to="/assignments">Minhas tarefas</Link>
            <Link className="button" to="/announcements">Avisos</Link>
          </div>
        )}
        {!isAdmin && role === 'STUDENT' && (
          <div className="row">
            <Link className="button" to="/announcements">Avisos</Link>
          </div>
        )}
      </section>
      <section className="card">
        <h3>Distribuição de Usuários</h3>
        {['DIRECTOR','TEACHER','STUDENT'].map((r)=>{
          const total = (byRole.DIRECTOR||0)+(byRole.TEACHER||0)+(byRole.STUDENT||0) || 1
          const pct = Math.round(((byRole[r]||0)/total)*100)
          return (
            <div key={r} style={{ marginBottom: 8 }}>
              <div className="muted" style={{ marginBottom: 4 }}>{r} — {byRole[r]||0}</div>
              <div style={{ background:'#0b1220', border:'1px solid var(--border)', borderRadius:6, overflow:'hidden' }}>
                <div style={{ width: pct+'%', height:8, background: r==='STUDENT'?'#60a5fa': r==='TEACHER'?'#22c55e':'#f59e0b' }}></div>
              </div>
            </div>
          )
        })}
      </section>
    </div>
  );
}

// Componentes de criação detalhada foram removidos por não serem utilizados
