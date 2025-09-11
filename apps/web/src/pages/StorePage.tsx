import React from 'react'
import { api, getSchoolId } from '../lib/api'
import { useToast } from '../components/Toast'

export default function StorePage(){
  const schoolId = getSchoolId()
  const { show } = useToast()
  const [items, setItems] = React.useState<any[]>([])
  const [cart, setCart] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(()=>{
    if (!schoolId) return
    setLoading(true)
    api<{ items:any[] }>(`/${schoolId}/checkout/store`).then(r=> setItems(r.items)).catch(()=>{})
      .finally(()=> setLoading(false))
  },[schoolId])

  function toggle(id: string){
    setCart(c => c.includes(id) ? c.filter(x=>x!==id) : [...c, id])
  }

  async function checkout(){
    try{
      const r = await api<any>(`/${schoolId}/checkout/order`, { method:'POST', body: JSON.stringify({ priceIds: cart }) })
      // Stripe or MP single url
      if (r.checkoutUrl){ window.location.href = r.checkoutUrl; return }
      // Stripe multi urls
      if (Array.isArray(r.checkoutUrls) && r.checkoutUrls.length){
        const [, ...rest] = r.checkoutUrls
        if (rest.length) localStorage.setItem('edu_pending_checkouts', JSON.stringify(rest))
        window.location.href = r.checkoutUrls[0]
        return
      }
      // Manual simulate (one or many)
      if (Array.isArray(r.simulatePaymentUrls) && r.simulatePaymentUrls.length){
        for (const url of r.simulatePaymentUrls){ await api(url, { method:'POST' }) }
        show('Pagamento confirmado!','success')
        setCart([])
        return
      }
      show('Não foi possível iniciar o checkout','error')
    }catch(e:any){ show(e?.message || 'Falha no checkout','error') }
  }

  if (loading) return <div>Carregando...</div>

  return (
    <div>
      <h2>Loja</h2>
      <div className="grid" style={{gridTemplateColumns:'repeat(3, 1fr)', gap:8}}>
        {items.map(it => (
          <div key={it.id} className={`card ${cart.includes(it.id)?'active':''}`} onClick={()=>toggle(it.id)} style={{cursor:'pointer'}}>
            <div className="muted">{it.productType==='SCHOOL_MEMBERSHIP'?'Assinatura':'Curso'}</div>
            <div style={{fontWeight:700}}>{it.title}</div>
            <div>R$ {(it.amountCents/100).toLocaleString('pt-BR',{minimumFractionDigits:2})} {it.interval!=='ONE_TIME' ? `• ${it.interval==='MONTHLY'?'Mensal':'Anual'}` : ''}</div>
            {cart.includes(it.id) && <div className="tag">Selecionado</div>}
          </div>
        ))}
      </div>
      <div style={{marginTop:16, display:'flex', gap:8}}>
        <button className="button" disabled={!cart.length} onClick={checkout}>Finalizar compra ({cart.length})</button>
      </div>
      <p className="muted" style={{marginTop:8}}>Pagamento simulado para desenvolvimento. Em produção, integraremos um provedor (Stripe, Mercado Pago).</p>
    </div>
  )
}
