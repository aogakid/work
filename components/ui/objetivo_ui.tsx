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
import { broadcastFieldSync, listenFieldSync } from "../companions/field-sync"
import { CaixaParagrafos } from "./caixa_paragrafos"
import { INSERCOES_NEGA_OBJETIVO } from "../../lib/negas"

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

const COR_SSVV = "#22c55e"
const COR_EXAME_FISICO = "#10b981"
const COR_COMPLEMENTAR = "#14b8a6"

function categoriaIMC(valor: string): { label: string; color: string; background: string } | null {
    const imc = Number.parseFloat((valor || "").replace(",", "."))
    if (!Number.isFinite(imc) || imc <= 0) return null
    if (imc < 18.5) return { label: "Baixo peso", color: "#ef4444", background: "rgba(239,68,68,0.10)" }
    if (imc < 25) return { label: "Adequado", color: "#22c55e", background: "rgba(34,197,94,0.10)" }
    if (imc < 30) return { label: "Sobrepeso", color: "#eab308", background: "rgba(234,179,8,0.12)" }
    if (imc < 35) return { label: "Obesidade I", color: "#f97316", background: "rgba(249,115,22,0.10)" }
    if (imc < 40) return { label: "Obesidade II", color: "#ef4444", background: "rgba(239,68,68,0.10)" }
    return { label: "Obesidade III", color: "#a855f7", background: "rgba(168,85,247,0.10)" }
}

interface BlocoProps {
    rotulo: string
    cor: string
    children: React.ReactNode
    colapsavel?: boolean
    abertoInicial?: boolean
    forcarAbertura?: number
    forcarFechamento?: number
    semBordaSuperior?: boolean
    resumo?: React.ReactNode
}

function Bloco({ rotulo, cor, children, colapsavel = false, abertoInicial = true, forcarAbertura, forcarFechamento, semBordaSuperior = false, resumo }: BlocoProps) {
    const [aberto, setAberto] = React.useState(abertoInicial)
    const alternar = () => setAberto(prev => !prev)
    React.useEffect(() => {
        if (forcarAbertura === undefined) return
        setAberto(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [forcarAbertura])
    React.useEffect(() => {
        if (forcarFechamento === undefined) return
        setAberto(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [forcarFechamento])

    const cabecalho = (
        <>
            <svg width="9" height="11" viewBox="0 0 9 11" aria-hidden="true" style={{ display: "inline-block", flexShrink: 0 }}>
                <path d="M1.5 0.75h6v9.5L4.5 8.1l-3 2.15z" fill={cor} />
            </svg>
            <span style={{ flex: "1 1 auto", textAlign: "left" }}>{rotulo}</span>
            {colapsavel ? (
                <span style={{ fontSize: "10px", lineHeight: 1, color: cor, transform: aberto ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 120ms ease", display: "inline-block" }}>▼</span>
            ) : null}
        </>
    )

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: aberto ? "10px" : "8px", paddingTop: semBordaSuperior ? "0" : "12px", marginTop: semBordaSuperior ? "0" : "4px", borderTop: semBordaSuperior ? "none" : "1px solid var(--editor-border)" }}>
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
            {resumo}
            {aberto || !colapsavel ? children : null}
        </div>
    )
}

function BotaoNega({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title="Inserir texto predefinido"
            aria-label="Inserir texto predefinido"
            style={{ width: "20px", height: "20px", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0, border: "none", borderRadius: "4px", background: "transparent", color: "var(--meta-text)", opacity: 0.75, cursor: "pointer", flexShrink: 0 }}
        >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="m5.6 5.6 12.8 12.8" />
            </svg>
        </button>
    )
}

function CampoRotulado({ rotulo, children, onNega }: { rotulo: string; children: React.ReactNode; onNega?: () => void }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: onNega ? "20px" : undefined }}>
                <span style={estiloRotuloCampo}>{rotulo}</span>
                {onNega ? <BotaoNega onClick={onNega} /> : null}
            </div>
            {children}
        </div>
    )
}

export interface ObjetivoFormProps {
    value: string
    onChange: (v: string) => void
    idade?: number | null
    mostrarPrenatal?: boolean
    mostrarPuericultura?: boolean
    expandirNaoVazios?: number
    recolherCampos?: number
}

