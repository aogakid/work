import * as React from "react"
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import type { CompanionActions } from "../companions/registry"
import { IMPRESSOS, type Impresso, buscarImpressos, diretorioImpresso } from "../../lib/impressos"
import { renderizarPrimeiraPagina } from "../../lib/pdf-exames"

const PREFIXO = "impressos"
const SITE_ORIGEM = "https://aoga.com.br"

function resolverUrlPdf(caminho: string): string {
    return new URL(caminho, SITE_ORIGEM).href
}

function definirOrigemCrescimento(elemento: HTMLButtonElement) {
    const preview = elemento.querySelector<HTMLElement>(`.${PREFIXO}-pasta-thumb, .${PREFIXO}-thumb`)
    if (!preview) return
    const rect = preview.getBoundingClientRect()
    const centroX = rect.left + rect.width / 2
    const centroY = rect.top + rect.height / 2
    const escalaX = preview.offsetWidth / rect.width
    const escalaY = preview.offsetHeight / rect.height
    preview.style.setProperty("--origem-crescimento-x", `${(2 * centroX - window.innerWidth / 2 - rect.left) * escalaX}px`)
    preview.style.setProperty("--origem-crescimento-y", `${(2 * centroY - window.innerHeight / 2 - rect.top) * escalaY}px`)
}

