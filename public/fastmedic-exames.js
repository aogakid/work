/* =============================================================================
 * FASTMEDIC EXAMES — Bookmarklet de Extração de Laudos
 * -----------------------------------------------------------------------------
 * Espelha a formatação, cálculos (LDL Martin-Hopkins, TFG CKD-EPI 2021),
 * ordem de campos e tema visual (exames_ui, geriatria_ui, bloco_ui).
 *
 * Inclui checklist interativo para selecionar o que importar do PDF aberto.
 * Não persiste dados ao fechar.
 * Compatível com o prontuário FastMedic (Fortaleza / SUS).
 * ========================================================================== */

(function () {
  'use strict';

  var NOME_GLOBAL = 'FastMedicExames';
  var CHAVE_SESSAO = 'fastmedic_exames:sessao';

  // Se já estiver rodando na tela, executa ação direta
  if (window[NOME_GLOBAL] && window[NOME_GLOBAL].rodando) {
    if (typeof window[NOME_GLOBAL].executar === 'function') {
      window[NOME_GLOBAL].executar();
    }
    return;
  }

  /* ===========================================================================
   * CONFIGURAÇÃO E CONSTANTES
   * ======================================================================== */
  var CFG = {
    pdfjs: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
    pdfjsWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js',
    enderecoLaudoPDF: '/CompartilhadoHistoricoUsuario/RecuperaLaudoPDF',
    seletorTabelaGrade: '[id*="LaudoExames_GridLabMunicipal"]',
    seletorPdfAberto: 'object[id*="LaudoPdf"], embed[id*="LaudoPdf"], iframe[id*="LaudoPdf"], object[type="application/pdf"], embed[type="application/pdf"]',
    situacaoComLaudo: /^integrad/i,
    segundosVigia: 180,
    intervaloVigiaMs: 400
  };

  /* ===========================================================================
   * CAMPOS E ORDEM (ESPELHO DO EXAMES_UI)
   * ======================================================================== */
  var CAMPOS_FIXOS = [
    // Hemograma
    { id: 'hb', label: 'Hb' },
    { id: 'ht', label: 'Ht' },
    { id: 'vcm', label: 'VCM' },
    { id: 'hcm', label: 'HCM' },
    { id: 'leuco', label: 'Leuco' },
    { id: 'neutro', label: 'Neutro' },
    { id: 'plaq', label: 'Plaq' },

    // Lipidograma
    { id: 'ct', label: 'CT' },
    { id: 'hdl', label: 'HDL' },
    { id: 'trig', label: 'Trig' },
    { id: 'ldl', label: 'LDL', calculado: true },

    // Perfil glicêmico
    { id: 'glic', label: 'Glic' },
    { id: 'hba1c', label: 'HbA1c' },

    // Função renal
    { id: 'ur', label: 'Ur' },
    { id: 'cr', label: 'Cr' },
    { id: 'tfg', label: 'TFG', calculado: true },
    { id: 'rac', label: 'RAC' },
    { id: 'acur', label: 'ÁcÚr' },

    // Função tireoidiana
    { id: 'tsh', label: 'TSH' },
    { id: 't4l', label: 'T4L' },

    // Função hepatopancreática
    { id: 'ast', label: 'AST' },
    { id: 'alt', label: 'ALT' },
    { id: 'fa', label: 'FA' },
    { id: 'ggt', label: 'GGT' },
    { id: 'bt', label: 'BT' },
    { id: 'bd', label: 'BD' },
    { id: 'bi', label: 'BI' },
    { id: 'alb', label: 'Alb' },
    { id: 'amil', label: 'Amil' },
    { id: 'lip', label: 'Lip' },

    // Coagulograma
    { id: 'tp', label: 'TP' },
    { id: 'ttpa', label: 'TTPA' },
    { id: 'inr', label: 'INR' },

    // Inflamação
    { id: 'pcr', label: 'PCR' },

    // Eletrólitos
    { id: 'na', label: 'Na' },
    { id: 'k', label: 'K' },

    // Vitaminas
    { id: 'vitd', label: 'Vit D' },
    { id: 'vitb12', label: 'Vit B12' },

    // Perfil do ferro
    { id: 'fe', label: 'Fe' },
    { id: 'ferrit', label: 'Ferrit' },
    { id: 'transferr', label: 'Transferr' },
    { id: 'sattransf', label: 'SatTransf' }
  ];

  /* ===========================================================================
   * REGRAS DE EXTRAÇÃO DO PDF
   * ======================================================================== */
  var REGRAS_PADRAO = [
    // Hemograma
    { id: 'hb', padrao: /^hemoglobina(?!\s*glic)/i },
    { id: 'ht', padrao: /^(hemat[óo]crito|ht)\b/i },
    { id: 'vcm', padrao: /^(v\.?\s*c\.?\s*m\.?|volume\s+corpuscular\s+m[ée]dio)/i },
    { id: 'hcm', padrao: /^(h\.?\s*c\.?\s*m\.?)(?!\s*c)/i },
    { id: 'leuco', padrao: /^(leuc[óo]citos|leucograma|global\s+de\s+leuc)/i, escala: true },
    { id: 'neutro', padrao: /^(neutr[óo]filos|segmentados)\b/i },
    { id: 'plaq', padrao: /^(contagem\s+de\s+plaquetas|plaquetas)/i, escala: true },

    // Lipídios (HDL e LDL antes de CT para não colidir com 'Colesterol Total')
    { id: 'hdl', padrao: /^(colesterol\s+hdl|hdl\b)/i },
    { id: 'ldl', padrao: /^(colesterol\s+ldl|ldl\b)/i },
    { id: 'trig', padrao: /^(triglic|tgl)/i },
    { id: 'ct', padrao: /^(colesterol\s+total|colesterol\b(?!\s*(?:hdl|ldl)))/i },

    // Glicemia (HbA1c antes de Glicemia)
    { id: 'hba1c', padrao: /^(hemoglobina\s+glicada|hb\s*a?1c|a1c\b)/i },
    { id: 'glic', padrao: /^(glicose|glicemia)(\s+de\s+jejum|\s+jejum)?/i },

    // Função renal (RAC antes de Creatinina; Cr sérica não pode casar com urina)
    { id: 'rac', padrao: /^(rela[çc][ãa]o\s+albumina\s*\/?\s*creatinina|rac\b|microalbumin)/i },
    { id: 'ur', padrao: /^ur[ée]ia/i },
    { id: 'cr', padrao: /^creatinina(?!.*urin)(?!.*rela[çc])/i },
    { id: 'acur', padrao: /^([áa]cido\s+[úu]rico|au\b)/i },

    // Tireoide
    { id: 'tsh', padrao: /^(tsh|horm[ôo]nio\s+tireoestim)/i },
    { id: 't4l', padrao: /^(t4\s*livre|tiroxina\s+livre|t4\b)/i },

    // Fígado / Pâncreas (BD e BI antes de BT)
    { id: 'bd', padrao: /^bilirrubina\s+direta/i },
    { id: 'bi', padrao: /^bilirrubina\s+indireta/i },
    { id: 'bt', padrao: /^bilirrubina(\s+total)?/i },
    { id: 'ast', padrao: /^(tgo|ast|transaminase\s+oxal|aspartato)/i },
    { id: 'alt', padrao: /^(tgp|alt|transaminase\s+pir|alanina)/i },
    { id: 'fa', padrao: /^(fosfatase\s+alcalina)/i },
    { id: 'ggt', padrao: /^(gama\s*gt|ggt|gama\s+glutamil)/i },
    { id: 'alb', padrao: /^albumina(?!.*creatinina)(?!.*urin)/i },
    { id: 'amil', padrao: /^amilase/i },
    { id: 'lip', padrao: /^lipase/i },

    // Coagulação
    { id: 'tp', padrao: /^(tempo\s+de\s+protrombina|atividade\s+de\s+protrombina|tap\b)/i },
    { id: 'ttpa', padrao: /^(tempo\s+de\s+tromboplastina|ttpa|ktpa)\b/i },
    { id: 'inr', padrao: /^(inr|rni|r\.n\.i)\b/i },

    // Inflamação
    { id: 'pcr', padrao: /^(pcr|prote[íi]na\s+c\s+reativa)/i },

    // Eletrólitos
    { id: 'na', padrao: /^s[óo]dio/i },
    { id: 'k', padrao: /^pot[áa]ssio/i },

    // Vitaminas
    { id: 'vitd', padrao: /^(vitamina\s*d|25.?hidroxi)/i },
    { id: 'vitb12', padrao: /^(vitamina\s*b\s*12|cianocobalamina|b12\b)/i },

    // Perfil do ferro
    { id: 'fe', padrao: /^ferro(\s+s[ée]rico)?/i },
    { id: 'ferrit', padrao: /^ferritina/i },
    { id: 'transferr', padrao: /^transferrina/i },
    { id: 'sattransf', padrao: /^(satura[çc][ãa]o\s+(da\s+)?transferrina|[íi]ndice\s+de\s+satura)/i }
  ];

  var REGRAS_EXTRAS = [
    { label: 'Hemácias', padrao: /^hem[áa]cias/i },
    { label: 'RDW', padrao: /^rdw/i },
    { label: 'CHCM', padrao: /^c\.?\s*h\.?\s*c\.?\s*m\b/i },
    { label: 'VPM', padrao: /^vpm\b/i },
    { label: 'Bastonetes', padrao: /^bastonetes/i },
    { label: 'Eosinófilos', padrao: /^eosin[óo]filos/i },
    { label: 'Linfócitos', padrao: /^linf[óo]citos/i },
    { label: 'Monócitos', padrao: /^mon[óo]citos/i },
    { label: 'Basófilos', padrao: /^bas[óo]filos/i },
    { label: 'Cálcio', padrao: /^c[áa]lcio(?!.*i[ôo]nico)/i },
    { label: 'Magnésio', padrao: /^magn[ée]sio/i },
    { label: 'Fósforo', padrao: /^f[óo]sforo/i },
    { label: 'PSA livre', padrao: /^psa\s*livre/i },
    { label: 'PSA', padrao: /^psa\b/i },
    { label: 'Prolactina', padrao: /^prolactina/i },
    { label: 'VHS', padrao: /^(v\.?h\.?s\.?|velocidade\s+de\s+hemossed)/i },
    { label: 'D-Dímero', padrao: /^d[\s-]?d[íi]mero/i },
    { label: 'TIBC', padrao: /^(tibc|capacidade\s+total\s+de\s+liga)/i },
    { label: 'SU:', padrao: /^(an[áa]lise\s+de\s+caracteres\s+f[íi]sicos|sum[áa]rio\s+de\s+urina|urina\s+rotina|e\.?a\.?s\.?)/i, fixo: '*AVALIAR*' },
    { label: 'Urocultura', padrao: /^(urocultura|urinocultura|cultura\s+de\s+urina)/i, fixo: '*AVALIAR*', negativoRegex: /(n[ãa]o\s+houve\s+crescimento|aus[êe]ncia\s+de\s+crescimento|cultura\s+negativa)/i, negativoTexto: '(-)' }
  ];

  // Exames com resultado qualitativo (sorologias, PSOF, etc.): o valor não é número.
  var REGRAS_QUALITATIVAS = [
    { label: 'VDRL', padrao: /^VDRL\b/i },
    { label: 'RPR', padrao: /^RPR\b/i },
    { label: 'HBsAg', padrao: /^(?:HEPATITE\s*B\s*-\s*)?HBsAg\b/i },
    { label: 'Anti-HBs', padrao: /^(?:HEPATITE\s*B\s*-\s*)?ANTI[-\s]?HBs\b/i },
    { label: 'Anti-HCV', padrao: /^(?:HEPATITE\s*C\s*-\s*)?ANTI[-\s]?HCV\b/i },
    { label: 'HIV', padrao: /^(?:ANTI[-\s]?)?HIV\b/i },
    { label: 'Sífilis', padrao: /^(?:SOROLOGIA\s+(?:PARA\s+)?)?S[ÍI]FILIS\b/i },
    { label: 'PSOF', padrao: /^(?:PSOF|PESQUISA\s+DE\s+SANGUE\s+OCULTO|SANGUE\s+OCULTO)/i }
  ];

  function normalizarResultadoQualitativo(texto) {
    var s = String(texto || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (/reagente/.test(s)) return /n[ãa]o\s+reagente/.test(s) ? 'Não Reagente' : 'Reagente';
    if (/fracamente\s+positivo/.test(s)) return 'Fracamente Positivo';
    if (/positivo/.test(s)) return 'Positivo';
    if (/negativo/.test(s)) return 'Negativo';
    if (/detect/.test(s)) return /n[ãa]o\s+detect/.test(s) ? 'Não Detectado' : 'Detectado';
    return '';
  }

  function adicionarExtraUnico(extras, label, valor) {
    if (!label || !valor) return;
    if (extras.some(function (item) { return item.label === label; })) return;
    extras.push({ label: label, valor: valor });
  }

  function ehCabecalhoExameQualitativo(texto) {
    var s = String(texto || '').trim();
    if (!s || s.length > 90 || !/[a-z]/i.test(s)) return false;
    if (/^(resultado|leitura|interpreta[çc][ãa]o|valor\s+de\s+refer[êe]ncia|limites?\s+de|m[ée]todo|material|liberado|respons[áa]vel|origem|cl[íi]nica|nome|solicitante|prontu[áa]rio|observa[çc][õo]es)/i.test(s)) return false;
    if (/^(n[ãa]o\s+)?reagente\b|^(negativo|positivo|fracamente\s+positivo|indeterminado)\b|^amostra\b|^o resultado\b/i.test(s)) return false;
    if (/:/.test(s) && /\d/.test(s)) return false;
    if (/^-{3,}|^\|/.test(s)) return false;
    return true;
  }

  function rotuloQualitativoGenerico(texto) {
    var s = String(texto || '').trim();
    var partes = s.split(/\s+[-–—]\s+/);
    var nome = partes[0] || s;
    nome = nome.replace(/^(exame|pesquisa|teste|sorologia|determina[çc][ãa]o)\s+(para\s+)?/i, '');
    nome = nome.replace(/\s+(soro|fezes|urina|sangue)$/i, '');
    nome = nome.replace(/\s+(de|da|do|das|dos|nas|nos|no|na|para)$/i, '');
    nome = nome.replace(/\s+/g, ' ').trim();
    var palavras = nome.split(/\s+/);
    if (palavras.length > 3) nome = palavras.slice(0, 3).join(' ');
    return nome.slice(0, 24);
  }

  /* ===========================================================================
   * FUNÇÕES DE CÁLCULO (ESPELHO DO EXAMES_UI)
   * ======================================================================== */

  // Fórmula de Martin-Hopkins para LDL
  function calcLdl(v) {
    var ct = parseFloat(v.ct || '');
    var h = parseFloat(v.hdl || '');
    var tg = parseFloat(v.trig || '');
    if (!ct || !h || !tg || isNaN(ct) || isNaN(h) || isNaN(tg)) return null;
    if (tg >= 400) return null;
    var noHdl = ct - h;
    if (noHdl <= 0) return '0';
    var fatorMh = 5.0;
    if (noHdl < 100) {
      fatorMh = tg < 100 ? 4.1 : tg < 150 ? 4.8 : 5.6;
    } else if (noHdl < 160) {
      fatorMh = tg < 100 ? 4.4 : tg < 150 ? 5.1 : tg < 200 ? 5.5 : 6.2;
    } else {
      fatorMh = tg < 100 ? 4.7 : tg < 200 ? 5.4 : 6.7;
    }
    return Math.max(0, Math.round(noHdl - tg / fatorMh)).toString();
  }

  // Fórmula CKD-EPI 2021 para TFG (sem coeficiente de raça)
  function calcTfg(v) {
    var i = parseInt(v.idade || '', 10);
    var cr = parseFloat(v.cr || '');
    var sexo = v.sexo || '';
    if (!i || !sexo || !cr || isNaN(cr) || cr <= 0) return null;
    var a = sexo === 'F' ? 0.7 : 0.9;
    var b = sexo === 'F' ? (cr <= 0.7 ? -0.241 : -1.2) : (cr <= 0.9 ? -0.302 : -1.2);
    var fSexo = sexo === 'F' ? 1.012 : 1.0;
    var calc = 142 * Math.pow(cr / a, b) * Math.pow(0.9938, i) * fSexo;
    return Math.round(calc).toString();
  }

  function formatarDataBR(dataIsoOuBarra) {
    if (!dataIsoOuBarra) return '';
    if (dataIsoOuBarra.indexOf('-') >= 0) {
      var partes = dataIsoOuBarra.split('-');
      var ano = partes[0] ? partes[0].slice(2) : '';
      return (partes[2] || '') + '/' + (partes[1] || '') + '/' + ano;
    }
    var m = dataIsoOuBarra.match(/(\d{2})\/(\d{2})\/(\d{4}|\d{2})/);
    if (m) {
      var a = m[3].length === 4 ? m[3].slice(2) : m[3];
      return m[1] + '/' + m[2] + '/' + a;
    }
    return dataIsoOuBarra;
  }

  /* ===========================================================================
   * LEITOR E PARSER DE NÚMEROS
   * ======================================================================== */
  function normalizarNumero(str) {
    if (!str) return '';
    var s = String(str).trim().replace(/\s/g, '');
    if (!s) return '';
    if (s.indexOf(',') >= 0) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      var partes = s.split('.');
      if (partes.length === 2 && partes[1].length === 3) s = partes.join('');
    }
    var n = parseFloat(s);
    return isNaN(n) ? '' : String(n);
  }

  function primeiroNumeroComEscala(txt, escala) {
    var m = String(txt || '').match(/-?\d+(?:[.,]\d+)*/);
    if (!m) return '';
    var numStr = normalizarNumero(m[0]);
    if (!numStr) return '';
    var n = parseFloat(numStr);
    if (escala) {
      var depois = txt.slice(m.index + m[0].length, m.index + m[0].length + 16);
      if (/(^|[\s(x×])(10\s*[³3]|mil\b|x\s*1\.?000)/i.test(depois)) {
        n = n * 1000;
        return String(Math.round(n));
      }
    }
    return numStr;
  }

  function extrairValorDaLinha(linha, idx, linhas, escala) {
    var colon = linha.indexOf(':');
    if (colon !== -1) {
      var inline = primeiroNumeroComEscala(linha.slice(colon + 1), escala);
      if (inline) return inline;
    }
    var fim = Math.min(idx + 4, linhas.length);
    for (var j = idx + 1; j < fim; j++) {
      var l = linhas[j];
      var m = /^resultado\s*:?/i.exec(l);
      if (m) {
        var c = l.indexOf(':');
        var resto = c !== -1 ? l.slice(c + 1) : l.slice(m[0].length);
        var v = primeiroNumeroComEscala(resto, escala);
        if (v) return v;
      }
    }
    return '';
  }

  /* ===========================================================================
   * PARSER DO TEXTO DO LAUDO
   * ======================================================================== */
  function interpretarLinhasDoLaudo(linhas) {
    var suLinhas = linhas.su || [];
    var suDetectado = suLinhas.length > 0;
    var valorSU = montarValorSU(suLinhas);
    var resultado = {
      valores: {},
      extras: [],
      nomePaciente: '',
      data: '',
      nascimento: '',
      sexo: '',
      idade: null
    };

    // 1. Cabeçalho
    for (var i = 0; i < linhas.length && i < 45; i++) {
      var l = linhas[i];
      if (!resultado.nomePaciente) {
        var mNome = l.match(/Nome\s*(?:d[oa]\s*)?Paciente\s*:?\s*([^:]{3,60}?)(?:\s{2,}|\s*(?:Data|RG|Mãe|Sexo|Nascimento)\b|$)/i);
        if (mNome) resultado.nomePaciente = mNome[1].replace(/\s+/g, ' ').trim();
      }
      if (!resultado.data) {
        var mData = l.match(/Data\s+de\s+cadastro\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i) ||
                    l.match(/Data\s+da\s+coleta\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i);
        if (mData) resultado.data = mData[1];
      }
      if (!resultado.nascimento) {
        var mNasc = l.match(/Nascimento[^:]*:\s*(\d{2}\/\d{2}\/\d{4})\s*([FM])?/i) ||
                    l.match(/Data\s*Nascimento\/Sexo:\s*(\d{2}\/\d{2}\/\d{4})\s*([FM])/i);
        if (mNasc) {
          resultado.nascimento = mNasc[1];
          if (mNasc[2]) resultado.sexo = mNasc[2].toUpperCase();
        }
      }
      if (!resultado.sexo) {
        var mSexo = l.match(/Sexo\s*:?\s*([FM])\b/i);
        if (mSexo) resultado.sexo = mSexo[1].toUpperCase();
      }
    }

    if (!resultado.data) {
      for (var k = linhas.length - 1; k >= 0; k--) {
        var mLiberado = linhas[k].match(/Liberado\s+em\s*\(?\s*(\d{2}\/\d{2}\/\d{4})/i);
        if (mLiberado) { resultado.data = mLiberado[1]; break; }
      }
    }

    // Calcula idade
    if (resultado.nascimento) {
      var pn = resultado.nascimento.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (pn) {
        var dNasc = new Date(+pn[3], +pn[2] - 1, +pn[1]);
        var dRef = new Date();
        if (resultado.data) {
          var pr = resultado.data.match(/(\d{2})\/(\d{2})\/(\d{4})/);
          if (pr) dRef = new Date(+pr[3], +pr[2] - 1, +pr[1]);
        }
        var anos = dRef.getFullYear() - dNasc.getFullYear();
        var mesDiff = dRef.getMonth() - dNasc.getMonth();
        if (mesDiff < 0 || (mesDiff === 0 && dRef.getDate() < dNasc.getDate())) anos--;
        resultado.idade = String(anos);
        resultado.valores.idade = resultado.idade;
      }
    }
    if (resultado.sexo) {
      resultado.valores.sexo = resultado.sexo;
    }

    // A seção RELAÇÃO ALBUMINA/CREATININA (urina) traz três números:
    // albumina, creatinina e relação. Somente a relação é o RAC; as linhas
    // de albumina/creatinina da urina não podem virar Alb/Cr séricos.
    var ignorarLinhas = {};
    for (var ir = 0; ir < linhas.length; ir++) {
      var linhaRac = linhas[ir] || '';
      if (!/^rela[çc][ãa]o\s+albumina\s*\/?\s*creatinina/i.test(linhaRac)) continue;
      ignorarLinhas[ir] = true;

      var mRacTitulo = linhaRac.match(/rela[çc][ãa]o\s+albumina\s*\/?\s*creatinina[^:]*:\s*(-?\d+(?:[.,]\d+)*)/i);
      if (mRacTitulo) resultado.valores.rac = normalizarNumero(mRacTitulo[1]);

      var fimRac = Math.min(ir + 14, linhas.length);
      for (var jr = ir + 1; jr < fimRac; jr++) {
        var lr = linhas[jr] || '';
        if (/^(M[ÉE]TODO|MATERIAL|LIBERADO|RESPONS[ÁA]VEL|-{4,})/i.test(lr)) break;
        ignorarLinhas[jr] = true;
        if (resultado.valores.rac || !/^rela[çc][ãa]o\b/i.test(lr)) continue;
        var mRac = lr.match(/^rela[çc][ãa]o\b[^\d:]*:\s*(-?\d+(?:[.,]\d+)*)/i) ||
                   lr.match(/^rela[çc][ãa]o\b[^\d]*?(-?\d+(?:[.,]\d+)*)/i);
        if (mRac) resultado.valores.rac = normalizarNumero(mRac[1]);
      }
    }

    // 2. Extração dos exames
    for (var idx = 0; idx < linhas.length; idx++) {
      var linha = linhas[idx];
      if (!linha || linha.length < 2) continue;
      if (ignorarLinhas[idx]) continue;

      // Campos fixos
      for (var r = 0; r < REGRAS_PADRAO.length; r++) {
        var regra = REGRAS_PADRAO[r];
        if (!regra.padrao.test(linha)) continue;
        if (resultado.valores[regra.id]) break;

        // Especial HbA1c
        if (regra.id === 'hba1c') {
          var vGlicada = '';
          var fimH = Math.min(idx + 4, linhas.length);
          for (var jh = idx; jh < fimH; jh++) {
            var lh = linhas[jh];
            var mA = /([\d.,]+)\s*%\s*hb\s*a?1c/i.exec(lh);
            if (mA) { vGlicada = normalizarNumero(mA[1]); break; }
            var mB = /hb\s*a?1c\s*:?\s*([\d.,]+)\s*%/i.exec(lh);
            if (mB) { vGlicada = normalizarNumero(mB[1]); break; }
          }
          if (vGlicada) resultado.valores[regra.id] = vGlicada;
          break;
        }

        var val = extrairValorDaLinha(linha, idx, linhas, !!regra.escala);
        if (val) resultado.valores[regra.id] = val;
        break;
      }

      // Campos extras
      for (var e = 0; e < REGRAS_EXTRAS.length; e++) {
        var extra = REGRAS_EXTRAS[e];
        if (!extra.padrao.test(linha)) continue;
        if (resultado.extras.some(function (item) { return item.label === extra.label; })) break;

        if (extra.label === 'SU:' && suDetectado) {
          if (valorSU) resultado.extras.push({ label: extra.label, valor: valorSU });
          break;
        }

        if (extra.fixo) {
          var txtFixo = extra.fixo;
          if (extra.negativoRegex) {
            var trecho = linhas.slice(idx, idx + 10).join(' ');
            if (extra.negativoRegex.test(trecho)) {
              txtFixo = extra.negativoTexto || '(-)';
            }
          }
          resultado.extras.push({ label: extra.label, valor: txtFixo });
          break;
        }

        var colonE = linha.indexOf(':');
        var valE = colonE !== -1 ? primeiroNumeroComEscala(linha.slice(colonE + 1), false) : '';
        if (valE) {
          resultado.extras.push({ label: extra.label, valor: valE });
        }
        break;
      }
    }

    // Resultados qualitativos (sorologias, PSOF, etc.): valor sem número,
    // normalmente em "Resultado: ..." sob o título do exame. Exames não
    // listados também são capturados, com rótulo derivado do cabeçalho.
    for (var iq = 0; iq < linhas.length; iq++) {
      var linhaQ = linhas[iq] || '';

      var regraQ = null;
      for (var q = 0; q < REGRAS_QUALITATIVAS.length; q++) {
        if (REGRAS_QUALITATIVAS[q].padrao.test(linhaQ)) { regraQ = REGRAS_QUALITATIVAS[q]; break; }
      }
      if (regraQ) {
        var mInlineQ = linhaQ.match(/^[^:]*:\s*(.+)$/);
        if (mInlineQ) {
          var vInline = normalizarResultadoQualitativo(mInlineQ[1]);
          if (vInline) adicionarExtraUnico(resultado.extras, regraQ.label, vInline);
        }
      }

      var mResQ = /^resultado\s*:\s*(.+)$/i.exec(linhaQ);
      if (!mResQ) continue;
      var valorQ = normalizarResultadoQualitativo(mResQ[1]);
      if (!valorQ) continue;

      var rotuloQ = '';
      var iniQ = Math.max(0, iq - 12);
      for (var k = iq - 1; k >= iniQ && !rotuloQ; k--) {
        var candidataQ = linhas[k] || '';
        for (var q2 = 0; q2 < REGRAS_QUALITATIVAS.length; q2++) {
          if (REGRAS_QUALITATIVAS[q2].padrao.test(candidataQ)) {
            rotuloQ = REGRAS_QUALITATIVAS[q2].label;
            break;
          }
        }
        if (!rotuloQ && ehCabecalhoExameQualitativo(candidataQ)) {
          rotuloQ = rotuloQualitativoGenerico(candidataQ);
        }
      }
      adicionarExtraUnico(resultado.extras, rotuloQ, valorQ);
    }

    if (valorSU && !resultado.extras.some(function (item) { return item.label === 'SU:'; })) {
      resultado.extras.push({ label: 'SU:', valor: valorSU });
    }

    // 3. Cálculos automáticos do template
    var ldlCalc = calcLdl(resultado.valores);
    if (ldlCalc && !resultado.valores.ldl) {
      resultado.valores.ldl = ldlCalc;
    }

    var tfgCalc = calcTfg(resultado.valores);
    if (tfgCalc && !resultado.valores.tfg) {
      resultado.valores.tfg = tfgCalc;
    }

    return resultado;
  }

  /* ===========================================================================
   * MONTAGEM DA LINHA FINAL NO PADRÃO EXAMES_UI
   * ======================================================================== */
  function montarLinhaFinal(dados) {
    var dataBr = formatarDataBR(dados.data || '');
    var prefixoData = dataBr ? '(' + dataBr + '): ' : '';

    var partes = [];
    CAMPOS_FIXOS.forEach(function (campo) {
      var val = dados.valores[campo.id];
      if (val && String(val).trim()) {
        partes.push(campo.label + ' ' + String(val).trim());
      }
    });

    if (dados.extras && dados.extras.length) {
      dados.extras.forEach(function (extra) {
        if (extra.valor && String(extra.valor).trim()) {
          partes.push(extra.label + ' ' + String(extra.valor).trim());
        }
      });
    }

    if (!partes.length) return '';
    return prefixoData + partes.join(' | ');
  }

  /* ===========================================================================
   * PDF.JS CARREGAMENTO E EXTRAÇÃO DE TEXTO
   * ======================================================================== */
  var pdfjsInstancia = null;

  function carregarPdfjs() {
    if (pdfjsInstancia) return Promise.resolve(pdfjsInstancia);

    var quadro = document.createElement('iframe');
    quadro.style.display = 'none';
    document.body.appendChild(quadro);

    return fetch(CFG.pdfjs, { credentials: 'omit' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' ao carregar leitor de PDF');
        return r.text();
      })
      .then(function (codigo) {
        quadro.contentWindow.eval(codigo);
        var lib = quadro.contentWindow.pdfjsLib;
        if (!lib) throw new Error('pdfjsLib não disponível no quadro');
        lib.GlobalWorkerOptions.workerSrc = CFG.pdfjsWorker;
        pdfjsInstancia = { lib: lib, janela: quadro.contentWindow };
        return pdfjsInstancia;
      });
  }

  function base64ParaBytes(b64, janela) {
    var bin = atob(String(b64).replace(/\s/g, ''));
    var Arr = (janela && janela.Uint8Array) ? janela.Uint8Array : Uint8Array;
    var bytes = new Arr(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  /* Extrai o Sumário de Urina usando as colunas do PDF: rótulo à esquerda,
     resultado no meio e valor de referência à direita. Agrupar por Y com
     Math.round (como em extrairTextoDoPdf) mistura as colunas de forma
     imprevisível, então aqui os itens brutos são agrupados por proximidade. */
  function extrairSUDoConteudo(conteudo) {
    var itens = (conteudo.items || []).map(function (it) {
      return { x: it.transform[4], y: it.transform[5], s: it.str || '' };
    }).filter(function (it) { return it.s.length > 0; }).sort(function (a, b) {
      return b.y - a.y || a.x - b.x;
    });

    var grupos = [];
    itens.forEach(function (it) {
      var grupo = null;
      for (var gi = 0; gi < grupos.length; gi++) {
        if (Math.abs(grupos[gi].y - it.y) < 2) { grupo = grupos[gi]; break; }
      }
      if (!grupo) { grupo = { y: it.y, itens: [] }; grupos.push(grupo); }
      grupo.itens.push(it);
    });

    var linhas = [];
    var secao = '';
    grupos.forEach(function (grupo) {
      var ordenados = grupo.itens.slice().sort(function (a, b) { return a.x - b.x; });
      var txt = String(ordenados.map(function (i) { return i.s; }).join('')).replace(/\s+/g, ' ').trim();
      if (!txt) return;

      if (/^ELEMENTOS\s*ANORMAIS/i.test(txt)) { secao = 'EA'; return; }
      if (/^SEDIMENTOSCOPIA/i.test(txt)) { secao = 'SED'; return; }
      if (/^(SUM[ÁA]RIO|VALOR\s*DE\s*REFER[ÊE]NCIA|ANALISE\s*QUIMICA|CARACTERES\s*GERAIS|MATERIAL\b|ATEN[ÇC][ÃA]O|LIBERADO|RESPONS[ÁA]VEL|\|)/i.test(txt)) { secao = ''; return; }
      if (/^M[ÉE]TODO\b/i.test(txt)) return;
      if (!secao) return;

      var ultimoRotulo = -1;
      for (var i = 0; i < ordenados.length; i++) {
        if (/:\s*$/.test(ordenados[i].s)) ultimoRotulo = i;
      }
      if (ultimoRotulo < 0) return;

      var parteRotulo = ordenados.slice(0, ultimoRotulo + 1).map(function (it) { return it.s; }).join('');
      var rotulo = String(parteRotulo).replace(/\.{2,}:?$/, '').replace(/:$/, '').replace(/\s+/g, ' ').trim();
      if (!rotulo) return;

      var depois = ordenados.slice(ultimoRotulo + 1);
      var valor = String(depois.filter(function (it) { return it.x < 330; })
        .map(function (it) { return it.s; }).join('')).replace(/\s+/g, ' ').trim();
      if (!valor) {
        var embed = parteRotulo.match(/:\s*(.+)$/);
        valor = embed ? String(embed[1]).replace(/\s+/g, ' ').trim() : '';
      }
      if (!valor) return;
      var referencia = String(depois.filter(function (it) { return it.x >= 330; })
        .map(function (it) { return it.s; }).join('')).replace(/\s+/g, ' ').trim();
      linhas.push({ secao: secao, rotulo: rotulo, valor: valor, referencia: referencia });
    });
    return linhas;
  }

  function normalizarSUParaComparacao(texto) {
    var s = String(texto || '').toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    s = s.replace(/[-–—]/g, 'a').replace(/\s*\/\s*/g, '/').replace(/\s+/g, '');
    return s.replace(/s$/, '');
  }

  function montarValorSU(linhas) {
    if (!linhas || !linhas.length) return '';
    var partes = [];
    linhas.forEach(function (r) {
      if (!r.valor) return;
      if (r.referencia && normalizarSUParaComparacao(r.valor) === normalizarSUParaComparacao(r.referencia)) return;
      var sigla = String(r.rotulo || '').replace(/\s+/g, ' ').trim().slice(0, 5);
      if (!sigla) return;
      partes.push(sigla + ' ' + r.valor);
    });
    return partes.join(' ');
  }

  function extrairTextoDoPdf(pdfEmBase64) {
    return carregarPdfjs().then(function (p) {
      var bytes = base64ParaBytes(pdfEmBase64, p.janela);
      return p.lib.getDocument({ data: bytes }).promise;
    }).then(function (doc) {
      var paginas = [];
      for (var i = 1; i <= doc.numPages; i++) paginas.push(i);

      return paginas.reduce(function (promessa, numPag) {
        return promessa.then(function (linhasAcumuladas) {
          return doc.getPage(numPag).then(function (page) {
            return page.getTextContent();
          }).then(function (conteudo) {
            var suPagina = extrairSUDoConteudo(conteudo);
            linhasAcumuladas.su = (linhasAcumuladas.su || []).concat(suPagina);
            var porAltura = {};
            conteudo.items.forEach(function (item) {
              var y = Math.round(item.transform[5]);
              (porAltura[y] = porAltura[y] || []).push({ x: item.transform[4], s: item.str });
            });
            Object.keys(porAltura).map(Number).sort(function (a, b) { return b - a; })
              .forEach(function (y) {
                var txt = porAltura[y].sort(function (a, b) { return a.x - b.x; })
                  .map(function (o) { return o.s; }).join(' ').replace(/\s+/g, ' ').trim();
                if (txt) linhasAcumuladas.push(txt);
              });
            return linhasAcumuladas;
          });
        });
      }, Promise.resolve([]));
    });
  }

  /* ===========================================================================
   * FASTMEDIC INTEGRAÇÃO: DETECÇÃO E GRADE
   * ======================================================================== */
  function enderecoDoSistema(caminho) {
    if (typeof window.getGlobalUrl === 'function') {
      try { return window.getGlobalUrl(caminho); } catch (e) {}
    }
    var base = location.pathname.split('/').slice(0, 2).join('/');
    return base + caminho;
  }

  function laudoAbertoNaTela() {
    var achados;
    try { achados = document.querySelectorAll(CFG.seletorPdfAberto); } catch (e) { return null; }

    for (var i = 0; i < achados.length; i++) {
      var el = achados[i];
      var fonte = el.getAttribute('data') || el.getAttribute('src') || '';
      var ehPdf = fonte.indexOf('data:application/pdf') === 0 || fonte.indexOf('blob:') === 0;
      if (!ehPdf) continue;
      var rect = el.getBoundingClientRect();
      if (rect.width >= 50 && rect.height >= 50) {
        return { elemento: el, fonte: fonte };
      }
    }
    return null;
  }

  function obterBase64DoPdf(fonte) {
    if (fonte.indexOf('data:') === 0) {
      var virgula = fonte.indexOf(',');
      var dados = virgula >= 0 ? fonte.slice(virgula + 1) : '';
      if (dados.indexOf('%') >= 0) {
        try { dados = decodeURIComponent(dados); } catch (e) {}
      }
      return Promise.resolve(dados.replace(/\s+/g, ''));
    }

    return fetch(fonte).then(function (r) { return r.blob(); }).then(function (blob) {
      return new Promise(function (resolve, reject) {
        var leitor = new FileReader();
        leitor.onload = function () {
          var res = String(leitor.result || '');
          var v = res.indexOf(',');
          if (v < 0) { reject(new Error('falha ao converter blob em base64')); return; }
          resolve(res.slice(v + 1));
        };
        leitor.onerror = function () { reject(new Error('erro ao ler blob')); };
        leitor.readAsDataURL(blob);
      });
    });
  }

  function lerGradeDeLaudos() {
    if (!window.jQuery) return [];
    var tabelas = document.querySelectorAll(CFG.seletorTabelaGrade);
    var arvore = null;
    for (var i = 0; i < tabelas.length; i++) {
      try {
        var ft = window.jQuery(tabelas[i]).data('uiFancytree');
        if (ft && ft.tree) { arvore = ft.tree; break; }
      } catch (e) {}
    }
    if (!arvore) return [];

    var grupos = [];
    (arvore.getRootNode().children || []).forEach(function (no) {
      var filhos = no.children || [];
      if (!filhos.length) return;
      var primeiro = filhos[0].data || {};
      var carimbo = String(primeiro.DAT_ENTRADA || '');
      var partes = carimbo.split(' ');
      var situacao = String(primeiro.DSC_SITUACAO || '').trim();

      grupos.push({
        protocolo: primeiro.COD_PROTOCOLO_LABORATORIO,
        data: partes[0] || '',
        hora: partes[1] || '',
        rotulo: String(no.title || '').replace(/\s+/g, ' ').trim(),
        quantidade: filhos.length,
        situacao: situacao,
        temLaudo: CFG.situacaoComLaudo.test(situacao)
      });
    });
    return grupos;
  }

  function baixarLaudoPorProtocolo(protocolo) {
    return new Promise(function (resolve, reject) {
      var jq = window.jQuery;
      if (!jq || !jq.ajax) {
        reject(new Error('jQuery.ajax não encontrado na página'));
        return;
      }
      jq.ajax({
        url: enderecoDoSistema(CFG.enderecoLaudoPDF),
        type: 'POST',
        data: { CodAtendimento: protocolo, Exame: -1 }
      }).done(function (resposta) {
        var r;
        try {
          r = (typeof resposta === 'string' && resposta.charAt(0) === '{') ? JSON.parse(resposta) : resposta;
        } catch (e) { r = resposta; }

        var b64 = r && (r.Resultado || r.resultado);
        if (b64 && String(b64).indexOf('JVBERi0') === 0) {
          resolve(b64);
          return;
        }
        reject(new Error((r && r.Mensagem) || 'Laudo não retornado pelo laboratório.'));
      }).fail(function (xhr) {
        reject(new Error('Erro de conexão com o sistema (HTTP ' + (xhr ? xhr.status : '') + ')'));
      });
    });
  }

  /* ===========================================================================
   * INTERFACE VISUAL (TEMA EXAMES_UI / GERIATRIA_UI / BLOCO_UI)
   * ======================================================================== */
  var CSS_PAINEL = [
    '#fmed-exames-backdrop {',
    '  position: fixed; inset: 0; z-index: 2147483640;',
    '  background: rgba(0, 0, 0, 0.55); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);',
    '  display: flex; align-items: center; justify-content: center; padding: 16px;',
    '  box-sizing: border-box;',
    '}',
    '#fmed-exames-modal {',
    '  --fmed-bg: #ffffff;',
    '  --fmed-text: #1a1916;',
    '  --fmed-text-muted: #6b6760;',
    '  --fmed-input-bg: rgba(120, 120, 120, 0.08);',
    '  --fmed-border: rgba(120, 120, 120, 0.18);',
    '  --fmed-ok: #0284c7;',
    '  --fmed-ok-bg: rgba(2, 132, 199, 0.08);',
    '  --fmed-ok-border: rgba(2, 132, 199, 0.35);',
    '  --fmed-danger: #ba120a;',
    '  --fmed-danger-bg: rgba(245, 49, 39, 0.06);',
    '  --fmed-danger-border: rgba(245, 49, 39, 0.3);',
    '  --fmed-primary: #0284c7;',
    '  --fmed-primary-hover: #0369a1;',
    '  position: relative; width: 80vw; max-height: 90vh;',
    '  display: flex; flex-direction: column; background: var(--fmed-bg); color: var(--fmed-text);',
    '  border: 1px solid var(--fmed-border); border-radius: 14px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);',
    '  padding: 20px 24px; gap: 12px; box-sizing: border-box; overflow: hidden;',
    '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;',
    '  font-size: 13px; line-height: 1.4;',
    '}',
    '@media (prefers-color-scheme: dark) {',
    '  #fmed-exames-modal {',
    '    --fmed-bg: #1c1917;',
    '    --fmed-text: #f5f5f4;',
    '    --fmed-text-muted: #78716c;',
    '    --fmed-input-bg: #2e2b29;',
    '    --fmed-border: rgba(255, 255, 255, 0.15);',
    '    --fmed-ok: #38bdf8;',
    '    --fmed-ok-bg: rgba(56, 189, 248, 0.14);',
    '    --fmed-ok-border: rgba(56, 189, 248, 0.4);',
    '    --fmed-danger: #f87171;',
    '    --fmed-danger-bg: rgba(248, 113, 113, 0.14);',
    '    --fmed-danger-border: rgba(248, 113, 113, 0.35);',
    '    --fmed-primary: #38bdf8;',
    '    --fmed-primary-hover: #0284c7;',
    '  }',
    '}',
    '#fmed-exames-modal * { box-sizing: border-box; text-transform: none !important; }',
    '#fmed-exames-modal .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }',
    '#fmed-exames-modal .badge { display: inline-block; background: #0284c7; color: #fff; font-weight: 700; font-size: 11px; padding: 2px 7px; border-radius: 4px; letter-spacing: 0.04em; margin-bottom: 4px; }',
    '#fmed-exames-modal .titulo-box { display: flex; flex-direction: column; min-width: 0; flex: 1; }',
    '#fmed-exames-modal .titulo { font-size: 15px; font-weight: 700; color: var(--fmed-text); margin: 0; }',
    '#fmed-exames-modal .subtitulo { font-size: 12px; color: var(--fmed-text-muted); margin-top: 2px; }',
    '#fmed-exames-modal .btn-fechar-topo { background: none; border: none; cursor: pointer; color: var(--fmed-text-muted); font-size: 18px; line-height: 1; padding: 4px 6px; border-radius: 6px; transition: all 0.15s ease; }',
    '#fmed-exames-modal .btn-fechar-topo:hover { background: var(--fmed-input-bg); color: var(--fmed-text); }',
    '#fmed-exames-modal .checklist-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 2px; }',
    '#fmed-exames-modal .checklist-toolbar span { font-size: 12px; font-weight: 600; color: var(--fmed-text); }',
    '#fmed-exames-modal .toolbar-actions { display: flex; align-items: center; gap: 10px; }',
    '#fmed-exames-modal .link-acao { background: none; border: none; cursor: pointer; color: var(--fmed-primary); font-size: 11.5px; font-weight: 600; padding: 0; text-decoration: underline; }',
    '#fmed-exames-modal .link-acao:hover { opacity: 0.8; }',
    '#fmed-exames-modal .checklist-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(126px, 1fr)); gap: 5px; max-height: 240px; overflow-y: auto; padding: 2px; }',
    '#fmed-exames-modal .check-card { display: flex; align-items: center; gap: 6px; padding: 7px 8px; border-radius: 8px; border: 1px solid var(--fmed-border); background: var(--fmed-input-bg); color: var(--fmed-text-muted); font-size: 11.5px; cursor: pointer; opacity: 0.6; transition: all 0.12s ease; user-select: none; }',
    '#fmed-exames-modal .check-card.selected { border-color: var(--fmed-ok-border); background: var(--fmed-ok-bg); color: var(--fmed-text); opacity: 1; }',
    '#fmed-exames-modal .check-card input[type="checkbox"] { margin: 0; flex-shrink: 0; cursor: pointer; accent-color: #0284c7; }',
    '#fmed-exames-modal .check-card .item-info { display: flex; justify-content: space-between; align-items: center; gap: 8px; width: 100%; min-width: 0; }',
    '#fmed-exames-modal .check-card .item-label { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '#fmed-exames-modal .check-card .item-valor { font-weight: 700; color: var(--fmed-text); flex-shrink: 0; }',
    '#fmed-exames-modal .check-card .item-valor.alterado { color: var(--fmed-danger); font-weight: 800; background: var(--fmed-danger-bg); border: 1px solid var(--fmed-danger-border); border-radius: 4px; padding: 1px 5px; }',
    '#fmed-exames-modal .check-card.card-alterado { border-left: 3px solid var(--fmed-danger); }',
    '#fmed-exames-modal .check-card.selected.card-alterado { border-left-color: var(--fmed-danger); }',
    '#fmed-exames-modal .output-section { display: flex; flex-direction: column; gap: 6px; }',
    '#fmed-exames-modal textarea { width: 100%; height: 112px; border: 1px solid var(--fmed-border); border-radius: 8px; padding: 8px 10px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12.5px; line-height: 18px; color: var(--fmed-text); background: var(--fmed-input-bg); resize: vertical; }',
    '#fmed-exames-modal textarea:focus { outline: none; border-color: #0284c7; background: var(--fmed-bg); box-shadow: 0 0 0 2px var(--fmed-ok-bg); }',
    '#fmed-exames-modal .acoes { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 4px; }',
    '#fmed-exames-modal button.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 12.5px; font-weight: 600; padding: 8px 16px; border-radius: 8px; cursor: pointer; border: 1px solid transparent; transition: all 0.15s ease; font-family: inherit; }',
    '#fmed-exames-modal .btn-primary { background: #0284c7; color: #fff; border-color: #0284c7; }',
    '#fmed-exames-modal .btn-primary:hover { background: #0369a1; border-color: #0369a1; }',
    '#fmed-exames-modal .btn-prevent { background: var(--fmed-ok-bg); color: #0284c7; border: 1px solid var(--fmed-ok-border); font-weight: 600; }',
    '#fmed-exames-modal .btn-prevent:hover { background: rgba(2, 132, 199, 0.16); border-color: #0284c7; }',
    '#fmed-exames-modal .btn-copiado { background: var(--fmed-ok-bg) !important; color: var(--fmed-ok) !important; border-color: var(--fmed-ok-border) !important; }',
    '#fmed-exames-modal .btn-secundario { background: var(--fmed-input-bg); color: var(--fmed-text); border-color: var(--fmed-border); }',
    '#fmed-exames-modal .btn-secundario:hover { background: rgba(120, 120, 120, 0.14); }',
    '#fmed-exames-modal .btn-data { background: var(--fmed-ok-bg); color: var(--fmed-primary); border: 1px solid var(--fmed-ok-border); font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 8px; cursor: pointer; transition: all 0.12s ease; }',
    '#fmed-exames-modal .btn-data:hover { filter: brightness(0.95); }',
    '#fmed-exames-modal .datas-lista { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; max-height: 120px; overflow-y: auto; }',
    '#fmed-exames-modal .prevent-view { display: flex; flex-direction: column; gap: 12px; }',
    '#fmed-exames-modal .prevent-corpo { display: grid; grid-template-columns: 1fr; gap: 14px; max-height: calc(88vh - 145px); overflow-y: auto; padding-right: 4px; }',
    '@media (min-width: 660px) {',
    '  #fmed-exames-modal .prevent-corpo { grid-template-columns: 1.05fr 1fr; align-items: start; }',
    '}',
    '#fmed-exames-modal .prevent-painel-dados { display: flex; flex-direction: column; gap: 10px; }',
    '#fmed-exames-modal .prevent-mini-titulo { font-size: 10px; font-weight: 700; text-transform: uppercase !important; letter-spacing: 0.06em; color: var(--fmed-text-muted); margin-bottom: 4px; border-bottom: 1px solid var(--fmed-border); padding-bottom: 3px; }',
    '#fmed-exames-modal .prevent-chips-box { display: flex; flex-wrap: wrap; gap: 5px; }',
    '#fmed-exames-modal .prevent-chip { display: inline-flex; align-items: center; gap: 4px; background: var(--fmed-input-bg); border: 1px solid var(--fmed-border); border-radius: 6px; padding: 3px 7px; font-size: 11px; color: var(--fmed-text); }',
    '#fmed-exames-modal .prevent-chip-ok { border-color: var(--fmed-ok-border); background: var(--fmed-ok-bg); font-weight: 600; }',
    '#fmed-exames-modal .prevent-field-group { display: flex; flex-direction: column; gap: 4px; margin-top: 4px; }',
    '#fmed-exames-modal .prevent-field-group label { font-size: 11.5px; font-weight: 600; color: var(--fmed-text); }',
    '#fmed-exames-modal .prevent-input { width: 100%; border: 1px solid var(--fmed-border); border-radius: 6px; padding: 6px 10px; font-size: 13px; font-weight: 600; color: var(--fmed-text); background: var(--fmed-input-bg); }',
    '#fmed-exames-modal .prevent-input:focus { outline: none; border-color: #0284c7; background: var(--fmed-bg); box-shadow: 0 0 0 2px var(--fmed-ok-bg); }',
    '#fmed-exames-modal .prevent-toggles-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px; }',
    '#fmed-exames-modal .prevent-toggle-item { display: flex; flex-direction: column; gap: 4px; }',
    '#fmed-exames-modal .prevent-toggle-label { font-size: 11px; font-weight: 600; color: var(--fmed-text-muted); }',
    '#fmed-exames-modal .prevent-switch-group { display: inline-flex; background: var(--fmed-input-bg); border: 1px solid var(--fmed-border); border-radius: 6px; padding: 2px; gap: 2px; }',
    '#fmed-exames-modal .switch-opt { flex: 1; background: transparent; border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; font-weight: 600; color: var(--fmed-text-muted); cursor: pointer; transition: all 0.12s ease; text-align: center; }',
    '#fmed-exames-modal .switch-opt.active { background: #0284c7; color: #fff; }',
    '#fmed-exames-modal .prevent-result-card { border-radius: 12px; padding: 16px; box-sizing: border-box; transition: background 0.3s ease, border 0.3s ease; }',
    '#fmed-exames-modal .prevent-result-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 4px; }',
    '#fmed-exames-modal .prevent-badge-risco { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase !important; padding: 4px 9px; border-radius: 6px; letter-spacing: 0.04em; }',
    '#fmed-exames-modal .prevent-btn-icon { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 6px; border: 1px solid var(--fmed-border); background: var(--fmed-input-bg); color: var(--fmed-text-muted); cursor: pointer; transition: all 0.15s ease; padding: 0; }',
    '#fmed-exames-modal .prevent-btn-icon:hover { color: var(--fmed-text); background: var(--fmed-border); }',
    '#fmed-exames-modal .prevent-btn-icon.copiado { background: var(--fmed-ok-bg); color: var(--fmed-ok); border-color: var(--fmed-ok-border); }',
    '#fmed-exames-modal .prevent-label { font-size: 11px; text-transform: uppercase !important; font-weight: 700; color: var(--fmed-text-muted); letter-spacing: 0.04em; margin-top: 8px; }',
    '#fmed-exames-modal .prevent-score-val { font-size: 28px; font-weight: 800; color: var(--fmed-text); line-height: 1.1; margin: 2px 0 8px 0; }',
    '#fmed-exames-modal .prevent-conduta-box { margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(120, 120, 120, 0.2); }',
    '#fmed-exames-modal .prevent-ldl-box { background: rgba(120, 120, 120, 0.08); padding: 10px 12px; border-radius: 8px; border-left: 4px solid var(--fmed-text); margin-bottom: 10px; }',
    '#fmed-exames-modal .prevent-conduta-title { font-size: 10.5px; text-transform: uppercase !important; font-weight: 700; color: var(--fmed-text-muted); letter-spacing: 0.05em; margin-bottom: 3px; }',
    '#fmed-exames-modal .prevent-conduta-text { font-size: 12px; color: var(--fmed-text); line-height: 1.38; margin-bottom: 8px; }',
    '#fmed-exames-modal .prevent-alvos-sec { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }',
    '#fmed-exames-modal .prevent-alvo-badge { background: var(--fmed-input-bg); border: 1px solid var(--fmed-border); padding: 3px 8px; border-radius: 5px; font-size: 11px; font-weight: 600; color: var(--fmed-text); }',
    '#fmed-exames-modal .prevent-crit-item { font-size: 12px; color: var(--fmed-text); line-height: 1.35; margin-bottom: 3px; }',
    '#fmed-exames-modal .prevent-empty { border: 1px dashed var(--fmed-border); border-radius: 12px; padding: 30px 16px; text-align: center; color: var(--fmed-text-muted); font-size: 12.5px; line-height: 1.5; background: var(--fmed-input-bg); }',
    '#fmed-exames-viewer-fundo { position: fixed; inset: 0; z-index: 2147483641; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); }',
    '#fmed-exames-viewer {',
    '  position: fixed; z-index: 2147483642; top: 32px; left: 50%; transform: translateX(-50%);',
    '  width: min(940px, 95vw); height: calc(100vh - 64px);',
    '  display: flex; flex-direction: column; background: var(--fmed-bg, #ffffff); color: var(--fmed-text, #1a1916); border: 1px solid var(--fmed-border, rgba(120,120,120,0.25));',
    '  border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.45); overflow: hidden;',
    '}',
    '#fmed-exames-viewer .barra { display: flex; align-items: center; justify-content: space-between; background: #0284c7; color: #fff; padding: 8px 14px; font-weight: 700; font-size: 13px; }',
    '#fmed-exames-viewer iframe { flex: 1; border: 0; background: #555; width: 100%; height: 100%; }'
  ].join('\n');

  var backdropEl = null;
  var vigiaTimer = null;
  var pdfViewerUrl = null;

  function injetarEstilos() {
    if (document.getElementById('fmed-exames-styles')) return;
    var st = document.createElement('style');
    st.id = 'fmed-exames-styles';
    st.textContent = CSS_PAINEL;
    document.head.appendChild(st);
  }

  function fecharVisualizadorPdf() {
    var v = document.getElementById('fmed-exames-viewer');
    var f = document.getElementById('fmed-exames-viewer-fundo');
    if (v && v.parentNode) v.parentNode.removeChild(v);
    if (f && f.parentNode) f.parentNode.removeChild(f);
    if (pdfViewerUrl) {
      try { URL.revokeObjectURL(pdfViewerUrl); } catch (e) {}
      pdfViewerUrl = null;
    }
  }

  function abrirVisualizadorPdf(base64, titulo) {
    try {
      fecharVisualizadorPdf();
      injetarEstilos();

      var bin = atob(base64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      pdfViewerUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));

      var fundo = document.createElement('div');
      fundo.id = 'fmed-exames-viewer-fundo';
      fundo.addEventListener('click', fecharVisualizadorPdf);
      document.body.appendChild(fundo);

      var modal = document.createElement('div');
      modal.id = 'fmed-exames-viewer';
      modal.innerHTML = [
        '<div class="barra">',
        '  <span>' + (titulo || 'Visualizador de Laudo') + '</span>',
        '  <button type="button" id="fmed-v-fechar" style="background:transparent;border:1px solid #fff;color:#fff;padding:3px 10px;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;">Fechar</button>',
        '</div>',
        '<iframe title="Laudo"></iframe>'
      ].join('');
      document.body.appendChild(modal);

      modal.querySelector('iframe').src = pdfViewerUrl;
      modal.querySelector('#fmed-v-fechar').addEventListener('click', fecharVisualizadorPdf);
    } catch (e) {
      console.error('Falha ao abrir visualizador de PDF:', e);
    }
  }

  function fecharPainel() {
    pararVigia();
    fecharVisualizadorPdf();
    if (backdropEl && backdropEl.parentNode) {
      backdropEl.parentNode.removeChild(backdropEl);
    }
    backdropEl = null;
    // Não salvar nada no fechamento
    try { sessionStorage.removeItem(CHAVE_SESSAO); } catch (e) {}
  }

  function garantirBackdrop() {
    injetarEstilos();
    if (!backdropEl || !backdropEl.parentNode) {
      backdropEl = document.createElement('div');
      backdropEl.id = 'fmed-exames-backdrop';
      document.documentElement.appendChild(backdropEl);
    }
    return backdropEl;
  }

  function copiarParaClipboard(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(texto).then(function () { return true; }).catch(function () {
        return copiarFallback(texto);
      });
    }
    return Promise.resolve(copiarFallback(texto));
  }

  function copiarFallback(texto) {
    try {
      var ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  function pararVigia() {
    if (vigiaTimer) {
      clearInterval(vigiaTimer);
      vigiaTimer = null;
    }
  }

  /* ===========================================================================
   * BANCO DE VALORES DE REFERÊNCIA E DETECÇÃO DE VALORES FORA DA FAIXA
   * ======================================================================== */
  var VALORES_REFERENCIA = {
    // Hemograma
    hb: function (s) { return s === 'F' ? { min: 12.0, max: 16.0 } : s === 'M' ? { min: 13.0, max: 17.5 } : { min: 12.0, max: 17.5 }; },
    ht: function (s) { return s === 'F' ? { min: 36.0, max: 48.0 } : s === 'M' ? { min: 39.0, max: 53.0 } : { min: 36.0, max: 53.0 }; },
    vcm: { min: 80.0, max: 100.0 },
    hcm: { min: 27.0, max: 33.0 },
    leuco: { min: 4000, max: 11000 },
    neutro: { min: 1500, max: 7500 },
    plaq: { min: 150000, max: 450000 },

    // Perfil lipídico (Diretrizes SBC / AHA)
    ct: { max: 190 },
    hdl: function (s) { return s === 'F' ? { min: 50 } : { min: 40 }; },
    trig: { max: 150 },
    ldl: { max: 130 },

    // Glicemia (SBD / ADA)
    glic: { min: 70, max: 99 },
    hba1c: { max: 5.6 }, // 5.7+ pré-diabetes / diabetes

    // Função renal e metabólica
    ur: { min: 15, max: 45 },
    cr: function (s) { return s === 'F' ? { min: 0.50, max: 1.10 } : s === 'M' ? { min: 0.70, max: 1.30 } : { min: 0.50, max: 1.30 }; },
    tfg: { min: 60 }, // < 60 mL/min alterada (KDIGO)
    rac: { max: 29.9 }, // >= 30 mg/g microalbuminúria
    acur: function (s) { return s === 'F' ? { min: 2.6, max: 6.0 } : s === 'M' ? { min: 3.5, max: 7.2 } : { min: 2.6, max: 7.2 }; },

    // Tireoide
    tsh: { min: 0.40, max: 4.50 },
    t4l: { min: 0.80, max: 1.80 },

    // Fígado e enzimas
    ast: function (s) { return s === 'F' ? { max: 35 } : { max: 40 }; },
    alt: function (s) { return s === 'F' ? { max: 35 } : { max: 40 }; },
    fa: { min: 35, max: 105 },
    ggt: function (s) { return s === 'F' ? { max: 38 } : { max: 60 }; },
    bt: { max: 1.20 },
    bd: { max: 0.40 },
    bi: { max: 0.80 },
    alb: { min: 3.5, max: 5.2 },
    amil: { min: 28, max: 100 },
    lip: { max: 60 },

    // Coagulação
    tp: { min: 10.0, max: 14.0 },
    ttpa: { min: 24.0, max: 38.0 },
    inr: { min: 0.8, max: 1.2 },

    // Inflamação
    pcr: { max: 0.5 },

    // Eletrólitos
    na: { min: 135, max: 145 },
    k: { min: 3.5, max: 5.1 },

    // Vitaminas
    vitd: { min: 20 },
    vitb12: { min: 200, max: 900 },

    // Perfil do ferro
    fe: { min: 50, max: 170 },
    ferrit: function (s) { return s === 'F' ? { min: 15, max: 200 } : s === 'M' ? { min: 30, max: 400 } : { min: 15, max: 400 }; },
    transferr: { min: 200, max: 360 },
    sattransf: { min: 20, max: 50 },

    // Extras frequentes
    rdw: { min: 11.5, max: 14.5 },
    chcm: { min: 31.0, max: 36.0 },
    vpm: { min: 7.0, max: 12.0 },
    calcio: { min: 8.5, max: 10.5 },
    magnesio: { min: 1.7, max: 2.5 },
    fosforo: { min: 2.5, max: 4.5 },
    psa: { max: 4.0 },
    vhs: function (s) { return s === 'F' ? { max: 20 } : { max: 15 }; }
  };

  function verificarForaDaReferencia(idOuLabel, valorStr, sexo, idade) {
    if (!valorStr) return false;
    var str = String(valorStr).trim();
    if (!str) return false;

    if (str.indexOf('*AVALIAR*') >= 0 || /reagente|positivo/i.test(str)) {
      return true;
    }

    var numLimpo = str.replace(/\s/g, '');
    var m = numLimpo.match(/-?\d+(?:[.,]\d+)?/);
    if (!m) return false;

    var valNum = parseFloat(m[0].replace(',', '.'));
    if (isNaN(valNum)) return false;

    var rawKey = String(idOuLabel || '').toLowerCase();
    var key = rawKey.normalize ? rawKey.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : rawKey;
    key = key.replace(/[^a-z0-9]/g, '');

    var ref = VALORES_REFERENCIA[key];
    if (!ref) return false;

    var faixa = typeof ref === 'function' ? ref(sexo, idade) : ref;
    if (!faixa) return false;

    if (faixa.min !== undefined && valNum < faixa.min) return true;
    if (faixa.max !== undefined && valNum > faixa.max) return true;
    return false;
  }

  /* ===========================================================================
   * MONTAGEM DO CHECKLIST INTERATIVO (ESPELHO DO EXAMES_UI)
   * ======================================================================== */
  var ITENS_DESMARCADOS_PADRAO = [
    'CHCM', 'RDW', 'Hemácias', 'Bastonetes', 'Segmentados',
    'Eosinófilos', 'Linfócitos', 'Monócitos', 'Basófilos', 'VPM'
  ];

  function normalizarRotuloItem(texto) {
    var s = String(texto || '').toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return s.replace(/[^a-z0-9]/g, '');
  }

  function deveDesmarcarPadrao(label) {
    var alvo = normalizarRotuloItem(label);
    for (var i = 0; i < ITENS_DESMARCADOS_PADRAO.length; i++) {
      if (alvo === normalizarRotuloItem(ITENS_DESMARCADOS_PADRAO[i])) return true;
    }
    return false;
  }

  function criarItemChecklist(id, label, valor, isCalculado, fieldKey, alterado) {
    return {
      id: id,
      label: label,
      valor: valor,
      isCalculado: !!isCalculado,
      fieldKey: fieldKey,
      selected: !deveDesmarcarPadrao(label),
      alterado: !!alterado
    };
  }

  function gerarTextoDeItens(itens, dataLaudo, metadata) {
    var mapa = {};
    var extras = [];

    itens.forEach(function (item) {
      if (!item.selected) return;
      if (item.fieldKey !== null) {
        mapa[item.fieldKey] = item.valor;
      } else {
        extras.push({ label: item.label, valor: item.valor });
      }
    });

    // Se CT, HDL ou Trig forem desmarcados, recalcular ou remover LDL
    if (mapa.ldl && (!mapa.ct || !mapa.hdl || !mapa.trig)) {
      var recalculadoLdl = calcLdl(mapa);
      if (!recalculadoLdl) delete mapa.ldl;
      else mapa.ldl = recalculadoLdl;
    }

    // Se Cr for desmarcada, remover TFG
    if (mapa.tfg && (!mapa.cr || !metadata.idade || !metadata.sexo)) {
      delete mapa.tfg;
    }

    var partes = [];
    CAMPOS_FIXOS.forEach(function (campo) {
      var val = mapa[campo.id];
      if (val && String(val).trim()) {
        partes.push(campo.label + ' ' + String(val).trim());
      }
    });

    extras.forEach(function (extra) {
      if (extra.valor && String(extra.valor).trim()) {
        partes.push(extra.label + ' ' + String(extra.valor).trim());
      }
    });

    if (!partes.length) return '';
    var dataBr = formatarDataBR(dataLaudo || '');
    return (dataBr ? '(' + dataBr + '): ' : '') + partes.join(' | ');
  }

  /* ===========================================================================
   * PREVENT — CÁLCULO E CARD DE RESULTADO (ESPELHO DO ESCORES_UI)
   * ======================================================================== */
  var PREVENT_RISCOS = {
    Extremo: { bg: 'rgba(180, 0, 60, 0.14)', t: '#b4003c', border: 'rgba(180, 0, 60, 0.5)' },
    'Muito Alto': { bg: 'rgba(245, 49, 39, 0.12)', t: '#e62219', border: 'rgba(245, 49, 39, 0.45)' },
    Alto: { bg: 'rgba(242, 100, 0, 0.1)', t: '#ff5d00', border: 'rgba(242, 100, 0, 0.45)' },
    'Intermediário': { bg: 'rgba(242, 143, 0, 0.09)', t: '#ff9900', border: 'rgba(242, 143, 0, 0.45)' },
    Baixo: { bg: 'rgba(0, 184, 73, 0.09)', t: '#00cc52', border: 'rgba(0, 184, 73, 0.45)' }
  };

  var PREVENT_SVG_COPIAR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
  var PREVENT_SVG_OK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

  function prevNum(v) {
    if (v === null || v === undefined) return NaN;
    var n = parseFloat(String(v).replace(',', '.'));
    return isNaN(n) ? NaN : n;
  }

  function prevEscapar(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function prevLegivelSobre(hex) {
    var h = String(hex || '').replace('#', '');
    var r = parseInt(h.slice(0, 2), 16) / 255;
    var g = parseInt(h.slice(2, 4), 16) / 255;
    var b = parseInt(h.slice(4, 6), 16) / 255;
    if (isNaN(r) || isNaN(g) || isNaN(b)) return '#ffffff';
    var lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 0.42 ? '#161513' : '#ffffff';
  }

  // Algoritmo PREVENT idêntico ao de escores_ui (nEventos = 0, sem checklist).
  function calcularPrevent(d) {
    var i = parseInt(d.idade, 10);
    var p = parseInt(d.pas, 10);
    var ct = parseInt(d.ct, 10);
    var h = parseInt(d.hdl, 10);
    var valorTfg = parseInt(d.tfg, 10);
    var valorHba1c = prevNum(d.hba1c);
    var valorRac = prevNum(d.rac);
    var valorLdl = prevNum(d.ldl);
    var valorLpa = prevNum(d.lpa);

    var examesOk = i && d.sexo && p && ct && h;

    var temDiabetes = !!d.diabetes || (!isNaN(valorHba1c) && valorHba1c >= 6.5);
    var limiarDm2 = d.sexo === 'F' ? 56 : 50;
    var dm2AcimaLimiar = temDiabetes && !isNaN(i) && i >= limiarDm2;
    var earAuto =
      (d.antiHipertensivos ? 1 : 0) +
      (d.fumante ? 1 : 0) +
      (d.cac === '10-100' || d.cac === '100-300' ? 1 : 0);
    var nEar = earAuto;
    var emarAuto =
      (nEar >= 3 ? 1 : 0) +
      (ct > 310 || valorLdl >= 190 ? 1 : 0);
    var emar = emarAuto > 0;
    var nEventos = 0;
    var condAuto =
      (!isNaN(i) && i >= 65 ? 1 : 0) +
      (temDiabetes ? 1 : 0) +
      (d.antiHipertensivos ? 1 : 0) +
      (!isNaN(valorTfg) && valorTfg < 60 ? 1 : 0) +
      (d.fumante ? 1 : 0);
    var nCondicoes = condAuto;
    var doencaAtero = !!d.doencaAtero;
    var subclinica = !!d.subclinica;
    var agravante = !isNaN(valorLpa) && valorLpa > 50;
    var ldlConhecido = d.ldl !== '' && d.ldl !== null && d.ldl !== undefined && !isNaN(valorLdl) && valorLdl > 0;
    var ldlMuitoAlto = ldlConhecido && valorLdl >= 190;
    var ldlIntermediario = ldlConhecido && valorLdl >= 160 && valorLdl < 190;
    var lpaAlto = !isNaN(valorLpa) && valorLpa > 180;

    var temCriterioDefinidor =
      nEventos >= 2 ||
      (nEventos === 1 && nCondicoes >= 2) ||
      doencaAtero ||
      d.cac === '>300' ||
      (temDiabetes && (nEar >= 3 || emar)) ||
      subclinica ||
      d.cac === '100-300' ||
      ldlMuitoAlto ||
      lpaAlto ||
      (temDiabetes && dm2AcimaLimiar) ||
      (temDiabetes && (nEar === 1 || nEar === 2) && !emar) ||
      (temDiabetes && !dm2AcimaLimiar && nEar === 0 && !emar);

    if (!examesOk && !temCriterioDefinidor) return null;

    var riscoCalculado = 0;

    if (examesOk) {
      var X_id = (i - 55) / 10;
      var X_pas_min = (Math.min(p, 110) - 110) / 20;
      var X_pas_max = (Math.max(p, 110) - 130) / 20;
      var X_ct = ct * 0.02586 - 3.5;
      var X_hdl = (h * 0.02586 - 1.3) / 0.3;
      var X_tfg_min = (Math.min(!isNaN(valorTfg) ? valorTfg : 90, 60) - 60) / -15;
      var X_tfg_max = (Math.max(!isNaN(valorTfg) ? valorTfg : 90, 60) - 90) / -15;

      var temHbA1c = d.hba1c !== '' && d.hba1c !== null && d.hba1c !== undefined && !isNaN(valorHba1c);
      var temRac = d.rac !== '' && d.rac !== null && d.rac !== undefined && !isNaN(valorRac) && valorRac > 0;
      var temDiab = d.diabetes ? 1 : 0;
      var temFum = d.fumante ? 1 : 0;
      var temAntiHip = d.antiHipertensivos ? 1 : 0;
      var temEstatina = d.usoEstatinas ? 1 : 0;

      var linearPredictor = 0;

      if (d.sexo === 'F') {
        if (!temHbA1c && !temRac) {
          linearPredictor =
            -3.307728 +
            0.7939329 * X_id +
            0.0305239 * X_ct -
            0.1606857 * X_hdl -
            0.2394003 * X_pas_min +
            0.3600781 * X_pas_max +
            0.8667604 * temDiab +
            0.5360739 * temFum +
            0.6045917 * X_tfg_min +
            0.0433769 * X_tfg_max +
            0.3151672 * temAntiHip -
            0.1477655 * temEstatina -
            0.0663612 * temAntiHip * X_pas_max +
            0.1197879 * temEstatina * X_ct -
            0.0819715 * X_id * X_ct +
            0.0306769 * X_id * X_hdl -
            0.0946348 * X_id * X_pas_max -
            0.27057 * temDiab * X_id -
            0.078715 * temFum * X_id -
            0.1637806 * X_id * X_tfg_min;
        } else if (temHbA1c && !temRac) {
          var f_hba1c = temDiab === 1 ? 0.1338348 * (valorHba1c - 5.3) : 0.1622409 * (valorHba1c - 5.3);
          linearPredictor =
            -3.306162 +
            0.7858178 * X_id +
            0.0194438 * X_ct -
            0.1521964 * X_hdl -
            0.2296681 * X_pas_min +
            0.3465777 * X_pas_max +
            0.5366241 * temDiab +
            0.5411682 * temFum +
            0.5931898 * X_tfg_min +
            0.0472458 * X_tfg_max +
            0.3158567 * temAntiHip -
            0.1535174 * temEstatina -
            0.0687752 * temAntiHip * X_pas_max +
            0.1054746 * temEstatina * X_ct -
            0.0761119 * X_id * X_ct +
            0.0307469 * X_id * X_hdl -
            0.0905966 * X_id * X_pas_max -
            0.2241857 * temDiab * X_id -
            0.080186 * temFum * X_id -
            0.1667286 * X_id * X_tfg_min +
            f_hba1c;
        } else if (!temHbA1c && temRac) {
          linearPredictor =
            -3.738341 +
            0.7969249 * X_id +
            0.0256635 * X_ct -
            0.1588107 * X_hdl -
            0.2255701 * X_pas_min +
            0.3396649 * X_pas_max +
            0.8047515 * temDiab +
            0.5285338 * temFum +
            0.4803511 * X_tfg_min +
            0.0434472 * X_tfg_max +
            0.2985207 * temAntiHip -
            0.1497787 * temEstatina -
            0.0742889 * temAntiHip * X_pas_max +
            0.106756 * temEstatina * X_ct -
            0.0778126 * X_id * X_ct +
            0.0306768 * X_id * X_hdl -
            0.0907168 * X_id * X_pas_max -
            0.2705122 * temDiab * X_id -
            0.0830564 * temFum * X_id -
            0.1389249 * X_id * X_tfg_min +
            0.1793037 * Math.log(valorRac);
        } else {
          var f_hba1c_full = temDiab === 1 ? 0.1298513 * (valorHba1c - 5.3) : 0.1412555 * (valorHba1c - 5.3);
          var sdiMissingAdjustmentF = 0.1804508;
          var uacrMissingAdjustmentF = d.rac === '' || d.rac === null || d.rac === undefined ? 0.0198413 : 0;
          var hba1cMissingAdjustmentF = d.hba1c === '' || d.hba1c === null || d.hba1c === undefined ? 0.0031658 : 0;

          linearPredictor =
            -3.860385 +
            0.7716794 * X_id +
            0.0062109 * X_ct -
            0.1547756 * X_hdl -
            0.1933123 * X_pas_min +
            0.3071217 * X_pas_max +
            0.496753 * temDiab +
            0.466605 * temFum +
            0.4780697 * X_tfg_min +
            0.0529077 * X_tfg_max +
            0.3034892 * temAntiHip -
            0.1556524 * temEstatina -
            0.0667026 * temAntiHip * X_pas_max +
            0.1061825 * temEstatina * X_ct -
            0.0742271 * X_id * X_ct +
            0.0288245 * X_id * X_hdl -
            0.0875188 * X_id * X_pas_max -
            0.2267102 * temDiab * X_id -
            0.0676125 * temFum * X_id -
            0.1493231 * X_id * X_tfg_min +
            f_hba1c_full +
            sdiMissingAdjustmentF +
            uacrMissingAdjustmentF -
            hba1cMissingAdjustmentF +
            0.1645922 * Math.log(valorRac);
        }
      } else {
        if (!temHbA1c && !temRac) {
          linearPredictor =
            -3.031168 +
            0.7688528 * X_id +
            0.0736174 * X_ct -
            0.0954431 * X_hdl -
            0.4347345 * X_pas_min +
            0.3362658 * X_pas_max +
            0.7692857 * temDiab +
            0.4386871 * temFum +
            0.5378979 * X_tfg_min +
            0.0164827 * X_tfg_max +
            0.288879 * temAntiHip -
            0.1337349 * temEstatina -
            0.0475924 * temAntiHip * X_pas_max +
            0.150273 * temEstatina * X_ct -
            0.0517874 * X_id * X_ct +
            0.0191169 * X_id * X_hdl -
            0.1049477 * X_id * X_pas_max -
            0.2251948 * temDiab * X_id -
            0.0895067 * temFum * X_id -
            0.1543702 * X_id * X_tfg_min;
        } else if (temHbA1c && !temRac) {
          var m_hba1c = temDiab === 1 ? 0.13159 * (valorHba1c - 5.3) : 0.1295185 * (valorHba1c - 5.3);
          linearPredictor =
            -3.040901 +
            0.7699177 * X_id +
            0.0605093 * X_ct -
            0.0888525 * X_hdl -
            0.417713 * X_pas_min +
            0.3288657 * X_pas_max +
            0.4759471 * temDiab +
            0.4385663 * temFum +
            0.5334616 * X_tfg_min +
            0.0206431 * X_tfg_max +
            0.2917524 * temAntiHip -
            0.1383313 * temEstatina -
            0.0482622 * temAntiHip * X_pas_max +
            0.1393796 * temEstatina * X_ct -
            0.0463501 * X_id * X_ct +
            0.0205926 * X_id * X_hdl -
            0.1037717 * X_id * X_pas_max -
            0.1737697 * temDiab * X_id -
            0.0915839 * temFum * X_id -
            0.1637039 * X_id * X_tfg_min +
            m_hba1c;
        } else if (!temHbA1c && temRac) {
          linearPredictor =
            -3.510705 +
            0.7768655 * X_id +
            0.0659949 * X_ct -
            0.0951111 * X_hdl -
            0.420667 * X_pas_min +
            0.3120151 * X_pas_max +
            0.698521 * temDiab +
            0.4314669 * temFum +
            0.3841364 * X_tfg_min +
            0.009384 * X_tfg_max +
            0.2676494 * temAntiHip -
            0.1390966 * temEstatina -
            0.0579315 * temAntiHip * X_pas_max +
            0.1383719 * temEstatina * X_ct -
            0.0488332 * X_id * X_ct +
            0.0200406 * X_id * X_hdl -
            0.102454 * X_id * X_pas_max -
            0.2236355 * temDiab * X_id -
            0.089485 * temFum * X_id -
            0.1321848 * X_id * X_tfg_min +
            0.1887974 * Math.log(valorRac);
        } else {
          var m_hba1c_full = temDiab === 1 ? 0.1165698 * (valorHba1c - 5.3) : 0.1048297 * (valorHba1c - 5.3);
          var sdiMissingAdjustmentM = 0.144759;
          var uacrMissingAdjustmentM = d.rac === '' || d.rac === null || d.rac === undefined ? 0.1095674 : 0;
          var hba1cMissingAdjustmentM = d.hba1c === '' || d.hba1c === null || d.hba1c === undefined ? 0.0230072 : 0;

          linearPredictor =
            -3.631387 +
            0.7847578 * X_id +
            0.0534485 * X_ct -
            0.0911282 * X_hdl -
            0.4921973 * X_pas_min +
            0.2972415 * X_pas_max +
            0.4527054 * temDiab +
            0.3726641 * temFum +
            0.3886854 * X_tfg_min +
            0.0081661 * X_tfg_max +
            0.2508052 * temAntiHip -
            0.1538484 * temEstatina -
            0.0474695 * temAntiHip * X_pas_max +
            0.1415382 * temEstatina * X_ct -
            0.0436455 * X_id * X_ct +
            0.0199549 * X_id * X_hdl -
            0.1022686 * X_id * X_pas_max -
            0.1762507 * temDiab * X_id -
            0.0715873 * temFum * X_id -
            0.1428668 * X_id * X_tfg_min +
            m_hba1c_full +
            sdiMissingAdjustmentM +
            uacrMissingAdjustmentM -
            hba1cMissingAdjustmentM +
            0.1772853 * Math.log(valorRac);
        }
      }

      riscoCalculado = (Math.exp(linearPredictor) / (1 + Math.exp(linearPredictor))) * 100;
    }

    var idadeVascular = '';
    if (examesOk && nEventos === 0) {
      if (d.sexo === 'F') {
        idadeVascular = Math.round(45.03746 + 11.27498 * Math.log((riscoCalculado / 100) * 100)).toString();
      } else {
        idadeVascular = Math.round(41.55092 + 11.7171 * Math.log((riscoCalculado / 100) * 100)).toString();
      }
    }

    var criterios = [];
    var categoriaRisco = 'Baixo';

    if (nEventos >= 2) {
      categoriaRisco = 'Extremo';
      criterios.push('2 ou mais eventos cardiovasculares ateroscleróticos maiores');
    } else if (nEventos === 1 && nCondicoes >= 2) {
      categoriaRisco = 'Extremo';
      criterios.push('1 evento cardiovascular aterosclerótico maior + 2 ou mais condições de alto risco');
    } else if (doencaAtero) {
      categoriaRisco = 'Muito Alto';
      criterios.push('Carga significativa de doença aterosclerótica ou obstrução ≥ 50% em qualquer território arterial');
    } else if (d.cac === '>300') {
      categoriaRisco = 'Muito Alto';
      criterios.push('Escore de cálcio coronariano (CAC) > 300 UA');
    } else if (temDiabetes && (nEar >= 3 || emar)) {
      categoriaRisco = 'Muito Alto';
      criterios.push('DM2 com 3 ou mais estratificadores de alto risco (EAR) ou com EMAR');
    } else if (examesOk && riscoCalculado >= 20) {
      categoriaRisco = 'Alto';
      criterios.push('Risco estimado ≥ 20% em 10 anos');
    } else if (examesOk && riscoCalculado >= 5 && agravante) {
      categoriaRisco = 'Alto';
      criterios.push('Risco estimado entre 5 e <20% com fator agravante de risco');
    } else if (subclinica || d.cac === '100-300') {
      categoriaRisco = 'Alto';
      criterios.push('Aterosclerose subclínica (placas, CAC entre 100-300 UA ou percentil > 75, aneurisma de aorta)');
    } else if (ldlMuitoAlto) {
      categoriaRisco = 'Alto';
      criterios.push('LDL-c ≥ 190 mg/dL');
    } else if (lpaAlto) {
      categoriaRisco = 'Alto';
      criterios.push('Lp(a) > 180 mg/dL (> 390 nmol/L)');
    } else if (temDiabetes && dm2AcimaLimiar) {
      categoriaRisco = 'Alto';
      criterios.push('DM2 com idade ≥ ' + limiarDm2 + ' anos');
    } else if (temDiabetes && (nEar === 1 || nEar === 2) && !emar) {
      categoriaRisco = 'Alto';
      criterios.push('DM2 com 1 a 2 estratificadores de alto risco (EAR), sem EMAR');
    } else if (examesOk && riscoCalculado < 5 && (agravante || ldlIntermediario)) {
      categoriaRisco = 'Intermediário';
      criterios.push('Risco estimado < 5% com fator agravante de risco ou LDL-c 160-189 mg/dL');
    } else if (examesOk && riscoCalculado >= 5 && !agravante) {
      categoriaRisco = 'Intermediário';
      criterios.push('Risco estimado entre 5 e <20% sem fator agravante de risco');
    } else if (temDiabetes && !dm2AcimaLimiar && nEar === 0 && !emar) {
      categoriaRisco = 'Intermediário';
      criterios.push('DM2 com idade < ' + limiarDm2 + ' anos, sem EAR ou EMAR');
    } else if (examesOk) {
      categoriaRisco = 'Baixo';
      criterios.push('Risco estimado < 5% em 10 anos, sem fator agravante, LDL-c < 160 mg/dL e ausência de DM2');
    } else {
      categoriaRisco = 'Baixo';
      criterios.push('Mantém risco baixo conforme os dados informados');
    }

    var alvoLdl = '', alvoNaoHdl = '', alvoApoB = '', estatinaSugerida = '', seguimento = '';
    switch (categoriaRisco) {
      case 'Extremo':
        alvoLdl = '< 40 mg/dL (redução ≥ 50% do basal)';
        alvoNaoHdl = 'Não-HDL < 70 mg/dL';
        alvoApoB = 'ApoB < 45 mg/dL';
        estatinaSugerida = 'Alta intensidade + ezetimiba e, se necessário, iPCSK9 ou inclisiran para atingir o alvo. Não reduzir intensidade.';
        seguimento = 'Risco extremo: controle periódico do perfil lipídico, adesão estrita e reavaliação farmacológica até alcançar a meta.';
        break;
      case 'Muito Alto':
        alvoLdl = '< 50 mg/dL (redução ≥ 50% do basal)';
        alvoNaoHdl = 'Não-HDL < 80 mg/dL';
        alvoApoB = 'ApoB < 55 mg/dL';
        estatinaSugerida = d.usoEstatinas
          ? 'Intensificar: alta intensidade (atorvastatina 40-80mg ou rosuvastatina 20-40mg) + ezetimiba 10mg se fora da meta.'
          : 'Alta intensidade: atorvastatina 40-80mg OU rosuvastatina 20-40mg. Se não atingir alvo, associar ezetimiba 10mg.';
        seguimento = 'Doença aterosclerótica ou DM2 de muito alto risco. Controle estrito de fatores metabólicos. Repetir perfil lipídico em 4 a 8 semanas.';
        break;
      case 'Alto':
        alvoLdl = '< 70 mg/dL (redução ≥ 50% do basal)';
        alvoNaoHdl = 'Não-HDL < 100 mg/dL';
        alvoApoB = 'ApoB < 70 mg/dL';
        estatinaSugerida = d.usoEstatinas
          ? 'Manter terapia ou intensificar se fora da meta. Considerar atorvastatina 40-80mg ou rosuvastatina 20-40mg. Associar ezetimiba 10mg se necessário.'
          : 'Alta intensidade: atorvastatina 40mg OU rosuvastatina 20mg.';
        seguimento = 'Prevenção primária de alto risco ou critério clínico. Foco em atingir a meta terapêutica de LDL de forma agressiva.';
        break;
      case 'Intermediário':
        alvoLdl = '< 100 mg/dL (redução ≥ 30% do basal)';
        alvoNaoHdl = 'Não-HDL < 130 mg/dL';
        alvoApoB = 'ApoB < 90 mg/dL';
        estatinaSugerida = d.usoEstatinas
          ? 'Manter esquema atual se LDL estiver dentro da meta (< 100 mg/dL). Se acima, titular dose ou trocar por mais potente.'
          : 'Moderada intensidade: atorvastatina 10-20mg, rosuvastatina 5-10mg ou sinvastatina 20-40mg.';
        seguimento = 'Discussão clínica compartilhada. Avaliar presença de fatores agravantes de risco para guiar a intensidade do tratamento.';
        break;
      default:
        alvoLdl = '< 115 mg/dL (redução ≥ 30% do basal)';
        alvoNaoHdl = 'Não-HDL < 145 mg/dL';
        alvoApoB = 'ApoB < 100 mg/dL';
        estatinaSugerida = 'Não indicado o início de estatinas (salvo se indicação prévia).';
        seguimento = 'Estimular hábitos de vida saudáveis. Reestratificação em 3 a 5 anos.';
    }

    return {
      risco10Anos: examesOk && nEventos === 0 ? riscoCalculado.toFixed(1) + '%' : 'Não calculável',
      idadeVascular: examesOk && nEventos === 0 ? idadeVascular : 'Não calculável',
      categoriaRisco: categoriaRisco,
      alvoLdl: alvoLdl,
      alvoNaoHdl: alvoNaoHdl,
      alvoApoB: alvoApoB,
      estatinaSugerida: estatinaSugerida,
      seguimento: seguimento,
      criterios: criterios
    };
  }

  function textoPrevent(r) {
    return 'PREVENT (' + new Date().toLocaleDateString('pt-BR') + '): ' +
      r.risco10Anos + ' (' + r.categoriaRisco.toLowerCase() + ') = LDL ' + r.alvoLdl;
  }

  function htmlResultadoPrevent(r) {
    var cfg = PREVENT_RISCOS[r.categoriaRisco] || PREVENT_RISCOS.Baixo;
    var corTexto = prevLegivelSobre(cfg.t);
    var criteriosHtml = r.criterios.map(function (c) {
      return '<div class="prevent-crit-item">• ' + prevEscapar(c) + '</div>';
    }).join('');
    var idadeVascularHtml = r.idadeVascular && r.idadeVascular !== 'Não calculável'
      ? '<div class="prevent-label">Idade Vascular</div><div class="prevent-score-val">' + prevEscapar(r.idadeVascular) + ' anos</div>'
      : '';
    return [
      '<div class="prevent-result-card" style="background:' + cfg.bg + ';border:1px solid ' + cfg.border + '">',
      '  <div class="prevent-result-header">',
      '    <span class="prevent-badge-risco" style="background:' + cfg.t + ';color:' + corTexto + ';border:1px solid ' + cfg.border + '">Risco Global: ' + prevEscapar(r.categoriaRisco) + '</span>',
      '    <button type="button" class="prevent-btn-icon" id="fmed-prevent-copiar" title="Copiar PREVENT">' + PREVENT_SVG_COPIAR + '</button>',
      '  </div>',
      '  <div class="prevent-label">Estimativa em 10 Anos</div>',
      '  <div class="prevent-score-val">' + prevEscapar(r.risco10Anos) + '</div>',
      idadeVascularHtml,
      '  <div class="prevent-conduta-box">',
      '    <div class="prevent-ldl-box">',
      '      <div class="prevent-conduta-title" style="color:' + cfg.t + '">Alvo de LDL-c</div>',
      '      <div style="font-size:16px;font-weight:700;color:var(--fmed-text)">' + prevEscapar(r.alvoLdl) + '</div>',
      '    </div>',
      '    <div class="prevent-alvos-sec">',
      '      <div class="prevent-alvo-badge">' + prevEscapar(r.alvoNaoHdl) + '</div>',
      '      <div class="prevent-alvo-badge">' + prevEscapar(r.alvoApoB) + '</div>',
      '    </div>',
      '    <div class="prevent-conduta-title">Critérios que definem o risco</div>',
      criteriosHtml,
      '    <div class="prevent-conduta-title">Esquema terapêutico</div>',
      '    <div class="prevent-conduta-text">' + prevEscapar(r.estatinaSugerida) + '</div>',
      '    <div class="prevent-conduta-title">Seguimento</div>',
      '    <div class="prevent-conduta-text">' + prevEscapar(r.seguimento) + '</div>',
      '  </div>',
      '</div>'
    ].join('\n');
  }

  function htmlFaltandoPrevent(faltando) {
    var msg = faltando && faltando.length
      ? 'Faltam dados para calcular o escore PREVENT:<br><b>' + faltando.join(', ') + '</b>'
      : 'Preencha os dados para calcular o escore.';
    return '<div class="prevent-empty">' + msg + '</div>';
  }

  var LINHAS_EXEMPLO = [
    "Nome do Paciente: MARIA DE SOUZA OLIVEIRA     Data de cadastro: 15/03/2026",
    "Nascimento: 24/08/1968 Sexo: F",
    "HEMOGRAMA",
    "Hemoglobina: 13,8 g/dL",
    "Hematócrito: 41,2 %",
    "V.C.M.: 88,5 fL",
    "H.C.M.: 29,6 pg",
    "Leucócitos: 6.400 /mm³",
    "Segmentados: 3.900 /mm³",
    "Plaquetas: 260.000 /mm³",
    "RDW: 12,8 %",
    "GLICEMIA DE JEJUM",
    "Glicemia: 112 mg/dL",
    "HEMOGLOBINA GLICADA",
    "Hb A1c: 6,1 %",
    "PERFIL LIPÍDICO",
    "Colesterol Total: 215 mg/dL",
    "Colesterol HDL: 52 mg/dL",
    "Triglicerídeos: 185 mg/dL",
    "FUNÇÃO RENAL",
    "Ureia: 28 mg/dL",
    "Creatinina: 0,82 mg/dL",
    "Ácido Úrico: 4,6 mg/dL",
    "TSH: 5,40 mUI/L",
    "T4 Livre: 1,15 ng/dL",
    "TGO: 21 U/L",
    "TGP: 24 U/L",
    "Sódio: 139 mEq/L",
    "Potássio: 4,2 mEq/L",
    "Vitamina D (25-OH): 34 ng/mL",
    "Vitamina B12: 480 pg/mL"
  ];

  function exibirModalChecklist(parsed, tituloOpcional, base64Pdf) {
    var backdrop = garantirBackdrop();

    // Prepara lista de itens para o checklist
    var itensChecklist = [];

    CAMPOS_FIXOS.forEach(function (campo) {
      var val = parsed.valores[campo.id];
      if (val && String(val).trim()) {
        var alterado = verificarForaDaReferencia(campo.id, val, parsed.sexo, parsed.idade);
        itensChecklist.push(criarItemChecklist(campo.id, campo.label, String(val).trim(), !!campo.calculado, campo.id, alterado));
      }
    });

    if (parsed.extras && parsed.extras.length) {
      parsed.extras.forEach(function (extra, idx) {
        if (extra.valor && String(extra.valor).trim()) {
          var alterado = verificarForaDaReferencia(extra.label, extra.valor, parsed.sexo, parsed.idade);
          itensChecklist.push(criarItemChecklist('extra_' + idx, extra.label, String(extra.valor).trim(), false, null, alterado));
        }
      });
    }

    if (!itensChecklist.length) {
      backdrop.innerHTML = [
        '<div id="fmed-exames-modal">',
        '  <div class="header">',
        '    <div class="titulo-box">',
        '      <span class="badge">LABORATÓRIO</span>',
        '      <h3 class="titulo">Nenhum exame reconhecido</h3>',
        '      <p class="subtitulo">O laudo foi lido, mas nenhum exame compatível com o template foi identificado.</p>',
        '    </div>',
        '    <button type="button" class="btn-fechar-topo" id="fmed-fechar-topo">✕</button>',
        '  </div>',
        '</div>'
      ].join('');
      backdrop.querySelector('#fmed-fechar-topo').addEventListener('click', fecharPainel);
      return;
    }

    var subTitulo = parsed.nomePaciente
      ? (parsed.data ? parsed.data + ' — ' : '') + parsed.nomePaciente
      : (tituloOpcional || 'Laudo Importado');

    var metadataInfo = [
      parsed.idade ? parsed.idade + ' anos' : '',
      parsed.sexo ? 'sexo ' + parsed.sexo : ''
    ].filter(Boolean).join(', ');

    var subtituloTexto = metadataInfo ? subTitulo + ' (' + metadataInfo + ')' : subTitulo;

    var htmlChecklist = '';
    itensChecklist.forEach(function (item, idx) {
      var classeValor = item.alterado ? 'item-valor alterado' : 'item-valor';
      var classeCard = item.selected
        ? (item.alterado ? 'check-card selected card-alterado' : 'check-card selected')
        : (item.alterado ? 'check-card card-alterado' : 'check-card');
      var tituloValor = item.alterado ? ' title="Valor fora dos limites de referência habituais"' : '';
      htmlChecklist += [
        '<label class="' + classeCard + '" id="fmed-card-' + idx + '" data-idx="' + idx + '">',
        '  <input type="checkbox" id="fmed-chk-' + idx + '"' + (item.selected ? ' checked' : '') + '>',
        '  <span class="item-info">',
        '    <span class="item-label">' + item.label + '</span>',
        '    <span class="' + classeValor + '"' + tituloValor + '>' + item.valor + '</span>',
        '  </span>',
        '</label>'
      ].join('');
    });

    var metadataObj = { idade: parsed.idade, sexo: parsed.sexo };
    var textoInicial = gerarTextoDeItens(itensChecklist, parsed.data, metadataObj);

    var botaoVerPdf = base64Pdf
      ? '<button type="button" class="btn btn-secundario" id="fmed-ver-pdf">Ver Laudo PDF</button>'
      : '<button type="button" class="btn btn-secundario" id="fmed-ver-pdf" style="display:none;">Ver Laudo PDF</button>';

    backdrop.innerHTML = [
      '<div id="fmed-exames-modal">',
      '  <div id="fmed-view-checklist" style="display:flex;flex-direction:column;gap:12px;">',
      '    <div class="header">',
      '      <div class="titulo-box">',
      '        <div><span class="badge">LABORATÓRIO</span></div>',
      '        <h3 class="titulo">' + subtituloTexto + '</h3>',
      '        <span class="subtitulo" id="fmed-counter">' + itensChecklist.length + ' de ' + itensChecklist.length + ' exames selecionados</span>',
      '      </div>',
      '      <button type="button" class="btn-fechar-topo" id="fmed-fechar-topo" title="Fechar">✕</button>',
      '    </div>',
      '    <div class="checklist-toolbar">',
      '      <span>Selecione os exames a incluir:</span>',
      '      <div class="toolbar-actions">',
      '        <button type="button" class="link-acao" id="fmed-sel-todos">Selecionar todos</button>',
      '        <button type="button" class="link-acao" id="fmed-des-todos">Desmarcar todos</button>',
      '      </div>',
      '    </div>',
      '    <div class="checklist-container" id="fmed-checklist-box">',
      htmlChecklist,
      '    </div>',
      '    <div class="output-section">',
      '      <textarea id="fmed-texto" spellcheck="false"></textarea>',
      '    </div>',
      '    <div class="acoes">',
      botaoVerPdf,
      '      <div style="display:flex;gap:8px;margin-left:auto;">',
      '        <button type="button" class="btn btn-prevent" id="fmed-prevent-abrir">Calcular PREVENT</button>',
      '        <button type="button" class="btn btn-primary" id="fmed-copiar">Copiar</button>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div id="fmed-view-prevent" class="prevent-view" style="display:none;"></div>',
      '</div>'
    ].join('');

    var area = backdrop.querySelector('#fmed-texto');
    area.value = textoInicial;

    var btnCopiar = backdrop.querySelector('#fmed-copiar');
    var counterEl = backdrop.querySelector('#fmed-counter');
    var copiaTimer = null;

    function sinalizarCopia(ok) {
      window.clearTimeout(copiaTimer);
      if (!ok) {
        btnCopiar.textContent = 'Copie com Ctrl+C';
        btnCopiar.className = 'btn btn-secundario';
        return;
      }
      btnCopiar.textContent = '✓ Copiado!';
      btnCopiar.className = 'btn btn-primary btn-copiado';
      copiaTimer = window.setTimeout(function () {
        if (!btnCopiar.parentNode) return;
        btnCopiar.textContent = 'Copiar';
        btnCopiar.className = 'btn btn-primary';
      }, 3000);
    }

    function atualizarEstadoVisual() {
      var selecionados = 0;
      itensChecklist.forEach(function (item, idx) {
        var card = backdrop.querySelector('#fmed-card-' + idx);
        var chk = backdrop.querySelector('#fmed-chk-' + idx);
        if (card && chk) {
          chk.checked = item.selected;
          if (item.selected) {
            card.className = item.alterado ? 'check-card selected card-alterado' : 'check-card selected';
            selecionados++;
          } else {
            card.className = item.alterado ? 'check-card card-alterado' : 'check-card';
          }
        }
      });
      counterEl.textContent = selecionados + ' de ' + itensChecklist.length + ' exames selecionados';
      area.value = gerarTextoDeItens(itensChecklist, parsed.data, metadataObj);
    }

    // Event listeners para os checkboxes
    itensChecklist.forEach(function (item, idx) {
      var card = backdrop.querySelector('#fmed-card-' + idx);
      var chk = backdrop.querySelector('#fmed-chk-' + idx);
      if (chk) {
        chk.addEventListener('change', function (ev) {
          ev.stopPropagation();
          item.selected = chk.checked;
          atualizarEstadoVisual();
        });
      }
      if (card) {
        card.addEventListener('click', function (ev) {
          if (ev.target && ev.target.tagName === 'INPUT') return;
          item.selected = !item.selected;
          atualizarEstadoVisual();
        });
      }
    });

    // Selecionar todos / Desmarcar todos
    backdrop.querySelector('#fmed-sel-todos').addEventListener('click', function () {
      itensChecklist.forEach(function (i) { i.selected = true; });
      atualizarEstadoVisual();
    });

    backdrop.querySelector('#fmed-des-todos').addEventListener('click', function () {
      itensChecklist.forEach(function (i) { i.selected = false; });
      atualizarEstadoVisual();
    });

    // Copiar
    btnCopiar.addEventListener('click', function () {
      copiarParaClipboard(area.value).then(function (ok) {
        sinalizarCopia(ok);
        if (!ok) { area.focus(); area.select(); }
      });
    });

    // Ver Laudo PDF se houver base64
    if (base64Pdf) {
      var btnVerPdf = backdrop.querySelector('#fmed-ver-pdf');
      if (btnVerPdf) {
        btnVerPdf.addEventListener('click', function () {
          abrirVisualizadorPdf(base64Pdf, subTitulo);
        });
      }
    }

    // Fechar botão
    backdrop.querySelector('#fmed-fechar-topo').addEventListener('click', fecharPainel);

    /* =========================================================================
     * PREVENT — PERGUNTA O QUE FALTA E CALCULA AUTOMATICAMENTE
     * ====================================================================== */
    var preventConstruido = false;

    function valorDoChecklist(fieldKey) {
      for (var k = 0; k < itensChecklist.length; k++) {
        var it = itensChecklist[k];
        if (it.selected && it.fieldKey === fieldKey) return it.valor;
      }
      return '';
    }

    function irParaPrevent() {
      var view = backdrop.querySelector('#fmed-view-prevent');
      if (!preventConstruido) {
        montarPreventView(view);
        preventConstruido = true;
      }
      backdrop.querySelector('#fmed-view-checklist').style.display = 'none';
      view.style.display = 'flex';
    }

    function voltarParaChecklist() {
      var view = backdrop.querySelector('#fmed-view-prevent');
      if (view) view.style.display = 'none';
      backdrop.querySelector('#fmed-view-checklist').style.display = 'flex';
    }

    function montarPreventView(view) {
      var dp = {
        idade: parsed.idade ? String(parsed.idade) : '',
        sexo: parsed.sexo || '',
        pas: '',
        ct: valorDoChecklist('ct'),
        hdl: valorDoChecklist('hdl'),
        trig: valorDoChecklist('trig'),
        cr: valorDoChecklist('cr'),
        hba1c: valorDoChecklist('hba1c'),
        rac: valorDoChecklist('rac'),
        ldl: valorDoChecklist('ldl'),
        lpa: '',
        cac: '',
        diabetes: false,
        fumante: false,
        antiHipertensivos: false,
        usoEstatinas: false,
        doencaAtero: false,
        subclinica: false
      };

      var hbaInicial = prevNum(dp.hba1c);
      if (!isNaN(hbaInicial) && hbaInicial >= 6.5) dp.diabetes = true;

      function campoNumero(key, label, placeholder, passo) {
        return [
          '<div class="prevent-field-group">',
          '  <label>' + label + '</label>',
          '  <input type="number" class="prevent-input" data-prevent-key="' + key + '" value="' + prevEscapar(dp[key]) + '" placeholder="' + placeholder + '"' + (passo ? ' step="' + passo + '"' : '') + '>',
          '</div>'
        ].join('');
      }

      function campoSexo() {
        return [
          '<div class="prevent-field-group">',
          '  <label>Sexo</label>',
          '  <div class="prevent-switch-group">',
          '    <button type="button" class="switch-opt' + (dp.sexo === 'F' ? ' active' : '') + '" data-key="sexo" data-val="F">Feminino</button>',
          '    <button type="button" class="switch-opt' + (dp.sexo === 'M' ? ' active' : '') + '" data-key="sexo" data-val="M">Masculino</button>',
          '  </div>',
          '</div>'
        ].join('');
      }

      function campoToggle(key, label, valorAtual) {
        return [
          '<div class="prevent-toggle-item">',
          '  <span class="prevent-toggle-label">' + label + '</span>',
          '  <div class="prevent-switch-group">',
          '    <button type="button" class="switch-opt' + (valorAtual ? ' active' : '') + '" data-key="' + key + '" data-val="true">Sim</button>',
          '    <button type="button" class="switch-opt' + (!valorAtual ? ' active' : '') + '" data-key="' + key + '" data-val="false">Não</button>',
          '  </div>',
          '</div>'
        ].join('');
      }

      function campoCac() {
        var opcoes = [
          { valor: '', label: 'Não informado' },
          { valor: '<10', label: '< 10 UA' },
          { valor: '10-100', label: '10-100 UA' },
          { valor: '100-300', label: '100-300 UA' },
          { valor: '>300', label: '> 300 UA' }
        ];
        var html = [
          '<div class="prevent-field-group">',
          '  <label>CAC (escore de cálcio coronariano)</label>',
          '  <select class="prevent-input" data-prevent-key="cac">'
        ];
        for (var o = 0; o < opcoes.length; o++) {
          html.push('<option value="' + opcoes[o].valor + '"' + (dp.cac === opcoes[o].valor ? ' selected' : '') + '>' + opcoes[o].label + '</option>');
        }
        html.push('  </select>', '</div>');
        return html.join('');
      }

      var faltantes = [];
      if (!dp.idade) faltantes.push(campoNumero('idade', 'Idade (anos)', 'Ex: 62', '1'));
      if (!dp.sexo) faltantes.push(campoSexo());
      if (!dp.pas) faltantes.push(campoNumero('pas', 'Pressão arterial sistólica (mmHg)', 'Ex: 138', '1'));
      if (!dp.ct) faltantes.push(campoNumero('ct', 'Colesterol total (mg/dL)', 'Ex: 210', '1'));
      if (!dp.hdl) faltantes.push(campoNumero('hdl', 'HDL-c (mg/dL)', 'Ex: 48', '1'));

      var adicionais = [];
      if (!dp.ldl && !(dp.ct && dp.hdl && dp.trig)) adicionais.push(campoNumero('ldl', 'LDL-c (mg/dL)', 'Opcional', '1'));
      if (!dp.hba1c) adicionais.push(campoNumero('hba1c', 'HbA1c (%)', 'Opcional', '0.1'));
      if (!dp.rac) adicionais.push(campoNumero('rac', 'RAC (mg/g)', 'Opcional', '0.1'));
      adicionais.push(campoNumero('lpa', 'Lp(a) (mg/dL)', 'Opcional', '0.1'));
      adicionais.push(campoCac());

      var toggles = [
        campoToggle('diabetes', 'Diabetes', !!dp.diabetes),
        campoToggle('fumante', 'Tabagismo', !!dp.fumante),
        campoToggle('antiHipertensivos', 'Anti-hipertensivo', !!dp.antiHipertensivos),
        campoToggle('usoEstatinas', 'Estatina', !!dp.usoEstatinas),
        campoToggle('doencaAtero', 'Doença aterosclerótica', !!dp.doencaAtero),
        campoToggle('subclinica', 'Aterosclerose subclínica', !!dp.subclinica)
      ].join('');

      view.innerHTML = [
        '<div class="header">',
        '  <div class="titulo-box">',
        '    <div><span class="badge">PREVENT</span></div>',
        '    <h3 class="titulo">Risco cardiovascular em 10 anos</h3>',
        '    <span class="subtitulo">Complete os dados ausentes — o cálculo é automático.</span>',
        '  </div>',
        '  <button type="button" class="btn-fechar-topo" id="fmed-prevent-fechar" title="Fechar">✕</button>',
        '</div>',
        '<div class="prevent-corpo">',
        '  <div class="prevent-painel-dados">',
        '    <div>',
        '      <div class="prevent-mini-titulo">Dados do laudo</div>',
        '      <div class="prevent-chips-box" id="fmed-prevent-chips"></div>',
        '    </div>',
        '    <div>',
        '      <div class="prevent-mini-titulo">Completar dados</div>',
        '      <div style="display:flex;flex-direction:column;gap:8px;">',
        faltantes.length ? faltantes.join('') : '<div class="prevent-crit-item" style="opacity:.7;">Nenhum dado obrigatório ausente.</div>',
        '      </div>',
        '    </div>',
        '    <div>',
        '      <div class="prevent-mini-titulo">Fatores clínicos</div>',
        '      <div class="prevent-toggles-grid">',
        toggles,
        '      </div>',
        '    </div>',
        '    <div>',
        '      <div class="prevent-mini-titulo">Biomarcadores adicionais</div>',
        '      <div style="display:flex;flex-direction:column;gap:8px;">',
        adicionais.join(''),
        '      </div>',
        '    </div>',
        '  </div>',
        '  <div id="fmed-prevent-resultado"></div>',
        '</div>',
        '<div class="acoes" style="justify-content:flex-end;">',
        '  <button type="button" class="btn btn-secundario" id="fmed-prevent-voltar">Voltar ao checklist</button>',
        '</div>'
      ].join('');

      var chipsEl = view.querySelector('#fmed-prevent-chips');
      var resultadoEl = view.querySelector('#fmed-prevent-resultado');
      var ultimoResultado = null;

      function escopoDados() {
        var dados = {
          idade: dp.idade,
          sexo: dp.sexo,
          pas: dp.pas,
          ct: dp.ct,
          hdl: dp.hdl,
          trig: dp.trig,
          cr: dp.cr,
          ldl: dp.ldl,
          hba1c: dp.hba1c,
          rac: dp.rac,
          tfg: '',
          lpa: dp.lpa,
          cac: dp.cac,
          diabetes: !!dp.diabetes,
          fumante: !!dp.fumante,
          antiHipertensivos: !!dp.antiHipertensivos,
          usoEstatinas: !!dp.usoEstatinas,
          doencaAtero: !!dp.doencaAtero,
          subclinica: !!dp.subclinica
        };
        if (!dados.ldl && dados.ct && dados.hdl && dados.trig) {
          var ldlCalc = calcLdl(dados);
          if (ldlCalc) dados.ldl = ldlCalc;
        }
        if (dados.cr && dados.idade && dados.sexo) {
          var tfgCalc = calcTfg(dados);
          if (tfgCalc) dados.tfg = tfgCalc;
        }
        return dados;
      }

      function renderChips(dados) {
        var chips = [];
        function add(label, val, sufixo) {
          if (val === '' || val === null || val === undefined) return;
          if (String(val).trim() === '') return;
          chips.push('<span class="prevent-chip prevent-chip-ok">' + label + ': <b>' + prevEscapar(val) + (sufixo || '') + '</b></span>');
        }
        add('Idade', dados.idade, ' anos');
        add('Sexo', dados.sexo === 'F' ? 'Feminino' : dados.sexo === 'M' ? 'Masculino' : dados.sexo);
        add('PAS', dados.pas, ' mmHg');
        add('CT', dados.ct);
        add('HDL', dados.hdl);
        add('LDL', dados.ldl);
        add('Trig', dados.trig);
        add('HbA1c', dados.hba1c, '%');
        add('RAC', dados.rac);
        add('Lp(a)', dados.lpa);
        add('TFG', dados.tfg);
        add('CAC', dados.cac);
        chipsEl.innerHTML = chips.length ? chips.join('') : '<span class="prevent-crit-item" style="opacity:.7;">Nenhum dado identificado no laudo.</span>';
      }

      function ligarBotaoCopiarPrevent() {
        var btn = resultadoEl.querySelector('#fmed-prevent-copiar');
        if (!btn) return;
        var timerCopia = null;
        btn.addEventListener('click', function () {
          if (!ultimoResultado) return;
          copiarParaClipboard(textoPrevent(ultimoResultado)).then(function (ok) {
            if (!ok) return;
            window.clearTimeout(timerCopia);
            btn.innerHTML = PREVENT_SVG_OK;
            btn.classList.add('copiado');
            btn.title = 'Copiado!';
            timerCopia = window.setTimeout(function () {
              if (!btn.parentNode) return;
              btn.innerHTML = PREVENT_SVG_COPIAR;
              btn.classList.remove('copiado');
              btn.title = 'Copiar PREVENT';
            }, 3000);
          });
        });
      }

      function atualizarPrevent() {
        var dados = escopoDados();
        renderChips(dados);
        var faltando = [];
        if (!dados.idade) faltando.push('Idade');
        if (!dados.sexo) faltando.push('Sexo');
        if (!dados.pas) faltando.push('Pressão arterial sistólica');
        if (!dados.ct) faltando.push('Colesterol total');
        if (!dados.hdl) faltando.push('HDL-c');
        ultimoResultado = faltando.length ? null : calcularPrevent(dados);
        if (ultimoResultado) {
          resultadoEl.innerHTML = htmlResultadoPrevent(ultimoResultado);
          ligarBotaoCopiarPrevent();
        } else {
          resultadoEl.innerHTML = htmlFaltandoPrevent(faltando);
        }
      }

      var entradas = view.querySelectorAll('[data-prevent-key]');
      for (var k = 0; k < entradas.length; k++) {
        (function (el) {
          var key = el.getAttribute('data-prevent-key');
          function aplicar() {
            dp[key] = el.value;
            atualizarPrevent();
          }
          el.addEventListener('input', aplicar);
          el.addEventListener('change', aplicar);
        })(entradas[k]);
      }

      var switches = view.querySelectorAll('.switch-opt');
      for (var s = 0; s < switches.length; s++) {
        (function (btn) {
          btn.addEventListener('click', function () {
            var key = btn.getAttribute('data-key');
            var val = btn.getAttribute('data-val');
            dp[key] = val === 'true' ? true : val === 'false' ? false : val;
            var irmaos = btn.parentNode.querySelectorAll('.switch-opt');
            for (var q = 0; q < irmaos.length; q++) irmaos[q].className = 'switch-opt';
            btn.className = 'switch-opt active';
            atualizarPrevent();
          });
        })(switches[s]);
      }

      view.querySelector('#fmed-prevent-fechar').addEventListener('click', fecharPainel);
      view.querySelector('#fmed-prevent-voltar').addEventListener('click', voltarParaChecklist);

      atualizarPrevent();
    }

    backdrop.querySelector('#fmed-prevent-abrir').addEventListener('click', irParaPrevent);

    // Fechar ao clicar fora do modal
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) fecharPainel();
    });

    // Auto-cópia imediata para conveniência
    copiarParaClipboard(textoInicial).then(function (ok) {
      if (ok) sinalizarCopia(true);
    });
  }

  function previewDemonstracao(linhasCustomizadas) {
    var linhas = linhasCustomizadas || LINHAS_EXEMPLO;
    var parsed = interpretarLinhasDoLaudo(linhas);
    exibirModalChecklist(parsed, 'Laudo de Demonstração (Preview)', null);
  }

  function processarBase64(base64, tituloOpcional) {
    var backdrop = garantirBackdrop();
    backdrop.innerHTML = [
      '<div id="fmed-exames-modal">',
      '  <div class="header">',
      '    <div class="titulo-box">',
      '      <span class="badge">LABORATÓRIO</span>',
      '      <h3 class="titulo">Extraindo dados do laudo...</h3>',
      '      <p class="subtitulo">Processando texto do PDF...</p>',
      '    </div>',
      '    <button type="button" class="btn-fechar-topo" id="fmed-fechar-topo">✕</button>',
      '  </div>',
      '</div>'
    ].join('');

    backdrop.querySelector('#fmed-fechar-topo').addEventListener('click', fecharPainel);

    return extrairTextoDoPdf(base64).then(function (linhas) {
      if (!linhas || !linhas.length) {
        throw new Error('Nenhum texto pôde ser extraído do PDF.');
      }
      var parsed = interpretarLinhasDoLaudo(linhas);
      exibirModalChecklist(parsed, tituloOpcional, base64);
    }).catch(function (err) {
      backdrop.innerHTML = [
        '<div id="fmed-exames-modal">',
        '  <div class="header">',
        '    <div class="titulo-box">',
        '      <span class="badge" style="background:#ba120a;">LABORATÓRIO</span>',
        '      <h3 class="titulo" style="color:#ba120a;">Falha na leitura</h3>',
        '      <p class="subtitulo">' + (err && err.message ? err.message : String(err)) + '</p>',
        '    </div>',
        '    <button type="button" class="btn-fechar-topo" id="fmed-fechar-topo">✕</button>',
        '  </div>',
        '</div>'
      ].join('');
      backdrop.querySelector('#fmed-fechar-topo').addEventListener('click', fecharPainel);
    });
  }

  function esperarLaudoNaTela() {
    pararVigia();
    var limite = Date.now() + CFG.segundosVigia * 1000;

    vigiaTimer = setInterval(function () {
      if (!document.getElementById('fmed-exames-backdrop')) {
        pararVigia();
        return;
      }
      if (Date.now() > limite) {
        pararVigia();
        return;
      }
      var aberto = laudoAbertoNaTela();
      if (aberto) {
        pararVigia();
        obterBase64DoPdf(aberto.fonte).then(function (b64) {
          processarBase64(b64);
        });
      }
    }, CFG.intervaloVigiaMs);
  }

  function mostrarTelaAguardandoLaudo() {
    var datas = [];
    try {
      datas = lerGradeDeLaudos().filter(function (d) { return d.temLaudo; });
    } catch (e) {
      datas = [];
    }

    var backdrop = garantirBackdrop();

    var htmlDatas = '';
    if (datas.length) {
      htmlDatas = [
        '<div style="margin-top: 6px; padding-top: 10px; border-top: 1px solid var(--fmed-border);">',
        '  <div style="font-size: 12px; font-weight: 600; color: var(--fmed-text); margin-bottom: 6px;">',
        '    Ou clique em uma data da grade para carregar e selecionar:',
        '  </div>',
        '  <div class="datas-lista">'
      ].join('');

      datas.slice(0, 15).forEach(function (d, i) {
        htmlDatas += '<button type="button" class="btn-data fmed-btn-data" data-index="' + i + '">' +
          d.data + ' (' + d.quantidade + ' exames)</button>';
      });
      htmlDatas += '</div></div>';
    }

    backdrop.innerHTML = [
      '<div id="fmed-exames-modal">',
      '  <div class="header">',
      '    <div class="titulo-box">',
      '      <div><span class="badge">LABORATÓRIO</span></div>',
      '      <h3 class="titulo">Aguardando abertura de laudo...</h3>',
      '      <p class="subtitulo" style="margin-top: 4px; line-height: 1.5;">',
      '        Abra a lupa <b>Visualizar Histórico de Resultados</b> na aba <b>Laudos de Exames</b>. ',
      '        Assim que o laudo aparecer na tela, o checklist abrirá automaticamente.',
      '      </p>',
      '    </div>',
      '    <button type="button" class="btn-fechar-topo" id="fmed-fechar-topo" title="Fechar">✕</button>',
      '  </div>',
      htmlDatas,
      '  <div class="acoes" style="justify-content: flex-start; margin-top: 10px;">',
      '    <button type="button" class="btn btn-secundario" id="fmed-btn-demo" style="color:var(--fmed-ok);border-color:var(--fmed-ok-border);">🧪 Ver laudo de exemplo (preview)</button>',
      '  </div>',
      '</div>'
    ].join('');

    var btnDemo = backdrop.querySelector('#fmed-btn-demo');
    if (btnDemo) {
      btnDemo.addEventListener('click', function () {
        previewDemonstracao();
      });
    }

    backdrop.querySelector('#fmed-fechar-topo').addEventListener('click', fecharPainel);

    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) fecharPainel();
    });

    var botoesData = backdrop.querySelectorAll('.fmed-btn-data');
    for (var i = 0; i < botoesData.length; i++) {
      botoesData[i].addEventListener('click', function (ev) {
        var idx = parseInt(ev.currentTarget.getAttribute('data-index'), 10);
        var item = datas[idx];
        if (!item) return;

        pararVigia();
        backdrop.innerHTML = [
          '<div id="fmed-exames-modal">',
          '  <div class="header">',
          '    <div class="titulo-box">',
          '      <span class="badge">LABORATÓRIO</span>',
          '      <h3 class="titulo">Buscando laudo de ' + item.data + '...</h3>',
          '      <p class="subtitulo">Requisitando laudo ao servidor do FastMedic...</p>',
          '    </div>',
          '    <button type="button" class="btn-fechar-topo" id="fmed-fechar-topo">✕</button>',
          '  </div>',
          '</div>'
        ].join('');
        backdrop.querySelector('#fmed-fechar-topo').addEventListener('click', fecharPainel);

        baixarLaudoPorProtocolo(item.protocolo).then(function (b64) {
          processarBase64(b64, 'Laudo de ' + item.data);
        }).catch(function (erro) {
          backdrop.innerHTML = [
            '<div id="fmed-exames-modal">',
            '  <div class="header">',
            '    <div class="titulo-box">',
            '      <span class="badge" style="background:#ba120a;">LABORATÓRIO</span>',
            '      <h3 class="titulo" style="color:#ba120a;">Erro ao buscar laudo</h3>',
            '      <p class="subtitulo">' + (erro && erro.message ? erro.message : String(erro)) + '</p>',
            '    </div>',
            '    <button type="button" class="btn-fechar-topo" id="fmed-fechar-topo">✕</button>',
            '  </div>',
            '</div>'
          ].join('');
          backdrop.querySelector('#fmed-fechar-topo').addEventListener('click', fecharPainel);
        });
      });
    }

    esperarLaudoNaTela();
  }

  function executarPrincipal() {
    var aberto = laudoAbertoNaTela();
    if (aberto) {
      obterBase64DoPdf(aberto.fonte).then(function (b64) {
        processarBase64(b64);
      }).catch(function (erro) {
        console.error('Falha ao ler laudo aberto:', erro);
        mostrarTelaAguardandoLaudo();
      });
      return;
    }
    mostrarTelaAguardandoLaudo();
  }

  /* ===========================================================================
   * EXPOSIÇÃO GLOBAL
   * ======================================================================== */
  window[NOME_GLOBAL] = {
    rodando: true,
    executar: executarPrincipal,
    preview: previewDemonstracao,
    fechar: fecharPainel,
    valoresReferencia: VALORES_REFERENCIA,
    verificarForaDaReferencia: verificarForaDaReferencia
  };

  if (window.__FASTMEDIC_AUTO_PREVIEW__) {
    previewDemonstracao();
  } else {
    executarPrincipal();
  }
})();
