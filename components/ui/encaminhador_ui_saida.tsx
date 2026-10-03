import * as React from "react"
import { forwardRef, useImperativeHandle } from "react"
import { useEncaminha } from "../contexts/AppContext"
import { executarEncaminhamento } from "../../lib/encaminhar"

export interface EncaminhaOutputActions {
    executarEncaminhamento(): void
    copiarOutput(): void
    limparTudo(): void
}

const EncaminhaOutput = forwardRef<EncaminhaOutputActions>(function EncaminhaOutput(_props, ref) {
    const enc = useEncaminha()
    const [rawText, setRawText] = React.useState("")
    const [isStreaming, setIsStreaming] = React.useState(false)

    const dispararRequisicao = React.useCallback(async () => {
        if (isStreaming) return

        const input = enc.textoInput?.trim()
        const specialty = enc.especialidade?.trim()

        if (!input || !specialty) return

        setIsStreaming(true)
        enc.isStreaming = true
        setRawText("")

        try {
            await executarEncaminhamento({
                especialidade: specialty,
                texto: input,
                aoReceber: (acumulado) => { setRawText(acumulado) },
            })
        } catch {
            setRawText("erro ao gerar o encaminhamento.")
        } finally {
            setIsStreaming(false)
            enc.isStreaming = false
        }
    }, [enc, isStreaming])

    React.useEffect(() => {
        enc.executarEncaminhamento = () => dispararRequisicao()
        enc.copiarOutput = () => {
            if (rawText) navigator.clipboard.writeText(rawText)
        }
        enc.limparTudo = () => {
            enc.setTextoInput("")
            enc.setEspecialidade("")
            setRawText("")
        }

        const lidarComExecutarOuvinte = () => {
            enc.executarEncaminhamento?.()
        }
        window.addEventListener("framerExecutarEncaminhaSaida", lidarComExecutarOuvinte)

        const lidarComCopiarOuvinte = () => {
            enc.copiarOutput?.()
        }
        window.addEventListener("framerCopiarEncaminhaSaida", lidarComCopiarOuvinte)

        const lidarComLimparOuvinte = () => {
            enc.limparTudo?.()
        }
        window.addEventListener("framerLimparEncaminhaSaida", lidarComLimparOuvinte)

        return () => {
            enc.executarEncaminhamento = undefined
            enc.copiarOutput = undefined
            enc.limparTudo = undefined
            window.removeEventListener("framerExecutarEncaminhaSaida", lidarComExecutarOuvinte)
            window.removeEventListener("framerCopiarEncaminhaSaida", lidarComCopiarOuvinte)
            window.removeEventListener("framerLimparEncaminhaSaida", lidarComLimparOuvinte)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enc, rawText, dispararRequisicao])

    // Expose actions via useImperativeHandle
    useImperativeHandle(ref, () => ({
        executarEncaminhamento: () => dispararRequisicao(),
        copiarOutput: () => {
            if (rawText) navigator.clipboard.writeText(rawText)
        },
        limparTudo: () => {
            enc.setTextoInput("")
            enc.setEspecialidade("")
            setRawText("")
        },
    }), [enc, dispararRequisicao, rawText, setRawText])

    const totalOutput = rawText.length

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
                    --encaminha-out-bg: #ffffff;
                    --encaminha-out-border: #e2ddd6;
                    --encaminha-out-shadow: 0 1px 4px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.03);
                    --encaminha-out-text: #1e1c19;
                    --encaminha-out-placeholder: #a89e90;
                    --encaminha-out-streaming: #c96a2a;
                    --encaminha-out-counter-bg: rgba(255, 255, 255, 0.9);
                    --encaminha-out-counter-text: #a89e90;
                }

                @media (prefers-color-scheme: dark) {
                    :root {
                        --encaminha-out-bg: #1c1917;
                        --encaminha-out-border: #2e2a24;
                        --encaminha-out-shadow: 0 1px 4px rgba(0,0,0,.2), 0 4px 16px rgba(0,0,0,.3);
                        --encaminha-out-text: #f5f5f4;
                        --encaminha-out-placeholder: #57534e;
                        --encaminha-out-streaming: #e07a3b;
                        --encaminha-out-counter-bg: rgba(28, 25, 23, 0.9);
                        --encaminha-out-counter-text: #78716c;
                    }
                }

                .framer-encaminha-plain-output {
                    width: 100% !important;
                    height: 100% !important;
                    background: var(--encaminha-out-bg) !important;
                    border: 1px solid var(--encaminha-out-border) !important;
                    border-radius: 10px !important;
                    padding: 16px !important;
                    font-size: 14px !important;
                    line-height: 1.85 !important;
                    color: var(--encaminha-out-text) !important;
                    box-sizing: border-box !important;
                    font-family: "Google Sans", sans-serif !important;
                    white-space: pre-wrap !important;
                    overflow-y: auto !important;
                    box-shadow: var(--encaminha-out-shadow) !important;
                    transition: background-color .2s, color .2s, border-color .2s, box-shadow .2s;
                }
                .framer-encaminha-out-counter {
                    position: absolute !important;
                    bottom: 12px !important;
                    right: 14px !important;
                    font-size: 10px !important;
                    color: var(--encaminha-out-counter-text) !important;
                    background: var(--encaminha-out-counter-bg) !important;
                    padding: 2px 6px !important;
                    border-radius: 4px !important;
                    pointer-events: none !important;
                    z-index: 5 !important;
                    font-family: "Google Sans", sans-serif !important;
                    transition: background-color .2s, color .2s;
                }
                .streaming-border { border-color: var(--encaminha-out-streaming) !important; }
            `}</style>

            <div
                className={`framer-encaminha-plain-output ${isStreaming ? "streaming-border" : ""}`}
            >
                {rawText ? (
                    rawText
                ) : (
                    <span
                        style={{
                            color: "var(--encaminha-out-placeholder)",
                            fontStyle: "italic",
                        }}
                    >
                        {isStreaming
                            ? "gerando encaminhamento..."
                            : "veja a mágica acontecer clicando no aviãozinho!"}
                    </span>
                )}
            </div>

            {totalOutput > 0 && (
                <div className="framer-encaminha-out-counter">
                    {totalOutput.toLocaleString("pt-BR")} caract
                </div>
            )}
        </div>
    )
})

export default EncaminhaOutput
