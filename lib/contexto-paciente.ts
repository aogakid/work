export interface IdentificacaoCampos {
    nome: string
    idade: string
    idadeUnidade: "D" | "M" | "A"
    sexo: string
    estadoCivil: string
    composicao: string
    religiao: string
    escolaridade: string
    ocupacao: string
    naturalidade: string
    residencia: string
    procedencia: string
    acs: string
}

export interface ContextoPaciente {
    sexo: "M" | "F" | ""
    idade: number | null
}

export const CONTEXTO_VAZIO: ContextoPaciente = { sexo: "", idade: null }

export const OPCOES_SEXO: { valor: "M" | "F"; rotulo: string }[] = [
    { valor: "M", rotulo: "M" },
    { valor: "F", rotulo: "F" },
]

export const OPCOES_ESTADO_CIVIL = [
    "solteiro(a)",
    "casado(a)",
    "união estável",
    "separado(a)",
    "divorciado(a)",
    "viúvo(a)",
]

export const OPCOES_ESCOLARIDADE = [
    "creche",
    "ensino infantil",
    "analfabeto",
    "alfabetizado",
    "ensino fundamental incompleto",
    "ensino fundamental completo",
    "ensino médio incompleto",
    "ensino médio completo",
    "ensino superior incompleto",
    "ensino superior completo",
    "pós-graduação",
]

export const IDENTIFICACAO_VAZIA: IdentificacaoCampos = {
    nome: "",
    idade: "",
    idadeUnidade: "A",
    sexo: "",
    estadoCivil: "",
    composicao: "",
    religiao: "",
    escolaridade: "",
    ocupacao: "",
    naturalidade: "",
    residencia: "",
    procedencia: "",
    acs: "",
}

export function compositarIdentificacao(c: IdentificacaoCampos): string {
    const partes: string[] = []
    if (c.nome.trim()) partes.push(c.nome)
    if (c.idade.trim()) {
        const valor = Number.parseInt(c.idade.trim(), 10)
        const unidade = c.idadeUnidade || "A"
        const unidades = unidade === "D" ? (valor === 1 ? "dia" : "dias") : unidade === "M" ? (valor === 1 ? "mês" : "meses") : (valor === 1 ? "ano" : "anos")
        partes.push(`${c.idade.trim()} ${unidades}`)
    }
    if (c.estadoCivil.trim()) partes.push(c.estadoCivil)
    if (c.composicao.trim()) partes.push(c.composicao)
    if (c.religiao.trim()) partes.push(c.religiao)
    if (c.escolaridade.trim()) partes.push(c.escolaridade)
    if (c.ocupacao.trim()) partes.push(c.ocupacao)
    if (c.naturalidade.trim() && c.residencia.trim() && c.naturalidade.trim().toLocaleLowerCase() === c.residencia.trim().toLocaleLowerCase()) {
        partes.push("natural e residente em " + c.naturalidade)
    } else {
        if (c.naturalidade.trim()) partes.push("natural de " + c.naturalidade)
        if (c.residencia.trim()) partes.push("residente em " + c.residencia)
    }
    if (c.procedencia.trim()) partes.push("procedente de " + c.procedencia)
    if (c.acs.trim()) partes.push("ACS " + c.acs)
    return partes.join(", ")
}

const RE_ACS = /^acs\s+(.+)$/i
const RE_NAT_DE = /^natural\s+de\s+(.+)$/i
const RE_NAT_OURO = /^natural\s+(?:d[o]?[sa]?\s+)?(.+)$/i
const RE_RES = /^residente\s+(?:em|de)\s+(.+)$/i
const RE_IDADE = /^(\d{1,3})\s*(anos?|mes(?:es)?|m[eê]s|dias?)$/i
const RE_SEXO = /^[MF]$/
const RE_RELIGIAO = /^(cat[oó]lico|evang[eé]lico|esp[íi]rito de sonho|ateu|sem religi[ãa]o|outra)$/i
const RE_ESCOLARIDADE = /^(creche|ensino\s+infantil|ensino\s\w+|p[óo]s[-\s]gradua[çc][ãa]o|n[ãa]o\s+frequentou\s+a\s+escola|sem\s+instru[çc][ãa]o|alfabetizado(\s+e\s+alfab[eé]tico)?|analfabeto|nunca\s+frequentou)/i
const RE_OCUPACAO = /(aut[ôo]nom|aposentad|desempreg|professor|estudante|do lar|comerciante|agricultor|[ãa]ritm|mar [|â]timo|advogad|m[eé]dic|enfermeir|pediatr|odontolog|farmac[eê]utic|arquitet|engenheir|contador|advog)/i
const RE_COMPOSICAO = /(mora com|mora sozinho|vive com|tem \d|filh)/i
const RE_ESTADO_CIVIL = /^(solteir[oa]\s*\(\s*[ao]?\s*\)|solteir[oa]?|casad[oa]\s*\(\s*[ao]?\s*\)|casad[oa](\s+com\s+.+)?|uni[ãa]o\s+est[áa]vel|[úu]ni[ãa]o\s+est[áa]vel|separad[oa]\s*\(\s*[ao]?\s*\)|separad[oa](\s+de\s+.+)?|divorciad[oa]\s*\(\s*[ao]?\s*\)|divorciad[oa]|vi[úu]v[oa]\s*\(\s*[ao]?\s*\)|vi[úu]v[oa]?|amig[oa]s?\s+de\s+.+)$/i
/* Acompanhante moved to Subjetivo's Fonte. The pattern stays just to discard
   the segment from older records instead of letting it fall through to the
   occupation/composição heuristics. */
