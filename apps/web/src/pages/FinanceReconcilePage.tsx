import React from 'react'
import { api, getSchoolId } from '../lib/api'

type Nets = { schoolNet: number, platformNet: number }

export default function FinanceReconcilePage(){
  const schoolId = getSchoolId()
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')
  const [overall, setOverall] = React.useState<{ totals: Record<string, number>, nets: Nets, gmvCents?: number }|null>(null)
  const [byProduct, setByProduct] = React.useState<any[]>([])
  const [series, setSeries] = React.useState<any[]>([])
  const [interval, setInterval] = React.useState('day')

  async function load(){
    const qs = new URLSearchParams()
    if (from) qs.set('from', new Date(from).toISOString())
    if (to) qs.set('to', new Date(to).toISOString())
    const r = await api<{ overall: { totals: Record<string, number>, nets: Nets, gmvCents?: number }, byProductType: any[] }>(`/${schoolId}/billing/reconcile?`+qs.toString())
    setOverall(r.overall)
    setByProduct(r.byProductType||[])
    const qs2 = new URLSearchParams(qs)
    if (interval) qs2.set('interval', interval)
    const ts = await api<{ items:any[] }>(`/${schoolId}/billing/timeseries?`+qs2.toString())
    setSeries(ts.items||[])
  }

  React.useEffect(()=>{ if (schoolId) load() },[schoolId])

  function money(cents?: number){ return `R$ ${((cents||0)/100).toLocaleString('pt-BR',{minimumFractionDigits:2})}` }

  return (
    <div>
      <h2>Conciliação por Período</h2>
      <div className="row" style={{gap:8}}>
        <label>
          <div className="muted">De</div>
          <input type="date" className="input" value={from} onChange={e=>setFrom(e.target.value)} />
        </label>
        <label>
          <div className="muted">Até</div>
          <input type="date" className="input" value={to} onChange={e=>setTo(e.target.value)} />
        </label>
        <div style={{display:'flex',alignItems:'end'}}>
          <button className="button" onClick={()=>load()}>Aplicar</button>
        </div>
        <label>
          <div className="muted">Intervalo</div>
          <select className="select" value={interval} onChange={e=>setInterval(e.target.value)}>
            <option value="day">Diário</option>
            <option value="week">Semanal</option>
            <option value="month">Mensal</option>
          </select>
        </label>
      </div>

      <div className="grid" style={{gridTemplateColumns:'repeat(6, 1fr)', gap:8, marginTop:12}}>
        <Stat title="GMV (bruto)" value={money(overall?.gmvCents)} />
        <Stat title="Escola (créditos)" value={money(overall?.totals?.SCHOOL_EARNING)} />
        <Stat title="Plataforma (taxas)" value={money(overall?.totals?.PLATFORM_FEE)} />
        <Stat title="Reembolsos (débitos)" value={`- ${money(overall?.totals?.REFUND)}`} />
        <Stat title="Líquido Escola" value={money(overall?.nets?.schoolNet)} />
        <Stat title="Líquido Plataforma" value={money(overall?.nets?.platformNet)} />
      </div>

      <div className="card" style={{marginTop:16}}>
        <h3>Por Tipo de Produto</h3>
        <table className="table">
          <thead><tr><th>Produto</th><th>Escola (crédito)</th><th>Plataforma (taxa)</th><th>Reembolsos</th><th>Líquido Escola</th><th>Líquido Plataforma</th></tr></thead>
          <tbody>
            {byProduct.map((row:any) => (
              <tr key={row.productType}>
                <td>
                  {row.productType === 'SCHOOL_MEMBERSHIP' ? 'Assinaturas' : (row.productType === 'SUBJECT_COURSE' ? 'Cursos' : row.productType)}
                  <div className="muted" style={{fontSize:12}}>GMV: {money(row.gmvCents)}</div>
                  <Bar value={row.gmvCents||0} max={Math.max(1, Math.max(...byProduct.map((r:any)=>r.gmvCents||0)))} color="#4f46e5" />
                </td>
                <td>{money(row.totals?.SCHOOL_EARNING)}</td>
                <td>{money(row.totals?.PLATFORM_FEE)}</td>
                <td>{row.totals?.REFUND ? `- ${money(row.totals.REFUND)}` : money(0)}</td>
                <td>{money(row.nets?.schoolNet)}</td>
                <td>{money(row.nets?.platformNet)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{marginTop:8, display:'flex', gap:8}}>
          <a className="button" href={`${(import.meta as any).env?.VITE_API_URL || 'http://localhost:3000'}/${schoolId}/billing/reconcile?format=csv${from?`&from=${new Date(from).toISOString()}`:''}${to?`&to=${new Date(to).toISOString()}`:''}`}>Exportar CSV</a>
          <a className="button" href={`${(import.meta as any).env?.VITE_API_URL || 'http://localhost:3000'}/${schoolId}/billing/reconcile?format=xlsx${from?`&from=${new Date(from).toISOString()}`:''}${to?`&to=${new Date(to).toISOString()}`:''}`}>Exportar Excel</a>
          <a className="button" href={`${(import.meta as any).env?.VITE_API_URL || 'http://localhost:3000'}/${schoolId}/billing/monthly-report.pdf?year=${(from?new Date(from):new Date()).getFullYear()}&month=${String((from?new Date(from):new Date()).getMonth()+1)}`}>Baixar PDF mensal</a>
        </div>
      </div>

      <div className="card" style={{marginTop:16}}>
        <h3>Série Temporal</h3>
        <table className="table">
          <thead><tr><th>Período</th><th>GMV</th><th>Líquido Escola</th><th>Líquido Plataforma</th></tr></thead>
          <tbody>
            {series.map((r:any)=> (
              <tr key={r.bucket}>
                <td>{r.bucket}</td>
                <td>{money(r.gmvCents)}</td>
                <td>{money(r.nets?.schoolNet)}</td>
                <td>{money(r.nets?.platformNet)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{marginTop:8}}>
          <a className="button" href={`${(import.meta as any).env?.VITE_API_URL || 'http://localhost:3000'}/${schoolId}/billing/timeseries?format=csv${from?`&from=${new Date(from).toISOString()}`:''}${to?`&to=${new Date(to).toISOString()}`:''}&interval=${interval}`}>Exportar CSV (série)</a>
          <a className="button" href={`${(import.meta as any).env?.VITE_API_URL || 'http://localhost:3000'}/${schoolId}/billing/timeseries?format=xlsx${from?`&from=${new Date(from).toISOString()}`:''}${to?`&to=${new Date(to).toISOString()}`:''}&interval=${interval}`} style={{marginLeft:8}}>Exportar Excel (série)</a>
        </div>
        <div style={{marginTop:12, display:'grid', gridTemplateColumns:'1fr', gap:12}}>
          <LineChart data={series.map((r:any)=>({ x: r.bucket, y: r.gmvCents||0 }))} color="#2563eb" title="GMV" />
          <LineChart data={series.map((r:any)=>({ x: r.bucket, y: r.nets?.schoolNet||0 }))} color="#16a34a" title="Líquido Escola" />
          <LineChart data={series.map((r:any)=>({ x: r.bucket, y: r.nets?.platformNet||0 }))} color="#ef4444" title="Líquido Plataforma" />
        </div>
      </div>
    </div>
  )
}

function Stat({ title, value }: { title:string, value?: string }){
  return (
    <div className="card">
      <div className="muted">{title}</div>
      <div style={{fontSize:22,fontWeight:700}}>{value || 'R$ 0,00'}</div>
    </div>
  )
}

function Bar({ value, max, color }: { value: number, max: number, color: string }){
  const pct = Math.max(0, Math.min(100, Math.round((value / (max || 1)) * 100)))
  return (
    <div style={{background:'#e5e7eb',height:8,borderRadius:4,overflow:'hidden',marginTop:4}}>
      <div style={{width:`${pct}%`,height:'100%',background:color}}></div>
    </div>
  )
}

function LineChart({ data, color, title }: { data: { x: string, y: number }[], color: string, title: string }){
  const w = 600, h = 180, p = 30
  const ys = data.map(d=>d.y)
  const max = Math.max(1, ...ys)
  const pts = data.map((d,i)=>{
    const x = p + (i*(w-2*p))/Math.max(1,(data.length-1))
    const y = h - p - (d.y/max)*(h-2*p)
    return `${x},${y}`
  }).join(' ')
  return (
    <div>
      <div className="muted">{title}</div>
      <svg width={w} height={h} style={{background:'#fff', border:'1px solid #e5e7eb'}}>
        <polyline fill="none" stroke={color} strokeWidth="2" points={pts} />
        {data.map((d,i)=>{
          const x = p + (i*(w-2*p))/Math.max(1,(data.length-1))
          const y = h - p - (d.y/max)*(h-2*p)
          return <g key={i}><circle cx={x} cy={y} r={3} fill={color}><title>{`${d.x}: R$ ${(d.y/100).toLocaleString('pt-BR',{minimumFractionDigits:2})}`}</title></circle></g>
        })}
      </svg>
    </div>
  )
}
