import * as React from "react"
import type { ComponentType } from "react"

// Declaração da API para o TypeScript não acusar erro de compilação
declare global {
    interface Window {
        framerAppApi?: {
            textoInput: string
            setTextoInput: (t: string) => void
            isStreaming: boolean
            executarPrompt?: () => void
            copiarOutput?: () => void
            colarNoInput?: () => void
            limparTudo?: () => void
        }
    }
}

// 1. Override para o botão principal de Formatar / Enviar
export function comBotaoDisparar(Component): ComponentType {
    return (props) => {
        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => {
                    if (
                        window.framerAppApi &&
                        window.framerAppApi.executarPrompt
                    ) {
                        window.framerAppApi.executarPrompt()
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

// 2. Override para o botão de Copiar o Output
export function comBotaoCopiar(Component): ComponentType {
    return (props) => {
        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => {
                    if (
                        window.framerAppApi &&
                        window.framerAppApi.copiarOutput
                    ) {
                        window.framerAppApi.copiarOutput()
                    }
                }}
            />
        )
    }
}

// 3. Override para o botão de Limpar Campos
export function comBotaoLimpar(Component): ComponentType {
    return (props) => {
        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => {
                    if (window.framerAppApi && window.framerAppApi.limparTudo) {
                        window.framerAppApi.limparTudo()
                    }
                }}
            />
        )
    }
}

// 4. Override para o botão de Colar Texto da Área de Transferência
export function comBotaoColar(Component): ComponentType {
    return (props) => {
        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => {
                    if (
                        window.framerAppApi &&
                        window.framerAppApi.colarNoInput
                    ) {
                        window.framerAppApi.colarNoInput()
                    }
                }}
            />
        )
    }
}
