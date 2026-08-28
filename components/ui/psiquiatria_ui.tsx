import * as React from "react"
import { forwardRef, useImperativeHandle, useState, useEffect, useRef } from "react"
import type { CompanionActions } from "../companions/registry"

const injectStyles = `
  :root {
    --psiquiatria-bg: #ffffff;
    --psiquiatria-text: #1a1916;
    --psiquiatria-text-muted: #6b6760;
    --psiquiatria-input-bg: rgba(120,120,120,0.08);
    --psiquiatria-border: rgba(120,120,120,0.15);
    --psiquiatria-card-bg: rgba(120,120,120,0.06);
    --psiquiatria-accent: #7c3aed;
    --psiquiatria-accent-strong: #6d28d9;
    --psiquiatria-accent-soft: rgba(124, 58, 237, 0.12);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --psiquiatria-bg: #1c1917;
      --psiquiatria-text: #f5f5f4;
      --psiquiatria-text-muted: #78716c;
      --psiquiatria-input-bg: #2e2b29;
      --psiquiatria-border: rgba(255,255,255,0.15);
      --psiquiatria-card-bg: rgba(255,255,255,0.06);
      --psiquiatria-accent-soft: rgba(139, 92, 246, 0.15);
    }
  }

  .psiquiatria-root {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    align-items: start;
  }

  @media (min-width: 900px) {
    .psiquiatria-root {
      grid-template-columns: 1.2fr 1fr;
      min-height: calc(100vh - 80px);
    }
  }

  .psiquiatria-fields-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    width: 100%;
    min-width: 0;
  }

  .psiquiatria-chips-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    grid-column: 1 / -1;
  }

  .psiquiatria-form-section {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
    grid-column: 1 / -1;
    background: rgba(120, 120, 120, 0.04);
    padding: 14px;
    border-radius: 12px;
    border: 1px dashed var(--psiquiatria-border);
    margin-top: 12px;
    min-width: 0;
  }

  @media (min-width: 600px) {
    .psiquiatria-form-section {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
  }

  @media (max-width: 600px) {
    .psiquiatria-form-section {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .psiquiatria-axis-label {
    grid-column: 1 / -1;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--psiquiatria-text-muted);
    margin-top: 2px;
  }

  .psiquiatria-subtypes-row {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 2px 0 2px 0;
  }
`

const styles = {
  container: {
    background: "var(--psiquiatria-bg)",
    color: "var(--psiquiatria-text)",
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
    color: "var(--psiquiatria-text)",
  },
  subtitle: {
    fontSize: "13px",
    color: "var(--psiquiatria-text-muted)",
    marginBottom: "20px",
  },
  sectionLabel: {
    fontSize: "10px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.07em",
    color: "var(--psiquiatria-text-muted)",
    fontWeight: 700,
    gridColumn: "1 / -1",
    marginTop: "12px",
    paddingBottom: "4px",
    borderBottom: "1px solid var(--psiquiatria-border)",
  },
  copyButton: {
    background: "var(--psiquiatria-input-bg)",
    border: "1px solid var(--psiquiatria-border)",
    borderRadius: "10px",
    padding: "12px 20px",
    color: "var(--psiquiatria-text)",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
    transition: "all 0.2s ease",
    marginTop: "12px",
  },
  markdownOutput: {
    background: "var(--psiquiatria-input-bg)",
    border: "1px solid var(--psiquiatria-border)",
    borderRadius: "10px",
    padding: "16px",
    color: "var(--psiquiatria-text)",
    fontSize: "13px",
    fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
    whiteSpace: "pre-wrap" as const,
    overflowX: "auto" as const,
    marginTop: "12px",
    maxHeight: "300px",
    overflowY: "auto" as const,
  },
}

interface Subtype {
  id: string
  label: string
  phrase: string
  definition?: string
}

interface AxisOption {
  id: string
  label: string
  phrase: string
  definition?: string
  subtypes?: Subtype[]
}

interface AxisDefault {
  id: string
  phrase: string
}

interface Axis {
  id: string
  label: string
  selectionType: "single" | "multi"
  default: AxisDefault
  options: AxisOption[]
}

interface Funcao {
  id: string
  label: string
  axes: Axis[]
}

interface PsiquiatriaData {
  titulo?: string
  funcoes: Funcao[]
}

interface Props {
  style?: React.CSSProperties
}