export function ObjetivoForm({ value, onChange, idade = null, mostrarPrenatal = false, mostrarPuericultura = false, expandirNaoVazios, recolherCampos }: ObjetivoFormProps) {
    const [campos, setCampos] = React.useState<Objetivo>(OBJETIVO_VAZIO)
    const emitidoRef = React.useRef<string | null>(null)
    const sincronizandoRef = React.useRef(false)

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
        let val = novo
        if (chave === "pa") {
            val = maskPA(novo)
        }
        const ssvvAtualizado = { ...campos.ssvv, [chave]: val }
        if (chave === "peso" || chave === "altura") {
            const imcCalc = calcularIMC(ssvvAtualizado.peso, ssvvAtualizado.altura)
            if (imcCalc) {
                ssvvAtualizado.imc = imcCalc
            }
        }
        aplicar({ ...campos, ssvv: ssvvAtualizado })
    }, [aplicar, campos])

    const alterarExameFisico = React.useCallback((chave: keyof ExameFisico, novo: string) => {
        aplicar({ ...campos, exameFisico: { ...campos.exameFisico, [chave]: novo } })
    }, [aplicar, campos])

    const alterarCrescimentoDesenvolvimento = React.useCallback((novo: string) => {
        aplicar({ ...campos, crescimentoDesenvolvimento: novo })
    }, [aplicar, campos])

    const alterarComplementar = React.useCallback((chave: keyof Complementar, novo: string) => {
        aplicar({ ...campos, complementar: { ...campos.complementar, [chave]: novo } })
    }, [aplicar, campos])

    const alterarPrenatal = React.useCallback((chave: keyof ExameFisico["prenatal"], novo: string) => {
        aplicar({ ...campos, exameFisico: { ...campos.exameFisico, prenatal: { ...campos.exameFisico.prenatal, [chave]: novo } } })
    }, [aplicar, campos])

    const ssvvCampos = campos.ssvv
    const crescimentoDesenvolvimento = campos.crescimentoDesenvolvimento
    const exameFisicoCampos = campos.exameFisico
    const complementarCampos = campos.complementar
    const classificacaoIMC = idade !== null && idade > 18 ? categoriaIMC(ssvvCampos.imc) : null

    /* Open state for the collapsible blocks, derived from the serialised value so
       it is fresh on the same render the paste trigger arrives. */
    const conteudoValue = React.useMemo(() => parseObjetivo(value), [value])
    const temSsvv = Object.values(conteudoValue.ssvv).some(v => v.trim() !== "")
    const temPrenatal = Object.values(conteudoValue.exameFisico.prenatal).some(v => v.trim() !== "")
    const temExameFisico = conteudoValue.exameFisico.ect.trim() !== "" || conteudoValue.exameFisico.ac.trim() !== "" || conteudoValue.exameFisico.ar.trim() !== "" || conteudoValue.exameFisico.ext.trim() !== "" || conteudoValue.exameFisico.outros.trim() !== "" || temPrenatal
    const temComplementar = Object.values(conteudoValue.complementar).some(v => v.trim() !== "")

    React.useEffect(() => {
        if (sincronizandoRef.current) {
            sincronizandoRef.current = false
            return
        }
        broadcastFieldSync("objetivo", { pa: ssvvCampos.pa, peso: ssvvCampos.peso, altura: ssvvCampos.altura })
    }, [ssvvCampos.pa, ssvvCampos.peso, ssvvCampos.altura])

    React.useEffect(() => listenFieldSync(({ source, values }) => {
        if (source === "objetivo" || (values.pa === undefined && values.peso === undefined && values.altura === undefined)) return
        const ssvv = { ...campos.ssvv }
        if (values.pa !== undefined) {
            if (source === "escores" && values.pa) {
                const diastolica = campos.ssvv.pa.match(/[x×/]\s*(\d+)/)?.[1]
                ssvv.pa = `${values.pa}${diastolica ? `x${diastolica}` : ""}`
            } else {
                ssvv.pa = values.pa
            }
        }
        if (values.peso !== undefined) ssvv.peso = values.peso
        if (values.altura !== undefined) ssvv.altura = values.altura
        if (ssvv.pa === campos.ssvv.pa && ssvv.peso === campos.ssvv.peso && ssvv.altura === campos.ssvv.altura) return
        const imc = calcularIMC(ssvv.peso, ssvv.altura)
        if (imc) ssvv.imc = imc
        sincronizandoRef.current = true
        aplicar({ ...campos, ssvv })
    }), [campos, aplicar])

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
    const camposResumo = camposSsvvMeta.slice(0, 4).filter(item => item.chave !== "pa" || idade === null || idade >= 18)

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "8px 0 12px 0" }}>
            <Bloco rotulo="Sinais Vitais" cor={COR_SSVV} semBordaSuperior colapsavel abertoInicial={temSsvv} forcarAbertura={expandirNaoVazios} forcarFechamento={recolherCampos} resumo={(
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 8px" }}>
                    {camposResumo.map(item => (
                        <div key={item.chave} style={{ display: "flex", flexDirection: "column", gap: "3px", flex: "0 1 112px", minWidth: "100px" }}>
                            <span style={estiloRotuloCampo}>
                                {item.rotulo}
                                {item.chave === "imc" && classificacaoIMC ? <span style={{ marginLeft: "5px", color: classificacaoIMC.color, fontWeight: 700 }}>{classificacaoIMC.label}</span> : null}
                            </span>
                            <input
                                data-campo={item.chave}
                                value={ssvvCampos[item.chave]}
                                onChange={e => alterarSsvv(item.chave, e.target.value)}
                                readOnly={item.chave === "imc"}
                                aria-readonly={item.chave === "imc"}
                                style={item.chave === "imc" ? { ...estiloCampo, opacity: 0.9, cursor: "default", borderColor: classificacaoIMC?.color || "var(--editor-border)", background: classificacaoIMC?.background || "var(--editor-bg)" } : estiloCampo}
                            />
                        </div>
                    ))}
                </div>
            )}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 8px" }}>
                    {camposSsvvMeta.slice(4).filter(item => item.chave !== "pa" || idade === null || idade >= 18).map(item => (
                        <div key={item.chave} style={{ display: "flex", flexDirection: "column", gap: "3px", flex: "0 1 112px", minWidth: "100px" }}>
                            <span style={estiloRotuloCampo}>{item.rotulo}</span>
                            <input
                                data-campo={item.chave}
                                value={ssvvCampos[item.chave]}
                                onChange={e => alterarSsvv(item.chave, e.target.value)}
                                style={estiloCampo}
                            />
                        </div>
                    ))}
                </div>
            </Bloco>

            {mostrarPuericultura ? (
                <Bloco rotulo="Crescimento e desenvolvimento" cor={COR_EXAME_FISICO} colapsavel abertoInicial={true} forcarFechamento={recolherCampos}>
                    <CaixaParagrafos
                        dados={{ "data-campo": "crescimento-desenvolvimento" }}
                        value={crescimentoDesenvolvimento}
                        onChange={valor => alterarCrescimentoDesenvolvimento(valor)}
                    />
                </Bloco>
            ) : null}

            <Bloco rotulo="Exame físico" cor={COR_EXAME_FISICO} colapsavel abertoInicial={temExameFisico} forcarAbertura={expandirNaoVazios} forcarFechamento={recolherCampos}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {mostrarPrenatal ? (
                        <Bloco rotulo="Pré-natal" cor={COR_EXAME_FISICO} colapsavel abertoInicial={temPrenatal} forcarAbertura={expandirNaoVazios}>
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
                    <CampoRotulado rotulo="Ectoscopia (Ect)" onNega={() => alterarExameFisico("ect", INSERCOES_NEGA_OBJETIVO.ect)}>
                        <input
                            data-campo="ect"
                            value={exameFisicoCampos.ect}
                            onChange={e => alterarExameFisico("ect", e.target.value)}
                            style={estiloCampo}
                        />
                    </CampoRotulado>
                    <CampoRotulado rotulo="Aparelho Cardiovascular (AC)" onNega={() => alterarExameFisico("ac", INSERCOES_NEGA_OBJETIVO.ac)}>
                        <input
                            data-campo="ac"
                            value={exameFisicoCampos.ac}
                            onChange={e => alterarExameFisico("ac", e.target.value)}
                            style={estiloCampo}
                        />
                    </CampoRotulado>
                    <CampoRotulado rotulo="Aparelho Respiratório (AR)" onNega={() => alterarExameFisico("ar", INSERCOES_NEGA_OBJETIVO.ar)}>
                        <input
                            data-campo="ar"
                            value={exameFisicoCampos.ar}
                            onChange={e => alterarExameFisico("ar", e.target.value)}
                            style={estiloCampo}
                        />
                    </CampoRotulado>
                    <CampoRotulado rotulo="Extremidades (Ext)" onNega={() => alterarExameFisico("ext", INSERCOES_NEGA_OBJETIVO.ext)}>
                        <input
                            data-campo="ext"
                            value={exameFisicoCampos.ext}
                            onChange={e => alterarExameFisico("ext", e.target.value)}
                            style={estiloCampo}
                        />
                    </CampoRotulado>
                    <CampoRotulado rotulo="Outros">
                        <CaixaParagrafos
                            dados={{ "data-campo": "outros" }}
                            value={exameFisicoCampos.outros}
                            onChange={valor => alterarExameFisico("outros", valor)}
                        />
                    </CampoRotulado>
                </div>
            </Bloco>

            <Bloco rotulo="Exames complementares" cor={COR_COMPLEMENTAR} colapsavel abertoInicial={temComplementar} forcarAbertura={expandirNaoVazios} forcarFechamento={recolherCampos}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <CampoRotulado rotulo="Laboratório">
                        <CaixaParagrafos
                            dados={{ "data-campo": "laboratorio" }}
                            value={complementarCampos.laboratorio}
                            onChange={valor => alterarComplementar("laboratorio", valor)}
                        />
                    </CampoRotulado>
                    <CampoRotulado rotulo="Imagem">
                        <CaixaParagrafos
                            dados={{ "data-campo": "imagem" }}
                            value={complementarCampos.imagem}
                            onChange={valor => alterarComplementar("imagem", valor)}
                        />
                    </CampoRotulado>
                    <CampoRotulado rotulo="Escores">
                        <CaixaParagrafos
                            dados={{ "data-campo": "escores" }}
                            value={complementarCampos.escores}
                            onChange={valor => alterarComplementar("escores", valor)}
                        />
                    </CampoRotulado>
                    <CampoRotulado rotulo="Rastreios">
                        <CaixaParagrafos
                            dados={{ "data-campo": "rastreios" }}
                            value={complementarCampos.rastreios}
                            onChange={valor => alterarComplementar("rastreios", valor)}
                        />
                    </CampoRotulado>
                </div>
            </Bloco>
        </div>
    )
}
