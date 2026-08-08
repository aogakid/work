import * as React from "react"
import { forwardRef, useImperativeHandle } from "react"

export interface PreceptoriaActions {
    cronometro(): void
}

interface SecaoMeta {
    id: string
    title: string
    letter: string
    color: string
    bg: string
    border: string
}

interface ClusterItem {
    meta: SecaoMeta
    active: boolean
    done: boolean
    reached: boolean
    progress: number
}

const RAIO_RING = 58
const CIRCUNFERENCIA_RING = 2 * Math.PI * RAIO_RING
const TAM_CIRCULO_LETRA = (RAIO_RING - 3) * 2

const CLOCK_CX = 64
const CLOCK_CY = 64
const CLOCK_R = 52
const CLOCK_PASSO_GRAUS = 18
const CLOCK_MIN_FATIA = CLOCK_PASSO_GRAUS

const SECTION_META: SecaoMeta[] = [
    { id: "subjetivo", title: "Subjetivo", letter: "S", color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.35)" },
    { id: "objetivo", title: "Objetivo", letter: "O", color: "#22c55e", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.35)" },
    { id: "avaliacao", title: "Avaliação", letter: "A", color: "#d9a707", bg: "rgba(234,179,8,0.12)", border: "rgba(234,197,94,0.35)" },
    { id: "plano", title: "Plano", letter: "P", color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.35)" },
]

const BUROCRACIA_META: SecaoMeta = { id: "burocracia", title: "Burocracia", letter: "B", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.35)" }

const MAPA_SECAO_ID: Record<string, string> = { S: "subjetivo", O: "objetivo", A: "avaliacao", P: "plano" }

const TIPOS: { id: string; label: string }[] = [
    { id: "consulta_agendada", label: "consulta agendada" },
    { id: "pre_natal", label: "pré natal" },
    { id: "puericultura", label: "puericultura" },
]

type Graus = Record<string, number>;
const GRAUS_DEFAULT: Graus = { S: 180, O: 216, A: 252, P: 360 }

/* ── Template loading (per tipo / per section) ───────────────────── */
type TemplatesData = { [tipo: string]: { [secId: string]: string } };

let templatesCache: TemplatesData | null = null

