import * as React from "react"
import { useState, useMemo } from "react"


const injectStyles = `
  :root {
    --gest-bg: #ffffff;
    --gest-text: #1a1916;
    --gest-text-muted: #6b6760;
    --gest-input-bg: rgba(120,120,120,0.08);
    --gest-border: rgba(120,120,120,0.15);
    --gest-card-bg: rgba(120,120,120,0.06);
    --gest-copy-bg: rgba(255,255,255,0.5);
    --gest-copy-hover: rgba(120,120,120,0.1);
    --gest-progress-track: rgba(120,120,120,0.12);
    --gest-progress-fill: rgba(26, 25, 22, 0.25);
    --gest-progress-marker: rgba(26, 25, 22, 0.35);
    --gest-milestone-now-bg: rgba(224, 36, 36, 0.1);
    --gest-milestone-now-border: rgba(224, 36, 36, 0.35);
    --gest-milestone-soon-bg: rgba(242, 143, 0, 0.08);
    --gest-milestone-soon-border: rgba(242, 143, 0, 0.3);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --gest-bg: #1c1917;
      --gest-text: #f5f5f4;
      --gest-text-muted: #78716c;
      --gest-input-bg: rgba(255,255,255,0.08);
      --gest-border: rgba(255,255,255,0.15);
      --gest-card-bg: rgba(255,255,255,0.06);
      --gest-copy-bg: rgba(28, 25, 23, 0.5);
      --gest-copy-hover: rgba(255,255,255,0.1);
      --gest-progress-track: rgba(255,255,255,0.12);
      --gest-progress-fill: rgba(245, 245, 244, 0.25);
      --gest-progress-marker: rgba(245, 245, 244, 0.35);
      --gest-milestone-now-bg: rgba(239, 68, 68, 0.15);
      --gest-milestone-now-border: rgba(239, 68, 68, 0.4);
      --gest-milestone-soon-bg: rgba(251, 146, 60, 0.12);
      --gest-milestone-soon-border: rgba(251, 146, 60, 0.35);
    }

    /* Dark mode date input styling */
    input[type="date"] {
      color-scheme: dark;
    }
    
    input[type="date"]::-webkit-calendar-picker-indicator {
      filter: invert(1);
      opacity: 0.7;
      cursor: pointer;
    }
    
    input[type="date"]::-webkit-calendar-picker-indicator:hover {
      opacity: 1;
    }
  }

  /* Light mode date input styling */
  input[type="date"]::-webkit-calendar-picker-indicator {
    filter: none;
    opacity: 0.6;
    cursor: pointer;
  }
  
  input[type="date"]::-webkit-calendar-picker-indicator:hover {
    opacity: 1;
  }

  .gest-main {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    align-items: start;
  }

  @media (min-width: 900px) {
    .gest-main {
      grid-template-columns: 1.15fr 1fr;
    }
  }

  .gest-side {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .gest-card {
    border-radius: 12px;
    padding: 20px;
    box-sizing: border-box;
    background: var(--gest-card-bg);
    border: 1px solid var(--gest-border);
  }

  .gest-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 4px;
  }

  .gest-copy-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    border: 1px solid var(--gest-border);
    background: var(--gest-copy-bg);
    color: var(--gest-text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
    padding: 0;
  }

  .gest-copy-btn:hover {
    background: var(--gest-copy-hover);
    color: var(--gest-text);
  }

  .gest-copy-btn--ok {
    color: #007a30;
    border-color: rgba(0, 184, 73, 0.35);
    background: rgba(0, 184, 73, 0.08);
  }

  .gest-progress-wrap {
    margin-top: 18px;
  }

  .gest-progress-track {
    position: relative;
    height: 10px;
    border-radius: 999px;
    overflow: visible;
    display: flex;
    background: var(--gest-progress-track);
  }

  .gest-progress-seg {
    height: 100%;
  }

  .gest-progress-seg--t1 { background: rgba(0, 184, 73, 0.45); border-radius: 999px 0 0 999px; }
  .gest-progress-seg--t2 { background: rgba(59, 130, 246, 0.45); }
  .gest-progress-seg--t3 { background: rgba(147, 51, 234, 0.45); border-radius: 0 999px 999px 0; }

  .gest-progress-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    border-radius: 999px;
    background: rgba(26, 25, 22, 0.5);
    pointer-events: none;
    transition: left 0.4s ease, width 0.4s ease;
  }

  .gest-progress-marker {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 3px;
    height: 16px;
    border-radius: 2px;
    background: var(--gest-progress-marker);
    z-index: 2;
  }

  .gest-progress-marker--dum,
  .gest-progress-marker--dpp {
    width: 4px;
    height: 18px;
    background: var(--gest-text);
  }

  .gest-progress-thumb {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    font-size: 16px;
    line-height: 1;
    z-index: 3;
    transition: left 0.4s ease;
  }

  .gest-progress-labels {
    position: relative;
    margin-top: 10px;
    height: 24px;
  }

  .gest-progress-labels span {
    position: absolute;
    top: 0;
    font-size: 10px;
    color: var(--gest-text-muted);
    font-weight: 600;
    transform: translateX(-50%);
    text-align: center;
  }

  .gest-progress-labels span:first-child { left: 0%; }
  .gest-progress-labels span:nth-child(2) { left: 17.5%; }
  .gest-progress-labels span:nth-child(3) { left: 52.5%; }
  .gest-progress-labels span:nth-child(4) { left: 85%; }
  .gest-progress-labels span:last-child { left: 100%; }

  .gest-milestones {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .gest-milestone {
    border-radius: 10px;
    padding: 12px 14px;
  }

  .gest-milestone--now {
    background: var(--gest-milestone-now-bg);
    border: 1px solid var(--gest-milestone-now-border);
  }

  .gest-milestone--soon {
    background: var(--gest-milestone-soon-bg);
    border: 1px solid var(--gest-milestone-soon-border);
  }

  .gest-milestone-tag {
    display: block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 6px;
    color: var(--gest-text-muted);
  }

  .gest-milestone-title {
    display: block;
    font-size: 14px;
    font-weight: 700;
    color: var(--gest-text);
    margin-bottom: 4px;
    line-height: 1.3;
  }

  .gest-milestone-desc {
    display: block;
    font-size: 13px;
    color: var(--gest-text-muted);
    line-height: 1.5;
    margin: 0;
  }
`

