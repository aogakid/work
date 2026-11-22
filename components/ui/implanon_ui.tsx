import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { PDFDocument, PDFForm, PDFName, PDFDict } from "pdf-lib"
import { maskPA } from "../../lib/objetivo"

const PDF_IMPLANON = "/contents/ferramentas/procedimentos ambulatoriais/implanon/Implanon - termo e checklist.pdf"

const OPCOES_INDICACAO_SUBJETIVO: { valor: string; rotulo: string }[] = [
    { valor: "adolescente", rotulo: "Adolescente" },
    { valor: "contraindicacao-estrogenio", rotulo: "Contraindicação ao estrogênio" },
    { valor: "vulnerabilidade-social", rotulo: "Vulnerabilidade social" },
    { valor: "uso-drogas", rotulo: "Uso de drogas" },
    { valor: "endometriose", rotulo: "Endometriose" },
    { valor: "hiv", rotulo: "HIV" },
]

const TEXTO_EFEITOS_ADVERSOS = `1) Irregularidade menstrual
2) Ganho ponderal
3) Acne
4) Cefaleia
5) Mastalgia`

const OPCOES_MAC: { valor: string; rotulo: string }[] = [
    { valor: "", rotulo: "Selecionar" },
    { valor: "oral", rotulo: "Contraceptivo oral" },
    { valor: "mensal", rotulo: "Injetável mensal" },
    { valor: "trimestral", rotulo: "Injetável trimestral" },
    { valor: "diu", rotulo: "DIU" },
    { valor: "sem_uso", rotulo: "Sem uso / uso irregular" },
]

const OPCOES_CICLO: { valor: string; rotulo: string }[] = [
    { valor: "regular", rotulo: "Regular" },
    { valor: "irregular", rotulo: "Irregular" },
    { valor: "amenorreia", rotulo: "Amenorreia" },
]

const OPCOES_ULTIMA_RELACAO: { valor: string; rotulo: string }[] = [
    { valor: "nao_se_aplica", rotulo: "Não se aplica" },
    { valor: "protegida", rotulo: "Protegida" },
    { valor: "desprotegida", rotulo: "Desprotegida" },
]

const OPCOES_TRG: { valor: string; rotulo: string }[] = [
    { valor: "nao_realizado", rotulo: "Não realizado" },
    { valor: "negativo", rotulo: "Negativo" },
    { valor: "positivo", rotulo: "Positivo" },
]

const OPCOES_BRACO: { valor: string; rotulo: string }[] = [
    { valor: "esquerdo", rotulo: "Esquerdo" },
    { valor: "direito", rotulo: "Direito" },
]

const OPCOES_POS_PARTO_ABORTO: { valor: string; rotulo: string }[] = [
    { valor: "parto", rotulo: "Parto" },
    { valor: "aborto", rotulo: "Aborto" },
]

interface CamposImplanon {
    nome: string
    cpf: string
    dataNascimento: string
    pa: string
    peso: string
    altura: string
    alergiasTexto: string
    medicamentosTexto: string
    patologiasTexto: string
    ciSangramento: boolean
    ciTrombo: boolean
    ciLupus: boolean
    ciCancer: boolean
    ciCirrose: boolean
    macTipo: string
    macUltimaDose: string
    posPartoAbortoTipo: string
    posPartoAbortoData: string
    dum: string
    ciclo: string
    ultimaRelacao: string
    ultimaRelacaoTipo: string
    trgStatus: string
    braco: string
    cienteEfeitos: boolean
    indicacaoSubjetivo: string
    medico: string
    medicoCrm: string
}

function criarCamposIniciais(): CamposImplanon {
    return {
        nome: "",
        cpf: "",
        dataNascimento: "",
        pa: "",
        peso: "",
        altura: "",
        alergiasTexto: "",
        medicamentosTexto: "",
        patologiasTexto: "",
        ciSangramento: false,
        ciTrombo: false,
        ciLupus: false,
        ciCancer: false,
        ciCirrose: false,
        macTipo: "",
        macUltimaDose: "",
        posPartoAbortoTipo: "",
        posPartoAbortoData: "",
        dum: "",
        ciclo: "",
        ultimaRelacao: "",
        ultimaRelacaoTipo: "",
        trgStatus: "",
        braco: "",
        cienteEfeitos: false,
        indicacaoSubjetivo: "contraindicacao-estrogenio",
        medico: "",
        medicoCrm: "",
    }
}

const injectStyles = `
  :root {
    --implanon-bg: #ffffff;
    --implanon-text: #1a1916;
    --implanon-text-muted: #6b6760;
    --implanon-input-bg: rgba(120,120,120,0.08);
    --implanon-border: rgba(120,120,120,0.15);
    --implanon-card-bg: rgba(120,120,120,0.06);
    --implanon-accent: #0284c7;
    --implanon-accent-bg: rgba(2,132,199,0.08);
    --implanon-accent-border: rgba(2,132,199,0.35);
    --implanon-alert-bg: #fef2f2;
    --implanon-alert-border: #fca5a5;
    --implanon-alert-text: #991b1b;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --implanon-bg: #1c1917;
      --implanon-text: #f5f5f4;
      --implanon-text-muted: #78716c;
      --implanon-input-bg: rgba(255,255,255,0.08);
      --implanon-border: rgba(255,255,255,0.15);
      --implanon-card-bg: rgba(255,255,255,0.06);
      --implanon-accent: #38bdf8;
      --implanon-accent-bg: rgba(56,189,248,0.14);
      --implanon-accent-border: rgba(56,189,248,0.35);
      --implanon-alert-bg: rgba(127, 29, 29, 0.28);
      --implanon-alert-border: rgba(248, 113, 113, 0.55);
      --implanon-alert-text: #fecaca;
    }
  }

  .implanon-root {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    align-items: start;
  }

  @media (min-width: 980px) {
    .implanon-root {
      grid-template-columns: 1.15fr 1fr;
    }
  }

  .implanon-fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
    width: 100%;
  }

  .implanon-result {
    border-radius: 12px;
    padding: 20px;
    box-sizing: border-box;
    background: var(--implanon-card-bg);
    border: 1px solid var(--implanon-border);
    position: sticky;
    top: 24px;
  }

  .implanon-check-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 8px 12px;
    grid-column: 1 / -1;
  }

  .implanon-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .implanon-icon-btn:hover {
    background: var(--implanon-accent-bg) !important;
    border-color: var(--implanon-accent-border) !important;
    color: var(--implanon-accent) !important;
  }
`

