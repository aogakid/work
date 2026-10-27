import * as React from "react"
import { forwardRef, useImperativeHandle } from "react"
import { useGoogleSheets } from "../contexts/AppContext"
import calendarSupabase from "../../lib/calendar-supabase"

const GAS_WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbx5e1DSXQ2tZqEtMHbCU9a9dvP8Ial8q7LsZ1A7LYHSLsnPvABURMhPmDP-yWBLStmcng/exec"

const CALENDAR_ID_ENCAIXES = "36e63601-a34d-4efb-8ad5-b1c94f616693"
const NOME_CALENDARIO_ENCAIXES = "Encaixes e retornos"

interface DataAtual {
    dia: number
    mes: number
    ano: number | null
}

const dataHoje = (): DataAtual => {
    const a = new Date()
    const parts = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "numeric",
        day: "numeric",
    }).formatToParts(a)
    const dia = Number(parts.find(p => p.type === "day")?.value || a.getDate())
    const mes = Number(parts.find(p => p.type === "month")?.value || a.getMonth() + 1)
    const ano = Number(parts.find(p => p.type === "year")?.value || a.getFullYear())
    return { dia, mes, ano }
}

const comDoisDigitos = (n: number): string => String(n).padStart(2, "0")

const formatarHoje = (): string => {
    const h = dataHoje()
    return comDoisDigitos(h.dia) + "/" + comDoisDigitos(h.mes) + "/" + h.ano
}

const dataHojeIso = (): string => {
    const h = dataHoje()
    const ano = h.ano !== null ? h.ano : new Date().getFullYear()
    return ano + "-" + comDoisDigitos(h.mes) + "-" + comDoisDigitos(h.dia)
}

interface AgendinhaAppointment {
    patient_name: string
    start_time: string | null
    custom_values: Record<string, string | number | boolean | null> | null
}

const extrairObjetivo = (
    custom: Record<string, string | number | boolean | null> | null
): string => {
    if (!custom) return ""
    const direto = custom.objetivo_da_consulta
    if (typeof direto === "string" && direto.trim()) {
        return direto.trim()
    }
    const valores = Object.values(custom)
    for (let i = 0; i < valores.length; i++) {
        const v = valores[i]
        if (typeof v === "string" && v.trim()) {
            return v.trim()
        }
    }
    return ""
}

const formatarLinhaAgendinha = (
    nome: string,
    objetivo: string,
    hora: string | null
): string => {
    const sufixoObjetivo = objetivo ? " (" + objetivo + ")" : ""
    if (hora) {
        const partes = hora.split(":")
        if (partes.length >= 2) {
            return partes[0] + ":" + partes[1] + " - " + nome + sufixoObjetivo
        }
    }
    return nome + sufixoObjetivo
}

const montarTextoAgendinha = (appointments: AgendinhaAppointment[]): string => {
    const itens: string[] = []
    for (let i = 0; i < appointments.length; i++) {
        const appt = appointments[i]
        const nome = (appt.patient_name || "").trim()
        if (!nome) continue
        const objetivo = extrairObjetivo(appt.custom_values)
        itens.push(formatarLinhaAgendinha(nome, objetivo, appt.start_time))
    }
    if (itens.length === 0) {
        return "(sem agendinha marcada para hoje)"
    }
    return itens.join("\n")
}

const obterIdCalendarioEncaixes = async (): Promise<string> => {
    try {
        const { data } = await calendarSupabase
            .from("calendars")
            .select("id")
            .eq("name", NOME_CALENDARIO_ENCAIXES)
            .limit(1)
        if (data && data[0]?.id) {
            return String(data[0].id)
        }
    } catch {
        // Fallback para ID conhecido caso a busca falhe
    }
    return CALENDAR_ID_ENCAIXES
}

const buscarAgendinhaHoje = async (): Promise<string> => {
    const calendarId = await obterIdCalendarioEncaixes()
    const { data, error } = await calendarSupabase
        .from("appointments")
        .select("patient_name, custom_values, start_time")
        .eq("calendar_id", calendarId)
        .eq("appointment_date", dataHojeIso())
        .eq("status", "scheduled")
        .order("start_time", { ascending: true })
        .order("created_at", { ascending: true })

    if (error) throw error
    const appointments = (data || []) as unknown as AgendinhaAppointment[]
    return montarTextoAgendinha(appointments)
}

const removerAcentos = (texto: string): string =>
    texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

const ehPreAgendada = (tipo: string): boolean =>
    /pre[\s-]?agendada/i.test(removerAcentos(tipo))

