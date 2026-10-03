import * as React from "react"
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import type { CompanionActions } from "../companions/registry"
import { lerTextoDoBloco } from "../companions/bloco-texto"
import { executarEncaminhamento } from "../../lib/encaminhar"
import { escreverClipboard } from "../../lib/clipboard"

/* ── Companion "Encaminhar" ────────────────────────────────────────────
   Gera o encaminhamento a partir do texto que já está no bloco (título +
   seções), sem campo de texto: o prontuário é o próprio prontuário. Mesmo
   prompt, modelo e streaming do encaminhador antigo — só muda a origem do
   texto. Não tem outputGroup, então o bloco não oferece "↑ encaminhamento":
   o resultado é copiado, nunca escrito de volta na nota. */

const PREFIXO = "encaminhar-bloco"

const ESTILOS = `
.${PREFIXO}-root { --${PREFIXO}-accent: #8b5cf6; --${PREFIXO}-accent-forte: #7c3aed; --${PREFIXO}-accent-suave: rgba(139,92,246,0.12); --${PREFIXO}-borda: rgba(139,92,246,0.4); display: flex; flex-direction: column; gap: 10px; padding: 12px 0 4px 0; }

.${PREFIXO}-linha { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

.${PREFIXO}-rotulo { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--meta-text); white-space: nowrap; }

.${PREFIXO}-input { flex: 1 1 220px; min-width: 0; height: 38px; box-sizing: border-box; padding: 0 10px; border-radius: 8px; border: 1px solid var(--editor-border); background: var(--editor-bg); color: var(--editor-text); font-family: "Google Sans Flex", sans-serif; font-size: 14px; outline: none; transition: border-color 0.15s ease; }
.${PREFIXO}-input::placeholder { color: var(--meta-text); }
.${PREFIXO}-input:focus { border-color: var(--${PREFIXO}-borda); box-shadow: 0 0 0 1px var(--${PREFIXO}-borda); }
.${PREFIXO}-input:disabled { opacity: 0.6; }

/* Os três botões (encaminhar, copiar, limpar) são irmãos: mesma caixa roxa. */
.${PREFIXO}-botao { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 38px; min-width: 38px; box-sizing: border-box; padding: 0 12px; border-radius: 8px; border: 1px solid var(--${PREFIXO}-borda); background: var(--${PREFIXO}-accent-suave); color: var(--${PREFIXO}-accent); font-family: "Google Sans Flex", sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease; }
.${PREFIXO}-botao:disabled { opacity: 0.4; cursor: not-allowed; }
.${PREFIXO}-botao:hover:enabled { background: rgba(139,92,246,0.2); }

.${PREFIXO}-botao-primario { background: var(--${PREFIXO}-accent); border-color: var(--${PREFIXO}-accent); color: #ffffff; }
.${PREFIXO}-botao-primario:hover:enabled { background: var(--${PREFIXO}-accent-forte); border-color: var(--${PREFIXO}-accent-forte); }

.${PREFIXO}-botao-ok { background: rgba(34,197,94,0.14); border-color: #22c55e; color: #22c55e; }
.${PREFIXO}-botao-ok:hover:enabled { background: rgba(34,197,94,0.2); }

.${PREFIXO}-girar { animation: ${PREFIXO}-giro 0.8s linear infinite; transform-origin: 50% 50%; }
@keyframes ${PREFIXO}-giro { to { transform: rotate(360deg); } }

.${PREFIXO}-saida { width: 100%; min-height: 150px; box-sizing: border-box; padding: 14px; border-radius: 10px; border: 1px solid var(--${PREFIXO}-borda); background: var(--editor-bg); color: var(--editor-text); font-family: "Google Sans", sans-serif; font-size: 14px; line-height: 1.85; white-space: pre-wrap; overflow-y: auto; }

.${PREFIXO}-erro { font-size: 12px; font-weight: 600; color: #ef4444; }
`

interface Props {
    style?: React.CSSProperties
}