const ESTILOS = `
.${PREFIXO}-root { color-scheme: light dark; display: flex; flex-direction: column; width: 100%; min-width: 0; box-sizing: border-box; gap: 10px; padding: 12px 0 4px 0; color: var(--editor-text, CanvasText); font: 14px "Google Sans Flex", sans-serif; }

.${PREFIXO}-linha { display: flex; align-items: center; gap: 8px; min-height: 36px; }
.${PREFIXO}-input { flex: 1 1 220px; min-width: 0; height: 36px; box-sizing: border-box; padding: 0 10px; border-radius: 8px; border: 1px solid var(--editor-border, color-mix(in srgb, CanvasText 20%, Canvas)); background: var(--editor-bg, Canvas); color: var(--editor-text, CanvasText); font: 14px "Google Sans Flex", sans-serif; outline: none; }
.${PREFIXO}-input::placeholder { color: var(--meta-text, GrayText); }
.${PREFIXO}-input:focus { border-color: rgba(139,92,246,0.55); box-shadow: 0 0 0 2px rgba(139,92,246,0.12); }

.${PREFIXO}-grade { display: flex; flex-wrap: wrap; align-items: stretch; gap: 12px; padding-top: 2px; }

.${PREFIXO}-navegacao { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; color: var(--meta-text, GrayText); font: 14px "Google Sans Flex", sans-serif; }
.${PREFIXO}-trilha { padding: 3px 2px; border: 0; background: transparent; color: #8b5cf6; font: 600 14px "Google Sans Flex", sans-serif; cursor: pointer; }
.${PREFIXO}-card-pasta { position: relative; }
.${PREFIXO}-pasta-thumb { position: relative; width: max-content; max-width: 100%; }
.${PREFIXO}-pasta-icone { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: rgba(139,92,246,0.58); color: #fff; pointer-events: none; }
.${PREFIXO}-pasta-icone svg { width: 42px; height: 42px; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.35)); }

.${PREFIXO}-card { position: relative; display: flex; flex: 0 0 auto; flex-direction: column; align-items: stretch; gap: 8px; box-sizing: border-box; width: 150px; max-width: 100%; padding: 8px; border-radius: 10px; border: 1px solid var(--editor-border, color-mix(in srgb, CanvasText 20%, Canvas)); background: rgba(255,255,255,0.62); color: var(--editor-text, CanvasText); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); font-family: "Google Sans Flex", sans-serif; font-size: 14px; text-align: left; cursor: pointer; transform: scale(1); transform-origin: center center; transition: transform 0.2s ease, border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease; }
.${PREFIXO}-card:has(.${PREFIXO}-thumb-horizontal) { width: 204px; }
@media (prefers-color-scheme: dark) { .${PREFIXO}-card { background: rgba(25,20,35,0.64); } }
.${PREFIXO}-card:focus { outline: none; border-color: rgba(139,92,246,0.6); box-shadow: 0 0 0 1px rgba(139,92,246,0.6); }
.${PREFIXO}-card:hover { z-index: 2; transform: scale(1.08); background: rgba(255,255,255,0.78); border-color: rgba(139,92,246,0.45); }
@media (prefers-color-scheme: dark) { .${PREFIXO}-card:hover { background: rgba(43,32,58,0.82); } }
.${PREFIXO}-card:not(.${PREFIXO}-card-pasta) .${PREFIXO}-thumb { transform: scale(1); transform-origin: var(--origem-crescimento-x, center) var(--origem-crescimento-y, top); transition: transform 0.25s ease, box-shadow 0.25s ease; }
.${PREFIXO}-card:hover:not(.${PREFIXO}-card-pasta) .${PREFIXO}-thumb { position: relative; z-index: 3; transform: scale(1.64); box-shadow: 0 8px 24px rgba(2,6,23,0.25); transition-delay: 2s; }
.${PREFIXO}-pasta-thumb { transform: scale(1); transform-origin: var(--origem-crescimento-x, center) var(--origem-crescimento-y, top); transition: transform 0.25s ease; }
.${PREFIXO}-card:hover > .${PREFIXO}-pasta-thumb { z-index: 3; transform: scale(1.64); transition-delay: 2s; }

.${PREFIXO}-thumb { position: relative; box-sizing: border-box; width: 132px; aspect-ratio: auto; border-radius: 8px; border: 1px solid var(--editor-border, color-mix(in srgb, CanvasText 20%, Canvas)); background: var(--editor-bg, Canvas); overflow: hidden; display: flex; align-items: center; justify-content: center; }
.${PREFIXO}-thumb-horizontal { width: 186px; }

.${PREFIXO}-thumb-canvas { width: 100%; height: 100%; display: block; object-fit: contain; }
@media (prefers-color-scheme: dark) { .${PREFIXO}-thumb-canvas { filter: invert(1) hue-rotate(180deg); } }

.${PREFIXO}-thumb-fallback { display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--meta-text, GrayText); font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; font-size: 10px; text-align: center; padding: 0 6px; }
.${PREFIXO}-thumb-docx { width: 132px; height: 186px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; color: #8b5cf6; background: linear-gradient(145deg, rgba(139,92,246,0.06), transparent 70%); }

.${PREFIXO}-md-preview { width: 100%; height: 100%; box-sizing: border-box; padding: 8px 8px 10px 8px; display: flex; flex-direction: column; gap: 3px; overflow: hidden; background: radial-gradient(ellipse at top, rgba(139,92,246,0.08), transparent 70%); font-family: "Google Sans Flex", sans-serif; }

.${PREFIXO}-md-linha { font-family: "Google Sans Flex", sans-serif; font-size: 7px; line-height: 1.45; color: var(--editor-text, CanvasText); opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.${PREFIXO}-titulo { display: block; flex: 0 0 auto; width: 100%; min-width: 0; box-sizing: border-box; margin-top: auto; font-size: 14px; line-height: 1.4; color: var(--editor-text, CanvasText); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.${PREFIXO}-erro { font-family: "Google Sans Flex", sans-serif; font-size: 14px; font-weight: 600; color: #ef4444; }

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
    const [aspectRatio, setAspectRatio] = useState("210 / 297")
    const [horizontal, setHorizontal] = useState(false)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        let ativo = true
        const desenhar = () => {
            renderizarPrimeiraPagina(resolverUrlPdf(url), canvas, 186).then(() => {
                if (ativo && canvas.width > 0 && canvas.height > 0) {
                    setAspectRatio(`${canvas.width} / ${canvas.height}`)
                    setHorizontal(canvas.width > canvas.height)
                }
            }).catch(() => {
                if (ativo) setFalhou(true)
            })
        }

        // Render immediately so document thumbnails are already warm when
        // users open a folder or scroll to its cards.
        desenhar()

        return () => {
            ativo = false
        }
    }, [url])

    if (falhou) {
        return (
            <div className={`${PREFIXO}-thumb${horizontal ? ` ${PREFIXO}-thumb-horizontal` : ""}`} style={{ aspectRatio }}>
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
        <div className={`${PREFIXO}-thumb${horizontal ? ` ${PREFIXO}-thumb-horizontal` : ""}`} style={{ aspectRatio }}>
            <canvas ref={canvasRef} className={`${PREFIXO}-thumb-canvas`} />
        </div>
    )
}

function MiniaturaArquivo({ url }: { url: string }) {
    if (/\.docx$/i.test(url)) {
        return (
            <div className={`${PREFIXO}-thumb ${PREFIXO}-thumb-docx`} aria-hidden="true">
                <svg width="42" height="52" viewBox="0 0 42 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 1.5h18l10 10v36A3.5 3.5 0 0 1 31.5 51h-24A3.5 3.5 0 0 1 4 47.5v-42A4 4 0 0 1 7 1.5Z" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="2" />
                    <path d="M25 2v10h10" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    <path d="M12 23h14M12 29h17M12 35h17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".7" />
                    <path d="m14 41 2.3-5.5 2.2 5.5 2.1-5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        )
    }
    return <MiniaturaPdf url={url} />
}

const ImpressosUI = forwardRef<CompanionActions, Props>(function ImpressosUI({ style }, ref) {
    const [filtro, setFiltro] = useState("")
    const [pastaAtual, setPastaAtual] = useState<string[]>([])
    const [erro, setErro] = useState("")
    const inputRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => { inputRef.current?.focus() }, [])

    const filtrados = useMemo(() => buscarImpressos(filtro), [filtro])
    const buscaAtiva = filtro.trim().length > 0
    const pastasVisiveis = useMemo(() => {
        if (buscaAtiva) return []
        const nomes = new Map<string, Impresso>()
        IMPRESSOS.forEach((impresso) => {
            const diretorio = diretorioImpresso(impresso)
            const corresponde = pastaAtual.every((nome, indice) => diretorio[indice] === nome)
            const nome = diretorio[pastaAtual.length]
            if (corresponde && nome && diretorio.length > pastaAtual.length && !nomes.has(nome)) nomes.set(nome, impresso)
        })
        return Array.from(nomes, ([nome, primeiro]) => ({ nome, primeiro })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    }, [buscaAtiva, pastaAtual])
    const arquivosVisiveis = useMemo(() => {
        if (buscaAtiva) return filtrados
        return filtrados.filter((impresso) => {
            const diretorio = diretorioImpresso(impresso)
            return diretorio.length === pastaAtual.length && pastaAtual.every((nome, indice) => diretorio[indice] === nome)
        })
    }, [buscaAtiva, filtrados, pastaAtual])

    const reset = () => {
        setFiltro("")
        setPastaAtual([])
        setErro("")
    }

    const abrirImpresso = (impresso: Impresso) => {
        setErro("")
        window.open(resolverUrlPdf(impresso.arquivo), "_blank", "noopener,noreferrer")
    }

    const aoMudarFiltro = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFiltro(e.target.value)
        setErro("")
    }

    const abrirPasta = (nome: string) => {
        setPastaAtual([...pastaAtual, nome])
    }

    const tituloVisivel = (impresso: Impresso) => {
        if (buscaAtiva || pastaAtual.length === 0) return impresso.titulo
        if (pastaAtual[pastaAtual.length - 1] !== "mapas glicemicos") return impresso.titulo
        return impresso.titulo.replace(/^Mapa glicêmico\s*[\-–—:]\s*/i, "") || impresso.titulo
    }

    const navegarPara = (profundidade: number) => {
        setPastaAtual(pastaAtual.slice(0, profundidade))
    }

    useImperativeHandle(ref, () => ({
        getOutput: () => null,
        reset,
    }), [])

    return (
        <>
        <style dangerouslySetInnerHTML={{ __html: ESTILOS }} />
        <div className={`${PREFIXO}-root`} style={style}>
            <div className={`${PREFIXO}-linha`}>
                <input ref={inputRef} autoFocus className={`${PREFIXO}-input`} value={filtro} onChange={aoMudarFiltro} placeholder="Pesquisar impressos..." aria-label="Pesquisar impressos" />
            </div>

            {!buscaAtiva ? (
                <div className={`${PREFIXO}-navegacao`} aria-label="Pastas de impressos">
                    <button type="button" className={`${PREFIXO}-trilha`} onClick={() => navegarPara(0)}>Ferramentas</button>
                    {pastaAtual.map((pasta, indice) => (
                        <React.Fragment key={`${pasta}-${indice}`}>
                            <span>/</span>
                            <button type="button" className={`${PREFIXO}-trilha`} onClick={() => navegarPara(indice + 1)}>{pasta}</button>
                        </React.Fragment>
                    ))}
                </div>
            ) : null}

            <div className={`${PREFIXO}-grade`}>
                {pastasVisiveis.map((pasta) => (
                    <button key={pasta.nome} type="button" className={`${PREFIXO}-card ${PREFIXO}-card-pasta`} onPointerEnter={(event) => definirOrigemCrescimento(event.currentTarget)} onClick={() => abrirPasta(pasta.nome)} aria-label={`Abrir pasta ${pasta.nome}`}>
                        <div className={`${PREFIXO}-pasta-thumb`}>
                            <MiniaturaArquivo url={pasta.primeiro.arquivo} />
                            <span className={`${PREFIXO}-pasta-icone`} aria-hidden="true">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H10l2 2h7.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" /></svg>
                            </span>
                        </div>
                        <div className={`${PREFIXO}-titulo`}>{pasta.nome}</div>
                    </button>
                ))}
                {arquivosVisiveis.map((impresso) => (
                    <button
                        key={impresso.id}
                        type="button"
                        className={`${PREFIXO}-card`}
                        onPointerEnter={(event) => definirOrigemCrescimento(event.currentTarget)}
                        onClick={() => abrirImpresso(impresso)}
                        title={`Abrir ${impresso.titulo}`}
                        aria-label={`Abrir arquivo: ${impresso.titulo}`}
                    >
                        <MiniaturaArquivo url={impresso.arquivo} />
                        <div className={`${PREFIXO}-titulo`}>{tituloVisivel(impresso)}</div>
                    </button>
                ))}
                {pastasVisiveis.length === 0 && arquivosVisiveis.length === 0 ? (
                    <div style={{ gridColumn: "1 / -1", padding: "12px 0", color: "var(--meta-text, GrayText)", fontSize: "12px" }}>
                        Nenhum impresso encontrado
                    </div>
                ) : null}
            </div>
            {erro ? <div className={`${PREFIXO}-erro`}>{erro}</div> : null}
        </div>
        </>
    )
})

export default ImpressosUI
