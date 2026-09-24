import * as React from "react"
import { forwardRef, useImperativeHandle, useRef, useState, useCallback, useMemo, useEffect } from "react"
import type { CompanionActions } from "../companions/registry"
import { broadcastFieldSync, getFieldSyncSnapshot, listenFieldSync } from "../companions/field-sync"

const EXAMES_PREFIX = "exames"

const injectStyles = `
  .${EXAMES_PREFIX}-root {
    --${EXAMES_PREFIX}-bg: #ffffff;
    --${EXAMES_PREFIX}-text: #1a1916;
    --${EXAMES_PREFIX}-text-muted: #6b6760;
    --${EXAMES_PREFIX}-input-bg: rgba(120,120,120,0.08);
    --${EXAMES_PREFIX}-border: rgba(120,120,120,0.15);
    --${EXAMES_PREFIX}-ok: #007a30;
    --${EXAMES_PREFIX}-ok-bg: rgba(0,184,73,0.06);
    --${EXAMES_PREFIX}-ok-border: rgba(0,184,73,0.3);
    --${EXAMES_PREFIX}-warn: #b56100;
    --${EXAMES_PREFIX}-warn-bg: rgba(242,143,0,0.06);
    --${EXAMES_PREFIX}-warn-border: rgba(242,143,0,0.35);
    --${EXAMES_PREFIX}-danger: #ba120a;
    --${EXAMES_PREFIX}-danger-bg: rgba(245,49,39,0.06);
    --${EXAMES_PREFIX}-danger-border: rgba(245,49,39,0.3);
  }

  @media (prefers-color-scheme: dark) {
    .${EXAMES_PREFIX}-root {
      --${EXAMES_PREFIX}-bg: #1c1917;
      --${EXAMES_PREFIX}-text: #f5f5f4;
      --${EXAMES_PREFIX}-text-muted: #78716c;
      --${EXAMES_PREFIX}-input-bg: #2e2b29;
      --${EXAMES_PREFIX}-border: rgba(255,255,255,0.15);
      --${EXAMES_PREFIX}-ok: #4ade80;
      --${EXAMES_PREFIX}-ok-bg: rgba(34,197,94,0.14);
      --${EXAMES_PREFIX}-ok-border: rgba(34,197,94,0.35);
      --${EXAMES_PREFIX}-warn: #fbbf24;
      --${EXAMES_PREFIX}-warn-bg: rgba(251,191,36,0.14);
      --${EXAMES_PREFIX}-warn-border: rgba(251,191,36,0.35);
      --${EXAMES_PREFIX}-danger: #f87171;
      --${EXAMES_PREFIX}-danger-bg: rgba(248,113,113,0.14);
      --${EXAMES_PREFIX}-danger-border: rgba(248,113,113,0.35);
    }
  }

  .${EXAMES_PREFIX}-root {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }

  @media (min-width: 900px) {
    .${EXAMES_PREFIX}-root {
      grid-template-columns: 1.2fr 1fr;
      align-items: start;
      align-content: start;
    }
  }

  .${EXAMES_PREFIX}-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    width: 100%;
    min-width: 0;
    align-items: end;
  }

  .${EXAMES_PREFIX}-divider-label {
    flex-basis: 100%;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--${EXAMES_PREFIX}-text-muted);
    font-weight: 700;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--${EXAMES_PREFIX}-border);
    margin-top: 8px;
  }

  .${EXAMES_PREFIX}-date-row {
    display: flex;
    align-items: end;
    gap: 10px;
    flex-wrap: wrap;
  }

  .${EXAMES_PREFIX}-left {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }

  .${EXAMES_PREFIX}-right {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    position: sticky;
    top: 48px;
  }

  .${EXAMES_PREFIX}-md-wrap {
    position: sticky;
    top: 48px;
    margin-top: 12px;
  }

  @media (max-width: 899px) {
    .${EXAMES_PREFIX}-md-wrap {
      position: static;
      margin-top: 12px;
      min-height: 120px;
    }
  }

  .${EXAMES_PREFIX}-copy-icon {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--${EXAMES_PREFIX}-input-bg);
    border: 1px solid var(--${EXAMES_PREFIX}-border);
    border-radius: 8px;
    padding: 0;
    cursor: pointer;
    color: var(--${EXAMES_PREFIX}-text-muted);
    transition: all 0.15s ease;
    z-index: 1;
  }

  .${EXAMES_PREFIX}-copy-icon:hover {
    color: var(--${EXAMES_PREFIX}-text);
    background: var(--${EXAMES_PREFIX}-border);
  }
`

const FIELD_WIDTH = "96px"
const TFG_WIDTH = "140px"

function buildStyles() {
  return {
    container: {
      background: `var(--${EXAMES_PREFIX}-bg)`,
      color: `var(--${EXAMES_PREFIX}-text)`,
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
      color: `var(--${EXAMES_PREFIX}-text)`,
    },
    subtitle: {
      fontSize: "13px",
      color: `var(--${EXAMES_PREFIX}-text-muted)`,
      marginBottom: "20px",
    },
    inputGroup: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "6px",
      minWidth: 0,
    },
    label: {
      fontSize: "11px",
      textTransform: "uppercase" as const,
      letterSpacing: "0.05em",
      color: `var(--${EXAMES_PREFIX}-text-muted)`,
      fontWeight: 600,
      whiteSpace: "nowrap" as const,
      overflow: "hidden",
      textOverflow: "ellipsis",
      maxWidth: "100%",
    },
    input: {
      background: `var(--${EXAMES_PREFIX}-input-bg)`,
      border: `1px solid var(--${EXAMES_PREFIX}-border)`,
      borderRadius: "10px",
      padding: "10px 14px",
      color: `var(--${EXAMES_PREFIX}-text)`,
      fontSize: "14px",
      outline: "none",
      height: "46px",
      boxSizing: "border-box" as const,
      width: "100%",
      textAlign: "center" as const,
      transition: "all 0.2s ease",
    },
    inputCalc: {
      background: `var(--${EXAMES_PREFIX}-input-bg)`,
      border: `1px solid var(--${EXAMES_PREFIX}-border)`,
      borderRadius: "10px",
      padding: "10px 14px",
      color: `var(--${EXAMES_PREFIX}-text)`,
      fontSize: "14px",
      fontWeight: 600,
      outline: "none",
      height: "46px",
      boxSizing: "border-box" as const,
      width: "100%",
      textAlign: "center" as const,
      transition: "all 0.2s ease",
      cursor: "default",
    },
    markdownOutput: {
      background: `var(--${EXAMES_PREFIX}-input-bg)`,
      border: `1px solid var(--${EXAMES_PREFIX}-border)`,
      borderRadius: "16px",
      padding: "16px",
      paddingRight: "48px",
      color: `var(--${EXAMES_PREFIX}-text)`,
      fontSize: "13px",
      fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
      whiteSpace: "pre-wrap" as const,
      overflowX: "auto" as const,
      maxHeight: "200px",
      overflowY: "auto" as const,
    },
  }
}

