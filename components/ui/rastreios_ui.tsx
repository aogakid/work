import * as React from "react"
import { useState, useEffect, useRef } from "react"

// --- INJEÇÃO DE CSS AVANÇADO (FOCO CIRÚRGICO, EXPANSAO NO HOVER E RESPONSIVIDADE EM 3 NÍVEIS) ---
const injectStyles = `
  :root {
    --rastreio-bg: #ffffff;
    --rastreio-text: #1a1916;
    --rastreio-text-muted: #6b6760;
    --rastreio-input-bg: rgba(0,0,0,0.03);
    --rastreio-border: #e2ddd6;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --rastreio-bg: #1c1917;
      --rastreio-text: #f5f5f4;
      --rastreio-text-muted: #78716c;
      --rastreio-input-bg: rgba(255,255,255,0.03);
      --rastreio-border: #2e2a24;
    }
  }

  /* Checkbox styling for both light and dark modes */
  input[type="checkbox"] {
    appearance: none;
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border: 2px solid var(--rastreio-border);
    border-radius: 5px;
    background: var(--rastreio-input-bg);
    cursor: pointer;
    position: relative;
    transition: all 0.2s ease;
  }

  input[type="checkbox"]:hover {
    border-color: var(--rastreio-text);
  }

  input[type="checkbox"]:checked {
    background: var(--rastreio-text);
    border-color: var(--rastreio-text);
  }

  input[type="checkbox"]:checked::after {
    content: "✓";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--rastreio-bg);
    font-size: 12px;
    font-weight: bold;
  }

  /* Celulares e telas pequenas: 1 coluna por padrão */
  .rastreios-grid-container {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    align-items: start;
  }
  .rastreios-card-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    width: 100%;
  }
  
  /* Estado inicial padrão e limpo de todos os cards */
  .rastreios-card-individual {
    opacity: 1;
    cursor: pointer;
    transition: transform 0.15s ease-out, background 0.25s ease, border 0.25s ease, padding 0.2s ease, opacity 0.25s ease !important;
  }

  /* Só reduz a opacidade se houver um card REALMENTE em hover. O gap é ignorado. */
  .rastreios-grid-container:has(.rastreios-card-individual:hover) .rastreios-card-individual {
    opacity: 0.4;
  }
  
  /* Mantém o card ativo sob o ponteiro com opacidade total */
  .rastreios-grid-container .rastreios-card-individual:hover {
    opacity: 1 !important;
  }

  /* Quando o card recebe HOVER, expande dinamicamente a área de conteúdo interno */
  .rastreios-card-individual:hover .rastreios-conteudo-dinamico {
    max-height: 300px !important;
    opacity: 1 !important;
    margin-top: 14px !important;
  }

  /* Telas Médias (Tablets, etc): 2 colunas */
  @media (min-width: 768px) {
    .rastreios-grid-container {
      grid-template-columns: repeat(2, 1fr);
    }
    .rastreios-card-header {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }

  /* NOVO BREAKPOINT - Telas Grandes (Monitores, etc): 3 colunas */
  @media (min-width: 1024px) {
    .rastreios-grid-container {
      grid-template-columns: repeat(3, 1fr);
    }
  }
`

