export interface SinaisVitais {
    pa: string
    peso: string
    altura: string
    imc: string
    glicemia: string
    fc: string
    fr: string
    spo2: string
    tax: string
}

export interface ExameFisico {
    ect: string
    ac: string
    ar: string
    ext: string
    outros: string
    prenatal: { au: string; bcf: string; mf: string; apresentacao: string }
}

export interface Complementar {
    laboratorio: string
    imagem: string
    escores: string
}

export interface Objetivo {
    ssvv: SinaisVitais
    crescimentoDesenvolvimento: string
    exameFisico: ExameFisico
    complementar: Complementar
}

export const SINAIS_VITAIS_VAZIO: SinaisVitais = {
    pa: "",
    peso: "",
    altura: "",
    imc: "",
    glicemia: "",
    fc: "",
    fr: "",
    spo2: "",
    tax: "",
}

export const EXAME_FISICO_VAZIO: ExameFisico = {
    ect: "",
    ac: "",
    ar: "",
    ext: "",
    outros: "",
    prenatal: { au: "", bcf: "", mf: "", apresentacao: "" },
}

export const COMPLEMENTAR_VAZIO: Complementar = {
    laboratorio: "",
    imagem: "",
    escores: "",
}

export const OBJETIVO_VAZIO: Objetivo = {
    ssvv: SINAIS_VITAIS_VAZIO,
    crescimentoDesenvolvimento: "",
    exameFisico: EXAME_FISICO_VAZIO,
    complementar: COMPLEMENTAR_VAZIO,
}

export function maskPA(raw: string): string {
    const lower = (raw || "").toLowerCase().replace(/[^0-9x]/g, "").replace(/x+/g, "x")
    const xPos = lower.indexOf("x")
    if (xPos !== -1) {
        const sbp = lower.slice(0, xPos).slice(0, 3)
        const dbp = lower.slice(xPos + 1).slice(0, 3).replace(/x/g, "")
        if (sbp === "") return ""
        return dbp !== "" ? sbp + "x" + dbp : sbp + "x"
    }
    const digits = lower
    if (digits.length <= 3) return digits
    const sbp3 = digits.slice(0, 3)
    const n3 = parseInt(sbp3, 10)
    if (n3 >= 40 && n3 <= 299) {
        return sbp3 + "x" + digits.slice(3, 6)
    }
    const sbp2 = digits.slice(0, 2)
    const n2 = parseInt(sbp2, 10)
    if (n2 >= 40) {
        return sbp2 + "x" + digits.slice(2, 5)
    }
    return digits
}

export function calcularIMC(pesoStr: string, alturaStr: string): string {
    const p = parseFloat((pesoStr || "").replace(",", "."))
    let a = parseFloat((alturaStr || "").replace(",", "."))
    if (isNaN(p) || isNaN(a) || p <= 0 || a <= 0) return ""
    if (a > 3) a = a / 100
    const imc = p / (a * a)
    if (isNaN(imc) || !isFinite(imc)) return ""
    return imc.toFixed(1)
}

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

function valorInline(bloco: string[], re: RegExp): string {
    for (const linha of bloco) {
        const m = linha.match(re)
        if (m) return m[1] || ""
    }
    return ""
}

function itensLista(bloco: string[]): string {
    if (!bloco.length) return ""
    const linhas = bloco.map(l => l.replace(/^\s*-\s*/, ""))
    if (!linhas.some(l => l.trim())) return ""
    return linhas.join("\n")
}

