import * as React from "react"
import { forwardRef, useImperativeHandle, useState, useEffect, useCallback, useRef } from "react"
import type { CompanionActions } from "../companions/registry"

const injectStyles = `
  :root {
    --geriatria-bg: #ffffff;
    --geriatria-text: #1a1916;
    --geriatria-text-muted: #6b6760;
    --geriatria-input-bg: rgba(120,120,120,0.08);
    --geriatria-border: rgba(120,120,120,0.15);
    --geriatria-card-bg: rgba(120,120,120,0.06);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --geriatria-bg: #1c1917;
      --geriatria-text: #f5f5f4;
      --geriatria-text-muted: #78716c;
      --geriatria-input-bg: #2e2b29;
      --geriatria-border: rgba(255,255,255,0.15);
      --geriatria-card-bg: rgba(255,255,255,0.06);
    }
  }

  .geriatria-root {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    align-items: start;
  }

  @media (min-width: 900px) {
    .geriatria-root {
      grid-template-columns: 1.2fr 1fr;
    }
  }
  .geriatria-fields-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    width: 100%;
    min-width: 0;
  }

  .geriatria-result-card {
    border-radius: 12px;
    padding: 20px;
    box-sizing: border-box;
    transition: background 0.3s ease, border 0.3s ease;
    min-width: 0;
  }

  .geriatria-badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 6px;
    letter-spacing: 0.04em;
    margin-bottom: 12px;
  }

  .geriatria-chips-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    grid-column: 1 / -1;
  }

  .geriatria-form-section {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    grid-column: 1 / -1;
    background: rgba(120, 120, 120, 0.04);
    padding: 14px;
    border-radius: 12px;
    border: 1px dashed var(--geriatria-border);
    margin-top: 12px;
    min-width: 0;
  }

  .kl-slider-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 0 4px 0;
    grid-column: 1 / -1;
  }
  .kl-slider-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--geriatria-text-muted);
    font-weight: 600;
  }
  .kl-slider-value {
    font-size: 14px;
    font-weight: 600;
    text-align: center;
    min-height: 20px;
    transition: color 0.2s ease;
  }
  .kl-range {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 16px;
    border-radius: 10px;
    outline: none;
    cursor: pointer;
    transition: background 0.2s ease;
  }
  .kl-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.25);
    cursor: pointer;
    background: var(--kl-accent, var(--geriatria-text-muted));
  }
  .kl-range::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.25);
    cursor: pointer;
    background: var(--kl-accent, var(--geriatria-text-muted));
  }

  @media (min-width: 600px) {
    .geriatria-form-section {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 600px) {
    .geriatria-form-section {
      grid-template-columns: 1fr;
    }
  }
`

const styles = {
  container: {
    background: "var(--geriatria-bg)",
    color: "var(--geriatria-text)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: "24px",
    borderRadius: "16px",
    width: "100%",
    boxSizing: "border-box" as const,
    overflowX: "hidden" as const,
    maxWidth: "100%",
  },
  title: {
    fontSize: "20px",
    fontWeight: 700,
    marginBottom: "4px",
    color: "var(--geriatria-text)",
  },
  subtitle: {
    fontSize: "13px",
    color: "var(--geriatria-text-muted)",
    marginBottom: "20px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
    minWidth: 0,
    overflow: "hidden",
  },
  label: {
    fontSize: "11px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "var(--geriatria-text-muted)",
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
  },
  sectionLabel: {
    fontSize: "10px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.07em",
    color: "var(--geriatria-text-muted)",
    fontWeight: 700,
    gridColumn: "1 / -1",
    marginTop: "12px",
    paddingBottom: "4px",
    borderBottom: "1px solid var(--geriatria-border)",
  },
  select: (severityBg?: string, severityBorder?: string) => ({
    background: severityBg || "var(--geriatria-input-bg)",
    border: `1px solid ${severityBorder || "var(--geriatria-border)"}`,
    borderRadius: "10px",
    padding: "10px 14px",
    color: "var(--geriatria-text)",
    fontSize: "14px",
    outline: "none",
    cursor: "pointer",
    height: "42px",
    boxSizing: "border-box" as const,
    width: "100%",
    transition: "all 0.2s ease",
  }),
  input: (severityBg?: string, severityBorder?: string) => ({
    background: severityBg || "var(--geriatria-input-bg)",
    border: `1px solid ${severityBorder || "var(--geriatria-border)"}`,
    borderRadius: "10px",
    padding: "10px 14px",
    color: "var(--geriatria-text)",
    fontSize: "14px",
    outline: "none",
    height: "42px",
    boxSizing: "border-box" as const,
    width: "100%",
    appearance: "none" as const,
    transition: "all 0.2s ease",
  }),
  chip: (active: boolean, activeColor = "#e02424", activeBg = "rgba(224, 36, 36, 0.15)") => ({
    padding: "8px 16px",
    borderRadius: "20px",
    fontSize: "13px",
    cursor: "pointer",
    userSelect: "none" as const,
    background: active ? activeBg : "var(--geriatria-input-bg)",
    border: `1px solid ${active ? activeColor : "var(--geriatria-border)"}`,
    color: active ? activeColor : "var(--geriatria-text-muted)",
    fontWeight: active ? 600 : 400,
    transition: "all 0.15s ease",
  }),
  copyButton: {
    background: "var(--geriatria-input-bg)",
    border: "1px solid var(--geriatria-border)",
    borderRadius: "10px",
    padding: "12px 20px",
    color: "var(--geriatria-text)",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
    transition: "all 0.2s ease",
    marginTop: "12px",
  },
  markdownOutput: {
    background: "var(--geriatria-input-bg)",
    border: "1px solid var(--geriatria-border)",
    borderRadius: "10px",
    padding: "16px",
    color: "var(--geriatria-text)",
    fontSize: "13px",
    fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
    whiteSpace: "pre-wrap" as const,
    overflowX: "auto" as const,
    marginTop: "12px",
    maxHeight: "300px",
    overflowY: "auto" as const,
  },
}

type FieldType = "single_choice" | "multiple_choice" | "text_required" | "text_optional" | "divider"

interface FormField {
  id: string
  label: string
  labelMd?: string
  type: FieldType
  options?: string[]
  value?: string | string[]
  section?: string
}

interface Props {
  style?: React.CSSProperties
}