// --- MAPEAMENTO DE ESTILOS ADAPTÁVEIS ---
const styles = {
    container: {
        background: "var(--rastreio-bg)",
        color: "var(--rastreio-text)",
        fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        padding: "24px",
        borderRadius: "16px",
        width: "100%",
        boxSizing: "border-box" as const,
    } as React.CSSProperties,
    topGrid: {
        display: "flex",
        gap: "24px",
        marginBottom: "24px",
        flexWrap: "wrap" as const,
        alignItems: "center",
    } as React.CSSProperties,
    inputsBlock: {
        display: "flex",
        gap: "12px",
        flexShrink: 0,
    } as React.CSSProperties,
    riskBlock: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "6px",
        flex: "1 1 300px",
    } as React.CSSProperties,
    inputGroup: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "6px",
    } as React.CSSProperties,
    label: {
        fontSize: "11px",
        textTransform: "uppercase" as const,
        letterSpacing: "0.08em",
        color: "var(--rastreio-text-muted)",
        fontWeight: 600,
    } as React.CSSProperties,
    input: {
        background: "var(--rastreio-input-bg)",
        border: "1px solid var(--rastreio-border)",
        borderRadius: "10px",
        padding: "10px 14px",
        color: "var(--rastreio-text)",
        fontSize: "14px",
        outline: "none",
        height: "42px",
        width: "90px",
        boxSizing: "border-box" as const,
    } as React.CSSProperties,
    select: {
        background: "var(--rastreio-input-bg)",
        border: "1px solid var(--rastreio-border)",
        borderRadius: "10px",
        padding: "10px 14px",
        color: "var(--rastreio-text)",
        fontSize: "14px",
        outline: "none",
        cursor: "pointer",
        height: "42px",
        width: "130px",
        boxSizing: "border-box" as const,
    } as React.CSSProperties,
    chipsGrid: {
        display: "flex",
        flexWrap: "wrap" as const,
        gap: "8px",
    } as React.CSSProperties,
    chip: (active: boolean) =>
        ({
            padding: "8px 16px",
            borderRadius: "20px",
            fontSize: "13px",
            cursor: "pointer",
            userSelect: "none" as const,
            background: active
                ? "rgba(224, 36, 36, 0.15)"
                : "var(--rastreio-input-bg)",
            border: `1px solid ${active ? "#e02424" : "var(--rastreio-border)"}`,
            color: active ? "#e02424" : "var(--rastreio-text-muted)",
            fontWeight: active ? 600 : 400,
            transition: "all 0.15s ease",
        }) as React.CSSProperties,
    metaInfo: {
        borderBottom: "1px solid var(--rastreio-border)",
        paddingBottom: "12px",
        marginBottom: "16px",
    } as React.CSSProperties,
    sectionHeader: {
        fontSize: "11px",
        textTransform: "uppercase" as const,
        letterSpacing: "0.1em",
        color: "var(--rastreio-text-muted)",
        fontWeight: 600,
        margin: "28px 0 14px 0",
    } as React.CSSProperties,
    leftHeader: {
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        flex: 1,
    } as React.CSSProperties,
    checkbox: {
        width: "18px",
        height: "18px",
        borderRadius: "5px",
        cursor: "pointer",
        accentColor: "var(--rastreio-text)",
        flexShrink: 0,
        marginTop: "2px",
    } as React.CSSProperties,
    badge: (cat: string) => {
        const colors: Record<string, { bg: string; t: string }> = {
            Cardiovascular: { bg: "rgba(0, 119, 255, 0.18)", t: "#0066ff" },
            Oncologia: { bg: "rgba(235, 12, 116, 0.15)", t: "#eb0c74" },
            "Saúde mental": { bg: "rgba(110, 44, 242, 0.15)", t: "#6e2cf2" },
            Infectologia: { bg: "rgba(242, 143, 0, 0.18)", t: "#d47200" },
            Neurológico: { bg: "rgba(0, 168, 150, 0.15)", t: "#008a7b" },
            Rotina: { bg: "rgba(0, 184, 73, 0.15)", t: "#00a340" },
            Endócrino: { bg: "rgba(245, 49, 39, 0.15)", t: "#e01b10" },
        }
        const set = colors[cat] || { bg: "rgba(0,0,0,0.05)", t: "inherit" }
        return {
            fontSize: "10.5px",
            fontWeight: 700,
            textTransform: "uppercase" as const,
            padding: "4px 10px",
            borderRadius: "6px",
            background: set.bg,
            color: set.t,
            letterSpacing: "0.04em",
            whiteSpace: "nowrap" as const,
        } as React.CSSProperties
    },
    cardTitle: (ticked: boolean) =>
        ({
            fontSize: "15px",
            fontWeight: 600,
            color: "var(--rastreio-text)",
            textAlign: "left" as const,
            textDecoration: ticked ? "line-through" : "none",
            opacity: ticked ? 0.5 : 1,
            transition: "all 0.2s ease",
        }) as React.CSSProperties,
    // Estado inicial padrão (Oculto). Ele só abre via CSS se hover for true e ticked for false.
    contentArea: (ticked: boolean) =>
        ({
            maxHeight: "0px",
            overflow: "hidden",
            opacity: 0,
            marginTop: "0px",
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            // Se estiver ticked (marcado como feito), força o fechamento absoluto mesmo sob hover
            ...(ticked && {
                maxHeight: "0px !important",
                opacity: "0 !important",
                marginTop: "0px !important",
            }),
        }) as React.CSSProperties,
    linhaMetodo: {
        fontSize: "13px",
        fontWeight: 500,
        color: "var(--rastreio-text)",
        marginBottom: "4.5px",
    } as React.CSSProperties,
    linhaObservacao: {
        fontSize: "12.5px",
        color: "var(--rastreio-text-muted)",
        lineHeight: "1.4",
    } as React.CSSProperties,
    empty: {
        color: "var(--rastreio-text-muted)",
        fontSize: "14px",
        textAlign: "center" as const,
        padding: "40px 0",
    } as React.CSSProperties,
}

