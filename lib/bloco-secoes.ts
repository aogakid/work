import { compositarDadosBase, parseDadosBase } from "./dados-base"

/* ── Estrutura da nota ────────────────────────────────────────────────
   Modelo do documento e as funções puras de parse/merge. Ficam fora do
   componente para poderem ser testadas com um arquivo de exemplo real. */

export interface Section {
    id: string
    title: string
    content: string
    collapsed: boolean
    optional: boolean
    enabled: boolean
}

export const SECTION_META: { id: string; title: string; label: string; letter: string; color: string; bg: string; border: string; optional: boolean; formulario: "dados_base" | "lista_problemas" | "subjetivo" | "objetivo" | null; coluna: "esquerda" | "direita" }[] = [
    { id: "dados_base", title: "Dados base", label: "Dados base", letter: "D", color: "#8b5cf6", bg: "rgba(139,92,246,0.06)", border: "rgba(139,92,246,0.18)", optional: false, formulario: "dados_base", coluna: "esquerda" },
    { id: "lista_problemas", title: "Lista de Problemas/Condições", label: "Lista de Problemas/Condições", letter: "L", color: "#6366f1", bg: "rgba(99,102,241,0.06)", border: "rgba(99,102,241,0.18)", optional: false, formulario: "lista_problemas", coluna: "esquerda" },
    { id: "subjetivo", title: "Subjetivo", label: "Subjetivo", letter: "S", color: "#3b82f6", bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.18)", optional: false, formulario: "subjetivo", coluna: "direita" },
    { id: "objetivo", title: "Objetivo", label: "Objetivo", letter: "O", color: "#22c55e", bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.18)", optional: true, formulario: "objetivo", coluna: "direita" },
    { id: "avaliacao", title: "Avaliação", label: "Avaliação", letter: "A", color: "#eab308", bg: "rgba(234,179,8,0.06)", border: "rgba(234,179,8,0.18)", optional: false, formulario: null, coluna: "direita" },
    { id: "plano", title: "Plano", label: "Plano", letter: "P", color: "#f97316", bg: "rgba(249,115,22,0.06)", border: "rgba(249,115,22,0.18)", optional: false, formulario: null, coluna: "direita" },
]

/* ── Parse / Merge ───────────────────────────────────────────────── */
const INITIAL_SECTIONS: Section[] = SECTION_META.map(m => ({
    id: m.id,
    title: m.title,
    content: "",
    collapsed: false,
    optional: m.optional,
    enabled: true,
}))

export function createDefaultSections(): Section[] {
    return INITIAL_SECTIONS.map(s => ({ ...s }))
}

/* ── Casamento dos títulos ───────────────────────────────────────────
   O texto colado vem deProntuário, arrumador e de versões antigas do editor,
   então o título nem sempre é exatamente o nosso. "## Lista de Problemas"
   precisa cair em "Lista de Problemas/Condições", "## Conduta" em "Plano", etc. */

