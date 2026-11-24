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
    gerente: 'tudo do operador + horário e tempos',
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
      ligaVivo();
    });
  }

  // ------------------------------------------------------------- casca
  // Menu em grupos. Cada item aparece só para quem tem o papel: operador (dia a dia e números),
  // gerente (+ cardápio, loja e clientes), dono (+ integrações e equipe). Frases fixas, fluxo,
  // instruções e ferramentas (o funcionamento da Izza) ficam só para o administrador geral.
  function paginas() {
    var l = loja(), po = l ? l.pode : {}, adm = S.dados.eu.superadmin;
    var p = [
      { g: 'Dia a dia', id: 'geral', ic: '◉', nome: 'Visão geral', ve: true },
      { g: 'Dia a dia', id: 'quadro', ic: '▦', nome: 'Quadro', ve: true },
      { g: 'Dia a dia', id: 'pedidos', ic: '▤', nome: 'Pedidos', ve: true },
      { g: 'Dia a dia', id: 'alertas', ic: '⚑', nome: 'Alertas', cont: alertasAbertos(l), ve: true },
      { g: 'Dia a dia', id: 'clientes', ic: '☻', nome: 'Clientes', ve: po.clientes },
      { g: 'Dia a dia', id: 'numeros', ic: '☎', nome: 'Números', cont: l ? l.config.numeros.length : 0, ve: po.numeros },
      { g: 'Loja', id: 'tamanhos', ic: '◔', nome: 'Tamanhos e sabores', ve: po.horario },
      { g: 'Loja', id: 'funcionamento', ic: '◷', nome: 'Horários', ve: po.horario },
      { g: 'Loja', id: 'entrega', ic: '⛟', nome: 'Entrega', ve: po.horario },
      { g: 'Loja', id: 'pagamento', ic: '$', nome: 'Pagamento', ve: po.horario },
      { g: 'Loja', id: 'regrasloja', ic: '☑', nome: 'Regras da loja', ve: po.horario },
      { g: 'Loja', id: 'comanda', ic: '⎙', nome: 'Comanda', ve: po.horario },
      { g: 'Loja', id: 'impressoras', ic: '⎘', nome: 'Impressoras', ve: po.horario },
      { g: 'Conta', id: 'integracoes', ic: '⇄', nome: 'Integrações', ve: po.integracoes },
      { g: 'Conta', id: 'equipe', ic: '☺', nome: 'Equipe', ve: po.equipe },
      { g: 'Conta', id: 'historico', ic: '≡', nome: 'Log', ve: true },
      { g: 'Plataforma', id: 'frases', ic: '❝', nome: 'Frases fixas', ve: adm },
      { g: 'Plataforma', id: 'fluxo', ic: '➜', nome: 'Fluxo de atendimento', ve: adm },
      { g: 'Plataforma', id: 'instrucoes', ic: '¶', nome: 'Instruções e regras', ve: adm },
      { g: 'Plataforma', id: 'ferramentas', ic: '⚙', nome: 'Ferramentas', ve: adm },
      { g: 'Plataforma', id: 'lojas', ic: '⌂', nome: 'Lojas', ve: adm },
    ];
    return p.filter(function (x) { return x.ve; });
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
    if (S.pagina === 'ficha') S.pagina = 'regrasloja'; // pagina antiga "Particularidades"
    if (!ps.some(function (p) { return p.id === S.pagina; })) S.pagina = 'geral';
    // Dia a dia fica solto; Loja, Conta e Plataforma moram dentro de "Configurações", que abre em
    // acordeão só com as categorias. As páginas de cada categoria viram abas no topo do conteúdo,
    // como a intranet ("Escala | Escala 5x2 | ..."). Clicar em Configurações abre Loja na primeira
    // aba; clicar numa categoria abre a primeira aba dela (pedido do Fábio, 23/11).
    var botao = function (p) {
      return '<button class="nav-item' + (p.id === S.pagina ? ' ativo' : '') + '" data-p="' + p.id + '"><span class="ic">' + p.ic + '</span>' + esc(p.nome) + (p.cont ? '<span class="cont' + (p.id === 'alertas' ? ' cont-alerta' : '') + '">' + p.cont + '</span>' : '') + '</button>';
    };
    var dia = ps.filter(function (p) { return p.g === 'Dia a dia'; }), cfg = ps.filter(function (p) { return p.g !== 'Dia a dia'; });
    var atual = cfg.filter(function (p) { return p.id === S.pagina; })[0];
    var cfgAberto = atual ? !S.cfgFechado : !!S.cfgAberto;
    var cats = [];
    cfg.forEach(function (p) { if (cats.indexOf(p.g) < 0) cats.push(p.g); });
    var ICS = { Loja: '⌂', Conta: '☺', Plataforma: '◈' };
    $('#nav').innerHTML = '<div class="nav-grupo">Dia a dia</div>' + dia.map(botao).join('') +
      (cfg.length ? '<button class="nav-item nav-cfg' + (atual ? ' dentro' : '') + '" data-cfg="1" aria-expanded="' + (cfgAberto ? 'true' : 'false') + '"><span class="ic">⚙</span>Configurações<span class="seta">' + (cfgAberto ? '▾' : '▸') + '</span></button>' +
        (cfgAberto ? '<div class="nav-sub">' + cats.map(function (g) {
          return '<button class="nav-item sub' + (atual && atual.g === g ? ' ativo' : '') + '" data-cat="' + esc(g) + '"><span class="ic">' + (ICS[g] || '•') + '</span>' + esc(g) + '</button>';
        }).join('') + '</div>' : '') : '');
    poePausaTopo(loja());
    if (typeof marcaContadores === 'function') marcaContadores();
    var l = loja();
    $('#side-foot').innerHTML = l ? 'Seu papel aqui: <b>' + esc(eu.superadmin ? 'Administrador geral' : PAPEIS[l.papel]) + '</b>' : '';

    var c = $('#content');
    // pagina de Configuracoes: cabecalho da categoria com as abas, e a pagina embaixo
    if (atual && (l || S.pagina === 'lojas')) {
      var abas = cfg.filter(function (p) { return p.g === atual.g; });
      c.innerHTML = '<div class="sub-bar"><div class="sub-titulo"><span class="ic">' + (ICS[atual.g] || '⚙') + '</span>' + esc(atual.g) + '</div>' +
        '<div class="sub-abas" role="tablist">' + abas.map(function (p) {
          return '<button type="button" role="tab" class="' + (p.id === S.pagina ? 'on' : '') + '" aria-selected="' + (p.id === S.pagina) + '" data-p="' + p.id + '">' + esc(p.nome) + '</button>';
        }).join('') + '</div></div><div class="sub-conteudo" id="sub-conteudo"></div>';
      c.querySelectorAll('.sub-abas [data-p]').forEach(function (b) { b.onclick = function () { ir(b.getAttribute('data-p')); }; });
      var on = c.querySelector('.sub-abas .on'); if (on && on.scrollIntoView) try { on.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
      c = $('#sub-conteudo');
    }
    if (!l && S.pagina !== 'lojas') { c.innerHTML = '<div class="card vazio">Nenhuma loja ainda.' + (eu.superadmin ? ' Cadastre a primeira em <b>Lojas</b>.' : '') + '</div>'; return; }
    ({ geral: pgGeral, numeros: pgNumeros, regras: pgRegras, funcionamento: pgFuncionamento, fluxo: pgFluxo, frases: pgFrases, pedidos: pgPedidos, quadro: pgQuadro, clientes: pgClientes, alertas: pgAlertas, comanda: pgComanda, impressoras: pgImpressoras, integracoes: pgIntegracoes, entrega: function (c, l) { pgFicha(c, l, 'entrega'); }, pagamento: function (c, l) { pgFicha(c, l, 'pagamento'); }, regrasloja: function (c, l) { pgFicha(c, l, 'regras'); }, tamanhos: function (c, l) { pgFicha(c, l, 'tamanhos'); }, instrucoes: pgInstrucoes, ferramentas: pgFerramentas, equipe: pgEquipe, historico: pgHistorico, lojas: pgLojas })[S.pagina](c, l);
  }

  function ir(p) {
    if (p !== 'quadro') saiQuadro();
    S.cfgFechado = false;
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
      '</div>' +
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
          '<button class="btn" data-ir="pedidos">Ver os pedidos</button>' +
          (l.pode.horario ? '<button class="btn" data-ir="tamanhos">Tamanhos, sabores e preços</button>' : '') +
          (l.pode.horario ? '<button class="btn" data-ir="funcionamento">Horário e faixa de atendimento</button>' : '') +
        '</div></div>' +
        '<div class="card"><h2>Últimas mudanças</h2><p class="desc">Quem mexeu em quê nesta loja.</p>' +
          (logs.length ? logs.map(itemLog).join('') : '<div class="vazio">Nada ainda.</div>') +
          (logs.length ? '<div class="acoes"><button class="btn link" data-ir="historico">Ver tudo</button></div>' : '') +
        '</div>' +
      '</div>' +
      '<p class="muted small">O bot lê esta configuração a cada minuto. Mudança feita aqui vale em até 1 min. ' +
      (l.config.atualizadoEm ? 'Última mudança: ' + dataHora(l.config.atualizadoEm) + '.' : '') +
      (l.status && l.status.configEm ? ' Bot sincronizou ' + quando(l.status.configEm) + '.' : '') + '</p>';

    ligaAtalhos(el);
  }
  // Botao "Pausar a Izza" na barra superior (pedido do Fabio, 23/11): vale para a loja escolhida
  function poePausaTopo(l) {
    var b = $('#bt-pausa');
    if (!l || !l.pode || !l.pode.pausar) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('button'); b.id = 'bt-pausa';
      var tr = $('.top-right'); tr.insertBefore(b, tr.firstChild);
      b.onclick = function () { pedePausa(loja()); };
    }
    var on = !!l.config.pausa.ligado;
    b.className = 'btn sm ' + (on ? 'pri' : 'perigo');
    b.innerHTML = on ? '▶ Religar a Izza' : '❚❚ Pausar a Izza';
    b.title = on ? 'A Izza está pausada pelo painel nesta loja' : 'Para a Izza de responder os clientes desta loja';
  }
  function pedePausa(l) {
    if (!l) return;
    if (l.config.pausa.ligado) return salvar('pausa', { loja: l.id, ligado: false }, 'Izza religada. Vale em até 1 min.');
    modal('<h3>Pausar a Izza na ' + esc(l.nome) + '?</h3><p class="muted">Ela para de responder todos os clientes até alguém religar aqui. As conversas ficam para a equipe da loja.</p>' +
      '<label class="campo"><span>Motivo (opcional)</span><input type="text" id="m-motivo" maxlength="200" placeholder="Ex.: sistema da loja fora do ar"></label>' +
      '<div class="acoes"><button class="btn" data-fecha>Cancelar</button><button class="btn perigo" id="m-ok">Pausar</button></div>', function (m) {
        $('#m-ok', m).onclick = function () { salvar('pausa', { loja: l.id, ligado: true, motivo: $('#m-motivo', m).value }, 'Izza pausada. Vale em até 1 min.').then(fecharModal); };
      });
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

  // ------------------------------------------------------------- Fluxo de atendimento (so leitura)
  // O que o bot faz hoje (ESTADO.md do whatsbot, "Fluxo do pedido"). O cliente nunca
  // responde na ordem: a ordem e o que a Izza pergunta quando ainda falta tudo.
  var FLUXO = [
    ['Saudação e menu', 'Primeira mensagem: “Aqui é a Izza …, vou começar teu atendimento.” e o menu de 3 opções: fazer um pedido, ver o cardápio, falar com um atendente.'],
    ['Nome', 'Só se o sistema não trouxer o cadastro do cliente.'],
    ['Entrega ou retirada', 'Retirada no balcão dispensa endereço e taxa.'],
    ['Endereço', 'Logo depois, antes de tudo. Volta sempre no bloco Rua / Número / Complemento / Bairro pedindo confirmação. Sem endereço confirmado não há resumo.'],
    ['Tamanho', 'Em mensagem própria, só com os tamanhos que a loja tem.'],
    ['Sabores', 'Diz quantos cabem no tamanho. Um sabor por vez, pergunta se vai mais.'],
    ['Borda ou bebida', 'Uma vez: “borda de catupiry ou uma Coca 2L?”. Na Super vira “Fruki normal, zero ou sem bebida?” (cortesia).'],
    ['Observação', 'Uma vez, vale para a pizza e para a entrega (fatiada, sem cebola, avisar quando sair…).'],
    ['Resumo', 'Itens, taxa e total, todos calculados pelo sistema da loja. A taxa não é anunciada antes, só aparece no total.'],
    ['Pagamento', 'Dinheiro pergunta o troco; cartão não pergunta bandeira; Pix manda a chave e a Izza nunca confirma o pagamento.'],
    ['Confirmação', 'O pedido vai para a tela de aprovação da loja; aprovado, entra no sistema, imprime e a Izza informa o tempo.'],
  ];
  var FLUXO_DESVIOS = [
    ['Pedido que já existe', 'Atraso, cupom, item faltando, pedido do app ou site: vai para um atendente com o resumo.'],
    ['Atendente respondeu', 'Se alguém da loja escreveu no celular, a Izza fica muda naquela conversa.'],
    ['Comprovante de Pix', 'Imagem depois da chave fecha o pedido com “PIX A CONFERIR” na comanda; uma pessoa confere no banco.'],
    ['Loja fechada', 'Ela segue conversando; o pedido fica agendado e entra sozinho na abertura (se a loja não estiver em 24 h).'],
    ['Agendamento', 'Aceita horário marcado: “AGENDADO PARA 19:30” sai destacado na comanda.'],
  ];
  function pgFluxo(el) {
    el.innerHTML = '<div class="page-head"><div><h1>Fluxo de atendimento</h1><p>Como a Izza conduz um pedido hoje. Somente visualização.</p></div></div>' +
      '<div class="aviso">O cliente quase nunca responde na ordem: manda tamanho, sabor e endereço juntos. A ordem abaixo é o que a Izza pergunta quando ainda falta tudo, não um roteiro fixo.</div>' +
      '<div class="grid-2"><div class="card"><h2>Passo a passo</h2><p class="desc">Do “oi” ao pedido na tela da loja.</p><ol class="fluxo">' +
      FLUXO.map(function (p, i) { return '<li><span class="n">' + (i + 1) + '</span><div><b>' + esc(p[0]) + '</b><div class="muted small">' + esc(p[1]) + '</div></div></li>'; }).join('') +
      '</ol></div><div class="card"><h2>Desvios</h2><p class="desc">O que muda o caminho.</p><div class="stack">' +
      FLUXO_DESVIOS.map(function (p) { return '<div class="regra off"><div><b>' + esc(p[0]) + '</b><div class="muted small" style="margin-top:2px">' + esc(p[1]) + '</div></div></div>'; }).join('') +
      '</div></div></div>';
  }

  // ------------------------------------------------------------- Frases fixas
  // Catalogo que o bot manda (src/frases.js, junto dos textos padrao): o que ele diz em cada
  // etapa, montado das constantes do codigo, entao acompanha o que esta no ar. Somente visualizacao.
  function pgFrases(el, l) {
    var cat = l.padroes && l.padroes.frases;
    var head = '<div class="page-head"><div><h1>Frases fixas</h1><p>O que a Izza responde em cada etapa, com as variações. Somente visualização.</p></div></div>';
    if (!cat || !cat.frases || !cat.frases.length) { el.innerHTML = head + '<div class="card vazio">O bot desta loja ainda não mandou as frases. Elas chegam quando ele reinicia com a versão nova.</div>'; return; }
    var pag = document.createElement('div'); pag.className = 'pagina'; el.innerHTML = ''; el.appendChild(pag);
    var etapas = cat.etapas || [];
    cat.frases.forEach(function (f) { if (etapas.indexOf(f.etapa) < 0) etapas.push(f.etapa); });
    var filtro = { etapa: '', tipo: '', q: '' };
    var TIPO = { fixa: ['Fixa', 'ok', 'Sai exatamente assim, escrita pelo código.'], prompt: ['Orientada', 'warn', 'O modelo é instruído a usar esta frase; pode variar um pouco.'], dinamica: ['Montada', 'acc', 'Texto fixo com partes que vêm do sistema (nome, preço, cardápio).'] };
    var nT = function (t) { return cat.frases.filter(function (f) { return f.tipo === t; }).length; };
    pag.innerHTML = head +
      '<div class="aviso">Partes entre chaves, como <code>{nome}</code> ou <code>{preco}</code>, são preenchidas na hora com o dado do cliente ou do sistema da loja. ' +
      (l.padroes.recebidoEm ? 'Atualizado pelo bot em ' + esc(dataHora(l.padroes.recebidoEm)) + '.' : '') + '</div>' +
      '<div class="card"><div class="filtros-frase">' +
      '<input id="fq" type="search" placeholder="Buscar frase…">' +
      '<select id="fe"><option value="">Todas as etapas</option>' + etapas.map(function (e) { return '<option>' + esc(e) + '</option>'; }).join('') + '</select>' +
      '<select id="ft"><option value="">Todos os tipos</option>' + Object.keys(TIPO).filter(nT).map(function (k) { return '<option value="' + k + '">' + TIPO[k][0] + ' (' + nT(k) + ')</option>'; }).join('') + '</select>' +
      '</div><p class="muted small" style="margin:10px 0 0">' + Object.keys(TIPO).filter(nT).map(function (k) { return '<span class="badge ' + TIPO[k][1] + '">' + TIPO[k][0] + '</span> ' + esc(TIPO[k][2]); }).join(' &nbsp; ') + '</p></div>' +
      '<div id="flist"></div>';
    function desenha() {
      var q = filtro.q.toLowerCase(), html = '';
      etapas.forEach(function (e, i) {
        if (filtro.etapa && filtro.etapa !== e) return;
        var fs = cat.frases.filter(function (f) {
          if (f.etapa !== e || (filtro.tipo && f.tipo !== filtro.tipo)) return false;
          return !q || [f.texto, f.quando].concat(f.variacoes || []).join(' ').toLowerCase().indexOf(q) >= 0;
        });
        if (!fs.length) return;
        html += '<div class="card"><h2><span class="muted">' + (i + 1) + '.</span> ' + esc(e) + ' <span class="badge">' + fs.length + '</span></h2><div class="stack">' +
          fs.map(function (f) {
            var t = TIPO[f.tipo] || TIPO.fixa;
            return '<div class="frase"><div class="frase-top"><span class="muted small">' + esc(f.quando || '') + '</span><span class="badge ' + t[1] + '">' + t[0] + '</span></div>' +
              '<div class="balao">' + esc(f.texto) + '</div>' +
              ((f.variacoes || []).length ? '<div class="muted small" style="margin:8px 0 4px">Variações</div>' + f.variacoes.map(function (v) { return '<div class="balao var">' + esc(v) + '</div>'; }).join('') : '') +
              '</div>';
          }).join('') + '</div></div>';
      });
      $('#flist', pag).innerHTML = html || '<div class="card vazio">Nenhuma frase com esse filtro.</div>';
    }
    $('#fq', pag).addEventListener('input', function () { filtro.q = this.value; desenha(); });
    $('#fe', pag).addEventListener('change', function () { filtro.etapa = this.value; desenha(); });
    $('#ft', pag).addEventListener('change', function () { filtro.tipo = this.value; desenha(); });
    desenha();
  }

  // ------------------------------------------------------------- Particularidades (ficha da loja)
  // Ficha do negocio, por loja. Nasce preenchida com o que o bot faz HOJE (codigo + cardapio
  // do sistema); o que se marca aqui fica registrado no painel e ainda NAO muda o bot.
  var SIM_NAO = [['sim', 'Sim'], ['nao', 'Não'], ['', 'Não definido']];
  var FICHA_GRUPOS = [
    { titulo: 'Atendimento', itens: [
      { id: 'entrega', rot: 'Faz entrega', t: 'sn', p: 'sim' },
      { id: 'retirada', rot: 'Aceita retirada no balcão', t: 'sn', p: 'sim' },
      { id: 'agendamento', rot: 'Aceita pedido agendado para mais tarde', t: 'sn', p: 'sim' },
      { id: 'nomeAntes', rot: 'Pergunta o nome quando não há cadastro', t: 'sn', p: 'sim' },
      { id: 'enderecoCedo', rot: 'Pede o endereço logo depois de entrega/retirada', t: 'sn', p: 'sim' },
      { id: 'aprovacaoLoja', rot: 'Pedido passa pela aprovação da loja antes de entrar', t: 'sn', p: 'sim' },
      { id: 'pedidoExistente', rot: 'Assunto de pedido já feito vai para um atendente', t: 'sn', p: 'sim' },
    ] },
    { titulo: 'Entrega', itens: [
      { id: 'enderecoLoja', rot: 'Endereço da loja (de onde parte o raio)', t: 'txt', p: 'loja:endereco' },
      { id: 'cidadeLoja', rot: 'Cidade / UF', t: 'txt', p: 'loja:cidade' },
      { id: 'taxaModelo', rot: 'Como se calcula a taxa', t: 'radio', op: [['distancia', 'Por distância'], ['bairro', 'Por bairro'], ['fixa', 'Fixa'], ['gratis', 'Grátis']], p: 'distancia' },
      { id: 'taxaAnuncia', rot: 'Anuncia a taxa antes do resumo', t: 'sn', p: 'nao' },
      { id: 'pedidoMinimo', rot: 'Pedido mínimo (R$)', t: 'num', p: '' },
      { id: 'raioMax', rot: 'Raio máximo de entrega (km)', t: 'num', p: '' },
    ] },
    { titulo: 'Regra de preço', itens: [
      { id: 'regraPreco', rot: 'Preço da pizza com mais de um sabor', t: 'radio', op: [['soma', 'Soma o adicional de cada sabor'], ['maior', 'Cobra o sabor mais caro'], ['medio', 'Média dos adicionais']], p: 'cardapio:regraSabores' },
      { id: 'pequenaRateio', rot: 'Pequena com 2 sabores cobra a média dos dois', t: 'sn', p: 'sim' },
      { id: 'grandeMeio', rot: 'Grande meio a meio tem preço próprio (adicional × 1,5)', t: 'sn', p: 'sim' },
      { id: 'superQuatro', rot: 'Super com 3 sabores cobra os 4 espaços', t: 'sn', p: 'sim' },
      { id: 'doceSalgado', rot: 'Permite meio a meio doce + salgado', t: 'sn', p: '' },
      { id: 'sobPedido', rot: 'Tem sabores feitos só sob pedido', t: 'sn', p: 'cardapio:sobPedido' },
    ] },
    { titulo: 'Borda, adicionais e bebida', itens: [
      { id: 'borda', rot: 'Tem borda recheada', t: 'sn', p: 'cardapio:bordas' },
      { id: 'ofereceBorda', rot: 'Oferece borda ou bebida uma vez no pedido', t: 'sn', p: 'sim' },
      { id: 'adicionalSoPedido', rot: 'Adicional (ex.: mussarela em dobro) só se o cliente pedir', t: 'sn', p: 'sim' },
      { id: 'cortesiaSuper', rot: 'Super ganha refrigerante 2L de cortesia', t: 'sn', p: 'sim' },
      { id: 'cortesiaQual', rot: 'Qual cortesia', t: 'txt', p: 'Fruki 2L ou Fruki Zero 2L (Coca na Super é cobrada)' },
    ] },
    { titulo: 'Pizza', itens: [
      { id: 'fatiada', rot: 'Fatiada', t: 'radio', op: [['sim', 'Vem fatiada'], ['sePedir', 'Não vem; fatia se pedir'], ['nao', 'Não fatia']], p: 'sePedir' },
    ] },
    { titulo: 'Pagamento', itens: [
      { id: 'dinheiro', rot: 'Aceita dinheiro', t: 'sn', p: 'sim' },
      { id: 'trocoPergunta', rot: 'Pergunta o troco', t: 'sn', p: 'sim' },
      { id: 'cartao', rot: 'Oferecer pagamento com cartão de crédito na entrega', t: 'sn', p: 'sim' },
      { id: 'cartaoBandeira', rot: 'Pergunta a bandeira do cartão', t: 'sn', p: 'nao' },
      { id: 'pix', rot: 'Pix antecipado', t: 'sn', p: 'sim' },
      { id: 'pixChave', rot: 'Chave Pix', t: 'txt', p: 'loja:pix' },
      { id: 'pixHumano', rot: 'Comprovante conferido por uma pessoa (a Izza nunca confirma)', t: 'sn', p: 'sim' },
      { id: 'vale', rot: 'Vale-refeição', t: 'sn', p: '' },
      { id: 'cpfNota', rot: 'CPF ou CNPJ na nota', t: 'radio', op: [['nao', 'Não solicitar CPF ou CNPJ na nota'], ['permite', 'Permitir que o cliente peça CPF ou CNPJ na nota'], ['obriga', 'CPF ou CNPJ na nota é obrigatório']], p: '' },
      { id: 'descontoDinheiro', rot: 'Desconto para pagamento em dinheiro (%)', t: 'num', p: '' },
    ] },
  ];
  // Formas de pagamento na entrega. Ícones: folha img/pag-sprite.png do Delivery Direto (24x16 cada,
  // pos = posição na folha); sem pos usa img/pag-generico.png. Vem marcado o que está ligado no
  // Delivery Direto da Dáme em 23/11/2026.
  var FORMAS_PAG = [
    { id: 'alelo', nome: 'Alelo Refeição', sig: 'ALELO', tipo: 'ref', pos: [-120, -16] },
    { id: 'amex', nome: 'American Express', sig: 'AMEX', tipo: 'cred', on: 1, pos: [0, -16] },
    { id: 'aura', nome: 'Aura', sig: 'AURA', tipo: 'cred', pos: [-240, -16] },
    { id: 'banrisul', nome: 'Banrisul', sig: 'BANRI', tipo: 'deb', on: 1, pos: [-168, 0] },
    { id: 'diners', nome: 'Diners', sig: 'DINERS', tipo: 'cred', pos: [-72, 0] },
    { id: 'dinersclub', nome: 'Diners Club', sig: 'DINERS', tipo: 'cred', pos: [-72, 0] },
    { id: 'dinheiro', nome: 'Dinheiro', sig: 'R$', tipo: 'din', on: 1, pos: [0, 0] },
    { id: 'discover', nome: 'Discover', sig: 'DISC', tipo: 'cred', pos: [-144, 0] },
    { id: 'elo', nome: 'Elo', sig: 'ELO', tipo: 'cred', on: 1, pos: [-144, -16] },
    { id: 'greencard', nome: 'Green Card Refeição', sig: 'GREEN', tipo: 'ref', pos: [-168, -16] },
    { id: 'hiper', nome: 'Hiper', sig: 'HIPER', tipo: 'cred', pos: [-264, 0] },
    { id: 'hipercard', nome: 'Hipercard', sig: 'HIPER', tipo: 'cred', on: 1, pos: [-192, 0] },
    { id: 'jcb', nome: 'JCB', sig: 'JCB', tipo: 'cred', pos: [-240, 0] },
    { id: 'maestro', nome: 'M. Maestro (débito)', sig: 'MAEST', tipo: 'deb', on: 1, pos: [-48, -16] },
    { id: 'mastercard', nome: 'Mastercard (crédito)', sig: 'MC', tipo: 'cred', on: 1, pos: [-48, 0] },
    { id: 'redeshop', nome: 'Redeshop', sig: 'REDE', tipo: 'deb', pos: [-72, -16] },
    { id: 'sodexo', nome: 'Sodexo Refeição', sig: 'SODEXO', tipo: 'ref', on: 1, pos: [-120, 0] },
    { id: 'ticket', nome: 'Ticket Restaurante', sig: 'TICKET', tipo: 'ref', on: 1, pos: [-96, -16] },
    { id: 'visa', nome: 'Visa (crédito)', sig: 'VISA', tipo: 'cred', on: 1, pos: [-24, 0] },
    { id: 'visaelectron', nome: 'Visa Electron (débito)', sig: 'ELECT', tipo: 'deb', on: 1, pos: [-24, -16] },
    { id: 'vr', nome: 'VR', sig: 'VR', tipo: 'ref', pos: [-96, 0] },
    { id: 'pixmaquina', nome: 'Pix na Máquina', sig: 'PIX', tipo: 'pix', on: 1 },
  ];
  var CAT_PAG = [['deb', 'Débito'], ['cred', 'Crédito'], ['din', 'Dinheiro'], ['pix', 'Pix'], ['ref', 'Vale-refeição'], ['outro', 'Outras']];
  function pagamentoPadrao(v) {
    var fo = {};
    FORMAS_PAG.forEach(function (x) { if (x.on) fo[x.id] = true; });
    if (v && v.dinheiro === 'nao') delete fo.dinheiro;
    return { formas: fo, outras: [] };
  }
  var PIX_LOJA = { dame: 'pix@damepizza.com.br', lov: 'pix@lovpizza.com.br' };
  // mesmo endereco que a Izza informa (src/roteiro/textos.js do whatsbot)
  var END_LOJA = { dame: 'Rua Carazinho, 443 - Petrópolis', lov: 'Av. Anita Garibaldi, 1593 - Boa Vista' };
  function copiaCardapio(c) {
    if (!c) return null;
    var pr = function (p) { return JSON.parse(JSON.stringify(p || {})); };
    return {
      sabores: c.sabores.map(function (s) { return { nome: s.nome, categoria: s.categoria || '', adicional: s.adicional || 0, sobPedido: !!s.sobPedido, desc: s.desc || '', ativo: true }; }),
      bordas: c.bordas.map(function (b) { return { nome: b.nome, precos: pr(b.precos), ativo: true }; }),
      extras: c.extras.map(function (b) { return { nome: b.nome, precos: pr(b.precos), ativo: true }; }),
      bebidas: c.bebidas.map(function (b) { return { nome: b.nome, preco: b.preco, ativo: true }; }),
      combos: c.combos.map(function (b) { return { nome: b.nome, preco: b.preco, ativo: true }; }),
      promocoes: (c.promocoes || []).map(function (p) { var x = pr(p); x.ativo = true; return x; }),
    };
  }
  function cidadeUf(txt) {
    var m = String(txt || '').trim().match(/^(.+?)\s*[\/,\-]\s*([A-Za-z]{2})$/);
    return m ? { cidade: m[1].trim(), uf: m[2].toUpperCase() } : null;
  }
  var SERVE = { pequena: '1 pessoa', media: '2 pessoas', grande: '2 a 3 pessoas', super: '3 a 4 pessoas' };
  // fatias que a Izza informa hoje (persona.js do whatsbot)
  var FATIAS = { pequena: 4, media: 6, grande: 8, super: 16 };
  function chaveTam(nome) { return String(nome || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s/)[0]; }
  function brl(v) { return v == null || v === '' ? '' : 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  function fichaPadrao(l) {
    var c = l.padroes && l.padroes.cardapio, v = {};
    FICHA_GRUPOS.forEach(function (g) {
      g.itens.forEach(function (it) {
        var p = it.p;
        if (p === 'cardapio:regraSabores') p = c ? c.regraSabores : '';
        else if (p === 'cardapio:sobPedido') p = c ? (c.sabores.some(function (s) { return s.sobPedido; }) ? 'sim' : 'nao') : '';
        else if (p === 'cardapio:bordas') p = c ? (c.bordas.length ? 'sim' : 'nao') : '';
        else if (p === 'loja:pix') p = PIX_LOJA[l.id] || '';
        else if (p === 'loja:endereco') p = END_LOJA[l.id] || '';
        else if (p === 'loja:cidade') p = END_LOJA[l.id] ? 'Porto Alegre / RS' : '';
        v[it.id] = p;
      });
    });
    var tam = c ? c.tamanhos.filter(function (t) { return !t.variante; }).map(function (t) {
      var cm = (t.nome.match(/(\d+)\s*cm/) || [])[1] || '';
      // variante de preco (ex.: Grande 35cm (2), meio a meio) conta como o mesmo tamanho
      var vars = c.tamanhos.filter(function (v) { return v.variante && v.nome.indexOf(t.nome) === 0; });
      var min = Math.min.apply(null, [t.min].concat(vars.map(function (v) { return v.min; })));
      return { id: t.id, nome: t.nome.replace(/\s*\d+\s*cm.*/, ''), cm: cm, preco: t.preco, min: min, max: t.max, serve: SERVE[t.id] || '', fatias: FATIAS[t.id] || '', ativo: true };
    }) : [];
    return { valores: v, tamanhos: tam, outras: [], cardapio: copiaCardapio(c), bairros: [], pagamento: pagamentoPadrao(v) };
  }

  // Uma ficha so (config.ficha), mostrada em duas paginas: "Tamanhos e sabores" (tamanhos,
  // regra de preco e o cardapio editavel) e "Particularidades" (o resto). Cada uma salva a ficha inteira.
  // Em que pagina fica cada bloco da ficha. Todas salvam a ficha inteira.
  var FICHA_PAG = { 'Atendimento': 'regras', 'Entrega': 'entrega', 'Regra de preço': 'tamanhos', 'Borda, adicionais e bebida': 'tamanhos', 'Pizza': 'tamanhos', 'Pagamento': 'pagamento' };
  var FICHA_CAB = {
    tamanhos: ['Tamanhos e sabores', function (n) { return 'Tamanhos, sabores, preços, bordas e bebidas da ' + n + '.'; }],
    entrega: ['Entrega', function (n) { return 'De onde a ' + n + ' entrega, até onde e quanto cobra.'; }],
    pagamento: ['Pagamento', function (n) { return 'Como o cliente da ' + n + ' pode pagar.'; }],
    regras: ['Regras da loja', function (n) { return 'Como a ' + n + ' atende e as regras próprias da casa.'; }],
  };
  function pgFicha(el, l, modo) {
    var tam = modo === 'tamanhos';
    // conteiner proprio: os ouvintes de evento morrem junto quando a pagina troca
    var raiz = el; raiz.innerHTML = ''; el = document.createElement('div'); el.className = 'pagina'; raiz.appendChild(el);
    var salva = l.config.ficha, f = JSON.parse(JSON.stringify(salva || fichaPadrao(l))), pode = l.pode.horario;
    var c = l.padroes && l.padroes.cardapio;
    f.valores = f.valores || {}; f.tamanhos = f.tamanhos || []; f.outras = f.outras || [];
    // ficha salva antes da coluna de fatias: preenche com o que a Izza informa hoje
    f.tamanhos.forEach(function (t) { if (t.fatias == null) t.fatias = FATIAS[chaveTam(t.nome)] || ''; });
    // id de cada tamanho: chave dos precos por tamanho de bordas e adicionais (o nome pode mudar)
    var usados = {};
    f.tamanhos.forEach(function (t) {
      if (!t.id) t.id = chaveTam(t.nome) || 'tam';
      while (usados[t.id]) t.id += '2';
      usados[t.id] = 1;
    });
    // itens que entraram na ficha depois de ela ter sido salva nascem com o padrao
    var pad = fichaPadrao(l);
    Object.keys(pad.valores).forEach(function (k) { if (f.valores[k] === undefined) f.valores[k] = pad.valores[k]; });
    if (!f.cardapio) f.cardapio = pad.cardapio;
    f.bairros = f.bairros || [];
    if (!f.pagamento) f.pagamento = pagamentoPadrao(f.valores);
    f.pagamento.outras = f.pagamento.outras || [];
    var dis = pode ? '' : ' disabled';
    function itemFicha(it) {
      var v = f.valores[it.id] == null ? '' : f.valores[it.id];
      if (it.t === 'sn') return '<div class="item-ficha"><span>' + esc(it.rot) + '</span><div class="seg" data-sn="' + it.id + '">' +
        SIM_NAO.map(function (o) { return '<button type="button" data-v="' + o[0] + '" class="' + (v === o[0] ? 'on' : '') + '"' + dis + '>' + o[1] + '</button>'; }).join('') + '</div></div>';
      if (it.t === 'radio') return '<div class="campo"><span>' + esc(it.rot) + '</span><div class="stack">' + it.op.map(function (o) {
        return '<label class="radio-card' + (v === o[0] ? ' on' : '') + '" style="padding:8px 12px"><input type="radio" name="r-' + it.id + '" value="' + o[0] + '"' + (v === o[0] ? ' checked' : '') + dis + '><span><b>' + esc(o[1]) + '</b></span></label>';
      }).join('') + '</div></div>';
      return '<label class="campo"><span>' + esc(it.rot) + '</span><input type="' + (it.t === 'num' ? 'number' : 'text') + '" data-in="' + it.id + '" value="' + esc(v) + '"' + dis + (it.t === 'num' ? ' min="0" step="0.5"' : '') + '></label>';
    }
    var itemPorId = {};
    FICHA_GRUPOS.forEach(function (g) { g.itens.forEach(function (it) { itemPorId[it.id] = it; }); });
    var itens = function (ids) { return ids.map(function (id) { return itemFicha(itemPorId[id]); }).join(''); };
    // pagina de pagamento: formas aceitas na entrega (estilo sistema de delivery) + pix + conversa
    function pagHtml() {
      var v = f.valores;
      return '<div class="card"><div class="cab-card"><div><h2>Pagamento na entrega</h2><p class="desc">Marque as formas que a loja aceita na entrega ou no balcão.</p></div>' +
        (pode ? '<button class="btn link" id="add-fp">+ Nova forma de pagamento</button>' : '') + '</div>' +
        '<div id="fp-grid"></div>' +
        '<h3 class="fp-sec">CPF ou CNPJ na nota</h3><div class="stack fp-radios">' + itemPorId.cpfNota.op.map(function (o) {
          return '<label class="fp-radio"><input type="radio" name="r-cpfNota" value="' + o[0] + '"' + (v.cpfNota === o[0] ? ' checked' : '') + dis + '>' + esc(o[1]) + '</label>';
        }).join('') + '</div>' +
        '<h3 class="fp-sec">Cartão de crédito na entrega</h3><label class="fp-radio"><input type="checkbox" data-cb="cartao"' + (v.cartao === 'sim' ? ' checked' : '') + dis + '>Oferecer pagamento com cartão de crédito na entrega</label>' +
        '<h3 class="fp-sec">Desconto para pagamento em dinheiro</h3><div class="fp-desc">Clientes que pagarem com dinheiro ganham <span class="fp-pct"><input type="number" min="0" max="100" step="1" data-in="descontoDinheiro" value="' + esc(v.descontoDinheiro == null ? '' : v.descontoDinheiro) + '" placeholder="0"' + dis + '><span>%</span></span> de desconto</div>' +
        '</div>' +
        '<div class="grid-2">' +
          '<div class="card"><h2>Pix antecipado</h2><div class="stack" style="margin-top:12px">' + itens(['pix', 'pixChave', 'pixHumano']) + '</div></div>' +
          '<div class="card"><h2>Na conversa</h2><p class="desc">O que a atendente virtual pergunta na hora de fechar.</p><div class="stack" style="margin-top:12px">' + itens(['trocoPergunta', 'cartaoBandeira']) + '</div></div>' +
        '</div>';
    }
    function desenhaFormas() {
      var box = $('#fp-grid', el); if (!box) return;
      var fo = f.pagamento.formas;
      var cel = function (x) {
        return '<label class="fp"><input type="checkbox" data-fp="' + x.id + '"' + (fo[x.id] ? ' checked' : '') + dis + '><span class="fp-ic sc"' + (x.pos ? ' style="background-position:' + x.pos[0] + 'px ' + x.pos[1] + 'px"' : ' data-gen') + '></span><span class="fp-nome">' + esc(x.nome) + '</span></label>';
      };
      // forma criada pela loja: nome livre e categoria escolhida
      var celOutra = function (o, i) {
        return '<div class="fp fp-nova"><input type="checkbox" data-fo="' + i + '"' + (o.ativo !== false ? ' checked' : '') + dis + '><span class="fp-ic t-outro">+</span>' +
          (pode ? '<input type="text" class="fp-txt" data-fon="' + i + '" value="' + esc(o.nome) + '" maxlength="60" placeholder="Nome da forma">' +
            '<select class="fp-sel" data-fot="' + i + '" title="Categoria">' + CAT_PAG.map(function (c) { return '<option value="' + c[0] + '"' + ((o.tipo || 'outro') === c[0] ? ' selected' : '') + '>' + c[1] + '</option>'; }).join('') + '</select>' +
            '<button class="btn link perigo fp-rm" data-rm-fo="' + i + '" title="Tirar">✕</button>'
          : '<span class="fp-nome">' + esc(o.nome) + '</span>') + '</div>';
      };
      box.innerHTML = CAT_PAG.map(function (c) {
        var fixas = FORMAS_PAG.filter(function (x) { return x.tipo === c[0]; });
        var novas = f.pagamento.outras.map(function (o, i) { return [o, i]; }).filter(function (p) { return (p[0].tipo || 'outro') === c[0]; });
        if (!fixas.length && !novas.length) return '';
        var n = fixas.filter(function (x) { return fo[x.id]; }).length + novas.filter(function (p) { return p[0].ativo !== false; }).length;
        return '<div class="fp-cat"><h3 class="fp-sec">' + c[1] + ' <span class="muted small">' + n + ' de ' + (fixas.length + novas.length) + '</span></h3>' +
          '<div class="fp-grid">' + fixas.map(cel).join('') + novas.map(function (p) { return celOutra(p[0], p[1]); }).join('') + '</div></div>';
      }).join('');
      el.querySelectorAll('[data-rm-fo]').forEach(function (b) { b.onclick = function () { f.pagamento.outras.splice(+b.getAttribute('data-rm-fo'), 1); desenhaFormas(); }; });
    }
    // "n de m" de cada categoria, sem redesenhar (o foco fica onde estava)
    function contaCats() {
      el.querySelectorAll('#fp-grid .fp-cat').forEach(function (cat) {
        var cb = cat.querySelectorAll('.fp-grid > .fp > input[type=checkbox]');
        cat.querySelector('.fp-sec .small').textContent = Array.prototype.filter.call(cb, function (x) { return x.checked; }).length + ' de ' + cb.length;
      });
    }
    // dinheiro / cartao / vale da ficha acompanham as formas marcadas (inclusive as criadas pela loja)
    function sincPag() {
      var fo = f.pagamento.formas, tem = function (t) {
        return FORMAS_PAG.some(function (x) { return x.tipo === t && fo[x.id]; }) ||
          f.pagamento.outras.some(function (o) { return o.tipo === t && o.ativo !== false && String(o.nome || '').trim(); });
      };
      f.valores.dinheiro = tem('din') ? 'sim' : 'nao';
      f.valores.vale = tem('ref') ? 'sim' : 'nao';
    }
    var grupos = FICHA_GRUPOS.filter(function (g) { return (FICHA_PAG[g.titulo] || 'regras') === modo; });
    var cab = FICHA_CAB[modo] || FICHA_CAB.regras;
    el.innerHTML = '<div class="page-head"><div><h1>' + cab[0] + '</h1><p>' + esc(cab[1](l.nome)) + '</p></div>' +
      (pode ? '<button class="btn pri" id="sv-ficha">Salvar ficha</button>' : '') + '</div>' +
      '<div class="aviso">Ficha de referência: o que se marca aqui fica registrado no painel e <b>ainda não muda o bot</b>. ' +
      (salva ? 'Última edição: ' + esc(quem(l.config.fichaPor)) + ' · ' + esc(dataHora(l.config.fichaEm)) + '.' : 'Veio pré-preenchida com o que a Izza faz hoje (código e cardápio do sistema). Confira e salve.') + '</div>' +
      // tamanhos
      (!tam ? '' : '<div class="card"><h2>Tamanhos</h2><p class="desc">Quais tamanhos a loja vende e quantos sabores e fatias tem cada um.</p>' +
      '<div class="tabela-wrap"><table><thead><tr><th>Vende</th><th>Tamanho</th><th>cm</th><th>Preço base</th><th>Sabores (mín–máx)</th><th>Fatias</th><th class="hide-m">Serve</th><th></th></tr></thead><tbody id="tb-tam"></tbody></table></div>' +
      (pode ? '<div class="acoes" style="justify-content:flex-start"><button class="btn sm" id="add-tam">+ Tamanho</button></div>' : '') + '</div>') +
      // checklist
      (modo === 'pagamento' ? pagHtml() : '<div class="' + (grupos.length > 1 ? 'grid-2' : '') + '">' + grupos.map(function (g) {
        return '<div class="card"><h2>' + esc(g.titulo) + '</h2><div class="stack" style="margin-top:12px">' + g.itens.map(itemFicha).join('') + '</div></div>';
      }).join('') + '</div>') +
      // bairros (so com taxa por bairro)
      (modo !== 'entrega' ? '' : '<div class="card" id="card-bairros"' + (f.valores.taxaModelo === 'bairro' ? '' : ' hidden') + '><h2>Bairros atendidos</h2>' +
      '<p class="desc">Entrega por bairro: marque onde a loja entrega e, se quiser, a taxa de cada bairro. A lista vem do mapa (OpenStreetMap) pela cidade do bloco Entrega.</p><div id="bairros-ed"></div></div>') +
      // outras
      (modo !== 'regras' ? '' : '<div class="card"><h2>Outras regras</h2><p class="desc">O que não coube nas outras páginas: regra da casa, exceção, combinado com o cliente.</p><div class="stack" id="outras"></div>' +
      (pode ? '<div class="acoes" style="justify-content:flex-start"><button class="btn sm" id="add-outra">+ Particularidade</button></div>' : '') + '</div>') +
      // cardapio do sistema
      (!tam ? '' : '<div class="card"><div class="cab-card"><div><h2>Sabores e preços</h2><p class="desc">Começa igual ao cardápio do sistema da loja (planilha CARDAPIO). Sabores, bordas, bebidas e combos daqui ficam na ficha (ainda não mudam o bot). <b>As promoções mudam o bot</b>: o que a Izza oferece, responde e cobra. ' +
      'Linha diferente do sistema ganha a marca <span class="badge warn">mudou</span>; linha que o sistema não tem, <span class="badge acc">novo</span>.</p></div>' +
      (pode && c ? '<button class="btn sm" id="rl-card">Recarregar do sistema</button>' : '') + '</div>' +
      (f.cardapio ? '<div id="cardapio-ed"></div>' : '<div class="vazio">O bot desta loja ainda não mandou o cardápio.</div>') + '</div>');

    function desenhaTam() {
      if (!$('#tb-tam', el)) return;
      $('#tb-tam', el).innerHTML = f.tamanhos.length ? f.tamanhos.map(function (t, i) {
        return '<tr><td><input type="checkbox" data-t="' + i + '" data-k="ativo"' + (t.ativo ? ' checked' : '') + dis + '></td>' +
          '<td><input type="text" data-t="' + i + '" data-k="nome" value="' + esc(t.nome) + '"' + dis + ' style="min-width:110px"></td>' +
          '<td><input type="number" data-t="' + i + '" data-k="cm" value="' + esc(t.cm) + '"' + dis + ' style="width:70px"></td>' +
          '<td><input type="number" step="0.01" data-t="' + i + '" data-k="preco" value="' + esc(t.preco) + '"' + dis + ' style="width:100px"></td>' +
          '<td><div class="linha" style="gap:6px;flex-wrap:nowrap"><input type="number" min="1" data-t="' + i + '" data-k="min" value="' + esc(t.min) + '"' + dis + ' style="width:60px">–<input type="number" min="1" data-t="' + i + '" data-k="max" value="' + esc(t.max) + '"' + dis + ' style="width:60px"></div></td>' +
          '<td><input type="number" min="1" data-t="' + i + '" data-k="fatias" value="' + esc(t.fatias) + '"' + dis + ' style="width:64px"></td>' +
          '<td class="hide-m"><input type="text" data-t="' + i + '" data-k="serve" value="' + esc(t.serve) + '"' + dis + ' style="min-width:110px"></td>' +
          '<td class="fim">' + (pode ? '<button class="btn link perigo" data-rm-t="' + i + '">Tirar</button>' : '') + '</td></tr>';
      }).join('') : '<tr><td colspan="8"><div class="vazio">Nenhum tamanho.</div></td></tr>';
      el.querySelectorAll('[data-rm-t]').forEach(function (b) { b.onclick = function () { f.tamanhos.splice(+b.getAttribute('data-rm-t'), 1); desenhaTam(); desenhaCardapio(); }; });
    }
    function desenhaOutras() {
      if (!$('#outras', el)) return;
      $('#outras', el).innerHTML = f.outras.length ? f.outras.map(function (o, i) {
        return '<div class="linha" style="flex-wrap:nowrap"><input type="checkbox" data-o="' + i + '" data-k="ativa"' + (o.ativa !== false ? ' checked' : '') + dis + ' title="Vale">' +
          '<input type="text" data-o="' + i + '" data-k="texto" value="' + esc(o.texto) + '" maxlength="300"' + dis + ' placeholder="Ex.: não entregamos no Centro depois das 23h">' +
          (pode ? '<button class="btn link perigo" data-rm-o="' + i + '">Tirar</button>' : '') + '</div>';
      }).join('') : '<div class="muted small">Nenhuma.</div>';
      el.querySelectorAll('[data-rm-o]').forEach(function (b) { b.onclick = function () { f.outras.splice(+b.getAttribute('data-rm-o'), 1); desenhaOutras(); }; });
    }
    // ---- sabores e precos (copia editavel do cardapio do sistema)
    var SYS = copiaCardapio(c), abaCard = 0, TAMS = [];
    if (f.cardapio && !f.cardapio.promocoes) f.cardapio.promocoes = SYS ? JSON.parse(JSON.stringify(SYS.promocoes)) : [];
    // colunas de preco = tamanhos que a loja vende na tabela Tamanhos (tamanho novo vira coluna)
    function tamsDaFicha() {
      TAMS = f.tamanhos.filter(function (t) { return t.ativo !== false && String(t.nome || '').trim(); }).map(function (t) { return { id: t.id, nome: t.nome.trim(), preco: t.preco }; });
    }
    var ROT_LISTA = { sabores: 'Sabor', bordas: 'Borda', extras: 'Adicional', bebidas: 'Bebida', combos: 'Combo' };
    function norm(s) { return String(s || '').trim().toLowerCase(); }
    function doSistema(lista, x) { return SYS ? SYS[lista].filter(function (s) { return norm(s.nome) === norm(x.nome); })[0] : null; }
    function difere(lista, x, s) {
      var n = function (v) { return v === '' || v == null ? 0 : +v; };
      if (lista === 'sabores') return n(x.adicional) !== n(s.adicional) || !!x.sobPedido !== !!s.sobPedido || String(x.desc || '') !== String(s.desc || '');
      if (lista === 'bordas' || lista === 'extras') return TAMS.some(function (t) { return n((x.precos || {})[t.id]) !== n((s.precos || {})[t.id]); });
      return n(x.preco) !== n(s.preco);
    }
    function status(lista, x) {
      var h = x.ativo === false ? '<span class="badge">não vende</span> ' : '';
      if (!SYS || !String(x.nome || '').trim()) return h;
      var s = doSistema(lista, x);
      if (!s) return h + '<span class="badge acc">novo</span>';
      if (!difere(lista, x, s)) return h;
      var era = lista === 'sabores' ? 'adicional ' + (s.adicional ? '+ ' + brl(s.adicional) : 'nenhum') + (s.sobPedido ? ', menu secreto' : '')
        : (lista === 'bordas' || lista === 'extras') ? TAMS.map(function (t) { return t.nome + ' ' + brl((s.precos || {})[t.id]); }).join(' · ') : brl(s.preco);
      return h + '<span class="badge warn" title="No sistema: ' + esc(era) + '">mudou</span>';
    }
    function cel(lista, i, k, v, tipo, w) {
      var a = ' data-cl="' + lista + '" data-ci="' + i + '" data-ck="' + k + '"' + dis;
      if (tipo === 'chk') return '<input type="checkbox"' + a + (v ? ' checked' : '') + '>';
      if (tipo === 'num') return '<input type="number" step="0.01" min="0"' + a + ' value="' + esc(v == null ? '' : v) + '" style="width:' + (w || 90) + 'px">';
      return '<input type="text"' + a + ' value="' + esc(v || '') + '" style="min-width:' + (w || 120) + 'px">';
    }
    function fimLinha(lista, i, x) {
      return '<td class="st">' + status(lista, x) + '</td><td class="fim">' + (pode ? '<button class="btn link perigo" data-rm-c="' + lista + ':' + i + '">Tirar</button>' : '') + '</td></tr>';
    }
    function tabela(lista, cab, linha) {
      var xs = f.cardapio[lista];
      return '<div class="tabela-wrap"><table><thead><tr><th>Vende</th>' + cab + '<th></th><th></th></tr></thead><tbody>' +
        (xs.length ? xs.map(linha).join('') : '<tr><td colspan="9"><div class="vazio">Nenhum.</div></td></tr>') + '</tbody></table></div>' +
        (pode ? '<div class="acoes" style="justify-content:flex-start"><button class="btn sm" data-add="' + lista + '">+ ' + ROT_LISTA[lista] + '</button></div>' : '');
    }
    function desenhaCardapio() {
      var box = $('#cardapio-ed', el); if (!box || !f.cardapio) return;
      tamsDaFicha();
      var ca = f.cardapio;
      var regra = { soma: 'soma o adicional de cada sabor', maior: 'cobra o sabor mais caro', medio: 'média dos adicionais' }[f.valores.regraPreco] || '';
      var porTam = function (lista) {
        return tabela(lista, '<th>Item</th>' + TAMS.map(function (t) { return '<th>' + esc(t.nome) + '</th>'; }).join(''), function (x, i) {
          return '<tr><td>' + cel(lista, i, 'ativo', x.ativo !== false, 'chk') + '</td><td>' + cel(lista, i, 'nome', x.nome, 'txt', 140) + '</td>' +
            TAMS.map(function (t) { return '<td>' + cel(lista, i, 'p:' + t.id, (x.precos || {})[t.id], 'num', 80) + '</td>'; }).join('') + fimLinha(lista, i, x);
        });
      };
      var preco = function (lista) {
        return tabela(lista, '<th>Item</th><th>Preço (R$)</th>', function (x, i) {
          return '<tr><td>' + cel(lista, i, 'ativo', x.ativo !== false, 'chk') + '</td><td>' + cel(lista, i, 'nome', x.nome, 'txt', 180) + '</td><td>' + cel(lista, i, 'preco', x.preco, 'num') + '</td>' + fimLinha(lista, i, x);
        });
      };
      var inteira = function (x, t) { return t.preco === '' || t.preco == null ? '' : brl((+t.preco || 0) + (+x.adicional || 0)); };
      var abas = ['Sabores (' + ca.sabores.length + ')', 'Bordas e adicionais', 'Bebidas e combos', 'Promoções'];
      box.innerHTML = '<div class="tabs">' + abas.map(function (n, i) { return '<button type="button" data-ab="' + i + '" class="' + (i === abaCard ? 'on' : '') + '">' + n + '</button>'; }).join('') + '</div>' +
        '<div data-pa="0"' + (abaCard === 0 ? '' : ' hidden') + '><p class="muted small" style="margin-bottom:8px">Preço da inteira = preço base do tamanho (tabela Tamanhos) + adicional do sabor; as colunas por tamanho mostram essa conta' + (regra ? '; com mais de um sabor, ' + esc(regra) : '') + '.</p>' +
          tabela('sabores', '<th>Sabor</th><th>Adicional (R$)</th>' + TAMS.map(function (t) { return '<th class="num" title="Preço base do tamanho + adicional do sabor">' + esc(t.nome) + '</th>'; }).join('') + '<th title="Sabor que a Izza não oferece; só sai se o cliente pedir">Menu secreto</th><th class="hide-m">Descrição</th>', function (x, i) {
            return '<tr><td>' + cel('sabores', i, 'ativo', x.ativo !== false, 'chk') + '</td><td>' + cel('sabores', i, 'nome', x.nome, 'txt', 150) + '</td>' +
              '<td>' + cel('sabores', i, 'adicional', x.adicional, 'num', 80) + '</td>' +
              TAMS.map(function (t) { return '<td class="num muted small nowrap" data-pz="' + esc(t.id) + '">' + inteira(x, t) + '</td>'; }).join('') +
              '<td>' + cel('sabores', i, 'sobPedido', x.sobPedido, 'chk') + '</td><td class="hide-m">' + cel('sabores', i, 'desc', x.desc, 'txt', 220) + '</td>' + fimLinha('sabores', i, x);
          }) + '</div>' +
        '<div data-pa="1"' + (abaCard === 1 ? '' : ' hidden') + '><h3 class="small" style="margin:4px 0">Bordas</h3>' + porTam('bordas') + '<h3 class="small" style="margin:16px 0 4px">Adicionais</h3>' + porTam('extras') + '</div>' +
        '<div data-pa="2"' + (abaCard === 2 ? '' : ' hidden') + '><h3 class="small" style="margin:4px 0">Bebidas</h3>' + preco('bebidas') + '<h3 class="small" style="margin:16px 0 4px">Combos</h3>' + preco('combos') + '</div>' +
        '<div data-pa="3"' + (abaCard === 3 ? '' : ' hidden') + '>' + promosHtml() + '</div>';
      box.querySelectorAll('[data-ab]').forEach(function (b) {
        b.onclick = function () {
          abaCard = +b.getAttribute('data-ab');
          box.querySelectorAll('[data-ab]').forEach(function (x) { x.classList.toggle('on', x === b); });
          box.querySelectorAll('[data-pa]').forEach(function (p) { p.hidden = +p.getAttribute('data-pa') !== abaCard; });
        };
      });
      ligaPromos(box);
      if (!pode) return;
      box.querySelectorAll('[data-cl]').forEach(function (inp) {
        inp.addEventListener('input', function () {
          var lista = inp.getAttribute('data-cl'), x = f.cardapio[lista][+inp.getAttribute('data-ci')], k = inp.getAttribute('data-ck');
          var val = inp.type === 'checkbox' ? inp.checked : inp.type === 'number' ? (inp.value === '' ? '' : +inp.value) : inp.value;
          if (k.indexOf('p:') === 0) { x.precos = x.precos || {}; x.precos[k.slice(2)] = val; } else x[k] = val;
          inp.closest('tr').querySelector('.st').innerHTML = status(lista, x);
          if (k === 'adicional') inp.closest('tr').querySelectorAll('[data-pz]').forEach(function (td) {
            var t = TAMS.filter(function (z) { return z.id === td.getAttribute('data-pz'); })[0];
            td.textContent = t && t.preco !== '' && t.preco != null ? brl((+t.preco || 0) + (+x.adicional || 0)) : '';
          });
        });
      });
      box.querySelectorAll('[data-rm-c]').forEach(function (b) {
        b.onclick = function () { var p = b.getAttribute('data-rm-c').split(':'); f.cardapio[p[0]].splice(+p[1], 1); desenhaCardapio(); };
      });
      box.querySelectorAll('[data-add]').forEach(function (b) {
        b.onclick = function () {
          var lista = b.getAttribute('data-add');
          var novo = lista === 'sabores' ? { nome: '', categoria: '', adicional: 0, sobPedido: false, desc: '', ativo: true }
            : (lista === 'bordas' || lista === 'extras') ? { nome: '', precos: {}, ativo: true } : { nome: '', preco: '', ativo: true };
          f.cardapio[lista].push(novo); desenhaCardapio();
          var ins = box.querySelectorAll('[data-cl="' + lista + '"][data-ck="nome"]'); if (ins.length) ins[ins.length - 1].focus();
        };
      });
    }

    // ---- promocoes (24/11/2026): editaveis, e o bot ligado ao painel usa estas no lugar das do sistema
    // (whatsbot src/painel.js promocoes -> dd/catalogo.js): o que a Izza oferece, responde e cobra.
    function famTam() {
      var vistos = {}, out = [];
      ((c && c.tamanhos) || []).forEach(function (t) { var id = String(t.id || '').split('-')[0]; if (!t.variante && id && !vistos[id]) { vistos[id] = 1; out.push({ id: id, nome: t.nome }); } });
      if (!out.length) f.tamanhos.forEach(function (t) { if (t.id && !vistos[t.id]) { vistos[t.id] = 1; out.push({ id: t.id, nome: t.nome }); } });
      return out;
    }
    function reaisNoTexto(txt) { return (String(txt || '').match(/R\$\s?\d{1,3}(?:\.\d{3})*,\d{2}/g) || []); }
    function promoDoSistema(p) { return SYS ? SYS.promocoes.filter(function (s) { return (p.id && s.id === p.id) || norm(s.nome) === norm(p.nome); })[0] : null; }
    function statusPromo(p) {
      var h = p.ativo === false ? '<span class="badge">desligada</span> ' : '';
      if (!SYS || !String(p.nome || '').trim()) return h;
      var s = promoDoSistema(p);
      if (!s) return h + '<span class="badge acc">nova</span>';
      var igual = norm(s.nome) === norm(p.nome) && +s.preco === +p.preco && !!s.soRetirada === !!p.soRetirada && !!s.soQuandoPedir === !!p.soQuandoPedir &&
        String(s.desc || '') === String(p.desc || '') && JSON.stringify(s.sabores || []) === JSON.stringify(p.sabores || []) && (s.maxSabores || '') == (p.maxSabores || '') && (s.tamanho || '') === (p.tamanho || '') && (s.desde || '') === (p.desde || '');
      return h + (igual ? '' : '<span class="badge warn" title="No sistema: ' + esc(s.nome + ' · ' + brl(s.preco)) + '">mudou</span>');
    }
    function avisoPreco(p) {
      var outros = reaisNoTexto(p.desc).filter(function (r) { return r.replace(/\s/g, ' ') !== brl(p.preco); });
      return outros.length && p.preco !== '' && p.preco != null ? '<div class="promo-aviso">A descrição fala em ' + esc(outros.join(', ')) + ' e o preço é ' + esc(brl(p.preco)) + '. A Izza lê a descrição: confira.</div>' : '';
    }
    function promoHtml(p, i) {
      var a = function (k) { return ' data-pr="' + i + '" data-pk="' + k + '"' + dis; };
      var sab = f.cardapio.sabores.filter(function (s) { return s.ativo !== false && String(s.nome || '').trim(); }).map(function (s) { return s.nome; });
      (p.sabores || []).forEach(function (n) { if (sab.indexOf(n) < 0) sab.push(n); });
      var escolhidos = p.sabores || [];
      var tams = famTam();
      return '<div class="regra promo-ed' + (p.ativo === false ? ' off' : '') + '" data-promo="' + i + '">' +
        '<div class="promo-l1"><label class="fp-radio" title="A Izza usa esta promoção"><input type="checkbox"' + a('ativo') + (p.ativo !== false ? ' checked' : '') + '>Vale</label>' +
          '<input type="text"' + a('nome') + ' value="' + esc(p.nome || '') + '" placeholder="Nome da promoção" maxlength="120">' +
          '<label class="promo-preco">R$ <input type="number" step="0.01" min="0"' + a('preco') + ' value="' + esc(p.preco == null ? '' : p.preco) + '"></label>' +
          '<span class="st">' + statusPromo(p) + '</span>' + (pode ? '<button type="button" class="btn link perigo" data-rm-pr="' + i + '">Tirar</button>' : '') + '</div>' +
        '<div class="promo-l2">' +
          '<label class="fp-radio"><input type="checkbox"' + a('soRetirada') + (p.soRetirada ? ' checked' : '') + '>Só retirada no balcão</label>' +
          '<label class="fp-radio" title="A Izza não oferece nem cita; vale se o cliente pedir promoção"><input type="checkbox"' + a('soQuandoPedir') + (p.soQuandoPedir ? ' checked' : '') + '>Só para quem pedir promoção</label>' +
          '<label class="promo-campo">Tamanho <select' + a('tamanho') + '><option value="">—</option>' + tams.map(function (t) { return '<option value="' + esc(t.id) + '"' + (p.tamanho === t.id ? ' selected' : '') + '>' + esc(t.nome) + '</option>'; }).join('') + '</select></label>' +
          '<label class="promo-campo">A partir de <input type="date"' + a('desde') + ' value="' + esc(p.desde || '') + '"></label>' +
          (p.pizzas > 1 ? '<span class="badge">combo de ' + p.pizzas + ' pizzas</span>' : '') + '</div>' +
        '<details class="promo-sab"' + (escolhidos.length ? ' open' : '') + '><summary>Sabores que o cliente escolhe (' + escolhidos.length + ')' + (escolhidos.length ? ' · até <input type="number" min="1" max="4"' + a('maxSabores') + ' value="' + esc(p.maxSabores || 2) + '" style="width:56px"> por pizza' : ' · nenhum: pizza fixa, sem escolha') + '</summary>' +
          '<div class="promo-chips">' + sab.map(function (n) { return '<label class="chip-chk"><input type="checkbox" data-pr="' + i + '" data-ps="' + esc(n) + '"' + (escolhidos.indexOf(n) >= 0 ? ' checked' : '') + dis + '>' + esc(n) + '</label>'; }).join('') + '</div></details>' +
        '<textarea rows="2"' + a('desc') + ' maxlength="600" placeholder="O que a Izza explica ao cliente: o que vem, regras, borda, entrega ou retirada">' + esc(p.desc || '') + '</textarea>' +
        '<div class="promo-av">' + avisoPreco(p) + '</div></div>';
    }
    function promosHtml() {
      var ps = f.cardapio.promocoes || [];
      return '<p class="muted small" style="margin-bottom:8px">Começa igual às promoções do sistema da loja. O que vale aqui é o que a Izza oferece, responde e cobra: desligue, mude o preço, a regra ou crie uma nova. Preço e descrição saem para o cliente como estão.</p>' +
        '<div class="stack" id="promo-lista">' + (ps.length ? ps.map(promoHtml).join('') : '<div class="vazio">Nenhuma promoção. A Izza diz que não tem.</div>') + '</div>' +
        (pode ? '<div class="acoes" style="justify-content:flex-start"><button class="btn sm" data-add-pr>+ Promoção</button></div>' : '');
    }
    function ligaPromos(box) {
      if (!pode) return;
      var lista = $('#promo-lista', box); if (!lista) return;
      lista.querySelectorAll('[data-pk]').forEach(function (inp) {
        var ev = inp.tagName === 'SELECT' || inp.type === 'checkbox' || inp.type === 'date' ? 'change' : 'input';
        inp.addEventListener(ev, function () {
          var p = f.cardapio.promocoes[+inp.getAttribute('data-pr')], k = inp.getAttribute('data-pk'), card = inp.closest('[data-promo]');
          var val = inp.type === 'checkbox' ? inp.checked : inp.type === 'number' ? (inp.value === '' ? '' : +inp.value) : inp.value;
          if (k === 'preco' && p.preco !== '' && p.preco != null && val !== '') {
            // descricao que repetia o preco antigo acompanha o novo
            var velho = brl(p.preco), novo = brl(val), ta = card.querySelector('[data-pk=desc]');
            if (velho !== novo && String(p.desc || '').indexOf(velho) >= 0) { p.desc = p.desc.split(velho).join(novo); ta.value = p.desc; }
          }
          if (val === '' || val === false) { if (k === 'soQuandoPedir' || k === 'desde' || k === 'tamanho') delete p[k]; else p[k] = val; } else p[k] = val;
          if (k === 'ativo') card.classList.toggle('off', !val);
          card.querySelector('.st').innerHTML = statusPromo(p);
          card.querySelector('.promo-av').innerHTML = avisoPreco(p);
        });
      });
      lista.querySelectorAll('[data-ps]').forEach(function (cb) {
        cb.onchange = function () {
          var i = +cb.getAttribute('data-pr'), p = f.cardapio.promocoes[i], n = cb.getAttribute('data-ps');
          p.sabores = (p.sabores || []).filter(function (x) { return x !== n; });
          if (cb.checked) p.sabores.push(n);
          if (!p.sabores.length) { delete p.sabores; delete p.maxSabores; } else if (!p.maxSabores) p.maxSabores = 2;
          var y = window.scrollY; desenhaCardapio();
          var d = $('#cardapio-ed', el).querySelector('[data-promo="' + i + '"] details'); if (d) d.open = true;
          window.scrollTo(0, y);
        };
      });
      lista.querySelectorAll('[data-rm-pr]').forEach(function (b) {
        b.onclick = function () { f.cardapio.promocoes.splice(+b.getAttribute('data-rm-pr'), 1); desenhaCardapio(); };
      });
      var add = box.querySelector('[data-add-pr]');
      if (add) add.onclick = function () {
        f.cardapio.promocoes.push({ id: 'promo-' + Date.now().toString(36), nome: '', preco: '', soRetirada: false, desc: '', ativo: true });
        desenhaCardapio();
        var ins = $('#cardapio-ed', el).querySelectorAll('#promo-lista [data-pk=nome]'); if (ins.length) ins[ins.length - 1].focus();
      };
    }

    // ---- bairros atendidos (taxa por bairro)
    var BAI = { chave: null, nomes: null, erro: null, carregando: false, q: '' };
    function marcado(nome) { return f.bairros.filter(function (b) { return b.nome === nome; })[0]; }
    function listaBairros() {
      var lst = $('#bai-lista', el); if (!lst) return;
      var todos = (BAI.nomes || []).slice();
      f.bairros.forEach(function (b) { if (todos.indexOf(b.nome) < 0) todos.unshift(b.nome); });
      var q = norm(BAI.q).normalize('NFD').replace(/[̀-ͯ]/g, '');
      var vis = todos.filter(function (n) { return !q || norm(n).normalize('NFD').replace(/[̀-ͯ]/g, '').indexOf(q) >= 0; });
      lst.innerHTML = vis.length ? vis.map(function (n) {
        var m = marcado(n);
        return '<div class="bairro' + (m ? ' on' : '') + '"><label><input type="checkbox" data-bai="' + esc(n) + '"' + (m ? ' checked' : '') + dis + '><span>' + esc(n) + '</span></label>' +
          (m ? '<input type="number" step="0.5" min="0" data-bai-taxa="' + esc(n) + '" value="' + esc(m.taxa == null ? '' : m.taxa) + '" placeholder="Taxa R$"' + dis + '>' : '') + '</div>';
      }).join('') : '<div class="vazio">Nenhum bairro com esse nome.</div>';
      $('#bai-cont', el).textContent = f.bairros.length + ' de ' + todos.length + ' marcados';
      if (!pode) return;
      lst.querySelectorAll('[data-bai]').forEach(function (cb) {
        cb.onchange = function () {
          var n = cb.getAttribute('data-bai');
          if (cb.checked) { if (!marcado(n)) f.bairros.push({ nome: n, taxa: '' }); }
          else f.bairros = f.bairros.filter(function (b) { return b.nome !== n; });
          listaBairros();
        };
      });
      lst.querySelectorAll('[data-bai-taxa]').forEach(function (inp) {
        inp.oninput = function () { var m = marcado(inp.getAttribute('data-bai-taxa')); if (m) m.taxa = inp.value === '' ? '' : +inp.value; };
      });
    }
    function desenhaBairros() {
      var box = $('#bairros-ed', el); if (!box) return;
      var cu = cidadeUf(f.valores.cidadeLoja);
      if (!cu) { box.innerHTML = '<div class="vazio">Preencha <b>Cidade / UF</b> no bloco Entrega (ex.: Porto Alegre / RS).</div>'; return; }
      var ch = norm(cu.cidade) + '/' + cu.uf;
      if (BAI.chave !== ch) {
        BAI.chave = ch; BAI.nomes = null; BAI.erro = null; BAI.carregando = true;
        api('bairros&cidade=' + encodeURIComponent(cu.cidade) + '&uf=' + cu.uf).then(function (j) {
          if (BAI.chave !== ch) return; BAI.nomes = j.bairros; BAI.carregando = false; desenhaBairros();
        }).catch(function (e) {
          if (BAI.chave !== ch) return; BAI.erro = e.message; BAI.carregando = false; desenhaBairros();
        });
      }
      if (BAI.carregando) { box.innerHTML = '<div class="vazio">Buscando os bairros de ' + esc(cu.cidade + ' / ' + cu.uf) + '…</div>'; return; }
      box.innerHTML = (BAI.erro ? '<div class="aviso err" style="margin-bottom:12px">' + esc(BAI.erro) + ' <button class="btn sm" id="bai-rt">Tentar de novo</button></div>' : '') +
        '<div class="filtros-frase f3">' +
        '<input type="search" id="bai-q" placeholder="Buscar bairro de ' + esc(cu.cidade) + '…" value="' + esc(BAI.q) + '">' +
        '<span class="muted small" id="bai-cont"></span>' +
        (pode ? '<span class="linha" style="gap:6px;flex-wrap:nowrap"><button class="btn sm" id="bai-todos">Marcar todos</button><button class="btn sm" id="bai-nenhum">Desmarcar</button></span>' : '<span></span>') +
        '</div><div class="bairros-grid" id="bai-lista"></div>';
      $('#bai-q', el).oninput = function () { BAI.q = this.value; listaBairros(); };
      if ($('#bai-rt', el)) $('#bai-rt', el).onclick = function () { BAI.chave = null; desenhaBairros(); };
      if (pode) {
        $('#bai-todos', el).onclick = function () { (BAI.nomes || []).forEach(function (n) { if (!marcado(n)) f.bairros.push({ nome: n, taxa: '' }); }); listaBairros(); };
        $('#bai-nenhum', el).onclick = function () { f.bairros = []; listaBairros(); };
      }
      listaBairros();
    }

    desenhaTam(); desenhaOutras(); desenhaCardapio();
    if (f.valores.taxaModelo === 'bairro') desenhaBairros();
    if (!pode) return;
    if ($('#rl-card', el)) {
      var armado = 0;
      $('#rl-card', el).onclick = function () {
        var b = this;
        if (Date.now() - armado > 4000) { armado = Date.now(); b.textContent = 'Confirmar: descarta as mudanças'; setTimeout(function () { b.textContent = 'Recarregar do sistema'; }, 4000); return; }
        armado = 0; b.textContent = 'Recarregar do sistema';
        f.cardapio = copiaCardapio(c); desenhaCardapio(); toast('Voltou ao cardápio do sistema. Salve a ficha para gravar.');
      };
    }

    el.addEventListener('input', function (ev) {
      var t = ev.target, k = t.getAttribute('data-k');
      var val = t.type === 'checkbox' ? t.checked : t.type === 'number' ? (t.value === '' ? '' : +t.value) : t.value;
      if (t.hasAttribute('data-t')) {
        f.tamanhos[+t.getAttribute('data-t')][k] = val;
        if (k === 'nome' || k === 'ativo' || k === 'preco') desenhaCardapio();
      }
      else if (t.hasAttribute('data-o')) f.outras[+t.getAttribute('data-o')][k] = val;
      else if (t.hasAttribute('data-fp')) { if (t.checked) f.pagamento.formas[t.getAttribute('data-fp')] = true; else delete f.pagamento.formas[t.getAttribute('data-fp')]; sincPag(); contaCats(); }
      else if (t.hasAttribute('data-fo')) { f.pagamento.outras[+t.getAttribute('data-fo')].ativo = t.checked; contaCats(); }
      else if (t.hasAttribute('data-fot')) { f.pagamento.outras[+t.getAttribute('data-fot')].tipo = t.value; desenhaFormas(); }
      else if (t.hasAttribute('data-fon')) f.pagamento.outras[+t.getAttribute('data-fon')].nome = t.value;
      else if (t.hasAttribute('data-cb')) f.valores[t.getAttribute('data-cb')] = t.checked ? 'sim' : 'nao';
      else if (t.hasAttribute('data-in')) f.valores[t.getAttribute('data-in')] = t.type === 'number' ? (t.value === '' ? '' : +t.value) : t.value;
    });
    el.addEventListener('change', function (ev) {
      var t = ev.target;
      if (t.type === 'radio' && t.name.indexOf('r-') === 0) {
        f.valores[t.name.slice(2)] = t.value;
        (t.closest('.stack') || el).querySelectorAll('.radio-card').forEach(function (rc) { rc.classList.toggle('on', rc.querySelector('input').checked); });
        if (t.name === 'r-taxaModelo' && $('#card-bairros', el)) { $('#card-bairros', el).hidden = t.value !== 'bairro'; if (t.value === 'bairro') desenhaBairros(); }
        if (t.name === 'r-regraPreco') desenhaCardapio();
      }
      if (t.getAttribute('data-in') === 'cidadeLoja' && $('#card-bairros', el) && !$('#card-bairros', el).hidden) desenhaBairros();
    });
    el.querySelectorAll('[data-sn]').forEach(function (seg) {
      seg.addEventListener('click', function (ev) {
        var b = ev.target.closest('button'); if (!b) return;
        f.valores[seg.getAttribute('data-sn')] = b.getAttribute('data-v');
        seg.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
      });
    });
    if ($('#add-tam', el)) $('#add-tam', el).onclick = function () { f.tamanhos.push({ id: 't' + Date.now().toString(36), nome: '', cm: '', preco: '', min: 1, max: 2, fatias: '', serve: '', ativo: true }); desenhaTam(); var ins = el.querySelectorAll('#tb-tam [data-k=nome]'); if (ins.length) ins[ins.length - 1].focus(); };
    desenhaFormas();
    if ($('#add-fp', el)) $('#add-fp', el).onclick = function () { f.pagamento.outras.push({ nome: '', tipo: 'outro', ativo: true }); desenhaFormas(); var ins = el.querySelectorAll('#fp-grid .fp-txt'); if (ins.length) ins[ins.length - 1].focus(); };
    if ($('#add-outra', el)) $('#add-outra', el).onclick = function () { f.outras.push({ texto: '', ativa: true }); desenhaOutras(); var ins = el.querySelectorAll('#outras input[type=text]'); if (ins.length) ins[ins.length - 1].focus(); };
    $('#sv-ficha', el).onclick = function () {
      f.outras = f.outras.filter(function (o) { return (o.texto || '').trim(); });
      f.tamanhos = f.tamanhos.filter(function (t) { return (t.nome || '').trim(); });
      f.pagamento.outras = f.pagamento.outras.filter(function (o) { return (o.nome || '').trim(); });
      sincPag();
      if (f.cardapio) Object.keys(ROT_LISTA).forEach(function (k) { f.cardapio[k] = (f.cardapio[k] || []).filter(function (x) { return String(x.nome || '').trim(); }); });
      if (f.cardapio && f.cardapio.promocoes) {
        var semPreco = f.cardapio.promocoes.filter(function (p) { return p.ativo !== false && String(p.nome || '').trim() && (p.preco === '' || p.preco == null); });
        if (semPreco.length) { abaCard = 3; desenhaCardapio(); return toast('Promoção sem preço: ' + semPreco[0].nome, true); }
        f.cardapio.promocoes = f.cardapio.promocoes.filter(function (p) { return String(p.nome || '').trim(); });
      }
      salvar('ficha', { loja: l.id, ficha: f }, 'Ficha salva. As promoções valem no bot ligado ao painel em até 1 minuto.');
    };
  }

  // ------------------------------------------------------------- Instruções e ferramentas
  // O texto padrao vem do codigo do bot (ele manda ao subir, api bot_padroes). Editar aqui
  // grava uma versao da loja por cima; "voltar ao padrao" apaga a versao e o codigo volta a valer.
  var CAMPOS = {
    identidade: { nome: 'Identidade', desc: 'Quem é a Izza nesta loja: nome, endereço, jeito de falar. Abre o prompt.' },
    regrasCasa: { nome: 'Regras da casa', desc: 'O manual de atendimento inteiro: preço, pedido, endereço, pagamento, quando chamar atendente. Os marcadores {ASSIM} são trocados pelo bot e não podem sumir.' },
    tomEquipe: { nome: 'Tom da equipe', desc: 'Como as atendentes da loja escrevem. Hoje vale só para o número do dono (WHATSBOT_TOM_EQUIPE).' },
  };
  var GRUPOS = { sempre: 'Sempre disponíveis', carrinho: 'Com pizza no carrinho', triagem: 'Pedido já feito (triagem)' };

  function semPadroes(el, l) {
    el.innerHTML += '<div class="aviso">O bot desta loja ainda não mandou os textos do código. Eles chegam quando ele sobe com a versão nova (até lá não dá para editar).</div>';
  }
  function hashTexto(s) { // sha-256 em hex, para comparar com o baseHash gravado
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  function marcaDesatualizado(sel, padrao, ed) {
    if (!ed || !ed.baseHash || !window.crypto || !crypto.subtle) return;
    hashTexto(padrao).then(function (h) {
      var x = $(sel); if (x && h !== ed.baseHash) x.innerHTML = '<div class="aviso">O texto padrão no código mudou depois desta edição (alguém ajustou o bot). A versão da loja continua valendo e não recebe o ajuste: compare com o padrão.</div>';
    });
  }
  function historicoDe(l, alvo) { return (l.config.historicoInstrucoes || []).filter(function (h) { return h.alvo === alvo; }); }

  function pgInstrucoes(el, l) {
    var pad = l.padroes && l.padroes.instrucoes, ed = l.config.instrucoes || {};
    el.innerHTML = '<div class="page-head"><div><h1>Instruções</h1><p>O texto que a Izza lê antes de toda conversa desta loja.</p></div></div>';
    if (!pad) return semPadroes(el, l);
    var campos = Object.keys(CAMPOS).filter(function (k) { return pad[k] != null; });
    if (!S.abaInstr || campos.indexOf(S.abaInstr) < 0) S.abaInstr = campos[0];
    var k = S.abaInstr, atual = ed[k], texto = atual ? atual.texto : pad[k], pode = l.pode.instrucoes;
    var hist = historicoDe(l, 'instrucoes:' + k);
    el.innerHTML +=
      '<div class="aviso">Somente visualização: é o texto que está hoje no código do bot. Mudança nele se faz no código e passa pela bancada de testes.</div>' +
      '<div class="card"><div class="tabs">' + campos.map(function (c) {
        return '<button data-aba="' + c + '" class="' + (c === k ? 'on' : '') + '">' + CAMPOS[c].nome + (ed[c] ? ' <span class="badge acc">loja</span>' : '') + '</button>';
      }).join('') + '</div>' +
      '<p class="desc">' + esc(CAMPOS[k].desc.replace(/ Os marcadores.*$/, ' As marcas {ASSIM} o bot troca pelo valor certo (link, tempos, Pix).')) + '</p><div id="desat"></div>' +
      '<div class="linha" style="justify-content:space-between;margin-bottom:8px">' +
        (atual ? '<span class="badge acc">Versão da loja · ' + esc(quem(atual.por)) + ' · ' + esc(dataHora(atual.em)) + '</span>' : '<span class="badge">Padrão do código</span>') +
        '<span class="muted small"><span id="cont">0</span> caracteres</span></div>' +
      '<textarea id="txt" class="mono" rows="22"' + (pode ? '' : ' readonly') + '>' + esc(texto) + '</textarea>' +
      '<div class="acoes">' +
        (atual ? '<button class="btn" id="ver-pad">Ver o padrão</button>' : '') +
        (hist.length ? '<button class="btn" id="ver-hist">Versões anteriores (' + hist.length + ')</button>' : '') +
        (pode && atual ? '<button class="btn" id="volta">Voltar ao padrão</button>' : '') +
        (pode ? '<button class="btn pri" id="salva">Salvar</button>' : '') +
      '</div></div>';
    var tx = $('#txt', el), ct = $('#cont', el);
    tx.oninput = function () { ct.textContent = tx.value.length.toLocaleString('pt-BR'); }; tx.oninput();
    marcaDesatualizado('#desat', pad[k], atual);
    el.querySelectorAll('[data-aba]').forEach(function (b) { b.onclick = function () { S.abaInstr = b.getAttribute('data-aba'); desenhar(); }; });
    var go = function (t, msg) { return salvar('instrucao', { loja: l.id, campo: k, texto: t }, msg); };
    if ($('#salva', el)) $('#salva', el).onclick = function () {
      if (tx.value.trim() === texto.trim()) return toast('Nada mudou.');
      confirma('Salvar “' + CAMPOS[k].nome + '”? A Izza da ' + l.nome + ' passa a seguir este texto em até 1 min.', 'Salvar', function () { return go(tx.value, 'Salvo. Vale em até 1 min.'); });
    };
    if ($('#volta', el)) $('#volta', el).onclick = function () { confirma('Apagar a versão da loja e voltar ao texto do código?', 'Voltar ao padrão', function () { return go(null, 'De volta ao padrão.'); }); };
    if ($('#ver-pad', el)) $('#ver-pad', el).onclick = function () { verTexto('Padrão do código — ' + CAMPOS[k].nome, pad[k], pode ? function (t) { tx.value = t; tx.oninput(); } : null); };
    if ($('#ver-hist', el)) $('#ver-hist', el).onclick = function () { verHistorico(hist, pode ? function (t) { tx.value = t; tx.oninput(); } : null); };
  }

  function pgFerramentas(el, l) {
    var pad = l.padroes && l.padroes.ferramentas, ed = l.config.ferramentas || {}, pode = l.pode.instrucoes;
    el.innerHTML = '<div class="page-head"><div><h1>Ferramentas</h1><p>O que a Izza consegue fazer, e a descrição que ela lê para decidir quando usar cada uma.</p></div></div>';
    if (!pad) return semPadroes(el, l);
    el.innerHTML += '<div class="aviso">Somente visualização: o nome de cada ferramenta e a descrição que a Izza lê para decidir quando usar. O que ela faz, os cálculos e as travas de preço ficam no código do bot.</div>' +
      Object.keys(GRUPOS).map(function (g) {
        var fs = pad.filter(function (f) { return f.grupo === g; });
        if (!fs.length) return '';
        return '<div class="card"><h2>' + GRUPOS[g] + '</h2><p class="desc">' + fs.length + ' ferramenta' + (fs.length > 1 ? 's' : '') + '</p><div class="stack">' + fs.map(function (f) {
          var e = ed[f.nome];
          return '<div class="regra' + (e ? '' : ' off') + '"><div style="flex:1"><div><code>' + esc(f.nome) + '</code> ' + (e ? '<span class="badge acc">loja</span>' : '') + '</div>' +
            '<div class="txt muted" style="margin-top:4px">' + esc(e ? e.descricao : f.descricao) + '</div>' +
            (e ? '<div class="meta">' + esc(quem(e.por)) + ' · ' + esc(dataHora(e.em)) + '</div><div id="desat-' + esc(f.nome) + '"></div>' : '') + '</div>' +
            '<div><button class="btn link" data-ed="' + esc(f.nome) + '">' + (pode ? 'Editar' : 'Ver') + '</button></div></div>';
        }).join('') + '</div></div>';
      }).join('');
    pad.forEach(function (f) { if (ed[f.nome]) marcaDesatualizado('#desat-' + f.nome, f.descricao, ed[f.nome]); });
    el.querySelectorAll('[data-ed]').forEach(function (b) {
      b.onclick = function () {
        var nome = b.getAttribute('data-ed'), f = pad.filter(function (x) { return x.nome === nome; })[0], e = ed[nome];
        var hist = historicoDe(l, 'ferramentas:' + nome);
        modal('<h3><code>' + esc(nome) + '</code></h3>' +
          '<label class="campo"><span>Descrição que a Izza lê</span><textarea id="f-txt" class="mono" rows="9" maxlength="2000"' + (pode ? '' : ' readonly') + '>' + esc(e ? e.descricao : f.descricao) + '</textarea></label>' +
          (e ? '<details><summary class="muted small">Padrão do código</summary><div class="muted small" style="white-space:pre-wrap;margin-top:6px">' + esc(f.descricao) + '</div></details>' : '<p class="muted small">Hoje vale o padrão do código.</p>') +
          (hist.length ? '<details><summary class="muted small">Versões anteriores (' + hist.length + ')</summary>' + hist.map(function (h) { return '<div class="muted small" style="white-space:pre-wrap;margin-top:8px;border-top:1px solid var(--border);padding-top:8px">até ' + esc(dataHora(h.substituidoEm)) + (h.eraPadrao ? ' (padrão)' : '') + '\n' + esc(h.texto) + '</div>'; }).join('') + '</details>' : '') +
          '<div class="acoes"><button class="btn" data-fecha>Fechar</button>' +
          (pode && e ? '<button class="btn" id="f-volta">Voltar ao padrão</button>' : '') +
          (pode ? '<button class="btn pri" id="f-ok">Salvar</button>' : '') + '</div>', function (m) {
            var ok = $('#f-ok', m), vb = $('#f-volta', m);
            if (ok) ok.onclick = function () { salvar('ferramenta', { loja: l.id, nome: nome, texto: $('#f-txt', m).value }, 'Salvo. Vale em até 1 min.').then(fecharModal); };
            if (vb) vb.onclick = function () { salvar('ferramenta', { loja: l.id, nome: nome, texto: null }, 'De volta ao padrão.').then(fecharModal); };
          });
      };
    });
  }

  function verTexto(titulo, texto, usar) {
    modal('<h3>' + esc(titulo) + '</h3><textarea class="mono" rows="18" readonly>' + esc(texto) + '</textarea>' +
      '<div class="acoes"><button class="btn" data-fecha>Fechar</button>' + (usar ? '<button class="btn pri" id="usar">Copiar para o editor</button>' : '') + '</div>', function (m) {
        var u = $('#usar', m); if (u) u.onclick = function () { usar(texto); fecharModal(); toast('Copiado para o editor. Falta salvar.'); };
      });
  }
  function verHistorico(hist, usar) {
    modal('<h3>Versões anteriores</h3><p class="muted small">Cada item é o texto que valia até a data. “Usar” copia para o editor; só vale depois de salvar.</p>' +
      hist.map(function (h, i) {
        return '<div class="regra off"><div style="flex:1"><div class="meta" style="margin:0 0 6px">até ' + esc(dataHora(h.substituidoEm)) + ' · trocado por ' + esc(quem(h.por)) + (h.eraPadrao ? ' · era o padrão' : '') + '</div>' +
          '<div class="txt small" style="max-height:140px;overflow:auto">' + esc(h.texto) + '</div></div>' + (usar ? '<div><button class="btn link" data-u="' + i + '">Usar</button></div>' : '') + '</div>';
      }).join('') + '<div class="acoes"><button class="btn" data-fecha>Fechar</button></div>', function (m) {
        m.querySelectorAll('[data-u]').forEach(function (b) { b.onclick = function () { usar(hist[+b.getAttribute('data-u')].texto); fecharModal(); toast('Copiado para o editor. Falta salvar.'); }; });
      });
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
    el.innerHTML = '<div class="page-head"><div><h1>Log</h1><p>As últimas 200 mudanças feitas no painel, nas lojas que você vê.</p></div></div>' +
      '<div class="card">' + (log.length ? log.map(itemLog).join('') : '<div class="vazio">Nada ainda.</div>') + '</div>';
  }

  // ------------------------------------------------------------- Histórico de pedidos e Clientes
  // O bot manda (src/pedidos/historico.js): cada pedido fechado pela Izza com o resumo que o
  // cliente viu, e os clientes que ja pediram pelo WhatsApp com o cadastro da base da loja.
  var ST_PED = { enviado: ['Aguardando a loja', 'warn'], agendado: ['Agendado', 'acc'], lancado: ['Confirmado', 'ok'], recusado: ['Recusado pela loja', 'err'], expirado: ['Não entrou', 'err'], cancelado: ['Cancelado na Saipos', 'err'] };
  function fmtTel(t) {
    var d = String(t || '').replace(/\D/g, ''); if (d.length >= 12 && d.indexOf('55') === 0) d = d.slice(2);
    if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
    if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return t || '';
  }
  function fmtEnd(e) { return e && e.rua ? e.rua + (e.numero ? ', ' + e.numero : '') + (e.complemento ? ' (' + e.complemento + ')' : '') + (e.bairro ? ' - ' + e.bairro : '') : ''; }
  function dataCurta(iso) { if (!iso) return ''; var d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso); return isNaN(d) ? iso : d.toLocaleDateString('pt-BR'); }
  function nPed(n) { return n + (n === 1 ? ' pedido' : ' pedidos'); }
  function valePed(p) { return p.status !== 'recusado' && p.status !== 'expirado'; }
  function pedidoHtml(p, comNome) {
    var st = ST_PED[p.status] || [p.status, ''];
    return '<div class="pedido"><div class="pedido-top">' +
      '<div class="pedido-quem"><b>' + esc(dataHora(p.em)) + '</b>' + (comNome ? (p.nome ? '<span>' + esc(p.nome) + '</span>' : '') + '<span class="muted small">' + esc(fmtTel(p.telefone)) + '</span>' : '') + '</div>' +
      '<div class="pedido-tags"><span class="badge ' + st[1] + '">' + esc(st[0]) + '</span>' + (p.retirada != null ? '<span class="badge">' + (p.retirada ? 'Retirada' : 'Entrega') + '</span>' : '') + (p.codigo ? '<span class="badge">nº ' + esc(p.codigo) + '</span>' : '') + '</div>' +
      '<div class="pedido-total">' + (p.total != null ? brl(p.total) : '') + '</div></div>' +
      '<div class="pedido-det" hidden>' +
        (p.resumo ? '<div class="balao">' + esc(p.resumo) + '</div>' : '<div class="muted small">Resumo não guardado: pedido de antes de 23/11, quando o painel passou a registrar.</div>') +
        '<div class="pedido-info">' +
          (p.endereco ? '<div><span class="muted small">Endereço</span><div>' + esc(fmtEnd(p.endereco)) + '</div></div>' : '') +
          (p.pagamento ? '<div><span class="muted small">Pagamento</span><div>' + esc(p.pagamento) + '</div></div>' : '') +
          (p.agendadoPara ? '<div><span class="muted small">Agendado para</span><div>' + esc(p.agendadoPara) + '</div></div>' : '') +
          (p.atualizadoEm ? '<div><span class="muted small">Último status</span><div>' + esc(dataHora(p.atualizadoEm)) + '</div></div>' : '') +
          (comNome ? '<div><button class="btn sm" data-imprime="' + esc(p.id) + '">⎙ Imprimir comanda</button></div>' : '') +
        '</div></div></div>';
  }
  function ligaPedidos(box) {
    box.querySelectorAll('.pedido-top').forEach(function (t) {
      t.onclick = function () { var d = t.parentNode.querySelector('.pedido-det'); d.hidden = !d.hidden; t.parentNode.classList.toggle('aberto', !d.hidden); };
    });
  }

  // Importar a base de clientes (24/11/2026): planilha CSV (do sistema antigo, Excel "salvar como
  // CSV") com telefone, nome e endereco. A Izza passa a reconhecer essas pessoas pelo telefone.
  // Dame e Lov nao precisam: a base vem da intranet todo dia.
  function colunaCsv(cab, nomes) {
    for (var i = 0; i < cab.length; i++) { var c = cab[i]; if (nomes.some(function (n) { return c === n || c.indexOf(n) === 0; })) return i; }
    return -1;
  }
  function leCsv(txt) {
    txt = txt.replace(/^\ufeff/, '');
    var linhas = txt.split(/\r?\n/).filter(function (x) { return x.trim(); });
    if (!linhas.length) return [];
    var sep = (linhas[0].split(';').length >= linhas[0].split(',').length) ? ';' : ',';
    function campos(l) {
      var out = [], cur = '', q = false;
      for (var i = 0; i < l.length; i++) {
        var ch = l[i];
        if (ch === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
        else if (ch === sep && !q) { out.push(cur); cur = ''; }
        else cur += ch;
      }
      out.push(cur); return out.map(function (x) { return x.trim(); });
    }
    var norm = function (s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, ''); };
    var cab = campos(linhas[0]).map(norm);
    var ix = { telefone: colunaCsv(cab, ['telefone', 'celular', 'fone', 'whatsapp', 'tel']), nome: colunaCsv(cab, ['nome', 'cliente']),
      rua: colunaCsv(cab, ['rua', 'logradouro', 'endereco']), numero: colunaCsv(cab, ['numero', 'num', 'nro']),
      complemento: colunaCsv(cab, ['complemento', 'compl']), bairro: colunaCsv(cab, ['bairro']) };
    if (ix.telefone < 0) throw new Error('A planilha precisa de uma coluna "telefone" (ou celular/whatsapp) na primeira linha.');
    return linhas.slice(1).map(function (l) {
      var c = campos(l), o = {};
      Object.keys(ix).forEach(function (k) { o[k] = ix[k] >= 0 ? (c[ix[k]] || '') : ''; });
      return o;
    }).filter(function (o) { var d = o.telefone.replace(/\D/g, ''); return d.length >= 10 && d.length <= 13; });
  }
  function importaClientes(l) {
    modal('<h3>Importar clientes</h3><p class="muted small">Planilha CSV com a primeira linha de títulos: <b>telefone</b> (obrigatório), <b>nome</b>, <b>rua</b>, <b>numero</b>, <b>complemento</b>, <b>bairro</b>. No Excel: Arquivo &gt; Salvar como &gt; CSV. A Izza passa a chamar essas pessoas pelo nome e a oferecer o endereço. Importar de novo substitui a planilha anterior; ninguém é apagado do cadastro.</p>' +
      '<p class="muted small" id="ci-atual">…</p><label class="campo"><span>Arquivo</span><input type="file" id="ci-arq" accept=".csv,text/csv,text/plain"></label><div id="ci-prev" class="muted small"></div>' +
      '<div class="acoes"><button class="btn" data-fecha>Cancelar</button><button class="btn pri" id="ci-ok" disabled>Importar</button></div>', function (m) {
      var lista = null;
      api('clientes_base&loja=' + encodeURIComponent(l.id)).then(function (j) {
        m.querySelector('#ci-atual').textContent = j.total ? 'Última importação: ' + j.total + ' clientes, ' + quem(j.por) + ' · ' + dataHora(j.em) + '.' : 'Nenhuma planilha importada ainda.';
      }).catch(function () { m.querySelector('#ci-atual').textContent = ''; });
      m.querySelector('#ci-arq').onchange = function () {
        var f = this.files[0]; lista = null; m.querySelector('#ci-ok').disabled = true;
        if (!f) return;
        var r = new FileReader();
        r.onload = function () {
          try {
            lista = leCsv(String(r.result || ''));
            var ex = lista.slice(0, 3).map(function (c) { return esc(c.nome || '(sem nome)') + ' · ' + esc(c.telefone) + (c.rua ? ' · ' + esc(c.rua + (c.numero ? ', ' + c.numero : '')) : ''); }).join('<br>');
            m.querySelector('#ci-prev').innerHTML = lista.length ? '<b>' + lista.length + ' clientes</b> com telefone válido. Exemplo:<br>' + ex : 'Nenhuma linha com telefone válido.';
            m.querySelector('#ci-ok').disabled = !lista.length;
          } catch (e) { m.querySelector('#ci-prev').textContent = e.message; }
        };
        r.readAsText(f, 'utf-8');
      };
      m.querySelector('#ci-ok').onclick = function () {
        var b = this; b.disabled = true;
        api('clientes_importar', { loja: l.id, clientes: lista }).then(function (j) { fecharModal(); toast(j.total + ' clientes importados. A Izza recebe em até 1 minuto.'); })
          .catch(function (e) { toast(e.message, true); b.disabled = false; });
      };
    });
  }
  function pgClientes(el, l) {
    var pag = document.createElement('div'); pag.className = 'pagina'; el.innerHTML = ''; el.appendChild(pag);
    var head = '<div class="page-head"><div><h1>Clientes</h1><p>Quem já pediu pela Izza no WhatsApp da ' + esc(l.nome) + '. O cadastro (nome, endereços, compras na loja) vem da base de clientes atual da loja.</p></div>' +
      '<button class="btn" id="cl-imp">Importar clientes</button></div>';
    pag.addEventListener('click', function (ev) { if (ev.target.closest('#cl-imp')) importaClientes(l); });
    pag.innerHTML = head + '<div class="card vazio">Carregando…</div>';
    Promise.all([api('clientes&loja=' + encodeURIComponent(l.id)), api('pedidos&loja=' + encodeURIComponent(l.id))]).then(function (rs) {
      var cs = rs[0].clientes || [], peds = (rs[1].pedidos || []).slice().reverse(), filtro = { q: '', ord: 'ultimo' };
      if (!cs.length) { pag.innerHTML = head + '<div class="card vazio">O bot desta loja ainda não mandou os clientes. Eles chegam logo depois de ele reiniciar com a versão nova.</div>'; return; }
      var naBase = cs.filter(function (c) { return c.fonte === 'base'; }).length;
      pag.innerHTML = head +
        '<div class="stats"><div class="stat"><span>Clientes pelo WhatsApp</span><b>' + cs.length + '</b></div>' +
        '<div class="stat"><span>Achados na base da loja</span><b>' + naBase + '</b></div>' +
        '<div class="stat"><span>Gasto pelo WhatsApp</span><b>' + brl(cs.reduce(function (a, c) { return a + (c.totalWhats || 0); }, 0)) + '</b></div></div>' +
        '<div class="card"><div class="filtros-frase f2"><input type="search" id="cq" placeholder="Buscar por nome, telefone ou endereço…">' +
        '<select id="co"><option value="ultimo">Pedido mais recente</option><option value="pedidos">Mais pedidos pelo WhatsApp</option><option value="gasto">Maior gasto pelo WhatsApp</option><option value="nome">Nome</option></select></div>' +
        '<p class="muted small" style="margin:10px 0 0">Atualizado pelo bot em ' + esc(dataHora(rs[0].recebidoEm)) + '. Clique num cliente para ver endereços e pedidos.</p></div>' +
        '<div class="card"><div class="tabela-wrap"><table class="clientes"><thead><tr><th>Cliente</th><th>Telefone</th><th>Pedidos (Whats)</th><th>Gasto (Whats)</th><th>Último pelo Whats</th><th class="hide-m">Na loja (todos os canais)</th></tr></thead><tbody id="clista"></tbody></table></div></div>';
      function ends(c) { return c.base && c.base.enderecos && c.base.enderecos.length ? c.base.enderecos : c.enderecosWhats || []; }
      function desenha() {
        var q = filtro.q.toLowerCase(), qd = q.replace(/\D/g, '');
        var fs = cs.filter(function (c) {
          if (!q) return true;
          return [c.nome, c.nomeNoPedido, ends(c).map(fmtEnd).join(' ')].join(' ').toLowerCase().indexOf(q) >= 0 || (qd.length >= 4 && String(c.telefone).indexOf(qd) >= 0);
        });
        var ord = {
          ultimo: function (a, b) { return a.ultimoWhats < b.ultimoWhats ? 1 : -1; },
          pedidos: function (a, b) { return b.pedidosWhats - a.pedidosWhats; },
          gasto: function (a, b) { return b.totalWhats - a.totalWhats; },
          nome: function (a, b) { return String(a.nome).localeCompare(String(b.nome), 'pt-BR'); },
        }[filtro.ord];
        fs.sort(ord);
        $('#clista', pag).innerHTML = fs.length ? fs.map(function (c, i) {
          var b = c.base;
          return '<tr class="cli" data-ci="' + i + '"><td><b>' + esc(c.nome || '(sem nome)') + '</b>' + (c.fonte === 'base' ? '' : ' <span class="badge" title="Não achado na base de clientes da loja">só WhatsApp</span>') + '</td>' +
            '<td class="nowrap">' + esc(fmtTel(c.telefone)) + '</td><td class="num">' + c.pedidosWhats + '</td><td class="num">' + (brl(c.totalWhats) || '—') + '</td><td>' + esc(dataCurta(c.ultimoWhats)) + '</td>' +
            '<td class="hide-m muted small">' + (b ? nPed(b.pedidos || 0) + ' · ' + brl(b.valorTotal || 0) : '—') + '</td></tr>' +
            '<tr class="cli-det" hidden><td colspan="6"></td></tr>';
        }).join('') : '<tr><td colspan="6"><div class="vazio">Nenhum cliente com essa busca.</div></td></tr>';
        $('#clista', pag).querySelectorAll('tr.cli').forEach(function (tr) {
          tr.onclick = function () {
            var det = tr.nextElementSibling, c = fs[+tr.getAttribute('data-ci')], b = c.base;
            if (!det.hidden) { det.hidden = true; tr.classList.remove('aberto'); return; }
            var meus = peds.filter(function (p) { return p.telefone === c.telefone; });
            var e = ends(c);
            det.firstChild.innerHTML = '<div class="cli-box"><div class="pedido-info">' +
              '<div><span class="muted small">Endereços' + (b ? ' (cadastro da loja)' : ' (dos pedidos)') + '</span>' + (e.length ? e.map(function (x) { return '<div>' + esc(fmtEnd(x)) + '</div>'; }).join('') : '<div class="muted">nenhum</div>') + '</div>' +
              (b ? '<div><span class="muted small">Na loja, todos os canais</span><div>' + nPed(b.pedidos || 0) + ' · ' + brl(b.valorTotal || 0) + '</div><div class="muted small">primeira ' + esc(dataCurta(b.primeiraCompra)) + ' · última ' + esc(dataCurta(b.ultimaCompra)) + '</div></div>' : '') +
              (b && b.aniversario ? '<div><span class="muted small">Aniversário</span><div>' + esc(b.aniversario) + '</div></div>' : '') +
              (c.nomeNoPedido && c.nomeNoPedido !== c.nome ? '<div><span class="muted small">Nome dito no WhatsApp</span><div>' + esc(c.nomeNoPedido) + '</div></div>' : '') +
              '</div><h3 class="small" style="margin:14px 0 6px">Pedidos pelo WhatsApp (' + meus.length + ')</h3><div class="stack">' + meus.map(function (p) { return pedidoHtml(p, false); }).join('') + '</div></div>';
            ligaPedidos(det);
            det.hidden = false; tr.classList.add('aberto');
          };
        });
      }
      $('#cq', pag).oninput = function () { filtro.q = this.value; desenha(); };
      $('#co', pag).onchange = function () { filtro.ord = this.value; desenha(); };
      desenha();
    }).catch(function (e) { pag.innerHTML = head + '<div class="card vazio">' + esc(e.message) + '</div>'; });
  }

  // ------------------------------------------------------------- Ao vivo: alertas e pedidos novos (23/11/2026)
  // O bot manda na hora o que a tela da loja mostra (cliente esperando atendente, pedido
  // aguardando aprovacao, reclamacao, impressao que falhou, pedido expirado) e cada pedido
  // novo. O painel pergunta a cada 15 s; o que e novo toca som e vira notificacao.
  var TIPO_AL = {
    atendente: ['Cliente esperando atendente', '☎'],
    aprovacao: ['Pedido aguardando aprovação', '▤'],
    reclamacao: ['Reclamação', '!'],
    impressao: ['Impressão falhou', '⎙'],
    expirado: ['Pedido expirou', '⌛'],
  };
  var VIVO = { timer: null, loja: null, alertas: [], conhecidos: null, pedConhecidos: null, versao: '', recarregaPedidos: null, pedidos: [], quadro: {}, redesenhaQuadro: null };
  function somLigado() { try { return localStorage.getItem('wb_som') !== '0'; } catch (e) { return true; } }
  // Os mesmos sons do Titan (pedidos dame lov/public/index.html): harpa para pedido e mensagem
  // chegando (escolhida pelo Fábio em 08/10/2026) e bipe quadrado so para impressao que falhou.
  var audioCtx = null, harpa = null;
  function tocaHarpa() {
    try { harpa = harpa || new Audio('sons/alerta-harpa.wav'); harpa.currentTime = 0; harpa.play().catch(function () {}); } catch (e) {}
  }
  function tocaBipe(hz) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.frequency.value = hz || 880; o.type = 'square';
      g.gain.setValueAtTime(0.18, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      o.start(); o.stop(audioCtx.currentTime + 0.4);
    } catch (e) {}
  }
  // tipo 'impressao' = bipe; o resto (pedido, atendente, aprovacao, reclamacao) = harpa
  function som(tipo) {
    if (!somLigado()) return;
    if (tipo === 'impressao') tocaBipe(880); else tocaHarpa();
  }
  function notifica(titulo, corpo, tag) {
    try { if (window.Notification && Notification.permission === 'granted') new Notification(titulo, { body: corpo || '', tag: tag || titulo }); } catch (e) {}
  }
  function alertasAbertos(l) { return l && VIVO.loja === l.id ? VIVO.alertas.filter(function (a) { return !a.resolvido; }).length : 0; }
  function marcaContadores() {
    var n = alertasAbertos(loja());
    var b = $('#nav [data-p=alertas]');
    if (b) {
      var c = b.querySelector('.cont');
      if (n && !c) { c = document.createElement('span'); c.className = 'cont cont-alerta'; b.appendChild(c); }
      if (c) { if (n) c.textContent = n; else c.remove(); }
    }
    var s = $('#sino');
    if (s) { var x = s.querySelector('.sino-n'); x.hidden = !n; x.textContent = n > 99 ? '99+' : n; s.classList.toggle('tem', !!n); }
    atualizaChamado();
  }
  function poeSino() {
    if ($('#sino')) return;
    var b = document.createElement('button');
    b.className = 'icon-btn sino'; b.id = 'sino'; b.title = 'Alertas'; b.setAttribute('aria-label', 'Alertas');
    b.innerHTML = '🔔<span class="sino-n" hidden></span>';
    b.onclick = function () { ir('alertas'); };
    var tr = $('.top-right'); tr.insertBefore(b, tr.firstChild);
  }
  function vivo() {
    var l = loja(); if (!l) return;
    if (VIVO.loja !== l.id) { fechaChamado(); VIVO.loja = l.id; VIVO.alertas = []; VIVO.conhecidos = null; VIVO.pedConhecidos = null; VIVO.versao = ''; VIVO.pedidos = []; VIVO.quadro = {}; }
    var pediu = l.id;
    api('ao_vivo&loja=' + encodeURIComponent(l.id) + '&v=' + encodeURIComponent(VIVO.versao)).then(function (j) {
      if (VIVO.loja !== pediu) return;
      var primeira = !VIVO.conhecidos, novos = [];
      VIVO.conhecidos = VIVO.conhecidos || {};
      (j.alertas || []).forEach(function (a) {
        if (!primeira && !VIVO.conhecidos[a.id] && !a.resolvido) novos.push(a);
        VIVO.conhecidos[a.id] = 1;
      });
      VIVO.alertas = (j.alertas || []).slice().reverse();
      marcaContadores();
      if (novos.length) {
        var urg = novos.some(function (a) { return a.nivel === 'urgente'; });
        som(novos.every(function (a) { return a.tipo === 'impressao'; }) ? 'impressao' : 'harpa');
        novos.forEach(function (a) { notifica(a.titulo || 'Alerta da Izza', [a.nome, fmtTel(a.telefone), a.texto].filter(Boolean).join(' · '), a.id); });
        toast((novos.length === 1 ? novos[0].titulo : novos.length + ' alertas novos') + (novos[0].nome ? ' · ' + novos[0].nome : ''), urg);
      }
      VIVO.quadro = j.quadro || {};
      // decisao que o bot nao conseguiu cumprir (pedido ja tinha saido da fila, sistema recusou)
      var decAntes = VIVO.decisoes;
      VIVO.decisoes = j.decisoes || [];
      if (decAntes) VIVO.decisoes.forEach(function (d) {
        var a = decAntes.filter(function (x) { return x.id === d.id; })[0];
        if (a && a.estado === 'pendente' && d.estado === 'falhou') toast('A Izza não conseguiu ' + (d.decisao === 'aprovar' ? 'aprovar' : 'recusar') + ' o pedido: ' + (d.erro || 'erro'), true);
      });
      if (j.pedidos) {
        VIVO.pedidos = j.pedidos;
        var primeiraP = !VIVO.pedConhecidos, pedNovos = [];
        VIVO.pedConhecidos = VIVO.pedConhecidos || {};
        j.pedidos.forEach(function (p) { if (!primeiraP && !VIVO.pedConhecidos[p.id]) pedNovos.push(p); VIVO.pedConhecidos[p.id] = 1; });
        var mudou = VIVO.versao && VIVO.versao !== j.pedidosVersao;
        VIVO.versao = j.pedidosVersao;
        if (pedNovos.length) {
          if (!novos.length) som('harpa');
          pedNovos.forEach(function (p) { notifica('Pedido novo pelo WhatsApp', [p.nome, p.total != null ? brl(p.total) : ''].filter(Boolean).join(' · '), 'ped-' + p.id); });
          if (!novos.length) toast('Pedido novo' + (pedNovos[0].nome ? ' · ' + pedNovos[0].nome : ''));
        }
        if (mudou && S.pagina === 'pedidos' && VIVO.recarregaPedidos) VIVO.recarregaPedidos();
      }
      if (S.pagina === 'alertas' && (novos.length || primeira) && VIVO.redesenhaAlertas) VIVO.redesenhaAlertas();
      if (S.pagina === 'quadro' && VIVO.redesenhaQuadro) VIVO.redesenhaQuadro();
      atualizaAprovacao();
    }).catch(function () {});
  }
  function ligaVivo() {
    poeSino();
    if (!VIVO.timer) VIVO.timer = setInterval(vivo, 10000);
    vivo();
  }

  // ------------------------------------------------------------- Chamado de atendente em tela cheia (24/11/2026)
  // Igual ao Titan (pedidos dame lov/public/index.html, #wzHumano): cliente esperando atendente
  // cobre a tela inteira em laranja, com o telefone grande, e a harpa toca a cada 3 s ate alguem
  // clicar em "Ja estou falando com ele" (pedido do Fábio, 24/11). Toca mesmo com o Som desligado:
  // e o aviso que nao pode passar. Mais de um na fila: mostra o mais antigo primeiro.
  var CHAMADO = { id: null, timer: null, tituloAntes: null, el: null };
  function chamadoDaVez() {
    var corte = Date.now() - 12 * 3600 * 1000; // a fila do bot tambem esquece chamado de 12 h
    var abertos = (VIVO.alertas || []).filter(function (a) {
      var em = Date.parse(a.em || a.recebidoEm || '');
      return a.tipo === 'atendente' && !a.resolvido && (!em || em > corte);
    });
    return abertos.length ? abertos[abertos.length - 1] : null; // VIVO.alertas vem do mais novo ao mais antigo
  }
  function tocaChamado() {
    try {
      harpa = harpa || new Audio('sons/alerta-harpa.wav'); harpa.currentTime = 0;
      var p = harpa.play();
      if (p && p.then) p.then(function () { if (CHAMADO.el) CHAMADO.el.querySelector('.ch-mudo').hidden = true; })
        .catch(function () { if (CHAMADO.el) CHAMADO.el.querySelector('.ch-mudo').hidden = false; });
    } catch (e) {}
  }
  function elChamado() {
    if (CHAMADO.el) return CHAMADO.el;
    var d = document.createElement('div');
    d.id = 'chamado'; d.className = 'chamado-full'; d.setAttribute('role', 'alertdialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'ch-titulo');
    d.innerHTML = '<div class="ch-caixa">' +
      '<div class="ch-ico" aria-hidden="true">🙋</div>' +
      '<h2 id="ch-titulo">CLIENTE QUER FALAR COM ATENDENTE</h2>' +
      '<p>A Izza parou de responder essa conversa. Chame no WhatsApp da loja:</p>' +
      '<div class="ch-nome"></div><div class="ch-fone"></div>' +
      '<div class="ch-porque"></div>' +
      '<div class="ch-fila"></div>' +
      '<button type="button" class="ch-sim">Já estou falando com ele</button>' +
      '<p class="ch-mudo" hidden>O navegador bloqueou o som. Clique em qualquer lugar desta tela para ligar.</p>' +
      '</div>';
    d.addEventListener('click', function (e) { if (!e.target.closest('.ch-sim')) tocaChamado(); });
    d.querySelector('.ch-sim').onclick = assumiChamado;
    document.body.appendChild(d);
    CHAMADO.el = d;
    return d;
  }
  function abreChamado(a) {
    var d = elChamado(), l = loja();
    var porque = [l ? esc(l.nome) : '', esc(a.texto || 'o bot não conseguiu resolver')].filter(Boolean).join(' · ');
    if (a.fala) porque += '<span class="ch-fala">“' + esc(a.fala) + '”</span>';
    if (a.resumo) porque += '<span class="ch-resumo"><b>A Izza anotou:</b> ' + esc(a.resumo) + '</span>';
    d.querySelector('.ch-nome').textContent = a.nome || 'Cliente sem cadastro';
    d.querySelector('.ch-fone').textContent = fmtTel(a.telefone) || '';
    d.querySelector('.ch-porque').innerHTML = porque;
    var outros = (VIVO.alertas || []).filter(function (x) { return x.tipo === 'atendente' && !x.resolvido && x.id !== a.id; }).length;
    d.querySelector('.ch-fila').textContent = outros ? 'Depois deste, mais ' + outros + (outros === 1 ? ' cliente esperando.' : ' clientes esperando.') : '';
    d.classList.add('on');
    document.documentElement.classList.add('com-chamado');
    if (CHAMADO.id !== a.id) {
      CHAMADO.id = a.id;
      if (CHAMADO.tituloAntes === null) CHAMADO.tituloAntes = document.title;
      document.title = '🟠 CLIENTE QUER ATENDENTE';
      notifica('Cliente quer falar com atendente', [a.nome, fmtTel(a.telefone)].filter(Boolean).join(' · '), 'ch-' + a.id);
      tocaChamado(); clearInterval(CHAMADO.timer);
      CHAMADO.timer = setInterval(tocaChamado, 3000);
      setTimeout(function () { var b = d.querySelector('.ch-sim'); if (b) b.focus(); }, 0);
    }
  }
  function fechaChamado() {
    clearInterval(CHAMADO.timer); CHAMADO.timer = null; CHAMADO.id = null;
    if (CHAMADO.tituloAntes !== null) { document.title = CHAMADO.tituloAntes; CHAMADO.tituloAntes = null; }
    if (CHAMADO.el) CHAMADO.el.classList.remove('on');
    document.documentElement.classList.remove('com-chamado');
  }
  function atualizaChamado() {
    var a = chamadoDaVez();
    if (a) { if (APROVA.id) fechaAprova(); if (ERRO.id) fechaErro(); abreChamado(a); } else { fechaChamado(); atualizaErro(); }
  }

  // ------------------------------------------------------------- Erro em tela cheia (24/11/2026)
  // "Quando da um erro, tem que aparecer toda tela vermelha como nos outros alertas, esperando um
  // clique da atendente" (Fábio). Vale para o que precisa de mao: pedido que nao foi para a Saipos,
  // impressao que falhou, comanda parada (computador da impressora desligado) e pedido que expirou
  // sem aprovacao. A harpa toca a cada 3 s ate "Entendi, vou resolver" (resolve o alerta para todos).
  // Ordem da vez: chamado de atendente, depois erro, depois pedido para aprovar.
  var ERRO = { id: null, timer: null, el: null };
  function erroDaVez() {
    var corte = Date.now() - 12 * 3600 * 1000;
    var abertos = (VIVO.alertas || []).filter(function (a) {
      var em = Date.parse(a.em || a.recebidoEm || '');
      return (a.tipo === 'impressao' || a.tipo === 'expirado') && !a.resolvido && (!em || em > corte);
    });
    return abertos.length ? abertos[abertos.length - 1] : null;
  }
  function tocaErro() {
    try {
      harpa = harpa || new Audio('sons/alerta-harpa.wav'); harpa.currentTime = 0;
      var x = harpa.play();
      if (x && x.then) x.then(function () { if (ERRO.el) ERRO.el.querySelector('.ch-mudo').hidden = true; })
        .catch(function () { if (ERRO.el) ERRO.el.querySelector('.ch-mudo').hidden = false; });
    } catch (e) {}
  }
  function elErro() {
    if (ERRO.el) return ERRO.el;
    var d = document.createElement('div');
    d.id = 'erro-full'; d.className = 'chamado-full erro-full'; d.setAttribute('role', 'alertdialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'er-titulo');
    d.innerHTML = '<div class="ch-caixa">' +
      '<div class="ch-ico" aria-hidden="true">⚠️</div>' +
      '<h2 id="er-titulo"></h2>' +
      '<div class="ch-nome"></div><div class="er-fone"></div>' +
      '<div class="ch-porque"></div>' +
      '<div class="ch-fila"></div>' +
      '<button type="button" class="ch-sim">Entendi, vou resolver</button>' +
      '<p class="ch-mudo" hidden>O navegador bloqueou o som. Clique em qualquer lugar desta tela para ligar.</p>' +
      '</div>';
    d.addEventListener('click', function (e) { if (!e.target.closest('.ch-sim')) tocaErro(); });
    d.querySelector('.ch-sim').onclick = resolveErro;
    document.body.appendChild(d);
    ERRO.el = d;
    return d;
  }
  function abreErro(a) {
    var d = elErro(), l = loja();
    d.querySelector('#er-titulo').textContent = String(a.titulo || 'Erro').toUpperCase();
    d.querySelector('.ch-nome').textContent = a.nome || '';
    d.querySelector('.er-fone').textContent = fmtTel(a.telefone) || '';
    d.querySelector('.ch-porque').innerHTML = [l ? esc(l.nome) : '', a.codigo ? 'Pedido nº ' + esc(a.codigo) : ''].filter(Boolean).join(' · ') +
      '<span class="ch-resumo">' + esc(a.texto || '') + '</span>';
    var outros = (VIVO.alertas || []).filter(function (x) { return (x.tipo === 'impressao' || x.tipo === 'expirado') && !x.resolvido && x.id !== a.id; }).length;
    d.querySelector('.ch-fila').textContent = outros ? 'Depois deste, mais ' + outros + (outros === 1 ? ' erro.' : ' erros.') : '';
    d.classList.add('on');
    document.documentElement.classList.add('com-chamado');
    if (ERRO.id !== a.id) {
      ERRO.id = a.id;
      d.querySelector('.ch-sim').disabled = false;
      notifica(a.titulo || 'Erro na Izza', [a.nome, a.texto].filter(Boolean).join(' · '), 'er-' + a.id);
      tocaErro(); clearInterval(ERRO.timer);
      ERRO.timer = setInterval(tocaErro, 3000);
      setTimeout(function () { var b = d.querySelector('.ch-sim'); if (b) b.focus(); }, 0);
    }
  }
  function fechaErro() {
    clearInterval(ERRO.timer); ERRO.timer = null; ERRO.id = null;
    if (ERRO.el) ERRO.el.classList.remove('on');
    if (!CHAMADO.id && !APROVA.id) document.documentElement.classList.remove('com-chamado');
  }
  function atualizaErro() {
    var a = CHAMADO.id ? null : erroDaVez();
    if (a) { if (APROVA.id) fechaAprova(); abreErro(a); } else { fechaErro(); atualizaAprovacao(); }
  }
  function resolveErro() {
    var l = loja(), id = ERRO.id; if (!l || !id) return fechaErro();
    var b = ERRO.el.querySelector('.ch-sim'); b.disabled = true;
    api('alerta_resolver', { loja: l.id, id: id }).then(function () {
      VIVO.alertas.forEach(function (a) { if (a.id === id) { a.resolvido = true; a.resolvidoPor = S.dados.eu.email; a.resolvidoEm = new Date().toISOString(); } });
      fechaErro(); marcaContadores();
      if (S.pagina === 'alertas' && VIVO.redesenhaAlertas) VIVO.redesenhaAlertas();
    }).catch(function (e) { toast(e.message, true); b.disabled = false; });
  }
  function assumiChamado() {
    var l = loja(), id = CHAMADO.id; if (!l || !id) return fechaChamado();
    var b = CHAMADO.el.querySelector('.ch-sim'); b.disabled = true;
    api('alerta_resolver', { loja: l.id, id: id }).then(function () {
      VIVO.alertas.forEach(function (a) { if (a.id === id) { a.resolvido = true; a.resolvidoPor = S.dados.eu.email; a.resolvidoEm = new Date().toISOString(); } });
      fechaChamado(); marcaContadores();
      if (S.pagina === 'alertas' && VIVO.redesenhaAlertas) VIVO.redesenhaAlertas();
      if (S.pagina === 'quadro' && VIVO.redesenhaQuadro) VIVO.redesenhaQuadro();
    }).catch(function (e) { toast(e.message, true); }).then(function () { b.disabled = false; });
  }

  // ------------------------------------------------------------- Aprovar pelo painel (24/11/2026, etapa 3)
  // O que o Titan fazia na aba WhatsApp: pedido novo da Izza cobre a tela em verde, com os itens,
  // o endereco, o pagamento e o total, e a harpa toca a cada 3 s ate alguem aprovar ou recusar.
  // A decisao vai para a fila (pedido_decidir) e o bot cumpre em segundos (bot_eventos): lanca no
  // sistema de pedidos e confirma ao cliente, ou passa a conversa para a loja. So pedido do bot que
  // le o painel (aprovaNoPainel); os das lojas seguem aprovados no Titan. Chamado de atendente
  // aberto tem a vez: a aprovacao espera ele fechar.
  var APROVA = { id: null, timer: null, el: null, decididos: {} };
  function decisaoDo(pid) {
    var ds = (VIVO.decisoes || []).filter(function (d) { return d.pedido === pid; });
    return ds.length ? ds[ds.length - 1] : null;
  }
  function esperandoAprovacao(p) {
    if (!p || p.status !== 'enviado' || !p.aprovaNoPainel) return false;
    var d = decisaoDo(p.id);
    if (d && d.estado !== 'falhou') return false;
    if (APROVA.decididos[p.id] && (!d || Date.parse(d.em) < APROVA.decididos[p.id])) return false;
    return Date.now() - (Date.parse(p.em) || 0) < 3 * 3600e3;
  }
  function aprovacaoDaVez() {
    var l = loja(); if (!l || VIVO.loja !== l.id) return null;
    var fila = (VIVO.pedidos || []).filter(esperandoAprovacao).sort(function (a, b) { return (Date.parse(a.em) || 0) - (Date.parse(b.em) || 0); });
    return fila.length ? { p: fila[0], mais: fila.length - 1 } : null;
  }
  function tocaAprova() {
    try {
      harpa = harpa || new Audio('sons/alerta-harpa.wav'); harpa.currentTime = 0;
      var x = harpa.play();
      if (x && x.then) x.then(function () { if (APROVA.el) APROVA.el.querySelector('.ch-mudo').hidden = true; })
        .catch(function () { if (APROVA.el) APROVA.el.querySelector('.ch-mudo').hidden = false; });
    } catch (e) {}
  }
  function elAprova() {
    if (APROVA.el) return APROVA.el;
    var d = document.createElement('div');
    d.id = 'aprova'; d.className = 'chamado-full aprova-full'; d.setAttribute('role', 'alertdialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'ap-titulo');
    d.innerHTML = '<div class="ch-caixa">' +
      '<div class="ch-ico" aria-hidden="true">🍕</div>' +
      '<h2 id="ap-titulo">PEDIDO NOVO PARA APROVAR</h2>' +
      '<div class="ch-nome"></div><div class="ap-fone"></div>' +
      '<div class="ch-porque ap-det"></div>' +
      '<div class="ap-total"></div>' +
      '<div class="ap-botoes"><button type="button" class="ch-sim ap-sim">Aprovar pedido</button><button type="button" class="ap-nao">Recusar</button></div>' +
      '<div class="ap-recusa" hidden><label>Por que a loja vai recusar? (vai para a atendente, não para o cliente)<input type="text" maxlength="200" placeholder="ex.: acabou a massa, endereço fora da área"></label>' +
        '<div class="ap-botoes"><button type="button" class="ap-nao ap-confirma">Recusar e falar com o cliente</button><button type="button" class="ap-volta">Voltar</button></div></div>' +
      '<div class="ch-fila"></div>' +
      '<p class="ch-mudo" hidden>O navegador bloqueou o som. Clique em qualquer lugar desta tela para ligar.</p>' +
      '</div>';
    d.addEventListener('click', function (e) { if (!e.target.closest('button,input,label')) tocaAprova(); });
    d.querySelector('.ap-sim').onclick = function () { decide('aprovar'); };
    d.querySelector('.ap-botoes .ap-nao').onclick = function () { d.querySelector('.ap-recusa').hidden = false; d.querySelector('.ap-recusa input').focus(); };
    d.querySelector('.ap-volta').onclick = function () { d.querySelector('.ap-recusa').hidden = true; };
    d.querySelector('.ap-confirma').onclick = function () { decide('recusar', d.querySelector('.ap-recusa input').value); };
    document.body.appendChild(d);
    APROVA.el = d;
    return d;
  }
  function detalheAprova(p) {
    var itens = itensDo(p.resumo);
    var lugar = p.retirada ? '<b>Retirada no balcão</b>' : '<b>Entrega:</b> ' + esc([p.endereco && p.endereco.rua, p.endereco && p.endereco.numero, p.endereco && p.endereco.complemento, p.endereco && p.endereco.bairro].filter(Boolean).join(', ') || 'endereço no resumo');
    return (itens.length ? '<ul class="ap-itens">' + itens.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<pre class="ap-resumo">' + esc(p.resumo || '') + '</pre>') +
      '<div class="ap-linha">' + lugar + '</div>' +
      (p.pagamento ? '<div class="ap-linha"><b>Pagamento:</b> ' + esc(p.pagamento) + '</div>' : '') +
      (p.agendadoPara ? '<div class="ap-linha"><b>Para:</b> ' + esc(p.agendadoPara) + '</div>' : '');
  }
  function abreAprova(v) {
    var d = elAprova(), p = v.p, dec = decisaoDo(p.id);
    d.querySelector('.ch-nome').textContent = p.nome || 'Cliente sem cadastro';
    d.querySelector('.ap-fone').textContent = fmtTel(p.telefone) || '';
    d.querySelector('.ap-det').innerHTML = detalheAprova(p) + (dec && dec.estado === 'falhou' ? '<div class="ap-erro">A última tentativa não deu: ' + esc(dec.erro || 'erro') + '</div>' : '');
    d.querySelector('.ap-total').textContent = p.total != null ? brl(p.total) : '';
    d.querySelector('.ch-fila').textContent = v.mais ? 'Depois deste, mais ' + v.mais + (v.mais === 1 ? ' pedido esperando.' : ' pedidos esperando.') : '';
    d.classList.add('on');
    document.documentElement.classList.add('com-chamado');
    if (APROVA.id !== p.id) {
      APROVA.id = p.id;
      d.querySelector('.ap-recusa').hidden = true; d.querySelector('.ap-recusa input').value = '';
      d.querySelectorAll('button').forEach(function (b) { b.disabled = false; });
      notifica('Pedido novo para aprovar', [p.nome, p.total != null ? brl(p.total) : ''].filter(Boolean).join(' · '), 'ap-' + p.id);
      tocaAprova(); clearInterval(APROVA.timer);
      APROVA.timer = setInterval(tocaAprova, 3000);
      setTimeout(function () { var b = d.querySelector('.ap-sim'); if (b) b.focus(); }, 0);
    }
  }
  function fechaAprova() {
    clearInterval(APROVA.timer); APROVA.timer = null; APROVA.id = null;
    if (APROVA.el) APROVA.el.classList.remove('on');
    if (!CHAMADO.id && !ERRO.id) document.documentElement.classList.remove('com-chamado');
  }
  function atualizaAprovacao() {
    var v = CHAMADO.id || ERRO.id ? null : aprovacaoDaVez();
    if (v) abreAprova(v); else fechaAprova();
  }
  function decide(decisao, motivo, pid) {
    var l = loja(); pid = pid || APROVA.id; if (!l || !pid) return Promise.resolve();
    if (APROVA.el) APROVA.el.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
    return api('pedido_decidir', { loja: l.id, id: pid, decisao: decisao, motivo: motivo || '' }).then(function (j) {
      APROVA.decididos[pid] = Date.now();
      if (j.decisao) { VIVO.decisoes = (VIVO.decisoes || []).concat([j.decisao]); }
      toast(decisao === 'aprovar' ? 'Aprovado: a Izza lança o pedido e confirma ao cliente.' : 'Recusado: a conversa passa para a loja.');
      atualizaAprovacao();
      if (S.pagina === 'quadro' && VIVO.redesenhaQuadro) VIVO.redesenhaQuadro();
      // o bot cumpre em ate ~5 s: pergunta de novo logo, para o card andar
      setTimeout(vivo, 5000); setTimeout(vivo, 12000);
    }).catch(function (e) {
      toast(e.message, true);
      if (APROVA.el) APROVA.el.querySelectorAll('button').forEach(function (b) { b.disabled = false; });
    });
  }

  // ------------------------------------------------------------- Alertas
  function pgAlertas(el, l) {
    var pag = document.createElement('div'); pag.className = 'pagina'; el.innerHTML = ''; el.appendChild(pag);
    var ver = 'abertos';
    function permissaoHtml() {
      if (!window.Notification) return '<span class="muted small">Este navegador não mostra notificações.</span>';
      if (Notification.permission === 'granted') return '<span class="badge ok">Notificações ligadas</span>';
      if (Notification.permission === 'denied') return '<span class="badge warn">Notificações bloqueadas no navegador</span>';
      return '<button class="btn sm" id="al-notif">Ativar notificações</button>';
    }
    function desenha() {
      var lista = VIVO.loja === l.id ? VIVO.alertas : [];
      var abertos = lista.filter(function (a) { return !a.resolvido; });
      var mostra = ver === 'abertos' ? abertos : lista.slice(0, 200);
      pag.innerHTML = '<div class="page-head"><div><h1>Alertas</h1><p>O que precisa de alguém da ' + esc(l.nome) + ' agora: cliente esperando atendente, pedido para aprovar, reclamação, impressão que falhou. Atualiza sozinho.</p></div>' +
        (abertos.length ? '<button class="btn" id="al-todos">Marcar todos como resolvidos</button>' : '') + '</div>' +
        '<div class="card"><div class="linha" style="justify-content:space-between;flex-wrap:wrap;gap:10px">' +
          '<div class="seg" id="al-ver"><button type="button" data-v="abertos" class="' + (ver === 'abertos' ? 'on' : '') + '">Abertos (' + abertos.length + ')</button><button type="button" data-v="todos" class="' + (ver === 'todos' ? 'on' : '') + '">Todos</button></div>' +
          '<div class="linha" style="gap:10px">' + permissaoHtml() + '<label class="fp-radio"><input type="checkbox" id="al-som"' + (somLigado() ? ' checked' : '') + '>Som</label><button class="btn sm" id="al-tocar">Testar som</button></div>' +
        '</div></div>' +
        '<div class="stack" id="al-lista">' + (mostra.length ? mostra.map(alertaHtml).join('') : '<div class="card vazio">' + (ver === 'abertos' ? 'Nenhum alerta aberto.' : 'Nenhum alerta ainda.') + '</div>') + '</div>';
      pag.querySelectorAll('#al-ver button').forEach(function (b) { b.onclick = function () { ver = b.getAttribute('data-v'); desenha(); }; });
      if ($('#al-notif', pag)) $('#al-notif', pag).onclick = function () { Notification.requestPermission().then(desenha); };
      $('#al-som', pag).onchange = function () { try { localStorage.setItem('wb_som', this.checked ? '1' : '0'); } catch (e) {} };
      $('#al-tocar', pag).onclick = function () { var s = somLigado(); try { localStorage.setItem('wb_som', '1'); } catch (e) {} som('harpa'); if (!s) try { localStorage.setItem('wb_som', '0'); } catch (e) {} };
      pag.querySelectorAll('[data-resolve]').forEach(function (b) {
        b.onclick = function () { resolve({ loja: l.id, id: b.getAttribute('data-resolve') }); };
      });
      if ($('#al-todos', pag)) $('#al-todos', pag).onclick = function () { resolve({ loja: l.id, todos: true }); };
    }
    function resolve(corpo) {
      api('alerta_resolver', corpo).then(function (j) {
        VIVO.alertas.forEach(function (a) { if (!a.resolvido && (corpo.todos || a.id === corpo.id)) { a.resolvido = true; a.resolvidoPor = S.dados.eu.email; a.resolvidoEm = new Date().toISOString(); } });
        marcaContadores(); desenha(); toast(j.resolvidos === 1 ? 'Alerta resolvido.' : j.resolvidos + ' alertas resolvidos.');
      }).catch(function (e) { toast(e.message, true); });
    }
    VIVO.redesenhaAlertas = desenha;
    desenha();
    if (VIVO.loja !== l.id) vivo();
  }
  function alertaHtml(a) {
    var t = TIPO_AL[a.tipo] || [a.tipo || 'Alerta', '•'];
    return '<div class="card alerta' + (a.resolvido ? ' resolvido' : a.nivel === 'urgente' ? ' urgente' : '') + '">' +
      '<div class="alerta-ic">' + t[1] + '</div>' +
      '<div class="alerta-corpo"><div class="linha" style="gap:8px;flex-wrap:wrap"><b>' + esc(a.titulo || t[0]) + '</b>' +
        (a.resolvido ? '<span class="badge ok">Resolvido</span>' : a.nivel === 'urgente' ? '<span class="badge err">Urgente</span>' : '<span class="badge warn">Aviso</span>') + '</div>' +
        (a.nome || a.telefone ? '<div>' + esc(a.nome || '') + (a.telefone ? ' <a href="https://wa.me/' + esc(String(a.telefone).replace(/\D/g, '')) + '" target="_blank" rel="noopener">' + esc(fmtTel(a.telefone)) + '</a>' : '') + '</div>' : '') +
        (a.texto ? '<div class="muted">' + esc(a.texto) + '</div>' : '') +
        '<div class="muted small">' + esc(dataHora(a.em || a.recebidoEm)) + (a.resolvido ? ' · resolvido' + (a.resolvidoPor ? ' por ' + esc(a.resolvidoPor === 'loja' ? 'a loja na tela' : a.resolvidoPor === 'prazo' ? 'prazo' : quem(a.resolvidoPor)) : '') + (a.resolvidoEm ? ' ' + esc(dataHora(a.resolvidoEm)) : '') : '') + '</div>' +
      '</div>' +
      (a.resolvido ? '' : '<button class="btn sm" data-resolve="' + esc(a.id) + '">Resolvido</button>') + '</div>';
  }

  // ------------------------------------------------------------- Quadro (kanban, 23/11/2026)
  // Tela que fica aberta na loja: os pedidos da Izza andando por Novos -> Em preparo -> Saiu/Pronto
  // -> Concluidos. A coluna e da loja (quadro_mover, guardada no painel); o bot nao le. Pedido
  // recusado, que nao entrou ou parado ha 4 h vai direto para Concluidos. So o expediente atual: as
  // 15 h o quadro vira e os pedidos de antes somem dele (ficam na pagina Pedidos). Sem coluna de
  // alertas desde 24/11 (Fábio): chamado de atendente e so a tela cheia; o resto fica em Alertas.
  // Expediente vira as 15 h (Fábio, 24/11/2026): pedido da madrugada conta no dia em que a loja abriu.
  var VIRADA_H = 15;
  function inicioExpediente(t) {
    var d = t ? new Date(t) : new Date(), c = new Date(d.getTime());
    c.setHours(VIRADA_H, 0, 0, 0);
    if (d < c) c.setDate(c.getDate() - 1);
    return c;
  }
  function chaveDia(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function diaDoPedido(iso) { return chaveDia(inicioExpediente(iso)); }
  function nomeDia(chave) {
    var hoje = new Date(), ontem = new Date(); ontem.setDate(ontem.getDate() - 1); // dia do calendario
    var d = new Date(chave + 'T12:00:00');
    var sem = d.toLocaleDateString('pt-BR', { weekday: 'long' });
    var data = d.toLocaleDateString('pt-BR', d.getFullYear() === new Date().getFullYear() ? { day: '2-digit', month: '2-digit' } : undefined);
    if (chave === chaveDia(hoje)) return 'Hoje · ' + sem + ', ' + data;
    if (chave === chaveDia(ontem)) return 'Ontem · ' + sem + ', ' + data;
    return sem.charAt(0).toUpperCase() + sem.slice(1) + ', ' + data;
  }
  var COLS_Q = [
    { id: 'novo', nome: 'Novos' },
    { id: 'preparo', nome: 'Em preparo' },
    { id: 'saiu', nome: 'Saiu / pronto' },
    { id: 'concluido', nome: 'Concluídos' },
  ];
  var QD = { wake: null, relogio: null };
  function saiQuadro() {
    document.body.classList.remove('quadro-cheio');
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
    if (QD.wake) { try { QD.wake.release(); } catch (e) {} QD.wake = null; }
    if (QD.relogio) { clearInterval(QD.relogio); QD.relogio = null; }
    VIVO.redesenhaQuadro = null;
  }
  // tela da loja nao apaga enquanto o Quadro esta aberto
  function acordado() {
    try {
      if (navigator.wakeLock && !QD.wake && document.visibilityState === 'visible') {
        navigator.wakeLock.request('screen').then(function (w) { QD.wake = w; w.addEventListener('release', function () { QD.wake = null; }); }).catch(function () {});
      }
    } catch (e) {}
  }
  document.addEventListener('visibilitychange', function () { if (S.pagina === 'quadro') acordado(); });
  function colunaDe(p) {
    var q = VIVO.quadro[p.id];
    if (q && q.col) return q.col;
    if (p.status === 'recusado' || p.status === 'expirado' || p.status === 'cancelado') return 'concluido';
    // ninguem mexeu em 4 h: ja foi (nao deixa pedido de ontem parado em Novos)
    if (p.em && Date.now() - new Date(p.em).getTime() > 4 * 3600e3) return 'concluido';
    return 'novo';
  }
  function minutos(iso) { return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000)); }
  function idade(iso) { var m = minutos(iso); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; }
  function hora(iso) { return iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''; }
  // linhas de item do resumo ("- 1 pizza grande..."), sem cabecalho, total e pergunta do pagamento
  function itensDo(resumo) {
    return String(resumo || '').split('\n').filter(function (x) { return /^\s*[-•]/.test(x); }).map(function (x) { return x.replace(/^\s*[-•]\s*/, '').replace(/\*/g, ''); });
  }
  function pgQuadro(el, l) {
    el.innerHTML = '';
    var pag = document.createElement('div'); pag.className = 'pagina quadro-pag'; el.appendChild(pag);
    var arrastando = null;
    function cardPedido(p, col) {
      var st = ST_PED[p.status] || [p.status, ''];
      var m = minutos(p.em), atrasado = (col === 'novo' && m >= 15) || (col === 'preparo' && m >= 40);
      var itens = itensDo(p.resumo);
      var i = COLS_Q.map(function (c) { return c.id; }).indexOf(col);
      var morto = p.status === 'recusado' || p.status === 'expirado' || p.status === 'cancelado';
      var lugar = [p.endereco && p.endereco.bairro ? p.endereco.bairro : '', p.pagamento || ''].filter(Boolean).join(' · ');
      // pedido do bot que le o painel, esperando a loja: Aprovar / Recusar no card
      var decide_ = p.status === 'enviado' && p.aprovaNoPainel;
      return '<div class="qcard' + (atrasado ? ' atrasado' : '') + (morto ? ' morto' : '') + '" draggable="true" data-ped="' + esc(p.id) + '">' +
        '<div class="qcard-top"><b>' + esc(p.nome || fmtTel(p.telefone) || 'Cliente') + '</b><span class="qcard-h" title="' + esc(dataHora(p.em)) + '">' + esc(hora(p.em)) + ' · ' + esc(idade(p.em)) + '</span></div>' +
        '<div class="qcard-tags"><span class="badge ' + st[1] + '">' + esc(st[0]) + '</span>' +
          (p.retirada != null ? '<span class="badge">' + (p.retirada ? 'Retirada' : 'Entrega') + '</span>' : '') +
          (p.codigo ? '<span class="badge">nº ' + esc(p.codigo) + '</span>' : '') +
          (p.agendadoPara ? '<span class="badge acc">para ' + esc(p.agendadoPara) + '</span>' : '') + '</div>' +
        (itens.length ? '<ul class="qcard-itens">' + itens.slice(0, 4).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') +
          (itens.length > 4 ? '<li class="muted">+ ' + (itens.length - 4) + (itens.length - 4 === 1 ? ' item' : ' itens') + '</li>' : '') + '</ul>' : '') +
        '<div class="qcard-pe"><span class="muted small">' + esc(lugar) + '</span><b>' + (p.total != null ? brl(p.total) : '') + '</b></div>' +
        (decide_ ? acoesAprova(p) :
        '<div class="qcard-acoes">' +
          (i > 0 ? '<button class="btn sm" data-mover="' + COLS_Q[i - 1].id + '" title="Voltar para ' + esc(COLS_Q[i - 1].nome) + '">←</button>' : '<span></span>') +
          '<button class="btn sm" data-ver>Ver</button>' +
          (i < COLS_Q.length - 1 ? '<button class="btn sm pri" data-mover="' + COLS_Q[i + 1].id + '">' + esc(COLS_Q[i + 1].nome) + ' →</button>' : '<span></span>') +
        '</div>') + '</div>';
    }
    function acoesAprova(p) {
      var d = decisaoDo(p.id);
      if (d && d.estado === 'pendente') return '<div class="qcard-acoes"><span></span><span class="muted small">' + (d.decisao === 'aprovar' ? 'Aprovando…' : 'Recusando…') + '</span><span></span></div>';
      return (d && d.estado === 'falhou' ? '<div class="qcard-erro">Não deu: ' + esc(d.erro || 'erro') + '</div>' : '') +
        '<div class="qcard-acoes"><button class="btn sm" data-recusa>Recusar</button><button class="btn sm" data-ver>Ver</button><button class="btn sm pri" data-aprova>Aprovar</button></div>';
    }
    function desenha() {
      if (S.pagina !== 'quadro' || !pag.isConnected) return;
      var desde = inicioExpediente().getTime();
      var peds = (VIVO.loja === l.id ? VIVO.pedidos : []).filter(function (p) { return p.em && new Date(p.em).getTime() >= desde; });
      var porCol = { novo: [], preparo: [], saiu: [], concluido: [] };
      peds.forEach(function (p) { (porCol[colunaDe(p)] || porCol.novo).push(p); });
      function ms(p) { return Date.parse(p.em) || 0; }
      ['novo', 'preparo', 'saiu'].forEach(function (k) { porCol[k].sort(function (a, b) { return ms(a) - ms(b); }); });
      porCol.concluido.sort(function (a, b) { return ms(b) - ms(a); });
      var cheio = document.body.classList.contains('quadro-cheio');
      var notif = window.Notification ? Notification.permission : 'nao';
      var rolagem = [].map.call(pag.querySelectorAll('.qcol-corpo'), function (x) { return x.scrollTop; });
      pag.innerHTML = '<div class="quadro-head"><div class="linha" style="gap:10px;flex-wrap:wrap"><h1>Quadro · ' + esc(l.nome) + '</h1><span class="badge ok vivo-pill"><span class="dot"></span>ao vivo</span><span class="muted small">' + esc(hora(new Date().toISOString())) + '</span></div>' +
        '<div class="linha" style="gap:8px;flex-wrap:wrap">' +
          (notif === 'default' ? '<button class="btn sm" id="qd-notif">Ativar notificações</button>' : '') +
          '<label class="fp-radio"><input type="checkbox" id="qd-som"' + (somLigado() ? ' checked' : '') + '>Som</label>' +
          '<button class="btn sm" id="qd-cheio">' + (cheio ? 'Sair da tela cheia' : '⛶ Tela cheia') + '</button></div></div>' +
        '<div class="quadro">' +
          COLS_Q.map(function (c) {
            var lista = c.id === 'concluido' ? porCol.concluido.slice(0, 30) : porCol[c.id];
            return '<section class="qcol" data-col="' + c.id + '"><header><span>' + esc(c.nome) + '</span><span class="cont">' + porCol[c.id].length + '</span></header><div class="qcol-corpo">' +
              (lista.length ? lista.map(function (p) { return cardPedido(p, c.id); }).join('') : '<div class="qvazio">' + (c.id === 'novo' ? 'Pedido novo da Izza aparece aqui, com som.' : 'Arraste um pedido para cá.') + '</div>') + '</div></section>';
          }).join('') +
        '</div>';
      [].forEach.call(pag.querySelectorAll('.qcol-corpo'), function (x, i) { x.scrollTop = rolagem[i] || 0; });
      liga();
    }
    function mover(id, col) {
      var ant = VIVO.quadro[id];
      VIVO.quadro[id] = { col: col, por: S.dados.eu.email, em: new Date().toISOString() };
      desenha();
      api('quadro_mover', { loja: l.id, id: id, coluna: col }).catch(function (e) {
        if (ant) VIVO.quadro[id] = ant; else delete VIVO.quadro[id];
        desenha(); toast(e.message, true);
      });
    }
    function liga() {
      if ($('#qd-notif', pag)) $('#qd-notif', pag).onclick = function () { Notification.requestPermission().then(desenha); };
      $('#qd-som', pag).onchange = function () { try { localStorage.setItem('wb_som', this.checked ? '1' : '0'); } catch (e) {} if (this.checked) som('harpa'); };
      $('#qd-cheio', pag).onclick = function () {
        var on = !document.body.classList.contains('quadro-cheio');
        document.body.classList.toggle('quadro-cheio', on);
        try {
          if (on && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
          else if (!on && document.fullscreenElement) document.exitFullscreen();
        } catch (e) {}
        desenha();
      };
      pag.querySelectorAll('.qcard[data-ped]').forEach(function (c) {
        var id = c.getAttribute('data-ped');
        c.querySelectorAll('[data-mover]').forEach(function (b) { b.onclick = function () { mover(id, b.getAttribute('data-mover')); }; });
        var bv = c.querySelector('[data-ver]'); if (bv) bv.onclick = function () { verPedido(id); };
        var ba = c.querySelector('[data-aprova]'); if (ba) ba.onclick = function () { ba.disabled = true; decide('aprovar', '', id); };
        var br = c.querySelector('[data-recusa]'); if (br) br.onclick = function () {
          modal('<h3>Recusar o pedido</h3><p class="muted small">O pedido não entra e a conversa passa para a loja. O motivo vai para a atendente, não para o cliente.</p>' +
            '<label class="campo"><span>Motivo (opcional)</span><input type="text" id="rc-mot" maxlength="200"></label>' +
            '<div class="acoes"><button class="btn" data-fecha>Voltar</button><button class="btn perigo" id="rc-ok">Recusar</button></div>', function (m) {
            m.querySelector('#rc-ok').onclick = function () { var mot = m.querySelector('#rc-mot').value; fecharModal(); decide('recusar', mot, id); };
          });
        };
        c.ondragstart = function (ev) { arrastando = id; c.classList.add('arrasta'); try { ev.dataTransfer.setData('text/plain', id); ev.dataTransfer.effectAllowed = 'move'; } catch (e) {} };
        c.ondragend = function () { arrastando = null; c.classList.remove('arrasta'); pag.querySelectorAll('.qcol.alvo').forEach(function (x) { x.classList.remove('alvo'); }); };
      });
      pag.querySelectorAll('.qcol[data-col]').forEach(function (col) {
        col.ondragover = function (ev) { if (!arrastando) return; ev.preventDefault(); col.classList.add('alvo'); };
        col.ondragleave = function (ev) { if (!col.contains(ev.relatedTarget)) col.classList.remove('alvo'); };
        col.ondrop = function (ev) {
          ev.preventDefault(); col.classList.remove('alvo');
          var id = arrastando; arrastando = null;
          var p = VIVO.pedidos.filter(function (x) { return x.id === id; })[0];
          if (p && colunaDe(p) !== col.getAttribute('data-col')) mover(id, col.getAttribute('data-col'));
        };
      });
    }
    function verPedido(id) {
      var p = VIVO.pedidos.filter(function (x) { return x.id === id; })[0]; if (!p) return;
      modal('<h3>' + esc(p.nome || 'Pedido') + '</h3>' + pedidoHtml(p, true).replace('<div class="pedido-det" hidden>', '<div class="pedido-det">') +
        '<div class="acoes"><button class="btn" data-fecha>Fechar</button></div>', function (m) {
        var b = m.querySelector('[data-imprime]'); if (b) b.onclick = function () { imprimeComanda(p, l); };
      });
    }
    VIVO.redesenhaQuadro = desenha;
    acordado();
    // relogio e "ha X min" dos cards andam sozinhos
    if (!QD.relogio) QD.relogio = setInterval(function () { if (S.pagina === 'quadro' && VIVO.redesenhaQuadro) VIVO.redesenhaQuadro(); }, 60000);
    desenha();
    // pedidos completos vem do ao_vivo: forca a lista na primeira abertura
    if (VIVO.loja !== l.id || !VIVO.pedidos.length) { VIVO.versao = ''; vivo(); }
  }

  // ------------------------------------------------------------- Pedidos (ao vivo)
  function pgPedidos(el, l) {
    var pag = document.createElement('div'); pag.className = 'pagina'; el.innerHTML = ''; el.appendChild(pag);
    var head = '<div class="page-head"><div><h1>Pedidos <span class="badge ok vivo-pill"><span class="dot"></span>ao vivo</span></h1><p>Pedidos que a Izza fechou pelo WhatsApp na ' + esc(l.nome) + '. Pedido novo aparece sozinho, com som. Clique num pedido para ver o resumo e imprimir a comanda.</p></div></div>';
    pag.innerHTML = head + '<div class="card vazio">Carregando…</div>';
    var todos = [], filtro = { q: '', st: '', dias: 30 }, mostra = 100, montado = false, porId = {}, abertos = {};
    function busca() {
      return Promise.all([api('pedidos&loja=' + encodeURIComponent(l.id)), l.pode.clientes ? api('clientes&loja=' + encodeURIComponent(l.id)).catch(function () { return {}; }) : {}]).then(function (rs) {
        var nomes = {};
        (rs[1].clientes || []).forEach(function (c) { if (c.nome) nomes[c.telefone] = c.nome; });
        // pedido de antes de 23/11 nao tem o nome: vem do cadastro do cliente
        (rs[0].pedidos || []).forEach(function (p) { if (!p.nome && nomes[p.telefone]) p.nome = nomes[p.telefone]; });
        // ordem pela hora de verdade: o bot manda em UTC (Z) e outros em -03:00, e a ordem do texto mistura
        todos = (rs[0].pedidos || []).slice().sort(function (a, b) { return (Date.parse(b.em) || 0) - (Date.parse(a.em) || 0); });
        porId = {}; todos.forEach(function (p) { porId[p.id] = p; });
      });
    }
    function monta() {
      pag.innerHTML = head + '<div class="stats" id="ped-kpi"></div>' +
        '<div class="card"><div class="filtros-frase"><input type="search" id="pq" placeholder="Buscar por nome, telefone, número ou item…">' +
        '<select id="pd"><option value="1">Último expediente (desde as 15 h)</option><option value="7">Últimos 7 dias</option><option value="30" selected>Últimos 30 dias</option><option value="0">Tudo</option></select>' +
        '<select id="ps"><option value="">Todos os status</option>' + Object.keys(ST_PED).map(function (k) { return '<option value="' + k + '">' + ST_PED[k][0] + '</option>'; }).join('') + '</select></div></div>' +
        '<div class="card"><div class="stack" id="plista"></div></div>';
      $('#pq', pag).oninput = function () { filtro.q = this.value; mostra = 100; desenha(); };
      $('#pd', pag).onchange = function () { filtro.dias = +this.value; mostra = 100; desenha(); };
      $('#ps', pag).onchange = function () { filtro.st = this.value; mostra = 100; desenha(); };
      montado = true;
    }
    function desenha() {
      var q = filtro.q.toLowerCase(), qd = q.replace(/\D/g, '');
      var desde = filtro.dias ? (filtro.dias === 1 ? inicioExpediente() : new Date(Date.now() - filtro.dias * 864e5)).getTime() : 0;
      var fs = todos.filter(function (p) {
        if (desde && (Date.parse(p.em) || 0) < desde) return false;
        if (filtro.st && p.status !== filtro.st) return false;
        if (!q) return true;
        return [p.nome, p.codigo, p.resumo].join(' ').toLowerCase().indexOf(q) >= 0 || (qd.length >= 4 && String(p.telefone).indexOf(qd) >= 0);
      });
      var ok = fs.filter(valePed), soma = ok.reduce(function (a, p) { return a + (Number(p.total) || 0); }, 0);
      $('#ped-kpi', pag).innerHTML =
        '<div class="stat"><span>Pedidos</span><b>' + ok.length + '</b></div>' +
        '<div class="stat"><span>Faturamento</span><b>' + (brl(soma) || 'R$ 0,00') + '</b></div>' +
        '<div class="stat"><span>Ticket médio</span><b>' + (ok.length ? brl(soma / ok.length) : '—') + '</b></div>' +
        '<div class="stat"><span>Não entraram</span><b>' + (fs.length - ok.length) + '</b></div>';
      var recente = Date.now() - 3 * 60000;
      // separado por dia de expediente (Fábio, 24/11): cabecalho com quantidade e total de cada dia
      var porDia = {};
      fs.forEach(function (p) {
        var x = porDia[diaDoPedido(p.em)] = porDia[diaDoPedido(p.em)] || { n: 0, soma: 0, fora: 0 };
        if (valePed(p)) { x.n++; x.soma += Number(p.total) || 0; } else x.fora++;
      });
      var diaAtual = null;
      $('#plista', pag).innerHTML = fs.length ? fs.slice(0, mostra).map(function (p) {
        var k = diaDoPedido(p.em), cab = '';
        if (k !== diaAtual) {
          diaAtual = k; var x = porDia[k];
          cab = '<div class="dia-cab"><h2>' + esc(nomeDia(k)) + '</h2><span class="muted small">' + nPed(x.n) + (x.n ? ' · ' + brl(x.soma) : '') +
            (x.fora ? ' · ' + x.fora + (x.fora === 1 ? ' não entrou' : ' não entraram') : '') + '</span></div>';
        }
        return cab + pedidoHtml(p, true).replace('<div class="pedido">', '<div class="pedido' + ((Date.parse(p.em) || 0) > recente ? ' novo' : '') + (abertos[p.id] ? ' aberto' : '') + '" data-pid="' + esc(p.id) + '">')
          .replace('<div class="pedido-det" hidden>', abertos[p.id] ? '<div class="pedido-det">' : '<div class="pedido-det" hidden>');
      }).join('') + (fs.length > mostra ? '<button class="btn sm" id="pmais">Mostrar mais (' + (fs.length - mostra) + ')</button>' : '') : '<div class="vazio">Nenhum pedido nesse filtro.</div>';
      $('#plista', pag).querySelectorAll('.pedido-top').forEach(function (t) {
        t.onclick = function () { var box = t.parentNode, d = box.querySelector('.pedido-det'); d.hidden = !d.hidden; box.classList.toggle('aberto', !d.hidden); abertos[box.getAttribute('data-pid')] = !d.hidden; };
      });
      $('#plista', pag).querySelectorAll('[data-imprime]').forEach(function (b) {
        b.onclick = function (ev) { ev.stopPropagation(); var p = porId[b.getAttribute('data-imprime')]; if (p) imprimeNaFila({ loja: l.id, pedido: p.id }, function () { imprimeComanda(pedidoParaComanda(p, l), l); }); };
      });
      if ($('#pmais', pag)) $('#pmais', pag).onclick = function () { mostra += 100; desenha(); };
    }
    busca().then(function () { monta(); desenha(); }).catch(function (e) { pag.innerHTML = head + '<div class="card vazio">' + esc(e.message) + '</div>'; });
    VIVO.recarregaPedidos = function () { if (S.pagina !== 'pedidos' || !pag.isConnected) return; busca().then(function () { if (!montado) monta(); desenha(); }).catch(function () {}); };
  }

  // ------------------------------------------------------------- Comanda
  // Modelo da comanda que o painel imprime quando a loja aprova pelo painel (sem Titan).
  // Segue a comanda do Titan (pedidos dame lov/comanda-modelo.html): mesmos blocos e ordem.
  var COMANDA_PADRAO = {
    papel: 80, letra: 'media', vias: 1, cabecalho: '', rodape: '',
    nomeLoja: true, canal: true, tipoDestaque: true, telefone: true, endereco: true,
    obsDestaque: true, obsMaiusculas: true, totais: true, troco: true, canhoto: true,
  };
  var COMANDA_OPCOES = [
    ['nomeLoja', 'Nome da loja no topo'],
    ['canal', 'Canal do pedido (*** WHATSAPP ***)'],
    ['tipoDestaque', 'Entrega ou retirada em destaque'],
    ['telefone', 'Telefone do cliente'],
    ['endereco', 'Endereço e bairro (na entrega)'],
    ['obsDestaque', 'Observação em destaque (fundo preto)'],
    ['obsMaiusculas', 'Observação em maiúsculas'],
    ['totais', 'Subtotal e taxa de entrega'],
    ['troco', 'Troco (pagamento em dinheiro)'],
    ['canhoto', 'Canhoto do motoboy (sem o nome do cliente)'],
  ];
  function cfgComanda(l) {
    var c = JSON.parse(JSON.stringify(COMANDA_PADRAO)), s = l.config.comanda || {};
    Object.keys(s).forEach(function (k) { c[k] = s[k]; });
    return c;
  }
  function nomeTamanho(id, l) {
    var f = l.config.ficha, t = f && (f.tamanhos || []).filter(function (x) { return x.id === id; })[0];
    if (t && t.nome) return t.nome;
    id = String(id || ''); return id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Pizza';
  }
  // pedido do historico (bot) -> dados da comanda
  function pedidoParaComanda(p, l) {
    var c = p.comanda || {}, cli = c.cliente || {}, e = p.endereco || {};
    return {
      codigo: p.codigo || '', em: p.em, nome: p.nome || cli.nome || '', telefone: fmtTel(p.telefone || cli.telefone),
      retirada: p.retirada != null ? !!p.retirada : !!cli.retirada,
      rua: e.rua || cli.rua || '', numero: e.numero || cli.numero || '', complemento: e.complemento || cli.complemento || '', bairro: e.bairro || cli.bairro || '',
      itens: (c.itens || []).map(function (i) { return i.tipo === 'pizza' ? { pizza: true, titulo: '1x ' + nomeTamanho(i.tamanho, l), sabores: i.sabores || [], borda: i.borda, extras: i.extras || [], obs: i.obs } : { titulo: (i.qtd || 1) + 'x ' + (i.nome || ''), borda: i.borda, bordas: i.bordas, obs: i.obs, sabores: i.sabores || [] }; }),
      subtotal: p.subtotal, taxa: p.taxa != null ? p.taxa : c.taxaEntrega, total: p.total, pagamento: p.pagamento || c.pagamento || '', trocoPara: c.trocoPara || null, obs: c.obs || '',
      semItens: !(c.itens || []).length, resumo: p.resumo || '',
    };
  }
  // pedido de exemplo com sabores da propria loja (ficha), marcado como exemplo
  function pedidoExemplo(l) {
    var f = l.config.ficha || {}, sab = ((f.cardapio && f.cardapio.sabores) || []).filter(function (s) { return s.ativo !== false && s.nome; }).map(function (s) { return s.nome; });
    var beb = ((f.cardapio && f.cardapio.bebidas) || []).filter(function (s) { return s.ativo !== false && s.nome; })[0];
    var tam = (f.tamanhos || []).filter(function (t) { return t.ativo !== false && t.nome; })[0];
    return {
      exemplo: true, codigo: '1234', em: new Date().toISOString(), nome: 'Cliente de exemplo', telefone: '(51) 99999-0000', retirada: false,
      rua: 'Rua de Exemplo', numero: '100', complemento: 'ap 1', bairro: 'Bairro',
      itens: [{ pizza: true, titulo: '1x ' + (tam ? tam.nome : 'Grande'), sabores: sab.slice(0, 2).length ? sab.slice(0, 2) : ['Sabor 1', 'Sabor 2'], borda: null, extras: [], obs: 'sem cebola' }]
        .concat(beb ? [{ titulo: '1x ' + beb.nome }] : []),
      subtotal: 80, taxa: 8, total: 88, pagamento: 'Dinheiro', trocoPara: 100, obs: '',
    };
  }
  // monta as linhas da comanda: { t, c (centro), b (negrito), g (grande), inv } | { lr: [esq, dir] } | { hr } | { sp }
  function linhasComanda(p, cfg, l) {
    var L = [], up = function (s) { return cfg.obsMaiusculas ? String(s).toUpperCase() : String(s); };
    var tx = function (t, o) { L.push(Object.assign({ t: String(t == null ? '' : t) }, o || {})); };
    var lr = function (a, b, o) { L.push(Object.assign({ lr: [a, b] }, o || {})); };
    var d = new Date(p.em || Date.now()), dh = isNaN(d) ? '' : d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (cfg.nomeLoja) tx(l.nome, { c: 1, b: 1, g: 1 });
    String(cfg.cabecalho || '').split('\n').filter(function (s) { return s.trim(); }).forEach(function (s) { tx(s.trim(), { c: 1 }); });
    L.push({ sp: 1 });
    tx('PEDIDO N. ' + (p.codigo || '—'), { c: 1, b: 1, g: 1 });
    tx(dh, { c: 1 });
    if (cfg.canal) tx('*** WHATSAPP ***', { c: 1, b: 1 });
    if (cfg.tipoDestaque) tx(p.retirada ? '*** RETIRADA NO BALCAO ***' : '*** ENTREGA ***', { c: 1, b: 1 });
    L.push({ hr: 1 });
    tx('CLIENTE: ' + (p.nome || ''), { b: 1 });
    if (cfg.telefone) tx('TEL: ' + (p.telefone || ''));
    if (cfg.endereco && !p.retirada) {
      tx('END: ' + [p.rua, p.numero].filter(Boolean).join(', ') + (p.complemento ? ' - ' + p.complemento : ''));
      if (p.bairro) tx('BAIRRO: ' + p.bairro);
    }
    L.push({ hr: 1 });
    if (p.semItens) {
      tx('(pedido sem itens estruturados; resumo abaixo)');
      String(p.resumo || '').split('\n').forEach(function (s) { tx(s); });
    }
    (p.itens || []).forEach(function (i) {
      tx(i.pizza ? up(i.titulo) : i.titulo, { b: 1 });
      (i.sabores || []).forEach(function (s) { tx('   - ' + s); });
      if (i.borda) tx('   Borda: ' + i.borda);
      (i.bordas || []).filter(Boolean).forEach(function (b) { tx('   Borda: ' + b); });
      (i.extras || []).forEach(function (e) { tx('   + ' + e, { b: 1 }); });
      if (i.obs) tx(' >> OBS: ' + up(i.obs) + ' ', { b: 1, inv: cfg.obsDestaque ? 1 : 0 });
      L.push({ sp: 1 });
    });
    L.push({ hr: 1 });
    if (cfg.totais) {
      if (p.subtotal != null) lr('SUBTOTAL', brl(p.subtotal));
      if (p.taxa) lr('TAXA DE ENTREGA', brl(p.taxa));
    }
    lr('TOTAL', brl(p.total || 0), { b: 1, g: 1 });
    L.push({ hr: 1 });
    tx('PAGAMENTO: ' + (p.pagamento || ''), { b: 1 });
    if (cfg.troco && p.trocoPara) {
      tx('Troco para: ' + brl(p.trocoPara));
      tx('Troco: ' + brl(Math.round(((p.trocoPara || 0) - (p.total || 0)) * 100) / 100), { b: 1 });
    }
    if (p.obs) tx(' OBS PEDIDO: ' + up(p.obs) + ' ', { b: 1, inv: cfg.obsDestaque ? 1 : 0 });
    String(cfg.rodape || '').split('\n').filter(function (s) { return s.trim(); }).forEach(function (s, k) { if (!k) L.push({ sp: 1 }); tx(s.trim(), { c: 1 }); });
    if (cfg.canhoto) {
      L.push({ sp: 1 }, { sp: 1 }, { hr2: 1 }, { sp: 1 });
      tx('PEDIDO N. ' + (p.codigo || '—'), { c: 1, b: 1, g: 1 });
      tx('HORA: ' + (isNaN(d) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })), { c: 1, b: 1 });
      tx('TEL: ' + (p.telefone || ''));
      if (!p.retirada) {
        tx('END: ' + [p.rua, p.numero].filter(Boolean).join(', ') + (p.complemento ? ' - ' + p.complemento : ''));
        if (p.bairro) tx('BAIRRO: ' + p.bairro);
      }
    }
    return L;
  }
  function comandaHtml(p, cfg, l) {
    var col = cfg.papel === 58 ? 32 : 48;
    return linhasComanda(p, cfg, l).map(function (x) {
      if (x.sp) return '<div class="cm-l">&nbsp;</div>';
      if (x.hr) return '<div class="cm-l cm-hr">' + '-'.repeat(col) + '</div>';
      if (x.hr2) return '<div class="cm-l cm-hr">' + '='.repeat(col) + '</div>';
      var cls = 'cm-l' + (x.c ? ' cm-c' : '') + (x.b ? ' cm-b' : '') + (x.g ? ' cm-g' : '') + (x.inv ? ' cm-inv' : '');
      if (x.lr) return '<div class="' + cls + ' cm-lr"><span>' + esc(x.lr[0]) + '</span><span>' + esc(x.lr[1]) + '</span></div>';
      return '<div class="' + cls + '">' + (x.inv ? '<span>' + esc(x.t) + '</span>' : esc(x.t) || '&nbsp;') + '</div>';
    }).join('');
  }
  var CM_CSS = '.cm{font-family:"Cascadia Mono",Consolas,"Courier New",monospace;color:#000;background:#fff;line-height:1.25;white-space:pre-wrap;word-break:break-word}' +
    '.cm .cm-c{text-align:center}.cm .cm-b{font-weight:700}.cm .cm-g{font-size:1.45em}.cm .cm-inv span{background:#000;color:#fff}' +
    '.cm .cm-lr{display:flex;justify-content:space-between;gap:8px}.cm .cm-hr{overflow:hidden;white-space:nowrap}';
  function fonteComanda(cfg) { return { normal: 12, media: 14, grande: 17 }[cfg.letra] || 14; }
  // imprime pelo navegador: um iframe com a comanda no tamanho do papel (vias = copias)
  function imprimeComanda(p, l, cfgEd) {
    var cfg = cfgEd || cfgComanda(l), mm = cfg.papel === 58 ? 58 : 80, vias = Math.max(1, Math.min(3, +cfg.vias || 1));
    var corpo = '';
    for (var v = 0; v < vias; v++) corpo += '<div class="cm" style="font-size:' + fonteComanda(cfg) + 'px' + (v ? ';page-break-before:always' : '') + '">' + comandaHtml(p, cfg, l) + '</div>';
    var ifr = document.createElement('iframe');
    ifr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(ifr);
    var doc = ifr.contentWindow.document;
    doc.open();
    doc.write('<!doctype html><html><head><meta charset="utf-8"><title>Comanda</title><style>@page{size:' + mm + 'mm auto;margin:3mm}html,body{margin:0;background:#fff}' + CM_CSS + '</style></head><body>' + corpo + '</body></html>');
    doc.close();
    setTimeout(function () { try { ifr.contentWindow.focus(); ifr.contentWindow.print(); } catch (e) { toast('Não consegui abrir a impressão.', true); } setTimeout(function () { ifr.remove(); }, 2000); }, 250);
  }

  function pgComanda(el, l) {
    var pag = document.createElement('div'); pag.className = 'pagina'; el.innerHTML = ''; el.appendChild(pag);
    var cfg = cfgComanda(l), pode = l.pode.horario, dis = pode ? '' : ' disabled', pedidos = [], fonte = 'exemplo';
    pag.innerHTML = '<div class="page-head"><div><h1>Comanda</h1><p>Como sai a comanda que a Izza imprime quando a ' + esc(l.nome) + ' aprova o pedido pelo painel.</p></div>' +
      (pode ? '<button class="btn pri" id="cm-salvar">Salvar comanda</button>' : '') + '</div>' +
      '<div class="aviso">Vale para a loja que trabalha só com a Izza. A comanda sai pela <b>Izza Impressora</b> (Loja &gt; Impressoras); sem ela, pela janela de impressão do navegador. ' +
      'Com o Titan ou a Saipos, quem imprime é o sistema da loja, com o modelo dele (ver <b>Integrações</b>).</div>' +
      '<div class="cm-grid">' +
        '<div class="stack">' +
          '<div class="card"><h2>Papel e letra</h2><div class="stack" style="margin-top:12px">' +
            '<div class="campo"><span>Largura do papel</span><div class="seg" data-cm="papel"><button type="button" data-v="80"' + dis + '>80 mm</button><button type="button" data-v="58"' + dis + '>58 mm</button></div></div>' +
            '<div class="campo"><span>Tamanho da letra</span><div class="seg" data-cm="letra"><button type="button" data-v="normal"' + dis + '>Normal</button><button type="button" data-v="media"' + dis + '>Média</button><button type="button" data-v="grande"' + dis + '>Grande</button></div></div>' +
            '<div class="campo"><span>Vias</span><div class="seg" data-cm="vias"><button type="button" data-v="1"' + dis + '>1</button><button type="button" data-v="2"' + dis + '>2</button><button type="button" data-v="3"' + dis + '>3</button></div></div>' +
          '</div></div>' +
          '<div class="card"><h2>Textos</h2><div class="stack" style="margin-top:12px">' +
            '<label class="campo"><span>Cabeçalho (abaixo do nome da loja)</span><textarea rows="2" data-cmt="cabecalho" maxlength="300" placeholder="Ex.: endereço e telefone da loja"' + dis + '>' + esc(cfg.cabecalho) + '</textarea></label>' +
            '<label class="campo"><span>Rodapé</span><textarea rows="2" data-cmt="rodape" maxlength="300" placeholder="Ex.: Obrigado pela preferência!"' + dis + '>' + esc(cfg.rodape) + '</textarea></label>' +
          '</div></div>' +
          '<div class="card"><h2>O que aparece</h2><div class="stack" style="margin-top:12px">' + COMANDA_OPCOES.map(function (o) {
            return '<label class="fp-radio"><input type="checkbox" data-cmo="' + o[0] + '"' + (cfg[o[0]] ? ' checked' : '') + dis + '>' + esc(o[1]) + '</label>';
          }).join('') + '</div></div>' +
        '</div>' +
        '<div class="card cm-prev-card"><div class="cab-card"><div><h2>Prévia</h2></div><button class="btn sm" id="cm-imprimir">⎙ Imprimir teste</button></div>' +
          '<select id="cm-fonte" style="margin:10px 0"><option value="exemplo">Pedido de exemplo</option></select>' +
          '<div class="cm-papel" id="cm-papel"></div></div>' +
      '</div>';
    function marcaSegs() {
      pag.querySelectorAll('[data-cm]').forEach(function (s) { var k = s.getAttribute('data-cm'); s.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', String(cfg[k]) === b.getAttribute('data-v')); }); });
    }
    function pedidoAtual() {
      if (fonte === 'exemplo') return pedidoExemplo(l);
      var p = pedidos.filter(function (x) { return x.id === fonte; })[0];
      return p ? pedidoParaComanda(p, l) : pedidoExemplo(l);
    }
    function prev() {
      var papel = $('#cm-papel', pag);
      papel.style.width = (cfg.papel === 58 ? 240 : 340) + 'px';
      papel.innerHTML = '<div class="cm" style="font-size:' + (fonteComanda(cfg) - 2) + 'px">' + comandaHtml(pedidoAtual(), cfg, l) + '</div>';
    }
    pag.querySelectorAll('[data-cm]').forEach(function (s) {
      s.addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (!b || b.disabled) return; var k = s.getAttribute('data-cm'), v = b.getAttribute('data-v'); cfg[k] = k === 'letra' ? v : +v; marcaSegs(); prev(); });
    });
    pag.querySelectorAll('[data-cmo]').forEach(function (i) { i.onchange = function () { cfg[i.getAttribute('data-cmo')] = i.checked; prev(); }; });
    pag.querySelectorAll('[data-cmt]').forEach(function (i) { i.oninput = function () { cfg[i.getAttribute('data-cmt')] = i.value; prev(); }; });
    $('#cm-fonte', pag).onchange = function () { fonte = this.value; prev(); };
    $('#cm-imprimir', pag).onclick = function () { imprimeNaFila({ loja: l.id, teste: fonte === 'exemplo', pedido: fonte === 'exemplo' ? null : fonte, comanda: cfg }, function () { imprimeComanda(pedidoAtual(), l, cfg); }); };
    if ($('#cm-salvar', pag)) $('#cm-salvar', pag).onclick = function () { salvar('comanda', { loja: l.id, comanda: cfg }, 'Comanda salva.'); };
    marcaSegs(); prev();
    api('pedidos&loja=' + encodeURIComponent(l.id)).then(function (j) {
      pedidos = (j.pedidos || []).filter(function (p) { return p.comanda; }).slice(-10).reverse();
      if (!pedidos.length) return;
      $('#cm-fonte', pag).innerHTML = '<option value="exemplo">Pedido de exemplo</option>' + pedidos.map(function (p) {
        return '<option value="' + esc(p.id) + '">' + esc(dataHora(p.em) + ' · ' + (p.nome || fmtTel(p.telefone)) + (p.total != null ? ' · ' + brl(p.total) : '')) + '</option>';
      }).join('');
    }).catch(function () {});
  }

  // ------------------------------------------------------------- Impressoras (Izza Impressora)
  // O programa do Windows pareia com a loja por codigo, pergunta a cada 3 s se ha comanda
  // e imprime direto na impressora (termica ou comum). Servidor: impressao.php.
  // nome que parece de impressora de comanda (o resto comeca como comum; a loja troca na lista)
  var TERMICA_RE = /(t[eé]rmica|thermal|pos[- ]?\d|\bpos\b|tm-?t|tm-?m|bematech|elgin|daruma|sweda|tanca|jetway|knup|gertec|i9|mp-?\d{4}|80 ?mm|58 ?mm|receipt|generic.*text|gen[eé]rica)/i;
  var ST_IMP = { pendente: ['Na fila', 'warn'], enviado: ['Imprimindo', 'acc'], impresso: ['Impresso', 'ok'], erro: ['Falhou', 'err'] };
  // manda imprimir pela fila; sem impressora configurada, cai na impressao do navegador
  function imprimeNaFila(corpo, plano) {
    return api('imprimir', corpo).then(function (j) {
      toast(j.trabalhos === 1 ? 'Enviado para a impressora.' : 'Enviado para ' + j.trabalhos + ' impressoras.');
    }).catch(function (e) {
      if (e.message === 'sem_impressora') { if (plano) plano(); else toast('Nenhuma impressora ligada. Veja em Loja > Impressoras.', true); }
      else toast(e.message, true);
    });
  }
  function pgImpressoras(el, l) {
    var pag = document.createElement('div'); pag.className = 'pagina'; el.innerHTML = ''; el.appendChild(pag);
    var pode = l.pode.horario, dis = pode ? '' : ' disabled', dados = null, linhas = [], auto = false, sujo = false, timer = null, codigo = null;
    pag.innerHTML = '<div class="page-head"><div><h1>Impressoras</h1><p>A comanda sai sozinha na impressora da ' + esc(l.nome) + ', sem abrir a janela de impressão do navegador.</p></div>' +
      (pode ? '<button class="btn pri" id="imp-salvar" disabled>Salvar impressoras</button>' : '') + '</div><div class="card vazio">Carregando…</div>';
    function chave(d, n) { return d + '|' + n; }
    // uma linha por impressora que cada computador enxerga (e as configuradas que sumiram dele)
    function montaLinhas() {
      var cfg = {}; (dados.config.impressoras || []).forEach(function (i) { cfg[chave(i.disp, i.nome)] = i; });
      var r = [], visto = {};
      dados.dispositivos.forEach(function (d) {
        (d.impressoras || []).forEach(function (w) {
          var k = chave(d.id, w.nome), c = cfg[k] || {};
          visto[k] = 1;
          r.push({ id: c.id || '', disp: d.id, nomeDisp: d.nome, nome: w.nome, padrao: w.padrao, ativa: !!c.ativa, tipo: c.tipo || (TERMICA_RE.test(w.nome) ? 'termica' : 'comum'), modelo: c.modelo || 'completa', vias: c.vias || 1, papel: c.papel || 80, existe: true });
        });
      });
      (dados.config.impressoras || []).forEach(function (c) {
        var k = chave(c.disp, c.nome); if (visto[k]) return;
        var d = dados.dispositivos.filter(function (x) { return x.id === c.disp; })[0];
        if (d) r.push(Object.assign({}, c, { nomeDisp: d.nome, existe: false }));
      });
      linhas = r; auto = !!dados.config.auto;
    }
    function dispHtml() {
      var ds = dados.dispositivos;
      var app = dados.app;
      return '<div class="card"><div class="cab-card"><div><h2>Computadores</h2><p class="muted small" style="margin:4px 0 0">Onde a Izza Impressora está instalada. Ela abre com o Windows e fica perto do relógio.</p></div>' +
        (pode ? '<button class="btn sm pri" id="imp-parear">+ Conectar um computador</button>' : '') + '</div>' +
        codigoHtml() +
        (ds.length ? '<div class="stack" style="margin-top:12px">' + ds.map(function (d) {
          return '<div class="linha-item" style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap">' +
            '<div><b>' + esc(d.nome) + '</b> ' + (d.online ? '<span class="badge ok"><span class="dot"></span>ligado</span>' : '<span class="badge err">desligado</span>') +
            '<div class="muted small">' + esc((d.impressoras || []).length + ' impressora(s) no Windows · versão ' + (d.versao || '?') + (d.online ? '' : ' · visto ' + (d.vistoEm ? dataHora(d.vistoEm) : 'nunca'))) +
            (app && d.versao && d.versao !== app.versao ? ' · atualiza sozinho para a ' + esc(app.versao) : '') + '</div></div>' +
            (pode ? '<button class="btn sm" data-remover="' + esc(d.id) + '">Remover</button>' : '') + '</div>';
        }).join('') + '</div>' : '<div class="vazio" style="margin-top:12px">Nenhum computador conectado ainda. Instale a Izza Impressora no computador da impressora e conecte com o código.</div>') +
        (app ? '<p class="small" style="margin:14px 0 0"><a href="impressora/IzzaImpressora.exe" download>⬇ Baixar a Izza Impressora para Windows</a> <span class="muted">(versão ' + esc(app.versao) + ', Windows 10 ou 11)</span></p>' : '') +
        '</div>';
    }
    function codigoHtml() {
      if (!codigo || new Date(codigo.expiraEm) < new Date() || dados.dispositivos.length > codigo.antes) { codigo = null; return ''; }
      return '<div class="aviso" style="margin-top:12px;text-align:center">No computador da impressora, abra a <b>Izza Impressora</b> e digite o código:' +
        '<div style="font:700 34px/1.2 Consolas,monospace;letter-spacing:6px;margin:8px 0;color:var(--text)">' + esc(codigo.codigo.slice(0, 3) + ' ' + codigo.codigo.slice(3)) + '</div>' +
        '<span class="small">Vale por 10 minutos e para um computador só. Ainda não instalou? <a href="impressora/IzzaImpressora.exe" download>Baixe aqui</a>, abra o arquivo e clique em Instalar.</span></div>';
    }
    function impHtml() {
      if (!dados.dispositivos.length) return '';
      return '<div class="card"><h2>O que cada impressora imprime</h2>' +
        '<label class="fp-radio" style="margin:12px 0"><input type="checkbox" id="imp-auto"' + (auto ? ' checked' : '') + dis + '> <span><b>Imprimir sozinho cada pedido novo</b> que a Izza fechar, nas impressoras ligadas abaixo.</span></label>' +
        (linhas.length ? '<div class="tabela-wrap"><table><thead><tr><th>Usar</th><th>Impressora</th><th>Tipo</th><th>Comanda</th><th>Papel</th><th>Vias</th><th></th></tr></thead><tbody>' + linhas.map(function (r, i) {
          var sel = function (k, ops) { return '<select data-k="' + k + '" data-i="' + i + '"' + dis + '>' + ops.map(function (o) { return '<option value="' + o[0] + '"' + (String(r[k]) === String(o[0]) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; };
          return '<tr' + (r.existe ? '' : ' class="muted"') + '><td><input type="checkbox" data-k="ativa" data-i="' + i + '"' + (r.ativa ? ' checked' : '') + dis + '></td>' +
            '<td><b>' + esc(r.nome) + '</b>' + (r.padrao ? ' <span class="badge">padrão</span>' : '') + '<div class="muted small">' + esc(r.nomeDisp) + (r.existe ? '' : ' · não aparece mais no Windows') + '</div></td>' +
            '<td>' + sel('tipo', [['termica', 'Térmica'], ['comum', 'Comum']]) + '</td>' +
            '<td>' + sel('modelo', [['completa', 'Completa'], ['cozinha', 'Cozinha (sem valores)']]) + '</td>' +
            '<td>' + sel('papel', [[80, '80 mm'], [58, '58 mm']]) + '</td>' +
            '<td>' + sel('vias', [[1, '1'], [2, '2'], [3, '3']]) + '</td>' +
            '<td>' + (r.id && r.ativa ? '<button class="btn sm" data-teste="' + esc(r.id) + '">Teste</button>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="vazio">O computador ainda não mandou a lista de impressoras. Ele manda assim que a Izza Impressora abre.</div>') +
        '<p class="muted small" style="margin:12px 0 0"><b>Térmica</b>: impressora de comanda (Epson, Bematech, Elgin, Daruma…), com corte do papel. <b>Comum</b>: qualquer outra, pelo Windows. ' +
        'O desenho da comanda é o da página <b>Comanda</b>. A de <b>cozinha</b> sai sem telefone, endereço, valores e canhoto.</p></div>';
    }
    function filaHtml() {
      var f = dados.fila || [];
      return '<div class="card"><h2>Últimas impressões</h2>' + (f.length ? '<div class="stack" style="margin-top:12px">' + f.slice(0, 20).map(function (j) {
        var st = ST_IMP[j.status] || [j.status, ''];
        return '<div style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap"><div><span class="badge ' + st[1] + '">' + st[0] + '</span> <b>' + esc(j.titulo) + '</b> <span class="muted small">' + esc(dataHora(j.em) + ' · ' + j.nomeImpressora + ' · ' + ({ auto: 'sozinho', painel: 'pelo painel', teste: 'teste' }[j.origem] || j.origem)) + '</span>' +
          (j.erro ? '<div class="small" style="color:var(--danger)">' + esc(j.erro) + '</div>' : '') + '</div>' +
          (j.status === 'impresso' || j.status === 'erro' ? '<button class="btn sm" data-reimprime="' + esc(j.id) + '">Imprimir de novo</button>' : '') + '</div>';
      }).join('') + '</div>' : '<div class="vazio" style="margin-top:12px">Nada impresso ainda.</div>') + '</div>';
    }
    function desenha() {
      var head = pag.querySelector('.page-head').outerHTML;
      pag.innerHTML = head + '<div class="aviso">A <b>Izza Impressora</b> é um programa pequeno para Windows. Ela só conversa com o painel pela internet: não precisa abrir porta no roteador nem de outro programa.</div>' +
        '<div id="imp-disp">' + dispHtml() + '</div><div id="imp-imp">' + impHtml() + '</div><div id="imp-fila">' + filaHtml() + '</div>';
      liga();
    }
    function atualizaParcial() {
      $('#imp-disp', pag).innerHTML = dispHtml();
      $('#imp-fila', pag).innerHTML = filaHtml();
      if (!sujo) { montaLinhas(); $('#imp-imp', pag).innerHTML = impHtml(); }
      liga();
    }
    function marcaSujo() { sujo = true; var b = $('#imp-salvar', pag); if (b) b.disabled = false; }
    function liga() {
      var b = $('#imp-salvar', pag); if (b) { b.disabled = !sujo; b.onclick = salva; }
      if ($('#imp-parear', pag)) $('#imp-parear', pag).onclick = function () {
        api('imp_codigo', { loja: l.id }).then(function (j) {
          codigo = { codigo: j.codigo, expiraEm: j.expiraEm, antes: dados.dispositivos.length };
          $('#imp-disp', pag).innerHTML = dispHtml(); liga();
        }).catch(function (e) { toast(e.message, true); });
      };
      pag.querySelectorAll('[data-remover]').forEach(function (x) {
        x.onclick = function () {
          var d = dados.dispositivos.filter(function (y) { return y.id === x.getAttribute('data-remover'); })[0];
          confirma('Remover o computador ' + (d ? d.nome : '') + '? As comandas param de sair nas impressoras dele até conectar de novo.', 'Remover', function () {
            return api('imp_remover', { loja: l.id, id: x.getAttribute('data-remover') }).then(function () { toast('Computador removido.'); sujo = false; return recarrega(); });
          });
        };
      });
      pag.querySelectorAll('#imp-imp [data-k]').forEach(function (x) {
        x.onchange = function () { var r = linhas[+x.getAttribute('data-i')], k = x.getAttribute('data-k'); r[k] = k === 'ativa' ? x.checked : (k === 'vias' || k === 'papel' ? +x.value : x.value); marcaSujo(); };
      });
      if ($('#imp-auto', pag)) $('#imp-auto', pag).onchange = function () { auto = this.checked; marcaSujo(); };
      pag.querySelectorAll('[data-teste]').forEach(function (x) { x.onclick = function () { imprimeNaFila({ loja: l.id, teste: true, impressora: x.getAttribute('data-teste') }).then(recarrega); }; });
      pag.querySelectorAll('[data-reimprime]').forEach(function (x) { x.onclick = function () { imprimeNaFila({ loja: l.id, reimprimir: x.getAttribute('data-reimprime') }).then(recarrega); }; });
    }
    function salva() {
      var lista = linhas.filter(function (r) { return r.ativa || r.id; }).map(function (r) { return { id: r.id, disp: r.disp, nome: r.nome, ativa: r.ativa, tipo: r.tipo, modelo: r.modelo, vias: r.vias, papel: r.papel }; });
      api('imp_config', { loja: l.id, auto: auto, impressoras: lista }).then(function () { toast('Impressoras salvas.'); sujo = false; return recarrega(); }).catch(function (e) { toast(e.message, true); });
    }
    function recarrega() {
      return api('impressao&loja=' + encodeURIComponent(l.id)).then(function (j) {
        var primeira = !dados; dados = j;
        if (primeira) { montaLinhas(); desenha(); } else atualizaParcial();
      });
    }
    recarrega().catch(function (e) { pag.innerHTML = '<div class="card vazio">' + esc(e.message) + '</div>'; });
    // enquanto a pagina esta aberta: estado dos computadores e da fila a cada 5 s
    timer = setInterval(function () { if (!pag.isConnected) { clearInterval(timer); return; } recarrega().catch(function () {}); }, 5000);
  }

  // ------------------------------------------------------------- Integrações
  // Para onde vai o pedido aprovado e de onde vem cardapio e clientes. A Izza de
  // desenvolvimento ainda nao usa (etapas 4 e 6 do docs/produto.md): aqui fica a configuracao.
  var INT_PEDIDOS = [
    ['izza', 'Só a Izza', 'A loja aprova no painel (Pedidos e Alertas) e imprime a comanda pelo navegador. Não precisa de outro sistema.'],
    ['titan', 'Titan', 'Sistema de pedidos próprio, instalado no computador da loja: ele busca os pedidos aprovados na Izza e imprime com o modelo dele.'],
    ['saipos', 'Saipos', 'O pedido entra direto na Saipos pela API de pedidos (comanda, nota fiscal e caixa ficam lá).'],
    ['webhook', 'Outro sistema (webhook)', 'A Izza envia cada pedido aprovado, em JSON assinado, para um endereço do seu sistema.'],
  ];
  var INT_FONTE = [['izza', 'Izza (painel)'], ['titan', 'Titan'], ['saipos', 'Saipos']];
  function pgIntegracoes(el, l) {
    var pag = document.createElement('div'); pag.className = 'pagina'; el.innerHTML = ''; el.appendChild(pag);
    var base = l.config.integracoes || {}, pode = l.pode.integracoes, dis = pode ? '' : ' disabled';
    var it = {
      pedidos: base.pedidos || 'izza', cardapio: base.cardapio || 'izza', clientes: base.clientes || 'izza',
      titan: Object.assign({ url: '', usuario: '', senha: '' }, base.titan || {}),
      saipos: Object.assign({ idPartner: '', codStore: '', secret: '', ambiente: 'producao' }, base.saipos || {}),
      webhook: Object.assign({ url: '', segredo: '' }, base.webhook || {}),
    };
    function usa(s) { return it.pedidos === s || it.cardapio === s || it.clientes === s; }
    function segredo(sis, k, rot) {
      var def = it[sis][k] === '__definido__';
      return '<label class="campo"><span>' + rot + '</span><input type="password" autocomplete="new-password" data-is="' + sis + '" data-ik="' + k + '" value="" placeholder="' + (def ? '•••••• guardado (em branco = manter)' : 'não definido') + '"' + dis + '></label>';
    }
    function campo(sis, k, rot, ph) { return '<label class="campo"><span>' + rot + '</span><input type="text" data-is="' + sis + '" data-ik="' + k + '" value="' + esc(it[sis][k]) + '" placeholder="' + esc(ph || '') + '"' + dis + '></label>'; }
    function situacao(ok) { return ok ? '<span class="badge ok">Configurado</span>' : '<span class="badge warn">Falta configurar</span>'; }
    function desenha() {
      // o secret da Saipos das lojas Dame e Lov fica no cofre do servidor da Izza; no painel e opcional
      var tOk = !!it.titan.url, sOk = !!(it.saipos.idPartner && it.saipos.codStore), wOk = !!it.webhook.url;
      pag.innerHTML = '<div class="page-head"><div><h1>Integrações</h1><p>Para onde vai o pedido que a Izza fecha na ' + esc(l.nome) + ' e de onde vêm o cardápio e os clientes.</p></div>' +
        (pode ? '<button class="btn pri" id="int-salvar">Salvar</button>' : '') + '</div>' +
        '<div class="aviso">A Izza ligada a este painel (desenvolvimento) já usa “Para onde vai o pedido”: <b>Só a Izza</b> (aprova no Quadro, comanda pela Izza Impressora) e <b>Saipos</b> (aprova no Quadro e o pedido entra na Saipos; se ela recusar, a comanda sai aqui). As lojas Dáme e Lov seguem no Titan até a migração. Cardápio, clientes e webhook ainda não são usados.' +
        (base.atualizadoEm ? ' Última mudança: ' + esc(quem(base.atualizadoPor)) + ' · ' + esc(dataHora(base.atualizadoEm)) + '.' : '') + '</div>' +
        '<div class="card"><h2>Para onde vai o pedido</h2><p class="desc">Depois que o cliente confirma o pedido no WhatsApp.</p><div class="stack" style="margin-top:12px">' +
          INT_PEDIDOS.map(function (o) {
            return '<label class="radio-card' + (it.pedidos === o[0] ? ' on' : '') + '"><input type="radio" name="int-pedidos" value="' + o[0] + '"' + (it.pedidos === o[0] ? ' checked' : '') + dis + '><span><b>' + esc(o[1]) + '</b><br><span class="muted small">' + esc(o[2]) + '</span></span></label>';
          }).join('') + '</div></div>' +
        '<div class="grid-2">' +
          '<div class="card"><h2>De onde vem o cardápio</h2><p class="desc">Sabores, tamanhos e preços que a Izza usa.</p><div class="seg" data-if="cardapio" style="margin-top:12px">' + INT_FONTE.map(function (o) { return '<button type="button" data-v="' + o[0] + '" class="' + (it.cardapio === o[0] ? 'on' : '') + '"' + dis + '>' + o[1] + '</button>'; }).join('') + '</div></div>' +
          '<div class="card"><h2>De onde vêm os clientes</h2><p class="desc">Nome e endereço de quem já pediu.</p><div class="seg" data-if="clientes" style="margin-top:12px">' + INT_FONTE.map(function (o) { return '<button type="button" data-v="' + o[0] + '" class="' + (it.clientes === o[0] ? 'on' : '') + '"' + dis + '>' + o[1] + '</button>'; }).join('') + '</div></div>' +
        '</div>' +
        (usa('titan') ? '<div class="card"><div class="cab-card"><div><h2>Titan</h2><p class="desc">Sistema de pedidos no computador da loja.</p></div>' + situacao(tOk) + '</div><div class="grid-2" style="margin-top:12px">' +
          campo('titan', 'url', 'Endereço do Titan', 'http://100.x.x.x:3900') + campo('titan', 'usuario', 'Usuário de integração', 'integracao') + segredo('titan', 'senha', 'Senha de integração') + '</div></div>' : '') +
        (usa('saipos') ? '<div class="card"><div class="cab-card"><div><h2>Saipos</h2><p class="desc">API de pedidos da Saipos (Order API). Os dados vêm da Saipos ao liberar a integração.</p></div>' + situacao(sOk) + '</div><div class="grid-2" style="margin-top:12px">' +
          campo('saipos', 'idPartner', 'ID do parceiro (id_partner)') + campo('saipos', 'codStore', 'Código da loja (cod_store)') + segredo('saipos', 'secret', 'Secret (opcional: guardado no servidor da Izza)') +
          '<div class="campo"><span>Ambiente</span><div class="seg" data-ia="ambiente"><button type="button" data-v="producao" class="' + (it.saipos.ambiente !== 'homologacao' ? 'on' : '') + '"' + dis + '>Produção</button><button type="button" data-v="homologacao" class="' + (it.saipos.ambiente === 'homologacao' ? 'on' : '') + '"' + dis + '>Homologação</button></div></div></div>' +
          '<div class="campo" style="margin-top:12px"><span>Endereço de eventos (passe à Saipos para ela avisar cancelamento, pronto e saída)</span>' +
          '<div class="linha" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn sm" id="int-sp-url">Mostrar endereço</button><code id="int-sp-v" style="overflow-wrap:anywhere"></code></div></div></div>' : '') +
        (it.pedidos === 'webhook' ? '<div class="card"><div class="cab-card"><div><h2>Webhook</h2><p class="desc">A Izza faz um POST com o pedido em JSON. O cabeçalho <code>X-Izza-Assinatura</code> traz <code>sha256=</code> + HMAC-SHA256 do corpo com o segredo abaixo.</p></div>' + situacao(wOk) + '</div><div class="grid-2" style="margin-top:12px">' +
          campo('webhook', 'url', 'Endereço (https://)', 'https://seusistema.com.br/izza/pedido') + segredo('webhook', 'segredo', 'Segredo da assinatura') + '</div>' +
          (pode ? '<div class="acoes" style="justify-content:flex-start"><button class="btn sm" id="int-teste">Enviar pedido de teste</button><span class="muted small" id="int-teste-r"></span></div>' : '') + '</div>' : '') +
        (it.pedidos === 'izza' ? '<div class="card"><h2>Só a Izza</h2><p class="desc">Pedido novo aparece em <b>Pedidos</b> e em <b>Alertas</b>, com som e notificação. A comanda sai pelo navegador: ajuste em <b>Comanda</b>.</p>' +
          '<div class="acoes" style="justify-content:flex-start"><button class="btn sm" data-ir="comanda">Abrir a comanda</button><button class="btn sm" data-ir="alertas">Ver alertas</button></div></div>' : '');
      pag.querySelectorAll('input[name=int-pedidos]').forEach(function (r) { r.onchange = function () { it.pedidos = r.value; desenha(); }; });
      pag.querySelectorAll('[data-if]').forEach(function (s) { s.onclick = function (ev) { var b = ev.target.closest('button'); if (!b || b.disabled) return; it[s.getAttribute('data-if')] = b.getAttribute('data-v'); desenha(); }; });
      if ($('#int-sp-url', pag)) $('#int-sp-url', pag).onclick = function () {
        api('saipos_url', { loja: l.id }).then(function (j) { $('#int-sp-v', pag).textContent = j.url; }).catch(function (e) { toast(e.message, true); });
      };
      pag.querySelectorAll('[data-ia]').forEach(function (s) { s.onclick = function (ev) { var b = ev.target.closest('button'); if (!b || b.disabled) return; it.saipos.ambiente = b.getAttribute('data-v'); desenha(); }; });
      pag.querySelectorAll('[data-is]').forEach(function (i) {
        i.oninput = function () { var sis = i.getAttribute('data-is'), k = i.getAttribute('data-ik'); if (i.type === 'password') it[sis]['_novo_' + k] = i.value; else it[sis][k] = i.value; };
      });
      if ($('#int-salvar', pag)) $('#int-salvar', pag).onclick = function () {
        var env = JSON.parse(JSON.stringify(it));
        [['titan', 'senha'], ['saipos', 'secret'], ['webhook', 'segredo']].forEach(function (s) { env[s[0]][s[1]] = env[s[0]]['_novo_' + s[1]] || ''; delete env[s[0]]['_novo_' + s[1]]; });
        salvar('integracoes', { loja: l.id, integracoes: env }, 'Integrações salvas.');
      };
      if ($('#int-teste', pag)) $('#int-teste', pag).onclick = function () {
        var r = $('#int-teste-r', pag); r.textContent = 'Enviando…';
        api('integracao_teste', { loja: l.id }).then(function (j) { r.textContent = j.http ? 'O endereço respondeu HTTP ' + j.http + (j.http >= 200 && j.http < 300 ? ' (ok).' : '.') : 'Sem resposta: ' + (j.erro || 'erro'); })
          .catch(function (e) { r.textContent = e.message; });
      };
      ligaAtalhos(pag);
    }
    desenha();
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
  $('#nav').addEventListener('click', function (ev) {
    var c = ev.target.closest('[data-cfg]');
    var cfg = paginas().filter(function (p) { return p.g !== 'Dia a dia'; });
    if (c) {
      var naCfg = cfg.some(function (p) { return p.id === S.pagina; });
      if (naCfg) { S.cfgFechado = !S.cfgFechado; desenhar(); return; } // ja esta dentro: so recolhe/abre
      if (cfg.length) ir(cfg[0].id);
      return;
    }
    var cat = ev.target.closest('[data-cat]');
    if (cat) {
      var g = cat.getAttribute('data-cat');
      var pri = cfg.filter(function (p) { return p.g === g; })[0];
      if (pri && pri.g !== ((cfg.filter(function (p) { return p.id === S.pagina; })[0] || {}).g)) ir(pri.id);
      return;
    }
    var b = ev.target.closest('[data-p]'); if (b) ir(b.getAttribute('data-p'));
  });
  $('#loja').onchange = function () { S.loja = this.value; try { localStorage.setItem('wb_loja', S.loja); } catch (e) {} desenhar(); vivo(); };
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
