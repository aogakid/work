import * as React from "react"
import { forwardRef, useImperativeHandle, useState, useEffect, useRef } from "react"
import type { CompanionActions } from "../companions/registry"
import { gerarLeads, gerarBeatUnico, DURACAO_MS, PASSO_MS } from "./ecg_strip"
import type { EcgState, BeatPreviewSpec, LeadsTraco } from "./ecg_strip"

const injectStyles = `
  :root {
    --ecg-bg: #ffffff;
    --ecg-text: #1a1916;
    --ecg-text-muted: #6b6760;
    --ecg-input-bg: rgba(120,120,120,0.08);
    --ecg-border: rgba(120,120,120,0.15);
    --ecg-card-bg: rgba(120,120,120,0.06);
    --ecg-accent: #d64545;
    --ecg-accent-soft: rgba(214, 69, 69, 0.12);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --ecg-bg: #1c1917;
      --ecg-text: #f5f5f4;
      --ecg-text-muted: #78716c;
      --ecg-input-bg: #2e2b29;
      --ecg-border: rgba(255,255,255,0.15);
      --ecg-card-bg: rgba(255,255,255,0.06);
    }
  }

  .ecg-root {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    align-items: start;
  }

  @media (min-width: 900px) {
    .ecg-root {
      grid-template-columns: 1.2fr 1fr;
      min-height: calc(100vh - 80px);
    }
  }

  .ecg-fields-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
    width: 100%;
    min-width: 0;
  }

  .ecg-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .ecg-result-card {
    border-radius: 12px;
    padding: 20px;
    box-sizing: border-box;
    transition: background 0.3s ease, border 0.3s ease;
    min-width: 0;
    position: sticky;
    top: 48px;
  }

  .ecg-badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 6px;
    letter-spacing: 0.04em;
    margin-bottom: 12px;
  }

  .ecg-mini-badge {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 5px;
    letter-spacing: 0.04em;
    line-height: 1.4;
  }
`

const styles = {
  container: {
    background: "var(--ecg-bg)",
    color: "var(--ecg-text)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: "24px",
    borderRadius: "16px",
    width: "100%",
    boxSizing: "border-box" as const,
    maxWidth: "100%",
  },
  title: {
    fontSize: "20px",
    fontWeight: 700,
    marginBottom: "4px",
    color: "var(--ecg-text)",
  },
  subtitle: {
    fontSize: "13px",
    color: "var(--ecg-text-muted)",
    marginBottom: "20px",
  },
  stepCard: {
    gridColumn: "1 / -1",
    background: "rgba(120, 120, 120, 0.04)",
    padding: "14px",
    borderRadius: "12px",
    border: "1px dashed var(--ecg-border)",
    marginTop: "8px",
    minWidth: 0,
  },
  stepHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px",
  },
  stepNum: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    background: "var(--ecg-accent-soft)",
    color: "var(--ecg-accent)",
    fontSize: "11px",
    fontWeight: 700,
    flexShrink: 0,
  },
  stepTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--ecg-text)",
    lineHeight: 1.4,
  },
  resultBadge: {
    background: "var(--ecg-accent)",
    color: "#ffffff",
  },
  resultTitle: {
    fontWeight: 700,
    fontSize: "18px",
    color: "var(--ecg-text)",
    lineHeight: 1.3,
    marginBottom: "6px",
  },
  resultHint: {
    fontSize: "13px",
    color: "var(--ecg-text-muted)",
    lineHeight: 1.5,
  },
  diagMeta: {
    fontSize: "11px",
    color: "var(--ecg-text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    fontWeight: 600,
    marginBottom: "4px",
  },
  bodyText: {
    fontSize: "12px",
    color: "var(--ecg-text)",
    lineHeight: 1.5,
    marginTop: "6px",
  },
  bodyMuted: {
    fontSize: "12px",
    color: "var(--ecg-text-muted)",
    lineHeight: 1.5,
    marginTop: "6px",
  },
  conduta: {
    marginTop: "10px",
    paddingTop: "10px",
    borderTop: "1px solid var(--ecg-border)",
  },
  resetChip: {
    padding: "6px 14px",
    borderRadius: "20px",
    fontSize: "12px",
    cursor: "pointer" as const,
    userSelect: "none" as const,
    background: "var(--ecg-input-bg)",
    border: "1px solid var(--ecg-border)",
    color: "var(--ecg-text-muted)",
    transition: "all 0.15s ease",
    marginLeft: "auto",
  },
}

interface Props {
  style?: React.CSSProperties
}

