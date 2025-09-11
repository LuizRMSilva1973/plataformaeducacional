import React from 'react'

export default function PaymentReturnPage(){
  const params = new URLSearchParams(location.search)
  const status = params.get('status') || params.get('collection_status') || 'unknown'
  const title = status === 'success' || status === 'approved' ? 'Pagamento aprovado!' : (status === 'pending' ? 'Pagamento pendente' : 'Pagamento não concluído')
  React.useEffect(()=>{
    try{
      const raw = localStorage.getItem('edu_pending_checkouts')
      if (!raw) return
      const arr = JSON.parse(raw) as string[]
      if (Array.isArray(arr) && arr.length){
        const [next, ...rest] = arr
        if (rest.length) localStorage.setItem('edu_pending_checkouts', JSON.stringify(rest))
        else localStorage.removeItem('edu_pending_checkouts')
        window.location.href = next
      }
    }catch{}
  },[])
  return (
    <div>
      <h2>{title}</h2>
      <p className="muted">Status: {status}</p>
      <a className="button" href="/store">Voltar à Loja</a>
    </div>
  )
}