interface FieldDef {
  label: string
  calc?: (values: Record<string, string>) => string | null
}

type Field = FieldDef | string

function makeField(label: string, calc?: (values: Record<string, string>) => string | null): FieldDef {
  return { label, calc }
}

function isField(f: Field): f is FieldDef {
  return typeof f !== "string"
}

function fieldId(label: string): string {
  return label.toLowerCase()
}

function calcLdl(v: Record<string, string>): string | null {
  const ct = parseFloat(v["ct"] || "")
  const h = parseFloat(v["hdl"] || "")
  const tg = parseFloat(v["trig"] || "")
  if (!ct || !h || !tg || isNaN(ct) || isNaN(h) || isNaN(tg)) return null
  if (tg >= 400) return null
  const noHdl = ct - h
  if (noHdl <= 0) return "0"
  let fatorMh = 5.0
  if (noHdl < 100) {
    fatorMh = tg < 100 ? 4.1 : tg < 150 ? 4.8 : 5.6
  } else if (noHdl < 160) {
    fatorMh = tg < 100 ? 4.4 : tg < 150 ? 5.1 : tg < 200 ? 5.5 : 6.2
  } else {
    fatorMh = tg < 100 ? 4.7 : tg < 200 ? 5.4 : 6.7
  }
  return Math.max(0, Math.round(noHdl - tg / fatorMh)).toString()
}

function calcTfg(v: Record<string, string>): string | null {
  const i = parseInt(v["idade"] || "")
  const cr = parseFloat(v["cr"] || "")
  const sexo = v["sexo"] || ""
  if (!i || !sexo || !cr || isNaN(cr) || cr <= 0) return null
  const a = sexo === "F" ? 0.7 : 0.9
  const b =
    sexo === "F"
      ? cr <= 0.7 ? -0.241 : -1.2
      : cr <= 0.9 ? -0.302 : -1.2
  const fSexo = sexo === "F" ? 1.012 : 1.0
  const calc = 142 * Math.pow(cr / a, b) * Math.pow(0.9938, i) * fSexo
  return Math.round(calc).toString()
}

const FIELDS: Field[] = [
  makeField("Idade"),
  makeField("Sexo"),
  "Hemograma",
  makeField("Hb"),
  makeField("Ht"),
  makeField("VCM"),
  makeField("HCM"),
  makeField("Leuco"),
  makeField("Neutro"),
  makeField("Plaq"),
  "Lipidograma",
  makeField("CT"),
  makeField("HDL"),
  makeField("Trig"),
  makeField("LDL", calcLdl),
  "Perfil glicêmico",
  makeField("Glic"),
  makeField("HbA1c"),
  "Função renal",
  makeField("Ur"),
  makeField("Cr"),
  makeField("TFG", calcTfg),
  makeField("RAC"),
  makeField("ÁcÚr"),
  "Função tireoidiana",
  makeField("TSH"),
  makeField("T4L"),
  "Função hepatopancreática",
  makeField("AST"),
  makeField("ALT"),
  makeField("FA"),
  makeField("GGT"),
  makeField("BT"),
  makeField("BD"),
  makeField("BI"),
  makeField("Alb"),
  makeField("Amil"),
  makeField("Lip"),
  "Coagulograma",
  makeField("TP"),
  makeField("TTPA"),
  makeField("INR"),
  "Inflamação",
  makeField("PCR"),
  "Eletrólitos",
  makeField("Na"),
  makeField("K"),
  "Vitaminas",
  makeField("Vit D"),
  makeField("Vit B12"),
  "Perfil do ferro",
  makeField("Fe"),
  makeField("Ferrit"),
  makeField("Transferr"),
  makeField("SatTransf"),
]

const META_FIELDS = ["idade", "sexo"]

function formatDateBR(dateStr: string): string {
  if (!dateStr) return ""
  const [y, m, d] = dateStr.split("-")
  return `${d}/${m}/${y.slice(2)}`
}

interface EstagioDrc { estagio: string; cor: string; bg: string; border: string }

function kdigoTfg(v: number): EstagioDrc {
  if (v >= 90) return { estagio: "G1", cor: "var(--exames-ok)", bg: "var(--exames-ok-bg)", border: "var(--exames-ok-border)" }
  if (v >= 60) return { estagio: "G2", cor: "var(--exames-ok)", bg: "var(--exames-ok-bg)", border: "var(--exames-ok-border)" }
  if (v >= 45) return { estagio: "G3a", cor: "var(--exames-warn)", bg: "var(--exames-warn-bg)", border: "var(--exames-warn-border)" }
  if (v >= 30) return { estagio: "G3b", cor: "var(--exames-warn)", bg: "var(--exames-warn-bg)", border: "var(--exames-warn-border)" }
  if (v >= 15) return { estagio: "G4", cor: "var(--exames-danger)", bg: "var(--exames-danger-bg)", border: "var(--exames-danger-border)" }
  return { estagio: "G5", cor: "var(--exames-danger)", bg: "var(--exames-danger-bg)", border: "var(--exames-danger-border)" }
}

interface Props {
  style?: React.CSSProperties
}

function IconeCopiar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function IconeCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconeLixeira() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

type PeriodoAmpa = "dia" | "noite"

interface AmpaParsed {
  sbp: number
  dbp: number
}

function ampaKey(day: number, periodo: PeriodoAmpa, slot: number): string {
  return day + "-" + periodo + "-" + slot
}