const styles = {
    container: {
        background: "var(--gest-bg)",
        color: "var(--gest-text)",
        fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "24px",
        borderRadius: "16px",
        width: "100%",
        maxWidth: "80vw",
        boxSizing: "border-box" as const,
    },
    title: {
        fontSize: "20px",
        fontWeight: 700,
        marginBottom: "4px",
        color: "var(--gest-text)",
    },
    subtitle: {
        fontSize: "13px",
        color: "var(--gest-text-muted)",
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
        color: "var(--gest-text-muted)",
        fontWeight: 600,
    },
    input: {
        background: "var(--gest-input-bg)",
        border: "1px solid var(--gest-border)",
        borderRadius: "10px",
        padding: "10px 14px",
        color: "var(--gest-text)",
        fontSize: "14px",
        outline: "none",
        height: "42px",
        boxSizing: "border-box" as const,
        width: "auto",
        minWidth: "180px",
        maxWidth: "280px",
        transition: "all 0.2s ease",
    },
    badge: {
        display: "inline-block",
        fontSize: "11px",
        fontWeight: 700,
        textTransform: "uppercase" as const,
        padding: "4px 10px",
        borderRadius: "6px",
        letterSpacing: "0.04em",
        marginBottom: "12px",
        background: "rgba(255,255,255,0.6)",
        color: "#e02424",
        border: "1px solid rgba(224, 36, 36, 0.35)",
    },
    scoreValue: {
        fontSize: "28px",
        fontWeight: 800,
        color: "var(--gest-text)",
        margin: "4px 0 16px 0",
        lineHeight: 1.2,
    },
    cardTitle: {
        fontSize: "11px",
        textTransform: "uppercase" as const,
        fontWeight: 700,
        color: "var(--gest-text-muted)",
        marginBottom: "12px",
        letterSpacing: "0.05em",
    },
    funText: {
        fontSize: "14px",
        color: "var(--gest-text)",
        lineHeight: 1.45,
    },
    detailRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: "12px",
        padding: "8px 0",
        borderBottom: "1px solid rgba(120,120,120,0.12)",
        fontSize: "13.5px",
    },
    detailLabel: {
        color: "var(--gest-text-muted)",
        fontWeight: 600,
        fontSize: "12px",
        textTransform: "uppercase" as const,
        letterSpacing: "0.04em",
    },
    detailValue: {
        fontWeight: 700,
        textAlign: "right" as const,
    },
    empty: {
        color: "var(--gest-text-muted)",
        fontSize: "14px",
        textAlign: "center" as const,
        padding: "40px 20px",
        border: "1px dashed var(--gest-border)",
        borderRadius: "12px",
    },
    hint: {
        fontSize: "12px",
        color: "var(--gest-text-muted)",
        marginTop: "6px",
        lineHeight: 1.4,
    },
    emojiLarge: {
        fontSize: "36px",
        lineHeight: 1,
        marginBottom: "10px",
    },
    alertBox: {
        marginTop: "12px",
        fontSize: "12.5px",
        color: "#b56100",
        lineHeight: 1.4,
        padding: "10px 12px",
        borderRadius: "8px",
        background: "rgba(242, 143, 0, 0.08)",
        border: "1px solid rgba(242, 143, 0, 0.25)",
    },
}

