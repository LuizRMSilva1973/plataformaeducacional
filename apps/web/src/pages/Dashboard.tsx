import React from 'react';
import { api, API_URL } from '../lib/api';

export function Dashboard() {
  const [health, setHealth] = React.useState<string>('checking...');
  React.useEffect(() => {
    api<{ ok: boolean }>('/health')
      .then((d) => setHealth(d.ok ? 'ok' : 'not ok'))
      .catch(() => setHealth('unavailable'));
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Painel</h1>
      <p>Esqueleto da plataforma educacional.</p>
      <p>API: {API_URL} — Health: {health}</p>
    </div>
  );
}
