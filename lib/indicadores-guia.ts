/* Guia completo de indicadores (Indicadores - Guia completo.tsv).
   Conversão do TSV original (Previne Brasil / boas práticas) para este módulo
   tipado. Cada "boa prática" virou uma PraticaGuia com a condição de
   aplicação (idade/sexo/fatores) para o paciente do bloco. */

export interface FatoresRastreio {
    tabagista: boolean
    dm: boolean
    hiv: boolean
    gestante: boolean
    has: boolean
}

export interface PraticaGuia {
    codigo: string
    texto: string
    responsavel: string
    metodo: string
    /* Coluna "Código indicador considerado" do guia: SIGTAP/CIAP-2/CID-10 que
       registram a boa prática no sistema (Fastmedic). É o que "prova" o
       indicador. Algumas práticas não têm (sinal "-" no TSV). */
    codigoConsiderado?: string
    condicao: (idade: number, sexo: string, f: FatoresRastreio) => boolean
}

/* Organiza o "código indicador considerado" do TSV em linhas limpas:
   - remove os bullets "·" e o prefixo "Código " ("Código CIAP-2" -> "CIAP-2");
   - CIAP-2 e CID-10 ficam em linhas separadas (não quebra os ";" deles);
   - procedimentos SIGTAP (que não são CIAP/CID) quebram por ";" — um por linha. */
export function formatarCodigoConsiderado(codigo: string): string[] {
    const linhas: string[] = []
    for (const parte of codigo.split(/\s*·\s*/)) {
        const limpa = parte.replace(/^Código\s+/, "").trim()
        if (!limpa) continue
        if (/^(CIAP-2|CID-10):/i.test(limpa)) {
            linhas.push(limpa)
            continue
        }
        for (const sub of limpa.split(/;\s*/)) {
            const subLimpa = sub.replace(/;$/, "").trim()
            if (subLimpa) linhas.push(subLimpa)
        }
    }
    return linhas
}

export interface IndicadorGuia {
    codigo: string
    nome: string
    meta: string
    praticas: PraticaGuia[]
}

const crianca = (i: number) => i >= 0 && i <= 2
const gestante = (_i: number, _s: string, f: FatoresRastreio) => f.gestante
const diabetica = (_i: number, _s: string, f: FatoresRastreio) => f.dm
const hipertensa = (_i: number, _s: string, f: FatoresRastreio) => f.has
const idosa = (i: number) => i >= 60
const feminino = (minimo: number, maximo: number) => (i: number, sexo: string) => sexo === "F" && i >= minimo && i <= maximo

