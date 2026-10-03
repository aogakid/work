/* ── Encaminhamento ────────────────────────────────────────────────────
   A geração do encaminhamento é compartilhada entre o encaminhador antigo
   (`encaminhador_ui_saida`) e o companion "Encaminhar" do bloco. O texto de
   origem muda (lá vem de um input, aqui vem do próprio bloco), mas prompt,
   modelo e streaming precisam ser idênticos. */

const WORKER_URL = "https://soapformatter.aogakid.workers.dev"
const MODELO = "openai/gpt-oss-120b"

const SYSTEM_PROMPT = `Você é um médico de família gerando um resumo clínico para encaminhamento.

Regras:
- Output: um único parágrafo corrido, sem listas, sem formatação.
- Incluir apenas informações relevantes para a especialidade/exame solicitado.
- Linguagem técnica, objetiva, norma culta do português.
- A primeira linha deve ser "ENCAMINHAMENTO" ou "SOLICITAÇÃO" e só na próxima iniciar o parágrafo.
- A última linha deve conter o CID-10 mais próximo da hipótese diagnóstica.
- Não inventar informações. Usar apenas o que está no prontuário.
- Não repetir informações já presentes.
- A ordem do output deve ser o modelo.
- Tamanho máximo: 10 linhas.

Modelo de output:

Paciente de [idade] anos, portador de [condições crônicas], com queixas de [sintomas relevantes] há [tempo]. [partes do exame físico/complementar relevantes]. Considerando [hipótese diagnóstica ou objetivo do encaminhamento/exame], encaminho para avaliação da [especialidade]/solicito [exame].
CID-10: [CID]`

export function montarPromptEncaminhamento(especialidade: string, texto: string): string {
    return `Especialidade de destino: ${especialidade}\n\nProntuário:\n${texto}`
}

export interface OpcoesEncaminhamento {
    especialidade: string
    texto: string
    /** Chamado a cada trecho recebido, já com o texto acumulado. */
    aoReceber: (acumulado: string) => void
    signal?: AbortSignal
}

/** Faz o streaming do encaminhamento e devolve o texto completo. */
export async function executarEncaminhamento(opcoes: OpcoesEncaminhamento): Promise<string> {
    const resposta = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: MODELO,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: montarPromptEncaminhamento(opcoes.especialidade, opcoes.texto) },
            ],
            temperature: 0.2,
            max_tokens: 1000,
            stream: true,
        }),
        signal: opcoes.signal,
    })

    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`)

    const reader = resposta.body?.getReader()
    if (!reader) throw new Error("sem stream")

    const decoder = new TextDecoder()
    let buffer = ""
    let acumulado = ""
    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const linhas = buffer.split("\n")
        buffer = linhas.pop() || ""
        for (const linha of linhas) {
            if (!linha.startsWith("data: ")) continue
            const crua = linha.slice(6).trim()
            if (!crua || crua === "[DONE]") continue
            try {
                const json = JSON.parse(crua)
                const parte = json.choices?.[0]?.delta?.content
                if (parte) {
                    acumulado += parte
                    opcoes.aoReceber(acumulado)
                }
            } catch {
                /* pedaço SSE truncado ou keep-alive: ignora */
            }
        }
    }
    return acumulado
}
