import * as React from "react"
import supabase from "../../lib/calendar-supabase"
import { PDFDocument, PDFHexString, PDFName } from "pdf-lib"

interface CalendarRecord {
    id: string
    name: string
    description: string | null
    color: string
    default_duration_minutes: number | null
}

interface CalendarField {
    id: string
    calendar_id: string
    field_key: string
    label: string
    field_type: string
    is_required: boolean
    is_active: boolean
    options: string[]
    display_order: number
}

interface StaffRecord {
    id: string
    calendar_id: string
    name: string
    color: string
    is_active: boolean
}

interface AppointmentRecord {
    id: string
    calendar_id: string
    appointment_date: string
    start_time: string | null
    patient_name: string
    staff_id: string | null
    custom_values: Record<string, unknown>
    status: string
    created_at: string
}

interface TimeBlockRecord {
    id: string
    calendar_id: string
    label: string
    starts_at: string
    ends_at: string
}

interface CalendarHour {
    id?: string
    calendar_id?: string
    weekday: number
    period: number
    starts_at: string
    ends_at: string
}

interface CalendarMetadata {
    fields: CalendarField[]
    staff: StaffRecord[]
    hours: CalendarHour[]
    loadedAt: number
}

interface CalendarScheduleDay {
    weekday: number
    enabled: boolean
    morningStart: string
    morningEnd: string
    afternoonEnabled: boolean
    afternoonStart: string
    afternoonEnd: string
}

type CalendarView = "month" | "week"

const PALETA_CORES = [
    { nome: "Azul", valor: "#3b82f6" },
    { nome: "Índigo", valor: "#6366f1" },
    { nome: "Violeta", valor: "#8b5cf6" },
    { nome: "Rosa", valor: "#ec4899" },
    { nome: "Vermelho", valor: "#ef4444" },
    { nome: "Laranja", valor: "#f97316" },
    { nome: "Âmbar", valor: "#f59e0b" },
    { nome: "Verde", valor: "#22c55e" },
    { nome: "Turquesa", valor: "#14b8a6" },
    { nome: "Ciano", valor: "#06b6d4" },
    { nome: "Ardósia", valor: "#64748b" },
    { nome: "Pedra", valor: "#78716c" },
]

const DIAS_SEMANA = [
    { weekday: 1, name: "Segunda-feira" },
    { weekday: 2, name: "Terça-feira" },
    { weekday: 3, name: "Quarta-feira" },
    { weekday: 4, name: "Quinta-feira" },
    { weekday: 5, name: "Sexta-feira" },
    { weekday: 6, name: "Sábado" },
    { weekday: 0, name: "Domingo" },
]

const horarioPadrao = (): CalendarScheduleDay[] => DIAS_SEMANA.map(day => ({
    weekday: day.weekday,
    enabled: day.weekday >= 1 && day.weekday <= 5,
    morningStart: "08:00",
    morningEnd: "12:00",
    afternoonEnabled: day.weekday >= 1 && day.weekday <= 5,
    afternoonStart: "13:00",
    afternoonEnd: "17:00",
}))

const hojeIso = (): string => {
    const agora = new Date()
    const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 10)
}

const limitesDoDia = (valor: string): { inicio: string; fim: string } => {
    const [ano, mes, dia] = valor.split("-").map(Number)
    return {
        inicio: new Date(ano, mes - 1, dia).toISOString(),
        fim: new Date(ano, mes - 1, dia + 1).toISOString(),
    }
}

const rotuloData = (valor: string): string => {
    if (!valor) return ""
    return new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(valor + "T12:00:00"))
}

const isoLocal = (data: Date): string => {
    const ano = data.getFullYear()
    const mes = String(data.getMonth() + 1).padStart(2, "0")
    const dia = String(data.getDate()).padStart(2, "0")
    return `${ano}-${mes}-${dia}`
}

const deslocarData = (valor: string, dias: number): string => {
    const [ano, mes, dia] = valor.split("-").map(Number)
    return isoLocal(new Date(ano, mes - 1, dia + dias, 12))
}

const datasVisiveis = (valor: string, visualizacao: CalendarView): string[] => {
    const [ano, mes, dia] = valor.split("-").map(Number)
    const selecionada = new Date(ano, mes - 1, dia, 12)
    const deslocamentoSegunda = (selecionada.getDay() + 6) % 7
    const inicio = visualizacao === "week"
        ? new Date(ano, mes - 1, dia - deslocamentoSegunda, 12)
        : new Date(ano, mes - 1, 1 - (new Date(ano, mes - 1, 1, 12).getDay() + 6) % 7, 12)
    const total = visualizacao === "week" ? 7 : 42
    return Array.from({ length: total }, (_, index) => isoLocal(new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + index, 12)))
}

const moverDataVisao = (valor: string, visualizacao: CalendarView, direcao: number): string => {
    if (visualizacao === "week") return deslocarData(valor, direcao * 7)
    const [ano, mes, dia] = valor.split("-").map(Number)
    const novoMes = new Date(ano, mes - 1 + direcao, 1, 12)
    const ultimoDia = new Date(novoMes.getFullYear(), novoMes.getMonth() + 1, 0, 12).getDate()
    return isoLocal(new Date(novoMes.getFullYear(), novoMes.getMonth(), Math.min(dia, ultimoDia), 12))
}

const rotuloMes = (valor: string): string => new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(valor + "T12:00:00"))

const rotuloHora = (valor: string | null): string => valor ? valor.slice(0, 5) : "Sem horário"

const rotuloHoraCompacto = (valor: string): string => {
    const [hora, minuto] = valor.slice(0, 5).split(":")
    return `${Number(hora)}h${minuto === "00" ? "" : minuto}`
}

const rotuloDiaComHorario = (weekday: number, nome: string, hours: CalendarHour[]): string => {
    const primeiroHorario = hours.filter(item => item.weekday === weekday).map(item => item.starts_at.slice(0, 5)).sort()[0]
    return `${nome.slice(0, 3)}${primeiroHorario ? ` - ${rotuloHoraCompacto(primeiroHorario)}` : ""}`
}

const stringArray = (valor: unknown): string[] => Array.isArray(valor) ? valor.map(item => String(item)) : []

const textoDoCampo = (valor: unknown): string => Array.isArray(valor) ? valor.map(item => String(item)).join(", ") : String(valor)

const capitalizarSeTudoMaiusculo = (valor: string): string => {
    const letras = valor.match(/\p{L}/gu) || []
    if (!letras.length || valor !== valor.toLocaleUpperCase("pt-BR")) return valor
    return valor.toLocaleLowerCase("pt-BR").replace(/(^|[\s-])(\p{L})/gu, (_, separador: string, letra: string) => separador + letra.toLocaleUpperCase("pt-BR"))
}

