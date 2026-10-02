import type { ForwardRefExoticComponent, RefAttributes } from "react"

/* ── Types ────────────────────────────────────────────────────────── */

export interface CompanionActions {
    getOutput(groupId: string): string | null
    reset(): void
}

export type CompanionRef = CompanionActions

export interface OutputGroup {
    id: string
    label: string
    targetSection: "subjetivo" | "objetivo" | "avaliacao" | "plano"
}

export interface CompanionConfig {
    id: string
    label: string
    component: ForwardRefExoticComponent<RefAttributes<CompanionActions>>
    outputGroups: OutputGroup[]
    placement?: "after-subjetivo" | "after-objetivo" | "after-plano" | "none"
    when?: (ctx: ContextoPaciente) => boolean
}

/* ── Registry ─────────────────────────────────────────────────────── */
import CalculadoraPREVENT from "../ui/escores_ui"
import PuericulturaUI from "../ui/puericultura_ui"
import CalculadoraGestacional from "../ui/prenatal_ui"
import ExamesUI from "../ui/exames_ui"
import RastreiosPreventivos from "../ui/rastreios_ui"
import GeriatriaUI from "../ui/geriatria_ui"
import PsiquiatriaUI from "../ui/psiquiatria_ui"
import EncaminhaUI from "../ui/encaminha_ui"
import { CONTEXTO_VAZIO, type ContextoPaciente } from "../../lib/contexto-paciente"

/* ── Visibility rules driven by the Identificação form ────────────── */
const ctxSeguro = (ctx: ContextoPaciente | undefined) => ctx || CONTEXTO_VAZIO
const idadeMinima = (ctx: ContextoPaciente | undefined, min: number) => {
    const c = ctxSeguro(ctx)
    return c.idade === null || c.idade >= min
}
const idadeMaxima = (ctx: ContextoPaciente | undefined, max: number) => {
    const c = ctxSeguro(ctx)
    return c.idade === null || c.idade < max
}
const idadeAcima = (ctx: ContextoPaciente | undefined, min: number) => {
    const idade = ctxSeguro(ctx).idade
    return idade === null || idade > min
}
const somenteFeminino = (ctx: ContextoPaciente | undefined) => {
    const sexo = ctxSeguro(ctx).sexo
    return sexo === "" || sexo === "F"
}

export const COMPANIONS: CompanionConfig[] = [
    {
        id: "escores",
        label: "Escores",
        component: CalculadoraPREVENT,
        outputGroups: [
            { id: "risco", label: "PREVENT", targetSection: "objetivo" },
            { id: "ipss", label: "IPSS", targetSection: "objetivo" },
            { id: "gad7", label: "GAD-7", targetSection: "objetivo" },
            { id: "phq9", label: "PHQ-9", targetSection: "objetivo" },
            { id: "audit", label: "AUDIT", targetSection: "objetivo" },
            { id: "fagerstrom", label: "Fagerström", targetSection: "objetivo" },
            { id: "tabagismo", label: "Tabagismo", targetSection: "avaliacao" },
            { id: "carga", label: "Carga tabágica", targetSection: "subjetivo" },
        ],
        placement: "after-objetivo",
        when: (ctx) => idadeMinima(ctx, 18),
    },
    {
        id: "exames",
        label: "Exames",
        component: ExamesUI,
        outputGroups: [
            { id: "todos", label: "lab", targetSection: "objetivo" },
            { id: "ampa", label: "AMPA", targetSection: "objetivo" },
            { id: "glicemia", label: "Glicemia", targetSection: "objetivo" },
        ],
        placement: "after-objetivo",
    },
    {
        id: "geriatria",
        label: "Geriatria",
        component: GeriatriaUI,
        outputGroups: [
            { id: "tudo", label: "avaliação", targetSection: "subjetivo" },
            { id: "ivcf20", label: "IVCF-20", targetSection: "objetivo" },
            { id: "katzlawton", label: "Katz/Lawton", targetSection: "objetivo" },
            { id: "cage", label: "CAGE", targetSection: "objetivo" },
            { id: "gds15", label: "GDS-15", targetSection: "objetivo" },
            { id: "cfs", label: "CFS", targetSection: "objetivo" },
            { id: "cdr", label: "CDR", targetSection: "objetivo" },
        ],
        placement: "after-objetivo",
        when: (ctx) => idadeMinima(ctx, 60),
    },
    {
        id: "psiquiatria",
        label: "Exame mental",
        component: PsiquiatriaUI,
        outputGroups: [
            { id: "tudo", label: "exame do estado mental", targetSection: "objetivo" },
        ],
        placement: "after-objetivo",
    },
    {
        id: "puericultura",
        label: "Puericultura",
        component: PuericulturaUI,
        outputGroups: [
            { id: "geral", label: "geral", targetSection: "subjetivo" },
            { id: "crescimento", label: "crescimento", targetSection: "objetivo" },
            { id: "desenvolvimento", label: "desenvolvimento", targetSection: "objetivo" },
        ],
        placement: "after-objetivo",
        when: (ctx) => idadeMaxima(ctx, 20),
    },
    {
        id: "prenatal",
        label: "Pré-natal",
        component: CalculadoraGestacional,
        outputGroups: [
            { id: "ig_dpp", label: "IG + DPP", targetSection: "avaliacao" },
            { id: "risco", label: "Risco gestacional (MS)", targetSection: "avaliacao" },
        ],
        placement: "after-objetivo",
        when: (ctx) => somenteFeminino(ctx) && idadeAcima(ctx, 14),
    },
    {
        id: "rastreios",
        label: "Rastreios",
        component: RastreiosPreventivos,
        outputGroups: [],
        placement: "after-objetivo",
    },
    {
        id: "encaminha",
        label: "Encaminha",
        component: EncaminhaUI,
        outputGroups: [
            { id: "texto", label: "encaminhamento", targetSection: "plano" },
        ],
        placement: "after-plano",
        when: () => false,
    },
]