// --- CONFIGURAÇÃO DE CORES VIBRANTES POR CATEGORIA ---
const CORES_CATEGORIAS: Record<
    string,
    { bg: string; border: string; bgVivo: string; borderVivo: string }
> = {
    Cardiovascular: {
        bg: "rgba(0, 119, 255, 0.06)",
        border: "rgba(0, 119, 255, 0.25)",
        bgVivo: "rgba(0, 119, 255, 0.16)",
        borderVivo: "rgba(0, 119, 255, 0.7)",
    },
    Oncologia: {
        bg: "rgba(235, 12, 116, 0.05)",
        border: "rgba(235, 12, 116, 0.25)",
        bgVivo: "rgba(235, 12, 116, 0.14)",
        borderVivo: "rgba(235, 12, 116, 0.7)",
    },
    "Saúde mental": {
        bg: "rgba(110, 44, 242, 0.05)",
        border: "rgba(110, 44, 242, 0.25)",
        bgVivo: "rgba(110, 44, 242, 0.14)",
        borderVivo: "rgba(110, 44, 242, 0.7)",
    },
    Infectologia: {
        bg: "rgba(242, 143, 0, 0.06)",
        border: "rgba(242, 143, 0, 0.25)",
        bgVivo: "rgba(242, 143, 0, 0.16)",
        borderVivo: "rgba(242, 143, 0, 0.7)",
    },
    Neurológico: {
        bg: "rgba(0, 168, 150, 0.05)",
        border: "rgba(0, 168, 150, 0.25)",
        bgVivo: "rgba(0, 168, 150, 0.14)",
        borderVivo: "rgba(0, 168, 150, 0.7)",
    },
    Rotina: {
        bg: "rgba(0, 184, 73, 0.05)",
        border: "rgba(0, 184, 73, 0.25)",
        bgVivo: "rgba(0, 184, 73, 0.14)",
        borderVivo: "rgba(0, 184, 73, 0.7)",
    },
    Endócrino: {
        bg: "rgba(245, 49, 39, 0.05)",
        border: "rgba(245, 49, 39, 0.25)",
        bgVivo: "rgba(245, 49, 39, 0.14)",
        borderVivo: "rgba(245, 49, 39, 0.7)",
    },
}