const TRIMESTRE_CORES: Record<
    string,
    { bg: string; border: string; t: string }
> = {
    "1º Trimestre": {
        bg: "rgba(0, 184, 73, 0.09)",
        t: "#007a30",
        border: "rgba(0, 184, 73, 0.35)",
    },
    "2º Trimestre": {
        bg: "rgba(59, 130, 246, 0.09)",
        t: "#2563eb",
        border: "rgba(59, 130, 246, 0.35)",
    },
    "3º Trimestre": {
        bg: "rgba(147, 51, 234, 0.1)",
        t: "#9333ea",
        border: "rgba(147, 51, 234, 0.35)",
    },
    "Pós-termo": {
        bg: "rgba(147, 51, 234, 0.1)",
        t: "#9333ea",
        border: "rgba(147, 51, 234, 0.35)",
    },
}

/** Comparação clássica “tamanho de fruta” por semana gestacional */
const TAMANHO_FETO: Record<
    number,
    { emoji: string; comparacao: string; curiosidade: string }
> = {
    4: {
        emoji: "🌱",
        comparacao: "um grão de papoula",
        curiosidade: "O embrião acaba de se implantar no útero.",
    },
    5: {
        emoji: "🫘",
        comparacao: "um grão de sésamo",
        curiosidade:
            "O tubo neural — base do cérebro e da medula — já está se formando.",
    },
    6: {
        emoji: "🫛",
        comparacao: "uma lentilha",
        curiosidade: "O coração primitivo pode começar a bater esta semana.",
    },
    7: {
        emoji: "🫐",
        comparacao: "um mirtilo",
        curiosidade: "Braços e pernas aparecem como pequenos brotos.",
    },
    8: {
        emoji: "🫒",
        comparacao: "uma azeitona",
        curiosidade: "Todos os órgãos essenciais já estão esboçados.",
    },
    9: {
        emoji: "🍇",
        comparacao: "uma uva",
        curiosidade: "Os dedinhos das mãos e dos pés começam a se separar.",
    },
    10: {
        emoji: "🍓",
        comparacao: "um morango",
        curiosidade: "Os órgãos genitais internos já estão se diferenciando.",
    },
    11: {
        emoji: "🥝",
        comparacao: "um kiwi",
        curiosidade:
            "O bebê já abre e fecha a boca e pode engolir líquido amniótico.",
    },
    12: {
        emoji: "🍑",
        comparacao: "uma ameixa",
        curiosidade: "Reflexos aparecem — ele já pode cerrar os dedos.",
    },
    13: {
        emoji: "🍋",
        comparacao: "um limão",
        curiosidade: "As cordas vocais estão se formando.",
    },
    14: {
        emoji: "🍋",
        comparacao: "um limão siciliano",
        curiosidade: "O rosto fica mais definido e a nuca fica mais reta.",
    },
    15: {
        emoji: "🍎",
        comparacao: "uma maçã",
        curiosidade: "Ele já consegue fazer caretas e mover os olhos.",
    },
    16: {
        emoji: "🥑",
        comparacao: "um abacate",
        curiosidade:
            "Algumas mães começam a sentir os primeiros movimentos agora.",
    },
    17: {
        emoji: "🍐",
        comparacao: "uma pera",
        curiosidade: "Gordura começa a se depositar sob a pele fina.",
    },
    18: {
        emoji: "🫑",
        comparacao: "um pimentão",
        curiosidade:
            "Orelhas, nariz e lábios ficam mais evidentes no ultrassom.",
    },
    19: {
        emoji: "🍊",
        comparacao: "uma laranja",
        curiosidade: "Vernix caseosa começa a proteger a pele delicada.",
    },
    20: {
        emoji: "🍌",
        comparacao: "uma banana",
        curiosidade: "Metade da gestação! Você pode sentir chutes mais claros.",
    },
    21: {
        emoji: "🥕",
        comparacao: "uma cenoura",
        curiosidade:
            "Movimentos de deglutição e respiração praticam os pulmões.",
    },
    22: {
        emoji: "🥒",
        comparacao: "um pepino",
        curiosidade: "Pestanas e sobrancelhas já estão presentes.",
    },
    23: {
        emoji: "🍆",
        comparacao: "uma berinjela pequena",
        curiosidade: "O cérebro cresce rapidamente e os sentidos se aprimoram.",
    },
    24: {
        emoji: "🌽",
        comparacao: "uma espiga de milho",
        curiosidade:
            "Marco de viabilidade — os pulmões avançam muito nesta fase.",
    },
    25: {
        emoji: "🥬",
        comparacao: "um repolho",
        curiosidade:
            "As mãos são bem formadas e ele pode brincar com o cordão.",
    },
    26: {
        emoji: "🍈",
        comparacao: "um melão cantaloupe",
        curiosidade: "Os olhos abrem pela primeira vez.",
    },
    27: {
        emoji: "🥦",
        comparacao: "um brócolis grande",
        curiosidade:
            "Última semana do 2º trimestre — o sono alterna entre REM e quieto.",
    },
    28: {
        emoji: "🎃",
        comparacao: "uma abóbora pequena",
        curiosidade:
            "Bem-vinda ao 3º trimestre! O cérebro dobra de complexidade.",
    },
    29: {
        emoji: "🥥",
        comparacao: "um coco",
        curiosidade:
            "Os ossos ficam mais densos e ele ganha peso de forma constante.",
    },
    30: {
        emoji: "🥬",
        comparacao: "um repolho grande",
        curiosidade: "A medula óssea assume a produção de glóbulos vermelhos.",
    },
    31: {
        emoji: "🍍",
        comparacao: "um abacaxi",
        curiosidade: "Os cinco sentidos estão ativos — ele reage a luz e som.",
    },
    32: {
        emoji: "🍈",
        comparacao: "um melão",
        curiosidade: "Ganha cerca de 200 g por semana nesta fase.",
    },
    33: {
        emoji: "🥭",
        comparacao: "um mamão",
        curiosidade: "O crânio permanece maleável para facilitar o parto.",
    },
    34: {
        emoji: "🍈",
        comparacao: "um melão cantaloupe grande",
        curiosidade:
            "Pulmões e sistema nervoso amadurecem para a vida fora do útero.",
    },
    35: {
        emoji: "🍈",
        comparacao: "um melão honeydew",
        curiosidade: "Os rins estão totalmente desenvolvidos.",
    },
    36: {
        emoji: "🥬",
        comparacao: "uma alface romana",
        curiosidade: "Ele pode descer para a pelve e “engajar” para o parto.",
    },
    37: {
        emoji: "🥬",
        comparacao: "um acelga",
        curiosidade: "A partir daqui é considerado a termo precoce.",
    },
    38: {
        emoji: "🎃",
        comparacao: "uma abóbora média",
        curiosidade: "Unhas chegam à ponta dos dedos.",
    },
    39: {
        emoji: "🍉",
        comparacao: "uma melancia pequena",
        curiosidade:
            "O cérebro continua amadurecendo — ele já está quase pronto!",
    },
    40: {
        emoji: "🍉",
        comparacao: "uma melancia",
        curiosidade:
            "Data prevista! Só 5% dos bebês nascem exatamente no dia calculado.",
    },
}

