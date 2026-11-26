/* =============================================================================
 * FASTMEDIC AGENDA — Bookmarklet de agenda com overlay
 * -----------------------------------------------------------------------------
 * Roda dentro do FastMedic, lê a tabela do dia, busca a Agendinha no Supabase
 * do calendário e mantém apenas os campos de Agendinha e Acolhimento/DESP.
 * O botão Imprimir usa o mesmo GAS do agenda_ui e abre o PDF em outra aba.
 * A data do dia vem do cabeçalho Date do Supabase, nunca do relógio local.
 *
 * Bookmarklet loader:
 * javascript:(function(){var U='https://raw.githubusercontent.com/aogakid/work/main/public/fastmedic-agenda.js',K='fastmedic_agenda:sessao',G='FastMedicAgenda';var j=window[G];if(j&&j.rodando){if(j.executar)j.executar();return;}function r(c){var s=document.createElement('script');s.textContent=c;document.documentElement.appendChild(s);s.parentNode.removeChild(s);}function g(c){try{sessionStorage.setItem(K,JSON.stringify({url:U,codigo:c,em:Date.now()}));}catch(e){}}var v=null;try{v=JSON.parse(sessionStorage.getItem(K)||'null');}catch(e){}fetch(U+'?t='+Date.now(),{credentials:'omit'}).then(function(x){if(!x.ok)throw new Error('HTTP '+x.status);return x.text();}).then(function(t){if(!t.trim())throw new Error('o arquivo veio vazio');g(t);r(t);}).catch(function(e){if(v&&v.codigo){g(v.codigo);r(v.codigo);}else{alert('FastMedic Agenda: nao consegui carregar o script. '+e.message);}});})();
 * ========================================================================== */