export function parseObjetivo(texto: string): Objetivo {
    const linhas = paraLinhas(texto)

    const indiceCrescimentoPlano = linhas.findIndex(l => /^Crescimento\s+e\s+desenvolvimento\s*:?\s*$/i.test(l.trim()))
    const indiceFisicoPlano = linhas.findIndex(l => /^Exame\s+f[íi]sico\s*:?\s*$/i.test(l.trim()))
    const indiceComplementarPlano = linhas.findIndex(l => /^Complementar\s*:?\s*$/i.test(l.trim()))
    const formatoPlano = indiceCrescimentoPlano >= 0 || indiceFisicoPlano >= 0 || indiceComplementarPlano >= 0
    const indiceFimCrescimento = [indiceFisicoPlano, indiceComplementarPlano].filter(i => i > indiceCrescimentoPlano).sort((a, b) => a - b)[0] ?? linhas.length
    const crescimentoDesenvolvimento = formatoPlano && indiceCrescimentoPlano >= 0
        ? linhas.slice(indiceCrescimentoPlano + 1, indiceFimCrescimento).join("\n").trim()
        : ""
    const blocoFisico = formatoPlano
        ? indiceFisicoPlano >= 0 ? linhas.slice(indiceFisicoPlano + 1, indiceComplementarPlano >= 0 ? indiceComplementarPlano : linhas.length) : []
        : blocoRotulo(linhas, /^\s*-\s*Exame\s+f[íi]sico\s*:?\s*$/i)
    const blocoFisicoTarget = formatoPlano ? blocoFisico : blocoFisico.length ? blocoFisico : linhas
    const blocoSsvv = blocoRotulo(blocoFisicoTarget, /^\s*-\s*SSVV\s*:?\s*.*$/i)
    const blocoSsvvTarget = blocoSsvv.length ? blocoSsvv : blocoFisicoTarget

    const linhaSsvv = blocoFisicoTarget.find(l => /^\s*-\s*SSVV\s*:/i.test(l)) || ""
    const valoresCompactos: Partial<SinaisVitais> = {}
    const aliasesCompactos: [keyof SinaisVitais, RegExp][] = [
        ["pa", /^PA\s+(.+)$/i], ["peso", /^Peso\s+(.+)$/i], ["altura", /^Alt(?:ura)?\s+(.+)$/i],
        ["imc", /^IMC\s+(.+)$/i], ["glicemia", /^Glic(?:emia)?\s+(.+)$/i], ["fc", /^FC\s+(.+)$/i],
        ["fr", /^FR\s+(.+)$/i], ["spo2", /^SPO2\s+(.+)$/i], ["tax", /^(?:Tax|Temperatura)\s+(.+)$/i],
    ]
    const compacto = linhaSsvv.replace(/^\s*-\s*SSVV\s*:\s*/i, "")
    compacto.split(/\s*\|\s*/).forEach(item => {
        for (const [chave, re] of aliasesCompactos) {
            const m = item.match(re)
            if (m) { valoresCompactos[chave] = m[1]; break }
        }
    })
    const ssvv: SinaisVitais = {
        pa: valoresCompactos.pa || valorInline(blocoSsvvTarget, /^\s*-\s*PA\s*:\s*(.*)$/i),
        peso: valoresCompactos.peso || valorInline(blocoSsvvTarget, /^\s*-\s*Peso\s*:\s*(.*)$/i),
        altura: valoresCompactos.altura || valorInline(blocoSsvvTarget, /^\s*-\s*Alt(?:ura)?\s*:\s*(.*)$/i),
        imc: valoresCompactos.imc || valorInline(blocoSsvvTarget, /^\s*-\s*IMC\s*:\s*(.*)$/i),
        glicemia: valoresCompactos.glicemia || valorInline(blocoSsvvTarget, /^\s*-\s*Glic(?:emia)?\s*:\s*(.*)$/i),
        fc: valoresCompactos.fc || valorInline(blocoSsvvTarget, /^\s*-\s*FC\s*:\s*(.*)$/i),
        fr: valoresCompactos.fr || valorInline(blocoSsvvTarget, /^\s*-\s*FR\s*:\s*(.*)$/i),
        spo2: valoresCompactos.spo2 || valorInline(blocoSsvvTarget, /^\s*-\s*SPO2\s*:\s*(.*)$/i),
        tax: valoresCompactos.tax || valorInline(blocoSsvvTarget, /^\s*-\s*(?:Tax|Temperatura)\s*:\s*(.*)$/i),
    }

    const textoOutrosLegado = itensLista(blocoRotulo(blocoFisicoTarget, /^\s*-\s*Outros\s*:?\s*$/i))
    const blocoPrenatal = blocoRotulo(blocoFisicoTarget, /^\s*-\s*Pr[ée]-?natal\s*:?\s*$/i)
    const linhaPrenatal = blocoFisicoTarget.find(l => /^\s*-\s*Pr[ée]-?natal\s*:/i.test(l)) || ""
    const compactoPrenatal = linhaPrenatal.replace(/^\s*-\s*Pr[ée]-?natal\s*:\s*/i, "")
    const prenatalCompacto: Record<string, string> = {}
    compactoPrenatal.split(/\s*\|\s*/).forEach(item => {
        const m = item.match(/^(AU|BCF|MF|Apresenta[çc][ãa]o)\s+(.+)$/i)
        if (m) prenatalCompacto[m[1].toLowerCase()] = m[2]
    })
    const prenatal = {
        au: prenatalCompacto.au || valorInline(blocoPrenatal, /^\s*-\s*AU\s*:\s*(.*)$/i),
        bcf: prenatalCompacto.bcf || valorInline(blocoPrenatal, /^\s*-\s*BCF\s*:\s*(.*)$/i),
        mf: prenatalCompacto.mf || valorInline(blocoPrenatal, /^\s*-\s*MF\s*:\s*(.*)$/i),
        apresentacao: prenatalCompacto["apresentação"] || prenatalCompacto["apresentacao"] || valorInline(blocoPrenatal, /^\s*-\s*Apresenta[çc][ãa]o\s*:\s*(.*)$/i),
    }
    const indiceExameFisico = linhas.findIndex(l => /^\s*-\s*Exame\s+f[íi]sico\s*:?[\s]*$/i.test(l))
    let textoOutrosDireto = ""
    if (indiceExameFisico >= 0) {
        const nivelExame = recuo(linhas[indiceExameFisico])
        const diretas: string[] = []
        let iniciouTextoDireto = false
        for (let i = indiceExameFisico + 1; i < linhas.length; i += 1) {
            const linha = linhas[i]
            if (linha.trim() && recuo(linha) <= nivelExame) break
            if (!linha.trim()) {
                if (iniciouTextoDireto) diretas.push("")
                continue
            }
            if (/^\s*-\s*Outros\s*:?\s*$/i.test(linha)) {
                /* Legacy notes stored the free text under an explicit heading. */
                for (i += 1; i < linhas.length && recuo(linhas[i]) > recuo(linha); i += 1) { /* skip legacy children */ }
                i -= 1
                continue
            }
            if (!/^\s*-\s*(?:SSVV|Ect|AC|AR|Ext|Pr[ée]-?natal)\b/i.test(linha)) {
                iniciouTextoDireto = true
                diretas.push(linha.replace(/^ {2}/, ""))
            }
        }
        textoOutrosDireto = diretas.join("\n").trim()
    }

    let dentroPrenatal = false
    const linhasOutrosPlano = blocoFisicoTarget.filter(l => {
        if (/^\s*-\s*Pr[ée]-?natal\b/i.test(l)) { dentroPrenatal = true; return false }
        if (dentroPrenatal && /^\s{2,}-\s/.test(l)) return false
        dentroPrenatal = false
        return true
    })
    const outrosPlano = formatoPlano ? linhasOutrosPlano
        .filter(l => /^\s*-\s/.test(l) && !/^\s*-\s*(?:SSVV|Ect|AC|AR|Ext)\b/i.test(l))
        .map(l => l.replace(/^\s*-\s*/, "")).join("\n") : ""
    const exameFisico: ExameFisico = {
        ect: valorInline(blocoFisicoTarget, /^\s*-\s*Ect\s*:\s*(.*)$/i),
        ac: valorInline(blocoFisicoTarget, /^\s*-\s*AC\s*:\s*(.*)$/i),
        ar: valorInline(blocoFisicoTarget, /^\s*-\s*AR\s*:\s*(.*)$/i),
        ext: valorInline(blocoFisicoTarget, /^\s*-\s*Ext\s*:\s*(.*)$/i),
        outros: textoOutrosLegado || outrosPlano || textoOutrosDireto,
        prenatal,
    }

    const blocoComplementar = formatoPlano && indiceComplementarPlano >= 0
        ? linhas.slice(indiceComplementarPlano + 1)
        : blocoRotulo(linhas, /^\s*-\s*Complementar\s*:?\s*$/i)
    const blocoCompTarget = blocoComplementar.length ? blocoComplementar : linhas
    const valoresCategoria = (nome: string, outrosNomes: string[]) => {
        const inicio = blocoCompTarget.findIndex(l => l.trim().replace(/^[-*]\s*/, "").toLowerCase() === nome.toLowerCase())
        if (inicio < 0) return ""
        const fim = blocoCompTarget.findIndex((l, i) => i > inicio && outrosNomes.includes(l.trim().replace(/^[-*]\s*/, "").toLowerCase()))
        const linhasCategoria = blocoCompTarget.slice(inicio + 1, fim >= 0 ? fim : blocoCompTarget.length)
        if (formatoPlano) return linhasCategoria.filter(l => /^\s*-\s/.test(l)).map(l => l.replace(/^\s*-\s*/, "")).join("\n")
        return itensLista(linhasCategoria)
    }
    const complementar: Complementar = {
        laboratorio: formatoPlano ? valoresCategoria("Laboratório", ["imagem", "escores"]) : itensLista(blocoRotulo(blocoCompTarget, /^\s*-\s*Laborat[óo]rio\s*:?\s*$/i)),
        imagem: formatoPlano ? valoresCategoria("Imagem", ["laboratório", "escores"]) : itensLista(blocoRotulo(blocoCompTarget, /^\s*-\s*Imagem\s*:?\s*$/i)),
        escores: formatoPlano ? valoresCategoria("Escores", ["laboratório", "imagem"]) : itensLista(blocoRotulo(blocoCompTarget, /^\s*-\s*Escores\s*:?\s*$/i)),
    }

    return { ssvv, crescimentoDesenvolvimento, exameFisico, complementar }
}

