import * as React from "react"
import { useState, useEffect } from "react"

const injectStyles = `
  :root {
    --visita-bg: #ffffff;
    --visita-text: #1a1916;
    --visita-text-muted: #6b6760;
    --visita-input-bg: rgba(120,120,120,0.08);
    --visita-border: rgba(120,120,120,0.15);
    --visita-card-bg: rgba(120,120,120,0.06);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --visita-bg: #1c1917;
      --visita-text: #f5f5f4;
      --visita-text-muted: #78716c;
      --visita-input-bg: rgba(255,255,255,0.08);
      --visita-border: rgba(255,255,255,0.15);
      --visita-card-bg: rgba(255,255,255,0.06);
    }
  }

  .visita-root {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    align-items: start;
  }
  
  @media (min-width: 900px) {
    .visita-root {
      grid-template-columns: 1.2fr 1fr;
    }
  }

  .visita-fields-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    width: 100%;
  }

  .visita-result-card {
    border-radius: 12px;
    padding: 20px;
    box-sizing: border-box;
    transition: background 0.3s ease, border 0.3s ease;
  }

  .visita-badge-risco {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 6px;
    letter-spacing: 0.04em;
    margin-bottom: 12px;
  }

  .visita-chips-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    grid-column: 1 / -1;
  }

  .pps-calc-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    grid-column: 1 / -1;
    background: rgba(120, 120, 120, 0.04);
    padding: 14px;
    border-radius: 12px;
    border: 1px dashed var(--visita-border);
  }

  @media (min-width: 600px) {
    .pps-calc-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
`

const styles = {
    container: {
        background: "var(--visita-bg)",
        color: "var(--visita-text)",
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
        color: "var(--visita-text)",
    },
    subtitle: {
        fontSize: "13px",
        color: "var(--visita-text-muted)",
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
        color: "var(--visita-text-muted)",
        fontWeight: 600,
        whiteSpace: "nowrap" as const,
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    sectionLabel: {
        fontSize: "10px",
        textTransform: "uppercase" as const,
        letterSpacing: "0.07em",
        color: "var(--visita-text-muted)",
        fontWeight: 700,
        gridColumn: "1 / -1",
        marginTop: "12px",
        paddingBottom: "4px",
        borderBottom: "1px solid var(--visita-border)",
    },
    select: (severityBg?: string, severityBorder?: string) => ({
        background: severityBg || "var(--visita-input-bg)",
        border: `1px solid ${severityBorder || "var(--visita-border)"}`,
        borderRadius: "10px",
        padding: "10px 14px",
        color: "var(--visita-text)",
        fontSize: "14px",
        outline: "none",
        cursor: "pointer",
        height: "42px",
        boxSizing: "border-box" as const,
        width: "100%",
        transition: "all 0.2s ease",
    }),
    input: (severityBg?: string, severityBorder?: string) => ({
        background: severityBg || "var(--visita-input-bg)",
        border: `1px solid ${severityBorder || "var(--visita-border)"}`,
        borderRadius: "10px",
        padding: "10px 14px",
        color: "var(--visita-text)",
        fontSize: "14px",
        outline: "none",
        height: "42px",
        boxSizing: "border-box" as const,
        width: "100%",
        transition: "all 0.2s ease",
    }),
    chip: (active: boolean, activeColor = "#e02424", activeBg = "rgba(224, 36, 36, 0.15)") => ({
        padding: "8px 16px",
        borderRadius: "20px",
        fontSize: "13px",
        cursor: "pointer",
        userSelect: "none" as const,
        background: active ? activeBg : "var(--visita-input-bg)",
        border: `1px solid ${active ? activeColor : "var(--visita-border)"}`,
        color: active ? activeColor : "var(--visita-text-muted)",
        fontWeight: active ? 600 : 400,
        transition: "all 0.15s ease",
    }),
    recommendationTitle: {
        fontSize: "12px",
        textTransform: "uppercase" as const,
        fontWeight: 700,
        color: "var(--visita-text-muted)",
        marginBottom: "6px",
        letterSpacing: "0.05em",
    },
    scoreValue: {
        fontSize: "32px",
        fontWeight: 800,
        color: "var(--visita-text)",
        margin: "4px 0 16px 0",
        display: "flex",
        flexDirection: "column" as const,
        gap: "4px",
    },
    scoreLabel: {
        fontSize: "11px",
        textTransform: "uppercase" as const,
        fontWeight: 700,
        color: "var(--visita-text-muted)",
        letterSpacing: "0.05em",
    },
    intervalHighlight: {
        fontSize: "24px",
        fontWeight: 800,
        color: "var(--visita-text)",
        padding: "16px",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.12)",
        textAlign: "center" as const,
        marginBottom: "16px",
    },
    ppsChipResult: (pps: number | null) => {
        let bg = "var(--visita-input-bg)"
        let border = "var(--visita-border)"
        let color = "var(--visita-text-muted)"
        
        if (pps !== null) {
            if (pps >= 80) { bg = "rgba(0, 184, 73, 0.12)"; border = "#00cc52"; color = "#00cc52" }
            else if (pps >= 50) { bg = "rgba(242, 143, 0, 0.12)"; border = "#ff9900"; color = "#ff9900" }
            else if (pps >= 30) { bg = "rgba(242, 100, 0, 0.12)"; border = "#ff5d00"; color = "#ff5d00" }
            else { bg = "rgba(245, 49, 39, 0.12)"; border = "#e62219"; color = "#e62219" }
        }
        return {
            padding: "10px 16px",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: 700,
            background: bg,
            border: `1px solid ${border}`,
            color: color,
            textAlign: "center" as const,
            marginTop: "6px",
            transition: "all 0.2s ease"
        }
    }
}

