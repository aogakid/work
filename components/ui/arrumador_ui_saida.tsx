import * as React from "react"
import { forwardRef, useImperativeHandle } from "react"
import { useApp } from "../contexts/AppContext"

const WORKER_URL = "https://soapformatter.aogakid.workers.dev"

const SYSTEM_PROMPT = `Você é um formatador de prontuários médicos

Objetivo:
Transformar o texto em estrutura SOAP preservando o máximo possível do conteúdo original

Regras obrigatórias:
- Manter espaços de indentação das listas
- Não resumir ou omitir informações: aquelas que não encaixar em nenhum tópico devem ser colocadas no final
- Não sintetizar sintomas, inferir diagnósticos ou definir condutas
- Não inventar conteúdo
- A Id (identificação) deve conter todas as informações da ID original
- Agrupar na HDA queixas relacionadas em parágrafos
- Não trazer dados do Objetivo para o Subjetivo, nem duplicar informações já presentes
- As informações de Avaliação/Análise e Plano/Conduta devem ser concisas e constar no tópico de pendências
- Campos sem informação: $
- Output apenas em markdown puro, sem negritos

CAPITALIZAÇÃO
- Deve seguir a norma culta do português obrigatoriamente: início de frases, listas, nomes próprios em maiúsculo.
- Medicamentos em minúsculo, exceto quando em início de frase ou lista
- Siglas clássicas e clínicas devem permanecer manter seu padrão: PA, FC, FR, SatO2, IMC, AC, AR, SSVV, HDA, QP, AP, AF, HV, CID, MMII, MMSS, DM, HAS, IRC, DPOC, TCE, AVC, RCR, BNF, TC, RNM etc[...]

Exames laboratoriais quando presentes devem seguir o formato:
(DD/MM/AAAA): Hb 99 | Ht 99 | etc.

Modelo de output:

# Consulta Agendada

## Subjetivo
- Id: 
- QP: 
- HDA
  - 
- Queixas adicionais
  - 
- Antecedentes pessoais
  - Condições
    - 
  - Cirurgias
    - 
  - Medicamentos
    - 
  - Alergias
    - 
  - Vacinação
    - 
- AF: 
- HV
  - Etilismo: 
  - Tabagismo: 
  - Drogas: 
  - Exercício: 
  - Dieta: 
  - Hidratação: 
  - Evacuações: 
  - Diurese: 
  - Sono: 
  - Humor: 
  - Lazer: 

## Objetivo
- Exame físico
  - SSVV
    - PA: 
    - Peso: 
    - Alt: 
    - IMC: 
  - Ect: 
  - AC: 
  - AR: 
  - Ext: 
- Complementar
  - Laboratório
    - 
  - Imagem
    - 
  - Escores
    - 

## Pendências anteriores
- `

const TEMPLATE_APPENDIX = `

## Avaliação
- QP
  - 
- Queixas adicionais
  - 
- Condições crônicas
  - 
- Riscos
  - 

## Plano
- QP
  - 
- Queixas adicionais
  - 
- Condições crônicas
  - 
- Riscos
  - 
- Seguimento
  - `

export interface FormularioOutputActions {
    executarPrompt(): void
    copiarOutput(): void
    colarNoInput(): void
    limparTudo(): void
}

