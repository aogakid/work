import * as React from "react"
import type { ComponentType } from "react"

declare global {
    interface Window {
        framerTimerApi?: {
            ativarCronometro: () => void
        }
    }
}

/**
 * OVERRIDE MESTRE DO CRONÔMETRO
 * Aplique esta função a qualquer botão, card ou elemento no Framer.
 * Ao clicar, ele desfaz seleções externas e abre o Setup UI mórfico (Relógio Seletor) interno do Bloco.
 */
export function comTriggerCronometro(Component): ComponentType {
    return (props) => (
        <Component
            {...props}
            style={{ ...props.style, cursor: "pointer" }}
            onClick={() => {
                if (
                    window.framerTimerApi &&
                    window.framerTimerApi.ativarCronometro
                ) {
                    // Dispara a abertura do relógio seletor interno no Bloco
                    window.framerTimerApi.ativarCronometro()
                } else {
                    alert(
                        "O bloco de notas precisa estar renderizado na tela para iniciar o seletor."
                    )
                }
            }}
        />
    )
}
