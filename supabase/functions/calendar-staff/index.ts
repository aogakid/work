import { createClient } from "npm:@supabase/supabase-js@2"

interface RequestBody {
    action?: string
    calendarId?: string
    name?: string
    description?: string | null
    color?: string
    defaultDurationMinutes?: number | null
    password?: string
    appointmentId?: string
    appointment?: {
        appointment_date?: string
        start_time?: string | null
        patient_name?: string
        staff_id?: string | null
        custom_values?: Record<string, unknown>
    }
    field?: {
        field_key?: string
        label?: string
        field_type?: string
        is_required?: boolean
        options?: string[]
        display_order?: number
    }
    fieldId?: string
    fieldUpdates?: { is_active?: boolean; is_required?: boolean }
    staff?: { name?: string; color?: string }
    staffId?: string
    hours?: { weekday?: number; period?: number; starts_at?: string; ends_at?: string }[]
    timeBlock?: { label?: string; starts_at?: string; ends_at?: string }
}

interface HashParts {
    iterations: number
    salt: Uint8Array
    hash: Uint8Array
}

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const jsonResponse = (status: number, payload: Record<string, unknown>) => new Response(
    JSON.stringify(payload),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
)

const encodeBase64 = (bytes: Uint8Array): string => {
    let binary = ""
    bytes.forEach(byte => { binary += String.fromCharCode(byte) })
    return btoa(binary)
}

const decodeBase64 = (value: string): Uint8Array => {
    const binary = atob(value)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
    return bytes
}

const derivePassword = async (password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> => {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"])
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256)
    return new Uint8Array(bits)
}

const createPasswordHash = async (password: string): Promise<string> => {
    const iterations = 210000
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const hash = await derivePassword(password, salt, iterations)
    return "pbkdf2$" + iterations + "$" + encodeBase64(salt) + "$" + encodeBase64(hash)
}

const parsePasswordHash = (value: string): HashParts | null => {
    const pieces = value.split("$")
    if (pieces.length !== 4 || pieces[0] !== "pbkdf2") return null
    const iterations = Number(pieces[1])
    if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 1000000) return null
    return { iterations, salt: decodeBase64(pieces[2]), hash: decodeBase64(pieces[3]) }
}

const passwordsMatch = async (password: string, encodedHash: string): Promise<boolean> => {
    const parts = parsePasswordHash(encodedHash)
    if (!parts) return false
    const candidate = await derivePassword(password, parts.salt, parts.iterations)
    if (candidate.length !== parts.hash.length) return false
    let difference = 0
    for (let index = 0; index < candidate.length; index++) difference |= candidate[index] ^ parts.hash[index]
    return difference === 0
}

