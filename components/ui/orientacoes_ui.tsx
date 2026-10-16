import * as React from "react"
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import type { CompanionActions } from "../companions/registry"
import { escreverClipboard } from "../../lib/clipboard"
import { type Orientacao, buscarOrientacoes } from "../../lib/orientacoes"
import { renderizarPrimeiraPagina } from "../../lib/pdf-exames"

const PREFIXO = "orientacoes"
const SITE_ORIGEM = "https://aoga.com.br"

function resolverUrlPdf(caminho: string): string {
    const origem = typeof window !== "undefined" && /^https?:$/.test(window.location.protocol)
        ? window.location.origin
        : SITE_ORIGEM
    return new URL(caminho, origem).href
}

function resolverUrlPublica(caminho: string): string {
    return new URL(caminho, SITE_ORIGEM).href
}

const ESTILOS = `
.${PREFIXO}-root { color-scheme: light dark; display: flex; flex-direction: column; gap: 10px; padding: 12px 0 4px 0; color: var(--editor-text, CanvasText); font-family: "Google Sans Flex", sans-serif; }

.${PREFIXO}-linha { display: flex; align-items: center; gap: 8px; min-height: 36px; }
.${PREFIXO}-input { flex: 1 1 220px; min-width: 0; height: 36px; box-sizing: border-box; padding: 0 10px; border-radius: 8px; border: 1px solid var(--editor-border, color-mix(in srgb, CanvasText 20%, Canvas)); background: var(--editor-bg, Canvas); color: var(--editor-text, CanvasText); font: 14px "Google Sans Flex", sans-serif; outline: none; }
.${PREFIXO}-input::placeholder { color: var(--meta-text, GrayText); }
.${PREFIXO}-input:focus { border-color: rgba(139,92,246,0.55); box-shadow: 0 0 0 2px rgba(139,92,246,0.12); }

.${PREFIXO}-grade { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 12px; padding-top: 2px; }

.${PREFIXO}-card { display: flex; flex-direction: column; align-items: stretch; gap: 8px; padding: 8px; border-radius: 10px; border: 1px solid var(--editor-border, color-mix(in srgb, CanvasText 20%, Canvas)); background: var(--editor-bg, Canvas); color: var(--editor-text, CanvasText); font-family: "Google Sans Flex", sans-serif; font-size: 12px; text-align: left; cursor: pointer; transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease; }
.${PREFIXO}-card:focus { outline: none; border-color: rgba(139,92,246,0.6); box-shadow: 0 0 0 1px rgba(139,92,246,0.6); }
.${PREFIXO}-card:hover { background: rgba(139,92,246,0.06); border-color: rgba(139,92,246,0.45); }

.${PREFIXO}-thumb { position: relative; width: 100%; aspect-ratio: 3 / 4; border-radius: 8px; border: 1px solid var(--editor-border, color-mix(in srgb, CanvasText 20%, Canvas)); background: var(--editor-bg, Canvas); overflow: hidden; display: flex; align-items: center; justify-content: center; }

.${PREFIXO}-thumb-canvas { width: 100%; height: 100%; display: block; object-fit: contain; }
@media (prefers-color-scheme: dark) { .${PREFIXO}-thumb-canvas { filter: invert(1) hue-rotate(180deg); } }

.${PREFIXO}-thumb-fallback { display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--meta-text, GrayText); font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; font-size: 10px; text-align: center; padding: 0 6px; }

.${PREFIXO}-md-preview { width: 100%; height: 100%; box-sizing: border-box; padding: 8px 8px 10px 8px; display: flex; flex-direction: column; gap: 3px; overflow: hidden; background: radial-gradient(ellipse at top, rgba(139,92,246,0.08), transparent 70%); font-family: "Google Sans Flex", sans-serif; }

.${PREFIXO}-md-linha { font-family: "Google Sans Flex", sans-serif; font-size: 7px; line-height: 1.45; color: var(--editor-text, CanvasText); opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.${PREFIXO}-titulo { margin-top: auto; font-size: 11px; line-height: 1.4; color: var(--editor-text, CanvasText); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.${PREFIXO}-erro { font-family: "Google Sans Flex", sans-serif; font-size: 12px; font-weight: 600; color: #ef4444; }

.${PREFIXO}-overlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; background: rgba(2,6,23,0.55); backdrop-filter: blur(2px); padding: 20px; }

.${PREFIXO}-modal { width: min(640px, 100%); max-height: min(84vh, 720px); display: flex; flex-direction: column; border-radius: 14px; border: 1px solid rgba(139,92,246,0.28); background: var(--editor-bg, Canvas); color: var(--editor-text, CanvasText); box-shadow: 0 24px 64px rgba(2,6,23,0.3); overflow: hidden; font-family: "Google Sans Flex", sans-serif; }

.${PREFIXO}-modal-cabecalho { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid rgba(139,92,246,0.18); }
.${PREFIXO}-modal-titulo { font-weight: 650; font-size: 15px; font-family: "Google Sans Flex", sans-serif; }
.${PREFIXO}-modal-copiar { margin-left: auto; width: 34px; height: 34px; border-radius: 9px; border: 1px solid rgba(139,92,246,0.24); background: rgba(139,92,246,0.1); color: #8b5cf6; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.${PREFIXO}-modal-copiar:hover { background: rgba(139,92,246,0.18); }

.${PREFIXO}-modal-corpo { flex: 1 1 auto; overflow: auto; padding: 16px; }
.${PREFIXO}-modal-texto { margin: 0; color: var(--editor-text, CanvasText); font: 14px/1.65 "Google Sans Flex", sans-serif; white-space: pre-wrap; overflow-wrap: anywhere; }
`