const estilos = {
    container: {
        background: "var(--implanon-bg)",
        color: "var(--implanon-text)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "24px",
        borderRadius: "16px",
        width: "100%",
        boxSizing: "border-box" as const,
    },
    title: {
        fontSize: "20px",
        fontWeight: 700,
        marginBottom: "4px",
        color: "var(--implanon-text)",
    },
    subtitle: {
        fontSize: "13px",
        color: "var(--implanon-text-muted)",
        marginBottom: "20px",
    },
    sectionLabel: {
        fontSize: "10px",
        textTransform: "uppercase" as const,
        letterSpacing: "0.07em",
        color: "var(--implanon-text-muted)",
        fontWeight: 700,
        gridColumn: "1 / -1" as const,
        marginTop: "12px",
        paddingBottom: "4px",
        borderBottom: "1px solid var(--implanon-border)",
    },
    inputGroup: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "6px",
    },
    label: {
        fontSize: "11px",
        textTransform: "uppercase" as const,
        letterSpacing: "0.05em",
        color: "var(--implanon-text-muted)",
        fontWeight: 600,
        whiteSpace: "nowrap" as const,
        overflow: "hidden" as const,
        textOverflow: "ellipsis" as const,
        display: "block",
    },
    input: {
        background: "var(--implanon-input-bg)",
        border: "1px solid var(--implanon-border)",
        borderRadius: "10px",
        padding: "10px 14px",
        color: "var(--implanon-text)",
        fontSize: "14px",
        outline: "none",
        height: "42px",
        boxSizing: "border-box" as const,
        width: "100%",
    },
    textarea: {
        background: "var(--implanon-input-bg)",
        border: "1px solid var(--implanon-border)",
        borderRadius: "10px",
        padding: "10px 14px",
        color: "var(--implanon-text)",
        fontSize: "14px",
        outline: "none",
        minHeight: "72px",
        boxSizing: "border-box" as const,
        width: "100%",
        resize: "vertical" as const,
        fontFamily: "inherit",
    },
    select: {
        background: "var(--implanon-input-bg)",
        border: "1px solid var(--implanon-border)",
        borderRadius: "10px",
        padding: "10px 14px",
        color: "var(--implanon-text)",
        fontSize: "14px",
        outline: "none",
        height: "42px",
        boxSizing: "border-box" as const,
        width: "100%",
    },
    checkboxRow: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "13px",
        color: "var(--implanon-text)",
    },
    btn: {
        background: "var(--implanon-accent)",
        color: "#fff",
        border: "1px solid var(--implanon-accent)",
        borderRadius: "10px",
        padding: "10px 14px",
        fontSize: "13px",
        fontWeight: 700,
        cursor: "pointer",
    },
    btnSec: {
        background: "var(--implanon-input-bg)",
        color: "var(--implanon-text)",
        border: "1px solid var(--implanon-border)",
        borderRadius: "10px",
        padding: "10px 14px",
        fontSize: "13px",
        fontWeight: 600,
        cursor: "pointer",
    },
    iconBtn: {
        width: "34px",
        height: "34px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0",
        border: "1px solid var(--implanon-border)",
        borderRadius: "8px",
        background: "var(--implanon-input-bg)",
        color: "var(--implanon-text-muted)",
        cursor: "pointer",
    },
    output: {
        width: "100%",
        background: "var(--implanon-input-bg)",
        border: "1px solid var(--implanon-border)",
        borderRadius: "10px",
        padding: "12px",
        color: "var(--implanon-text)",
        fontSize: "12.5px",
        lineHeight: "1.55",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        resize: "none" as const,
        overflow: "hidden" as const,
        boxSizing: "border-box" as const,
    },
}

function dividirData(valor: string): [string, string, string] {
    const m = (valor || "").trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)
    if (!m) return ["", "", ""]
    return [m[1], m[2], m[3]]
}

function calcularIdade(dataNascimento: string): string {
    const [d, m, a] = dividirData(dataNascimento)
    if (!d || !m || !a) return ""
    const ano = a.length === 2 ? Number("20" + a) : Number(a)
    const mes = Number(m) - 1
    const dia = Number(d)
    if (!ano || mes < 0 || mes > 11 || dia < 1 || dia > 31) return ""
    const hoje = new Date()
    let idade = hoje.getFullYear() - ano
    const antesAniversario = hoje.getMonth() < mes || (hoje.getMonth() === mes && hoje.getDate() < dia)
    if (antesAniversario) idade -= 1
    if (idade < 0 || idade > 130) return ""
    return String(idade)
}

function dataHoje(): [string, string, string] {
    const agora = new Date()
    const dia = String(agora.getDate()).padStart(2, "0")
    const mes = String(agora.getMonth() + 1).padStart(2, "0")
    const ano = String(agora.getFullYear())
    return [dia, mes, ano]
}

function dividirPA(valor: string): [string, string] {
    const m = (valor || "").trim().match(/^(\d{2,3})x(\d{2,3})$/)
    if (!m) return ["", ""]
    return [m[1], m[2]]
}

