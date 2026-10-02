import * as React from "react"
import {
    ANTECEDENTES_CAMPOS,
    DADOS_BASE_VAZIO,
    HABITOS_CAMPOS,
    LISTA_PROBLEMAS_VAZIO,
    MEDICAMENTOS_CAMPOS,
    compositarDadosBase,
    compositarListaProblemas,
    parseDadosBase,
    parseListaProblemas,
    type Antecedentes,
    type DadosBase,
    type Habitos,
    type ListaProblemas,
    type Medicamentos,
} from "../../lib/dados-base"
import {
    OPCOES_ESCOLARIDADE,
    OPCOES_ESTADO_CIVIL,
    OPCOES_SEXO,
    compositarIdentificacao,
    definirSexoContexto,
    parseIdentificacao,
    type IdentificacaoCampos,
} from "../../lib/contexto-paciente"
import { broadcastFieldSync, getFieldSyncSnapshot, listenFieldSync } from "../companions/field-sync"

/* ── Identificação fields (owned by Dados base, stored as the "- Id:" line) ── */

const CAMPOS_ID: { chave: keyof IdentificacaoCampos; rotulo: string; largo: boolean; sempreVisivel?: boolean }[] = [
    { chave: "nome", rotulo: "Nome", largo: true, sempreVisivel: true },
    { chave: "idade", rotulo: "Idade", largo: false, sempreVisivel: true },
    { chave: "sexo", rotulo: "Sexo", largo: false, sempreVisivel: true },
    { chave: "acs", rotulo: "ACS", largo: false, sempreVisivel: true },
    { chave: "estadoCivil", rotulo: "Estado civil", largo: false },
    { chave: "composicao", rotulo: "Composição familiar", largo: true },
    { chave: "religiao", rotulo: "Religião", largo: false },
    { chave: "escolaridade", rotulo: "Escolaridade", largo: true },
    { chave: "ocupacao", rotulo: "Ocupação", largo: true },
    { chave: "naturalidade", rotulo: "Naturalidade", largo: false },
    { chave: "residencia", rotulo: "Residência", largo: true },
    { chave: "procedencia", rotulo: "Procedência", largo: true },
]

/* ── Shared styles ─────────────────────────────────────────────────── */

const estiloRotuloCampo: React.CSSProperties = {
    fontSize: "10px",
    fontWeight: 600,
    letterSpacing: "0.01em",
    color: "var(--editor-text)",
    fontFamily: '"Google Sans Flex", sans-serif',
}

const estiloCampo = {
    fontSize: "12px",
    fontWeight: 400,
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
    minHeight: "52px",
    lineHeight: 1.45,
    fontFamily: '"Google Sans Flex", sans-serif',
} as React.CSSProperties

const COR_IDENTIFICACAO = "#ec4899"
const COR_ANTECEDENTES = "#8b5cf6"
const COR_HABITOS = "#0ea5e9"

function idadeEmAnos(campos: IdentificacaoCampos): string {
    const idade = Number.parseInt(campos.idade.trim(), 10)
    if (!Number.isFinite(idade)) return ""
    const anos = campos.idadeUnidade === "D" ? idade / 365.25 : campos.idadeUnidade === "M" ? idade / 12 : idade
    return String(Number(anos.toFixed(4)))
}

interface BlocoProps {
    rotulo: string
    cor: string
    children: React.ReactNode
    sempreVisivelChildren?: React.ReactNode
    colapsavel?: boolean
    abertoInicial?: boolean
    semBordaSuperior?: boolean
}

/* Sections the user never touched start folded away, so the left column opens
   straight onto Identificação instead of a wall of empty inputs. */
