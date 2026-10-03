/* ── Clipboard ────────────────────────────────────────────────────────
   `navigator.clipboard` falha quando o documento não está em foco ou o
   contexto não é seguro (Safari, iframes, http). O fallback com um
   textarea fora da tela cobre esses casos. */

export async function escreverClipboard(texto: string): Promise<boolean> {
    if (!texto) return false
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(texto)
            return true
        }
    } catch {
        /* documento sem foco ou contexto inseguro: usa o fallback abaixo */
    }
    try {
        const area = document.createElement("textarea")
        area.value = texto
        area.setAttribute("readonly", "")
        area.style.position = "fixed"
        area.style.top = "0"
        area.style.opacity = "0"
        document.body.appendChild(area)
        area.select()
        const ok = document.execCommand("copy")
        document.body.removeChild(area)
        return ok
    } catch {
        return false
    }
}

/** Lê a área de transferência, ou `null` quando não dá para ler. */
export async function lerClipboard(): Promise<string | null> {
    /* `navigator.clipboard` só existe em contexto seguro (https/localhost) e
       `readText` ainda exige a permissão `clipboard-read` — que o preview do
       Plasmic não concede dentro do iframe. Não há fallback possível para
       leitura: quem consegue colar é o próprio navegador, via Ctrl/Cmd+V. */
    if (typeof navigator === "undefined") return null
    if (!navigator.clipboard || !navigator.clipboard.readText) return null
    try {
        return await navigator.clipboard.readText()
    } catch {
        return null
    }
}

export const AVISO_CLIPBOARD_BLOQUEADO = "a leitura da área de transferência não está disponível aqui — cole com Ctrl/Cmd+V"
