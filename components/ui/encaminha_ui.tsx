import * as React from "react"
import { forwardRef, useImperativeHandle, useState, useEffect, useLayoutEffect, useMemo, useRef } from "react"
import type { CompanionActions } from "../companions/registry"
import { ESPECIALIDADES_ENCAMINHA, LIMITE_SUGESTAO_DEFAULT, type QuestaoEscolha, type QuestaoVerificacao } from "../../lib/encaminha-config"

const ENC_PREFIX = "encaminha"
const WORKER_URL = "https://typesafe.aogakid.workers.dev"

const injectStyles = `
  .${ENC_PREFIX}-root {
    --${ENC_PREFIX}-bg: #ffffff;
    --${ENC_PREFIX}-text: #1a1916;
    --${ENC_PREFIX}-text-muted: #6b6760;
    --${ENC_PREFIX}-input-bg: rgba(120,120,120,0.08);
    --${ENC_PREFIX}-border: rgba(120,120,120,0.15);
    --${ENC_PREFIX}-accent: #3b82f6;
    --${ENC_PREFIX}-accent-soft: rgba(59,130,246,0.08);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  @media (prefers-color-scheme: dark) {
    .${ENC_PREFIX}-root {
      --${ENC_PREFIX}-bg: #1c1917;
      --${ENC_PREFIX}-text: #f5f5f4;
      --${ENC_PREFIX}-text-muted: #78716c;
      --${ENC_PREFIX}-input-bg: #2e2b29;
      --${ENC_PREFIX}-border: rgba(255,255,255,0.15);
      --${ENC_PREFIX}-accent: #60a5fa;
      --${ENC_PREFIX}-accent-soft: rgba(96,165,250,0.12);
    }
  }

  .${ENC_PREFIX}-select {
    width: 100%;
    height: 42px;
    padding: 10px 14px;
    border-radius: 10px;
    background: var(--${ENC_PREFIX}-input-bg);
    border: 1px solid var(--${ENC_PREFIX}-border);
    color: var(--${ENC_PREFIX}-text);
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    outline: none;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    box-sizing: border-box;
    transition: border-color 0.15s ease;
  }

  .${ENC_PREFIX}-select:focus {
    border-color: var(--${ENC_PREFIX}-accent);
  }

  .${ENC_PREFIX}-textarea {
    width: 100%;
    min-height: 150px;
    resize: vertical;
    box-sizing: border-box;
    padding: 12px 14px;
    border-radius: 12px;
    background: var(--${ENC_PREFIX}-input-bg);
    border: 1px solid var(--${ENC_PREFIX}-border);
    color: var(--${ENC_PREFIX}-text);
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5;
    outline: none;
    transition: border-color 0.15s ease;
  }

  .${ENC_PREFIX}-textarea:focus {
    border-color: var(--${ENC_PREFIX}-accent);
  }

  .${ENC_PREFIX}-wrapper {
    position: relative;
  }

  .${ENC_PREFIX}-chips {
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: 10px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    overflow: hidden;
    pointer-events: none;
  }

  .${ENC_PREFIX}-chip {
    flex-shrink: 0;
    padding: 3px 10px;
    border-radius: 999px;
    background: var(--${ENC_PREFIX}-accent-soft);
    border: 1px solid var(--${ENC_PREFIX}-accent);
    color: var(--${ENC_PREFIX}-accent);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }

  .${ENC_PREFIX}-sugestoes {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 28px;
  }

  .${ENC_PREFIX}-status {
    font-size: 12px;
    font-weight: 600;
    color: var(--${ENC_PREFIX}-text-muted);
  }

  .${ENC_PREFIX}-debug {
    margin-top: 16px;
    padding: 12px;
    background: var(--${ENC_PREFIX}-input-bg);
    border: 1px solid var(--${ENC_PREFIX}-border);
    border-radius: 8px;
    font-size: 11px;
    font-family: monospace;
    overflow: auto;
    max-height: 200px;
  }
  .${ENC_PREFIX}-debug summary {
    cursor: pointer;
    font-weight: 600;
    color: var(--${ENC_PREFIX}-text-muted);
    margin-bottom: 8px;
  }
  .${ENC_PREFIX}-debug pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }
`