function textoOuNega(valor: string): string {
    const v = (valor || "").trim()
    return v ? v : "nega"
}

function parseDataBr(valor: string): Date | null {
    const [d, m, a] = dividirData(valor)
    if (!d || !m || !a) return null
    const ano = a.length === 2 ? Number("20" + a) : Number(a)
    const mes = Number(m)
    const dia = Number(d)
    if (!ano || mes < 1 || mes > 12 || dia < 1 || dia > 31) return null
    const dt = new Date(ano, mes - 1, dia)
    if (dt.getFullYear() !== ano || dt.getMonth() !== mes - 1 || dt.getDate() !== dia) return null
    return dt
}

function inicioDia(dt: Date): Date {
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
}

function diasEntre(inicio: Date, fim: Date): number {
    const ms = inicioDia(fim).getTime() - inicioDia(inicio).getTime()
    return Math.round(ms / 86400000)
}

function validarIndicacao(c: CamposImplanon): string[] {
    const avisos: string[] = []
    const temContraindicacao = c.ciSangramento || c.ciTrombo || c.ciLupus || c.ciCancer || c.ciCirrose
    if (temContraindicacao) {
        avisos.push("Contraindicação marcada: revisar elegibilidade antes da inserção (WHO MEC/CDC).")
    }

    if (!c.macTipo) {
        avisos.push("MAC prévio/contracepção atual não informado.")
    }

    const hoje = inicioDia(new Date())
    const dum = parseDataBr(c.dum)
    const ultimaRelacao = parseDataBr(c.ultimaRelacao)

    if (c.macTipo === "sem_uso") {
        if (!dum) {
            avisos.push("Sem uso/uso irregular de MAC: informar DUM para avaliar janela de inserção.")
        } else {
            const diasDum = diasEntre(dum, hoje)
            if (diasDum < 0) {
                avisos.push("DUM no futuro: verificar data.")
            } else if (diasDum > 5) {
                if (!ultimaRelacao) {
                    avisos.push("DUM > 5 dias e última relação sexual não informada: excluir gravidez antes da inserção.")
                } else if (diasEntre(dum, ultimaRelacao) > 0) {
                    avisos.push("DUM > 5 dias com relação sexual após a DUM: risco de gravidez não excluído; considerar TRG/adiar conforme protocolo.")
                } else if (c.trgStatus !== "negativo") {
                    avisos.push("DUM > 5 dias sem relação após a DUM: confirmar que está razoavelmente certo de não estar grávida (TRG recomendado se dúvida).")
                }
            }
        }
    }

    if (c.posPartoAbortoTipo === "parto") {
        const dataParto = parseDataBr(c.posPartoAbortoData)
        if (!dataParto) {
            avisos.push("Pós-parto selecionado sem data: informar data do parto.")
        } else {
            const diasPosParto = diasEntre(dataParto, hoje)
            if (diasPosParto < 0) {
                avisos.push("Data do parto no futuro: verificar data.")
            } else if (diasPosParto > 28 && c.ciclo !== "amenorreia") {
                avisos.push("Pós-parto > 28 dias: ciclo deve ser amenorreia para elegibilidade nesta janela; caso contrário, avaliar exclusão de gravidez.")
            }
        }
    }

    if (c.posPartoAbortoTipo === "aborto") {
        const dataAborto = parseDataBr(c.posPartoAbortoData)
        if (!dataAborto) {
            avisos.push("Pós-aborto selecionado sem data: informar data do aborto.")
        } else {
            const diasPosAborto = diasEntre(dataAborto, hoje)
            if (diasPosAborto < 0) {
                avisos.push("Data do aborto no futuro: verificar data.")
            } else if (diasPosAborto > 7) {
                if (!dum) {
                    avisos.push("Pós-aborto > 7 dias: avaliar DUM/relação sexual e excluir gravidez antes da inserção.")
                } else {
                    const diasDum = diasEntre(dum, hoje)
                    if (diasDum > 5) {
                        if (!ultimaRelacao) {
                            avisos.push("Pós-aborto > 7 dias e DUM > 5 dias sem data de última relação: excluir gravidez antes da inserção.")
                        } else if (diasEntre(dum, ultimaRelacao) > 0) {
                            avisos.push("Pós-aborto > 7 dias com relação após DUM: risco de gravidez não excluído; considerar TRG/adiar.")
                        }
                    }
                }
            }
        }
    }

    return avisos
}

