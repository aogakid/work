const SYNC_EVENT = "field-sync"

const lastValues: Record<string, string> = {}

export interface FieldSyncPayload {
    source: string
    values: Record<string, string>
}

export function broadcastFieldSync(source: string, values: Record<string, string>, rememberEmpty = false) {
    for (const key of Object.keys(values)) {
        if (values[key] !== undefined && (rememberEmpty || values[key] !== "")) lastValues[key] = values[key]
    }
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { source, values } }))
}

export function getFieldSyncSnapshot(): Record<string, string> {
    return { ...lastValues }
}

export function listenFieldSync(
    handler: (payload: FieldSyncPayload) => void
): () => void {
    const listener = (e: Event) => {
        handler((e as CustomEvent).detail)
    }
    window.addEventListener(SYNC_EVENT, listener)
    return () => window.removeEventListener(SYNC_EVENT, listener)
}
