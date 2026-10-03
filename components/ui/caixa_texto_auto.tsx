import * as React from "react"

export type CaixaTextoAutoProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    value: string
    onChange: React.ChangeEventHandler<HTMLTextAreaElement>
}

/* Textarea that fits its content: height = max(css min-height, content), so an
   empty field keeps the minimum it always had and a long text opens tall enough
   to be read without an inner scrollbar. It stays `resize: vertical`, and a
   manual drag wins from then on (only growing again if the content overflows). */
export function CaixaTextoAuto(props: CaixaTextoAutoProps) {
    const { value, style, ...rest } = props
    const ref = React.useRef<HTMLTextAreaElement | null>(null)
    const manualRef = React.useRef(false)

    const medir = React.useCallback(() => {
        const el = ref.current
        if (!el) return
        const anterior = el.style.height
        el.style.height = "auto"
        const minimo = parseFloat(window.getComputedStyle(el).minHeight) || 0
        const necessaria = Math.max(el.scrollHeight + 2, minimo)
        el.style.height = anterior
        return { necessaria, atual: el.offsetHeight }
    }, [])

    const ajustar = React.useCallback(() => {
        const medida = medir()
        if (!medida) return
        if (manualRef.current && medida.atual >= medida.necessaria) return
        const el = ref.current
        if (el) el.style.height = `${medida.necessaria}px`
    }, [medir])

    React.useLayoutEffect(() => {
        ajustar()
    }, [ajustar, value])

    /* Web fonts land after the first paint and change the line height. */
    React.useEffect(() => {
        let vivo = true
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
                if (vivo) ajustar()
            })
        }
        return () => {
            vivo = false
        }
    }, [ajustar])

    const aoSoltar = React.useCallback(() => {
        const medida = medir()
        if (!medida) return
        manualRef.current = Math.abs(medida.atual - medida.necessaria) > 2
    }, [medir])

    return <textarea {...rest} ref={ref} value={value} onPointerUp={aoSoltar} style={{ ...style, overflowY: "auto" }} />
}