const styles = {
    container: {
        background: "var(--encaminha-bg)",
        color: "var(--encaminha-text)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "24px",
        borderRadius: "16px",
        width: "100%",
        boxSizing: "border-box" as const,
    },
    title: {
        fontSize: "20px",
        fontWeight: 700,
        marginBottom: "4px",
        color: "var(--encaminha-text)",
    },
    subtitle: {
        fontSize: "13px",
        color: "var(--encaminha-text-muted)",
        marginBottom: "4px",
    },
    field: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "6px",
        minWidth: 0,
    },
    label: {
        fontSize: "11px",
        textTransform: "uppercase" as const,
        letterSpacing: "0.05em",
        color: "var(--encaminha-text-muted)",
        fontWeight: 600,
    },
}

interface Props {
    style?: React.CSSProperties
}

interface RespostaVerificacao {
    type?: string
    noul?: number
}

interface DadosVerificacao {
    answers?: Record<string, RespostaVerificacao>
}

interface GrupoInstrucoes {
    sintomas: string[]
    question: string
}

interface QuestaoNoul {
    type: "noul"
    instructions: string | GrupoInstrucoes
    criteria: { true: string; false: string }
}

interface PerguntaEscolha {
    type: "choice"
    instructions: string
    criteria: Record<string, string>
}

interface CheckRow {
    id: string
    label: string
    ok: boolean
    minors: string[]
}

function presencaDeEscolha(questao: QuestaoEscolha): QuestaoVerificacao {
    return {
        id: questao.id,
        termo: questao.termo,
        verificacao: questao.verificacao,
        criterioSim: questao.criterioSim,
        criterioNao: questao.criterioNao,
        limite: questao.limite,
    }
}

