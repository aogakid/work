import * as React from "react"
import {
    OBJETIVO_VAZIO,
    calcularIMC,
    compositarObjetivo,
    maskPA,
    parseObjetivo,
    type Complementar,
    type ExameFisico,
    type Objetivo,
    type SinaisVitais,
} from "../../lib/objetivo"

const estiloRotuloCampo: React.CSSProperties = {
    fontSize: "10px",
    fontWeight: 600,
    letterSpacing: "0.01em",
    color: "var(--editor-text)",
    fontFamily: '"Google Sans Flex", sans-serif',
}

const estiloCampo = {
    fontSize: "12px",
    fontFamily: '"Google Sans Flex", sans-serif',
    color: "var(--editor-text)",
    background: "var(--editor-bg)",
    border: "1px solid var(--editor-border)",
    borderRadius: "6px",
    padding: "6px 8px",
    width: "100%",
    boxSizing: "border-box",
} as React.CSSProperties

const estiloArea = {
    ...estiloCampo,
    resize: "vertical",
    minHeight: "48px",
    lineHeight: 1.45,
    fontFamily: '"Google Sans Flex", sans-serif',
} as React.CSSProperties

const COR_SSVV = "#22c55e"
const COR_EXAME_FISICO = "#10b981"
const COR_COMPLEMENTAR = "#14b8a6"

interface BlocoProps {
    rotulo: string
    cor: string
    children: React.ReactNode
    colapsavel?: boolean
    abertoInicial?: boolean
    semBordaSuperior?: boolean
}

function Bloco({ rotulo, cor, children, colapsavel = false, abertoInicial = true, semBordaSuperior = false }: BlocoProps) {
    const [aberto, setAberto] = React.useState(abertoInicial)
    const alternar = () => setAberto(prev => !prev)

    const cabecalho = (
        <>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cor, display: "inline-block", flexShrink: 0 }} />
            <span style={{ flex: "1 1 auto", textAlign: "left" }}>{rotulo}</span>
            {colapsavel ? (
                <span style={{ fontSize: "10px", lineHeight: 1, color: cor, transform: aberto ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 120ms ease", display: "inline-block" }}>▼</span>
            ) : null}
        </>
    )

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: aberto ? "10px" : "8px", paddingTop: "12px", marginTop: "4px", borderTop: semBordaSuperior ? "none" : "1px solid var(--editor-border)" }}>
            {colapsavel ? (
                <button
                    type="button"
                    onClick={alternar}
                    aria-expanded={aberto}
                    style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%", background: "transparent", border: "none", padding: "0", cursor: "pointer", fontSize: "11px", fontWeight: 700, color: cor, fontFamily: '"Google Sans Flex", sans-serif' }}
                >
                    {cabecalho}
                </button>
            ) : (
                <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: cor, fontFamily: '"Google Sans Flex", sans-serif' }}>
                    {cabecalho}
                </span>
            )}
            {aberto || !colapsavel ? children : null}
        </div>
    )
}

function CampoRotulado({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <span style={estiloRotuloCampo}>{rotulo}</span>
            {children}
        </div>
    )
}

export interface ObjetivoFormProps {
    value: string
    onChange: (v: string) => void
    mostrarPrenatal?: boolean
}

