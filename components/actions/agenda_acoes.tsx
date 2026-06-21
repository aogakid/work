import { ComponentType, useState, useEffect, ReactNode, CSSProperties } from "react"
import { useGoogleSheets } from "../contexts/AppContext"

export function withGoogleSheetsSubmit<P extends { style?: CSSProperties; children?: ReactNode; onClick?: () => void | Promise<void> }>(
    Component: ComponentType<P>
): ComponentType<P> {
    const WrappedComponent = (props: P) => {
        const sheets = useGoogleSheets()
        const [isCounting, setIsCounting] = useState(false)

        useEffect(() => {
            if (!isCounting) return
            const timer = setTimeout(() => {
                setIsCounting(false)
            }, 5000)
            return () => clearTimeout(timer)
        }, [isCounting])

        const originalChildren = Array.isArray(props.children)
            ? props.children
            : [props.children]

        let children: ReactNode = originalChildren

        if (isCounting) {
            const textElement = originalChildren[1]

            const spinnerIcon = (
                <svg
                    key="gas-spinner"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                        animation: "framerGasRotate 0.8s linear infinite",
                        flexShrink: 0,
                    }}
                >
                    <style>{`
                        @keyframes framerGasRotate {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                    <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="rgba(255, 255, 255, 0.2)"
                        strokeWidth="3"
                        fill="none"
                    />
                    <path
                        d="M12 2a10 10 0 0 1 10 10"
                        stroke="#ffffff"
                        strokeWidth="3"
                        strokeLinecap="round"
                        fill="none"
                    />
                </svg>
            )

            children = [spinnerIcon, textElement]
        }

        return (
            <Component
                {...props}
                style={{
                    ...props.style,
                    opacity: isCounting ? 0.7 : 1,
                    pointerEvents: isCounting ? "none" : "auto",
                    gap: "10px",
                }}
                onClick={async () => {
                    setIsCounting(true)

                    if (sheets.enviarParaPlanilha) {
                        const texto = sheets.textoInput?.trim()
                        if (!texto) {
                            alert("Por favor, cole o texto antes de enviar.")
                            setIsCounting(false)
                            return
                        }
                        await sheets.enviarParaPlanilha()
                    } else {
                        alert("Erro de inicialização. Recarregue a página.")
                        setIsCounting(false)
                    }
                }}
            >
                {children}
            </Component>
        )
    }
    WrappedComponent.displayName = `withGoogleSheetsSubmit(${Component.displayName || Component.name || 'Component'})`
    return WrappedComponent
}

export function withGoogleSheetsPaste<P extends { style?: CSSProperties; onClick?: () => void | Promise<void> }>(
    Component: ComponentType<P>
): ComponentType<P> {
    const WrappedComponent = (props: P) => {
        const sheets = useGoogleSheets()
        return (
            <Component
                {...props}
                style={{
                    ...props.style,
                    cursor: "pointer",
                }}
                onClick={async () => {
                    try {
                        const textoCopiado =
                            await navigator.clipboard.readText()

                        if (!textoCopiado) {
                            alert("A sua área de transferência está vazia!")
                            return
                        }

                        sheets.textoInput = textoCopiado

                        window.dispatchEvent(
                            new CustomEvent("gas-force-input-update", {
                                detail: textoCopiado,
                            })
                        )
                    } catch (erro) {
                        console.error(erro)
                        alert(
                            "Para colar automaticamente, permita o acesso à área de transferência quando o navegador solicitar."
                        )
                    }
                }}
            />
        )
    }
    WrappedComponent.displayName = `withGoogleSheetsPaste(${Component.displayName || Component.name || 'Component'})`
    return WrappedComponent
}
