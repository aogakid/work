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
.caixa-paragrafos:focus { border-color: var(--editor-text, #000000); outline: 1px solid var(--editor-text, #000000); outline-offset: 0; }
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

/* ── Block normalization ──────────────────────────────────────────────────
   contentEditable lets the browser put the caret outside the paragraph
   blocks, so typing there creates bare text nodes at the root. Those nodes
   have no block wrapper, so they miss the paragraph spacing and the shared
   block styling. After every edit we move each root-level node that is not a
   block into its own <div>. The original node is moved, not cloned, so the
   caret can be restored at the same position. */
const TAGS_BLOCO = new Set([
    "DIV", "P", "LI", "UL", "OL", "BLOCKQUOTE", "PRE",
    "H1", "H2", "H3", "H4", "H5", "H6",
    "TABLE", "FIGURE", "SECTION", "ARTICLE", "HEADER", "FOOTER",
])

function normalizarParagrafos(el: HTMLDivElement): Set<HTMLDivElement> {
    const criados = new Set<HTMLDivElement>()
    const filhos = Array.from(el.childNodes)
    for (const filho of filhos) {
        if (filho.nodeType === Node.TEXT_NODE) {
            if (!filho.textContent) continue
            const div = document.createElement("div")
            el.insertBefore(div, filho)
            div.appendChild(filho)
            criados.add(div)
            continue
        }
        if (filho.nodeType !== Node.ELEMENT_NODE) continue
        if (TAGS_BLOCO.has((filho as Element).tagName)) continue
        const div = document.createElement("div")
        el.insertBefore(div, filho)
        div.appendChild(filho)
        criados.add(div)
    }
    if (!el.firstChild) {
        const div = document.createElement("div")
        div.appendChild(document.createElement("br"))
        el.appendChild(div)
        criados.add(div)
    }
    return criados
}

type SelecaoSalva = {
    inicio: Node
    inicioOffset: number
    fim: Node
    fimOffset: number
}

function salvarSelecao(el: HTMLDivElement): SelecaoSalva | null {
    if (typeof window === "undefined") return null
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return null
    const range = sel.getRangeAt(0)
    if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) return null
    return {
        inicio: range.startContainer,
        inicioOffset: range.startOffset,
        fim: range.endContainer,
        fimOffset: range.endOffset,
    }
}

/* Quando o cursor está na raiz (por exemplo, logo após apagar tudo) e o nó
   seguinte acabou de virar um bloco, o offset da raiz passa a apontar para
   *antes* do bloco. Restaurar ali faria a próxima digitação criar outro nó
   solto e uma linha em branco. Nesse caso o cursor vai para dentro do bloco,
   na posição onde o nó original estava. */
function mapearPonto(el: HTMLDivElement, no: Node, offset: number, criados: Set<HTMLDivElement>) {
    if (no === el && offset < el.childNodes.length) {
        const filho = el.childNodes[offset]
        if (filho instanceof HTMLDivElement && criados.has(filho)) {
            return { no: filho as Node, offset: 0 }
        }
    }
    return { no, offset }
}

function restaurarSelecao(el: HTMLDivElement, salva: SelecaoSalva | null, criados: Set<HTMLDivElement>) {
    if (!salva || typeof window === "undefined") return
    if (!el.contains(salva.inicio) || !el.contains(salva.fim)) return
    const inicio = mapearPonto(el, salva.inicio, salva.inicioOffset, criados)
    const fim = mapearPonto(el, salva.fim, salva.fimOffset, criados)
    const range = document.createRange()
    try {
        range.setStart(inicio.no, inicio.offset)
        range.setEnd(fim.no, fim.offset)
    } catch {
        return
    }
    const sel = window.getSelection()
    if (!sel) return
    sel.removeAllRanges()
    sel.addRange(range)
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

    /* Normaliza a estrutura antes de ler o texto: assim toda linha vira um
       bloco e o valor salvo continua sendo uma linha por parágrafo. */
    const sincronizar = React.useCallback((normalizar: boolean) => {
        const el = ref.current
        if (!el) return
        if (normalizar) {
            const salva = salvarSelecao(el)
            const criados = normalizarParagrafos(el)
            /* Sem nós movidos a seleção continua intacta; só mexemos nela
               quando a normalização realmente alterou a estrutura. */
            if (criados.size > 0) restaurarSelecao(el, salva, criados)
        }
        const texto = ler()
        emitidoRef.current = texto
        onChange(texto)
    }, [ler, onChange])

    const aoDigitar = React.useCallback((e: React.FormEvent<HTMLDivElement>) => {
        const nativo = e.nativeEvent as InputEvent
        /* Durante composição (IME) o DOM é controlado pelo sistema; mexer
           nele agora quebraria o texto que ainda está sendo composto. */
        sincronizar(!nativo.isComposing)
    }, [sincronizar])

    const aoComporFim = React.useCallback(() => {
        sincronizar(true)
    }, [sincronizar])

    const aoSair = React.useCallback(() => {
        const el = ref.current
        if (el) normalizarParagrafos(el)
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
        sincronizar(true)
    }, [sincronizar])

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
            onCompositionEnd={aoComporFim}
            onBlur={aoSair}
            onPaste={aoColar}
            onFocus={onFocus}
            style={estilo}
        />
    )
}
