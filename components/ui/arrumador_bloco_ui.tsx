import * as React from "react"
import { createPortal } from "react-dom"
import { executarArrumador, prepararTextoBruto } from "../../lib/arrumador"
import { AVISO_CLIPBOARD_BLOQUEADO, lerClipboard } from "../../lib/clipboard"

export interface ArrumadorBlocoProps {
    aberto: boolean
    titulo: string
    aoFechar: () => void
    aoInserir: (texto: string) => void
}

/* Paint-brush overlay: pastes the clipboard, runs the arrumador against the
   block's template and offers the converted text for insertion. Streaming
   output lands in the read-only box so the clinician sees it fill in. */
export function ArrumadorBloco({ aberto, titulo, aoFechar, aoInserir }: ArrumadorBlocoProps) {
    const entradaRef = React.useRef<HTMLTextAreaElement | null>(null)
    const [entrada, setEntrada] = React.useState("")
    const [saida, setSaida] = React.useState("")
    const [rodando, setRodando] = React.useState(false)
    const [erro, setErro] = React.useState("")
    const controladorRef = React.useRef<AbortController | null>(null)
    const rodandoRef = React.useRef(false)

    const parar = React.useCallback(() => {
        if (controladorRef.current) {
            controladorRef.current.abort()
            controladorRef.current = null
        }
        rodandoRef.current = false
        setRodando(false)
    }, [])

    const rodar = React.useCallback(async (bruto: string) => {
        /* Cleanups also run here so hand-edited text can never reach the worker raw. */
        const texto = prepararTextoBruto(bruto || "").trim()
        if (!texto || rodandoRef.current) return
        /* Mark it running synchronously: a second click in the same tick would
           otherwise start a second request before the effect syncs the ref. */
        rodandoRef.current = true
        setRodando(true)
        setErro("")
        setSaida("")
        const controlador = new AbortController()
        controladorRef.current = controlador
        try {
            const final = await executarArrumador({ texto, titulo, aoReceber: setSaida, sinal: controlador.signal })
            setSaida(final)
        } catch (e) {
            if (e instanceof DOMException && e.name === "AbortError") return
            setErro(e instanceof Error ? e.message : "falha ao rodar o arrumador")
        } finally {
            if (controladorRef.current === controlador) controladorRef.current = null
            rodandoRef.current = false
            setRodando(false)
        }
    }, [titulo])

    /* On open: grab the clipboard and run straight away. */
    React.useEffect(() => {
        if (!aberto) return
        setErro("")
        setSaida("")
        let ativo = true
        /* No preview o `readText` não existe/é negado: em vez de falhar em
           silêncio, avisamos e o usuário cola com Ctrl/Cmd+V no campo. */
        lerClipboard().then(texto => {
            if (!ativo) return
            if (texto === null) {
                setErro(AVISO_CLIPBOARD_BLOQUEADO)
                return
            }
            const limpo = prepararTextoBruto(texto)
            setEntrada(limpo)
            rodar(limpo)
        })
        return () => {
            ativo = false
            parar()
        }
    }, [aberto, rodar, parar])

    React.useEffect(() => {
        if (!aberto) return
        const id = window.requestAnimationFrame(() => entradaRef.current?.focus())
        return () => window.cancelAnimationFrame(id)
    }, [aberto])

    React.useEffect(() => {
        if (!aberto) return
        const aoTeclar = (e: KeyboardEvent) => {
            if (e.key === "Escape") aoFechar()
        }
        window.addEventListener("keydown", aoTeclar)
        return () => window.removeEventListener("keydown", aoTeclar)
    }, [aberto, aoFechar])

    const handleEntrada = (e: React.ChangeEvent<HTMLTextAreaElement>) => setEntrada(e.target.value)
    const handleColar = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        e.preventDefault()
        const colado = prepararTextoBruto(e.clipboardData.getData("text/plain"))
        setEntrada(prev => (prev ? prev.replace(/\s*$/, "") + "\n" + colado : colado))
    }
    const handleRodar = () => rodar(entrada)
    const handleInserir = () => {
        if (!saida.trim()) return
        aoInserir(saida)
    }
    const handleCopiar = () => {
        if (!saida.trim()) return
        navigator.clipboard.writeText(saida)
    }

    if (!aberto) return null

    const caixa: React.CSSProperties = {
        fontFamily: '"Google Sans Flex", sans-serif',
        background: "var(--editor-bg)",
        color: "var(--editor-text)",
        border: "1px solid var(--editor-border)",
        borderRadius: "8px",
        padding: "8px 10px",
        fontSize: "12px",
        lineHeight: 1.5,
        flex: "1 1 260px",
        minWidth: 0,
        height: "52vh",
        maxHeight: "480px",
        boxSizing: "border-box",
        resize: "none",
        overflowY: "auto",
    }

    const botao: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "7px 14px",
        borderRadius: "8px",
        border: "1px solid var(--meta-border)",
        background: "var(--meta-bg)",
        color: "var(--meta-text)",
        fontSize: "12px",
        fontWeight: 600,
        fontFamily: '"Google Sans Flex", sans-serif',
        cursor: "pointer",
    }

    return createPortal(
        <div>
            <style>{`
                @keyframes bloco-spin { to { transform: rotate(360deg) } }
                .bloco-spinner { animation: bloco-spin 0.7s linear infinite; }
            `}</style>
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10001, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
            <div
                style={{
                    width: "100%",
                    maxWidth: "1100px",
                    maxHeight: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    padding: "14px",
                    borderRadius: "14px",
                    background: "var(--meta-bg)",
                    border: "1px solid var(--meta-border)",
                    boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
                    fontFamily: '"Google Sans Flex", sans-serif',
                    boxSizing: "border-box",
                    overflow: "hidden",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#c96a2a" }}>
                        <path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z" />
                        <path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7" />
                        <path d="M14.5 17.5 4.5 15" />
                    </svg>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--editor-text)" }}>Arrumador</span>
                    <button type="button" onClick={aoFechar} aria-label="Fechar arrumador" style={{ ...botao, marginLeft: "auto", padding: "4px 8px" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "flex-start" }}>
                    <textarea ref={entradaRef} value={entrada} onChange={handleEntrada} onPaste={handleColar} style={caixa} placeholder="cole aqui o prontuário" spellCheck={false} />
                    <div style={{ position: "relative", flex: "1 1 260px", minWidth: 0, display: "flex" }}>
                        <textarea value={saida} readOnly style={{ ...caixa, background: "transparent" }} spellCheck={false} />
                        {rodando ? (
                            <div style={{ position: "absolute", top: "8px", right: "12px", display: "flex", alignItems: "center", gap: "6px", padding: "4px 9px", borderRadius: "999px", background: "var(--meta-bg)", border: "1px solid var(--meta-border)", pointerEvents: "none" }}>
                                <span className="bloco-spinner" style={{ width: "11px", height: "11px", borderRadius: "50%", border: "2px solid var(--meta-border)", borderTopColor: "#c96a2a", flex: "0 0 auto" }} />
                                <span style={{ fontSize: "11px", fontWeight: 600, color: "#c96a2a" }}>arrumando</span>
                            </div>
                        ) : null}
                    </div>
                </div>

                {erro ? (
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "6px", padding: "6px 10px" }}>{erro}</div>
                ) : null}

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button type="button" onClick={rodando ? parar : handleRodar} style={{ ...botao, color: "#c96a2a" }}>
                        {rodando ? "Parar" : "Arrumar"}
                    </button>
                    <button
                        type="button"
                        onClick={handleCopiar}
                        disabled={!saida.trim()}
                        title="copiar texto arrumado"
                        aria-label="copiar texto arrumado"
                        style={{ ...botao, marginLeft: "auto", padding: "7px", opacity: saida.trim() ? 1 : 0.5, cursor: saida.trim() ? "pointer" : "default" }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="13" height="13" x="9" y="9" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                    </button>
                    <button
                        type="button"
                        onClick={handleInserir}
                        disabled={rodando || !saida.trim()}
                        style={{
                            ...botao,
                            background: "#c96a2a",
                            borderColor: "#c96a2a",
                            color: "#ffffff",
                            opacity: rodando || !saida.trim() ? 0.5 : 1,
                            cursor: rodando || !saida.trim() ? "default" : "pointer",
                        }}
                    >
                        Inserir no bloco
                    </button>
                </div>
            </div>
        </div>
        </div>,
        document.body,
    )
}