const CONFIG_RISCOS: Record<string, { bg: string; t: string; border: string }> = {
    "Muito Alto": {
        bg: "rgba(245, 49, 39, 0.12)",
        t: "#e62219",
        border: "rgba(245, 49, 39, 0.45)",
    },
    Alto: {
        bg: "rgba(242, 100, 0, 0.1)",
        t: "#ff5d00",
        border: "rgba(242, 100, 0, 0.45)",
    },
    Médio: {
        bg: "rgba(242, 143, 0, 0.09)",
        t: "#ff9900",
        border: "rgba(242, 143, 0, 0.45)",
    },
    Baixo: {
        bg: "rgba(0, 184, 73, 0.09)",
        t: "#00cc52",
        border: "rgba(0, 184, 73, 0.45)",
    },
}

const TONALIZACAO = {
    verde:  { bg: "rgba(0, 184, 73, 0.08)", border: "rgba(0, 184, 73, 0.35)" },
    amarelo:{ bg: "rgba(242, 143, 0, 0.08)", border: "rgba(242, 143, 0, 0.35)" },
    laranja:{ bg: "rgba(242, 100, 0, 0.09)", border: "rgba(242, 100, 0, 0.35)" },
    vermelho:{ bg: "rgba(245, 49, 39, 0.09)", border: "rgba(245, 49, 39, 0.35)" },
    default: { bg: "var(--visita-input-bg)", border: "var(--visita-border)" }
}

interface Props {
    style?: React.CSSProperties
}