function maskAmpa(raw: string): string {
  const lower = raw.toLowerCase().replace(/[^0-9x]/g, "").replace(/x+/g, "x")
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

function parseAmpaValue(val: string): AmpaParsed | null {
  const m = /^([0-9]{1,3})x([0-9]{1,3})$/.exec(val)
  if (!m) return null
  const sbp = parseInt(m[1], 10)
  const dbp = parseInt(m[2], 10)
  if (sbp <= 0 || dbp <= 0) return null
  return { sbp, dbp }
}

const AMPA_PERIODS: Array<{ id: PeriodoAmpa; label: string }> = [
  { id: "dia", label: "Diurna" },
  { id: "noite", label: "Noturna" },
]

const EXAMES_TABS: Array<{ id: "exames" | "ampa" | "glicemia"; label: string }> = [
  { id: "exames", label: "Laboratório" },
  { id: "ampa", label: "AMPA" },
  { id: "glicemia", label: "Glicemia" },
]

const AMPA_DAY_INDEXES: number[] = [0, 1, 2, 3, 4, 5, 6]

type PeriodoGlicemia =
  | "jejum"
  | "pos_cafe"
  | "pre_almoco"
  | "pos_almoco"
  | "pre_jantar"
  | "pos_jantar"
  | "ao_deitar"
  | "madrugada"

const GLICEMIA_PERIODS: Array<{ id: PeriodoGlicemia; label: string }> = [
  { id: "jejum", label: "Jejum" },
  { id: "pos_cafe", label: "Pós-café" },
  { id: "pre_almoco", label: "Pré-almoço" },
  { id: "pos_almoco", label: "Pós-almoço" },
  { id: "pre_jantar", label: "Pré-jantar" },
  { id: "pos_jantar", label: "Pós-jantar" },
  { id: "ao_deitar", label: "Ao deitar" },
  { id: "madrugada", label: "Madrugada" },
]

const GLICEMIA_DAY_INDEXES: number[] = [0, 1, 2, 3, 4, 5, 6]

type GrupoGlicemia = "adulto" | "idoso_saudavel" | "idoso_fragil" | "idoso_muito_fragil" | "crianca"

const GLICEMIA_GRUPOS: Array<{ id: GrupoGlicemia; label: string }> = [
  { id: "adulto", label: "Adulto" },
  { id: "idoso_saudavel", label: "Idoso saudável" },
  { id: "idoso_fragil", label: "Idoso frágil" },
  { id: "idoso_muito_fragil", label: "Idoso muito frágil" },
  { id: "crianca", label: "Criança/Adolescente" },
]

type PontosGlicemia = 1 | 2 | 4 | 8

const GLICEMIA_PONTOS_OPTIONS: Array<{ id: PontosGlicemia; label: string }> = [
  { id: 1, label: "1 ponto" },
  { id: 2, label: "2 pontos" },
  { id: 4, label: "4 pontos" },
  { id: 8, label: "8 pontos" },
]

const GLICEMIA_PONTOS_PERIODOS: Record<PontosGlicemia, PeriodoGlicemia[]> = {
  1: ["jejum"],
  2: ["jejum", "pre_jantar"],
  4: ["jejum", "pre_almoco", "pre_jantar", "ao_deitar"],
  8: ["jejum", "pos_cafe", "pre_almoco", "pos_almoco", "pre_jantar", "pos_jantar", "ao_deitar", "madrugada"],
}

const GLICEMIA_ALVO_JEJUM: string[] = ["80-130", "80-130", "90-150", "100-180", "70-130"]
const GLICEMIA_ALVO_DEITAR: string[] = ["90-150", "90-150", "100-180", "110-200", "90-150"]
const GLICEMIA_ALVO_POS_PRANDIAL: string[] = ["<180", "<180", "<180", "-", "<180"]

const GLICEMIA_ALVOS: Record<PeriodoGlicemia, string[]> = {
  jejum: GLICEMIA_ALVO_JEJUM,
  pos_cafe: GLICEMIA_ALVO_POS_PRANDIAL,
  pre_almoco: GLICEMIA_ALVO_JEJUM,
  pos_almoco: GLICEMIA_ALVO_POS_PRANDIAL,
  pre_jantar: GLICEMIA_ALVO_JEJUM,
  pos_jantar: GLICEMIA_ALVO_POS_PRANDIAL,
  ao_deitar: GLICEMIA_ALVO_DEITAR,
  madrugada: GLICEMIA_ALVO_DEITAR,
}

function glicemiaKey(day: number, periodo: PeriodoGlicemia): string {
  return day + "-" + periodo
}

function parseGlicemiaValue(val: string): number | null {
  const num = parseFloat(val)
  if (isNaN(num) || num <= 0) return null
  return num
}

function isGlicemiaAlerta(v: number): boolean {
  return v > 140 || v < 80
}

const ampaTh: React.CSSProperties = {
  padding: "6px 4px",
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--exames-text-muted)",
  fontWeight: 700,
  borderBottom: "1px solid var(--exames-border)",
  textAlign: "left",
  whiteSpace: "nowrap",
  minWidth: "72px",
}

const ampaTd: React.CSSProperties = {
  padding: "6px 4px",
  borderBottom: "1px solid var(--exames-border)",
  verticalAlign: "top",
}

const ampaTdDia: React.CSSProperties = {
  padding: "6px 4px",
  borderBottom: "1px solid var(--exames-border)",
  fontSize: "13px",
  fontWeight: 700,
  color: "var(--exames-text)",
  whiteSpace: "nowrap",
  minWidth: "24px",
}