(function () {
  'use strict';

  var NOME_GLOBAL = 'FastMedicAgenda';
  var ID_STYLES = 'fmed-agenda-styles';
  var ID_BACKDROP = 'fmed-agenda-backdrop';

  var CFG = {
    gasUrl: 'https://script.google.com/macros/s/AKfycbx5e1DSXQ2tZqEtMHbCU9a9dvP8Ial8q7LsZ1A7LYHSLsnPvABURMhPmDP-yWBLStmcng/exec',
    supabaseUrl: 'https://ncbheiqtybxptfdtikut.supabase.co',
    supabaseKey: 'sb_publishable_zWllddt4rUrbZNQqj2U9aQ_TmOEJu87',
    nomeCalendario: 'Encaixes e retornos',
    calendarIdFallback: '36e63601-a34d-4efb-8ad5-b1c94f616693',
    fuso: 'America/Sao_Paulo',
    maxItens: 10
  };

  var estado = {
    date: '',
    texto: '',
    erroExtracao: '',
    itens: [''],
    nomesPreAgendadas: [],
    nomesAgendinha: [],
    agendinha: '',
    enviando: false,
    demo: false
  };

  var backdropEl = null;

  function api() {
    return {
      rodando: true,
      executar: recarregar,
      recarregar: recarregar,
      preview: previewDemonstracao,
      fechar: fecharPainel
    };
  }

  var jaRodando = !!(window[NOME_GLOBAL] && window[NOME_GLOBAL].rodando);
  if (jaRodando) {
    if (typeof window[NOME_GLOBAL].executar === 'function') {
      window[NOME_GLOBAL].executar();
    }
    return;
  }

  window[NOME_GLOBAL] = api();

  /* ── Helpers de texto/data ───────────────────────────────────────────── */

  function normalize(value) {
    return String(value == null ? '' : value)
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function comparable(value) {
    return normalize(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function isoDeData(data) {
    var partes = new Intl.DateTimeFormat('pt-BR', {
      timeZone: CFG.fuso,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(data);
    var ano = '';
    var mes = '';
    var dia = '';
    for (var i = 0; i < partes.length; i++) {
      if (partes[i].type === 'year') ano = partes[i].value;
      if (partes[i].type === 'month') mes = partes[i].value;
      if (partes[i].type === 'day') dia = partes[i].value;
    }
    return ano + '-' + mes + '-' + dia;
  }

  function obterDataServidor() {
    var url = CFG.supabaseUrl + '/rest/v1/calendars?select=id&limit=1';
    return fetch(url, {
      headers: {
        apikey: CFG.supabaseKey,
        Authorization: 'Bearer ' + CFG.supabaseKey,
        Accept: 'application/json'
      }
    }).then(function (resposta) {
      var cabecalho = resposta.headers && typeof resposta.headers.get === 'function'
        ? resposta.headers.get('Date')
        : '';
      if (!cabecalho) throw new Error('servidor não informou a data');
      var data = new Date(cabecalho);
      if (isNaN(data.getTime())) throw new Error('data do servidor inválida');
      return isoDeData(data);
    });
  }

  function obterFrames() {
    var frames = [{ doc: document, url: 'top' }];
    var iframes = document.querySelectorAll('iframe');
    for (var i = 0; i < iframes.length; i++) {
      try {
        if (iframes[i].contentDocument) {
          frames.push({
            doc: iframes[i].contentDocument,
            url: iframes[i].src || 'iframe'
          });
        }
      } catch (e) {
        /* iframe cross-origin não é legível daqui */
      }
    }
    return frames;
  }

  function extrairTabela() {
    var requiredHeaders = ['hora', 'usuario', 'tipo agendamento', 'observacao'];
    var frames = obterFrames();
    var selectedTable = null;

    for (var f = 0; f < frames.length && !selectedTable; f++) {
      var tables = frames[f].doc.querySelectorAll('table');
      for (var t = 0; t < tables.length; t++) {
        var headers = [];
        var ths = tables[t].querySelectorAll('thead th');
        for (var h = 0; h < ths.length; h++) {
          headers.push(comparable(ths[h].innerText || ths[h].textContent));
        }
        var temTodos = true;
        for (var r = 0; r < requiredHeaders.length; r++) {
          if (headers.indexOf(requiredHeaders[r]) === -1) temTodos = false;
        }
        if (temTodos) {
          var indexes = [];
          for (var k = 0; k < requiredHeaders.length; k++) {
            indexes.push(headers.indexOf(requiredHeaders[k]));
          }
          selectedTable = { frame: frames[f], table: tables[t], indexes: indexes };
          break;
        }
      }
    }

    if (!selectedTable) {
      return {
        date: '',
        texto: '',
        colunaF: [],
        nomesPreAgendadas: [],
        erro: 'Não encontrei a tabela com as colunas Hora, Usuário, Tipo Agendamento e Observação.'
      };
    }

    var indexes = selectedTable.indexes;
    var linhas = [];
    var trs = selectedTable.table.querySelectorAll('tbody tr');
    for (var i = 0; i < trs.length; i++) {
      var cells = [];
      var tds = trs[i].querySelectorAll('td');
      for (var c = 0; c < tds.length; c++) {
        cells.push(normalize(tds[c].innerText || tds[c].textContent));
      }
      var preenchida = false;
      for (var p = 0; p < cells.length; p++) {
        if (cells[p]) preenchida = true;
      }
      var tipoLinha = comparable(cells.join(' '));
      if (cells.length >= 4 && preenchida && tipoLinha !== 'hora usuario tipo agendamento observacao') {
        linhas.push({ cells: cells });
      }
    }

    function ehPreAgendada(row) {
      return /pre\s*-?\s*agendada/.test(comparable(row.cells[indexes[2]]));
    }

    var preAgendadas = linhas.filter(ehPreAgendada);
    var outras = linhas.filter(function (row) { return !ehPreAgendada(row); });

    var textoLinhas = ['Hora\tUsuário\tTipo Agendamento\tObservação'];
    var nomesPreAgendadas = [];
    for (var a = 0; a < preAgendadas.length; a++) {
      var cols = [];
      for (var x = 0; x < indexes.length; x++) {
        cols.push(preAgendadas[a].cells[indexes[x]] || '');
      }
      textoLinhas.push(cols.join('\t'));
      var nomePre = normalize(preAgendadas[a].cells[indexes[1]]);
      if (nomePre) nomesPreAgendadas.push(nomePre);
    }

    var colunaF = [];
    for (var o = 0; o < outras.length; o++) {
      var tipo = comparable(outras[o].cells[indexes[2]]);
      if (tipo.indexOf('agendinha') !== -1 || tipo.indexOf('encaixe') !== -1) continue;
      var nome = normalize(outras[o].cells[indexes[1]]);
      if (nome) colunaF.push(nome);
    }

    return {
      date: '',
      texto: textoLinhas.join('\n'),
      colunaF: colunaF,
      nomesPreAgendadas: nomesPreAgendadas,
      erro: ''
    };
  }

  /* ── Agendinha (Supabase) ────────────────────────────────────────────── */

  function supabaseSelect(tabela, query) {
    var url = CFG.supabaseUrl + '/rest/v1/' + tabela + '?' + query;
    return fetch(url, {
      headers: {
        apikey: CFG.supabaseKey,
        Authorization: 'Bearer ' + CFG.supabaseKey,
        Accept: 'application/json'
      }
    }).then(function (resposta) {
      if (!resposta.ok) throw new Error('Supabase ' + resposta.status);
      return resposta.json();
    });
  }

  function extrairObjetivo(custom) {
    if (!custom) return '';
    if (typeof custom === 'string') {
      try { custom = JSON.parse(custom); } catch (e) { return ''; }
    }
    var direto = custom.objetivo_da_consulta;
    if (typeof direto === 'string' && normalize(direto)) return normalize(direto);
    var valores = Object.keys(custom).map(function (chave) { return custom[chave]; });
    for (var i = 0; i < valores.length; i++) {
      if (typeof valores[i] === 'string' && normalize(valores[i])) return normalize(valores[i]);
    }
    return '';
  }

  function montarTextoAgendinha(appointments) {
    var itens = [];
    for (var i = 0; i < appointments.length; i++) {
      var appt = appointments[i];
      var nome = normalize(appt.patient_name);
      if (!nome) continue;
      var objetivo = extrairObjetivo(appt.custom_values);
      var sufixo = objetivo ? ' (' + objetivo + ')' : '';
      var hora = appt.start_time || '';
      var partes = hora.split(':');
      if (partes.length >= 2) {
        itens.push(partes[0] + ':' + partes[1] + ' - ' + nome + sufixo);
      } else {
        itens.push(nome + sufixo);
      }
    }
    if (itens.length === 0) return '(sem agendinha marcada para hoje)';
    return itens.join('\n');
  }

  function extrairNomesAgendinha(texto) {
    var nomes = [];
    var linhas = String(texto || '').split('\n');
    for (var i = 0; i < linhas.length; i++) {
      var linha = normalize(linhas[i]);
      if (!linha || linha.charAt(0) === '(') continue;
      var semHora = linha.replace(/^\d{1,2}:\d{2}\s*-\s*/, '');
      var nome = semHora.replace(/\s*\([^)]*\)\s*$/, '').trim();
      if (nome) nomes.push(nome);
    }
    return nomes;
  }

  function buscarAgendinha(dateIso) {
    var qCalendario =
      'select=id&name=eq.' + encodeURIComponent(CFG.nomeCalendario) + '&limit=1';
    return supabaseSelect('calendars', qCalendario).then(function (data) {
      var id = data && data[0] && data[0].id
        ? String(data[0].id)
        : CFG.calendarIdFallback;
      var qAppointments =
        'select=patient_name,custom_values,start_time' +
        '&calendar_id=eq.' + encodeURIComponent(id) +
        '&appointment_date=eq.' + encodeURIComponent(dateIso) +
        '&status=eq.scheduled' +
        '&order=start_time.asc,created_at.asc';
      return supabaseSelect('appointments', qAppointments);
    }).then(function (data) {
      return montarTextoAgendinha(data || []);
    });
  }

  /* ── UI ──────────────────────────────────────────────────────────────── */

  var CSS = [
    '#' + ID_BACKDROP + ' {',
    '  position: fixed; inset: 0; z-index: 2147483647;',
    '  background: rgba(28, 25, 23, 0.58); backdrop-filter: blur(4px);',
    '  display: flex; align-items: center; justify-content: center; padding: 16px;',
    '  box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
    '}',
    '#' + ID_BACKDROP + ' * { box-sizing: border-box; }',
    '#' + ID_BACKDROP + ' { --fa-bg: #ffffff; --fa-text: #1e1c19; --fa-muted: #6b6760;',
    '  --fa-border: #e2ddd6; --fa-input: #faf9f7; --fa-accent: #b45309;',
    '  --fa-accent-soft: #fff7ed; --fa-danger: #b91c1c; }',
    '@media (prefers-color-scheme: dark) {',
    '  #' + ID_BACKDROP + ' { --fa-bg: #1c1917; --fa-text: #f5f5f4; --fa-muted: #a8a29e;',
    '    --fa-border: #3a352e; --fa-input: #292522; --fa-accent: #fbbf24;',
    '    --fa-accent-soft: rgba(251, 191, 36, 0.1); --fa-danger: #fca5a5; }',
    '}',
    '#' + ID_BACKDROP + ' .fmed-agenda-modal {',
    '  width: 100%; max-width: 780px; max-height: calc(100vh - 32px); overflow: auto;',
    '  background: var(--fa-bg); color: var(--fa-text);',
    '  border: 1px solid var(--fa-border); border-radius: 14px;',
    '  box-shadow: 0 24px 70px rgba(0,0,0,0.28);',
    '}',
    '#' + ID_BACKDROP + ' .fmed-agenda-header {',
    '  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;',
    '  padding: 18px 20px 14px;',
    '}',
    '#' + ID_BACKDROP + ' .fmed-agenda-title { margin: 0 0 4px; font-size: 18px; font-weight: 600; }',
    '#' + ID_BACKDROP + ' .fmed-agenda-sub { font-size: 12px; color: var(--fa-muted); }',
    '#' + ID_BACKDROP + ' .fmed-agenda-close {',
    '  border: 1px solid var(--fa-border); background: transparent; color: var(--fa-muted);',
    '  border-radius: 8px; width: 32px; height: 32px; cursor: pointer; font-size: 15px; line-height: 1;',
    '}',
    '#' + ID_BACKDROP + ' .fmed-agenda-corpo { padding: 18px 20px 20px; display: flex; flex-direction: column; gap: 14px; }',
    '#' + ID_BACKDROP + ' .fmed-agenda-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }',
    '@media (min-width: 640px) {',
    '  #' + ID_BACKDROP + ' .fmed-agenda-grid { grid-template-columns: 1fr 1fr; }',
    '}',
    '#' + ID_BACKDROP + ' .fmed-agenda-campo { display: flex; flex-direction: column; gap: 6px; min-width: 0; }',
    '#' + ID_BACKDROP + ' label, #' + ID_BACKDROP + ' .fmed-agenda-label {',
    '  font-size: 13px; font-weight: 500; color: var(--fa-muted);',
    '}',
    '#' + ID_BACKDROP + ' .fmed-agenda-desp-input {',
    '  width: 100%; height: 40px; padding: 0 12px; border: 1px solid var(--fa-border);',
    '  border-radius: 9px; background: var(--fa-input); color: var(--fa-text);',
    '  font-size: 14px; outline: none; font-family: inherit;',
    '}',
    '#' + ID_BACKDROP + ' .fmed-agenda-desp-input:focus { border-color: var(--fa-accent); }',
    '#' + ID_BACKDROP + ' .fmed-agenda-agendinha {',
    '  width: 100%; min-height: 230px; resize: vertical; padding: 12px;',
    '  border: 1px solid var(--fa-border); border-radius: 9px; background: var(--fa-input);',
    '  color: var(--fa-text); font-size: 13px; line-height: 1.55; outline: none; font-family: inherit;',
    '}',
    '#' + ID_BACKDROP + ' .fmed-agenda-lista {',
    '  border: 1px solid var(--fa-border); border-radius: 9px; overflow: hidden; background: var(--fa-input); min-height: 230px;',
    '}',
    '#' + ID_BACKDROP + ' .fmed-agenda-linha { display: flex; align-items: stretch; }',
    '#' + ID_BACKDROP + ' .fmed-agenda-desp-input { border: none; border-radius: 0; background: transparent; }',
    '#' + ID_BACKDROP + ' .fmed-agenda-btn-linha {',
    '  width: 40px; flex: 0 0 40px; border: none; border-left: 1px solid var(--fa-border);',
    '  background: transparent; color: var(--fa-muted); cursor: pointer; font-size: 18px; line-height: 1;',
    '}',
    '#' + ID_BACKDROP + ' .fmed-agenda-btn-linha:hover { color: var(--fa-accent); background: var(--fa-accent-soft); }',
    '#' + ID_BACKDROP + ' .fmed-agenda-erro { font-size: 12px; color: var(--fa-danger); line-height: 1.5; }',
    '#' + ID_BACKDROP + ' .fmed-agenda-acoes {',
    '  display: flex; align-items: center; justify-content: space-between; gap: 12px;',
    '  padding-top: 4px;',
    '}',
    '#' + ID_BACKDROP + ' .fmed-agenda-contador { font-size: 12px; color: var(--fa-muted); }',
    '#' + ID_BACKDROP + ' .fmed-agenda-icon-btn {',
    '  width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center;',
    '  padding: 0; border: 1px solid var(--fa-border); border-radius: 8px;',
    '  background: var(--fa-input); color: var(--fa-muted); cursor: pointer;',
    '}',
    '#' + ID_BACKDROP + ' .fmed-agenda-icon-btn:disabled { opacity: 0.55; cursor: default; }',
    '#' + ID_BACKDROP + ' .fmed-agenda-loading {',
    '  position: fixed; inset: 0; background: rgba(28,25,23,0.72); color: #fff;',
    '  display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px;',
    '  font-size: 14px; font-weight: 600;',
    '}',
    '#' + ID_BACKDROP + ' .fmed-agenda-spinner {',
    '  width: 34px; height: 34px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.25);',
    '  border-top-color: #fff; animation: fmedAgendaSpin 0.8s linear infinite;',
    '}',
    '@keyframes fmedAgendaSpin { to { transform: rotate(360deg); } }'
  ].join('\n');

  function injetarEstilos() {
    if (document.getElementById(ID_STYLES)) return;
    var st = document.createElement('style');
    st.id = ID_STYLES;
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function garantirBackdrop() {
    injetarEstilos();
    if (!backdropEl || !backdropEl.parentNode) {
      backdropEl = document.createElement('div');
      backdropEl.id = ID_BACKDROP;
      document.documentElement.appendChild(backdropEl);
    }
    return backdropEl;
  }

  function fecharPainel() {
    if (backdropEl && backdropEl.parentNode) backdropEl.parentNode.removeChild(backdropEl);
    backdropEl = null;
    window[NOME_GLOBAL] = {
      rodando: false,
      executar: recarregar,
      recarregar: recarregar,
      preview: previewDemonstracao,
      fechar: fecharPainel
    };
  }

  function renderPainel() {
    var backdrop = garantirBackdrop();
    var dataBr = estado.date.split('-').reverse().join('/');
    var dataLinha = (dataBr || 'data indisponível') + (estado.demo ? ' · demonstração' : '');
    var html = [
      '<div class="fmed-agenda-modal">',
      '  <div class="fmed-agenda-header">',
      '    <div>',
      '      <div class="fmed-agenda-title">Agenda</div>',
      '      <div class="fmed-agenda-sub">' + dataLinha + '</div>',
      '    </div>',
      '    <button type="button" class="fmed-agenda-close" id="fmed-agenda-fechar" title="Fechar" aria-label="Fechar">✕</button>',
      '  </div>',
      '  <div class="fmed-agenda-corpo">',
      '    <div class="fmed-agenda-grid">',
      '      <div class="fmed-agenda-campo">',
      '        <span class="fmed-agenda-label">Agendinha</span>',
      '        <textarea class="fmed-agenda-agendinha" id="fmed-agenda-agendinha" readonly placeholder="carregando a agendinha...">' + estado.agendinha.replace(/</g, '&lt;') + '</textarea>',
      '      </div>',
      '      <div class="fmed-agenda-campo">',
      '        <span class="fmed-agenda-label">Acolhimento/DESP</span>',
      '        <div class="fmed-agenda-lista" id="fmed-agenda-lista"></div>',
      '      </div>',
      '    </div>',
      '    <div class="fmed-agenda-erro" id="fmed-agenda-erro"></div>',
      '    <div class="fmed-agenda-acoes">',
      '      <span class="fmed-agenda-contador" id="fmed-agenda-contador"></span>',
      '      <button type="button" class="fmed-agenda-icon-btn" id="fmed-agenda-imprimir" title="Imprimir" aria-label="Imprimir">',
      '        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>',
      '      </button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');

    backdrop.innerHTML = html;
    var campoAgendinha = document.getElementById('fmed-agenda-agendinha');
    if (campoAgendinha) campoAgendinha.value = estado.agendinha;
    backdrop.querySelector('#fmed-agenda-fechar').addEventListener('click', fecharPainel);
    backdrop.querySelector('#fmed-agenda-imprimir').addEventListener('click', enviarParaPlanilha);

    renderItens();
    atualizarStatus();
  }

  function renderItens() {
    var lista = document.getElementById('fmed-agenda-lista');
    if (!lista) return;
    lista.innerHTML = '';

    for (var i = 0; i < estado.itens.length; i++) {
      (function (indice) {
        var linha = document.createElement('div');
        linha.className = 'fmed-agenda-linha';

        var input = document.createElement('input');
        input.className = 'fmed-agenda-desp-input';
        input.type = 'text';
        input.placeholder = 'acolhimento/DESP';
        input.value = estado.itens[indice];
        input.addEventListener('input', function () {
          estado.itens[indice] = input.value;
        });
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            adicionarItem();
          }
        });

        var remover = document.createElement('button');
        remover.type = 'button';
        remover.className = 'fmed-agenda-btn-linha';
        remover.title = 'Remover';
        remover.setAttribute('aria-label', 'Remover item ' + (indice + 1));
        remover.textContent = '×';
        remover.addEventListener('click', function () {
          if (estado.itens.length === 1) {
            estado.itens[0] = '';
          } else {
            estado.itens.splice(indice, 1);
          }
          renderItens();
          atualizarStatus();
        });

        linha.appendChild(input);
        linha.appendChild(remover);

        if (indice === estado.itens.length - 1 && estado.itens.length < CFG.maxItens) {
          var adicionar = document.createElement('button');
          adicionar.type = 'button';
          adicionar.className = 'fmed-agenda-btn-linha';
          adicionar.title = 'Adicionar';
          adicionar.setAttribute('aria-label', 'Adicionar item');
          adicionar.textContent = '+';
          adicionar.addEventListener('click', adicionarItem);
          linha.appendChild(adicionar);
        }

        lista.appendChild(linha);
      })(i);
    }
  }

  function adicionarItem() {
    if (estado.itens.length >= CFG.maxItens) return;
    estado.itens.push('');
    renderItens();
    atualizarStatus();
    var inputs = document.querySelectorAll('#fmed-agenda-lista .fmed-agenda-desp-input');
    if (inputs.length) inputs[inputs.length - 1].focus();
  }

  function contarPacientes() {
    var vistos = {};
    var total = 0;
    function adicionar(nome) {
      var chave = comparable(nome);
      if (!chave || vistos[chave]) return;
      vistos[chave] = true;
      total++;
    }
    for (var i = 0; i < estado.nomesPreAgendadas.length; i++) adicionar(estado.nomesPreAgendadas[i]);
    for (var j = 0; j < estado.nomesAgendinha.length; j++) adicionar(estado.nomesAgendinha[j]);
    for (var k = 0; k < estado.itens.length; k++) adicionar(estado.itens[k]);
    return total;
  }

  function atualizarStatus() {
    var erro = document.getElementById('fmed-agenda-erro');
    var contador = document.getElementById('fmed-agenda-contador');
    var botao = document.getElementById('fmed-agenda-imprimir');

    if (erro) erro.textContent = estado.erroExtracao || '';
    if (contador) {
      var preAgendados = estado.nomesPreAgendadas.length;
      var agendinhas = estado.nomesAgendinha.length;
      var acolhimentos = estado.itens.filter(function (v) { return normalize(v); }).length;
      contador.textContent =
        preAgendados + ' pré-agendados · ' +
        agendinhas + ' agendinhas · ' +
        acolhimentos + ' acolhimento/DESP = ' +
        contarPacientes() + ' pacientes no dia';
    }
    if (botao) botao.disabled = estado.enviando || !estado.texto;
  }

  function recarregarAgendinha() {
    var campo = document.getElementById('fmed-agenda-agendinha');
    if (estado.demo) {
      if (campo) campo.value = estado.agendinha;
      return Promise.resolve();
    }
    if (campo) campo.value = 'carregando a agendinha...';
    return buscarAgendinha(estado.date).then(function (texto) {
      estado.agendinha = texto;
      estado.nomesAgendinha = extrairNomesAgendinha(texto);
      var el = document.getElementById('fmed-agenda-agendinha');
      if (el) el.value = texto;
    }).catch(function (erro) {
      estado.agendinha = '(não foi possível ler a agendinha)\n' + (erro && erro.message ? erro.message : '');
      estado.nomesAgendinha = [];
      var el = document.getElementById('fmed-agenda-agendinha');
      if (el) el.value = estado.agendinha;
    }).then(function () {
      atualizarStatus();
    });
  }

  function previewDemonstracao() {
    function aplicar(iso) {
      estado.demo = true;
      estado.enviando = false;
      estado.date = iso;
      estado.erroExtracao = '';
      estado.texto = [
        'Hora\tUsuário\tTipo Agendamento\tObservação',
        '13:00\tCEZAR CAMELO PINTO\tPré-Agendada Prog. do Adulto\t',
        '13:30\tMARIA ZELIA PINHEIRO SOUSA\tPré-Agendada Prog. do Hipert./Diabet.\t'
      ].join('\n');
      estado.nomesPreAgendadas = ['CEZAR CAMELO PINTO', 'MARIA ZELIA PINHEIRO SOUSA'];
      estado.itens = ['ANA SILVA', 'JOÃO SOUZA', ''];
      estado.agendinha = '(demonstração)\n09:30 - PACIENTE AGENDINHA (Retorno)';
      estado.nomesAgendinha = ['PACIENTE AGENDINHA'];
      renderPainel();
    }
    return obterDataServidor().then(aplicar).catch(function () { aplicar(''); });
  }

  function recarregar() {
    estado.demo = false;
    var extraido = extrairTabela();
    estado.texto = extraido.texto;
    estado.nomesPreAgendadas = extraido.nomesPreAgendadas;
    estado.erroExtracao = extraido.erro || '';
    estado.itens = extraido.colunaF.length ? extraido.colunaF.slice(0) : [''];
    estado.nomesAgendinha = [];
    estado.agendinha = '';
    return obterDataServidor().then(function (iso) {
      estado.date = iso;
      renderPainel();
      return recarregarAgendinha();
    }).catch(function (erro) {
      estado.date = '';
      estado.erroExtracao = 'Não consegui obter a data do servidor: ' + (erro && erro.message ? erro.message : '');
      estado.agendinha = '(não foi possível ler a agendinha)';
      renderPainel();
      return Promise.resolve();
    });
  }

  /* ── Impressão (mesmo fluxo do agenda_ui) ────────────────────────────── */

  function mostrarCarregando(visivel) {
    var backdrop = document.getElementById(ID_BACKDROP);
    if (!backdrop) return;
    var antigo = backdrop.querySelector('.fmed-agenda-loading');
    if (antigo) antigo.parentNode.removeChild(antigo);
    if (!visivel) return;
    var loading = document.createElement('div');
    loading.className = 'fmed-agenda-loading';
    loading.innerHTML = '<div class="fmed-agenda-spinner"></div><div>Gerando PDF...</div>';
    backdrop.appendChild(loading);
  }

  function abrirPdfVisualizador(urlPdf) {
    var urlVisualizador = 'https://docs.google.com/viewer?url=' + encodeURIComponent(urlPdf) + '&embedded=false';
    var abriu = false;
    var concluiu = false;

    function abrir() {
      if (abriu) return;
      abriu = true;
      window.open(urlVisualizador, '_blank');
    }
    function concluir() {
      if (concluiu) return;
      concluiu = true;
      mostrarCarregando(false);
    }

    fetch(urlPdf, { mode: 'no-cors' }).then(abrir).catch(function () {}).then(concluir);
    window.setTimeout(function () { abrir(); concluir(); }, 8000);
  }

  function enviarParaPlanilha() {
    if (estado.enviando || !estado.texto) return;
    estado.enviando = true;
    atualizarStatus();
    mostrarCarregando(true);

    var colunaF = estado.itens
      .map(function (v) { return normalize(v); })
      .filter(function (v) { return v !== '' && v !== '-'; });

    fetch(CFG.gasUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ texto: estado.texto, colunaF: colunaF })
    }).then(function (resposta) {
      return resposta.json();
    }).then(function (resultado) {
      if (resultado.status === 'sucesso' && resultado.urlPdf) {
        abrirPdfVisualizador(resultado.urlPdf);
      } else {
        throw new Error(resultado.mensagem || 'Erro desconhecido');
      }
    }).catch(function (erro) {
      mostrarCarregando(false);
      var erroEl = document.getElementById('fmed-agenda-erro');
      if (erroEl) erroEl.textContent = 'Erro ao gerar o PDF: ' + (erro && erro.message ? erro.message : 'falha de conexão');
    }).then(function () {
      estado.enviando = false;
      atualizarStatus();
    });
  }

  if (window.__FASTMEDIC_AGENDA_PREVIEW__) {
    previewDemonstracao();
  } else {
    recarregar();
  }
})();