function CardAnimado({ r, ticked, onToggle }) {
    const cardRef = useRef<HTMLDivElement>(null)
    const [transformStyle, setTransformStyle] = useState<string>(
        "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)"
    )

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current || ticked) return
        const card = cardRef.current
        const rect = card.getBoundingClientRect()

        const x = (e.clientX - rect.left) / rect.width - 0.5
        const y = (e.clientY - rect.top) / rect.height - 0.5

        const rotX = (-y * 8).toFixed(2)
        const rotY = (x * 8).toFixed(2)

        setTransformStyle(
            `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`
        )
    }

    const handleMouseLeave = () => {
        setTransformStyle(
            "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)"
        )
    }

    const cores = CORES_CATEGORIAS[r.cat] || {
        bg: "rgba(0,0,0,0.01)",
        border: "var(--rastreio-border)",
        bgVivo: "rgba(0,0,0,0.03)",
        borderVivo: "var(--rastreio-text)",
    }

    const cardStyle: React.CSSProperties = {
        background: ticked ? cores.bgVivo : cores.bg,
        border: `1px solid ${ticked ? cores.borderVivo : cores.border}`,
        borderRadius: "12px",
        padding: ticked ? "12px 16px" : "18px",
        transform: transformStyle,
        transformStyle: "preserve-3d",
        willChange: "transform, opacity",
        contain: "content",
    }

    return (
        <div
            ref={cardRef}
            style={cardStyle}
            className="rastreios-card-individual"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <div className="rastreios-card-header">
                <div style={styles.leftHeader}>
                    <input
                        type="checkbox"
                        checked={ticked}
                        onChange={onToggle}
                        style={styles.checkbox}
                    />
                    <span style={styles.cardTitle(ticked)}>{r.titulo}</span>
                </div>
                <span style={styles.badge(r.cat)}>{r.cat}</span>
            </div>

            <div
                className="rastreios-conteudo-dinamico"
                style={styles.contentArea(ticked)}
            >
                <div style={styles.linhaMetodo}>{r.metodo}</div>
                {r.obs && <div style={styles.linhaObservacao}>{r.obs}</div>}
            </div>
        </div>
    )
}