interface Marco {
    semana: number
    titulo: string
    descricao: string
}

const MARCOS: Marco[] = [
    {
        semana: 6,
        titulo: "Batimentos cardíacos",
        descricao:
            "O coração fetal pode ser detectado no ultrassom transvaginal.",
    },
    {
        semana: 8,
        titulo: "Primeira consulta de pré-natal",
        descricao:
            "Ideal confirmar a gestação, iniciar ácido fólico/vitaminas e pedir exames iniciais.",
    },
    {
        semana: 10,
        titulo: "Risco de malformações — rastreio",
        descricao:
            "Período comum para translucência nucal e exames de 1º trimestre.",
    },
    {
        semana: 12,
        titulo: "Fim do 1º trimestre",
        descricao:
            "O risco de aborto espontâneo cai bastante. Náuseas tendem a melhorar.",
    },
    {
        semana: 16,
        titulo: "Possíveis primeiros movimentos",
        descricao:
            "Multíparas podem sentir “flutuações” ou “borboletas” no ventre.",
    },
    {
        semana: 20,
        titulo: "Ultrassom morfológico",
        descricao: "Exame detalhado da anatomia fetal — metade da jornada!",
    },
    {
        semana: 24,
        titulo: "Teste de tolerância à glicose",
        descricao:
            "Rastreio de diabetes gestacional costuma ser feito entre 24 e 28 semanas.",
    },
    {
        semana: 28,
        titulo: "Início do 3º trimestre",
        descricao:
            "Consultas podem ficar mais frequentes. Vacina dTpa é recomendada nesta fase.",
    },
    {
        semana: 32,
        titulo: "Contrações de Braxton-Hicks",
        descricao:
            "O útero pode “treinar” com contrações irregulares e indolores — normal!",
    },
    {
        semana: 34,
        titulo: "Maturidade pulmonar",
        descricao:
            "Se houver risco de parto prematuro, corticoide pode ser indicado pelo obstetra.",
    },
    {
        semana: 36,
        titulo: "Consultas semanais",
        descricao:
            "Monitoramento mais próximo. Bebê pode virar cabeça para baixo.",
    },
    {
        semana: 37,
        titulo: "Termo precoce",
        descricao: "Bebê é considerado a termo. Prepare a mala da maternidade!",
    },
    {
        semana: 39,
        titulo: "Termo completo",
        descricao:
            "Parto pode acontecer a qualquer momento. Observe sinais de trabalho de parto.",
    },
    {
        semana: 40,
        titulo: "Data provável do parto",
        descricao:
            "Se não houver parto, o obstetra discutirá indução ou expectativa conforme protocolo.",
    },
]

