import * as React from "react"
import { forwardRef, useImperativeHandle } from "react"
import { createClient } from "@supabase/supabase-js"
import { useEditor, useTimer } from "../contexts/AppContext"

const supabase = createClient(
    "https://odqdzyqjpufitvahrhiq.supabase.co",
    "sb_publishable_5ftHtUIl4DlyHy9KQ-jvGw_AfnhQn1Q"
)

export interface BlocoActions {
    copiar(): void
    colar(): void
    substituir(texto: string): void
    limpar(): void
    cronometro(): void
}

const Bloco = forwardRef<BlocoActions>(function Bloco(_props, ref) {
    const editor = useEditor()
    const timer = useTimer()
    const editorRef = React.useRef<HTMLDivElement>(null)
    const [markdownContent, setMarkdownContent] = React.useState("")
    const initialContentRef = React.useRef<string | null>(null)
    const [saveTime, setSaveTime] = React.useState<string | null>(null)
    const [showSavePopup, setShowSavePopup] = React.useState(false)
    const [username, setUsername] = React.useState<string | null>(null)
    const [showUsernameInput, setShowUsernameInput] = React.useState(true)
    const [inputUsername, setInputUsername] = React.useState("")
    const usernameInputRef = React.useRef<HTMLInputElement>(null)

    // --- ESTADOS DO CRONÔMETRO ---
    const [tempoLimite, setTempoLimite] = React.useState<number>(15)
    const [segundosDecorridos, setSegundosDecorridos] =
        React.useState<number>(0)
    const [cronometroAtivo, setCronometroAtivo] = React.useState<boolean>(false)
    const [mostrarSetupRelogio, setMostrarSetupRelogio] =
        React.useState<boolean>(false)
    const [relogioExiting, setRelogioExiting] = React.useState<boolean>(false)
    const [isPaused, setIsPaused] = React.useState<boolean>(false)
    const [hoverTimer, setHoverTimer] = React.useState<boolean>(false)
    const [mostrarBurocracia, setMostrarBurocracia] = React.useState<boolean>(false)
    const [tempoBurocracia, setTempoBurocracia] = React.useState<number>(15)

    const [shakeTimeCount, setShakeTimeCount] = React.useState<number>(0)
    const [shakeProgressCount, setShakeProgressCount] =
        React.useState<number>(0)
    const [arquivadoManualmente, setArquivadoManualmente] =
        React.useState<boolean>(false)

    const ultimoPercentualRef = React.useRef<number>(0)
    const ultimaSecaoRef = React.useRef<string>("S")
    const momentoInicioRef = React.useRef<number>(0)
    const segundosAcumuladosRef = React.useRef<number>(0)
    const relogioRef = React.useRef<SVGSVGElement>(null)

    // Função auxiliar para sanitização rigorosa de caracteres fantasmas
    const limparTextoInvisivel = (txt: string): string => {
        return (txt || "")
            .replace(/\u00A0/g, " ") // Converte Non-Breaking Space para espaço comum
            .replace(/\u200B/g, "") // Remove Zero-Width Space completamente
            .split("\n")
            .map((line) => {
                const trimmed = line.trimEnd()
                // Se a linha original terminava com '-' seguido de espaço(s), preservamos exatamente um espaço após o '-'
                if (trimmed.endsWith("-") && line.match(/^[\s\t]*- +$/)) {
                    return trimmed + " "
                }
                return trimmed
            })
            .filter((line, index, arr) => {
                // Keep line if it's not empty, or if it's the only empty line between non-empty lines
                if (line !== "") return true
                const prevEmpty = index > 0 && arr[index - 1] === ""
                const nextEmpty = index < arr.length - 1 && arr[index + 1] === ""
                return !prevEmpty && !nextEmpty
            })
            .join("\n")
    }

    const executarRenderStyles = () => {
        if (!editorRef.current) return
        editorRef.current.childNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement
                const text = el.innerText || ""
                el.style.paddingLeft = ""

                if (text.startsWith("# ")) el.className = "md-h1"
                else if (text.startsWith("## ")) el.className = "md-h2"
                else if (/^[\s\t]*- /.test(text)) {
                    el.className = "md-li"
                    const spaceCount =
                        text.match(/^([\s\t]*)- /)?.[1].length || 0
                    if (spaceCount > 0)
                        el.style.paddingLeft = `${spaceCount * 12}px`
                } else el.className = "md-body"
            }
        })
    }

    const atualizarConteudoEditor = (texto: string) => {
        const textoSanitizado = limparTextoInvisivel(texto)
        setMarkdownContent(textoSanitizado)
        if (editorRef.current) {
            editorRef.current.innerHTML =
                textoSanitizado === ""
                    ? "<div><br></div>"
                    : textoSanitizado
                          .split("\n")
                          .map((l) =>
                              l === "" ? "<div><br></div>" : `<div>${l}</div>`
                          )
                          .join("")
        }
        setTimeout(() => {
            executarRenderStyles()
        }, 15)
    }

    async function load() {
        if (!username) return
        const { data } = await supabase
            .from("pages")
            .select("*")
            .eq("id", username)
            .single()
        if (data?.content && editorRef.current) {
            initialContentRef.current = limparTextoInvisivel(data.content)
            atualizarConteudoEditor(data.content)
        } else {
            initialContentRef.current = ""
            atualizarConteudoEditor("")
        }
    }

    React.useEffect(() => {
        if (username) {
            load()
        }

        const lidarComSubstituicaoOuvinte = (e: Event) => {
            const customEvent = e as CustomEvent
            if (
                customEvent.detail &&
                typeof customEvent.detail.texto === "string"
            ) {
                atualizarConteudoEditor(customEvent.detail.texto)
            }
        }

        document.addEventListener(
            "framerSubstituirTexto",
            lidarComSubstituicaoOuvinte
        )

        const lidarComCopiarOuvinte = () => {
            editor.copiar()
        }
        window.addEventListener("framerCopiar", lidarComCopiarOuvinte)

        const lidarComColarOuvinte = () => {
            editor.colar()
        }
        window.addEventListener("framerColar", lidarComColarOuvinte)

        const lidarComLimparOuvinte = () => {
            editor.substituir("")
        }
        window.addEventListener("framerLimpar", lidarComLimparOuvinte)

        const lidarComCronometroOuvinte = () => {
            timer.ativarCronometro()
        }
        window.addEventListener("framerCronometro", lidarComCronometroOuvinte)

        editor.copiar = () => {
            if (editorRef.current) {
                const textoLimpo = limparTextoInvisivel(
                    editorRef.current.innerText
                )
                navigator.clipboard.writeText(textoLimpo)
            }
        }
        editor.colar = async () => {
            try {
                const text = await navigator.clipboard.readText()
                atualizarConteudoEditor(text)
            } catch (err) {
                console.error(err)
            }
        }
        editor.substituir = (novoTexto) => {
            atualizarConteudoEditor(novoTexto || "")
        }

        timer.ativarCronometro = () => {
            fecharCronometroCompleto()
            setMostrarSetupRelogio(true)
        }

        return () => {
            document.removeEventListener(
                "framerSubstituirTexto",
                lidarComSubstituicaoOuvinte
            )
            window.removeEventListener("framerCopiar", lidarComCopiarOuvinte)
            window.removeEventListener("framerColar", lidarComColarOuvinte)
            window.removeEventListener("framerLimpar", lidarComLimparOuvinte)
            window.removeEventListener("framerCronometro", lidarComCronometroOuvinte)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [username])

    React.useEffect(() => {
        let interval: NodeJS.Timeout

        if (cronometroAtivo && !isPaused && !arquivadoManualmente) {
            momentoInicioRef.current =
                Date.now() - segundosAcumuladosRef.current * 1000

            interval = setInterval(() => {
                const momentoAtual = Date.now()
                const totalSegundosReais = Math.floor(
                    (momentoAtual - momentoInicioRef.current) / 1000
                )

                segundosAcumuladosRef.current = totalSegundosReais
                setSegundosDecorridos(totalSegundosReais)
            }, 250)
        }
        return () => clearInterval(interval)
    }, [cronometroAtivo, isPaused, arquivadoManualmente])

    React.useEffect(() => {
        if (
            initialContentRef.current === null ||
            markdownContent === initialContentRef.current ||
            !username
        )
            return
        setShowSavePopup(false)
        const timeout = setTimeout(async () => {
            const conteudoSalvar = limparTextoInvisivel(markdownContent)
            const expiresAt = new Date()
            expiresAt.setDate(expiresAt.getDate() + 7)
            await supabase.from("pages").upsert({
                id: username,
                username,
                content: conteudoSalvar,
                updated_at: new Date(),
                expires_at: expiresAt.toISOString(),
            })
            initialContentRef.current = conteudoSalvar
            const agora = new Date()
            const hh = String(agora.getHours()).padStart(2, "0")
            const mm = String(agora.getMinutes()).padStart(2, "0")
            setSaveTime(`${hh}:${mm}`)
        }, 800)
        return () => clearTimeout(timeout)
    }, [markdownContent, username])

    React.useEffect(() => {
        if (!saveTime) return
        const popupTimeout = setTimeout(() => {
            setShowSavePopup(true)
        }, 3000)
        return () => clearTimeout(popupTimeout)
    }, [saveTime, markdownContent])

    // Expose actions via useImperativeHandle
    useImperativeHandle(ref, () => ({
        copiar: () => {
            if (editorRef.current) {
                const textoLimpo = limparTextoInvisivel(
                    editorRef.current.innerText
                )
                navigator.clipboard.writeText(textoLimpo)
            }
        },
        colar: async () => {
            try {
                const text = await navigator.clipboard.readText()
                atualizarConteudoEditor(text)
            } catch (err) {
                console.error(err)
            }
        },
        substituir: (texto: string) => {
            atualizarConteudoEditor(texto || "")
        },
        limpar: () => {
            atualizarConteudoEditor("")
        },
        cronometro: () => {
            fecharCronometroCompleto()
            setMostrarSetupRelogio(true)
        },
    })) // eslint-disable-line react-hooks/exhaustive-deps

    const handleInput = () => {
        setMarkdownContent(
            limparTextoInvisivel(editorRef.current?.innerText || "")
        )
        executarRenderStyles()
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const selection = window.getSelection()
        if (!selection || !selection.rangeCount) return

        const range = selection.getRangeAt(0)
        if (!range) return

        const currentBlock =
            range.startContainer.parentElement === editorRef.current
                ? (range.startContainer as HTMLElement)
                : range.startContainer.parentElement

        if (e.key === "Enter" && currentBlock) {
            const text = currentBlock.innerText || ""
            if (text.trim() === "-") {
                e.preventDefault()
                document.execCommand("delete")
                document.execCommand("insertBlockquote")
                handleInput()
            } else {
                const listMatch = text.match(/^([\s\t]*-\s)/)
                if (listMatch) {
                    e.preventDefault()
                    document.execCommand(
                        "insertText",
                        false,
                        "\n" + listMatch[1]
                    )
                    handleInput()
                }
            }
        }

        if (e.key === "Tab" && currentBlock) {
            e.preventDefault()
            const text = currentBlock.innerText || ""
            const offset = range.startOffset

            if (
                e.shiftKey &&
                (/^  +-\s/.test(text) || text.startsWith("  - "))
            ) {
                currentBlock.innerText = text.substring(2)
                const newRange = document.createRange()
                newRange.setStart(
                    currentBlock.firstChild || currentBlock,
                    Math.max(0, offset - 2)
                )
                selection.removeAllRanges()
                selection.addRange(newRange)
            } else if (!e.shiftKey && /^[\s\t]*-\s/.test(text)) {
                currentBlock.innerText = "  " + text
                const newRange = document.createRange()
                newRange.setStart(
                    currentBlock.firstChild || currentBlock,
                    offset + 2
                )
                selection.removeAllRanges()
                selection.addRange(newRange)
            } else if (!e.shiftKey) {
                document.execCommand("insertText", false, "  ")
            }
            handleInput()
        }
    }

    const totalCaracteres = markdownContent.length
    const limiteAtingido = totalCaracteres > 4000

    const tratarMovimentoPonteiro = (clientX: number, clientY: number) => {
        if (!relogioRef.current) return
        const rect = relogioRef.current.getBoundingClientRect()
        const centroX = rect.left + rect.width / 2
        const centroY = rect.top + rect.height / 2

        const anguloRad = Math.atan2(clientY - centroY, clientX - centroX)
        let anguloGraus = anguloRad * (180 / Math.PI) + 90
        if (anguloGraus < 0) anguloGraus += 360

        let minutosCalculados = Math.round(anguloGraus / 6)
        if (minutosCalculados === 60 || minutosCalculados === 0) {
            minutosCalculados = 60
        }
        setTempoLimite(Math.min(60, Math.max(1, minutosCalculados)))
    }

    const iniciarArrastoPonteiro = (e: React.MouseEvent) => {
        tratarMovimentoPonteiro(e.clientX, e.clientY)
        const moverOuvinte = (moveEvent: MouseEvent) =>
            tratarMovimentoPonteiro(moveEvent.clientX, moveEvent.clientY)
        const soltarOuvinte = () => {
            window.removeEventListener("mousemove", moverOuvinte)
            window.removeEventListener("mouseup", soltarOuvinte)
        }
        window.addEventListener("mousemove", moverOuvinte)
        window.addEventListener("mouseup", soltarOuvinte)
    }

    const minutosPassados = Math.floor(segundosDecorridos / 60)
    const textoCronometro = cronometroAtivo
        ? `${String(minutosPassados).padStart(2, "0")} min.`
        : "00 min."

    const totalSegundosLimite = (tempoLimite + (mostrarBurocracia ? tempoBurocracia : 0)) * 60
    const limiteSegundosS = tempoLimite * 60 * 0.5
    const limiteSegundosO = tempoLimite * 60 * 0.6
    const limiteSegundosA = tempoLimite * 60 * 0.7
    const limiteSegundosP = tempoLimite * 60
    const limiteSegundosB = totalSegundosLimite

    let secaoAtual = "S"
    let secaoExtrapolada = false

    let progressoVaoS = 0
    let progressoVaoO = 0
    let progressoVaoA = 0
    let progressoVaoP = 0
    let progressoVaoB = 0
    let progressoExtrapolado = 0

    if (cronometroAtivo) {
        if (segundosDecorridos < limiteSegundosS) {
            secaoAtual = "S"
            progressoVaoS = (segundosDecorridos / limiteSegundosS) * 100
        } else if (segundosDecorridos < limiteSegundosO) {
            secaoAtual = "O"
            progressoVaoS = 100
            progressoVaoO =
                ((segundosDecorridos - limiteSegundosS) /
                    (limiteSegundosO - limiteSegundosS)) *
                100
        } else if (segundosDecorridos < limiteSegundosA) {
            secaoAtual = "A"
            progressoVaoS = 100
            progressoVaoO = 100
            progressoVaoA =
                ((segundosDecorridos - limiteSegundosO) /
                    (limiteSegundosA - limiteSegundosO)) *
                100
        } else if (segundosDecorridos < limiteSegundosP) {
            secaoAtual = "P"
            progressoVaoS = 100
            progressoVaoO = 100
            progressoVaoA = 100
            progressoVaoP =
                ((segundosDecorridos - limiteSegundosA) /
                    (limiteSegundosP - limiteSegundosA)) *
                100
        } else if (mostrarBurocracia && segundosDecorridos < limiteSegundosB) {
            secaoAtual = "B"
            progressoVaoS = 100
            progressoVaoO = 100
            progressoVaoA = 100
            progressoVaoP = 100
            progressoVaoB =
                ((segundosDecorridos - limiteSegundosP) /
                    (limiteSegundosB - limiteSegundosP)) *
                100
        } else {
            secaoAtual = "FIM"
            secaoExtrapolada = true
            progressoVaoS = 100
            progressoVaoO = 100
            progressoVaoA = 100
            progressoVaoP = 100
            progressoVaoB = 100
            const baseLimite = mostrarBurocracia ? limiteSegundosB : limiteSegundosP
            progressoExtrapolado = Math.min(
                (segundosDecorridos - baseLimite) * 0.35,
                55
            )
        }
    }

    React.useEffect(() => {
        if (
            !cronometroAtivo ||
            isPaused ||
            arquivadoManualmente ||
            totalSegundosLimite <= 0
        )
            return

        const percentualAtual = Math.floor(
            (segundosDecorridos / totalSegundosLimite) * 10
        )
        if (
            percentualAtual > ultimoPercentualRef.current &&
            percentualAtual <= 10 &&
            percentualAtual > 0
        ) {
            ultimoPercentualRef.current = percentualAtual
            setShakeTimeCount((prev) => prev + 1)
        }

        if (secaoAtual !== ultimaSecaoRef.current) {
            ultimaSecaoRef.current = secaoAtual
            setShakeProgressCount((prev) => prev + 1)
        }
    }, [
        segundosDecorridos,
        cronometroAtivo,
        isPaused,
        secaoAtual,
        totalSegundosLimite,
        arquivadoManualmente,
    ])

    let corDinamicaPopup = "#3b82f6"
    let bgDinamicoPopup = "rgba(59, 130, 246, 0.12)"
    let borderDinamicaPopup = "rgba(59, 130, 246, 0.25)"

    if (tempoLimite > 15 && tempoLimite <= 30) {
        corDinamicaPopup = "#22c55e"
        bgDinamicoPopup = "rgba(34, 197, 94, 0.12)"
        borderDinamicaPopup = "rgba(34, 197, 94, 0.25)"
    } else if (tempoLimite > 30 && tempoLimite <= 45) {
        corDinamicaPopup = "#eab308"
        bgDinamicoPopup = "rgba(234, 179, 8, 0.12)"
        borderDinamicaPopup = "rgba(234, 179, 8, 0.25)"
    } else if (tempoLimite > 45) {
        corDinamicaPopup = "#ef4444"
        bgDinamicoPopup = "rgba(239, 68, 68, 0.12)"
        borderDinamicaPopup = "rgba(239, 68, 68, 0.25)"
    }

    let chipBg = "rgba(59, 130, 246, 0.12)"
    let chipBorder = "rgba(59, 130, 246, 0.25)"
    let chipTextColor = "#3b82f6"

    if (cronometroAtivo) {
        if (arquivadoManualmente) {
            chipBg = "rgba(120, 113, 108, 0.1)"
            chipBorder = "rgba(120, 113, 108, 0.2)"
            chipTextColor = "var(--meta-text)"
        } else if (secaoExtrapolada) {
            chipBg = "#ef4444"
            chipBorder = "#ef4444"
            chipTextColor = "#ffffff"
        } else {
            if (secaoAtual === "S") {
                chipBg = "rgba(59, 130, 246, 0.12)"
                chipBorder = "rgba(59, 130, 246, 0.25)"
                chipTextColor = "#3b82f6"
            } else if (secaoAtual === "O") {
                chipBg = "rgba(34, 197, 94, 0.12)"
                chipBorder = "rgba(34, 197, 94, 0.25)"
                chipTextColor = "#22c55e"
            } else if (secaoAtual === "A") {
                chipBg = "rgba(234, 179, 8, 0.12)"
                chipBorder = "rgba(234, 179, 8, 0.25)"
                chipTextColor = "#d9a707"
            } else if (secaoAtual === "P") {
                chipBg = "rgba(249, 115, 22, 0.12)"
                chipBorder = "rgba(249, 115, 22, 0.25)"
                chipTextColor = "#f97316"
            } else if (secaoAtual === "B") {
                chipBg = "rgba(139, 92, 246, 0.12)"
                chipBorder = "rgba(139, 92, 246, 0.25)"
                chipTextColor = "#8b5cf6"
            }
        }
    }

    const dispararCronometroAtivo = () => {
        setMostrarSetupRelogio(false)
        setArquivadoManualmente(false)
        setSegundosDecorridos(0)
        segundosAcumuladosRef.current = 0
        ultimoPercentualRef.current = 0
        ultimaSecaoRef.current = "S"
        setShakeTimeCount(0)
        setShakeProgressCount(0)
        momentoInicioRef.current = Date.now()
        setCronometroAtivo(true)
        setIsPaused(false)
    }

    const fecharCronometroCompleto = () => {
        setCronometroAtivo(false)
        setIsPaused(false)
        setArquivadoManualmente(false)
        setSegundosDecorridos(0)
        segundosAcumuladosRef.current = 0
        ultimoPercentualRef.current = 0
        ultimaSecaoRef.current = "S"
        setShakeTimeCount(0)
        setShakeProgressCount(0)
        setMostrarSetupRelogio(false)
    }

    const exibirControlesPainel = hoverTimer || isPaused

    return (
        <div
            className="framer-editor-container"
            style={{
                width: "100%",
                height: "100%",
                borderRadius: "10px",
                boxSizing: "border-box",
                overflow: "hidden",
                position: "relative",
            }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
                
                :root {
                    --editor-bg: #ffffff;
                    --editor-border: #e2ddd6;
                    --editor-shadow: 0 1px 4px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.03);
                    --editor-text: #000000;
                    --editor-placeholder: #a8a29e;
                    --meta-bg: rgba(245, 245, 244, 0.9);
                    --meta-border: #e7e5e4;
                    --meta-text: #78716c;
                    --limite-bg: rgba(254, 226, 226, 0.9);
                    --limite-border: #fca5a5;
                    --limite-text: #dc2626;
                }

                @media (prefers-color-scheme: dark) {
                    :root {
                        --editor-bg: #1c1917;
                        --editor-border: #2e2a24;
                        --editor-shadow: 0 1px 4px rgba(0,0,0,.2), 0 4px 16px rgba(0,0,0,.3);
                        --editor-text: #f5f5f4;
                        --editor-placeholder: #57534e;
                        --meta-bg: rgba(38, 38, 38, 0.9);
                        --meta-border: #262626;
                        --meta-text: #a3a3a3;
                        --limite-bg: rgba(69, 10, 10, 0.9);
                        --limite-border: #7f1d1d;
                        --limite-text: #fca5a5;
                    }
                }

                .framer-editor-container { background: var(--editor-bg); border: 1px solid var(--editor-border); box-shadow: var(--editor-shadow); }
                .framer-markdown-editor { font-family: "Google Sans Flex", "Google Sans", sans-serif; font-weight: 400}
                .framer-markdown-editor div { margin-bottom: 6px; color: var(--editor-text) !important; line-height: 1.5; }
                
                /* ESTILOS DE RENDERIZAÇÃO DO MARKDOWN */
                .framer-markdown-editor .md-h1 { font-family: "Playfair Display", serif; font-size: 24px; font-weight: 900; margin-top: 16px; margin-bottom: 8px; }
                .framer-markdown-editor .md-h2 { font-family: "Playfair Display", serif; font-size: 20px; font-weight: 600; margin-top: 24px; margin-bottom: 6px; }
                .framer-markdown-editor .md-h2::before {
                    content: "";
                    display: block;
                    height: 1px;
                    background: var(--editor-border);
                    margin-bottom: 12px;
                }
                .framer-markdown-editor .md-li { display: block; margin-bottom: 4px; }
                .framer-markdown-editor .md-body { font-size: 15px; font-weight: 400; }

                .gas-ui-blockout {
                    user-select: none !important;
                    -webkit-user-select: none !important;
                    pointer-events: auto;
                }

                @keyframes gasPopIn {
                    0% { transform: scale(0.7) translateY(8px); opacity: 0; }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }
                .framer-timer-entrance { animation: gasPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

                @keyframes gasFadeOut {
                    0% { opacity: 1; transform: scale(1) translateY(0); }
                    100% { opacity: 0; transform: scale(0.95) translateY(8px); }
                }
                .framer-timer-exit {
                    animation: gasFadeOut 0.2s cubic-bezier(0.25, 1, 0.5, 1) forwards !important;
                }

                @keyframes gasAmplifiedShake {
                    0%, 100% { transform: scale(1) rotate(0deg); }
                    12%, 36%, 60% { transform: scale(1.16) rotate(-6deg); }
                    24%, 48%, 72% { transform: scale(1.16) rotate(6deg); }
                    80% { transform: scale(1.04) rotate(-2deg); }
                    90% { transform: scale(1.01) rotate(1deg); }
                }
                .gas-soap-heavy-trigger { animation: gasAmplifiedShake 0.95s cubic-bezier(0.25, 1, 0.5, 1) forwards; transform-origin: center center; }

                @keyframes gasPlayPulse {
                    0%, 100% { opacity: 0.35; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.12); }
                }
                .gas-play-pulse-btn { animation: gasPlayPulse 1.4s ease-in-out infinite; }

                @keyframes gasSlowCriticalBlink {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.12); }
                }
                .gas-critical-svg-pulse { animation: gasSlowCriticalBlink 2.4s ease-in-out infinite; transform-origin: center center; display: inline-block; }
                
                .gas-soap-track {
                    height: 2px;
                    background: rgba(120, 113, 108, 0.16);
                    border-radius: 1px;
                    align-self: center;
                    position: relative;
                    overflow: hidden;
                    transition: width 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.4s ease;
                }
                
                .gas-hover-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 16px;
                    height: 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background 0.2s, transform 0.1s;
                    font-size: 8px;
                    border: none;
                }
                .gas-hover-btn:active { transform: scale(0.85); }
                .gas-hover-btn:hover { transform: scale(1.12); }
                .gas-scale-hover {
                    transition: transform 0.2s ease-in-out, background 0.2s, opacity 0.2s, box-shadow 0.2s;
                }
                .gas-scale-hover:hover:not(:disabled) {
                    transform: scale(1.05);
                }
                .gas-scale-hover:active:not(:disabled) {
                    transform: scale(0.95);
                }
                input[type="number"]::-webkit-inner-spin-button,
                input[type="number"]::-webkit-outer-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                input[type="number"] {
                    -moz-appearance: textfield;
                }

                .gas-btn-pause-bars {
                    font-weight: 700 !important;
                    font-size: 8px !important;
                    letter-spacing: 0.5px !important;
                    transform: scaleY(0.95);
                }

                .gas-responsive-footer-bar {
                    position: absolute;
                    bottom: 0px;
                    left: 0px;
                    right: 0px;
                    padding: 16px;
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: flex-start;
                    gap: 12px;
                    pointer-events: none;
                    z-index: 10;
                }

                .gas-order-chars {
                    margin-left: auto;
                }

                @media (max-width: 520px) {
                    .gas-responsive-footer-bar {
                        display: grid;
                        grid-template-columns: auto 1fr;
                        gap: 10px 0px;
                        padding: 12px;
                    }
                    .gas-order-progress {
                        grid-row: 1;
                        grid-column: span 2;
                        justify-self: start;
                        width: max-content !important;
                    }
                    .gas-order-time {
                        grid-row: 2;
                        grid-column: 1;
                        justify-self: start;
                        width: max-content;
                    }
                    .gas-order-chars {
                        grid-row: 2;
                        grid-column: 2;
                        justify-self: end;
                        margin-left: 0 !important;
                    }
                }
            `}</style>

            {/* USERNAME INPUT MODAL */}
            {showUsernameInput && (
                <div
                    className="framer-timer-entrance gas-ui-blockout"
                    style={{
                        position: "absolute",
                        top: "0",
                        left: "0",
                        right: "0",
                        bottom: "0",
                        background: "rgba(0, 0, 0, 0.5)",
                        backdropFilter: "blur(8px)",
                        zIndex: 30,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxSizing: "border-box",
                    }}
                >
                    <div
                        style={{
                            background: "var(--editor-bg)",
                            border: "1px solid var(--editor-border)",
                            borderRadius: "20px",
                            padding: "24px",
                            width: "280px",
                            maxWidth: "90vw",
                            boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                            boxSizing: "border-box",
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        <div
                            style={{
                                fontSize: "14px",
                                fontWeight: 600,
                                color: "var(--editor-text)",
                                marginBottom: "16px",
                                fontFamily: '"Google Sans Flex", sans-serif',
                                boxSizing: "border-box",
                            }}
                        >
                            digite seu usuário
                        </div>
                        <input
                            ref={usernameInputRef}
                            type="text"
                            placeholder="aogakid"
                            value={inputUsername}
                            onChange={(e) => setInputUsername(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    const name = inputUsername.trim()
                                    if (name) {
                                        setUsername(name)
                                        setShowUsernameInput(false)
                                    }
                                }
                            }}
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: "12px",
                                border: "1px solid var(--editor-border)",
                                background: "var(--editor-bg)",
                                color: "var(--editor-text)",
                                fontSize: "13px",
                                fontFamily: '"Google Sans Flex", sans-serif',
                                outline: "none",
                                marginBottom: "12px",
                                boxSizing: "border-box",
                            }}
                        />
                        <button
                            className="gas-scale-hover"
                            disabled={!inputUsername.trim()}
                            onClick={() => {
                                const name = inputUsername.trim()
                                if (name) {
                                    setUsername(name)
                                    setShowUsernameInput(false)
                                }
                            }}
                            style={{
                                width: "100%",
                                padding: "10px",
                                borderRadius: "12px",
                                border: "none",
                                background: inputUsername.trim() ? "#3b82f6" : "rgba(120, 113, 108, 0.2)",
                                color: inputUsername.trim() ? "#ffffff" : "var(--meta-text)",
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: inputUsername.trim() ? "pointer" : "not-allowed",
                                fontFamily: '"Google Sans Flex", sans-serif',
                                boxSizing: "border-box",
                            }}
                        >
                            acessar
                        </button>
                        <div
                            style={{
                                fontSize: "10px",
                                color: "var(--meta-text)",
                                marginTop: "12px",
                                textAlign: "center",
                                lineHeight: "1.4",
                                fontFamily: '"Google Sans Flex", sans-serif',
                                opacity: 0.8,
                                boxSizing: "border-box",
                            }}
                        >
                            suas anotações expiram automaticamente após 7 dias de inatividade
                        </div>
                    </div>
                </div>
            )}

            {/* CHIP DE SALVO */}
            {showSavePopup && saveTime && (
                <div
                    className="framer-timer-entrance gas-ui-blockout"
                    style={{
                        position: "absolute",
                        top: "16px",
                        right: "16px",
                        background: "rgba(34, 197, 94, 0.12)",
                        backdropFilter: "blur(12px)",
                        border: "1px solid rgba(34, 197, 94, 0.25)",
                        borderRadius: "8px",
                        padding: "6px 12px",
                        zIndex: 20,
                        fontFamily: '"Google Sans Flex", sans-serif',
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#22c55e",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                    }}
                >
                    <span>✓</span>
                    <span>salvo às {saveTime}</span>
                </div>
            )}

            {/* POPUP DE SELEÇÃO DINÂMICO */}
            {mostrarSetupRelogio && (
                <>
                    <div
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 19,
                            background: "transparent",
                            pointerEvents: "auto",
                        }}
                        onClick={() => setRelogioExiting(true)}
                    />
                    <div
                        className={`framer-timer-entrance gas-ui-blockout ${relogioExiting ? "framer-timer-exit" : ""}`}
                        onAnimationEnd={() => {
                            if (relogioExiting) {
                                setMostrarSetupRelogio(false)
                                setRelogioExiting(false)
                            }
                        }}
                    style={{
                        position: "absolute",
                        bottom: "16px",
                        left: "16px",
                        background: bgDinamicoPopup,
                        backdropFilter: "blur(12px)",
                        border: `1px solid ${borderDinamicaPopup}`,
                        borderRadius: "12px",
                        padding: "14px",
                        zIndex: 20,
                        fontFamily: '"Google Sans Flex", sans-serif',
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                        width: "160px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            width: "100%",
                            justifyContent: "center",
                            alignItems: "center",
                            marginBottom: "10px",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "9px",
                                fontWeight: 700,
                                color: corDinamicaPopup,
                                letterSpacing: "0.8px",
                            }}
                        >
                            TEMPO
                        </span>
                    </div>

                    <svg
                        ref={relogioRef}
                        onMouseDown={iniciarArrastoPonteiro}
                        style={{
                            width: "84px",
                            height: "84px",
                            cursor: "ew-resize",
                            overflow: "visible",
                        }}
                    >
                        <circle
                            cx="42"
                            cy="42"
                            r="38"
                            fill="rgba(255,255,255,0.4)"
                            stroke="rgba(120, 113, 108, 0.2)"
                            strokeWidth="1.5"
                        />
                        <line
                            x1="42"
                            y1="4"
                            x2="42"
                            y2="9"
                            stroke="var(--editor-text)"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                        <line
                            x1="80"
                            y1="42"
                            x2="75"
                            y2="42"
                            stroke="var(--meta-text)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                        <line
                            x1="42"
                            y1="80"
                            x2="42"
                            y2="75"
                            stroke="var(--meta-text)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                        <line
                            x1="4"
                            y1="42"
                            x2="9"
                            y2="42"
                            stroke="var(--meta-text)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />

                        <circle
                            cx="42"
                            cy="42"
                            r="38"
                            fill="none"
                            stroke="var(--meta-text)"
                            strokeWidth="1.5"
                            strokeDasharray={`${2 * Math.PI * 38}`}
                            strokeDashoffset={`${2 * Math.PI * 38 * (1 - tempoLimite / 60)}`}
                            style={{ opacity: 0.15 }}
                        />

                        <g transform={`rotate(${tempoLimite * 6}, 42, 42)`}>
                            <line
                                x1="42"
                                y1="42"
                                x2="42"
                                y2="8"
                                stroke="var(--editor-text)"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                            <circle
                                cx="42"
                                cy="8"
                                r="3"
                                fill="var(--editor-text)"
                            />
                        </g>
                        <circle cx="42" cy="42" r="3" fill="var(--meta-text)" />
                    </svg>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginTop: "10px",
                            marginBottom: "10px",
                        }}
                    >
                        <button
                            className="gas-scale-hover"
                            onClick={() =>
                                setTempoLimite((prev) => Math.max(1, prev - 15))
                            }
                            style={{
                                background: "rgba(120,113,108,0.12)",
                                border: "none",
                                color: corDinamicaPopup,
                                borderRadius: "5px",
                                padding: "3px 7px",
                                fontSize: "10px",
                                fontWeight: 700,
                                cursor: "pointer",
                            }}
                        >
                            -15
                        </button>
                        <div
                            style={{
                                fontSize: "14px",
                                fontWeight: 700,
                                color: "var(--editor-text)",
                                display: "flex",
                                alignItems: "baseline",
                                gap: "2px",
                            }}
                        >
                            {tempoLimite}
                            <span
                                style={{
                                    fontSize: "10px",
                                    fontWeight: 500,
                                    color: "var(--meta-text)",
                                }}
                            >
                                minutos
                            </span>
                        </div>
                        <button
                            className="gas-scale-hover"
                            onClick={() =>
                                setTempoLimite((prev) =>
                                    Math.min(60, prev + 15)
                                )
                            }
                            style={{
                                background: "rgba(120,113,108,0.12)",
                                border: "none",
                                color: corDinamicaPopup,
                                borderRadius: "5px",
                                padding: "3px 7px",
                                fontSize: "10px",
                                fontWeight: 700,
                                cursor: "pointer",
                            }}
                        >
                            +15
                        </button>
                    </div>

                    {/* TOGGLE DE BUROCRACIA */}
                    <div
                        style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "8px",
                            marginTop: "8px",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "9px",
                                fontWeight: 600,
                                color: "var(--meta-text)",
                                letterSpacing: "0.5px",
                            }}
                        >
                            burocracia
                        </span>
                        <button
                            className="gas-scale-hover"
                            onClick={() => setMostrarBurocracia(!mostrarBurocracia)}
                            style={{
                                width: "36px",
                                height: "20px",
                                borderRadius: "10px",
                                background: mostrarBurocracia
                                    ? corDinamicaPopup
                                    : "rgba(120,113,108,0.2)",
                                border: "none",
                                cursor: "pointer",
                                position: "relative",
                                transition: "background 0.2s, transform 0.2s ease-in-out",
                            }}
                        >
                            <div
                                style={{
                                    width: "16px",
                                    height: "16px",
                                    borderRadius: "50%",
                                    background: "#ffffff",
                                    position: "absolute",
                                    top: "2px",
                                    left: mostrarBurocracia ? "18px" : "2px",
                                    transition: "left 0.2s",
                                }}
                            />
                        </button>
                    </div>

                    {/* INPUT DE TEMPO DE BUROCRACIA */}
                    {mostrarBurocracia && (
                        <div
                            style={{
                                width: "100%",
                                marginBottom: "8px",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                            }}
                        >
                            <input
                                type="number"
                                value={tempoBurocracia}
                                onChange={(e) =>
                                    setTempoBurocracia(
                                        Math.max(1, Math.min(60, Number(e.target.value) || 1))
                                    )
                                }
                                onWheel={(e) => e.currentTarget.blur()}
                                style={{
                                    width: "50px",
                                    padding: "6px 8px",
                                    borderRadius: "5px",
                                    border: "1px solid var(--editor-border)",
                                    background: "var(--editor-bg)",
                                    color: "var(--editor-text)",
                                    fontSize: "11px",
                                    fontFamily: '"Google Sans Flex", sans-serif',
                                    outline: "none",
                                    textAlign: "center",
                                }}
                            />
                            <span
                                style={{
                                    fontSize: "11px",
                                    fontWeight: 500,
                                    color: "var(--meta-text)",
                                }}
                            >
                                min
                            </span>
                            <div
                                style={{
                                    fontSize: "9px",
                                    fontWeight: 600,
                                    color: corDinamicaPopup,
                                    marginLeft: "auto",
                                }}
                            >
                                total: {tempoLimite + tempoBurocracia} min
                            </div>
                        </div>
                    )}

                    <button
                        className="gas-scale-hover"
                        onClick={dispararCronometroAtivo}
                        style={{
                            width: "100%",
                            background: corDinamicaPopup,
                            color:
                                tempoLimite > 30 && tempoLimite <= 45
                                    ? "#000000"
                                    : "#ffffff",
                            border: "none",
                            borderRadius: "6px",
                            padding: "6px 0",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                        }}
                    >
                        <span>▶</span> iniciar
                    </button>
                </div>
                </>
            )}

            {/* BARRA DE INTERFACE ADAPTATIVA */}
            <div className="gas-responsive-footer-bar">
                {/* 1. CHIP DE TEMPO */}
                {cronometroAtivo ? (
                    <div
                        key={`time-shake-${shakeTimeCount}`}
                        onMouseEnter={() => setHoverTimer(true)}
                        onMouseLeave={() => setHoverTimer(false)}
                        className={`framer-timer-entrance gas-ui-blockout gas-order-time ${
                            shakeTimeCount > 0 ? "gas-soap-heavy-trigger" : ""
                        }`}
                        style={{
                            background: chipBg,
                            backdropFilter: "blur(6px)",
                            padding: exibirControlesPainel
                                ? "5px 8px 5px 10px"
                                : "6px 10px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontFamily: '"Google Sans Flex", sans-serif',
                            color: chipTextColor,
                            border: `1px solid ${chipBorder}`,
                            transition: "transform 0.25s",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            pointerEvents: "auto",
                            transform: hoverTimer ? "scale(1.1)" : "scale(1)",
                        }}
                    >
                        <span>{textoCronometro}</span>

                        {exibirControlesPainel && (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                }}
                            >
                                {secaoExtrapolada && !arquivadoManualmente ? (
                                    <button
                                        className="gas-hover-btn"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setArquivadoManualmente(true)
                                        }}
                                        style={{
                                            background: "rgba(255,255,255,0.3)",
                                            color: "#ffffff",
                                            fontWeight: 700,
                                            fontSize: "10px",
                                        }}
                                    >
                                        ✓
                                    </button>
                                ) : !arquivadoManualmente ? (
                                    <button
                                        className={`gas-hover-btn ${isPaused ? "gas-play-pulse-btn" : ""}`}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setIsPaused(!isPaused)
                                        }}
                                        style={{
                                            background:
                                                "rgba(120, 113, 108, 0.14)",
                                            color: chipTextColor,
                                        }}
                                    >
                                        {isPaused ? (
                                            "▶"
                                        ) : (
                                            <span className="gas-btn-pause-bars">
                                                ||
                                            </span>
                                        )}
                                    </button>
                                ) : null}

                                <button
                                    className="gas-hover-btn"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        fecharCronometroCompleto()
                                    }}
                                    style={{
                                        background:
                                            secaoExtrapolada &&
                                            !arquivadoManualmente
                                                ? "rgba(255,255,255,0.25)"
                                                : "rgba(239, 68, 68, 0.14)",
                                        color:
                                            secaoExtrapolada &&
                                            !arquivadoManualmente
                                                ? "#ffffff"
                                                : "#ef4444",
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ width: "1px", display: "none" }} />
                )}

                {/* 2. CHIP DE PROGRESSO SOAP */}
                {cronometroAtivo && !arquivadoManualmente ? (
                    <div
                        key={`progress-shake-${shakeProgressCount}`}
                        className={`framer-timer-entrance gas-ui-blockout gas-order-progress ${
                            shakeProgressCount > 0
                                ? "gas-soap-heavy-trigger"
                                : ""
                        }`}
                        style={{
                            background: secaoExtrapolada
                                ? "rgba(120, 113, 108, 0.08)"
                                : chipBg,
                            backdropFilter: "blur(6px)",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontFamily: '"Google Sans Flex", sans-serif',
                            color: "var(--meta-text)",
                            border: secaoExtrapolada
                                ? "1px solid rgba(120, 113, 108, 0.18)"
                                : `1px solid ${chipBorder}`,
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            pointerEvents: "auto",
                        }}
                    >
                        {/* S */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "2px",
                            }}
                        >
                            <span style={{ fontWeight: 700, color: "#3b82f6" }}>
                                S
                            </span>
                            {segundosDecorridos >= limiteSegundosS && (
                                <span
                                    style={{
                                        color: "#3b82f6",
                                        fontWeight: 700,
                                        fontSize: "10px",
                                    }}
                                >
                                    ✓
                                </span>
                            )}
                        </div>
                        <div
                            className="gas-soap-track"
                            style={{
                                width: secaoAtual === "S" ? "14px" : "0px",
                                opacity: secaoAtual === "S" ? 1 : 0,
                            }}
                        >
                            <div
                                className="gas-soap-progress"
                                style={{
                                    width: `${progressoVaoS}%`,
                                    background: "#3b82f6",
                                    height: "100%",
                                }}
                            />
                        </div>

                        {/* O */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "2px",
                                opacity:
                                    segundosDecorridos >= limiteSegundosS
                                        ? 1
                                        : 0.25,
                            }}
                        >
                            <span style={{ fontWeight: 700, color: "#22c55e" }}>
                                O
                            </span>
                            {segundosDecorridos >= limiteSegundosO && (
                                <span
                                    style={{
                                        color: "#22c55e",
                                        fontWeight: 700,
                                        fontSize: "10px",
                                    }}
                                >
                                    ✓
                                </span>
                            )}
                        </div>
                        <div
                            className="gas-soap-track"
                            style={{
                                width: secaoAtual === "O" ? "14px" : "0px",
                                opacity: secaoAtual === "O" ? 1 : 0,
                            }}
                        >
                            <div
                                className="gas-soap-progress"
                                style={{
                                    width: `${progressoVaoO}%`,
                                    background: "#22c55e",
                                    height: "100%",
                                }}
                            />
                        </div>

                        {/* A */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "2px",
                                opacity:
                                    segundosDecorridos >= limiteSegundosO
                                        ? 1
                                        : 0.25,
                            }}
                        >
                            <span style={{ fontWeight: 700, color: "#d9a707" }}>
                                A
                            </span>
                            {segundosDecorridos >= limiteSegundosA && (
                                <span
                                    style={{
                                        color: "#eab308",
                                        fontWeight: 700,
                                        fontSize: "10px",
                                    }}
                                >
                                    ✓
                                </span>
                            )}
                        </div>
                        <div
                            className="gas-soap-track"
                            style={{
                                width: secaoAtual === "A" ? "14px" : "0px",
                                opacity: secaoAtual === "A" ? 1 : 0,
                            }}
                        >
                            <div
                                className="gas-soap-progress"
                                style={{
                                    width: `${progressoVaoA}%`,
                                    background: "#eab308",
                                    height: "100%",
                                }}
                            />
                        </div>

                        {/* P */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "2px",
                                opacity:
                                    segundosDecorridos >= limiteSegundosA
                                        ? 1
                                        : 0.25,
                            }}
                        >
                            <span style={{ fontWeight: 700, color: "#f97316" }}>
                                P
                            </span>
                            {segundosDecorridos >= limiteSegundosP && (
                                <span
                                    style={{
                                        color: "#f97316",
                                        fontWeight: 700,
                                        fontSize: "10px",
                                    }}
                                >
                                    ✓
                                </span>
                            )}
                        </div>
                        <div
                            className="gas-soap-track"
                            style={{
                                width: secaoAtual === "P" ? "14px" : "0px",
                                opacity: secaoAtual === "P" ? 1 : 0,
                            }}
                        >
                            <div
                                className="gas-soap-progress"
                                style={{
                                    width: `${progressoVaoP}%`,
                                    background: "#f97316",
                                    height: "100%",
                                }}
                            />
                        </div>

                        {/* B - BUROCRACIA */}
                        {mostrarBurocracia && (
                            <>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "2px",
                                        opacity:
                                            segundosDecorridos >= limiteSegundosP
                                                ? 1
                                                : 0.25,
                                    }}
                                >
                                    <span style={{ fontWeight: 700, color: "#8b5cf6" }}>
                                        B
                                    </span>
                                    {segundosDecorridos >= limiteSegundosB && (
                                        <span
                                            style={{
                                                color: "#8b5cf6",
                                                fontWeight: 700,
                                                fontSize: "10px",
                                            }}
                                        >
                                            ✓
                                        </span>
                                    )}
                                </div>
                                <div
                                    className="gas-soap-track"
                                    style={{
                                        width: secaoAtual === "B" ? "14px" : "0px",
                                        opacity: secaoAtual === "B" ? 1 : 0,
                                    }}
                                >
                                    <div
                                        className="gas-soap-progress"
                                        style={{
                                            width: `${progressoVaoB}%`,
                                            background: "#8b5cf6",
                                            height: "100%",
                                        }}
                                    />
                                </div>
                            </>
                        )}

                        {/* OVERTIME */}
                        {secaoExtrapolada && (
                            <>
                                <div
                                    className="gas-critical-svg-pulse"
                                    style={{
                                        width: "12px",
                                        height: "12px",
                                        marginLeft: "2px",
                                        display: "flex",
                                        alignItems: "center",
                                    }}
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                        }}
                                    >
                                        <path
                                            d="M12 3L2 22H22L12 3Z"
                                            fill="#ef4444"
                                        />
                                        <path
                                            d="M12 9V15"
                                            stroke="#ffffff"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />
                                        <circle
                                            cx="12"
                                            cy="18"
                                            r="1"
                                            fill="#ffffff"
                                        />
                                    </svg>
                                </div>
                                <div
                                    style={{
                                        height: "2px",
                                        background: "#ef4444",
                                        width: `${progressoExtrapolado}px`,
                                        borderRadius: "1px",
                                        marginLeft: "1px",
                                        transition: isPaused
                                            ? "none"
                                            : "width 0.3s ease-out",
                                    }}
                                />
                            </>
                        )}
                    </div>
                ) : (
                    <div style={{ width: "1px", display: "none" }} />
                )}

                {/* 3. CHIP DE CARACTERES */}
                <div
                    className="gas-ui-blockout gas-order-chars"
                    style={{
                        background: limiteAtingido
                            ? "rgba(239, 68, 68, 0.15)"
                            : "var(--meta-bg)",
                        backdropFilter: "blur(4px)",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontFamily: '"Google Sans Flex", sans-serif',
                        color: limiteAtingido
                            ? "var(--limite-text)"
                            : "var(--meta-text)",
                        border: limiteAtingido
                            ? "1px solid rgba(239, 68, 68, 0.3)"
                            : "1px solid var(--meta-border)",
                        fontWeight: limiteAtingido ? 600 : 400,
                        pointerEvents: "auto",
                    }}
                >
                    {totalCaracteres} caracteres
                </div>
            </div>

            {/* ÁREA EDITÁVEL */}
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onPaste={(e) => {
                    e.preventDefault()
                    const clipboardText = e.clipboardData.getData("text/plain")
                    const textoLimpo = limparTextoInvisivel(clipboardText)
                    document.execCommand("insertText", false, textoLimpo)
                    handleInput()
                }}
                suppressContentEditableWarning
                data-placeholder="digite aqui"
                className="framer-markdown-editor"
                style={{
                    width: "100%",
                    height: "100%",
                    padding: "24px 24px 94px 24px",
                    fontSize: "15px",
                    lineHeight: "1.2",
                    color: "var(--editor-text)",
                    outline: "none",
                    overflowY: "auto",
                    boxSizing: "border-box",
                    whiteSpace: "pre-wrap",
                }}
            />
        </div>
    )
})

export default Bloco