function gerarTexto(c: CamposImplanon): string {
    const TEXTO_INDICACAO: Record<string, string> = {
        "adolescente": "Paciente adolescente, com indicação de método contraceptivo de longa duração.",
        "contraindicacao-estrogenio": "Paciente apresenta contraindicação ao uso de estrogênio.",
        "vulnerabilidade-social": "Paciente em situação de vulnerabilidade social, com indicação de método contraceptivo de longa duração.",
        "uso-drogas": "Paciente com uso de drogas, com indicação de método contraceptivo de longa duração e independente da adesão diária.",
        "endometriose": "Paciente com endometriose, com indicação de método contraceptivo com progestagênio contínuo.",
        "hiv": "Paciente vivendo com HIV, com indicação de método contraceptivo de longa duração.",
    }
    const linhaIndicacao = TEXTO_INDICACAO[c.indicacaoSubjetivo] ? "- " + TEXTO_INDICACAO[c.indicacaoSubjetivo] + "\n" : ""
    const trgFeito = c.trgStatus === "negativo" || c.trgStatus === "positivo"
    const trgResultado = c.trgStatus === "positivo" ? "reagente" : "não reagente"

    const linhas: string[] = []
    linhas.push("# Inserção de implante subdérmico de etonogestrel 68mg")
    linhas.push("")
    linhas.push("## Subjetivo:")
    linhas.push("- Paciente vem à unidade de saúde e manifesta interesse na inserção de implante subdérmico de etonogestrel. Diante de questionamento, nega apresenta contraindicações ao uso do método.")
    if (linhaIndicacao) linhas.push(linhaIndicacao.trimEnd())
    linhas.push("- Antecedentes pessoais:")
    const macOpcao = OPCOES_MAC.find(function (o) { return o.valor === c.macTipo })
    const macRotulo = macOpcao ? macOpcao.rotulo : ""
    const macSemUso = c.macTipo === "sem_uso"
    const macLinha = macSemUso
        ? "  - MAC prévio: nega"
        : "  - MAC prévio: " + (macRotulo || "XXX") + " – última dose em: " + (c.macUltimaDose.trim() || "")

    linhas.push("  - DUM: " + (c.dum.trim() || ""))
    linhas.push("  - Data da última relação sexual: " + (c.ultimaRelacao.trim() || ""))
    linhas.push(macLinha)
    linhas.push("  - Patologias: " + textoOuNega(c.patologiasTexto))
    linhas.push("  - Medicações de uso contínuo: " + textoOuNega(c.medicamentosTexto))
    linhas.push("  - Alergias medicamentosas: " + textoOuNega(c.alergiasTexto))
    linhas.push("")
    if (trgFeito) {
        linhas.push("## Objetivo:")
        linhas.push("- Teste rápido de gravidez (realizado hoje): " + trgResultado)
        linhas.push("")
    }
    linhas.push("## Avaliação:")
    linhas.push("- Desejo por anticoncepção por implante subdérmico de etonogestrel")
    linhas.push("")
    linhas.push("## Plano:")
    if (trgFeito) {
        linhas.push("- Emito solicitação do teste rápido de gravidez já realizado e registrado.")
    }
    linhas.push("- Emito a prescrição do implante de etonogestrel 68mg")
    linhas.push("- Realizo inserção de implante subdérmico de etonogestrel:")
    linhas.push("    1. Posiciono paciente em decúbito dorsal com braço não dominante fletido e abduzido.")
    linhas.push("    2. Realizo primeira marcação com caneta cirúrgica a 10 cm do epicôndilo medial e segunda a 5 cm da primeira, ambas 5 cm abaixo do sulco bicipital medial.")
    linhas.push("    3. Realizo assepsia com clorexidina aquosa a 2%.")
    linhas.push("    4. Administro anestesia local na primeira marcação e ao longo do trajeto de inserção com 2 mL de lidocaína a 2%.")
    linhas.push("    5. Insiro implante com auxílio de aplicador próprio, sem intercorrências durante o ato. ")
    linhas.push("    6. Paciente palpa o implante após a inserção.")
    linhas.push("    7. Realizo curativo compressivo.")
    linhas.push("    8. Oriento sobre cuidados pós-inserção e explico sobre retorno para acompanhamento e retirada do implante.")
    return linhas.join("\n")
}

function setTextoCampo(form: PDFForm, nome: string, valor: string) {
    try {
        const campo = form.getTextField(nome)
        campo.setText(valor || "")
    } catch {
        // campo ausente ou tipo inesperado
    }
}

function setCheck(form: PDFForm, nome: string, marcado: boolean) {
    try {
        const campo = form.getCheckBox(nome)
        const onValue = PDFName.of("Yes")
        const offValue = PDFName.of("Off")
        const valor = marcado ? onValue : offValue
        const af = campo.acroField
        af.dict.set(PDFName.of("V"), valor)
        af.dict.set(PDFName.of("AS"), valor)
        const widgets = af.getWidgets()
        for (const w of widgets) {
            w.dict.set(PDFName.of("AS"), valor)
            const ap = w.dict.get(PDFName.of("AP"))
            if (ap instanceof PDFDict) {
                const ctx = af.dict.context
                const rect = w.getRectangle()
                const wdt = rect.width
                const hgt = rect.height
                const m = Math.max(2, Math.min(wdt, hgt) * 0.2)
                const xCmd = "q 1.2 w " + m + " " + m + " m " + (wdt - m) + " " + (hgt - m) + " l " + m + " " + (hgt - m) + " m " + (wdt - m) + " " + m + " l S Q"
                const yes = ctx.stream(xCmd, { Type: "XObject", Subtype: "Form", BBox: ctx.obj([0, 0, wdt, hgt]), Resources: ctx.obj({}) })
                const yesRef = ctx.register(yes)
                const blank = ctx.formXObject([], { BBox: ctx.obj([0, 0, wdt, hgt]), Resources: ctx.obj({}) })
                const blankRef = ctx.register(blank)
                ap.set(PDFName.of("N"), ctx.obj({ Off: blankRef, Yes: yesRef }))
            }
        }
    } catch {
        // campo ausente ou tipo inesperado
    }
}

