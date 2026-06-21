import type { ComponentType } from "react"
import { useEncaminha } from "../contexts/AppContext"

export function comBotaoGerar(Component): ComponentType {
    return (props) => {
        const enc = useEncaminha()
        return (
            <Component
                {...props}
                onClick={() => enc.executarEncaminhamento?.()}
            />
        )
    }
}

export function comBotaoColarEncaminha(Component): ComponentType {
    return (props) => {
        const enc = useEncaminha()
        return (
            <Component
                {...props}
                onClick={() => enc.colarNoInput?.()}
            />
        )
    }
}

export function comBotaoCopiarEncaminha(Component): ComponentType {
    return (props) => {
        const enc = useEncaminha()
        return (
            <Component
                {...props}
                onClick={() => enc.copiarOutput?.()}
            />
        )
    }
}

export function comBotaoLimparEncaminha(Component): ComponentType {
    return (props) => {
        const enc = useEncaminha()
        return (
            <Component
                {...props}
                onClick={() => enc.limparTudo?.()}
            />
        )
    }
}