Deno.serve(async request => {
    if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
    if (request.method !== "POST") return jsonResponse(405, { error: "Use POST." })

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
    const secretMap = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}") as Record<string, string>
    const serviceKey = secretMap.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    if (!supabaseUrl || !serviceKey) return jsonResponse(500, { error: "Supabase server credentials are not configured." })

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    let body: RequestBody
    try {
        body = await request.json() as RequestBody
    } catch {
        return jsonResponse(400, { error: "Invalid JSON body." })
    }

    if (body.action === "create_calendar") {
        const name = body.name?.trim() || ""
        const password = body.password || ""
        if (!name) return jsonResponse(400, { error: "Calendar name is required." })
        if (password.length < 4) return jsonResponse(400, { error: "Use a calendar password with at least 4 characters." })
        if (password.length > 256) return jsonResponse(400, { error: "Calendar password is too long." })
        const hours = Array.isArray(body.hours) ? body.hours : []
        if (!hours.length || hours.length > 14) return jsonResponse(400, { error: "Select at least one opening period." })
        const seenPeriods = new Set<string>()
        for (const period of hours) {
            const weekday = period.weekday
            const periodNumber = period.period
            const startsAt = period.starts_at || ""
            const endsAt = period.ends_at || ""
            const key = `${weekday}-${periodNumber}`
            if (!Number.isInteger(weekday) || weekday === undefined || weekday < 0 || weekday > 6 || !Number.isInteger(periodNumber) || periodNumber === undefined || (periodNumber !== 1 && periodNumber !== 2)) {
                return jsonResponse(400, { error: "Invalid weekday or opening period." })
            }
            if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startsAt) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endsAt) || startsAt >= endsAt) {
                return jsonResponse(400, { error: "Opening periods need a valid start time before their end time." })
            }
            if (seenPeriods.has(key)) return jsonResponse(400, { error: "Each weekday can only have one morning and one afternoon period." })
            seenPeriods.add(key)
        }
        const { data: calendar, error: calendarError } = await admin.from("calendars").insert({
            name,
            description: body.description?.trim() || null,
            color: body.color || "#287a70",
            default_duration_minutes: body.defaultDurationMinutes || null,
        }).select("*").single()
        if (calendarError || !calendar) return jsonResponse(400, { error: calendarError?.message || "Could not create calendar." })
        const passwordHash = await createPasswordHash(password)
        const { error: accessError } = await admin.from("calendar_staff_access").insert({
            calendar_id: calendar.id,
            password_hash: passwordHash,
        })
        if (accessError) {
            await admin.from("calendars").delete().eq("id", calendar.id)
            return jsonResponse(500, { error: "Calendar password setup failed. The new calendar was rolled back." })
        }
        const { error: hoursError } = await admin.from("calendar_hours").insert(hours.map(period => ({
            calendar_id: calendar.id,
            weekday: period.weekday,
            period: period.period,
            starts_at: period.starts_at,
            ends_at: period.ends_at,
        })))
        if (hoursError) {
            await admin.from("calendars").delete().eq("id", calendar.id)
            return jsonResponse(500, { error: "Calendar hours could not be saved. The new calendar was rolled back." })
        }
        return jsonResponse(201, { calendar })
    }

    if (!body.calendarId || !body.password) return jsonResponse(400, { error: "Calendar and password are required." })
    if (body.password.length > 256) return jsonResponse(400, { error: "Calendar password is too long." })
    const sourceAddress = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown"
    const sourceDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sourceAddress))
    const sourceHash = Array.from(new Uint8Array(sourceDigest)).map(byte => byte.toString(16).padStart(2, "0")).join("")
    const { data: canAttempt, error: limitError } = await admin.rpc("can_attempt_calendar_staff_password", {
        p_calendar_id: body.calendarId,
        p_source_hash: sourceHash,
    })
    if (limitError) return jsonResponse(503, { error: "Staff password verification is temporarily unavailable." })
    if (!canAttempt) return jsonResponse(429, { error: "Too many incorrect attempts. Try again in 15 minutes." })
    const { data: access, error: accessError } = await admin.from("calendar_staff_access")
        .select("password_hash").eq("calendar_id", body.calendarId).maybeSingle()
    if (accessError) return jsonResponse(500, { error: "Could not check calendar password." })
    if (!access || !(await passwordsMatch(body.password, access.password_hash))) {
        await admin.rpc("record_calendar_staff_password_failure", { p_calendar_id: body.calendarId, p_source_hash: sourceHash })
        return jsonResponse(401, { error: "Incorrect calendar password." })
    }
    await admin.rpc("clear_calendar_staff_password_failures", { p_calendar_id: body.calendarId, p_source_hash: sourceHash })

    if (body.action === "verify_password") return jsonResponse(200, { valid: true })

    if (body.action === "update_calendar_hours") {
        const hours = body.hours
        if (!Array.isArray(hours) || hours.length < 1 || hours.length > 14) {
            return jsonResponse(400, { error: "Select between one and fourteen opening periods." })
        }
        const seenPeriods = new Set<string>()
        const periodsByWeekday = new Map<number, { morningEnd?: string; secondShiftStart?: string }>()
        for (const period of hours) {
            if (!period || typeof period !== "object") return jsonResponse(400, { error: "Each opening period must be an object." })
            const weekday = period.weekday
            const session = period.period
            const startsAt = period.starts_at
            const endsAt = period.ends_at
            if (!Number.isInteger(weekday) || weekday! < 0 || weekday! > 6 || ![1, 2].includes(session || 0)) {
                return jsonResponse(400, { error: "Each opening period needs a valid weekday and session." })
            }
            if (typeof startsAt !== "string" || typeof endsAt !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startsAt) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endsAt) || startsAt >= endsAt) {
                return jsonResponse(400, { error: "Opening periods need a valid start time before their end time." })
            }
            const key = `${weekday}-${session}`
            if (seenPeriods.has(key)) return jsonResponse(400, { error: "Each weekday can only have one morning and one second-shift period." })
            seenPeriods.add(key)
            const weekdayPeriods = periodsByWeekday.get(weekday!) || {}
            if (session === 1) weekdayPeriods.morningEnd = endsAt
            if (session === 2) weekdayPeriods.secondShiftStart = startsAt
            periodsByWeekday.set(weekday!, weekdayPeriods)
        }
        for (const weekdayPeriods of periodsByWeekday.values()) {
            if (weekdayPeriods.secondShiftStart && weekdayPeriods.morningEnd && weekdayPeriods.secondShiftStart < weekdayPeriods.morningEnd) {
                return jsonResponse(400, { error: "The second shift must start after the morning period ends." })
            }
        }
        const { error } = await admin.rpc("replace_calendar_hours", {
            p_calendar_id: body.calendarId,
            p_hours: hours,
        })
        if (error) return jsonResponse(400, { error: error.message })
        return jsonResponse(200, { updated: true })
    }

    if (body.action === "create_field") {
        const field = body.field
        if (!field?.label?.trim() || !field.field_key?.trim()) return jsonResponse(400, { error: "Field label and key are required." })
        if (!["text", "number", "date", "boolean", "dropdown", "multi_select"].includes(field.field_type || "")) return jsonResponse(400, { error: "Invalid field type." })
        const options = Array.isArray(field.options) ? field.options.filter(option => typeof option === "string").slice(0, 50) : []
        if ((field.field_type === "dropdown" || field.field_type === "multi_select") && !options.length) return jsonResponse(400, { error: "Choice fields need at least one option." })
        const { data, error } = await admin.from("calendar_fields").insert({
            calendar_id: body.calendarId,
            field_key: field.field_key.trim().slice(0, 80),
            label: field.label.trim().slice(0, 100),
            field_type: field.field_type,
            is_required: Boolean(field.is_required),
            options,
            display_order: Number.isInteger(field.display_order) ? field.display_order : 0,
        }).select("id").single()
        if (error) return jsonResponse(400, { error: error.message })
        return jsonResponse(201, { fieldId: data.id })
    }

    if (body.action === "update_field") {
        if (!body.fieldId || !body.fieldUpdates || typeof body.fieldUpdates !== "object") {
            return jsonResponse(400, { error: "Field and update details are required." })
        }
        const updates: { is_active?: boolean; is_required?: boolean } = {}
        if (typeof body.fieldUpdates.is_active === "boolean") updates.is_active = body.fieldUpdates.is_active
        if (typeof body.fieldUpdates.is_required === "boolean") updates.is_required = body.fieldUpdates.is_required
        if (!Object.keys(updates).length) return jsonResponse(400, { error: "Choose whether the field is active or required." })
        const { data, error } = await admin.from("calendar_fields").update(updates)
            .eq("id", body.fieldId).eq("calendar_id", body.calendarId).select("id").maybeSingle()
        if (error) return jsonResponse(400, { error: error.message })
        if (!data) return jsonResponse(404, { error: "Field not found in this calendar." })
        return jsonResponse(200, { updated: true })
    }

    if (body.action === "create_staff") {
        const person = body.staff
        if (!person?.name?.trim()) return jsonResponse(400, { error: "Staff name is required." })
        const name = person.name.trim().slice(0, 120)
        const { data: existingStaff, error: lookupError } = await admin.from("staff")
            .select("id,name").eq("calendar_id", body.calendarId)
        if (lookupError) return jsonResponse(400, { error: lookupError.message })
        const matchingStaff = (existingStaff || []).find(member => member.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())
        if (matchingStaff) {
            const { data, error } = await admin.from("staff").update({
                color: person.color || "#64748b",
                is_active: true,
            }).eq("id", matchingStaff.id).eq("calendar_id", body.calendarId).select("id").single()
            if (error) return jsonResponse(400, { error: error.message })
            return jsonResponse(200, { staffId: data.id, restored: true })
        }
        const { data, error } = await admin.from("staff").insert({
            calendar_id: body.calendarId,
            name,
            color: person.color || "#64748b",
        }).select("id").single()
        if (error) return jsonResponse(400, { error: error.message })
        return jsonResponse(201, { staffId: data.id })
    }

    if (body.action === "remove_staff") {
        if (!body.staffId) return jsonResponse(400, { error: "Staff ID is required." })
        const { data, error } = await admin.from("staff").update({ is_active: false })
            .eq("id", body.staffId).eq("calendar_id", body.calendarId).eq("is_active", true).select("id")
        if (error) return jsonResponse(400, { error: error.message })
        if (!data?.length) return jsonResponse(404, { error: "Active staff member not found." })
        return jsonResponse(200, { removed: true })
    }

    if (body.action === "create_time_block") {
        const block = body.timeBlock
        if (!block?.label?.trim() || !block.starts_at || !block.ends_at || new Date(block.ends_at) <= new Date(block.starts_at)) {
            return jsonResponse(400, { error: "Provide a valid label, start, and end for the time block." })
        }
        const { data, error } = await admin.from("time_blocks").insert({
            calendar_id: body.calendarId,
            label: block.label.trim().slice(0, 160),
            starts_at: block.starts_at,
            ends_at: block.ends_at,
        }).select("id").single()
        if (error) return jsonResponse(400, { error: error.message })
        return jsonResponse(201, { blockId: data.id })
    }

    if (body.action === "update_appointment") {
        if (!body.appointmentId || !body.appointment) return jsonResponse(400, { error: "Appointment details are required." })
        const changes = body.appointment
        const update: Record<string, unknown> = {}
        if (typeof changes.appointment_date === "string") update.appointment_date = changes.appointment_date
        if (typeof changes.start_time === "string" || changes.start_time === null) update.start_time = changes.start_time
        if (typeof changes.patient_name === "string" && changes.patient_name.trim()) update.patient_name = changes.patient_name.trim()
        if (typeof changes.staff_id === "string" || changes.staff_id === null) update.staff_id = changes.staff_id
        if (changes.custom_values && typeof changes.custom_values === "object" && !Array.isArray(changes.custom_values)) update.custom_values = changes.custom_values
        update.updated_at = new Date().toISOString()
        const { data, error } = await admin.from("appointments").update(update)
            .eq("id", body.appointmentId).eq("calendar_id", body.calendarId).eq("status", "scheduled").select("id")
        if (error) return jsonResponse(400, { error: error.message })
        if (!data?.length) return jsonResponse(404, { error: "Appointment not found." })
        return jsonResponse(200, { updated: true })
    }

    if (body.action === "delete_appointment") {
        if (!body.appointmentId) return jsonResponse(400, { error: "Appointment ID is required." })
        const { data, error } = await admin.from("appointments").update({ status: "deleted", updated_at: new Date().toISOString() })
            .eq("id", body.appointmentId).eq("calendar_id", body.calendarId).eq("status", "scheduled").select("id")
        if (error) return jsonResponse(400, { error: error.message })
        if (!data?.length) return jsonResponse(404, { error: "Appointment not found." })
        return jsonResponse(200, { deleted: true })
    }

    return jsonResponse(400, { error: "Unknown action." })
})
