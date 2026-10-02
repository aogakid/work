export interface Antecedentes {
    cirurgias: string
    vacinacao: string
    obstetrico: string
    dum: string
    familiares: string
}

export interface Medicamentos {
    lista: string
    alergias: string
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
    medicamentos: Medicamentos
    habitos: Habitos
}

export interface ListaProblemas {
    texto: string
}

export const ANTECEDENTES_VAZIO: Antecedentes = {
    cirurgias: "",
    vacinacao: "",
    obstetrico: "",
    dum: "",
    familiares: "",
}

export const MEDICAMENTOS_VAZIO: Medicamentos = {
    lista: "",
    alergias: "",
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
    medicamentos: MEDICAMENTOS_VAZIO,
    habitos: HABITOS_VAZIO,
}

export const LISTA_PROBLEMAS_VAZIO: ListaProblemas = {
    texto: "",
}

export const HABITOS_CAMPOS: { chave: keyof Habitos; rotulo: string; sempreVisivel: boolean }[] = [
    { chave: "etilismo", rotulo: "Etilismo", sempreVisivel: true },
    { chave: "tabagismo", rotulo: "Tabagismo", sempreVisivel: true },
    { chave: "drogas", rotulo: "Drogas", sempreVisivel: false },
    { chave: "exercicio", rotulo: "Exercício", sempreVisivel: false },
    { chave: "dieta", rotulo: "Dieta", sempreVisivel: false },
    { chave: "hidratacao", rotulo: "Hidratação", sempreVisivel: false },
    { chave: "evacuacoes", rotulo: "Evacuações", sempreVisivel: false },
    { chave: "diurese", rotulo: "Diurese", sempreVisivel: false },
    { chave: "sono", rotulo: "Sono", sempreVisivel: false },
    { chave: "humor", rotulo: "Humor", sempreVisivel: false },
    { chave: "lazer", rotulo: "Lazer", sempreVisivel: false },
]

export const ANTECEDENTES_CAMPOS: { chave: Exclude<keyof Antecedentes, "familiares" | "obstetrico" | "dum">; rotulo: string; multilinha: boolean }[] = [
    { chave: "cirurgias", rotulo: "Cirurgias", multilinha: true },
    { chave: "vacinacao", rotulo: "Vacinação", multilinha: false },
]

export const MEDICAMENTOS_CAMPOS: { chave: keyof Medicamentos; rotulo: string; multilinha: boolean }[] = [
    { chave: "lista", rotulo: "Em uso", multilinha: true },
    { chave: "alergias", rotulo: "Alergias", multilinha: false },
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
    if (!bloco.length) return ""
    const linhas = bloco.map(l => l.replace(/^\s*-\s*/, ""))
    if (!linhas.some(l => l.trim())) return ""
    return linhas.join("\n")
}

function valorInline(bloco: string[], re: RegExp): string {
    for (const linha of bloco) {
        const m = linha.match(re)
        if (m) return m[1] || ""
    }
    return ""
}

/* An inline field whose overflow lives in nested "- " items below it. */
function campoInlineComItens(bloco: string[], re: RegExp): string {
    const idx = bloco.findIndex(l => re.test(l))
    if (idx < 0) return ""
    const proprio = bloco[idx].match(re)?.[1] || ""
    const extras = bloco
        .slice(idx + 1)
        .filter(l => !re.test(l))
        .map(l => l.replace(/^\s*-\s*/, ""))
    const todos = [proprio, ...extras]
    if (!todos.some(s => s.trim())) return ""
    return todos.join("\n")
}

/* ── Dados base ───────────────────────────────────────────────────── */

