import * as React from "react"
import { useEditor, useApp, useEncaminha, useTimer, useGoogleSheets } from "../contexts/AppContext"

// Helper component to expose APIs to Plasmic's window object
export function PlasmicApiHelper() {
    const editor = useEditor()
    const app = useApp()
    const enc = useEncaminha()
    const timer = useTimer()
    const sheets = useGoogleSheets()

    React.useEffect(() => {
        // Attach to window for Plasmic run code access
        ;(window as any).framerBloco = editor
        ;(window as any).framerApp = app
        ;(window as any).framerEncaminha = enc
        ;(window as any).framerTimer = timer
        ;(window as any).framerGoogleSheets = sheets

        return () => {
            delete (window as any).framerBloco
            delete (window as any).framerApp
            delete (window as any).framerEncaminha
            delete (window as any).framerTimer
            delete (window as any).framerGoogleSheets
        }
    }, [editor, app, enc, timer, sheets])

    return null
}