export const INDICADORES_GUIA: IndicadorGuia[] = [
    {
        codigo: "C2",
        nome: "Cuidado no desenvolvimento infantil",
        meta: "75 a 100% das crianças de 0 a 2 anos com as boas práticas realizadas",
        praticas: [
            {
                codigo: "C2a",
                texto: "1ª consulta realizada até o 30º dia de vida.",
                responsavel: "Médico ou enfermeiro",
                metodo: "1 consulta em até 30 dias da data de nascimento",
                condicao: crianca,
            },
            {
                codigo: "C2b",
                texto: "Pelo menos 9 consultas até os 2 anos de vida.",
                responsavel: "Médico ou enfermeiro",
                metodo: "9 consultas em até 24 meses da data de nascimento",
                condicao: crianca,
            },
            {
                codigo: "C2c",
                texto: "Pelo menos 9 registros simultâneos de peso e altura até os 2 anos.",
                responsavel: "Qualquer profissional",
                metodo: "9 registros simultâneos de peso e altura em até 24 meses da data de nascimento",
                condicao: crianca,
            },
            {
                codigo: "C2d",
                texto: "Pelo menos 2 visitas domiciliares por ACS (1ª até 30 dias; 2ª até 6 meses).",
                responsavel: "ACS",
                metodo: "1 visita em até 30 dias + 1 visita em até 6 meses",
                condicao: crianca,
            },
            {
                codigo: "C2e",
                texto: "Vacinas contra difteria, tétano, coqueluche, hepatite B, Hib, pólio, sarampo, caxumba, rubéola e pneumocócica.",
                responsavel: "Qualquer profissional",
                metodo: "Calendário vacinal atualizado",
                condicao: crianca,
            },
        ],
    },
    {
        codigo: "C3",
        nome: "Cuidado na gestação e puerpério",
        meta: "75 a 100% das gestantes e puérperas com as boas práticas realizadas",
        praticas: [
            {
                codigo: "C3a",
                codigoConsiderado: "· CIAP-2: W03; W78; W79; W81; W84; W85; e/ou · CID-10: O10, O11, O12, O13, O14, O15, O16, O20, O21, O22, O23, O24, O25, O26, O28, O29, O30, O31, O32, O33, O34, O35, O36, O40, O41, O43, O44, O46, O47, O48, O75.2, O75.3, O98, O99.0, O99.1, O99.2, O99.3, O99.4, O99.5, O99.6, O99.7, Z32.1, Z33, Z34, Z35, Z36 e Z64.0",
                texto: "1ª consulta de pré-natal realizada até a 12ª semana de gestação.",
                responsavel: "Médico ou enfermeiro",
                metodo: "1 consulta com registro de gestação em até 12 semanas da DUM",
                condicao: gestante,
            },
            {
                codigo: "C3b",
                texto: "Pelo menos 7 consultas durante a gestação.",
                responsavel: "Médico ou enfermeiro",
                metodo: "7 consultas com registro de código indicativo de gestação",
                condicao: gestante,
            },
            {
                codigo: "C3c",
                texto: "Pelo menos 7 aferições de pressão arterial na gestação.",
                responsavel: "Qualquer profissional",
                metodo: "7 registros de pressão arterial",
                condicao: gestante,
            },
            {
                codigo: "C3d",
                texto: "Pelo menos 7 registros simultâneos de peso e altura na gestação.",
                responsavel: "Qualquer profissional",
                metodo: "7 registros simultâneos de peso e altura",
                condicao: gestante,
            },
            {
                codigo: "C3e",
                texto: "Pelo menos 3 visitas domiciliares por ACS após a 1ª consulta do pré-natal.",
                responsavel: "ACS",
                metodo: "3 registros de visita domiciliar após a consulta de início do pré-natal ativo",
                condicao: gestante,
            },
            {
                codigo: "C3f",
                texto: "Vacina dTpa registrada a partir da 20ª semana de cada gestação.",
                responsavel: "Qualquer profissional",
                metodo: "Calendário vacinal atualizado para gestante",
                condicao: gestante,
            },
            {
                codigo: "C3g",
                codigoConsiderado: "· 02.14.01.004-0 - Teste rápido para detecção de HIV na gestante ou pai/parceiro; 02.14.01.027-9 - teste rápido para detecção de anticorpos anti-HIV em gestante; 02.14.01.005-8 - Teste rápido para detecção de infecção pelo HIV; 02.13.01.078-0 - Detecção rápida da carga viral do HIV; 02.13.01.050-0 - Quantificação da carga viral do HIV (RNA); 02.02.03.030-0 - Pesquisa de Anticorpos Anti-Hiv-1 + Hiv-2 (Elisa); 02.02.03.031-8 - Pesquisa de Anticorpos Anti-Htlv-1 + Htlv-2 · 02.14.01.007-4 - Teste rápido para sífilis; 02.14.01.008-2 - Teste rápido para sífilis na gestante ou pai/parceiro; 02.14.01.025-2 - Teste rápido treponêmico (sífilis) em gestante; 02.02.03.109-8 - Teste treponêmico para detecção de sífilis; 02.02.03.111-0 - Teste não treponêmico para detecção de sífilis; 02.02.03.117-9 - Teste não treponêmico para detecção de sífilis em gestante · 02.14.01.009-0 - Teste rápido para detecção de hepatite C; 02.14.01.030-9 - Teste rápido para detecção de anticorpos contra o vírus da hepatite C em gestante; 02.02.03.005-9 - Detecção de RNA do vírus da hepatite C (qualitativo); 02.02.03.067-9 - Pesquisa de anticorpos contra o vírus da hepatite C (anti-HCV) · 02.14.01.010-4 - Teste rápido para detecção de infecção pelo HBV; 02.14.01.023-6 - teste rápido para detecção do antígeno de superfície do vírus da hepatite B - HBV (HBSAG) em gestante; 02.02.03.078-4 - Pesquisa de anticorpos IgG e IgM contra o antígeno central do vírus da hepatite B (anti-HBC total); 02.02.03.097-0 - Pesquisa de antígeno de superfície do vírus da hepatite B (HBsAG); 02.13.01.020-8 - Identificação do vírus da hepatite B por PCR (quantitativo)",
                texto: "Testes rápidos de sífilis, HIV e hepatites B e C no 1º trimestre.",
                responsavel: "Qualquer profissional",
                metodo: "Solicitação ou realização de testes rápidos em Fastmedic em até 14 semanas",
                condicao: gestante,
            },
            {
                codigo: "C3h",
                texto: "Testes rápidos de sífilis e HIV no 3º trimestre.",
                responsavel: "Qualquer profissional",
                metodo: "Solicitação ou realização de testes rápidos em Fastmedic entre 28 e 42 semanas",
                condicao: gestante,
            },
            {
                codigo: "C3i",
                codigoConsiderado: "· CIAP-2: 48; 49; P29; W18; W19; W70; W90; W91; W92; W93; W94; W95; W96; e/ou · CID-10: F53, F53.0, F53.1, F53.8, F53.9, M83.0, O10, O15.2, O26.6, O72.2, O72.3, O85, O86, O87, O90, O91, O92, O94, O98, O99, Z37.0, Z37.1, Z37.2, Z37.3, Z37.4, Z37.5, Z37.6, Z37.7, Z37.9, Z38 e Z39.",
                texto: "Pelo menos 1 consulta no puerpério (até 42 dias).",
                responsavel: "Médico ou enfermeiro",
                metodo: "1 consulta com registro de código de puerpério em até 42 dias",
                condicao: gestante,
            },
            {
                codigo: "C3j",
                texto: "Pelo menos 1 visita domiciliar por ACS no puerpério (até 42 dias).",
                responsavel: "ACS",
                metodo: "1 registro de visita domiciliar por ACS em até 42 dias após o encerramento da gestação",
                condicao: gestante,
            },
            {
                codigo: "C3k",
                texto: "Pelo menos 1 atividade de saúde bucal durante a gestação.",
                responsavel: "Cirurgião dentista ou técnico de saúde bucal",
                metodo: "1 atividade registrada",
                condicao: gestante,
            },
        ],
    },
    {
        codigo: "C4",
        nome: "Cuidado da pessoa com diabetes",
        meta: "75 a 100% dos diabéticos com as boas práticas realizadas",
        praticas: [
            {
                codigo: "C4a",
                codigoConsiderado: "· CIAP-2: T89; T90; e/ou · CID-10: E10; E11; E14.",
                texto: "Pelo menos 1 consulta de diabetes nos últimos 6 meses.",
                responsavel: "Médico ou enfermeiro",
                metodo: "1 consulta com código de diabetes nos últimos 6 meses",
                condicao: diabetica,
            },
            {
                codigo: "C4b",
                texto: "Pelo menos 1 aferição de pressão arterial nos últimos 6 meses.",
                responsavel: "Qualquer profissional",
                metodo: "1 registro de PA nos últimos 6 meses",
                condicao: diabetica,
            },
            {
                codigo: "C4c",
                texto: "Pelo menos 1 registro de peso e altura nos últimos 12 meses.",
                responsavel: "Qualquer profissional",
                metodo: "1 registro simultâneo de peso e altura nos últimos 12 meses",
                condicao: diabetica,
            },
            {
                codigo: "C4d",
                texto: "Pelo menos 2 visitas domiciliares por ACS (intervalo ≥ 30 dias) nos últimos 12 meses.",
                responsavel: "ACS",
                metodo: "2 visitas espaçadas em ≥ 30 dias nos últimos 12 meses",
                condicao: diabetica,
            },
            {
                codigo: "C4e",
                codigoConsiderado: "· 02.02.01.050-3 - Dosagem de hemoglobina glicosilada",
                texto: "Pelo menos 1 hemoglobina glicada solicitada ou avaliada nos últimos 12 meses.",
                responsavel: "Médico ou enfermeiro",
                metodo: "Solicitação ou realização de hemoglobina glicada em Fastmedic nos últimos 12 meses",
                condicao: diabetica,
            },
            {
                codigo: "C4f",
                codigoConsiderado: "· 03.01.04.009-5 - Exame do pé diabético",
                texto: "Pelo menos 1 avaliação dos pés nos últimos 12 meses.",
                responsavel: "Médico ou enfermeiro",
                metodo: "Solicitação ou realização de exame do pé diabético em Fastmedic nos últimos 12 meses",
                condicao: diabetica,
            },
        ],
    },
    {
        codigo: "C5",
        nome: "Cuidado à pessoa com hipertensão",
        meta: "75 a 100% dos hipertensos com as boas práticas realizadas",
        praticas: [
            {
                codigo: "C5a",
                codigoConsiderado: "· CIAP-2: K86; K87; e/ou · CID-10: I10; I11; I12; I13; I15; O10; O11.",
                texto: "Pelo menos 1 consulta de hipertensão nos últimos 6 meses.",
                responsavel: "Médico ou enfermeiro",
                metodo: "1 consulta com código de hipertensão nos últimos 6 meses",
                condicao: hipertensa,
            },
            {
                codigo: "C5b",
                texto: "Pelo menos 1 aferição de pressão arterial nos últimos 6 meses.",
                responsavel: "Qualquer profissional",
                metodo: "1 registro de PA nos últimos 6 meses",
                condicao: hipertensa,
            },
            {
                codigo: "C5c",
                texto: "Pelo menos 1 registro de peso e altura nos últimos 12 meses.",
                responsavel: "Qualquer profissional",
                metodo: "1 registro simultâneo de peso e altura nos últimos 12 meses",
                condicao: hipertensa,
            },
            {
                codigo: "C5d",
                texto: "Pelo menos 2 visitas domiciliares por ACS nos últimos 12 meses.",
                responsavel: "ACS",
                metodo: "2 visitas espaçadas em ≥ 30 dias nos últimos 12 meses",
                condicao: hipertensa,
            },
        ],
    },
    {
        codigo: "C6",
        nome: "Cuidado da pessoa idosa",
        meta: "75 a 100% dos idosos (≥ 60 anos) com as boas práticas realizadas",
        praticas: [
            {
                codigo: "C6a",
                texto: "Pelo menos 1 consulta nos últimos 12 meses.",
                responsavel: "Médico ou enfermeiro",
                metodo: "1 consulta com idade igual ou maior que 60 anos nos últimos 12 meses",
                condicao: idosa,
            },
            {
                codigo: "C6b",
                texto: "Pelo menos 1 registro de peso e altura nos últimos 12 meses.",
                responsavel: "Qualquer profissional",
                metodo: "1 registro simultâneo de peso e altura nos últimos 12 meses",
                condicao: idosa,
            },
            {
                codigo: "C6c",
                texto: "Pelo menos 2 visitas domiciliares por ACS (intervalo ≥ 30 dias) nos últimos 12 meses.",
                responsavel: "ACS",
                metodo: "2 visitas espaçadas em ≥ 30 dias nos últimos 12 meses",
                condicao: idosa,
            },
            {
                codigo: "C6d",
                texto: "1 dose da vacina contra influenza nos últimos 12 meses.",
                responsavel: "Qualquer profissional",
                metodo: "Calendário vacinal atualizado com dose de influenza",
                condicao: idosa,
            },
        ],
    },
    {
        codigo: "C7",
        nome: "Cuidado da mulher na prevenção do câncer",
        meta: "75 a 100% das mulheres e homens transgêneros nas faixas prioritárias com as boas práticas",
        praticas: [
            {
                codigo: "C7a",
                codigoConsiderado: "· 02.01.02.003-3 - Coleta de citopatológico de colo uterino; 02.03.01.008-6 - Exame citopatológico cérvico-vaginal/microflora de rastreamento; 02.03.01.001-9 - Exame citopatológico cérvico-vaginal/microflora; 02.01.02.007-6 - Coleta de material do colo do útero para exame molecular de detecção de HPV; 02.01.02.008-4 - Entrega de material obtido por auto coleta para exame molecular para detecção de HPV, no colo do útero · 02.02.10.025-1 - Exame molecular de detecção de HPV (considerado 60 meses de intervalo)",
                texto: "Rastreio de câncer do colo do útero (citologia ≤ 36 meses; teste molecular de HPV ≤ 60 meses).",
                responsavel: "Médico ou enfermeiro",
                metodo: "Solicitação ou realização de exame de rastreamento de câncer de colo do útero nos últimos 36 meses, ou 60 meses se teste molecular de detecção de HPV — faixa de 25 a 64 anos.",
                condicao: feminino(25, 64),
            },
            {
                codigo: "C7b",
                texto: "Pelo menos 1 dose da vacina HPV.",
                responsavel: "Qualquer profissional",
                metodo: "Calendário vacinal atualizado com dose contra HPV — meninas de 9 a 14 anos.",
                condicao: feminino(9, 14),
            },
            {
                codigo: "C7c",
                codigoConsiderado: "· Código CIAP-2: B25; W02; W10; W11; W12; W13; W14; W15; W79; W82; X01; X02; X03; X04; X05; X06; X07; X08; X09; X10; X11; X12; X13; X23; X24; X82; X89; Y14; e/ou · Código CID-10: N80; N91; N92; N93; N94; N95; N96; N97; O03; O04; R102; T742; Y05; Z12; Z20; Z30; Z31; Z320; Z600; Z630; Z640; Z70; Z717; Z725",
                texto: "Pelo menos 1 atendimento sobre atenção à saúde sexual e reprodutiva nos últimos 12 meses.",
                responsavel: "Médico ou enfermeiro",
                metodo: "1 consulta com código indicador de atenção à saúde sexual e reprodutiva nos últimos 12 meses — faixa de 14 a 69 anos.",
                condicao: feminino(14, 69),
            },
            {
                codigo: "C7d",
                codigoConsiderado: "02.04.03.003-0 - Mamografia; 02.04.03.018-8 - Mamografia bilateral para rastreamento",
                texto: "Mamografia de rastreamento solicitada ou avaliada nos últimos 24 meses.",
                responsavel: "Médico ou enfermeiro",
                metodo: "Solicitação ou realização de mamografia nos últimos 24 meses — faixa de 50 a 69 anos.",
                condicao: feminino(50, 69),
            },
        ],
    },
]