const corMisturada = (inicio: string, fim: string, proporcao: number, alpha: number): string => {
    const start = [1, 3, 5].map(offset => parseInt(inicio.slice(offset, offset + 2), 16))
    const end = [1, 3, 5].map(offset => parseInt(fim.slice(offset, offset + 2), 16))
    const color = start.map((channel, index) => Math.round(channel + (end[index] - channel) * proporcao))
    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`
}

const corDoDia = (count: number, p50: number, max: number): { background: string; border: string } => {
    const green = "#22c55e"
    const yellow = "#eab308"
    const red = "#ef4444"
    if (count === 0 || max === 0) return { background: corMisturada(green, green, 0, 0.14), border: corMisturada(green, green, 0, 0.28) }
    if (count >= max) return { background: corMisturada(red, red, 0, 0.16), border: corMisturada(red, red, 0, 0.32) }
    if (count === p50) return { background: corMisturada(yellow, yellow, 0, 0.17), border: corMisturada(yellow, yellow, 0, 0.34) }
    if (count < p50) {
        const ratio = p50 > 0 ? count / p50 : 0
        return { background: corMisturada(green, yellow, ratio, 0.15), border: corMisturada(green, yellow, ratio, 0.3) }
    }
    const ratio = max > p50 ? (count - p50) / (max - p50) : 1
    return { background: corMisturada(yellow, red, ratio, 0.16), border: corMisturada(yellow, red, ratio, 0.32) }
}

const chaveDoCampo = (rotulo: string): string => {
    const base = rotulo.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
    return base || "campo"
}

const carregarCalendarios = async (): Promise<CalendarRecord[]> => {
    const { data, error } = await supabase.from("calendars").select("*").eq("is_active", true).order("created_at")
    if (error) throw error
    return (data || []) as unknown as CalendarRecord[]
}

const carregarMetadadosCalendario = async (calendarId: string) => {
    const [fieldsResult, staffResult, hoursResult] = await Promise.all([
        supabase.from("calendar_fields").select("*").eq("calendar_id", calendarId).order("display_order"),
        supabase.from("staff").select("*").eq("calendar_id", calendarId).order("name"),
        supabase.from("calendar_hours").select("*").eq("calendar_id", calendarId).order("weekday").order("period"),
    ])
    const error = fieldsResult.error || staffResult.error || hoursResult.error
    if (error) throw error
    return {
        fields: (fieldsResult.data || []) as unknown as CalendarField[],
        staff: (staffResult.data || []) as unknown as StaffRecord[],
        hours: (hoursResult.data || []) as unknown as CalendarHour[],
    }
}

const carregarDetalhesDoDia = async (calendarId: string, data: string) => {
    const limite = limitesDoDia(data)
    const [appointmentsResult, blocksResult] = await Promise.all([
        supabase.from("appointments").select("*").eq("calendar_id", calendarId).eq("appointment_date", data).eq("status", "scheduled").order("start_time").order("created_at"),
        supabase.from("time_blocks").select("*").eq("calendar_id", calendarId).lt("starts_at", limite.fim).gte("ends_at", limite.inicio).order("starts_at"),
    ])
    const error = appointmentsResult.error || blocksResult.error
    if (error) throw error
    return {
        appointments: (appointmentsResult.data || []) as unknown as AppointmentRecord[],
        blocks: (blocksResult.data || []) as unknown as TimeBlockRecord[],
    }
}

const carregarDetalhes = async (calendarId: string, data: string, cachedMetadata?: CalendarMetadata) => {
    const [metadata, dayDetails] = await Promise.all([
        cachedMetadata ? Promise.resolve(cachedMetadata) : carregarMetadadosCalendario(calendarId).then(details => ({ ...details, loadedAt: Date.now() })),
        carregarDetalhesDoDia(calendarId, data),
    ])
    return { ...metadata, ...dayDetails }
}

const carregarMaximoHistoricoDeConsultas = async (calendarId: string): Promise<number> => {
    const pageSize = 1000
    const counts: Record<string, number> = {}
    let offset = 0
    while (true) {
        const { data, error } = await supabase.from("appointments").select("appointment_date")
            .eq("calendar_id", calendarId).eq("status", "scheduled")
            .order("appointment_date").range(offset, offset + pageSize - 1)
        if (error) throw error
        const rows = data || []
        rows.forEach(row => { counts[row.appointment_date] = (counts[row.appointment_date] || 0) + 1 })
        if (rows.length < pageSize) break
        offset += pageSize
    }
    return Math.max(0, ...Object.values(counts))
}

export default function CalendarUI() {
    const [calendars, setCalendars] = React.useState<CalendarRecord[]>([])
    const [selectedCalendarId, setSelectedCalendarId] = React.useState("")
    const [selectedDate, setSelectedDate] = React.useState("2000-01-01")
    const [hasMounted, setHasMounted] = React.useState(false)
    const [loadedDetailsKey, setLoadedDetailsKey] = React.useState("")
    const [calendarMetadataById, setCalendarMetadataById] = React.useState<Record<string, CalendarMetadata>>({})
    const detailsRequestSequence = React.useRef(0)
    const [calendarView, setCalendarView] = React.useState<CalendarView>("month")
    const [darkMode, setDarkMode] = React.useState(false)
    const [appointmentCounts, setAppointmentCounts] = React.useState<Record<string, number>>({})
    const [appointmentNamesByDate, setAppointmentNamesByDate] = React.useState<Record<string, string[]>>({})
    const [allTimeMaxAppointments, setAllTimeMaxAppointments] = React.useState<Record<string, number>>({})
    const [fields, setFields] = React.useState<CalendarField[]>([])
    const [staff, setStaff] = React.useState<StaffRecord[]>([])
    const [appointments, setAppointments] = React.useState<AppointmentRecord[]>([])
    const [blocks, setBlocks] = React.useState<TimeBlockRecord[]>([])
    const [calendarHours, setCalendarHours] = React.useState<CalendarHour[]>([])
    const [loading, setLoading] = React.useState(true)
    const [saving, setSaving] = React.useState(false)
    const [staffUnlocking, setStaffUnlocking] = React.useState(false)
    const [removingStaffId, setRemovingStaffId] = React.useState("")
    const [error, setError] = React.useState("")
    const [notice, setNotice] = React.useState("")
    const [appointmentNotice, setAppointmentNotice] = React.useState("")
    const appointmentNoticeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const [showCalendarForm, setShowCalendarForm] = React.useState(false)
    const [showStaffPasswordDialog, setShowStaffPasswordDialog] = React.useState(false)
    const [showStaffManagerDialog, setShowStaffManagerDialog] = React.useState(false)
    const [showScheduleEditModal, setShowScheduleEditModal] = React.useState(false)
    const [showFieldForm, setShowFieldForm] = React.useState(false)
    const [showStaffForm, setShowStaffForm] = React.useState(false)
    const [showBlockForm, setShowBlockForm] = React.useState(false)
    const [calendarName, setCalendarName] = React.useState("")
    const [calendarDescription, setCalendarDescription] = React.useState("")
    const [calendarColor, setCalendarColor] = React.useState("#3b82f6")
    const [calendarSchedule, setCalendarSchedule] = React.useState<CalendarScheduleDay[]>(horarioPadrao)
    const [defaultDuration, setDefaultDuration] = React.useState("")
    const [calendarPassword, setCalendarPassword] = React.useState("")
    const [staffPassword, setStaffPassword] = React.useState("")
    const [staffAccess, setStaffAccess] = React.useState(false)
    const [editingAppointmentId, setEditingAppointmentId] = React.useState("")
    const [patientName, setPatientName] = React.useState("")
    const [appointmentTime, setAppointmentTime] = React.useState("")
    const [appointmentStaff, setAppointmentStaff] = React.useState("")
    const [customValues, setCustomValues] = React.useState<Record<string, unknown>>({})
    const [fieldLabel, setFieldLabel] = React.useState("")
    const [fieldType, setFieldType] = React.useState("text")
    const [fieldOptions, setFieldOptions] = React.useState("")
    const [fieldRequired, setFieldRequired] = React.useState(false)
    const [staffName, setStaffName] = React.useState("")
    const [staffColor, setStaffColor] = React.useState("#64748b")
    const [blockLabel, setBlockLabel] = React.useState("")
    const [blockStart, setBlockStart] = React.useState("")
    const [blockEnd, setBlockEnd] = React.useState("")

    const activeCalendar = calendars.find(calendar => calendar.id === selectedCalendarId) || null
    const sortedCalendars = [...calendars].sort((left, right) => left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" }))
    const selectedDayHours = calendarHours.filter(hours => hours.weekday === new Date(selectedDate + "T12:00:00").getDay())
    const scheduleConfigured = calendarHours.length > 0
    const selectedDayIsOpen = !scheduleConfigured || selectedDayHours.length > 0
    const selectedTimeIsAllowed = !appointmentTime || !scheduleConfigured || selectedDayHours.some(hours => appointmentTime.slice(0, 5) >= hours.starts_at.slice(0, 5) && appointmentTime.slice(0, 5) < hours.ends_at.slice(0, 5))
    const periodDates = datasVisiveis(selectedDate, calendarView)
    const scheduleWeekdays = scheduleConfigured ? DIAS_SEMANA.filter(day => calendarHours.some(hours => hours.weekday === day.weekday)) : DIAS_SEMANA
    const visibleDates = periodDates.filter(date => scheduleWeekdays.some(day => day.weekday === new Date(date + "T12:00:00").getDay()))
    const visibleMonth = selectedDate.slice(0, 7)
    const visibleAppointmentCounts = visibleDates.map(date => appointmentCounts[date] || 0)
    const nonzeroAppointmentCounts = visibleAppointmentCounts.filter(count => count > 0).sort((left, right) => left - right)
    const allCountsSorted = [...visibleAppointmentCounts].sort((left, right) => left - right)
    const middleIndex = Math.floor(allCountsSorted.length / 2)
    const medianAppointmentCount = allCountsSorted.length ? allCountsSorted.length % 2 ? allCountsSorted[middleIndex] : (allCountsSorted[middleIndex - 1] + allCountsSorted[middleIndex]) / 2 : 0
    const positiveMiddleIndex = Math.floor(nonzeroAppointmentCounts.length / 2)
    const positiveMedian = nonzeroAppointmentCounts.length ? nonzeroAppointmentCounts.length % 2 ? nonzeroAppointmentCounts[positiveMiddleIndex] : (nonzeroAppointmentCounts[positiveMiddleIndex - 1] + nonzeroAppointmentCounts[positiveMiddleIndex]) / 2 : 0
    const appointmentP50 = medianAppointmentCount > 0 ? medianAppointmentCount : positiveMedian
    const maxAppointmentsInCalendar = allTimeMaxAppointments[selectedCalendarId] || 0

    const navigatePeriod = (direction: number) => {
        const nextDate = moverDataVisao(selectedDate, calendarView, direction)
        if (calendarView !== "month" || !scheduleConfigured) {
            setSelectedDate(nextDate)
            return
        }
        const targetMonth = nextDate.slice(0, 7)
        const targetDay = Number(nextDate.slice(-2))
        const lastDay = new Date(Number(targetMonth.slice(0, 4)), Number(targetMonth.slice(5, 7)), 0).getDate()
        const openDates = Array.from({ length: lastDay }, (_, index) => `${targetMonth}-${String(index + 1).padStart(2, "0")}`)
            .filter(date => calendarHours.some(hours => hours.weekday === new Date(date + "T12:00:00").getDay()))
        setSelectedDate(openDates.find(date => Number(date.slice(-2)) >= targetDay) || openDates[openDates.length - 1] || nextDate)
    }

    const refreshCalendarList = async (selectCreatedId?: string) => {
        try {
            const rows = await carregarCalendarios()
            setCalendars(rows)
            if (selectCreatedId) setSelectedCalendarId(selectCreatedId)
            else if (!selectedCalendarId && rows.length) {
                const firstSortedCalendar = [...rows].sort((left, right) => left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" }))[0]
                setSelectedCalendarId(firstSortedCalendar.id)
            }
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Não foi possível carregar os calendários.")
        } finally {
            setLoading(false)
        }
    }

    const refreshCalendarDetails = async () => {
        const requestSequence = detailsRequestSequence.current + 1
        detailsRequestSequence.current = requestSequence
        if (!selectedCalendarId) {
            setFields([])
            setStaff([])
            setAppointments([])
            setBlocks([])
            setCalendarHours([])
            return
        }
        const cachedMetadata = calendarMetadataById[selectedCalendarId]
        if (cachedMetadata) {
            setFields(cachedMetadata.fields)
            setStaff(cachedMetadata.staff)
            setCalendarHours(cachedMetadata.hours)
        }
        if (!cachedMetadata) setLoading(true)
        setError("")
        let redirectingToOpenDate = false
        try {
            const details = await carregarDetalhes(selectedCalendarId, selectedDate, cachedMetadata)
            if (requestSequence !== detailsRequestSequence.current) return
            const metadata: CalendarMetadata = {
                fields: details.fields,
                staff: details.staff,
                hours: details.hours,
                loadedAt: cachedMetadata?.loadedAt || Date.now(),
            }
            setCalendarMetadataById(current => ({ ...current, [selectedCalendarId]: metadata }))
            if (details.hours.length && !details.hours.some(hours => hours.weekday === new Date(selectedDate + "T12:00:00").getDay())) {
                const nextOpenDate = Array.from({ length: 7 }, (_, offset) => deslocarData(selectedDate, offset))
                    .find(date => details.hours.some(hours => hours.weekday === new Date(date + "T12:00:00").getDay()))
                if (nextOpenDate && nextOpenDate !== selectedDate) {
                    redirectingToOpenDate = true
                    setCalendarHours(details.hours)
                    setSelectedDate(nextOpenDate)
                    return
                }
            }
            setFields(details.fields)
            setStaff(details.staff)
            setAppointments(details.appointments)
            setBlocks(details.blocks)
            setCalendarHours(details.hours)
            setLoadedDetailsKey(`${selectedCalendarId}:${selectedDate}`)
        } catch (cause) {
            if (requestSequence !== detailsRequestSequence.current) return
            setError(cause instanceof Error ? cause.message : "Não foi possível carregar a agenda.")
        } finally {
            if (requestSequence === detailsRequestSequence.current && !redirectingToOpenDate) setLoading(false)
        }
    }

    const updateCachedCalendarMetadata = (calendarId: string, changes: Partial<Pick<CalendarMetadata, "fields" | "staff" | "hours">>) => {
        setCalendarMetadataById(current => {
            const cached = current[calendarId]
            return cached ? { ...current, [calendarId]: { ...cached, ...changes } } : current
        })
    }

    const refreshAppointmentCounts = async () => {
        if (!selectedCalendarId) {
            setAppointmentCounts({})
            setAppointmentNamesByDate({})
            return
        }
        const dates = datasVisiveis(selectedDate, calendarView)
        const firstDate = dates[0]
        const lastDate = dates[dates.length - 1]
        const { data, error: countError } = await supabase.from("appointments")
            .select("appointment_date, patient_name")
            .eq("calendar_id", selectedCalendarId)
            .eq("status", "scheduled")
            .gte("appointment_date", firstDate)
            .lte("appointment_date", lastDate)
            .order("appointment_date").order("start_time").order("created_at")
        if (countError) {
            setError(countError.message)
            return
        }
        const rows = (data || []) as unknown as { appointment_date: string; patient_name: string }[]
        setAppointmentCounts(rows.reduce((counts, appointment) => {
            counts[appointment.appointment_date] = (counts[appointment.appointment_date] || 0) + 1
            return counts
        }, {} as Record<string, number>))
        setAppointmentNamesByDate(rows.reduce((names, appointment) => {
            names[appointment.appointment_date] = [...(names[appointment.appointment_date] || []), appointment.patient_name]
            return names
        }, {} as Record<string, string[]>))
    }

    const refreshAllTimeAppointmentMax = async (calendarId: string) => {
        try {
            const max = await carregarMaximoHistoricoDeConsultas(calendarId)
            setAllTimeMaxAppointments(current => ({ ...current, [calendarId]: max }))
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Não foi possível calcular o máximo histórico de consultas.")
        }
    }

    React.useEffect(() => {
        setSelectedDate(hojeIso())
        setHasMounted(true)
    }, [])

    React.useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)")
        const updateTheme = () => setDarkMode(media.matches)
        updateTheme()
        media.addEventListener("change", updateTheme)
        return () => media.removeEventListener("change", updateTheme)
    }, [])

    React.useEffect(() => () => {
        if (appointmentNoticeTimer.current) clearTimeout(appointmentNoticeTimer.current)
    }, [])

    const showAppointmentNotice = (message: string) => {
        if (appointmentNoticeTimer.current) clearTimeout(appointmentNoticeTimer.current)
        setAppointmentNotice(message)
        appointmentNoticeTimer.current = setTimeout(() => setAppointmentNotice(""), 5000)
    }

    React.useEffect(() => {
        void refreshCalendarList()
        // A lista precisa considerar o calendário selecionado ao escolher o inicial.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCalendarId])

    React.useEffect(() => {
        void refreshCalendarDetails()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCalendarId, selectedDate])

    React.useEffect(() => {
        void refreshAppointmentCounts()
        // Update day chips when the calendar or visible range changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCalendarId, selectedDate, calendarView])

    React.useEffect(() => {
        if (selectedCalendarId && allTimeMaxAppointments[selectedCalendarId] === undefined) void refreshAllTimeAppointmentMax(selectedCalendarId)
        // Load the all-time benchmark once per calendar session.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCalendarId])

    React.useEffect(() => {
        setStaffAccess(false)
        setStaffPassword("")
        setEditingAppointmentId("")
        setCalendarHours([])
    }, [selectedCalendarId])

    const updateScheduleDay = (weekday: number, changes: Partial<CalendarScheduleDay>) => setCalendarSchedule(current => current.map(day => day.weekday === weekday ? { ...day, ...changes } : day))

    const abrirEditorDeHorarios = () => {
        const defaults = horarioPadrao()
        setCalendarSchedule(DIAS_SEMANA.map(day => {
            const morning = calendarHours.find(hours => hours.weekday === day.weekday && hours.period === 1)
            const afternoon = calendarHours.find(hours => hours.weekday === day.weekday && hours.period === 2)
            const fallback = defaults.find(item => item.weekday === day.weekday)
            return {
                weekday: day.weekday,
                enabled: Boolean(morning || afternoon),
                morningStart: morning?.starts_at.slice(0, 5) || fallback?.morningStart || "08:00",
                morningEnd: morning?.ends_at.slice(0, 5) || fallback?.morningEnd || "12:00",
                afternoonEnabled: Boolean(afternoon),
                afternoonStart: afternoon?.starts_at.slice(0, 5) || fallback?.afternoonStart || "13:00",
                afternoonEnd: afternoon?.ends_at.slice(0, 5) || fallback?.afternoonEnd || "17:00",
            }
        }))
        setError("")
        setShowScheduleEditModal(true)
    }

    const saveCalendar = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError("")
        setNotice("")
        if (!calendarName.trim()) {
            setError("Informe um nome para o calendário.")
            return
        }
        if (calendarPassword.length < 4) {
            setError("A senha da equipe precisa ter pelo menos 4 caracteres.")
            return
        }
        const invalidSchedule = calendarSchedule.find(day => day.enabled && (
            day.morningStart >= day.morningEnd
            || (day.afternoonEnabled && (day.afternoonStart >= day.afternoonEnd || day.afternoonStart < day.morningEnd))
        ))
        const hours = calendarSchedule.flatMap(day => day.enabled ? [
            { weekday: day.weekday, period: 1, starts_at: day.morningStart, ends_at: day.morningEnd },
            ...(day.afternoonEnabled ? [{ weekday: day.weekday, period: 2, starts_at: day.afternoonStart, ends_at: day.afternoonEnd }] : []),
        ] : [])
        if (invalidSchedule) {
            setError("Confira os horários: cada período precisa ter início antes do fim, e a tarde deve começar após a manhã.")
            return
        }
        if (!hours.length) {
            setError("Selecione pelo menos um dia e um horário para este calendário.")
            return
        }
        setSaving(true)
        try {
            const { data, error: saveError } = await supabase.functions.invoke("calendar-staff", {
                body: {
                    action: "create_calendar",
                    name: calendarName.trim(),
                    description: calendarDescription.trim() || null,
                    color: calendarColor,
                    defaultDurationMinutes: defaultDuration ? Number(defaultDuration) : null,
                    password: calendarPassword,
                    hours,
                },
            })
            if (saveError) {
                const response = saveError.context instanceof Response ? saveError.context : null
                const payload = response ? await response.clone().json().catch(() => null) as { error?: string } | null : null
                throw new Error(payload?.error || saveError.message || "Não foi possível criar o calendário.")
            }
            if (data?.error || !data?.calendar?.id) throw new Error(data?.error || "O Supabase não retornou o calendário criado.")
            setCalendarName("")
            setCalendarDescription("")
            setDefaultDuration("")
            setCalendarPassword("")
            setCalendarSchedule(horarioPadrao())
            setShowCalendarForm(false)
            setNotice("Calendário criado.")
            await refreshCalendarList(data.calendar.id)
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Falha ao conectar com a função calendar-staff.")
        } finally {
            setSaving(false)
        }
    }

    const saveCalendarHours = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!activeCalendar || !staffAccess) return
        setError("")
        setNotice("")
        const invalidSchedule = calendarSchedule.find(day => day.enabled && (
            day.morningStart >= day.morningEnd
            || (day.afternoonEnabled && (day.afternoonStart >= day.afternoonEnd || day.afternoonStart < day.morningEnd))
        ))
        const hours = calendarSchedule.flatMap(day => day.enabled ? [
            { weekday: day.weekday, period: 1, starts_at: day.morningStart, ends_at: day.morningEnd },
            ...(day.afternoonEnabled ? [{ weekday: day.weekday, period: 2, starts_at: day.afternoonStart, ends_at: day.afternoonEnd }] : []),
        ] : [])
        if (invalidSchedule) {
            setError("Confira os horários: cada período precisa ter início antes do fim, e o segundo turno deve começar após a manhã.")
            return
        }
        if (!hours.length) {
            setError("Selecione pelo menos um dia e um horário para este calendário.")
            return
        }
        setSaving(true)
        try {
            const { data, error: updateError } = await supabase.functions.invoke("calendar-staff", {
                body: { action: "update_calendar_hours", calendarId: activeCalendar.id, password: staffPassword, hours },
            })
            if (updateError || data?.error) throw new Error(data?.error || updateError?.message || "Não foi possível atualizar os horários.")
            setShowScheduleEditModal(false)
            const updatedHours = hours.map(period => ({ weekday: period.weekday, period: period.period, starts_at: period.starts_at, ends_at: period.ends_at }))
            setCalendarHours(updatedHours)
            updateCachedCalendarMetadata(activeCalendar.id, { hours: updatedHours })
            setNotice("Horários do calendário atualizados.")
            const selectedWeekday = new Date(selectedDate + "T12:00:00").getDay()
            if (!hours.some(period => period.weekday === selectedWeekday)) {
                const nextOpenDate = Array.from({ length: 7 }, (_, offset) => deslocarData(selectedDate, offset))
                    .find(date => hours.some(period => period.weekday === new Date(date + "T12:00:00").getDay()))
                if (nextOpenDate) setSelectedDate(nextOpenDate)
            }
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Não foi possível atualizar os horários.")
        } finally {
            setSaving(false)
        }
    }

    const printAppointmentConfirmation = async (appointment: AppointmentRecord, printWindow: Window) => {
        const response = await fetch("/appointment-confirmation-template.pdf")
        if (!response.ok) throw new Error("Não foi possível carregar o modelo da confirmação.")
        const document = await PDFDocument.load(await response.arrayBuffer())
        const form = document.getForm()
        const documentTitle = form.getDropdown("Dropdown1")
        documentTitle.setOptions(["CONSULTA MÉDICA AGENDADA"])
        documentTitle.select("CONSULTA MÉDICA AGENDADA")
        documentTitle.acroField.dict.set(PDFName.of("DV"), PDFHexString.fromText("CONSULTA MÉDICA AGENDADA"))
        documentTitle.enableReadOnly()
        const [year, month, day] = appointment.appointment_date.split("-")
        const weekday = new Date(Number(year), Number(month) - 1, Number(day), 12).getDay()
        const firstAvailableTime = calendarHours
            .filter(hours => hours.weekday === weekday)
            .sort((left, right) => left.period - right.period || left.starts_at.localeCompare(right.starts_at))[0]?.starts_at.slice(0, 5) || ""
        const scheduledTime = appointment.start_time?.slice(0, 5) || firstAvailableTime
        const appointmentDateLabel = `${day}/${month}/${year}`
        const customFieldLines = fields.filter(field => field.is_active !== false)
            .filter(field => appointment.custom_values[field.field_key] !== undefined && appointment.custom_values[field.field_key] !== "" && appointment.custom_values[field.field_key] !== null)
            .map(field => `${field.label}: ${textoDoCampo(appointment.custom_values[field.field_key])}`)
        const textLines = [
            "AO ACOLHIMENTO",
            `DATA: ${appointmentDateLabel}`,
            `HORÁRIO: ${scheduledTime}`,
            ...(customFieldLines.length ? ["", ...customFieldLines] : []),
        ]
        form.getTextField("Text1").setText(appointment.patient_name)
        form.getTextField("Text2").setText(textLines.join("\n"))
        form.getTextField("Text2").setFontSize(11)
        const issuedAt = new Date(appointment.created_at)
        const issueDateParts = new Intl.DateTimeFormat("pt-BR", {
            timeZone: "America/Fortaleza",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }).formatToParts(issuedAt)
        const issueDay = issueDateParts.find(part => part.type === "day")?.value || ""
        const issueMonth = issueDateParts.find(part => part.type === "month")?.value || ""
        const issueYear = issueDateParts.find(part => part.type === "year")?.value || ""
        form.getTextField("DD").setText(issueDay)
        form.getTextField("MM").setText(issueMonth)
        form.getTextField("YYYY").setText(issueYear)
        form.updateFieldAppearances()
        document.catalog.delete(PDFName.of("OpenAction"))
        const pdfBytes = await document.save()
        const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength)
        new Uint8Array(pdfBuffer).set(pdfBytes)
        const pdfUrl = URL.createObjectURL(new Blob([pdfBuffer], { type: "application/pdf" }))
        printWindow.onload = () => {
            printWindow.focus()
            printWindow.print()
        }
        printWindow.location.href = pdfUrl
        window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000)
    }

    const saveAppointment = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!activeCalendar || !patientName.trim()) return
        if (scheduleConfigured && !selectedDayIsOpen) {
            setError("Este calendário não atende no dia selecionado.")
            return
        }
        if (scheduleConfigured && !selectedTimeIsAllowed) {
            setError("O horário escolhido fica fora do horário de atendimento deste calendário.")
            return
        }
        const isNewAppointment = !editingAppointmentId
        const confirmationWindow = isNewAppointment ? window.open("about:blank", "_blank") : null
        if (confirmationWindow) {
            confirmationWindow.document.title = "Preparando confirmação"
            confirmationWindow.document.body.textContent = "Preparando a confirmação para impressão…"
        }
        setSaving(true)
        setError("")
        const appointment = {
            appointment_date: selectedDate,
            start_time: appointmentTime || null,
            patient_name: capitalizarSeTudoMaiusculo(patientName.trim()),
            staff_id: appointmentStaff || null,
            custom_values: fields.reduce((values, field) => {
                const value = customValues[field.field_key]
                values[field.field_key] = field.field_type === "text" && typeof value === "string" ? capitalizarSeTudoMaiusculo(value) : value
                return values
            }, {} as Record<string, unknown>),
        }
        const existingAppointment = appointments.find(item => item.id === editingAppointmentId)
        let savedAppointment: AppointmentRecord
        if (editingAppointmentId) {
            const { data, error: updateError } = await supabase.functions.invoke("calendar-staff", {
                body: { action: "update_appointment", calendarId: activeCalendar.id, password: staffPassword, appointmentId: editingAppointmentId, appointment },
            })
            if (updateError || data?.error || !existingAppointment) {
                confirmationWindow?.close()
                setSaving(false)
                setError(data?.error || updateError?.message || "Não foi possível salvar o agendamento. Verifique a senha ou tente novamente.")
                return
            }
            savedAppointment = { ...existingAppointment, ...appointment }
        } else {
            const { data, error: insertError } = await supabase.from("appointments")
                .insert({ ...appointment, calendar_id: activeCalendar.id, status: "scheduled" })
                .select("*").single()
            if (insertError || !data) {
                confirmationWindow?.close()
                setSaving(false)
                setError(insertError?.message || "Não foi possível salvar o agendamento.")
                return
            }
            savedAppointment = data as unknown as AppointmentRecord
        }
        setSaving(false)
        setAppointments(current => [...current.filter(item => item.id !== savedAppointment.id), savedAppointment].sort((left, right) => (left.start_time || "").localeCompare(right.start_time || "") || left.created_at.localeCompare(right.created_at)))
        setEditingAppointmentId("")
        setPatientName("")
        setAppointmentTime("")
        setAppointmentStaff("")
        setCustomValues({})
        showAppointmentNotice(editingAppointmentId ? "Agendamento atualizado." : "Agendamento criado.")
        if (!editingAppointmentId) setAllTimeMaxAppointments(current => current[activeCalendar.id] === undefined ? current : {
            ...current,
            [activeCalendar.id]: Math.max(current[activeCalendar.id], (appointmentCounts[selectedDate] || 0) + 1),
        })
        if (isNewAppointment && confirmationWindow) {
            try {
                await printAppointmentConfirmation(savedAppointment, confirmationWindow)
            } catch (cause) {
                confirmationWindow.close()
                setError(cause instanceof Error ? `Agendamento salvo, mas não foi possível gerar a confirmação: ${cause.message}` : "Agendamento salvo, mas não foi possível gerar a confirmação.")
            }
        } else if (isNewAppointment) {
            showAppointmentNotice("Agendamento criado. Permita pop-ups para abrir a confirmação para impressão.")
        }
        await refreshAppointmentCounts()
    }

    const unlockStaffAccess = async () => {
        if (!activeCalendar || !staffPassword || staffUnlocking) return
        setStaffUnlocking(true)
        setError("")
        try {
            const { data, error: verifyError } = await supabase.functions.invoke("calendar-staff", {
                body: { action: "verify_password", calendarId: activeCalendar.id, password: staffPassword },
            })
            if (verifyError || !data?.valid) {
                setStaffAccess(false)
                setError(data?.error || verifyError?.message || "Senha incorreta ou função de equipe indisponível.")
                return
            }
            setStaffAccess(true)
            setShowStaffPasswordDialog(false)
            setNotice("Edição da equipe desbloqueada neste navegador.")
        } catch (cause) {
            setStaffAccess(false)
            setError(cause instanceof Error ? cause.message : "Não foi possível verificar a senha da equipe.")
        } finally {
            setStaffUnlocking(false)
        }
    }

    const verifyStaffPassword = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        await unlockStaffAccess()
    }

    const openStaffManager = () => {
        if (staffAccess) setShowStaffManagerDialog(true)
    }

    const toggleStaffAccess = () => {
        if (staffAccess) {
            setStaffAccess(false)
            setStaffPassword("")
            setShowStaffManagerDialog(false)
            cancelEditingAppointment()
        } else {
            setError("")
            setStaffPassword("")
            setShowStaffPasswordDialog(true)
        }
    }

    const startEditingAppointment = (appointment: AppointmentRecord) => {
        setEditingAppointmentId(appointment.id)
        setPatientName(appointment.patient_name)
        setAppointmentTime(appointment.start_time || "")
        setAppointmentStaff(appointment.staff_id || "")
        setCustomValues(appointment.custom_values || {})
    }

    const cancelEditingAppointment = () => {
        setEditingAppointmentId("")
        setPatientName("")
        setAppointmentTime("")
        setAppointmentStaff("")
        setCustomValues({})
    }

    const deleteAppointment = async (appointmentId: string) => {
        if (!activeCalendar || !staffAccess || !window.confirm("Marcar este agendamento como excluído?")) return
        setError("")
        const { data, error: deleteError } = await supabase.functions.invoke("calendar-staff", {
            body: { action: "delete_appointment", calendarId: activeCalendar.id, password: staffPassword, appointmentId },
        })
        if (deleteError || data?.error) {
            setError(data?.error || "Não foi possível excluir o agendamento.")
            return
        }
        if (editingAppointmentId === appointmentId) cancelEditingAppointment()
        setAppointments(current => current.filter(appointment => appointment.id !== appointmentId))
        showAppointmentNotice("Agendamento marcado como excluído.")
        await refreshAppointmentCounts()
        await refreshAllTimeAppointmentMax(activeCalendar.id)
    }

    const saveField = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!activeCalendar || !fieldLabel.trim()) return
        const keyBase = chaveDoCampo(fieldLabel)
        const count = fields.filter(field => field.field_key === keyBase || field.field_key.startsWith(keyBase + "_")).length
        const key = count ? keyBase + "_" + (count + 1) : keyBase
        const options = fieldOptions.split(",").map(option => option.trim()).filter(Boolean)
        if ((fieldType === "dropdown" || fieldType === "multi_select") && options.length === 0) {
            setError("Informe ao menos uma opção para este campo.")
            return
        }
        setSaving(true)
        setError("")
        const { data, error: saveError } = await supabase.functions.invoke("calendar-staff", {
            body: {
                action: "create_field",
                calendarId: activeCalendar.id,
                password: staffPassword,
                field: { field_key: key, label: fieldLabel.trim(), field_type: fieldType, is_required: fieldRequired, options, display_order: fields.length },
            },
        })
        setSaving(false)
        if (saveError || data?.error) {
            setError(data?.error || "Não foi possível adicionar o campo.")
            return
        }
        setFieldLabel("")
        setFieldOptions("")
        setFieldRequired(false)
        setShowFieldForm(false)
        const newField = {
            id: data.fieldId,
            calendar_id: activeCalendar.id,
            field_key: key,
            label: fieldLabel.trim(),
            field_type: fieldType,
            is_required: fieldRequired,
            is_active: true,
            options,
            display_order: fields.length,
        }
        setFields(current => [...current, newField])
        updateCachedCalendarMetadata(activeCalendar.id, { fields: [...fields, newField] })
        setNotice("Campo adicionado ao calendário.")
    }

    const updateCalendarField = async (field: CalendarField, updates: { is_active?: boolean; is_required?: boolean }) => {
        if (!activeCalendar || !staffAccess || saving) return
        setSaving(true)
        setError("")
        const { data, error: updateError } = await supabase.functions.invoke("calendar-staff", {
            body: { action: "update_field", calendarId: activeCalendar.id, password: staffPassword, fieldId: field.id, fieldUpdates: updates },
        })
        setSaving(false)
        if (updateError || data?.error) {
            setError(data?.error || updateError?.message || "Não foi possível atualizar o campo.")
            return
        }
        const updatedFields = fields.map(item => item.id === field.id ? { ...item, ...updates } : item)
        setFields(updatedFields)
        updateCachedCalendarMetadata(activeCalendar.id, { fields: updatedFields })
        setNotice("Campo atualizado.")
    }

    const saveStaff = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!activeCalendar || !staffName.trim()) return
        setSaving(true)
        setError("")
        const { data, error: saveError } = await supabase.functions.invoke("calendar-staff", {
            body: { action: "create_staff", calendarId: activeCalendar.id, password: staffPassword, staff: { name: staffName.trim(), color: staffColor } },
        })
        setSaving(false)
        if (saveError || data?.error) {
            const response = saveError?.context instanceof Response ? saveError.context : null
            const payload = response ? await response.clone().json().catch(() => null) as { error?: string } | null : null
            setError(data?.error || payload?.error || saveError?.message || "Não foi possível adicionar o profissional.")
            return
        }
        setStaffName("")
        setShowStaffForm(false)
        const restoredStaff = staff.find(person => person.name.trim().toLocaleLowerCase() === staffName.trim().toLocaleLowerCase())
        let updatedStaff: StaffRecord[]
        if (restoredStaff) {
            updatedStaff = staff.map(person => person.id === restoredStaff.id ? { ...person, color: staffColor, is_active: true } : person)
            setStaff(updatedStaff)
        } else if (data?.staffId) {
            updatedStaff = [...staff, { id: data.staffId, calendar_id: activeCalendar.id, name: staffName.trim(), color: staffColor, is_active: true }]
            setStaff(updatedStaff)
        } else {
            updatedStaff = staff
        }
        updateCachedCalendarMetadata(activeCalendar.id, { staff: updatedStaff })
        setNotice("Profissional adicionado.")
    }

    const removeStaff = async (person: StaffRecord) => {
        if (!activeCalendar || !staffAccess || removingStaffId) return
        setRemovingStaffId(person.id)
        setError("")
        try {
            const { data, error: removeError } = await supabase.functions.invoke("calendar-staff", {
                body: { action: "remove_staff", calendarId: activeCalendar.id, password: staffPassword, staffId: person.id },
            })
            if (removeError || data?.error) throw new Error(data?.error || removeError?.message || "Não foi possível remover o profissional.")
            if (appointmentStaff === person.id) setAppointmentStaff("")
            const updatedStaff = staff.map(member => member.id === person.id ? { ...member, is_active: false } : member)
            setStaff(updatedStaff)
            updateCachedCalendarMetadata(activeCalendar.id, { staff: updatedStaff })
            setNotice(`${person.name} removido da lista de profissionais.`)
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Não foi possível remover o profissional.")
        } finally {
            setRemovingStaffId("")
        }
    }

    const saveBlock = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!activeCalendar || !blockLabel.trim() || !blockStart || !blockEnd) return
        setSaving(true)
        setError("")
        const { data, error: saveError } = await supabase.functions.invoke("calendar-staff", {
            body: {
                action: "create_time_block",
                calendarId: activeCalendar.id,
                password: staffPassword,
                timeBlock: { label: blockLabel.trim(), starts_at: new Date(blockStart).toISOString(), ends_at: new Date(blockEnd).toISOString() },
            },
        })
        setSaving(false)
        if (saveError || data?.error) {
            setError(data?.error || "Não foi possível criar o aviso.")
            return
        }
        setBlockLabel("")
        setBlockStart("")
        setBlockEnd("")
        setShowBlockForm(false)
        const savedBlock = data?.blockId ? {
            id: data.blockId,
            calendar_id: activeCalendar.id,
            label: blockLabel.trim(),
            starts_at: new Date(blockStart).toISOString(),
            ends_at: new Date(blockEnd).toISOString(),
        } : null
        const dayBounds = limitesDoDia(selectedDate)
        if (savedBlock && savedBlock.starts_at < dayBounds.fim && savedBlock.ends_at >= dayBounds.inicio) {
            setBlocks(current => [...current, savedBlock])
        }
        setNotice("Bloqueio visual criado.")
    }

    const setCustomValue = (key: string, value: unknown) => {
        setCustomValues(current => ({ ...current, [key]: value }))
    }

    const labelStyle: React.CSSProperties = { display: "grid", gap: 6, fontSize: 11, color: "var(--meta-text, #6b6760)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
    const inputStyle: React.CSSProperties = { width: "100%", height: 42, boxSizing: "border-box", border: "1px solid var(--editor-border, rgba(120,120,120,0.15))", borderRadius: 10, padding: "10px 14px", color: "var(--editor-text, #1a1916)", background: "var(--calendar-input-bg, rgba(120,120,120,0.08))", font: "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", colorScheme: "light dark" }
    const buttonStyle: React.CSSProperties = { border: "1px solid var(--editor-border, rgba(120,120,120,0.15))", borderRadius: 10, minHeight: 36, padding: "7px 11px", background: "var(--calendar-input-bg, rgba(120,120,120,0.08))", color: "var(--editor-text, #1a1916)", font: "600 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", cursor: "pointer" }
    const primaryStyle: React.CSSProperties = { ...buttonStyle, borderColor: "#e02424", background: "#e02424", color: "#fff" }

    const scheduleEditor = <div style={{ display: "grid", gap: 8 }}>
        <div><div style={{ ...labelStyle, display: "block" }}>Dias e horários de atendimento</div><div className="calendar-muted" style={{ fontSize: 11, marginTop: 3 }}>Escolha os dias e ajuste manhã e segundo turno.</div></div>
        {calendarSchedule.map(day => <div key={day.weekday} className="calendar-schedule-day" style={{ padding: 10, border: "1px solid var(--editor-border, color-mix(in srgb, CanvasText 18%, Canvas))", borderRadius: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 650, color: "var(--editor-text, CanvasText)" }}><input type="checkbox" checked={day.enabled} onChange={event => updateScheduleDay(day.weekday, { enabled: event.target.checked })} />{DIAS_SEMANA.find(item => item.weekday === day.weekday)?.name}</label>
            {day.enabled ? <>
                <div style={{ display: "grid", gap: 5 }}><span style={{ fontSize: 11, fontWeight: 650 }}>Manhã</span><div className="calendar-session-inputs"><label style={{ ...labelStyle, fontSize: 10 }}>Início<input required type="time" value={day.morningStart} onChange={event => updateScheduleDay(day.weekday, { morningStart: event.target.value })} style={inputStyle} /></label><label style={{ ...labelStyle, fontSize: 10 }}>Fim<input required type="time" value={day.morningEnd} onChange={event => updateScheduleDay(day.weekday, { morningEnd: event.target.value })} style={inputStyle} /></label></div></div>
                <div style={{ display: "grid", gap: 5 }}><label style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 16, fontSize: 11, fontWeight: 650 }}><input type="checkbox" checked={day.afternoonEnabled} onChange={event => updateScheduleDay(day.weekday, { afternoonEnabled: event.target.checked })} />Segundo turno</label>{day.afternoonEnabled ? <div className="calendar-session-inputs"><label style={{ ...labelStyle, fontSize: 10 }}>Início<input required type="time" value={day.afternoonStart} onChange={event => updateScheduleDay(day.weekday, { afternoonStart: event.target.value })} style={inputStyle} /></label><label style={{ ...labelStyle, fontSize: 10 }}>Fim<input required type="time" value={day.afternoonEnd} onChange={event => updateScheduleDay(day.weekday, { afternoonEnd: event.target.value })} style={inputStyle} /></label></div> : <span className="calendar-muted" style={{ fontSize: 10 }}>Sem segundo turno</span>}</div>
            </> : <span className="calendar-muted" style={{ fontSize: 11 }}>Fechado</span>}
        </div>)}
    </div>

    const calendarDetailsReady = !selectedCalendarId || loadedDetailsKey === `${selectedCalendarId}:${selectedDate}`
    const calendarMetadataReady = !selectedCalendarId || Boolean(calendarMetadataById[selectedCalendarId])

    if (hasMounted && !loading && selectedCalendarId && !calendarMetadataReady && error) {
        return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--meta-bg, Canvas)", color: "var(--editor-text, CanvasText)", fontFamily: '"Google Sans Flex", sans-serif' }}><div style={{ display: "grid", justifyItems: "center", gap: 12, maxWidth: 440, textAlign: "center" }}><div role="alert" style={{ fontSize: 14 }}>{error}</div><button type="button" onClick={() => void refreshCalendarDetails()} style={{ border: "1px solid var(--meta-border, var(--editor-border, #e7e5e4))", borderRadius: 8, minHeight: 36, padding: "7px 12px", background: "var(--meta-bg, rgba(120,113,108,0.1))", color: "var(--editor-text, CanvasText)", font: '600 12px "Google Sans Flex", sans-serif', cursor: "pointer" }}>Tentar novamente</button></div></main>
    }

    if (!hasMounted || loading && (!selectedCalendarId || !calendarMetadataReady) || selectedCalendarId && !calendarMetadataReady) {
        return <main aria-busy="true" style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: darkMode ? "#1c1917" : "#ffffff", color: darkMode ? "#78716c" : "#6b6760", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13 }}>Carregando agenda…</main>
    }

    return <main className="calendar-root" style={{ minHeight: "100vh", width: "100%", boxSizing: "border-box", borderRadius: 16, background: darkMode ? "#1c1917" : "#ffffff", padding: 24, color: darkMode ? "#f5f5f4" : "#1a1916", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", colorScheme: darkMode ? "dark" : "light" }}>
        <style>{".calendar-root { --editor-bg: #ffffff; --editor-text: #1a1916; --meta-text: #6b6760; --editor-border: rgba(120,120,120,0.15); --meta-border: rgba(120,120,120,0.15); --meta-bg: rgba(120,120,120,0.06); --calendar-input-bg: rgba(120,120,120,0.08); --editor-shadow: none; } @media (prefers-color-scheme: dark) { .calendar-root { --editor-bg: #1c1917; --editor-text: #f5f5f4; --meta-text: #78716c; --editor-border: rgba(255,255,255,0.15); --meta-border: rgba(255,255,255,0.15); --meta-bg: rgba(255,255,255,0.06); --calendar-input-bg: #2e2b29; } } .calendar-root h1, .calendar-root h2, .calendar-root h3, .calendar-root strong { font-family: inherit !important; } @media (max-width: 760px) { .calendar-agenda-grid { grid-template-columns: minmax(0, 1fr) !important; } .calendar-content-grid { grid-template-columns: minmax(0, 1fr) !important; } .calendar-page-title { font-size: 20px !important; } } .calendar-surface { background: var(--editor-bg, #ffffff) !important; border-color: var(--editor-border, rgba(120,120,120,0.15)) !important; color: var(--editor-text, #1a1916); box-shadow: var(--editor-shadow, none); } .calendar-muted { color: var(--meta-text, #6b6760) !important; } .calendar-page-title { font-family: inherit !important; font-size: 20px !important; } .calendar-agenda-grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(320px, .9fr); gap: 16px; align-items: start; } .calendar-view-dates { padding: 10px; } .calendar-action { transition: transform .15s ease, opacity .15s ease; } .calendar-action:hover { transform: translateY(-1px); } .calendar-create-modal { width: min(760px, 100%) !important; } .calendar-schedule-day { display: grid; grid-template-columns: minmax(135px, .65fr) minmax(210px, 1fr) minmax(230px, 1.1fr); align-items: center; gap: 12px; } .calendar-session-inputs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; } @media (max-width: 720px) { .calendar-schedule-day { grid-template-columns: minmax(0, 1fr); gap: 8px; } }"}</style>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
                <h1 className="calendar-page-title" style={{ margin: 0, fontSize: 20, letterSpacing: "normal", fontWeight: 700 }}>Agenda</h1>
            </header>

            {error ? <div role="alert" style={{ padding: 12, marginBottom: 14, borderRadius: 8, color: "#ef4444", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.22)", fontSize: 13 }}>{error}</div> : null}
            {notice ? <div role="status" style={{ padding: 12, marginBottom: 14, borderRadius: 8, color: "#22c55e", background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.22)", fontSize: 13 }}>{notice}</div> : null}

            {showStaffPasswordDialog ? <div role="presentation" onClick={() => { setShowStaffPasswordDialog(false); setStaffPassword("") }} style={{ position: "fixed", inset: 0, zIndex: 20, display: "grid", placeItems: "center", padding: 16, background: "rgba(0,0,0,.45)", backdropFilter: "blur(5px)" }}>
                <form role="dialog" aria-modal="true" aria-labelledby="calendar-staff-password-title" onSubmit={verifyStaffPassword} onClick={event => event.stopPropagation()} className="calendar-surface" style={{ display: "grid", gap: 12, width: "min(380px, 100%)", padding: 20, border: "1px solid var(--editor-border, #e2ddd6)", borderRadius: 12 }}>
                    <div><h2 id="calendar-staff-password-title" style={{ margin: 0, fontSize: 18, fontFamily: '"Playfair Display", serif' }}>Edição da equipe</h2><div className="calendar-muted" style={{ fontSize: 12, marginTop: 4 }}>Digite a senha compartilhada deste calendário.</div></div>
                    {error ? <div role="alert" style={{ padding: 9, borderRadius: 8, color: "#ef4444", background: "rgba(239,68,68,.1)", fontSize: 12 }}>{error}</div> : null}
                    <label style={labelStyle}>Senha<input autoFocus required type="password" autoComplete="current-password" value={staffPassword} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void unlockStaffAccess() } }} onChange={event => { setStaffPassword(event.target.value); setError("") }} style={inputStyle} /></label>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button type="button" disabled={staffUnlocking} style={buttonStyle} onClick={() => { setShowStaffPasswordDialog(false); setStaffPassword("") }}>Cancelar</button><button type="submit" disabled={staffUnlocking || !staffPassword} style={{ ...primaryStyle, opacity: staffUnlocking ? 0.7 : 1, cursor: staffUnlocking ? "wait" : "pointer" }}>{staffUnlocking ? "Verificando…" : "Desbloquear"}</button></div>
                </form>
            </div> : null}

            {showStaffManagerDialog ? <div role="presentation" onClick={() => setShowStaffManagerDialog(false)} style={{ position: "fixed", inset: 0, zIndex: 21, display: "grid", placeItems: "center", padding: 16, background: "rgba(0,0,0,.45)", backdropFilter: "blur(5px)" }}>
                <div role="dialog" aria-modal="true" aria-labelledby="calendar-staff-manager-title" onClick={event => event.stopPropagation()} className="calendar-surface" style={{ display: "grid", gap: 12, width: "min(440px, 100%)", maxHeight: "min(80vh, 620px)", overflowY: "auto", padding: 20, border: "1px solid var(--editor-border, #e2ddd6)", borderRadius: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><div><h2 id="calendar-staff-manager-title" style={{ margin: 0, fontSize: 18, fontFamily: '"Playfair Display", serif' }}>Profissionais</h2><div className="calendar-muted" style={{ fontSize: 12, marginTop: 4 }}>Gerencie quem pode ser selecionado nos agendamentos.</div></div><button type="button" aria-label="Fechar profissionais" style={buttonStyle} onClick={() => { setShowStaffManagerDialog(false); setShowStaffForm(false) }}>×</button></div>
                    {staff.filter(person => person.is_active).length ? <div style={{ display: "grid", gap: 7 }}>{staff.filter(person => person.is_active).map(person => <div key={person.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "9px 10px", border: "1px solid var(--editor-border, color-mix(in srgb, CanvasText 18%, Canvas))", borderRadius: 8 }}><span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}><span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: person.color }} />{person.name}</span><button type="button" disabled={Boolean(removingStaffId)} style={{ ...buttonStyle, minHeight: 30, color: "#ef4444" }} onClick={() => void removeStaff(person)}>{removingStaffId === person.id ? "Removendo…" : "Remover"}</button></div>)}</div> : <div className="calendar-muted" style={{ padding: 12, textAlign: "center", fontSize: 13 }}>Nenhum profissional ativo.</div>}
                    {showStaffForm ? <form onSubmit={saveStaff} style={{ display: "grid", gap: 10, padding: 12, border: "1px solid var(--editor-border, color-mix(in srgb, CanvasText 18%, Canvas))", borderRadius: 8 }}><h3 style={{ margin: 0, fontSize: 14 }}>Adicionar profissional</h3><label style={labelStyle}>Nome<input required value={staffName} onChange={event => setStaffName(event.target.value)} style={inputStyle} /></label><div style={labelStyle}><span>Cor do profissional</span><div role="group" aria-label="Paleta de cores" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{PALETA_CORES.map(color => <button key={color.valor} type="button" aria-label={color.nome} aria-pressed={staffColor === color.valor} title={color.nome} onClick={() => setStaffColor(color.valor)} style={{ width: 26, height: 26, padding: 0, borderRadius: "50%", border: staffColor === color.valor ? "3px solid var(--editor-text, CanvasText)" : "2px solid transparent", outline: staffColor === color.valor ? "2px solid " + color.valor : "none", background: color.valor, cursor: "pointer" }} />)}</div></div><button disabled={saving} type="submit" style={primaryStyle}>{saving ? "Adicionando…" : "Adicionar"}</button></form> : <button type="button" style={{ ...buttonStyle, justifySelf: "start" }} onClick={() => setShowStaffForm(true)}>+ Adicionar profissional</button>}
                </div>
            </div> : null}

            {showScheduleEditModal ? <div role="presentation" onClick={() => { if (!saving) setShowScheduleEditModal(false) }} style={{ position: "fixed", inset: 0, zIndex: 22, display: "grid", placeItems: "center", padding: 16, background: "rgba(0,0,0,.45)", backdropFilter: "blur(5px)" }}>
                <form role="dialog" aria-modal="true" aria-labelledby="calendar-hours-edit-title" onSubmit={saveCalendarHours} onClick={event => event.stopPropagation()} className="calendar-surface calendar-create-modal" style={{ display: "grid", gap: 12, width: "min(760px, 100%)", maxHeight: "min(88vh, 760px)", overflowY: "auto", border: "1px solid var(--editor-border, color-mix(in srgb, CanvasText 20%, Canvas))", borderRadius: 12, padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><h2 id="calendar-hours-edit-title" style={{ margin: 0, fontSize: 19, fontFamily: '"Playfair Display", serif' }}>Editar horários</h2><button type="button" disabled={saving} aria-label="Fechar edição de horários" style={buttonStyle} onClick={() => setShowScheduleEditModal(false)}>×</button></div>
                    {error ? <div role="alert" style={{ padding: 9, borderRadius: 8, color: "#ef4444", background: "rgba(239,68,68,.1)", fontSize: 12 }}>{error}</div> : null}
                    {scheduleEditor}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}><button type="button" disabled={saving} style={buttonStyle} onClick={() => setShowScheduleEditModal(false)}>Cancelar</button><button disabled={saving} type="submit" style={{ ...primaryStyle, opacity: saving ? 0.65 : 1, cursor: saving ? "wait" : "pointer" }}>{saving ? "Salvando…" : "Salvar horários"}</button></div>
                </form>
            </div> : null}

            {showCalendarForm ? <div role="presentation" onClick={() => setShowCalendarForm(false)} style={{ position: "fixed", inset: 0, zIndex: 22, display: "grid", placeItems: "center", padding: 16, background: "rgba(0,0,0,.45)", backdropFilter: "blur(5px)" }}>
                <form role="dialog" aria-modal="true" aria-labelledby="calendar-create-title" onSubmit={saveCalendar} onClick={event => event.stopPropagation()} className="calendar-surface calendar-create-modal" style={{ display: "grid", gap: 12, width: "min(760px, 100%)", maxHeight: "min(88vh, 760px)", overflowY: "auto", border: "1px solid var(--editor-border, color-mix(in srgb, CanvasText 20%, Canvas))", borderRadius: 12, padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><h2 id="calendar-create-title" style={{ margin: 0, fontSize: 19, fontFamily: '"Playfair Display", serif' }}>Novo calendário</h2><button type="button" aria-label="Fechar criação de calendário" style={buttonStyle} onClick={() => setShowCalendarForm(false)}>×</button></div>
                    {error ? <div role="alert" style={{ padding: 9, borderRadius: 8, color: "#ef4444", background: "rgba(239,68,68,.1)", fontSize: 12 }}>{error}</div> : null}
                    <label style={labelStyle}>Nome do calendário<input required maxLength={80} value={calendarName} onChange={event => { setCalendarName(event.target.value); setError("") }} style={inputStyle} /></label>
                    <label style={labelStyle}>Descrição<input value={calendarDescription} onChange={event => setCalendarDescription(event.target.value)} style={inputStyle} /></label>
                    <div style={labelStyle}><span>Cor do calendário</span><div role="group" aria-label="Paleta de cores" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{PALETA_CORES.map(color => <button key={color.valor} type="button" aria-label={color.nome} aria-pressed={calendarColor === color.valor} title={color.nome} onClick={() => setCalendarColor(color.valor)} style={{ width: 28, height: 28, padding: 0, borderRadius: "50%", border: calendarColor === color.valor ? "3px solid var(--editor-text, CanvasText)" : "2px solid transparent", outline: calendarColor === color.valor ? "2px solid " + color.valor : "none", background: color.valor, cursor: "pointer" }} />)}</div></div>
                    {scheduleEditor}
                    <label style={labelStyle}>Duração sugerida (minutos)<input type="number" min="1" value={defaultDuration} onChange={event => setDefaultDuration(event.target.value)} style={inputStyle} /></label>
                    <label style={labelStyle}>Senha compartilhada da equipe<input required minLength={4} type="password" autoComplete="new-password" value={calendarPassword} onChange={event => { setCalendarPassword(event.target.value); setError("") }} style={inputStyle} /><span className="calendar-muted" style={{ fontSize: 11, fontWeight: 400 }}>Mínimo de 4 caracteres.</span></label>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}><button type="button" disabled={saving} style={buttonStyle} onClick={() => setShowCalendarForm(false)}>Cancelar</button><button disabled={saving} type="submit" className="calendar-action" style={{ ...primaryStyle, opacity: saving ? 0.65 : 1, cursor: saving ? "wait" : "pointer" }}>{saving ? "Criando calendário…" : "Criar calendário"}</button></div>
                </form>
            </div> : null}

            <nav aria-label="Calendários" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {sortedCalendars.map(calendar => <button key={calendar.id} type="button" onClick={() => setSelectedCalendarId(calendar.id)} style={{ ...buttonStyle, borderColor: calendar.id === selectedCalendarId ? calendar.color : "#d1dcda", boxShadow: calendar.id === selectedCalendarId ? "inset 0 -3px 0 " + calendar.color : "none" }}>{calendar.name}</button>)}
                <button type="button" className="calendar-action" aria-label="Criar calendário" title="Criar calendário" style={{ ...buttonStyle, width: 38, minWidth: 38, padding: 0, fontSize: 20, lineHeight: 1, color: "#e02424", borderColor: "rgba(224,36,36,.35)" }} onClick={() => { setError(""); setNotice(""); setShowCalendarForm(!showCalendarForm) }}>+</button>
                {!loading && calendars.length === 0 ? <span style={{ color: "#63716e", fontSize: 14 }}>Crie o primeiro calendário para começar.</span> : null}
            </nav>

            {activeCalendar ? <>
                <div className="calendar-agenda-grid">
                <section className="calendar-view-card calendar-surface" style={{ overflow: "hidden", border: "1px solid var(--editor-border, color-mix(in srgb, CanvasText 20%, Canvas))", borderRadius: 12 }}>
                    <div style={{ display: "grid", gap: 14, padding: 16, borderBottom: "1px solid var(--editor-border, color-mix(in srgb, CanvasText 14%, Canvas))" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                        <span aria-hidden="true" style={{ width: 12, height: 40, borderRadius: 8, background: activeCalendar.color }} />
                        <div><h2 style={{ margin: 0, fontSize: 20 }}>{activeCalendar.name}</h2><div className="calendar-muted" style={{ fontSize: 12 }}>{activeCalendar.description || "Agenda de atendimento"}{activeCalendar.default_duration_minutes ? " · duração sugerida de " + activeCalendar.default_duration_minutes + " min" : ""}</div></div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", flexWrap: "wrap", gap: 6 }}>
                        <button type="button" aria-label="Período anterior" style={buttonStyle} onClick={() => navigatePeriod(-1)}>‹</button>
                        <strong style={{ minWidth: 150, textAlign: "center", textTransform: "capitalize", fontFamily: '"Playfair Display", serif', fontSize: 16 }}>{calendarView === "month" ? rotuloMes(selectedDate) : new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" }).format(new Date(periodDates[0] + "T12:00:00")) + " – " + new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(periodDates[6] + "T12:00:00"))}</strong>
                        <button type="button" aria-label="Próximo período" style={buttonStyle} onClick={() => navigatePeriod(1)}>›</button>
                        <button type="button" style={buttonStyle} onClick={() => setSelectedDate(hojeIso())}>Hoje</button>
                        <div role="group" aria-label="Visualização do calendário" style={{ display: "flex", marginLeft: "auto", padding: 3, borderRadius: 8, border: "1px solid var(--meta-border, var(--editor-border, #e7e5e4))", background: "var(--meta-bg, rgba(120,113,108,0.1))" }}>
                            <button type="button" aria-pressed={calendarView === "month"} onClick={() => setCalendarView("month")} style={{ ...buttonStyle, minHeight: 30, border: 0, background: calendarView === "month" ? "var(--editor-bg, Canvas)" : "transparent", boxShadow: calendarView === "month" ? "0 1px 3px rgba(0,0,0,.12)" : "none" }}>Mês</button>
                            <button type="button" aria-pressed={calendarView === "week"} onClick={() => setCalendarView("week")} style={{ ...buttonStyle, minHeight: 30, border: 0, background: calendarView === "week" ? "var(--editor-bg, Canvas)" : "transparent", boxShadow: calendarView === "week" ? "0 1px 3px rgba(0,0,0,.12)" : "none" }}>Semana</button>
                        </div>
                    </div>
                    </div>

                <div className="calendar-view-dates" aria-label={calendarView === "month" ? "Calendário mensal" : "Calendário semanal"}>
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${scheduleWeekdays.length}, minmax(0, 1fr))`, gap: 5, marginBottom: 5 }}>
                        {scheduleWeekdays.map(day => <div key={day.weekday} className="calendar-muted" style={{ padding: "5px 7px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>{rotuloDiaComHorario(day.weekday, day.name, calendarHours)}</div>)}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${scheduleWeekdays.length}, minmax(0, 1fr))`, gap: 5 }}>
                        {visibleDates.map(date => {
                            const isSelected = date === selectedDate
                            const isCurrentMonth = calendarView === "week" || date.slice(0, 7) === visibleMonth
                            const count = appointmentCounts[date] || 0
                            const isPastDate = date < hojeIso()
                            const appointmentCardColor = allTimeMaxAppointments[selectedCalendarId] === undefined
                                ? { background: "var(--editor-bg, Canvas)", border: "var(--editor-border, color-mix(in srgb, CanvasText 18%, Canvas))" }
                                : corDoDia(count, appointmentP50, maxAppointmentsInCalendar)
                            const patientNames = appointmentNamesByDate[date] || []
                            return <button key={date} type="button" aria-pressed={isSelected} onClick={() => setSelectedDate(date)} style={{ display: "flex", minWidth: 0, minHeight: calendarView === "month" ? 64 : 100, flexDirection: "column", alignItems: "flex-start", gap: 5, padding: "8px 7px", borderRadius: 8, border: isSelected ? "2px solid var(--editor-text, CanvasText)" : `1px solid ${isPastDate ? "var(--editor-border, color-mix(in srgb, CanvasText 18%, Canvas))" : appointmentCardColor.border}`, background: isPastDate ? "var(--editor-bg, Canvas)" : appointmentCardColor.background, color: "var(--editor-text, CanvasText)", opacity: isCurrentMonth ? 1 : 0.5, textAlign: "left", cursor: "pointer" }}>
                                <span style={{ fontSize: 13, fontWeight: isSelected ? 750 : 550 }}>{Number(date.slice(-2))}</span>
                                {calendarView === "month" ? <span aria-label={`${count} agendamentos`} style={{ display: "inline-flex", alignItems: "center", maxWidth: "100%", borderRadius: 999, padding: "3px 7px", background: "rgba(120, 113, 108, .12)", color: "var(--meta-text, GrayText)", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>{count}</span> : <div style={{ display: "grid", gap: 3, width: "100%", maxHeight: 76, overflowY: "auto", fontSize: 10, lineHeight: 1.25 }}>{patientNames.map((name, index) => <span key={`${date}-${index}`} style={{ width: "100%", overflowWrap: "anywhere" }}>{name}</span>)}</div>}
                            </button>
                        })}
                    </div>
                </div>
                </section>

                <div className="calendar-content-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
                    <section className="calendar-surface" style={{ background: "var(--editor-bg, Canvas)", border: "1px solid var(--editor-border, color-mix(in srgb, CanvasText 20%, Canvas))", borderRadius: 12, padding: 18 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                            <div><h2 style={{ margin: 0, fontSize: 19, textTransform: "capitalize" }}>{rotuloData(selectedDate)}</h2><div className="calendar-muted" style={{ fontSize: 12, marginTop: 4 }}>{calendarDetailsReady ? `${appointments.length} agendamento${appointments.length === 1 ? "" : "s"}` : "Carregando consultas…"}</div>{scheduleConfigured ? <div className="calendar-muted" style={{ fontSize: 11, marginTop: 4 }}>{selectedDayHours.length ? selectedDayHours.map(hours => `${hours.starts_at.slice(0, 5)}–${hours.ends_at.slice(0, 5)}`).join(" · ") : "Fechado neste dia"}</div> : null}{staffAccess ? <div style={{ display: "flex", gap: 7, marginTop: 8 }}><button type="button" style={buttonStyle} onClick={abrirEditorDeHorarios}>Editar horários</button><button type="button" style={buttonStyle} onClick={() => setShowBlockForm(!showBlockForm)}>Bloquear horários</button></div> : null}</div>
                        </div>

                        {!calendarDetailsReady ? <p role="status" style={{ color: "var(--meta-text, GrayText)" }}>Carregando consultas e avisos…</p> : <>
                        {blocks.map(block => <div key={block.id} style={{ padding: "10px 12px", marginBottom: 9, borderRadius: 9, borderLeft: "4px solid #c99839", background: "#fff7e8", color: "#6c4d14", fontSize: 13 }}><strong>{block.label}</strong><span> · {new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(block.starts_at))}–{new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(block.ends_at))}</span></div>)}
                        {appointments.length ? appointments.map(appointment => {
                            const assigned = staff.find(person => person.id === appointment.staff_id)
                            return <article key={appointment.id} style={{ display: "grid", gap: 7, padding: 12, marginBottom: 9, border: "1px solid var(--editor-border, color-mix(in srgb, CanvasText 16%, Canvas))", borderRadius: 10, background: "var(--meta-bg, rgba(120,113,108,0.06))" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}><strong>{appointment.patient_name}</strong><span style={{ flex: "0 0 auto", fontVariantNumeric: "tabular-nums", color: "var(--meta-text, GrayText)", fontSize: 12, fontWeight: 700 }}>{appointment.start_time ? rotuloHora(appointment.start_time) : ""}</span></div>
                                <div>{assigned ? <div style={{ marginBottom: 4, color: assigned.color, fontSize: 12, fontWeight: 650 }}>{assigned.name}</div> : null}
                                    {fields.filter(field => appointment.custom_values[field.field_key] !== undefined && appointment.custom_values[field.field_key] !== "").map(field => <div key={field.id} style={{ marginTop: 5, color: "var(--meta-text, GrayText)", fontSize: 13 }}><strong style={{ color: "#475753" }}>{field.label}:</strong> {textoDoCampo(appointment.custom_values[field.field_key])}</div>)}
                                    {staffAccess ? <div style={{ display: "flex", gap: 7, marginTop: 9 }}><button type="button" style={buttonStyle} onClick={() => startEditingAppointment(appointment)}>Editar</button><button type="button" style={{ ...buttonStyle, color: "#a33a30" }} onClick={() => void deleteAppointment(appointment.id)}>Excluir</button></div> : null}
                                </div>
                            </article>
                        }) : <div style={{ padding: "24px 4px", color: "var(--meta-text, GrayText)", textAlign: "center" }}>Nenhum agendamento para esta data.</div>}
                        </>}
                    </section>

                    <section style={{ display: "grid", gap: 14 }}>
                        <form onSubmit={saveAppointment} className="calendar-surface" style={{ display: "grid", gap: 12, background: "var(--editor-bg, Canvas)", border: "1px solid var(--editor-border, color-mix(in srgb, CanvasText 20%, Canvas))", borderRadius: 12, padding: 18 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 }}><div><h2 style={{ margin: 0, fontSize: 19 }}>{editingAppointmentId ? "Editar agendamento" : "Novo agendamento"}</h2></div><div style={{ display: "flex", alignItems: "center", gap: 6 }}><button type="button" aria-label={staffAccess ? "Bloquear edição da equipe" : "Desbloquear edição da equipe"} title={staffAccess ? "Edição da equipe ativa" : "Desbloquear edição da equipe"} onClick={toggleStaffAccess} style={{ ...buttonStyle, width: 40, minWidth: 40, height: 40, padding: 0, color: staffAccess ? "#3b82f6" : "var(--meta-text, GrayText)" }}><svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m14.5 5.5 4 4M4 20l4-.8L19 8.2a2.1 2.1 0 0 0-3-3L5 16.2 4 20Z" /></svg></button>{editingAppointmentId ? <button type="button" style={buttonStyle} onClick={cancelEditingAppointment}>Cancelar</button> : null}</div></div>
                            <label style={labelStyle}>Nome do paciente<input required maxLength={160} value={patientName} onChange={event => setPatientName(event.target.value)} onBlur={() => setPatientName(current => capitalizarSeTudoMaiusculo(current))} style={inputStyle} /></label>
                            <label style={labelStyle}>Horário (opcional)<input type="time" value={appointmentTime} onChange={event => setAppointmentTime(event.target.value)} style={inputStyle} /></label>
                            {scheduleConfigured && (!selectedDayIsOpen || !selectedTimeIsAllowed) ? <div role="status" style={{ padding: 9, borderRadius: 8, color: "#b45309", background: "rgba(245,158,11,.12)", fontSize: 12 }}>{!selectedDayIsOpen ? "Este calendário não atende no dia selecionado." : "O horário escolhido fica fora do horário de atendimento."}</div> : null}
                            {staff.some(person => person.is_active) ? <div style={{ display: "flex", alignItems: "end", gap: 7 }}><label style={{ ...labelStyle, flex: 1 }}>Profissional<select value={appointmentStaff} onChange={event => setAppointmentStaff(event.target.value)} style={inputStyle}><option value="">Equipe</option>{staff.filter(person => person.is_active).map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>{staffAccess ? <button type="button" aria-label="Gerenciar profissionais" title="Adicionar ou remover profissionais" onClick={openStaffManager} style={{ ...buttonStyle, width: 32, minWidth: 32, height: 32, padding: 0, color: "var(--meta-text, GrayText)" }}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m14.5 5.5 4 4M4 20l4-.8L19 8.2a2.1 2.1 0 0 0-3-3L5 16.2 4 20Z" /></svg></button> : null}</div> : staffAccess ? <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 7 }}><span style={{ ...labelStyle, display: "block" }}>Profissional</span><button type="button" aria-label="Gerenciar profissionais" title="Adicionar profissionais" onClick={openStaffManager} style={{ ...buttonStyle, width: 32, minWidth: 32, height: 32, padding: 0, color: "var(--meta-text, GrayText)" }}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m14.5 5.5 4 4M4 20l4-.8L19 8.2a2.1 2.1 0 0 0-3-3L5 16.2 4 20Z" /></svg></button></div> : null}
                            {fields.filter(field => field.is_active !== false).map(field => <label key={field.id} style={labelStyle}>{field.label}{field.field_type === "dropdown" ? <select required={field.is_required} value={String(customValues[field.field_key] || "")} onChange={event => setCustomValue(field.field_key, event.target.value)} style={inputStyle}><option value="">Selecione…</option>{field.options.map(option => <option key={option} value={option}>{option}</option>)}</select> : field.field_type === "multi_select" ? <select multiple value={stringArray(customValues[field.field_key])} onChange={event => setCustomValue(field.field_key, Array.from(event.target.selectedOptions).map(option => option.value))} style={{ ...inputStyle, minHeight: 76 }}>{field.options.map(option => <option key={option} value={option}>{option}</option>)}</select> : field.field_type === "boolean" ? <select required={field.is_required} value={String(customValues[field.field_key] ?? "")} onChange={event => setCustomValue(field.field_key, event.target.value === "true" ? true : event.target.value === "false" ? false : "")} style={inputStyle}><option value="">Selecione…</option><option value="true">Sim</option><option value="false">Não</option></select> : <input required={field.is_required} type={field.field_type === "number" || field.field_type === "date" ? field.field_type : "text"} value={String(customValues[field.field_key] || "")} onChange={event => setCustomValue(field.field_key, field.field_type === "number" ? (event.target.value === "" ? "" : Number(event.target.value)) : event.target.value)} onBlur={field.field_type === "text" ? () => setCustomValue(field.field_key, capitalizarSeTudoMaiusculo(String(customValues[field.field_key] || ""))) : undefined} style={inputStyle} />}</label>)}
                            <button disabled={loading || saving || (Boolean(editingAppointmentId) && !staffAccess) || (scheduleConfigured && (!selectedDayIsOpen || !selectedTimeIsAllowed))} type="submit" style={primaryStyle}>{saving ? "Salvando…" : editingAppointmentId ? "Salvar alterações" : "Agendar"}</button>
                            {appointmentNotice ? <div role="status" style={{ padding: 10, borderRadius: 8, color: "#22c55e", background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.22)", fontSize: 13 }}>{appointmentNotice}</div> : null}
                        </form>
                        {staffAccess ? <button type="button" style={{ ...buttonStyle, justifySelf: "start" }} onClick={() => setShowFieldForm(!showFieldForm)}>+ Adicionar campo</button> : null}
                        {staffAccess && fields.length ? <section aria-label="Gerenciar campos" style={{ display: "grid", gap: 8, padding: 12, border: "1px solid var(--editor-border, color-mix(in srgb, CanvasText 18%, Canvas))", borderRadius: 10 }}><h3 style={{ margin: 0, fontSize: 14 }}>Campos do calendário</h3>{fields.map(field => <div key={field.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "8px 0", borderTop: "1px solid var(--editor-border, color-mix(in srgb, CanvasText 12%, Canvas))" }}><label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}><input type="checkbox" checked={field.is_active !== false} disabled={saving} onChange={event => void updateCalendarField(field, { is_active: event.target.checked })} /><span>{field.label}{field.is_active === false ? <span className="calendar-muted"> · Inativo</span> : null}</span></label><label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}><input type="checkbox" checked={field.is_required} disabled={saving} onChange={event => void updateCalendarField(field, { is_required: event.target.checked })} />Obrigatório</label></div>)}</section> : null}
                        {showFieldForm ? <form onSubmit={saveField} style={{ display: "grid", gap: 10, background: "var(--editor-bg, Canvas)", border: "1px solid var(--editor-border, color-mix(in srgb, CanvasText 20%, Canvas))", borderRadius: 14, padding: 16 }}><h3 style={{ margin: 0 }}>Novo campo personalizado</h3><label style={labelStyle}>Rótulo<input required value={fieldLabel} onChange={event => setFieldLabel(event.target.value)} style={inputStyle} /></label><label style={labelStyle}>Tipo<select value={fieldType} onChange={event => setFieldType(event.target.value)} style={inputStyle}><option value="text">Texto</option><option value="number">Número</option><option value="date">Data</option><option value="boolean">Sim/não</option><option value="dropdown">Lista de escolha</option><option value="multi_select">Múltipla escolha</option></select></label>{fieldType === "dropdown" || fieldType === "multi_select" ? <label style={labelStyle}>Opções, separadas por vírgula<input value={fieldOptions} onChange={event => setFieldOptions(event.target.value)} style={inputStyle} /></label> : null}<label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={fieldRequired} onChange={event => setFieldRequired(event.target.checked)} />Obrigatório</label><button disabled={saving} type="submit" style={primaryStyle}>Adicionar campo</button></form> : null}
                        {showBlockForm ? <form onSubmit={saveBlock} style={{ display: "grid", gap: 10, background: "var(--editor-bg, Canvas)", border: "1px solid var(--editor-border, color-mix(in srgb, CanvasText 20%, Canvas))", borderRadius: 14, padding: 16 }}><h3 style={{ margin: 0 }}>Aviso visual de indisponibilidade</h3><label style={labelStyle}>Descrição<input required value={blockLabel} onChange={event => setBlockLabel(event.target.value)} style={inputStyle} /></label><label style={labelStyle}>Início<input required type="datetime-local" value={blockStart} onChange={event => setBlockStart(event.target.value)} style={inputStyle} /></label><label style={labelStyle}>Fim<input required type="datetime-local" value={blockEnd} onChange={event => setBlockEnd(event.target.value)} style={inputStyle} /></label><button disabled={saving} type="submit" style={primaryStyle}>Criar aviso</button></form> : null}
                    </section>
                </div>
                </div>
            </> : null}
        </div>
    </main>
}