const secoes = [
  { id: "cuidados", label: "Cuidados" },
  { id: "quedas", label: "Prevenção de Quedas" },
  { id: "medicamentos", label: "Medicamentos" },
  { id: "ivcf20", label: "IVCF-20" },
  { id: "riscos", label: "Riscos Individuais" },
  { id: "sono", label: "Sono" },
  { id: "ambiental", label: "Avaliação Ambiental" },
  { id: "suporte", label: "Suporte Sociofamiliar" },
  { id: "katzlawton", label: "Katz/Lawton" },
  { id: "cage", label: "CAGE" },
  { id: "gds15", label: "GDS-15" },
  { id: "cfs", label: "CFS" },
]

const IVCF_SCORE_MAP: Record<string, (val: string) => number> = {
  ivcf_idade: (v) => v === "≥ 85 anos" ? 3 : v === "75 a 84 anos" ? 1 : 0,
  ivcf_autopercepcao_saude: (v) => v === "regular/ruim" ? 1 : 0,
  ivcf_compras: (v) => v === "sim" ? 2 : 0,
  ivcf_dinheiro: (v) => v === "sim" ? 2 : 0,
  ivcf_domesticos: (v) => v === "sim" ? 2 : 0,
  ivcf_banho: (v) => v === "sim" ? 4 : 0,
  ivcf_esquecimento_familiar: (v) => v === "sim" ? 1 : 0,
  ivcf_esquecimento_piorando: (v) => v === "sim" ? 1 : 0,
  ivcf_esquecimento_atividades: (v) => v === "sim" ? 2 : 0,
  ivcf_desanimo: (v) => v === "sim" ? 2 : 0,
  "ivcf_an Hedonia": (v) => v === "sim" ? 2 : 0,
  ivcf_elevar_bracos: (v) => v === "sim" ? 1 : 0,
  ivcf_manusear: (v) => v === "sim" ? 1 : 0,
  ivcf_dificuldade_andar: (v) => v === "sim" ? 2 : 0,
  ivcf_quedas_duas: (v) => v === "sim" ? 2 : 0,
  ivcf_incontinencia: (v) => v === "sim" ? 2 : 0,
  ivcf_visao: (v) => v === "sim" ? 2 : 0,
  ivcf_audicao: (v) => v === "sim" ? 2 : 0,
}

const computeIVCFTotal = (fields: FormField[]): number => {
  let total = 0
  const condicoesField = fields.find(f => f.id === "ivcf_condicoes_perda")
  const condicoesVal = condicoesField?.value as string[] || []
  if (condicoesVal.length > 0) total += 2

  const comorbField = fields.find(f => f.id === "ivcf_comorbidades")
  const comorbVal = comorbField?.value as string[] || []
  if (comorbVal.length > 0) total += 4

  fields.forEach(f => {
    const scoreFn = IVCF_SCORE_MAP[f.id]
    if (scoreFn && typeof f.value === "string") {
      total += scoreFn(f.value)
    }
  })

  return total
}

const KATZ_SCORE_MAP: Record<string, number> = {
  independente: 1,
  "com ajuda": 0.5,
  dependente: 0,
}

const LAWTON_SCORE_MAP: Record<string, number> = {
  sozinho: 1,
  "com ajuda": 0.5,
  "não consegue": 0,
}

const KATZ_IDS = ["katz_banho", "katz_vestir", "katz_toileting", "katz_transferencia", "katz_continencia", "katz_alimentacao"]
const LAWTON_IDS = ["lawton_telefone", "lawton_compras", "lawton_refeicoes", "lawton_casa", "lawton_roupa", "lawton_transporte", "lawton_medicamentos", "lawton_financas"]

const computeKatzTotal = (fields: FormField[]): number => {
  let total = 0
  fields.forEach(f => {
    if (KATZ_IDS.includes(f.id) && typeof f.value === "string" && f.value) {
      total += KATZ_SCORE_MAP[f.value] ?? 0
    }
  })
  return total
}

const computeLawtonTotal = (fields: FormField[]): number => {
  let total = 0
  fields.forEach(f => {
    if (LAWTON_IDS.includes(f.id) && typeof f.value === "string" && f.value) {
      total += LAWTON_SCORE_MAP[f.value] ?? 0
    }
  })
  return total
}

const computeCAGETotal = (fields: FormField[]): number => {
  let total = 0
  fields.filter(f => f.section === "cage" && f.type === "single_choice").forEach(f => {
    if (f.value === "sim") total += 1
  })
  return total
}

const GDS_REVERSE = new Set(["gds15_01", "gds15_05", "gds15_07", "gds15_11", "gds15_13"])

const computeGDSTotal = (fields: FormField[]): number => {
  let total = 0
  fields.filter(f => f.section === "gds15" && f.type === "single_choice").forEach(f => {
    const answered = f.value === "sim" || f.value === "não"
    if (!answered) return
    if (GDS_REVERSE.has(f.id)) {
      if (f.value === "não") total += 1
    } else {
      if (f.value === "sim") total += 1
    }
  })
  return total
}

const CFS_ABVD = ["vestir-se", "tomar banho", "alimentar-se", "caminhar", "entrar/sair da cama"]
const CFS_AIVD = ["usar telefone", "fazer compras", "preparar refeições", "tarefas domésticas", "tomar medicações", "cuidar das finanças"]
const CFS_LABELS: Record<number, string> = {
  1: "Muito Ativo", 2: "Ativo", 3: "Bem, sem Fragilidade",
  4: "Fragilidade Muito Leve", 5: "Fragilidade Leve", 6: "Fragilidade Moderada",
  7: "Fragilidade Grave", 8: "Fragilidade Muito Grave", 9: "Fase Terminal",
}

