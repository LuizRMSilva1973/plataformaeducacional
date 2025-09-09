import React from 'react';
import { api, API_URL, getSchoolId, setSchoolId } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Link } from 'react-router-dom';

type School = { id: string; name: string }

export function Dashboard() {
  const { token, logout } = useAuth();
  const [health, setHealth] = React.useState<string>('checking...');
  const [role, setRole] = React.useState<string|undefined>(undefined)
  const [isAdmin, setIsAdmin] = React.useState<boolean>(false)
  const [schools, setSchools] = React.useState<School[]>([]);
  const [schoolId, setSchool] = React.useState<string>(getSchoolId() || '');
  const [users, setUsers] = React.useState<any[]>([]);
  const [assignments, setAssignments] = React.useState<any[]>([]);
  const [announcements, setAnnouncements] = React.useState<any[]>([]);
  const [classes, setClasses] = React.useState<any[]>([]);
  const [subjects, setSubjects] = React.useState<any[]>([]);
  const [msg, setMsg] = React.useState<string>("");

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
  }, [token]);

  React.useEffect(() => {
    if (!token || !schoolId) return;
    (async () => {
      try {
        const [u, a, an, cls, sub] = await Promise.all([
          api<{ items: any[] }>(`/${schoolId}/users?page=1&limit=10`),
          api<{ items: any[] }>(`/${schoolId}/assignments?page=1&limit=10`),
          api<{ items: any[] }>(`/${schoolId}/communications/announcements?page=1&limit=10`),
          api<{ items: any[] }>(`/${schoolId}/classes?page=1&limit=50`),
          api<{ items: any[] }>(`/${schoolId}/subjects?page=1&limit=50`),
        ]);
        setUsers(u.items); setAssignments(a.items); setAnnouncements(an.items); setClasses(cls.items); setSubjects(sub.items);
      } catch {}
    })();
  }, [token, schoolId]);

  function onChangeSchool(id: string) {
    setSchool(id); setSchoolId(id);
  }

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
    </div>
  );
}

function CreateAnnouncement({ schoolId, classes, onCreated, onError }: { schoolId: string, classes: any[], onCreated: (item: any) => void, onError: (e: any) => void }) {
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [classId, setClassId] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const item = await api<any>(`/${schoolId}/communications/announcements`, {
        method: 'POST',
        body: JSON.stringify({ title, content, classId: classId || undefined })
      });
      setTitle(''); setContent(''); setClassId('');
      onCreated(item);
    } catch (e: any) { onError(e); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} style={{ marginBottom: 12, display: 'grid', gap: 8 }}>
      <input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <textarea placeholder="Conteúdo" value={content} onChange={(e) => setContent(e.target.value)} required />
      <select value={classId} onChange={(e) => setClassId(e.target.value)}>
        <option value="">(Opcional) Turma</option>
        {classes.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <button type="submit" disabled={busy}>Criar aviso</button>
    </form>
  );
}

function CreateAssignment({ schoolId, classes, subjects, onCreated, onError }: { schoolId: string, classes: any[], subjects: any[], onCreated: (item: any) => void, onError: (e: any) => void }) {
  const [title, setTitle] = React.useState('');
  const [classId, setClassId] = React.useState('');
  const [subjectId, setSubjectId] = React.useState('');
  const [dueAt, setDueAt] = React.useState<string>('');
  const [busy, setBusy] = React.useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body: any = { title, classId, subjectId };
      if (dueAt) body.dueAt = new Date(dueAt).toISOString();
      const item = await api<any>(`/${schoolId}/assignments`, { method: 'POST', body: JSON.stringify(body) });
      setTitle(''); setClassId(''); setSubjectId(''); setDueAt('');
      onCreated(item);
    } catch (e: any) { onError(e); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} style={{ marginBottom: 12, display: 'grid', gap: 8 }}>
      <input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <select value={classId} onChange={(e) => setClassId(e.target.value)} required>
        <option value="">Selecione a turma</option>
        {classes.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
        <option value="">Selecione a disciplina</option>
        {subjects.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
      <button type="submit" disabled={busy}>Criar tarefa</button>
    </form>
  );
}
