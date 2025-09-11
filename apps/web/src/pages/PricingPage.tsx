import React from 'react'
import { api, getSchoolId } from '../lib/api'
import { useToast } from '../components/Toast'

export default function PricingPage(){
  const schoolId = getSchoolId()
  const { show } = useToast()
  const [subjects, setSubjects] = React.useState<{id:string, name:string}[]>([])
  const [prices, setPrices] = React.useState<any[]>([])

  React.useEffect(()=>{
    if (!schoolId) return
    api<{ items:any[] }>(`/${schoolId}/subjects`).then(r=> setSubjects(r.items)).catch(()=>{})
    load()
  },[schoolId])

  async function load(){
    try{
      const r = await api<{ items:any[] }>(`/${schoolId}/pricing`)
      setPrices(r.items)
    }catch(e:any){ show(e?.message || 'Falha ao carregar preços','error') }
  }

  async function upsert(e: React.FormEvent){
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const productType = String(fd.get('productType'))
    const productRefId = String(fd.get('productRefId'))
    const amountCents = Math.round(Number(fd.get('amount'))*100)
    const interval = String(fd.get('interval'))
    try{
      await api(`/${schoolId}/pricing`, { method:'POST', body: JSON.stringify({ productType, productRefId, amountCents, interval }) })
      show('Preço salvo','success')
      ;(e.target as HTMLFormElement).reset()
      load()
    }catch(err:any){ show(err?.message || 'Falha ao salvar','error') }
  }

  function title(p:any){
    if (p.productType === 'SCHOOL_MEMBERSHIP') return 'Assinatura da Escola'
    const s = subjects.find(x=>x.id===p.productRefId)
    return `Curso: ${s?.name || p.productRefId}`
  }

  return (
    <div>
      <h2>Gestão de Preços</h2>
      <div className="card">
        <h3>Novo Preço</h3>
        <form onSubmit={upsert} className="grid" style={{gridTemplateColumns:'repeat(5, 1fr)',gap:8}}>
          <label>
            <div className="muted">Produto</div>
            <select name="productType" className="select" defaultValue="SCHOOL_MEMBERSHIP">
              <option value="SCHOOL_MEMBERSHIP">Assinatura da Escola</option>
              <option value="SUBJECT_COURSE">Curso (Disciplina)</option>
            </select>
          </label>
          <label>
            <div className="muted">Curso/Disciplina</div>
            <select name="productRefId" className="select">
              <option value="school">(Apenas para Assinatura)</option>
              {subjects.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label>
            <div className="muted">Intervalo</div>
            <select name="interval" className="select" defaultValue="MONTHLY">
              <option value="ONE_TIME">Único</option>
              <option value="MONTHLY">Mensal</option>
              <option value="YEARLY">Anual</option>
            </select>
          </label>
          <label>
            <div className="muted">Preço (R$)</div>
            <input name="amount" type="number" min={0} step={0.01} className="input" placeholder="0,00" required />
          </label>
          <div style={{display:'flex',alignItems:'end'}}>
            <button className="button" type="submit">Salvar</button>
          </div>
        </form>
      </div>

      <div style={{marginTop:16}}>
        <h3>Preços Atuais</h3>
        <div className="grid" style={{gridTemplateColumns:'repeat(3, 1fr)', gap:8}}>
          {prices.map(p=> (
            <div key={p.id} className="card">
              <div className="muted">{title(p)}</div>
              <div style={{fontWeight:700}}>R$ {(p.amountCents/100).toLocaleString('pt-BR',{minimumFractionDigits:2})} {p.interval!=='ONE_TIME' ? `• ${p.interval==='MONTHLY'?'Mensal':'Anual'}` : ''}</div>
              <div className="muted" style={{fontSize:12}}>{p.currency}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