function startOfDay(d: Date) {
    const copy = new Date(d)
    copy.setHours(0, 0, 0, 0)
    return copy
}

function addDays(d: Date, days: number) {
    const copy = new Date(d)
    copy.setDate(copy.getDate() + days)
    return copy
}

function formatDateBR(d: Date) {
    return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    })
}

function formatDateCurta(d: Date) {
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
}

function formatIgCurta(semanas: number, dias: number) {
    if (semanas === 0) return `${dias}d`
    return `${semanas}s${dias}d`
}

function formatIgCopia(semanas: number, dias: number, dpp: Date) {
    return `IG: ${formatIgCurta(semanas, dias)} | DPP: ${formatDateCurta(dpp)}`
}

function diasEntre(a: Date, b: Date) {
    const ms = startOfDay(b).getTime() - startOfDay(a).getTime()
    return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function obterTrimestre(semanas: number) {
    if (semanas < 14) return "1º Trimestre"
    if (semanas < 28) return "2º Trimestre"
    return "3º Trimestre"
}

function clampSemana(semanas: number) {
    return Math.min(40, Math.max(4, semanas))
}

function obterTamanho(semana: number) {
    const s = clampSemana(semana)
    return TAMANHO_FETO[s] ?? TAMANHO_FETO[40]
}

function obterMarcos(semanaAtual: number) {
    const agora = MARCOS.filter((m) => m.semana === semanaAtual)
    const emBreve = MARCOS.filter(
        (m) => m.semana > semanaAtual && m.semana <= semanaAtual + 3
    )
    return { agora, emBreve }
}

interface ResultadoGestacional {
    semanas: number
    dias: number
    totalDias: number
    trimestre: string
    dum: Date
    dpp: Date
    diasRestantes: number
    percentual: number
    tamanho: (typeof TAMANHO_FETO)[number]
    marcos: ReturnType<typeof obterMarcos>
    valido: boolean
    mensagemErro?: string
}

function calcularGestacao(dum: string): ResultadoGestacional | null {
    if (!dum) return null

    const lmp = startOfDay(new Date(dum + "T12:00:00"))
    const hoje = startOfDay(new Date())

    if (isNaN(lmp.getTime())) {
        return {
            semanas: 0,
            dias: 0,
            totalDias: 0,
            trimestre: "",
            dum: hoje,
            dpp: hoje,
            diasRestantes: 0,
            percentual: 0,
            tamanho: TAMANHO_FETO[4],
            marcos: { agora: [], emBreve: [] },
            valido: false,
            mensagemErro: "Data inválida.",
        }
    }

    const totalDias = diasEntre(lmp, hoje)

    if (totalDias < 0) {
        return {
            semanas: 0,
            dias: 0,
            totalDias,
            trimestre: "",
            dum: lmp,
            dpp: addDays(lmp, 280),
            diasRestantes: 0,
            percentual: 0,
            tamanho: TAMANHO_FETO[4],
            marcos: { agora: [], emBreve: [] },
            valido: false,
            mensagemErro: "A DUM não pode ser uma data futura.",
        }
    }

    if (totalDias > 294) {
        return {
            semanas: Math.floor(totalDias / 7),
            dias: totalDias % 7,
            totalDias,
            trimestre: "Pós-termo",
            dum: lmp,
            dpp: addDays(lmp, 280),
            diasRestantes: 0,
            percentual: 100,
            tamanho: TAMANHO_FETO[40],
            marcos: obterMarcos(40),
            valido: true,
            mensagemErro:
                "Gestação acima de 42 semanas — acompanhamento obstétrico é essencial.",
        }
    }

    const semanas = Math.floor(totalDias / 7)
    const dias = totalDias % 7
    const dpp = addDays(lmp, 280)
    const diasRestantes = Math.max(0, diasEntre(hoje, dpp))
    const percentual = Math.min(100, Math.round((totalDias / 280) * 100))
    const semanaParaTamanho = semanas < 4 ? 4 : semanas
    const trimestre = obterTrimestre(semanas)

    return {
        semanas,
        dias,
        totalDias,
        trimestre,
        dum: lmp,
        dpp,
        diasRestantes,
        percentual,
        tamanho: obterTamanho(semanaParaTamanho),
        marcos: obterMarcos(semanas),
        valido: true,
    }
}

interface Props {
    style?: React.CSSProperties
}

const MARCO_T2 = (14 / 40) * 100 // 35%
const MARCO_T3 = (28 / 40) * 100 // 70%

function IconeCopiar() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    )
}