function CFSWizard(props: {
  terminal: "sim" | "não" | null
  setTerminal: (v: "sim" | "não" | null) => void
  abvd: Set<string>
  setAbvd: (fn: (prev: Set<string>) => Set<string>) => void
  aivd: Set<string>
  setAivd: (fn: (prev: Set<string>) => Set<string>) => void
  chronic: string
  setChronic: (v: string) => void
  health: "excelente" | "muito_boa" | "boa" | "regular_ruim" | null
  setHealth: (v: "excelente" | "muito_boa" | "boa" | "regular_ruim" | null) => void
  effort: "todo_tempo" | "as_vezes" | "raramente_nunca" | null
  setEffort: (v: "todo_tempo" | "as_vezes" | "raramente_nunca" | null) => void
  sports: "sim" | "não" | null
  setSports: (v: "sim" | "não" | null) => void
}) {
  const { terminal, setTerminal, abvd, setAbvd, aivd, setAivd, chronic, setChronic, health, setHealth, effort, setEffort, sports, setSports } = props
  const showAbvd = terminal !== null
  const showAivd = terminal === "não" && abvd.size === 0
  const showChronic = showAivd && aivd.size === 0
  const showHealth = showChronic && chronic === "0-9"
  const showEffort = showHealth && health !== null && health !== "regular_ruim"
  const showSports = showEffort && effort !== null && effort !== "todo_tempo"

  const toggleAbvd = (item: string) => {
    setAbvd(prev => {
      const next = new Set(prev)
      if (next.has(item)) next.delete(item)
      else next.add(item)
      return next
    })
  }
  const toggleAivd = (item: string) => {
    setAivd(prev => {
      const next = new Set(prev)
      if (next.has(item)) next.delete(item)
      else next.add(item)
      return next
    })
  }

  const selectHealth = (opt: string) => {
    setHealth(opt as "excelente" | "muito_boa" | "boa" | "regular_ruim")
    setEffort(null)
    setSports(null)
  }
  const selectEffort = (opt: string) => {
    setEffort(opt as "todo_tempo" | "as_vezes" | "raramente_nunca")
    setSports(null)
  }

  const resetCfs = (terminal: "sim" | "não") => {
    setTerminal(terminal)
    setAbvd(() => new Set<string>())
    setAivd(() => new Set<string>())
    setChronic("")
    setHealth(null)
    setEffort(null)
    setSports(null)
  }

  const chipStyle = (active: boolean, red?: boolean) => ({
    padding: "8px 14px",
    borderRadius: "20px",
    fontSize: "13px",
    cursor: "pointer",
    userSelect: "none" as const,
    background: active ? (red ? "rgba(224, 36, 36, 0.12)" : "rgba(0, 184, 73, 0.12)") : "var(--geriatria-input-bg)",
    border: `1px solid ${active ? (red ? "#e02424" : "#00cc52") : "var(--geriatria-border)"}`,
    color: active ? (red ? "#e02424" : "#00b849") : "var(--geriatria-text-muted)",
    fontWeight: active ? 600 : 400,
    transition: "all 0.15s ease",
  })

  const stepCard = (num: number, title: string, children: React.ReactNode) => (
    <div key={num} style={{
      gridColumn: "1 / -1",
      background: "rgba(120, 120, 120, 0.04)",
      padding: "14px",
      borderRadius: "12px",
      border: "1px dashed var(--geriatria-border)",
      marginTop: "8px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: "22px", height: "22px", borderRadius: "50%",
          background: "rgba(0, 184, 73, 0.15)", color: "#00b849",
          fontSize: "11px", fontWeight: 700, flexShrink: 0,
        }}>{num}</span>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--geriatria-text)" }}>{title}</span>
      </div>
      {children}
    </div>
  )

  return (
    <>
      {stepCard(1, "Paciente em fase terminal?", (
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={chipStyle(terminal === "sim")} onClick={() => resetCfs("sim")}>sim</div>
          <div style={chipStyle(terminal === "não")} onClick={() => resetCfs("não")}>não</div>
        </div>
      ))}

      {showAbvd && stepCard(2, `ABVDs com ajuda de outra pessoa (${abvd.size}/5)`, (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {CFS_ABVD.map(item => (
            <div key={item} style={chipStyle(abvd.has(item), true)} onClick={() => toggleAbvd(item)}>
              {item}{abvd.has(item) ? " ✕" : ""}
            </div>
          ))}
        </div>
      ))}

      {showAivd && stepCard(3, `AIVDs com ajuda de outra pessoa (${aivd.size}/6)`, (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {CFS_AIVD.map(item => (
            <div key={item} style={chipStyle(aivd.has(item), true)} onClick={() => toggleAivd(item)}>
              {item}{aivd.has(item) ? " ✕" : ""}
            </div>
          ))}
        </div>
      ))}

      {showChronic && stepCard(4, "Número de condições crônicas", (
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={chipStyle(chronic === "0-9")} onClick={() => setChronic("0-9")}>0–9</div>
          <div style={chipStyle(chronic === "10+")} onClick={() => setChronic("10+")}>≥ 10</div>
        </div>
      ))}

      {showHealth && stepCard(5, "Autopercepção de saúde", (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {(["excelente", "muito_boa", "boa", "regular_ruim"] as const).map(opt => (
            <div key={opt} style={chipStyle(health === opt)} onClick={() => selectHealth(opt)}>
              {opt === "muito_boa" ? "muito boa" : opt === "regular_ruim" ? "regular/ruim" : opt}
            </div>
          ))}
        </div>
      ))}

      {showEffort && stepCard(6, "\"Tudo exige esforço\"?", (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {(["todo_tempo", "as_vezes", "raramente_nunca"] as const).map(opt => (
            <div key={opt} style={chipStyle(effort === opt)} onClick={() => selectEffort(opt)}>
              {opt === "todo_tempo" ? "o tempo todo" : opt === "as_vezes" ? "às vezes" : "raramente/nunca"}
            </div>
          ))}
        </div>
      ))}

      {showSports && stepCard(7, "Pratica atividades esportivas ou recreativas moderadas/intensas?", (
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={chipStyle(sports === "sim")} onClick={() => setSports("sim")}>sim</div>
          <div style={chipStyle(sports === "não")} onClick={() => setSports("não")}>não</div>
        </div>
      ))}
    </>
  )
}

