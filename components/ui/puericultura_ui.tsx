import * as React from "react"
import { useState, useEffect, useCallback, useRef } from "react"

const injectStyles = `
  :root {
    --puericultura-bg: #ffffff;
    --puericultura-text: #1a1916;
    --puericultura-text-muted: #6b6760;
    --puericultura-input-bg: rgba(120,120,120,0.08);
    --puericultura-border: rgba(120,120,120,0.15);
    --puericultura-card-bg: rgba(120,120,120,0.06);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --puericultura-bg: #1c1917;
      --puericultura-text: #f5f5f4;
      --puericultura-text-muted: #78716c;
      --puericultura-input-bg: rgba(255,255,255,0.08);
      --puericultura-border: rgba(255,255,255,0.15);
      --puericultura-card-bg: rgba(255,255,255,0.06);
    }
  }

  .puericultura-root {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    align-items: start;
  }
  
  @media (min-width: 900px) {
    .puericultura-root {
      grid-template-columns: 1.2fr 1fr;
    }
  }

  .puericultura-fields-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    width: 100%;
  }

  .puericultura-result-card {
    border-radius: 12px;
    padding: 20px;
    box-sizing: border-box;
    transition: background 0.3s ease, border 0.3s ease;
  }

  .puericultura-badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 6px;
    letter-spacing: 0.04em;
    margin-bottom: 12px;
  }

  .puericultura-chips-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    grid-column: 1 / -1;
  }

  .puericultura-form-section {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    grid-column: 1 / -1;
    background: rgba(120, 120, 120, 0.04);
    padding: 14px;
    border-radius: 12px;
    border: 1px dashed var(--puericultura-border);
    margin-top: 12px;
  }

  @media (min-width: 600px) {
    .puericultura-form-section {
      grid-template-columns: 1fr 1fr;
    }
  }

  .puericultura-graph-container {
    grid-column: 1 / -1;
    background: rgba(120, 120, 120, 0.04);
    padding: 16px;
    border-radius: 12px;
    border: 1px solid var(--puericultura-border);
    margin-top: 12px;
  }
`

