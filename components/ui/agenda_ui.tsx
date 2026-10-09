import * as React from "react"
import { forwardRef, useImperativeHandle } from "react"
import { useGoogleSheets } from "../contexts/AppContext"

const GAS_WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbx5e1DSXQ2tZqEtMHbCU9a9dvP8Ial8q7LsZ1A7LYHSLsnPvABURMhPmDP-yWBLStmcng/exec"

const ESCALA_CSV_URL =
    "https://docs.google.com/spreadsheets/d/1tkgJeZqOgGlJfK6Yi3ocqdA10VmeuaW8k0UOGYHJsFQ/gviz/tq?tqx=out:csv"

interface DataAtual {
    dia: number
    mes: number
    ano: number | null
}

const dataHoje = (): DataAtual => {
    const a = new Date()
    return { dia: a.getDate(), mes: a.getMonth() + 1, ano: a.getFullYear() }
}

const comDoisDigitos = (n: number): string => String(n).padStart(2, "0")

const formatarHoje = (): string => {
    const h = dataHoje()
    return comDoisDigitos(h.dia) + "/" + comDoisDigitos(h.mes) + "/" + h.ano
}

const MESES_ABREVIADOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

const nomeAbaMes = (): string => {
    const a = new Date()
    const mes = MESES_ABREVIADOS[a.getMonth()]
    const ano = String(a.getFullYear() % 100).padStart(2, "0")
    return mes + "/" + ano
}

const urlEscalaMes = (): string => {
    return ESCALA_CSV_URL + "&sheet=" + encodeURIComponent(nomeAbaMes())
}

const parseCsv = (texto: string): string[][] => {
    const linhas: string[][] = []
    let atual: string[] = []
    let campo = ""
    let emAspas = false
    for (let i = 0; i < texto.length; i++) {
        const c = texto[i]
        if (emAspas) {
            if (c === "\"") {
                if (texto[i + 1] === "\"") {
                    campo += "\""
                    i++
                } else {
                    emAspas = false
                }
            } else {
                campo += c
            }
        } else if (c === "\"") {
            emAspas = true
        } else if (c === ",") {
            atual.push(campo)
            campo = ""
        } else if (c === "\n") {
            atual.push(campo)
            linhas.push(atual)
            atual = []
            campo = ""
        } else if (c !== "\r") {
            campo += c
        }
    }
    if (campo !== "" || atual.length > 0) {
        atual.push(campo)
        linhas.push(atual)
    }
    return linhas
}

const extrairDataCelula = (celula: string): DataAtual | null => {
    const m = celula.trim().match(/^0?(\d{1,2})\/0?(\d{1,2})(?:\/(\d{2,4}))?$/)
    if (!m) return null
    const ano = m[3] ? Number(m[3]) : null
    return { dia: Number(m[1]), mes: Number(m[2]), ano }
}

const montarTextoHoje = (linhas: string[][]): string => {
    const hoje = dataHoje()
    const cabecalho = linhas[0] || []
    let coluna = -1
    cabecalho.forEach((celula, i) => {
        const d = extrairDataCelula(celula)
        if (d && d.dia === hoje.dia && d.mes === hoje.mes) coluna = i
    })
    if (coluna < 0) {
        return (
            "(a data de hoje não está na aba " +
            nomeAbaMes() +
            " do link — confira se a tabela está atualizada)"
        )
    }
    const itens: string[] = []
    for (let r = 2; r < linhas.length; r++) {
        const rotulo = ((linhas[r] || [])[0] || "").trim()
        const slot = rotulo.match(/^(Encaixe|Vaga) (\d+)$/i)
        if (!slot) continue
        const numero = slot[2]
        const valor = ((linhas[r] || [])[coluna] || "").trim()
        if (!valor) continue
        let valorObjetivo = ""
        for (let r2 = 2; r2 < linhas.length; r2++) {
            const outro = ((linhas[r2] || [])[0] || "").trim()
            const outroMatch = outro.match(/^Objetivo (\d+)$/i)
            if (!outroMatch) continue
            if (outroMatch[1] !== numero) continue
            const conteudo = ((linhas[r2] || [])[coluna] || "").trim()
            if (conteudo) valorObjetivo = conteudo
            break
        }
        if (valorObjetivo) itens.push(valor + " (" + valorObjetivo + ")")
    }
    if (itens.length === 0) return "(sem agendinha marcada para hoje)"
    return itens.join("\n")
}

