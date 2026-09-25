export interface QuestaoVerificacao {
    id: string
    termo: string
    verificacao: string
    criterioSim: string
    criterioNao: string
    limite?: number
}

export interface QuestaoEscolha {
    id: string
    termo: string
    verificacao: string
    criterioSim: string
    criterioNao: string
    limite?: number
    instrucoesEscolha: string
    opcoes: Record<string, string>
}

export interface GrupoVerificacao {
    id: string
    label: string
    sintomas: string[]
}

export interface EspecialidadeEncaminha {
    id: string
    label: string
    grupos: GrupoVerificacao[]
    questoesBooleano: QuestaoVerificacao[]
    questoesEscolha: QuestaoEscolha[]
}

export const LIMITE_SUGESTAO_DEFAULT = 0.45

export const ESPECIALIDADES_ENCAMINHA: EspecialidadeEncaminha[] = [
    {
        id: "ortopedia",
        label: "Ortopedia",
        grupos: [
            {
                id: "sintomas_ortopedicos",
                label: "Sintomas ortopédicos",
                sintomas: [
                    "dor",
                    "edema",
                    "instabilidade articular",
                    "rigidez articular",
                    "crepitação",
                    "parestesia",
                    "paresia/fraqueza",
                    "limitação de movimento",
                    "deformidade",
                ],
            },
            {
                id: "sintomas_constitucionais",
                label: "Sintomas constitucionais",
                sintomas: [
                    "perda de peso",
                    "fadiga",
                    "inapetência",
                ],
            },
            {
                id: "sintomas_infecciosos",
                label: "Sintomas infecciosos",
                sintomas: [
                    "febre",
                    "calor local",
                    "rubor",
                ],
            },
            {
                id: "tipo_trauma",
                label: "Tipo de trauma",
                sintomas: [
                    "entorse",
                    "luxação",
                    "fratura",
                    "ruptura ligamentar",
                ],
            },
            {
                id: "comorbidades",
                label: "Comorbidades",
                sintomas: [
                    "diabetes",
                    "hipertensão arterial",
                    "DAOP",
                    "osteoporose",
                    "neoplasia",
                ],
            },
        ],
        questoesBooleano: [
            {
                id: "exame_fisico",
                termo: "exame físico ortopédico",
                verificacao: "O texto contém a palavra \"exame físico\" ou um sinônimo?",
                criterioSim: "O texto contém a palavra \"exame físico\" ou um sinônimo, inclusive em frase negativa (nega, sem).",
                criterioNao: "O texto não contém a palavra \"exame físico\" nem um sinônimo, nem mesmo negando (nega, sem).",
            },
            {
                id: "exame_imagem",
                termo: "exames de imagem",
                verificacao: "O texto contém a palavra \"exames de imagem\" ou um sinônimo (radiografia, ultrassom, ressonância, tomografia)?",
                criterioSim: "O texto contém a palavra \"exame de imagem\" ou um sinônimo, inclusive em frase negativa (nega, sem).",
                criterioNao: "O texto não contém a palavra \"exame de imagem\" nem um sinônimo, nem mesmo negando (nega, sem).",
            },
            {
                id: "exame_laboratorial",
                termo: "exames laboratoriais",
                verificacao: "O texto contém a palavra \"exames laboratoriais\" ou um sinônimo (hemograma, PCR, VHS, ácido úrico)?",
                criterioSim: "O texto contém a palavra \"exame laboratorial\" ou um sinônimo, inclusive em frase negativa (nega, sem).",
                criterioNao: "O texto não contém a palavra \"exame laboratorial\" nem um sinônimo, nem mesmo negando (nega, sem).",
            },
            {
                id: "indicacao_cirurgica",
                termo: "indicação cirúrgica",
                verificacao: "O texto contém a palavra \"indicação cirúrgica\" ou um sinônimo (cirurgia, operar, cirúrgico)?",
                criterioSim: "O texto contém a palavra \"indicação cirúrgica\" ou um sinônimo, inclusive em frase negativa (nega, sem).",
                criterioNao: "O texto não contém a palavra \"indicação cirúrgica\" nem um sinônimo, nem mesmo negando (nega, sem).",
            },
            {
                id: "cirurgia_previa",
                termo: "cirurgia prévia",
                verificacao: "O texto contém a palavra \"cirurgia prévia\" ou um sinônimo (operado, procedimento cirúrgico anterior)?",
                criterioSim: "O texto contém a palavra \"cirurgia prévia\" ou um sinônimo, inclusive em frase negativa (nega, sem).",
                criterioNao: "O texto não contém a palavra \"cirurgia prévia\" nem um sinônimo, nem mesmo negando (nega, sem).",
            },
            {
                id: "proteses",
                termo: "prótese/órtese",
                verificacao: "O texto contém a palavra \"prótese/órtese\" ou um sinônimo (prótese, órtese, dispositivo ortopédico)?",
                criterioSim: "O texto contém a palavra \"prótese/órtese\" ou um sinônimo, inclusive em frase negativa (nega, sem).",
                criterioNao: "O texto não contém a palavra \"prótese/órtese\" nem um sinônimo, nem mesmo negando (nega, sem).",
            },
            {
                id: "imunossupressao",
                termo: "imunossupressão",
                verificacao: "O texto contém a palavra \"imunossupressão\" ou um sinônimo (corticoide, imunobiológico, imunodeficiente)?",
                criterioSim: "O texto contém a palavra \"imunossupressão\" ou um sinônimo, inclusive em frase negativa (nega, sem).",
                criterioNao: "O texto não contém a palavra \"imunossupressão\" nem um sinônimo, nem mesmo negando (nega, sem).",
            },
            {
                id: "comorb_psiquiatricas",
                termo: "comorbidade psiquiátrica",
                verificacao: "O texto contém a palavra \"comorbidade psiquiátrica\" ou um sinônimo (depressão, ansiedade, transtorno)?",
                criterioSim: "O texto contém a palavra \"comorbidade psiquiátrica\" ou um sinônimo, inclusive em frase negativa (nega, sem).",
                criterioNao: "O texto não contém a palavra \"comorbidade psiquiátrica\" nem um sinônimo, nem mesmo negando (nega, sem).",
            },
            {
                id: "contexto_ocupacional",
                termo: "contexto ocupacional",
                verificacao: "O texto contém a palavra \"contexto ocupacional\" ou um sinônimo (trabalho, emprego, atividade laboral)?",
                criterioSim: "O texto contém a palavra \"contexto ocupacional\" ou um sinônimo, inclusive em frase negativa (nega, sem).",
                criterioNao: "O texto não contém a palavra \"contexto ocupacional\" nem um sinônimo, nem mesmo negando (nega, sem).",
            },
            {
                id: "vulnerabilidade_social",
                termo: "vulnerabilidade social",
                verificacao: "O texto contém a palavra \"vulnerabilidade social\" ou um sinônimo (suporte familiar, moradia, condições socioeconômicas)?",
                criterioSim: "O texto contém a palavra \"vulnerabilidade social\" ou um sinônimo, inclusive em frase negativa (nega, sem).",
                criterioNao: "O texto não contém a palavra \"vulnerabilidade social\" nem um sinônimo, nem mesmo negando (nega, sem).",
            },
            {
                id: "fragilidade_previa",
                termo: "fragilidade prévia",
                verificacao: "O texto contém a palavra \"fragilidade prévia\" ou um sinônimo (quedas, dependência, sarcopenia)?",
                criterioSim: "O texto contém a palavra \"fragilidade prévia\" ou um sinônimo, inclusive em frase negativa (nega, sem).",
                criterioNao: "O texto não contém a palavra \"fragilidade prévia\" nem um sinônimo, nem mesmo negando (nega, sem).",
            },
        ],
        questoesEscolha: [
            {
                id: "acometimento_articular",
                termo: "padrão de acometimento articular",
                verificacao: "O texto contém a palavra \"padrão de acometimento articular\" ou um sinônimo (uniarticular, poliarticular, articulação)?",
                criterioSim: "O texto contém a palavra \"acometimento articular\" ou um sinônimo, inclusive em frase negativa (nega, sem).",
                criterioNao: "O texto não contém a palavra \"acometimento articular\" nem um sinônimo, nem mesmo negando (nega, sem).",
                instrucoesEscolha: "Como descrever o padrão de acometimento articular do paciente?",
                opcoes: {
                    "único": "apenas uma articulação envolvida",
                    "bilateral": "articulações homólogas nos dois lados",
                    "múltiplo assimétrico": "várias articulações sem padrão simétrico",
                    "múltiplo simétrico": "várias articulações em padrão simétrico",
                    "sem acometimento": "não há acometimento articular",
                },
            },
            {
                id: "temporalidade",
                termo: "temporalidade",
                verificacao: "O texto contém a palavra \"temporalidade\" ou um sinônimo (agudo, crônico, tempo de evolução, semanas, meses)?",
                criterioSim: "O texto contém a palavra \"temporalidade\" ou um sinônimo, inclusive em frase negativa (nega, sem).",
                criterioNao: "O texto não contém a palavra \"temporalidade\" nem um sinônimo, nem mesmo negando (nega, sem).",
                instrucoesEscolha: "Como classificar a temporalidade do quadro?",
                opcoes: {
                    "aguda": "início há menos de 6 semanas",
                    "subaguda": "início entre 6 e 12 semanas",
                    "crônica": "início há mais de 12 semanas",
                },
            },
            {
                id: "historico_trauma",
                termo: "histórico de trauma",
                verificacao: "O texto contém a palavra \"histórico de trauma\" ou um sinônimo (entorse, queda, acidente, trauma)?",
                criterioSim: "O texto contém a palavra \"trauma\" ou um sinônimo, inclusive em frase negativa (nega, sem).",
                criterioNao: "O texto não contém a palavra \"trauma\" nem um sinônimo, nem mesmo negando (nega, sem).",
                instrucoesEscolha: "Há quanto tempo ocorreu o trauma relacionado ao quadro?",
                opcoes: {
                    "há menos de 6 meses": "trauma recente, em até 6 meses",
                    "há 6 a 12 meses": "trauma entre 6 e 12 meses",
                    "há mais de 1 ano": "trauma há mais de 1 ano",
                    "sem histórico": "não há histórico de trauma",
                },
            },
            {
                id: "faixa_etaria",
                termo: "faixa etária",
                verificacao: "O texto contém a palavra \"faixa etária\" ou um sinônimo (idade, anos, anos de idade)?",
                criterioSim: "O texto contém a palavra \"idade\" ou um sinônimo, inclusive em frase negativa (não informa).",
                criterioNao: "O texto não contém a palavra \"idade\" nem um sinônimo, nem mesmo negando.",
                instrucoesEscolha: "Em qual faixa etária está o paciente?",
                opcoes: {
                    "18 a 30 anos": "idade entre 18 e 30 anos",
                    "31 a 45 anos": "idade entre 31 e 45 anos",
                    "46 a 59 anos": "idade entre 46 e 59 anos",
                    "60 a 75 anos": "idade entre 60 e 75 anos",
                    "acima de 75 anos": "idade maior que 75 anos",
                },
            },
            {
                id: "imc",
                termo: "IMC/peso e altura",
                verificacao: "O texto contém a palavra \"IMC/peso e altura\" ou um sinônimo (peso, altura, índice de massa corporal)?",
                criterioSim: "O texto contém a palavra \"peso\" ou \"IMC\" ou um sinônimo, inclusive em frase negativa (nega, sem).",
                criterioNao: "O texto não contém a palavra \"peso\" nem \"IMC\" nem um sinônimo, nem mesmo negando (nega, sem).",
                instrucoesEscolha: "Como classificar o IMC do paciente?",
                opcoes: {
                    "baixo peso": "IMC abaixo de 18,5",
                    "peso adequado": "IMC entre 18,5 e 24,9",
                    "sobrepeso": "IMC entre 25 e 29,9",
                    "obesidade grau I": "IMC entre 30 e 34,9",
                    "obesidade grau II": "IMC entre 35 e 39,9",
                    "obesidade grau III": "IMC igual ou acima de 40",
                },
            },
            {
                id: "prejuizo_funcional",
                termo: "prejuízo funcional",
                verificacao: "O texto contém a palavra \"prejuízo funcional\" ou um sinônimo (AVDs, atividades da vida diária, limitação funcional)?",
                criterioSim: "O texto contém a palavra \"prejuízo funcional\" ou um sinônimo, inclusive em frase negativa (nega, sem).",
                criterioNao: "O texto não contém a palavra \"prejuízo funcional\" nem um sinônimo, nem mesmo negando (nega, sem).",
                instrucoesEscolha: "Qual o grau de prejuízo funcional do paciente?",
                opcoes: {
                    "total": "incapacidade de realizar as atividades da vida diária",
                    "parcial": "dificuldade parcial nas atividades",
                    "sem prejuízo": "sem comprometimento funcional",
                },
            },
            {
                id: "resposta_aps",
                termo: "resposta à APS",
                verificacao: "O texto contém a palavra \"resposta à APS\" ou um sinônimo (analgésicos, fisioterapia, conduta prévia, Atenção Primária)?",
                criterioSim: "O texto contém a palavra \"resposta à APS\" ou um sinônimo, inclusive em frase negativa (nega, sem).",
                criterioNao: "O texto não contém a palavra \"resposta à APS\" nem um sinônimo, nem mesmo negando (nega, sem).",
                instrucoesEscolha: "Como foi a resposta às condutas realizadas na Atenção Primária?",
                opcoes: {
                    "ineficaz": "condutas não produziram melhora",
                    "refratária": "sintomas persistem apesar das condutas",
                    "parcial": "houve melhora parcial",
                    "remissão": "houve remissão dos sintomas",
                },
            },
        ],
    },
]