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
}

/* ── Registry ─────────────────────────────────────────────────────── */
import CalculadoraPREVENT from "../ui/escores_ui"
import PuericulturaUI from "../ui/puericultura_ui"
import CalculadoraGestacional from "../ui/prenatal_ui"
import ExamesUI from "../ui/exames_ui"
import RastreiosPreventivos from "../ui/rastreios_ui"
import GeriatriaUI from "../ui/geriatria_ui"

export const COMPANIONS: CompanionConfig[] = [
    {
        id: "escores",
        label: "Risco cardiovascular",
        component: CalculadoraPREVENT,
        outputGroups: [
            { id: "risco", label: "PREVENT", targetSection: "objetivo" },
            { id: "ipss", label: "IPSS", targetSection: "objetivo" },
            { id: "gad7", label: "GAD-7", targetSection: "objetivo" },
            { id: "phq9", label: "PHQ-9", targetSection: "objetivo" },
        ],
    },
    {
        id: "exames",
        label: "Exames laboratoriais",
        component: ExamesUI,
        outputGroups: [
            { id: "todos", label: "lab", targetSection: "objetivo" },
        ],
    },
    {
        id: "rastreios",
        label: "Rastreios",
        component: RastreiosPreventivos,
        outputGroups: [],
    },
    {
        id: "geriatria",
        label: "Geriatria",
        component: GeriatriaUI,
        outputGroups: [
            { id: "tudo", label: "avaliação", targetSection: "subjetivo" },
            { id: "ivcf20", label: "IVCF-20", targetSection: "objetivo" },
            { id: "cage", label: "CAGE", targetSection: "objetivo" },
            { id: "gds15", label: "GDS-15", targetSection: "objetivo" },
            { id: "cfs", label: "CFS", targetSection: "objetivo" },
        ],
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
    },
    {
        id: "prenatal",
        label: "Pré-natal",
        component: CalculadoraGestacional,
        outputGroups: [
            { id: "ig_dpp", label: "IG + DPP", targetSection: "avaliacao" },
        ],
    },
]
