import * as React from "react"
import type { ComponentType } from "react"
import { useApp } from "../contexts/AppContext"

export function comBotaoDisparar(Component): ComponentType {
    return (props) => {
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
}

export function comBotaoCopiar(Component): ComponentType {
    return (props) => {
        const app = useApp()
        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => app.copiarOutput?.()}
            />
        )
    }
}

export function comBotaoLimpar(Component): ComponentType {
    return (props) => {
        const app = useApp()
        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => app.limparTudo?.()}
            />
        )
    }
}

export function comBotaoColar(Component): ComponentType {
    return (props) => {
        const app = useApp()
        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => app.colarNoInput?.()}
            />
        )
    }
}
