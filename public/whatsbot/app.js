// Painel da Izza — SPA sem build. Fala com api.php; o bot puxa a config de la a cada minuto.
(function () {
  'use strict';

  var S = { dados: null, loja: null, pagina: 'geral', abaNumeros: 'bloqueado' };
  try { S.loja = localStorage.getItem('wb_loja'); S.pagina = localStorage.getItem('wb_pag') || 'geral'; } catch (e) {}

  var TIPOS = {
    bloqueado: { nome: 'Bot não atende', curto: 'Bloqueados', desc: 'A Izza nunca responde esses números (equipe, fornecedor, parceiro). A conversa fica para a loja.' },
    teste: { nome: 'Atende sempre', curto: 'Teste', desc: 'A Izza atende esses números a qualquer hora, mesmo fora da faixa de atendimento. Use para testar.' },
    sem_teto: { nome: 'Sem limite de uso', curto: 'Sem teto', desc: 'Sem teto de tokens por conversa e por dia. Só para quem testa muito.' },
  };
  var PAPEIS = { operador: 'Operador', gerente: 'Gerente', dono: 'Dono' };
  var PAPEL_DESC = {
    operador: 'pausa o bot e mexe nos números',
    gerente: 'tudo do operador + regras, horário e tempos',
    dono: 'tudo do gerente + faixa de atendimento e equipe',
  };

  // ------------------------------------------------------------- utilidades
  function $(s, el) { return (el || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmtNum(n) {
    n = String(n || '');
    var m = n.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
    return m ? '(' + m[1] + ') ' + m[2] + '-' + m[3] : n;
  }
  function fmtHora(dec) {
    if (dec == null) return '';
    var h = Math.floor(dec), m = Math.round((dec - h) * 60);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  function fmtFecha(dec) { return dec >= 24 ? '23:59' : fmtHora(dec); }
  function fmtHoraCurta(dec) { var h = Math.floor(dec), m = Math.round((dec - h) * 60); return h + 'h' + (m ? (m < 10 ? '0' : '') + m : ''); }
  function quando(iso) {
    if (!iso) return '';
    var d = new Date(iso), s = (Date.now() - d.getTime()) / 1000;
    if (s < 60) return 'agora';
    if (s < 3600) return 'há ' + Math.floor(s / 60) + ' min';
    if (s < 86400) return 'há ' + Math.floor(s / 3600) + ' h';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function dataHora(iso) { if (!iso) return ''; var d = new Date(iso); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  function quem(email) {
    if (!email) return '';
    var u = (S.dados.equipe || []).filter(function (x) { return x.email === email; })[0];
    if (email === S.dados.eu.email) return 'você';
    return (u && u.nome) ? u.nome.split(' ')[0] : email.split('@')[0];
  }
  function iniciais(nome, email) { var b = (nome || email || '?').trim(); var p = b.split(/\s+/); return ((p[0] || '')[0] + ((p[1] || '')[0] || '')).toUpperCase(); }

  var tToast;
  function toast(msg, err) {
    var t = $('#toast'); t.textContent = msg; t.className = 'toast on' + (err ? ' err' : '');
    clearTimeout(tToast); tToast = setTimeout(function () { t.className = 'toast' + (err ? ' err' : ''); }, 2800);
  }

  function api(acao, corpo) {
    var op = { credentials: 'same-origin', headers: { 'X-WB': '1' } };
    if (corpo) { op.method = 'POST'; op.headers['Content-Type'] = 'application/json'; op.body = JSON.stringify(corpo); }
    return fetch('api.php?a=' + acao, op).then(function (r) {
      return r.json().catch(function () { return { ok: false, err: 'HTTP ' + r.status }; }).then(function (j) {
        if (r.status === 401) { location.reload(); throw new Error('sessão'); }
        if (!j.ok) throw new Error(j.err || 'erro');
        return j;
      });
    });
  }
  function salvar(acao, corpo, msgOk) {
    return api(acao, corpo).then(function (j) { if (msgOk) toast(msgOk); return carregar().then(function () { return j; }); })
      .catch(function (e) { toast(e.message, true); throw e; });
  }

  function loja() { return (S.dados.lojas || []).filter(function (l) { return l.id === S.loja; })[0]; }

  // ------------------------------------------------------------- carregar
  function carregar() {
    return api('estado').then(function (j) {
      S.dados = j;
      if (!loja() && j.lojas.length) S.loja = j.lojas[0].id;
      desenhar();
    });
  }

  // ------------------------------------------------------------- casca
  function paginas() {
    var l = loja(), p = [
      { id: 'geral', ic: '◉', nome: 'Visão geral' },
      { id: 'numeros', ic: '☎', nome: 'Números', cont: l ? l.config.numeros.length : 0 },
      { id: 'regras', ic: '✎', nome: 'Regras', cont: l ? l.config.regras.filter(function (r) { return r.ativa; }).length : 0 },
      { id: 'funcionamento', ic: '◷', nome: 'Funcionamento' },
    ];
    if (l && l.pode.equipe) p.push({ id: 'equipe', ic: '☺', nome: 'Equipe' });
    p.push({ id: 'historico', ic: '≡', nome: 'Histórico' });
    if (S.dados.eu.superadmin) p.push({ id: 'lojas', ic: '⌂', nome: 'Lojas' });
    return p;
  }

  function desenhar() {
    var d = S.dados, eu = d.eu;
    var sel = $('#loja');
    sel.innerHTML = d.lojas.map(function (l) { return '<option value="' + esc(l.id) + '"' + (l.id === S.loja ? ' selected' : '') + '>' + esc(l.nome) + '</option>'; }).join('');
    var u = (d.equipe || []).filter(function (x) { return x.email === eu.email; })[0];
    var foto = u && u.foto ? '<img src="' + esc(u.foto) + '" alt="" referrerpolicy="no-referrer">' : '<span class="avatar">' + esc(iniciais(eu.nome, eu.email)) + '</span>';
    $('#user').innerHTML = foto + '<span class="nome">' + esc(eu.nome || eu.email) + '</span><button class="btn sm" id="sair">Sair</button>';
    $('#sair').onclick = sair;

    var ps = paginas();
    if (!ps.some(function (p) { return p.id === S.pagina; })) S.pagina = 'geral';
    $('#nav').innerHTML = ps.map(function (p) {
      return '<button class="nav-item' + (p.id === S.pagina ? ' ativo' : '') + '" data-p="' + p.id + '"><span class="ic">' + p.ic + '</span>' + esc(p.nome) + (p.cont ? '<span class="cont">' + p.cont + '</span>' : '') + '</button>';
    }).join('');
    var l = loja();
    $('#side-foot').innerHTML = l ? 'Seu papel aqui: <b>' + esc(eu.superadmin ? 'Administrador geral' : PAPEIS[l.papel]) + '</b>' : '';

    var c = $('#content');
    if (!l && S.pagina !== 'lojas') { c.innerHTML = '<div class="card vazio">Nenhuma loja ainda.' + (eu.superadmin ? ' Cadastre a primeira em <b>Lojas</b>.' : '') + '</div>'; return; }
    ({ geral: pgGeral, numeros: pgNumeros, regras: pgRegras, funcionamento: pgFuncionamento, equipe: pgEquipe, historico: pgHistorico, lojas: pgLojas })[S.pagina](c, l);
  }

  function ir(p) {
    S.pagina = p; try { localStorage.setItem('wb_pag', p); } catch (e) {}
    fecharMenu(); desenhar(); window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------- status do bot
  function statusBot(l) {
    var st = l.status, c = l.config;
    var r = { online: false, rot: 'Sem sinal', cls: 'err', sub: 'O bot ainda não falou com o painel.' };
    if (st && st.recebidoEm) {
      var idade = (Date.now() - new Date(st.recebidoEm).getTime()) / 1000;
      r.online = idade < 180;
      if (!r.online) { r.rot = 'Sem sinal'; r.cls = 'err'; r.sub = 'Último sinal ' + quando(st.recebidoEm) + '. PC desligado ou processo parado.'; }
      else if (st.whatsapp === false) { r.rot = 'WhatsApp desconectado'; r.cls = 'warn'; r.sub = 'O processo está no ar, mas sem conexão com o celular da loja.'; }
      else { r.rot = 'No ar'; r.cls = 'ok'; r.sub = 'Último sinal ' + quando(st.recebidoEm) + '.'; }
    }
    var pausaLoja = st && st.pausaLoja;
    r.pausado = !!(c.pausa.ligado || pausaLoja);
    r.pausaLoja = pausaLoja;
    return r;
  }

  function descEscopo(e) {
    if (e.modo === 'todos') return 'Atende todo cliente, a qualquer hora';
    if (e.modo === 'faixa') return 'Atende todo cliente das ' + e.de + 'h às ' + e.ate + 'h; fora disso só os números de teste';
    return 'Só os números de teste (fase de testes)';
  }
  function descHorario(c) {
    if (!c.horario) return 'Aceita pedido 24 h';
    return fmtHoraCurta(c.horario.abre) + ' às ' + fmtHoraCurta(c.horario.fecha);
  }

  // ------------------------------------------------------------- Visão geral
  function pgGeral(el, l) {
    var c = l.config, b = statusBot(l);
    var conta = function (t) { return c.numeros.filter(function (n) { return n.tipo === t; }).length; };
    var pausaTxt = c.pausa.ligado
      ? 'Pausado pelo painel por ' + esc(quem(c.pausa.por)) + ' ' + quando(c.pausa.em) + (c.pausa.motivo ? ' — “' + esc(c.pausa.motivo) + '”' : '')
      : b.pausaLoja ? 'Pausado pelo WhatsApp da loja (/pararbot) ' + quando(b.pausaLoja.desde) + '. Para voltar, a loja manda /iniciarbot.' : '';
    var logs = S.dados.log.filter(function (r) { return r.loja === l.id; }).slice(0, 6);

    el.innerHTML =
      '<div class="page-head"><div><h1>' + esc(l.nome) + '</h1><p>' + esc(l.telefone || '') + (l.ativo ? '' : ' · <b>loja desativada</b>') + '</p></div>' +
      (l.pode.pausar ? '<button class="btn ' + (c.pausa.ligado ? 'pri' : 'perigo') + '" id="bt-pausa">' + (c.pausa.ligado ? '▶ Religar a Izza' : '❚❚ Pausar a Izza') + '</button>' : '') + '</div>' +
      (b.pausado ? '<div class="aviso err"><b>A Izza está pausada.</b> Ela não responde nenhum cliente. ' + pausaTxt + '</div>' : '') +
      '<div class="grid">' +
        stat('Bot', '<span class="badge ' + b.cls + '"><span class="dot"></span>' + b.rot + '</span>', b.sub) +
        stat('Atendimento', b.pausado ? '<span class="badge err">Pausado</span>' : '<span class="badge ok">Ativo</span>', descEscopo(c.escopo)) +
        stat('Horário da loja', esc(descHorario(c)), 'Entrega ' + esc(c.tempoEntrega) + ' · retirada ' + esc(c.tempoRetirada)) +
        stat('Números', conta('bloqueado') + ' <span class="muted small">bloqueados</span>', conta('teste') + ' de teste · ' + conta('sem_teto') + ' sem teto') +
      '</div>' +
      '<div class="grid-2">' +
        '<div class="card"><h2>Atalhos</h2><p class="desc">O que mais se faz por aqui.</p><div class="stack">' +
          (l.pode.numeros ? '<button class="btn" data-ir="numeros" data-novo="bloqueado">+ Bloquear um número</button>' : '') +
          (l.pode.regras ? '<button class="btn" data-ir="regras" data-novo="1">+ Nova regra para a Izza</button>' : '') +
          '<button class="btn" data-ir="funcionamento">Horário e faixa de atendimento</button>' +
        '</div></div>' +
        '<div class="card"><h2>Últimas mudanças</h2><p class="desc">Quem mexeu em quê nesta loja.</p>' +
          (logs.length ? logs.map(itemLog).join('') : '<div class="vazio">Nada ainda.</div>') +
          (logs.length ? '<div class="acoes"><button class="btn link" data-ir="historico">Ver tudo</button></div>' : '') +
        '</div>' +
      '</div>' +
      '<p class="muted small">O bot lê esta configuração a cada minuto. Mudança feita aqui vale em até 1 min. ' +
      (l.config.atualizadoEm ? 'Última mudança: ' + dataHora(l.config.atualizadoEm) + '.' : '') +
      (l.status && l.status.configEm ? ' Bot sincronizou ' + quando(l.status.configEm) + '.' : '') + '</p>';

    var bp = $('#bt-pausa', el);
    if (bp) bp.onclick = function () {
      if (c.pausa.ligado) return salvar('pausa', { loja: l.id, ligado: false }, 'Izza religada. Vale em até 1 min.');
      modal('<h3>Pausar a Izza na ' + esc(l.nome) + '?</h3><p class="muted">Ela para de responder todos os clientes até alguém religar aqui. As conversas ficam para a equipe da loja.</p>' +
        '<label class="campo"><span>Motivo (opcional)</span><input type="text" id="m-motivo" maxlength="200" placeholder="Ex.: sistema da loja fora do ar"></label>' +
        '<div class="acoes"><button class="btn" data-fecha>Cancelar</button><button class="btn perigo" id="m-ok">Pausar</button></div>', function (m) {
          $('#m-ok', m).onclick = function () { salvar('pausa', { loja: l.id, ligado: true, motivo: $('#m-motivo', m).value }, 'Izza pausada. Vale em até 1 min.').then(fecharModal); };
        });
    };
    ligaAtalhos(el);
  }
  function stat(rot, val, sub) { return '<div class="card stat"><div class="rot">' + rot + '</div><div class="val">' + val + '</div><div class="sub">' + (sub || '') + '</div></div>'; }
  function ligaAtalhos(el) {
    el.querySelectorAll('[data-ir]').forEach(function (b) {
      b.onclick = function () {
        var novo = b.getAttribute('data-novo');
        if (b.getAttribute('data-ir') === 'numeros' && novo) S.abaNumeros = novo;
        ir(b.getAttribute('data-ir'));
        if (novo) setTimeout(function () { var x = $('#bt-novo'); if (x) x.click(); }, 50);
      };
    });
  }

  // ------------------------------------------------------------- Números
  function pgNumeros(el, l) {
    var aba = S.abaNumeros, t = TIPOS[aba];
    var lista = l.config.numeros.filter(function (n) { return n.tipo === aba; });
    el.innerHTML =
      '<div class="page-head"><div><h1>Números</h1><p>Quem a Izza ignora, quem ela atende sempre e quem não tem limite.</p></div>' +
      (l.pode.numeros ? '<button class="btn pri" id="bt-novo">+ Adicionar número</button>' : '') + '</div>' +
      '<div class="card"><div class="tabs">' + Object.keys(TIPOS).map(function (k) {
        var n = l.config.numeros.filter(function (x) { return x.tipo === k; }).length;
        return '<button data-aba="' + k + '" class="' + (k === aba ? 'on' : '') + '">' + TIPOS[k].nome + ' <span class="muted">' + n + '</span></button>';
      }).join('') + '</div>' +
      '<div class="linha" style="justify-content:space-between;margin-bottom:8px"><p class="desc" style="margin:0;flex:1;min-width:200px">' + t.desc + '</p>' +
      (lista.length > 6 ? '<input type="text" class="busca" id="busca" placeholder="Buscar nome ou número">' : '') + '</div>' +
      '<div class="tabela-wrap"><table><thead><tr><th>Número</th><th>Nome</th><th class="hide-m">Observação</th><th class="hide-m">Incluído</th><th></th></tr></thead><tbody id="tb"></tbody></table></div>' +
      '</div>';

    function linhas(filtro) {
      var f = (filtro || '').toLowerCase().replace(/\D/g, '') || (filtro || '').toLowerCase();
      var ls = lista.filter(function (n) { return !filtro || n.numero.indexOf(f) >= 0 || (n.nome || '').toLowerCase().indexOf(filtro.toLowerCase()) >= 0; });
      $('#tb', el).innerHTML = ls.length ? ls.map(function (n) {
        return '<tr><td class="num">' + esc(fmtNum(n.numero)) + '</td><td>' + esc(n.nome || '—') + '</td><td class="hide-m muted">' + esc(n.obs || '') + '</td>' +
          '<td class="hide-m muted small">' + esc(quem(n.por)) + ' · ' + esc(dataHora(n.em)) + '</td>' +
          '<td class="fim">' + (l.pode.numeros ? '<button class="btn link" data-ed="' + n.id + '">Editar</button><button class="btn link perigo" data-del="' + n.id + '">Remover</button>' : '') + '</td></tr>';
      }).join('') : '<tr><td colspan="5"><div class="vazio">Nenhum número aqui.</div></td></tr>';
      el.querySelectorAll('[data-ed]').forEach(function (b) { b.onclick = function () { formNumero(l, lista.filter(function (n) { return n.id === b.getAttribute('data-ed'); })[0]); }; });
      el.querySelectorAll('[data-del]').forEach(function (b) {
        b.onclick = function () {
          var n = lista.filter(function (x) { return x.id === b.getAttribute('data-del'); })[0];
          confirma('Remover ' + fmtNum(n.numero) + (n.nome ? ' (' + n.nome + ')' : '') + ' de “' + t.nome + '”?', 'Remover', function () {
            return salvar('numero_del', { loja: l.id, id: n.id }, 'Removido.');
          });
        };
      });
    }
    linhas('');
    el.querySelectorAll('[data-aba]').forEach(function (b) { b.onclick = function () { S.abaNumeros = b.getAttribute('data-aba'); desenhar(); }; });
    var bu = $('#busca', el); if (bu) bu.oninput = function () { linhas(bu.value.trim()); };
    var bn = $('#bt-novo', el); if (bn) bn.onclick = function () { formNumero(l, null); };
  }

  function formNumero(l, n) {
    var tipo = n ? n.tipo : S.abaNumeros;
    modal('<h3>' + (n ? 'Editar número' : 'Adicionar número') + '</h3>' +
      '<label class="campo"><span>Número com DDD</span><input type="tel" id="f-num" placeholder="51 99999-9999" value="' + esc(n ? fmtNum(n.numero) : '') + '"></label>' +
      '<label class="campo"><span>Nome</span><input type="text" id="f-nome" maxlength="80" placeholder="Ex.: Sergio (gerente)" value="' + esc(n ? n.nome : '') + '"></label>' +
      '<div class="campo"><span>Lista</span><div class="stack">' + Object.keys(TIPOS).map(function (k) {
        return '<label class="radio-card' + (k === tipo ? ' on' : '') + '"><input type="radio" name="f-tipo" value="' + k + '"' + (k === tipo ? ' checked' : '') + '><span><b>' + TIPOS[k].nome + '</b><div>' + TIPOS[k].desc + '</div></span></label>';
      }).join('') + '</div></div>' +
      '<label class="campo"><span>Observação (opcional)</span><input type="text" id="f-obs" maxlength="200" value="' + esc(n ? n.obs : '') + '"></label>' +
      '<div class="acoes"><button class="btn" data-fecha>Cancelar</button><button class="btn pri" id="f-ok">Salvar</button></div>', function (m) {
        m.querySelectorAll('input[name=f-tipo]').forEach(function (r) { r.onchange = function () { m.querySelectorAll('.radio-card').forEach(function (c) { c.classList.toggle('on', c.querySelector('input').checked); }); }; });
        $('#f-num', m).focus();
        $('#f-ok', m).onclick = function () {
          var tp = m.querySelector('input[name=f-tipo]:checked').value;
          salvar('numero', { loja: l.id, id: n ? n.id : '', numero: $('#f-num', m).value, nome: $('#f-nome', m).value, obs: $('#f-obs', m).value, tipo: tp }, 'Salvo. Vale em até 1 min.')
            .then(function () { S.abaNumeros = tp; fecharModal(); desenhar(); });
        };
      });
  }

  // ------------------------------------------------------------- Regras
  function pgRegras(el, l) {
    var rs = l.config.regras, usados = rs.filter(function (r) { return r.ativa; }).reduce(function (s, r) { return s + r.texto.length; }, 0);
    el.innerHTML =
      '<div class="page-head"><div><h1>Regras</h1><p>Instruções da loja que a Izza segue em toda conversa, além das regras fixas da casa.</p></div>' +
      (l.pode.regras ? '<button class="btn pri" id="bt-novo">+ Nova regra</button>' : '') + '</div>' +
      '<div class="aviso">Regra ativa vai direto para o comportamento da Izza em todas as conversas. Escreva curto e concreto (“Não aceitamos pedido para a Zona Sul”). ' +
      'Deixe como rascunho enquanto não tiver certeza. Preço, cardápio e taxa <b>não</b> se mudam aqui: vêm da planilha e do sistema da loja.</div>' +
      '<div class="card"><div class="linha" style="justify-content:space-between"><div><h2>' + rs.length + ' regra' + (rs.length === 1 ? '' : 's') + '</h2>' +
      '<p class="desc" style="margin:0">' + usados + ' de 1.500 caracteres ativos</p><div class="medidor" style="width:220px"><i style="width:' + Math.min(100, usados / 15) + '%"></i></div></div></div>' +
      '<div class="stack" style="margin-top:16px">' + (rs.length ? rs.map(function (r) {
        return '<div class="regra' + (r.ativa ? '' : ' off') + '">' +
          (l.pode.regras ? '<label class="toggle" title="Ativa"><input type="checkbox" data-tg="' + r.id + '"' + (r.ativa ? ' checked' : '') + '><span></span></label>' : '') +
          '<div style="flex:1"><div class="txt">' + esc(r.texto) + '</div><div class="meta">' + (r.ativa ? '<span class="badge ok">Ativa</span>' : '<span class="badge">Rascunho</span>') +
          ' &nbsp;' + esc(quem(r.editadoPor || r.por)) + ' · ' + esc(dataHora(r.editadoEm || r.em)) + '</div></div>' +
          (l.pode.regras ? '<div><button class="btn link" data-ed="' + r.id + '">Editar</button><button class="btn link perigo" data-del="' + r.id + '">Apagar</button></div>' : '') +
          '</div>';
      }).join('') : '<div class="vazio">Nenhuma regra da loja. A Izza segue só as regras da casa.</div>') + '</div></div>';

    var acha = function (id) { return rs.filter(function (r) { return r.id === id; })[0]; };
    el.querySelectorAll('[data-tg]').forEach(function (c) {
      c.onchange = function () { var r = acha(c.getAttribute('data-tg')); salvar('regra', { loja: l.id, id: r.id, texto: r.texto, ativa: c.checked }, c.checked ? 'Regra ativada.' : 'Regra virou rascunho.').catch(function () { c.checked = !c.checked; }); };
    });
    el.querySelectorAll('[data-ed]').forEach(function (b) { b.onclick = function () { formRegra(l, acha(b.getAttribute('data-ed'))); }; });
    el.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { confirma('Apagar esta regra?', 'Apagar', function () { return salvar('regra_del', { loja: l.id, id: b.getAttribute('data-del') }, 'Regra apagada.'); }); }; });
    var bn = $('#bt-novo', el); if (bn) bn.onclick = function () { formRegra(l, null); };
  }

  function formRegra(l, r) {
    modal('<h3>' + (r ? 'Editar regra' : 'Nova regra') + '</h3>' +
      '<label class="campo"><span>O que a Izza deve fazer</span><textarea id="f-txt" maxlength="400" rows="4" placeholder="Ex.: Se o cliente pedir para trocar a borda depois de confirmado, diga que vai passar para a atendente.">' + esc(r ? r.texto : '') + '</textarea></label>' +
      '<div class="muted small"><span id="f-cont">0</span>/400</div>' +
      '<label class="linha" style="align-items:center;gap:10px"><span class="toggle"><input type="checkbox" id="f-at"' + (r && r.ativa ? ' checked' : '') + '><span></span></span><span>Ativa (vale nas conversas em até 1 min)</span></label>' +
      '<div class="acoes"><button class="btn" data-fecha>Cancelar</button><button class="btn pri" id="f-ok">Salvar</button></div>', function (m) {
        var tx = $('#f-txt', m), ct = $('#f-cont', m);
        tx.oninput = function () { ct.textContent = tx.value.length; }; tx.oninput(); tx.focus();
        $('#f-ok', m).onclick = function () { salvar('regra', { loja: l.id, id: r ? r.id : '', texto: tx.value, ativa: $('#f-at', m).checked }, 'Regra salva.').then(fecharModal); };
      });
  }

  // ------------------------------------------------------------- Funcionamento
  function pgFuncionamento(el, l) {
    var c = l.config, e = c.escopo, ph = l.pode.horario, pe = l.pode.escopo;
    var dis = function (p) { return p ? '' : ' disabled'; };
    var horas = ''; for (var i = 0; i < 24; i++) horas += '<option value="' + i + '">' + i + 'h</option>';
    el.innerHTML =
      '<div class="page-head"><div><h1>Funcionamento</h1><p>Quando a Izza atende, o horário que ela informa e os tempos que promete.</p></div></div>' +
      '<div class="grid-2">' +
      '<div class="card"><h2>Faixa de atendimento</h2><p class="desc">Para quem a Izza responde.' + (pe ? '' : ' Só o dono muda.') + '</p><div class="stack" id="esc">' +
        [['lista', 'Só números de teste', 'Fase de testes: clientes não recebem resposta, a loja atende normalmente.'],
         ['faixa', 'Todo cliente numa faixa do dia', 'Fora da faixa, só os números de teste.'],
         ['todos', 'Todo cliente, a qualquer hora', 'Produção plena.']].map(function (o) {
          return '<label class="radio-card' + (e.modo === o[0] ? ' on' : '') + '"><input type="radio" name="esc" value="' + o[0] + '"' + (e.modo === o[0] ? ' checked' : '') + dis(pe) + '><span><b>' + o[1] + '</b><div>' + o[2] + '</div></span></label>';
        }).join('') + '</div>' +
        '<div class="linha" id="faixa" style="margin-top:12px"><label class="campo"><span>Das</span><select id="e-de"' + dis(pe) + '>' + horas + '</select></label><label class="campo"><span>Até</span><select id="e-ate"' + dis(pe) + '>' + horas + '</select></label></div>' +
        '<label class="campo" style="margin-top:12px"><span>Quem está fora da faixa</span><select id="e-fora"' + dis(pe) + '><option value="silencio">Fica sem resposta (a loja atende)</option><option value="aviso">Recebe “número em testes, fale com a loja”</option></select></label>' +
        (pe ? '<div class="acoes"><button class="btn pri" id="sv-esc">Salvar faixa</button></div>' : '') +
      '</div>' +
      '<div class="card"><h2>Horário da loja</h2><p class="desc">Fora do horário a Izza continua conversando, mas o pedido fica agendado para a abertura.' + (ph ? '' : ' Só gerente ou dono muda.') + '</p>' +
        '<label class="linha" style="align-items:center;gap:10px;margin-bottom:12px"><span class="toggle"><input type="checkbox" id="h-24"' + (!c.horario ? ' checked' : '') + dis(ph) + '><span></span></span><span>Aceitar pedido 24 h (vai direto para a loja aprovar)</span></label>' +
        '<div class="linha" id="h-faixa"><label class="campo"><span>Abre</span><input type="time" id="h-abre" value="' + fmtHora(c.horario ? c.horario.abre : 18) + '"' + dis(ph) + '></label><label class="campo"><span>Fecha</span><input type="time" id="h-fecha" value="' + fmtFecha(c.horario ? c.horario.fecha : 24) + '"' + dis(ph) + '></label></div>' +
        '<label class="linha" style="align-items:center;gap:10px;margin:16px 0 12px"><span class="toggle"><input type="checkbox" id="hc-on"' + (c.horarioCliente ? ' checked' : '') + dis(ph) + '><span></span></span><span>Informar ao cliente um horário diferente</span></label>' +
        '<div class="linha" id="hc-faixa"><label class="campo"><span>Abre (para o cliente)</span><input type="time" id="hc-abre" value="' + fmtHora(c.horarioCliente ? c.horarioCliente.abre : 18) + '"' + dis(ph) + '></label><label class="campo"><span>Fecha</span><input type="time" id="hc-fecha" value="' + fmtFecha(c.horarioCliente ? c.horarioCliente.fecha : 24) + '"' + dis(ph) + '></label></div>' +
        '<div class="linha" style="margin-top:16px"><label class="campo"><span>Tempo de entrega</span><input type="text" id="t-ent" maxlength="60" value="' + esc(c.tempoEntrega) + '"' + dis(ph) + '></label><label class="campo"><span>Tempo de retirada</span><input type="text" id="t-ret" maxlength="60" value="' + esc(c.tempoRetirada) + '"' + dis(ph) + '></label></div>' +
        '<p class="muted small" style="margin-top:6px">Escreva como a Izza fala: “de 40 a 60 minutos”. 23:59 vale como meia-noite.</p>' +
        (ph ? '<div class="acoes"><button class="btn pri" id="sv-hor">Salvar horário</button></div>' : '') +
      '</div></div>';

    $('#e-de', el).value = e.de; $('#e-ate', el).value = e.ate; $('#e-fora', el).value = c.foraDaLista;
    var mostra = function () {
      var m = el.querySelector('input[name=esc]:checked').value;
      $('#faixa', el).style.display = m === 'faixa' ? '' : 'none';
      el.querySelectorAll('#esc .radio-card').forEach(function (rc) { rc.classList.toggle('on', rc.querySelector('input').checked); });
      $('#h-faixa', el).style.display = $('#h-24', el).checked ? 'none' : '';
      $('#hc-faixa', el).style.display = $('#hc-on', el).checked ? '' : 'none';
    };
    el.querySelectorAll('input[name=esc], #h-24, #hc-on').forEach(function (i) { i.onchange = mostra; }); mostra();

    var hora = function (v) { return v === '23:59' ? '24:00' : v; };
    var sv1 = $('#sv-esc', el);
    if (sv1) sv1.onclick = function () {
      var m = el.querySelector('input[name=esc]:checked').value;
      var go = function () { return salvar('config', { loja: l.id, escopo: { modo: m, de: +$('#e-de', el).value, ate: +$('#e-ate', el).value }, foraDaLista: $('#e-fora', el).value }, 'Faixa salva. Vale em até 1 min.'); };
      if (m === 'todos' && e.modo !== 'todos') confirma('A Izza vai responder TODO cliente, a qualquer hora. Confirmar?', 'Confirmar', go); else go();
    };
    var sv2 = $('#sv-hor', el);
    if (sv2) sv2.onclick = function () {
      salvar('config', {
        loja: l.id,
        horario: $('#h-24', el).checked ? null : { abre: $('#h-abre', el).value, fecha: hora($('#h-fecha', el).value) },
        horarioCliente: $('#hc-on', el).checked ? { abre: $('#hc-abre', el).value, fecha: hora($('#hc-fecha', el).value) } : null,
        tempoEntrega: $('#t-ent', el).value, tempoRetirada: $('#t-ret', el).value,
      }, 'Horário salvo. Vale em até 1 min.');
    };
  }

  // ------------------------------------------------------------- Equipe
  function pgEquipe(el, l) {
    var eu = S.dados.eu, lojas = S.dados.lojas.filter(function (x) { return x.pode.equipe; });
    var eq = S.dados.equipe.filter(function (u) { return u.superadmin || Object.keys(u.lojas).length; });
    el.innerHTML =
      '<div class="page-head"><div><h1>Equipe</h1><p>Quem entra no painel e o que pode fazer em cada loja. A mesma pessoa pode ter papéis diferentes em lojas diferentes.</p></div>' +
      '<button class="btn pri" id="bt-novo">+ Adicionar pessoa</button></div>' +
      '<div class="card"><div class="tabela-wrap"><table><thead><tr><th>Pessoa</th>' + lojas.map(function (x) { return '<th>' + esc(x.nome) + '</th>'; }).join('') + '<th class="hide-m">Último acesso</th><th></th></tr></thead><tbody>' +
      eq.map(function (u) {
        var av = u.foto ? '<img class="avatar" src="' + esc(u.foto) + '" alt="" referrerpolicy="no-referrer">' : '<span class="avatar">' + esc(iniciais(u.nome, u.email)) + '</span>';
        return '<tr><td><div class="linha" style="gap:10px;align-items:center;flex-wrap:nowrap">' + av + '<div><div>' + esc(u.nome || '—') + '</div><div class="muted small">' + esc(u.email) + '</div></div></div></td>' +
          lojas.map(function (x) { var p = u.superadmin ? 'admin' : u.lojas[x.id]; return '<td>' + (p === 'admin' ? '<span class="badge acc">Admin geral</span>' : p ? '<span class="badge' + (p === 'dono' ? ' acc' : '') + '">' + PAPEIS[p] + '</span>' : '<span class="muted">—</span>') + '</td>'; }).join('') +
          '<td class="hide-m muted small">' + esc(u.ultimoAcesso ? quando(u.ultimoAcesso) : 'nunca entrou') + '</td>' +
          '<td class="fim">' + (u.superadmin || u.email === eu.email ? '' : '<button class="btn link" data-ed="' + esc(u.email) + '">Editar</button><button class="btn link perigo" data-del="' + esc(u.email) + '">Remover</button>') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="card"><h2>Papéis</h2><div class="stack" style="margin-top:8px">' + Object.keys(PAPEIS).map(function (p) { return '<div><span class="badge' + (p === 'dono' ? ' acc' : '') + '">' + PAPEIS[p] + '</span> <span class="muted small">' + PAPEL_DESC[p] + '</span></div>'; }).join('') + '</div></div>';

    var acha = function (em) { return eq.filter(function (u) { return u.email === em; })[0]; };
    $('#bt-novo', el).onclick = function () { formUsuario(lojas, null); };
    el.querySelectorAll('[data-ed]').forEach(function (b) { b.onclick = function () { formUsuario(lojas, acha(b.getAttribute('data-ed'))); }; });
    el.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function () { var em = b.getAttribute('data-del'); confirma('Tirar o acesso de ' + em + ' às lojas que você administra?', 'Remover', function () { return salvar('usuario_del', { email: em }, 'Acesso removido.'); }); };
    });
  }

  function formUsuario(lojas, u) {
    var eu = S.dados.eu;
    modal('<h3>' + (u ? 'Editar acesso' : 'Adicionar pessoa') + '</h3>' +
      '<label class="campo"><span>E-mail Google</span><input type="email" id="f-em" value="' + esc(u ? u.email : '') + '"' + (u ? ' disabled' : '') + ' placeholder="nome@gmail.com"></label>' +
      '<label class="campo"><span>Nome</span><input type="text" id="f-nome" maxlength="80" value="' + esc(u ? u.nome : '') + '"></label>' +
      lojas.map(function (x) {
        var atual = u ? (u.lojas[x.id] || '') : '';
        var travado = atual === 'dono' && !eu.superadmin;
        return '<label class="campo"><span>' + esc(x.nome) + '</span><select data-loja="' + esc(x.id) + '"' + (travado ? ' disabled' : '') + '><option value="">Sem acesso</option>' +
          Object.keys(PAPEIS).filter(function (p) { return p !== 'dono' || eu.superadmin || atual === 'dono'; }).map(function (p) { return '<option value="' + p + '"' + (p === atual ? ' selected' : '') + '>' + PAPEIS[p] + ' — ' + PAPEL_DESC[p] + '</option>'; }).join('') + '</select></label>';
      }).join('') +
      '<p class="muted small">A pessoa entra em fabiomachado.com.br/whatsbot com essa conta Google.</p>' +
      '<div class="acoes"><button class="btn" data-fecha>Cancelar</button><button class="btn pri" id="f-ok">Salvar</button></div>', function (m) {
        $('#f-ok', m).onclick = function () {
          var ls = {}; m.querySelectorAll('select[data-loja]').forEach(function (s) { if (!s.disabled) ls[s.getAttribute('data-loja')] = s.value; });
          salvar('usuario', { email: u ? u.email : $('#f-em', m).value, nome: $('#f-nome', m).value, lojas: ls }, 'Acesso salvo.').then(fecharModal);
        };
      });
  }

  // ------------------------------------------------------------- Histórico
  function itemLog(r) {
    var nl = (S.dados.lojas.filter(function (x) { return x.id === r.loja; })[0] || {}).nome || r.loja;
    return '<div class="log-item"><div class="quando">' + esc(dataHora(r.em)) + '</div><div><b>' + esc(quem(r.email)) + '</b> ' + esc(r.acao) +
      (S.pagina === 'historico' && S.dados.lojas.length > 1 ? ' <span class="badge">' + esc(nl) + '</span>' : '') +
      (r.detalhe ? '<div class="det">' + esc(r.detalhe) + '</div>' : '') + '</div></div>';
  }
  function pgHistorico(el) {
    var log = S.dados.log;
    el.innerHTML = '<div class="page-head"><div><h1>Histórico</h1><p>As últimas 200 mudanças nas lojas que você vê.</p></div></div>' +
      '<div class="card">' + (log.length ? log.map(itemLog).join('') : '<div class="vazio">Nada ainda.</div>') + '</div>';
  }

  // ------------------------------------------------------------- Lojas (admin geral)
  function pgLojas(el) {
    var ls = S.dados.lojas;
    el.innerHTML = '<div class="page-head"><div><h1>Lojas</h1><p>Cada loja é um número de WhatsApp com a própria Izza. O bot de cada loja se identifica com um token.</p></div>' +
      '<button class="btn pri" id="bt-novo">+ Nova loja</button></div>' +
      '<div class="card"><div class="tabela-wrap"><table><thead><tr><th>Loja</th><th>Id</th><th>Telefone</th><th>Bot</th><th>Token</th><th></th></tr></thead><tbody>' +
      ls.map(function (l) {
        var b = statusBot(l);
        return '<tr><td>' + esc(l.nome) + (l.ativo ? '' : ' <span class="badge">desativada</span>') + '</td><td class="muted">' + esc(l.id) + '</td><td class="num">' + esc(l.telefone) + '</td>' +
          '<td><span class="badge ' + b.cls + '"><span class="dot"></span>' + b.rot + '</span></td><td>' + (l.temToken ? '<span class="badge ok">ok</span>' : '<span class="badge warn">falta</span>') + '</td>' +
          '<td class="fim"><button class="btn link" data-ed="' + esc(l.id) + '">Editar</button><button class="btn link" data-tk="' + esc(l.id) + '">Gerar token</button></td></tr>';
      }).join('') + '</tbody></table></div></div>';
    var acha = function (id) { return ls.filter(function (l) { return l.id === id; })[0]; };
    $('#bt-novo', el).onclick = function () { formLoja(null); };
    el.querySelectorAll('[data-ed]').forEach(function (b) { b.onclick = function () { formLoja(acha(b.getAttribute('data-ed'))); }; });
    el.querySelectorAll('[data-tk]').forEach(function (b) {
      b.onclick = function () {
        var l = acha(b.getAttribute('data-tk'));
        confirma('Gerar token novo para ' + l.nome + '? O token atual para de valer na hora e o bot dessa loja perde a sincronia até receber o novo.', 'Gerar', function () {
          return api('loja_token', { id: l.id }).then(function (j) {
            carregar();
            modal('<h3>Token do bot — ' + esc(l.nome) + '</h3><p class="muted">Copie agora: ele não aparece de novo. No PC do bot, vai em <b>WHATSBOT_PAINEL_TOKEN</b> do .env do perfil da loja.</p><code class="tok">' + esc(j.token) + '</code>' +
              '<div class="acoes"><button class="btn" id="cp">Copiar</button><button class="btn pri" data-fecha>Fechar</button></div>', function (m) {
                $('#cp', m).onclick = function () { navigator.clipboard.writeText(j.token).then(function () { toast('Copiado.'); }); };
              });
          }).catch(function (e) { toast(e.message, true); });
        });
      };
    });
  }
  function formLoja(l) {
    modal('<h3>' + (l ? 'Editar loja' : 'Nova loja') + '</h3>' +
      '<label class="campo"><span>Nome</span><input type="text" id="f-nome" maxlength="80" value="' + esc(l ? l.nome : '') + '"></label>' +
      '<label class="campo"><span>Identificador (sem espaço, não muda depois)</span><input type="text" id="f-id" maxlength="30" value="' + esc(l ? l.id : '') + '"' + (l ? ' disabled' : '') + ' placeholder="ex.: giordanna"></label>' +
      '<label class="campo"><span>Telefone do WhatsApp</span><input type="text" id="f-tel" maxlength="30" value="' + esc(l ? l.telefone : '') + '"></label>' +
      '<label class="linha" style="align-items:center;gap:10px"><span class="toggle"><input type="checkbox" id="f-at"' + (!l || l.ativo ? ' checked' : '') + '><span></span></span><span>Loja ativa</span></label>' +
      (l ? '' : '<p class="muted small">Loja nova nasce no modo mais fechado: só números de teste.</p>') +
      '<div class="acoes"><button class="btn" data-fecha>Cancelar</button><button class="btn pri" id="f-ok">Salvar</button></div>', function (m) {
        $('#f-ok', m).onclick = function () {
          salvar('loja', { id: l ? l.id : $('#f-id', m).value, nome: $('#f-nome', m).value, telefone: $('#f-tel', m).value, ativo: $('#f-at', m).checked }, 'Loja salva.').then(fecharModal);
        };
      });
  }

  // ------------------------------------------------------------- modal
  function modal(html, liga) {
    var f = $('#modal'), m = $('#modal-corpo');
    m.innerHTML = html; f.hidden = false;
    m.querySelectorAll('[data-fecha]').forEach(function (b) { b.onclick = fecharModal; });
    if (liga) liga(m);
  }
  function fecharModal() { $('#modal').hidden = true; $('#modal-corpo').innerHTML = ''; }
  function confirma(txt, botao, acao) {
    modal('<h3>Confirmar</h3><p>' + esc(txt) + '</p><div class="acoes"><button class="btn" data-fecha>Cancelar</button><button class="btn perigo" id="c-ok">' + esc(botao) + '</button></div>', function (m) {
      $('#c-ok', m).onclick = function () { var r = acao(); if (r && r.then) r.then(fecharModal, function () {}); else fecharModal(); };
    });
  }
  $('#modal').addEventListener('click', function (ev) { if (ev.target.id === 'modal') fecharModal(); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') fecharModal(); });

  // ------------------------------------------------------------- casca: eventos
  function fecharMenu() { $('#sidebar').classList.remove('aberta'); $('#overlay').classList.remove('on'); }
  $('#menu-btn').onclick = function () { $('#sidebar').classList.add('aberta'); $('#overlay').classList.add('on'); };
  $('#overlay').onclick = fecharMenu;
  $('#nav').addEventListener('click', function (ev) { var b = ev.target.closest('[data-p]'); if (b) ir(b.getAttribute('data-p')); });
  $('#loja').onchange = function () { S.loja = this.value; try { localStorage.setItem('wb_loja', S.loja); } catch (e) {} desenhar(); };
  $('#tema-btn').onclick = function () {
    var r = document.documentElement, escuro = r.getAttribute('data-theme') === 'dark' || (!r.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    var t = escuro ? 'light' : 'dark'; r.setAttribute('data-theme', t); try { localStorage.setItem('wb_tema', t); } catch (e) {}
  };
  function sair() {
    fetch('auth.php?a=logout', { method: 'POST', credentials: 'same-origin', headers: { 'X-WB': '1' } }).then(function () { location.reload(); });
  }

  carregar().catch(function (e) { $('#content').innerHTML = '<div class="aviso err">Não consegui carregar o painel: ' + esc(e.message) + '</div>'; });
  // status do bot se atualiza sozinho na visão geral (sem atrapalhar quem está editando)
  setInterval(function () { if (S.pagina === 'geral' && $('#modal').hidden && document.visibilityState === 'visible') carregar().catch(function () {}); }, 30000);
})();