export function ObjetivoForm({ value, onChange, mostrarPrenatal = false }: ObjetivoFormProps) {
    const [, setCampos] = React.useState<Objetivo>(OBJETIVO_VAZIO)
    const emitidoRef = React.useRef<string | null>(null)

    React.useEffect(() => {
        if (emitidoRef.current === value) return
        emitidoRef.current = value
        setCampos(parseObjetivo(value))
    }, [value])

    const aplicar = React.useCallback((proximo: Objetivo) => {
        setCampos(proximo)
        const texto = compositarObjetivo(proximo)
        emitidoRef.current = texto
        onChange(texto)
    }, [onChange])

    const alterarSsvv = React.useCallback((chave: keyof SinaisVitais, novo: string) => {
        const base = parseObjetivo(value)
        let val = novo
        if (chave === "pa") {
            val = maskPA(novo)
        } else if (chave === "altura") {
            val = novo.replace(/[,.]/g, "")
        }
        const ssvvAtualizado = { ...base.ssvv, [chave]: val }
        if (chave === "peso" || chave === "altura") {
            const imcCalc = calcularIMC(ssvvAtualizado.peso, ssvvAtualizado.altura)
            if (imcCalc) {
                ssvvAtualizado.imc = imcCalc
            }
        }
        aplicar({ ...base, ssvv: ssvvAtualizado })
    }, [aplicar, value])

    const alterarExameFisico = React.useCallback((chave: keyof ExameFisico, novo: string) => {
        const base = parseObjetivo(value)
        aplicar({ ...base, exameFisico: { ...base.exameFisico, [chave]: novo } })
    }, [aplicar, value])

    const alterarComplementar = React.useCallback((chave: keyof Complementar, novo: string) => {
        const base = parseObjetivo(value)
        aplicar({ ...base, complementar: { ...base.complementar, [chave]: novo } })
    }, [aplicar, value])

    const alterarPrenatal = React.useCallback((chave: keyof ExameFisico["prenatal"], novo: string) => {
        const base = parseObjetivo(value)
        aplicar({ ...base, exameFisico: { ...base.exameFisico, prenatal: { ...base.exameFisico.prenatal, [chave]: novo } } })
    }, [aplicar, value])

    const ssvvCampos = React.useMemo(() => parseObjetivo(value).ssvv, [value])
    const exameFisicoCampos = React.useMemo(() => parseObjetivo(value).exameFisico, [value])
    const complementarCampos = React.useMemo(() => parseObjetivo(value).complementar, [value])

    const camposSsvvMeta: { chave: keyof SinaisVitais; rotulo: string }[] = [
        { chave: "pa", rotulo: "PA" },
        { chave: "peso", rotulo: "Peso (kg)" },
        { chave: "altura", rotulo: "Altura (cm)" },
        { chave: "imc", rotulo: "IMC" },
        { chave: "glicemia", rotulo: "Glicemia (mg/dL)" },
        { chave: "fc", rotulo: "FC (bpm)" },
        { chave: "fr", rotulo: "FR (irpm)" },
        { chave: "spo2", rotulo: "SPO2 (%)" },
        { chave: "tax", rotulo: "Temperatura (Tax)" },
    ]

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "8px 0 12px 0" }}>
            <Bloco rotulo="Sinais Vitais" cor={COR_SSVV} semBordaSuperior>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 8px" }}>
                    {camposSsvvMeta.map(item => (
                        <div key={item.chave} style={{ display: "flex", flexDirection: "column", gap: "3px", flex: "0 1 112px", minWidth: "100px" }}>
                            <span style={estiloRotuloCampo}>{item.rotulo}</span>
                            <input
                                data-campo={item.chave}
                                value={ssvvCampos[item.chave]}
                                onChange={e => alterarSsvv(item.chave, e.target.value)}
                                readOnly={item.chave === "imc"}
                                aria-readonly={item.chave === "imc"}
                                style={item.chave === "imc" ? { ...estiloCampo, opacity: 0.75, cursor: "default" } : estiloCampo}
                            />
                        </div>
                    ))}
                </div>
            </Bloco>

            <Bloco rotulo="Exame físico" cor={COR_EXAME_FISICO} colapsavel abertoInicial={false}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {mostrarPrenatal ? (
                        <Bloco rotulo="Pré-natal" cor={COR_EXAME_FISICO} colapsavel abertoInicial={false}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 8px" }}>
                                {([ ["au", "AU"], ["bcf", "BCF"], ["mf", "MF"], ["apresentacao", "Apresentação"] ] as const).map(([key, label]) => (
                                    <div key={key} style={{ display: "flex", flexDirection: "column", gap: "3px", flex: "0 1 112px", minWidth: "100px" }}>
                                        <span style={estiloRotuloCampo}>{label}</span>
                                        <input data-campo={`prenatal-${key}`} value={exameFisicoCampos.prenatal[key]} onChange={e => alterarPrenatal(key, e.target.value)} style={estiloCampo} />
                                    </div>
                                ))}
                            </div>
                        </Bloco>
                    ) : null}
                    <CampoRotulado rotulo="Ectoscopia (Ect)">
                        <input
                            data-campo="ect"
                            value={exameFisicoCampos.ect}
                            onChange={e => alterarExameFisico("ect", e.target.value)}
                            style={estiloCampo}
                        />
                    </CampoRotulado>
                    <CampoRotulado rotulo="Aparelho Cardiovascular (AC)">
                        <input
                            data-campo="ac"
                            value={exameFisicoCampos.ac}
                            onChange={e => alterarExameFisico("ac", e.target.value)}
                            style={estiloCampo}
                        />
                    </CampoRotulado>
                    <CampoRotulado rotulo="Aparelho Respiratório (AR)">
                        <input
                            data-campo="ar"
                            value={exameFisicoCampos.ar}
                            onChange={e => alterarExameFisico("ar", e.target.value)}
                            style={estiloCampo}
                        />
                    </CampoRotulado>
                    <CampoRotulado rotulo="Extremidades (Ext)">
                        <input
                            data-campo="ext"
                            value={exameFisicoCampos.ext}
                            onChange={e => alterarExameFisico("ext", e.target.value)}
                            style={estiloCampo}
                        />
                    </CampoRotulado>
                    <CampoRotulado rotulo="Outros">
                        <textarea
                            data-campo="outros"
                            value={exameFisicoCampos.outros}
                            rows={2}
                            onChange={e => alterarExameFisico("outros", e.target.value)}
                            style={estiloArea}
                        />
                    </CampoRotulado>
                </div>
            </Bloco>

            <Bloco rotulo="Exames complementares" cor={COR_COMPLEMENTAR} colapsavel abertoInicial={false}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <CampoRotulado rotulo="Laboratório">
                        <textarea
                            data-campo="laboratorio"
                            value={complementarCampos.laboratorio}
                            rows={2}
                            onChange={e => alterarComplementar("laboratorio", e.target.value)}
                            style={estiloArea}
                        />
                    </CampoRotulado>
                    <CampoRotulado rotulo="Imagem">
                        <textarea
                            data-campo="imagem"
                            value={complementarCampos.imagem}
                            rows={2}
                            onChange={e => alterarComplementar("imagem", e.target.value)}
                            style={estiloArea}
                        />
                    </CampoRotulado>
                    <CampoRotulado rotulo="Escores">
                        <textarea
                            data-campo="escores"
                            value={complementarCampos.escores}
                            rows={2}
                            onChange={e => alterarComplementar("escores", e.target.value)}
                            style={estiloArea}
                        />
                    </CampoRotulado>
                </div>
            </Bloco>
        </div>
    )
}
