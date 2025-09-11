import React from 'react'
import { api, getSchoolId } from '../lib/api'
import { useToast } from '../components/Toast'

export default function MySubscriptionsPage(){
  const schoolId = getSchoolId()
  const { show } = useToast()
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  async function load(){
    if (!schoolId) return
    setLoading(true)
    try{ const r = await api<{ items:any[] }>(`/${schoolId}/subscriptions/me`); setItems(r.items) }
    catch(e:any){ show(e?.message || 'Falha ao carregar assinaturas','error') }
    finally{ setLoading(false) }
  }

  React.useEffect(()=>{ load() },[schoolId])

  async function cancel(id: string){
    try{ await api(`/${schoolId}/subscriptions/${id}/cancel`, { method:'POST' }); show('Assinatura será cancelada no fim do período','success'); load() }
    catch(e:any){ show(e?.message || 'Falha ao cancelar','error') }
  }
  async function resume(id: string){
    try{ await api(`/${schoolId}/subscriptions/${id}/resume`, { method:'POST' }); show('Assinatura retomada','success'); load() }
    catch(e:any){ show(e?.message || 'Falha ao retomar','error') }
  }

  function title(it:any){
    if (it.productType === 'SCHOOL_MEMBERSHIP') return 'Assinatura da Escola'
    return `Curso: ${it.productRefId}`
  }

  if (loading) return <div>Carregando...</div>

  return (
    <div>
      <h2>Minhas Assinaturas</h2>
      <div className="grid" style={{gridTemplateColumns:'repeat(2, 1fr)', gap:8}}>
        {items.map(it => (
          <div key={it.id} className="card">
            <div className="muted">{title(it)}</div>
            <div><b>Status:</b> {it.status}{it.cancelAtPeriodEnd ? ' (cancela no fim do período)' : ''}</div>
            <div><b>Fim do período:</b> {it.currentPeriodEnd ? new Date(it.currentPeriodEnd).toLocaleDateString() : '-'}</div>
            <div style={{display:'flex', gap:8, marginTop:8}}>
              {!it.cancelAtPeriodEnd && <button className="button" onClick={()=>cancel(it.id)}>Cancelar no fim do período</button>}
              {it.cancelAtPeriodEnd && <button className="button" onClick={()=>resume(it.id)}>Retomar</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

