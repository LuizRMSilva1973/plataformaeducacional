import React from 'react'
import { api, getSchoolId } from '../lib/api'
import { useToast } from '../components/Toast'
import { useParams, Link } from 'react-router-dom'

export default function OrderDetailPage(){
  const schoolId = getSchoolId()
  const { id } = useParams()
  const { show } = useToast()
  const [order, setOrder] = React.useState<any>(null)
  const [refundAmount, setRefundAmount] = React.useState<string>('')

  async function load(){
    const r = await api<any>(`/${schoolId}/orders/${id}`)
    setOrder(r)
  }
  React.useEffect(()=>{ if (schoolId && id) load() },[schoolId, id])

  async function cancel(){
    try{ await api(`/${schoolId}/orders/${id}/cancel`, { method:'POST' }); show('Pedido cancelado','success'); load() }
    catch(e:any){ show(e?.message || 'Falha ao cancelar','error') }
  }
  async function refund(){
    try{
      const body: any = {}
      const val = parseFloat(refundAmount.replace(',', '.'))
      if (!isNaN(val) && val > 0) body.amountCents = Math.round(val * 100)
      await api(`/${schoolId}/orders/${id}/refund`, { method:'POST', body: JSON.stringify(body) });
      show('Estorno solicitado','success');
      load()
    }
    catch(e:any){ show(e?.message || 'Reembolso não implementado','error') }
  }

  function money(cents:number){ return `R$ ${(cents/100).toLocaleString('pt-BR',{minimumFractionDigits:2})}` }

  if (!order) return <div>Carregando...</div>

  return (
    <div>
      <h2>Pedido {order.id}</h2>
      <p className="muted">Status: {order.status}</p>
      <p><b>Comprador:</b> {order.buyer?.name || order.buyer?.email}</p>
      <p><b>Valor:</b> {money(order.totalAmountCents)}</p>
      <div style={{margin:'8px 0'}}>
        <a className="button" href={`${(import.meta as any).env?.VITE_API_URL || 'http://localhost:3000'}/${order.schoolId || (window as any).currentSchoolId}/${'orders'}/${order.id}/receipt.pdf`} target="_blank" rel="noreferrer">Baixar recibo (PDF)</a>
      </div>
      <div className="card">
        <h3>Itens</h3>
        <ul>
          {order.items.map((it:any)=>(<li key={it.id}>{it.productType}:{it.productRefId}{it.interval!=='ONE_TIME'?' ('+it.interval+')':''} — {money(it.priceAmountCents)}</li>))}
        </ul>
      </div>
      <div className="row" style={{gap:8, marginTop:12}}>
        {order.status==='PENDING' && <button className="button" onClick={cancel}>Cancelar</button>}
        <label>
          <div className="muted">Valor para estorno (R$)</div>
          <input className="input" placeholder={(order.totalAmountCents/100).toFixed(2)} value={refundAmount} onChange={e=>setRefundAmount(e.target.value)} />
        </label>
        <button className="button" onClick={refund}>Estornar</button>
        <Link to="/orders" className="button">Voltar</Link>
      </div>
    </div>
  )
}