function IconeCheck() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="20 6 9 17 4 12" />
        </svg>
    )
}

function BarraProgressoGestacional({
    percentual,
    dum,
    dpp,
}: {
    percentual: number
    dum: Date
    dpp: Date
}) {
    const pos = Math.min(100, Math.max(0, percentual))

    return (
        <div className="gest-progress-wrap">
            <div className="gest-progress-track">
                <div
                    className="gest-progress-seg gest-progress-seg--t1"
                    style={{ width: `${MARCO_T2}%` }}
                />
                <div
                    className="gest-progress-seg gest-progress-seg--t2"
                    style={{ width: `${MARCO_T3 - MARCO_T2}%` }}
                />
                <div
                    className="gest-progress-seg gest-progress-seg--t3"
                    style={{ width: `${100 - MARCO_T3}%` }}
                />
                <div
                    className="gest-progress-fill"
                    style={{ left: `${pos}%`, width: `${100 - pos}%` }}
                />
                <div
                    className="gest-progress-marker gest-progress-marker--dum"
                    style={{ left: "0%" }}
                    title="DUM"
                />
                <div
                    className="gest-progress-marker"
                    style={{ left: `${MARCO_T2}%` }}
                    title="2º trimestre"
                />
                <div
                    className="gest-progress-marker"
                    style={{ left: `${MARCO_T3}%` }}
                    title="3º trimestre"
                />
                <div
                    className="gest-progress-marker gest-progress-marker--dpp"
                    style={{ left: "100%" }}
                    title="DPP"
                />
                <div
                    className="gest-progress-thumb"
                    style={{ left: `${pos}%` }}
                >
                    👶
                </div>
            </div>
            <div className="gest-progress-labels">
                <span>DUM</span>
                <span>1º Tri</span>
                <span>2º Tri</span>
                <span>3º Tri</span>
                <span>DPP</span>
            </div>
        </div>
    )
}

