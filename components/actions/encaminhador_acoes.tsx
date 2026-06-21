import type { ComponentType } from "react"
import { useEncaminha } from "../contexts/AppContext"

export function comBotaoGerar<P extends { onClick?: () => void | Promise<void> }>(
    Component: ComponentType<P>
): ComponentType<P> {
    const WrappedComponent = (props: P) => {
        const enc = useEncaminha()
        return (
            <Component
                {...props}
                onClick={() => enc.executarEncaminhamento?.()}
            />
        )
    }
    WrappedComponent.displayName = `comBotaoGerar(${Component.displayName || Component.name || 'Component'})`
    return WrappedComponent
}

export function comBotaoColarEncaminha<P extends { onClick?: () => void | Promise<void> }>(
    Component: ComponentType<P>
): ComponentType<P> {
    const WrappedComponent = (props: P) => {
        const enc = useEncaminha()
        return (
            <Component
                {...props}
                onClick={() => enc.colarNoInput?.()}
            />
        )
    }
    WrappedComponent.displayName = `comBotaoColarEncaminha(${Component.displayName || Component.name || 'Component'})`
    return WrappedComponent
}

export function comBotaoCopiarEncaminha<P extends { onClick?: () => void | Promise<void> }>(
    Component: ComponentType<P>
): ComponentType<P> {
    const WrappedComponent = (props: P) => {
        const enc = useEncaminha()
        return (
            <Component
                {...props}
                onClick={() => enc.copiarOutput?.()}
            />
        )
    }
    WrappedComponent.displayName = `comBotaoCopiarEncaminha(${Component.displayName || Component.name || 'Component'})`
    return WrappedComponent
}

export function comBotaoLimparEncaminha<P extends { onClick?: () => void | Promise<void> }>(
    Component: ComponentType<P>
): ComponentType<P> {
    const WrappedComponent = (props: P) => {
        const enc = useEncaminha()
        return (
            <Component
                {...props}
                onClick={() => enc.limparTudo?.()}
            />
        )
    }
    WrappedComponent.displayName = `comBotaoLimparEncaminha(${Component.displayName || Component.name || 'Component'})`
    return WrappedComponent
}