interface EcgOption {
  valor: string
  label: string
}

interface EcgPergunta {
  id: string
  texto: string
  opcoes: EcgOption[]
}

interface EcgConduta {
  estavel: string
  instavel: string
}

interface EcgDiagnostico {
  id: string
  categoria: string
  criterios: Record<string, string>
  arritmia: string
  origem: string
  gravidade: string
  achado_chave: string
  diferencial: string
  conduta: EcgConduta
}

interface EcgData {
  titulo: string
  perguntas: EcgPergunta[]
  diagnosticos: EcgDiagnostico[]
  alteracoes_eletrocardiograficas?: AlteracoesEcg
}

interface CriterioSobrecarga {
  criterio: string
  achado?: string
  formula?: string
  derivacoes?: string[]
  como_aferir?: string
  apresenta?: string
  ausencia?: string
}

interface AlteracoesEcg {
  sobrecarga_atrial: {
    esquerda: CriterioSobrecarga[]
    direita: CriterioSobrecarga[]
  }
  sobrecarga_ventricular: {
    esquerda: CriterioSobrecarga[]
    direita: CriterioSobrecarga[]
  }
}

interface GrupoSobrecarga {
  id: string
  label: string
  sigla: string
  quando: string
  criterios: CriterioSobrecarga[]
}

interface GravidadeMeta {
  color: string
  bg: string
  rank: number
}

const GRAVIDADE_META: Record<string, GravidadeMeta> = {
  "Benigno": { color: "#00b849", bg: "rgba(0, 184, 73, 0.10)", rank: 0 },
  "Eletivo": { color: "#ca8a04", bg: "rgba(234, 179, 8, 0.10)", rank: 1 },
  "Urgência": { color: "#ea580c", bg: "rgba(234, 88, 12, 0.10)", rank: 2 },
  "Emergência": { color: "#e02424", bg: "rgba(224, 36, 36, 0.10)", rank: 3 },
  "Emergência extrema": { color: "#7c2d12", bg: "rgba(124, 45, 18, 0.10)", rank: 4 },
}

const PERGUNTA_ORDEM = ["estabilidade_clinica", "fc", "qrs", "rr", "onda_p", "st_t", "sobrecarga_morfologia"]

const RESPOSTA_BOA: Record<string, string[]> = {
  estabilidade_clinica: ["estavel"],
  fc: ["Normocardia"],
  qrs: ["Estreito (<120 ms)"],
  rr: ["Regular"],
  onda_p: ["Presente"],
  st_t: ["Sem alteração"],
  sobrecarga_morfologia: ["Nenhuma"],
}

function ehRespostaBoa(perguntaId: string, valor: string): boolean {
  const boas = RESPOSTA_BOA[perguntaId]
  return !!boas && boas.indexOf(valor) >= 0
}

function legivelSobre(hex: string): string {
  const h = hex.replace("#", "")
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.42 ? "#161513" : "#ffffff"
}

function gravidadeRank(g: string): number {
  const meta = GRAVIDADE_META[g]
  return meta ? meta.rank : 0
}

function matchDiagnosticos(diags: EcgDiagnostico[], selecoes: Record<string, string>): EcgDiagnostico[] {
  const chaves = Object.keys(selecoes)
  if (chaves.length === 0) return []
  const matches: EcgDiagnostico[] = []
  diags.forEach(function (d) {
    const dkeys = Object.keys(d.criterios)
    if (dkeys.length === 0) return
    const completo = dkeys.every(function (k) {
      return selecoes[k] === d.criterios[k]
    })
    if (completo) matches.push(d)
  })
  matches.sort(function (a, b) {
    return gravidadeRank(b.gravidade) - gravidadeRank(a.gravidade)
  })
  return matches
}

function labelDoValor(pergunta: EcgPergunta, valor: string): string {
  for (const opt of pergunta.opcoes) {
    if (opt.valor === valor) return opt.label
  }
  return valor
}

const PRIORIDADE_SOBRECARGA = ["svd", "sve", "sad", "sae"]

