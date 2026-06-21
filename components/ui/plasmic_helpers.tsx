import * as React from "react"
import { useEditor, useApp, useEncaminha, useTimer, useGoogleSheets } from "../contexts/AppContext"
import type { EditorApi, AppApi, EncaminhaApi, TimerApi, GoogleSheetsApi } from "../contexts/AppContext"

// Helper component to expose APIs to Plasmic's window object
export function PlasmicApiHelper() {
    const editor = useEditor()
    const app = useApp()
    const enc = useEncaminha()
    const timer = useTimer()
    const sheets = useGoogleSheets()

    React.useEffect(() => {
        // Attach to window for Plasmic run code access
        ;(window as unknown as { framerBloco?: EditorApi }).framerBloco = editor
        ;(window as unknown as { framerApp?: AppApi }).framerApp = app
        ;(window as unknown as { framerEncaminha?: EncaminhaApi }).framerEncaminha = enc
        ;(window as unknown as { framerTimer?: TimerApi }).framerTimer = timer
        ;(window as unknown as { framerGoogleSheets?: GoogleSheetsApi }).framerGoogleSheets = sheets

        return () => {
            delete (window as unknown as { framerBloco?: EditorApi }).framerBloco
            delete (window as unknown as { framerApp?: AppApi }).framerApp
            delete (window as unknown as { framerEncaminha?: EncaminhaApi }).framerEncaminha
            delete (window as unknown as { framerTimer?: TimerApi }).framerTimer
            delete (window as unknown as { framerGoogleSheets?: GoogleSheetsApi }).framerGoogleSheets
        }
    }, [editor, app, enc, timer, sheets])

    return null
}

// Component that exposes functions as props for Plasmic
export function PlasmicTrigger({ onCopiar, onColar, onLimpar, onCronometro, onSubstituir }: {
    onCopiar?: () => void
    onColar?: () => void
    onLimpar?: () => void
    onCronometro?: () => void
    onSubstituir?: (texto: string) => void
}) {
    const editor = useEditor()
    const timer = useTimer()

    React.useEffect(() => {
        if (onCopiar) onCopiar = editor.copiar
        if (onColar) onColar = editor.colar
        if (onLimpar) onLimpar = () => editor.substituir("")
        if (onCronometro) onCronometro = timer.ativarCronometro
        if (onSubstituir) onSubstituir = editor.substituir
    }, [editor, timer, onCopiar, onColar, onLimpar, onCronometro, onSubstituir])

    return null
}
