import * as React from "react"
import { useEncaminha } from "../contexts/AppContext"

export default function EncaminhaEspecialidade() {
    const enc = useEncaminha()
    const [specialty, setSpecialty] = React.useState("")

    React.useEffect(() => {
        enc.especialidade = specialty
        enc.setEspecialidade = setSpecialty

        const lidarComExecutarOuvinte = () => {
            enc.executarEncaminhamento?.()
        }
        window.addEventListener("framerExecutarEncaminhaEspecialidade", lidarComExecutarOuvinte)

        return () => {
            window.removeEventListener("framerExecutarEncaminhaEspecialidade", lidarComExecutarOuvinte)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [specialty, enc])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault()
            enc.executarEncaminhamento?.()
        }
    }

    return (
        <div className="framer-specialty-row">
            <style>{`
                :root {
                    --specialty-bg: #ffffff;
                    --specialty-border: #e2ddd6;
                    --specialty-shadow: 0 1px 4px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.03);
                    --specialty-label-bg: #f5f5f4;
                    --specialty-label-text: #a89e90;
                    --specialty-input-text: #1e1c19;
                    --specialty-placeholder: #a89e90;
                }

                @media (prefers-color-scheme: dark) {
                    :root {
                        --specialty-bg: #1c1917;
                        --specialty-border: #2e2a24;
                        --specialty-shadow: 0 1px 4px rgba(0,0,0,.2), 0 4px 16px rgba(0,0,0,.3);
                        --specialty-label-bg: #26231f;
                        --specialty-label-text: #78716c;
                        --specialty-input-text: #f5f5f4;
                        --specialty-placeholder: #57534e;
                    }
                }

                .framer-specialty-row {
                    display: flex !important;
                    align-items: stretch !important;
                    width: 100% !important;
                    height: 100% !important;
                    background: var(--specialty-bg) !important;
                    border: 1px solid var(--specialty-border) !important;
                    border-radius: 10px !important;
                    box-shadow: var(--specialty-shadow) !important;
                    overflow: hidden !important;
                    box-sizing: border-box !important;
                    transition: background-color .2s, border-color .2s, box-shadow .2s;
                }
                .framer-specialty-label {
                    padding: 0 14px !important;
                    font-size: 10px !important;
                    letter-spacing: .08em !important;
                    color: var(--specialty-label-text) !important;
                    text-transform: uppercase !important;
                    background: var(--specialty-label-bg) !important;
                    border-right: 1px solid var(--specialty-border) !important;
                    display: flex !important;
                    align-items: center !important;
                    white-space: nowrap !important;
                    user-select: none !important;
                    font-family: "Google Sans", sans-serif !important;
                    transition: background-color .2s, color .2s, border-color .2s;
                }
                .framer-specialty-input {
                    flex: 1 !important;
                    padding: 12px 14px !important;
                    border: none !important;
                    outline: none !important;
                    font-family: "Google Sans", sans-serif !important;
                    font-size: 14px !important;
                    color: var(--specialty-input-text) !important;
                    background: transparent !important;
                    transition: color .2s;
                }
                .framer-specialty-input::placeholder { color: var(--specialty-placeholder) !important; font-style: italic !important; }
            `}</style>
            <span className="framer-specialty-label">Para:</span>
            <input
                className="framer-specialty-input"
                type="text"
                placeholder="cirurgia, oftalmologia, psicologia…"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                onKeyDown={handleKeyDown}
            />
        </div>
    )
}
