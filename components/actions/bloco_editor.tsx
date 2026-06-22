import * as React from "react"
import type { ComponentType, CSSProperties } from "react"
import { useEditor } from "../contexts/AppContext"

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
