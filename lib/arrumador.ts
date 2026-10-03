/* Arrumador (SOAP formatter) — the LLM pass used by the bloco's paint-brush
   button. It takes the raw text that was copied/pasted into the consultation
   and rewrites it into the block's own structure: `# title` plus the
   `## Dados base` / `## Lista de Problemas/Condições` / `## Subjetivo` /
   `## Objetivo` / `## Avaliação` / `## Plano` sections the forms parse.

   The skeleton below mirrors byte-for-byte what the composers in
   lib/dados-base.ts, lib/subjetivo.ts and lib/objetivo.ts emit, so whatever the
   model returns is parsed straight into the structured forms. `$` marks a field
   without information and is stripped before the text reaches the block. */

const WORKER_ARRUMADOR = "https://soapformatter.aogakid.workers.dev"
const MODELO_ARRUMADOR = "openai/gpt-oss-120b"

const tituloPadrao = "Consulta Agendada"

/* Raw prontuários are full of "== Motivo do Atendimento ==" banners; they are
   dropped wholesale, decoration and title alike, before the text is shown or
   sent anywhere. */
export function limparHeadersIgualdade(texto: string): string {
    return (texto || "").split("\n").filter(linha => !/^\s*=+[^=]*?=+\s*$/.test(linha)).join("\n")
}

/* "<nome>, <idade> anos" is the patient name sitting in front of the age on the
   identification line. It is swapped for a placeholder as soon as the text is
   pasted, so the name never leaves the machine. */
export function anonimizarNome(texto: string): string {
    return (texto || "").replace(
        /^(\s*(?:[-*]\s*)?(?:id\s*:\s*)?)([^,\n]+?)(\s*,\s*\d{1,3}\s*anos\b)/gim,
        (_match, prefixo: string, _nome: string, idade: string) => prefixo + "Nome do Paciente" + idade,
    )
}

/* Both cleanups run on every paste into the arrumador input. */
export function prepararTextoBruto(texto: string): string {
    return anonimizarNome(limparHeadersIgualdade(texto))
}

/* A filled example, not a blank form: the block's parsers create whatever is
   missing, so the model must not spend tokens (or lines) on empty fields. */
function modeloBloco(titulo: string): string {
    return `# ${titulo.trim() || tituloPadrao}

## Dados base
- Id: Maria Souza, 45 anos, casada, mora com a filha, católico, ensino médio completo, do lar, natural de Fortaleza, residente em Maranguape, procedente de Fortaleza, ACS Joana

Antecedentes
- Pessoais
  - Hospitalar
    - apendicectomia em 2010
  - Vacinação: em dia
- Familiares: pai com IAM aos 55

Medicamentos
- Em uso
  - losartana 50 mg/d
- Alergias: NDA

Hábitos
- Etilismo: não
- Tabagismo: não

## Lista de Problemas/Condições
- HAS em tratamento
- Dor lombar crônica

## Subjetivo
- Acompanhante: filha Ana

"dor de cabeça"
- há 3 dias, sem febre

## Objetivo
Exame físico
- SSVV: PA 120/80 | Peso 70 | Alt 1,65 | IMC 25,7
- Ect: abdome globoso
- AC: ruído cardíaco normal

Complementar
- Laboratório
  - (10/03/2026): Hb 12 // Glicose 95

## Avaliação
- HAS controlada, sem sinais de alarme
- Dor lombar de mecanismo incerto

## Plano
- losartana 50 mg/d
- retorno em 3 meses`
}

