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