function Bloco({ rotulo, cor, children, sempreVisivelChildren, colapsavel = false, abertoInicial = true, semBordaSuperior = false }: BlocoProps) {
    const [aberto, setAberto] = React.useState(abertoInicial)
    const alternar = () => setAberto(prev => !prev)

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
        <div style={{ display: "flex", flexDirection: "column", gap: aberto ? "10px" : "8px", paddingTop: semBordaSuperior ? "0" : "12px", marginTop: semBordaSuperior ? "0" : "4px", ...(semBordaSuperior ? {} : { borderTop: "1px solid var(--editor-border)" }) }}>
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
            {sempreVisivelChildren}
            {aberto || !colapsavel ? children : null}
        </div>
    )
}

function SubGrupo({ rotulo, children }: CampoRotuloProps) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingLeft: "10px", borderLeft: "2px solid var(--editor-border)" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--meta-text)", fontFamily: '"Google Sans Flex", sans-serif' }}>{rotulo}</span>
            {children}
        </div>
    )
}

interface CampoRotuloProps {
    rotulo: string
    children: React.ReactNode
    onNega?: () => void
}

function BotaoNega({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title="Registrar nega"
            aria-label="Registrar nega"
            style={{ width: "20px", height: "20px", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0, border: "none", borderRadius: "4px", background: "transparent", color: "var(--meta-text)", opacity: 0.75, cursor: "pointer", flexShrink: 0 }}
        >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="m5.6 5.6 12.8 12.8" />
            </svg>
        </button>
    )
}

