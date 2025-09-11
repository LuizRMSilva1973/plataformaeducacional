import React from 'react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';

export default function AdminBillingPage(){
  const { show } = useToast()
  const [loading, setLoading] = React.useState(true)
  const [config, setConfig] = React.useState<{ platformFeePercent: number, defaultPaymentProvider?: string }|null>(null)
  const [overview, setOverview] = React.useState<{ gmv:number, platformRevenue:number, schoolsRevenue:number }|null>(null)

  React.useEffect(()=>{
    (async ()=>{
      try{
        const cfg = await api<{ platformFeePercent:number }>(`/admin/billing/config`)
        setConfig(cfg)
        const ov = await api<{ gmv:number, platformRevenue:number, schoolsRevenue:number }>(`/admin/billing/overview`)
        setOverview(ov)
      }catch(e:any){ show(e?.message || 'Falha ao carregar', 'error') }
      finally{ setLoading(false) }
    })()
  },[])

  async function save(e: React.FormEvent){
    e.preventDefault()
    try{
      const data = new FormData(e.target as HTMLFormElement)
      const platformFeePercent = Number(data.get('platformFeePercent')||0)
      const defaultPaymentProvider = String(data.get('defaultPaymentProvider')||'MANUAL')
      const r = await api(`/admin/billing/config`, { method:'PUT', body: JSON.stringify({ platformFeePercent, defaultPaymentProvider }) })
      setConfig(r as any)
      show('Configuração salva','success')
    }catch(e:any){ show(e?.message || 'Falha ao salvar','error') }
  }

  function money(cents?: number){ return (cents||0)/100 }

  if (loading) return <div>Carregando...</div>

  return (
    <div>
      <h2>Admin — Cobranças</h2>
      <div className="grid" style={{gridTemplateColumns:'repeat(3, 1fr)', gap:16}}>
        <StatCard title="GMV (Bruto)" value={`R$ ${money(overview?.gmv).toLocaleString('pt-BR',{minimumFractionDigits:2})}`} />
        <StatCard title="Receita da Plataforma" value={`R$ ${money(overview?.platformRevenue).toLocaleString('pt-BR',{minimumFractionDigits:2})}`} />
        <StatCard title="Receita das Escolas" value={`R$ ${money(overview?.schoolsRevenue).toLocaleString('pt-BR',{minimumFractionDigits:2})}`} />
      </div>

      <div className="card" style={{marginTop:16}}>
        <h3>Percentual da Plataforma</h3>
        <form onSubmit={save} className="row" style={{gap:8, alignItems:'end'}}>
          <label className="col">
            <div className="muted">Percentual (%)</div>
            <input name="platformFeePercent" type="number" min={0} max={100} step={0.1} defaultValue={config?.platformFeePercent ?? 10} className="input" />
          </label>
          <label className="col">
            <div className="muted">Provedor de Pagamento</div>
            <select name="defaultPaymentProvider" className="select" defaultValue={config?.defaultPaymentProvider || 'MANUAL'}>
              <option value="MANUAL">Manual (Dev)</option>
              <option value="STRIPE">Stripe Connect</option>
              <option value="MERCADO_PAGO">Mercado Pago</option>
            </select>
          </label>
          <button className="button" type="submit">Salvar</button>
        </form>
        <p className="muted" style={{marginTop:8}}>Este percentual é aplicado sobre os ganhos das escolas.</p>
      </div>

      <div className="card" style={{marginTop:16}}>
        <h3>Como configurar Stripe / Mercado Pago</h3>
        <ul>
          <li>Stripe: defina `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` no backend, além de `STRIPE_RETURN_URL` e `STRIPE_REFRESH_URL`.</li>
          <li>Mercado Pago: defina `MP_CLIENT_ID`, `MP_CLIENT_SECRET`, `MP_REDIRECT_URI`, `MP_APP_ACCESS_TOKEN` e opcionalmente `MP_WEBHOOK_VALIDATE`=`strict` + `MP_WEBHOOK_SECRET`.</li>
          <li>URLs de retorno do checkout: `CHECKOUT_SUCCESS_URL` e `CHECKOUT_CANCEL_URL` (defaults para `/payments/return` e `/payments/cancel`).</li>
          <li>Após setar o provedor padrão, diretores devem conectar suas contas em “Pagamentos”.</li>
        </ul>
      </div>
    </div>
  )
}

function StatCard({ title, value }: { title:string, value:string }){
  return (
    <div className="card">
      <div className="muted">{title}</div>
      <div style={{fontSize:22,fontWeight:700}}>{value}</div>
    </div>
  )
}
