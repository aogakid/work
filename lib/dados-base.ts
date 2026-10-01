export interface Antecedentes {
    condicoes: string
    cirurgias: string
    medicamentos: string
    alergias: string
    vacinacao: string
    familiares: string
}

export interface Habitos {
    etilismo: string
    tabagismo: string
    drogas: string
    exercicio: string
    dieta: string
    hidratacao: string
    evacuacoes: string
    diurese: string
    sono: string
    humor: string
    lazer: string
}

export interface DadosBase {
    id: string
    antecedentes: Antecedentes
    habitos: Habitos
}

export interface ListaProblemas {
    ativos: string
    latentes: string
    resolvidos: string
}

export const ANTECEDENTES_VAZIO: Antecedentes = {
    condicoes: "",
    cirurgias: "",
    medicamentos: "",
    alergias: "",
    vacinacao: "",
    familiares: "",
}

export const HABITOS_VAZIO: Habitos = {
    etilismo: "",
    tabagismo: "",
    drogas: "",
    exercicio: "",
    dieta: "",
    hidratacao: "",
    evacuacoes: "",
    diurese: "",
    sono: "",
    humor: "",
    lazer: "",
}

export const DADOS_BASE_VAZIO: DadosBase = {
    id: "",
    antecedentes: ANTECEDENTES_VAZIO,
    habitos: HABITOS_VAZIO,
}

export const LISTA_PROBLEMAS_VAZIO: ListaProblemas = {
    ativos: "",
    latentes: "",
    resolvidos: "",
}

export const HABITOS_CAMPOS: { chave: keyof Habitos; rotulo: string }[] = [
    { chave: "etilismo", rotulo: "Etilismo" },
    { chave: "tabagismo", rotulo: "Tabagismo" },
    { chave: "drogas", rotulo: "Drogas" },
    { chave: "exercicio", rotulo: "Exercício" },
    { chave: "dieta", rotulo: "Dieta" },
    { chave: "hidratacao", rotulo: "Hidratação" },
    { chave: "evacuacoes", rotulo: "Evacuações" },
    { chave: "diurese", rotulo: "Diurese" },
    { chave: "sono", rotulo: "Sono" },
    { chave: "humor", rotulo: "Humor" },
    { chave: "lazer", rotulo: "Lazer" },
]

export const ANTECEDENTES_CAMPOS: { chave: Exclude<keyof Antecedentes, "familiares">; rotulo: string; multilinha: boolean }[] = [
    { chave: "condicoes", rotulo: "Condições", multilinha: true },
    { chave: "cirurgias", rotulo: "Cirurgias", multilinha: true },
    { chave: "medicamentos", rotulo: "Medicamentos", multilinha: true },
    { chave: "alergias", rotulo: "Alergias", multilinha: false },
    { chave: "vacinacao", rotulo: "Vacinação", multilinha: false },
]

/* ── Line parsing helpers ─────────────────────────────────────────── */

const limpar = (texto: string) => (texto || "").replace(/\u00A0/g, " ").replace(/\u200B/g, "")
const paraLinhas = (texto: string) => limpar(texto).split("\n")
const recuo = (linha: string) => (linha.match(/^\s*/)?.[0]?.length ?? 0)

function blocoInterno(linhas: string[], inicio: number, nivel: number): string[] {
    const fora: string[] = []
    for (let i = inicio; i < linhas.length; i += 1) {
        if (!linhas[i].trim()) continue
        if (recuo(linhas[i]) <= nivel) break
        fora.push(linhas[i])
    }
    return fora
}

function blocoRotulo(linhas: string[], re: RegExp): string[] {
    const idx = linhas.findIndex(l => re.test(l))
    if (idx < 0) return []
    return blocoInterno(linhas, idx + 1, recuo(linhas[idx]))
}

function itensLista(bloco: string[]): string {
    return bloco
        .map(l => l.replace(/^\s*-\s*/, "").trim())
        .filter(Boolean)
        .join("\n")
}

function valorInline(bloco: string[], re: RegExp): string {
    for (const linha of bloco) {
        const m = linha.match(re)
        if (m) return (m[1] || "").trim()
    }
    return ""
}

/* An inline field whose overflow lives in nested "- " items below it. */
function campoInlineComItens(bloco: string[], re: RegExp): string {
    const idx = bloco.findIndex(l => re.test(l))
    if (idx < 0) return ""
    const proprio = (bloco[idx].match(re)?.[1] || "").trim()
    const extras = bloco
        .slice(idx + 1)
        .filter(l => !re.test(l))
        .map(l => l.replace(/^\s*-\s*/, "").trim())
        .filter(Boolean)
    return [proprio, ...extras].filter(Boolean).join("\n")
}

/* ── Dados base ───────────────────────────────────────────────────── */