const EncaminhaUI = forwardRef<CompanionActions, Props>(function EncaminhaUI({ style }, ref) {
    const [especialidade, setEspecialidade] = useState(ESPECIALIDADES_ENCAMINHA[0].id)
    const [texto, setTexto] = useState("")
    const [respostas, setRespostas] = useState<Record<string, number> | null>(null)
    const [debugAnswers, setDebugAnswers] = useState<Record<string, RespostaVerificacao> | null>(null)
    const [carregando, setCarregando] = useState(false)
    const [erro, setErro] = useState<string | null>(null)

    const seqRef = useRef(0)

    useEffect(() => {
        const seq = ++seqRef.current
        const verificar = async () => {
            const normalizado = texto.trim()
            if (!normalizado) {
                setRespostas(null)
                setErro(null)
                setCarregando(false)
                return
            }
            setCarregando(true)
            setErro(null)
            try {
                const esp = ESPECIALIDADES_ENCAMINHA.find(e => e.id === especialidade) || ESPECIALIDADES_ENCAMINHA[0]
                const questions: Record<string, QuestaoNoul | PerguntaEscolha> = {}
                for (const grupo of esp.grupos) {
                    questions[`grupo_${grupo.id}`] = {
                        type: "noul",
                        instructions: {
                            sintomas: grupo.sintomas,
                            question: "O texto contém a palavra de algum destes sintomas ou um sinônimo? Negativas também contam (ex.: 'nega febre', 'sem dor', 'afebril'). Responda sim se pelo menos uma palavra for encontrada, inclusive negada.",
                        },
                        criteria: {
                            true: "O texto contém a palavra ou um sinônimo de ao menos um dos sintomas listados, inclusive em frases negativas (nega, sem).",
                            false: "O texto não contém a palavra nem um sinônimo de nenhum dos sintomas listados, nem mesmo negando (nega, sem).",
                        },
                    }
                }
                const adicionarNoul = (questao: QuestaoVerificacao) => {
                    questions[questao.id] = {
                        type: "noul",
                        instructions: questao.verificacao,
                        criteria: { true: questao.criterioSim, false: questao.criterioNao },
                    }
                }
                for (const questao of esp.questoesBooleano) adicionarNoul(questao)
                for (const questao of esp.questoesEscolha) {
                    adicionarNoul(questao)
                    questions[questao.id + "__escolha"] = {
                        type: "choice",
                        instructions: questao.instrucoesEscolha,
                        criteria: questao.opcoes,
                    }
                }
                const resposta = await fetch(WORKER_URL, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                        state: {
                            texto: normalizado,
                            convencao: "Frases negativas contam como presença da palavra: 'nega febre', 'afebril', 'sem dor' contêm o sintoma mesmo quando o paciente não o apresenta.",
                        },
                        model: "jev-latest",
                        questions,
                    }),
                })
                if (seqRef.current !== seq) return
                if (!resposta.ok) {
                    const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null
                    if (seqRef.current !== seq) return
                    setErro((corpo && corpo.erro) || "falha ao verificar o texto")
                    setRespostas(null)
                    return
                }
                const dados = (await resposta.json()) as DadosVerificacao
                if (seqRef.current !== seq) return
                const mapa: Record<string, number> = {}
                const answers = dados.answers || {}
                for (const chave of Object.keys(answers)) {
                    const item = answers[chave]
                    if (item && typeof item.noul === "number") mapa[chave] = item.noul
                }
                setRespostas(mapa)
                setDebugAnswers(answers)
            } catch {
                if (seqRef.current !== seq) return
                setErro("não foi possível verificar o texto agora")
                setRespostas(null)
            } finally {
                if (seqRef.current === seq) setCarregando(false)
            }
        }
        const timeout = window.setTimeout(() => { void verificar() }, 1000)
        return () => { window.clearTimeout(timeout) }
    }, [texto, especialidade])

    const especialidadeAtual = ESPECIALIDADES_ENCAMINHA.find(e => e.id === especialidade) || ESPECIALIDADES_ENCAMINHA[0]

    const noulDe = (id: string): number => {
        if (!respostas || !(id in respostas)) return 1
        return respostas[id]
    }
    const limiteDe = (q: QuestaoVerificacao): number => q.limite ?? LIMITE_SUGESTAO_DEFAULT

    const temTexto = Boolean(texto.trim())

    const extrasAtuais = [
        ...especialidadeAtual.questoesBooleano,
        ...especialidadeAtual.questoesEscolha.map(presencaDeEscolha),
    ]

    const checkRows: CheckRow[] = temTexto
        ? [
              ...especialidadeAtual.grupos.map(grupo => ({
                  id: `grupo_${grupo.id}`,
                  label: grupo.label,
                  ok: noulDe(`grupo_${grupo.id}`) >= LIMITE_SUGESTAO_DEFAULT,
                  minors: grupo.sintomas,
              })),
              ...extrasAtuais.map(q => ({
                  id: q.id,
                  label: q.termo,
                  ok: noulDe(q.id) >= limiteDe(q),
                  minors: [],
              })),
          ]
        : []

    const totalFaltantes = checkRows.filter(row => !row.ok).length

    const gruposFaltantes = useMemo(() => temTexto && respostas
        ? especialidadeAtual.grupos
              .filter(grupo => (respostas[`grupo_${grupo.id}`] ?? 1) < LIMITE_SUGESTAO_DEFAULT)
              .map(grupo => ({ id: `grupo_${grupo.id}`, label: grupo.label }))
        : [], [temTexto, respostas, especialidadeAtual])

    const [limiteChips, setLimiteChips] = useState(0)
    const [linhasChips, setLinhasChips] = useState(0)
    const chipsRef = useRef<HTMLDivElement | null>(null)

    useLayoutEffect(() => {
        const el = chipsRef.current
        const atualizar = () => {
            if (!el || gruposFaltantes.length === 0) {
                setLimiteChips(0)
                setLinhasChips(0)
                return
            }
            const maxLargura = el.clientWidth
            let linhas = 1
            let largura = 0
            let naLinha = 0
            let n = 0
            for (const filho of Array.from(el.children) as HTMLElement[]) {
                const w = filho.offsetWidth
                const custo = w + (naLinha === 0 ? 0 : 6)
                if (naLinha > 0 && largura + custo > maxLargura) {
                    if (linhas >= 2) break
                    linhas++
                    largura = 0
                    naLinha = 0
                }
                largura += custo
                naLinha++
                n++
            }
            setLimiteChips(n)
            setLinhasChips(linhas)
        }
        atualizar()
        window.addEventListener("resize", atualizar)
        return () => window.removeEventListener("resize", atualizar)
    }, [gruposFaltantes])

    let statusTexto = ""
    if (carregando) statusTexto = "verificando…"
    else if (erro) statusTexto = erro
    else if (!texto.trim()) statusTexto = "descreva o quadro para receber sugestões"
    else if (respostas && totalFaltantes === 0) statusTexto = "as informações essenciais já estão descritas"

    const mudarTexto = (valor: string) => {
        setTexto(valor)
        if (!valor.trim()) {
            setRespostas(null)
            setDebugAnswers(null)
            setErro(null)
        }
    }

    const getOutputRef = useRef<(groupId: string) => string | null>(() => null)
    getOutputRef.current = (groupId: string): string | null => {
        if (groupId !== "texto") return null
        const normalizado = texto.trim()
        if (!normalizado) return null
        return `Encaminhamento — ${especialidadeAtual.label}:\n${normalizado}`
    }

    useImperativeHandle(ref, () => ({
        getOutput: (groupId: string) => getOutputRef.current(groupId),
        reset: () => (setTexto(""), setRespostas(null), setErro(null)),
    }), [])

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: injectStyles }} />
            <div className={`${ENC_PREFIX}-root`} style={{ ...styles.container, ...style }}>
                <div>
                    <div style={styles.title}>Encaminhamento</div>
                    <div style={styles.subtitle}>descreva o quadro e indique a especialidade</div>
                </div>

                <div style={styles.field}>
                    <span style={styles.label}>para qual especialidade?</span>
                    <select
                        className={`${ENC_PREFIX}-select`}
                        value={especialidade}
                        onChange={e => setEspecialidade(e.target.value)}
                    >
                        {ESPECIALIDADES_ENCAMINHA.map(esp => (
                            <option key={esp.id} value={esp.id}>{esp.label}</option>
                        ))}
                    </select>
                </div>

                <div style={styles.field}>
                    <span style={styles.label}>texto do quadro</span>
                    <div className={`${ENC_PREFIX}-wrapper`}>
                        <textarea
                            className={`${ENC_PREFIX}-textarea`}
                            style={linhasChips > 0 ? { paddingBottom: 10 + linhasChips * 22 + (linhasChips - 1) * 6 } : undefined}
                            value={texto}
                            onChange={e => mudarTexto(e.target.value)}
                            placeholder="descreva o quadro do paciente…"
                        />
                        {gruposFaltantes.length > 0 && (
                            <div className={`${ENC_PREFIX}-chips`} ref={chipsRef}>
                                {gruposFaltantes.map((chip, i) => (
                                    <span
                                        key={chip.id}
                                        className={`${ENC_PREFIX}-chip`}
                                        style={i < limiteChips ? undefined : { display: "none" }}
                                    >
                                        {chip.label}?
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className={`${ENC_PREFIX}-sugestoes`}>
                    {statusTexto && <span className={`${ENC_PREFIX}-status`}>{statusTexto}</span>}
                </div>

                {debugAnswers && (
                    <details className={`${ENC_PREFIX}-debug`}>
                        <summary>Jev debug</summary>
                        <pre>{JSON.stringify(debugAnswers, null, 2)}</pre>
                    </details>
                )}
            </div>
        </>
    )
})

export default EncaminhaUI