export function montarPromptArrumador(titulo: string): string {
    return `Você é um formatador de prontuários médicos.

Objetivo:
Transformar o texto em estrutura SOAP preservando o máximo possível do conteúdo original.

Regras obrigatórias:
- Output apenas em markdown puro, sem negritos e sem comentários
- Respeitar exatamente a estrutura do modelo no fim do prompt: mesmos títulos de seção, mesma ordem e mesma indentação
- Não resumir, omitir nem inventar conteúdo: o que não couber em nenhum campo vai para o fim do Subjetivo
- Não sintetizar sintomas, não inferir diagnósticos e não definir condutas
- Manter a indentação das listas
- Agrupar queixas relacionadas em parágrafos dentro do texto do motivo
- Não trazer dados do Objetivo para o Subjetivo, nem duplicar informações já presentes
- A identificação é uma única linha "- Id:", no início de "## Dados base", com os dados separados por vírgula, na ordem: nome, idade, estado civil, composição familiar, religião, escolaridade, ocupação, naturalidade, residência, procedência, ACS
- O sexo nunca é escrito: é um dado da interface e fica fora do texto salvo. Se o original trouxer "M" ou "F" isolado, omitir
- Estado civil deve usar um destes valores: solteiro(a), casado(a), união estável, separado(a), divorciado(a), viúvo(a). Se casado, escrever "casado com <nome>"
- Escolaridade deve usar um destes valores: analfabeto, alfabetizado, ensino fundamental incompleto, ensino fundamental completo, ensino médio incompleto, ensino médio completo, ensino superior incompleto, ensino superior completo, pós-graduação
- A naturalidade vai como "natural de <lugar>", a residência como "residente em <lugar>", a procedência como "procedente de <cidade>" e o ACS como "ACS <nome>"
- Antecedentes: "Hospitalar", "Vacinação", "Obstétrico" e "DUM" são itens de "- Pessoais"; "Familiares" fica no mesmo nível de "- Pessoais"
- Medicamentos: lista em "- Em uso" e alergias em "- Alergias:"
- Hábitos: um item "- <rótulo>: <valor>" por campo
- Lista de Problemas/Condições: um problema por linha, começando com "- "
- Subjetivo: o acompanhante (se houver) na primeira linha "- Acompanhante: <nome e parentesco>"; cada motivo é um título entre aspas na linha seguinte e o relato no segundo nível, um item "- " por parágrafo, com uma linha em branco entre um motivo e outro
- Objetivo: sinais vitais na linha "- SSVV:" separados por " | " (PA, Peso, Alt, IMC, Glic, FC, FR, SPO2, Tax); exame físico em "- Ect:", "- AC:", "- AR:", "- Ext:"; exames complementares em "Laboratório", "Imagem" e "Escores"
- Exames laboratoriais, quando presentes, no formato (DD/MM/AAAA): Hb 99 // Ht 99 // etc.
- Avaliação, Plano e Lista de Problemas/Condições: um item "- " por linha, sem linhas em branco entre os itens (o espaçamento entre parágrafos é visual)
- Campo sem informação: omitir a linha inteira, nunca escrever placeholder, "$" ou campo em branco — o bloco detecta os vazios sozinho
- Capitalização: norma culta do português, capitalizando a primeira letra de frases, listas e nomes próprios; siglas clínicas mantêm o padrão do texto original

Modelo de output:

${modeloBloco(titulo)}`
}

function limparMarcadores(texto: string): string {
    return texto
        .replace(/\$/g, " ")
        .split("\n")
        .map(linha => linha.replace(/^(\s*[-*])\s*$/, "").replace(/[ \t]+$/, ""))
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
}

interface ExecutarArrumadorOpcoes {
    texto: string
    titulo?: string
    aoReceber?: (parcial: string) => void
    sinal?: AbortSignal
}

/* Streams the model response, accumulating it as it arrives. Resolves with the
   full text (markers stripped), rejects with an Error the overlay can show. */
export async function executarArrumador({ texto, titulo, aoReceber, sinal }: ExecutarArrumadorOpcoes): Promise<string> {
    const res = await fetch(WORKER_ARRUMADOR, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: MODELO_ARRUMADOR,
            messages: [
                { role: "system", content: montarPromptArrumador(titulo || tituloPadrao) },
                { role: "user", content: texto },
            ],
            temperature: 0,
            max_tokens: 5000,
            stream: true,
        }),
        signal: sinal,
    })

    if (!res.ok || !res.body) throw new Error("o arrumador não respondeu (erro " + res.status + ")")

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    let acumulado = ""

    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const linhas = buffer.split("\n")
        buffer = linhas.pop() || ""

        for (const linha of linhas) {
            if (!linha.startsWith("data: ")) continue
            const bruto = linha.slice(6).trim()
            if (!bruto || bruto === "[DONE]") continue
            try {
                const json = JSON.parse(bruto)
                const parte = json.choices?.[0]?.delta?.content
                if (parte) {
                    acumulado += parte
                    if (aoReceber) aoReceber(acumulado)
                }
            } catch {}
        }
    }

    if (!acumulado.trim()) throw new Error("o arrumador devolveu um texto vazio")
    return limparMarcadores(acumulado)
}
