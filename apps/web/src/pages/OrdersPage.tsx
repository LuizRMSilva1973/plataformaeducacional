import React from 'react'
import { api, getSchoolId } from '../lib/api'

export default function OrdersPage(){
  const schoolId = getSchoolId()
  const [items, setItems] = React.useState<any[]>([])
  const [status, setStatus] = React.useState('')
  const [buyer, setBuyer] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [meta, setMeta] = React.useState<any>({ page:1, limit:20, total:0 })

  async function load(p=page){
    const qs = new URLSearchParams()
    if (status) qs.set('status', status)
    if (buyer) qs.set('buyerEmail', buyer)
    qs.set('page', String(p))
    qs.set('limit', '20')
    const r = await api<{ items:any[], meta:any }>(`/${schoolId}/orders?`+qs.toString())
    setItems(r.items)
    setMeta(r.meta)
    setPage(p)
  }

  React.useEffect(()=>{ if (schoolId) load(1) },[schoolId,status])

  function money(cents:number){ return `R$ ${(cents/100).toLocaleString('pt-BR',{minimumFractionDigits:2})}` }

  return (
    <div>
      <h2>Pedidos</h2>
      <div className="row" style={{gap:8}}>
        <label>
          <div className="muted">Status</div>
          <select className="select" value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="PENDING">Pendente</option>
            <option value="PAID">Pago</option>
            <option value="FAILED">Falha</option>
            <option value="REFUNDED">Estornado</option>
            <option value="CANCELED">Cancelado</option>
          </select>
        </label>
        <label>
          <div className="muted">Comprador (email)</div>
          <input className="input" value={buyer} onChange={e=>setBuyer(e.target.value)} placeholder="email@escola.com" />
        </label>
      </div>
      <div style={{marginTop:12}}>
        <table className="table">
          <thead><tr><th>Data</th><th>Comprador</th><th>Status</th><th>Valor</th><th>Itens</th></tr></thead>
          <tbody>
            {items.map(o => (
              <tr key={o.id}>
                <td>{new Date(o.createdAt).toLocaleString()}</td>
                <td>{o.buyer?.name || o.buyer?.email}</td>
                <td>{o.status}</td>
                <td>{money(o.totalAmountCents)}</td>
                <td><a href={`/orders/${o.id}`}>{o.items.map((it:any)=>`${it.productType}:${it.productRefId}${it.interval!=='ONE_TIME'?'('+it.interval+')':''}`).join(', ')}</a></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="row" style={{gap:8, marginTop:8}}>
          <button className="button" disabled={page<=1} onClick={()=>load(page-1)}>Anterior</button>
          <span className="muted">Página {meta.page}</span>
          <button className="button" disabled={(meta.page*meta.limit)>=meta.total} onClick={()=>load(page+1)}>Próxima</button>
        </div>
      </div>
    </div>
  )
}