const axisKey = (funcaoId: string, axisId: string): string => `${funcaoId}/${axisId}`
const subKey = (funcaoId: string, axisId: string, optionId: string): string => `${funcaoId}/${axisId}::${optionId}`

function resolveOptionPhrase(option: AxisOption, subtypeSelValue: string): string {
  if (option.subtypes && option.subtypes.length) {
    const st = subtypeSelValue ? option.subtypes.find(s => s.id === subtypeSelValue) : undefined
    if (st) return st.phrase
  }
  return option.phrase
}

function topLevelCut(phrase: string): string {
  let depth = 0
  for (let i = 0; i < phrase.length; i++) {
    const c = phrase[i]
    if (c === "(") depth++
    else if (c === ")") depth--
    else if (c === "," && depth === 0) return phrase.slice(0, i).trim()
  }
  return phrase.trim()
}

function axisPhrases(
  funcaoId: string,
  axis: Axis,
  singleSel: Record<string, string>,
  multiSel: Record<string, string[]>,
  subtypeSel: Record<string, string>,
): string[] {
  const key = axisKey(funcaoId, axis.id)
  if (axis.selectionType === "single") {
    const optionId = singleSel[key] || ""
    if (!optionId) return [axis.default.phrase]
    const option = axis.options.find(o => o.id === optionId)
    if (!option) return [axis.default.phrase]
    return [topLevelCut(resolveOptionPhrase(option, subtypeSel[subKey(funcaoId, axis.id, optionId)] || ""))]
  }
  const optionIds = multiSel[key] || []
  if (optionIds.length === 0) return [axis.default.phrase]
  const phrases: string[] = []
  for (const optionId of optionIds) {
    const option = axis.options.find(o => o.id === optionId)
    if (!option) continue
    phrases.push(topLevelCut(resolveOptionPhrase(option, subtypeSel[subKey(funcaoId, axis.id, optionId)] || "")))
  }
  return phrases.length ? phrases : [axis.default.phrase]
}

function sentenceParts(
  funcao: Funcao,
  singleSel: Record<string, string>,
  multiSel: Record<string, string[]>,
  subtypeSel: Record<string, string>,
): { changed: string[]; normal: string[] } {
  const isDefaultAxis = (axis: Axis): boolean => {
    const key = axisKey(funcao.id, axis.id)
    if (axis.selectionType === "single") return !singleSel[key]
    return !(multiSel[key] && multiSel[key].length)
  }
  const changed: string[] = []
  const normal: string[] = []
  for (const axis of funcao.axes) {
    const parts = axisPhrases(funcao.id, axis, singleSel, multiSel, subtypeSel)
    if (isDefaultAxis(axis)) {
      normal.push(...parts)
    } else {
      changed.push(...parts)
    }
  }
  return { changed, normal }
}

function funcaoSentence(
  funcao: Funcao,
  singleSel: Record<string, string>,
  multiSel: Record<string, string[]>,
  subtypeSel: Record<string, string>,
): string {
  const { changed, normal } = sentenceParts(funcao, singleSel, multiSel, subtypeSel)
  const changedText = capitalize(changed.join(", "))
  const normalText = capitalize(normal.join(", "))
  if (changed.length && normal.length) return changedText + ". " + normalText + "."
  if (changed.length) return changedText + "."
  return normalText + "."
}

function isFuncaoNormal(
  funcao: Funcao,
  singleSel: Record<string, string>,
  multiSel: Record<string, string[]>,
): boolean {
  return funcao.axes.every(axis => {
    const key = axisKey(funcao.id, axis.id)
    if (axis.selectionType === "single") return !singleSel[key]
    return !(multiSel[key] && multiSel[key].length > 0)
  })
}

