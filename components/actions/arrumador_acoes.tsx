import * as React from "react"
import type { ComponentType, CSSProperties } from "react"
import { useApp } from "../contexts/AppContext"

export function comBotaoDisparar<P extends { style?: CSSProperties; onClick?: () => void | Promise<void> }>(
    Component: ComponentType<P>
): ComponentType<P> {
    const WrappedComponent = (props: P) => {
        const app = useApp()
        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => {
                    if (app.executarPrompt) {
                        app.executarPrompt()
                    } else {
                        console.warn(
                            "API do formulário ou método executarPrompt não encontrado."
                        )
                    }
                }}
            />
        )
    }
    WrappedComponent.displayName = `comBotaoDisparar(${Component.displayName || Component.name || 'Component'})`
    return WrappedComponent
}

export function comBotaoCopiar<P extends { style?: CSSProperties; onClick?: () => void | Promise<void> }>(
    Component: ComponentType<P>
): ComponentType<P> {
    const WrappedComponent = (props: P) => {
        const app = useApp()
        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => app.copiarOutput?.()}
            />
        )
    }
    WrappedComponent.displayName = `comBotaoCopiar(${Component.displayName || Component.name || 'Component'})`
    return WrappedComponent
}

export function comBotaoLimpar<P extends { style?: CSSProperties; onClick?: () => void | Promise<void> }>(
    Component: ComponentType<P>
): ComponentType<P> {
    const WrappedComponent = (props: P) => {
        const app = useApp()
        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => app.limparTudo?.()}
            />
        )
    }
    WrappedComponent.displayName = `comBotaoLimpar(${Component.displayName || Component.name || 'Component'})`
    return WrappedComponent
}

export function comBotaoColar<P extends { style?: CSSProperties; onClick?: () => void | Promise<void> }>(
    Component: ComponentType<P>
): ComponentType<P> {
    const WrappedComponent = (props: P) => {
        const app = useApp()
        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => app.colarNoInput?.()}
            />
        )
    }
    WrappedComponent.displayName = `comBotaoColar(${Component.displayName || Component.name || 'Component'})`
    return WrappedComponent
}
