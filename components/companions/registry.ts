import type { ForwardRefExoticComponent, RefAttributes } from "react"

/* ── Types ────────────────────────────────────────────────────────── */

export interface CompanionActions {
    getOutput(groupId: string): string | null
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

export const COMPANIONS: CompanionConfig[] = [
    {
        id: "escores",
        label: "Risco cardiovascular",
        component: CalculadoraPREVENT,
        outputGroups: [
            { id: "risco", label: "PREVENT", targetSection: "objetivo" },
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
]