export interface GoogleSheetsInputActions {
    enviarParaPlanilha(): void
}

const GoogleSheetsInput = forwardRef<GoogleSheetsInputActions>(function GoogleSheetsInput(_props, ref) {
    const sheets = useGoogleSheets()
    const [input, setInput] = React.useState("")
    const [itens, setItens] = React.useState<string[]>([""])
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

    const prosseguirNoEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== "Enter") return
        e.preventDefault()
        adicionarItem()
    }

    const carregarEscala = React.useCallback(async () => {
        try {
            const resposta = await fetch(urlEscalaMes(), { mode: "cors" })
            if (!resposta.ok) throw new Error("HTTP " + resposta.status)
            const texto = await resposta.text()
            if (!texto.trim().startsWith('"')) {
                throw new Error("resposta não é CSV")
            }
            setEscalaHoje(montarTextoHoje(parseCsv(texto)))
        } catch {
            setEscalaHoje(
                formatarHoje() +
                    "\n(não foi possível ler a aba " +
                    nomeAbaMes() +
                    " do link)"
            )
        }
    }, [])

    React.useEffect(() => {
        carregarEscala()
    }, [carregarEscala])

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
            .filter((item) => item !== "")

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
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
            }}
        >
            <style>{`
                :root {
                    --gas-bg: #ffffff; --gas-border: #e2ddd6; --gas-text: #1e1c19; --gas-focus: #c96a2a; --gas-placeholder: #a89e90;
                }
                @media (prefers-color-scheme: dark) {
                    :root {
                        --gas-bg: #1c1917; --gas-border: #2e2a24; --gas-text: #f5f5f4; --gas-focus: #e07a3b; --gas-placeholder: #57534e;
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
                    .framer-gas-colunas { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; align-items: stretch; }
                    .framer-gas-bloco { height: 100%; }
                    .framer-gas-textarea { height: auto !important; flex: 1 1 auto !important; min-height: 220px !important; }
                }
                .framer-gas-acolhimento { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
                .framer-gas-escala-label {
                    font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;
                    color: var(--gas-placeholder); font-family: sans-serif;
                }
                .framer-gas-campo-hoje {
                    flex: 1; min-width: 0; min-height: 84px; padding: 10px 12px; box-sizing: border-box;
                    background: var(--gas-bg) !important; border: 1px dashed var(--gas-border) !important;
                    border-radius: 10px !important; font-size: 13px !important; line-height: 1.5 !important;
                    color: var(--gas-text) !important; outline: none !important; resize: none !important;
                    overflow-y: auto !important; font-family: sans-serif !important;
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

            <div className="framer-gas-colunas">
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
                    onChange={(e) => setInput(e.target.value)}
                />
                </div>

                <div className="framer-gas-acolhimento">
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label className="framer-gas-escala-label">Agendinha</label>
                        <textarea
                            className="framer-gas-campo-hoje"
                            readOnly
                            value={escalaHoje}
                            placeholder={"carregando a agendinha..."}
                            ref={registrarEscala}
                        />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label className="framer-gas-escala-label">Acolhimento/DESP</label>
                        <div className="framer-gas-lista-f">
                        {itens.map((valor, i) => (
                            <div className="framer-gas-linha-f" key={i}>
                                <input
                                    className="framer-gas-input-f"
                                    type="text"
                                    ref={registrarInput}
                                    value={valor}
                                    placeholder="acolhimento/DESP"
                                    onChange={(e) => atualizarItem(i, e.target.value)}
                                    onKeyDown={prosseguirNoEnter}
                                />
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