export function parseDadosBase(texto: string): DadosBase {
    const linhas = paraLinhas(texto)

    let id = ""
    const idxId = linhas.findIndex(l => /^\s*-\s*Id\s*:/i.test(l))
    if (idxId >= 0) id = linhas[idxId].replace(/^\s*-\s*Id\s*:\s*/i, "")

    const cabecalhosPlanos = ["Antecedentes", "Pessoais", "Cirurgias", "Medicamentos", "Em uso", "Hábitos"]
    if (linhas.some(l => cabecalhosPlanos.includes(l.trim().replace(/^[-*]\s*/, "")))) {
        const indice = (nome: string) => linhas.findIndex(l => l.trim().replace(/^[-*]\s*/, "") === nome)
        const indiceMedicamentos = indice("Medicamentos")
        const indiceHabitos = indice("Hábitos")
        const fimAntecedentes = indiceMedicamentos >= 0 ? indiceMedicamentos : (indiceHabitos >= 0 ? indiceHabitos : linhas.length)
        const limparMarcador = (l: string) => l.trim().replace(/^[-*]\s*/, "")
        const indiceCirurgias = indice("Cirurgias")
        const indiceObstetrico = linhas.findIndex((l, i) => i > indiceCirurgias && i < fimAntecedentes && /^\s*-\s*Obst[ée]trico\s*$/i.test(l))
        const indiceDum = linhas.findIndex((l, i) => i > indiceCirurgias && i < fimAntecedentes && /^\s*-\s*DUM\s*:/i.test(l))
        const indiceVacina = linhas.findIndex((l, i) => i > indiceCirurgias && i < fimAntecedentes && /^\s*-\s*Vacina[çc][ãa]o\s*:/i.test(l))
        const indiceFamiliares = linhas.findIndex((l, i) => i > indiceCirurgias && i < fimAntecedentes && /^\s*-\s*Familiares\s*:/i.test(l))
        const limiteCirurgias = [indiceVacina, indiceFamiliares, indiceMedicamentos].filter(i => i >= 0).reduce((a, b) => Math.min(a, b), indiceMedicamentos)
        const cirurgias = indiceCirurgias >= 0 ? linhas.slice(indiceCirurgias + 1, limiteCirurgias).map(limparMarcador).filter(Boolean).join("\n") : ""
        const blocoAntecedentesFim = fimAntecedentes
        const familiares = indiceFamiliares >= 0
            ? linhas.slice(indiceFamiliares, blocoAntecedentesFim).map(limparMarcador).map(l => l.replace(/^Familiares\s*:\s*/i, "")).filter(Boolean).join("\n")
            : ""
        const indiceEmUso = indice("Em uso")
        const indiceAlergias = linhas.findIndex((l, i) => i > indiceEmUso && /^\s*-\s*Alergias\s*:/i.test(l))
        const medicamentosFim = indiceHabitos >= 0 ? indiceHabitos : linhas.length
        const medicamentos = indiceEmUso >= 0
            ? linhas.slice(indiceEmUso + 1, indiceAlergias >= 0 ? indiceAlergias : medicamentosFim).map(limparMarcador).filter(Boolean).join("\n")
            : ""
        const alergias = indiceAlergias >= 0 ? linhas[indiceAlergias].replace(/^\s*-\s*Alergias\s*:\s*/i, "") : ""
        const habitos: Habitos = { ...HABITOS_VAZIO }
        if (indiceHabitos >= 0) {
            HABITOS_CAMPOS.forEach(c => {
                const re = new RegExp(`^${c.rotulo}\\s*:\\s*(.*)$`, "i")
                habitos[c.chave] = linhas.slice(indiceHabitos + 1).map(l => limparMarcador(l).match(re)?.[1] || "").find(Boolean) || ""
            })
        }
        return {
            id,
            antecedentes: {
                cirurgias,
                vacinacao: indiceVacina >= 0 ? linhas[indiceVacina].replace(/^\s*-\s*Vacina[çc][ãa]o\s*:\s*/i, "") : "",
                obstetrico: indiceObstetrico >= 0 ? linhas.slice(indiceObstetrico + 1, indiceDum >= 0 ? indiceDum : indiceMedicamentos).map(limparMarcador).filter(Boolean).join("\n") : "",
                dum: indiceDum >= 0 ? linhas[indiceDum].replace(/^\s*-\s*DUM\s*:\s*/i, "") : "",
                familiares,
            },
            medicamentos: { lista: medicamentos, alergias },
            habitos,
        }
    }

    const blocoAntecedentes = blocoRotulo(linhas, /^\s*-\s*Antecedentes\s*:?\s*$/i)
    const blocoPessoais = blocoRotulo(blocoAntecedentes, /^\s*-\s*Pessoais\s*:?\s*$/i)

    const antecedentes: Antecedentes = {
        cirurgias: itensLista(blocoRotulo(blocoPessoais, /^\s*-\s*Cirurgias\s*:?\s*$/i)),
        vacinacao: valorInline(blocoPessoais, /^\s*-\s*Vacina[çc][ãa]o\s*:\s*(.*)$/i),
        obstetrico: itensLista(blocoRotulo(blocoPessoais, /^\s*-\s*Obst[ée]trico\s*:?\s*$/i)),
        dum: valorInline(blocoPessoais, /^\s*-\s*DUM\s*:\s*(.*)$/i),
        familiares: campoInlineComItens(blocoAntecedentes, /^\s*-\s*Familiares\s*:\s*(.*)$/i),
    }

    let blocoMedicamentos = blocoRotulo(linhas, /^\s*-\s*Medicamentos\s*:?\s*$/i)
    if (!blocoMedicamentos.length) {
        blocoMedicamentos = blocoRotulo(blocoPessoais, /^\s*-\s*Medicamentos\s*:?\s*$/i)
    }

    let alergias = valorInline(blocoMedicamentos, /^\s*-\s*Alergias\s*:\s*(.*)$/i)
    if (!alergias) {
        alergias = valorInline(blocoPessoais, /^\s*-\s*Alergias\s*:\s*(.*)$/i)
    }

    const blocoListaMedicamentos = blocoMedicamentos.filter(l => !/^\s*-\s*Alergias\s*:/i.test(l))
    let blocoLista = blocoRotulo(blocoListaMedicamentos, /^\s*-\s*(?:Lista|Em uso)\s*:?\s*$/i)
    if (!blocoLista.length) {
        blocoLista = blocoListaMedicamentos
    }

    const medicamentos: Medicamentos = {
        lista: itensLista(blocoLista),
        alergias,
    }

    const blocoHabitos = blocoRotulo(linhas, /^\s*-\s*H[áa]bitos\s*:?\s*$/i)
    const habitos: Habitos = { ...HABITOS_VAZIO }
    HABITOS_CAMPOS.forEach(c => {
        habitos[c.chave] = valorInline(blocoHabitos, new RegExp(`^\\s*-\\s*${c.rotulo}\\s*:\\s*(.*)$`, "i"))
    })

    return { id, antecedentes, medicamentos, habitos }
}