function parseTemplate(text: string): { [secId: string]: string } {
    const out: { [secId: string]: string } = {}
    const chunks = (text || "").split(/^## /m)
    for (const chunk of chunks) {
        if (!chunk.trim()) continue
        const newlineIdx = chunk.indexOf("\n")
        const header = newlineIdx >= 0 ? chunk.substring(0, newlineIdx).trim() : chunk.trim()
        const content = newlineIdx >= 0 ? chunk.substring(newlineIdx + 1) : ""
        const match = SECTION_META.find(m => m.title.toLowerCase() === header.toLowerCase())
        if (match && content.trim()) out[match.id] = content.trim()
    }
    return out
}

async function carregarTemplateArquivo(id: string): Promise<string> {
    const caminhos = [`/contents/templates/${id}.md`, `public/contents/templates/${id}.md`]
    for (const caminho of caminhos) {
        try {
            const res = await fetch(caminho)
            if (res.ok) return await res.text()
        } catch {
        }
    }
    return ""
}

async function carregarTemplates(): Promise<TemplatesData> {
    if (templatesCache) return templatesCache
    const result: TemplatesData = {}
    for (const t of TIPOS) {
        const text = await carregarTemplateArquivo(t.id)
        result[t.id] = parseTemplate(text)
    }
    templatesCache = result
    return result
}

const Preceptoria = forwardRef<PreceptoriaActions>(function Preceptoria(_props, ref) {
    /* ── Timer state ── */
    const [tempoLimite, setTempoLimite] = React.useState<number>(15)
    const [segundosDecorridos, setSegundosDecorridos] = React.useState<number>(0)
    const [cronometroAtivo, setCronometroAtivo] = React.useState<boolean>(false)
    const [mostrarSetupRelogio, setMostrarSetupRelogio] = React.useState<boolean>(true)
    const [relogioExiting, setRelogioExiting] = React.useState<boolean>(false)
    const [isPaused, setIsPaused] = React.useState<boolean>(false)
    const [mostrarBurocracia, setMostrarBurocracia] = React.useState<boolean>(false)
    const [tempoBurocracia, setTempoBurocracia] = React.useState<number>(15)
    const [mostrarAvancado, setMostrarAvancado] = React.useState<boolean>(false)
    const [graus, setGraus] = React.useState<Graus>(GRAUS_DEFAULT)
    const [limitesEstado, setLimitesEstado] = React.useState<Graus>({ S: 0, O: 0, A: 0, P: 0, B: 0 })
    const [shakeTimeCount, setShakeTimeCount] = React.useState<number>(0)
    const [arquivadoManualmente, setArquivadoManualmente] = React.useState<boolean>(false)
    const ultimoPercentualRef = React.useRef<number>(0)
    const momentoInicioRef = React.useRef<number>(0)
    const segundosAcumuladosRef = React.useRef<number>(0)
    const relogioRef = React.useRef<SVGSVGElement>(null)
    const relogioAvancadoRef = React.useRef<SVGSVGElement>(null)
    const grausRef = React.useRef<Graus>(GRAUS_DEFAULT)

    /* ── Preceptoria state ── */
    const [tipoSelecionado, setTipoSelecionado] = React.useState<string>("consulta_agendada")
    const [mostrarTemplate, setMostrarTemplate] = React.useState<boolean>(false)
    const [templateSecaoId, setTemplateSecaoId] = React.useState<string>("subjetivo")
    const [templateTitulo, setTemplateTitulo] = React.useState<string>("")
    const [templateConteudo, setTemplateConteudo] = React.useState<string>("")

    React.useEffect(() => {
        carregarTemplates()
    }, [])

    /* ── Clock hand drag ── */
    const tratarMovimentoPonteiro = (clientX: number, clientY: number) => {
        if (!relogioRef.current) return
        const rect = relogioRef.current.getBoundingClientRect()
        const anguloRad = Math.atan2(clientY - (rect.top + rect.height / 2), clientX - (rect.left + rect.width / 2))
        let anguloGraus = anguloRad * (180 / Math.PI) + 90
        if (anguloGraus < 0) anguloGraus += 360
        let minutosCalculados = Math.round(anguloGraus / 6)
        if (minutosCalculados === 60 || minutosCalculados === 0) minutosCalculados = 60
        setTempoLimite(Math.min(60, Math.max(1, minutosCalculados)))
    }

    const iniciarArrastoPonteiro = (e: React.MouseEvent) => {
        tratarMovimentoPonteiro(e.clientX, e.clientY)
        const mover = (ev: MouseEvent) => tratarMovimentoPonteiro(ev.clientX, ev.clientY)
        const soltar = () => { window.removeEventListener("mousemove", mover); window.removeEventListener("mouseup", soltar) }
        window.addEventListener("mousemove", mover)
        window.addEventListener("mouseup", soltar)
    }

    /* ── Timer calculations ── */
    const minutosPassados = Math.floor(segundosDecorridos / 60)
    const textoCronometro = cronometroAtivo ? `${String(minutosPassados).padStart(2, "0")} min.` : "00 min."

    const totalSegundosLimite = (tempoLimite + (mostrarBurocracia ? tempoBurocracia : 0)) * 60
    const limiteSegundosS = limitesEstado.S || 0
    const limiteSegundosO = limitesEstado.O || 0
    const limiteSegundosA = limitesEstado.A || 0
    const limiteSegundosP = limitesEstado.P || 0
    const limiteSegundosB = limitesEstado.B || 0

    const pontoArco = (cx: number, cy: number, r: number, angulo: number) => {
        const rad = (angulo * Math.PI) / 180
        return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)]
    }

    const pathFatia = (inicio: number, fim: number) => {
        const p1 = pontoArco(CLOCK_CX, CLOCK_CY, CLOCK_R, inicio)
        const p2 = pontoArco(CLOCK_CX, CLOCK_CY, CLOCK_R, fim)
        const grande = fim - inicio > 180 ? 1 : 0
        return `M ${CLOCK_CX} ${CLOCK_CY} L ${p1[0]} ${p1[1]} A ${CLOCK_R} ${CLOCK_R} 0 ${grande} 1 ${p2[0]} ${p2[1]} Z`
    }

    const percentualDaPosicaoAvancado = (clientX: number, clientY: number) => {
        if (!relogioAvancadoRef.current) return null
        const rect = relogioAvancadoRef.current.getBoundingClientRect()
        const anguloRad = Math.atan2(clientY - (rect.top + rect.height / 2), clientX - (rect.left + rect.width / 2))
        let anguloGraus = anguloRad * (180 / Math.PI) + 90
        if (anguloGraus < 0) anguloGraus += 360
        return Math.round(anguloGraus)
    }

    const aplicarFronteira = (fronteira: string, valor: number) => {
        const atual = grausRef.current
        const snap = Math.round(valor / CLOCK_PASSO_GRAUS) * CLOCK_PASSO_GRAUS
        const novo = { ...atual }
        if (fronteira === "S") novo.S = Math.max(CLOCK_MIN_FATIA, Math.min(snap, atual.O - CLOCK_MIN_FATIA))
        else if (fronteira === "O") novo.O = Math.max(atual.S + CLOCK_MIN_FATIA, Math.min(snap, atual.A - CLOCK_MIN_FATIA))
        else if (fronteira === "A") novo.A = Math.max(atual.O + CLOCK_MIN_FATIA, Math.min(snap, 360 - CLOCK_MIN_FATIA))
        setGraus(novo)
        grausRef.current = novo
    }

    const iniciarArrastoFronteira = (fronteira: string, e: React.MouseEvent) => {
        const p = percentualDaPosicaoAvancado(e.clientX, e.clientY)
        if (p !== null) aplicarFronteira(fronteira, p)
        const mover = (ev: MouseEvent) => {
            const np = percentualDaPosicaoAvancado(ev.clientX, ev.clientY)
            if (np !== null) aplicarFronteira(fronteira, np)
        }
        const soltar = () => { window.removeEventListener("mousemove", mover); window.removeEventListener("mouseup", soltar) }
        window.addEventListener("mousemove", mover)
        window.addEventListener("mouseup", soltar)
    }

    let secaoAtual = "S"
    let secaoExtrapolada = false
    let progressoVaoS = 0, progressoVaoO = 0, progressoVaoA = 0, progressoVaoP = 0, progressoVaoB = 0

    if (cronometroAtivo) {
        if (segundosDecorridos < limiteSegundosS) { secaoAtual = "S"; progressoVaoS = (segundosDecorridos / limiteSegundosS) * 100 }
        else if (segundosDecorridos < limiteSegundosO) { secaoAtual = "O"; progressoVaoS = 100; progressoVaoO = ((segundosDecorridos - limiteSegundosS) / (limiteSegundosO - limiteSegundosS)) * 100 }
        else if (segundosDecorridos < limiteSegundosA) { secaoAtual = "A"; progressoVaoS = 100; progressoVaoO = 100; progressoVaoA = ((segundosDecorridos - limiteSegundosO) / (limiteSegundosA - limiteSegundosO)) * 100 }
        else if (segundosDecorridos < limiteSegundosP) { secaoAtual = "P"; progressoVaoS = 100; progressoVaoO = 100; progressoVaoA = 100; progressoVaoP = ((segundosDecorridos - limiteSegundosA) / (limiteSegundosP - limiteSegundosA)) * 100 }
        else if (mostrarBurocracia && segundosDecorridos < limiteSegundosB) { secaoAtual = "B"; progressoVaoS = 100; progressoVaoO = 100; progressoVaoA = 100; progressoVaoP = 100; progressoVaoB = ((segundosDecorridos - limiteSegundosP) / (limiteSegundosB - limiteSegundosP)) * 100 }
        else { secaoAtual = "FIM"; secaoExtrapolada = true; progressoVaoS = 100; progressoVaoO = 100; progressoVaoA = 100; progressoVaoP = 100; progressoVaoB = 100 }
    }

    React.useEffect(() => {
        if (!cronometroAtivo || isPaused || arquivadoManualmente || totalSegundosLimite <= 0) return
        const p = Math.floor((segundosDecorridos / totalSegundosLimite) * 10)
        if (p > ultimoPercentualRef.current && p <= 10 && p > 0) { ultimoPercentualRef.current = p; setShakeTimeCount(c => c + 1) }
    }, [segundosDecorridos, cronometroAtivo, isPaused, totalSegundosLimite, arquivadoManualmente])

    /* Timer tick */
    React.useEffect(() => {
        let interval: NodeJS.Timeout
        if (cronometroAtivo && !isPaused && !arquivadoManualmente) {
            momentoInicioRef.current = Date.now() - segundosAcumuladosRef.current * 1000
            interval = setInterval(() => {
                const totalSegundosReais = Math.floor((Date.now() - momentoInicioRef.current) / 1000)
                segundosAcumuladosRef.current = totalSegundosReais
                setSegundosDecorridos(totalSegundosReais)
            }, 250)
        }
        return () => clearInterval(interval)
    }, [cronometroAtivo, isPaused, arquivadoManualmente])

    /* Timer colors */
    let corDinamicaPopup = "#3b82f6", bgDinamicoPopup = "rgba(59,130,246,0.12)", borderDinamicaPopup = "rgba(59,130,246,0.25)"
    if (tempoLimite > 15 && tempoLimite <= 30) { corDinamicaPopup = "#22c55e"; bgDinamicoPopup = "rgba(34,197,94,0.12)"; borderDinamicaPopup = "rgba(34,197,94,0.25)" }
    else if (tempoLimite > 30 && tempoLimite <= 45) { corDinamicaPopup = "#eab308"; bgDinamicoPopup = "rgba(234,179,8,0.12)"; borderDinamicaPopup = "rgba(234,179,8,0.25)" }
    else if (tempoLimite > 45) { corDinamicaPopup = "#ef4444"; bgDinamicoPopup = "rgba(239,68,68,0.12)"; borderDinamicaPopup = "rgba(239,68,68,0.25)" }

    let chipTextColor = "#3b82f6"
    if (cronometroAtivo) {
        if (arquivadoManualmente) { chipTextColor = "var(--meta-text)" }
        else if (secaoExtrapolada) { chipTextColor = "#ffffff" }
        else if (secaoAtual === "S") { chipTextColor = "#3b82f6" }
        else if (secaoAtual === "O") { chipTextColor = "#22c55e" }
        else if (secaoAtual === "A") { chipTextColor = "#d9a707" }
        else if (secaoAtual === "P") { chipTextColor = "#f97316" }
        else if (secaoAtual === "B") { chipTextColor = "#8b5cf6" }
    }

    /* ── Actions ── */
    const dispararCronometroAtivo = () => {
        setMostrarSetupRelogio(false); setArquivadoManualmente(false); setSegundosDecorridos(0)
        segundosAcumuladosRef.current = 0; ultimoPercentualRef.current = 0
        setShakeTimeCount(0); momentoInicioRef.current = Date.now()
        const totalBase = (tempoLimite + (mostrarBurocracia ? tempoBurocracia : 0)) * 60
        setLimitesEstado({
            S: tempoLimite * 60 * (graus.S / 360),
            O: tempoLimite * 60 * (graus.O / 360),
            A: tempoLimite * 60 * (graus.A / 360),
            P: tempoLimite * 60 * (graus.P / 360),
            B: totalBase,
        })
        setCronometroAtivo(true); setIsPaused(false)
    }

    const fecharCronometroCompleto = () => {
        setCronometroAtivo(false); setIsPaused(false); setArquivadoManualmente(false); setSegundosDecorridos(0)
        segundosAcumuladosRef.current = 0; ultimoPercentualRef.current = 0
        setShakeTimeCount(0); setMostrarSetupRelogio(true)
    }

    const pularSecao = () => {
        if (!cronometroAtivo || arquivadoManualmente) return
        const ordem = mostrarBurocracia ? ["S", "O", "A", "P", "B"] : ["S", "O", "A", "P"]
        const idx = ordem.indexOf(secaoAtual)
        if (idx === -1) return
        const novos = { ...limitesEstado }
        novos[secaoAtual] = Math.max(idx === 0 ? 0 : (novos[ordem[idx - 1]] || 0), segundosDecorridos)
        setLimitesEstado(novos)
    }

    const adicionarBonus = () => {
        if (!cronometroAtivo || arquivadoManualmente) return
        const ordem = mostrarBurocracia ? ["S", "O", "A", "P", "B"] : ["S", "O", "A", "P"]
        const idx = ordem.indexOf(secaoAtual)
        if (idx === -1) return
        const bonus = (tempoLimite * 60) * 0.10
        const novos = { ...limitesEstado }
        for (let i = idx; i < ordem.length; i++) novos[ordem[i]] = (novos[ordem[i]] || 0) + bonus
        setLimitesEstado(novos)
    }

    const abrirSetup = () => {
        setMostrarSetupRelogio(true)
    }

    React.useEffect(() => {
        const lidarComCronometroOuvinte = () => abrirSetup()
        window.addEventListener("framerCronometro", lidarComCronometroOuvinte)
        return () => window.removeEventListener("framerCronometro", lidarComCronometroOuvinte)
    }, [])

    useImperativeHandle(ref, () => ({
        cronometro: () => {
            fecharCronometroCompleto()
            setMostrarSetupRelogio(true)
        },
    })) // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Display meta ── */
    const metaAtual = secaoAtual === "B" ? BUROCRACIA_META : SECTION_META.find(m => m.letter === secaoAtual)
    let displayTitle = secaoExtrapolada ? "tempo extrapolado" : (metaAtual?.title || "")
    if (arquivadoManualmente) displayTitle = "atendimento arquivado"

    const metaTotal = tempoLimite + (mostrarBurocracia ? tempoBurocracia : 0)

    /* ── SOAP cluster ── */
    const clusterItems: ClusterItem[] = SECTION_META.map(m => {
        let done = false
        let reached = true
        let progress = 0
        if (m.letter === "S") { reached = true; done = segundosDecorridos >= limiteSegundosS; progress = progressoVaoS / 100 }
        else if (m.letter === "O") { reached = segundosDecorridos >= limiteSegundosS; done = segundosDecorridos >= limiteSegundosO; progress = progressoVaoO / 100 }
        else if (m.letter === "A") { reached = segundosDecorridos >= limiteSegundosO; done = segundosDecorridos >= limiteSegundosA; progress = progressoVaoA / 100 }
        else if (m.letter === "P") { reached = segundosDecorridos >= limiteSegundosA; done = segundosDecorridos >= limiteSegundosP; progress = progressoVaoP / 100 }
        return { meta: m, active: secaoAtual === m.letter, done, reached, progress }
    })
    if (mostrarBurocracia) {
        clusterItems.push({
            meta: BUROCRACIA_META,
            active: secaoAtual === "B",
            done: segundosDecorridos >= limiteSegundosB,
            reached: segundosDecorridos >= limiteSegundosP,
            progress: progressoVaoB / 100,
        })
    }
    if (secaoExtrapolada) {
        for (const item of clusterItems) {
            if (item.meta.letter === "P") item.active = true
        }
    }

    const renderCircle = (item: ClusterItem) => {
        const ehExtrapoladoP = secaoExtrapolada && item.meta.letter === "P"
        const isActive = item.active
        let ringColor = item.meta.color
        let ringProgress = 0
        let strokeWidth = 6
        let circleBg = item.meta.bg
        let circleBorder = item.meta.border
        let circleColor = item.meta.color
        let letter = item.meta.letter
        let slotOpacity = 1

        if (arquivadoManualmente) {
            ringColor = "rgba(120,113,108,0.4)"
            circleBg = "rgba(120,113,108,0.08)"
            circleBorder = "rgba(120,113,108,0.18)"
            circleColor = "var(--meta-text)"
            slotOpacity = 0.6
        } else if (ehExtrapoladoP) {
            ringColor = "#ef4444"
            ringProgress = 1
            circleBg = "#ef4444"
            circleBorder = "#ef4444"
            circleColor = "#ffffff"
            letter = "!"
        } else if (isActive) {
            ringProgress = item.progress
        } else if (item.done) {
            ringProgress = 1
            strokeWidth = 3
            slotOpacity = 0.75
        } else if (item.reached) {
            strokeWidth = 3
            slotOpacity = 0.4
        } else {
            ringColor = "rgba(255,255,255,0.15)"
            strokeWidth = 3
            slotOpacity = 0.25
        }

        const secId = MAPA_SECAO_ID[item.meta.letter]
        const scale = isActive ? 1 : 0.5

        return (
            <div key={item.meta.letter} style={{ width: "140px", height: "140px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <div onClick={() => { if (secId) mostrarTemplateSecao(secId) }} title={secId ? "ver modelo" : undefined} style={{ position: "relative", width: "128px", height: "128px", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${scale})`, transition: "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease", cursor: secId ? "pointer" : "default", opacity: slotOpacity, transformOrigin: "center center" }}>
                    <svg width="128" height="128" viewBox="0 0 128 128" style={{ position: "absolute", top: 0, left: 0, width: "128px", height: "128px" }}>
                        <circle cx="64" cy="64" r={RAIO_RING} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                        <circle cx="64" cy="64" r={RAIO_RING} fill="none" stroke={ringColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={CIRCUNFERENCIA_RING} strokeDashoffset={CIRCUNFERENCIA_RING * (1 - ringProgress)} transform="rotate(-90 64 64)" style={{ transition: "stroke-dashoffset 0.3s ease, stroke 0.3s ease" }} />
                    </svg>
                    <div style={{ width: `${TAM_CIRCULO_LETRA}px`, height: `${TAM_CIRCULO_LETRA}px`, boxSizing: "border-box", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: circleBg, border: `2px solid ${circleBorder}`, color: circleColor, fontSize: "40px", fontWeight: 800, fontFamily: '"Google Sans Flex", sans-serif', transition: "all 0.3s", position: "relative", zIndex: 1 }}>
                        {letter}
                    </div>
                    {item.done && !isActive && !arquivadoManualmente && (
                        <span style={{ position: "absolute", top: "6px", right: "22px", zIndex: 2, width: "22px", height: "22px", borderRadius: "50%", background: item.meta.color, color: "#ffffff", fontSize: "11px", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>✓</span>
                    )}
                </div>
            </div>
        )
    }

    /* ── Template helpers ── */
    const labelTipo = TIPOS.find(t => t.id === tipoSelecionado)?.label || tipoSelecionado

    const mostrarTemplateSecao = (secId: string) => {
        const meta = SECTION_META.find(m => m.id === secId)
        if (!meta) return
        setTemplateSecaoId(secId)
        setTemplateTitulo(`${meta.title} · ${labelTipo}`)
        setTemplateConteudo("")
        setMostrarTemplate(true)
        carregarTemplates().then(data => {
            const conteudo = data[tipoSelecionado]?.[secId] || ""
            setTemplateConteudo(conteudo)
        })
    }

    const renderTemplateLinhas = (texto: string) => {
        const linhas = texto.split("\n")
        return linhas.map((linha, i) => {
            const matchIndent = linha.match(/^ +/)
            const indent = matchIndent ? matchIndent[0].length : 0
            const ehSub = indent > 0
            return (
                <div key={i} style={{ paddingLeft: `${indent * 7}px`, color: ehSub ? "var(--meta-text)" : "#f5f5f4", fontFamily: '"Google Sans Flex", sans-serif', fontSize: "12px", lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {linha}
                </div>
            )
        })
    }

    const templateMeta = SECTION_META.find(m => m.id === templateSecaoId) || SECTION_META[0]

    /* ── Session summary (on archive) ── */
    const formatarTempo = (s: number) => {
        const t = Math.max(0, Math.round(s))
        const m = Math.floor(t / 60)
        const rest = t % 60
        return rest === 0 ? `${m}min` : `${m}min ${rest}s`
    }

    const baseS = tempoLimite * 60 * (graus.S / 360)
    const baseO = tempoLimite * 60 * (graus.O / 360)
    const baseA = tempoLimite * 60 * (graus.A / 360)
    const baseP = tempoLimite * 60 * (graus.P / 360)
    const baseB = totalSegundosLimite

    const secoesResumo = [
        { letter: "S", title: SECTION_META[0].title, color: SECTION_META[0].color, bg: SECTION_META[0].bg, border: SECTION_META[0].border, inicioBase: 0, fimBase: baseS },
        { letter: "O", title: SECTION_META[1].title, color: SECTION_META[1].color, bg: SECTION_META[1].bg, border: SECTION_META[1].border, inicioBase: baseS, fimBase: baseO },
        { letter: "A", title: SECTION_META[2].title, color: SECTION_META[2].color, bg: SECTION_META[2].bg, border: SECTION_META[2].border, inicioBase: baseO, fimBase: baseA },
        { letter: "P", title: SECTION_META[3].title, color: SECTION_META[3].color, bg: SECTION_META[3].bg, border: SECTION_META[3].border, inicioBase: baseA, fimBase: baseP },
    ]
    if (mostrarBurocracia) {
        secoesResumo.push({ letter: "B", title: BUROCRACIA_META.title, color: BUROCRACIA_META.color, bg: BUROCRACIA_META.bg, border: BUROCRACIA_META.border, inicioBase: baseP, fimBase: baseB })
    }
    const fimAtualSecao = (letter: string) => letter === "S" ? limiteSegundosS : letter === "O" ? limiteSegundosO : letter === "A" ? limiteSegundosA : letter === "P" ? limiteSegundosP : limiteSegundosB
    const resumoLinhas = secoesResumo.map((s, i) => {
        const fimAtual = fimAtualSecao(s.letter)
        const inicioAtual = i === 0 ? 0 : fimAtualSecao(secoesResumo[i - 1].letter)
        return {
            ...s,
            usado: Math.max(0, Math.min(segundosDecorridos, fimAtual) - inicioAtual),
            alocado: Math.max(0, s.fimBase - s.inicioBase),
            done: segundosDecorridos >= fimAtual,
            ativo: secaoAtual === s.letter && !secaoExtrapolada,
        }
    })

    const corUsado = (usado: number, alocado: number) => usado < alocado ? "#22c55e" : (usado > alocado ? "#ef4444" : "#f5f5f4")


    const fatiasAvancado = [
        { key: "S", meta: SECTION_META[0], inicio: 0, fim: graus.S },
        { key: "O", meta: SECTION_META[1], inicio: graus.S, fim: graus.O },
        { key: "A", meta: SECTION_META[2], inicio: graus.O, fim: graus.A },
        { key: "P", meta: SECTION_META[3], inicio: graus.A, fim: 360 },
    ]
    const fatiasRender = fatiasAvancado.map(f => {
        const meio = (f.inicio + f.fim) / 2
        const pc = pontoArco(CLOCK_CX, CLOCK_CY, CLOCK_R * 0.58, meio)
        const dur = (f.fim - f.inicio) / 3.6
        return { key: f.key, d: pathFatia(f.inicio, f.fim), color: f.meta.color, border: f.meta.border, rotulo: `${dur}%`, textoX: pc[0], textoY: pc[1] }
    })
    const handlesRender = [
        { key: "S", pct: graus.S, meta: SECTION_META[0] },
        { key: "O", pct: graus.O, meta: SECTION_META[1] },
        { key: "A", pct: graus.A, meta: SECTION_META[2] },
    ].map(h => {
        const pc = pontoArco(CLOCK_CX, CLOCK_CY, CLOCK_R, h.pct)
        return { key: h.key, cx: pc[0], cy: pc[1], fill: h.meta.color }
    })
    const ticksAvancado: { x1: number; y1: number; x2: number; y2: number }[] = []
    for (let i = 0; i < 12; i++) {
        const a = i * 30
        const p1 = pontoArco(CLOCK_CX, CLOCK_CY, CLOCK_R + 4, a)
        const p2 = pontoArco(CLOCK_CX, CLOCK_CY, CLOCK_R + 8, a)
        ticksAvancado.push({ x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] })
    }
    const durS = graus.S / 3.6
    const durO = (graus.O - graus.S) / 3.6
    const durA = (graus.A - graus.O) / 3.6
    const durP = (360 - graus.A) / 3.6
    const resumoAvancado = `S ${Math.round((tempoLimite * durS / 100) * 10) / 10} min · O ${Math.round((tempoLimite * durO / 100) * 10) / 10} min · A ${Math.round((tempoLimite * durA / 100) * 10) / 10} min · P ${Math.round((tempoLimite * durP / 100) * 10) / 10} min`

    return (
        <div className="preceptoria-root framer-editor-container" style={{ width: "100%", height: "100%", borderRadius: "10px", boxSizing: "border-box", overflow: "hidden", position: "relative", overflowX: "hidden" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
                .preceptoria-root {
                    --editor-bg: #000000; --editor-border: #1f1f1f;
                    --editor-text: #f5f5f4; --editor-placeholder: #57534e;
                    --meta-bg: rgba(255,255,255,0.06); --meta-border: rgba(255,255,255,0.12); --meta-text: #a3a3a3;
                    --limite-bg: rgba(69,10,10,0.9); --limite-border: #7f1d1d; --limite-text: #fca5a5;
                    background: #000000; color: var(--editor-text);
                }
                .framer-editor-container { background: #000000; border: 1px solid var(--editor-border); }

                .gas-ui-blockout { user-select: none !important; -webkit-user-select: none !important; pointer-events: auto; }
                @keyframes gasPopIn { 0% { transform: scale(0.7) translateY(8px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
                .framer-timer-entrance { animation: gasPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
                @keyframes gasFadeOut { 0% { opacity: 1; transform: scale(1) translateY(0); } 100% { opacity: 0; transform: scale(0.95) translateY(8px); } }
                .framer-timer-exit { animation: gasFadeOut 0.2s cubic-bezier(0.25, 1, 0.5, 1) forwards !important; }
                @keyframes gasAmplifiedShake { 0%, 100% { transform: scale(1) rotate(0deg); } 12%, 36%, 60% { transform: scale(1.16) rotate(-6deg); } 24%, 48%, 72% { transform: scale(1.16) rotate(6deg); } 80% { transform: scale(1.04) rotate(-2deg); } 90% { transform: scale(1.01) rotate(1deg); } }
                .gas-soap-heavy-trigger { animation: gasAmplifiedShake 0.95s cubic-bezier(0.25, 1, 0.5, 1) forwards; transform-origin: center center; }
                @keyframes gasPlayPulse { 0%, 100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 1; transform: scale(1.12); } }
                .gas-play-pulse-btn { animation: gasPlayPulse 1.4s ease-in-out infinite; }
                .gas-hover-btn { display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 4px; cursor: pointer; transition: background 0.2s, transform 0.1s; font-size: 8px; border: none; }
                .gas-hover-btn:active { transform: scale(0.85); }
                .gas-hover-btn:hover { transform: scale(1.12); }
                .gas-scale-hover { transition: transform 0.2s ease-in-out, background 0.2s, opacity 0.2s, box-shadow 0.2s; }
                .gas-scale-hover:hover:not(:disabled) { transform: scale(1.05); }
                .gas-scale-hover:active:not(:disabled) { transform: scale(0.95); }
                input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                input[type="number"] { -moz-appearance: textfield; }
                .gas-btn-pause-bars { font-weight: 700 !important; font-size: 8px !important; letter-spacing: 0.5px !important; transform: scaleY(0.95); }
            `}</style>

            {/* ── MAIN ── */}
            <div style={{ width: "100%", height: "100%", overflowY: "auto", overflowX: "hidden", boxSizing: "border-box", display: "flex", flexDirection: "column", position: "relative" }}>

                {/* ── CENTERED CONTENT ── */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", minHeight: 0, boxSizing: "border-box" }}>

                    {/* ── EMPTY STATE ── */}
                    {!cronometroAtivo && !mostrarSetupRelogio && (
                        <div className="framer-timer-entrance" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", textAlign: "center", maxWidth: "340px" }}>
                            <div style={{ width: "72px", height: "72px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", fontSize: "28px" }}>⏱</div>
                            <div style={{ fontFamily: '"Google Sans Flex", sans-serif', fontSize: "16px", fontWeight: 600, color: "#f5f5f4" }}>monitoramento de atendimento</div>
                            <div style={{ fontFamily: '"Google Sans Flex", sans-serif', fontSize: "12px", color: "var(--meta-text)", lineHeight: 1.5 }}>inicia o cronômetro para acompanhar o tempo de cada etapa do atendimento (S-O-A-P).</div>
                            <button className="gas-scale-hover gas-ui-blockout" onClick={() => { setMostrarSetupRelogio(true) }} style={{ marginTop: "8px", background: "#3b82f6", color: "#ffffff", border: "none", borderRadius: "8px", padding: "10px 22px", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: '"Google Sans Flex", sans-serif', display: "flex", alignItems: "center", gap: "6px" }}>
                                <span>▶</span> iniciar cronômetro
                            </button>
                        </div>
                    )}

                    {/* ── TIMER SETUP ── */}
                    {mostrarSetupRelogio && (
                        <>
                            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 19, background: "transparent", pointerEvents: "auto" }} onClick={() => { setRelogioExiting(true) }} />
                            <div className={`framer-timer-entrance gas-ui-blockout ${relogioExiting ? "framer-timer-exit" : ""}`} onAnimationEnd={() => { if (relogioExiting) { setMostrarSetupRelogio(false); setRelogioExiting(false) } }} style={{ position: "relative", background: bgDinamicoPopup, backdropFilter: "blur(12px)", border: `1px solid ${borderDinamicaPopup}`, borderRadius: "12px", padding: "14px", zIndex: 20, fontFamily: '"Google Sans Flex", sans-serif', display: "flex", flexDirection: "column", alignItems: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.5)", width: mostrarAvancado ? "210px" : "160px", transition: "width 0.2s ease" }}>
                                <div style={{ display: "flex", width: "100%", justifyContent: "center", alignItems: "center", marginBottom: "10px" }}>
                                    <span style={{ fontSize: "9px", fontWeight: 700, color: corDinamicaPopup, letterSpacing: "0.8px" }}>TEMPO</span>
                                </div>
                                <svg ref={relogioRef} onMouseDown={iniciarArrastoPonteiro} style={{ width: "84px", height: "84px", cursor: "ew-resize", overflow: "visible" }}>
                                    <circle cx="42" cy="42" r="38" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                                    <line x1="42" y1="4" x2="42" y2="9" stroke="var(--editor-text)" strokeWidth="2" strokeLinecap="round" />
                                    <line x1="80" y1="42" x2="75" y2="42" stroke="var(--meta-text)" strokeWidth="1.5" strokeLinecap="round" />
                                    <line x1="42" y1="80" x2="42" y2="75" stroke="var(--meta-text)" strokeWidth="1.5" strokeLinecap="round" />
                                    <line x1="4" y1="42" x2="9" y2="42" stroke="var(--meta-text)" strokeWidth="1.5" strokeLinecap="round" />
                                    <circle cx="42" cy="42" r="38" fill="none" stroke="var(--meta-text)" strokeWidth="1.5" strokeDasharray={`${2 * Math.PI * 38}`} strokeDashoffset={`${2 * Math.PI * 38 * (1 - tempoLimite / 60)}`} style={{ opacity: 0.15 }} />
                                    <g transform={`rotate(${tempoLimite * 6}, 42, 42)`}>
                                        <line x1="42" y1="42" x2="42" y2="8" stroke="var(--editor-text)" strokeWidth="2" strokeLinecap="round" />
                                        <circle cx="42" cy="8" r="3" fill="var(--editor-text)" />
                                    </g>
                                    <circle cx="42" cy="42" r="3" fill="var(--meta-text)" />
                                </svg>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px", marginBottom: "10px" }}>
                                    <button className="gas-scale-hover" onClick={() => setTempoLimite(p => Math.max(1, p - 15))} style={{ background: "rgba(120,113,108,0.12)", border: "none", color: corDinamicaPopup, borderRadius: "5px", padding: "3px 7px", fontSize: "10px", fontWeight: 700, cursor: "pointer" }}>-15</button>
                                    <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--editor-text)", display: "flex", alignItems: "baseline", gap: "2px" }}>
                                        {tempoLimite}<span style={{ fontSize: "10px", fontWeight: 500, color: "var(--meta-text)" }}>minutos</span>
                                    </div>
                                    <button className="gas-scale-hover" onClick={() => setTempoLimite(p => Math.min(60, p + 15))} style={{ background: "rgba(120,113,108,0.12)", border: "none", color: corDinamicaPopup, borderRadius: "5px", padding: "3px 7px", fontSize: "10px", fontWeight: 700, cursor: "pointer" }}>+15</button>
                                </div>
                                <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", marginTop: "8px" }}>
                                    <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--meta-text)", letterSpacing: "0.5px" }}>burocracia</span>
                                    <button className="gas-scale-hover" onClick={() => setMostrarBurocracia(!mostrarBurocracia)} style={{ width: "36px", height: "20px", borderRadius: "10px", background: mostrarBurocracia ? corDinamicaPopup : "rgba(120,113,108,0.2)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s, transform 0.2s ease-in-out" }}>
                                        <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#ffffff", position: "absolute", top: "2px", left: mostrarBurocracia ? "18px" : "2px", transition: "left 0.2s" }} />
                                    </button>
                                </div>
                                {mostrarBurocracia && (
                                    <div style={{ width: "100%", marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
                                        <input type="number" value={tempoBurocracia} onChange={e => setTempoBurocracia(Math.max(1, Math.min(60, Number(e.target.value) || 1)))} onWheel={e => e.currentTarget.blur()} style={{ width: "50px", padding: "6px 8px", borderRadius: "5px", border: "1px solid var(--editor-border)", background: "var(--editor-bg)", color: "var(--editor-text)", fontSize: "11px", fontFamily: '"Google Sans Flex", sans-serif', outline: "none", textAlign: "center" }} />
                                        <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--meta-text)" }}>min</span>
                                        <div style={{ fontSize: "9px", fontWeight: 600, color: corDinamicaPopup, marginLeft: "auto" }}>total: {tempoLimite + tempoBurocracia} min</div>
                                    </div>
                                )}
                                <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", marginTop: "8px" }}>
                                    <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--meta-text)", letterSpacing: "0.5px" }}>avançado</span>
                                    <button className="gas-scale-hover" onClick={() => setMostrarAvancado(!mostrarAvancado)} title="editar divisão da circunferência" style={{ width: "36px", height: "20px", borderRadius: "10px", background: mostrarAvancado ? corDinamicaPopup : "rgba(120,113,108,0.2)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s, transform 0.2s ease-in-out" }}>
                                        <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#ffffff", position: "absolute", top: "2px", left: mostrarAvancado ? "18px" : "2px", transition: "left 0.2s" }} />
                                    </button>
                                </div>
                                {mostrarAvancado && (
                                    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", marginBottom: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                                        <svg ref={relogioAvancadoRef} width="132" height="132" viewBox="0 0 128 128" style={{ overflow: "visible", cursor: "ew-resize" }}>
                                            {ticksAvancado.map(t => <line key={`tick-${t.x1}-${t.y1}`} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="rgba(255,255,255,0.16)" strokeWidth="1" />)}
                                            {fatiasRender.map(s => (
                                                <g key={s.key}>
                                                    <path d={s.d} fill={s.color} fillOpacity="0.22" stroke={s.border} strokeWidth="1" />
                                                    <text x={s.textoX} y={s.textoY} fill={s.color} fontSize="10" fontWeight="700" textAnchor="middle" style={{ fontFamily: '"Google Sans Flex", sans-serif', pointerEvents: "none" }}>{s.rotulo}</text>
                                                </g>
                                            ))}
                                            {handlesRender.map(h => (
                                                <circle key={`handle-${h.key}`} cx={h.cx} cy={h.cy} r="6" fill={h.fill} stroke="#000000" strokeWidth="1.5" onMouseDown={e => iniciarArrastoFronteira(h.key, e)} style={{ cursor: "ew-resize" }} />
                                            ))}
                                        </svg>
                                        <div style={{ fontSize: "9px", fontWeight: 600, color: "var(--meta-text)", letterSpacing: "0.3px", textAlign: "center" }}>{resumoAvancado}</div>
                                    </div>
                                )}
                                <select value={tipoSelecionado} onChange={e => setTipoSelecionado(e.target.value)} style={{ width: "100%", padding: "6px 8px", borderRadius: "5px", border: "1px solid var(--editor-border)", background: "var(--editor-bg)", color: "var(--editor-text)", fontSize: "11px", fontFamily: '"Google Sans Flex", sans-serif', outline: "none", marginBottom: "10px", marginTop: "4px", cursor: "pointer" }}>
                                    {TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                </select>
                                <button className="gas-scale-hover" onClick={dispararCronometroAtivo} style={{ width: "100%", background: corDinamicaPopup, color: tempoLimite > 30 && tempoLimite <= 45 ? "#000000" : "#ffffff", border: "none", borderRadius: "6px", padding: "6px 0", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", boxShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>
                                    <span>▶</span> iniciar
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── DASHBOARD ── */}
                    {cronometroAtivo && (
                        <div className="framer-timer-entrance" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "26px", width: "100%", maxWidth: "520px" }}>
                            {/* SOAP circles */}
                            {!arquivadoManualmente && (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", width: "100%" }}>
                                    {clusterItems.map(renderCircle)}
                                </div>
                            )}
                            {!arquivadoManualmente && (
                                <div style={{ fontFamily: '"Google Sans Flex", sans-serif', fontSize: "15px", fontWeight: 600, color: arquivadoManualmente ? "var(--meta-text)" : (secaoExtrapolada ? "#ef4444" : (metaAtual?.color || "#f5f5f4")), letterSpacing: "0.02em", textAlign: "center" }}>
                                    {displayTitle}
                                </div>
                            )}

                            {/* Elapsed time */}
                            {!arquivadoManualmente && (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                                    <div key={`time-shake-${shakeTimeCount}`} className={`${shakeTimeCount > 0 ? "gas-soap-heavy-trigger" : ""}`} style={{ fontFamily: '"Google Sans Flex", sans-serif', fontSize: "76px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, color: chipTextColor, transformOrigin: "center center" }}>
                                        {textoCronometro}
                                    </div>
                                    {isPaused && (
                                        <div className="gas-ui-blockout" style={{ fontFamily: '"Google Sans Flex", sans-serif', fontSize: "11px", fontWeight: 700, color: "var(--meta-text)", letterSpacing: "0.5px", background: "rgba(255,255,255,0.06)", padding: "4px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.12)" }}>PAUSADO</div>
                                    )}
                                    <div style={{ fontFamily: '"Google Sans Flex", sans-serif', fontSize: "11px", color: "var(--meta-text)" }}>
                                        meta: {metaTotal} min{mostrarBurocracia ? " · burocracia incluída" : ""}
                                    </div>
                                </div>
                            )}

                            {/* Controls */}
                            {!arquivadoManualmente && (
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <button className="gas-scale-hover" onClick={() => setArquivadoManualmente(true)} title="concluir atendimento" style={{ width: "44px", height: "44px", borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.1)", color: "#ffffff", fontSize: "16px", fontWeight: 700, cursor: "pointer", fontFamily: '"Google Sans Flex", sans-serif' }}>✓</button>
                                    {secaoAtual !== "FIM" && (
                                        <button className="gas-scale-hover" onClick={pularSecao} title="pular seção (tempo restante vai para a próxima)" style={{ width: "44px", height: "44px", borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.1)", color: "#f5f5f4", fontSize: "16px", fontWeight: 700, cursor: "pointer", fontFamily: '"Google Sans Flex", sans-serif' }}>⏭</button>
                                    )}
                                    {secaoAtual !== "FIM" && (
                                        <button className="gas-scale-hover" onClick={adicionarBonus} title="adicionar 10% do tempo à seção atual" style={{ width: "44px", height: "44px", borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.1)", color: "#4ade80", fontSize: "11px", fontWeight: 800, cursor: "pointer", fontFamily: '"Google Sans Flex", sans-serif' }}>+10%</button>
                                    )}
                                    <button className={`gas-scale-hover ${isPaused ? "gas-play-pulse-btn" : ""}`} onClick={() => setIsPaused(!isPaused)} title={isPaused ? "retomar" : "pausar"} style={{ width: "44px", height: "44px", borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.1)", color: chipTextColor, fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: '"Google Sans Flex", sans-serif' }}>
                                        {isPaused ? "▶" : "❚❚"}
                                    </button>
                                    <button className="gas-scale-hover" onClick={fecharCronometroCompleto} title="encerrar" style={{ width: "44px", height: "44px", borderRadius: "50%", border: "none", background: "rgba(239,68,68,0.14)", color: "#ef4444", fontSize: "16px", fontWeight: 700, cursor: "pointer", fontFamily: '"Google Sans Flex", sans-serif' }}>✕</button>
                                </div>
                            )}

                            {arquivadoManualmente && (
                                <div className="framer-timer-entrance gas-ui-blockout" style={{ width: "100%", maxWidth: "420px", background: "#0d0d0d", border: "1px solid #262626", borderRadius: "14px", overflow: "hidden", boxSizing: "border-box" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px", borderBottom: "1px solid #1f1f1f", background: "rgba(255,255,255,0.02)" }}>
                                        <span style={{ width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(34,197,94,0.14)", color: "#22c55e", fontSize: "15px", fontWeight: 800, fontFamily: '"Google Sans Flex", sans-serif', flexShrink: 0 }}>✓</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontFamily: '"Google Sans Flex", sans-serif', fontSize: "13px", fontWeight: 600, color: "#f5f5f4" }}>resumo do atendimento</div>
                                            <div style={{ fontFamily: '"Google Sans Flex", sans-serif', fontSize: "10px", color: "var(--meta-text)", letterSpacing: "0.4px", textTransform: "uppercase" }}>{labelTipo}</div>
                                        </div>
                                    </div>
                                    <div style={{ padding: "6px 0" }}>
                                        {resumoLinhas.map(s => (
                                            <div key={s.letter} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 16px" }}>
                                                <span style={{ width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontSize: "11px", fontWeight: 800, fontFamily: '"Google Sans Flex", sans-serif', flexShrink: 0 }}>{s.letter}</span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontFamily: '"Google Sans Flex", sans-serif', fontSize: "12px", fontWeight: 600, color: "#f5f5f4" }}>{s.title}</div>
                                                    <div style={{ fontFamily: '"Google Sans Flex", sans-serif', fontSize: "10px", color: "var(--meta-text)" }}>usou <b style={{ color: corUsado(s.usado, s.alocado), fontWeight: 700 }}>{formatarTempo(s.usado)}</b> / {formatarTempo(s.alocado)}</div>
                                                </div>
                                                <span style={{ fontFamily: '"Google Sans Flex", sans-serif', fontSize: "10px", fontWeight: 700, color: s.done ? "#22c55e" : "var(--meta-text)", flexShrink: 0 }}>{s.done ? "✓ concluída" : (s.ativo ? "em curso" : "—")}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ padding: "10px 16px", borderTop: "1px solid #1f1f1f", background: "rgba(255,255,255,0.02)" }}>
                                        <div style={{ fontFamily: '"Google Sans Flex", sans-serif', fontSize: "11px", color: "var(--meta-text)" }}>
                                            usou <b style={{ color: corUsado(segundosDecorridos, totalSegundosLimite), fontWeight: 700 }}>{formatarTempo(segundosDecorridos)}</b> / {formatarTempo(totalSegundosLimite)}
                                        </div>
                                    </div>
                                    <div style={{ padding: "0 16px 14px 16px" }}>
                                        <button className="gas-scale-hover" onClick={fecharCronometroCompleto} style={{ width: "100%", background: "rgba(120,113,108,0.1)", color: "var(--meta-text)", border: "1px solid rgba(120,113,108,0.2)", borderRadius: "8px", padding: "8px 18px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: '"Google Sans Flex", sans-serif' }}>reiniciar cronômetro</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── TEMPLATE OVERLAY ── */}
            {mostrarTemplate && (
                <>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={() => setMostrarTemplate(false)} />
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 101, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", padding: "20px", boxSizing: "border-box" }}>
                        <div className="framer-timer-entrance gas-ui-blockout" style={{ width: "100%", maxWidth: "420px", maxHeight: "100%", background: "#0a0a0a", border: "1px solid #262626", borderRadius: "16px", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", boxSizing: "border-box", pointerEvents: "auto" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px", borderBottom: "1px solid #1f1f1f", background: "rgba(255,255,255,0.02)" }}>
                                <span style={{ width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: templateMeta.bg, border: `1px solid ${templateMeta.border}`, color: templateMeta.color, fontSize: "13px", fontWeight: 800, fontFamily: '"Google Sans Flex", sans-serif', flexShrink: 0 }}>{templateMeta.letter}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontFamily: '"Google Sans Flex", sans-serif', fontSize: "13px", fontWeight: 600, color: "#f5f5f4" }}>{templateTitulo}</div>
                                    <div style={{ fontFamily: '"Google Sans Flex", sans-serif', fontSize: "10px", color: "var(--meta-text)", letterSpacing: "0.4px", textTransform: "uppercase" }}>modelo de preceptoria</div>
                                </div>
                                <button className="gas-scale-hover" onClick={() => setMostrarTemplate(false)} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: "rgba(255,255,255,0.06)", color: "#a3a3a3", cursor: "pointer", fontSize: "13px", fontWeight: 700, fontFamily: '"Google Sans Flex", sans-serif', flexShrink: 0 }}>✕</button>
                            </div>
                            <div style={{ padding: "14px 16px 18px 16px", overflowY: "auto", boxSizing: "border-box" }}>
                                {templateConteudo ? renderTemplateLinhas(templateConteudo) : (
                                    <div style={{ fontFamily: '"Google Sans Flex", sans-serif', fontSize: "12px", color: "var(--meta-text)", textAlign: "center", padding: "24px 0" }}>carregando...</div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
})

export default Preceptoria
