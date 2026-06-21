import * as React from "react"
import { useGoogleSheets } from "../contexts/AppContext"

const GAS_WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbx5e1DSXQ2tZqEtMHbCU9a9dvP8Ial8q7LsZ1A7LYHSLsnPvABURMhPmDP-yWBLStmcng/exec"

export default function GoogleSheetsInput() {
    const sheets = useGoogleSheets()
    const [input, setInput] = React.useState("")

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

        try {
            const resposta = await fetch(GAS_WEB_APP_URL, {
                method: "POST",
                mode: "cors",
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify({ texto: input }),
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
    }, [input])

    React.useEffect(() => {
        sheets.enviarParaPlanilha = enviarParaPlanilha

        const lidarComEnviarOuvinte = () => {
            sheets.enviarParaPlanilha?.()
        }
        window.addEventListener("framerEnviarAgenda", lidarComEnviarOuvinte)

        // Global API for Plasmic
        ;(globalThis as any).framerAgenda = {
            enviar: () => sheets.enviarParaPlanilha?.(),
        }

        return () => {
            window.removeEventListener("framerEnviarAgenda", lidarComEnviarOuvinte)
            ;(globalThis as any).framerAgenda = undefined
        }
    }, [enviarParaPlanilha, sheets])

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                boxSizing: "border-box",
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
                    width: 100% !important; height: 100% !important; background: var(--gas-bg) !important; border: 1px solid var(--gas-border) !important;
                    border-radius: 10px !important; padding: 16px !important; font-size: 14px !important; line-height: 1.75 !important;
                    color: var(--gas-text) !important; outline: none !important; box-sizing: border-box !important; font-family: sans-serif !important;
                    resize: none !important; overflow-y: auto !important;
                }
                .framer-gas-textarea:focus { border-color: var(--gas-focus) !important; }
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
        </div>
    )
}
