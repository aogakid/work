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
    resize: "vertical",
    minHeight: "52px",
    lineHeight: 1.45,
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
    const emitidoRef = React.useRef<string | null>(null)

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
        aplicar({ ...parseSubjetivo(value), acompanhante: novo })
    }, [aplicar, value])

    const alterarMotivo = React.useCallback((indice: number, chave: "motivo" | "texto", novo: string) => {
        const base = parseSubjetivo(value)
        const motivos = base.motivos.map((m, i) => (i === indice ? { ...m, [chave]: novo } : m))
        aplicar({ ...base, motivos })
    }, [aplicar, value])

    const adicionarMotivo = React.useCallback(() => {
        const base = parseSubjetivo(value)
        aplicar({ ...base, motivos: [...base.motivos, { ...MOTIVO_VAZIO }] })
    }, [aplicar, value])

    const removerMotivo = React.useCallback((indice: number) => {
        const base = parseSubjetivo(value)
        const motivos = base.motivos.filter((_, i) => i !== indice)
        aplicar({ ...base, motivos: motivos.length ? motivos : [{ ...MOTIVO_VAZIO }] })
    }, [aplicar, value])

    const handleAcompanhante = (e: React.ChangeEvent<HTMLInputElement>) => alterarAcompanhante(e.target.value)
    const handleMotivo = (indice: number) => (e: React.ChangeEvent<HTMLInputElement>) => alterarMotivo(indice, "motivo", e.target.value)
    const handleTexto = (indice: number) => (e: React.ChangeEvent<HTMLTextAreaElement>) => alterarMotivo(indice, "texto", e.target.value)
    const handleRemover = (indice: number) => () => removerMotivo(indice)

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

            {campos.motivos.map((motivo, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--meta-text)", fontFamily: '"Google Sans Flex", sans-serif', minWidth: "12px", textAlign: "right" }}>{i + 1}.</span>
                        <input
                            data-motivo={i}
                            value={motivo.motivo}
                            onChange={handleMotivo(i)}
                            placeholder="motivo da consulta"
                            style={{ ...estiloCampo, width: "auto", flex: "1 1 0", minWidth: 0 }}
                        />
                        <button
                            type="button"
                            aria-label={`Remover motivo ${i + 1}`}
                            onClick={handleRemover(i)}
                            style={{ flexShrink: 0, width: "24px", height: "24px", borderRadius: "6px", border: "1px solid var(--editor-border)", background: "transparent", color: "var(--meta-text)", fontSize: "13px", lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                            ×
                        </button>
                    </div>
                    {/* width:100% + margin estourava o card: o recuo vai no wrapper */}
                    <div style={{ paddingLeft: "18px" }}>
                        <textarea
                            data-texto={i}
                            value={motivo.texto}
                            onChange={handleTexto(i)}
                            rows={2}
                            style={estiloArea}
                        />
                    </div>
                </div>
            ))}

            <button type="button" onClick={adicionarMotivo} style={estiloBotao}>
                + Adicionar motivo
            </button>
        </div>
    )
}