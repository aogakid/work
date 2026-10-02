import * as React from "react"
import { MOTIVO_VAZIO, SUBJETIVO_VAZIO, compositarSubjetivo, parseSubjetivo, type Subjetivo } from "../../lib/subjetivo"

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
    resize: "none",
    minHeight: "40px",
    lineHeight: 1.45,
    overflow: "hidden",
    height: "auto",
} as React.CSSProperties

const estiloBotao: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "5px 10px",
    borderRadius: "6px",
    border: "1px dashed var(--editor-border)",
    background: "transparent",
    color: "var(--meta-text)",
    fontSize: "11px",
    fontWeight: 600,
    fontFamily: '"Google Sans Flex", sans-serif',
    cursor: "pointer",
}

export interface SubjetivoFormProps {
    value: string
    onChange: (v: string) => void
}

/* Each motivo is a numbered first-level item of Subjetivo: a single-line title
   plus the text box on the second level. "Adicionar motivo" appends another
   pair, and numbering is re-derived on every compose. */
export function SubjetivoForm({ value, onChange }: SubjetivoFormProps) {
    const [campos, setCampos] = React.useState<Subjetivo>(SUBJETIVO_VAZIO)
    const [hoverMotivo, setHoverMotivo] = React.useState<number | null>(null)
    const emitidoRef = React.useRef<string | null>(null)
    const textareaRefs = React.useRef<Record<number, HTMLTextAreaElement>>({})

    React.useEffect(() => {
        if (emitidoRef.current === value) return
        emitidoRef.current = value
        setCampos(parseSubjetivo(value))
    }, [value])

    const aplicar = React.useCallback((proximo: Subjetivo) => {
        setCampos(proximo)
        const texto = compositarSubjetivo(proximo)
        emitidoRef.current = texto
        onChange(texto)
    }, [onChange])

    const alterarAcompanhante = React.useCallback((novo: string) => {
        aplicar({ ...campos, acompanhante: novo })
    }, [aplicar, campos])

    const alterarMotivo = React.useCallback((indice: number, chave: "motivo" | "texto", novo: string) => {
        const motivos = campos.motivos.map((m, i) => (i === indice ? { ...m, [chave]: novo } : m))
        aplicar({ ...campos, motivos })
    }, [aplicar, campos])

    const adicionarMotivo = React.useCallback(() => {
        aplicar({ ...campos, motivos: [...campos.motivos, { ...MOTIVO_VAZIO }] })
    }, [aplicar, campos])

    const removerMotivo = React.useCallback((indice: number) => {
        const motivos = campos.motivos.filter((_, i) => i !== indice)
        // Clean up ref
        delete textareaRefs.current[indice]
        setHoverMotivo(null)
        aplicar({ ...campos, motivos: motivos.length ? motivos : [{ ...MOTIVO_VAZIO }] })
    }, [aplicar, campos])

    const handleAcompanhante = (e: React.ChangeEvent<HTMLInputElement>) => alterarAcompanhante(e.target.value)
    const handleMotivo = (indice: number) => (e: React.ChangeEvent<HTMLInputElement>) => alterarMotivo(indice, "motivo", e.target.value)
    const handleTexto = (indice: number) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        alterarMotivo(indice, "texto", e.target.value)
        // Auto-resize textarea
        const textarea = textareaRefs.current[indice]
        if (textarea) {
            textarea.style.height = "auto"
            textarea.style.height = textarea.scrollHeight + "px"
        }
    }

    // Auto-resize textareas when number of motivos changes
    React.useEffect(() => {
        setTimeout(() => {
            campos.motivos.forEach((_, i) => {
                const textarea = textareaRefs.current[i]
                if (textarea) {
                    textarea.style.height = "auto"
                    textarea.style.height = textarea.scrollHeight + "px"
                }
            })
        }, 0)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [campos.motivos.length])

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "10px 0 12px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ ...estiloRotuloCampo, flexShrink: 0 }}>Acompanhante</span>
                <input
                    data-acompanhante="acompanhante"
                    value={campos.acompanhante}
                    onChange={handleAcompanhante}
                    style={{ ...estiloCampo, width: "auto", flex: "1 1 0", minWidth: 0 }}
                />
            </div>

            {campos.motivos.map((motivo, i) => {
                const deletavel = campos.motivos.length > 1 || motivo.motivo.trim() !== "" || motivo.texto.trim() !== ""
                const hovering = deletavel && hoverMotivo === i
                return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span
                                onMouseEnter={() => { if (deletavel) setHoverMotivo(i) }}
                                onMouseLeave={() => setHoverMotivo(prev => (prev === i ? null : prev))}
                                onClick={() => { if (hovering) removerMotivo(i) }}
                                title={deletavel ? "Clique para excluir motivo" : undefined}
                                style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: hovering ? "#ef4444" : "var(--meta-text)",
                                    fontFamily: '"Google Sans Flex", sans-serif',
                                    minWidth: "16px",
                                    textAlign: "right",
                                    cursor: hovering ? "pointer" : "default",
                                    userSelect: "none",
                                    transition: "color 120ms ease",
                                }}
                            >
                                {hovering ? "−" : `${i + 1}.`}
                            </span>
                            <div style={{ position: "relative", flex: "1 1 0", minWidth: 0 }}>
                                <span aria-hidden="true" style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: "#3b82f6", fontSize: "17px", lineHeight: 1, pointerEvents: "none" }}>❝</span>
                                <input
                                    data-motivo={i}
                                    value={motivo.motivo}
                                    onChange={handleMotivo(i)}
                                    placeholder="motivo da consulta"
                                    style={{ ...estiloCampo, paddingLeft: "27px", paddingRight: "27px", outline: "none" }}
                                />
                                <span aria-hidden="true" style={{ position: "absolute", right: "9px", top: "50%", transform: "translateY(-50%)", color: "#3b82f6", fontSize: "17px", lineHeight: 1, pointerEvents: "none" }}>❞</span>
                            </div>
                        </div>
                        {/* width:100% + margin estourava o card: o recuo vai no wrapper */}
                        <div style={{ paddingLeft: "22px" }}>
                            <textarea
                                ref={el => { if (el) textareaRefs.current[i] = el }}
                                data-texto={i}
                                value={motivo.texto}
                                onChange={handleTexto(i)}
                                style={estiloArea}
                            />
                        </div>
                    </div>
                )
            })}

            <button type="button" onClick={adicionarMotivo} style={estiloBotao}>
                + Adicionar motivo
            </button>
        </div>
    )
}
