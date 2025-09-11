import React from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';

export function Login() {
  const { token, setToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location.state?.from || '/';
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState<string>('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const data = await api<{ token: string }>(`/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      navigate(from, { replace: true });
    } catch (err: any) {
      setErrorMsg(`Erro: ${err?.message || 'login falhou'}`);
    }
  }

  if (token) return <Navigate to={from} replace />

  return (
    <div style={{ display:'grid', placeItems:'center', height:'100vh' }}>
      <form onSubmit={onSubmit} className="card" style={{ width: 360 }}>
        <h2 style={{ marginTop: 0, marginBottom: 12 }}>Login</h2>
        <div className="form">
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} type="text" placeholder="Email" />
          <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Senha" />
          <button className="button primary" type="submit">Entrar</button>
          {errorMsg && <span className="muted">{errorMsg}</span>}
          {!errorMsg && (
            <div className="muted" style={{ marginTop: 8, lineHeight: 1.3 }}>
              Exemplos (dev):<br/>
              • admin@local / senha<br/>
              • diretor@local / secret<br/>
              • professor@local / secret<br/>
              • aluno@local / secret
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
