export interface ResultadoExames {
  campos: Record<string, string>
  data: string | null
  idade: string | null
  sexo: string | null
  outros: string | null
  reconhecidos: number
  naoReconhecidos: string[]
}

interface Regra {
  id: string
  titulo: RegExp
}

const REGRAS: Regra[] = [
  { id: "hba1c", titulo: /hemoglobina\s*glicada|hb\s*a?1c/i },
  { id: "hb", titulo: /^hemoglobina\s*:/i },
  { id: "ht", titulo: /^hemat[oó]crito\s*:/i },
  { id: "vcm", titulo: /^v\.?\s*c\.?\s*m\b/i },
  { id: "hcm", titulo: /^h\.?\s*c\.?\s*m\b/i },
  { id: "leuco", titulo: /^leuc[oó]citos?\s*:/i },
  { id: "neutro", titulo: /^neutr[oó]filos?\s*:/i },
  { id: "plaq", titulo: /plaquetas?\s*:/i },
  { id: "ct", titulo: /^colesterol\s*total/i },
  { id: "hdl", titulo: /^colesterol\s*hdl/i },
  { id: "trig", titulo: /^triglicer[ií]deos/i },
  { id: "glic", titulo: /^glicemia/i },
  { id: "ur", titulo: /^ur[eé]ia/i },
  { id: "cr", titulo: /^creatinina/i },
  { id: "tsh", titulo: /^tsh\b/i },
  { id: "t4l", titulo: /^t4\b/i },
  { id: "ast", titulo: /^tgo\b/i },
  { id: "alt", titulo: /^tgp\b/i },
]

const EXTRAS: Array<{ nome: string; titulo: RegExp }> = [
  { nome: "Hemácias", titulo: /^hem[áa]cias?\s*:/i },
  { nome: "RDW", titulo: /^rdw\s*:/i },
  { nome: "CHCM", titulo: /^c\.?\s*h\.?\s*c\.?\s*m\b/i },
  { nome: "VPM", titulo: /^vpm\s*:/i },
  { nome: "Bastonetes", titulo: /^bastonetes?\s*:/i },
  { nome: "Segmentados", titulo: /^segmentados?\s*:/i },
  { nome: "Eosinófilos", titulo: /^eosin[oó]filos?\s*:/i },
  { nome: "Linfócitos", titulo: /^linf[oó]citos?\s*:/i },
  { nome: "Monócitos", titulo: /^mon[oó]citos?\s*:/i },
  { nome: "Basófilos", titulo: /^bas[oó]filos?\s*:/i },
]

function normalizarLinha(linha: string): string {
  return linha.replace(/[.·•]{2,}/g, " ").replace(/\s+/g, " ").trim()
}

function normalizarNumero(bruto: string): string {
  let s = bruto.trim().replace(/\s/g, "")
  if (!s) return ""
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".")
  } else {
    const partes = s.split(".")
    if (partes.length === 2 && partes[1].length === 3) s = partes.join("")
  }
  const n = parseFloat(s)
  return isNaN(n) ? "" : String(n)
}

function primeiroNumero(txt: string): string {
  const m = /(-?\d[\d.,]*)/.exec(txt)
  return m ? normalizarNumero(m[1]) : ""
}

function extrairValor(regra: Regra, linha: string, idx: number, linhas: string[]): string {
  if (regra.id === "hba1c") {
    const fim = Math.min(idx + 3, linhas.length)
    for (let j = idx; j < fim; j++) {
      const l = linhas[j]
      const antes = /([\d.,]+)\s*%\s*hb\s*a?1c/i.exec(l)
      if (antes) return normalizarNumero(antes[1])
      const depois = /hb\s*a?1c\s*:?\s*([\d.,]+)\s*%/i.exec(l)
      if (depois) return normalizarNumero(depois[1])
    }
    return ""
  }
  const colon = linha.indexOf(":")
  if (colon !== -1) {
    const inline = primeiroNumero(linha.slice(colon + 1))
    if (inline) return inline
  }
  const fim = Math.min(idx + 4, linhas.length)
  for (let j = idx + 1; j < fim; j++) {
    const l = linhas[j]
    const m = /^resultado\s*:?/i.exec(l)
    if (!m) continue
    const c = l.indexOf(":")
    const resto = c !== -1 ? l.slice(c + 1) : l.slice(m[0].length)
    const v = primeiroNumero(resto)
    if (v) return v
  }
  return ""
}

function idadeEm(nascimento: [number, number, number], referencia: [number, number, number]): number {
  let anos = referencia[0] - nascimento[0]
  if (referencia[1] < nascimento[1] || (referencia[1] === nascimento[1] && referencia[2] < nascimento[2])) anos--
  return anos
}

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

export function parseTextoLaudo(texto: string): ResultadoExames {
  const linhas = texto.split(/\r?\n/).map(normalizarLinha)
  const campos: Record<string, string> = {}
  const extras: string[] = []
  const naoReconhecidos: string[] = []

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i]
    if (!linha) continue
    for (const regra of REGRAS) {
      if (!regra.titulo.test(linha)) continue
      if (campos[regra.id]) break
      const valor = extrairValor(regra, linha, i, linhas)
      if (valor) campos[regra.id] = valor
      break
    }
    for (const extra of EXTRAS) {
      if (!extra.titulo.test(linha)) continue
      if (extras.some((e) => e.startsWith(extra.nome + " "))) break
      const colon = linha.indexOf(":")
      const valor = colon !== -1 ? primeiroNumero(linha.slice(colon + 1)) : ""
      if (valor) extras.push(`${extra.nome} ${valor}`)
      break
    }
    if (/^(resultado|valor de refer|limites de decis|m[ée]todo|material|refer[êe]ncia|fonte|nota|libera)\b/i.test(linha)) {
      naoReconhecidos.push(linha)
    }
  }

  const nasc = /Data\s*Nascimento\/Sexo:\s*(\d{2})\/(\d{2})\/(\d{4})\s*([MF])/i.exec(texto)
  const cadastro = /Data\s*de\s*cadastro:\s*(\d{2})\/(\d{2})\/(\d{4})/i.exec(texto)

  let sexo: string | null = null
  let idade: string | null = null
  if (nasc) {
    sexo = nasc[4].toUpperCase()
    const dNasc = parseInt(nasc[1], 10)
    const mNasc = parseInt(nasc[2], 10)
    const aNasc = parseInt(nasc[3], 10)
    const ref: [number, number, number] = cadastro
      ? [parseInt(cadastro[3], 10), parseInt(cadastro[2], 10), parseInt(cadastro[1], 10)]
      : (() => { const h = new Date(); return [h.getFullYear(), h.getMonth() + 1, h.getDate()] })()
    idade = String(idadeEm([aNasc, mNasc, dNasc], ref))
  }

  const data = cadastro ? `${cadastro[3]}-${pad2(parseInt(cadastro[2], 10))}-${pad2(parseInt(cadastro[1], 10))}` : null

  return {
    campos,
    data,
    idade,
    sexo,
    outros: extras.length > 0 ? extras.join(" // ") : null,
    reconhecidos: Object.keys(campos).length,
    naoReconhecidos,
  }
}