function montarGrupos(alter: AlteracoesEcg): GrupoSobrecarga[] {
  function g(id: string, label: string, sigla: string, quando: string, criterios: CriterioSobrecarga[]): GrupoSobrecarga {
    return { id, label, sigla, quando, criterios }
  }
  return [
    g("sae", "Sobrecarga Atrial Esquerda (SAE)", "SAE",
      "Olhe a onda P: larga ou entalhada em DII, ou fase negativa em V1.",
      alter.sobrecarga_atrial.esquerda),
    g("sad", "Sobrecarga Atrial Direita (SAD)", "SAD",
      "Olhe a onda P alta e apiculada (P pulmonale) nas derivações inferiores.",
      alter.sobrecarga_atrial.direita),
    g("sve", "Sobrecarga Ventricular Esquerda (SVE)", "SVE",
      "Voltagens altas nas derivações esquerdas + padrão strain.",
      alter.sobrecarga_ventricular.esquerda),
    g("svd", "Sobrecarga Ventricular Direita (SVD)", "SVD",
      "Onda R dominante em V1 e/ou eixo do QRS desviado à direita.",
      alter.sobrecarga_ventricular.direita),
  ]
}

const PREVIEW_BASE: Record<string, BeatPreviewSpec> = {
  sae_0: { lead: "DII" },
  sae_1: { lead: "V1" },
  sad_0: { lead: "DII" },
  sad_1: { lead: "V1" },
  sve_0: { lead: "DII" },
  sve_1: { lead: "DII" },
  sve_2: { lead: "DII" },
  svd_0: { lead: "V1" },
  svd_1: { lead: "V1" },
  svd_2: { lead: "V1" },
}

const PREVIEW_SIM: Record<string, BeatPreviewSpec> = {
  sae_0: { lead: "DII", pWide: true },
  sae_1: { lead: "V1", morris: true },
  sad_0: { lead: "DII", pTall: true },
  sad_1: { lead: "V1", pTall: true },
  sve_0: { lead: "DII", highVoltage: true },
  sve_1: { lead: "DII", highVoltage: true, deepS: true },
  sve_2: { lead: "DII", strain: true },
  svd_0: { lead: "V1", rDominant: true },
  svd_1: { lead: "V1", highVoltage: true, deepS: true },
  svd_2: { lead: "V1" },
}

const EIXO_CRITERIO_ID = "svd_2"

function samplesCriterio(id: string, presente: boolean): number[] | null {
  if (id === EIXO_CRITERIO_ID) return null
  const spec = presente ? PREVIEW_SIM[id] : PREVIEW_BASE[id]
  if (!spec) return null
  return gerarBeatUnico(spec)
}

const PX_MS = 0.2
const PX_MV = 80
const JANELA_BEAT_MS = 1100
const COR_TRACO = "var(--ecg-accent, #c0392b)"
const COR_GRID = "rgba(120,120,120,0.16)"
const COR_GRID_FORTE = "rgba(120,120,120,0.4)"

const BASE_MAIN = 160
const ALTURA_MAIN = 344
const BASE_PREV = 140
const ALTURA_PREV = 280

interface LinhaVert {
  x: number
  forte: boolean
  segundo: boolean
}

interface LinhaHori {
  y: number
  forte: boolean
}

function paraPath(samples: number[], base: number): string {
  let d = ""
  for (let i = 0; i < samples.length; i++) {
    const x = i * PASSO_MS * PX_MS
    const y = base - samples[i] * PX_MV
    d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1)
  }
  return d
}

function linhasVerticais(ateMs: number): LinhaVert[] {
  const linhas: LinhaVert[] = []
  for (let x = 40; x <= ateMs; x += 40) {
    linhas.push({ x: x * PX_MS, forte: x % 200 === 0, segundo: x % 1000 === 0 })
  }
  return linhas
}

function linhasHorizontais(altura: number, base: number): LinhaHori[] {
  const linhas: LinhaHori[] = []
  const passo = (0.1 * PX_MV)
  const maxK = Math.floor(Math.min(base, altura - base) / passo)
  for (let k = 1; k <= maxK; k++) {
    linhas.push({ y: base - k * passo, forte: k % 5 === 0 })
    linhas.push({ y: base + k * passo, forte: k % 5 === 0 })
  }
  return linhas
}