interface Props {
    style?: React.CSSProperties
}

function MiniaturaPdf({ url }: { url: string }) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const [falhou, setFalhou] = useState(false)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        let ativo = true
        let observador: IntersectionObserver | null = null

        const desenhar = () => {
            renderizarPrimeiraPagina(resolverUrlPdf(url), canvas, 132).catch(() => {
                if (ativo) setFalhou(true)
            })
        }

        if (typeof IntersectionObserver === "undefined") {
            desenhar()
        } else {
            observador = new IntersectionObserver((entradas) => {
                if (entradas.some((e) => e.isIntersecting)) {
                    if (observador) observador.disconnect()
                    desenhar()
                }
            }, { rootMargin: "140px" })
            observador.observe(canvas)
        }

        return () => {
            ativo = false
            if (observador) observador.disconnect()
        }
    }, [url])

    if (falhou) {
        return (
            <div className={`${PREFIXO}-thumb`}>
                <div className={`${PREFIXO}-thumb-fallback`}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <path d="M9 13v5" />
                        <path d="M12 18h3" />
                    </svg>
                </div>
            </div>
        )
    }

    return (
        <div className={`${PREFIXO}-thumb`}>
            <canvas ref={canvasRef} className={`${PREFIXO}-thumb-canvas`} />
        </div>
    )
}

function MiniaturaMd({ texto }: { texto: string }) {
    const linhas = useMemo(() => {
        const partes = (texto || "").split("\n")
        const limpas: string[] = []
        for (const p of partes) {
            const t = p.trim()
            if (t) limpas.push(t)
        }
        return limpas.slice(0, 7)
    }, [texto])

    return (
        <div className={`${PREFIXO}-thumb`}>
            <div className={`${PREFIXO}-md-preview`}>
                {linhas.map((linha, i) => (
                    <div key={i} className={`${PREFIXO}-md-linha`}>
                        {linha}
                    </div>
                ))}
            </div>
        </div>
    )
}

function nomeSemExt(titulo: string): string {
    if (titulo.endsWith(".pdf")) return titulo.slice(0, -4)
    if (titulo.endsWith(".md")) return titulo.slice(0, -3)
    return titulo
}