// --- BASE DE DADOS DOS RASTREIOS ---
const rData = [
    {
        id: "has",
        titulo: "Hipertensão arterial",
        cat: "Cardiovascular",
        condicao: (i, s, f) => i >= 18,
        metodo: "Aferição de PA a cada 1–2 anos se PA normal; anual se limítrofe (130–139/85–89 mmHg).",
    },
    {
        id: "dm2",
        titulo: "Diabetes mellitus tipo 2",
        cat: "Cardiovascular",
        condicao: (i, s, f) => i >= 35 || (i >= 18 && f.dm),
        metodo: "Glicemia de jejum ou HbA1c a cada 3 anos.",
    },
    {
        id: "dislip",
        titulo: "Dislipidemia",
        cat: "Cardiovascular",
        condicao: (i, s, f) =>
            (s === "M" && i >= 35) ||
            (s === "F" && i >= 45) ||
            (i >= 20 && (f.dm || f.tabagista)),
        metodo: "Perfil lipídico a cada 5 anos.",
    },
    {
        id: "obesidade",
        titulo: "Obesidade",
        cat: "Rotina",
        condicao: (i, s, f) => i >= 18,
        metodo: "Aferição de peso, altura e IMC em toda consulta.",
        obs: "Circunferência abdominal se IMC ≥25. Intervenção comportamental intensiva se IMC ≥30.",
    },
    {
        id: "mama",
        titulo: "Câncer de mama",
        cat: "Oncologia",
        condicao: (i, s, f) => s === "F" && i >= 40 && i <= 74,
        metodo: "Mamografia bienal 40–74 anos.",
    },
    {
        id: "utero",
        titulo: "Câncer do colo do útero",
        cat: "Oncologia",
        condicao: (i, s, f) => s === "F" && i >= 25 && i <= 64,
        metodo: "Novo: DNA-HPV a cada 5 anos. Antigo: colpocitologia a cada 3 anos.",
    },
    {
        id: "colorretal",
        titulo: "Câncer colorretal",
        cat: "Oncologia",
        condicao: (i, s, f) => i >= 45 && i <= 75,
        metodo: "PSOF anual ou colonoscopia a cada 10 anos.",
    },
    {
        id: "pulmao",
        titulo: "Câncer de pulmão",
        cat: "Oncologia",
        condicao: (i, s, f) => i >= 50 && i <= 80 && f.tabagista,
        metodo: "TC de tórax de baixa dose anualmente.",
        obs: "Critérios: tabagista ativo ou que cessou há < 15 anos com ≥20 maços-ano.",
    },
    {
        id: "prostata",
        titulo: "Câncer de próstata",
        cat: "Oncologia",
        condicao: (i, s, f) => s === "M" && i >= 50 && i <= 70,
        metodo: "PSA.",
        obs: "Decisão compartilhada. Antecipar 40–45 anos se afrodescendente ou hist. familiar 1º grau.",
    },
    {
        id: "tsh",
        titulo: "Hipotireoidismo",
        cat: "Endócrino",
        condicao: (i, s, f) => (s === "F" && i >= 60) || i >= 60 || f.gestante,
        metodo: "TSH 1 vez na vida.",
    },
    {
        id: "mental",
        titulo: "Depressão",
        cat: "Saúde mental",
        condicao: (i, s, f) => i >= 18,
        metodo: "PHQ-2 como triagem inicial em toda consulta. Se ≥3, fazer PHQ-9",
    },
    {
        id: "ansiedade",
        titulo: "Ansiedade",
        cat: "Saúde mental",
        condicao: (i, s, f) => i >= 18,
        metodo: "GAD-2 como triagem inicial em toda consulta. Se ≥3, fazer GAD-7.",
    },
    {
        id: "epds",
        titulo: "Depressão perinatal",
        cat: "Saúde mental",
        condicao: (i, s, f) =>
            s === "F" && ((i >= 15 && i <= 45) || f.gestante),
        metodo: "EPDS no pré-natal (1º e 3º trimestres) e até 6 semanas pós-parto.",
        obs: "Ponto de corte ≥12 indica avaliação adicional.",
    },
    {
        id: "alcool",
        titulo: "Abuso de álcool",
        cat: "Saúde mental",
        condicao: (i, s, f) => i >= 18,
        metodo: "AUDIT-C em toda consulta.",
        obs: "Pontuação ≥4 (homens) ou ≥3 (mulheres) → AUDIT completo.",
    },
    {
        id: "tabaco",
        titulo: "Tabagismo",
        cat: "Rotina",
        condicao: (i, s, f) => i >= 18,
        metodo: "5 A's em toda consulta -> Fagerström.",
    },
    {
        id: "violencia",
        titulo: "Violência doméstica",
        cat: "Saúde mental",
        condicao: (i, s, f) => s === "F" && i >= 14,
        metodo: "HITS ou pergunta direta em toda consulta",
    },
    {
        id: "hiv",
        titulo: "Infecção por HIV",
        cat: "Infectologia",
        condicao: (i, s, f) => i >= 15 && i <= 65,
        metodo: "Anti-HIV ao menos 1x na vida.",
        obs: "Anual em populações de risco. Gestantes: em toda gestação.",
    },
    {
        id: "sifilis",
        titulo: "Sífilis",
        cat: "Infectologia",
        condicao: (i, s, f) => i >= 15,
        metodo: "VDRL ao menos 1x/ano em populações de risco.",
        obs: "Gestantes: triagem no 1º trimestre, 3º trimestre e no parto.",
    },
    {
        id: "hepatite",
        titulo: "Hepatites B e C",
        cat: "Infectologia",
        condicao: (i, s, f) => i >= 18,
        metodo: "Anti-HCV ao menos 1x na vida e HBsAg em populações de risco.",
        obs: "Gestantes: HBsAg no 1º trimestre.",
    },
    {
        id: "tb",
        titulo: "Tuberculose",
        cat: "Infectologia",
        condicao: (i, s, f) => i >= 15 && f.hiv,
        metodo: "PPD/IGRA anualmente",
        obs: "Rastreio ativo em vulneráveis e contactantes.",
    },
    {
        id: "osteo",
        titulo: "Osteoporose",
        cat: "Rotina",
        condicao: (i, s, f) =>
            (s === "F" && i >= 65) ||
            (s === "F" && i >= 50 && i <= 64) ||
            (s === "M" && i >= 70),
        metodo: "Densitometria óssea a cada 3 anos se normal ou a cada 1-2 anos se osteopenia/osteoporose.",
    },
    {
        id: "cognitivo",
        titulo: "Déficit cognitivo / demência",
        cat: "Neurológico",
        condicao: (i, s, f) => i >= 65,
        metodo: "Mini-Cog ou MEEM toda consulta.",
    },
    {
        id: "visual",
        titulo: "Déficit visual",
        cat: "Neurológico",
        condicao: (i, s, f) => i >= 65 || (i >= 40 && f.dm),
        metodo: "Fundoscopia anual.",
    },
    {
        id: "auditivo",
        titulo: "Déficit auditivo",
        cat: "Neurológico",
        condicao: (i, s, f) => i >= 65,
        metodo: "Pergunta de triagem auditiva (Whisper Test) toda consulta -> audiometria.",
    },
]

