import * as React from "react"
import CalendarUI from "../ui/calendar_ui"
import type { CompanionActions } from "./registry"

const AgendaCompanion = React.forwardRef<CompanionActions>(function AgendaCompanion(_props, ref) {
    const getOutput = () => null
    const reset = () => undefined

    React.useImperativeHandle(ref, () => ({ getOutput, reset }), [])

    return <CalendarUI />
})

export default AgendaCompanion
