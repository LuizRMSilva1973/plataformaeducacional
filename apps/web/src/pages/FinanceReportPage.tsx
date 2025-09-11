import React from 'react'
import { api, getSchoolId } from '../lib/api'

export default function FinanceReportPage(){
  const schoolId = getSchoolId()
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')
  const [type, setType] = React.useState('')
  const [items, setItems] = React.useState<any[]>([])
  const [totals, setTotals] = React.useState<Record<string, number>>({})
  const [buyer, setBuyer] = React.useState('')
  const [nets, setNets] = React.useState<{ schoolNet?: number, platformNet?: number }>({})
  const [onlyRefund, setOnlyRefund] = React.useState(false)
  const [productType, setProductType] = React.useState('')

  const [page, setPage] = React.useState(1)
  const [meta, setMeta] = React.useState<any>({ page:1, limit:20, total:0, pages:1 })

  async function load(goPage?: number){
    const qs = new URLSearchParams()
    if (from) qs.set('from', new Date(from).toISOString())
    if (to) qs.set('to', new Date(to).toISOString())
    if (type) qs.set('type', type)
    if (buyer) qs.set('buyerEmail', buyer)
    if (onlyRefund) qs.set('type', 'REFUND')
    if (productType) qs.set('productType', productType)
    const targetPage = goPage || page
    qs.set('page', String(targetPage))
    qs.set('limit', '20')
    const r = await api<{ items:any[], totals: Record<string, number>, nets?: { schoolNet?: number, platformNet?: number }, meta:any }>(`/${schoolId}/billing/ledger?`+qs.toString())
    setItems(r.items)
    setTotals(r.totals)
    setNets(r.nets || {})
    setMeta(r.meta || { page: targetPage, limit: 20, total: r.items.length, pages: 1 })
    setPage(targetPage)
  }

  function downloadCSV(all=false){
    const qs = new URLSearchParams()
    if (from) qs.set('from', new Date(from).toISOString())
    if (to) qs.set('to', new Date(to).toISOString())
    if (type) qs.set('type', type)
    if (buyer) qs.set('buyerEmail', buyer)
    if (onlyRefund) qs.set('type', 'REFUND')
    if (productType) qs.set('productType', productType)
    qs.set('format','csv')
    if (all) qs.set('all','true')
    window.location.href = `${(import.meta as any).env?.VITE_API_URL || 'http://localhost:3000'}/${schoolId}/billing/ledger?${qs.toString()}`
  }

  React.useEffect(()=>{ if (schoolId) load() },[schoolId])

  function money(cents?:number){ return `R$ ${((cents||0)/100).toLocaleString('pt-BR',{minimumFractionDigits:2})}` }

  return (
    <div>
      <h2>Financeiro</h2>
      <div className="row" style={{gap:8}}>
        <label>
          <div className="muted">De</div>
          <input type="date" className="input" value={from} onChange={e=>setFrom(e.target.value)} />
        </label>
        <label>
          <div className="muted">Até</div>
          <input type="date" className="input" value={to} onChange={e=>setTo(e.target.value)} />
        </label>
        <label>
          <div className="muted">Tipo</div>
          <select className="select" value={type} onChange={e=>setType(e.target.value)}>
            <option value="">Todos</option>
            <option value="PLATFORM_FEE">Taxa Plataforma</option>
            <option value="SCHOOL_EARNING">Receita Escola</option>
            <option value="REFUND">Estorno</option>
            <option value="ADJUSTMENT">Ajuste</option>
          </select>
        </label>
        <label>
          <div className="muted">Comprador (email)</div>
          <input className="input" value={buyer} onChange={e=>setBuyer(e.target.value)} placeholder="email@escola.com" />
        </label>
        <div style={{display:'flex',alignItems:'end',gap:8}}>
          <button className="button" onClick={()=>load(1)}>Aplicar</button>
          <button className="button" onClick={()=>downloadCSV(false)}>Exportar CSV (página)</button>
          <button className="button" onClick={()=>downloadCSV(true)}>Exportar CSV (todos)</button>
          <a className="button" href={`${(import.meta as any).env?.VITE_API_URL || 'http://localhost:3000'}/${schoolId}/billing/ledger?format=xlsx${from?`&from=${new Date(from).toISOString()}`:''}${to?`&to=${new Date(to).toISOString()}`:''}${type?`&type=${type}`:''}${buyer?`&buyerEmail=${encodeURIComponent(buyer)}`:''}${onlyRefund?`&type=REFUND`:''}${productType?`&productType=${productType}`:''}`}>Exportar Excel</a>
        </div>
        <label style={{display:'flex',alignItems:'end',gap:8}}>
          <input type="checkbox" checked={onlyRefund} onChange={e=>setOnlyRefund(e.target.checked)} /> Apenas reembolsos
        </label>
        <label>
          <div className="muted">Produto</div>
          <select className="select" value={productType} onChange={e=>setProductType(e.target.value)}>
            <option value="">Todos</option>
            <option value="SCHOOL_MEMBERSHIP">Assinaturas</option>
            <option value="SUBJECT_COURSE">Cursos</option>
          </select>
        </label>
      </div>
      <div className="grid" style={{gridTemplateColumns:'repeat(6, 1fr)', gap:8, marginTop:12}}>
        <Stat title="Total" value={money(totals.all)} />
        <Stat title="Receita Escola" value={money(totals.SCHOOL_EARNING)} />
        <Stat title="Taxa Plataforma" value={money(totals.PLATFORM_FEE)} />
        <Stat title="Reembolsos" value={(totals.REFUND?'-':'') + money(totals.REFUND)} />
        <Stat title="Líquido Escola" value={money(nets.schoolNet||0)} />
        <Stat title="Líquido Plataforma" value={money(nets.platformNet||0)} />
      </div>
      <div style={{marginTop:16}}>
        <table className="table">
          <thead><tr><th>Data</th><th>Tipo</th><th>Sentido</th><th>Valor</th><th>Líquido (linha)</th><th>Produto</th><th>Descrição</th><th>Pedido</th><th>Assinatura</th><th>Comprador</th></tr></thead>
          <tbody>
            {items.map(it => {
              const isRefund = it.entryType === 'REFUND'
              const amount = (it.amountCents||0)/100
              // Compute per-line net split
              let schoolLine = 0, platformLine = 0
              if (it.entryType === 'SCHOOL_EARNING' && it.direction === 'CREDIT') schoolLine += it.amountCents
              if (it.entryType === 'PLATFORM_FEE' && it.direction === 'CREDIT') platformLine += it.amountCents
              if (it.entryType === 'REFUND'){
                const target = it?.meta?.target
                if (target === 'SCHOOL_EARNING') schoolLine -= it.amountCents
                else if (target === 'PLATFORM_FEE') platformLine -= it.amountCents
                else schoolLine -= it.amountCents
              }
              const prodLabel = it.primaryProduct?.productType === 'SCHOOL_MEMBERSHIP' ? 'Assinatura' : (it.primaryProduct?.productType === 'SUBJECT_COURSE' ? 'Curso' : '-')
              return (
                <tr key={it.id}>
                  <td>{new Date(it.createdAt).toLocaleString()}</td>
                  <td>{it.entryType}</td>
                  <td>{it.direction}</td>
                  <td style={isRefund?{color:'tomato'}:{}}>{isRefund?'-':''}R$ {amount.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                  <td>
                    <span style={{color: schoolLine>=0? 'var(--success-color,#16a34a)':'tomato'}}>Escola: {money(schoolLine)}</span>
                    {' • '}
                    <span style={{color: platformLine>=0? 'var(--success-color,#16a34a)':'tomato'}}>Plataforma: {money(platformLine)}</span>
                  </td>
                  <td>{prodLabel}</td>
                  <td>
                    {it.title || '-'}
                    {it.primaryProduct?.productType === 'SUBJECT_COURSE' && (
                      <>
                        {' '}
                        <a href={`/subjects#subject-${it.primaryProduct.productRefId}`}>ver disciplina</a>
                      </>
                    )}
                  </td>
                  <td>{it.orderId ? <a href={`/orders/${it.orderId}`}>{it.orderId}</a> : '-'}</td>
                  <td>{it.subscriptionId || '-'}</td>
                  <td>{it.order?.buyer?.email || '-'}</td>
                </tr>
              )
            })}
          </tbody>
          {/* Totais da página */}
          <tfoot>
            {(() => {
              let schoolSum = 0, platformSum = 0, amountSum = 0
              for (const it of items as any[]){
                const isRefund = it.entryType === 'REFUND'
                amountSum += it.amountCents || 0
                if (it.entryType === 'SCHOOL_EARNING' && it.direction === 'CREDIT') schoolSum += it.amountCents
                if (it.entryType === 'PLATFORM_FEE' && it.direction === 'CREDIT') platformSum += it.amountCents
                if (it.entryType === 'REFUND'){
                  const target = it?.meta?.target
                  if (target === 'SCHOOL_EARNING') schoolSum -= it.amountCents
                  else if (target === 'PLATFORM_FEE') platformSum -= it.amountCents
                  else schoolSum -= it.amountCents
                }
              }
              return (
                <tr>
                  <td colSpan={3} style={{textAlign:'right'}}>Totais da página:</td>
                  <td>R$ {(amountSum/100).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                  <td>
                    <span style={{color: schoolSum>=0? 'var(--success-color,#16a34a)':'tomato'}}>Escola: {money(schoolSum)}</span>
                    {' • '}
                    <span style={{color: platformSum>=0? 'var(--success-color,#16a34a)':'tomato'}}>Plataforma: {money(platformSum)}</span>
                  </td>
                  <td colSpan={4}></td>
                </tr>
              )
            })()}
          </tfoot>
        </table>
        <div className="row" style={{gap:8, marginTop:8}}>
          <button className="button" disabled={page<=1} onClick={()=>load(page-1)}>Anterior</button>
          <span className="muted">Página {meta.page} de {meta.pages}</span>
          <button className="button" disabled={page>=meta.pages} onClick={()=>load(page+1)}>Próxima</button>
        </div>
      </div>
    </div>
  )
}

function Stat({ title, value }: { title:string, value:string }){
  return (
    <div className="card">
      <div className="muted">{title}</div>
      <div style={{fontSize:22, fontWeight:700}}>{value}</div>
    </div>
  )
}