export function extrairLinhaId(texto: string): string {
    return parseDadosBase(texto).id
}

const linhasItens = (rotulo: string, valor: string, nivel: number): string[] => {
    const pad = " ".repeat(nivel)
    const val = limpar(valor)
    if (!val.trim()) return []
    const itens = val.split("\n").map(l => l.replace(/^\s*-\s*/, ""))
    return [`${pad}- ${rotulo}`, ...itens.map(i => `${pad}  - ${i}`)]
}

const linhaCampo = (rotulo: string, valor: string, nivel: number): string => {
    const pad = " ".repeat(nivel)
    const val = limpar(valor)
    if (!val.trim()) return ""
    return val.split("\n").map((item, i) => `${pad}- ${i === 0 ? `${rotulo}: ` : ""}${item.replace(/^\s*-\s*/, "")}`).join("\n")
}

/* Inline fields that may still hold more than one item: the first goes after the
   colon (as the template does), the rest become nested "- " items below it. */
const linhasCampoInline = (rotulo: string, valor: string, nivel: number): string[] => {
    const pad = " ".repeat(nivel)
    const val = limpar(valor)
    if (!val.trim()) return []
    const itens = val.split("\n").map(l => l.replace(/^\s*-\s*/, ""))
    return itens.map((item, i) => `${pad}- ${i === 0 ? `${rotulo}: ` : ""}${item}`)
}

