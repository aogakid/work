import * as React from "react"
import type { ComponentType } from "react"
// Importa os modelos do arquivo que acabamos de criar
import {
    MODELO_CONSULTA,
    MODELO_DEMANDA_ESPONTANEA,
    MODELO_PRE_NATAL,
} from "./Modelos.tsx"

declare global {
    interface Window {
        framerEditorApi?: {
            copiar: () => void
            colar: () => void
            substituir: (texto: string) => void
        }
        framerTimerApi?: {
            ativarCronometro: (minutos: number) => void
        }
    }
}

// ==========================================
// OVERRIDES DO EDITOR
// ==========================================
export function comBotaoCopiar(Component): ComponentType {
    return (props) => (
        <Component
            {...props}
            style={{ ...props.style, cursor: "pointer" }}
            onClick={() =>
                window.framerEditorApi
                    ? window.framerEditorApi.copiar()
                    : console.log("Editor ausente.")
            }
        />
    )
}

export function comBotaoColar(Component): ComponentType {
    return (props) => (
        <Component
            {...props}
            style={{ ...props.style, cursor: "pointer" }}
            onClick={() =>
                window.framerEditorApi && window.framerEditorApi.colar()
            }
        />
    )
}

export function SubstituirConsultaAgendada(Component): ComponentType {
    return (props) => (
        <Component
            {...props}
            style={{ ...props.style, cursor: "pointer" }}
            onClick={() => {
                const evento = new CustomEvent("framerSubstituirTexto", {
                    detail: { texto: MODELO_CONSULTA },
                })
                document.dispatchEvent(evento)
            }}
        />
    )
}

export function comSubstituirDemandaEspontanea(Component): ComponentType {
    return (props) => (
        <Component
            {...props}
            style={{ ...props.style, cursor: "pointer" }}
            onClick={() =>
                window.framerEditorApi &&
                window.framerEditorApi.substituir(MODELO_DEMANDA_ESPONTANEA)
            }
        />
    )
}

export function comSubstituirPreNatal(Component): ComponentType {
    return (props) => (
        <Component
            {...props}
            style={{ ...props.style, cursor: "pointer" }}
            onClick={() =>
                window.framerEditorApi &&
                window.framerEditorApi.substituir(MODELO_PRE_NATAL)
            }
        />
    )
}

export function comBotaoLimparEditor(Component): ComponentType {
    return (props) => (
        <Component
            {...props}
            style={{ ...props.style, cursor: "pointer" }}
            onClick={() =>
                window.framerEditorApi && window.framerEditorApi.substituir("")
            }
        />
    )
}
