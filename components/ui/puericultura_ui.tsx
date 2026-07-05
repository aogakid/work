import * as React from "react"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import {
  Indicator,
  Sex,
  INDICATOR_LABEL,
  MIN_AGE_DAYS,
  MAX_AGE_DAYS,
  STANDARD_Z_LINES,
  buildCurve,
  evaluate,
  monthsToDays,
  lengthOrHeightLabel,
} from "../../lib/who-growth"

// Embedded fallback data for preview environment
const PUERICULTURA_FALLBACK_DATA = [{"ageRange":"0-28d","fields":[{"section":"geral","id":"local","label":"local de parto","labelMd":"Parto em","type":"single_choice","options":["hospital","casa","outro"],"value":""},{"section":"geral","id":"parto","label":"tipo de parto","labelMd":"Parto","type":"single_choice","options":["vaginal","cesárea"],"value":""},{"section":"geral","id":"contato","label":"pele a pele","labelMd":"Pele a pele","type":"single_choice","options":["sim","não"],"value":""},{"section":"geral","id":"clamp","label":"clamp oportuno","labelMd":"Clamp oportuno","type":"single_choice","options":["sim","não"],"value":""},{"section":"geral","id":"mamou","label":"mamou na 1ª hora","labelMd":"Mamou na 1ª hora","type":"single_choice","options":["sim","não"],"value":""},{"section":"geral","id":"aleitamento","label":"aleitamento","labelMd":"Aleitamento","type":"single_choice","options":["exclusivo","complementado","artificial"],"value":""},{"section":"geral","id":"prevencao","label":"prevenção","labelMd":"Prevenção","type":"multiple_choice","options":["oftálmica","vit. K"],"value":[]},{"section":"desenvolvimento","id":"apgar1","label":"apgar 1 min","labelMd":"APGAR 1º min","type":"text_required","options":null,"value":""},{"section":"desenvolvimento","id":"apgar5","label":"apgar 5 min","labelMd":"APGAR 5º min","type":"text_required","options":null,"value":""},{"section":"desenvolvimento","id":"reanimacao","label":"reanimação","labelMd":"Reanimação","type":"single_choice","options":["sim","não"],"value":""},{"section":"desenvolvimento","id":"internacao","label":"internação (motivo, local e duração)","labelMd":"Internação","type":"text_optional","options":null,"value":""},{"section":"crescimento","id":"peso_nascimento","label":"peso ao nascer","labelMd":"Peso ao nascer","type":"text_required","options":null,"value":""},{"section":"crescimento","id":"comp_nascimento","label":"comprimento ao nascer","labelMd":"Comp. ao nascer","type":"text_required","options":null,"value":""},{"section":"crescimento","id":"pc_nascimento","label":"PC ao nascer","labelMd":"PC ao nascer","type":"text_required","options":null,"value":""},{"section":"crescimento","id":"div_01","label":null,"labelMd":null,"type":"divider","options":null,"value":""},{"section":"crescimento","id":"peso","label":"peso atual","labelMd":"Peso atual","type":"text_required","options":null,"value":""},{"section":"crescimento","id":"altura","label":"comprimento atual","labelMd":"Comp. atual","type":"text_required","options":null,"value":""},{"section":"crescimento","id":"imc","label":"IMC","labelMd":"IMC","type":"text_required","options":null,"value":""},{"section":"crescimento","id":"pc","label":"perímetro cefálico atual","labelMd":"PC atual","type":"text_required","options":null,"value":""}]},{"ageRange":"1m","fields":[{"section":"geral","id":"pezinho","label":"teste do pezinho","labelMd":"Pezinho","type":"text_optional","options":null,"value":""},{"section":"geral","id":"coracaozinho","label":"teste do coraçaozinho","labelMd":"Coraçaozinho","type":"text_optional","options":null,"value":""},{"section":"geral","id":"orelhinha","label":"teste da orelhinha","labelMd":"Orelhinha","type":"text_optional","options":null,"value":""},{"section":"geral","id":"olhinho","label":"teste do olhinho","labelMd":"Olhinho","type":"text_optional","options":null,"value":""},{"section":"geral","id":"linguinha","label":"teste da linguinha","labelMd":"Linguinha","type":"text_optional","options":null,"value":""},{"section":"geral","id":"div_02","label":null,"labelMd":null,"type":"divider","options":null,"value":""},{"section":"geral","id":"vacina","label":"vacinação","labelMd":"Vacinação","type":"single_choice","options":["atualizada","pendente"],"value":""},{"section":"geral","id":"aleitamento","label":"aleitamento","labelMd":"Aleitamento","type":"single_choice","options":["exclusivo","complementado","artificial"],"value":""},{"section":"geral","id":"observacoes","label":"observações","labelMd":"Obs.","type":"multiple_choice","options":["dificuldade para amamentar","parou de amamentar"],"value":[]},{"section":"geral","id":"alertas","label":"alertas presentes","labelMd":"Alertas presentes","type":"multiple_choice","options":["coriza","cólica","engasgos","diarreia","constipação","vômitos","golfadas","taquipneia","bradipneia","febre","hipotermia","convulsões","movimentos anormais"],"value":[]},{"section":"geral","id":"abertura","label":"abertura ocular","labelMd":"Abertura ocular","type":"single_choice","options":["normal","anormal"],"value":""},{"section":"geral","id":"pupilas","label":"pupilas","labelMd":"Pupilas","type":"single_choice","options":["normais","anormais"],"value":""},{"section":"geral","id":"estrabismo","label":"estrabismo","labelMd":"Estrabismo","type":"single_choice","options":["normal","anormal"],"value":""},{"section":"geral","id":"posicao","label":"posição de sono no berço","labelMd":"Posição de sono","type":"single_choice","options":["barriga pra cima","barriga pra baixo","lateralizado"],"value":""},{"section":"geral","id":"sono","label":"tempo de sono","labelMd":"Tempo de sono","type":"text_optional","options":null,"value":""},{"section":"geral","id":"higiene","label":"higiene","labelMd":"Higiene","type":"single_choice","options":["adequada","inadequada"],"value":""},{"section":"geral","id":"acidentes","label":"acidentes","labelMd":"Acidentes","type":"single_choice","options":["nega","relatado"],"value":""},{"section":"geral","id":"violência","label":"violência/negligência","labelMd":"Violência/negligência","type":"single_choice","options":["nega","sinais presentes"],"value":""},{"section":"desenvolvimento","id":"marcoa","label":"postura - pernas e braços fletidos, cabeça lateralizada","labelMd":"Postura: pernas e braços fletidos, cabeça lateralizada","type":"single_choice","options":["P","A","NV"],"value":""},{"section":"desenvolvimento","id":"marcob","label":"observa um som","labelMd":"Observa um rosto","type":"single_choice","options":["P","A","NV"],"value":""},{"section":"desenvolvimento","id":"marcoc","label":"reage ao som","labelMd":"Reage ao som","type":"single_choice","options":["P","A","NV"],"value":""},{"section":"desenvolvimento","id":"marcod","label":"eleva a cabeça","labelMd":"Eleva a cabeça","type":"single_choice","options":["P","A","NV"],"value":""},{"section":"crescimento","id":"peso","label":"peso","labelMd":"Peso","type":"text_required","options":null,"value":""},{"section":"crescimento","id":"altura","label":"comprimento","labelMd":"Comp.","type":"text_required","options":null,"value":""},{"section":"crescimento","id":"imc","label":"IMC","labelMd":"IMC","type":"text_required","options":null,"value":""},{"section":"crescimento","id":"pc","label":"perímetro cefálico","labelMd":"PC","type":"text_required","options":null,"value":""}]}]

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
    min-width: 0;
  }

  .puericultura-result-card {
    border-radius: 12px;
    padding: 20px;
    box-sizing: border-box;
    transition: background 0.3s ease, border 0.3s ease;
    min-width: 0;
    overflow: hidden;
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
    min-width: 0;
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
    overflowX: "hidden" as const,
    maxWidth: "100%",
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
    minWidth: 0,
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
    maxWidth: "100%",
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

type FieldType = "single_choice" | "multiple_choice" | "text_required" | "text_optional" | "divider";

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

interface AgeBracket {
  ageRange: string
  maxMonths: number
}



interface Props {
  style?: React.CSSProperties
}

// Inlined GrowthChart component
interface GrowthChartProps {
  indicator?: Indicator;
  sex?: Sex;
  ageMonths?: number;
  value?: number;
  heightCm?: number;
  className?: string;
  style?: React.CSSProperties;
  maxMonths?: number;
  dotColor?: string;
}

const GrowthChart: React.FC<GrowthChartProps> = ({
  indicator = "weight",
  sex = "M",
  ageMonths = 12,
  value,
  heightCm,
  className,
  style,
  maxMonths = 60,
  dotColor = "var(--growth-point, #2454ff)",
}) => {
  const Z_COLORS: Record<number, string> = {
    "-3": "#c1121f",
    "-2": "#e07a3e",
    "-1": "#d4a72c",
    "0": "#2e7d5b",
    "1": "#d4a72c",
    "2": "#e07a3e",
    "3": "#c1121f",
  }

  const W = 720
  const H = 420
  const PAD_L = 56
  const PAD_R = 20
  const PAD_T = 20
  const PAD_B = 44

  const ageDays = Math.min(
    Math.max(monthsToDays(ageMonths), MIN_AGE_DAYS),
    MAX_AGE_DAYS
  );

  const effectiveValue =
    indicator === "bmi" && value != null && heightCm
      ? value
      : value;

  const bmiValue =
    indicator === "bmi" && heightCm && value != null
      ? value / Math.pow(heightCm / 100, 2)
      : undefined;

  const finalValue = indicator === "bmi" && bmiValue != null ? bmiValue : effectiveValue;

  const dataMinDays = 0
  const dataMaxDays = monthsToDays(maxMonths)

  const curves = React.useMemo(
    () =>
      STANDARD_Z_LINES.map((z) => ({
        z,
        points: buildCurve(indicator, sex, z, dataMinDays, dataMaxDays, 500),
      })),
    [indicator, sex, dataMinDays, dataMaxDays]
  )

  // 24-month zoom window, centered on the patient's age
  const ZOOM_MONTHS = 24
  const viewCenterMonths = Math.max(12, ageMonths)
  const viewMinMonths = Math.max(0, viewCenterMonths - 12)
  const viewMaxMonths = viewMinMonths + ZOOM_MONTHS
  const viewMinDays = Math.floor(monthsToDays(viewMinMonths))
  const viewMaxDays = Math.ceil(monthsToDays(viewMaxMonths))

  const allValues = curves.flatMap((c) => c.points.map((p) => p.value))
  const yMin = Math.min(...allValues)
  const yMax = Math.max(...allValues)
  const yPad = (yMax - yMin) * 0.06
  const yLo = Math.max(0, yMin - yPad)
  const yHi = yMax + yPad

  const xScale = (days: number) =>
    PAD_L + ((days - viewMinDays) / (viewMaxDays - viewMinDays)) * (W - PAD_L - PAD_R)
  const yScale = (v: number) =>
    H - PAD_B - ((v - yLo) / (yHi - yLo)) * (H - PAD_T - PAD_B)

  const pathFor = (points: { ageDays: number; value: number }[]) =>
    points
      .map((p, i) => `${i === 0 ? "M" : "L"}${xScale(p.ageDays).toFixed(2)},${yScale(p.value).toFixed(2)}`)
      .join(" ")

  const result =
    finalValue != null ? evaluate(indicator, sex, ageDays, finalValue) : null

  const monthTicks = React.useMemo(() => {
    const step = 3
    const ticks: number[] = []
    for (let m = viewMinMonths; m <= viewMaxMonths; m += step) ticks.push(m)
    return ticks
  }, [viewMinMonths, viewMaxMonths])

  const unitLabel =
    indicator === "length_height" ? lengthOrHeightLabel(ageDays) : null;

  return (
    <div
      className={className}
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "var(--growth-fg, #1f2430)",
        background: "var(--growth-bg, transparent)",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 8,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 15 }}>
          {INDICATOR_LABEL[indicator]}
          {unitLabel ? ` (${unitLabel})` : ""} — {sex === "M" ? "Masculino" : "Feminino"}
        </div>
        {result && (
          <div style={{ fontSize: 13, display: "flex", gap: 14 }}>
            <span>
              <strong>Z:</strong> {result.z.toFixed(2)}
            </span>
            <span>
              <strong>Percentil:</strong> {result.percentile.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" style={{ borderRadius: "10px", display: "block", maxWidth: "100%", overflow: "hidden" }}>
        <rect width={W} height={H} fill="white" />
        <defs>
          <clipPath id={`plot-clip-${indicator}`}>
            <rect x={PAD_L} y={PAD_T} width={W - PAD_L - PAD_R} height={H - PAD_T - PAD_B} />
          </clipPath>
        </defs>
        <line
          x1={PAD_L}
          y1={H - PAD_B}
          x2={W - PAD_R}
          y2={H - PAD_B}
          stroke="var(--growth-axis, #b8bec9)"
        />
        <line
          x1={PAD_L}
          y1={PAD_T}
          x2={PAD_L}
          y2={H - PAD_B}
          stroke="var(--growth-axis, #b8bec9)"
        />

        {Array.from({ length: 5 }, (_, i) => {
          const v = yLo + ((yHi - yLo) * i) / 4;
          const y = yScale(v);
          return (
            <g key={i}>
              <line
                x1={PAD_L}
                y1={y}
                x2={W - PAD_R}
                y2={y}
                stroke="var(--growth-grid, #e7e9ee)"
              />
              <text x={PAD_L - 8} y={y + 4} fontSize={10} textAnchor="end" fill="var(--growth-fg-muted, #6b7280)">
                {v.toFixed(indicator === "bmi" ? 1 : indicator === "weight" ? 1 : 0)}
              </text>
            </g>
          );
        })}

        {monthTicks.map((m) => {
          const x = xScale(monthsToDays(m));
          return (
            <g key={m}>
              <line x1={x} y1={PAD_T} x2={x} y2={H - PAD_B} stroke="var(--growth-grid, #f0f1f4)" />
              <text x={x} y={H - PAD_B + 16} fontSize={10} textAnchor="middle" fill="var(--growth-fg-muted, #6b7280)">
                {m}
              </text>
            </g>
          );
        })}
        <text x={(W + PAD_L - PAD_R) / 2} y={H - 4} fontSize={11} textAnchor="middle" fill="var(--growth-fg-muted, #6b7280)">
          Idade (meses)
        </text>

        {curves.map(({ z, points }) => (
          <g key={z} clipPath="none">
            <path
              d={pathFor(points)}
              fill="none"
              stroke={Z_COLORS[z]}
              strokeWidth={z === 0 ? 2 : 1.1}
              strokeDasharray={z === 0 ? undefined : "4 3"}
              opacity={z === 0 ? 1 : 0.75}
              clipPath={`url(#plot-clip-${indicator})`}
            />
            <text
              x={W - PAD_R + 2}
              y={
                (() => {
                  const p = [...points].reverse().find(p => p.ageDays <= viewMaxDays)
                  return yScale(p ? p.value : points[points.length - 1].value) + 3
                })()
              }
              fontSize={9.5}
              fill={Z_COLORS[z]}
            >
              {z > 0 ? `+${z}` : z}
            </text>
          </g>
        ))}

        {result && finalValue != null && (
          <g>
            <circle
              cx={xScale(ageDays)}
              cy={yScale(finalValue)}
              r={5.5}
              fill={dotColor}
              stroke="white"
              strokeWidth={1.5}
            />
            <line
              x1={xScale(ageDays)}
              y1={PAD_T}
              x2={xScale(ageDays)}
              y2={H - PAD_B}
              stroke={dotColor}
              strokeDasharray="2 3"
              opacity={0.35}
            />
          </g>
        )}
      </svg>
    </div>
  );
};

export default function PuericulturaUI({ style }: Props) {
  const AGE_BRACKETS: AgeBracket[] = useMemo(() => [
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
    { ageRange: "11-14y",  maxMonths: 168 },
    { ageRange: "15-20y",  maxMonths: 240 },
  ], [])

  const resolveFaixaEtaria = useCallback((totalMeses: number): string => {
    const bracket = AGE_BRACKETS.find(b => totalMeses <= b.maxMonths)
    return bracket?.ageRange ?? AGE_BRACKETS[AGE_BRACKETS.length - 1].ageRange
  }, [AGE_BRACKETS])

  const resolveLabelClinico = useCallback((diffDays: number, totalMeses: number): string => {
    if (diffDays <= 28) return "neonato"
    if (totalMeses <= 24) return "lactente"
    if (totalMeses <= 84) return "pré-escolar"
    if (totalMeses <= 120) return "escolar"
    return "adolescente"
  }, [])

  const secoes = useMemo(() => [
    { id: "geral", label: "Geral" },
    { id: "desenvolvimento", label: "Desenvolvimento" },
    { id: "crescimento", label: "Crescimento" }
  ], [])

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
  const [sexo, setSexo] = useState<"M" | "F">("M")
  const mdTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea ao conteúdo
  useEffect(() => {
    const el = mdTextareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [markdownOutput])

    useEffect(() => {
    fetch("/contents/puericultura.json")
      .then((res) => res.json())
      .then((data) => {
        setAgeGroupForms(Array.isArray(data) ? (data as AgeGroupForm[]) : [])
      })
      .catch(() => {
        // Fallback to embedded data for preview environment
        setAgeGroupForms(PUERICULTURA_FALLBACK_DATA as AgeGroupForm[])
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
  }, [dataNascimento, idadeAnos, idadeMeses, resolveFaixaEtaria, resolveLabelClinico])

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
  }, [idadeAnos, idadeMeses, dataNascimento, resolveFaixaEtaria, resolveLabelClinico])

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
  }, [idadeCalculada, formFields, secoes])

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
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            alignItems: "end",
            minWidth: 0,
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

            {/* Sexo */}
            <div style={styles.inputGroup}>
              <label style={{ ...styles.label, fontSize: "10px" }}>sexo</label>
              <select
                value={sexo}
                onChange={(e) => setSexo(e.target.value as "M" | "F")}
                style={styles.select()}
              >
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
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
              <div style={{
                ...styles.ageDisplay,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                textAlign: "initial",
              }}>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--puericultura-text)" }}>
                  {faixaEtaria ? `${labelClinico}` : ""}
                </span>
                <span style={{ fontSize: "24px", fontWeight: 800, color: "var(--puericultura-text)" }}>
                  {idadeCalculada}
                </span>
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

            {(() => {
              const devFields = formFields.filter(
                f => f.section === "desenvolvimento" &&
                  f.options?.every(o => ["P", "A", "NV"].includes(o))
              )
              if (devFields.length === 0) return null
              const allP = devFields.every(f => f.value === "P")
              const anyA = devFields.some(f => f.value === "A")

              return (
                <div
                  className="puericultura-result-card"
                  style={{
                    background: "var(--puericultura-card-bg)",
                    border: "1px solid var(--puericultura-border)",
                  }}
                >
                  <div style={styles.sectionLabel}>Desenvolvimento</div>
                  <div style={{
                    background: allP ? "rgba(0, 184, 73, 0.10)" : anyA ? "rgba(234, 179, 8, 0.06)" : "var(--puericultura-card-bg)",
                    border: allP ? "1px solid rgba(0, 184, 73, 0.40)" : anyA ? "1px solid rgba(234, 179, 8, 0.35)" : "1px solid var(--puericultura-border)",
                    borderRadius: "12px",
                    padding: allP || anyA ? "12px 16px" : "12px",
                    marginTop: "12px",
                  }}>
                    {allP ? (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 2, color: "#00cc52" }}>
                          Marcos
                        </div>
                        <div style={{ fontSize: 13, color: "var(--puericultura-text-muted)" }}>
                          Adequados para idade
                        </div>
                      </div>
                    ) : anyA ? (
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
                    ) : (
                      <div style={{
                        fontSize: "13px",
                        color: "var(--puericultura-text-muted)",
                        textAlign: "center" as const,
                        padding: "20px 0",
                      }}>
                        Preencha os dados de desenvolvimento para visualizar a avaliação.
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {formFields.length > 0 && (() => {
              const pesoField = formFields.find(f => f.id === "peso")
              const alturaField = formFields.find(f => f.id === "altura")
              const imcField = formFields.find(f => f.id === "imc")
              const pcField = formFields.find(f => f.id === "pc")

              const peso = parseFloat((pesoField?.value as string) || "0")
              const alturaCm = parseFloat((alturaField?.value as string) || "0")
              const imc = parseFloat((imcField?.value as string) || "0")
              const pc = parseFloat((pcField?.value as string) || "0")
              const anyGrowth = peso > 0 || alturaCm > 0 || imc > 0 || pc > 0

              let ageMonths = 0
              if (idadeAnos || idadeMeses) {
                const anosNum = parseInt(idadeAnos) || 0
                const mesesNum = parseInt(idadeMeses) || 0
                ageMonths = anosNum * 12 + mesesNum
              } else if (dataNascimento) {
                const nasc = new Date(dataNascimento.split('/').reverse().join('-'))
                const hoje = new Date()
                const diffDays = Math.floor((hoje.getTime() - nasc.getTime()) / (1000 * 60 * 60 * 24))
                ageMonths = Math.max(0, diffDays) / 30.4375
              }

              const ageDays = monthsToDays(ageMonths)
              const bmiValue = peso > 0 && alturaCm > 0 ? peso / Math.pow(alturaCm / 100, 2) : 0

              const results: { indicator: string; value: number; z: number; percentile: number; classification: string }[] = []
              const addResult = (ind: Indicator, val: number) => {
                const r = val > 0 ? evaluate(ind, sexo, ageDays, val) : null
                if (r) results.push({ indicator: ind, value: val, ...r })
              }
              addResult("weight", peso)
              addResult("length_height", alturaCm)
              addResult("bmi", bmiValue)
              addResult("head_circ", pc)

              const { abs } = Math
              const zColor = (z: number): string => {
                const a = abs(z)
                if (a <= 1) return "#00b849"
                if (a <= 2) return "#d4a72c"
                if (a <= 3) return "#c1121f"
                return "#7c3aed"
              }
              const resultMap: Record<string, typeof results[0]> = {}
              results.forEach(r => { resultMap[r.indicator] = r })
              const rc = (ind: Indicator) => {
                const r = resultMap[ind]
                return r ? zColor(r.z) : "var(--growth-point, #2454ff)"
              }
              const cardContainer: React.CSSProperties = {
                background: "var(--puericultura-card-bg)",
                border: "1px solid var(--puericultura-border)",
                borderRadius: "10px",
                padding: "12px",
                marginTop: "12px",
              }

              return (
                <div
                  className="puericultura-result-card"
                  style={{
                    background: "var(--puericultura-card-bg)",
                    border: "1px solid var(--puericultura-border)",
                  }}
                >
                  <div style={styles.sectionLabel}>Crescimento</div>
                  {results.length > 0 && (
                    <div style={cardContainer}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        {results.map(r => {
                          const accent = zColor(r.z)
                          return (
                            <div key={r.indicator} style={{
                              background: accent + "12",
                              border: `1px solid ${accent}44`,
                              borderRadius: "12px",
                              padding: "12px 16px",
                            }}>
                              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 2, color: accent }}>
                                {INDICATOR_LABEL[r.indicator as Indicator]}
                              </div>
                              <div style={{ fontSize: 13, color: "var(--puericultura-text-muted)" }}>
                                {r.classification}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {peso > 0 && (
                    <div style={cardContainer}>
                      <GrowthChart
                        indicator="weight"
                        sex={sexo}
                        ageMonths={ageMonths}
                        value={peso}
                        maxMonths={ageMonths > 60 ? ageMonths + 12 : 60}
                        dotColor={rc("weight")}
                      />
                    </div>
                  )}
                  {alturaCm > 0 && (
                    <div style={cardContainer}>
                      <GrowthChart
                        indicator="length_height"
                        sex={sexo}
                        ageMonths={ageMonths}
                        value={alturaCm}
                        maxMonths={ageMonths > 60 ? ageMonths + 12 : 60}
                        dotColor={rc("length_height")}
                      />
                    </div>
                  )}
                  {imc > 0 && (
                    <div style={cardContainer}>
                      <GrowthChart
                        indicator="bmi"
                        sex={sexo}
                        ageMonths={ageMonths}
                        value={peso}
                        heightCm={alturaCm}
                        maxMonths={ageMonths > 60 ? ageMonths + 12 : 60}
                        dotColor={rc("bmi")}
                      />
                    </div>
                  )}
                  {pc > 0 && (
                    <div style={cardContainer}>
                      <GrowthChart
                        indicator="head_circ"
                        sex={sexo}
                        ageMonths={ageMonths}
                        value={pc}
                        maxMonths={ageMonths > 60 ? ageMonths + 12 : 60}
                        dotColor={rc("head_circ")}
                      />
                    </div>
                  )}
                  {!anyGrowth && (
                    <div style={cardContainer}>
                      <div style={{
                        fontSize: "13px",
                        color: "var(--puericultura-text-muted)",
                        textAlign: "center" as const,
                        padding: "20px 0",
                      }}>
                        Preencha os dados de crescimento para visualizar os gráficos.
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

          </div>
        )}
      </div>
    </div>
  )
}