export function compositarDadosBase(d: DadosBase): string {
    const partes: string[] = []
    if (d.id.trim()) partes.push(`- Id: ${d.id}`)
    const hasAntecedentes = ANTECEDENTES_CAMPOS.some(c => d.antecedentes[c.chave].trim()) || d.antecedentes.obstetrico.trim() || d.antecedentes.dum.trim() || d.antecedentes.familiares.trim()
    if (hasAntecedentes) {
        if (partes.length) partes.push("")
        partes.push("Antecedentes")
        const hasPessoais = ANTECEDENTES_CAMPOS.some(c => d.antecedentes[c.chave].trim()) || d.antecedentes.obstetrico.trim() || d.antecedentes.dum.trim()
        if (hasPessoais) partes.push("- Pessoais")
        ANTECEDENTES_CAMPOS.forEach(c => {
            const valor = d.antecedentes[c.chave]
            if (c.multilinha && hasPessoais) partes.push(...linhasItens(c.rotulo, valor, 2))
            else if (!c.multilinha) { const linha = linhaCampo(c.rotulo, valor, 2); if (linha) partes.push(...linha.split("\n")) }
        })
        partes.push(...linhasItens("Obstétrico", d.antecedentes.obstetrico, 2))
        const dum = linhaCampo("DUM", d.antecedentes.dum, 2)
        if (dum) partes.push(...dum.split("\n"))
        partes.push(...linhasCampoInline("Familiares", d.antecedentes.familiares, 0))
    }
    const hasMedicamentos = MEDICAMENTOS_CAMPOS.some(c => d.medicamentos[c.chave].trim())
    if (hasMedicamentos) {
        if (partes.length) partes.push("")
        partes.push("Medicamentos")
        MEDICAMENTOS_CAMPOS.forEach(c => {
            const valor = d.medicamentos[c.chave]
            if (c.multilinha) partes.push(...linhasItens(c.rotulo, valor, 0))
            else { const linha = linhaCampo(c.rotulo, valor, 0); if (linha) partes.push(...linha.split("\n")) }
        })
    }
    const hasHabitos = HABITOS_CAMPOS.some(c => d.habitos[c.chave].trim())
    if (hasHabitos) {
        if (partes.length) partes.push("")
        partes.push("Hábitos")
        HABITOS_CAMPOS.forEach(c => {
            const linha = linhaCampo(c.rotulo, d.habitos[c.chave], 0)
            if (linha) partes.push(...linha.split("\n"))
        })
    }
    return partes.join("\n")
}

/* ── Lista de problemas ───────────────────────────────────────────── */

export function parseListaProblemas(texto: string): ListaProblemas {
    const limpo = (texto || "").replace(/\u00A0/g, " ").replace(/\u200B/g, "")
    if (!limpo.trim()) return { texto: "" }

    const linhas = limpo.split("\n")
    const itens: string[] = []
    for (const l of linhas) {
        const t = l.trim()
        if (/^\s*-\s*(Ativos|Latentes|Resolvidos)\s*:?\s*$/i.test(t)) {
            continue
        }
        if (t) {
            itens.push(t.replace(/^\s*-\s*/, ""))
        }
    }
    return { texto: itens.join("\n") }
}

export function compositarListaProblemas(l: ListaProblemas): string {
    const val = (l.texto || "").replace(/\u00A0/g, " ").replace(/\u200B/g, "").trim()
    if (!val) return ""
    const linhas = val.split("\n")
    return linhas.map(x => `- ${x.replace(/^\s*-\s*/, "")}`).join("\n")
}