function StripSvg(props: { path: string; label: string; duracaoS: number }) {
  const larg = DURACAO_MS * PX_MS
  const vert = linhasVerticais(DURACAO_MS)
  const hori = linhasHorizontais(ALTURA_MAIN, BASE_MAIN)
  return (
    <svg
      viewBox={"0 0 " + larg + " " + ALTURA_MAIN}
      preserveAspectRatio="none"
      style={{ width: "100%", height: "auto", display: "block", borderRadius: "8px", background: "var(--ecg-bg)" }}
    >
      {vert.map(function (l) {
        return (
          <g key={"v" + l.x}>
            <line
              x1={l.x}
              x2={l.x}
              y1={0}
              y2={ALTURA_MAIN}
              stroke={l.forte ? COR_GRID_FORTE : COR_GRID}
              strokeWidth={l.forte ? 1.2 : 0.8}
              vectorEffect="non-scaling-stroke"
            />
            {l.segundo && (
              <text x={l.x - 7} y={ALTURA_MAIN - 9} style={{ fontSize: "13px", fill: COR_GRID_FORTE, fontWeight: 600 }}>
                {Math.round(l.x / (1000 * PX_MS))}
              </text>
            )}
          </g>
        )
      })}
      {hori.map(function (l) {
        return (
          <line
            key={"h" + l.y}
            x1={0}
            x2={larg}
            y1={l.y}
            y2={l.y}
            stroke={l.forte ? COR_GRID_FORTE : COR_GRID}
            strokeWidth={l.forte ? 1.2 : 0.8}
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
      <line x1={0} x2={larg} y1={BASE_MAIN} y2={BASE_MAIN} stroke={COR_GRID_FORTE} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <text
        x={8}
        y={20}
        stroke="var(--ecg-bg)"
        strokeWidth={4}
        paintOrder="stroke"
        style={{ fontSize: "15px", fontWeight: 700, fill: COR_TRACO }}
      >
        {props.label} · {props.duracaoS} s
      </text>
      <path
        d={props.path}
        fill="none"
        stroke={COR_TRACO}
        strokeWidth={2.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function EcgStripViewer({ leads }: { leads: LeadsTraco }) {
  return (
    <div
      style={{
        marginBottom: "12px",
        padding: "10px",
        borderRadius: "10px",
        border: "1px solid var(--ecg-border)",
        background: "var(--ecg-card-bg)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <StripSvg path={paraPath(leads.dii, BASE_MAIN)} label="DII" duracaoS={4} />
        <StripSvg path={paraPath(leads.v1, BASE_MAIN)} label="V1" duracaoS={4} />
      </div>
    </div>
  )
}

function BeatPreview(props: { samples: number[]; destaque?: boolean }) {
  const larg = JANELA_BEAT_MS * PX_MS
  const path = paraPath(props.samples, BASE_PREV)
  const vert = linhasVerticais(JANELA_BEAT_MS)
  const hori = linhasHorizontais(ALTURA_PREV, BASE_PREV)
  const cor = props.destaque ? COR_TRACO : "#5f6064"
  return (
    <div style={{ flexShrink: 0, flex: "0 1 200px", minWidth: "150px", maxWidth: "220px", width: "100%" }}>
      <svg
        viewBox={"0 0 " + larg + " " + ALTURA_PREV}
        preserveAspectRatio="none"
        style={{ width: "100%", height: "auto", display: "block", borderRadius: "8px", background: "var(--ecg-bg)" }}
      >
        {vert.map(function (l) {
          return (
            <line
              key={"v" + l.x}
              x1={l.x}
              x2={l.x}
              y1={0}
              y2={ALTURA_PREV}
              stroke={l.forte ? COR_GRID_FORTE : COR_GRID}
              strokeWidth={l.forte ? 1.2 : 0.8}
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
        {hori.map(function (l) {
          return (
            <line
              key={"h" + l.y}
              x1={0}
              x2={larg}
              y1={l.y}
              y2={l.y}
              stroke={l.forte ? COR_GRID_FORTE : COR_GRID}
              strokeWidth={l.forte ? 1.2 : 0.8}
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
        <line x1={0} x2={larg} y1={BASE_PREV} y2={BASE_PREV} stroke={COR_GRID_FORTE} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <path
          d={path}
          fill="none"
          stroke={cor}
          strokeWidth={props.destaque ? 2.8 : 2.3}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}

type SentidoEixo = "up" | "iso" | "down"

const EIXO_LIMB_ORDER = ["DI", "DII", "DIII", "aVR", "aVL", "aVF"]

function eixoDirecao(axis: number, leadAxis: number): SentidoEixo {
  const v = Math.cos(((axis - leadAxis) * Math.PI) / 180)
  if (v > 0.15) return "up"
  if (v < -0.15) return "down"
  return "iso"
}

const EIXO_NORMAL_SENT: Record<string, SentidoEixo> = {
  DI: eixoDirecao(60, 0),
  DII: eixoDirecao(60, 60),
  DIII: eixoDirecao(60, 120),
  aVR: eixoDirecao(60, -150),
  aVL: eixoDirecao(60, -30),
  aVF: eixoDirecao(60, 90),
}

const EIXO_DEVIADO_SENT: Record<string, SentidoEixo> = {
  DI: eixoDirecao(120, 0),
  DII: eixoDirecao(120, 60),
  DIII: eixoDirecao(120, 120),
  aVR: eixoDirecao(120, -150),
  aVL: eixoDirecao(120, -30),
  aVF: eixoDirecao(120, 90),
}

function Eixo12Derivacoes({ deviado }: { deviado: boolean }) {
  const mapa = deviado ? EIXO_DEVIADO_SENT : EIXO_NORMAL_SENT
  return (
    <div style={{ flex: "1 1 200px", minWidth: "170px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gridTemplateRows: "repeat(3, auto)",
          gridAutoFlow: "column",
          gap: "6px",
        }}
      >
        {EIXO_LIMB_ORDER.map(function (lead) {
          const s = mapa[lead] || "iso"
          const simbolo = s === "up" ? "▲" : s === "down" ? "▼" : "–"
          const cor = s === "up" ? COR_TRACO : s === "down" ? "#8f8f8f" : "#c3c3c3"
          return (
            <div
              key={lead}
              style={{
                textAlign: "center",
                padding: "6px 4px",
                borderRadius: "6px",
                background: "var(--ecg-input-bg)",
                border: "1px solid var(--ecg-border)",
              }}
            >
              <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--ecg-text-muted)" }}>{lead}</div>
              <div style={{ fontSize: "17px", lineHeight: 1.2, color: cor }}>{simbolo}</div>
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: "11px", color: "var(--ecg-text-muted)", textAlign: "center", lineHeight: 1.4 }}>
        Plano frontal (hexaxial) — ▲ positivo · – isoeletrico · ▼ negativo.{" "}
        {deviado
          ? "Eixo a ~+120°: DI e aVL ficam ▼, DIII/aVF ▲; aVR (invertida) ~ iso."
          : "Eixo a ~+60°: ▲ em DI, DII, DIII e aVF; aVR é a derivação invertida, fica ▼."}
      </div>
    </div>
  )
}

function overloadValue(criterios: Record<string, boolean>, grupos: GrupoSobrecarga[]): string | null {
  if (grupos.length === 0) return null
  const todosRespondidos = grupos.every(function (g) {
    return g.criterios.every(function (_c, i) {
      const v = criterios[g.id + "_" + i]
      return v === true || v === false
    })
  })
  for (const id of PRIORIDADE_SOBRECARGA) {
    const g = grupos.find(function (x) {
      return x.id === id
    })
    if (!g) continue
    const tem = g.criterios.some(function (_c, i) {
      return criterios[g.id + "_" + i] === true
    })
    if (tem) return g.sigla
  }
  if (todosRespondidos) return "Nenhuma"
  return null
}

interface CriterioPessoa {
  g: GrupoSobrecarga
  c: CriterioSobrecarga
  i: number
  id: string
}

function SobrecargaWizard(props: {
  grupos: GrupoSobrecarga[]
  criterios: Record<string, boolean>
  onCriterio: (id: string, value: "sim" | "não") => void
}) {
  const { grupos, criterios, onCriterio } = props

  const chipSim = (ativo: boolean, red?: boolean) => ({
    padding: "8px 14px",
    borderRadius: "20px",
    fontSize: "13px",
    cursor: "pointer",
    userSelect: "none" as const,
    background: ativo ? (red ? "rgba(224, 36, 36, 0.12)" : "rgba(0, 184, 73, 0.12)") : "var(--ecg-input-bg)",
    border: `1px solid ${ativo ? (red ? "#e02424" : "#00cc52") : "var(--ecg-border)"}`,
    color: ativo ? (red ? "#e02424" : "#00b849") : "var(--ecg-text-muted)",
    fontWeight: ativo ? 600 : 400,
    transition: "all 0.15s ease",
  })

  const flat: CriterioPessoa[] = []
  grupos.forEach(function (g) {
    g.criterios.forEach(function (c, i) {
      flat.push({ g, c, i, id: g.id + "_" + i })
    })
  })
  const total = flat.length
  const respondidos = flat.filter(function (item) {
    const v = criterios[item.id]
    return v === true || v === false
  }).length
  const overload = overloadValue(criterios, grupos)

  return (
    <>
      <div style={styles.stepCard}>
        <div style={styles.stepHeader}>
          <span style={styles.stepNum}>7</span>
          <span style={styles.stepTitle}>Sobrecarga / hipertrofia — critérios, parte a parte</span>
        </div>
        <div style={{ fontSize: "12px", color: "var(--ecg-text-muted)", lineHeight: 1.5 }}>
          Vá olhando o ECG na ordem dos critérios abaixo. Responda cada um e o próximo aparece.
          <strong style={{ marginLeft: "6px" }}>{respondidos}/{total}</strong> respondidos.
        </div>
      </div>

      {flat.map(function (item, idx) {
        if (idx > 0) {
          const prev = criterios[flat[idx - 1].id]
          if (prev !== true && prev !== false) return null
        }
        const { g, c, i, id } = item
        const presente = criterios[id] === true
        const ausente = criterios[id] === false
        const previewSamples = samplesCriterio(id, presente)
        return (
          <div key={id} style={styles.stepCard}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
              <span className="ecg-mini-badge" style={{ background: "var(--ecg-accent-soft)", color: "var(--ecg-accent)" }}>
                {g.sigla}
              </span>
              <span style={styles.stepTitle}>{i + 1}. {c.criterio}</span>
              <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--ecg-text-muted)" }}>
                {idx + 1}/{total}
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "var(--ecg-text-muted)", lineHeight: 1.5 }}>
              {c.formula && <span style={{ fontFamily: "'Monaco', 'Menlo', monospace" }}>{c.formula}</span>}
              {c.derivacoes && c.derivacoes.length > 0 && (
                <span> · derivações: {c.derivacoes.join(", ")}</span>
              )}
              {c.achado && <span> · {c.achado}</span>}
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginTop: "10px", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px", minWidth: "180px", fontSize: "12px", color: "var(--ecg-text-muted)", lineHeight: 1.5, background: "var(--ecg-input-bg)", borderRadius: "8px", padding: "8px 10px" }}>
                <strong>Como medir/aferir:</strong> {c.como_aferir || "—"}
              </div>
              {id === EIXO_CRITERIO_ID
                ? <Eixo12Derivacoes deviado={presente} />
                : <BeatPreview samples={previewSamples || []} destaque={presente} />}
            </div>
            <div className="ecg-chips" style={{ marginTop: "8px" }}>
              <div style={chipSim(presente, true)} onClick={() => onCriterio(id, "sim")}>
                {c.apresenta || "presente"}
              </div>
              <div style={chipSim(ausente)} onClick={() => onCriterio(id, "não")}>
                {c.ausencia || "ausente"}
              </div>
            </div>
          </div>
        )
      })}

      {grupos.length === 0 && (
        <div style={styles.stepCard}>
          <div style={styles.resultHint}>Detalhes de sobrecarga não disponíveis no protocolo.</div>
        </div>
      )}

      {overload === "Nenhuma" && (
        <div style={styles.stepCard}>
          <span className="ecg-mini-badge" style={{ background: "rgba(0, 184, 73, 0.12)", color: "#00b849" }}>
            Nenhum critério de sobrecarga presente
          </span>
        </div>
      )}
      {overload && overload !== "Nenhuma" && (
        <div style={styles.stepCard}>
          <span className="ecg-mini-badge" style={{ background: "rgba(224, 36, 36, 0.12)", color: "#e02424" }}>
            {overload} — critério(s) presente(s)
          </span>
        </div>
      )}
    </>
  )
}

export default forwardRef<CompanionActions, Props>(function EcgUI({ style }: Props, ref) {
  const [data, setData] = useState<EcgData | null>(null)
  const [selecoes, setSelecoes] = useState<Record<string, string>>({})
  const [sobrecargaCriterios, setSobrecargaCriterios] = useState<Record<string, boolean>>({})

  useEffect(function () {
    const caminhos = ["/contents/ecg.json", "contents/ecg.json", "public/contents/ecg.json"]
    let ativo = true
    function tentar(i: number): void {
      if (i >= caminhos.length) return
      fetch(caminhos[i], { cache: "no-store" })
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status)
          return r.json()
        })
        .then(function (json: EcgData) {
          if (!ativo) return
          if (!json || !Array.isArray(json.perguntas) || !Array.isArray(json.diagnosticos)) return
          setData(json)
        })
        .catch(function (e) {
          if (i >= caminhos.length - 1) {
            if (e instanceof Error) console.warn("[EcgUI]", e)
          } else {
            tentar(i + 1)
          }
        })
    }
    tentar(0)
    return function () {
      ativo = false
    }
  }, [])

  function handlePick(perguntaId: string, valor: string): void {
    setSelecoes(function (prev) {
      if (prev[perguntaId] === valor) {
        const next = { ...prev }
        delete next[perguntaId]
        return next
      }
      return { ...prev, [perguntaId]: valor }
    })
  }

  function handleResetTree(): void {
    setSelecoes({})
    setSobrecargaCriterios({})
  }

  function toggleCriterioSobrecarga(id: string, value: "sim" | "não"): void {
    setSobrecargaCriterios(function (prev) {
      const atual = prev[id]
      const mesmo = value === "sim" ? atual === true : atual === false
      if (mesmo) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: value === "sim" }
    })
  }

  const gruposSobrecarga = data && data.alteracoes_eletrocardiograficas
    ? montarGrupos(data.alteracoes_eletrocardiograficas)
    : []
  const overload = overloadValue(sobrecargaCriterios, gruposSobrecarga)
  const selecoesCompleto = overload !== null
    ? { ...selecoes, sobrecarga_morfologia: overload }
    : selecoes

  function buildMarkdown(): string | null {
    if (!data) return null
    const chaves = Object.keys(selecoesCompleto)
    if (chaves.length === 0) return null
    const matched = matchDiagnosticos(data.diagnosticos, selecoesCompleto)
    const hoje = new Date().toLocaleDateString("pt-BR")
    const instavel = selecoes["estabilidade_clinica"] === "instavel"
    const linhas: string[] = []
    linhas.push(
      matched.length > 0
        ? "ECG (" + hoje + "): " + matched.map(function (d) { return d.arritmia }).join(" | ")
        : "ECG (" + hoje + "): sem diagnóstico fechado"
    )
    data.perguntas.forEach(function (p) {
      const v = selecoesCompleto[p.id]
      if (v) linhas.push("- " + p.texto + ": " + labelDoValor(p, v))
    })
    gruposSobrecarga.forEach(function (g) {
      g.criterios.forEach(function (c, i) {
        if (sobrecargaCriterios[g.id + "_" + i] === true) {
          linhas.push("- Sobrecarga (" + g.sigla + "): " + c.criterio + " presente")
        }
      })
    })
    matched.forEach(function (d) {
      linhas.push("")
      linhas.push("**" + d.arritmia + "** — " + d.gravidade)
      linhas.push("  - Achado: " + d.achado_chave)
      if (d.diferencial) linhas.push("  - Diferencial: " + d.diferencial)
      linhas.push(
        "  - Conduta (" + (instavel ? "instável" : "estável") + "): " +
        (instavel ? d.conduta.instavel : d.conduta.estavel)
      )
    })
    return linhas.join("\n")
  }

  const getOutputRef = useRef<(groupId: string) => string | null>(() => null)
  getOutputRef.current = function (): string | null {
    return buildMarkdown()
  }

  useImperativeHandle(ref, () => ({
    getOutput: function (groupId: string) {
      return getOutputRef.current(groupId)
    },
    reset: function () {
      setSelecoes({})
      setSobrecargaCriterios({})
    },
  }), [])

  const matched = data ? matchDiagnosticos(data.diagnosticos, selecoesCompleto) : []
  const answeredCount = Object.keys(selecoesCompleto).length
  const worst = matched.length > 0 ? GRAVIDADE_META[matched[0].gravidade] : null
  const badgeColor = worst ? worst.color : "var(--ecg-accent)"
  const instavel = selecoes["estabilidade_clinica"] === "instavel"

  const estadoEcg: EcgState = {
    fc: selecoes["fc"] || "",
    qrs: selecoes["qrs"] || "",
    rr: selecoes["rr"] || "",
    ondaP: selecoes["onda_p"] || "",
    stt: selecoes["st_t"] || "",
    overload,
  }
  const leads = gerarLeads(estadoEcg)

  const stepVisible: Record<string, boolean> = {
    estabilidade_clinica: true,
    fc: !!selecoes["estabilidade_clinica"],
    qrs: !!selecoes["fc"],
    rr: !!selecoes["qrs"],
    onda_p: !!selecoes["rr"],
    st_t: !!selecoes["onda_p"],
    sobrecarga_morfologia: !!selecoes["st_t"],
  }

  const chipStyle = (ativo: boolean, color = "var(--ecg-accent)", bg = "var(--ecg-accent-soft)") => ({
    padding: "8px 14px",
    borderRadius: "20px",
    fontSize: "13px",
    cursor: "pointer",
    userSelect: "none" as const,
    background: ativo ? bg : "var(--ecg-input-bg)",
    border: `1px solid ${ativo ? color : "var(--ecg-border)"}`,
    color: ativo ? color : "var(--ecg-text-muted)",
    fontWeight: ativo ? 600 : 400,
    transition: "all 0.15s ease",
  })

  const perguntasVisiveis = data
    ? data.perguntas.filter(function (p) {
        return !!stepVisible[p.id]
      })
    : []

  return (
    <div style={{ ...styles.container, ...style }}>
      <style dangerouslySetInnerHTML={{ __html: injectStyles }} />

      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={styles.title}>eletrocardiograma</div>
          <div style={styles.subtitle}>interpretação de ECG — ritmo, isquemia e sobrecarga</div>
        </div>
        {answeredCount > 0 && (
          <div style={styles.resetChip} onClick={handleResetTree}>limpar</div>
        )}
      </div>

      <div className="ecg-root">
        <div className="ecg-fields-grid">
          {!data && (
            <div style={styles.resultHint}>Carregando protocolo de ECG…</div>
          )}

          {data && perguntasVisiveis.map(function (p) {
            if (p.id === "sobrecarga_morfologia") return null
            const num = PERGUNTA_ORDEM.indexOf(p.id) + 1
            return (
              <div key={p.id} style={styles.stepCard}>
                <div style={styles.stepHeader}>
                  <span style={styles.stepNum}>{num}</span>
                  <span style={styles.stepTitle}>{p.texto}</span>
                </div>
                <div className="ecg-chips">
                  {p.opcoes.map(function (opt) {
                    const ativo = selecoes[p.id] === opt.valor
                    const boa = ehRespostaBoa(p.id, opt.valor)
                    return (
                      <div
                        key={opt.valor}
                        style={chipStyle(ativo, boa ? "#00cc52" : "var(--ecg-accent)", boa ? "rgba(0, 184, 73, 0.12)" : "var(--ecg-accent-soft)")}
                        onClick={() => handlePick(p.id, opt.valor)}
                      >
                        {opt.label}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {data && stepVisible["sobrecarga_morfologia"] && (
            <SobrecargaWizard
              grupos={gruposSobrecarga}
              criterios={sobrecargaCriterios}
              onCriterio={toggleCriterioSobrecarga}
            />
          )}

          {data && answeredCount === 0 && (
            <div style={styles.stepCard}>
              <div style={styles.resultHint}>Comece pela avaliação da estabilidade clínica. As próximas etapas são reveladas conforme as respostas.</div>
            </div>
          )}
        </div>

        <div style={{ position: "sticky" as const, top: "48px", minWidth: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "calc(100vh - 80px)", overflowY: "auto" }}>
            <div
              className="ecg-result-card"
              style={{
                background: worst ? worst.bg : "var(--ecg-card-bg)",
                border: `1px solid ${worst ? worst.color + "55" : "var(--ecg-border)"}`,
              }}
            >
              <div className="ecg-badge" style={{ background: badgeColor, color: legivelSobre(badgeColor) }}>
                ECG
              </div>

              <EcgStripViewer leads={leads} />

              {answeredCount === 0 ? (
                <div style={styles.resultHint}>
                  Responda as perguntas ao lado para identificar o ritmo/arritmia.
                </div>
              ) : matched.length === 0 ? (
                <div>
                  <div style={styles.resultTitle}>Diagnóstico não fechado</div>
                  <div style={styles.resultHint}>
                    As respostas atuais não completam nenhuma combinação de critérios. Continue a leitura ou revise as opções.
                  </div>
                </div>
              ) : (
                <div>
                  <div style={styles.resultTitle}>
                    {matched.length === 1 ? matched[0].arritmia : matched.length + " diagnósticos compatíveis"}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                    {matched.map(function (d) {
                      const meta = GRAVIDADE_META[d.gravidade] || GRAVIDADE_META["Eletivo"]
                      return (
                        <div key={d.id} style={{ padding: "12px", borderRadius: "10px", background: "var(--ecg-card-bg)", border: "1px solid " + meta.color + "44" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                            <span className="ecg-mini-badge" style={{ background: meta.color, color: legivelSobre(meta.color) }}>
                              {d.gravidade}
                            </span>
                            <span style={styles.diagMeta}>{d.categoria}</span>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: "14px", color: meta.color, lineHeight: 1.3 }}>{d.arritmia}</div>
                          <div style={styles.bodyText}>Origem: {d.origem}</div>
                          <div style={styles.bodyText}>Achado: {d.achado_chave}</div>
                          {d.diferencial && <div style={styles.bodyMuted}>Diferencial: {d.diferencial}</div>}
                          <div style={styles.conduta}>
                            <div className="ecg-mini-badge" style={{ background: meta.bg, color: meta.color, marginBottom: "6px" }}>
                              Conduta ({instavel ? "instável" : "estável"})
                            </div>
                            <div style={styles.bodyText}>
                              {instavel ? d.conduta.instavel : d.conduta.estavel}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})