function capitalize(s: string): string {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function buildParagraph(
  data: PsiquiatriaData | null,
  singleSel: Record<string, string>,
  multiSel: Record<string, string[]>,
  subtypeSel: Record<string, string>,
  conciso: boolean,
): string {
  if (!data || !data.funcoes || data.funcoes.length === 0) return ""
  const LABEL = "Exame do estado mental: "
  const sentences: string[] = []
  if (conciso) {
    const normais = data.funcoes.filter(f => isFuncaoNormal(f, singleSel, multiSel))
    const alterados = data.funcoes.filter(f => !isFuncaoNormal(f, singleSel, multiSel))
    for (const f of alterados) {
      sentences.push(funcaoSentence(f, singleSel, multiSel, subtypeSel))
    }
    if (normais.length > 0) {
      if (alterados.length === 0) {
        sentences.push("funções psíquicas sem alterações (aparência, atitude, consciência, atenção, sensopercepção, memória, linguagem, pensamento, inteligência, imaginação, conação, psicomotricidade, pragmatismo, afetividade, orientação alopsíquica, consciência do eu, prospecção, consciência de morbidade).")
      } else {
        const nomes = normais.map(f => f.label.toLowerCase()).join(", ")
        sentences.push(capitalize(`Demais funções psíquicas sem alterações (${nomes}).`))
      }
    }
  } else {
    for (const f of data.funcoes) {
      sentences.push(funcaoSentence(f, singleSel, multiSel, subtypeSel))
    }
  }
  return LABEL + sentences.join(" ")
}

export default forwardRef<CompanionActions, Props>(function PsiquiatriaUI({ style }: Props, ref) {
  const [data, setData] = useState<PsiquiatriaData | null>(null)
  const [singleSel, setSingleSel] = useState<Record<string, string>>({})
  const [multiSel, setMultiSel] = useState<Record<string, string[]>>({})
  const [subtypeSel, setSubtypeSel] = useState<Record<string, string>>({})
  const [conciso, setConciso] = useState(true)
  const [markdownOutput, setMarkdownOutput] = useState("")
  const [copiado, setCopiado] = useState(false)
  const mdTextareaRef = useRef<HTMLTextAreaElement>(null)

  function handleFetchResponse(r: Response): Promise<PsiquiatriaData> {
    if (!r.ok) { throw new Error("HTTP " + r.status) }
    return r.json()
  }

  function handleFormData(json: PsiquiatriaData): void {
    if (!json || !Array.isArray(json.funcoes)) { return }
    setData({ titulo: json.titulo, funcoes: json.funcoes })
  }

  function handleFetchError(e: unknown): void {
    if (e instanceof Error) { console.warn("[PsiquiatriaUI]", e) }
  }

  useEffect(function() {
    const caminhos = ["/contents/psiquiatria.json", "contents/psiquiatria.json", "public/contents/psiquiatria.json"]
    function tentar(i: number): void {
      if (i >= caminhos.length) return
      fetch(caminhos[i], { cache: "no-store" })
        .then(handleFetchResponse)
        .then(handleFormData)
        .catch(function(e) { if (i >= caminhos.length - 1) { handleFetchError(e) } else { tentar(i + 1) } })
    }
    tentar(0)
  }, [])

  useEffect(() => {
    setMarkdownOutput(buildParagraph(data, singleSel, multiSel, subtypeSel, conciso))
  }, [data, singleSel, multiSel, subtypeSel, conciso])

  useEffect(() => {
    const el = mdTextareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [markdownOutput])

  function handleSinglePick(funcaoId: string, axisId: string, optionId: string): void {
    const key = axisKey(funcaoId, axisId)
    setSingleSel(prev => {
      if (prev[key] === optionId) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: optionId }
    })
  }

  function handleMultiPick(funcaoId: string, axisId: string, optionId: string): void {
    const key = axisKey(funcaoId, axisId)
    setMultiSel(prev => {
      const cur = prev[key] || []
      const next = cur.includes(optionId) ? cur.filter(id => id !== optionId) : [...cur, optionId]
      if (next.length > 0) return { ...prev, [key]: next }
      const dup = { ...prev }
      delete dup[key]
      return dup
    })
  }

  function handleClearAxis(funcaoId: string, axis: Axis): void {
    const key = axisKey(funcaoId, axis.id)
    if (axis.selectionType === "single") {
      setSingleSel(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    } else {
      setMultiSel(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  function handleSubtypePick(funcaoId: string, axisId: string, optionId: string, subtypeId: string): void {
    const key = subKey(funcaoId, axisId, optionId)
    setSubtypeSel(prev => {
      if (prev[key] === subtypeId) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: subtypeId }
    })
  }

  const chipStyle = (active: boolean) => ({
    padding: "8px 14px",
    borderRadius: "20px",
    fontSize: "13px",
    cursor: "pointer",
    userSelect: "none" as const,
    background: active ? "var(--psiquiatria-accent-soft)" : "var(--psiquiatria-input-bg)",
    border: `1px solid ${active ? "var(--psiquiatria-accent)" : "var(--psiquiatria-border)"}`,
    color: active ? "var(--psiquiatria-accent-strong)" : "var(--psiquiatria-text-muted)",
    fontWeight: active ? 600 : 400,
    transition: "all 0.15s ease",
  })

  const subtypeChipStyle = (active: boolean) => ({
    padding: "5px 11px",
    borderRadius: "14px",
    fontSize: "11px",
    cursor: "pointer",
    userSelect: "none" as const,
    background: active ? "rgba(6, 182, 212, 0.12)" : "var(--psiquiatria-input-bg)",
    border: `1px solid ${active ? "#0891b2" : "var(--psiquiatria-border)"}`,
    color: active ? "#0e7490" : "var(--psiquiatria-text-muted)",
    fontWeight: active ? 600 : 400,
    transition: "all 0.15s ease",
  })

  function renderSubtypes(funcaoId: string, axis: Axis, optionId: string): React.ReactNode {
    const option = axis.options.find(o => o.id === optionId)
    if (!option || !option.subtypes || option.subtypes.length === 0) return null
    const subSelVal = subtypeSel[subKey(funcaoId, axis.id, optionId)] || ""
    const orderedSubtypes = [...option.subtypes].sort((a, b) => {
      if (a.id === subSelVal) return -1
      if (b.id === subSelVal) return 1
      return 0
    })
    return (
      <div className="psiquiatria-subtypes-row" key={optionId}>
        {orderedSubtypes.map(st => (
          <div
            key={st.id}
            style={subtypeChipStyle(subSelVal === st.id)}
            onClick={() => handleSubtypePick(funcaoId, axis.id, optionId, st.id)}
            title={st.definition}
          >
            {st.label}
          </div>
        ))}
      </div>
    )
  }

  function optionTitleWithDefinition(funcaoId: string, axis: Axis, optionId: string): string {
    const opt = axis.options.find(o => o.id === optionId)
    if (!opt) return ""
    if (opt.subtypes && opt.subtypes.length) {
      const stId = subtypeSel[subKey(funcaoId, axis.id, optionId)] || ""
      const st = stId ? opt.subtypes.find(s => s.id === stId) : undefined
      if (st) return st.label + " (" + st.definition + ")"
    }
    return opt.label + " (" + opt.definition + ")"
  }

  function axisSelectionLabel(funcaoId: string, axis: Axis): string {
    const key = axisKey(funcaoId, axis.id)
    if (axis.selectionType === "single") {
      const singleVal = singleSel[key] || ""
      if (!singleVal) return axis.default.phrase
      return optionTitleWithDefinition(funcaoId, axis, singleVal)
    }
    const multiVal = multiSel[key] || []
    if (!multiVal.length) return axis.default.phrase
    return multiVal.map(optId => optionTitleWithDefinition(funcaoId, axis, optId)).filter(s => s !== "").join(", ")
  }

  function renderAxis(funcaoId: string, axis: Axis): React.ReactNode {
    const key = axisKey(funcaoId, axis.id)
    const isSingle = axis.selectionType === "single"
    const singleVal = singleSel[key] || ""
    const multiVal = multiSel[key] || []
    const normalActive = isSingle ? singleVal === "" : multiVal.length === 0
    return (
      <div key={axis.id} style={{ gridColumn: "1 / -1", minWidth: 0, overflow: "hidden" }}>
        <div className="psiquiatria-axis-label">{axis.label} <span style={{ textTransform: "none", fontWeight: 600, letterSpacing: "0.01em", color: normalActive ? "var(--psiquiatria-text-muted)" : "var(--psiquiatria-accent-strong)" }}>— {axisSelectionLabel(funcaoId, axis)}</span></div>
        <div className="psiquiatria-chips-grid" style={{ marginTop: "8px" }}>
          <div
            style={chipStyle(normalActive)}
            onClick={() => handleClearAxis(funcaoId, axis)}
            title={axis.default.phrase}
          >
            Normal
          </div>
          {axis.options.map(opt => {
            const active = isSingle ? singleVal === opt.id : multiVal.includes(opt.id)
            return (
              <div
                key={opt.id}
                style={chipStyle(active)}
                title={opt.definition}
                onClick={() => (isSingle ? handleSinglePick(funcaoId, axis.id, opt.id) : handleMultiPick(funcaoId, axis.id, opt.id))}
              >
                {opt.label}
              </div>
            )
          })}
        </div>
        {isSingle && singleVal !== "" && renderSubtypes(funcaoId, axis, singleVal)}
        {!isSingle && multiVal.map(optId => renderSubtypes(funcaoId, axis, optId))}
      </div>
    )
  }

  function renderFuncao(funcao: Funcao): React.ReactNode {
    return (
      <React.Fragment key={funcao.id}>
        <div style={styles.sectionLabel}>{funcao.label}</div>
        <div className="psiquiatria-form-section">
          {funcao.axes.map(axis => renderAxis(funcao.id, axis))}
        </div>
      </React.Fragment>
    )
  }

  const getOutputRef = useRef<(groupId: string) => string | null>(() => null)
  getOutputRef.current = (groupId: string): string | null => {
    if (groupId === "tudo") {
      return buildParagraph(data, singleSel, multiSel, subtypeSel, conciso) || null
    }
    return null
  }

  useImperativeHandle(ref, () => ({
    getOutput: (groupId: string) => getOutputRef.current(groupId),
    reset() {
      setCopiado(false)
      setSingleSel({})
      setMultiSel({})
      setSubtypeSel({})
      setConciso(false)
    },
  }), [])

  function copyToClipboard(): void {
    const md = buildParagraph(data, singleSel, multiSel, subtypeSel, conciso)
    if (!md) return
    navigator.clipboard.writeText(md).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  const titulo = (data && data.titulo) || "exame do estado mental"

  return (
    <div style={{ ...styles.container, ...style }}>
      <style dangerouslySetInnerHTML={{ __html: injectStyles }} />

      <div style={styles.title}>{titulo}</div>
      <div style={styles.subtitle}>avaliação das funções psíquicas</div>

      {!data && (
        <div style={{ fontSize: "13px", color: "var(--psiquiatria-text-muted)" }}>Carregando…</div>
      )}

      {data && (
        <div className="psiquiatria-root">
          <div className="psiquiatria-fields-grid">
            {data.funcoes.map(funcao => renderFuncao(funcao))}
          </div>

          <div style={{ position: "sticky" as const, top: "48px", minWidth: 0 }}>
            <div className="psiquiatria-result-card" style={{ background: "var(--psiquiatria-card-bg)", border: "1px solid var(--psiquiatria-border)", borderRadius: "12px", padding: "20px", boxSizing: "border-box", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "4px" }}>
                <div style={{ display: "inline-block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", padding: "4px 10px", borderRadius: "6px", letterSpacing: "0.04em", background: "var(--psiquiatria-accent-soft)", color: "var(--psiquiatria-accent-strong)" }}>
                  Resultado
                </div>
                <button
                  onClick={copyToClipboard}
                  style={{
                    flexShrink: 0,
                    width: "34px",
                    height: "34px",
                    borderRadius: "8px",
                    border: "1px solid var(--psiquiatria-border)",
                    background: copiado ? "var(--psiquiatria-accent-soft)" : "var(--psiquiatria-input-bg)",
                    color: copiado ? "var(--psiquiatria-accent-strong)" : "var(--psiquiatria-text-muted)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    padding: "0",
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

              <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", userSelect: "none" }} onClick={() => setConciso(!conciso)} title="Agrupa funções sem alterações em um resumo único de normalidade no início do parágrafo">
                <div style={{ width: "28px", height: "16px", borderRadius: "8px", background: conciso ? "var(--psiquiatria-accent)" : "rgba(120,113,108,0.25)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#fff", position: "absolute", top: "2px", left: conciso ? "14px" : "2px", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
                </div>
                <span style={{ fontSize: "12px", fontWeight: 600, color: conciso ? "var(--psiquiatria-accent-strong)" : "var(--psiquiatria-text-muted)" }}>modo conciso</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px", fontSize: "11px", fontWeight: 600, color: "var(--psiquiatria-text-muted)", letterSpacing: "0.02em" }}>
                <span>{markdownOutput.length} caracteres</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>{markdownOutput.trim() ? markdownOutput.trim().split(/\s+/).length : 0} palavras</span>
              </div>

              {markdownOutput && (
                <textarea
                  ref={mdTextareaRef}
                  value={markdownOutput}
                  onChange={(e) => setMarkdownOutput(e.target.value)}
                  style={{
                    ...styles.markdownOutput,
                    resize: "none",
                    overflowY: "auto",
                    display: "block",
                    width: "100%",
                    minHeight: "unset",
                    maxHeight: "300px",
                    height: "auto",
                    boxSizing: "border-box",
                    marginTop: "12px",
                  }}
                  spellCheck={false}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
})