/* =============================================================================
 * FASTMEDIC EXAMES — Bookmarklet de Extração de Laudos
 * -----------------------------------------------------------------------------
 * Espelha a formatação, cálculos (LDL Martin-Hopkins, TFG CKD-EPI 2021) e
 * ordem de campos do exames_ui.
 *
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
    { label: 'SU', padrao: /^(an[áa]lise\s+de\s+caracteres\s+f[íi]sicos|sum[áa]rio\s+de\s+urina|urina\s+rotina|e\.?a\.?s\.?)/i, fixo: '*AVALIAR*' },
    { label: 'Urocultura', padrao: /^(urocultura|urinocultura|cultura\s+de\s+urina)/i, fixo: '*AVALIAR*', negativoRegex: /(n[ãa]o\s+houve\s+crescimento|aus[êe]ncia\s+de\s+crescimento|cultura\s+negativa)/i, negativoTexto: '(-)' }
  ];

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

    // 2. Extração dos exames
    for (var idx = 0; idx < linhas.length; idx++) {
      var linha = linhas[idx];
      if (!linha || linha.length < 2) continue;

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
    return prefixoData + partes.join(' // ');
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
   * INTERFACE VISUAL (PAINEL FLUTUANTE)
   * ======================================================================== */
  var CSS_PAINEL = [
    '#fmed-exames-root {',
    '  position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%);',
    '  z-index: 2147483640; width: min(880px, 95vw); box-sizing: border-box;',
    '  background: #ffffff; border: 1.5px solid #1e6b47; border-radius: 8px;',
    '  box-shadow: 0 10px 30px rgba(0,0,0,0.28); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;',
    '  font-size: 13px; line-height: 1.4; color: #1a1916; padding: 10px 14px 12px;',
    '}',
    '#fmed-exames-root * { box-sizing: border-box; text-transform: none !important; }',
    '#fmed-exames-root .header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }',
    '#fmed-exames-root .badge { background: #1e6b47; color: #fff; font-weight: 700; font-size: 11px; padding: 2px 7px; border-radius: 4px; letter-spacing: 0.04em; }',
    '#fmed-exames-root .titulo { font-weight: 600; font-size: 13px; color: #1a1916; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '#fmed-exames-root .status { font-size: 12px; color: #6b6760; }',
    '#fmed-exames-root textarea {',
    '  width: 100%; height: 56px; border: 1px solid #d1d5db; border-radius: 6px;',
    '  padding: 8px 10px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;',
    '  font-size: 12.5px; line-height: 18px; color: #111; background: #fafafa; resize: vertical;',
    '}',
    '#fmed-exames-root textarea:focus { outline: none; border-color: #1e6b47; background: #fff; box-shadow: 0 0 0 2px rgba(30,107,71,0.15); }',
    '#fmed-exames-root .acoes { display: flex; align-items: center; gap: 8px; margin-top: 8px; flex-wrap: wrap; }',
    '#fmed-exames-root button {',
    '  display: inline-flex; align-items: center; justify-content: center; font-size: 12.5px; font-weight: 600;',
    '  padding: 5px 14px; border-radius: 5px; cursor: pointer; border: 1px solid transparent; transition: all .15s ease;',
    '}',
    '#fmed-exames-root .btn-primary { background: #1e6b47; color: #fff; border-color: #1e6b47; }',
    '#fmed-exames-root .btn-primary:hover { background: #165236; }',
    '#fmed-exames-root .btn-copiado { background: #007a30 !important; color: #fff !important; border-color: #007a30 !important; }',
    '#fmed-exames-root .btn-secundario { background: #f3f4f6; color: #374151; border-color: #d1d5db; }',
    '#fmed-exames-root .btn-secundario:hover { background: #e5e7eb; color: #111; }',
    '#fmed-exames-root .btn-data { background: #eef7f2; color: #1e6b47; border-color: #b9dfcb; font-size: 11.5px; padding: 3px 8px; }',
    '#fmed-exames-root .btn-data:hover { background: #d7efe2; }',
    '#fmed-exames-root .info-msg { font-size: 12px; color: #555; }',
    '#fmed-exames-root .datas-box { margin-top: 6px; padding-top: 6px; border-top: 1px solid #e5e7eb; }',
    '#fmed-exames-root .datas-lista { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; max-height: 85px; overflow-y: auto; }',
    '#fmed-exames-root.aguardando { pointer-events: none; opacity: 0.96; }',
    '#fmed-exames-root.aguardando button { pointer-events: auto; }',
    '#fmed-exames-viewer-fundo { position: fixed; inset: 0; z-index: 2147483641; background: rgba(0,0,0,0.45); }',
    '#fmed-exames-viewer {',
    '  position: fixed; z-index: 2147483642; top: 40px; left: 50%; transform: translateX(-50%);',
    '  width: min(940px, 95vw); height: calc(100vh - 40px - 180px); min-height: 280px;',
    '  display: flex; flex-direction: column; background: #fff; border: 2px solid #1e6b47;',
    '  border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); overflow: hidden;',
    '}',
    '#fmed-exames-viewer .barra { display: flex; align-items: center; justify-content: space-between; background: #1e6b47; color: #fff; padding: 7px 12px; font-weight: bold; font-size: 13px; }',
    '#fmed-exames-viewer iframe { flex: 1; border: 0; background: #555; width: 100%; height: 100%; }'
  ].join('\n');

  var painelEl = null;
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
        '  <button type="button" id="fmed-v-fechar" style="background:transparent;border:1px solid #fff;color:#fff;padding:2px 8px;border-radius:3px;cursor:pointer;">Fechar</button>',
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
    if (painelEl && painelEl.parentNode) {
      painelEl.parentNode.removeChild(painelEl);
    }
    painelEl = null;
    // Não salvar nada no fechamento
    try { sessionStorage.removeItem(CHAVE_SESSAO); } catch (e) {}
  }

  function garantirPainel() {
    injetarEstilos();
    if (!painelEl) {
      painelEl = document.createElement('div');
      painelEl.id = 'fmed-exames-root';
      document.documentElement.appendChild(painelEl);
    }
    return painelEl;
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

  /* ===========================================================================
   * FLUXO DE EXECUÇÃO
   * ======================================================================== */
  function pararVigia() {
    if (vigiaTimer) {
      clearInterval(vigiaTimer);
      vigiaTimer = null;
    }
  }

  function processarBase64(base64, tituloOpcional) {
    var p = garantirPainel();
    p.className = '';
    p.innerHTML = [
      '<div class="header">',
      '  <span class="badge">LABORATÓRIO</span>',
      '  <span class="titulo">Extraindo dados do laudo...</span>',
      '</div>',
      '<div class="info-msg">Processando laudo com o modelo do exames_ui...</div>',
      '<div class="acoes"><button type="button" class="btn-secundario" id="fmed-fechar">Fechar</button></div>'
    ].join('');
    p.querySelector('#fmed-fechar').addEventListener('click', fecharPainel);

    return extrairTextoDoPdf(base64).then(function (linhas) {
      if (!linhas || !linhas.length) {
        throw new Error('Nenhum texto pôde ser extraído do PDF.');
      }
      var parsed = interpretarLinhasDoLaudo(linhas);
      var linhaFinal = montarLinhaFinal(parsed);

      if (!linhaFinal) {
        p.innerHTML = [
          '<div class="header">',
          '  <span class="badge">LABORATÓRIO</span>',
          '  <span class="titulo">Nenhum exame reconhecido</span>',
          '</div>',
          '<div class="info-msg">O laudo foi lido, mas nenhum exame compatível com o template foi identificado.</div>',
          '<div class="acoes"><button type="button" class="btn-secundario" id="fmed-fechar">Fechar</button></div>'
        ].join('');
        p.querySelector('#fmed-fechar').addEventListener('click', fecharPainel);
        return;
      }

      var subTitulo = parsed.nomePaciente
        ? (parsed.data ? parsed.data + ' — ' : '') + parsed.nomePaciente
        : (tituloOpcional || 'Laudo Extraído');

      p.innerHTML = [
        '<div class="header">',
        '  <span class="badge">LABORATÓRIO</span>',
        '  <span class="titulo">' + subTitulo + '</span>',
        '  <span class="status">Formato exames_ui</span>',
        '</div>',
        '<textarea id="fmed-texto" spellcheck="false"></textarea>',
        '<div class="acoes">',
        '  <button type="button" class="btn-primary" id="fmed-copiar">Copiar</button>',
        '  <button type="button" class="btn-secundario" id="fmed-ver-pdf">Ver Laudo PDF</button>',
        '  <button type="button" class="btn-secundario" id="fmed-fechar">Fechar</button>',
        '</div>'
      ].join('');

      var area = p.querySelector('#fmed-texto');
      area.value = linhaFinal;

      var btnCopiar = p.querySelector('#fmed-copiar');
      btnCopiar.addEventListener('click', function () {
        copiarParaClipboard(area.value).then(function (ok) {
          btnCopiar.textContent = ok ? '✓ Copiado!' : 'Copie com Ctrl+C';
          btnCopiar.className = ok ? 'btn-primary btn-copiado' : 'btn-secundario';
          if (!ok) { area.focus(); area.select(); }
        });
      });

      p.querySelector('#fmed-ver-pdf').addEventListener('click', function () {
        abrirVisualizadorPdf(base64, subTitulo);
      });

      p.querySelector('#fmed-fechar').addEventListener('click', fecharPainel);

      area.focus();
      area.select();

      // Auto-cópia para comodidade imediata
      copiarParaClipboard(linhaFinal).then(function (ok) {
        if (ok) {
          btnCopiar.textContent = '✓ Copiado!';
          btnCopiar.className = 'btn-primary btn-copiado';
        }
      });
    }).catch(function (err) {
      p.innerHTML = [
        '<div class="header">',
        '  <span class="badge">LABORATÓRIO</span>',
        '  <span class="titulo" style="color:#ba120a;">Falha na leitura</span>',
        '</div>',
        '<div class="info-msg" style="color:#ba120a;">' + (err && err.message ? err.message : String(err)) + '</div>',
        '<div class="acoes"><button type="button" class="btn-secundario" id="fmed-fechar">Fechar</button></div>'
      ].join('');
      p.querySelector('#fmed-fechar').addEventListener('click', fecharPainel);
    });
  }

  function esperarLaudoNaTela() {
    pararVigia();
    var limite = Date.now() + CFG.segundosVigia * 1000;

    vigiaTimer = setInterval(function () {
      if (!document.getElementById('fmed-exames-root')) {
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

    var p = garantirPainel();
    p.className = 'aguardando';

    var htmlDatas = '';
    if (datas.length) {
      htmlDatas = [
        '<div class="datas-box">',
        '  <div class="info-msg" style="font-weight:600;margin-bottom:4px;">Ou selecione uma data da grade para buscar direto:</div>',
        '  <div class="datas-lista">'
      ].join('');

      datas.slice(0, 15).forEach(function (d, i) {
        htmlDatas += '<button type="button" class="btn-data fmed-btn-data" data-index="' + i + '">' +
          d.data + ' (' + d.quantidade + ' exames)</button>';
      });
      htmlDatas += '</div></div>';
    }

    p.innerHTML = [
      '<div class="header">',
      '  <span class="badge">LABORATÓRIO</span>',
      '  <span class="titulo">Aguardando abertura de laudo...</span>',
      '</div>',
      '<div class="info-msg">',
      '  Abra a lupa <b>Visualizar Histórico de Resultados</b> na aba <b>Laudos de Exames</b>. ',
      '  Assim que o laudo aparecer na tela, ele será transcrito automaticamente.',
      '</div>',
      htmlDatas,
      '<div class="acoes" style="margin-top:10px;">',
      '  <button type="button" class="btn-secundario" id="fmed-fechar">Fechar</button>',
      '</div>'
    ].join('');

    p.querySelector('#fmed-fechar').addEventListener('click', fecharPainel);

    var botoesData = p.querySelectorAll('.fmed-btn-data');
    for (var i = 0; i < botoesData.length; i++) {
      botoesData[i].addEventListener('click', function (ev) {
        var idx = parseInt(ev.currentTarget.getAttribute('data-index'), 10);
        var item = datas[idx];
        if (!item) return;

        pararVigia();
        p.className = '';
        p.innerHTML = [
          '<div class="header">',
          '  <span class="badge">LABORATÓRIO</span>',
          '  <span class="titulo">Buscando laudo de ' + item.data + '...</span>',
          '</div>',
          '<div class="info-msg">Requisitando laudo ao servidor do FastMedic...</div>',
          '<div class="acoes"><button type="button" class="btn-secundario" id="fmed-fechar">Fechar</button></div>'
        ].join('');
        p.querySelector('#fmed-fechar').addEventListener('click', fecharPainel);

        baixarLaudoPorProtocolo(item.protocolo).then(function (b64) {
          processarBase64(b64, 'Laudo de ' + item.data);
        }).catch(function (erro) {
          p.innerHTML = [
            '<div class="header">',
            '  <span class="badge">LABORATÓRIO</span>',
            '  <span class="titulo" style="color:#ba120a;">Erro ao buscar laudo</span>',
            '</div>',
            '<div class="info-msg" style="color:#ba120a;">' + (erro && erro.message ? erro.message : String(erro)) + '</div>',
            '<div class="acoes"><button type="button" class="btn-secundario" id="fmed-fechar">Fechar</button></div>'
          ].join('');
          p.querySelector('#fmed-fechar').addEventListener('click', fecharPainel);
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
    versao: '1.0.0',
    rodando: true,
    executar: executarPrincipal,
    fechar: fecharPainel
  };

  executarPrincipal();
})();
