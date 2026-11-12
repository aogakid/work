import type { NextApiRequest, NextApiResponse } from "next"

interface ServerDateResponse {
    /* Data de hoje no fuso de São Paulo, no formato YYYY-MM-DD. */
    date: string
    /* Mesma data no formato DD/MM/YYYY, para exibição. */
    today: string
}

const formatarDataServidor = (): ServerDateResponse => {
    const agora = new Date()
    const partes = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "numeric",
        day: "numeric",
    }).formatToParts(agora)
    const dia = String(partes.find(parte => parte.type === "day")?.value || "").padStart(2, "0")
    const mes = String(partes.find(parte => parte.type === "month")?.value || "").padStart(2, "0")
    const ano = partes.find(parte => parte.type === "year")?.value || ""
    return { date: `${ano}-${mes}-${dia}`, today: `${dia}/${mes}/${ano}` }
}

export default function handler(_req: NextApiRequest, res: NextApiResponse<ServerDateResponse>) {
    res.setHeader("Cache-Control", "no-store")
    res.status(200).json(formatarDataServidor())
}
