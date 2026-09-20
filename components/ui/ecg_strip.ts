export interface EcgState {
  fc: string
  qrs: string
  rr: string
  ondaP: string
  stt: string
  overload: string | null
}

export interface LeadsTraco {
  dii: number[]
  v1: number[]
}

export const DURACAO_MS = 4000
export const PASSO_MS = 2
const N_AMOSTRAS = Math.floor(DURACAO_MS / PASSO_MS)

interface ConfDerivacao {
  pAmp: number
  pNeg: number
  qAmp: number
  rAmp: number
  sAmp: number
  tAmp: number
}

const DERIVACOES: Record<string, ConfDerivacao> = {
  DII: { pAmp: 0.11, pNeg: 0, qAmp: -0.06, rAmp: 1.0, sAmp: 0.2, tAmp: 0.22 },
  V1: { pAmp: 0.09, pNeg: 0.05, qAmp: 0, rAmp: 0.24, sAmp: 0.9, tAmp: 0.18 },
}

interface ParamBeat {
  qrsOnset: number
  qrsDur: number
  largo: boolean
  pPresente: boolean
  pWide: boolean
  pTall: boolean
  morris: boolean
  svdV1: boolean
  rScale: number
  sScale: number
  stOffsetDII: number
  stOffsetV1: number
  stDur: number
  prDep: number
  tScale: number
  tPeak: boolean
  tInvDII: boolean
  tInvV1: boolean
}

function bpmDoEstado(fc: string): number {
  if (fc === "Bradicardia") return 45
  if (fc === "Taquicardia") return 130
  if (fc === "Indeterminada") return 110
  return 75
}

function gauss(x: number, center: number, half: number, amp: number): number {
  const d = (x - center) / half
  return amp * Math.exp(-d * d)
}

