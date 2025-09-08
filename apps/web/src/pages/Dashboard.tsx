import React from 'react';
import { api, API_URL, getSchoolId, setSchoolId } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Link } from 'react-router-dom';

type School = { id: string; name: string }

export function Dashboard() {
  const { token, logout } = useAuth();
  const [health, setHealth] = React.useState<string>('checking...');
  const [schools, setSchools] = React.useState<School[]>([]);
  const [schoolId, setSchool] = React.useState<string>(getSchoolId() || '');
  const [users, setUsers] = React.useState<any[]>([]);
  const [assignments, setAssignments] = React.useState<any[]>([]);
  const [announcements, setAnnouncements] = React.useState<any[]>([]);

  React.useEffect(() => {
    api<{ ok: boolean }>('/health')
      .then((d) => setHealth(d.ok ? 'ok' : 'not ok'))
      .catch(() => setHealth('unavailable'));
  }, []);

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
  }, [token]);

  React.useEffect(() => {
    if (!token || !schoolId) return;
    (async () => {
      try {
        const [u, a, an] = await Promise.all([
          api<{ items: any[] }>(`/${schoolId}/users?page=1&limit=10`),
          api<{ items: any[] }>(`/${schoolId}/assignments?page=1&limit=10`),
          api<{ items: any[] }>(`/${schoolId}/communications/announcements?page=1&limit=10`),
        ]);
        setUsers(u.items); setAssignments(a.items); setAnnouncements(an.items);
      } catch {}
    })();
  }, [token, schoolId]);

  function onChangeSchool(id: string) {
    setSchool(id); setSchoolId(id);
  }

  return (
    <div style={{ padding: 24 }}>
      <header style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Painel</h1>
        <span style={{ color: '#666' }}>API: {API_URL} — Health: {health}</span>
        <span style={{ flex: 1 }} />
        {!token ? (
          <Link to="/login">Login</Link>
        ) : (
          <button onClick={logout}>Sair</button>
        )}
      </header>

      <div style={{ marginBottom: 16 }}>
        <label>Escola: </label>
        <select value={schoolId} onChange={(e) => onChangeSchool(e.target.value)}>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
          {!schools.find(s => s.id === 'seed-school') && <option value="seed-school">Seed School</option>}
        </select>
      </div>

      {!token && (
        <p>Você não está autenticado. <Link to="/login">Faça login</Link>.</p>
      )}

      {token && schoolId && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <section>
            <h3>Usuários</h3>
            <ul>
              {users.map((u) => (
                <li key={u.user.id}>{u.user.name} &lt;{u.user.email}&gt; — {u.role}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3>Tarefas</h3>
            <ul>
              {assignments.map((a) => (
                <li key={a.id}>{a.title} {a.dueAt ? `(até ${new Date(a.dueAt).toLocaleDateString()})` : ''}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3>Avisos</h3>
            <ul>
              {announcements.map((an) => (
                <li key={an.id}><strong>{an.title}</strong></li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