const RE_ACOMPANHANTE = /^acompanh(?:ante|amento)\s*:\s*(.+)$/i
const RE_PROCEDENCIA = /^procedente\s+de\s+(.+)$/i
const RE_PROCEDENCIA_LEGADO = /^proced[eê]ncia:?\s*(.+)$/i

export function parseIdentificacao(linha: string): IdentificacaoCampos {
    const campos: IdentificacaoCampos = { ...IDENTIFICACAO_VAZIA }
    const segmentos = (linha || "").split(",").map(s => s.trim()).filter(Boolean)
    const restantes: string[] = []

    for (const seg of segmentos) {
        let m = seg.match(RE_ACS)
        if (m) { campos.acs = m[1]; continue }
        m = seg.match(/^natural\s+e\s+residente\s+em\s+(.+)$/i)
        if (m) { campos.naturalidade = m[1]; campos.residencia = m[1]; continue }
        m = seg.match(RE_NAT_DE)
        if (m) { campos.naturalidade = m[1]; continue }
        m = seg.match(RE_NAT_OURO)
        if (m) { campos.naturalidade = m[1]; continue }
        m = seg.match(RE_RES)
        if (m) { campos.residencia = m[1]; continue }
        m = seg.match(RE_IDADE)
        if (m) {
            campos.idade = m[1]
            const unidade = m[2].toLowerCase()
            campos.idadeUnidade = unidade.startsWith("dia") ? "D" : unidade.startsWith("m") ? "M" : "A"
            continue
        }
        m = seg.match(RE_SEXO)
        if (m) { campos.sexo = seg.toUpperCase(); continue }
        m = seg.match(RE_ACOMPANHANTE)
        if (m) { continue }
        m = seg.match(RE_PROCEDENCIA)
        if (m) { campos.procedencia = m[1]; continue }
        m = seg.match(RE_PROCEDENCIA_LEGADO)
        if (m) { campos.procedencia = m[1]; continue }
        m = seg.match(RE_ESTADO_CIVIL)
        if (m) { campos.estadoCivil = seg; continue }
        m = seg.match(RE_RELIGIAO)
        if (m) { campos.religiao = seg; continue }
        m = seg.match(RE_ESCOLARIDADE)
        if (m) { campos.escolaridade = seg; continue }
        m = seg.match(RE_OCUPACAO)
        if (m) { campos.ocupacao = seg; continue }
        restantes.push(seg)
    }

    if (restantes.length === 0) return campos

    campos.nome = restantes[0]
    const resto = restantes.slice(1)
    if (resto.length === 0) return campos

    /* Prefer an explicit occupation keyword, otherwise treat a trailing
       non-family phrase as the occupation (family phrases stay in composição). */
    const idxOcup = resto.findIndex(s => RE_OCUPACAO.test(s))
    if (idxOcup >= 0) {
        campos.ocupacao = resto[idxOcup]
        const restoComposicao = resto.filter((_, k) => k !== idxOcup)
        if (restoComposicao.length) campos.composicao = restoComposicao.join(", ")
        return campos
    }

    const ultimo = resto[resto.length - 1]
    if (!RE_COMPOSICAO.test(ultimo)) {
        campos.ocupacao = ultimo
        const restoComposicao = resto.slice(0, -1)
        if (restoComposicao.length) campos.composicao = restoComposicao.join(", ")
        return campos
    }

    campos.composicao = resto.join(", ")
    return campos
}

export function extrairContexto(linha: string): ContextoPaciente {
    const campos = parseIdentificacao(linha)
    const sexo = campos.sexo === "M" || campos.sexo === "F" ? campos.sexo : ""
    const valorIdade = campos.idade.trim() ? parseInt(campos.idade.trim(), 10) : null
    const idade = valorIdade === null || Number.isNaN(valorIdade)
        ? null
        : campos.idadeUnidade === "D" ? valorIdade / 365.25 : campos.idadeUnidade === "M" ? valorIdade / 12 : valorIdade
    return { sexo, idade: idade !== null && !Number.isNaN(idade) ? idade : null }
}

/* ── Sexo: session-scoped, never stored in the record ──────────────────
   Sexo only guides which companions apply, so it is deliberately kept out
   of the saved line. This module-level store keeps it available to the
   companion-visibility check without leaking it into the text. It is
   intentionally in-memory only: a reload starts from no sex until the
   clinician picks one again. */
let sexoContexto: "M" | "F" | "" = ""

export function definirSexoContexto(sexo: "M" | "F" | "") {
    sexoContexto = sexo
}

export function getSexoContexto(): "M" | "F" | "" {
    return sexoContexto
}
