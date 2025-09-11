import React from 'react'
import { api, getSchoolId } from '../lib/api'
import { useToast } from '../components/Toast'

export default function PaymentsConnectPage(){
  const schoolId = getSchoolId()
  const { show } = useToast()
  const [busy, setBusy] = React.useState<string>('')

  async function connectStripe(){
    if (!schoolId) return
    setBusy('stripe')
    try{
      const r = await api<{ url:string }>(`/payments/${schoolId}/stripe/account-link`, { method:'POST' })
      window.location.href = r.url
    }catch(e:any){ show(e?.message || 'Falha ao conectar Stripe','error') }
    finally{ setBusy('') }
  }

  async function connectMP(){
    if (!schoolId) return
    setBusy('mp')
    try{
      const r = await api<{ url:string }>(`/payments/${schoolId}/mercadopago/oauth-url`)
      window.location.href = r.url
    }catch(e:any){ show(e?.message || 'Falha ao conectar Mercado Pago','error') }
    finally{ setBusy('') }
  }

  return (
    <div>
      <h2>Conectar Pagamentos</h2>
      <div className="card">
        <p>Conecte sua escola a um provedor de pagamentos para receber diretamente:</p>
        <div style={{display:'flex', gap:8}}>
          <button className="button" onClick={connectStripe} disabled={busy==='stripe'}>Conectar Stripe</button>
          <button className="button" onClick={connectMP} disabled={busy==='mp'}>Conectar Mercado Pago</button>
        </div>
        <p className="muted" style={{marginTop:8}}>Após conectar, configure o provedor padrão em Admin: Cobranças.</p>
      </div>
    </div>
  )
}