const styles = {
  container: {
    background: "var(--puericultura-bg)",
    color: "var(--puericultura-text)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: "24px",
    borderRadius: "16px",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  title: {
    fontSize: "20px",
    fontWeight: 700,
    marginBottom: "4px",
    color: "var(--puericultura-text)",
  },
  subtitle: {
    fontSize: "13px",
    color: "var(--puericultura-text-muted)",
    marginBottom: "20px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },
  label: {
    fontSize: "11px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "var(--puericultura-text-muted)",
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  sectionLabel: {
    fontSize: "10px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.07em",
    color: "var(--puericultura-text-muted)",
    fontWeight: 700,
    gridColumn: "1 / -1",
    marginTop: "12px",
    paddingBottom: "4px",
    borderBottom: "1px solid var(--puericultura-border)",
  },
  select: (severityBg?: string, severityBorder?: string) => ({
    background: severityBg || "var(--puericultura-input-bg)",
    border: `1px solid ${severityBorder || "var(--puericultura-border)"}`,
    borderRadius: "10px",
    padding: "10px 14px",
    color: "var(--puericultura-text)",
    fontSize: "14px",
    outline: "none",
    cursor: "pointer",
    height: "42px",
    boxSizing: "border-box" as const,
    width: "100%",
    transition: "all 0.2s ease",
  }),
  input: (severityBg?: string, severityBorder?: string) => ({
    background: severityBg || "var(--puericultura-input-bg)",
    border: `1px solid ${severityBorder || "var(--puericultura-border)"}`,
    borderRadius: "10px",
    padding: "10px 14px",
    color: "var(--puericultura-text)",
    fontSize: "14px",
    outline: "none",
    height: "42px",
    boxSizing: "border-box" as const,
    width: "100%",
    transition: "all 0.2s ease",
  }),
  textarea: (severityBg?: string, severityBorder?: string) => ({
    background: severityBg || "var(--puericultura-input-bg)",
    border: `1px solid ${severityBorder || "var(--puericultura-border)"}`,
    borderRadius: "10px",
    padding: "10px 14px",
    color: "var(--puericultura-text)",
    fontSize: "14px",
    outline: "none",
    minHeight: "80px",
    boxSizing: "border-box" as const,
    width: "100%",
    transition: "all 0.2s ease",
    resize: "vertical" as const,
  }),
  chip: (active: boolean, activeColor = "#e02424", activeBg = "rgba(224, 36, 36, 0.15)") => ({
    padding: "8px 16px",
    borderRadius: "20px",
    fontSize: "13px",
    cursor: "pointer",
    userSelect: "none" as const,
    background: active ? activeBg : "var(--puericultura-input-bg)",
    border: `1px solid ${active ? activeColor : "var(--puericultura-border)"}`,
    color: active ? activeColor : "var(--puericultura-text-muted)",
    fontWeight: active ? 600 : 400,
    transition: "all 0.15s ease",
  }),
  ageDisplay: {
    fontSize: "24px",
    fontWeight: 800,
    color: "var(--puericultura-text)",
    padding: "12px",
    borderRadius: "12px",
    background: "rgba(0, 184, 73, 0.08)",
    border: "1px solid rgba(0, 184, 73, 0.35)",
    textAlign: "center" as const,
    marginTop: "8px",
  },
  copyButton: {
    background: "var(--puericultura-input-bg)",
    border: "1px solid var(--puericultura-border)",
    borderRadius: "10px",
    padding: "12px 20px",
    color: "var(--puericultura-text)",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
    transition: "all 0.2s ease",
    marginTop: "12px",
  },
  markdownOutput: {
    background: "var(--puericultura-input-bg)",
    border: "1px solid var(--puericultura-border)",
    borderRadius: "10px",
    padding: "16px",
    color: "var(--puericultura-text)",
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
  labelMd?: string        // texto pro markdown; se ausente, usa `label`
  type: FieldType
  options?: string[]
  optionsMd?: string[]    // textos alternativos pro markdown, na mesma ordem de `options`
  value?: string | string[]
  section?: string
}

interface AgeGroupForm {
  ageRange: string
  fields: FormField[]
}

// Definimos as três seções obrigatórias estruturadas
const secoes = [
  { id: "geral", label: "Geral" },
  { id: "desenvolvimento", label: "Desenvolvimento" },
  { id: "crescimento", label: "Crescimento" }
]

interface AgeBracket {
  ageRange: string
  maxMonths: number
}

const AGE_BRACKETS: AgeBracket[] = [
  { ageRange: "1m",     maxMonths: 1 },
  { ageRange: "2m",     maxMonths: 2 },
  { ageRange: "3-4m",   maxMonths: 4 },
  { ageRange: "5-6m",   maxMonths: 6 },
  { ageRange: "7-9m",   maxMonths: 9 },
  { ageRange: "10-12m", maxMonths: 12 },
  { ageRange: "13-15m", maxMonths: 15 },
  { ageRange: "16-18m", maxMonths: 18 },
  { ageRange: "19-24m", maxMonths: 24 },
  { ageRange: "25-30m", maxMonths: 30 },
  { ageRange: "31-36m", maxMonths: 36 },
  { ageRange: "37-42m", maxMonths: 42 },
  { ageRange: "43-48m", maxMonths: 48 },
  { ageRange: "49-54m", maxMonths: 54 },
  { ageRange: "55-60m", maxMonths: 60 },
  { ageRange: "61-66m", maxMonths: 66 },
  { ageRange: "67-72m", maxMonths: 72 },
  { ageRange: "6-10y",  maxMonths: 120 },
]

// Recebe idade total em meses (decimal) e devolve a faixa correspondente.
function resolveFaixaEtaria(totalMeses: number): string {
  const bracket = AGE_BRACKETS.find(b => totalMeses <= b.maxMonths)
  return bracket?.ageRange ?? AGE_BRACKETS[AGE_BRACKETS.length - 1].ageRange
}

// Rótulo clínico amplo, independente da faixa fina usada para carregar o formulário.
function resolveLabelClinico(diffDays: number, totalMeses: number): string {
  if (diffDays <= 28) return "neonato"
  if (totalMeses <= 24) return "lactente"
  if (totalMeses <= 84) return "pré-escolar"
  if (totalMeses <= 120) return "escolar"
  return "adolescente"
}

interface Props {
  style?: React.CSSProperties
}

export default function PuericulturaUI({ style }: Props) {
  const [ageGroupForms, setAgeGroupForms] = useState<AgeGroupForm[]>([])
  const [dataNascimento, setDataNascimento] = useState<string>("")
  const [idadeAnos, setIdadeAnos] = useState<string>("")
  const [idadeMeses, setIdadeMeses] = useState<string>("")
  const [idadeCalculada, setIdadeCalculada] = useState<string>("")
  const [faixaEtaria, setFaixaEtaria] = useState<string>("")
  const [formFields, setFormFields] = useState<FormField[]>([])
  const [markdownOutput, setMarkdownOutput] = useState<string>("")
  const [copiado, setCopiado] = useState(false)
  const [labelClinico, setLabelClinico] = useState<string>("")
  const mdTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea ao conteúdo
  useEffect(() => {
    const el = mdTextareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [markdownOutput])

    useEffect(() => {
    fetch("puericultura.json")
      .then((res) => res.json())
      .then((data) => {
        setAgeGroupForms(Array.isArray(data) ? (data as AgeGroupForm[]) : [])
      })
  }, [])

  useEffect(() => {
    if (!dataNascimento) {
      if (!idadeAnos && !idadeMeses) {
        setIdadeCalculada("")
        setFaixaEtaria("")
        setLabelClinico("")
        setFormFields([])
      }
      return
    }

    // Parsear como data local (evita offset UTC deslocar o dia)
    const [ano, mes, dia] = dataNascimento.split("-").map(Number)
    const nascimento = new Date(ano, mes - 1, dia)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const diffTime = hoje.getTime() - nascimento.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

    // Meses completos por calendário, sem arredondamento por média de dias/mês (evita erro de faixa etária)
    let anosCalc = hoje.getFullYear() - nascimento.getFullYear()
    let mesesCalc = hoje.getMonth() - nascimento.getMonth()
    const diasCalc = hoje.getDate() - nascimento.getDate()
    if (diasCalc < 0) mesesCalc -= 1
    if (mesesCalc < 0) {
      anosCalc -= 1
      mesesCalc += 12
    }
    const totalMeses = anosCalc * 12 + mesesCalc
    const mesesTotais = totalMeses
    const anosDisplay = anosCalc
    const mesesDisplay = mesesCalc

    let idadeTexto = ""
    if (diffDays <= 28) {
      idadeTexto = `${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`
      setFaixaEtaria("0-28d")
      setLabelClinico(resolveLabelClinico(diffDays, totalMeses))
    } else if (mesesTotais === 0) {
      // 29-30 dias: ainda menos de 1 mês completo
      idadeTexto = `${diffDays} dias`
      setFaixaEtaria(resolveFaixaEtaria(totalMeses))
      setLabelClinico(resolveLabelClinico(diffDays, totalMeses))
    } else if (anosDisplay < 1) {
      idadeTexto = `${mesesTotais} ${mesesTotais === 1 ? 'mês' : 'meses'}`
      setFaixaEtaria(resolveFaixaEtaria(totalMeses))
      setLabelClinico(resolveLabelClinico(diffDays, totalMeses))
    } else {
      const anosTexto = anosDisplay === 1 ? 'ano' : 'anos'
      const mesesTexto = mesesDisplay === 1 ? 'mês' : 'meses'
      idadeTexto = `${anosDisplay} ${anosTexto}${mesesDisplay > 0 ? `, ${mesesDisplay} ${mesesTexto}` : ''}`
      setFaixaEtaria(resolveFaixaEtaria(totalMeses))
      setLabelClinico(resolveLabelClinico(999, totalMeses))
    }

    setIdadeCalculada(idadeTexto)
  }, [dataNascimento, idadeAnos, idadeMeses])

  useEffect(() => {
    if (!idadeAnos && !idadeMeses) {
      if (!dataNascimento) {
        setIdadeCalculada("")
        setFaixaEtaria("")
        setLabelClinico("")
        setFormFields([])
      }
      return
    }

    const anosNum = parseInt(idadeAnos) || 0
    const mesesNum = parseInt(idadeMeses) || 0
    const totalMeses = anosNum * 12 + mesesNum

    let idadeTexto = ""
    if (anosNum === 0 && mesesNum === 0) {
      idadeTexto = ""
      setFaixaEtaria("")
      setLabelClinico("")
    } else if (anosNum === 0) {
      idadeTexto = `${mesesNum} ${mesesNum === 1 ? 'mês' : 'meses'}`
      setFaixaEtaria(resolveFaixaEtaria(totalMeses))
      setLabelClinico(resolveLabelClinico(999, totalMeses))
    } else {
      const anosTexto = anosNum === 1 ? 'ano' : 'anos'
      const mesesTexto = mesesNum === 1 ? 'mês' : 'meses'
      idadeTexto = `${anosNum} ${anosTexto}${mesesNum > 0 ? `, ${mesesNum} ${mesesTexto}` : ''}`
      setFaixaEtaria(resolveFaixaEtaria(totalMeses))
      setLabelClinico(resolveLabelClinico(999, totalMeses))
    }

    setIdadeCalculada(idadeTexto)
  }, [idadeAnos, idadeMeses, dataNascimento])

  useEffect(() => {
    if (!faixaEtaria) {
      setFormFields([])
      return
    }

    const formConfig = ageGroupForms.find((f) => f.ageRange === faixaEtaria)
    if (formConfig) {
      setFormFields(formConfig.fields.map((field) => ({ ...field })))
    }
  }, [faixaEtaria, ageGroupForms])

    
  
  // Gerar markdown agrupado por seções com suporte a placeholders estruturados
  const generateMarkdown = useCallback(() => {
    if (!idadeCalculada || formFields.length === 0) return ""

    let md = ``

    const getLabelMd = (field: FormField) => field.labelMd || field.label

    const getValueMd = (field: FormField): string | null => {
      const value = field.value
      // Campos opcionais vazios são omitidos do markdown
      if (!value || (Array.isArray(value) && value.length === 0)) {
        if (field.type === "text_optional" || field.type === "multiple_choice") return null
        return " "
      }

      const mapValue = (v: string) => v

      return Array.isArray(value)
        ? value.map(mapValue).join(", ")
        : mapValue(value)
    }

    secoes.forEach(secao => {
      // Filtrar campos que pertencem a essa seção, excluindo dividers
      const camposDaSecao = formFields.filter(f => (f.section || "geral") === secao.id && f.type !== "divider")

      // Só renderiza o bloco da seção se ela possuir campos configurados para a idade atual
      if (camposDaSecao.length > 0) {
        md += `- ${secao.label}\n`

        camposDaSecao.forEach(field => {
          const valueMd = getValueMd(field)
          // Pula campos opcionais sem valor
          if (valueMd === null) return
          md += `  - ${getLabelMd(field)}: ${valueMd}\n`
        })
      }
    })

    return md
  }, [idadeCalculada, formFields])

  // Auto-generate markdown on field changes (com todas as dependências do hook arrumadas)
  useEffect(() => {
    if (formFields.length > 0) {
      setMarkdownOutput(generateMarkdown())
    }
  }, [formFields, idadeCalculada, generateMarkdown])

  const IconeCopiar = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )

  const IconeCheck = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )

  const updateFieldValue = (fieldId: string, newValue: string | string[]) => {
    setFormFields(prev => {
      let updated = prev.map(field =>
        field.id === fieldId ? { ...field, value: newValue } : field
      )

      if (fieldId === "peso" || fieldId === "altura") {
        const pesoField = updated.find(f => f.id === "peso")
        const alturaField = updated.find(f => f.id === "altura")

        const peso = parseFloat((pesoField?.value as string) || "0")
        const alturaCm = parseFloat((alturaField?.value as string) || "0")

        if (peso > 0 && alturaCm > 0) {
          const alturaM = alturaCm / 100
          const imc = peso / (alturaM * alturaM)
          updated = updated.map(f =>
            f.id === "imc" ? { ...f, value: imc.toFixed(2) } : f
          )
        }
      }

      return updated
    })
  }

  const toggleMultipleChoice = (fieldId: string, option: string) => {
    setFormFields(prev =>
      prev.map(field => {
        if (field.id !== fieldId || field.type !== "multiple_choice") return field

        const currentValues = field.value as string[] || []
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
    } catch {
      /* fallback */
    }
  }

  const renderField = (field: FormField) => {
    switch (field.type) {
      case "divider":
        return (
          <div key={field.id} style={{
            gridColumn: "1 / -1",
            borderTop: "1px solid var(--puericultura-border)",
            margin: "4px 0",
            opacity: 0.6,
          }} />
        )
      case "single_choice": {
        const isLong = (field.label?.length ?? 0) > 22
        const isDevPaNv =
          field.section === "desenvolvimento" &&
          field.options?.every(o => ["P", "A", "NV"].includes(o))
        const val = field.value as string | undefined
        const severityBg =
          !isDevPaNv ? undefined
          : val === "P" ? "rgba(0, 184, 73, 0.10)"
          : val === "A" ? "rgba(224, 36, 36, 0.10)"
          : val === "NV" ? "rgba(234, 179, 8, 0.10)"
          : undefined
        const severityBorder =
          !isDevPaNv ? undefined
          : val === "P" ? "rgba(0, 184, 73, 0.40)"
          : val === "A" ? "rgba(224, 36, 36, 0.40)"
          : val === "NV" ? "rgba(234, 179, 8, 0.40)"
          : undefined
        const severityColor =
          !isDevPaNv ? undefined
          : val === "P" ? "#00cc52"
          : val === "A" ? "#e02424"
          : val === "NV" ? "#ca8a04"
          : undefined
        return (
          <div
            key={field.id}
            style={{
              ...styles.inputGroup,
              ...(isLong ? { gridColumn: "1 / -1" } : {}),
            }}
          >
            <label style={{ ...styles.label, ...(severityColor ? { color: severityColor } : {}) }}>
              {field.label}
            </label>
            <select
              value={val || ""}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              style={{
                ...styles.select(severityBg, severityBorder),
                ...(severityColor ? { color: severityColor, fontWeight: 600 } : {}),
              }}
            >
              <option value="">Selecione</option>
              {field.options?.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )
      }

      case "multiple_choice":
        return (
          <div key={field.id} style={{ gridColumn: "1 / -1" }}>
            <label style={styles.label}>{field.label}</label>
            <div className="puericultura-chips-grid" style={{ marginTop: "8px" }}>
              {field.options?.map(opt => {
                const isSelected = (field.value as string[] || []).includes(opt)
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
              value={field.value as string || ""}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              placeholder={field.type === "text_optional" ? "Opcional" : "Obrigatório"}
              style={styles.input()}
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
    fields.forEach(field => {
      const section = field.section || "geral"
      if (!groups[section]) groups[section] = []
      groups[section].push(field)
    })
    return secoes
      .filter(s => groups[s.id]?.length)
      .map(s => ({ ...s, fields: groups[s.id] }))
  }

  return (
    <div style={{ ...styles.container, ...style }}>
      <style dangerouslySetInnerHTML={{ __html: injectStyles }} />

      <div style={styles.title}>checklist da puericultura</div>
      <div style={styles.subtitle}>baseado na caderneta da criança</div>

      <div className="puericultura-root">
        <div className="puericultura-fields-grid">

          <div style={styles.sectionLabel}>dados iniciais</div>

          {/* Grid principal dividido igualmente (50% / 50%) para Data e Idade Manual */}
          <div style={{
            gridColumn: "1 / -1",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
            alignItems: "end"
          }}>

            {/* Coluna da Esquerda: Data de Nascimento */}
            <div style={styles.inputGroup}>
              <label style={{ ...styles.label, fontSize: "10px" }}>data de nascimento</label>
              <input
                type="date"
                value={dataNascimento}
                onChange={(e) => {
                  setDataNascimento(e.target.value)
                  setIdadeAnos("")
                  setIdadeMeses("")
                }}
                style={styles.input()}
              />
            </div>

            {/* Coluna da Direita: Campos de Idade Manual divididos igualmente internamente */}
            <div style={styles.inputGroup}>
              <label style={{ ...styles.label, fontSize: "10px" }}>idade</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="number"
                    placeholder="0"
                    value={idadeAnos}
                    onChange={(e) => {
                      setIdadeAnos(e.target.value)
                      setDataNascimento("")
                    }}
                    style={{ ...styles.input(), minWidth: "0" }}
                  />
                  <span style={{ fontSize: "12px", color: "var(--puericultura-text-muted)" }}>anos</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="number"
                    placeholder="0"
                    value={idadeMeses}
                    onChange={(e) => {
                      setIdadeMeses(e.target.value)
                      setDataNascimento("")
                    }}
                    style={{ ...styles.input(), minWidth: "0" }}
                  />
                  <span style={{ fontSize: "12px", color: "var(--puericultura-text-muted)" }}>meses</span>
                </div>
              </div>
            </div>

          </div>

          {idadeCalculada && (
            <>
              {formFields.length > 0 && (
                <>
                  {groupFieldsBySection(formFields).map(({ id, label, fields }) => (
                    <React.Fragment key={id}>
                      <div style={styles.sectionLabel}>{label}</div>
                      <div className="puericultura-form-section">
                        {fields.map(field => renderField(field))}
                      </div>
                    </React.Fragment>
                  ))}
                </>
              )}
            </>
          )}

        </div>

        {/* Coluna direita: card de idade + card de resultado */}
        {(idadeCalculada || formFields.length > 0) && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

            {idadeCalculada && (
              <div style={styles.ageDisplay}>
                {idadeCalculada}
                {faixaEtaria && (
                  <div style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "var(--puericultura-text-muted)",
                    marginTop: "4px"
                  }}>
                    {labelClinico}
                  </div>
                )}
              </div>
            )}

            {formFields.length > 0 && (
              <div
                className="puericultura-result-card"
                style={{
                  background: "var(--puericultura-card-bg)",
                  border: "1px solid var(--puericultura-border)",
                }}
              >
                <div
                  className="puericultura-card-header"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "4px"
                  }}
                >
                  <div
                    className="puericultura-badge"
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
                      border: "1px solid var(--puericultura-border)",
                      background: copiado ? "rgba(0, 184, 73, 0.08)" : "rgba(255,255,255,0.5)",
                      color: copiado ? "#007a30" : "var(--puericultura-text-muted)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      padding: "0",
                      borderColor: copiado ? "rgba(0, 184, 73, 0.35)" : undefined
                    }}
                    title={copiado ? "Copiado!" : "Copiar markdown"}
                  >
                    {copiado ? <IconeCheck /> : <IconeCopiar />}
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
            )}

            {formFields.length > 0 && formFields.some(f => f.section === "desenvolvimento" && f.value === "A") && (
              <div
                className="puericultura-result-card"
                style={{
                  background: "rgba(234, 179, 8, 0.06)",
                  border: "1px solid rgba(234, 179, 8, 0.35)",
                }}
              >
                <div
                  className="puericultura-badge"
                  style={{
                    background: "rgba(234, 179, 8, 0.15)",
                    color: "#ca8a04",
                  }}
                >
                  Alerta
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "16px", lineHeight: 1 }}>⚠️</span>
                  <div>
                    <div style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#ca8a04",
                      marginBottom: "2px",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}>Alerta para o desenvolvimento</div>
                    <div style={{
                      fontSize: "13px",
                      color: "var(--puericultura-text)",
                    }}>Marcar consulta de retorno em 30 dias e orientar cuidador sobre estimulação da criança e sinais de alerta para retorno.</div>
                  </div>
                </div>
              </div>
            )}

            {formFields.length > 0 && (
              <div
                className="puericultura-result-card"
                style={{
                  background: "var(--puericultura-card-bg)",
                  border: "1px solid var(--puericultura-border)",
                }}
              >
                <div style={styles.sectionLabel}>Crescimento</div>
                <div className="puericultura-graph-container">
                  <div style={{
                    fontSize: "13px",
                    color: "var(--puericultura-text-muted)",
                    textAlign: "center" as const,
                    padding: "20px 0",
                  }}>
                    Gráfico de crescimento (idade x valor) será implementado aqui.
                    <br />
                    Suporte preparado para sobreposição de curvas de crescimento.
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}