function BotaoCopiar({ texto }: { texto: string }) {
    const [copiado, setCopiado] = useState(false)

    const copiar = async () => {
        try {
            await navigator.clipboard.writeText(texto)
            setCopiado(true)
            setTimeout(() => setCopiado(false), 2000)
        } catch {
            /* fallback silencioso em ambientes sem clipboard */
        }
    }

    return (
        <button
            type="button"
            className={`gest-copy-btn${copiado ? " gest-copy-btn--ok" : ""}`}
            onClick={copiar}
            title={copiado ? "Copiado!" : "Copiar IG e DPP"}
            aria-label="Copiar idade gestacional e data provável do parto"
        >
            {copiado ? <IconeCheck /> : <IconeCopiar />}
        </button>
    )
}

function CardMarco({ marco, tipo }: { marco: Marco; tipo: "now" | "soon" }) {
    return (
        <div
            className={`gest-milestone gest-milestone--${tipo === "now" ? "now" : "soon"}`}
        >
            <span className="gest-milestone-tag">
                {tipo === "now" ? "Agora" : "Em breve"} · Semana {marco.semana}
            </span>
            <span className="gest-milestone-title">{marco.titulo}</span>
            <p className="gest-milestone-desc">{marco.descricao}</p>
        </div>
    )
}

