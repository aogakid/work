import * as React from "react"
import { forwardRef, useImperativeHandle, useState, useEffect, useRef, useCallback } from "react"
import type { CompanionActions } from "../companions/registry"
import { broadcastFieldSync, listenFieldSync } from "../companions/field-sync"


const injectStyles = `
  :root {
    --prevent-bg: #ffffff;
    --prevent-text: #1a1916;
    --prevent-text-muted: #6b6760;
    --prevent-input-bg: rgba(120,120,120,0.08);
    --prevent-border: rgba(120,120,120,0.15);
    --prevent-card-bg: rgba(120,120,120,0.06);
    --prevent-conduta-border: rgba(0,0,0,0.08);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --prevent-bg: #1c1917;
      --prevent-text: #f5f5f4;
      --prevent-text-muted: #78716c;
      --prevent-input-bg: #2e2b29;
      --prevent-border: rgba(255,255,255,0.15);
      --prevent-card-bg: rgba(255,255,255,0.06);
      --prevent-conduta-border: rgba(255,255,255,0.08);
    }
  }

  .prevent-root {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    align-items: start;
  }
  
  @media (min-width: 900px) {
    .prevent-root {
      grid-template-columns: 1.2fr 1fr;
    }
  }

  .prevent-fields-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    width: 100%;
  }

  .prevent-result-card {
    border-radius: 12px;
    padding: 20px;
    box-sizing: border-box;
    transition: background 0.3s ease, border 0.3s ease;
  }

  .prevent-badge-risco {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 6px;
    letter-spacing: 0.04em;
    margin-bottom: 12px;
  }

  .prevent-chips-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .conduta-box {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--prevent-conduta-border);
  }

  /* Disable scroll and increment/decrement buttons on number inputs */
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  
  input[type="number"] {
    -moz-appearance: textfield;
  }
  
  input[type="number"] {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  
  input[type="number"]::-webkit-scrollbar {
    display: none;
  }

  .ipss-slider-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 0 4px 0;
    grid-column: 1 / -1;
  }
  .ipss-slider-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--prevent-text-muted);
    font-weight: 600;
  }
  .ipss-slider-value {
    font-size: 14px;
    font-weight: 600;
    text-align: center;
    min-height: 20px;
    transition: color 0.2s ease;
  }
  .ipss-range {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 16px;
    border-radius: 10px;
    outline: none;
    cursor: pointer;
    transition: background 0.2s ease;
  }
  .ipss-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.25);
    cursor: pointer;
    background: var(--ipss-accent, var(--prevent-text-muted));
  }
  .ipss-range::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.25);
    cursor: pointer;
    background: var(--ipss-accent, var(--prevent-text-muted));
  }
`

