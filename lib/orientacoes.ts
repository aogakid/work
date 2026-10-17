/* ── Orientações ──────────────────────────────────────────────────────
   Catálogo de orientações entregues ao paciente: o mesmo item pode ser um
   PDF (impresso) ou um texto em markdown (copiado). O PDF mora em
   `public/contents/...` e o markdown vive aqui, em `texto`.
   Cada entrada vira um card no componente OrientacoesUI. */

export interface Orientacao {
    id: string
    titulo: string
    tipo: "pdf" | "md"
    /* Caminho do PDF servido a partir de `public/` (ex.: "/contents/..."). */
    arquivo?: string
    /* Texto markdown copiável (apenas para `tipo: "md"`). */
    texto?: string
}

export const ORIENTACOES: Orientacao[] = [
    {
        id: "higiene-do-sono",
        titulo: "Higiene do sono",
        tipo: "pdf",
        arquivo: "/contents/orientacoes/Higiene do sono.pdf",
    },
    {
        id: "drge",
        titulo: "DRGE",
        tipo: "pdf",
        arquivo: "/contents/orientacoes/DRGE.pdf",
    },
    {
        id: "hipertensao-arterial",
        titulo: "Hipertensão arterial",
        tipo: "pdf",
        arquivo: "/contents/orientacoes/Hipertensão.pdf",
    },
    {
        id: "anemia-ferropriva",
        titulo: "Anemia ferropriva",
        tipo: "md",
        texto: `Evite junto com as refeições principais
- Chá preto, chá-mate, café e leite.

Prefira
- Carne vermelha magra, fígado, rim, frango (coxa e sobrecoxa), peixe e ovo.
- Feijão, lentilha, ervilha, couve, espinafre e beterraba.
- Consuma junto uma fonte de vitamina C, como laranja, acerola, caju, goiaba, limão ou pimentão.`,
    },
    {
        id: "constipacao",
        titulo: "Constipação",
        tipo: "pdf",
        arquivo: "/contents/orientacoes/Constipação.pdf",
    },
    {
        id: "dislipidemia",
        titulo: "Dislipidemia",
        tipo: "md",
        texto: `Evite
- Gordura de coco, banha de porco, pele de frango e carnes gordas (costela, cupim e picanha).
- Fígado, embutidos (linguiça, salsicha, salame, presunto e mortadela) e frituras.
- Biscoito recheado, salgadinhos, margarina, bebidas alcoólicas, açúcar e doces.

Prefira
- Sardinha, atum e outros peixes; feijão, lentilha, grão-de-bico e aveia.
- Azeite, castanha-de-caju, amendoim e linhaça moída.
- Frango sem pele e ovo.
- Frutas com casca, verduras e legumes, como maxixe, chuchu, jiló, berinjela, abobrinha, cenoura, couve, repolho, brócolis, espinafre e rúcula.`,
    },
    {
        id: "diabetes-mellitus",
        titulo: "Diabetes mellitus",
        tipo: "pdf",
        arquivo: "/contents/orientacoes/Diabetes.pdf",
    },
    {
        id: "neuroestimulo",
        titulo: "Neuroestímulo",
        tipo: "md",
        texto: `Exposição a telas
- Evite telas (celular, tablet, notebook e televisão): no máximo zero horas por dia.
- Faça leitura compartilhada todos os dias.
- Ofereça brincadeiras e brinquedos interativos.

Sono
- Mantenha horários fixos para dormir e acordar.
- Organize um ambiente escuro, silencioso e confortável na hora de dormir.
- Incentive jogos ao ar livre e esportes coletivos.

Introdução alimentar
- Ofereça alimentos com diferentes texturas, cores e sabores.
- Evite distrações durante as refeições e não force a alimentação.
- Envolva a criança no preparo dos alimentos.

Comunicação
- Converse de forma clara e calma.
- Narre atividades do dia a dia e nomeie objetos e sentimentos.
- Valorize diferentes formas de comunicação: apontar, gesticular e usar expressões faciais e sons.`,
    },
]

/** Filtra o catálogo por título (case-insensitive). */
export function buscarOrientacoes(termo: string): Orientacao[] {
    const alvo = termo.trim().toLowerCase()
    if (!alvo) return ORIENTACOES
    return ORIENTACOES.filter((o) => o.titulo.toLowerCase().includes(alvo))
}
