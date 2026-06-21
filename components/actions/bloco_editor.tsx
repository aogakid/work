import * as React from "react"
import type { ComponentType } from "react"
import { useEditor } from "../contexts/AppContext"
import {
    MODELO_CONSULTA,
    MODELO_DEMANDA_ESPONTANEA,
    MODELO_PRE_NATAL,
} from "./Modelos.tsx"

export function comBotaoCopiar(Component): ComponentType {
    return (props) => {
        const editor = useEditor()
        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => editor.copiar()}
            />
        )
    }
}

export function comBotaoColar(Component): ComponentType {
    return (props) => {
        const editor = useEditor()
        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => editor.colar()}
            />
        )
    }
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
    return (props) => {
        const editor = useEditor()
        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => editor.substituir(MODELO_DEMANDA_ESPONTANEA)}
            />
        )
    }
}

export function comSubstituirPreNatal(Component): ComponentType {
    return (props) => {
        const editor = useEditor()
        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => editor.substituir(MODELO_PRE_NATAL)}
            />
        )
    }
}

export function comBotaoLimparEditor(Component): ComponentType {
    return (props) => {
        const editor = useEditor()
        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => editor.substituir("")}
            />
        )
    }
}
