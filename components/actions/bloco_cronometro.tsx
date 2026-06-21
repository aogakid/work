import * as React from "react"
import type { ComponentType, CSSProperties } from "react"
import { useTimer } from "../contexts/AppContext"

export function comTriggerCronometro<P extends { style?: CSSProperties; onClick?: () => void | Promise<void> }>(
    Component: ComponentType<P>
): ComponentType<P> {
    const WrappedComponent = (props: P) => {
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
