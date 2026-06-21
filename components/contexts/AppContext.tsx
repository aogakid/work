import { createContext, useContext, useRef, type ReactNode } from "react"

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
    if (!ctx)
        throw new Error(
            "useGoogleSheets must be used within a GoogleSheetsContext.Provider"
        )
    return ctx
}

export function GoogleSheetsProvider({ children }: { children: ReactNode }) {
    const api = useRef<GoogleSheetsApi>({ textoInput: "" }).current
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
    if (!ctx)
        throw new Error("useApp must be used within an AppContext.Provider")
    return ctx
}

export function AppProvider({ children }: { children: ReactNode }) {
    const api = useRef<AppApi>({
        textoInput: "",
        setTextoInput: () => {},
        isStreaming: false,
    }).current
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
    if (!ctx)
        throw new Error(
            "useEncaminha must be used within an EncaminhaContext.Provider"
        )
    return ctx
}

export function EncaminhaProvider({ children }: { children: ReactNode }) {
    const api = useRef<EncaminhaApi>({
        textoInput: "",
        setTextoInput: () => {},
        especialidade: "",
        setEspecialidade: () => {},
        isStreaming: false,
    }).current
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
    if (!ctx)
        throw new Error(
            "useEditor must be used within an EditorContext.Provider"
        )
    return ctx
}

export function EditorProvider({ children }: { children: ReactNode }) {
    const api = useRef<EditorApi>({
        copiar: () => {},
        colar: () => {},
        substituir: () => {},
    }).current
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
    if (!ctx)
        throw new Error(
            "useTimer must be used within a TimerContext.Provider"
        )
    return ctx
}

export function TimerProvider({ children }: { children: ReactNode }) {
    const api = useRef<TimerApi>({
        ativarCronometro: () => {},
    }).current
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