const ordemCategorias = [
    "Cardiovascular",
    "Oncologia",
    "Endócrino",
    "Saúde mental",
    "Infectologia",
    "Neurológico",
    "Rotina",
]

export default function RastreiosPreventivos(props) {
    const [idade, setIdade] = useState<string>("")
    const [sexo, setSexo] = useState<string>("")
    const [tabagista, setTabagista] = useState<boolean>(false)
    const [dm, setDm] = useState<boolean>(false)
    const [hiv, setHiv] = useState<boolean>(false)
    const [gestante, setGestante] = useState<boolean>(false)

    const [indicados, setIndicados] = useState<any[]>([])
    const [feitos, setFeitos] = useState<Record<string, boolean>>({})

    useEffect(() => {
        const i = parseInt(idade)
        if (!i || !sexo) {
            setIndicados([])
            return
        }

        const fatores = { tabagista, dm, hiv, gestante }
        const filtrados = rData.filter((r) => r.condicao(i, sexo, fatores))
        setIndicados(filtrados)
    }, [idade, sexo, tabagista, dm, hiv, gestante])

    const toggleFeito = (id: string) => {
        setFeitos((prev) => ({ ...prev, [id]: !prev[id] }))
    }

    const grupos: Record<string, any[]> = {}
    indicados.forEach((r) => {
        if (!grupos[r.cat]) grupos[r.cat] = []
        grupos[r.cat].push(r)
    })

    return (
        <div style={styles.container}>
            <style dangerouslySetInnerHTML={{ __html: injectStyles }} />

            <div style={styles.topGrid}>
                <div style={styles.inputsBlock}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Idade</label>
                        <input
                            type="number"
                            placeholder="Ex: 52"
                            value={idade}
                            onChange={(e) => setIdade(e.target.value)}
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Sexo Biológico</label>
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
                </div>

                <div style={styles.riskBlock}>
                    <label style={styles.label}>Fatores de Risco</label>
                    <div style={styles.chipsGrid}>
                        <div
                            style={styles.chip(tabagista)}
                            onClick={() => setTabagista(!tabagista)}
                        >
                            Tabagista ativo
                        </div>
                        <div style={styles.chip(dm)} onClick={() => setDm(!dm)}>
                            Diabetes
                        </div>
                        <div
                            style={styles.chip(hiv)}
                            onClick={() => setHiv(!hiv)}
                        >
                            PVHIV
                        </div>
                        {sexo === "F" && (
                            <div
                                style={styles.chip(gestante)}
                                onClick={() => setGestante(!gestante)}
                            >
                                Gestante / Puérpera
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div style={styles.metaInfo}>
                <span
                    style={{
                        fontSize: "13px",
                        color: "var(--rastreio-text-muted)",
                        fontWeight: 500,
                    }}
                >
                    {!idade || !sexo
                        ? "Aguardando dados de entrada..."
                        : `${indicados.length} rastreio${indicados.length !== 1 ? "s" : ""} indicado${indicados.length !== 1 ? "s" : ""}`}
                </span>
            </div>

            <div>
                {!idade || !sexo ? (
                    <div style={styles.empty}>
                        Insira a idade e selecione o sexo biológico para
                        calcular os rastreios automaticamente.
                    </div>
                ) : indicados.length === 0 ? (
                    <div style={styles.empty}>
                        Nenhum rastreio indicado para este perfil.
                    </div>
                ) : (
                    ordemCategorias.map((cat) => {
                        if (!grupos[cat]) return null
                        return (
                            <div key={cat}>
                                <div style={styles.sectionHeader}>{cat}</div>
                                <div className="rastreios-grid-container">
                                    {grupos[cat].map((r) => (
                                        <CardAnimado
                                            key={r.id}
                                            r={r}
                                            ticked={!!feitos[r.id]}
                                            onToggle={() => toggleFeito(r.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