export default function CalculadoraGestacional({ style }: Props) {
    const [dum, setDum] = useState("")
    const [tocado, setTocado] = useState(false)

    const resultado = useMemo(() => calcularGestacao(dum), [dum])

    const cores =
        resultado && TRIMESTRE_CORES[resultado.trimestre]
            ? TRIMESTRE_CORES[resultado.trimestre]
            : TRIMESTRE_CORES["2º Trimestre"]

    const idadeGestacional =
        resultado && resultado.valido
            ? resultado.semanas === 0
                ? `${resultado.dias} ${resultado.dias === 1 ? "dia" : "dias"}`
                : `${resultado.semanas} ${resultado.semanas === 1 ? "semana" : "semanas"} e ${resultado.dias} ${resultado.dias === 1 ? "dia" : "dias"}`
            : null

    const textoCopia =
        resultado && resultado.valido
            ? formatIgCopia(resultado.semanas, resultado.dias, resultado.dpp)
            : ""

    return (
        <div style={{ ...styles.container, ...style }}>
            <style dangerouslySetInnerHTML={{ __html: injectStyles }} />

            <div style={styles.title}>Calculadora Gestacional</div>
            <div style={styles.subtitle}></div>

            <div style={styles.inputGroup}>
                <label style={styles.label}>
                    Data da Última Menstruação (DUM){" "}
                    <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                    type="date"
                    value={dum}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setDum(e.target.value)}
                    onBlur={() => setTocado(true)}
                    style={{
                        ...styles.input,
                        ...(tocado && !dum
                            ? {
                                  border: "2px solid #dc2626",
                                  backgroundColor: "rgba(220, 38, 38, 0.05)",
                              }
                            : {}),
                    }}
                />
            </div>

            {!resultado ? (
                <div style={{ ...styles.empty, marginTop: "20px" }}>
                    Selecione a data da última menstruação para ver o
                    acompanhamento da gestação.
                </div>
            ) : !resultado.valido ? (
                <div
                    style={{
                        ...styles.empty,
                        marginTop: "20px",
                        borderColor: "rgba(220, 38, 38, 0.35)",
                        color: "#ba120a",
                    }}
                >
                    {resultado.mensagemErro}
                </div>
            ) : (
                <div className="gest-main" style={{ marginTop: "20px" }}>
                    {/* Card principal — IG, DPP, progresso */}
                    <div
                        className="gest-card"
                        style={{
                            background: cores.bg,
                            border: `1px solid ${cores.border}`,
                        }}
                    >
                        <div className="gest-card-header">
                            <span
                                style={{
                                    ...styles.badge,
                                    marginBottom: 0,
                                    color: cores.t,
                                    border: `1px solid ${cores.border}`,
                                }}
                            >
                                {resultado.trimestre}
                            </span>
                            <BotaoCopiar texto={textoCopia} />
                        </div>

                        <div style={styles.label}>Idade gestacional</div>
                        <div style={styles.scoreValue}>{idadeGestacional}</div>

                        <div style={styles.detailRow}>
                            <span style={styles.detailLabel}>
                                Data provável do parto
                            </span>
                            <span style={styles.detailValue}>
                                {formatDateBR(resultado.dpp)}
                            </span>
                        </div>
                        <div style={styles.detailRow}>
                            <span style={styles.detailLabel}>
                                Faltam aproximadamente
                            </span>
                            <span style={styles.detailValue}>
                                {resultado.diasRestantes}{" "}
                                {resultado.diasRestantes === 1 ? "dia" : "dias"}
                            </span>
                        </div>
                        <div
                            style={{
                                ...styles.detailRow,
                                borderBottom: "none",
                                paddingBottom: 0,
                            }}
                        >
                            <span style={styles.detailLabel}>Progresso</span>
                            <span style={styles.detailValue}>
                                {resultado.percentual}%
                            </span>
                        </div>

                        <BarraProgressoGestacional
                            percentual={resultado.percentual}
                            dum={resultado.dum}
                            dpp={resultado.dpp}
                        />

                        {resultado.mensagemErro && (
                            <div style={styles.alertBox}>
                                ⚠️ {resultado.mensagemErro}
                            </div>
                        )}
                    </div>

                    {/* Cards laterais */}
                    <div className="gest-side">
                        {/* Card tamanho do feto */}
                        <div className="gest-card">
                            <div style={styles.cardTitle}>Tamanho do bebê</div>
                            <div style={styles.emojiLarge}>
                                {resultado.tamanho.emoji}
                            </div>
                            <div style={styles.funText}>
                                <strong>
                                    Cerca do tamanho de{" "}
                                    {resultado.tamanho.comparacao}
                                </strong>
                            </div>
                            <div
                                style={{
                                    ...styles.funText,
                                    marginTop: "8px",
                                    color: "var(--gest-text-muted)",
                                }}
                            >
                                {resultado.tamanho.curiosidade}
                            </div>
                        </div>

                        {/* Card marcos da fase */}
                        <div className="gest-card">
                            <div style={styles.cardTitle}>
                                Marcos desta fase
                            </div>
                            {resultado.marcos.agora.length === 0 &&
                            resultado.marcos.emBreve.length === 0 ? (
                                <div
                                    style={{
                                        fontSize: "13px",
                                        color: "var(--gest-text-muted)",
                                        lineHeight: 1.5,
                                    }}
                                >
                                    Nenhum marco específico nesta semana.
                                    Continue o acompanhamento pré-natal regular.
                                </div>
                            ) : (
                                <div className="gest-milestones">
                                    {resultado.marcos.agora.map((m) => (
                                        <CardMarco
                                            key={`agora-${m.semana}-${m.titulo}`}
                                            marco={m}
                                            tipo="now"
                                        />
                                    ))}
                                    {resultado.marcos.emBreve.map((m) => (
                                        <CardMarco
                                            key={`breve-${m.semana}-${m.titulo}`}
                                            marco={m}
                                            tipo="soon"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