const EncaminharBlocoUI = forwardRef<CompanionActions, Props>(function EncaminharBlocoUI({ style }, ref) {
    const [especialidade, setEspecialidade] = useState("")
    const [saida, setSaida] = useState("")
    const [rodando, setRodando] = useState(false)
    const [copiado, setCopiado] = useState(false)
    const [erro, setErro] = useState("")

    const controladorRef = useRef<AbortController | null>(null)
    const vivoRef = useRef(true)
    const copiadoTimerRef = useRef<number | null>(null)

    useEffect(() => {
        vivoRef.current = true
        return () => {
            vivoRef.current = false
            if (copiadoTimerRef.current) window.clearTimeout(copiadoTimerRef.current)
            if (controladorRef.current) controladorRef.current.abort()
        }
    }, [])

    const aoReceberParte = (acumulado: string) => {
        if (vivoRef.current) setSaida(acumulado)
    }

    const gerar = async () => {
        if (rodando) return
        const destino = especialidade.trim()
        const texto = lerTextoDoBloco().trim()
        if (!destino) {
            setErro("escreva para qual especialidade é o encaminhamento")
            return
        }
        if (!texto) {
            setErro("o bloco está vazio — escreva o prontuário antes de encaminhar")
            return
        }
        setErro("")
        setSaida("")
        setCopiado(false)
        const controlador = new AbortController()
        controladorRef.current = controlador
        setRodando(true)
        try {
            await executarEncaminhamento({ especialidade: destino, texto, aoReceber: aoReceberParte, signal: controlador.signal })
        } catch {
            if (controlador.signal.aborted) return
            if (vivoRef.current) setErro("não foi possível gerar o encaminhamento agora")
        } finally {
            if (controladorRef.current === controlador) controladorRef.current = null
            if (vivoRef.current) setRodando(false)
        }
    }

    const limpar = () => {
        if (controladorRef.current) {
            controladorRef.current.abort()
            controladorRef.current = null
        }
        setEspecialidade("")
        setSaida("")
        setErro("")
        setCopiado(false)
        setRodando(false)
    }

    const copiar = async () => {
        const ok = await escreverClipboard(saida)
        if (!vivoRef.current) return
        if (!ok) {
            setErro("não foi possível copiar — copie o texto da caixa")
            return
        }
        setErro("")
        setCopiado(true)
        if (copiadoTimerRef.current) window.clearTimeout(copiadoTimerRef.current)
        copiadoTimerRef.current = window.setTimeout(() => { setCopiado(false) }, 2000)
    }

    /* Só refs e setters aqui, para o handle não ser recriado a cada render. */
    useImperativeHandle(ref, () => ({
        /* Sem outputGroup: o encaminhamento não volta para o bloco. */
        getOutput: () => null,
        reset: () => {
            if (controladorRef.current) {
                controladorRef.current.abort()
                controladorRef.current = null
            }
            setRodando(false)
            setEspecialidade("")
            setSaida("")
            setErro("")
            setCopiado(false)
        },
    }), [])

    const aoMudarEspecialidade = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEspecialidade(e.target.value)
        setErro("")
    }

    const podeLimpar = especialidade.length > 0 || saida.length > 0 || rodando
    const executar = () => { void gerar() }
    const copiarSaida = () => { void copiar() }
    const limparTudo = () => { limpar() }
    const aoTeclarEncaminhar = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") executar()
    }

    /* O campo de saída só existe depois que o encaminhamento terminou — durante
       o streaming fica só o botão "gerando…". */
    const temSaida = !rodando && saida.length > 0

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: ESTILOS }} />
            <div className={`${PREFIXO}-root`} style={style}>
                <div className={`${PREFIXO}-linha`}>
                    <span className={`${PREFIXO}-rotulo`}>Para:</span>
                    <input
                        className={`${PREFIXO}-input`}
                        data-encaminhar-especialidade="especialidade"
                        value={especialidade}
                        onChange={aoMudarEspecialidade}
                        onKeyDown={aoTeclarEncaminhar}
                        placeholder="ex.: cardiologia"
                        disabled={rodando}
                    />
                    <button
                        type="button"
                        className={`${PREFIXO}-botao ${PREFIXO}-botao-primario`}
                        data-encaminhar-executar="executar"
                        onClick={executar}
                        disabled={rodando}
                        title="encaminhar"
                        aria-label="encaminhar"
                    >
                        {rodando
                            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle className={`${PREFIXO}-girar`} cx="12" cy="12" r="9" strokeDasharray="42 14" /></svg>
                            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7z" /></svg>}
                    </button>
                    <button
                        type="button"
                        className={`${PREFIXO}-botao ${copiado ? `${PREFIXO}-botao-ok` : ""}`}
                        onClick={copiarSaida}
                        disabled={!temSaida}
                        title={copiado ? "copiado" : "copiar encaminhamento"}
                        aria-label="copiar encaminhamento"
                    >
                        {copiado
                            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>}
                    </button>
                    <button
                        type="button"
                        className={`${PREFIXO}-botao`}
                        onClick={limparTudo}
                        disabled={!podeLimpar}
                        title="limpar"
                        aria-label="limpar encaminhamento"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m19 6-1 14H6L5 6" /><path d="M10 11v5M14 11v5" /></svg>
                    </button>
                </div>
                {temSaida ? <div className={`${PREFIXO}-saida`}>{saida}</div> : null}
                {erro ? <div className={`${PREFIXO}-erro`}>{erro}</div> : null}
            </div>
        </>
    )
})

export default EncaminharBlocoUI