function hashSeed(chave: string): number {
  let h = 2166136261
  for (let i = 0; i < chave.length; i++) {
    h ^= chave.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let s = seed
  return function () {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function somarGauss(arr: number[], centerMs: number, halfMs: number, amp: number): void {
  const ini = Math.max(0, Math.floor((centerMs - halfMs * 4) / PASSO_MS))
  const fim = Math.min(arr.length - 1, Math.ceil((centerMs + halfMs * 4) / PASSO_MS))
  for (let i = ini; i <= fim; i++) {
    arr[i] += gauss(i * PASSO_MS, centerMs, halfMs, amp)
  }
}

function somarPlano(arr: number[], fromMs: number, toMs: number, val: number): void {
  const ini = Math.max(0, Math.floor(fromMs / PASSO_MS))
  const fim = Math.min(arr.length - 1, Math.floor(toMs / PASSO_MS))
  for (let i = ini; i <= fim; i++) {
    arr[i] += val
  }
}

function lerpSuave(f: number): number {
  return f * f * (3 - 2 * f)
}

function somarST(arr: number[], startMs: number, riseMs: number, holdMs: number, fallMs: number, val: number): void {
  const holdEnd = startMs + riseMs + holdMs
  const fim = holdEnd + fallMs
  const ini = Math.max(0, Math.floor(startMs / PASSO_MS))
  const ult = Math.min(arr.length - 1, Math.ceil(fim / PASSO_MS))
  for (let i = ini; i <= ult; i++) {
    const t = i * PASSO_MS
    let f = 0
    if (t < startMs) f = 0
    else if (t < startMs + riseMs) f = lerpSuave((t - startMs) / riseMs)
    else if (t < holdEnd) f = 1
    else if (t < fim) f = 1 - lerpSuave((t - holdEnd) / fallMs)
    else f = 0
    arr[i] += val * f
  }
}

function parametrosBeat(estado: EcgState): ParamBeat {
  const overload = estado.overload
  const p: ParamBeat = {
    qrsOnset: 150,
    qrsDur: estado.qrs === "Largo (≥120 ms)" ? 150 : 90,
    largo: estado.qrs === "Largo (≥120 ms)",
    pPresente: estado.ondaP !== "Ausente" && estado.ondaP !== "Onda F" && estado.ondaP !== "Dissociada",
    pWide: overload === "SAE",
    pTall: overload === "SAD",
    morris: overload === "SAE",
    svdV1: overload === "SVD",
    rScale: overload === "SVE" ? 1.45 : 1,
    sScale: overload === "SVE" ? 1.35 : 1,
    stOffsetDII: 0,
    stOffsetV1: 0,
    stDur: 130,
    prDep: 0,
    tScale: 1,
    tPeak: false,
    tInvDII: false,
    tInvV1: false,
  }
  if (estado.stt === "Supradesnivelamento ST") {
    p.stOffsetDII = 0.3
    p.stOffsetV1 = 0.1
    p.stDur = 150
    p.tScale = 1.9
  } else if (estado.stt === "Infradesnivelamento ST") {
    p.stOffsetDII = -0.18
    p.stOffsetV1 = -0.1
    p.stDur = 150
    p.tScale = 0.9
    p.tInvDII = true
  } else if (estado.stt === "Onda T apiculada") {
    p.stOffsetDII = 0.02
    p.stOffsetV1 = 0.02
    p.stDur = 130
    p.tScale = 3.4
    p.tPeak = true
  } else if (estado.stt === "Supra côncavo com infra de PR") {
    p.stOffsetDII = 0.22
    p.stOffsetV1 = 0.16
    p.prDep = -0.06
    p.stDur = 140
    p.tScale = 0.9
  }
  return p
}

function tempoTempos(fc: string, ritmo: string, rand: () => number): number[] {
  const rr = 60000 / bpmDoEstado(fc)
  const tempos: number[] = []
  let t = 150
  let guarda = 0
  while (t < DURACAO_MS && guarda < 60) {
    tempos.push(t)
    let passo = rr
    if (ritmo === "Irregular") {
      passo = rr * (0.55 + 0.9 * rand())
      if (passo < 180) passo = 180
    }
    t += passo
    guarda++
  }
  return tempos
}

function temposFlutter(): number[] {
  const tempos: number[] = []
  let t = 150
  while (t < DURACAO_MS) {
    tempos.push(t)
    t += 400
  }
  return tempos
}

function ondaF(t: number): number {
  const p = (t % 200) / 200
  return 0.24 * (1 - 2 * p)
}

function somarOndasF(arr: number[]): void {
  for (let i = 0; i < arr.length; i++) {
    arr[i] += ondaF(i * PASSO_MS)
  }
}

function somarTracoP(arr: number[], conf: ConfDerivacao, parametros: ParamBeat, posMs: number): void {
  if (parametros.pWide) {
    somarGauss(arr, posMs + 42, 30, conf.pAmp)
    somarGauss(arr, posMs + 100, 30, conf.pAmp)
  } else if (parametros.pTall && conf.pNeg > 0) {
    somarGauss(arr, posMs + 58, 32, conf.pAmp * 2.6)
  } else if (parametros.pTall) {
    somarGauss(arr, posMs + 58, 26, conf.pAmp * 2.5)
  } else {
    somarGauss(arr, posMs + 58, 40, conf.pAmp)
  }
  if (conf.pNeg > 0) somarGauss(arr, posMs + 95, 22, -conf.pNeg)
  if (parametros.morris) somarGauss(arr, posMs + 120, 22, -0.12)
}

function somarBeat(
  arrDII: number[],
  arrV1: number[],
  inicioMs: number,
  confDII: ConfDerivacao,
  confV1: ConfDerivacao,
  parametros: ParamBeat,
): void {
  const onset = inicioMs + parametros.qrsOnset
  const tHalf = parametros.tPeak ? 34 : 55
  const tCenter = onset + parametros.qrsDur + parametros.stDur + 50
  somarPlano(arrDII, 0, onset - 10, parametros.prDep)
  somarPlano(arrV1, 0, onset - 10, parametros.prDep)
  if (parametros.pPresente) {
    somarTracoP(arrDII, confDII, parametros, inicioMs)
    somarTracoP(arrV1, confV1, parametros, inicioMs)
  }
  if (!parametros.largo) {
    somarGauss(arrDII, onset + 8, 6, confDII.qAmp)
    somarGauss(arrDII, onset + 20, 12, confDII.rAmp * parametros.rScale)
    somarGauss(arrDII, onset + 40, 14, -confDII.sAmp * parametros.sScale)
    const rV1 = confV1.rAmp * parametros.rScale * (parametros.svdV1 ? 3.0 : 1)
    const sV1 = -confV1.sAmp * parametros.sScale * (parametros.svdV1 ? 0.45 : 1)
    somarGauss(arrV1, onset + 22, 12, rV1)
    somarGauss(arrV1, onset + 42, 16, sV1)
  } else {
    somarGauss(arrDII, onset + 12, 10, confDII.qAmp)
    somarGauss(arrDII, onset + 28, 24, confDII.rAmp * parametros.rScale)
    somarGauss(arrDII, onset + 60, 26, -confDII.sAmp * parametros.sScale)
    somarGauss(arrV1, onset + 22, 12, confV1.rAmp * parametros.rScale * 0.8)
    somarGauss(arrV1, onset + 42, 16, -confV1.sAmp * parametros.sScale * 0.5)
    somarGauss(arrV1, onset + 66, 14, confV1.rAmp * parametros.rScale * 0.6)
  }
  const tAmpDII = confDII.tAmp * parametros.tScale * (parametros.tInvDII ? -1 : 1)
  const tAmpV1 = confV1.tAmp * parametros.tScale * (parametros.tInvV1 ? -1 : 1)
  somarGauss(arrDII, tCenter, tHalf, tAmpDII)
  somarGauss(arrV1, tCenter, tHalf, tAmpV1)
  if (parametros.stOffsetDII !== 0 || parametros.stOffsetV1 !== 0) {
    const fimST = tCenter - tHalf + 6
    const inicioST = onset + parametros.qrsDur + 6
    const holdMs = Math.max(10, fimST - (inicioST + 40))
    somarST(arrDII, inicioST, 40, holdMs, 60, parametros.stOffsetDII)
    somarST(arrV1, inicioST, 40, holdMs, 60, parametros.stOffsetV1)
  }
}

function somarPIndependentes(dii: number[], v1: number[], parametros: ParamBeat): void {
  const rrP = 857
  for (let t = 80; t < DURACAO_MS; t += rrP) {
    somarTracoP(dii, DERIVACOES["DII"], parametros, t)
    somarTracoP(v1, DERIVACOES["V1"], parametros, t)
  }
}

function tracoCaotico(rand: () => number): number[] {
  const out: number[] = []
  const fases = [rand(), rand(), rand(), rand(), rand()]
  const amps = [1, 0.6, 0.4, 0.35, 0.25]
  for (let i = 0; i < N_AMOSTRAS; i++) {
    const t = i * PASSO_MS
    let v = 0
    for (let k = 0; k < fases.length; k++) {
      v += amps[k] * Math.sin((2 * Math.PI * t) / (160 - k * 20) + fases[k] * 6.28)
    }
    out.push(v * 0.6)
  }
  return out
}

function comRuido(arr: number[]): number[] {
  return arr
}

export function gerarLeads(estado: EcgState): LeadsTraco {
  const rand = mulberry32(hashSeed(JSON.stringify(estado)))
  if (estado.qrs === "Desorganizado") {
    return {
      dii: tracoCaotico(rand),
      v1: tracoCaotico(rand),
    }
  }
  if (estado.qrs === "Ausente") {
    const vazioD = new Array<number>(N_AMOSTRAS).fill(0)
    const vazioV = new Array<number>(N_AMOSTRAS).fill(0)
    return { dii: vazioD, v1: vazioV }
  }
  const parametros = parametrosBeat(estado)
  const dii = new Array<number>(N_AMOSTRAS).fill(0)
  const v1 = new Array<number>(N_AMOSTRAS).fill(0)
  let tempos: number[]
  if (estado.ondaP === "Onda F") {
    tempos = temposFlutter()
    somarOndasF(dii)
    somarOndasF(v1)
  } else if (estado.ondaP === "Dissociada") {
    tempos = tempoTempos(estado.fc, estado.rr, rand)
    somarPIndependentes(dii, v1, { ...parametros, pPresente: true })
  } else {
    tempos = tempoTempos(estado.fc, estado.rr, rand)
  }
  for (const t of tempos) {
    somarBeat(dii, v1, t, DERIVACOES["DII"], DERIVACOES["V1"], parametros)
  }
  return {
    dii: comRuido(dii),
    v1: comRuido(v1),
  }
}

export interface BeatPreviewSpec {
  lead: "DII" | "V1"
  pWide?: boolean
  pTall?: boolean
  morris?: boolean
  highVoltage?: boolean
  deepS?: boolean
  strain?: boolean
  rDominant?: boolean
}

const JANELA_BEAT_MS = 1100

export function gerarBeatUnico(spec: BeatPreviewSpec): number[] {
  const n = Math.ceil(JANELA_BEAT_MS / PASSO_MS)
  const arr = new Array<number>(n).fill(0)
  const conf = DERIVACOES[spec.lead]
  const pos = 250
  if (spec.pWide) {
    somarGauss(arr, pos + 42, 30, conf.pAmp)
    somarGauss(arr, pos + 100, 30, conf.pAmp)
  } else if (spec.pTall && spec.lead === "V1") {
    somarGauss(arr, pos + 58, 32, conf.pAmp * 2.6)
  } else if (spec.pTall) {
    somarGauss(arr, pos + 58, 26, conf.pAmp * 2.5)
  } else {
    somarGauss(arr, pos + 58, 40, conf.pAmp)
  }
  if (spec.lead === "V1") {
    somarGauss(arr, pos + 95, 22, -conf.pNeg)
    if (spec.morris) somarGauss(arr, pos + 120, 22, -0.12)
  }
  const onset = 450
  if (spec.lead === "V1") {
    let rV1 = conf.rAmp
    let sV1 = conf.sAmp
    if (spec.rDominant) {
      rV1 = conf.rAmp * 3
      sV1 = conf.sAmp * 0.45
    } else if (spec.highVoltage) {
      rV1 = conf.rAmp * 2.6
    }
    if (spec.deepS) sV1 = sV1 * 1.4
    somarGauss(arr, onset + 22, 12, rV1)
    somarGauss(arr, onset + 42, 16, -sV1)
  } else {
    let r = conf.rAmp
    let s = conf.sAmp
    if (spec.highVoltage) r = conf.rAmp * 1.6
    if (spec.deepS) s = conf.sAmp * 2.2
    somarGauss(arr, onset + 8, 6, conf.qAmp)
    somarGauss(arr, onset + 20, 12, r)
    somarGauss(arr, onset + 40, 14, -s)
  }
  const tCenter = onset + 90 + 130 + 50
  if (spec.strain) {
    somarST(arr, onset + 84, 34, 116, 46, -0.22)
    somarGauss(arr, tCenter, 55, -conf.tAmp * 1.6)
  } else {
    somarGauss(arr, tCenter, 55, conf.tAmp)
  }
  return arr
}