import React from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const { setToken } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('admin@local');
  const [password, setPassword] = React.useState('senha');
  const [result, setResult] = React.useState<string>('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const data = await api<{ token: string }>(`/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      setResult('Login realizado');
      navigate('/');
    } catch (err: any) {
      setResult(`Erro: ${err?.message || 'login falhou'}`);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Login</h1>
      <form onSubmit={onSubmit}>
        <div>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="email" />
        </div>
        <div>
          <label>Senha</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="senha" />
        </div>
        <button type="submit">Entrar</button>
      </form>
      {result && <p style={{ marginTop: 12 }}>{result}</p>}
    </div>
  );
}
