import * as React from "react"
import type { ComponentType, CSSProperties } from "react"
import { useEditor } from "../contexts/AppContext"
import {
    MODELO_CONSULTA,
    MODELO_DEMANDA_ESPONTANEA,
    MODELO_PRE_NATAL,
} from "../contexts/bloco_modelos"

export function comBotaoCopiar<P extends { style?: CSSProperties; onClick?: () => void | Promise<void> }>(
    Component: ComponentType<P>
): ComponentType<P> {
    const WrappedComponent = (props: P) => {
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

export function comBotaoColar<P extends { style?: CSSProperties; onClick?: () => void | Promise<void> }>(
    Component: ComponentType<P>
): ComponentType<P> {
    const WrappedComponent = (props: P) => {
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

export function SubstituirConsultaAgendada<P extends { style?: CSSProperties; onClick?: () => void | Promise<void> }>(
    Component: ComponentType<P>
): ComponentType<P> {
    const WrappedComponent = (props: P) => (
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

export function comSubstituirDemandaEspontanea<P extends { style?: CSSProperties; onClick?: () => void | Promise<void> }>(
    Component: ComponentType<P>
): ComponentType<P> {
    const WrappedComponent = (props: P) => {
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

export function comSubstituirPreNatal<P extends { style?: CSSProperties; onClick?: () => void | Promise<void> }>(
    Component: ComponentType<P>
): ComponentType<P> {
    const WrappedComponent = (props: P) => {
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

export function comBotaoLimparEditor<P extends { style?: CSSProperties; onClick?: () => void | Promise<void> }>(
    Component: ComponentType<P>
): ComponentType<P> {
    const WrappedComponent = (props: P) => {
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