async function preencherPdf(c: CamposImplanon): Promise<Uint8Array> {
    const resp = await fetch(PDF_IMPLANON)
    if (!resp.ok) throw new Error("Não foi possível carregar o PDF do Implanon.")
    const bytes = await resp.arrayBuffer()
    const pdf = await PDFDocument.load(bytes)
    const form = pdf.getForm()

    const [dnD, dnM, dnA] = dividirData(c.dataNascimento)
    const [dD, dM, dA] = dataHoje()
    const [paSis, paDia] = dividirPA(c.pa)
    const [macD, macM, macA] = dividirData(c.macUltimaDose)
    const alergiasPreenchida = c.alergiasTexto.trim() !== ""
    const medicamentosPreenchida = c.medicamentosTexto.trim() !== ""
    const patologiasPreenchida = c.patologiasTexto.trim() !== ""
    const [ppD, ppM, ppA] = dividirData(c.posPartoAbortoData)
    const [dumD, dumM, dumA] = dividirData(c.dum)
    const [relD, relM, relA] = dividirData(c.ultimaRelacao)
    const trgFeitoPdf = c.trgStatus === "negativo" || c.trgStatus === "positivo"
    const [trgD, trgM, trgA] = trgFeitoPdf ? dataHoje() : ["", "", ""]

    setTextoCampo(form, "Nome", c.nome)
    setTextoCampo(form, "Text3", c.cpf)
    setTextoCampo(form, "DD", dD)
    setTextoCampo(form, "MM", dM)
    setTextoCampo(form, "YYYY", dA)
    setTextoCampo(form, "Data do nascimento", dnD)
    setTextoCampo(form, "Data do nascimento /", dnM)
    setTextoCampo(form, "Data do nascimento / /", dnA)
    setTextoCampo(form, "Idade", calcularIdade(c.dataNascimento))
    setTextoCampo(form, "Pressão arterial", paSis)
    setTextoCampo(form, "x", paDia)
    setTextoCampo(form, "mmHg Peso", c.peso)
    setTextoCampo(form, "Altura", c.altura)

    setTextoCampo(form, "Alergias medicamentosas NÃO SIM", c.alergiasTexto)
    setTextoCampo(form, "NÃO SIM", c.medicamentosTexto)
    setTextoCampo(form, "NÃO SIM2", c.patologiasTexto)

    setTextoCampo(form, "Data da última dose", c.macTipo === "oral" ? macD : "")
    setTextoCampo(form, "Data da última dose /", c.macTipo === "oral" ? macM : "")
    setTextoCampo(form, "Data da última dose / /", c.macTipo === "oral" ? macA : "")
    setTextoCampo(form, "Data da última dose2", c.macTipo === "mensal" ? macD : "")
    setTextoCampo(form, "Data da última dose /2", c.macTipo === "mensal" ? macM : "")
    setTextoCampo(form, "Data da última dose / /2", c.macTipo === "mensal" ? macA : "")
    setTextoCampo(form, "Data da última dose3", c.macTipo === "trimestral" ? macD : "")
    setTextoCampo(form, "Data da última dose /3", c.macTipo === "trimestral" ? macM : "")
    setTextoCampo(form, "Data da última dose / /3", c.macTipo === "trimestral" ? macA : "")
    setTextoCampo(form, "Data da inserção", c.macTipo === "diu" ? macD : "")
    setTextoCampo(form, "/3", c.macTipo === "diu" ? macM : "")
    setTextoCampo(form, "/ /", c.macTipo === "diu" ? macA : "")

    const partoAtivo = c.posPartoAbortoTipo === "parto"
    const abortoAtivo = c.posPartoAbortoTipo === "aborto"
    setTextoCampo(form, "Parto", partoAtivo ? ppD : "")
    setTextoCampo(form, "Parto /", partoAtivo ? ppM : "")
    setTextoCampo(form, "Parto / /", partoAtivo ? ppA : "")
    setTextoCampo(form, "Aborto", abortoAtivo ? ppD : "")
    setTextoCampo(form, "Aborto /", abortoAtivo ? ppM : "")
    setTextoCampo(form, "Aborto / /", abortoAtivo ? ppA : "")

    setTextoCampo(form, "inicial da última menstruação", dumD)
    setTextoCampo(form, "/4", dumM)
    setTextoCampo(form, "/ /2", dumA)
    setTextoCampo(form, "da última relação sexual", relD)
    setTextoCampo(form, "/5", relM)
    setTextoCampo(form, "/ /3", relA)
    setTextoCampo(form, "rápido de gravidez", trgD)
    setTextoCampo(form, "/6", trgM)
    setTextoCampo(form, "/ /4", trgA)

    setTextoCampo(form, "Medico", c.medico)
    setTextoCampo(form, "MedicoCRM", c.medicoCrm)

    setCheck(form, "Check Box1", !alergiasPreenchida)
    setCheck(form, "Check Box2", alergiasPreenchida)
    setCheck(form, "Check Box3", !medicamentosPreenchida)
    setCheck(form, "Check Box4", medicamentosPreenchida)
    setCheck(form, "Check Box5", !patologiasPreenchida)
    setCheck(form, "Check Box6", patologiasPreenchida)

    setCheck(form, "Check Box7", !c.ciSangramento)
    setCheck(form, "Check Box8", !c.ciTrombo)
    setCheck(form, "Check Box9", !c.ciLupus)
    setCheck(form, "Check Box10", !c.ciCancer)
    setCheck(form, "Check Box11", !c.ciCirrose)
    setCheck(form, "Check Box12", c.ciSangramento)
    setCheck(form, "Check Box13", c.ciTrombo)
    setCheck(form, "Check Box14", c.ciLupus)
    setCheck(form, "Check Box15", c.ciCancer)
    setCheck(form, "Check Box16", c.ciCirrose)

    setCheck(form, "Check Box17", c.macTipo === "oral")
    setCheck(form, "Check Box18", c.macTipo === "mensal")
    setCheck(form, "Check Box19", c.macTipo === "trimestral")
    setCheck(form, "Check Box20", c.macTipo === "diu")
    setCheck(form, "Check Box21", c.macTipo === "sem_uso")

    setCheck(form, "Check Box22", c.posPartoAbortoTipo === "")
    setCheck(form, "Check Box26", partoAtivo)
    setCheck(form, "Check Box31", abortoAtivo)

    setCheck(form, "Check Box23", c.ciclo === "regular")
    setCheck(form, "Check Box27", c.ciclo === "irregular")
    setCheck(form, "Check Box32", c.ciclo === "amenorreia")

    setCheck(form, "Check Box24", c.ultimaRelacaoTipo === "nao_se_aplica")
    setCheck(form, "Check Box28", c.ultimaRelacaoTipo === "protegida")
    setCheck(form, "Check Box33", c.ultimaRelacaoTipo === "desprotegida")

    setCheck(form, "Check Box25", c.trgStatus === "nao_realizado")
    setCheck(form, "Check Box29", c.trgStatus === "negativo")
    setCheck(form, "Check Box30", c.trgStatus === "positivo")

    setCheck(form, "Check Box34", c.braco === "esquerdo")
    setCheck(form, "Check Box35", c.braco === "direito")
    setCheck(form, "Check Box36", c.cienteEfeitos)

    try {
        form.updateFieldAppearances()
    } catch {
        // alguns PDFs não precisam de aparências atualizadas
    }
    return await pdf.save()
}