interface ProcessamentoAgenda {
    manter: string[]
    acolhimento: string[]
}

const processarAgenda = (texto: string): ProcessamentoAgenda => {
    const linhas = texto.split(/\r?\n/)
    const manter: string[] = []
    const acolhimento: string[] = []
    for (const linha of linhas.slice(1)) {
        if (!linha.trim()) continue
        const partes = linha.split(/\t| {2,}/).map(p => p.trim())
        if (partes.length < 2 || !partes[1]) continue
        const tipo = partes[2] || ""
        if (tipo && !ehPreAgendada(tipo)) acolhimento.push(partes[1])
        else manter.push(linha)
    }
    return { manter, acolhimento }
}

function IconeLixeira() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
    )
}

export interface GoogleSheetsInputActions {
    enviarParaPlanilha(): void
}

const GoogleSheetsInput = forwardRef<GoogleSheetsInputActions>(function GoogleSheetsInput(_props, ref) {
    const sheets = useGoogleSheets()
    const [input, setInput] = React.useState("")
    const [itens, setItens] = React.useState<string[]>([""])
    const [indiceArrastado, setIndiceArrastado] = React.useState<number | null>(null)
    const [indiceAlvoArraste, setIndiceAlvoArraste] = React.useState<number | null>(null)
    const [enviando, setEnviando] = React.useState(false)
    const podeAdicionar = itens.length < 10
    const inputRef = React.useRef<HTMLInputElement | null>(null)
    const [escalaHoje, setEscalaHoje] = React.useState("")
    const escalaRef = React.useRef<HTMLTextAreaElement | null>(null)

    const registrarEscala = (elemento: HTMLTextAreaElement | null) => {
        escalaRef.current = elemento
    }

    const registrarInput = (elemento: HTMLInputElement | null) => {
        inputRef.current = elemento
    }

    const atualizarItem = (indice: number, valor: string) => {
        setItens(
            itens.map((itemAtual, j) => (j === indice ? valor : itemAtual))
        )
    }

    const adicionarItem = () => {
        if (!podeAdicionar) return
        setItens([...itens, ""])
        setTimeout(() => inputRef.current?.focus(), 0)
    }

    const removerItem = (indice: number) => {
        setItens((atual) => {
            const restantes = atual.filter((_, j) => j !== indice)
            return restantes.length > 0 ? restantes : [""]
        })
    }

    const moverItem = (indice: number, direcao: -1 | 1) => {
        setItens((atual) => {
            const destino = indice + direcao
            if (destino < 0 || destino >= atual.length) return atual
            const proximos = [...atual]
            const [item] = proximos.splice(indice, 1)
            proximos.splice(destino, 0, item)
            return proximos
        })
    }

    const soltarItem = (e: React.DragEvent<HTMLDivElement>, destino: number) => {
        e.preventDefault()
        const origem = Number(e.dataTransfer.getData("text/plain"))
        if (Number.isInteger(origem) && origem >= 0 && origem < itens.length && origem !== destino) {
            setItens((atual) => {
                const proximos = [...atual]
                const [item] = proximos.splice(origem, 1)
                proximos.splice(destino, 0, item)
                return proximos
            })
        }
        setIndiceArrastado(null)
        setIndiceAlvoArraste(null)
    }

    const prosseguirNoEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== "Enter") return
        e.preventDefault()
        adicionarItem()
    }

    React.useEffect(() => {
        let cancelado = false
        const carregar = async () => {
            try {
                const texto = await buscarAgendinhaHoje()
                if (!cancelado) setEscalaHoje(texto)
            } catch {
                if (!cancelado) {
                    setEscalaHoje(
                        formatarHoje() +
                            "\n(não foi possível ler a agendinha)"
                    )
                }
            }
        }
        void carregar()
        return () => {
            cancelado = true
        }
    }, [])

    React.useEffect(() => {
        const el = escalaRef.current
        if (!el) return
        el.style.height = "auto"
        el.style.height = `${el.scrollHeight}px`
    }, [escalaHoje])


    React.useEffect(() => {
        sheets.textoInput = input
    }, [input, sheets])

    React.useEffect(() => {
        const escutarColagem = (e: CustomEvent<string>) => {
            setInput(e.detail)
        }

        window.addEventListener(
            "gas-force-input-update",
            escutarColagem as EventListener
        )
        return () =>
            window.removeEventListener(
                "gas-force-input-update",
                escutarColagem as EventListener
            )
    }, [])

    React.useEffect(() => {
        const escutarStatus = (e: CustomEvent<boolean>) => {
            setEnviando(Boolean(e.detail))
        }

        window.addEventListener(
            "gas-sending-status",
            escutarStatus as EventListener
        )
        return () =>
            window.removeEventListener(
                "gas-sending-status",
                escutarStatus as EventListener
            )
    }, [])

    const enviarParaPlanilha = React.useCallback(async () => {
        if (!input.trim()) return

        window.dispatchEvent(
            new CustomEvent("gas-sending-status", { detail: true })
        )

        const colunaF = itens
            .map((item) => item.trim())
            .filter((item) => item !== "" && item !== "-")

        try {
            const resposta = await fetch(GAS_WEB_APP_URL, {
                method: "POST",
                mode: "cors",
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify({ texto: input, colunaF }),
            })

            const resultado = await resposta.json()

            if (resultado.status === "sucesso" && resultado.urlPdf) {
                await abrirPdfVisualizador(resultado.urlPdf)
            } else {
                alert(
                    "Erro no Sheets: " + (resultado.mensagem || "Desconhecido")
                )
            }
        } catch (erro) {
            console.error(erro)
            alert("Erro ao conectar com o Google Sheets.")
        } finally {
            window.dispatchEvent(
                new CustomEvent("gas-sending-status", { detail: false })
            )
        }
    }, [input, itens])

    const abrirPdfVisualizador = (urlPdf: string): Promise<void> =>
        new Promise((resolve) => {
            const urlVisualizadorCompleto =
                "https://docs.google.com/viewer?url=" +
                encodeURIComponent(urlPdf) +
                "&embedded=false"

            let paginaAberta = false
            const abrirPagina = () => {
                if (paginaAberta) return
                paginaAberta = true
                window.open(urlVisualizadorCompleto, "_blank")
            }
            let concluido = false
            const concluir = () => {
                if (concluido) return
                concluido = true
                resolve()
            }

            fetch(urlPdf, { mode: "no-cors" })
                .then(() => {
                    abrirPagina()
                    concluir()
                })
                .catch(() => {
                    abrirPagina()
                    concluir()
                })

            window.setTimeout(() => {
                abrirPagina()
                concluir()
            }, 8000)
        })

    React.useEffect(() => {
        sheets.enviarParaPlanilha = enviarParaPlanilha

        const lidarComEnviarOuvinte = () => {
            sheets.enviarParaPlanilha?.()
        }
        window.addEventListener("framerEnviarAgenda", lidarComEnviarOuvinte)

        return () => {
            window.removeEventListener("framerEnviarAgenda", lidarComEnviarOuvinte)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enviarParaPlanilha, sheets])

    // Expose actions via useImperativeHandle
    useImperativeHandle(ref, () => ({
        enviarParaPlanilha: () => enviarParaPlanilha(),
    }), [enviarParaPlanilha])

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minHeight: 0,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
            }}
        >
            <style>{`
                :root {
                    --gas-bg: #ffffff; --gas-border: #e2ddd6; --gas-text: #1e1c19; --gas-focus: #c96a2a; --gas-placeholder: #a89e90; --gas-danger: #c0392b;
                }
                @media (prefers-color-scheme: dark) {
                    :root {
                        --gas-bg: #1c1917; --gas-border: #2e2a24; --gas-text: #f5f5f4; --gas-focus: #e07a3b; --gas-placeholder: #57534e; --gas-danger: #e06c5a;
                    }
                    .framer-gas-overlay { background: rgba(28, 25, 23, 0.85); }
                }
                .framer-gas-textarea {
                    width: 100% !important; height: auto !important; flex: 1 1 auto; min-height: 180px !important; background: var(--gas-bg) !important; border: 1px solid var(--gas-border) !important;
                    border-radius: 10px !important; padding: 16px !important; font-size: 14px !important; line-height: 1.75 !important;
                    color: var(--gas-text) !important; outline: none !important; box-sizing: border-box !important; font-family: sans-serif !important;
                    resize: none !important; overflow-y: auto !important;
                }
                .framer-gas-textarea:focus { border-color: var(--gas-focus) !important; }
                .framer-gas-colunas { display: flex; flex-direction: column; gap: 12px; width: 100%; min-width: 0; }
                .framer-gas-bloco { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
                @media (min-width: 601px) {
                    .framer-gas-colunas { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; align-items: stretch; flex: 1 1 auto; min-height: 0; }
                    .framer-gas-bloco { height: 100%; }
                    .framer-gas-textarea { height: 100% !important; flex: 1 1 auto !important; min-height: 0 !important; }
                }
                .framer-gas-acolhimento { display: flex; flex-direction: column; gap: 12px; min-width: 0; align-items: stretch; min-height: 0; }
                    .framer-gas-acolhimento > div { display: flex; flex-direction: column; gap: 6px; min-height: 0; }
                    .framer-gas-acolhimento > div:first-child { flex: 1 1 auto; }
                    .framer-gas-acolhimento > div:last-child { flex: 0 0 auto; }
                .framer-gas-campo-hoje {
                    flex: 1 1 auto; min-width: 0; min-height: 200px; max-height: 200px; padding: 10px 12px; box-sizing: border-box;
                    background: var(--gas-bg) !important; border: 1px dashed var(--gas-border) !important;
                    border-radius: 10px !important; font-size: 13px !important; line-height: 1.5 !important;
                    color: var(--gas-text) !important; outline: none !important; resize: vertical !important;
                    overflow-y: auto !important; font-family: sans-serif !important;
                    height: auto !important;
                }
                .framer-gas-lista-f {
                    display: flex; flex-direction: column; width: 100%; overflow: hidden;
                    background: var(--gas-bg) !important;
                    border: 1px solid var(--gas-border) !important; border-radius: 10px !important;
                }
                .framer-gas-linha-f { display: flex; width: 100%; border-bottom: 1px solid var(--gas-border); }
                .framer-gas-linha-f:last-child { border-bottom: none; }
                .framer-gas-input-f {
                    flex: 1; min-width: 0; height: 44px; padding: 0 12px;
                    background: transparent !important; border: none !important; border-radius: 0 !important;
                    font-size: 14px !important; color: var(--gas-text) !important;
                    outline: none !important; box-sizing: border-box !important; font-family: sans-serif !important;
                }
                .framer-gas-input-f:focus { box-shadow: inset 0 0 0 2px var(--gas-focus) !important; }
                .framer-gas-linha-f.framer-gas-drop-f { box-shadow: inset 0 2px 0 var(--gas-focus); }
                .framer-gas-drag-f {
                    display: flex; align-items: center; justify-content: center;
                    width: 32px; height: 44px; flex-shrink: 0; padding: 0;
                    color: var(--gas-placeholder) !important; background: transparent !important;
                    border: none !important; border-radius: 0 !important; cursor: grab;
                    opacity: 0; pointer-events: none; transition: opacity 0.15s ease, color 0.15s ease;
                }
                .framer-gas-linha-f:hover .framer-gas-drag-f,
                .framer-gas-drag-f:focus-visible { color: var(--gas-focus) !important; opacity: 1; pointer-events: auto; }
                .framer-gas-drag-f:active { cursor: grabbing; }
                .framer-gas-remove-f {
                    width: 40px; height: 44px; flex-shrink: 0; padding: 0;
                    display: flex; align-items: center; justify-content: center;
                    background: transparent !important; color: var(--gas-placeholder) !important;
                    border: none !important; border-radius: 0 !important;
                    cursor: pointer; opacity: 0; transition: opacity 0.15s ease, color 0.15s ease;
                }
                .framer-gas-linha-f:hover .framer-gas-remove-f,
                .framer-gas-remove-f:focus-visible { opacity: 1; }
                .framer-gas-remove-f:hover { color: var(--gas-danger) !important; }
                .framer-gas-add-f {
                    width: 46px; height: 44px; flex-shrink: 0; padding: 0;
                    display: flex; align-items: center; justify-content: center;
                    background: transparent !important; color: var(--gas-focus) !important;
                    border: none !important; border-left: 1px solid var(--gas-border) !important;
                    border-radius: 0 !important;
                    font-size: 22px !important; line-height: 1 !important; font-family: sans-serif !important;
                    cursor: pointer; user-select: none;
                }
                @keyframes framerGasUiRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .framer-gas-spinner {
                    width: 36px; height: 36px; border-radius: 50%;
                    border: 3px solid rgba(201, 106, 42, 0.25);
                    border-top-color: var(--gas-focus);
                    animation: framerGasUiRotate 0.8s linear infinite;
                }
                .framer-gas-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    z-index: 9999;
                    background: rgba(255, 255, 255, 0.85);
                    backdrop-filter: blur(4px);
                    display: flex; align-items: center; justify-content: center;
                    flex-direction: column; gap: 14px;
                }
            `}</style>

            <div className="framer-gas-colunas" style={{ flex: "1 1 auto", minHeight: 0 }}>
                <div className="framer-gas-bloco">
                <label className="framer-gas-escala-label">Agendados</label>
                <textarea
                    className="framer-gas-textarea"
                    placeholder={`cole aqui a tabela toda do fastmedic:

Hora	Usuário	Tipo Agendamento	Observação
08:00	NOME DO PACIENTE 1	Eletiva Pré-Agendada	
08:30	NOME DO PACIENTE 2	Eletiva Pré-Agendada	
09:00	NOME DO PACIENTE 3	Eletiva Pré-Agendada	
[...]`}
                    value={input}
                    onChange={(e) => {
                        const raw = e.target.value
                        const linhas = raw.split(/\r?\n/)
                        if (linhas.length <= 1) {
                            setInput(raw)
                            return
                        }
                        const { manter } = processarAgenda(raw)
                        setInput([linhas[0], ...manter].join("\n"))
                    }}
                    onPaste={(e) => {
                        const colado = e.clipboardData.getData("text")
                        const el = e.currentTarget
                        const ini = el.selectionStart ?? input.length
                        const fim = el.selectionEnd ?? input.length
                        const completo = input.slice(0, ini) + colado + input.slice(fim)
                        const { acolhimento } = processarAgenda(completo)
                        setItens(acolhimento.length > 0 ? acolhimento : [""])
                    }}
                />
                </div>

                <div className="framer-gas-acolhimento">
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", minHeight: 0 }}>
                        <label className="framer-gas-escala-label">Agendinha</label>
                        <textarea
                            className="framer-gas-campo-hoje"
                            readOnly
                            value={escalaHoje}
                            placeholder={"carregando a agendinha..."}
                            ref={registrarEscala}
                        />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", minHeight: 0 }}>
                        <label className="framer-gas-escala-label">Acolhimento/DESP</label>
                        <div className="framer-gas-lista-f" style={{ overflow: "visible" }}>
                        {itens.map((valor, i) => (
                            <div
                                className={`framer-gas-linha-f${indiceAlvoArraste === i ? " framer-gas-drop-f" : ""}`}
                                key={i}
                                onDragOver={(e) => { e.preventDefault(); setIndiceAlvoArraste(i) }}
                                onDrop={(e) => soltarItem(e, i)}
                                onDragEnd={() => { setIndiceArrastado(null); setIndiceAlvoArraste(null) }}
                                style={{ opacity: indiceArrastado === i ? 0.45 : 1 }}
                            >
                                <input
                                    className="framer-gas-input-f"
                                    type="text"
                                    ref={registrarInput}
                                    value={valor}
                                    placeholder="acolhimento/DESP"
                                    onChange={(e) => atualizarItem(i, e.target.value)}
                                    onKeyDown={prosseguirNoEnter}
                                />
                                <button
                                    type="button"
                                    className="framer-gas-remove-f"
                                    aria-label="Remover item"
                                    title="Remover"
                                    onClick={() => removerItem(i)}
                                >
                                    <IconeLixeira />
                                </button>
                                <button
                                    type="button"
                                    className="framer-gas-drag-f"
                                    draggable
                                    aria-label={`Reordenar item ${i + 1}. Use as setas para mover.`}
                                    title="Arraste para reordenar"
                                    onDragStart={(e) => {
                                        setIndiceArrastado(i)
                                        e.dataTransfer.effectAllowed = "move"
                                        e.dataTransfer.setData("text/plain", String(i))
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "ArrowUp") { e.preventDefault(); moverItem(i, -1) }
                                        if (e.key === "ArrowDown") { e.preventDefault(); moverItem(i, 1) }
                                    }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" /></svg>
                                </button>
                                {i === itens.length - 1 && podeAdicionar && (
                                    <button
                                        type="button"
                                        className="framer-gas-add-f"
                                        aria-label="Adicionar item"
                                        onClick={adicionarItem}
                                    >
                                        +
                                    </button>
                                )}
                            </div>
                        ))}
                        </div>
                    </div>
                </div>
            </div>

            {enviando && (
                <div className="framer-gas-overlay">
                    <div className="framer-gas-spinner" />
                    <div
                        style={{
                            color: "var(--gas-focus)",
                            fontSize: 14,
                            fontWeight: 600,
                            fontFamily: "sans-serif",
                            letterSpacing: "0.3px",
                        }}
                    >
                        Gerando PDF...
                    </div>
                </div>
            )}
        </div>
    )
})

export default GoogleSheetsInput
