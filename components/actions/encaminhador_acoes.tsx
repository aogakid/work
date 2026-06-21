import { ComponentType } from "react"

declare global {
    interface Window {
        framerEncaminhaApi?: {
            executarEncaminhamento?: () => void
            copiarOutput?: () => void
            colarNoInput?: () => void
            limparTudo?: () => void
        }
    }
}

// Associa ao botão "Gerar"
export function comBotaoGerar(Component): ComponentType {
    return (props) => {
        return (
            <Component
                {...props}
                onClick={() => {
                    if (
                        window.framerEncaminhaApi &&
                        window.framerEncaminhaApi.executarEncaminhamento
                    ) {
                        window.framerEncaminhaApi.executarEncaminhamento()
                    }
                }}
            />
        )
    }
}

// Associa ao botão "colar"
export function comBotaoColarEncaminha(Component): ComponentType {
    return (props) => {
        return (
            <Component
                {...props}
                onClick={() => {
                    if (
                        window.framerEncaminhaApi &&
                        window.framerEncaminhaApi.colarNoInput
                    ) {
                        window.framerEncaminhaApi.colarNoInput()
                    }
                }}
            />
        )
    }
}

// Associa ao botão "copiar"
export function comBotaoCopiarEncaminha(Component): ComponentType {
    return (props) => {
        return (
            <Component
                {...props}
                onClick={() => {
                    if (
                        window.framerEncaminhaApi &&
                        window.framerEncaminhaApi.copiarOutput
                    ) {
                        window.framerEncaminhaApi.copiarOutput()
                    }
                }}
            />
        )
    }
}

// Associa ao botão "limpar" ou "Limpar tudo"
export function comBotaoLimparEncaminha(Component): ComponentType {
    return (props) => {
        return (
            <Component
                {...props}
                onClick={() => {
                    if (
                        window.framerEncaminhaApi &&
                        window.framerEncaminhaApi.limparTudo
                    ) {
                        window.framerEncaminhaApi.limparTudo()
                    }
                }}
            />
        )
    }
}
