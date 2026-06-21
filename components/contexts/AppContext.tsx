import { createContext, useContext, useRef, useEffect, type ReactNode } from "react"

// ---------------------------------------------------------------------------
// 1. GoogleSheetsContext  (replaces window.framerGoogleSheetsApi)
// ---------------------------------------------------------------------------
export interface GoogleSheetsApi {
    textoInput: string
    enviarParaPlanilha?: () => Promise<void>
}

export const GoogleSheetsContext = createContext<GoogleSheetsApi | null>(null)

export function useGoogleSheets(): GoogleSheetsApi {
    const ctx = useContext(GoogleSheetsContext)
    const fallbackRef = useRef<GoogleSheetsApi | null>(null)
    if (!fallbackRef.current) {
        fallbackRef.current = { textoInput: "" }
    }
    return ctx || fallbackRef.current
}

export function GoogleSheetsProvider({ children }: { children: ReactNode }) {
    const api = useRef<GoogleSheetsApi>({ textoInput: "" }).current

    // Attach to globalThis for Plasmic access
    useEffect(() => {
        ;(globalThis as unknown as { framerGoogleSheets?: GoogleSheetsApi }).framerGoogleSheets = api
        return () => {
            ;(globalThis as unknown as { framerGoogleSheets?: GoogleSheetsApi }).framerGoogleSheets = undefined
        }
    }, [api])

    return (
        <GoogleSheetsContext.Provider value={api}>
            {children}
        </GoogleSheetsContext.Provider>
    )
}

// ---------------------------------------------------------------------------
// 2. AppContext  (replaces window.framerAppApi)
// ---------------------------------------------------------------------------
export interface AppApi {
    textoInput: string
    setTextoInput: (t: string) => void
    isStreaming: boolean
    executarPrompt?: () => void
    copiarOutput?: () => void
    colarNoInput?: () => void
    limparTudo?: () => void
}

export const AppContext = createContext<AppApi | null>(null)

export function useApp(): AppApi {
    const ctx = useContext(AppContext)
    const fallbackRef = useRef<AppApi | null>(null)
    if (!fallbackRef.current) {
        fallbackRef.current = {
            textoInput: "",
            setTextoInput: () => {},
            isStreaming: false,
        }
    }
    return ctx || fallbackRef.current
}

export function AppProvider({ children }: { children: ReactNode }) {
    const api = useRef<AppApi>({
        textoInput: "",
        setTextoInput: () => {},
        isStreaming: false,
    }).current

    // Attach to globalThis for Plasmic access
    useEffect(() => {
        ;(globalThis as unknown as { framerApp?: AppApi }).framerApp = api
        return () => {
            ;(globalThis as unknown as { framerApp?: AppApi }).framerApp = undefined
        }
    }, [api])

    return (
        <AppContext.Provider value={api}>{children}</AppContext.Provider>
    )
}

// ---------------------------------------------------------------------------
// 3. EncaminhaContext  (replaces window.framerEncaminhaApi)
// ---------------------------------------------------------------------------
export interface EncaminhaApi {
    textoInput: string
    setTextoInput: (t: string) => void
    especialidade: string
    setEspecialidade: (t: string) => void
    isStreaming: boolean
    executarEncaminhamento?: () => void
    copiarOutput?: () => void
    colarNoInput?: () => void
    limparTudo?: () => void
}

export const EncaminhaContext = createContext<EncaminhaApi | null>(null)

export function useEncaminha(): EncaminhaApi {
    const ctx = useContext(EncaminhaContext)
    const fallbackRef = useRef<EncaminhaApi | null>(null)
    if (!fallbackRef.current) {
        fallbackRef.current = {
            textoInput: "",
            setTextoInput: () => {},
            especialidade: "",
            setEspecialidade: () => {},
            isStreaming: false,
        }
    }
    return ctx || fallbackRef.current
}

export function EncaminhaProvider({ children }: { children: ReactNode }) {
    const api = useRef<EncaminhaApi>({
        textoInput: "",
        setTextoInput: () => {},
        especialidade: "",
        setEspecialidade: () => {},
        isStreaming: false,
    }).current

    // Attach to globalThis for Plasmic access
    useEffect(() => {
        ;(globalThis as unknown as { framerEncaminha?: EncaminhaApi }).framerEncaminha = api
        return () => {
            ;(globalThis as unknown as { framerEncaminha?: EncaminhaApi }).framerEncaminha = undefined
        }
    }, [api])

    return (
        <EncaminhaContext.Provider value={api}>
            {children}
        </EncaminhaContext.Provider>
    )
}

// ---------------------------------------------------------------------------
// 4. EditorContext  (replaces window.framerEditorApi)
// ---------------------------------------------------------------------------
export interface EditorApi {
    copiar: () => void
    colar: () => void
    substituir: (novoTexto: string) => void
}

export const EditorContext = createContext<EditorApi | null>(null)

export function useEditor(): EditorApi {
    const ctx = useContext(EditorContext)
    const fallbackRef = useRef<EditorApi | null>(null)
    if (!fallbackRef.current) {
        fallbackRef.current = {
            copiar: () => {},
            colar: () => {},
            substituir: () => {},
        }
    }
    return ctx || fallbackRef.current
}

export function EditorProvider({ children }: { children: ReactNode }) {
    const api = useRef<EditorApi>({
        copiar: () => {},
        colar: () => {},
        substituir: () => {},
    }).current

    // Attach to globalThis for Plasmic access
    useEffect(() => {
        ;(globalThis as unknown as { framerBloco?: EditorApi }).framerBloco = api
        return () => {
            ;(globalThis as unknown as { framerBloco?: EditorApi }).framerBloco = undefined
        }
    }, [api])

    return (
        <EditorContext.Provider value={api}>{children}</EditorContext.Provider>
    )
}

// ---------------------------------------------------------------------------
// 5. TimerContext  (replaces window.framerTimerApi)
// ---------------------------------------------------------------------------
export interface TimerApi {
    ativarCronometro: () => void
}

export const TimerContext = createContext<TimerApi | null>(null)

export function useTimer(): TimerApi {
    const ctx = useContext(TimerContext)
    const fallbackRef = useRef<TimerApi | null>(null)
    if (!fallbackRef.current) {
        fallbackRef.current = {
            ativarCronometro: () => {},
        }
    }
    return ctx || fallbackRef.current
}

export function TimerProvider({ children }: { children: ReactNode }) {
    const api = useRef<TimerApi>({
        ativarCronometro: () => {},
    }).current

    // Attach to globalThis for Plasmic access
    useEffect(() => {
        ;(globalThis as unknown as { framerTimer?: TimerApi }).framerTimer = api
        return () => {
            ;(globalThis as unknown as { framerTimer?: TimerApi }).framerTimer = undefined
        }
    }, [api])

    return (
        <TimerContext.Provider value={api}>{children}</TimerContext.Provider>
    )
}

// ---------------------------------------------------------------------------
// Combined provider — wraps all contexts for convenience
// ---------------------------------------------------------------------------
export function AllProviders({ children }: { children: ReactNode }) {
    return (
        <GoogleSheetsProvider>
            <AppProvider>
                <EncaminhaProvider>
                    <EditorProvider>
                        <TimerProvider>{children}</TimerProvider>
                    </EditorProvider>
                </EncaminhaProvider>
            </AppProvider>
        </GoogleSheetsProvider>
    )
}
