import * as React from "react"
import { useEncaminha } from "../contexts/AppContext"

export default function EncaminhaInput() {
    const enc = useEncaminha()
    const [input, setInput] = React.useState("")
    const [isStreaming, setIsStreaming] = React.useState(false)

    React.useEffect(() => {
        enc.textoInput = input
        enc.setTextoInput = setInput

        enc.colarNoInput = async () => {
            try {
                const textoClp = await navigator.clipboard.readText()
                setInput(anonimizar(textoClp))
            } catch (e) {
                console.error("Erro ao colar texto:", e)
            }
        }
    }, [input, isStreaming])

    React.useEffect(() => {
        const interval = setInterval(() => {
            if (enc.isStreaming !== isStreaming) {
                setIsStreaming(enc.isStreaming)
            }
        }, 100)
        return () => clearInterval(interval)
    }, [isStreaming])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault()
            enc.executarEncaminhamento?.()
        }
    }
    const anonimizar = (texto: string): string => {
        const match = texto.match(/Id:\s+([^,]+),\s*\d+\s*anos/i)
        if (!match) return texto
        const nome = match[1].trim()
        if (!nome || nome.length < 3) return texto
        const escaped = nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        return texto.replace(new RegExp(escaped, "gi"), "[Nome do Paciente]")
    }

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        e.preventDefault()
        const texto = e.clipboardData.getData("text/plain")
        const anonimizado = anonimizar(texto)
        document.execCommand("insertText", false, anonimizado)
    }

    const totalInput = input.length

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                boxSizing: "border-box",
            }}
        >
            <style>{`
                :root {
                    --encaminha-bg: #ffffff;
                    --encaminha-border: #e2ddd6;
                    --encaminha-shadow: 0 1px 4px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.03);
                    --encaminha-text: #1e1c19;
                    --encaminha-focus: #c96a2a;
                    --encaminha-placeholder: #a89e90;
                    --encaminha-counter-bg: rgba(255, 255, 255, 0.9);
                    --encaminha-counter-text: #a89e90;
                    --encaminha-counter-warn: #b04040;
                }

                @media (prefers-color-scheme: dark) {
                    :root {
                        --encaminha-bg: #1c1917;
                        --encaminha-border: #2e2a24;
                        --encaminha-shadow: 0 1px 4px rgba(0,0,0,.2), 0 4px 16px rgba(0,0,0,.3);
                        --encaminha-text: #f5f5f4;
                        --encaminha-focus: #e07a3b;
                        --encaminha-placeholder: #57534e;
                        --encaminha-counter-bg: rgba(28, 25, 23, 0.9);
                        --encaminha-counter-text: #78716c;
                        --encaminha-counter-warn: #ef4444;
                    }
                }

                .framer-encaminha-textarea {
                    width: 100% !important;
                    height: 100% !important;
                    background: var(--encaminha-bg) !important;
                    border: 1px solid var(--encaminha-border) !important;
                    border-radius: 10px !important;
                    padding: 16px !important;
                    font-size: 14px !important;
                    line-height: 1.75 !important;
                    color: var(--encaminha-text) !important;
                    outline: none !important;
                    box-sizing: border-box !important;
                    font-family: "Google Sans", sans-serif !important;
                    resize: none !important;
                    overflow-y: auto !important;
                    transition: border-color .2s, background-color .2s, color .2s;
                    box-shadow: var(--encaminha-shadow) !important;
                }
                .framer-encaminha-textarea:focus { border-color: var(--encaminha-focus) !important; }
                .framer-encaminha-textarea::placeholder { color: var(--encaminha-placeholder) !important; font-style: italic !important; }
                
                .framer-encaminha-counter {
                    position: absolute !important;
                    bottom: 12px !important;
                    right: 14px !important;
                    font-size: 10px !important;
                    color: var(--encaminha-counter-text) !important;
                    background: var(--encaminha-counter-bg) !important;
                    padding: 2px 6px !important;
                    border-radius: 4px !important;
                    pointer-events: none !important;
                    z-index: 5 !important;
                    font-family: "Google Sans", sans-serif !important;
                    transition: background-color .2s, color .2s;
                }
                .framer-encaminha-counter.warn { color: var(--encaminha-counter-warn) !important; font-weight: 600 !important; }
            `}</style>
            <textarea
                className="framer-encaminha-textarea"
                placeholder="cole aqui o prontuário do paciente"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
            />
            <div
                className={`framer-encaminha-counter ${totalInput > 4000 ? "warn" : ""}`}
            >
                {totalInput.toLocaleString("pt-BR")} caract
            </div>
        </div>
    )
}
