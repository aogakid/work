import * as React from "react"
import { useApp } from "../contexts/AppContext"

export default function FormularioInput() {
    const app = useApp()
    const [input, setInput] = React.useState("")
    const [isStreaming, setIsStreaming] = React.useState(false)

    React.useEffect(() => {
        app.textoInput = input
        app.setTextoInput = setInput
        app.colarNoInput = async () => {
            try {
                const textoClp = await navigator.clipboard.readText()
                setInput(textoClp)
            } catch (e) {
                console.error("Erro ao ler a área de transferência:", e)
            }
        }

        const lidarComColarOuvinte = () => {
            app.colarNoInput?.()
        }
        window.addEventListener("framerColarArrumador", lidarComColarOuvinte)

        const lidarComExecutarOuvinte = () => {
            app.executarPrompt?.()
        }
        window.addEventListener("framerExecutarArrumador", lidarComExecutarOuvinte)

        return () => {
            window.removeEventListener("framerColarArrumador", lidarComColarOuvinte)
            window.removeEventListener("framerExecutarArrumador", lidarComExecutarOuvinte)
        }
    }, [input, app, isStreaming])

    React.useEffect(() => {
        const interval = setInterval(() => {
            if (app.isStreaming !== isStreaming) {
                setIsStreaming(app.isStreaming)
            }
        }, 100)
        return () => clearInterval(interval)
    }, [app.isStreaming, isStreaming])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault()
            app.executarPrompt?.()
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
                    --textarea-bg: #ffffff;
                    --textarea-border: #e2ddd6;
                    --textarea-text: #1e1c19;
                    --textarea-focus: #c96a2a;
                    --textarea-placeholder: #a89e90;
                    --counter-bg: rgba(255, 255, 255, 0.9);
                    --counter-text: #a89e90;
                    --counter-warn: #b04040;
                }

                @media (prefers-color-scheme: dark) {
                    :root {
                        --textarea-bg: #1c1917;
                        --textarea-border: #2e2a24;
                        --textarea-text: #f5f5f4;
                        --textarea-focus: #e07a3b;
                        --textarea-placeholder: #57534e;
                        --counter-bg: rgba(28, 25, 23, 0.9);
                        --counter-text: #78716c;
                        --counter-warn: #ef4444;
                    }
                }

                .framer-custom-textarea {
                    width: 100% !important;
                    height: 100% !important;
                    background: var(--textarea-bg) !important;
                    border: 1px solid var(--textarea-border) !important;
                    border-radius: 10px !important;
                    padding: 16px !important;
                    font-size: 14px !important;
                    line-height: 1.75 !important;
                    color: var(--textarea-text) !important;
                    outline: none !important;
                    box-sizing: border-box !important;
                    font-family: "Google Sans", sans-serif !important;
                    resize: none !important;
                    overflow-y: auto !important;
                    transition: border-color .2s, background-color .2s, color .2s;
                }
                .framer-custom-textarea:focus { border-color: var(--textarea-focus) !important; }
                .framer-custom-textarea::placeholder { color: var(--textarea-placeholder) !important; font-style: italic !important; }
                
                .framer-counter-tag {
                    position: absolute !important;
                    bottom: 12px !important;
                    right: 14px !important;
                    font-size: 10px !important;
                    color: var(--counter-text) !important;
                    background: var(--counter-bg) !important;
                    padding: 2px 6px !important;
                    border-radius: 4px !important;
                    pointer-events: none !important;
                    z-index: 5 !important;
                    font-family: "Google Sans", sans-serif !important;
                    transition: background-color .2s, color .2s;
                }
                .framer-counter-tag.warn { color: var(--counter-warn) !important; font-weight: 600 !important; }
            `}</style>
            <textarea
                className="framer-custom-textarea"
                placeholder="cole aqui o prontuário feio"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
            />
            <div
                className={`framer-counter-tag ${totalInput > 4000 ? "warn" : ""}`}
            >
                {totalInput.toLocaleString("pt-BR")} caract
            </div>
        </div>
    )
}