function CampoRotulado({ rotulo, children, onNega }: CampoRotuloProps) {
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

/* ── Dados base ────────────────────────────────────────────────────── */

export interface DadosBaseFormProps {
    value: string
    onChange: (v: string) => void
    onSexoChange?: (sexo: "M" | "F" | "") => void
}

/* The whole "## Dados base" block lives in `value` as template-shaped text.
   Every edit re-parses it, patches one field and re-composites, so the stored
   text always mirrors the current consulta agendada template.
   Sexo is the one exception: it is never serialised, so it lives in state and is
   only published to the companion bus. */
export function DadosBaseForm({ value, onChange, onSexoChange }: DadosBaseFormProps) {
    const [campos, setCampos] = React.useState<DadosBase>(DADOS_BASE_VAZIO)
    const [idCampos, setIdCampos] = React.useState<IdentificacaoCampos>(parseIdentificacao(""))
    const emitidoRef = React.useRef<string | null>(null)
    const idEmitidoRef = React.useRef<string | null>(null)

    React.useEffect(() => {
        if (emitidoRef.current === value) return
        emitidoRef.current = value
        setCampos(parseDadosBase(value))
    }, [value])

    /* Re-parse the id line only when it changed from outside this form. The line is
       a lossy, heuristic serialisation ("cat" alone is not recognisable as religião),
       so re-parsing our own output on every keystroke moves a half-typed value into
       whichever field the regexes happen to match. */
    React.useEffect(() => {
        if (idEmitidoRef.current === campos.id) return
        idEmitidoRef.current = campos.id
        setIdCampos(prev => ({ ...parseIdentificacao(campos.id), sexo: prev.sexo }))
    }, [campos.id])

    const aplicar = React.useCallback((proximo: DadosBase) => {
        setCampos(proximo)
        const linha = compositarDadosBase(proximo)
        emitidoRef.current = linha
        onChange(linha)
    }, [onChange])

    /* Publish idade/sexo so escores, exames, rastreios and puericultura receive them.
       Only once both are known, otherwise clearing a field would push an empty value
       into the shared snapshot and wipe the siblings. */
    const publicarContexto = React.useCallback((idade: string, sexo: string) => {
        broadcastFieldSync("id", { idade, sexo }, true)
    }, [])

    const commitId = React.useCallback((novo: IdentificacaoCampos) => {
        setIdCampos(novo)
        const linha = compositarIdentificacao(novo)
        const base = { ...parseDadosBase(value), id: linha }
        setCampos(base)
        const texto = compositarDadosBase(base)
        emitidoRef.current = texto
        idEmitidoRef.current = linha
        onChange(texto)
    }, [onChange, value])

    const alterarIdCampo = React.useCallback((chave: keyof IdentificacaoCampos, novo: string) => {
        const anterior = idCampos
        const atualizado: IdentificacaoCampos = { ...anterior, [chave]: novo }
        commitId(atualizado)
        publicarContexto(idadeEmAnos(atualizado), atualizado.sexo)
    }, [commitId, idCampos, publicarContexto])

    const alterarUnidadeIdade = React.useCallback((unidade: "D" | "M" | "A") => {
        const atualizado = { ...idCampos, idadeUnidade: unidade }
        commitId(atualizado)
        publicarContexto(idadeEmAnos(atualizado), atualizado.sexo)
    }, [commitId, idCampos, publicarContexto])

    const alterarSexo = React.useCallback((bruto: string) => {
        const sexo: "M" | "F" | "" = bruto === "M" || bruto === "F" ? bruto : ""
        const anterior = idCampos
        setIdCampos({ ...anterior, sexo })
        definirSexoContexto(sexo)
        if (onSexoChange) onSexoChange(sexo)
        publicarContexto(idadeEmAnos(anterior), sexo)
    }, [idCampos, onSexoChange, publicarContexto])

    const handleChangeCampo = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const attr = e.target.getAttribute("data-campo")
        if (!attr) return
        alterarIdCampo(attr as keyof IdentificacaoCampos, e.target.value)
    }, [alterarIdCampo])

    const handleSexo = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        alterarSexo(e.target.value)
    }, [alterarSexo])

    const handleEstadoCivil = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        alterarIdCampo("estadoCivil", e.target.value)
    }, [alterarIdCampo])

    const handleEscolaridade = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        alterarIdCampo("escolaridade", e.target.value)
    }, [alterarIdCampo])

    /* Adopt idade/sexo coming from a sibling companion (escores, exames, rastreios). */
    React.useEffect(() => {
        /* Remounted companions replay a snapshot on mount. Ignore it while this
           consultation has already been filled in, otherwise the form would
           re-adopt stale values after a reset/reload. */
        if (idCampos.idade.trim() || idCampos.sexo) return

        const aplicarRecebido = (idade: string | undefined, sexo: string | undefined) => {
            let mudou = false
            const novo: IdentificacaoCampos = { ...idCampos }
            if (idade !== undefined && idade.trim() && idade.trim() !== novo.idade.trim()) {
                novo.idade = idade.trim()
                novo.idadeUnidade = "A"
                mudou = true
            }
            if (sexo === "M" || sexo === "F") {
                if (sexo !== novo.sexo) {
                    novo.sexo = sexo
                    mudou = true
                }
            }
            if (!mudou) return
            commitId(novo)
            if (novo.sexo !== sexo) {
                definirSexoContexto(novo.sexo === "M" || novo.sexo === "F" ? novo.sexo : "")
                if (onSexoChange) onSexoChange(novo.sexo === "M" || novo.sexo === "F" ? novo.sexo : "")
            }
        }

        const snap = getFieldSyncSnapshot()
        if (snap.idade !== undefined || snap.sexo !== undefined) {
            aplicarRecebido(snap.idade, snap.sexo)
        }

        return listenFieldSync(({ source, values }) => {
            if (source === "id") return
            aplicarRecebido(values.idade, values.sexo)
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idCampos, commitId, onSexoChange])

    const alterarAntecedente = React.useCallback((chave: keyof Antecedentes, novo: string) => {
        const base = parseDadosBase(value)
        aplicar({ ...base, antecedentes: { ...base.antecedentes, [chave]: novo } })
        if (chave === "dum") broadcastFieldSync("dados_base", { dum: novo }, true)
    }, [aplicar, value])

    React.useEffect(() => listenFieldSync(({ source, values }) => {
        if (source !== "prenatal" || values.dum === undefined) return
        const base = parseDadosBase(value)
        if (base.antecedentes.dum === values.dum) return
        aplicar({ ...base, antecedentes: { ...base.antecedentes, dum: values.dum } })
    }), [aplicar, value])

    const initialDum = React.useRef(parseDadosBase(value).antecedentes.dum)
    React.useEffect(() => {
        const dum = initialDum.current
        if (dum) broadcastFieldSync("dados_base", { dum }, true)
    }, [])

    const alterarMedicamento = React.useCallback((chave: keyof Medicamentos, novo: string) => {
        const base = parseDadosBase(value)
        aplicar({ ...base, medicamentos: { ...base.medicamentos, [chave]: novo } })
    }, [aplicar, value])

    const alterarHabito = React.useCallback((chave: keyof Habitos, novo: string) => {
        const base = parseDadosBase(value)
        aplicar({ ...base, habitos: { ...base.habitos, [chave]: novo } })
    }, [aplicar, value])

    const antecedentesCampos = React.useMemo(() => parseDadosBase(value).antecedentes, [value])
    const medicamentosCampos = React.useMemo(() => parseDadosBase(value).medicamentos, [value])
    const habitosCampos = React.useMemo(() => parseDadosBase(value).habitos, [value])
    const temAntecedentes = React.useMemo(() => Object.values(antecedentesCampos).some(v => v.trim() !== ""), [antecedentesCampos])

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "8px 0 12px 0" }}>
            <Bloco
                rotulo="Identificação"
                cor={COR_IDENTIFICACAO}
                colapsavel
                abertoInicial={false}
                semBordaSuperior
                sempreVisivelChildren={
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 8px" }}>
                        {CAMPOS_ID.filter(c => c.sempreVisivel).map(campo => (
                            <div key={campo.chave} style={{ display: "flex", flexDirection: "column", gap: "3px", flex: campo.chave === "nome" ? "1 1 100%" : campo.chave === "idade" ? "0 0 104px" : campo.chave === "sexo" ? "0 1 78px" : campo.largo ? "1 1 180px" : "0 1 118px", minWidth: campo.chave === "nome" ? "100%" : "104px" }}>
                                <span style={estiloRotuloCampo}>{campo.rotulo}</span>
                                {campo.chave === "sexo" ? (
                                    <select
                                        data-campo={campo.chave}
                                        value={idCampos.sexo}
                                        onChange={handleSexo}
                                        style={estiloCampo}
                                    >
                                        <option value="">...</option>
                                        {OPCOES_SEXO.map(op => (
                                            <option key={op.valor} value={op.valor}>{op.rotulo}</option>
                                        ))}
                                    </select>
                                ) : campo.chave === "idade" ? (
                                    <div style={{ display: "flex", alignItems: "stretch", gap: "3px", minWidth: 0 }}>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            data-campo={campo.chave}
                                            value={idCampos.idade}
                                            onChange={handleChangeCampo}
                                            style={{ ...estiloCampo, fontWeight: 700, flex: "0 0 42px", width: "42px", minWidth: 0, paddingLeft: "6px", paddingRight: "4px" }}
                                        />
                                        <div role="group" aria-label="Unidade da idade" style={{ display: "flex", alignItems: "center", gap: "1px", padding: "2px", borderRadius: "6px", border: "1px solid var(--editor-border)", background: "var(--meta-bg)" }}>
                                            {([ ["D", "D"], ["M", "M"], ["A", "A"] ] as const).map(([unidade, label]) => (
                                                <button key={unidade} type="button" onClick={() => alterarUnidadeIdade(unidade)} aria-pressed={idCampos.idadeUnidade === unidade} title={unidade === "D" ? "Dias" : unidade === "M" ? "Meses" : "Anos"} style={{ width: "16px", height: "22px", border: "none", borderRadius: "4px", background: idCampos.idadeUnidade === unidade ? "rgba(236,72,153,0.14)" : "transparent", color: idCampos.idadeUnidade === unidade ? COR_IDENTIFICACAO : "var(--meta-text)", fontSize: "10px", fontWeight: idCampos.idadeUnidade === unidade ? 700 : 500, cursor: "pointer", padding: 0 }}>{label}</button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <input
                                        data-campo={campo.chave}
                                        value={idCampos[campo.chave]}
                                        onChange={handleChangeCampo}
                                        style={estiloCampo}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                }
            >
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 8px" }}>
                    {CAMPOS_ID.filter(c => !c.sempreVisivel).map(campo => (
                        <div key={campo.chave} style={{ display: "flex", flexDirection: "column", gap: "3px", flex: campo.largo ? "1 1 180px" : "0 1 118px", minWidth: "104px" }}>
                            <span style={estiloRotuloCampo}>{campo.rotulo}</span>
                            {campo.chave === "estadoCivil" ? (
                                <select
                                    data-campo={campo.chave}
                                    value={idCampos.estadoCivil}
                                    onChange={handleEstadoCivil}
                                    style={estiloCampo}
                                >
                                    <option value="">Selecionar...</option>
                                    {OPCOES_ESTADO_CIVIL.map(op => (
                                        <option key={op} value={op}>{op}</option>
                                    ))}
                                </select>
                            ) : campo.chave === "escolaridade" ? (
                                <select
                                    data-campo={campo.chave}
                                    value={idCampos.escolaridade}
                                    onChange={handleEscolaridade}
                                    style={estiloCampo}
                                >
                                    <option value="">Selecionar...</option>
                                    {OPCOES_ESCOLARIDADE.map(op => (
                                        <option key={op} value={op}>{op}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    data-campo={campo.chave}
                                    value={idCampos[campo.chave]}
                                    onChange={handleChangeCampo}
                                    style={estiloCampo}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </Bloco>

            <Bloco
                rotulo="Antecedentes"
                cor={COR_ANTECEDENTES}
                colapsavel
                abertoInicial={temAntecedentes}
                sempreVisivelChildren={idCampos.sexo === "F" ? (
                    <CampoRotulado rotulo="DUM">
                        <input
                            data-campo="dum"
                            type="date"
                            value={antecedentesCampos.dum}
                            onChange={e => alterarAntecedente("dum", e.target.value)}
                            style={estiloCampo}
                        />
                    </CampoRotulado>
                ) : null}
            >
                <SubGrupo rotulo="Pessoais">
                    {ANTECEDENTES_CAMPOS.map(campo => {
                        if (!campo.multilinha) {
                            return (
                                <CampoRotulado key={campo.chave} rotulo={campo.rotulo}>
                                    <input
                                        data-campo={campo.chave}
                                        value={antecedentesCampos[campo.chave]}
                                        onChange={e => alterarAntecedente(campo.chave, e.target.value)}
                                        style={estiloCampo}
                                    />
                                </CampoRotulado>
                            )
                        }
                        return (
                            <CampoRotulado key={campo.chave} rotulo={campo.rotulo}>
                                <textarea
                                    data-campo={campo.chave}
                                    value={antecedentesCampos[campo.chave]}
                                    rows={2}
                                    onChange={e => alterarAntecedente(campo.chave, e.target.value)}
                                    style={estiloArea}
                                />
                            </CampoRotulado>
                        )
                    })}
                    {idCampos.sexo === "F" && (
                        <>
                            <CampoRotulado rotulo="Obstétrico">
                                <textarea
                                    data-campo="obstetrico"
                                    value={antecedentesCampos.obstetrico}
                                    rows={2}
                                    onChange={e => alterarAntecedente("obstetrico", e.target.value)}
                                    style={estiloArea}
                                />
                            </CampoRotulado>
                        </>
                    )}
                </SubGrupo>
                <CampoRotulado rotulo="Familiares">
                    <textarea
                        data-campo="familiares"
                        value={antecedentesCampos.familiares}
                        rows={2}
                        onChange={e => alterarAntecedente("familiares", e.target.value)}
                        style={estiloArea}
                    />
                </CampoRotulado>
            </Bloco>

            <Bloco rotulo="Medicamentos" cor="#f59e0b" colapsavel abertoInicial={true}>
                {MEDICAMENTOS_CAMPOS.map(campo => {
                    if (!campo.multilinha) {
                        return (
                            <CampoRotulado key={campo.chave} rotulo={campo.rotulo} onNega={() => alterarMedicamento(campo.chave, "Nega")}>
                                <input
                                    data-campo={campo.chave}
                                    value={medicamentosCampos[campo.chave]}
                                    onChange={e => alterarMedicamento(campo.chave, e.target.value)}
                                    style={estiloCampo}
                                />
                            </CampoRotulado>
                        )
                    }
                    return (
                        <CampoRotulado key={campo.chave} rotulo={campo.rotulo} onNega={() => alterarMedicamento(campo.chave, "Nega")}>
                            <textarea
                                data-campo={campo.chave}
                                value={medicamentosCampos[campo.chave]}
                                rows={2}
                                onChange={e => alterarMedicamento(campo.chave, e.target.value)}
                                style={estiloArea}
                            />
                        </CampoRotulado>
                    )
                })}
            </Bloco>

            <Bloco
                rotulo="Hábitos"
                cor={COR_HABITOS}
                colapsavel
                abertoInicial={false}
                sempreVisivelChildren={
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {HABITOS_CAMPOS.filter(c => c.sempreVisivel).map(campo => (
                            <CampoRotulado key={campo.chave} rotulo={campo.rotulo} onNega={() => alterarHabito(campo.chave, "Nega")}>
                                <input
                                    data-campo={campo.chave}
                                    value={habitosCampos[campo.chave]}
                                    onChange={e => alterarHabito(campo.chave, e.target.value)}
                                    style={estiloCampo}
                                />
                            </CampoRotulado>
                        ))}
                    </div>
                }
            >
                <SubGrupo rotulo="Outros hábitos">
                    {HABITOS_CAMPOS.filter(c => !c.sempreVisivel).map(campo => (
                        <CampoRotulado key={campo.chave} rotulo={campo.rotulo}>
                            <input
                                data-campo={campo.chave}
                                value={habitosCampos[campo.chave]}
                                onChange={e => alterarHabito(campo.chave, e.target.value)}
                                style={estiloCampo}
                            />
                        </CampoRotulado>
                    ))}
                </SubGrupo>
            </Bloco>
        </div>
    )
}

/* ── Lista de problemas ────────────────────────────────────────────── */

export interface ListaProblemasFormProps {
    value: string
    onChange: (v: string) => void
    onSendToAssessment: (texto: string) => void
}

export function ListaProblemasForm({ value, onChange, onSendToAssessment }: ListaProblemasFormProps) {
    const [campos, setCampos] = React.useState<ListaProblemas>(LISTA_PROBLEMAS_VAZIO)
    const emitidoRef = React.useRef<string | null>(null)

    React.useEffect(() => {
        if (emitidoRef.current === value) return
        emitidoRef.current = value
        setCampos(parseListaProblemas(value))
    }, [value])

    const alterar = React.useCallback((novo: string) => {
        const proximo = { texto: novo }
        setCampos(proximo)
        const linha = compositarListaProblemas(proximo)
        emitidoRef.current = linha
        onChange(linha)
    }, [onChange])

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "8px 0 12px 0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: "20px" }}>
                <span style={estiloRotuloCampo}>Problemas/Condições</span>
                <BotaoNega onClick={() => alterar("Nega")} />
            </div>
            <textarea
                data-categoria="texto"
                value={campos.texto}
                rows={4}
                onChange={e => alterar(e.target.value)}
                style={{ ...estiloArea, minHeight: "88px" }}
            />
            <button
                type="button"
                onClick={() => onSendToAssessment(campos.texto)}
                disabled={!campos.texto.trim()}
                style={{ alignSelf: "flex-end", border: "1px solid rgba(234,179,8,0.3)", borderRadius: "6px", padding: "6px 10px", background: "rgba(234,179,8,0.08)", color: "#ca8a04", fontSize: "12px", fontWeight: 600, cursor: campos.texto.trim() ? "pointer" : "default", opacity: campos.texto.trim() ? 1 : 0.45 }}
            >
                → Avaliação
            </button>
        </div>
    )
}
