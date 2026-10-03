import * as React from "react"

/* ── Paragraph spacing, done with real CSS ────────────────────────────────
   A <textarea> has no paragraph-spacing property: the only knob it exposes is
   line-height, which would loosen the text inside every line. So the fields that
   need room between items (Lista de Problemas, Avaliação, Plano, Subjetivo) are
   rendered as contentEditable blocks instead, where each paragraph is a child
   element with margin-bottom — line-height stays exactly as before. This stylesheet
   is also the single source of truth for how those boxes look, so all of them are
   identical no matter which form renders them. */
const ESTILO_PARAGRAFOS = `
.caixa-paragrafos { display: block; white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; box-sizing: border-box; width: 100%; min-height: 88px; font-family: "Google Sans Flex", "Google Sans", sans-serif; font-weight: 400; font-size: 15px; line-height: 1.45; color: var(--editor-text); background: var(--editor-bg); border: 1px solid var(--editor-border); border-radius: 6px; padding: 6px 8px; resize: vertical; overflow-x: hidden; overflow-y: auto; }
.caixa-paragrafos:focus { border-color: #000000; outline: 1px solid #000000; outline-offset: 0; }
.caixa-paragrafos[data-extrapolada] { background: transparent; }
.caixa-paragrafos[data-extrapolada] > * { color: #ffffff; }
.caixa-paragrafos > * { margin: 0 0 0.36em; }
.caixa-paragrafos > *:last-child { margin-bottom: 0; }
.caixa-paragrafos:empty::before { content: attr(data-placeholder); color: var(--editor-placeholder, #a8a29e); font-style: italic; pointer-events: none; }
`

let estiloInjetado = false
function garantirEstilo() {
    if (estiloInjetado || typeof document === "undefined") return
    estiloInjetado = true
    const estilo = document.createElement("style")
    estilo.setAttribute("data-caixa-paragrafos", "1")
    estilo.textContent = ESTILO_PARAGRAFOS
    document.head.appendChild(estilo)
}
if (typeof document !== "undefined") garantirEstilo()

/* Atalho para os formulários marcarem o campo sem escrever um objeto literal
   aninhado dentro do JSX (o parser do Plasmic não entende `{ { "x": {y} } }`). */
export function dadosCampo(chave: string): Record<string, string> {
    return { "data-campo": chave }
}

function escapar(linha: string): string {
    return linha.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function paragrafosHtml(texto: string): string {
    const linhas = (texto || "").split("\n")
    if (!linhas.length) return "<div><br></div>"
    return linhas.map(l => `<div>${escapar(l) || "<br>"}</div>`).join("")
}

export type CaixaParagrafosProps = {
    value: string
    onChange: (valor: string) => void
    onFocus?: () => void
    onBlur?: (valor: string) => void
    className?: string
    style?: React.CSSProperties
    placeholder?: string
    spellCheck?: boolean
    dados?: Record<string, string | undefined>
}

/* ContentEditable equivalent of the old textarea: one block per line, spaced by
   margin-bottom. The stored text stays one item per line (no blank lines), so
   copy/paste and the serialized note remain clean. */
export function CaixaParagrafos(props: CaixaParagrafosProps) {
    const { value, onChange, onFocus, onBlur, style, placeholder, spellCheck, dados } = props
    const ref = React.useRef<HTMLDivElement | null>(null)
    const emitidoRef = React.useRef<string | null>(null)

    React.useEffect(() => {
        const el = ref.current
        if (!el) return
        if (emitidoRef.current === value) return
        emitidoRef.current = value
        el.innerHTML = paragrafosHtml(value)
    }, [value])

    const ler = React.useCallback(() => {
        const el = ref.current
        if (!el) return ""
        return (el.innerText || "")
            .replace(/\u00A0/g, " ")
            .replace(/\u200B/g, "")
            .split("\n")
            .map(l => l.replace(/\s+$/, ""))
            .join("\n")
            .replace(/\n+$/, "")
    }, [])

    const aoDigitar = React.useCallback(() => {
        const texto = ler()
        emitidoRef.current = texto
        onChange(texto)
    }, [ler, onChange])

    const aoSair = React.useCallback(() => {
        const texto = ler()
        emitidoRef.current = texto
        onChange(texto)
        if (onBlur) onBlur(texto)
    }, [ler, onBlur, onChange])

    const aoColar = React.useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault()
        const texto = (e.clipboardData.getData("text/plain") || "")
            .replace(/\u00A0/g, " ")
            .split("\n")
            .map(l => l.replace(/\s+$/, ""))
            .join("\n")
        document.execCommand("insertHTML", false, paragrafosHtml(texto))
    }, [])

    /* A identidade visual do campo mora no CSS injetado acima, então Avaliação,
       Plano, Lista de Problemas e Subjetivo ficam idênticos sem depender de onde
       cada formulário define seus estilos. */
    const estilo: React.CSSProperties = { ...style }

    return (
        <div
            {...(dados || {})}
            ref={ref}
            className={["caixa-paragrafos", props.className].filter(Boolean).join(" ")}
            contentEditable
            suppressContentEditableWarning
            spellCheck={spellCheck === undefined ? true : spellCheck}
            data-placeholder={placeholder}
            onInput={aoDigitar}
            onBlur={aoSair}
            onPaste={aoColar}
            onFocus={onFocus}
            style={estilo}
        />
    )
}