const OrientacoesUI = forwardRef<CompanionActions, Props>(function OrientacoesUI({ style }, ref) {
    const [filtro, setFiltro] = useState("")
    const [aberta, setAberta] = useState<Orientacao | null>(null)
    const [copiado, setCopiado] = useState(false)
    const [erro, setErro] = useState("")

    const copiadoTimerRef = useRef<number | null>(null)
    const inputRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => { inputRef.current?.focus() }, [])

    const filtrados = useMemo(() => buscarOrientacoes(filtro), [filtro])

    const fecharModal = () => {
        setAberta(null)
        setCopiado(false)
    }

    const aoMudarFiltro = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFiltro(e.target.value)
        setErro("")
    }

    const abrirPdf = (o: Orientacao) => {
        if (!o.arquivo) return
        setErro("")
        window.open(resolverUrlPublica(o.arquivo), "_blank", "noopener,noreferrer")
    }

    const abrir = (o: Orientacao) => {
        if (o.tipo === "md") {
            setAberta(o)
            setCopiado(false)
            setErro("")
            return
        }
        abrirPdf(o)
    }

    const aoClicarCard = (o: Orientacao) => {
        abrir(o)
    }

    const aoTeclarCard = (o: Orientacao) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            abrir(o)
        }
    }

    const copiarMd = async (texto?: string) => {
        const ok = await escreverClipboard(texto || "")
        if (!ok) {
            setErro("não foi possível copiar — tente novamente")
            return
        }
        setErro("")
        setCopiado(true)
        if (copiadoTimerRef.current) window.clearTimeout(copiadoTimerRef.current)
        copiadoTimerRef.current = window.setTimeout(() => {
            setCopiado(false)
        }, 2000)
    }

    useEffect(() => {
        const tecla = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                fecharModal()
            }
        }
        if (aberta) {
            document.addEventListener("keydown", tecla)
        }
        return () => {
            document.removeEventListener("keydown", tecla)
        }
    }, [aberta])

    useEffect(() => {
        return () => {
            if (copiadoTimerRef.current) window.clearTimeout(copiadoTimerRef.current)
        }
    }, [])

    useImperativeHandle(ref, () => ({
        getOutput: () => null,
        reset: () => {
            setFiltro("")
            setAberta(null)
            setCopiado(false)
            setErro("")
        },
    }), [])

    const temErro = erro.length > 0
    const textoModal = aberta && aberta.texto ? aberta.texto : ""

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: ESTILOS }} />
            <div className={`${PREFIXO}-root`} style={style}>
                <div className={`${PREFIXO}-linha`}>
                    <input ref={inputRef} autoFocus className={`${PREFIXO}-input`} value={filtro} onChange={aoMudarFiltro} placeholder="Pesquisar orientações..." aria-label="Pesquisar orientações" />
                </div>

                <div className={`${PREFIXO}-grade`}>
                    {filtrados.map((o) => (
                        <button
                            key={o.id}
                            type="button"
                            className={`${PREFIXO}-card`}
                            onClick={() => aoClicarCard(o)}
                            onKeyDown={aoTeclarCard(o)}
                            title={o.titulo}
                            aria-label={`${o.tipo === "pdf" ? "Abrir PDF" : "Ver texto"}: ${o.titulo}`}
                        >
                            {o.tipo === "pdf" && o.arquivo ? <MiniaturaPdf url={o.arquivo} /> : null}
                            {o.tipo === "md" && o.texto ? <MiniaturaMd texto={o.texto} /> : null}
                            {o.tipo === "md" && !o.texto && (
                                <div className={`${PREFIXO}-thumb`}>
                                    <div className={`${PREFIXO}-thumb-fallback`}>
                                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                            <div className={`${PREFIXO}-titulo`}>{nomeSemExt(o.titulo)}</div>
                        </button>
                    ))}
                    {filtrados.length === 0 ? (
                        <div style={{ gridColumn: "1 / -1", padding: "12px 0", color: "var(--meta-text, GrayText)", fontSize: "12px" }}>
                            Nenhuma orientação encontrada
                        </div>
                    ) : null}
                </div>

                {temErro ? <div className={`${PREFIXO}-erro`}>{erro}</div> : null}
            </div>

            {aberta ? (
                <div className={`${PREFIXO}-overlay`} onClick={fecharModal} role="dialog" aria-modal="true" aria-labelledby="orientacoes-modal-titulo">
                    <div className={`${PREFIXO}-modal`} onClick={(e) => e.stopPropagation()}>
                        <div className={`${PREFIXO}-modal-cabecalho`}>
                            <div id="orientacoes-modal-titulo" className={`${PREFIXO}-modal-titulo`}>
                                {nomeSemExt(aberta.titulo)}
                            </div>
                            <button
                                type="button"
                                className={`${PREFIXO}-modal-copiar`}
                                onClick={() => copiarMd(aberta.texto)}
                                aria-label={copiado ? "Texto copiado" : "Copiar texto"}
                                title={copiado ? "Copiado" : "Copiar texto"}
                            >
                                {copiado ? (
                                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                ) : (
                                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                                )}
                            </button>
                        </div>
                        <div className={`${PREFIXO}-modal-corpo`}>
                            <div className={`${PREFIXO}-modal-texto`} aria-label="Texto da orientação">{textoModal}</div>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    )
})

export default OrientacoesUI
