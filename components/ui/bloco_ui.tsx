import * as React from "react"
import { createClient } from "@supabase/supabase-js"
import { useEditor, useTimer } from "../contexts/AppContext"

const supabase = createClient(
    "https://odqdzyqjpufitvahrhiq.supabase.co",
    "sb_publishable_5ftHtUIl4DlyHy9KQ-jvGw_AfnhQn1Q"
)

export default function Bloco() {
    const editor = useEditor()
    const timer = useTimer()
    const editorRef = React.useRef<HTMLDivElement>(null)
    const [markdownContent, setMarkdownContent] = React.useState("")
    const initialContentRef = React.useRef<string | null>(null)
    const [saveTime, setSaveTime] = React.useState<string | null>(null)
    const [showPopup, setShowPopup] = React.useState(false)

    // --- ESTADOS DO CRONÔMETRO ---
    const [tempoLimite, setTempoLimite] = React.useState<number>(15)
    const [segundosDecorridos, setSegundosDecorridos] =
        React.useState<number>(0)
    const [cronometroAtivo, setCronometroAtivo] = React.useState<boolean>(false)
    const [mostrarSetupRelogio, setMostrarSetupRelogio] =
        React.useState<boolean>(false)
    const [isPaused, setIsPaused] = React.useState<boolean>(false)
    const [hoverTimer, setHoverTimer] = React.useState<boolean>(false)

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
        const { data } = await supabase
            .from("pages")
            .select("*")
            .eq("id", "bloco")
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
        load()

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
        }
    }, [])

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
            markdownContent === initialContentRef.current
        )
            return
        setShowPopup(false)
        const timeout = setTimeout(async () => {
            const conteudoSalvar = limparTextoInvisivel(markdownContent)
            await supabase.from("pages").upsert({
                id: "bloco",
                content: conteudoSalvar,
                updated_at: new Date(),
            })
            initialContentRef.current = conteudoSalvar
            const agora = new Date()
            const hh = String(agora.getHours()).padStart(2, "0")
            const mm = String(agora.getMinutes()).padStart(2, "0")
            setSaveTime(`${hh}:${mm}`)
        }, 800)
        return () => clearTimeout(timeout)
    }, [markdownContent])

    React.useEffect(() => {
        if (!saveTime) return
        const popupTimeout = setTimeout(() => {
            setShowPopup(true)
        }, 5000)
        return () => clearTimeout(popupTimeout)
    }, [saveTime, markdownContent])

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

        let currentBlock =
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

        let anguloRad = Math.atan2(clientY - centroY, clientX - centroX)
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

    const totalSegundosLimite = tempoLimite * 60
    const limiteSegundosS = totalSegundosLimite * 0.5
    const limiteSegundosO = totalSegundosLimite * 0.6
    const limiteSegundosA = totalSegundosLimite * 0.7
    const limiteSegundosP = totalSegundosLimite

    let secaoAtual = "S"
    let secaoExtrapolada = false

    let progressoVaoS = 0
    let progressoVaoO = 0
    let progressoVaoA = 0
    let progressoVaoP = 0
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
        } else {
            secaoAtual = "FIM"
            secaoExtrapolada = true
            progressoVaoS = 100
            progressoVaoO = 100
            progressoVaoA = 100
            progressoVaoP = 100
            progressoExtrapolado = Math.min(
                (segundosDecorridos - limiteSegundosP) * 0.35,
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
                .framer-markdown-editor { font-family: "Google Sans", "Plus Jakarta Sans", sans-serif; }
                .framer-markdown-editor div { margin-bottom: 6px; color: var(--editor-text) !important; line-height: 1.2; }
                
                /* ESTILOS DE RENDERIZAÇÃO DO MARKDOWN */
                .framer-markdown-editor .md-h1 { font-family: "Playfair Display", serif; font-size: 24px; font-weight: 900; margin-top: 16px; margin-bottom: 8px; }
                .framer-markdown-editor .md-h2 { font-family: "Playfair Display", serif; font-size: 20px; font-weight: 400; margin-top: 14px; margin-bottom: 6px; }
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

            {/* POPUP DE SELEÇÃO DINÂMICO */}
            {mostrarSetupRelogio && (
                <div
                    className="framer-timer-entrance gas-ui-blockout"
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
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
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
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "10px",
                        }}
                    >
                        <button
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
                        <button
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
                            fontSize: "14px",
                            fontWeight: 700,
                            color: "var(--editor-text)",
                            marginTop: "10px",
                            marginBottom: "10px",
                        }}
                    >
                        {tempoLimite}{" "}
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
                        <span>▶</span> Iniciar
                    </button>
                </div>
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
                            fontFamily: '"Plus Jakarta Sans", sans-serif',
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
                            fontFamily: '"Plus Jakarta Sans", sans-serif',
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
                        fontFamily: '"Plus Jakarta Sans", sans-serif',
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
}