function imprimirBytes(bytes: Uint8Array) {
    const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)
    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.right = "0"
    iframe.style.bottom = "0"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "0"
    iframe.src = url
    iframe.onload = function () {
        const janela = iframe.contentWindow
        if (janela) {
            janela.focus()
            janela.print()
        }
        window.setTimeout(function () {
            document.body.removeChild(iframe)
            URL.revokeObjectURL(url)
        }, 1000)
    }
    document.body.appendChild(iframe)
}

export default function ImplanonUI() {
    const [campos, setCampos] = useState<CamposImplanon>(criarCamposIniciais)
    const [copiado, setCopiado] = useState(false)
    const [imprimindo, setImprimindo] = useState(false)
    const [erroPdf, setErroPdf] = useState("")
    const outputRef = useRef<HTMLTextAreaElement | null>(null)

    useEffect(() => {
        const style = document.createElement("style")
        style.innerHTML = injectStyles
        document.head.appendChild(style)
        return () => { document.head.removeChild(style) }
    }, [])

    const texto = gerarTexto(campos)
    const temDadosValidacao = campos.macTipo !== "" || campos.ciSangramento || campos.ciTrombo || campos.ciLupus || campos.ciCancer || campos.ciCirrose || campos.posPartoAbortoTipo !== "" || campos.dum.trim() !== "" || campos.ultimaRelacao.trim() !== ""
    const avisosIndicacao = temDadosValidacao ? validarIndicacao(campos) : []

    useEffect(function () {
        const el = outputRef.current
        if (!el) return
        el.style.height = "0px"
        el.style.height = el.scrollHeight + "px"
    }, [texto])

    function chipStyle(active: boolean): React.CSSProperties {
        return {
            padding: "8px 14px",
            borderRadius: "20px",
            fontSize: "13px",
            cursor: "pointer",
            userSelect: "none" as const,
            background: active ? "var(--implanon-accent-bg)" : "var(--implanon-input-bg)",
            border: active ? "1px solid var(--implanon-accent-border)" : "1px solid var(--implanon-border)",
            color: active ? "var(--implanon-accent)" : "var(--implanon-text-muted)",
            fontWeight: active ? 600 : 400,
            transition: "all 0.15s ease",
        }
    }

    function selecionarChip(chave: keyof CamposImplanon, valor: string) {
        setCampos(function (prev) {
            const atual = prev[chave]
            const proximo = atual === valor ? "" : valor
            const next = { ...prev, [chave]: proximo }
            if (chave === "macTipo" && proximo === "sem_uso") {
                next.macUltimaDose = ""
            }
            if (chave === "posPartoAbortoTipo" && proximo === "") {
                next.posPartoAbortoData = ""
            }
            return next
        })
    }

    function toggleBoolChip(chave: keyof CamposImplanon) {
        setCampos(function (prev) {
            const atual = prev[chave]
            return { ...prev, [chave]: !atual }
        })
    }

    function atualizarCampo(chave: keyof CamposImplanon, valor: string | boolean) {
        setCampos(function (prev) {
            return { ...prev, [chave]: valor }
        })
    }

    function handleTexto(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
        const alvo = e.target
        const chave = alvo.getAttribute("data-campo") as keyof CamposImplanon | null
        if (!chave) return
        const valor = chave === "pa" ? maskPA(alvo.value) : alvo.value
        if (chave === "macTipo" && valor === "sem_uso") {
            setCampos(function (prev) {
                return { ...prev, macTipo: String(valor), macUltimaDose: "" }
            })
            return
        }
        atualizarCampo(chave, valor)
    }

    function handleCheck(e: React.ChangeEvent<HTMLInputElement>) {
        const alvo = e.target
        const chave = alvo.getAttribute("data-campo") as keyof CamposImplanon | null
        if (!chave) return
        atualizarCampo(chave, alvo.checked)
    }

    function copiarTexto() {
        navigator.clipboard.writeText(texto).then(function () {
            setCopiado(true)
            window.setTimeout(function () { setCopiado(false) }, 3000)
        })
    }

    function imprimirTermo() {
        setErroPdf("")
        setImprimindo(true)
        preencherPdf(campos).then(function (bytes) {
            imprimirBytes(bytes)
            setImprimindo(false)
        }).catch(function (err) {
            setErroPdf(err instanceof Error ? err.message : "Erro ao gerar PDF.")
            setImprimindo(false)
        })
    }

    function limpar() {
        setCampos(function (prev) {
            const inicial = criarCamposIniciais()
            inicial.medico = prev.medico
            inicial.medicoCrm = prev.medicoCrm
            return inicial
        })
        setErroPdf("")
        setCopiado(false)
    }

    return (
        <div style={estilos.container}>
            <h2 style={estilos.title}>Inserção de implante subdérmico liberador de etonogestrel</h2>

            <div className="implanon-root">
                <div className="implanon-fields">
                    <div style={estilos.sectionLabel}>Identificação</div>
                    <div style={{ ...estilos.inputGroup, gridColumn: "span 2" }}>
                        <label style={estilos.label}>Nome</label>
                        <input style={estilos.input} data-campo="nome" value={campos.nome} onChange={handleTexto} />
                    </div>
                    <div style={estilos.inputGroup}>
                        <label style={estilos.label}>CPF</label>
                        <input style={estilos.input} data-campo="cpf" value={campos.cpf} onChange={handleTexto} />
                    </div>
                    <div style={estilos.inputGroup}>
                        <label style={estilos.label}>Data de nascimento</label>
                        <input style={estilos.input} data-campo="dataNascimento" value={campos.dataNascimento} onChange={handleTexto} placeholder="dd/mm/aaaa" />
                    </div>
                    <div style={estilos.inputGroup}>
                        <label style={estilos.label}>PA</label>
                        <input style={estilos.input} data-campo="pa" value={campos.pa} onChange={handleTexto} placeholder="120x80" />
                    </div>
                    <div style={estilos.inputGroup}>
                        <label style={estilos.label}>Peso (kg)</label>
                        <input style={estilos.input} data-campo="peso" value={campos.peso} onChange={handleTexto} />
                    </div>
                    <div style={estilos.inputGroup}>
                        <label style={estilos.label}>Altura (m)</label>
                        <input style={estilos.input} data-campo="altura" value={campos.altura} onChange={handleTexto} />
                    </div>

                    <div style={estilos.sectionLabel}>Antecedentes</div>
                    <div style={estilos.inputGroup}>
                        <label style={estilos.label}>Patologias</label>
                        <input style={estilos.input} data-campo="patologiasTexto" value={campos.patologiasTexto} onChange={handleTexto} placeholder="nega" />
                    </div>
                    <div style={estilos.inputGroup}>
                        <label style={estilos.label}>Medicações contínuas</label>
                        <input style={estilos.input} data-campo="medicamentosTexto" value={campos.medicamentosTexto} onChange={handleTexto} placeholder="nega" />
                    </div>
                    <div style={estilos.inputGroup}>
                        <label style={estilos.label}>Alergias medicamentosas</label>
                        <input style={estilos.input} data-campo="alergiasTexto" value={campos.alergiasTexto} onChange={handleTexto} placeholder="nega" />
                    </div>

                    <div style={estilos.sectionLabel}>Contracepção e ciclo</div>
                    <div style={{ ...estilos.inputGroup, gridColumn: "1 / -1" }}>
                        <label style={estilos.label}>MAC prévio / contracepção atual</label>
                        <div className="implanon-chips">
                            {OPCOES_MAC.filter(function (op) { return op.valor !== "" }).map(function (op) {
                                return (
                                    <div
                                        key={op.valor}
                                        style={chipStyle(campos.macTipo === op.valor)}
                                        onClick={function () { selecionarChip("macTipo", op.valor) }}
                                    >
                                        {op.rotulo}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    {campos.macTipo !== "" && campos.macTipo !== "sem_uso" ? (
                        <div style={estilos.inputGroup}>
                            <label style={estilos.label}>{campos.macTipo === "diu" ? "Data de inserção" : "Última dose"}</label>
                            <input style={estilos.input} data-campo="macUltimaDose" value={campos.macUltimaDose} onChange={handleTexto} placeholder="dd/mm/aaaa" />
                        </div>
                    ) : null}
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(150px, 220px) 1fr", gap: "12px", gridColumn: "1 / -1" }}>
                        <div style={estilos.inputGroup}>
                            <label style={estilos.label}>DUM</label>
                            <input style={estilos.input} data-campo="dum" value={campos.dum} onChange={handleTexto} placeholder="dd/mm/aaaa" />
                        </div>
                        <div style={estilos.inputGroup}>
                            <label style={estilos.label}>Ciclo</label>
                            <div className="implanon-chips">
                                {OPCOES_CICLO.map(function (op) {
                                    return (
                                        <div
                                            key={op.valor}
                                            style={chipStyle(campos.ciclo === op.valor)}
                                            onClick={function () { selecionarChip("ciclo", op.valor) }}
                                        >
                                            {op.rotulo}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(150px, 220px) 1fr", gap: "12px", gridColumn: "1 / -1" }}>
                        <div style={estilos.inputGroup}>
                            <label style={estilos.label}>Última relação sexual</label>
                            <input style={estilos.input} data-campo="ultimaRelacao" value={campos.ultimaRelacao} onChange={handleTexto} placeholder="dd/mm/aaaa" />
                        </div>
                        <div style={estilos.inputGroup}>
                            <label style={estilos.label}>Tipo de última relação</label>
                            <div className="implanon-chips">
                                {OPCOES_ULTIMA_RELACAO.map(function (op) {
                                    return (
                                        <div
                                            key={op.valor}
                                            style={chipStyle(campos.ultimaRelacaoTipo === op.valor)}
                                            onClick={function () { selecionarChip("ultimaRelacaoTipo", op.valor) }}
                                        >
                                            {op.rotulo}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                    <div style={{ ...estilos.inputGroup, gridColumn: "1 / -1" }}>
                        <label style={estilos.label}>Pós-parto / aborto</label>
                        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
                            <div className="implanon-chips">
                                {OPCOES_POS_PARTO_ABORTO.map(function (op) {
                                    return (
                                        <div
                                            key={op.valor}
                                            style={chipStyle(campos.posPartoAbortoTipo === op.valor)}
                                            onClick={function () { selecionarChip("posPartoAbortoTipo", op.valor) }}
                                        >
                                            {op.rotulo}
                                        </div>
                                    )
                                })}
                            </div>
                            {campos.posPartoAbortoTipo !== "" ? (
                                <div style={{ ...estilos.inputGroup, minWidth: "180px", maxWidth: "220px" }}>
                                    <label style={estilos.label}>Data</label>
                                    <input style={estilos.input} data-campo="posPartoAbortoData" value={campos.posPartoAbortoData} onChange={handleTexto} placeholder="dd/mm/aaaa" />
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div style={estilos.sectionLabel}>Avaliação pré-inserção</div>
                    <div style={{ ...estilos.inputGroup, gridColumn: "1 / -1" }}>
                        <label style={estilos.label}>Indicação / observação no subjetivo</label>
                        <div className="implanon-chips">
                            {OPCOES_INDICACAO_SUBJETIVO.map(function (op) {
                                return (
                                    <div
                                        key={op.valor}
                                        style={chipStyle(campos.indicacaoSubjetivo === op.valor)}
                                        onClick={function () { selecionarChip("indicacaoSubjetivo", op.valor) }}
                                    >
                                        {op.rotulo}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <div style={{ ...estilos.inputGroup, gridColumn: "1 / -1" }}>
                        <label style={estilos.label}>Contraindicações</label>
                        <div className="implanon-chips">
                            <div style={chipStyle(campos.ciSangramento)} onClick={function () { toggleBoolChip("ciSangramento") }}>Sangramento vaginal inexplicado</div>
                            <div style={chipStyle(campos.ciTrombo)} onClick={function () { toggleBoolChip("ciTrombo") }}>TVP/TEP</div>
                            <div style={chipStyle(campos.ciLupus)} onClick={function () { toggleBoolChip("ciLupus") }}>Lúpus com antifosfolípideo</div>
                            <div style={chipStyle(campos.ciCancer)} onClick={function () { toggleBoolChip("ciCancer") }}>Câncer sensível a esteroide sexual</div>
                            <div style={chipStyle(campos.ciCirrose)} onClick={function () { toggleBoolChip("ciCirrose") }}>Cirrose severa/tumor de fígado</div>
                        </div>
                    </div>
                    <div style={{ ...estilos.inputGroup, gridColumn: "1 / -1" }}>
                        <label style={estilos.label}>Teste rápido de gravidez</label>
                        <div className="implanon-chips">
                            {OPCOES_TRG.map(function (op) {
                                return (
                                    <div
                                        key={op.valor}
                                        style={chipStyle(campos.trgStatus === op.valor)}
                                        onClick={function () { selecionarChip("trgStatus", op.valor) }}
                                    >
                                        {op.rotulo}
                                    </div>
                                )
                            })}
                        </div>
                    </div>


                    <div style={estilos.sectionLabel}>Procedimento</div>
                    <div style={{ ...estilos.inputGroup, gridColumn: "1 / -1" }}>
                        <label style={estilos.label}>Braço não dominante</label>
                        <div className="implanon-chips">
                            {OPCOES_BRACO.map(function (op) {
                                return (
                                    <div
                                        key={op.valor}
                                        style={chipStyle(campos.braco === op.valor)}
                                        onClick={function () { selecionarChip("braco", op.valor) }}
                                    >
                                        {op.rotulo}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <div style={{ ...estilos.inputGroup, gridColumn: "span 2" }}>
                        <label style={estilos.label}>Nome do profissional</label>
                        <input style={estilos.input} data-campo="medico" value={campos.medico} onChange={handleTexto} />
                    </div>
                    <div style={estilos.inputGroup}>
                        <label style={estilos.label}>Nº Conselho/UF</label>
                        <input style={estilos.input} data-campo="medicoCrm" value={campos.medicoCrm} onChange={handleTexto} />
                    </div>
                    <div style={{ ...estilos.inputGroup, gridColumn: "1 / -1" }}>
                        <label style={estilos.label}>Efeitos adversos</label>
                        <div style={{ background: "var(--implanon-input-bg)", border: "1px solid var(--implanon-border)", borderRadius: "10px", padding: "12px 14px", fontSize: "12.5px", lineHeight: "1.55", color: "var(--implanon-text)", whiteSpace: "pre-wrap" as const }}>{TEXTO_EFEITOS_ADVERSOS}</div>
                        <label style={{ ...estilos.checkboxRow, marginTop: "8px" }}><input type="checkbox" data-campo="cienteEfeitos" checked={campos.cienteEfeitos} onChange={handleCheck} />Ciente sobre possíveis efeitos adversos</label>
                    </div>
                </div>

                <div className="implanon-result">
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
                        <button type="button" className="implanon-icon-btn" style={estilos.iconBtn} onClick={limpar} title="Limpar" aria-label="Limpar">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m19 6-1 14H6L5 6" /><path d="M10 11v5M14 11v5" /></svg>
                        </button>
                        <button type="button" className="implanon-icon-btn" style={estilos.iconBtn} onClick={imprimirTermo} title={imprimindo ? "Gerando..." : "Imprimir termo"} aria-label="Imprimir termo">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                        </button>
                        <button type="button" className="implanon-icon-btn" style={estilos.iconBtn} onClick={copiarTexto} title={copiado ? "Copiado" : "Copiar texto"} aria-label="Copiar texto">
                            {copiado
                                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>}
                        </button>
                    </div>
                    {avisosIndicacao.length > 0 ? (
                        <div style={{ background: "var(--implanon-alert-bg)", border: "1px solid var(--implanon-alert-border)", color: "var(--implanon-alert-text)", borderRadius: "10px", padding: "10px 12px", fontSize: "12px", lineHeight: "1.5", marginBottom: "10px" }}>
                            <div style={{ fontWeight: 700, marginBottom: "4px" }}>Alerta de elegibilidade</div>
                            {avisosIndicacao.map(function (aviso, idx) {
                                return <div key={idx}>- {aviso}</div>
                            })}
                        </div>
                    ) : null}
                    {erroPdf ? <div style={{ fontSize: "12px", color: "var(--implanon-alert-text)", marginBottom: "8px" }}>{erroPdf}</div> : null}
                    <textarea ref={outputRef} style={estilos.output} value={texto} readOnly rows={1} />
                </div>
            </div>
        </div>
    )
}
