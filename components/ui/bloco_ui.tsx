import * as React from "react"
import { forwardRef, useImperativeHandle, useMemo, useCallback } from "react"
import { createPortal } from "react-dom"
import { createClient } from "@supabase/supabase-js"
import { useEditor, useTimer } from "../contexts/AppContext"

const supabase = createClient(
    "https://odqdzyqjpufitvahrhiq.supabase.co",
    "sb_publishable_5ftHtUIl4DlyHy9KQ-jvGw_AfnhQn1Q"
)

/* ── Module dictionary (lazy-loaded) ─────────────────────────────── */
interface Modulo {
    id: string
    label: string
    text: string
}

interface Template {
    id: string
    label: string
    content?: string
    file?: string
}

interface ModulosData {
    modulos: Record<string, Modulo[]>
    templates: Template[]
}

let modulosCache: ModulosData = { modulos: { subjetivo: [], objetivo: [], avaliacao: [], plano: [] }, templates: [] }
let modulosLoaded = false
async function carregarModulos(): Promise<ModulosData> {
    if (modulosLoaded) return modulosCache
    try {
        const res = await fetch("/contents/bloco_modulos.json")
        const raw = await res.json()
        modulosCache = {
            modulos: raw.modulos || raw,
            templates: raw.templates || [],
        }
    } catch {
        modulosCache = { modulos: { subjetivo: [], objetivo: [], avaliacao: [], plano: [] }, templates: [] }
    }
    modulosLoaded = true
    return modulosCache
}

/* ── Types ───────────────────────────────────────────────────────── */
export interface BlocoActions {
    copiar(): void
    colar(): void
    substituir(texto: string): void
    limpar(): void
    cronometro(): void
}

interface Section {
    id: string
    title: string
    content: string
    collapsed: boolean
    optional: boolean
    enabled: boolean
}

const SECTION_META: { id: string; title: string; letter: string; color: string; bg: string; border: string; optional: boolean }[] = [
    { id: "subjetivo", title: "Subjetivo", letter: "S", color: "#3b82f6", bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.18)", optional: false },
    { id: "objetivo", title: "Objetivo", letter: "O", color: "#22c55e", bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.18)", optional: true },
    { id: "avaliacao", title: "Avaliação", letter: "A", color: "#eab308", bg: "rgba(234,179,8,0.06)", border: "rgba(234,179,8,0.18)", optional: false },
    { id: "plano", title: "Plano", letter: "P", color: "#f97316", bg: "rgba(249,115,22,0.06)", border: "rgba(249,115,22,0.18)", optional: false },
]

const INITIAL_SECTIONS: Section[] = SECTION_META.map(m => ({
    id: m.id,
    title: m.title,
    content: "",
    collapsed: false,
    optional: m.optional,
    enabled: true,
}))

function createDefaultSections(): Section[] {
    return INITIAL_SECTIONS.map(s => ({ ...s }))
}

