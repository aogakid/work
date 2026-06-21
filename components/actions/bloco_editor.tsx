import * as React from "react"
import type { ComponentType } from "react"
import { useEditor } from "../contexts/AppContext"
import {
    MODELO_CONSULTA,
    MODELO_DEMANDA_ESPONTANEA,
    MODELO_PRE_NATAL,
} from "./Modelos.tsx"

export function comBotaoCopiar(Component): ComponentType {
    const WrappedComponent = (props) => {
        const editor = useEditor()
        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => editor.copiar()}
            />
        )
    }
    WrappedComponent.displayName = `comBotaoCopiar(${Component.displayName || Component.name || 'Component'})`
    return WrappedComponent
}

export function comBotaoColar(Component): ComponentType {
    const WrappedComponent = (props) => {
        const editor = useEditor()
        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => editor.colar()}
            />
        )
    }
    WrappedComponent.displayName = `comBotaoColar(${Component.displayName || Component.name || 'Component'})`
    return WrappedComponent
}

export function SubstituirConsultaAgendada(Component): ComponentType {
    const WrappedComponent = (props) => (
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
    WrappedComponent.displayName = `SubstituirConsultaAgendada(${Component.displayName || Component.name || 'Component'})`
    return WrappedComponent
}

export function comSubstituirDemandaEspontanea(Component): ComponentType {
    const WrappedComponent = (props) => {
        const editor = useEditor()
        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => editor.substituir(MODELO_DEMANDA_ESPONTANEA)}
            />
        )
    }
    WrappedComponent.displayName = `comSubstituirDemandaEspontanea(${Component.displayName || Component.name || 'Component'})`
    return WrappedComponent
}

export function comSubstituirPreNatal(Component): ComponentType {
    const WrappedComponent = (props) => {
        const editor = useEditor()
        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => editor.substituir(MODELO_PRE_NATAL)}
            />
        )
    }
    WrappedComponent.displayName = `comSubstituirPreNatal(${Component.displayName || Component.name || 'Component'})`
    return WrappedComponent
}

export function comBotaoLimparEditor(Component): ComponentType {
    const WrappedComponent = (props) => {
        const editor = useEditor()
        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => editor.substituir("")}
            />
        )
    }
    WrappedComponent.displayName = `comBotaoLimparEditor(${Component.displayName || Component.name || 'Component'})`
    return WrappedComponent
}
