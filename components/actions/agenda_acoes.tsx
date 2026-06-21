import { ComponentType, useState, useEffect, ReactNode } from "react"

export function withGoogleSheetsSubmit(Component): ComponentType {
    return (props) => {
        const [isCounting, setIsCounting] = useState(false)

        useEffect(() => {
            if (!isCounting) return
            const timer = setTimeout(() => {
                setIsCounting(false)
            }, 5000) // 10 segundos de carregamento visual
            return () => clearTimeout(timer)
        }, [isCounting])

        // Garante que 'children' é um array para podermos manipular
        const originalChildren = Array.isArray(props.children)
            ? props.children
            : [props.children]

        // Se estiver carregando, interceptamos a renderização para trocar o ícone pelo Spinner
        let children: ReactNode = originalChildren

        if (isCounting) {
            // Assumimos que o primeiro item do seu Stack (children[0]) é o ícone da impressora.
            const textElement = originalChildren[1] // Mantém o texto como está (geralmente o segundo item)

            // Criamos o SVG do Spinner animado com bordas limpas em Branco Puro (#ffffff)
            const spinnerIcon = (
                <svg
                    key="gas-spinner"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                        animation: "framerGasRotate 0.8s linear infinite", // Faz girar fluido
                        flexShrink: 0, // Não deixa o Stack esmagar o spinner
                    }}
                >
                    <style>{`
                        @keyframes framerGasRotate {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                    {/* Círculo de fundo apagado */}
                    <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="rgba(255, 255, 255, 0.2)"
                        strokeWidth="3"
                        fill="none"
                    />
                    {/* Arco branco que gira por cima */}
                    <path
                        d="M12 2a10 10 0 0 1 10 10"
                        stroke="#ffffff" // Forçado em branco puro como você pediu!
                        strokeWidth="3"
                        strokeLinecap="round"
                        fill="none"
                    />
                </svg>
            )

            // Remontamos o botão: Spinner no lugar da impressora + o Texto original
            children = [spinnerIcon, textElement]
        }

        return (
            <Component
                {...props}
                style={{
                    ...props.style,
                    // Desativa o botão visualmente e trava o clique durante os 10s
                    opacity: isCounting ? 0.7 : 1,
                    pointerEvents: isCounting ? "none" : "auto",
                    gap: "10px", // Garante o espaçamento entre o spinner e o texto
                }}
                onClick={async () => {
                    setIsCounting(true)

                    if (
                        window.framerGoogleSheetsApi &&
                        window.framerGoogleSheetsApi.enviarParaPlanilha
                    ) {
                        const texto =
                            window.framerGoogleSheetsApi.textoInput?.trim()
                        if (!texto) {
                            alert("Por favor, cole o texto antes de enviar.")
                            setIsCounting(false)
                            return
                        }
                        await window.framerGoogleSheetsApi.enviarParaPlanilha()
                    } else {
                        alert("Erro de inicialização. Recarregue a página.")
                        setIsCounting(false)
                    }
                }}
            >
                {/* Renderiza o conteúdo original ou o carregamento */}
                {children}
            </Component>
        )
    }
}
export function withGoogleSheetsPaste(Component): ComponentType {
    return (props) => {
        return (
            <Component
                {...props}
                style={{
                    ...props.style,
                    cursor: "pointer",
                }}
                onClick={async () => {
                    try {
                        // Acessa a área de transferência nativa do sistema operacional
                        const textoCopiado =
                            await navigator.clipboard.readText()

                        if (!textoCopiado) {
                            alert("A sua área de transferência está vazia!")
                            return
                        }

                        // Injeta o texto diretamente dentro da API global que criamos no Input
                        if (window.framerGoogleSheetsApi) {
                            window.framerGoogleSheetsApi.textoInput =
                                textoCopiado

                            // Dispara um evento para avisar o componente do Input que o texto mudou
                            // (Evita que o React ignore a colagem externa)
                            window.dispatchEvent(
                                new CustomEvent("gas-force-input-update", {
                                    detail: textoCopiado,
                                })
                            )
                        } else {
                            alert(
                                "Erro de comunicação: O campo de texto ainda não foi carregado."
                            )
                        }
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
}
