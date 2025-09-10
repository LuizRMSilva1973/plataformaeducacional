import React from 'react'

type Props = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (el.innerHTML !== value) {
      el.innerHTML = value || ''
    }
  }, [value])

  function exec(cmd: string, arg?: string) {
    document.execCommand(cmd, false, arg)
    onChange(ref.current?.innerHTML || '')
  }

  function onInput() {
    onChange(ref.current?.innerHTML || '')
  }

  return (
    <div>
      <div className="rte-toolbar">
        <button type="button" className="button" onClick={()=>exec('bold')} title="Negrito"><b>B</b></button>
        <button type="button" className="button" onClick={()=>exec('italic')} title="Itálico"><i>I</i></button>
        <button type="button" className="button" onClick={()=>exec('underline')} title="Sublinhado"><u>U</u></button>
        <button type="button" className="button" onClick={()=>exec('insertUnorderedList')} title="Lista">• List</button>
        <button type="button" className="button" onClick={()=>exec('formatBlock','<h3>')} title="Título">H3</button>
        <button type="button" className="button" onClick={()=>{
          const url = prompt('URL do link:') || ''
          if (url) exec('createLink', url)
        }} title="Link">Link</button>
        <button type="button" className="button" onClick={()=>exec('removeFormat')} title="Limpar">Limpar</button>
      </div>
      <div
        ref={ref}
        className="rte-editor"
        contentEditable
        onInput={onInput}
        data-placeholder={placeholder || 'Digite o conteúdo (HTML)'}
        suppressContentEditableWarning
      />
    </div>
  )
}