/* ── Parse / Merge ───────────────────────────────────────────────── */
function parseSections(text: string): { title: string; sections: Section[] } {
    const cleaned = (text || "").replace(/\u00A0/g, " ").replace(/\u200B/g, "").replace(/\u00D7/g, "x")
    if (!cleaned.trim()) return { title: "", sections: createDefaultSections() }

    const lines = cleaned.split("\n")
    let title = ""
    let bodyStart = 0

    if (lines[0]?.startsWith("# ") && !lines[0]?.startsWith("## ")) {
        title = lines[0].substring(2).trim()
        bodyStart = 1
    }

    const body = lines.slice(bodyStart).join("\n")
    const sectionChunks = body.split(/^## /m)

    const sections = createDefaultSections()
    for (const chunk of sectionChunks) {
        if (!chunk.trim()) continue
        const newlineIdx = chunk.indexOf("\n")
        const header = newlineIdx >= 0 ? chunk.substring(0, newlineIdx).trim() : chunk.trim()
        const content = newlineIdx >= 0 ? chunk.substring(newlineIdx + 1) : ""
        const match = sections.find(s => s.title.toLowerCase() === header.toLowerCase())
        if (match) {
            match.content = content.trim()
        }
    }

    return { title, sections }
}

function mergeSections(title: string, sections: Section[]): string {
    const parts: string[] = []
    if (title.trim()) parts.push(`# ${title.trim()}`)
    for (const s of sections) {
        if (!s.enabled && s.optional) continue
        if (s.content.trim()) parts.push(`## ${s.title}\n${s.content}`)
    }
    return parts.join("\n\n")
}

/* ── Sanitization ────────────────────────────────────────────────── */
function limparTextoInvisivel(txt: string): string {
    return (txt || "")
        .replace(/\u00A0/g, " ")
        .replace(/\u200B/g, "")
        .replace(/\u00D7/g, "x")
        .split("\n")
        .map(line => line.trimEnd())
        .filter((line, i, arr) => {
            if (line !== "") return true
            return !((i > 0 && arr[i - 1] === "") || (i < arr.length - 1 && arr[i + 1] === ""))
        })
        .join("\n")
}

/* ── Component ───────────────────────────────────────────────────── */
const Bloco = forwardRef<BlocoActions>(function Bloco(_props, ref) {
    const editor = useEditor()
    const timer = useTimer()

    /* ── Title ── */
    const [title, setTitle] = React.useState("")

    /* ── Sections ── */
    const [sections, setSections] = React.useState<Section[]>(createDefaultSections)

    /* ── Editor refs ── */
    const sectionEditorRefs = React.useRef<Record<string, HTMLDivElement>>({})

    /* ── Module dropdown ── */
    const [openModuleDropdown, setOpenModuleDropdown] = React.useState<string | null>(null)
    const [dropdownPos, setDropdownPos] = React.useState<{ x: number; y: number } | null>(null)
    const [focusedSectionId, setFocusedSectionId] = React.useState<string | null>(null)
    const [openTemplateDropdown, setOpenTemplateDropdown] = React.useState(false)
    const [modulos, setModulos] = React.useState<ModulosData>({ modulos: { subjetivo: [], objetivo: [], avaliacao: [], plano: [] }, templates: [] })
    const dropdownContainerRefs = React.useRef<Record<string, HTMLDivElement>>({})

    /* ── Auth / save ── */
    const [saveTime, setSaveTime] = React.useState<string | null>(null)
    const [showSavePopup, setShowSavePopup] = React.useState(false)
    const [username, setUsername] = React.useState<string | null>(null)
    const [showUsernameInput, setShowUsernameInput] = React.useState(true)
    const [inputUsername, setInputUsername] = React.useState("")
    const usernameInputRef = React.useRef<HTMLInputElement>(null)
    const initialContentRef = React.useRef<string | null>(null)

    /* ── Editing state ── */
    const [edicaoIniciada, setEdicaoIniciada] = React.useState(false)
    const edicaoIniciadaRef = React.useRef<number | null>(null)
    const [popupDispensado, setPopupDispensado] = React.useState(false)
    const [mostrarPopupSugestao, setMostrarPopupSugestao] = React.useState(false)
    const externalUpdateRef = React.useRef(false)
    const contentVersionRef = React.useRef<Record<string, number>>({})

    /* ── Timer state ── */
    const [tempoLimite, setTempoLimite] = React.useState<number>(15)
    const [segundosDecorridos, setSegundosDecorridos] = React.useState<number>(0)
    const [cronometroAtivo, setCronometroAtivo] = React.useState<boolean>(false)
    const [mostrarSetupRelogio, setMostrarSetupRelogio] = React.useState<boolean>(false)
    const [relogioExiting, setRelogioExiting] = React.useState<boolean>(false)
    const [isPaused, setIsPaused] = React.useState<boolean>(false)
    const [hoverTimer, setHoverTimer] = React.useState<boolean>(false)
    const [mostrarBurocracia, setMostrarBurocracia] = React.useState<boolean>(false)
    const [tempoBurocracia, setTempoBurocracia] = React.useState<number>(15)
    const [shakeTimeCount, setShakeTimeCount] = React.useState<number>(0)
    const [shakeProgressCount, setShakeProgressCount] = React.useState<number>(0)
    const [arquivadoManualmente, setArquivadoManualmente] = React.useState<boolean>(false)
    const ultimoPercentualRef = React.useRef<number>(0)
    const ultimaSecaoRef = React.useRef<string>("S")
    const momentoInicioRef = React.useRef<number>(0)
    const segundosAcumuladosRef = React.useRef<number>(0)
    const relogioRef = React.useRef<SVGSVGElement>(null)

    /* ── Stable content hash for save effect ── */
    const sectionsHash = useMemo(() => JSON.stringify(sections.map(s => ({ c: s.content, e: s.enabled }))), [sections])
    const contentHash = title + "||" + sectionsHash

    /* ── Bump editor versions on external paste/load ── */
    const bumpAllVersions = useCallback(() => {
        const ids = ["subjetivo", "objetivo", "avaliacao", "plano"]
        ids.forEach(id => {
            contentVersionRef.current[id] = (contentVersionRef.current[id] || 0) + 1
        })
    }, [])

    /* ── Section helpers ── */
    const hexToRgb = (hex: string): string => {
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        return `${r},${g},${b}`
    }

    const toggleCollapse = useCallback((sectionId: string) => {
        setSections(prev => prev.map(s => s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s))
    }, [])

    const toggleObjetivo = useCallback(() => {
        setSections(prev => prev.map(s =>
            s.id === "objetivo" ? { ...s, enabled: !s.enabled, collapsed: !s.enabled ? false : s.collapsed } : s
        ))
    }, [])

    /* ── Module handling ── */
    React.useEffect(() => {
        carregarModulos().then(setModulos)
    }, [])

    const appendModule = useCallback((sectionId: string, moduleText: string) => {
        const el = sectionEditorRefs.current[sectionId]
        if (el) {
            el.focus()
            const sel = window.getSelection()
            if (sel && sel.rangeCount) {
                const range = sel.getRangeAt(0)
                if (el.contains(range.startContainer)) {
                    const frag = document.createDocumentFragment()
                    const lines = moduleText.split("\n")
                    lines.forEach((line, i) => {
                        if (i > 0) frag.appendChild(document.createElement("br"))
                        if (line === "") {
                            frag.appendChild(document.createElement("br"))
                        } else {
                            frag.appendChild(document.createTextNode(line))
                        }
                    })
                    range.deleteContents()
                    range.insertNode(frag)
                    range.collapse(false)
                    sel.removeAllRanges()
                    sel.addRange(range)
                } else {
                    const sep = (el.innerText || "") && !(el.innerText || "").endsWith("\n") ? "\n" : ""
                    el.innerHTML += sep + moduleText.split("\n").map(l => l === "" ? "<div><br></div>" : `<div>${l}</div>`).join("")
                }
            } else {
                const sep = (el.innerText || "") && !(el.innerText || "").endsWith("\n") ? "\n" : ""
                el.innerHTML += sep + moduleText.split("\n").map(l => l === "" ? "<div><br></div>" : `<div>${l}</div>`).join("")
            }
            const text = limparTextoInvisivel(el.innerText || "")
            setSections(prev => prev.map(s => s.id === sectionId ? { ...s, content: text } : s))
        } else {
            setSections(prev => prev.map(s => {
                if (s.id !== sectionId) return s
                const sep = s.content && !s.content.endsWith("\n") ? "\n" : ""
                return { ...s, content: s.content + sep + moduleText }
            }))
        }
        setOpenModuleDropdown(null)
        if (edicaoIniciadaRef.current === null) {
            edicaoIniciadaRef.current = Date.now()
            setEdicaoIniciada(true)
        }
    }, [])

    /* ── Load / Save ── */
    async function load() {
        if (!username) return
        const { data } = await supabase
            .from("pages")
            .select("*")
            .eq("id", username)
            .single()
        if (data?.content) {
            const cleaned = limparTextoInvisivel(data.content)
            const parsed = parseSections(cleaned)
            setTitle(parsed.title)
            setSections(parsed.sections)
            initialContentRef.current = cleaned
        } else {
            initialContentRef.current = ""
        }
    }

    React.useEffect(() => {
        if (username) load()

        /* ── Assign context methods (so Plasmic HOCs & external events work) ── */
        editor.copiar = () => {
            const textoLimpo = limparTextoInvisivel(mergeSections(title, sections))
            navigator.clipboard.writeText(textoLimpo)
        }
        editor.colar = async () => {
            try {
                const text = await navigator.clipboard.readText()
                const cleaned = limparTextoInvisivel(text)
                const parsed = parseSections(cleaned)
                externalUpdateRef.current = true; bumpAllVersions()
                setTitle(parsed.title)
                setSections(parsed.sections)
                setPopupDispensado(false)
                setEdicaoIniciada(true)
                edicaoIniciadaRef.current = Date.now()
            } catch (err) {
                console.error(err)
            }
        }
        editor.substituir = (novoTexto) => {
            const cleaned = limparTextoInvisivel(novoTexto || "")
            const parsed = parseSections(cleaned)
            externalUpdateRef.current = true; bumpAllVersions()
            setTitle(parsed.title)
            setSections(parsed.sections)
            setPopupDispensado(false)
            if (novoTexto) {
                setEdicaoIniciada(true)
                edicaoIniciadaRef.current = Date.now()
            } else {
                setEdicaoIniciada(false)
                edicaoIniciadaRef.current = null
            }
        }
        timer.ativarCronometro = () => {
            fecharCronometroCompleto()
            setMostrarSetupRelogio(true)
        }

        const lidarComSubstituicaoOuvinte = (e: Event) => {
            const customEvent = e as CustomEvent
            if (customEvent.detail && typeof customEvent.detail.texto === "string") {
                const parsed = parseSections(customEvent.detail.texto)
                externalUpdateRef.current = true; bumpAllVersions()
                setTitle(parsed.title)
                setSections(parsed.sections)
                setPopupDispensado(false)
                setEdicaoIniciada(true)
                edicaoIniciadaRef.current = Date.now()
            }
        }

        document.addEventListener("framerSubstituirTexto", lidarComSubstituicaoOuvinte)
        const lidarComCopiarOuvinte = () => editor.copiar()
        window.addEventListener("framerCopiar", lidarComCopiarOuvinte)
        const lidarComColarOuvinte = () => editor.colar()
        window.addEventListener("framerColar", lidarComColarOuvinte)
        const lidarComLimparOuvinte = () => editor.substituir("")
        window.addEventListener("framerLimpar", lidarComLimparOuvinte)
        const lidarComCronometroOuvinte = () => timer.ativarCronometro()
        window.addEventListener("framerCronometro", lidarComCronometroOuvinte)

        return () => {
            document.removeEventListener("framerSubstituirTexto", lidarComSubstituicaoOuvinte)
            window.removeEventListener("framerCopiar", lidarComCopiarOuvinte)
            window.removeEventListener("framerColar", lidarComColarOuvinte)
            window.removeEventListener("framerLimpar", lidarComLimparOuvinte)
            window.removeEventListener("framerCronometro", lidarComCronometroOuvinte)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [username])

    /* Debounced save */
    React.useEffect(() => {
        if (initialContentRef.current === null || !username) return
        const conteudoSalvar = limparTextoInvisivel(mergeSections(title, sections))
        if (conteudoSalvar === initialContentRef.current) return
        setShowSavePopup(false)
        const timeout = setTimeout(async () => {
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
            setSaveTime(`${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`)
        }, 800)
        return () => clearTimeout(timeout)
    }, [contentHash, username]) // eslint-disable-line react-hooks/exhaustive-deps

    React.useEffect(() => {
        if (!saveTime) return
        const t = setTimeout(() => setShowSavePopup(true), 3000)
        return () => clearTimeout(t)
    }, [saveTime]) // eslint-disable-line react-hooks/exhaustive-deps

    React.useEffect(() => {
        if (!username || popupDispensado || cronometroAtivo || mostrarSetupRelogio || !edicaoIniciada) return
        const t = setTimeout(() => setMostrarPopupSugestao(true), 60000)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [username, popupDispensado, cronometroAtivo, mostrarSetupRelogio, edicaoIniciada])

    /* ── Imperative handle ── */
    useImperativeHandle(ref, () => ({
        copiar: () => {
            const textoLimpo = limparTextoInvisivel(mergeSections(title, sections))
            navigator.clipboard.writeText(textoLimpo)
        },
        colar: async () => {
            try {
                const text = await navigator.clipboard.readText()
                const cleaned = limparTextoInvisivel(text)
                const parsed = parseSections(cleaned)
                externalUpdateRef.current = true; bumpAllVersions()
                setTitle(parsed.title)
                setSections(parsed.sections)
                setPopupDispensado(false)
                setEdicaoIniciada(true)
                edicaoIniciadaRef.current = Date.now()
            } catch (err) {
                console.error(err)
            }
        },
        substituir: (texto: string) => {
            const cleaned = limparTextoInvisivel(texto || "")
            const parsed = parseSections(cleaned)
            externalUpdateRef.current = true; bumpAllVersions()
            setTitle(parsed.title)
            setSections(parsed.sections)
            setPopupDispensado(false)
            if (texto) {
                setEdicaoIniciada(true)
                edicaoIniciadaRef.current = Date.now()
            } else {
                setEdicaoIniciada(false)
                edicaoIniciadaRef.current = null
            }
        },
        limpar: () => {
            setTitle("")
            setSections(createDefaultSections())
            setPopupDispensado(false)
            setEdicaoIniciada(false)
            edicaoIniciadaRef.current = null
        },
        cronometro: () => {
            fecharCronometroCompleto()
            setMostrarSetupRelogio(true)
        },
    })) // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Section editor HTML rendering ── */
    const renderSectionHtml = useCallback((content: string): string => {
        if (!content || !content.trim()) return "<div><br></div>"
        return content.split("\n").map(l => {
            if (l === "") return "<div><br></div>"
            if (/^- /i.test(l)) return `<div><strong>${l}</strong></div>`
            return `<div>${l}</div>`
        }).join("")
    }, [])

    /* ── Section editor event handlers ── */
    const handleSectionInput = useCallback(() => {
        if (edicaoIniciadaRef.current === null) {
            edicaoIniciadaRef.current = Date.now()
            setEdicaoIniciada(true)
        }
    }, [])

    const handleSectionBlur = useCallback((sectionId: string) => {
        const el = sectionEditorRefs.current[sectionId]
        if (!el) return
        const text = limparTextoInvisivel(el.innerText || "")
        setSections(prev => prev.map(s => s.id === sectionId ? { ...s, content: text } : s))
    }, [])

    const handleSectionKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>, sectionId: string) => {
        const selection = window.getSelection()
        if (!selection || !selection.rangeCount) return
        const range = selection.getRangeAt(0)
        if (!range) return
        const el = sectionEditorRefs.current[sectionId]
        const currentBlock = range.startContainer.parentElement === el
            ? (range.startContainer as HTMLElement)
            : range.startContainer.parentElement

        if (e.key === "Enter" && currentBlock) {
            const text = currentBlock.innerText || ""
            if (text.trim() === "-") {
                e.preventDefault()
                document.execCommand("delete")
                document.execCommand("insertBlockquote")
                handleSectionInput()
            } else {
                const listMatch = text.match(/^([\s\t]*-\s)/)
                if (listMatch) {
                    e.preventDefault()
                    document.execCommand("insertText", false, "\n" + listMatch[1])
                    handleSectionInput()
                }
            }
        }

        if (e.key === "Tab" && currentBlock) {
            e.preventDefault()
            const text = currentBlock.innerText || ""
            const offset = range.startOffset
            if (e.shiftKey && (/^  +-\s/.test(text) || text.startsWith("  - "))) {
                currentBlock.innerText = text.substring(2)
                const newRange = document.createRange()
                newRange.setStart(currentBlock.firstChild || currentBlock, Math.max(0, offset - 2))
                selection.removeAllRanges()
                selection.addRange(newRange)
            } else if (!e.shiftKey && /^[\s\t]*-\s/.test(text)) {
                currentBlock.innerText = "  " + text
                const newRange = document.createRange()
                newRange.setStart(currentBlock.firstChild || currentBlock, offset + 2)
                selection.removeAllRanges()
                selection.addRange(newRange)
            } else if (!e.shiftKey) {
                document.execCommand("insertText", false, "  ")
            }
            handleSectionInput()
        }
    }, [handleSectionInput])

    const handleSectionPaste = useCallback((e: React.ClipboardEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const text = limparTextoInvisivel(e.clipboardData.getData("text/plain"))
        document.execCommand("insertText", false, text)
        handleSectionInput()
        setPopupDispensado(false)
        setEdicaoIniciada(true)
        edicaoIniciadaRef.current = Date.now()
    }, [handleSectionInput])

    /* ── Global paste: replace all sections ── */
    const handleGlobalPaste = useCallback((e: React.ClipboardEvent) => {
        e.preventDefault()
        const text = limparTextoInvisivel(e.clipboardData.getData("text/plain"))
        const parsed = parseSections(text)
        externalUpdateRef.current = true; bumpAllVersions()
        setTitle(parsed.title)
        setSections(parsed.sections)
        setPopupDispensado(false)
        setEdicaoIniciada(true)
        edicaoIniciadaRef.current = Date.now()
    }, [bumpAllVersions])

    /* ── Timer calculations ── */
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

    const minutosPassados = Math.floor(segundosDecorridos / 60)
    const textoCronometro = cronometroAtivo ? `${String(minutosPassados).padStart(2, "0")} min.` : "00 min."

    const totalSegundosLimite = (tempoLimite + (mostrarBurocracia ? tempoBurocracia : 0)) * 60
    const limiteSegundosS = tempoLimite * 60 * 0.5
    const limiteSegundosO = tempoLimite * 60 * 0.6
    const limiteSegundosA = tempoLimite * 60 * 0.7
    const limiteSegundosP = tempoLimite * 60
    const limiteSegundosB = totalSegundosLimite

    let secaoAtual = "S"
    let secaoExtrapolada = false
    let progressoVaoS = 0, progressoVaoO = 0, progressoVaoA = 0, progressoVaoP = 0, progressoVaoB = 0, progressoExtrapolado = 0

    if (cronometroAtivo) {
        if (segundosDecorridos < limiteSegundosS) { secaoAtual = "S"; progressoVaoS = (segundosDecorridos / limiteSegundosS) * 100 }
        else if (segundosDecorridos < limiteSegundosO) { secaoAtual = "O"; progressoVaoS = 100; progressoVaoO = ((segundosDecorridos - limiteSegundosS) / (limiteSegundosO - limiteSegundosS)) * 100 }
        else if (segundosDecorridos < limiteSegundosA) { secaoAtual = "A"; progressoVaoS = 100; progressoVaoO = 100; progressoVaoA = ((segundosDecorridos - limiteSegundosO) / (limiteSegundosA - limiteSegundosO)) * 100 }
        else if (segundosDecorridos < limiteSegundosP) { secaoAtual = "P"; progressoVaoS = 100; progressoVaoO = 100; progressoVaoA = 100; progressoVaoP = ((segundosDecorridos - limiteSegundosA) / (limiteSegundosP - limiteSegundosA)) * 100 }
        else if (mostrarBurocracia && segundosDecorridos < limiteSegundosB) { secaoAtual = "B"; progressoVaoS = 100; progressoVaoO = 100; progressoVaoA = 100; progressoVaoP = 100; progressoVaoB = ((segundosDecorridos - limiteSegundosP) / (limiteSegundosB - limiteSegundosP)) * 100 }
        else { secaoAtual = "FIM"; secaoExtrapolada = true; progressoVaoS = 100; progressoVaoO = 100; progressoVaoA = 100; progressoVaoP = 100; progressoVaoB = 100; progressoExtrapolado = Math.min((segundosDecorridos - (mostrarBurocracia ? limiteSegundosB : limiteSegundosP)) * 0.35, 55) }
    }

    React.useEffect(() => {
        if (!cronometroAtivo || isPaused || arquivadoManualmente || totalSegundosLimite <= 0) return
        const p = Math.floor((segundosDecorridos / totalSegundosLimite) * 10)
        if (p > ultimoPercentualRef.current && p <= 10 && p > 0) { ultimoPercentualRef.current = p; setShakeTimeCount(c => c + 1) }
        if (secaoAtual !== ultimaSecaoRef.current) { ultimaSecaoRef.current = secaoAtual; setShakeProgressCount(c => c + 1) }
    }, [segundosDecorridos, cronometroAtivo, isPaused, secaoAtual, totalSegundosLimite, arquivadoManualmente])

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

    let chipBg = "rgba(59,130,246,0.12)", chipBorder = "rgba(59,130,246,0.25)", chipTextColor = "#3b82f6"
    if (cronometroAtivo) {
        if (arquivadoManualmente) { chipBg = "rgba(120,113,108,0.1)"; chipBorder = "rgba(120,113,108,0.2)"; chipTextColor = "var(--meta-text)" }
        else if (secaoExtrapolada) { chipBg = "#ef4444"; chipBorder = "#ef4444"; chipTextColor = "#ffffff" }
        else if (secaoAtual === "S") { chipBg = "rgba(59,130,246,0.12)"; chipBorder = "rgba(59,130,246,0.25)"; chipTextColor = "#3b82f6" }
        else if (secaoAtual === "O") { chipBg = "rgba(34,197,94,0.12)"; chipBorder = "rgba(34,197,94,0.25)"; chipTextColor = "#22c55e" }
        else if (secaoAtual === "A") { chipBg = "rgba(234,179,8,0.12)"; chipBorder = "rgba(234,197,94,0.25)"; chipTextColor = "#d9a707" }
        else if (secaoAtual === "P") { chipBg = "rgba(249,115,22,0.12)"; chipBorder = "rgba(249,115,22,0.25)"; chipTextColor = "#f97316" }
        else if (secaoAtual === "B") { chipBg = "rgba(139,92,246,0.12)"; chipBorder = "rgba(139,92,246,0.25)"; chipTextColor = "#8b5cf6" }
    }

    const dispararCronometroAtivo = () => {
        setMostrarSetupRelogio(false); setArquivadoManualmente(false); setSegundosDecorridos(0)
        segundosAcumuladosRef.current = 0; ultimoPercentualRef.current = 0; ultimaSecaoRef.current = "S"
        setShakeTimeCount(0); setShakeProgressCount(0); momentoInicioRef.current = Date.now()
        setCronometroAtivo(true); setIsPaused(false)
    }

    const fecharCronometroCompleto = () => {
        setCronometroAtivo(false); setIsPaused(false); setArquivadoManualmente(false); setSegundosDecorridos(0)
        segundosAcumuladosRef.current = 0; ultimoPercentualRef.current = 0; ultimaSecaoRef.current = "S"
        setShakeTimeCount(0); setShakeProgressCount(0); setMostrarSetupRelogio(false)
    }

    const exibirControlesPainel = hoverTimer || isPaused

    /* ── Character counts ── */
    const totalCaracteres = sections.reduce((sum, s) => sum + (s.enabled ? s.content.length : 0), 0)
    const limiteAtingido = totalCaracteres > 4000

    /* ── Close dropdown on outside click ── */
    React.useEffect(() => {
        if (!openModuleDropdown) return
        const handler = (e: MouseEvent) => {
            const container = dropdownContainerRefs.current[openModuleDropdown]
            if (container && !container.contains(e.target as Node) && !(e.target as HTMLElement)?.closest?.("[data-bloco-dropdown]")) {
                setOpenModuleDropdown(null)
                setDropdownPos(null)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [openModuleDropdown])

    /* ── Render ── */
    return (
        <div className="framer-editor-container" style={{ width: "100%", height: "100%", borderRadius: "10px", boxSizing: "border-box", overflow: "hidden", position: "relative", overflowX: "hidden" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
                :root {
                    --editor-bg: #ffffff; --editor-border: #e2ddd6;
                    --editor-shadow: 0 1px 4px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.03);
                    --editor-text: #000000; --editor-placeholder: #a8a29e;
                    --meta-bg: rgba(245,245,244,0.9); --meta-border: #e7e5e4; --meta-text: #78716c;
                    --limite-bg: rgba(254,226,226,0.9); --limite-border: #fca5a5; --limite-text: #dc2626;
                }
                @media (prefers-color-scheme: dark) {
                    :root {
                        --editor-bg: #1c1917; --editor-border: #2e2a24;
                        --editor-shadow: 0 1px 4px rgba(0,0,0,.2), 0 4px 16px rgba(0,0,0,.3);
                        --editor-text: #f5f5f4; --editor-placeholder: #57534e;
                        --meta-bg: rgba(38,38,38,0.9); --meta-border: #262626; --meta-text: #a3a3a3;
                        --limite-bg: rgba(69,10,10,0.9); --limite-border: #7f1d1d; --limite-text: #fca5a5;
                    }
                }
                .framer-editor-container { background: var(--editor-bg); border: 1px solid var(--editor-border); box-shadow: var(--editor-shadow); }

                .gas-ui-blockout { user-select: none !important; -webkit-user-select: none !important; pointer-events: auto; }
                @keyframes gasPopIn { 0% { transform: scale(0.7) translateY(8px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
                .framer-timer-entrance { animation: gasPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
                @keyframes gasFadeOut { 0% { opacity: 1; transform: scale(1) translateY(0); } 100% { opacity: 0; transform: scale(0.95) translateY(8px); } }
                .framer-timer-exit { animation: gasFadeOut 0.2s cubic-bezier(0.25, 1, 0.5, 1) forwards !important; }
                @keyframes gasAmplifiedShake { 0%, 100% { transform: scale(1) rotate(0deg); } 12%, 36%, 60% { transform: scale(1.16) rotate(-6deg); } 24%, 48%, 72% { transform: scale(1.16) rotate(6deg); } 80% { transform: scale(1.04) rotate(-2deg); } 90% { transform: scale(1.01) rotate(1deg); } }
                .gas-soap-heavy-trigger { animation: gasAmplifiedShake 0.95s cubic-bezier(0.25, 1, 0.5, 1) forwards; transform-origin: center center; }
                @keyframes gasPlayPulse { 0%, 100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 1; transform: scale(1.12); } }
                .gas-play-pulse-btn { animation: gasPlayPulse 1.4s ease-in-out infinite; }
                @keyframes gasSlowCriticalBlink { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 1; transform: scale(1.12); } }
                .gas-critical-svg-pulse { animation: gasSlowCriticalBlink 2.4s ease-in-out infinite; transform-origin: center center; display: inline-block; }
                .gas-soap-track { height: 2px; background: rgba(120,113,108,0.16); border-radius: 1px; align-self: center; position: relative; overflow: hidden; transition: width 0.4s cubic-bezier(0.25,1,0.5,1), opacity 0.4s ease; }
                .gas-hover-btn { display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 4px; cursor: pointer; transition: background 0.2s, transform 0.1s; font-size: 8px; border: none; }
                .gas-hover-btn:active { transform: scale(0.85); }
                .gas-hover-btn:hover { transform: scale(1.12); }
                .gas-scale-hover { transition: transform 0.2s ease-in-out, background 0.2s, opacity 0.2s, box-shadow 0.2s; }
                .gas-scale-hover:hover:not(:disabled) { transform: scale(1.05); }
                .gas-scale-hover:active:not(:disabled) { transform: scale(0.95); }
                input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                input[type="number"] { -moz-appearance: textfield; }
                .gas-btn-pause-bars { font-weight: 700 !important; font-size: 8px !important; letter-spacing: 0.5px !important; transform: scaleY(0.95); }

                .gas-responsive-footer-bar { position: absolute; bottom: 0px; left: 0px; right: 0px; padding: 16px; display: flex; flex-direction: row; align-items: center; justify-content: flex-start; gap: 12px; pointer-events: none; z-index: 10; }
                .gas-order-chars { margin-left: auto; }
                @media (max-width: 520px) {
                    .gas-responsive-footer-bar { display: grid; grid-template-columns: auto 1fr; gap: 10px 0px; padding: 12px; }
                    .gas-order-progress { grid-row: 1; grid-column: span 2; justify-self: start; width: max-content !important; }
                    .gas-order-time { grid-row: 2; grid-column: 1; justify-self: start; width: max-content; }
                    .gas-order-chars { grid-row: 2; grid-column: 2; justify-self: end; margin-left: 0 !important; }
                }

                .bloco-section-editor { font-family: "Google Sans Flex", "Google Sans", sans-serif; font-weight: 400; width: 100%; min-height: 40px; font-size: 15px; line-height: 1.5; color: var(--editor-text); outline: none; white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; padding: 2px 0 16px 0; overflow-x: hidden; }
                .bloco-section-editor:empty:before { content: attr(data-placeholder); color: var(--editor-placeholder); font-style: italic; pointer-events: none; }
                .bloco-section-editor[data-extrapolada]:empty:before { color: rgba(255,255,255,0.6); }
                .bloco-section-editor[data-extrapolada] div { color: #ffffff !important; }
                .bloco-section-editor div { margin-bottom: 4px; color: var(--editor-text) !important; }
                .bloco-section-editor div:empty { height: 1em; }
                .bloco-section-editor blockquote { border-left: 3px solid var(--editor-border); padding-left: 12px; margin: 4px 0; color: var(--meta-text); font-style: italic; }

                .bloco-module-item:hover { background: var(--meta-bg) !important; }
                .bloco-icon-btn { transition: background 0.15s, color 0.15s, opacity 0.15s, transform 0.1s; }
                .bloco-icon-btn:hover { background: var(--meta-bg) !important; color: var(--editor-text) !important; opacity: 1 !important; }
                .bloco-icon-btn:active { transform: scale(0.9); }
                .bloco-section-title { font-family: "Playfair Display", serif; }
            `}</style>

            {/* ── USERNAME MODAL ── */}
            {showUsernameInput && (
                <div className="framer-timer-entrance gas-ui-blockout" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
                    <div style={{ background: "var(--editor-bg)", border: "1px solid var(--editor-border)", borderRadius: "20px", padding: "24px", width: "280px", maxWidth: "90vw", boxShadow: "0 10px 40px rgba(0,0,0,0.2)", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--editor-text)", marginBottom: "16px", fontFamily: '"Google Sans Flex", sans-serif' }}>digite seu usuário</div>
                        <input ref={usernameInputRef} type="text" placeholder="aogakid" value={inputUsername} onChange={e => setInputUsername(e.target.value)} autoFocus onKeyDown={e => { if (e.key === "Enter") { const n = inputUsername.trim(); if (n) { setUsername(n); setShowUsernameInput(false) } } }} style={{ width: "100%", padding: "10px 12px", borderRadius: "12px", border: "1px solid var(--editor-border)", background: "var(--editor-bg)", color: "var(--editor-text)", fontSize: "13px", fontFamily: '"Google Sans Flex", sans-serif', outline: "none", marginBottom: "12px", boxSizing: "border-box" }} />
                        <button className="gas-scale-hover" disabled={!inputUsername.trim()} onClick={() => { const n = inputUsername.trim(); if (n) { setUsername(n); setShowUsernameInput(false) } }} style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "none", background: inputUsername.trim() ? "#3b82f6" : "rgba(120,113,108,0.2)", color: inputUsername.trim() ? "#ffffff" : "var(--meta-text)", fontSize: "13px", fontWeight: 600, cursor: inputUsername.trim() ? "pointer" : "not-allowed", fontFamily: '"Google Sans Flex", sans-serif', boxSizing: "border-box" }}>acessar</button>
                        <div style={{ fontSize: "10px", color: "var(--meta-text)", marginTop: "12px", textAlign: "center", lineHeight: "1.4", fontFamily: '"Google Sans Flex", sans-serif', opacity: 0.8 }}>suas anotações expiram automaticamente após 7 dias de inatividade</div>
        </div>
    </div>
            )}

            {/* ── SAVE CHIP ── */}
            {showSavePopup && saveTime && (
                <div className="framer-timer-entrance gas-ui-blockout" style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(34,197,94,0.12)", backdropFilter: "blur(12px)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: "8px", padding: "6px 12px", zIndex: 5, fontFamily: '"Google Sans Flex", sans-serif', fontSize: "11px", fontWeight: 600, color: "#22c55e", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>✓</span><span>salvo às {saveTime}</span>
                </div>
            )}

            {/* ── TIMER SETUP POPUP ── */}
            {mostrarSetupRelogio && (
                <>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 19, background: "transparent", pointerEvents: "auto" }} onClick={() => { setRelogioExiting(true); setPopupDispensado(true) }} />
                    <div className={`framer-timer-entrance gas-ui-blockout ${relogioExiting ? "framer-timer-exit" : ""}`} onAnimationEnd={() => { if (relogioExiting) { setMostrarSetupRelogio(false); setRelogioExiting(false) } }} style={{ position: "absolute", bottom: "16px", left: "16px", background: bgDinamicoPopup, backdropFilter: "blur(12px)", border: `1px solid ${borderDinamicaPopup}`, borderRadius: "12px", padding: "14px", zIndex: 20, fontFamily: '"Google Sans Flex", sans-serif', display: "flex", flexDirection: "column", alignItems: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.08)", width: "160px" }}>
                        <div style={{ display: "flex", width: "100%", justifyContent: "center", alignItems: "center", marginBottom: "10px" }}>
                            <span style={{ fontSize: "9px", fontWeight: 700, color: corDinamicaPopup, letterSpacing: "0.8px" }}>TEMPO</span>
                        </div>
                        <svg ref={relogioRef} onMouseDown={iniciarArrastoPonteiro} style={{ width: "84px", height: "84px", cursor: "ew-resize", overflow: "visible" }}>
                            <circle cx="42" cy="42" r="38" fill="rgba(255,255,255,0.4)" stroke="rgba(120,113,108,0.2)" strokeWidth="1.5" />
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
                        <button className="gas-scale-hover" onClick={dispararCronometroAtivo} style={{ width: "100%", background: corDinamicaPopup, color: tempoLimite > 30 && tempoLimite <= 45 ? "#000000" : "#ffffff", border: "none", borderRadius: "6px", padding: "6px 0", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", boxShadow: "0 2px 6px rgba(0,0,0,0.06)" }}>
                            <span>▶</span> iniciar
                        </button>
                    </div>
                </>
            )}

            {/* ── TIMER SUGGESTION POPUP ── */}
            {mostrarPopupSugestao && (
                <>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 19, background: "transparent", pointerEvents: "auto" }} onClick={() => { setMostrarPopupSugestao(false); setPopupDispensado(true) }} />
                    <div className="framer-timer-entrance gas-ui-blockout" style={{ position: "absolute", bottom: "16px", left: "16px", background: "rgba(239,68,68,0.12)", backdropFilter: "blur(12px)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "12px", padding: "14px 6px", zIndex: 20, fontFamily: '"Google Sans Flex", sans-serif', display: "flex", flexDirection: "column", boxShadow: "0 10px 30px rgba(0,0,0,0.08)", boxSizing: "border-box" }}>
                        <div style={{ fontSize: "11px", fontWeight: 600, color: "#ef4444", lineHeight: "1.4", marginBottom: "12px", textAlign: "center" }}>Você deseja iniciar o cronômetro para este atendimento?</div>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                            <button className="gas-scale-hover" onClick={() => { setMostrarPopupSugestao(false); timer.ativarCronometro() }} style={{ background: "#ef4444", color: "#ffffff", border: "none", borderRadius: "6px", padding: "6px 16px", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: '"Google Sans Flex", sans-serif' }}>Sim</button>
                            <button className="gas-scale-hover" onClick={() => { setMostrarPopupSugestao(false); setPopupDispensado(true) }} style={{ background: "rgba(120,113,108,0.12)", color: "#ef4444", border: "none", borderRadius: "6px", padding: "6px 16px", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: '"Google Sans Flex", sans-serif' }}>Não</button>
                        </div>
                    </div>
                </>
            )}

            {/* ════════════════════════════════════════════════════════════ */}
            {/* SECTIONS EDITOR                                            */}
            {/* ════════════════════════════════════════════════════════════ */}
            <div style={{ width: "100%", height: "100%", overflowY: "auto", overflowX: "hidden", boxSizing: "border-box", padding: "20px 24px 94px 24px" }} onPaste={handleGlobalPaste}>
                {/* Title bar */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="título"
                        style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontFamily: '"Playfair Display", serif', fontSize: "24px", fontWeight: 900, color: "var(--editor-text)", padding: 0, minWidth: 0 }}
                    />
                    <button className="bloco-icon-btn" onClick={() => navigator.clipboard.writeText(limparTextoInvisivel(mergeSections(title, sections)))} style={{ flexShrink: 0, width: "28px", height: "28px", borderRadius: "6px", border: "1px solid var(--meta-border)", background: "transparent", color: "var(--meta-text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }} title="copiar tudo">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    </button>
                    <button className="bloco-icon-btn" onClick={() => editor.colar()} style={{ flexShrink: 0, width: "28px", height: "28px", borderRadius: "6px", border: "1px solid var(--meta-border)", background: "transparent", color: "var(--meta-text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }} title="colar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
                    </button>
                    <button className="bloco-icon-btn" onClick={() => { externalUpdateRef.current = true; bumpAllVersions(); setTitle(""); setSections(createDefaultSections()); setEdicaoIniciada(false); edicaoIniciadaRef.current = null }} style={{ flexShrink: 0, width: "28px", height: "28px", borderRadius: "6px", border: "1px solid var(--meta-border)", background: "transparent", color: "var(--meta-text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }} title="limpar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                    </button>
                    {modulos.templates.length > 0 && (
                        <div style={{ position: "relative" }}>
                            <button className="bloco-icon-btn" onClick={() => setOpenTemplateDropdown(!openTemplateDropdown)} style={{ flexShrink: 0, height: "28px", borderRadius: "6px", border: `1px solid ${openTemplateDropdown ? "#3b82f6" : "var(--meta-border)"}`, background: openTemplateDropdown ? "rgba(59,130,246,0.06)" : "transparent", color: "var(--meta-text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 10px", fontSize: "11px", fontWeight: 600, fontFamily: '"Google Sans Flex", sans-serif', gap: "4px" }} title="modelos">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                                Modelos
                            </button>
                            {openTemplateDropdown && (
                                <>
                                    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} onClick={() => setOpenTemplateDropdown(false)} />
                                    <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "var(--editor-bg)", border: "1px solid var(--editor-border)", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 100, minWidth: "180px", overflow: "hidden" }}>
                                        {modulos.templates.map(t => (
                                            <button key={t.id} onClick={async () => {
                                                externalUpdateRef.current = true; bumpAllVersions()
                                                let text = t.content || ""
                                                if (!text && t.file) {
                                                    try { const res = await fetch(t.file); text = await res.text() } catch {}
                                                }
                                                const parsed = parseSections(text)
                                                setTitle(parsed.title)
                                                setSections(parsed.sections)
                                                setOpenTemplateDropdown(false)
                                                setEdicaoIniciada(true)
                                                edicaoIniciadaRef.current = Date.now()
                                            }} className="bloco-module-item" data-bg="rgba(59,130,246,0.06)" style={{ display: "block", width: "100%", padding: "8px 12px", border: "none", background: "transparent", color: "var(--editor-text)", fontSize: "12px", fontFamily: '"Google Sans Flex", sans-serif', textAlign: "left", cursor: "pointer" }}>
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {sections.map(s => {
                    const meta = SECTION_META.find(m => m.id === s.id)!
                    const charCount = s.content.length
                    const isOpen = openModuleDropdown === s.id
                    const sectionModulos = modulos.modulos[s.id] || []

                    /* Per-section timer progress (0-100, resets when section done) */
                    let sectionProgress = 0
                    if (cronometroAtivo && !arquivadoManualmente) {
                        if (s.id === "subjetivo" && segundosDecorridos < limiteSegundosS) sectionProgress = (segundosDecorridos / limiteSegundosS) * 100
                        else if (s.id === "objetivo" && segundosDecorridos >= limiteSegundosS && segundosDecorridos < limiteSegundosO) sectionProgress = ((segundosDecorridos - limiteSegundosS) / (limiteSegundosO - limiteSegundosS)) * 100
                        else if (s.id === "avaliacao" && segundosDecorridos >= limiteSegundosO && segundosDecorridos < limiteSegundosA) sectionProgress = ((segundosDecorridos - limiteSegundosO) / (limiteSegundosA - limiteSegundosO)) * 100
                        else if (s.id === "plano" && segundosDecorridos >= limiteSegundosA && segundosDecorridos < limiteSegundosP) sectionProgress = ((segundosDecorridos - limiteSegundosA) / (limiteSegundosP - limiteSegundosA)) * 100
                    }

                    /* ── Current section accent ── */
                    const isCurrentTimerSection = cronometroAtivo && !arquivadoManualmente && (
                        (secaoAtual === "S" && s.id === "subjetivo") ||
                        (secaoAtual === "O" && s.id === "objetivo") ||
                        (secaoAtual === "A" && s.id === "avaliacao") ||
                        (secaoAtual === "P" && s.id === "plano")
                    )

                    return (
                        <div key={s.id} style={{ marginBottom: "8px", borderRadius: "10px", background: isCurrentTimerSection ? `rgba(${hexToRgb(meta.color)},0.15)` : meta.bg, border: `1px solid ${isCurrentTimerSection ? `rgba(${hexToRgb(meta.color)},0.35)` : meta.border}`, transition: "background 0.3s, border-color 0.3s" }}>
                            {/* ── Section Header (sticky) ── */}
                            <div style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--editor-bg)", borderRadius: "10px 10px 0 0" }}>
                                <div onClick={() => toggleCollapse(s.id)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", cursor: "pointer", transition: "all 0.2s ease", userSelect: "none", background: isCurrentTimerSection ? `rgba(${hexToRgb(meta.color)},0.18)` : `rgba(${hexToRgb(meta.color)},0.08)`, borderRadius: "10px 10px 0 0" }}>
                                <span style={{ fontWeight: 800, color: meta.color, fontSize: "13px", fontFamily: '"Google Sans Flex", sans-serif', width: "16px", textAlign: "center" }}>{meta.letter}</span>
                                <span className="bloco-section-title" style={{ fontWeight: 600, fontSize: "16px", color: "var(--editor-text)" }}>{s.title}</span>

                                {/* Right-side controls */}
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
                                    {/* Objetivo toggle inside chip */}
                                    {s.id === "objetivo" && (
                                        <div onClick={e => { e.stopPropagation(); toggleObjetivo() }} style={{ width: "28px", height: "16px", borderRadius: "8px", background: s.enabled ? meta.color : "rgba(120,113,108,0.25)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                                            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#fff", position: "absolute", top: "2px", left: s.enabled ? "14px" : "2px", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
                                        </div>
                                    )}

                                    {/* Module dropdown */}
                                    {s.enabled && sectionModulos.length > 0 && (
                                        <div ref={el => { if (el) dropdownContainerRefs.current[s.id] = el }} style={{ position: "relative" }}>
                                            <button className="bloco-icon-btn" onClick={e => { e.stopPropagation(); if (isOpen) { setOpenModuleDropdown(null); setDropdownPos(null) } else { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setDropdownPos({ x: r.right - 180, y: r.bottom + 4 }); setOpenModuleDropdown(s.id) } }} style={{ width: "20px", height: "20px", borderRadius: "4px", border: `1px solid ${isOpen ? meta.color : "var(--meta-border)"}`, background: isOpen ? meta.bg : "transparent", color: meta.color, fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: '"Google Sans Flex", sans-serif', padding: 0, lineHeight: 1 }}>+</button>
                                        </div>
                                    )}

                                    {/* Copy section button */}
                                    {s.enabled && s.content.trim() && (
                                        <button className="bloco-icon-btn" onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(`## ${s.title}\n${s.content.trim()}`) }} style={{ width: "20px", height: "20px", borderRadius: "4px", border: "none", background: "transparent", color: "var(--meta-text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, opacity: 0.5 }} title="copiar seção">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                                        </button>
                                    )}

                                    <span style={{ fontSize: "10px", color: "var(--meta-text)", fontFamily: '"Google Sans Flex", sans-serif', opacity: 0.7, flexShrink: 0 }}>{charCount} caract.</span>
                                </div>
                            </div>
                            </div>

                            {/* ── Section Body (white card inside color-coded card) ── */}
                            {s.enabled && !s.collapsed && (
                                <div style={{ margin: "0 12px 10px 12px", background: secaoExtrapolada && !arquivadoManualmente && focusedSectionId === s.id ? "#ef4444" : "var(--editor-bg)", borderRadius: "8px", border: `1px solid ${secaoExtrapolada && !arquivadoManualmente && focusedSectionId === s.id ? "#ef4444" : "var(--editor-border)"}`, padding: "4px 14px 0 14px", position: "relative", overflow: "hidden", transition: "background 0.3s, border-color 0.3s" }}>
                                    {cronometroAtivo && !arquivadoManualmente && (
                                        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${sectionProgress}%`, background: meta.color, opacity: 0.08, transition: "width 0.25s linear", pointerEvents: "none", zIndex: 0 }} />
                                    )}
                                    <div
                                        key={`${s.id}-${contentVersionRef.current[s.id] || 0}`}
                                        ref={el => {
                                            if (el && !el.dataset.mounted) {
                                                el.dataset.mounted = "1"
                                                sectionEditorRefs.current[s.id] = el
                                                el.innerHTML = renderSectionHtml(s.content)
                                            } else if (el) {
                                                sectionEditorRefs.current[s.id] = el
                                            }
                                        }}
                                        className="bloco-section-editor"
                                        contentEditable
                                        suppressContentEditableWarning
                                        data-placeholder={`digite em ${s.title.toLowerCase()}...`}
                                        data-section-id={s.id}
                                        data-extrapolada={secaoExtrapolada && !arquivadoManualmente && focusedSectionId === s.id || undefined}
                                        onInput={handleSectionInput}
                                        onBlur={() => handleSectionBlur(s.id)}
                                        onKeyDown={e => handleSectionKeyDown(e, s.id)}
                                        onPaste={handleSectionPaste}
                                        onFocus={() => setFocusedSectionId(s.id)}
                                        style={secaoExtrapolada && !arquivadoManualmente && focusedSectionId === s.id ? { color: "#ffffff" } : {}}
                                    />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* ════════════════════════════════════════════════════════════ */}
            {/* FOOTER BAR                                                */}
            {/* ════════════════════════════════════════════════════════════ */}
            <div className="gas-responsive-footer-bar">
                {/* Time chip */}
                {cronometroAtivo ? (
                    <div key={`time-shake-${shakeTimeCount}`} onMouseEnter={() => setHoverTimer(true)} onMouseLeave={() => setHoverTimer(false)} className={`framer-timer-entrance gas-ui-blockout gas-order-time ${shakeTimeCount > 0 ? "gas-soap-heavy-trigger" : ""}`} style={{ background: chipBg, backdropFilter: "blur(6px)", padding: exibirControlesPainel ? "5px 8px 5px 10px" : "6px 10px", borderRadius: "6px", fontSize: "11px", fontFamily: '"Google Sans Flex", sans-serif', color: chipTextColor, border: `1px solid ${chipBorder}`, transition: "transform 0.25s", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", pointerEvents: "auto", transform: hoverTimer ? "scale(1.1)" : "scale(1)" }}>
                        <span>{textoCronometro}</span>
                        {exibirControlesPainel && (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                {secaoExtrapolada && !arquivadoManualmente ? (
                                    <button className="gas-hover-btn" onClick={e => { e.stopPropagation(); setArquivadoManualmente(true) }} style={{ background: "rgba(255,255,255,0.3)", color: "#ffffff", fontWeight: 700, fontSize: "10px" }}>✓</button>
                                ) : !arquivadoManualmente ? (
                                    <button className={`gas-hover-btn ${isPaused ? "gas-play-pulse-btn" : ""}`} onClick={e => { e.stopPropagation(); setIsPaused(!isPaused) }} style={{ background: "rgba(120,113,108,0.14)", color: chipTextColor }}>
                                        {isPaused ? "▶" : <span className="gas-btn-pause-bars">||</span>}
                                    </button>
                                ) : null}
                                <button className="gas-hover-btn" onClick={e => { e.stopPropagation(); fecharCronometroCompleto() }} style={{ background: secaoExtrapolada && !arquivadoManualmente ? "rgba(255,255,255,0.25)" : "rgba(239,68,68,0.14)", color: secaoExtrapolada && !arquivadoManualmente ? "#ffffff" : "#ef4444" }}>✕</button>
                            </div>
                        )}
                    </div>
                ) : <div style={{ width: "1px", display: "none" }} />}

                {/* SOAP progress chip */}
                {cronometroAtivo && !arquivadoManualmente ? (
                    <div key={`progress-shake-${shakeProgressCount}`} className={`framer-timer-entrance gas-ui-blockout gas-order-progress ${shakeProgressCount > 0 ? "gas-soap-heavy-trigger" : ""}`} style={{ background: secaoExtrapolada ? "rgba(120,113,108,0.08)" : chipBg, backdropFilter: "blur(6px)", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontFamily: '"Google Sans Flex", sans-serif', color: "var(--meta-text)", border: secaoExtrapolada ? "1px solid rgba(120,113,108,0.18)" : `1px solid ${chipBorder}`, display: "flex", alignItems: "center", gap: "5px", pointerEvents: "auto" }}>
                        {/* S */}
                        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                            <span style={{ fontWeight: 700, color: "#3b82f6" }}>S</span>
                            {segundosDecorridos >= limiteSegundosS && <span style={{ color: "#3b82f6", fontWeight: 700, fontSize: "10px" }}>✓</span>}
                        </div>
                        <div className="gas-soap-track" style={{ width: secaoAtual === "S" ? "14px" : "0px", opacity: secaoAtual === "S" ? 1 : 0 }}>
                            <div style={{ width: `${progressoVaoS}%`, background: "#3b82f6", height: "100%" }} />
                        </div>
                        {/* O */}
                        <div style={{ display: "flex", alignItems: "center", gap: "2px", opacity: segundosDecorridos >= limiteSegundosS ? 1 : 0.25 }}>
                            <span style={{ fontWeight: 700, color: "#22c55e" }}>O</span>
                            {segundosDecorridos >= limiteSegundosO && <span style={{ color: "#22c55e", fontWeight: 700, fontSize: "10px" }}>✓</span>}
                        </div>
                        <div className="gas-soap-track" style={{ width: secaoAtual === "O" ? "14px" : "0px", opacity: secaoAtual === "O" ? 1 : 0 }}>
                            <div style={{ width: `${progressoVaoO}%`, background: "#22c55e", height: "100%" }} />
                        </div>
                        {/* A */}
                        <div style={{ display: "flex", alignItems: "center", gap: "2px", opacity: segundosDecorridos >= limiteSegundosO ? 1 : 0.25 }}>
                            <span style={{ fontWeight: 700, color: "#d9a707" }}>A</span>
                            {segundosDecorridos >= limiteSegundosA && <span style={{ color: "#eab308", fontWeight: 700, fontSize: "10px" }}>✓</span>}
                        </div>
                        <div className="gas-soap-track" style={{ width: secaoAtual === "A" ? "14px" : "0px", opacity: secaoAtual === "A" ? 1 : 0 }}>
                            <div style={{ width: `${progressoVaoA}%`, background: "#eab308", height: "100%" }} />
                        </div>
                        {/* P */}
                        <div style={{ display: "flex", alignItems: "center", gap: "2px", opacity: segundosDecorridos >= limiteSegundosA ? 1 : 0.25 }}>
                            <span style={{ fontWeight: 700, color: "#f97316" }}>P</span>
                            {segundosDecorridos >= limiteSegundosP && <span style={{ color: "#f97316", fontWeight: 700, fontSize: "10px" }}>✓</span>}
                        </div>
                        <div className="gas-soap-track" style={{ width: secaoAtual === "P" ? "14px" : "0px", opacity: secaoAtual === "P" ? 1 : 0 }}>
                            <div style={{ width: `${progressoVaoP}%`, background: "#f97316", height: "100%" }} />
                        </div>
                        {/* B */}
                        {mostrarBurocracia && <>
                            <div style={{ display: "flex", alignItems: "center", gap: "2px", opacity: segundosDecorridos >= limiteSegundosP ? 1 : 0.25 }}>
                                <span style={{ fontWeight: 700, color: "#8b5cf6" }}>B</span>
                                {segundosDecorridos >= limiteSegundosB && <span style={{ color: "#8b5cf6", fontWeight: 700, fontSize: "10px" }}>✓</span>}
                            </div>
                            <div className="gas-soap-track" style={{ width: secaoAtual === "B" ? "14px" : "0px", opacity: secaoAtual === "B" ? 1 : 0 }}>
                                <div style={{ width: `${progressoVaoB}%`, background: "#8b5cf6", height: "100%" }} />
                            </div>
                        </>}
                        {/* Overtime */}
                        {secaoExtrapolada && <>
                            <div className="gas-critical-svg-pulse" style={{ width: "12px", height: "12px", marginLeft: "2px", display: "flex", alignItems: "center" }}>
                                <svg viewBox="0 0 24 24" fill="none" style={{ width: "100%", height: "100%" }}>
                                    <path d="M12 3L2 22H22L12 3Z" fill="#ef4444" />
                                    <path d="M12 9V15" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                                    <circle cx="12" cy="18" r="1" fill="#ffffff" />
                                </svg>
                            </div>
                            <div style={{ height: "2px", background: "#ef4444", width: `${progressoExtrapolado}px`, borderRadius: "1px", marginLeft: "1px", transition: isPaused ? "none" : "width 0.3s ease-out" }} />
                        </>}
                    </div>
                ) : <div style={{ width: "1px", display: "none" }} />}

                {/* Timer trigger */}
                {!cronometroAtivo && (
                    <button className="gas-ui-blockout gas-hover-btn" onClick={() => { setPopupDispensado(false); setMostrarSetupRelogio(true); setMostrarPopupSugestao(false) }} style={{ background: "var(--meta-bg)", backdropFilter: "blur(4px)", padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontFamily: '"Google Sans Flex", sans-serif', color: "var(--meta-text)", border: "1px solid var(--meta-border)", pointerEvents: "auto", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0, width: "auto", height: "auto" }}>
                        <span style={{ fontSize: "14px" }}>⏱</span>
                        Cronômetro
                    </button>
                )}

                {/* Character count */}
                <div className="gas-ui-blockout gas-order-chars" style={{ background: limiteAtingido ? "rgba(239,68,68,0.15)" : "var(--meta-bg)", backdropFilter: "blur(4px)", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", fontFamily: '"Google Sans Flex", sans-serif', color: limiteAtingido ? "var(--limite-text)" : "var(--meta-text)", border: limiteAtingido ? "1px solid rgba(239,68,68,0.3)" : "1px solid var(--meta-border)", fontWeight: limiteAtingido ? 600 : 400, pointerEvents: "auto" }}>
                    {totalCaracteres} caracteres
                </div>
            </div>
            {openModuleDropdown && dropdownPos && createPortal(
                <div data-bloco-dropdown onClick={e => e.stopPropagation()} style={{ position: "fixed", top: dropdownPos.y, left: dropdownPos.x, background: "var(--editor-bg)", border: "1px solid var(--editor-border)", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 9999, minWidth: "180px", overflow: "hidden" }}>
                    {(modulos.modulos[openModuleDropdown] || []).map(m => (
                        <button key={m.id} onClick={() => { appendModule(openModuleDropdown, m.text); setOpenModuleDropdown(null); setDropdownPos(null) }} className="bloco-module-item" style={{ display: "block", width: "100%", padding: "8px 12px", border: "none", background: "transparent", color: "var(--editor-text)", fontSize: "12px", fontFamily: '"Google Sans Flex", sans-serif', textAlign: "left", cursor: "pointer" }}>
                            {m.label}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    )
})

export default Bloco