export function parseDadosBase(texto: string): DadosBase {
    const linhas = paraLinhas(texto)

    let id = ""
    const idxId = linhas.findIndex(l => /^\s*-\s*Id\s*:/i.test(l))
    if (idxId >= 0) id = linhas[idxId].replace(/^\s*-\s*Id\s*:\s*/i, "").trim()

    const blocoAntecedentes = blocoRotulo(linhas, /^\s*-\s*Antecedentes\s*:?\s*$/i)
    const blocoPessoais = blocoRotulo(blocoAntecedentes, /^\s*-\s*Pessoais\s*:?\s*$/i)

    const antecedentes: Antecedentes = {
        condicoes: itensLista(blocoRotulo(blocoPessoais, /^\s*-\s*Condi[çc][õo]es\s*:?\s*$/i)),
        cirurgias: itensLista(blocoRotulo(blocoPessoais, /^\s*-\s*Cirurgias\s*:?\s*$/i)),
        medicamentos: itensLista(blocoRotulo(blocoPessoais, /^\s*-\s*Medicamentos\s*:?\s*$/i)),
        alergias: valorInline(blocoPessoais, /^\s*-\s*Alergias\s*:\s*(.*)$/i),
        vacinacao: valorInline(blocoPessoais, /^\s*-\s*Vacina[çc][ãa]o\s*:\s*(.*)$/i),
        familiares: campoInlineComItens(blocoAntecedentes, /^\s*-\s*Familiares\s*:\s*(.*)$/i),
    }

    const blocoHabitos = blocoRotulo(linhas, /^\s*-\s*H[áa]bitos\s*:?\s*$/i)
    const habitos: Habitos = { ...HABITOS_VAZIO }
    HABITOS_CAMPOS.forEach(c => {
        habitos[c.chave] = valorInline(blocoHabitos, new RegExp(`^\\s*-\\s*${c.rotulo}\\s*:\\s*(.*)$`, "i"))
    })

    return { id, antecedentes, habitos }
}

export function extrairLinhaId(texto: string): string {
    return parseDadosBase(texto).id
}

const linhasItens = (rotulo: string, valor: string, nivel: number): string[] => {
    const pad = " ".repeat(nivel)
    const itens = limpar(valor).split("\n").map(l => l.replace(/^\s*-\s*/, "").trim()).filter(Boolean)
    if (!itens.length) return [`${pad}- ${rotulo}`, `${pad}  - `]
    return [`${pad}- ${rotulo}`, ...itens.map(i => `${pad}  - ${i}`)]
}

const linhaCampo = (rotulo: string, valor: string, nivel: number): string => {
    const pad = " ".repeat(nivel)
    return `${pad}- ${rotulo}: ${limpar(valor).trim()}`
}

/* Inline fields that may still hold more than one item: the first goes after the
   colon (as the template does), the rest become nested "- " items below it. */
const linhasCampoInline = (rotulo: string, valor: string, nivel: number): string[] => {
    const pad = " ".repeat(nivel)
    const itens = limpar(valor).split("\n").map(l => l.replace(/^\s*-\s*/, "").trim()).filter(Boolean)
    if (!itens.length) return [`${pad}- ${rotulo}: `]
    return [`${pad}- ${rotulo}: ${itens[0]}`, ...itens.slice(1).map(i => `${pad}  - ${i}`)]
}

export function compositarDadosBase(d: DadosBase): string {
    const partes: string[] = []
    partes.push(`- Id: ${d.id.trim()}`)
    partes.push("- Antecedentes")
    partes.push("  - Pessoais")
    ANTECEDENTES_CAMPOS.forEach(c => {
        const valor = d.antecedentes[c.chave]
        if (c.multilinha) partes.push(...linhasItens(c.rotulo, valor, 4))
        else partes.push(linhaCampo(c.rotulo, valor, 4))
    })
    partes.push(...linhasCampoInline("Familiares", d.antecedentes.familiares, 2))
    partes.push("- Hábitos")
    HABITOS_CAMPOS.forEach(c => partes.push(linhaCampo(c.rotulo, d.habitos[c.chave], 2)))
    return partes.join("\n")
}

/* ── Lista de problemas ───────────────────────────────────────────── */

const CATEGORIAS: { chave: keyof ListaProblemas; rotulo: string }[] = [
    { chave: "ativos", rotulo: "Ativos" },
    { chave: "latentes", rotulo: "Latentes" },
    { chave: "resolvidos", rotulo: "Resolvidos" },
]

export const CATEGORIAS_LISTA = CATEGORIAS

export function parseListaProblemas(texto: string): ListaProblemas {
    const linhas = paraLinhas(texto)
    const saida: ListaProblemas = { ...LISTA_PROBLEMAS_VAZIO }
    CATEGORIAS.forEach(c => {
        const bloco = blocoRotulo(linhas, new RegExp(`^\\s*-\\s*${c.rotulo}\\s*:\\s*$`, "i"))
        saida[c.chave] = itensLista(bloco)
    })
    return saida
}

export function compositarListaProblemas(l: ListaProblemas): string {
    const partes: string[] = []
    CATEGORIAS.forEach(c => {
        partes.push(`- ${c.rotulo}:`)
        const itens = limpar(l[c.chave]).split("\n").map(x => x.replace(/^\s*-\s*/, "").trim()).filter(Boolean)
        if (!itens.length) partes.push("   -  ")
        else itens.forEach(i => partes.push(`   - ${i}`))
    })
    return partes.join("\n")
}