export function compositarObjetivo(o: Objetivo): string {
    const partes: string[] = []

    if (o.crescimentoDesenvolvimento.trim()) {
        partes.push("Crescimento e desenvolvimento")
        partes.push(o.crescimentoDesenvolvimento.trim())
    }

    const hasSsvv = Object.values(o.ssvv).some(v => v.trim())
    const hasPrenatal = Object.values(o.exameFisico.prenatal).some(v => v.trim())
    const hasExameFisico = hasSsvv || Object.entries(o.exameFisico).some(([k, v]) => k !== "prenatal" && typeof v === "string" && v.trim()) || hasPrenatal

    if (hasExameFisico) {
        partes.push("Exame físico")
        if (hasSsvv) {
            const unidade = (v: string) => v.trim().replace(/\s*(?:kg|cm|mg\s*\/\s*dL|bpm|irpm|%|°\s*C|°C)\s*$/i, "")
            const campos: [string, string][] = [
                ["PA", o.ssvv.pa], ["Peso", o.ssvv.peso], ["Alt", o.ssvv.altura], ["IMC", o.ssvv.imc],
                ["Glic", o.ssvv.glicemia], ["FC", o.ssvv.fc], ["FR", o.ssvv.fr], ["SPO2", o.ssvv.spo2], ["Tax", o.ssvv.tax],
            ]
            partes.push(`- SSVV: ${campos.filter(([, valor]) => valor.trim()).map(([rotulo, valor]) => `${rotulo} ${unidade(valor)}`).join(" | ")}`)
        }
        if (o.exameFisico.ect.trim()) o.exameFisico.ect.split("\n").forEach((v, i) => partes.push(`- ${i === 0 ? `Ect: ${v}` : v}`))
        if (o.exameFisico.ac.trim()) o.exameFisico.ac.split("\n").forEach((v, i) => partes.push(`- ${i === 0 ? `AC: ${v}` : v}`))
        if (o.exameFisico.ar.trim()) o.exameFisico.ar.split("\n").forEach((v, i) => partes.push(`- ${i === 0 ? `AR: ${v}` : v}`))
        if (o.exameFisico.ext.trim()) o.exameFisico.ext.split("\n").forEach((v, i) => partes.push(`- ${i === 0 ? `Ext: ${v}` : v}`))
        if (o.exameFisico.outros.trim()) {
            o.exameFisico.outros.split("\n").forEach(i => partes.push(i ? `- ${i.replace(/^\s*-\s*/, "")}` : ""))
        }
        if (hasPrenatal) {
            if (partes.length > 1) partes.push("")
            const camposPrenatal: [string, string][] = [["AU", o.exameFisico.prenatal.au], ["BCF", o.exameFisico.prenatal.bcf], ["MF", o.exameFisico.prenatal.mf], ["Apresentação", o.exameFisico.prenatal.apresentacao]]
            partes.push(`- Pré-natal: ${camposPrenatal.filter(([, valor]) => valor.trim()).map(([rotulo, valor]) => `${rotulo} ${valor.trim()}`).join(" | ")}`)
        }
    }

    const hasComp = Object.values(o.complementar).some(v => v.trim())
    if (hasComp) {
        if (partes.length) partes.push("")
        partes.push("Complementar")
        if (o.complementar.laboratorio.trim()) {
            partes.push("- Laboratório")
            o.complementar.laboratorio.split("\n").forEach(i => partes.push(`  - ${i.replace(/^\s*-\s*/, "")}`))
        }
        if (o.complementar.imagem.trim()) {
            partes.push("- Imagem")
            o.complementar.imagem.split("\n").forEach(i => partes.push(`  - ${i.replace(/^\s*-\s*/, "")}`))
        }
        if (o.complementar.escores.trim()) {
            partes.push("- Escores")
            o.complementar.escores.split("\n").forEach(i => partes.push(`  - ${i.replace(/^\s*-\s*/, "")}`))
        }
    }

    return partes.join("\n")
}
