import React from 'react'

type State = { message: string; resolve?: (v: boolean)=>void }

const ConfirmContext = React.createContext<{
  confirm: (message: string)=> Promise<boolean>
} | undefined>(undefined)

export function ConfirmProvider({ children }: { children: React.ReactNode }){
  const [state, setState] = React.useState<State | null>(null)
  const confirm = React.useCallback((message: string)=>{
    return new Promise<boolean>((resolve)=> setState({ message, resolve }))
  },[])
  const onClose = (v: boolean)=>{ state?.resolve?.(v); setState(null) }
  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div className="modal-backdrop">
          <div className="modal">
            <div style={{ marginBottom: 12 }}>{state.message}</div>
            <div className="row" style={{ justifyContent:'flex-end' }}>
              <button className="button" onClick={()=>onClose(false)}>Cancelar</button>
              <button className="button primary" onClick={()=>onClose(true)}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm(){
  const ctx = React.useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx.confirm
}