export default forwardRef<CompanionActions, Props>(function ExamesUI({ style }: Props, ref) {
  const [date, setDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  })
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of FIELDS) {
      if (isField(f)) init[fieldId(f.label)] = ""
    }
    return init
  })
  const [outros, setOutros] = useState("")
  const [copied, setCopied] = useState(false)
  const syncRef = useRef(false)
  const touchedRef = useRef(false)
  const [escuro, setEscuro] = useState(false)
  const [activeTab, setActiveTab] = useState<"exames" | "ampa" | "glicemia">("exames")

  const [ampaStart, setAmpaStart] = useState(() => {
    const now = new Date()
    now.setDate(now.getDate() - 7)
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  })
  const [ampaMeasures, setAmpaMeasures] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const day of AMPA_DAY_INDEXES) {
      for (const periodo of AMPA_PERIODS) {
        for (let slot = 0; slot < 3; slot++) {
          init[ampaKey(day, periodo.id, slot)] = ""
        }
      }
    }
    return init
  })
  const [ampaSlotCount, setAmpaSlotCount] = useState<1 | 2 | 3>(1)

  const ampaSlots = useMemo(() => {
    return [0, 1, 2].slice(0, ampaSlotCount)
  }, [ampaSlotCount])

  const [glicemiaStart, setGlicemiaStart] = useState(() => {
    const now = new Date()
    now.setDate(now.getDate() - 7)
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  })
  const [grupoGlicemia, setGrupoGlicemia] = useState<GrupoGlicemia>("adulto")
  const [pontosGlicemia, setPontosGlicemia] = useState<PontosGlicemia>(4)
  const [glicemiaMeasures, setGlicemiaMeasures] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const day of GLICEMIA_DAY_INDEXES) {
      for (const periodo of GLICEMIA_PERIODS) {
        init[glicemiaKey(day, periodo.id)] = ""
      }
    }
    return init
  })
  const [glicemiaRows, setGlicemiaRows] = useState<number[]>(GLICEMIA_DAY_INDEXES)
  const nextGlicemiaRowId = useRef(GLICEMIA_DAY_INDEXES.length)
  const [hoverGlicemiaRow, setHoverGlicemiaRow] = useState<number | null>(null)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const atualizar = () => setEscuro(mq.matches)
    atualizar()
    mq.addEventListener("change", atualizar)
    return () => mq.removeEventListener("change", atualizar)
  }, [])

  useEffect(() => {
    const snap = getFieldSyncSnapshot()
    if (Object.keys(snap).length > 0) {
      syncRef.current = true
      touchedRef.current = true
      setValues(prev => {
        const next = { ...prev }
        if (snap.idade !== undefined) next["idade"] = snap.idade
        if (snap.sexo !== undefined) next["sexo"] = snap.sexo
        if (snap.ct !== undefined) next["ct"] = snap.ct
        if (snap.hdl !== undefined) next["hdl"] = snap.hdl
        if (snap.trig !== undefined) next["trig"] = snap.trig
        if (snap.cr !== undefined) next["cr"] = snap.cr
        if (snap.hba1c !== undefined) next["hba1c"] = snap.hba1c
        if (snap.rac !== undefined) next["rac"] = snap.rac
        return next
      })
      setTimeout(() => { syncRef.current = false }, 0)
    }
    return listenFieldSync(({ source, values }) => {
      if (source === "exames") return
      syncRef.current = true
      touchedRef.current = true
      setValues(prev => {
        const next = { ...prev }
        if (values.idade !== undefined) next["idade"] = values.idade
        if (values.sexo !== undefined) next["sexo"] = values.sexo
        if (values.ct !== undefined) next["ct"] = values.ct
        if (values.hdl !== undefined) next["hdl"] = values.hdl
        if (values.trig !== undefined) next["trig"] = values.trig
        if (values.cr !== undefined) next["cr"] = values.cr
        if (values.hba1c !== undefined) next["hba1c"] = values.hba1c
        if (values.rac !== undefined) next["rac"] = values.rac
        return next
      })
      setTimeout(() => { syncRef.current = false }, 0)
    })
  }, [])

  const idade = values["idade"]
  const sexo = values["sexo"]
  const ct = values["ct"]
  const hdl = values["hdl"]
  const trig = values["trig"]
  const cr = values["cr"]
  const hba1c = values["hba1c"]
  const rac = values["rac"]

  useEffect(() => {
    if (syncRef.current) return
    if (!touchedRef.current) return
    broadcastFieldSync("exames", { idade: idade || "", sexo: sexo || "", ct: ct || "", hdl: hdl || "", trig: trig || "", cr: cr || "", hba1c: hba1c || "", rac: rac || "" })
  }, [idade, sexo, ct, hdl, trig, cr, hba1c, rac])

  const getOutputRef = useRef<(groupId: string) => string | null>(() => null)
  getOutputRef.current = (groupId: string): string | null => {
    if (groupId !== "todos") return null
    const dateBr = formatDateBR(date)
    const parts = FIELDS.filter(isField)
      .filter((f) => !META_FIELDS.includes(fieldId(f.label)))
      .map((f) => {
        const v = values[fieldId(f.label)]
        if (!v || v.trim() === "") return null
        return `${f.label} ${v.trim()}`
      }).filter(Boolean)
    const labPart = parts.length === 0 ? null : `(${dateBr}): ${parts.join(" // ")}`
    const ampaPart = ampaOutput || null
    const glicemiaPart = glicemiaOutput || null
    const all = [labPart, ampaPart, glicemiaPart].filter(Boolean).join("\n") || null
    if (!all) return null
    return all
  }

  useImperativeHandle(ref, () => ({
    getOutput: (groupId: string) => getOutputRef.current(groupId),
    reset() {
      const now = new Date()
      const hoje = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
      setDate(hoje)
      setValues(() => {
        const init: Record<string, string> = {}
        for (const f of FIELDS) {
          if (isField(f)) init[fieldId(f.label)] = ""
        }
        return init
      })
      setOutros("")
      setCopied(false)
      setAmpaStart(hoje)
      setAmpaCopied(false)
      setAmpaSlotCount(1)
      setActiveTab("exames")
      setGlicemiaCopied(false)
      setAmpaMeasures(() => {
        const init: Record<string, string> = {}
        for (const day of AMPA_DAY_INDEXES) {
          for (const periodo of AMPA_PERIODS) {
            for (let slot = 0; slot < 3; slot++) {
              init[ampaKey(day, periodo.id, slot)] = ""
            }
          }
        }
        return init
      })
      setGlicemiaStart(hoje)
      setGlicemiaMeasures(() => {
        const init: Record<string, string> = {}
        for (const day of GLICEMIA_DAY_INDEXES) {
          for (const periodo of GLICEMIA_PERIODS) {
            init[glicemiaKey(day, periodo.id)] = ""
          }
        }
        return init
      })
      setGlicemiaRows(GLICEMIA_DAY_INDEXES)
      nextGlicemiaRowId.current = GLICEMIA_DAY_INDEXES.length
      setHoverGlicemiaRow(null)
    },
  }), [])

  const handleChange = useCallback((id: string, val: string) => {
    setValues((prev) => ({ ...prev, [id]: val.replace(/,/g, ".") }))
  }, [])

  const handleAmpaChange = useCallback((key: string, val: string) => {
    setAmpaMeasures((prev) => ({ ...prev, [key]: maskAmpa(val) }))
  }, [])

  const handleGlicemiaChange = useCallback((key: string, val: string) => {
    setGlicemiaMeasures((prev) => ({ ...prev, [key]: val }))
  }, [])

  const ampaMean = useCallback((periodo: PeriodoAmpa): AmpaParsed | null => {
    const valid: AmpaParsed[] = []
    for (const day of AMPA_DAY_INDEXES) {
      let last = ""
      for (let slot = ampaSlotCount - 1; slot >= 0; slot--) {
        const v = ampaMeasures[ampaKey(day, periodo, slot)] || ""
        if (v.trim() !== "") { last = v; break }
      }
      const parsed = parseAmpaValue(last)
      if (parsed) valid.push(parsed)
    }
    if (valid.length === 0) return null
    const somaSbp = valid.reduce((acc, m) => acc + m.sbp, 0)
    const somaDbp = valid.reduce((acc, m) => acc + m.dbp, 0)
    const medSbp = Math.round(somaSbp / valid.length)
    const medDbp = Math.round(somaDbp / valid.length)
    return { sbp: medSbp, dbp: medDbp }
  }, [ampaMeasures, ampaSlotCount])

  const isAmpaElevada = useCallback((m: AmpaParsed): boolean => {
    return m.sbp >= 130 || m.dbp >= 80
  }, [])

  const glicemiaStats = useCallback((periodo: PeriodoGlicemia): { min: number; max: number; count: number } | null => {
    const valid: number[] = []
    const cabos: PeriodoGlicemia[] = periodo === "ao_deitar" ? ["ao_deitar", "madrugada"] : [periodo]
    for (const day of glicemiaRows) {
      for (const cabo of cabos) {
        const v = glicemiaMeasures[glicemiaKey(day, cabo)] || ""
        const parsed = parseGlicemiaValue(v)
        if (parsed) valid.push(parsed)
      }
    }
    if (valid.length === 0) return null
    const min = Math.min(...valid)
    const max = Math.max(...valid)
    return { min, max, count: valid.length }
  }, [glicemiaMeasures, glicemiaRows])

  const glicemiaActivePeriods = useMemo(() => {
    return GLICEMIA_PONTOS_PERIODOS[pontosGlicemia].map((id) => {
      const found = GLICEMIA_PERIODS.find((p) => p.id === id)
      return found || null
    }).filter((p): p is { id: PeriodoGlicemia; label: string } => p != null)
  }, [pontosGlicemia])

  const glicemiaOutputPeriods = useMemo(() => {
    return glicemiaActivePeriods.filter((p) => p.id !== "madrugada")
  }, [glicemiaActivePeriods])

  const isGlicemiaRowEmpty = useCallback((rowId: number): boolean => {
    for (const periodo of glicemiaActivePeriods) {
      const v = glicemiaMeasures[glicemiaKey(rowId, periodo.id)] || ""
      if (v.trim() !== "") return false
    }
    return true
  }, [glicemiaMeasures, glicemiaActivePeriods])

  const addGlicemiaRow = useCallback(() => {
    const id = nextGlicemiaRowId.current
    nextGlicemiaRowId.current += 1
    setGlicemiaMeasures((prev) => {
      const next = { ...prev }
      for (const periodo of GLICEMIA_PERIODS) next[glicemiaKey(id, periodo.id)] = ""
      return next
    })
    setGlicemiaRows((prev) => [...prev, id])
  }, [])

  const deleteGlicemiaRow = useCallback((rowId: number) => {
    setGlicemiaRows((prev) => {
      if (prev.length <= 3) return prev
      return prev.filter((r) => r !== rowId)
    })
    setGlicemiaMeasures((prev) => {
      const next = { ...prev }
      for (const periodo of GLICEMIA_PERIODS) delete next[glicemiaKey(rowId, periodo.id)]
      return next
    })
    setHoverGlicemiaRow((prev) => (prev === rowId ? null : prev))
  }, [])

  const ampaOutput = useMemo(() => {
    const dia = ampaMean("dia")
    const noite = ampaMean("noite")
    if (!dia && !noite) return ""
    const dateBr = formatDateBR(ampaStart)
    const partes: string[] = []
    if (dia) partes.push(`média diurna = ${dia.sbp}x${dia.dbp}`)
    if (noite) partes.push(`média noturna = ${noite.sbp}x${noite.dbp}`)
    return `AMPA (${dateBr}): ${partes.join("; ")}`
  }, [ampaMean, ampaStart])

  const ampaElevada = useMemo(() => {
    const dia = ampaMean("dia")
    const noite = ampaMean("noite")
    return (dia != null && isAmpaElevada(dia)) || (noite != null && isAmpaElevada(noite))
  }, [ampaMean, isAmpaElevada])

  const glicemiaOutput = useMemo(() => {
    const partes: string[] = []
    for (const periodo of glicemiaOutputPeriods) {
      const stats = glicemiaStats(periodo.id)
      if (stats) {
        const faixa = stats.count === 1 ? `${stats.min}` : `${stats.min}-${stats.max}`
        partes.push(`${periodo.label} ${faixa}`)
      }
    }
    if (partes.length === 0) return ""
    const dateBr = formatDateBR(glicemiaStart)
    return `Mapa glicêmico (${dateBr}): ${partes.join("; ")}`
  }, [glicemiaStats, glicemiaStart, glicemiaOutputPeriods])

  const glicemiaAlerta = useMemo(() => {
    for (const periodo of glicemiaOutputPeriods) {
      const stats = glicemiaStats(periodo.id)
      if (stats && (stats.max > 140 || stats.min < 80)) {
        return true
      }
    }
    return false
  }, [glicemiaStats, glicemiaOutputPeriods])

  useEffect(() => {
    setValues((prev) => {
      const next = { ...prev }
      let changed = false
      for (const f of FIELDS) {
        if (!isField(f) || !f.calc) continue
        const result = f.calc(prev)
        const id = fieldId(f.label)
        if (result !== null && next[id] !== result) {
          next[id] = result
          changed = true
        } else if (result === null && next[id] !== "") {
          next[id] = ""
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [values])

  const markdown = useMemo(() => {
    const dateBr = formatDateBR(date)
    const parts = FIELDS.filter(isField)
      .filter((f) => !META_FIELDS.includes(fieldId(f.label)))
      .map((f) => {
        const v = values[fieldId(f.label)]
        if (!v || v.trim() === "") return null
        return `${f.label} ${v.trim()}`
      }).filter(Boolean)
    if (parts.length === 0 && !outros.trim()) return ""
    const outrosPart = outros.trim() ? outros.trim() : ""
    const allParts = outrosPart ? [...parts, outrosPart] : parts
    return `(${dateBr}): ${allParts.join(" // ")}`
  }, [date, values, outros])

  const handleCopy = useCallback(() => {
    if (!markdown) return
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [markdown])

  const [ampaCopied, setAmpaCopied] = useState(false)

  const handleAmpaCopy = useCallback(() => {
    const text = ampaOutput
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setAmpaCopied(true)
      setTimeout(() => setAmpaCopied(false), 1500)
    })
  }, [ampaOutput])

  const [glicemiaCopied, setGlicemiaCopied] = useState(false)

  const handleGlicemiaCopy = useCallback(() => {
    const text = glicemiaOutput
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setGlicemiaCopied(true)
      setTimeout(() => setGlicemiaCopied(false), 1500)
    })
  }, [glicemiaOutput])

  const handleClearAll = useCallback(() => {
    const init: Record<string, string> = {}
    for (const f of FIELDS) {
      if (isField(f)) init[fieldId(f.label)] = ""
    }
    setValues(init)
    setOutros("")
setAmpaMeasures(() => {
        const init: Record<string, string> = {}
        for (const day of AMPA_DAY_INDEXES) {
          for (const periodo of AMPA_PERIODS) {
            for (let slot = 0; slot < 3; slot++) {
              init[ampaKey(day, periodo.id, slot)] = ""
            }
          }
        }
        return init
      })
setGlicemiaMeasures(() => {
        const init: Record<string, string> = {}
        for (const day of GLICEMIA_DAY_INDEXES) {
          for (const periodo of GLICEMIA_PERIODS) {
            init[glicemiaKey(day, periodo.id)] = ""
          }
        }
        return init
      })
      setGlicemiaRows(GLICEMIA_DAY_INDEXES)
      nextGlicemiaRowId.current = GLICEMIA_DAY_INDEXES.length
      setHoverGlicemiaRow(null)
  }, [])

  const s = useMemo(buildStyles, [])

  const tema = escuro
    ? { "--exames-bg": "#1c1917", "--exames-text": "#f5f5f4", "--exames-text-muted": "#78716c", "--exames-input-bg": "#2e2b29", "--exames-border": "rgba(255,255,255,0.15)", "--exames-ok": "#4ade80", "--exames-ok-bg": "rgba(34,197,94,0.14)", "--exames-ok-border": "rgba(34,197,94,0.35)", "--exames-warn": "#fbbf24", "--exames-warn-bg": "rgba(251,191,36,0.14)", "--exames-warn-border": "rgba(251,191,36,0.35)", "--exames-danger": "#f87171", "--exames-danger-bg": "rgba(248,113,113,0.14)", "--exames-danger-border": "rgba(248,113,113,0.35)" } as React.CSSProperties
    : { "--exames-ok": "#007a30", "--exames-ok-bg": "rgba(0,184,73,0.06)", "--exames-ok-border": "rgba(0,184,73,0.3)", "--exames-warn": "#b56100", "--exames-warn-bg": "rgba(242,143,0,0.06)", "--exames-warn-border": "rgba(242,143,0,0.35)", "--exames-danger": "#ba120a", "--exames-danger-bg": "rgba(245,49,39,0.06)", "--exames-danger-border": "rgba(245,49,39,0.3)" } as React.CSSProperties

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: injectStyles }} />
      <div
        className={`${EXAMES_PREFIX}-root`}
        style={{ ...s.container, ...tema, ...style }}
        onFocus={() => { touchedRef.current = true }}
      >
        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "start", justifyContent: "space-between" }}>
          <div>
            <div style={s.title}>Exames</div>
            <div style={s.subtitle}>converta facilmente em texto</div>
          </div>
          <button
            onClick={handleClearAll}
            title="Limpar tudo"
            style={{
              background: "var(--exames-input-bg)",
              border: "1px solid var(--exames-border)",
              borderRadius: "8px",
              padding: "8px 12px",
              cursor: "pointer",
              color: "var(--exames-text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              fontWeight: 600,
              flexShrink: 0,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#ef4444"
              e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"
              e.currentTarget.style.background = "rgba(239,68,68,0.06)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--exames-text-muted)"
              e.currentTarget.style.borderColor = "var(--exames-border)"
              e.currentTarget.style.background = "var(--exames-input-bg)"
            }}
          >
            <IconeLixeira />
            Limpar
          </button>
        </div>

        <div style={{ gridColumn: "1 / -1", display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "16px" }}>
          {EXAMES_TABS.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "6px 16px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: "pointer",
                userSelect: "none",
                background: activeTab === tab.id ? "rgba(0, 184, 73, 0.12)" : "var(--exames-input-bg)",
                border: `1px solid ${activeTab === tab.id ? "#00cc52" : "var(--exames-border)"}`,
                color: activeTab === tab.id ? "#00b849" : "var(--exames-text-muted)",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </div>
          ))}
        </div>

        {activeTab === "exames" ? (
        <div className={`${EXAMES_PREFIX}-left`}>
          <div className={`${EXAMES_PREFIX}-date-row`}>
            <div style={{ ...s.inputGroup, flex: "0 0 auto" }}>
              <span style={s.label}>Data</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ ...s.input, width: "170px" }}
              />
            </div>
            <div style={{ ...s.inputGroup, width: "70px", flex: "0 0 70px" }}>
              <span style={s.label}>Sexo</span>
              <select
                value={values["sexo"] || ""}
                onChange={(e) => handleChange("sexo", e.target.value)}
                style={s.input}
              >
                <option value=""> </option>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>
            <div style={{ ...s.inputGroup, width: "80px", flex: "0 0 80px" }}>
              <span style={s.label}>Idade</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="00"
                value={values["idade"] || ""}
                onChange={(e) => handleChange("idade", e.target.value)}
                style={s.input}
              />
            </div>
          </div>

          <div className={`${EXAMES_PREFIX}-grid`}>
            {FIELDS.map((f, i) => {
              if (!isField(f)) {
                return (
                  <div key={`d-${i}`} className={`${EXAMES_PREFIX}-divider-label`}>
                    {f}
                  </div>
                )
              }
              const id = fieldId(f.label)
              if (id === "idade" || id === "sexo") return null
              const isCalc = !!f.calc
              if (id === "tfg") {
                const v = parseInt(values[id] || "")
                const kdigo = !isNaN(v) && v > 0 ? kdigoTfg(v) : null
                return (
                  <div key={id} style={{ ...s.inputGroup, width: TFG_WIDTH, flex: "0 0 auto" }}>
                    <span style={s.label}>TFG</span>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="TFG"
                        value={values[id] || ""}
                        readOnly
                        style={{
                          ...s.inputCalc,
                          ...(kdigo ? { background: kdigo.bg, borderColor: kdigo.border, color: kdigo.cor } : {}),
                          flex: 1,
                          minWidth: 0,
                        }}
                      />
                      {kdigo && (
                        <span style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: kdigo.cor,
                          background: kdigo.bg,
                          border: `1px solid ${kdigo.border}`,
                          borderRadius: "6px",
                          padding: "4px 8px",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}>
                          {kdigo.estagio}
                        </span>
                      )}
                    </div>
                  </div>
                )
              }
              return (
                <div key={id} style={{ ...s.inputGroup, width: FIELD_WIDTH, flex: "0 0 auto" }}>
                  <span style={s.label}>{f.label}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={f.label}
                    value={values[id] || ""}
                    onChange={(e) => handleChange(id, e.target.value)}
                    readOnly={isCalc}
                    style={isCalc ? s.inputCalc : s.input}
                  />
                </div>
              )
            })}
          </div>
        </div>
        ) : activeTab === "ampa" ? (
        <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>
          <div className={`${EXAMES_PREFIX}-date-row`}>
            <div style={{ ...s.inputGroup, flex: "0 0 auto" }}>
              <span style={s.label}>Início da monitorização</span>
              <input
                type="date"
                value={ampaStart}
                onChange={(e) => setAmpaStart(e.target.value)}
                style={{ ...s.input, width: "170px" }}
              />
            </div>
            <div style={{ ...s.inputGroup, flex: "0 0 auto" }}>
              <span style={s.label}>Medidas</span>
              <div style={{ display: "flex", gap: "2px", height: "46px", alignItems: "center" }}>
                {([1, 2, 3] as Array<1 | 2 | 3>).map((n) => (
                  <div
                    key={n}
                    onClick={() => setAmpaSlotCount(n)}
                    title={`${n} ${n === 1 ? "medida" : "medidas"} por vez`}
                    style={{
                      padding: "7px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      userSelect: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: ampaSlotCount === n ? "rgba(0, 184, 73, 0.12)" : "var(--exames-input-bg)",
                      border: `1px solid ${ampaSlotCount === n ? "#00cc52" : "var(--exames-border)"}`,
                      color: ampaSlotCount === n ? "#00b849" : "var(--exames-text-muted)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {n}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "flex-start", minWidth: 0 }}>
          <div style={{ overflowX: "auto", flex: "0 1 auto", minWidth: 0, maxWidth: "100%" }}>
            <table style={{ borderCollapse: "collapse", width: "max-content" }}>
              <thead>
                <tr>
                  <th style={ampaTh}>Dia</th>
                  {AMPA_PERIODS.map((periodo, idx) => (
                    <th key={periodo.id} style={{ ...ampaTh, ...(idx > 0 ? { paddingLeft: "28px" } : {}) }}>{periodo.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AMPA_DAY_INDEXES.map((day) => (
                  <tr key={day}>
                    <td style={ampaTdDia}>{day + 1}</td>
                    {AMPA_PERIODS.map((periodo, idx) => {
                      return (
                        <td key={`${day}-${periodo.id}-cell`} style={{ ...ampaTd, ...(idx > 0 ? { paddingLeft: "28px" } : {}) }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {ampaSlots.map((slot) => {
                              const key = ampaKey(day, periodo.id, slot)
                              const parsed = parseAmpaValue(ampaMeasures[key] || "")
                              const elevada = parsed != null && isAmpaElevada(parsed)
                              return (
                                <input
                                  key={key}
                                  type="text"
                                  inputMode="numeric"
                                  placeholder={ampaSlotCount === 1 ? "" : `${slot + 1}ª`}
                                  value={ampaMeasures[key] || ""}
                                  onChange={(e) => handleAmpaChange(key, e.target.value)}
                                  style={{
                                    ...s.input,
                                    width: "110px",
                                    height: "36px",
                                    flexShrink: 0,
                                    textAlign: "left",
                                    padding: "0 8px",
                                    ...(elevada
                                      ? {
                                          borderColor: "var(--exames-danger-border)",
                                          background: "var(--exames-danger-bg)",
                                          color: "var(--exames-danger)",
                                        }
                                      : {}),
                                  }}
                                />
                              )
                            })}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ flex: "1 1 320px", minWidth: 0, maxWidth: "100%", alignSelf: "flex-start" }}>
            <div style={{ position: "relative", marginTop: 0 }}>
              <div style={{
                ...s.markdownOutput,
                marginTop: 0,
                color: ampaOutput ? s.markdownOutput.color : `var(--${EXAMES_PREFIX}-text-muted)`,
                ...(ampaOutput && ampaElevada
                  ? {
                      borderColor: "var(--exames-danger-border)",
                      background: "var(--exames-danger-bg)",
                      color: "var(--exames-danger)",
                    }
                  : {}),
              }}>
                {ampaOutput || "Preencha as medidas..."}
              </div>
              {ampaOutput && (
                <button
                  className={`${EXAMES_PREFIX}-copy-icon`}
                  onClick={handleAmpaCopy}
                  title={ampaCopied ? "Copiado!" : "Copiar"}
                >
                  {ampaCopied ? <IconeCheck /> : <IconeCopiar />}
                </button>
              )}
            </div>
          </div>
        </div>
        </div>
        ) : activeTab === "glicemia" ? (
        <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>
          <div className={`${EXAMES_PREFIX}-date-row`}>
            <div style={{ ...s.inputGroup, flex: "0 0 auto" }}>
              <span style={s.label}>Início da monitorização</span>
              <input
                type="date"
                value={glicemiaStart}
                onChange={(e) => setGlicemiaStart(e.target.value)}
                style={{ ...s.input, width: "170px" }}
              />
            </div>
            <div style={{ ...s.inputGroup, flex: "0 0 auto" }}>
              <span style={s.label}>Grupo</span>
              <select
                value={grupoGlicemia}
                onChange={(e) => setGrupoGlicemia(e.target.value as GrupoGlicemia)}
                style={{ ...s.input, width: "190px" }}
              >
                {GLICEMIA_GRUPOS.map((g) => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </select>
            </div>
            <div style={{ ...s.inputGroup, flex: "0 0 auto" }}>
              <span style={s.label}>Pontos</span>
              <select
                value={pontosGlicemia}
                onChange={(e) => setPontosGlicemia(parseInt(e.target.value, 10) as PontosGlicemia)}
                style={{ ...s.input, width: "110px" }}
              >
                {GLICEMIA_PONTOS_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ overflowX: "auto", minWidth: 0, maxWidth: "100%" }}>
            <table style={{ borderCollapse: "collapse", width: "max-content" }}>
              <thead>
                <tr>
                  <th style={ampaTh}>Dia</th>
                  {glicemiaActivePeriods.map((periodo, idx) => {
                    const idxGrupo = GLICEMIA_GRUPOS.findIndex((g) => g.id === grupoGlicemia)
                    return (
                      <th key={periodo.id} style={{ ...ampaTh, ...(idx > 0 ? { paddingLeft: "28px" } : {}) }}>
                        {periodo.label}
                        <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.02em", opacity: 0.75 }}>
                          {GLICEMIA_ALVOS[periodo.id][idxGrupo]}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {glicemiaRows.map((rowId, i) => {
                  const empty = isGlicemiaRowEmpty(rowId)
                  const deletable = glicemiaRows.length > 3 && empty
                  const hovering = deletable && hoverGlicemiaRow === rowId
                  return (
                    <tr key={rowId}>
                      <td
                        style={{
                          ...ampaTdDia,
                          ...(hovering
                            ? {
                                color: "var(--exames-danger)",
                                cursor: "pointer",
                              }
                            : {}),
                        }}
                        onMouseEnter={() => { if (deletable) setHoverGlicemiaRow(rowId) }}
                        onMouseLeave={() => setHoverGlicemiaRow((prev) => (prev === rowId ? null : prev))}
                        onClick={() => { if (hovering) deleteGlicemiaRow(rowId) }}
                        title={deletable ? "Linha vazia — clique para excluir" : undefined}
                      >
                        {hovering ? "−" : i + 1}
                      </td>
                      {glicemiaActivePeriods.map((periodo, idx) => {
                        const key = glicemiaKey(rowId, periodo.id)
                        const parsed = parseGlicemiaValue(glicemiaMeasures[key] || "")
                        const alerta = parsed != null && isGlicemiaAlerta(parsed)
                        return (
                          <td key={`${rowId}-${periodo.id}-cell`} style={{ ...ampaTd, ...(idx > 0 ? { paddingLeft: "28px" } : {}) }}>
                            <input
                              key={key}
                              type="text"
                              inputMode="numeric"
                              placeholder=""
                              value={glicemiaMeasures[key] || ""}
                              onChange={(e) => handleGlicemiaChange(key, e.target.value)}
                              style={{
                                ...s.input,
                                width: "44px",
                                height: "36px",
                                flexShrink: 0,
                                textAlign: "center",
                                padding: "0 4px",
                                ...(alerta
                                  ? {
                                      borderColor: "var(--exames-danger-border)",
                                      background: "var(--exames-danger-bg)",
                                      color: "var(--exames-danger)",
                                    }
                                  : {}),
                              }}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div style={{ marginTop: "8px" }}>
              <button
                onClick={addGlicemiaRow}
                title="Adicionar linha"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "var(--exames-input-bg)",
                  border: "1px dashed var(--exames-border)",
                  color: "var(--exames-text-muted)",
                  fontSize: "20px",
                  lineHeight: 1,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s ease",
                }}
              >
                +
              </button>
            </div>
          </div>

          <div style={{ minWidth: 0, maxWidth: "100%" }}>
            <div style={{ position: "relative", marginTop: 0 }}>
              <div style={{
                ...s.markdownOutput,
                marginTop: 0,
                color: glicemiaOutput ? s.markdownOutput.color : `var(--${EXAMES_PREFIX}-text-muted)`,
                ...(glicemiaOutput && glicemiaAlerta
                  ? {
                      borderColor: "var(--exames-danger-border)",
                      background: "var(--exames-danger-bg)",
                      color: "var(--exames-danger)",
                    }
                  : {}),
              }}>
                {glicemiaOutput || "Preencha as medidas..."}
              </div>
              {glicemiaOutput && (
                <button
                  className={`${EXAMES_PREFIX}-copy-icon`}
                  onClick={handleGlicemiaCopy}
                  title={glicemiaCopied ? "Copiado!" : "Copiar"}
                >
                  {glicemiaCopied ? <IconeCheck /> : <IconeCopiar />}
                </button>
              )}
            </div>
          </div>
        </div>
        ) : null}

        <div style={{ display: activeTab === "ampa" || activeTab === "glicemia" ? "none" : undefined }}>
        <div style={{ position: "sticky" as const, top: "48px", minWidth: 0 }}>
          <div className={`${EXAMES_PREFIX}-right`} style={{ maxHeight: "calc(100vh - 80px)", overflowY: "auto" }}>
          {Object.entries(values).some(([k, v]) => k !== "idade" && k !== "sexo" && v.trim() !== "") && (
            <div style={{ ...s.inputGroup, width: "100%" }}>
              <span style={s.label}>Outros</span>
              <input
                type="text"
                placeholder="ex: EAS NDN // HIV negativo // TS O+"
                value={outros}
                onChange={(e) => setOutros(e.target.value)}
                style={{ ...s.input, textAlign: "left" }}
              />
            </div>
          )}
          <div className={`${EXAMES_PREFIX}-md-wrap`}>
            <div style={{
              ...s.markdownOutput,
              color: markdown ? s.markdownOutput.color : `var(--${EXAMES_PREFIX}-text-muted)`,
            }}>
              {markdown || "Preencha os campos ao lado..."}
            </div>
            {markdown && (
              <button
                className={`${EXAMES_PREFIX}-copy-icon`}
                onClick={handleCopy}
                title={copied ? "Copiado!" : "Copiar"}
              >
                {copied ? <IconeCheck /> : <IconeCopiar />}
              </button>
            )}
          </div>
          </div>
        </div>
        </div>
      </div>
    </>
  )
})