const styles = {
    container: {
        background: "var(--prevent-bg)",
        color: "var(--prevent-text)",
        fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "24px",
        borderRadius: "16px",
        width: "100%",
        boxSizing: "border-box" as const,
    },
    title: {
        fontSize: "20px",
        fontWeight: 700,
        marginBottom: "4px",
        color: "var(--prevent-text)",
    },
    subtitle: {
        fontSize: "13px",
        color: "var(--prevent-text-muted)",
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
        color: "var(--prevent-text-muted)",
        fontWeight: 600,
        whiteSpace: "nowrap" as const,
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    sectionLabel: {
        fontSize: "10px",
        textTransform: "uppercase" as const,
        letterSpacing: "0.07em",
        color: "var(--prevent-text-muted)",
        fontWeight: 700,
        gridColumn: "1 / -1",
        marginTop: "4px",
        paddingBottom: "2px",
        borderBottom: "1px solid var(--prevent-border)",
    },
    input: {
        background: "var(--prevent-input-bg)",
        border: "1px solid var(--prevent-border)",
        borderRadius: "10px",
        padding: "10px 14px",
        color: "var(--prevent-text)",
        fontSize: "14px",
        outline: "none",
        height: "42px",
        boxSizing: "border-box" as const,
        width: "100%",
        transition: "all 0.2s ease",
    },
    select: {
        background: "var(--prevent-input-bg)",
        border: "1px solid var(--prevent-border)",
        borderRadius: "10px",
        padding: "10px 14px",
        color: "var(--prevent-text)",
        fontSize: "14px",
        outline: "none",
        cursor: "pointer",
        height: "42px",
        boxSizing: "border-box" as const,
        width: "100%",
    },
    chip: (active: boolean) => ({
        padding: "8px 16px",
        borderRadius: "20px",
        fontSize: "13px",
        cursor: "pointer",
        userSelect: "none" as const,
        background: active
            ? "rgba(224, 36, 36, 0.18)"
            : "var(--prevent-input-bg)",
        border: `1px solid ${active ? "#e02424" : "var(--prevent-border)"}`,
        color: active ? "#ff4d4d" : "var(--prevent-text-muted)",
        fontWeight: active ? 600 : 400,
        transition: "all 0.15s ease",
    }),
    scoreValue: {
        fontSize: "32px",
        fontWeight: 800,
        color: "var(--prevent-text)",
        margin: "4px 0 16px 0",
        display: "flex",
        flexDirection: "column" as const,
        gap: "4px",
    },
    condutaTitle: {
        fontSize: "11px",
        textTransform: "uppercase" as const,
        fontWeight: 700,
        color: "var(--prevent-text-muted)",
        marginBottom: "4px",
        letterSpacing: "0.05em",
    },
    condutaText: {
        fontSize: "13.5px",
        color: "var(--prevent-text)",
        lineHeight: "1.4",
        marginBottom: "12px",
    },
    ldlAlvoBox: {
        background: "rgba(120, 120, 120, 0.08)",
        padding: "12px",
        borderRadius: "8px",
        borderLeft: "4px solid var(--prevent-text)",
        marginBottom: "12px",
    },
    empty: {
        color: "var(--prevent-text-muted)",
        fontSize: "14px",
        textAlign: "center" as const,
        padding: "40px 20px",
        border: "1px dashed var(--prevent-border)",
        borderRadius: "12px",
    },
}

// Configuração adaptiva de alertas para prevenir quebras visuais em Modo Escuro
const CONFIG_RISCOS: Record<
    string,
    { bg: string; t: string; border: string; limiteLdl: number }
> = {
    "Muito Alto": {
        bg: "rgba(245, 49, 39, 0.12)",
        t: "#e62219",
        border: "rgba(245, 49, 39, 0.45)",
        limiteLdl: 50,
    },
    Alto: {
        bg: "rgba(242, 100, 0, 0.1)",
        t: "#ff5d00",
        border: "rgba(242, 100, 0, 0.45)",
        limiteLdl: 70,
    },
    Intermediário: {
        bg: "rgba(242, 143, 0, 0.09)",
        t: "#ff9900",
        border: "rgba(242, 143, 0, 0.45)",
        limiteLdl: 100,
    },
    Borderline: {
        bg: "rgba(200, 160, 0, 0.09)",
        t: "#cc9e00",
        border: "rgba(200, 160, 0, 0.45)",
        limiteLdl: 130,
    },
    Baixo: {
        bg: "rgba(0, 184, 73, 0.09)",
        t: "#00cc52",
        border: "rgba(0, 184, 73, 0.45)",
        limiteLdl: 130,
    },
}

interface Props {
    style?: React.CSSProperties
}

interface ResultadoEscore {
    risco10Anos: string;
    idadeVascular: string | number;
    categoriaRisco: string;
    alvoLdl: string;
    estatinaSugerida: string;
    seguimento: string;
}

interface ScoreQuestion {
    id: string
    label: string
    labelMd?: string
    type?: string
    options: string[]
    value: string
    section?: string
    pesos: number[]
}

type ScoreTool = "prevent" | "ipss" | "gad7" | "phq9"

const CalculadoraPREVENT = forwardRef<CompanionActions, Props>(function CalculadoraPREVENT({ style }: Props, ref) {
    const [activeTab, setActiveTab] = useState<ScoreTool>("prevent")
    const [ipssQuestions, setIpssQuestions] = useState<ScoreQuestion[]>([])
    const [gad7Questions, setGad7Questions] = useState<ScoreQuestion[]>([])
    const [phq9Questions, setPhq9Questions] = useState<ScoreQuestion[]>([])

    const [idade, setIdade] = useState("")
    const [sexo, setSexo] = useState("")
    const [creatinina, setCreatinina] = useState("")
    const [peso, setPeso] = useState("")
    const [altura, setAltura] = useState("")
    const [imc, setImc] = useState("")
    const [asc, setAsc] = useState("")
    const [tfg, setTfg] = useState("")
    const [pas, setPas] = useState("")
    const [colTotal, setColTotal] = useState("")
    const [hdl, setHdl] = useState("")
    const [triglicerideos, setTriglicerideos] = useState("")
    const [ldl, setLdl] = useState("")
    const [hba1c, setHba1c] = useState("")
    const [rac, setRac] = useState("")
    const [prevSecundaria, setPrevSecundaria] = useState(false)
    const [hiperFam, setHiperFam] = useState(false)
    const [diabetes, setDiabetes] = useState(false)
    const [fumante, setFumante] = useState(false)
    const [antiHipertensivos, setAntiHipertensivos] = useState(false)
    const [usoEstatinas, setUsoEstatinas] = useState(false)
    const [resultado, setResultado] = useState<ResultadoEscore | null>(null)

    const syncRef = useRef(false)
    const touchedRef = useRef(false)

    const broadcast = useCallback(() => {
        if (syncRef.current) return
        if (!touchedRef.current) return
        broadcastFieldSync("escores", { idade, sexo, ct: colTotal, hdl, trig: triglicerideos, cr: creatinina })
    }, [idade, sexo, colTotal, hdl, triglicerideos, creatinina])

    useEffect(() => broadcast(), [broadcast])

    useEffect(() => {
        return listenFieldSync(({ source, values }) => {
            if (source === "escores") return
            syncRef.current = true
            touchedRef.current = true
            if (values.idade !== undefined) setIdade(values.idade)
            if (values.sexo !== undefined) setSexo(values.sexo)
            if (values.ct !== undefined) setColTotal(values.ct)
            if (values.hdl !== undefined) setHdl(values.hdl)
            if (values.trig !== undefined) setTriglicerideos(values.trig)
            if (values.cr !== undefined) setCreatinina(values.cr)
            setTimeout(() => { syncRef.current = false }, 0)
        })
    }, [])

    useEffect(() => {
        fetch("/contents/ipss.json")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setIpssQuestions(data.map((q: ScoreQuestion) => ({ ...q, value: q.value ?? "" })))
            })
            .catch(() => setIpssQuestions([]))
    }, [])

    useEffect(() => {
        fetch("/contents/gad7.json")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setGad7Questions(data.map((q: ScoreQuestion) => ({ ...q, value: q.value ?? "" })))
            })
            .catch(() => setGad7Questions([]))
    }, [])

    useEffect(() => {
        fetch("/contents/phq9.json")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setPhq9Questions(data.map((q: ScoreQuestion) => ({ ...q, value: q.value ?? "" })))
            })
            .catch(() => setPhq9Questions([]))
    }, [])

    const scoreTool = useCallback((questions: ScoreQuestion[]) => {
        const total = questions.reduce((acc, q) => {
            const idx = q.options.indexOf(q.value)
            return acc + (idx >= 0 ? q.pesos[idx] : 0)
        }, 0)
        const maxScore = questions.reduce((acc, q) => acc + Math.max(...q.pesos), 0)
        return { total, maxScore }
    }, [])

    const ipss = scoreTool(ipssQuestions)
    const ipssSeverity = ipss.total <= 7 ? "Leve" : ipss.total <= 19 ? "Moderado" : "Grave"
    const ipssQol = ipssQuestions.find(q => q.id === "ipss_qol")
    const ipssQolIdx = ipssQol ? ipssQol.options.indexOf(ipssQol.value) : -1

    const gad7 = scoreTool(gad7Questions)
    const gad7Severity = gad7.total <= 4 ? "Mínimo" : gad7.total <= 9 ? "Leve" : gad7.total <= 14 ? "Moderado" : "Grave"

    const phq9 = scoreTool(phq9Questions)
    const phq9Severity = phq9.total <= 4 ? "Mínimo" : phq9.total <= 9 ? "Leve" : phq9.total <= 14 ? "Moderado" : phq9.total <= 19 ? "Moderadamente grave" : "Grave"

    const formatScoreOutput = useCallback((name: string, questions: ScoreQuestion[], s: { total: number; maxScore: number }, severity: string, extra?: string) => {
        const answered = questions.filter(q => q.value !== "")
        if (!answered.length) return null
        const lines = answered.map(q => {
            const idx = q.options.indexOf(q.value)
            const peso = idx >= 0 ? q.pesos[idx] : 0
            return `  - ${q.labelMd || q.label}: ${q.value} (${peso})`
        })
        lines.push(`  - ${name}: ${s.total}/${s.maxScore} (${severity})`)
        if (extra) lines.push(extra)
        return lines.join("\n")
    }, [])

    useImperativeHandle(ref, () => ({
        getOutput(groupId: string): string | null {
            if (groupId === "risco" && resultado) {
                const cat = resultado.categoriaRisco.toLowerCase()
                return `  - PREVENT: ${resultado.risco10Anos} (${cat}) = LDL ${resultado.alvoLdl}`
            }
            if (groupId === "ipss") return formatScoreOutput("IPSS", ipssQuestions, ipss, ipssSeverity, ipssQolIdx >= 0 ? `  - QoL: ${ipssQolIdx}/6` : undefined)
            if (groupId === "gad7") return formatScoreOutput("GAD-7", gad7Questions, gad7, gad7Severity)
            if (groupId === "phq9") return formatScoreOutput("PHQ-9", phq9Questions, phq9, phq9Severity)
            return null
        },
        reset() {
            setIdade(""); setSexo(""); setCreatinina(""); setPeso(""); setAltura(""); setImc(""); setAsc(""); setTfg(""); setPas(""); setColTotal(""); setHdl(""); setTriglicerideos(""); setLdl(""); setHba1c(""); setRac("")
            setPrevSecundaria(false); setHiperFam(false); setDiabetes(false); setFumante(false); setAntiHipertensivos(false); setUsoEstatinas(false)
            setResultado(null)
            setCamposTocados({ idade: false, peso: false, altura: false, imc: false, creatinina: false, pas: false, rac: false, colTotal: false, hdl: false, triglicerideos: false, hba1c: false })
            const resetTool = (url: string, setter: (q: ScoreQuestion[]) => void) =>
                fetch(url).then(r => r.json()).then(d => { if (Array.isArray(d)) setter(d.map((q: ScoreQuestion) => ({ ...q, value: q.value ?? "" }))) }).catch(() => setter([]))
            resetTool("/contents/ipss.json", setIpssQuestions)
            resetTool("/contents/gad7.json", setGad7Questions)
            resetTool("/contents/phq9.json", setPhq9Questions)
        },
    }))

    // Track which fields have been touched (blurred)
    const [camposTocados, setCamposTocados] = useState({
        idade: false,
        peso: false,
        altura: false,
        imc: false,
        creatinina: false,
        pas: false,
        rac: false,
        colTotal: false,
        hdl: false,
        triglicerideos: false,
        hba1c: false,
    })

    // Antropometria (IMC e ASC)
    useEffect(() => {
        const p = parseFloat(peso)
        const altCm = parseFloat(altura)
        const altMetro = altCm / 100
        if (!p || !altCm || isNaN(p) || isNaN(altCm) || altCm <= 0) {
            setImc("")
            setAsc("")
            return
        }
        setImc((p / (altMetro * altMetro)).toFixed(1))
        setAsc(
            (0.007184 * Math.pow(p, 0.425) * Math.pow(altCm, 0.725)).toFixed(2)
        )
    }, [peso, altura])

    // Renal (TFG CKD-EPI 2021)
    useEffect(() => {
        const i = parseInt(idade)
        const cr = parseFloat(creatinina)
        const valorAsc = parseFloat(asc)
        if (!i || !sexo || !cr || isNaN(cr) || cr <= 0) return
        const a = sexo === "F" ? 0.7 : 0.9
        const b =
            sexo === "F"
                ? cr <= 0.7
                    ? -0.241
                    : -1.2
                : cr <= 0.9
                  ? -0.302
                  : -1.2
        const fSexo = sexo === "F" ? 1.012 : 1.0
        let calcTfg = 142 * Math.pow(cr / a, b) * Math.pow(0.9938, i) * fSexo
        if (valorAsc && !isNaN(valorAsc)) calcTfg = (calcTfg * valorAsc) / 1.73
        setTfg(Math.round(calcTfg).toString())
    }, [idade, sexo, creatinina, asc])

    // Estimativa LDL Martin-Hopkins
    useEffect(() => {
        const ct = parseFloat(colTotal)
        const h = parseFloat(hdl)
        const tg = parseFloat(triglicerideos)
        if (!ct || !h || !tg || isNaN(ct) || isNaN(h) || isNaN(tg)) {
            setLdl("")
            return
        }
        if (tg >= 400) {
            setLdl("")
            return
        }
        const noHdl = ct - h
        if (noHdl <= 0) {
            setLdl("0")
            return
        }
        let fatorMh = 5.0
        if (noHdl < 100) {
            fatorMh = tg < 100 ? 4.1 : tg < 150 ? 4.8 : 5.6
        } else if (noHdl < 160) {
            fatorMh = tg < 100 ? 4.4 : tg < 150 ? 5.1 : tg < 200 ? 5.5 : 6.2
        } else {
            fatorMh = tg < 100 ? 4.7 : tg < 200 ? 5.4 : 6.7
        }
        setLdl(Math.max(0, Math.round(noHdl - tg / fatorMh)).toString())
    }, [colTotal, hdl, triglicerideos])

    const obterEstiloLdl = () => {
        const valorLdl = parseFloat(ldl)
        if (!ldl || isNaN(valorLdl))
            return { ...styles.input, background: "rgba(0,0,0,0.04)" }
        let limiteMeta = 130
        if (resultado && CONFIG_RISCOS[resultado.categoriaRisco])
            limiteMeta = CONFIG_RISCOS[resultado.categoriaRisco].limiteLdl
        const base = { ...styles.input }
        return valorLdl <= limiteMeta
            ? {
                  ...base,
                  background: "rgba(0, 184, 73, 0.05)",
                  borderColor: "rgba(0, 184, 73, 0.3)",
                  color: "#007a30",
                  fontWeight: 600,
              }
            : {
                  ...base,
                  background: "rgba(245, 49, 39, 0.06)",
                  borderColor: "rgba(245, 49, 39, 0.3)",
                  color: "#ba120a",
                  fontWeight: 600,
              }
    }

    const obterEstadiamentoKdigo = () => {
        const v = parseInt(tfg)
        if (!tfg || isNaN(v)) return ""
        if (v >= 90) return "G1"
        if (v >= 60) return "G2"
        if (v >= 45) return "G3a"
        if (v >= 30) return "G3b"
        if (v >= 15) return "G4"
        return "G5"
    }

    const obterEstiloTfg = () => {
        const v = parseInt(tfg)
        if (!tfg || isNaN(v))
            return { ...styles.input, background: "rgba(0,0,0,0.04)" }
        const base = { ...styles.input, paddingRight: "56px" }
        if (v >= 60)
            return {
                ...base,
                background: "rgba(0, 184, 73, 0.05)",
                borderColor: "rgba(0, 184, 73, 0.3)",
                color: "#007a30",
                fontWeight: 600,
            }
        if (v >= 30)
            return {
                ...base,
                background: "rgba(242, 143, 0, 0.06)",
                borderColor: "rgba(242, 143, 0, 0.35)",
                color: "#b56100",
                fontWeight: 600,
            }
        return {
            ...base,
            background: "rgba(245, 49, 39, 0.06)",
            borderColor: "rgba(245, 49, 39, 0.3)",
            color: "#ba120a",
            fontWeight: 600,
        }
    }

    const obterCorTextoKdigo = () => {
        const v = parseInt(tfg)
        return v >= 60 ? "#007a30" : v >= 30 ? "#b56100" : "#ba120a"
    }

    const obterClassificacaoImc = () => {
        const v = parseFloat(imc)
        if (!imc || isNaN(v)) return ""
        if (v < 18.5) return "Abaixo"
        if (v < 25) return "Eutrofia"
        if (v < 30) return "Sobrepeso"
        if (v < 35) return "Ob. I"
        if (v < 40) return "Ob. II"
        return "Ob. III"
    }

    const obterEstiloImc = () => {
        const v = parseFloat(imc)
        if (!imc || isNaN(v))
            return { ...styles.input, background: "rgba(0,0,0,0.04)" }
        const base = { ...styles.input, paddingRight: "72px" }
        if (v >= 18.5 && v < 25)
            return {
                ...base,
                background: "rgba(0, 184, 73, 0.05)",
                borderColor: "rgba(0, 184, 73, 0.3)",
                color: "#007a30",
                fontWeight: 600,
            }
        if (v < 18.5 || (v >= 25 && v < 30))
            return {
                ...base,
                background: "rgba(242, 143, 0, 0.06)",
                borderColor: "rgba(242, 143, 0, 0.35)",
                color: "#b56100",
                fontWeight: 600,
            }
        return {
            ...base,
            background: "rgba(245, 49, 39, 0.06)",
            borderColor: "rgba(245, 49, 39, 0.3)",
            color: "#ba120a",
            fontWeight: 600,
        }
    }

    const obterCorTextoImc = () => {
        const v = parseFloat(imc)
        return v >= 18.5 && v < 25
            ? "#007a30"
            : v < 18.5 || (v >= 25 && v < 30)
              ? "#b56100"
              : "#ba120a"
    }

    // Validation functions for field limits based on cvd.js
    const validarIdade = (val: string) => {
        const num = parseInt(val)
        if (!val) return false
        return num >= 30 && num <= 79
    }

    const validarPas = (val: string) => {
        const num = parseInt(val)
        if (!val) return false
        return num >= 70 && num <= 250
    }

    const validarColTotal = (val: string) => {
        const num = parseInt(val)
        if (!val) return false
        return num >= 100 && num <= 400
    }

    const validarHdl = (val: string) => {
        const num = parseInt(val)
        if (!val) return false
        return num >= 20 && num <= 150
    }

    const validarCreatinina = (val: string) => {
        const num = parseFloat(val)
        if (!val) return false
        return num >= 0.3 && num <= 10
    }

    const validarHba1c = (val: string) => {
        const num = parseFloat(val)
        if (!val) return false
        return num >= 3 && num <= 15
    }

    const validarRac = (val: string) => {
        const num = parseFloat(val)
        if (!val) return false
        return num >= 0.1 && num <= 5000
    }

    const validarPeso = (val: string) => {
        const num = parseFloat(val)
        if (!val) return false
        return num >= 30 && num <= 300
    }

    const validarAltura = (val: string) => {
        const num = parseInt(val)
        if (!val) return false
        return num >= 100 && num <= 250
    }

    const obterEstiloInputInvalido = (
        valido: boolean,
        tocado: boolean,
        valor: string
    ) => {
        if (tocado && !valido && valor !== "") {
            return {
                ...styles.input,
                border: "2px solid #dc2626",
                backgroundColor: "rgba(220, 38, 38, 0.05)",
            }
        }
        return styles.input
    }

    // Algoritmo PREVENT Dinâmico Conforme os Biomarcadores Preenchidos
    useEffect(() => {
        const i = parseInt(idade)
        const p = parseInt(pas)
        const ct = parseInt(colTotal)
        const h = parseInt(hdl)
        const valorTfg = parseInt(tfg)
        const valorHba1c = parseFloat(hba1c)
        const valorRac = parseFloat(rac)

        const examesOk = i && sexo && p && ct && h
        const sobrescritaImediata = prevSecundaria || hiperFam

        if (!examesOk && !sobrescritaImediata) {
            setResultado(null)
            return
        }

        let riscoCalculado = 0
        let categoriaRisco = "Baixo"

        if (examesOk) {
            const X_id = (i - 55) / 10
            const X_pas_min = (Math.min(p, 110) - 110) / 20
            const X_pas_max = (Math.max(p, 110) - 130) / 20
            const X_ct = ct * 0.02586 - 3.5
            const X_hdl = (h * 0.02586 - 1.3) / 0.3
            const X_tfg_min =
                (Math.min(!isNaN(valorTfg) ? valorTfg : 90, 60) - 60) / -15
            const X_tfg_max =
                (Math.max(!isNaN(valorTfg) ? valorTfg : 90, 60) - 90) / -15

            const temHbA1c = hba1c !== "" && !isNaN(valorHba1c)
            const temRac = rac !== "" && !isNaN(valorRac) && valorRac > 0
            const temDiab = diabetes ? 1 : 0
            const temFum = fumante ? 1 : 0
            const temAntiHip = antiHipertensivos ? 1 : 0
            const temEstatina = usoEstatinas ? 1 : 0

            let linearPredictor = 0

            if (sexo === "F") {
                if (!temHbA1c && !temRac) {
                    // 1. Modelo Feminino BASE
                    linearPredictor =
                        -3.307728 +
                        0.7939329 * X_id +
                        0.0305239 * X_ct -
                        0.1606857 * X_hdl -
                        0.2394003 * X_pas_min +
                        0.3600781 * X_pas_max +
                        0.8667604 * temDiab +
                        0.5360739 * temFum +
                        0.6045917 * X_tfg_min +
                        0.0433769 * X_tfg_max +
                        0.3151672 * temAntiHip -
                        0.1477655 * temEstatina -
                        0.0663612 * temAntiHip * X_pas_max +
                        0.1197879 * temEstatina * X_ct -
                        0.0819715 * X_id * X_ct +
                        0.0306769 * X_id * X_hdl -
                        0.0946348 * X_id * X_pas_max -
                        0.27057 * temDiab * X_id -
                        0.078715 * temFum * X_id -
                        0.1637806 * X_id * X_tfg_min
                } else if (temHbA1c && !temRac) {
                    // 2. Modelo Feminino com HbA1c
                    const f_hba1c =
                        temDiab === 1
                            ? 0.1338348 * (valorHba1c - 5.3)
                            : 0.1622409 * (valorHba1c - 5.3)
                    linearPredictor =
                        -3.306162 +
                        0.7858178 * X_id +
                        0.0194438 * X_ct -
                        0.1521964 * X_hdl -
                        0.2296681 * X_pas_min +
                        0.3465777 * X_pas_max +
                        0.5366241 * temDiab +
                        0.5411682 * temFum +
                        0.5931898 * X_tfg_min +
                        0.0472458 * X_tfg_max +
                        0.3158567 * temAntiHip -
                        0.1535174 * temEstatina -
                        0.0687752 * temAntiHip * X_pas_max +
                        0.1054746 * temEstatina * X_ct -
                        0.0761119 * X_id * X_ct +
                        0.0307469 * X_id * X_hdl -
                        0.0905966 * X_id * X_pas_max -
                        0.2241857 * temDiab * X_id -
                        0.080186 * temFum * X_id -
                        0.1667286 * X_id * X_tfg_min +
                        f_hba1c
                } else if (!temHbA1c && temRac) {
                    // 3. Modelo Feminino com RAC
                    linearPredictor =
                        -3.738341 +
                        0.7969249 * X_id +
                        0.0256635 * X_ct -
                        0.1588107 * X_hdl -
                        0.2255701 * X_pas_min +
                        0.3396649 * X_pas_max +
                        0.8047515 * temDiab +
                        0.5285338 * temFum +
                        0.4803511 * X_tfg_min +
                        0.0434472 * X_tfg_max +
                        0.2985207 * temAntiHip -
                        0.1497787 * temEstatina -
                        0.0742889 * temAntiHip * X_pas_max +
                        0.106756 * temEstatina * X_ct -
                        0.0778126 * X_id * X_ct +
                        0.0306768 * X_id * X_hdl -
                        0.0907168 * X_id * X_pas_max -
                        0.2705122 * temDiab * X_id -
                        0.0830564 * temFum * X_id -
                        0.1389249 * X_id * X_tfg_min +
                        0.1793037 * Math.log(valorRac)
                } else {
                    // 4. Modelo Feminino COMPLETO (HbA1c + RAC)
                    const f_hba1c_full =
                        temDiab === 1
                            ? 0.1298513 * (valorHba1c - 5.3)
                            : 0.1412555 * (valorHba1c - 5.3)

                    // SDI adjustment terms (from cvd.js official formula)
                    const sdiAdjustment = 0
                    // Note: SDI values would need to be added as input parameters
                    // For now, using 0 as placeholder since SDI is not in current UI

                    // Missing value adjustments
                    const sdiMissingAdjustment = 0.1804508 // SDI missing or empty
                    const uacrMissingAdjustment = rac === "" ? 0.0198413 : 0
                    const hba1cMissingAdjustment = hba1c === "" ? 0.0031658 : 0

                    linearPredictor =
                        -3.860385 +
                        0.7716794 * X_id +
                        0.0062109 * X_ct -
                        0.1547756 * X_hdl -
                        0.1933123 * X_pas_min +
                        0.3071217 * X_pas_max +
                        0.496753 * temDiab +
                        0.466605 * temFum +
                        0.4780697 * X_tfg_min +
                        0.0529077 * X_tfg_max +
                        0.3034892 * temAntiHip -
                        0.1556524 * temEstatina -
                        0.0667026 * temAntiHip * X_pas_max +
                        0.1061825 * temEstatina * X_ct -
                        0.0742271 * X_id * X_ct +
                        0.0288245 * X_id * X_hdl -
                        0.0875188 * X_id * X_pas_max -
                        0.2267102 * temDiab * X_id -
                        0.0676125 * temFum * X_id -
                        0.1493231 * X_id * X_tfg_min +
                        sdiAdjustment +
                        f_hba1c_full +
                        sdiMissingAdjustment +
                        uacrMissingAdjustment -
                        hba1cMissingAdjustment +
                        0.1645922 * Math.log(valorRac)
                }
            } else {
                // BLOCO MASCULINO
                if (!temHbA1c && !temRac) {
                    // 1. Modelo Masculino BASE
                    linearPredictor =
                        -3.031168 +
                        0.7688528 * X_id +
                        0.0736174 * X_ct -
                        0.0954431 * X_hdl -
                        0.4347345 * X_pas_min +
                        0.3362658 * X_pas_max +
                        0.7692857 * temDiab +
                        0.4386871 * temFum +
                        0.5378979 * X_tfg_min +
                        0.0164827 * X_tfg_max +
                        0.288879 * temAntiHip -
                        0.1337349 * temEstatina -
                        0.0475924 * temAntiHip * X_pas_max +
                        0.150273 * temEstatina * X_ct -
                        0.0517874 * X_id * X_ct +
                        0.0191169 * X_id * X_hdl -
                        0.1049477 * X_id * X_pas_max -
                        0.2251948 * temDiab * X_id -
                        0.0895067 * temFum * X_id -
                        0.1543702 * X_id * X_tfg_min
                } else if (temHbA1c && !temRac) {
                    // 2. Modelo Masculino com HbA1c
                    const m_hba1c =
                        temDiab === 1
                            ? 0.13159 * (valorHba1c - 5.3)
                            : 0.1295185 * (valorHba1c - 5.3)
                    linearPredictor =
                        -3.040901 +
                        0.7699177 * X_id +
                        0.0605093 * X_ct -
                        0.0888525 * X_hdl -
                        0.417713 * X_pas_min +
                        0.3288657 * X_pas_max +
                        0.4759471 * temDiab +
                        0.4385663 * temFum +
                        0.5334616 * X_tfg_min +
                        0.0206431 * X_tfg_max +
                        0.2917524 * temAntiHip -
                        0.1383313 * temEstatina -
                        0.0482622 * temAntiHip * X_pas_max +
                        0.1393796 * temEstatina * X_ct -
                        0.0463501 * X_id * X_ct +
                        0.0205926 * X_id * X_hdl -
                        0.1037717 * X_id * X_pas_max -
                        0.1737697 * temDiab * X_id -
                        0.0915839 * temFum * X_id -
                        0.1637039 * X_id * X_tfg_min +
                        m_hba1c
                } else if (!temHbA1c && temRac) {
                    // 3. Modelo Masculino com RAC
                    linearPredictor =
                        -3.510705 +
                        0.7768655 * X_id +
                        0.0659949 * X_ct -
                        0.0951111 * X_hdl -
                        0.420667 * X_pas_min +
                        0.3120151 * X_pas_max +
                        0.698521 * temDiab +
                        0.4314669 * temFum +
                        0.3841364 * X_tfg_min +
                        0.009384 * X_tfg_max +
                        0.2676494 * temAntiHip -
                        0.1390966 * temEstatina -
                        0.0579315 * temAntiHip * X_pas_max +
                        0.1383719 * temEstatina * X_ct -
                        0.0488332 * X_id * X_ct +
                        0.0200406 * X_id * X_hdl -
                        0.102454 * X_id * X_pas_max -
                        0.2236355 * temDiab * X_id -
                        0.089485 * temFum * X_id -
                        0.1321848 * X_id * X_tfg_min +
                        0.1887974 * Math.log(valorRac)
                } else {
                    // 4. Modelo Masculino COMPLETO (HbA1c + RAC)
                    const m_hba1c_full =
                        temDiab === 1
                            ? 0.1165698 * (valorHba1c - 5.3)
                            : 0.1048297 * (valorHba1c - 5.3)

                    // SDI adjustment terms (from cvd.js official formula)
                    const sdiAdjustment = 0
                    // Note: SDI values would need to be added as input parameters
                    // For now, using 0 as placeholder since SDI is not in current UI

                    // Missing value adjustments
                    const sdiMissingAdjustment = 0.144759 // SDI missing or empty
                    const uacrMissingAdjustment = rac === "" ? 0.1095674 : 0
                    const hba1cMissingAdjustment = hba1c === "" ? 0.0230072 : 0

                    linearPredictor =
                        -3.631387 +
                        0.7847578 * X_id +
                        0.0534485 * X_ct -
                        0.0911282 * X_hdl -
                        0.4921973 * X_pas_min +
                        0.2972415 * X_pas_max +
                        0.4527054 * temDiab +
                        0.3726641 * temFum +
                        0.3886854 * X_tfg_min +
                        0.0081661 * X_tfg_max +
                        0.2508052 * temAntiHip -
                        0.1538484 * temEstatina -
                        0.0474695 * temAntiHip * X_pas_max +
                        0.1415382 * temEstatina * X_ct -
                        0.0436455 * X_id * X_ct +
                        0.0199549 * X_id * X_hdl -
                        0.1022686 * X_id * X_pas_max -
                        0.1762507 * temDiab * X_id -
                        0.0715873 * temFum * X_id -
                        0.1428668 * X_id * X_tfg_min +
                        sdiAdjustment +
                        m_hba1c_full +
                        sdiMissingAdjustment +
                        uacrMissingAdjustment -
                        hba1cMissingAdjustment +
                        0.1772853 * Math.log(valorRac)
                }
            }

            riscoCalculado =
                (Math.exp(linearPredictor) / (1 + Math.exp(linearPredictor))) *
                100
        }

        // Calculate vascular age (tenYearRisk) based on cvd.js formula
        let idadeVascular = ""
        if (examesOk && !sobrescritaImediata) {
            if (sexo === "F") {
                idadeVascular = Math.round(
                    45.03746 + 11.27498 * Math.log((riscoCalculado / 100) * 100)
                ).toString()
            } else {
                idadeVascular = Math.round(
                    41.55092 + 11.7171 * Math.log((riscoCalculado / 100) * 100)
                ).toString()
            }
        }

        // Bloco de Diretrizes e Critérios Clínicos Brasileiros (SBC)
        if (prevSecundaria) categoriaRisco = "Muito Alto"
        else if (hiperFam) categoriaRisco = "Alto"
        else if (examesOk) {
            const temDiabetes = diabetes || valorHba1c >= 6.5
            if (
                (!isNaN(valorTfg) && valorTfg < 45) ||
                valorRac > 300 ||
                (temDiabetes && (parseInt(idade) >= 50 || fumante))
            ) {
                categoriaRisco = "Alto"
            } else {
                if (riscoCalculado < 5) categoriaRisco = "Baixo"
                else if (riscoCalculado < 7.5) categoriaRisco = "Borderline"
                else if (riscoCalculado < 20) categoriaRisco = "Intermediário"
                else categoriaRisco = "Alto"
            }
        }

        let alvoLdl = "",
            estatinaSugerida = "",
            seguimento = ""
        switch (categoriaRisco) {
            case "Muito Alto":
                alvoLdl = "< 50 mg/dL (e redução ≥ 50% do valor basal)"
                estatinaSugerida =
                    "Alta Intensidade: atorvastatina 40-80mg OU rosuvastatina 20-40mg. Se não atingir alvo, associar ezetimiba 10mg."
                seguimento =
                    "Prevenção Secundária mandatória. Controle estrito de fatores metabólicos. Repetir perfil lipídico em 4 a 8 semanas para ajuste de dose."
                break
            case "Alto":
                alvoLdl = "< 70 mg/dL (e redução ≥ 50% do valor basal)"
                estatinaSugerida = usoEstatinas
                    ? "Manter terapia ou intensificar se fora da meta. Considerar atorvastatina 40-80mg ou rosuvastatina 20-40mg. Associar ezetimiba 10 mg se necessário."
                    : "Alta intensidade: atorvastatina 40mg OU rosuvastatina 20mg."
                seguimento =
                    "Prevenção Primária de alto risco ou critério clínico. Foco em atingir a meta terapêutica de LDL de forma agressiva."
                break
            case "Intermediário":
                alvoLdl = "< 100 mg/dL"
                estatinaSugerida = usoEstatinas
                    ? "Manter esquema atual se LDL estiver dentro da meta (< 100 mg/dL). Se acima, titular dose ou trocar por mais potente."
                    : "Moderada Intensidade: atorvastatina 10-20mg, rosuvastatina 5-10mg ou sinvastatina 20-40mg."
                seguimento =
                    "Discussão clínica compartilhada. Avaliar presença de fatores potencializadores não inclusos no escore para guiar a agressividade do tratamento."
                break
            case "Borderline":
                alvoLdl = "< 130 mg/dL"
                estatinaSugerida =
                    "Avaliar estilo de vida de forma isolada na maioria dos casos. Se já estiver em uso de estatina de dose baixa, manter acompanhamento."
                seguimento =
                    "Foco em Mudança do Estilo de Vida. Reavaliar fatores de risco e perfil lipídico em 3 a 6 meses."
                break
            default:
                alvoLdl = "< 130 mg/dL"
                estatinaSugerida =
                    "Não indicado o início de estatinas (salvo se indicação prévia)."
                seguimento =
                    "Estimular hábitos de vida saudáveis. Reestratificação em 3 a 5 anos."
        }

        setResultado({
            risco10Anos: sobrescritaImediata
                ? "Não calculável"
                : `${riscoCalculado.toFixed(1)}%`,
            idadeVascular: sobrescritaImediata
                ? "Não calculável"
                : idadeVascular,
            categoriaRisco,
            alvoLdl,
            estatinaSugerida,
            seguimento,
        })
    }, [
        idade,
        sexo,
        pas,
        colTotal,
        hdl,
        tfg,
        hba1c,
        rac,
        prevSecundaria,
        hiperFam,
        diabetes,
        fumante,
        antiHipertensivos,
        usoEstatinas,
    ])

    const updateIpss = useCallback((questionId: string, value: string) => {
        setIpssQuestions(prev => prev.map(q => q.id === questionId ? { ...q, value } : q))
    }, [])

    const updateGad7 = useCallback((questionId: string, value: string) => {
        setGad7Questions(prev => prev.map(q => q.id === questionId ? { ...q, value } : q))
    }, [])

    const updatePhq9 = useCallback((questionId: string, value: string) => {
        setPhq9Questions(prev => prev.map(q => q.id === questionId ? { ...q, value } : q))
    }, [])

    return (
        <div style={{ ...styles.container, ...style }} onFocus={() => { touchedRef.current = true }}>
            <style dangerouslySetInnerHTML={{ __html: injectStyles }} />

            <div style={{ display: "flex", gap: "4px", marginBottom: "16px", flexWrap: "wrap" }}>
                {([["prevent", "PREVENT"], ["ipss", "IPSS"], ["gad7", "GAD-7"], ["phq9", "PHQ-9"]] as const).map(([key, label]) => (
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
                            background: activeTab === key ? "rgba(224, 36, 36, 0.18)" : "var(--prevent-input-bg)",
                            border: `1px solid ${activeTab === key ? "#e02424" : "var(--prevent-border)"}`,
                            color: activeTab === key ? "#ff4d4d" : "var(--prevent-text-muted)",
                            transition: "all 0.15s ease",
                        }}
                    >
                        {label}
                    </div>
                ))}
            </div>

            {activeTab === "prevent" ? (<>
            <div style={styles.title}>
                PREVENT, CKD-EPI, IMC, LDL
            </div>
            <div style={styles.subtitle} />

            <div className="prevent-root">
                <div className="prevent-fields-grid">
                    <div style={styles.sectionLabel}>Antropometria</div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>
                            Idade (30-79 anos){" "}
                            <span style={{ color: "#dc2626" }}>*</span>
                        </label>
                        <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Ex: 58"
                            value={idade}
                            onChange={(e) => setIdade(e.target.value.replace(/,/g, "."))}
                            onBlur={() =>
                                setCamposTocados({
                                    ...camposTocados,
                                    idade: true,
                                })
                            }
                            style={obterEstiloInputInvalido(
                                validarIdade(idade),
                                camposTocados.idade,
                                idade
                            )}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>
                            Sexo Biológico{" "}
                            <span style={{ color: "#dc2626" }}>*</span>
                        </label>
                        <select
                            value={sexo}
                            onChange={(e) => setSexo(e.target.value)}
                            style={styles.select}
                        >
                            <option value="">Selecione</option>
                            <option value="F">Feminino</option>
                            <option value="M">Masculino</option>
                        </select>
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Peso (kg)</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Ex: 82.5"
                            value={peso}
                            onChange={(e) => setPeso(e.target.value.replace(/,/g, "."))}
                            onBlur={() =>
                                setCamposTocados({
                                    ...camposTocados,
                                    peso: true,
                                })
                            }
                            style={obterEstiloInputInvalido(
                                validarPeso(peso),
                                camposTocados.peso,
                                peso
                            )}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Altura (cm)</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Ex: 175"
                            value={altura}
                            onChange={(e) => setAltura(e.target.value.replace(/,/g, "."))}
                            onBlur={() =>
                                setCamposTocados({
                                    ...camposTocados,
                                    altura: true,
                                })
                            }
                            style={obterEstiloInputInvalido(
                                validarAltura(altura),
                                camposTocados.altura,
                                altura
                            )}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>IMC (kg/m²)</label>
                        <div style={{ position: "relative", width: "100%" }}>
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="Calculado"
                                value={imc}
                                onChange={(e) => setImc(e.target.value.replace(/,/g, "."))}
                                onBlur={() =>
                                    setCamposTocados({
                                        ...camposTocados,
                                        imc: true,
                                    })
                                }
                                style={obterEstiloImc()}
                            />
                            {imc && (
                                <span
                                    style={{
                                        position: "absolute",
                                        right: "10px",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        fontSize: "10px",
                                        fontWeight: 700,
                                        color: obterCorTextoImc(),
                                        textTransform: "uppercase",
                                        pointerEvents: "none",
                                        userSelect: "none",
                                    }}
                                >
                                    {obterClassificacaoImc()}
                                </span>
                            )}
                        </div>
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Sup. Corporal (m²)</label>
                        <input
                            type="text"
                            placeholder="Calculado"
                            value={asc}
                            readOnly
                            style={{
                                ...styles.input,
                                background: "rgba(0,0,0,0.04)",
                                fontWeight: asc ? 600 : 400,
                            }}
                        />
                    </div>

                    <div style={styles.sectionLabel}>Hemodinâmica</div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Creatinina (mg/dL)</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Ex: 0.95"
                            value={creatinina}
                            onChange={(e) => setCreatinina(e.target.value.replace(/,/g, "."))}
                            onBlur={() =>
                                setCamposTocados({
                                    ...camposTocados,
                                    creatinina: true,
                                })
                            }
                            style={obterEstiloInputInvalido(
                                validarCreatinina(creatinina),
                                camposTocados.creatinina,
                                creatinina
                            )}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>
                            {peso && altura
                                ? "TFG Absoluta (mL/min)"
                                : "TFG (mL/min/1.73m²)"}
                        </label>
                        <div style={{ position: "relative", width: "100%" }}>
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="Calculado"
                                value={tfg}
                                onChange={(e) => setTfg(e.target.value.replace(/,/g, "."))}
                                style={obterEstiloTfg()}
                            />
                            {tfg && (
                                <span
                                    style={{
                                        position: "absolute",
                                        right: "10px",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        color: obterCorTextoKdigo(),
                                        textTransform: "uppercase",
                                        pointerEvents: "none",
                                        userSelect: "none",
                                    }}
                                >
                                    {obterEstadiamentoKdigo()}
                                </span>
                            )}
                        </div>
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>
                            PAS (mmHg){" "}
                            <span style={{ color: "#dc2626" }}>*</span>
                        </label>
                        <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Ex: 138"
                            value={pas}
                            onChange={(e) => setPas(e.target.value.replace(/,/g, "."))}
                            onBlur={() =>
                                setCamposTocados({
                                    ...camposTocados,
                                    pas: true,
                                })
                            }
                            style={obterEstiloInputInvalido(
                                validarPas(pas),
                                camposTocados.pas,
                                pas
                            )}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>RAC (mg/g)</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Ex: 10"
                            value={rac}
                            onChange={(e) => setRac(e.target.value.replace(/,/g, "."))}
                            onBlur={() =>
                                setCamposTocados({
                                    ...camposTocados,
                                    rac: true,
                                })
                            }
                            style={obterEstiloInputInvalido(
                                validarRac(rac),
                                camposTocados.rac,
                                rac
                            )}
                        />
                    </div>

                    <div style={styles.sectionLabel}>Perfil Metabólico</div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>
                            Col. Total (mg/dL){" "}
                            <span style={{ color: "#dc2626" }}>*</span>
                        </label>
                        <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Ex: 230"
                            value={colTotal}
                            onChange={(e) => setColTotal(e.target.value.replace(/,/g, "."))}
                            onBlur={() =>
                                setCamposTocados({
                                    ...camposTocados,
                                    colTotal: true,
                                })
                            }
                            style={obterEstiloInputInvalido(
                                validarColTotal(colTotal),
                                camposTocados.colTotal,
                                colTotal
                            )}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>
                            HDL (mg/dL){" "}
                            <span style={{ color: "#dc2626" }}>*</span>
                        </label>
                        <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Ex: 42"
                            value={hdl}
                            onChange={(e) => setHdl(e.target.value.replace(/,/g, "."))}
                            onBlur={() =>
                                setCamposTocados({
                                    ...camposTocados,
                                    hdl: true,
                                })
                            }
                            style={obterEstiloInputInvalido(
                                validarHdl(hdl),
                                camposTocados.hdl,
                                hdl
                            )}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>
                            Triglicerídeos (mg/dL)
                        </label>
                        <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Ex: 150"
                            value={triglicerideos}
                            onChange={(e) => setTriglicerideos(e.target.value.replace(/,/g, "."))}
                            onBlur={() =>
                                setCamposTocados({
                                    ...camposTocados,
                                    triglicerideos: true,
                                })
                            }
                            style={obterEstiloInputInvalido(
                                triglicerideos !== ""
                                    ? parseInt(triglicerideos) >= 30 &&
                                          parseInt(triglicerideos) <= 1000
                                    : false,
                                camposTocados.triglicerideos,
                                triglicerideos
                            )}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>LDL-c (mg/dL)</label>
                        <input
                            type="text"
                            placeholder={
                                parseFloat(triglicerideos) >= 400
                                    ? "Dosagem Direta"
                                    : "Calculado"
                            }
                            value={ldl}
                            readOnly
                            style={obterEstiloLdl()}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>HbA1c (%)</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Ex: 5.4"
                            value={hba1c}
                            onChange={(e) => setHba1c(e.target.value.replace(/,/g, "."))}
                            onBlur={() =>
                                setCamposTocados({
                                    ...camposTocados,
                                    hba1c: true,
                                })
                            }
                            style={obterEstiloInputInvalido(
                                validarHba1c(hba1c),
                                camposTocados.hba1c,
                                hba1c
                            )}
                        />
                    </div>

                    <div style={{ ...styles.sectionLabel, marginTop: "4px" }}>
                        Modificadores
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                        <div className="prevent-chips-grid">
                            <div
                                style={styles.chip(prevSecundaria)}
                                onClick={() =>
                                    setPrevSecundaria(!prevSecundaria)
                                }
                            >
                                IAM, AVC ou Doença Arterial prévia
                            </div>
                            <div
                                style={styles.chip(hiperFam)}
                                onClick={() => setHiperFam(!hiperFam)}
                            >
                                Hipercolesterolemia Familiar
                            </div>
                            <div
                                style={styles.chip(antiHipertensivos)}
                                onClick={() =>
                                    setAntiHipertensivos(!antiHipertensivos)
                                }
                            >
                                Uso de anti-hipertensivos
                            </div>
                            <div
                                style={styles.chip(usoEstatinas)}
                                onClick={() => setUsoEstatinas(!usoEstatinas)}
                            >
                                Uso de estatinas
                            </div>
                            <div
                                style={styles.chip(diabetes)}
                                onClick={() => setDiabetes(!diabetes)}
                            >
                                Diabetes Mellitus
                            </div>
                            <div
                                style={styles.chip(fumante)}
                                onClick={() => setFumante(!fumante)}
                            >
                                Tabagista Ativo
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    {!resultado ? (
                        <div style={styles.empty}>
                            Insira os dados clínicos essenciais*.
                        </div>
                    ) : (
                        <div
                            className="prevent-result-card"
                            style={{
                                background:
                                    CONFIG_RISCOS[resultado.categoriaRisco].bg,
                                border: `1px solid ${CONFIG_RISCOS[resultado.categoriaRisco].border}`,
                            }}
                        >
                            <span
                                className="prevent-badge-risco"
                                style={{
                                    background: "rgba(255,255,255,0.6)",
                                    color: CONFIG_RISCOS[
                                        resultado.categoriaRisco
                                    ].t,
                                    border: `1px solid ${CONFIG_RISCOS[resultado.categoriaRisco].border}`,
                                }}
                            >
                                Risco Global: {resultado.categoriaRisco}
                            </span>
                            <div style={styles.label}>
                                Estimativa em 10 Anos
                            </div>
                            <div style={styles.scoreValue}>
                                {resultado.risco10Anos}
                            </div>
                            {resultado.idadeVascular &&
                                resultado.idadeVascular !==
                                    "Não calculável" && (
                                    <>
                                        <div style={styles.label}>
                                            Idade Vascular
                                        </div>
                                        <div style={styles.scoreValue}>
                                            {resultado.idadeVascular} anos
                                        </div>
                                    </>
                                )}
                            <div className="conduta-box">
                                <div style={styles.ldlAlvoBox}>
                                    <div
                                        style={{
                                            ...styles.condutaTitle,
                                            color: CONFIG_RISCOS[
                                                resultado.categoriaRisco
                                            ].t,
                                        }}
                                    >
                                        Alvo de LDL-c
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "16px",
                                            fontWeight: 700,
                                            color: "var(--prevent-text)",
                                        }}
                                    >
                                        {resultado.alvoLdl}
                                    </div>
                                </div>
                                <div style={styles.condutaTitle}>
                                    Esquema terapêutico
                                </div>
                                <div style={styles.condutaText}>
                                    {resultado.estatinaSugerida}
                                </div>
                                <div style={styles.condutaTitle}>
                                    Seguimento
                                </div>
                                <div style={styles.condutaText}>
                                    {resultado.seguimento}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            </>) : (<>
            {(() => {
                const toolConfig: Record<string, {
                    title: string; subtitle: string; questions: ScoreQuestion[];
                    total: number; maxScore: number; severity: string;
                    ranges: { max: number; label: string; color: string }[];
                    interpretation: (total: number) => string[];
                    update: (id: string, val: string) => void;
                    extra?: React.ReactNode;
                } | null> = {
                    ipss: {
                        title: "IPSS (International Prostate Symptom Score)",
                        subtitle: "sobre os últimos 30 dias, quantas vezes teve:",
                        questions: ipssQuestions, total: ipss.total, maxScore: ipss.maxScore,
                        severity: ipssSeverity,
                        ranges: [
                            { max: 7, label: "Leve", color: "#00b849" },
                            { max: 19, label: "Moderado", color: "#ff9900" },
                            { max: 35, label: "Grave", color: "#e62219" },
                        ],
                        interpretation: (t) => [
                            t <= 7 ? "Sintomas leves — observação clínica" : t <= 19 ? "Sintomas moderados — considerar tratamento" : "Sintomas graves — tratamento indicado",
                        ],
                        update: updateIpss,
                        extra: ipssQolIdx >= 0 ? (
                            <div style={{ marginTop: "12px", padding: "10px 12px", borderRadius: "8px", background: "rgba(120,120,120,0.06)", border: "1px solid var(--prevent-border)" }}>
                                <div style={styles.condutaTitle}>Qualidade de Vida</div>
                                <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--prevent-text)" }}>{ipssQolIdx} <span style={{ fontSize: "13px", fontWeight: 400, color: "var(--prevent-text-muted)" }}>/ 6</span></div>
                                {ipssQolIdx >= 4 && <div style={{ ...styles.condutaTitle, marginTop: "6px", color: "#e62219" }}>Paciente refere alta insatisfação</div>}
                            </div>
                        ) : undefined,
                    },
                    gad7: {
                        title: "GAD-7 (Generalized Anxiety Disorder)",
                        subtitle: "nas últimas 2 semanas, com que frequência:",
                        questions: gad7Questions, total: gad7.total, maxScore: gad7.maxScore,
                        severity: gad7Severity,
                        ranges: [
                            { max: 4, label: "Mínimo", color: "#00b849" },
                            { max: 9, label: "Leve", color: "#7cb342" },
                            { max: 14, label: "Moderado", color: "#ff9900" },
                            { max: 21, label: "Grave", color: "#e62219" },
                        ],
                        interpretation: (t) => [
                            t <= 4 ? "Ansiedade mínima — monitoramento" : t <= 9 ? "Ansiedade leve — considerar avaliação" : t <= 14 ? "Ansiedade moderada — tratamento indicado" : "Ansiedade grave — encaminhamento psiquiátrico",
                        ],
                        update: updateGad7,
                    },
                    phq9: {
                        title: "PHQ-9 (Patient Health Questionnaire)",
                        subtitle: "nas últimas 2 semanas, com que frequência:",
                        questions: phq9Questions, total: phq9.total, maxScore: phq9.maxScore,
                        severity: phq9Severity,
                        ranges: [
                            { max: 4, label: "Mínimo", color: "#00b849" },
                            { max: 9, label: "Leve", color: "#7cb342" },
                            { max: 14, label: "Moderado", color: "#ff9900" },
                            { max: 19, label: "Mod.-grave", color: "#f57c00" },
                            { max: 27, label: "Grave", color: "#e62219" },
                        ],
                        interpretation: (t) => {
                            const lines = [
                                t <= 4 ? "Depressão mínima" : t <= 9 ? "Depressão leve" : t <= 14 ? "Depressão moderada" : t <= 19 ? "Depressão moderadamente grave" : "Depressão grave",
                            ]
                            if (phq9Questions.find(q => q.id === "phq9_morte" && q.options.indexOf(q.value) >= 1)) {
                                lines.push("Atenção: avaliar risco suicida (item 9)")
                            }
                            return lines
                        },
                        update: updatePhq9,
                    },
                }
                const cfg = toolConfig[activeTab]
                if (!cfg) return null
                const currentRange = cfg.ranges.find(r => cfg.total <= r.max) || cfg.ranges[cfg.ranges.length - 1]
                const pct = cfg.maxScore > 0 ? (cfg.total / cfg.maxScore) * 100 : 0
                return (<>
                    <div style={styles.title}>{cfg.title}</div>
                    <div style={styles.subtitle}>{cfg.subtitle}</div>
                    <div className="prevent-root">
                        <div className="prevent-fields-grid">
                            {cfg.questions.map(q => {
                                const idx = q.value !== "" ? q.options.indexOf(q.value) : -1
                                const hue = idx >= 0 ? Math.round(120 - (idx / (q.options.length - 1)) * 120) : 0
                                const accent = idx >= 0 ? `hsl(${hue}, 70%, 42%)` : "var(--prevent-text-muted)"
                                return (
                                    <React.Fragment key={q.id}>
                                        {q.section === "qualidade_de_vida" && cfg.questions.indexOf(q) === cfg.questions.findIndex(x => x.section === "qualidade_de_vida") && (
                                            <div style={styles.sectionLabel}>Qualidade de Vida</div>
                                        )}
                                        <div className="ipss-slider-row">
                                            <label className="ipss-slider-label">{q.label}</label>
                                            <input
                                                type="range"
                                                className="ipss-range"
                                                min={0}
                                                max={q.options.length - 1}
                                                step={1}
                                                value={idx >= 0 ? idx : 0}
                                                onChange={e => {
                                                    const newIdx = parseInt(e.target.value)
                                                    cfg.update(q.id, q.value === q.options[newIdx] ? "" : q.options[newIdx])
                                                }}
                                                style={{
                                                    ["--ipss-accent" as string]: accent,
                                                    background: idx >= 0
                                                        ? `linear-gradient(to right, ${accent} 0%, ${accent} ${(idx / (q.options.length - 1)) * 100}%, var(--prevent-border) ${(idx / (q.options.length - 1)) * 100}%, var(--prevent-border) 100%)`
                                                        : `var(--prevent-border)`,
                                                }}
                                            />
                                            <div className="ipss-slider-value" style={{ color: accent }}>
                                                {idx >= 0 ? q.options[idx] : "—"}
                                            </div>
                                        </div>
                                    </React.Fragment>
                                )
                            })}
                        </div>
                        <div>
                            <div
                                className="prevent-result-card"
                                style={{
                                    background: `${currentRange.color}14`,
                                    border: `1px solid ${currentRange.color}73`,
                                }}
                            >
                                <span className="prevent-badge-risco" style={{ background: "rgba(255,255,255,0.6)", color: currentRange.color, border: `1px solid ${currentRange.color}73` }}>
                                    {currentRange.label}
                                </span>
                                <div style={styles.label}>Pontuação</div>
                                <div style={styles.scoreValue}>{cfg.total}<span style={{ fontSize: "16px", fontWeight: 400, color: "var(--prevent-text-muted)" }}> / {cfg.maxScore}</span></div>
                                <div style={{ marginTop: "8px", borderRadius: "6px", overflow: "hidden", height: "6px", background: "var(--prevent-border)" }}>
                                    <div style={{ height: "100%", width: `${pct}%`, background: currentRange.color, transition: "width 0.3s ease, background 0.3s ease" }} />
                                </div>
                                <div className="conduta-box">
                                    <div style={styles.ldlAlvoBox}>
                                        <div style={{ ...styles.condutaTitle, color: currentRange.color }}>Interpretação</div>
                                        {cfg.interpretation(cfg.total).map((line, i) => (
                                            <div key={i} style={{ fontSize: "14px", fontWeight: i === 0 ? 600 : 400, color: "var(--prevent-text)", marginTop: i > 0 ? "4px" : 0 }}>{line}</div>
                                        ))}
                                    </div>
                                    {cfg.extra}
                                </div>
                            </div>
                        </div>
                    </div>
                </>)
            })()}
            </>)}
        </div>
    )
})

export default CalculadoraPREVENT