export function normalizarChave(texto: string): string {
    return (texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
}

const ALIAS_SECOES: Record<string, string[]> = {
    dados_base: ["dados base", "dados", "identificacao", "dados do paciente", "cabecalho"],
    lista_problemas: ["lista de problemas", "lista de problemas e condicoes", "problemas", "problemas e condicoes", "condicoes", "lista de condicoes", "diagnostico", "diagnosticos", "hipoteses diagnosticas"],
    subjetivo: ["subjetivo", "anamnese", "queixas", "queixa principal", "historia", "subjetivo e antecedentes"],
    objetivo: ["objetivo", "exame fisico", "exame objetivo", "achados", "objetivo exame fisico", "exames"],
    avaliacao: ["avaliacao", "impressao", "avaliacao clinica", "sindrome", "sintese"],
    plano: ["plano", "conduta", "condutas", "plano terapeutico", "orientacoes", "medidas terapeuticas"],
}

function resolverSecao(chave: string, sections: Section[]): Section | undefined {
    const exata = sections.find(s => normalizarChave(s.title) === chave)
    if (exata) return exata
    const porAlias = Object.keys(ALIAS_SECOES).find(id => ALIAS_SECOES[id].some(a => normalizarChave(a) === chave))
    if (porAlias) return sections.find(s => s.id === porAlias)
    /* Um título contém o outro: "lista de problemas" ⊂ "lista de problemas condicoes". */
    if (chave.length >= 4) {
        const contido = sections.find(s => {
            const titulo = normalizarChave(s.title)
            return titulo.length >= 4 && (titulo.includes(chave) || chave.includes(titulo))
        })
        if (contido) return contido
    }
    return undefined
}

/* O merge do bloco escreve "---" antes do SOAP e prefixa "- " em Avaliação/Plano.
   Colar o próprio texto de volta não pode deixar esses artefatos na nota. */
function limparArtefatosDeMerge(id: string, texto: string): string {
    const semSeparadores = texto.split("\n").filter(l => !/^\s*-{3,}\s*$/.test(l)).join("\n").trim()
    if (id === "avaliacao" || id === "plano") {
        return semSeparadores
            .split("\n")
            .map(l => l.replace(/^\s*[-*]\s+/, "").trimEnd())
            .join("\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim()
    }
    return semSeparadores
}

export function parseSections(text: string): { title: string; sections: Section[] } {
    const cleaned = (text || "").replace(/\u00A0/g, " ").replace(/\u200B/g, "").replace(/\u00D7/g, "x")
    if (!cleaned.trim()) return { title: "", sections: createDefaultSections() }

    const lines = cleaned.split("\n")
    let title = ""
    let bodyStart = 0

    if (lines[0]?.startsWith("# ") && !lines[0]?.startsWith("## ")) {
        title = lines[0].substring(2).trim()
        bodyStart = 1
    }

    const body = lines.slice(bodyStart).join("\n")
    const sectionChunks = body.split(/^## /m)

    const sections = createDefaultSections()
    const extraChunks: string[] = []
    /* Old notes used a standalone "## Id:" heading; it is now folded into
       Dados base as its "- Id:" line. */
    let idLegado = ""
    for (const chunk of sectionChunks) {
        /* Um chunk que só tem "---" é o separador do merge (ou um heading vazio):
           não é uma seção e não pode virar conteúdo de nada. */
        if (!chunk.split("\n").some(l => l.trim() && !/^\s*-{3,}\s*$/.test(l))) continue
        const newlineIdx = chunk.indexOf("\n")
        const header = (newlineIdx >= 0 ? chunk.substring(0, newlineIdx) : chunk).trim().replace(/:\s*$/, "")
        const content = newlineIdx >= 0 ? chunk.substring(newlineIdx + 1) : ""
        const chave = normalizarChave(header)
        if (!chave) continue
        if (chave === "id" || chave === "id:") {
            idLegado = content.trim()
            continue
        }
        const match = resolverSecao(chave, sections)
        if (match) {
            match.content = limparArtefatosDeMerge(match.id, content)
        } else if (content.trim()) {
            /* Seção desconhecida: entra no fim do Plano como texto simples. Não
               reintroduzimos um "## " aqui, senão o próximo round-trip de colar
               abriria um chunk novo (e um "## " vazio) e o junk se acumularia. */
            const limpo = limparArtefatosDeMerge("extra", content)
            extraChunks.push(header.trim() ? `${header.trim()}\n${limpo}` : limpo)
        }
    }

    /* Move "- Id:" / "Id:" out of Subjetivo into Dados base (legacy migration). */
    const dadosBase = sections.find(s => s.id === "dados_base")
    const subjetivo = sections.find(s => s.id === "subjetivo")
    if (dadosBase && subjetivo && subjetivo.content) {
        const linhas = subjetivo.content.split("\n")
        const idxId = linhas.findIndex(l => /^\s*-\s*Id\s*:/i.test(l))
        if (idxId >= 0) {
            const valor = linhas[idxId].replace(/^\s*-\s*Id\s*:\s*/i, "").trim()
            if (valor && !idLegado) idLegado = valor
            linhas.splice(idxId, 1)
            subjetivo.content = linhas.join("\n").trim()
        }
    }
    if (dadosBase && idLegado) dadosBase.content = compositarDadosBase({ ...parseDadosBase(dadosBase.content), id: idLegado })

    if (extraChunks.length) {
        const plano = sections.find(s => s.id === "plano")
        if (plano) {
            const extra = extraChunks.join("\n\n")
            plano.content = plano.content ? plano.content + "\n\n" + extra : extra
        }
    }


    return { title, sections }
}

export function mergeSections(title: string, sections: Section[]): string {
    const parts: string[] = []
    if (title.trim()) parts.push(`# ${title.trim()}`)
    let separadorSoapAdicionado = false
    for (const s of sections) {
        if (!s.enabled && s.optional) continue
        if (s.content.trim()) {
            if (!separadorSoapAdicionado && ["subjetivo", "objetivo", "avaliacao", "plano"].includes(s.id)) {
                parts.push("---")
                separadorSoapAdicionado = true
            }
            const content = ["avaliacao", "plano"].includes(s.id)
                ? s.content.split("\n").map(l => l.trim() ? `- ${l.replace(/^\s*-\s*/, "")}` : "").join("\n")
                : s.content
            parts.push(`## ${s.title}\n${content}`)
        }
    }
    return parts.join("\n\n")
}


