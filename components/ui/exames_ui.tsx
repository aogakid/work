import * as React from "react"
import { useState, useCallback, useMemo, useEffect } from "react"

const EXAMES_PREFIX = "exames"

const injectStyles = `
  :root {
    --${EXAMES_PREFIX}-bg: #ffffff;
    --${EXAMES_PREFIX}-text: #1a1916;
    --${EXAMES_PREFIX}-text-muted: #6b6760;
    --${EXAMES_PREFIX}-input-bg: rgba(120,120,120,0.08);
    --${EXAMES_PREFIX}-border: rgba(120,120,120,0.15);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --${EXAMES_PREFIX}-bg: #1c1917;
      --${EXAMES_PREFIX}-text: #f5f5f4;
      --${EXAMES_PREFIX}-text-muted: #78716c;
      --${EXAMES_PREFIX}-input-bg: rgba(255,255,255,0.08);
      --${EXAMES_PREFIX}-border: rgba(255,255,255,0.15);
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
    top: 24px;
  }

  .${EXAMES_PREFIX}-md-wrap {
    position: relative;
    marginTop: 12px;
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

const FIELD_WIDTH = "72px"

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
      overflowX: "hidden" as const,
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
      height: "42px",
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
      height: "42px",
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

function kdigoTfg(v: number): { estagio: string; cor: string; bg: string; border: string } {
  if (v >= 90) return { estagio: "G1", cor: "#007a30", bg: "rgba(0,184,73,0.06)", border: "rgba(0,184,73,0.3)" }
  if (v >= 60) return { estagio: "G2", cor: "#007a30", bg: "rgba(0,184,73,0.06)", border: "rgba(0,184,73,0.3)" }
  if (v >= 45) return { estagio: "G3a", cor: "#b56100", bg: "rgba(242,143,0,0.06)", border: "rgba(242,143,0,0.35)" }
  if (v >= 30) return { estagio: "G3b", cor: "#b56100", bg: "rgba(242,143,0,0.06)", border: "rgba(242,143,0,0.35)" }
  if (v >= 15) return { estagio: "G4", cor: "#ba120a", bg: "rgba(245,49,39,0.06)", border: "rgba(245,49,39,0.3)" }
  return { estagio: "G5", cor: "#ba120a", bg: "rgba(245,49,39,0.06)", border: "rgba(245,49,39,0.3)" }
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

export default function ExamesUI({ style }: Props) {
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
  const [copied, setCopied] = useState(false)

  const handleChange = useCallback((id: string, val: string) => {
    setValues((prev) => ({ ...prev, [id]: val }))
  }, [])

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
    if (parts.length === 0) return ""
    return `(${dateBr}): ${parts.join(" // ")}`
  }, [date, values])

  const handleCopy = useCallback(() => {
    if (!markdown) return
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [markdown])

  const s = useMemo(buildStyles, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: injectStyles }} />
      <div
        className={`${EXAMES_PREFIX}-root`}
        style={{ ...s.container, ...style }}
      >
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={s.title}>Exames laboratoriais</div>
          <div style={s.subtitle}>converta facilmente em texto</div>
        </div>

        <div className={`${EXAMES_PREFIX}-left`}>
          <div className={`${EXAMES_PREFIX}-date-row`}>
            <div style={{ ...s.inputGroup, flex: "0 0 auto" }}>
              <span style={s.label}>Data</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ ...s.input, width: "160px" }}
              />
            </div>
            <div style={{ ...s.inputGroup, width: "60px", flex: "0 0 60px" }}>
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
            <div style={{ ...s.inputGroup, width: "70px", flex: "0 0 70px" }}>
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
                  <div key={id} style={{ ...s.inputGroup, width: FIELD_WIDTH, flex: "0 0 auto" }}>
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

        <div className={`${EXAMES_PREFIX}-right`}>
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
    </>
  )
}
