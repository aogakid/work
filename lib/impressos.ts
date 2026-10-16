export interface Impresso {
    id: string
    titulo: string
    arquivo: string
}

export const IMPRESSOS: Impresso[] = [
    { id: "ampa-simplificado", titulo: "AMPA simplificado", arquivo: "/contents/ferramentas/AMPA simplificado.pdf" },
    { id: "ampa", titulo: "AMPA", arquivo: "/contents/ferramentas/AMPA.pdf" },
    { id: "escala-de-lanss-e-eva", titulo: "Escala de Lanss e EVA", arquivo: "/contents/ferramentas/Escala de Lanss e EVA.pdf" },
    { id: "passe-livre-intermunicipal", titulo: "Passe livre intermunicipal", arquivo: "/contents/ferramentas/Passe livre intermunicipal.pdf" },
    { id: "passe-livre-municipal-etu-for", titulo: "Passe livre municipal - ETUFOR", arquivo: "/contents/ferramentas/Passe livre municipal - ETUFOR.pdf" },
    { id: "receituario-ilustrado", titulo: "Receituário ilustrado", arquivo: "/contents/ferramentas/Receituario Ilustrado.pdf" },
    { id: "receituario-controle-especial", titulo: "Receituário de controle especial", arquivo: "/contents/ferramentas/Receituario de controle especial.pdf" },
    { id: "receituario-simples", titulo: "Receituário simples", arquivo: "/contents/ferramentas/Receituario simples.pdf" },
    { id: "ficha-emad", titulo: "Ficha EMAD", arquivo: "/contents/ferramentas/ficha emad.pdf" },
    { id: "meem", titulo: "MEEM", arquivo: "/contents/ferramentas/geriatria/MEEM.pdf" },
    { id: "mini-cog", titulo: "Mini COG", arquivo: "/contents/ferramentas/geriatria/Mini COG.pdf" },
    { id: "moca", titulo: "MoCA", arquivo: "/contents/ferramentas/geriatria/MoCA.pdf" },
    { id: "pfeffer", titulo: "Pfeffer", arquivo: "/contents/ferramentas/geriatria/Pfeffer.pdf" },
    { id: "guia-de-insulinoterapia", titulo: "Guia de insulinoterapia", arquivo: "/contents/ferramentas/manuais/Guia de insulinoterapia.pdf" },
    { id: "mapa-glicemico-gestantes", titulo: "Mapa glicêmico - Gestantes", arquivo: "/contents/ferramentas/mapas glicemicos/Gestantes.pdf" },
    { id: "mapa-glicemico-nph-noturna-matinal", titulo: "Mapa glicêmico - NPH noturna e matinal", arquivo: "/contents/ferramentas/mapas glicemicos/NPH - noturna e matinal.pdf" },
    { id: "mapa-glicemico-nph-so-noturna", titulo: "Mapa glicêmico - NPH só noturna", arquivo: "/contents/ferramentas/mapas glicemicos/NPH - so noturna.pdf" },
    { id: "mapa-glicemico-regular-descompensado-drc", titulo: "Mapa glicêmico - Regular descompensado ou DRC", arquivo: "/contents/ferramentas/mapas glicemicos/Regular - Descompensado ou DRC.pdf" },
    { id: "mapa-glicemico-regular-compensado", titulo: "Mapa glicêmico - Regular compensado", arquivo: "/contents/ferramentas/mapas glicemicos/Regular - compensado.pdf" },
    { id: "implanon-termo-checklist", titulo: "Implanon - termo e checklist", arquivo: "/contents/ferramentas/procedimentos ambulatoriais/implanon/Implanon - termo e checklist.pdf" },
    { id: "implanon-modelo-fastmedic", titulo: "Implanon - modelo fastmedic", arquivo: "/contents/ferramentas/procedimentos ambulatoriais/implanon/Implanon - modelo fastmedic.docx" },
    { id: "pequena-cirurgia-termo-ficha", titulo: "Pequena cirurgia - termo e ficha", arquivo: "/contents/ferramentas/procedimentos ambulatoriais/pequena cirurgia/Pequena cirurgia - termo e ficha.pdf" },
    { id: "pequena-cirurgia-modelo-fastmedic", titulo: "Pequena cirurgia - modelo fastmedic", arquivo: "/contents/ferramentas/procedimentos ambulatoriais/pequena cirurgia/Pequena cirurgia - modelo fastmedic.docx" },
]

export function buscarImpressos(termo: string): Impresso[] {
    const alvo = termo.trim().toLowerCase()
    if (!alvo) return IMPRESSOS
    return IMPRESSOS.filter((impresso) => impresso.titulo.toLowerCase().includes(alvo))
}

export function diretorioImpresso(impresso: Impresso): string[] {
    const prefixo = "/contents/ferramentas/"
    if (!impresso.arquivo.startsWith(prefixo)) return []
    return impresso.arquivo.slice(prefixo.length).split("/").slice(0, -1)
}