export default forwardRef<CompanionActions, Props>(function GeriatriaUI({ style }: Props, ref) {
  const [formFields, setFormFields] = useState<FormField[]>([])
  const [markdownOutput, setMarkdownOutput] = useState<string>("")
  const [copiado, setCopiado] = useState(false)
  const [activeTab, setActiveTab] = useState<"avaliacao" | "katzlawton" | "cage" | "gds15" | "cfs">("avaliacao")
  const mdTextareaRef = useRef<HTMLTextAreaElement>(null)

  const [cfsTerminal, setCfsTerminal] = useState<"sim" | "não" | null>(null)
  const [cfsAbvd, setCfsAbvd] = useState<Set<string>>(new Set())
  const [cfsAivd, setCfsAivd] = useState<Set<string>>(new Set())
  const [cfsChronic, setCfsChronic] = useState("")
  const [cfsHealth, setCfsHealth] = useState<"excelente" | "muito_boa" | "boa" | "regular_ruim" | null>(null)
  const [cfsEffort, setCfsEffort] = useState<"todo_tempo" | "as_vezes" | "raramente_nunca" | null>(null)
  const [cfsSports, setCfsSports] = useState<"sim" | "não" | null>(null)
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    fetch("/contents/geriatria.json")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setFormFields(data.map((f: FormField) => ({ ...f, value: Array.isArray(f.value) ? [...f.value] : f.value ?? "" })))
        }
      })
      .catch(() => setFormFields([]))
  }, [])

  useEffect(() => {
    const el = mdTextareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [markdownOutput])

  const computeCFS = (): number | null => {
    if (cfsTerminal === null) return null
    const abvd = cfsAbvd.size
    if (cfsTerminal === "sim") return abvd <= 2 ? 9 : 8
    if (abvd >= 3) return 7
    if (abvd >= 1) return 6
    const aivd = cfsAivd.size
    if (aivd >= 5) return 6
    if (aivd >= 1) return 5
    if (cfsChronic === "") return null
    if (cfsChronic === "10+") return 4
    if (cfsHealth === null) return null
    if (cfsHealth === "regular_ruim") return 4
    if (cfsEffort === null) return null
    if (cfsEffort === "todo_tempo") return 4
    if (cfsHealth === "excelente") {
      if (cfsSports === null) return null
      return cfsSports === "sim" ? 1 : 2
    }
    if (cfsSports === null) return null
    return cfsSports === "sim" ? 2 : 3
  }
  const cfsScore = computeCFS()

  const generateSectionMarkdown = useCallback((sectionId: string, sectionLabel: string): string | null => {
    const campos = formFields.filter(f => (f.section || "geral") === sectionId && f.type !== "divider")
    if (campos.length === 0) return null

    const getLabelMd = (field: FormField) => field.labelMd || field.label
    const getValueMd = (field: FormField): string | null => {
      const value = field.value
      if (!value || (Array.isArray(value) && value.length === 0)) {
        if (field.type === "text_optional" || field.type === "multiple_choice" || field.type === "single_choice") return null
        return " "
      }
      return Array.isArray(value) ? value.join(", ") : value
    }

    let md = `- ${sectionLabel}\n`
    campos.forEach(field => {
      const valueMd = getValueMd(field)
      if (valueMd === null) return
      md += `  - ${getLabelMd(field)}: ${valueMd}\n`
    })

    const todayBR = new Date().toLocaleDateString("pt-BR")

    if (sectionId === "ivcf20") {
      const ivcfFilled = formFields.some(f => f.section === "ivcf20" && f.type !== "divider" && f.id !== "ivcf_total" && f.value && (typeof f.value === "string" ? f.value !== "" : (f.value as string[]).length > 0))
      if (!ivcfFilled) return null
      const total = computeIVCFTotal(formFields)
      return `IVCF-20 (${todayBR}): ${total}/40`
    }

    if (sectionId === "cage") {
      const cageFilled = formFields.some(f => f.section === "cage" && f.type === "single_choice" && f.value && f.value !== "")
      if (!cageFilled) return null
      const total = computeCAGETotal(formFields)
      return `CAGE (${todayBR}): ${total}/4`
    }

    if (sectionId === "gds15") {
      const gdsFilled = formFields.some(f => f.section === "gds15" && f.type === "single_choice" && f.value && f.value !== "")
      if (!gdsFilled) return null
      const total = computeGDSTotal(formFields)
      return `GDS-15 (${todayBR}): ${total}/15`
    }

    if (sectionId === "katzlawton") {
      const klFilled = formFields.some(f => f.section === "katzlawton" && f.type === "single_choice" && f.value && f.value !== "")
      if (!klFilled) return null
      const katz = computeKatzTotal(formFields)
      const lawton = computeLawtonTotal(formFields)
      const katzCount = formFields.filter(f => KATZ_IDS.includes(f.id) && typeof f.value === "string" && f.value !== "").length
      const lawtonCount = formFields.filter(f => LAWTON_IDS.includes(f.id) && typeof f.value === "string" && f.value !== "").length
      let md = `- Katz/Lawton (${todayBR})\n`
      if (katzCount > 0) md += `  - Katz: ${katz}/6\n`
      if (lawtonCount > 0) md += `  - Lawton: ${lawton}/8\n`
      return md.trimEnd()
    }

    if (sectionId === "cfs") {
      if (cfsScore === null) return null
      return `CFS (${todayBR}): ${cfsScore}/9 — ${CFS_LABELS[cfsScore]}`
    }

    return md.trimEnd()
  }, [formFields, cfsScore])

  const generateMarkdown = useCallback(() => {
    return secoes
      .map(s => generateSectionMarkdown(s.id, s.label))
      .filter(Boolean)
      .join("\n\n")
  }, [generateSectionMarkdown])

  const getOutputRef = useRef<(groupId: string) => string | null>(() => null)
  getOutputRef.current = (groupId: string): string | null => {
    if (groupId === "tudo") {
      return secoes
        .filter(s => s.id !== "ivcf20" && s.id !== "cage" && s.id !== "gds15" && s.id !== "cfs" && s.id !== "katzlawton")
        .map(s => generateSectionMarkdown(s.id, s.label))
        .filter(Boolean)
        .join("\n\n") || null
    }
    const secao = secoes.find(s => s.id === groupId)
    if (!secao) return null
    return generateSectionMarkdown(groupId, secao.label)
  }

  useImperativeHandle(ref, () => ({
    getOutput: (groupId: string) => getOutputRef.current(groupId),
    reset() {
      setCopiado(false)
      setCfsTerminal(null)
      setCfsAbvd(new Set())
      setCfsAivd(new Set())
      setCfsChronic("")
      setCfsHealth(null)
      setCfsEffort(null)
      setCfsSports(null)
      fetch("/contents/geriatria.json")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setFormFields(data.map((f: FormField) => ({ ...f, value: Array.isArray(f.value) ? [...f.value] : f.value ?? "" })))
          }
        })
      .catch(() => setFetchError(true))
    },
  }), [])

  useEffect(() => {
    if (formFields.length > 0) {
      setMarkdownOutput(generateMarkdown())
    }
  }, [formFields, generateMarkdown])

  const updateFieldValue = (fieldId: string, newValue: string | string[]) => {
    const normalized = typeof newValue === "string" ? newValue.replace(/,/g, ".") : newValue

    setFormFields(prev => {
      let updated = prev.map(field =>
        field.id === fieldId ? { ...field, value: normalized } : field
      )

      if (fieldId.startsWith("ivcf_") && fieldId !== "ivcf_total") {
        const total = computeIVCFTotal(updated)
        updated = updated.map(f =>
          f.id === "ivcf_total" ? { ...f, value: String(total) } : f
        )
      }

      return updated
    })
  }

  const toggleMultipleChoice = (fieldId: string, option: string) => {
    setFormFields(prev =>
      prev.map(field => {
        if (field.id !== fieldId || field.type !== "multiple_choice") return field
        const currentValues = (field.value as string[]) || []
        const newValues = currentValues.includes(option)
          ? currentValues.filter(v => v !== option)
          : [...currentValues, option]

        return { ...field, value: newValues }
      })
    )
  }

  const copyToClipboard = async () => {
    const md = generateMarkdown()
    if (!md) return
    try {
      await navigator.clipboard.writeText(md)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch { /* fallback */ }
  }

  const renderField = (field: FormField) => {
    switch (field.type) {
      case "divider":
        return (
          <div key={field.id} style={{
            gridColumn: "1 / -1",
            borderTop: "1px solid var(--geriatria-border)",
            margin: "4px 0",
            opacity: 0.6,
          }} />
        )
      case "single_choice": {
        const isLong = (field.label?.length ?? 0) > 22
        const isKL = field.section === "katzlawton"
        if (isKL && field.options && field.options.length >= 3) {
          const idx = field.value ? field.options.indexOf(field.value as string) : -1
          const hue = idx >= 0 ? Math.round(120 - (idx / (field.options.length - 1)) * 120) : 0
          const accent = idx >= 0 ? `hsl(${hue}, 70%, 42%)` : "var(--geriatria-text-muted)"
          return (
            <div key={field.id} className="kl-slider-row">
              <label className="kl-slider-label">{field.label}</label>
              <input
                type="range"
                className="kl-range"
                min={0}
                max={field.options.length - 1}
                step={1}
                value={idx >= 0 ? idx : 0}
                onChange={(e) => {
                  const newIdx = parseInt(e.target.value)
                  updateFieldValue(field.id, field.value === field.options![newIdx] ? "" : field.options![newIdx])
                }}
                style={{
                  ["--kl-accent" as string]: accent,
                  background: idx >= 0
                    ? `linear-gradient(to right, ${accent} 0%, ${accent} ${(idx / (field.options.length - 1)) * 100}%, var(--geriatria-border) ${(idx / (field.options.length - 1)) * 100}%, var(--geriatria-border) 100%)`
                    : `var(--geriatria-border)`,
                }}
              />
              <div className="kl-slider-value" style={{ color: accent }}>
                {idx >= 0 ? field.options[idx] : "—"}
              </div>
            </div>
          )
        }
        return (
          <div
            key={field.id}
            style={{
              ...styles.inputGroup,
              ...(isLong ? { gridColumn: "1 / -1" } : {}),
            }}
          >
            <label style={styles.label}>{field.label}</label>
            <div className="geriatria-chips-grid" style={{ marginTop: "8px" }}>
              {field.options?.map(opt => {
                const isSelected = (field.value as string) === opt
                return (
                  <div
                    key={opt}
                    style={styles.chip(isSelected, "#00cc52", "rgba(0, 184, 73, 0.12)")}
                    onClick={() => updateFieldValue(field.id, isSelected ? "" : opt)}
                  >
                    {opt}
                  </div>
                )
              })}
            </div>
          </div>
        )
      }
      case "multiple_choice":
        return (
          <div key={field.id} style={{ gridColumn: "1 / -1" }}>
            <label style={styles.label}>{field.label}</label>
            <div className="geriatria-chips-grid" style={{ marginTop: "8px" }}>
              {field.options?.map(opt => {
                const isSelected = ((field.value as string[]) || []).includes(opt)
                return (
                  <div
                    key={opt}
                    style={styles.chip(isSelected, "#00cc52", "rgba(0, 184, 73, 0.12)")}
                    onClick={() => toggleMultipleChoice(field.id, opt)}
                  >
                    {opt}
                  </div>
                )
              })}
            </div>
          </div>
        )
      case "text_required":
      case "text_optional": {
        const isLong = (field.label?.length ?? 0) > 28
        const isIvcfTotal = field.id === "ivcf_total"
        return (
          <div
            key={field.id}
            style={{ ...styles.inputGroup, ...(isLong ? { gridColumn: "1 / -1" } : {}) }}
          >
            <label style={styles.label}>
              {field.label}
              {field.type === "text_required" && " *"}
            </label>
            <input
              type="text"
              value={(field.value as string) || ""}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              placeholder={field.type === "text_optional" ? "Opcional" : "Obrigatório"}
              style={styles.input()}
              readOnly={isIvcfTotal}
            />
          </div>
        )
      }
      default:
        return null
    }
  }

  const groupFieldsBySection = (fields: FormField[]) => {
    const groups: Record<string, FormField[]> = {}
    fields.filter(f => f.id !== "ivcf_total").forEach(field => {
      const section = field.section || "geral"
      if (!groups[section]) groups[section] = []
      groups[section].push(field)
    })
    return secoes
      .filter(s => groups[s.id]?.length)
      .map(s => ({ ...s, fields: groups[s.id] }))
  }

  const ivcfTotal = computeIVCFTotal(formFields)
  const cageTotal = computeCAGETotal(formFields)
  const cageFilled = formFields.some(f => f.section === "cage" && f.type === "single_choice" && f.value && f.value !== "")
  const gds15Total = computeGDSTotal(formFields)
  const gds15Filled = formFields.some(f => f.section === "gds15" && f.type === "single_choice" && f.value && f.value !== "")
  const katzTotal = computeKatzTotal(formFields)
  const lawtonTotal = computeLawtonTotal(formFields)
  const klFilled = formFields.some(f => f.section === "katzlawton" && f.type === "single_choice" && f.value && f.value !== "")

  const ivcfClassificacao = ivcfTotal === 0
    ? ""
    : ivcfTotal <= 6
      ? "baixa"
      : ivcfTotal <= 14
        ? "moderada"
        : "alta"

  const gds15Card = activeTab === "gds15" && gds15Filled ? (() => {
    const gdsColor = gds15Total <= 4 ? "#00b849" : gds15Total <= 9 ? "#ca8a04" : "#e02424"
    return (
    <div style={{
      background: gds15Total <= 4 ? "rgba(0, 184, 73, 0.08)" : gds15Total <= 9 ? "rgba(234, 179, 8, 0.08)" : "rgba(224, 36, 36, 0.08)",
      border: `1px solid ${
        gds15Total <= 4 ? "rgba(0, 184, 73, 0.35)" : gds15Total <= 9 ? "rgba(234, 179, 8, 0.35)" : "rgba(224, 36, 36, 0.35)"
      }`,
      borderRadius: "12px",
      padding: "12px 16px",
      textAlign: "center" as const,
    }}>
      <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--geriatria-text-muted)", marginBottom: "4px" }}>
        GDS-15
      </div>
      <div style={{ fontSize: "28px", fontWeight: 800, color: gdsColor }}>
        {gds15Total} / 15
      </div>
      <div style={{ fontSize: "10px", color: "var(--geriatria-text-muted)", marginTop: "2px" }}>
        {gds15Total <= 4 ? "Normal" : gds15Total <= 9 ? "Depressão leve" : "Depressão moderada a grave"}
      </div>
    </div>
    )
  })() : null

  const cfsCard = activeTab === "cfs" && cfsScore !== null ? (() => {
    const cfsColor = cfsScore <= 3 ? "#00b849" : cfsScore <= 5 ? "#ca8a04" : cfsScore <= 7 ? "#e02424" : "#7c2d12"
    return (
    <div style={{
      background: cfsScore <= 3 ? "rgba(0, 184, 73, 0.08)" : cfsScore <= 5 ? "rgba(234, 179, 8, 0.08)" : cfsScore <= 7 ? "rgba(224, 36, 36, 0.08)" : "rgba(124, 45, 18, 0.08)",
      border: `1px solid ${
        cfsScore <= 3 ? "rgba(0, 184, 73, 0.35)" : cfsScore <= 5 ? "rgba(234, 179, 8, 0.35)" : cfsScore <= 7 ? "rgba(224, 36, 36, 0.35)" : "rgba(124, 45, 18, 0.35)"
      }`,
      borderRadius: "12px",
      padding: "12px 16px",
      textAlign: "center" as const,
    }}>
      <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--geriatria-text-muted)", marginBottom: "4px" }}>
        CFS
      </div>
      <div style={{ fontSize: "28px", fontWeight: 800, color: cfsColor }}>
        {cfsScore} / 9
      </div>
      <div style={{ fontSize: "10px", color: "var(--geriatria-text-muted)", marginTop: "2px" }}>
        {CFS_LABELS[cfsScore]}
      </div>
    </div>
    )
  })() : null

  const katzlawtonCard = activeTab === "katzlawton" && klFilled ? (() => {
    const hasKatz = formFields.some(f => KATZ_IDS.includes(f.id) && typeof f.value === "string" && f.value !== "")
    const hasLawton = formFields.some(f => LAWTON_IDS.includes(f.id) && typeof f.value === "string" && f.value !== "")
    return (
    <div style={{ display: "grid", gridTemplateColumns: hasKatz && hasLawton ? "1fr 1fr" : "1fr", gap: "8px" }}>
      {hasKatz && (
        <div style={{
          background: katzTotal >= 5 ? "rgba(0, 184, 73, 0.08)" : katzTotal >= 3 ? "rgba(234, 179, 8, 0.08)" : "rgba(224, 36, 36, 0.08)",
          border: `1px solid ${katzTotal >= 5 ? "rgba(0, 184, 73, 0.35)" : katzTotal >= 3 ? "rgba(234, 179, 8, 0.35)" : "rgba(224, 36, 36, 0.35)"}`,
          borderRadius: "12px", padding: "12px 16px", textAlign: "center" as const,
        }}>
          <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--geriatria-text-muted)", marginBottom: "4px" }}>Katz ADL</div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: katzTotal >= 5 ? "#00b849" : katzTotal >= 3 ? "#ca8a04" : "#e02424" }}>{katzTotal} / 6</div>
          <div style={{ fontSize: "10px", color: "var(--geriatria-text-muted)", marginTop: "2px" }}>
            {katzTotal >= 5 ? "Independente" : katzTotal >= 3 ? "Dependência parcial" : "Dependência significativa"}
          </div>
        </div>
      )}
      {hasLawton && (
        <div style={{
          background: lawtonTotal >= 6 ? "rgba(0, 184, 73, 0.08)" : lawtonTotal >= 3 ? "rgba(234, 179, 8, 0.08)" : "rgba(224, 36, 36, 0.08)",
          border: `1px solid ${lawtonTotal >= 6 ? "rgba(0, 184, 73, 0.35)" : lawtonTotal >= 3 ? "rgba(234, 179, 8, 0.35)" : "rgba(224, 36, 36, 0.35)"}`,
          borderRadius: "12px", padding: "12px 16px", textAlign: "center" as const,
        }}>
          <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--geriatria-text-muted)", marginBottom: "4px" }}>Lawton IADL</div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: lawtonTotal >= 6 ? "#00b849" : lawtonTotal >= 3 ? "#ca8a04" : "#e02424" }}>{lawtonTotal} / 8</div>
          <div style={{ fontSize: "10px", color: "var(--geriatria-text-muted)", marginTop: "2px" }}>
            {lawtonTotal >= 6 ? "Independente" : lawtonTotal >= 3 ? "Ajudas pontuais" : "Muita dependência"}
          </div>
        </div>
      )}
    </div>
    )
  })() : null

  return (
    <div style={{ ...styles.container, ...style }}>
      <style dangerouslySetInnerHTML={{ __html: injectStyles }} />

      <div style={styles.title}>checklist da geriatria</div>
      <div style={styles.subtitle}>baseado na caderneta da pessoa idosa</div>

      <div style={{ display: "flex", gap: "4px", marginBottom: "16px" }}>
        {([["avaliacao", "Avaliação"], ["katzlawton", "Katz/Lawton"], ["cage", "CAGE"], ["gds15", "GDS-15"], ["cfs", "CFS"]] as const).map(([key, label]) => (
          <div
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: "6px 16px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: activeTab === key ? 600 : 400,
              cursor: "pointer",
              userSelect: "none",
              background: activeTab === key ? "rgba(0, 184, 73, 0.12)" : "var(--geriatria-input-bg)",
              border: `1px solid ${activeTab === key ? "#00cc52" : "var(--geriatria-border)"}`,
              color: activeTab === key ? "#00b849" : "var(--geriatria-text-muted)",
              transition: "all 0.15s ease",
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {fetchError && (
        <div style={{ marginBottom: "12px", padding: "10px 14px", borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", fontSize: "12.5px", color: "#b91c1c", lineHeight: 1.4 }}>
          Falha ao carregar dados da geriatria. Verifique a conexão e recarregue a página.
        </div>
      )}

      <div className="geriatria-root">
        <div className="geriatria-fields-grid">
          {activeTab === "cfs" ? (
            <CFSWizard
              terminal={cfsTerminal} setTerminal={setCfsTerminal}
              abvd={cfsAbvd} setAbvd={setCfsAbvd}
              aivd={cfsAivd} setAivd={setCfsAivd}
              chronic={cfsChronic} setChronic={setCfsChronic}
              health={cfsHealth} setHealth={setCfsHealth}
              effort={cfsEffort} setEffort={setCfsEffort}
              sports={cfsSports} setSports={setCfsSports}
            />
          ) : formFields.length > 0 && (
            <>
              {groupFieldsBySection(
                activeTab === "cage"
                  ? formFields.filter(f => f.section === "cage")
                  : activeTab === "gds15"
                    ? formFields.filter(f => f.section === "gds15")
                    : activeTab === "katzlawton"
                      ? formFields.filter(f => f.section === "katzlawton")
                      : formFields.filter(f => f.section !== "cage" && f.section !== "gds15" && f.section !== "katzlawton")
              ).map(({ id, label, fields }) => (
                <React.Fragment key={id}>
                  <div style={styles.sectionLabel}>{label}</div>
                  <div className="geriatria-form-section">
                    {fields.map(field => renderField(field))}
                  </div>
                </React.Fragment>
              ))}
            </>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {formFields.length > 0 && (
            <>
              {/* Score cards row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
                {activeTab === "avaliacao" && (
                <div style={{
                  background: ivcfTotal === 0 ? "var(--geriatria-card-bg)" : (
                    ivcfTotal <= 6 ? "rgba(0, 184, 73, 0.08)" :
                    ivcfTotal <= 14 ? "rgba(234, 179, 8, 0.08)" : "rgba(224, 36, 36, 0.08)"
                  ),
                  border: `1px solid ${
                    ivcfTotal === 0 ? "var(--geriatria-border)" :
                    ivcfTotal <= 6 ? "rgba(0, 184, 73, 0.35)" :
                    ivcfTotal <= 14 ? "rgba(234, 179, 8, 0.35)" : "rgba(224, 36, 36, 0.35)"
                  }`,
                  borderRadius: "12px",
                  padding: "12px 16px",
                  textAlign: "center" as const,
                }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--geriatria-text-muted)", marginBottom: "4px" }}>
                    IVCF-20
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: 800, color: ivcfTotal === 0 ? "var(--geriatria-text-muted)" : (
                    ivcfTotal <= 6 ? "#00b849" : ivcfTotal <= 14 ? "#ca8a04" : "#e02424"
                  )}}>
                    {ivcfTotal || "—"}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--geriatria-text-muted)", marginTop: "2px" }}>
                    {ivcfTotal === 0 ? "Preencha o IVCF-20" :
                     ivcfClassificacao === "baixa" ? "Risco baixo" :
                     ivcfClassificacao === "moderada" ? "Risco moderado" : "Risco alto"}
                  </div>
                </div>
                )}
                {activeTab === "cage" && cageFilled && (
                  <div style={{
                    background: cageTotal < 2 ? "rgba(0, 184, 73, 0.08)" : "rgba(224, 36, 36, 0.08)",
                    border: `1px solid ${
                      cageTotal < 2 ? "rgba(0, 184, 73, 0.35)" : "rgba(224, 36, 36, 0.35)"
                    }`,
                    borderRadius: "12px",
                    padding: "12px 16px",
                    textAlign: "center" as const,
                  }}>
                    <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--geriatria-text-muted)", marginBottom: "4px" }}>
                      CAGE
                    </div>
                    <div style={{ fontSize: "28px", fontWeight: 800, color: cageTotal >= 2 ? "#e02424" : "#00b849" }}>
                      {cageTotal}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--geriatria-text-muted)", marginTop: "2px" }}>
                      {cageTotal >= 2 ? "Uso problemático" : "Baixo risco"}
                    </div>
                  </div>
                )}
                {gds15Card}
                {cfsCard}
                {katzlawtonCard}
              </div>

              {activeTab === "avaliacao" ? (
              <div
                className="geriatria-result-card"
                style={{
                  background: "var(--geriatria-card-bg)",
                  border: "1px solid var(--geriatria-border)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "4px"
                  }}
                >
                  <div
                    className="geriatria-badge"
                    style={{
                      background: "rgba(0, 184, 73, 0.12)",
                      color: "#00cc52",
                    }}
                  >
                    Resultado
                  </div>
                  <button
                    onClick={copyToClipboard}
                    style={{
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "34px",
                      height: "34px",
                      borderRadius: "8px",
                      border: "1px solid var(--geriatria-border)",
                      background: copiado ? "rgba(0, 184, 73, 0.08)" : "var(--geriatria-input-bg)",
                      color: copiado ? "#007a30" : "var(--geriatria-text-muted)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      padding: "0",
                      borderColor: copiado ? "rgba(0, 184, 73, 0.35)" : undefined
                    }}
                    title={copiado ? "Copiado!" : "Copiar markdown"}
                  >
                    {copiado ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
                {markdownOutput && (
                  <textarea
                    ref={mdTextareaRef}
                    value={markdownOutput}
                    onChange={(e) => setMarkdownOutput(e.target.value)}
                    style={{
                      ...styles.markdownOutput,
                      resize: "none",
                      overflow: "hidden",
                      display: "block",
                      width: "100%",
                      minHeight: "unset",
                      maxHeight: "unset",
                      height: "auto",
                      boxSizing: "border-box",
                      marginTop: "12px",
                    }}
                    spellCheck={false}
                  />
                )}
              </div>
              ) : activeTab === "cage" ? (
              <div
                className="geriatria-result-card"
                style={{
                  background: cageTotal >= 2 ? "rgba(224, 36, 36, 0.06)" : "var(--geriatria-card-bg)",
                  border: `1px solid ${cageTotal >= 2 ? "rgba(224, 36, 36, 0.3)" : "var(--geriatria-border)"}`,
                }}
              >
                <div className="geriatria-badge" style={{ background: "rgba(0, 184, 73, 0.12)", color: "#00cc52" }}>
                  CAGE
                </div>
                <div style={{ marginTop: "12px", fontSize: "14px", color: "var(--geriatria-text)", lineHeight: "1.5" }}>
                  {cageFilled ? (
                    <>
                      <div style={{ fontWeight: 700, fontSize: "24px", color: cageTotal >= 2 ? "#e02424" : "#00b849", marginBottom: "4px" }}>
                        {cageTotal} / 4
                      </div>
                      <div style={{ fontSize: "13px", color: "var(--geriatria-text-muted)" }}>
                        {cageTotal >= 2 ? "Resultado positivo — considerar avaliação para uso de álcool/substâncias" : "Resultado negativo — baixo risco"}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: "var(--geriatria-text-muted)", fontSize: "13px" }}>
                      Responda as perguntas do CAGE ao lado.
                    </div>
                  )}
                </div>
              </div>
              ) : activeTab === "cfs" ? (
              <div
                className="geriatria-result-card"
                style={{
                  background: cfsScore === null ? "var(--geriatria-card-bg)" : cfsScore <= 3 ? "rgba(0, 184, 73, 0.06)" : cfsScore <= 5 ? "rgba(234, 179, 8, 0.06)" : "rgba(224, 36, 36, 0.06)",
                  border: `1px solid ${
                    cfsScore === null ? "var(--geriatria-border)" :
                    cfsScore <= 3 ? "rgba(0, 184, 73, 0.3)" :
                    cfsScore <= 5 ? "rgba(234, 179, 8, 0.3)" : "rgba(224, 36, 36, 0.3)"
                  }`,
                }}
              >
                <div className="geriatria-badge" style={{ background: "rgba(0, 184, 73, 0.12)", color: "#00cc52" }}>
                  CFS
                </div>
                <div style={{ marginTop: "12px", fontSize: "14px", color: "var(--geriatria-text)", lineHeight: "1.5" }}>
                  {cfsScore !== null ? (
                    <>
                      <div style={{ fontWeight: 700, fontSize: "24px", color: cfsScore <= 3 ? "#00b849" : cfsScore <= 5 ? "#ca8a04" : "#e02424", marginBottom: "4px" }}>
                        {cfsScore} — {CFS_LABELS[cfsScore]}
                      </div>
                      <div style={{ fontSize: "13px", color: "var(--geriatria-text-muted)" }}>
                        {cfsScore <= 3 ? "Sem fragilidade significativa" : cfsScore <= 5 ? "Fragilidade leve a muito leve — acompanhamento" : cfsScore <= 7 ? "Fragilidade moderada a grave — intervenção indicada" : "Fragilidade muito grave / fase terminal"}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: "var(--geriatria-text-muted)", fontSize: "13px" }}>
                      Siga a árvore de classificação ao lado.
                    </div>
                  )}
                </div>
              </div>
              ) : activeTab === "katzlawton" ? (
              <div
                className="geriatria-result-card"
                style={{
                  background: "var(--geriatria-card-bg)",
                  border: "1px solid var(--geriatria-border)",
                }}
              >
                <div className="geriatria-badge" style={{ background: "rgba(0, 184, 73, 0.12)", color: "#00cc52" }}>
                  Katz/Lawton
                </div>
                <div style={{ marginTop: "12px", fontSize: "14px", color: "var(--geriatria-text)", lineHeight: "1.5" }}>
                  {klFilled ? (
                    <>
                      {formFields.some(f => KATZ_IDS.includes(f.id) && typeof f.value === "string" && f.value !== "") && (
                        <div style={{ marginBottom: "8px" }}>
                          <div style={{ fontWeight: 700, fontSize: "20px", color: katzTotal >= 5 ? "#00b849" : katzTotal >= 3 ? "#ca8a04" : "#e02424", marginBottom: "2px" }}>
                            Katz ADL: {katzTotal} / 6
                          </div>
                          <div style={{ fontSize: "13px", color: "var(--geriatria-text-muted)" }}>
                            {katzTotal >= 5 ? "Independente nas AVDs básicas" : katzTotal >= 3 ? "Dependência parcial — algumas AVDs comprometidas" : "Dependência significativa na maioria das AVDs"}
                          </div>
                        </div>
                      )}
                      {formFields.some(f => LAWTON_IDS.includes(f.id) && typeof f.value === "string" && f.value !== "") && (
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "20px", color: lawtonTotal >= 6 ? "#00b849" : lawtonTotal >= 3 ? "#ca8a04" : "#e02424", marginBottom: "2px" }}>
                            Lawton IADL: {lawtonTotal} / 8
                          </div>
                          <div style={{ fontSize: "13px", color: "var(--geriatria-text-muted)" }}>
                            {lawtonTotal >= 6 ? "Independente nas AIVDs" : lawtonTotal >= 3 ? "Ajudas pontuais — algumas AIVDs comprometidas" : "Muita dependência — maioria das AIVDs comprometidas"}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ color: "var(--geriatria-text-muted)", fontSize: "13px" }}>
                      Responda as escalas ao lado.
                    </div>
                  )}
                </div>
              </div>
              ) : (
              <div
                className="geriatria-result-card"
                style={{
                  background: gds15Total <= 4 ? "var(--geriatria-card-bg)" : gds15Total <= 9 ? "rgba(234, 179, 8, 0.06)" : "rgba(224, 36, 36, 0.06)",
                  border: `1px solid ${
                    gds15Total <= 4 ? "var(--geriatria-border)" :
                    gds15Total <= 9 ? "rgba(234, 179, 8, 0.3)" : "rgba(224, 36, 36, 0.3)"
                  }`,
                }}
              >
                <div className="geriatria-badge" style={{ background: "rgba(0, 184, 73, 0.12)", color: "#00cc52" }}>
                  GDS-15
                </div>
                <div style={{ marginTop: "12px", fontSize: "14px", color: "var(--geriatria-text)", lineHeight: "1.5" }}>
                  {gds15Filled ? (
                    <>
                      <div style={{ fontWeight: 700, fontSize: "24px", color: gds15Total <= 4 ? "#00b849" : gds15Total <= 9 ? "#ca8a04" : "#e02424", marginBottom: "4px" }}>
                        {gds15Total} / 15
                      </div>
                      <div style={{ fontSize: "13px", color: "var(--geriatria-text-muted)" }}>
                        {gds15Total <= 4 ? "Normal — sem indicativos de depressão" : gds15Total <= 9 ? "Depressão leve — considerar avaliação complementar" : "Depressão moderada a grave — encaminhamento indicado"}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: "var(--geriatria-text-muted)", fontSize: "13px" }}>
                      Responda as perguntas da GDS-15 ao lado.
                    </div>
                  )}
                </div>
              </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
})
