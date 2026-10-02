/* Subjetivo — a list of "motivo" items, each with a single-line title and a
   text box underneath. Serialised as a numbered first-level list with the text
   box as its second level:

       - Acompanhante: <acompanhante>
       1. <motivo>
          - <texto>
       2. <motivo>
          - <texto>

   Anything the clinician (or a module) writes below the motivos is kept
   verbatim in `extras` and appended again on compose, so gestação, hábitos de
   vida and friends survive a round trip through the form. */

export interface SubjetivoMotivo {
    motivo: string
    texto: string
}

export interface Subjetivo {
    acompanhante: string
    motivos: SubjetivoMotivo[]
    extras: string[]
}

export const MOTIVO_VAZIO: SubjetivoMotivo = { motivo: "", texto: "" }

export const SUBJETIVO_VAZIO: Subjetivo = { acompanhante: "", motivos: [{ motivo: "", texto: "" }], extras: [] }

/* Acompanhante comes from the old "- Fonte:" line of Subjetivo; where the
   consultation came from is now implicit in the motivo text boxes. */
const RE_ACOMPANHANTE = /^-\s*(?:Fonte|Acompanhante|Fonte\s*\/\s*Acompanhante)\s*:\s*(.*)$/i
const RE_NUM = /^(\d+)\.\s*(.*)$/
const RE_MOTIVO_LEGADO = /^-\s*Motivo\s*\d*\s*:\s*(.*)$/i
const RE_SUB_ITEM = /^\s+[-*]\s?(.*)$/

const limpar = (texto: string) => (texto || "").replace(/\u00A0/g, " ").replace(/\u200B/g, "")
const recuo = (linha: string) => linha.match(/^\s*/)?.[0]?.length ?? 0

export function parseSubjetivo(texto: string): Subjetivo {
    const linhas = limpar(texto).split("\n")
    const motivos: SubjetivoMotivo[] = []
    const extras: string[] = []
    let acompanhante = ""

    for (let i = 0; i < linhas.length; i += 1) {
        const linha = linhas[i]
        if (!linha.trim()) continue

        const mAcomp = linha.match(RE_ACOMPANHANTE)
        if (mAcomp) { acompanhante = mAcomp[1].trim(); continue }

        const mNum = linha.match(RE_NUM)
        const mLegado = linha.match(RE_MOTIVO_LEGADO)
        const proximaLinha = linhas[i + 1] || ""
        const motivoPlano = !/^\s*[-*]\s/.test(linha) && (/^\s*-\s/.test(proximaLinha) || /^\s*".*"\s*$/.test(linha))
        if (mNum || mLegado || motivoPlano) {
            const motivo = (mNum ? mNum[2] : mLegado ? mLegado[1] : linha.trim()) || ""
            const textos: string[] = []
            let j = i + 1
            while (j < linhas.length) {
                const prox = linhas[j]
                if (!prox.trim()) { j += 1; continue }
                if (motivoPlano ? !/^\s*-\s/.test(prox) : recuo(prox) === 0) break
                const mItem = prox.match(RE_SUB_ITEM) || prox.match(/^\s*[-*]\s?(.*)$/)
                textos.push(mItem ? mItem[1] : prox.trim())
                j += 1
            }
            i = j - 1
            motivos.push({ motivo: motivo.replace(/^\"(.*)\"$/, "$1"), texto: textos.join("\n") })
            continue
        }

        extras.push(linha)
    }

    if (motivos.length === 0) motivos.push({ ...MOTIVO_VAZIO })
    return { acompanhante, motivos, extras }
}

const linhasTexto = (texto: string): string[] => {
    const partes = texto.split("\n")
    while (partes.length && !partes[partes.length - 1].trim()) partes.pop()
    return partes.map(p => "- " + p.replace(/^\s*[-*]\s*/, ""))
}

export function compositarSubjetivo(s: Subjetivo): string {
    const partes: string[] = []
    if (s.acompanhante.trim()) partes.push("- Acompanhante: " + s.acompanhante.trim())
    s.motivos.forEach(m => {
        const motivo = m.motivo.trim().replace(/^\s*[-*]\s*/, "").replace(/^\"(.*)\"$/, "$1")
        if (motivo) {
            if (partes.length) partes.push("")
            partes.push(`"${motivo}"`)
        }
        const textos = linhasTexto(m.texto)
        partes.push(...textos)
    })
    if (s.extras.length) partes.push(...s.extras)
    return partes.join("\n")
}