export default function CalculadoraVisita({ style }: Props) {
    const [idade, setIdade] = useState<string>("")
    const [multimorbidade5, setMultimorbidade5] = useState(false)
    const [descompensacao, setDescompensacao] = useState(false)
    const [polifarmacia, setPolifarmacia] = useState(false)
    const [funcionalidade, setFuncionalidade] = useState<string>("")
    const [mobilidade, setMobilidade] = useState<string>("")
    const [disfuncaoFamiliar, setDisfuncaoFamiliar] = useState(false)
    const [sobrecargaCuidador, setSobrecargaCuidador] = useState(false)
    const [fragilidade, setFragilidade] = useState<string[]>([])
    
    // Estados da Calculadora de PPS
    const [ppsAmb, setPpsAmb] = useState<string>("")
    const [ppsAct, setPpsAct] = useState<string>("")
    const [ppsSelf, setPpsSelf] = useState<string>("")
    const [ppsIng, setPpsIng] = useState<string>("")
    const [ppsCon, setPpsCon] = useState<string>("")

    const fragilidadeOptions = [
        "Síndrome demencial",
        "Depressão",
        "Doença de Parkinson",
        "Neoplasia",
        "Sarcopenia",
        "Desnutrição",
        "Disfagia",
        "Incontinência",
        "Paralisia cerebral",
    ]

    useEffect(() => {
        setFragilidade([])
    }, [])

    const toggleFragilidade = (item: string) => {
        setFragilidade((prev) =>
            prev.includes(item)
                ? prev.filter((i) => i !== item)
                : [...prev, item]
        )
    }

   const calcularPPS = (): number | null => {
    if (!ppsAmb || !ppsAct || !ppsSelf || !ppsIng || !ppsCon) return null;

    // 1. DETERMINAÇÃO DA LINHA DE BASE PELA INTERSECÇÃO DEAMBULAÇÃO + AUTOCUIDADO
    // Esta abordagem impede que o Math.min rebaixe incorretamente pacientes com boa função de tronco/membros superiores.
    let baseScore = 60;

    if (ppsAmb === "plena") {
        baseScore = 80; // Teto inicial para deambulação plena
    } else if (ppsAmb === "reduzida") {
        baseScore = 70;
    } else if (ppsAmb === "sentado_leito_50") {
        baseScore = 50;
    } else if (ppsAmb === "no_leito_40") {
        baseScore = 40;
    } else if (ppsAmb === "restrito_leito") {
        baseScore = 30;
    } else if (ppsAmb === "obito") {
        return 0;
    }

        // Ajuste fino baseado no Autocuidado (Permite elevar ou consolidar o range correto)
    if (ppsSelf === "completo" && baseScore < 70) {
        baseScore = 70; // Autocuidado preservado puxa a performance para cima[span_0](start_span)[span_0](end_span)
    } else if (ppsSelf === "ocasional" && baseScore < 60) {
        baseScore = 60;
    } else if (ppsSelf === "consideravel" && baseScore < 50) {
        baseScore = 50; // Ex: Sentado/Leito + Assistência Considerável[span_2](start_span)[span_2](end_span)
    } else if (ppsSelf === "dependente" && baseScore < 40) {
        baseScore = 40; // Troca de baseScore === 50 por baseScore < 40[span_3](start_span)[span_3](end_span)
    } else if (ppsSelf === "totais" && baseScore > 30) {
        baseScore = 30; // Troca de baseScore > 30 && baseScore < 60 por baseScore > 30[span_4](start_span)[span_4](end_span)
    }

    // 2. REFINAMENTO POR ATIVIDADE (Predominante nos níveis altos: 100% a 60%)
    if (baseScore === 80) {
        if (ppsAct === "normal_sem_doenca" && ppsSelf === "completo") baseScore = 100;
        if (ppsAct === "normal_com_evidencia" && ppsSelf === "completo") baseScore = 90;
    }
    if (baseScore === 70 && ppsAct === "incapaz_passatempos") {
        baseScore = 60; // Critério oficial de quebra do nível 70 para o 60
    }

    // Nota de Design: A partir do nível 50%, a coluna de Atividade estabiliza em 
    // "Incapaz de realizar qualquer atividade/doença extensa", perdendo relevância discriminatória.

    // 3. PROGRESSÃO FINAL DO DECLÍNIO (30% -> 20% -> 10% -> 0%)
    // Baseado rigorosamente nas colunas de Ingestão e Consciência da tabela oficial
    if (baseScore <= 30) {
        // Quem diferencia 30% de 20% é puramente a INGESTÃO (Mínima / Goles)
        if (ppsIng === "minima") {
            baseScore = 20;
        }
        
        // O nível 10% é determinado por ingestão restrita a Higiene Oral 
        // OU por Consciência rebaixada exclusiva (Sonolência/Coma sem opção de Pleno)
        if (ppsIng === "higiene_oral" || ppsCon === "sonolencia_coma_estrito") {
            baseScore = 10;
        }
    }

    if (ppsAct === "obito" || ppsSelf === "obito" || ppsIng === "obito" || ppsCon === "obito") {
        return 0;
    }

    return baseScore;
};

    const ppsCalculado = calcularPPS()

    const getIdadeStyles = () => {
        const idNum = parseInt(idade) || 0
        if (!idade) return TONALIZACAO.default
        if (idNum < 75) return TONALIZACAO.verde
        if (idNum >= 75 && idNum <= 84) return TONALIZACAO.laranja
        return TONALIZACAO.vermelho
    }

    const getPpsStyles = () => {
        if (ppsCalculado === null) return TONALIZACAO.default
        if (ppsCalculado >= 80) return TONALIZACAO.verde
        if (ppsCalculado >= 50) return TONALIZACAO.amarelo
        if (ppsCalculado >= 30) return TONALIZACAO.laranja
        return TONALIZACAO.vermelho
    }

    const getFuncionalidadeStyles = () => {
        if (!funcionalidade) return TONALIZACAO.default
        if (funcionalidade === "nenhum") return TONALIZACAO.verde
        if (funcionalidade === "instrumentais") return TONALIZACAO.laranja
        return TONALIZACAO.vermelho
    }

    const getMobilidadeStyles = () => {
        if (!mobilidade) return TONALIZACAO.default
        if (mobilidade === "nenhum") return TONALIZACAO.verde
        if (mobilidade === "dificuldade") return TONALIZACAO.amarelo
        if (mobilidade === "risco_queda") return TONALIZACAO.laranja
        return TONALIZACAO.vermelho
    }

    const calcularPontos = () => {
        let pontos = 0

        const idadeNum = parseInt(idade) || 0
        if (idadeNum >= 75 && idadeNum <= 84) pontos += 1
        else if (idadeNum >= 85) pontos += 2

        if (multimorbidade5) pontos += 2
        if (descompensacao) pontos += 5
        if (polifarmacia) pontos += 2

        if (funcionalidade === "instrumentais") pontos += 1
        else if (funcionalidade === "basicas_instrumentais") pontos += 2

        if (mobilidade === "dificuldade") pontos += 1
        else if (mobilidade === "risco_queda") pontos += 2
        else if (mobilidade === "acamado") pontos += 3

        if (disfuncaoFamiliar) pontos += 1
        if (sobrecargaCuidador) pontos += 1

        pontos += fragilidade.length * 2

        // Cálculo dinâmico do Risco baseado no PPS obtido pela calculadora integrada
        if (ppsCalculado !== null) {
            if (ppsCalculado >= 80 && ppsCalculado <= 100) pontos += 2
            else if (ppsCalculado >= 50 && ppsCalculado <= 70) pontos += 5
            else if (ppsCalculado >= 30 && ppsCalculado <= 49) pontos += 8
            else if (ppsCalculado < 30) pontos += 10
        }

        return pontos
    }

    const pontos = calcularPontos()

    const getClassificacao = () => {
        if (pontos <= 5) return { classificacao: "Baixo", intervalo: "6 meses a 1 ano" }
        if (pontos <= 10) return { classificacao: "Médio", intervalo: "4 a 6 meses" }
        if (pontos <= 14) return { classificacao: "Alto", intervalo: "2 a 3 meses" }
        return { classificacao: "Muito Alto", intervalo: "Quinzenal a mensal" }
    }

    const { classificacao, intervalo } = getClassificacao()
    const config = CONFIG_RISCOS[classificacao]
    const mostrarResultado = idade && funcionalidade && mobilidade && ppsCalculado !== null

    return (
        <div style={{ ...styles.container, ...style }}>
            <style dangerouslySetInnerHTML={{ __html: injectStyles }} />

            <div style={styles.title}>
                Escala de Risco e Vulnerabilidade para Atenção Domiciliar
            </div>
            <div style={styles.subtitle}>
                Ribeiro, Fiuza e Pinheiro, 2019
            </div>

            <div className="visita-root">
                <div className="visita-fields-grid">
                    
                    <div style={styles.sectionLabel}>Dados Gerais</div>
                    <div style={{ gridColumn: "1 / -1" }}>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Idade (anos)</label>
                            <input
                                type="number"
                                placeholder="Ex: 78"
                                value={idade}
                                onChange={(e) => setIdade(e.target.value)}
                                style={styles.input(getIdadeStyles().bg, getIdadeStyles().border)}
                            />
                        </div>
                    </div>

                    <div style={styles.sectionLabel}>Multimorbidade</div>
                    <div className="visita-chips-grid">
                        <div 
                            style={styles.chip(multimorbidade5, "#ff5d00", "rgba(242, 100, 0, 0.12)")}
                            onClick={() => setMultimorbidade5(!multimorbidade5)}
                        >
                            ≥ 5 comorbidades
                        </div>
                        <div 
                            style={styles.chip(descompensacao, "#e62219", "rgba(245, 49, 39, 0.15)")}
                            onClick={() => setDescompensacao(!descompensacao)}
                        >
                            Descompensação clínica
                        </div>
                    </div>

                    <div style={styles.sectionLabel}>Polifarmácia</div>
                    <div className="visita-chips-grid">
                        <div 
                            style={styles.chip(polifarmacia, "#ff5d00", "rgba(242, 100, 0, 0.12)")}
                            onClick={() => setPolifarmacia(!polifarmacia)}
                        >
                            ≥ 5 medicamentos em uso
                        </div>
                    </div>

                    <div style={styles.sectionLabel}>Funcionalidade e Mobilidade</div>
                    <div style={{ gridColumn: "1 / -1", display: "flex", gap: "12px" }}>
                        <div style={{ ...styles.inputGroup, flex: 1 }}>
                            <label style={styles.label}>Funcionalidade</label>
                            <select
                                value={funcionalidade}
                                onChange={(e) => setFuncionalidade(e.target.value)}
                                style={styles.select(getFuncionalidadeStyles().bg, getFuncionalidadeStyles().border)}
                            >
                                <option value="">Selecione</option>
                                <option value="nenhum">Nenhum comprometimento</option>
                                <option value="instrumentais">AVDs instrumentais</option>
                                <option value="basicas_instrumentais">AVDs básicas e instrumentais</option>
                            </select>
                        </div>
                        <div style={{ ...styles.inputGroup, flex: 1 }}>
                            <label style={styles.label}>Mobilidade</label>
                            <select
                                value={mobilidade}
                                onChange={(e) => setMobilidade(e.target.value)}
                                style={styles.select(getMobilidadeStyles().bg, getMobilidadeStyles().border)}
                            >
                                <option value="">Selecione</option>
                                <option value="nenhum">Sem comprometimento</option>
                                <option value="dificuldade">Dificuldade de marcha</option>
                                <option value="risco_queda">Risco de queda</option>
                                <option value="acamado">Acamado</option>
                            </select>
                        </div>
                    </div>

                    <div style={styles.sectionLabel}>Suporte Familiar</div>
                    <div className="visita-chips-grid">
                        <div 
                            style={styles.chip(disfuncaoFamiliar, "#ff9900", "rgba(242, 143, 0, 0.12)")}
                            onClick={() => setDisfuncaoFamiliar(!disfuncaoFamiliar)}
                        >
                            Disfunção familiar
                        </div>
                        <div 
                            style={styles.chip(sobrecargaCuidador, "#ff9900", "rgba(242, 143, 0, 0.12)")}
                            onClick={() => setSobrecargaCuidador(!sobrecargaCuidador)}
                        >
                            Sobrecarga do cuidador
                        </div>
                    </div>

                    <div style={styles.sectionLabel}>Fragilidade (cada item selecionado soma 2 pontos)</div>
                    <div style={{ gridColumn: "1 / -1" }}>
                        <div className="visita-chips-grid">
                            {fragilidadeOptions.map((option) => (
                                <div
                                    key={option}
                                    style={styles.chip(fragilidade.includes(option), "#e62219", "rgba(245, 49, 39, 0.12)")}
                                    onClick={() => toggleFragilidade(option)}
                                >
                                    {option}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SEÇÃO: CALCULADORA PPS INTEGRADA COM TONALIZAÇÃO DINÂMICA */}
<div style={styles.sectionLabel}>Calculadora de Performance Paliativa (PPSv2)</div>
<div 
    className="pps-calc-grid" 
    style={{
        background: getPpsStyles().bg,
        border: `1px dashed ${getPpsStyles().border}`,
        gridColumn: "1 / -1",
        display: "grid",
        gap: "10px",
        padding: "14px",
        borderRadius: "12px",
        transition: "all 0.3s ease"
    }}
>
    <div style={styles.inputGroup}>
        <label style={styles.label}>Deambulação</label>
        <select 
            value={ppsAmb} 
            onChange={(e) => setPpsAmb(e.target.value)} 
            style={styles.select("rgba(255,255,255,0.05)", getPpsStyles().border)}
        >
            <option value="">Selecione</option>
            <option value="plena">Plena</option>
            <option value="reduzida">Reduzida</option>
            <option value="leito_maior_parte">Sentado/Leito maior parte do tempo</option>
            <option value="restrito_leito">Totalmente restrito ao leito</option>
            <option value="obito">Óbito</option>
        </select>
    </div>

    <div style={styles.inputGroup}>
        <label style={styles.label}>Atividade e Evidência</label>
        <select 
            value={ppsAct} 
            onChange={(e) => setPpsAct(e.target.value)} 
            style={styles.select("rgba(255,255,255,0.05)", getPpsStyles().border)}
        >
            <option value="">Selecione</option>
            <option value="normal_sem_doenca">Atividade normal (Sem evidência de doença)</option>
            <option value="normal_com_evidencia">Atividade normal (Alguma evidência)</option>
            <option value="esforco_com_evidencia">Atividade normal com esforço</option>
            <option value="incapaz_trabalho_normal">Incapaz de trabalho normal (Doença significativa)</option>
            <option value="incapaz_passatempos">Incapaz de passatempos / tarefas domésticas</option>
            <option value="incapaz_qualquer_trabalho">Incapaz de realizar qualquer trabalho (Doença extensa)</option>
            <option value="incapaz_maioria_act">Incapaz de realizar a maioria das atividades</option>
            <option value="incapaz_qualquer_act">Incapaz de realizar qualquer atividade</option>
            <option value="obito">Óbito</option>
        </select>
    </div>

    <div style={styles.inputGroup}>
        <label style={styles.label}>Autocuidado</label>
        <select 
            value={ppsSelf} 
            onChange={(e) => setPpsSelf(e.target.value)} 
            style={styles.select("rgba(255,255,255,0.05)", getPpsStyles().border)}
        >
            <option value="">Selecione</option>
            <option value="completo">Completo</option>
            <option value="ocasional">Assistência ocasional necessária</option>
            <option value="consideravel">Assistência considerável necessária</option>
            <option value="dependente">Principalmente dependente de assistência</option>
            <option value="totais">Cuidados totais</option>
            <option value="obito">Óbito</option>
        </select>
    </div>

    <div style={styles.inputGroup}>
        <label style={styles.label}>Ingestão</label>
        <select 
            value={ppsIng} 
            onChange={(e) => setPpsIng(e.target.value)} 
            style={styles.select("rgba(255,255,255,0.05)", getPpsStyles().border)}
        >
            <option value="">Selecione</option>
            <option value="normal">Normal</option>
            <option value="normal_reduzida">Normal ou reduzida</option>
            <option value="minima">Mínima (apenas goles de líquidos)</option>
            <option value="higiene_oral">Apenas higiene oral</option>
            <option value="obito">Óbito</option>
        </select>
    </div>

    <div style={{ ...styles.inputGroup, gridColumn: "1 / -1" }}>
        <label style={styles.label}>Nível de Consciência</label>
        <select 
            value={ppsCon} 
            onChange={(e) => setPpsCon(e.target.value)} 
            style={styles.select("rgba(255,255,255,0.05)", getPpsStyles().border)}
        >
            <option value="">Selecione</option>
            <option value="pleno">Pleno</option>
            <option value="pleno_confusao">Pleno ou Confusão</option>
            <option value="sonolencia_confusao">Pleno / Sonolência +/- Confusão</option>
            <option value="sonolencia_coma_confusao">Sonolência ou Coma +/- Confusão</option>
            <option value="sonolencia_coma">Sonolência ou Coma</option>
            <option value="obito">Óbito</option>
        </select>
    </div>

    {/* CHIP DE RESULTADO EXCLUSIVO DO PPS */}
    <div style={{ gridColumn: "1 / -1" }}>
        <div style={styles.ppsChipResult(ppsCalculado)}>
            {ppsCalculado !== null ? `PPS Calculado: ${ppsCalculado}%` : "Aguardando dados estruturais do PPS..."}
        </div>
    </div>
</div>

                </div>

                {mostrarResultado ? (
                    <div
                        className="visita-result-card"
                        style={{
                            background: config.bg,
                            border: `1px solid ${config.border}`,
                        }}
                    >
                        <div
                            className="visita-badge-risco"
                            style={{
                                background: config.border,
                                color: config.t,
                            }}
                        >
                            {classificacao} Risco
                        </div>

                        <div style={styles.recommendationTitle}>
                            Tempo médio para planejamento das próximas visitas
                        </div>

                        <div style={styles.intervalHighlight}>
                            {intervalo}
                        </div>

                        <div style={styles.scoreValue}>
                            <span style={styles.scoreLabel}>Pontuação Total</span>
                            {pontos}
                            <span style={{ fontSize: "14px", fontWeight: 400, color: "var(--visita-text-muted)" }}>
                                / 40
                            </span>
                        </div>
                    </div>
                ) : (
                    <div
                        className="visita-result-card"
                        style={{
                            background: "var(--visita-card-bg)",
                            border: "1px solid var(--visita-border)",
                        }}
                    >
                        <div style={{
                            fontSize: "13px",
                            color: "var(--visita-text-muted)",
                            textAlign: "center" as const,
                            padding: "20px 0",
                        }}>
                            Preencha idade, funcionalidade, mobilidade e as dimensões do PPS para calcular o risco.
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}