const FormularioOutput = forwardRef<FormularioOutputActions>(function FormularioOutput(_props, ref) {
    const app = useApp()
    const [rawMarkdown, setRawMarkdown] = React.useState("")
    const [isStreaming, setIsStreaming] = React.useState(false)

    const isStreamingRef = React.useRef(isStreaming)
    const rawMarkdownRef = React.useRef(rawMarkdown)

    React.useEffect(() => {
        isStreamingRef.current = isStreaming
    }, [isStreaming])

    React.useEffect(() => {
        rawMarkdownRef.current = rawMarkdown
    }, [rawMarkdown])

    const dispararRequisicao = React.useCallback(async () => {
        if (isStreamingRef.current) return
        const textoOriginal = app.textoInput?.trim()
        if (!textoOriginal) return

        setIsStreaming(true)
        app.isStreaming = true
        setRawMarkdown("")

        try {
            const res = await fetch(WORKER_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "openai/gpt-oss-120b",
                    messages: [
                        { role: "system", content: SYSTEM_PROMPT },
                        { role: "user", content: textoOriginal },
                    ],
                    temperature: 0,
                    max_tokens: 5000,
                    stream: true,
                }),
            })

            const reader = res.body?.getReader()
            const decoder = new TextDecoder()
            let buffer = ""
            let acumulado = ""
            if (!reader) return

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split("\n")
                buffer = lines.pop() || ""

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue
                    const raw = line.slice(6).trim()
                    if (!raw || raw === "[DONE]") continue
                    try {
                        const json = JSON.parse(raw)
                        const part = json.choices?.[0]?.delta?.content
                        if (part) {
                            acumulado += part
                            setRawMarkdown(acumulado)
                        }
                    } catch {}
                }
            }
            // Append template appendix after successful streaming
            setRawMarkdown((prev) => prev + TEMPLATE_APPENDIX)
        } catch {
            setRawMarkdown("deu erro")
        } finally {
            setIsStreaming(false)
            app.isStreaming = false
        }
    }, [app])

    React.useEffect(() => {
        app.executarPrompt = () => dispararRequisicao()

        app.copiarOutput = () => {
            const textoLimpo = rawMarkdownRef.current
                .replaceAll("$.", " ")
                .replaceAll("$", " ")
            if (textoLimpo) navigator.clipboard.writeText(textoLimpo)
        }

        app.colarNoInput = async () => {
            try {
                const txt = await navigator.clipboard.readText()
                app.setTextoInput(txt)
            } catch {}
        }

        app.limparTudo = () => {
            app.setTextoInput("")
            setRawMarkdown("")
        }

        const lidarComExecutarOuvinte = () => {
            app.executarPrompt?.()
        }
        window.addEventListener("framerExecutarArrumadorSaida", lidarComExecutarOuvinte)

        const lidarComCopiarOuvinte = () => {
            app.copiarOutput?.()
        }
        window.addEventListener("framerCopiarArrumadorSaida", lidarComCopiarOuvinte)

        const lidarComColarOuvinte = () => {
            app.colarNoInput?.()
        }
        window.addEventListener("framerColarArrumadorSaida", lidarComColarOuvinte)

        const lidarComLimparOuvinte = () => {
            app.limparTudo?.()
        }
        window.addEventListener("framerLimparArrumadorSaida", lidarComLimparOuvinte)

        return () => {
            app.executarPrompt = undefined
            app.copiarOutput = undefined
            app.colarNoInput = undefined
            app.limparTudo = undefined
            window.removeEventListener("framerExecutarArrumadorSaida", lidarComExecutarOuvinte)
            window.removeEventListener("framerCopiarArrumadorSaida", lidarComCopiarOuvinte)
            window.removeEventListener("framerColarArrumadorSaida", lidarComColarOuvinte)
            window.removeEventListener("framerLimparArrumadorSaida", lidarComLimparOuvinte)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [app, dispararRequisicao])

    // Expose actions via useImperativeHandle
    useImperativeHandle(ref, () => ({
        executarPrompt: () => dispararRequisicao(),
        copiarOutput: () => {
            const textoLimpo = rawMarkdownRef.current
                .replaceAll("$.", " ")
                .replaceAll("$", " ")
            if (textoLimpo) navigator.clipboard.writeText(textoLimpo)
        },
        colarNoInput: async () => {
            try {
                const txt = await navigator.clipboard.readText()
                app.setTextoInput(txt)
            } catch {}
        },
        limparTudo: () => {
            app.setTextoInput("")
            setRawMarkdown("")
        },
    }), [app, dispararRequisicao, setRawMarkdown])

    const markdownExibido = rawMarkdown.replaceAll("$.", "").replaceAll("$", "")
    const totalOutput = rawMarkdown.length

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
                    --output-bg: #ffffff;
                    --output-border: #e2ddd6;
                    --output-text: #1e1c19;
                    --output-placeholder: #a89e90;
                    --output-streaming-focus: #c96a2a;
                    --counter-bg: rgba(255, 255, 255, 0.9);
                    --counter-text: #a89e90;
                }

                @media (prefers-color-scheme: dark) {
                    :root {
                        --output-bg: #1c1917;
                        --output-border: #2e2a24;
                        --output-text: #f5f5f4;
                        --output-placeholder: #57534e;
                        --output-streaming-focus: #e07a3b;
                        --counter-bg: rgba(28, 25, 23, 0.9);
                        --counter-text: #78716c;
                    }
                }

                .framer-custom-plain-output {
                    width: 100% !important;
                    height: 100% !important;
                    background: var(--output-bg) !important;
                    border: 1px solid var(--output-border) !important;
                    border-radius: 10px !important;
                    padding: 16px !important;
                    font-size: 14px !important;
                    line-height: 1.75 !important;
                    color: var(--output-text) !important;
                    box-sizing: border-box !important;
                    font-family: "Google Sans", sans-serif !important;
                    white-space: pre-wrap !important;
                    overflow-y: auto !important;
                    transition: background-color .2s, color .2s, border-color .2s;
                }
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
                .streaming-border { border-color: var(--output-streaming-focus) !important; }
            `}</style>

            <div
                className={`framer-custom-plain-output ${isStreaming ? "streaming-border" : ""}`}
            >
                {markdownExibido ? (
                    markdownExibido
                ) : (
                    <span
                        style={{
                            color: "var(--output-placeholder)",
                            fontStyle: "italic",
                        }}
                    >
                        {isStreaming
                            ? "arrumando..."
                            : "o prontuário perfeito vai aparecer aqui"}
                    </span>
                )}
            </div>

            {totalOutput > 0 && (
                <div className="framer-counter-tag">
                    {totalOutput.toLocaleString("pt-BR")} caract
                </div>
            )}
        </div>
    )
})

export default FormularioOutput
