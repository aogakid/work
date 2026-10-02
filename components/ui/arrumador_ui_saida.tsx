import * as React from "react"
import { forwardRef, useImperativeHandle } from "react"
import { useApp } from "../contexts/AppContext"

const WORKER_URL = "https://soapformatter.aogakid.workers.dev"

const SYSTEM_PROMPT = `Você é um formatador de prontuários médicos

Objetivo:
Transformar o texto em estrutura SOAP preservando o máximo possível do conteúdo original

Regras obrigatórias:
- Preservar todos os níveis e itens das listas: não achatar nem omitir subitens
- Item de primeiro nível sem subitens: escrever como "- Item"
- Item de primeiro nível com subitens: escrever o texto sem hífen; seus itens filhos começam na linha seguinte como "- Item filho"
- Terceiro nível: usar dois espaços antes de "- "; níveis seguintes acrescentam dois espaços por nível
- Em campos multilinha, cada quebra de linha vira um item com hífen no mesmo nível do primeiro item
- Inserir uma linha em branco antes de um grupo de primeiro nível com subitens quando ele não for o primeiro item após o cabeçalho "##"
- Inserir "---" em uma linha própria imediatamente antes de "## Subjetivo", separando Dados base/Lista de Problemas das seções SOAP
- Não resumir ou omitir informações: aquelas que não encaixar em nenhum tópico devem ser colocadas no final do subjetivo
- Não sintetizar sintomas, inferir diagnósticos ou definir condutas
- Não inventar conteúdo
- A identificação deve ficar na seção "## Dados base" subseção "- Id:", e nunca dentro do Subjetivo
- A linha de identificação deve ser única e sequencial, com os dados separados por vírgula, na ordem: nome, idade, estado civil, composição familiar, acompanhante, religião, escolaridade, ocupação, naturalidade, residência, procedência, ACS
- O sexo nunca deve ser escrito na linha de identificação: é um dado da interface e fica fora do texto salvo. Se o original trouxer "M" ou "F" isolado, omitir
- O estado civil deve usar um destes valores: solteiro(a), casado(a), união estável, separado(a), divorciado(a), viúvo(a). Se casado, escrever "casado com <nome>"
- A escolaridade deve usar um destes valores: analfabeto, alfabetizado, ensino fundamental incompleto, ensino fundamental completo, ensino médio incompleto, ensino médio completo, ensino superior incompleto, ensino superior completo, pós-graduação
- O acompanhante deve ser escrito como "acompanhante: <nome e parentesco>", por exemplo "acompanhante: filha Maria"
- Omitir a linha de acompanhante quando não houver informação; não deixar placeholder vazio
- A naturalidade deve ser escrita como "natural de <lugar>", a residência como "residente em <lugar>" e a procedência como "procedente de <cidade>"
- Não reescrever nem reinterpretar a identificação original: apenas reordenar os dados em uma linha
- Agrupar na HDA queixas relacionadas em parágrafos
- Não trazer dados do Objetivo para o Subjetivo, nem duplicar informações já presentes
- As informações de Avaliação/Análise e Plano/Conduta devem ser concisas
- Campos sem informação: $
- Output apenas em markdown puro, sem negritos

CAPITALIZAÇÃO
- Deve seguir a norma culta do português obrigatoriamente: capitalizar a primeira letra de frases, listas e nomes próprios
- Siglas clínicas clássicas e abreviações devem manter o padrão usado no texto original

Exames laboratoriais quando presentes devem seguir o formato:
(DD/MM/AAAA): Hb 99 // Ht 99 // etc.

Modelo de output:

# Consulta Agendada

## Dados base
- Id: 

Antecedentes
- Pessoais
  - Condições
    - 
  - Hospitalar
    - 
  - Medicamentos
    - 
  - Alergias: 
  - Vacinação: 
- Familiares: 

Hábitos
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

## Lista de Problemas
Ativos:
- 

Latentes:
- 

Resolvidos:
- 

---

## Subjetivo

Motivo
- 

## Objetivo
Exame físico
- SSVV: 
- Ect: 
- AC: 
- AR: 
- Ext: 

Complementar
- Laboratório
  - 
- Imagem
  - 
- Escores
  - 

## Avaliação
- 

## Plano
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
