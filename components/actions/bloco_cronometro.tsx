import * as React from "react"
import type { ComponentType } from "react"
import { useTimer } from "../contexts/AppContext"

export function comTriggerCronometro(Component): ComponentType {
    const WrappedComponent = (props) => {
        const timer = useTimer()
        return (
            <Component
                {...props}
                style={{ ...props.style, cursor: "pointer" }}
                onClick={() => timer.ativarCronometro()}
            />
        )
    }
    WrappedComponent.displayName = `comTriggerCronometro(${Component.displayName || Component.name || 'Component'})`
    return WrappedComponent
}
