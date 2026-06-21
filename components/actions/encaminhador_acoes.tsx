import type { ComponentType } from "react"
import { useEncaminha } from "../contexts/AppContext"

export function comBotaoGerar(Component): ComponentType {
    const WrappedComponent = (props) => {
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

export function comBotaoColarEncaminha(Component): ComponentType {
    const WrappedComponent = (props) => {
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

export function comBotaoCopiarEncaminha(Component): ComponentType {
    const WrappedComponent = (props) => {
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

export function comBotaoLimparEncaminha(Component): ComponentType {
    const WrappedComponent = (props) => {
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
