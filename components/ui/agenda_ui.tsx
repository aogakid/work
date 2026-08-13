import * as React from "react"
import { forwardRef, useImperativeHandle } from "react"
import { useGoogleSheets } from "../contexts/AppContext"

const GAS_WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbx5e1DSXQ2tZqEtMHbCU9a9dvP8Ial8q7LsZ1A7LYHSLsnPvABURMhPmDP-yWBLStmcng/exec"

export interface GoogleSheetsInputActions {
    enviarParaPlanilha(): void
}

const GoogleSheetsInput = forwardRef<GoogleSheetsInputActions>(function GoogleSheetsInput(_props, ref) {
    const sheets = useGoogleSheets()
    const [input, setInput] = React.useState("")
    const [itens, setItens] = React.useState<string[]>([""])
    const podeAdicionar = itens.length < 10
    const inputRef = React.useRef<HTMLInputElement | null>(null)

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
                const urlVisualizadorCompleto =
                    "https://docs.google.com/viewer?url=" +
                    encodeURIComponent(resultado.urlPdf) +
                    "&embedded=false"

                window.open(urlVisualizadorCompleto, "_blank")
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
                }
                .framer-gas-textarea {
                    width: 100% !important; height: auto !important; flex: 1 1 auto; min-height: 180px !important; background: var(--gas-bg) !important; border: 1px solid var(--gas-border) !important;
                    border-radius: 10px !important; padding: 16px !important; font-size: 14px !important; line-height: 1.75 !important;
                    color: var(--gas-text) !important; outline: none !important; box-sizing: border-box !important; font-family: sans-serif !important;
                    resize: none !important; overflow-y: auto !important;
                }
                .framer-gas-textarea:focus { border-color: var(--gas-focus) !important; }
                .framer-gas-lista-f { display: flex; flex-direction: column; gap: 8px; width: 100%; }
                .framer-gas-linha-f { display: flex; gap: 8px; width: 100%; }
                .framer-gas-input-f {
                    flex: 1; min-width: 0; height: 44px; padding: 0 12px;
                    background: var(--gas-bg) !important; border: 1px solid var(--gas-border) !important;
                    border-radius: 10px !important; font-size: 14px !important; color: var(--gas-text) !important;
                    outline: none !important; box-sizing: border-box !important; font-family: sans-serif !important;
                }
                .framer-gas-input-f:focus { border-color: var(--gas-focus) !important; }
                .framer-gas-add-f {
                    width: 44px; height: 44px; flex-shrink: 0; padding: 0;
                    display: flex; align-items: center; justify-content: center;
                    background: var(--gas-focus) !important; color: #ffffff !important;
                    border: none !important; border-radius: 10px !important;
                    font-size: 22px !important; line-height: 1 !important; font-family: sans-serif !important;
                    cursor: pointer; user-select: none;
                }
                @media (min-width: 601px) {
                    .framer-gas-lista-f { flex-direction: row; flex-wrap: wrap; align-items: flex-start; }
                    .framer-gas-linha-f { flex: 1 1 calc((100% - 40px) / 5); }
                }
            `}</style>

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
    )
})

export default GoogleSheetsInput
