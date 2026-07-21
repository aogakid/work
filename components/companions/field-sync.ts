const SYNC_EVENT = "field-sync"

export interface FieldSyncPayload {
    source: string
    values: Record<string, string>
}

export function broadcastFieldSync(source: string, values: Record<string, string>) {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { source, values } }))
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
