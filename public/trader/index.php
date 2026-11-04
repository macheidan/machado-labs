<?php
// /trader: mesa e configuracoes das contas simuladas (XAUUSD, MNQ) que rodam na maquina do Fabio
// (C:\claude_project\Hub\trader). Login Google restrito ao e-mail dele (lib.php).
define('TRADER', 1);
require __DIR__ . '/lib.php';

header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: no-referrer');

$auth = current_session();
function e($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="robots" content="noindex, nofollow, noarchive" />
<meta name="referrer" content="no-referrer" />
<meta name="theme-color" content="#09090d" />
<title>trader</title>
<link rel="icon" href="/favicon.png" />
<style>
  :root{--bg:#09090d;--bg-2:#111117;--bg-3:#181820;--line:#23232d;--fg:#f1f1f5;--fg-2:#b4b4c0;--fg-3:#7c7c8a;--acc:#e8b95a;--ok:#4cc38a;--err:#ff6b6b;--warn:#f0a030}
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:var(--bg);color:var(--fg);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.5;min-height:100dvh}
  .center{min-height:100dvh;display:grid;place-items:center;padding:24px}
  .card{background:var(--bg-2);border:1px solid var(--line);border-radius:16px;padding:20px}
  .login{width:100%;max-width:380px;padding:32px 28px;display:flex;flex-direction:column;gap:18px}
  .brand{display:flex;align-items:center;gap:10px;color:var(--fg-2);font-size:13px;letter-spacing:.4px;text-transform:uppercase}
  .brand b{width:28px;height:28px;border-radius:8px;background:var(--acc);color:#1a1405;display:grid;place-items:center;font-weight:700;font-size:13px}
  h1{font-size:22px;font-weight:600;letter-spacing:-.3px}
  h2{font-size:15px;font-weight:600;color:var(--fg-2);margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px}
  p.sub{color:var(--fg-2);font-size:14px}
  .msg{font-size:13px;color:var(--fg-3);min-height:18px}
  .msg.err{color:var(--err)}
  #gbtn{display:flex;justify-content:center;min-height:44px}
  /* app */
  .wrap{max-width:1100px;margin:0 auto;padding:16px 16px 60px}
  header.top{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:14px}
  header.top .upd{color:var(--fg-3);font-size:13px;margin-left:auto}
  nav.tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
  nav.tabs button{font:inherit;background:var(--bg-2);color:var(--fg-2);border:1px solid var(--line);border-radius:999px;padding:6px 14px;cursor:pointer}
  nav.tabs button.on{background:var(--acc);color:#1a1405;border-color:var(--acc);font-weight:600}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:14px}
  .kpi .l{color:var(--fg-3);font-size:12px;text-transform:uppercase;letter-spacing:.4px}
  .kpi .v{font-size:24px;font-weight:600;margin-top:2px;font-variant-numeric:tabular-nums}
  .kpi .s{color:var(--fg-2);font-size:13px}
  .pos{color:var(--ok)} .neg{color:var(--err)} .mut{color:var(--fg-3)}
  .tag{display:inline-block;padding:1px 8px;border-radius:999px;font-size:12px;font-weight:600;border:1px solid var(--line)}
  .tag.buy{background:#123524;color:var(--ok);border-color:#1f5a3c}
  .tag.sell{background:#3a1616;color:var(--err);border-color:#5e2323}
  .tag.hold{background:var(--bg-3);color:var(--fg-2)}
  table{width:100%;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums}
  th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:top}
  th{color:var(--fg-3);font-weight:500;font-size:12px;text-transform:uppercase}
  td.r,th.r{text-align:right}
  .scroll{overflow-x:auto}
  .md{color:var(--fg-2);font-size:14px;white-space:normal}
  .md h3,.md h4{color:var(--fg);margin:12px 0 4px;font-size:15px}
  .md p{margin:6px 0} .md ul{margin:6px 0 6px 20px} .md strong{color:var(--fg)}
  details{border-top:1px solid var(--line);padding:10px 0}
  details summary{cursor:pointer;color:var(--acc)}
  .mesa{margin-bottom:12px}
  .mesa .cab{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
  .tp-h,.tp-l{display:grid;grid-template-columns:190px 92px 1fr 52px 62px 62px 1fr 74px 74px;gap:8px;align-items:center;font-variant-numeric:tabular-nums;font-size:13px}
  .tp-h{color:var(--fg-3);font-size:11px;text-transform:uppercase;padding:0 10px 6px 26px}
  .tp-h .r,.tp-l .r{text-align:right}
  details.tp{border:1px solid var(--line);border-radius:10px;margin-bottom:8px;padding:0;background:var(--bg-2)}
  details.tp>summary{list-style:none;padding:8px 10px 8px 26px;position:relative;color:var(--fg)}
  details.tp>summary::-webkit-details-marker{display:none}
  details.tp>summary:before{content:"\25B8";position:absolute;left:10px;top:9px;color:var(--acc)}
  details.tp[open]>summary:before{content:"\25BE"}
  .tp-l+.tp-l{border-top:1px dashed var(--line);margin-top:4px;padding-top:4px}
  .tp-l .nm b{display:block} .tp-l .nm small{color:var(--fg-3)}
  .tp-corpo{padding:4px 12px 12px}
  .tp-dias{display:grid;grid-template-columns:120px 1fr;gap:8px;border-top:1px dashed var(--line);margin-top:4px;padding-top:6px;font-size:11px}
  .tp-dias .lb{color:var(--fg-3);line-height:1.3}
  .tp-dias .cx{display:grid;grid-template-columns:repeat(auto-fill,minmax(50px,1fr));gap:3px}
  .tp-dias .d{background:var(--bg-3);border-radius:5px;padding:2px 3px;text-align:center;font-variant-numeric:tabular-nums;line-height:1.25}
  .tp-dias .d.p{background:#123524} .tp-dias .d.n{background:#3a1616} .tp-dias .d.hj{outline:1px solid var(--acc)}
  .tp-dias .d .dt{color:var(--fg-3);display:block}
  .tp-dias .d .s{color:var(--fg-3);display:block}
  @media(max-width:820px){.tp-dias{grid-template-columns:1fr}}
  .tp-corpo h3{font-size:14px;margin:14px 0 6px}
  .nivel{display:inline-block;width:46px;height:6px;border-radius:3px;background:var(--bg-3);vertical-align:middle;margin-left:6px;overflow:hidden}
  .nivel i{display:block;height:100%;background:linear-gradient(90deg,#3fae6a,#e0b341,#e05a4f)}
  @media(max-width:820px){.tp-h{display:none}.tp-l{grid-template-columns:1fr 1fr 1fr}.tp-l .nm{grid-column:1/-1}}
  form .row{display:grid;grid-template-columns:1fr 160px;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)}
  form .row small{display:block;color:var(--fg-3);font-size:12px}
  input,select{font:inherit;background:var(--bg-3);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:6px 8px;width:100%}
  input[type=checkbox]{width:20px;height:20px;justify-self:end}
  .btn{font:inherit;cursor:pointer;background:var(--acc);color:#1a1405;border:0;border-radius:10px;padding:8px 16px;font-weight:600}
  .btn.sec{background:var(--bg-3);color:var(--fg);border:1px solid var(--line)}
  .btn.danger{background:#3a1616;color:var(--err);border:1px solid #5e2323}
  .acoes{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
  .bar{height:8px;background:var(--bg-3);border-radius:99px;overflow:hidden;margin-top:6px}
  .bar i{display:block;height:100%;background:var(--acc)}
  .aviso{background:#2a2110;border:1px solid #5a4416;color:var(--warn);border-radius:10px;padding:10px 12px;margin-bottom:12px;font-size:14px}
  svg{display:block;width:100%;height:140px}
  .status{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:14px}
  .status .card{display:flex;gap:12px;align-items:flex-start;padding:14px 16px}
  .dot{width:12px;height:12px;border-radius:50%;margin-top:5px;flex:none}
  .dot.ok{background:var(--ok);box-shadow:0 0 0 0 rgba(76,195,138,.6);animation:pulsa 2s infinite}
  .dot.warn{background:var(--warn)} .dot.err{background:var(--err)} .dot.off{background:#4a4a56}
  @keyframes pulsa{0%{box-shadow:0 0 0 0 rgba(76,195,138,.55)}70%{box-shadow:0 0 0 10px rgba(76,195,138,0)}100%{box-shadow:0 0 0 0 rgba(76,195,138,0)}}
  .status .t{font-weight:600} .status .d{color:var(--fg-2);font-size:13px}
  @media(max-width:600px){form .row{grid-template-columns:1fr 110px}.kpi .v{font-size:20px}}
</style>
</head>
<body>
<?php if (!$auth): ?>
<main class="center">
  <div class="card login">
    <div class="brand"><b>T</b><span>trader</span></div>
    <h1>Area restrita</h1>
    <p class="sub">Entre com a conta Google autorizada para ver a mesa e as configuracoes.</p>
    <div id="gbtn"></div>
    <div id="login-msg" class="msg"></div>
  </div>
</main>
<script>
(function () {
  var msg = document.getElementById('login-msg');
  function setMsg(t, err) { msg.textContent = t || ''; msg.className = 'msg' + (err ? ' err' : ''); }
  function onGoogle(resp) {
    setMsg('Verificando...');
    fetch('auth.php?a=login', {method:'POST', credentials:'same-origin',
      headers:{'Content-Type':'application/json','X-Dash':'1'}, body: JSON.stringify({credential: resp.credential})
    }).then(function (r) {
      if (r.status === 200) { location.reload(); return; }
      if (r.status === 403) setMsg('Conta nao autorizada.', true); else setMsg('Falha no login (' + r.status + ').', true);
    }).catch(function () { setMsg('Sem conexao com o servidor.', true); });
  }
  fetch('auth.php?a=config', {credentials:'same-origin'}).then(function (r) { return r.json(); }).then(function (cfg) {
    if (!cfg || !cfg.clientId) { setMsg('Google Client ID nao configurado.', true); return; }
    var s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = function () {
      google.accounts.id.initialize({client_id: cfg.clientId, callback: onGoogle, auto_select: true, ux_mode: 'popup', use_fedcm_for_prompt: true});
      google.accounts.id.renderButton(document.getElementById('gbtn'), {theme:'filled_black', size:'large', shape:'pill', text:'signin_with', width:300, locale:'pt-BR'});
      google.accounts.id.prompt();
    };
    s.onerror = function () { setMsg('Nao foi possivel carregar o Google.', true); };
    document.head.appendChild(s);
  }).catch(function () { setMsg('Sem conexao com o servidor.', true); });
})();
</script>
<?php else: ?>
<div class="wrap">
  <header class="top">
    <div class="brand"><b>T</b><span>trader · simulado</span></div><nav class="tabs" id="ativos" style="margin:0"></nav>
    <span class="upd" id="upd">carregando...</span>
    <span class="mut" style="font-size:13px"><?= e($auth['email']) ?></span>
    <button class="btn sec" id="sair" style="padding:4px 10px">Sair</button>
  </header>
  <nav class="tabs" id="tabs">
    <button data-t="painel" class="on">Painel</button>
    <button data-t="mesa">Mesa</button>
    <button data-t="analises">Analises</button>
    <button data-t="operacoes">Operacoes</button>
    <button data-t="testes">Testes Performance</button>
    <button data-t="config">Configuracoes</button>
  </nav>
  <div id="status"></div>
  <div id="conteudo"></div>
  <div id="vivo" class="card" style="margin-bottom:14px">
    <h2><span id="tvTitulo">ao vivo</span> <span class="mut" style="text-transform:none;letter-spacing:0;font-weight:400">· TradingView</span></h2>
    <div class="tradingview-widget-container" style="min-height:480px"><div class="tradingview-widget-container__widget"></div></div>
  </div>
  <div id="conteudo2"></div>
</div>
<script src="https://unpkg.com/lightweight-charts@4.2.3/dist/lightweight-charts.standalone.production.js"></script>
<script>
(function () {
  var E = null, aba = 'painel';
  // ticker escolhido no topo (cada ticker e uma conta simulada propria)
  var ATIVO = (function () { try { return localStorage.getItem('trader_ativo') || 'XAUUSD'; } catch (e) { return 'XAUUSD'; } })();
  var FICHA = {XAUUSD: {nome: 'Ouro (XAUUSD)', simbolo: 'GC=F', mult: 100, lote_min: 0.01, unidade: 'lote', tv: 'OANDA:XAUUSD'},
               MNQ: {nome: 'Micro Nasdaq-100 (MNQ)', simbolo: 'MNQ=F', mult: 2, lote_min: 1, unidade: 'contrato', tv: 'CME_MINI:MNQ1!'}};
  function K() { return (E && E.estado && E.estado.conta && E.estado.conta.ativo === ATIVO) ? E.estado.conta : FICHA[ATIVO]; }
  function pintarAtivos() {
    var lista = (E && E.ativos) || ['XAUUSD', 'MNQ'];
    document.getElementById('ativos').innerHTML = lista.map(function (a) {
      return '<button data-a="' + a + '" class="' + (a === ATIVO ? 'on' : '') + '">' + a + '</button>';
    }).join('');
  }
  function trocarAtivo(a) {
    if (a === ATIVO) return;
    ATIVO = a; try { localStorage.setItem('trader_ativo', a); } catch (e) {}
    E = null; ultPreco = null; tvSimbolo = null;
    pintarAtivos();
    document.getElementById('conteudo').innerHTML = '<p class="mut">Carregando ' + esc(a) + '...</p>';
    document.getElementById('conteudo2').innerHTML = ''; document.getElementById('status').innerHTML = '';
    carregar();
  }
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function usd(v, sinal) { if (v == null || isNaN(v)) return '-'; var s = Math.abs(v).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}); return (v < 0 ? '-' : (sinal ? '+' : '')) + 'US$ ' + s; }
  function cls(v) { return v > 0 ? 'pos' : (v < 0 ? 'neg' : 'mut'); }
  function dt(s) { if (!s) return '-'; var d = new Date(s); return isNaN(d) ? esc(s) : d.toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}); }
  function tagRating(r) { var k = /buy|overweight/i.test(r) ? 'buy' : (/sell|underweight/i.test(r) ? 'sell' : 'hold'); return '<span class="tag ' + k + '">' + esc(r || '-') + '</span>'; }
  function md(t) {
    var linhas = esc(t || '').split(/\r?\n/), h = '', lista = false;
    linhas.forEach(function (l) {
      var x = l.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      if (/^\s*[-*] /.test(l)) { if (!lista) { h += '<ul>'; lista = true; } h += '<li>' + x.replace(/^\s*[-*] /, '') + '</li>'; return; }
      if (lista) { h += '</ul>'; lista = false; }
      if (/^#{1,6} /.test(l)) h += '<h4>' + x.replace(/^#+ /, '') + '</h4>';
      else if (l.trim() === '') h += '';
      else h += '<p>' + x + '</p>';
    });
    return '<div class="md">' + h + (lista ? '</ul>' : '') + '</div>';
  }
  function post(url, body) {
    return fetch(url, {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json','X-Dash':'1'}, body: JSON.stringify(body)})
      .then(function (r) { return r.json().then(function (j) { j._status = r.status; return j; }); });
  }

  function carregar() {
    fetch('api.php?a=estado&ativo=' + ATIVO, {credentials:'same-origin'}).then(function (r) {
      if (r.status === 401) { location.reload(); return null; } return r.json();
    }).then(function (j) { if (!j || (j.ativo && j.ativo !== ATIVO)) return; E = j; pintarAtivos(); render(); }).catch(function () { $('upd').textContent = 'sem conexao'; });
  }

  function idade() {
    if (!E || !E.estado) return '<div class="aviso">A maquina ainda nao publicou nenhum estado. Ele sobe a cada rodada de 15 min (Hub/trader/web.py).</div>';
    var min = (Date.now() - new Date(E.estado.atualizado)) / 60000;
    $('upd').textContent = 'atualizado ' + dt(E.estado.atualizado);
    return '';
  }

  function painel() {
    var s = E.estado, c = s.carteira, p = c.posicao, g = s.gasto || {}, m = (s.mesas || [])[0];
    var tot = c.saldo - c.capital_inicial;
    var trava = c.travado_dia ? ' <span class="tag ' + (c.travado_dia === 'META' ? 'buy' : 'sell') + '">' + esc(c.travado_dia) + '</span>' : '';
    var h = controle() + '<div class="grid">'
      + '<div class="card kpi"><div class="l">Saldo</div><div class="v">' + usd(c.saldo) + '</div><div class="s ' + cls(tot) + '">' + usd(tot, true) + ' desde o inicio</div></div>'
      + '<div class="card kpi"><div class="l">Hoje (' + esc(c.dia) + ')</div><div class="v ' + cls(c.resultado_dia) + '">' + usd(c.resultado_dia, true) + trava + '</div><div class="s">' + (travaPausada() ? '<span class="neg">travas pausadas</span>' : 'trava ' + usd(s.config.STOP_DIA) + ' / ' + usd(s.config.META_DIA, true)) + '</div></div>'
      + '<div class="card kpi"><div class="l">' + esc(K().nome) + ' (' + esc(K().simbolo) + ', ao vivo)</div><div class="v" id="pxKpi">' + (s.preco ? s.preco.toFixed(2) : '-') + '</div><div class="s">' + (s.config.PAUSADO ? '<span class="neg">entradas pausadas</span>' : 'operando') + '</div></div>'
      + '<div class="card kpi"><div class="l">Mesa de hoje</div><div class="v">' + (m ? tagRating(m.rating) : '-') + '</div><div class="s">' + (m ? esc(m.data) + ' via ' + esc(m.via) : 'sem mesa') + '</div></div>'
      + '</div>';
    h += '<div class="card" style="margin-bottom:14px"><h2>Posicao <span class="mut" style="text-transform:none;letter-spacing:0;font-weight:400" id="pxIdade"></span></h2>' + (p
      ? '<div style="display:flex;gap:28px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px">'
        + '<div><div class="mut" style="font-size:12px">RESULTADO AGORA</div><div id="pnlVivo" class="' + cls(c.flutuante) + '" style="font-size:34px;font-weight:700;font-variant-numeric:tabular-nums">' + usd(c.flutuante, true) + '</div>'
        + '<div id="pnlPts" class="mut" style="font-size:13px"></div></div>'
        + '<div><div class="mut" style="font-size:12px">PRECO AGORA</div><div id="pxPos" style="font-size:22px;font-weight:600">' + (s.preco ? s.preco.toFixed(2) : '-') + '</div></div>'
        + '<div><div class="mut" style="font-size:12px">DIA COM A ABERTA</div><div id="diaVivo" style="font-size:22px;font-weight:600">' + usd(c.resultado_dia + c.flutuante, true) + '</div></div>'
        + '</div>'
        + '<div style="position:relative;height:10px;border-radius:99px;background:linear-gradient(90deg,#5e2323,#23232d 50%,#1f5a3c);margin:4px 0 6px"><i id="pnlCursor" style="position:absolute;top:-4px;width:4px;height:18px;border-radius:2px;background:#f1f1f5;left:50%"></i></div>'
        + '<div style="display:flex;justify-content:space-between;font-size:12px" class="mut"><span>stop ' + p.stop.toFixed(2) + ' (<span class="neg">' + usd(-Math.abs(p.entrada - p.stop) * p.lotes * K().mult) + '</span>)</span><span>entrada ' + p.entrada.toFixed(2) + '</span><span>alvo ' + p.alvo.toFixed(2) + ' (<span class="pos">' + usd(Math.abs(p.alvo - p.entrada) * p.lotes * K().mult, true) + '</span>)</span></div>'
        + '<p class="mut" style="margin-top:10px;font-size:13px">' + tagRating(p.lado === 'COMPRA' ? 'Buy' : 'Sell').replace(/Buy|Sell/, esc(p.lado)) + ' ' + p.lotes + ' ' + esc(K().unidade) + ' · cada 1,00 de movimento = ' + usd(p.lotes * K().mult) + ' · aberta ' + dt(p.aberta_em) + ' · ' + esc(p.motivo) + '</p>'
      : '<p class="mut">Sem posicao aberta.</p>') + '</div>';
    return h;
  }

  // ---------- esta operando? ----------
  function horaNY() {
    var p = {}; new Intl.DateTimeFormat('en-US', {timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false})
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return {dia: p.weekday, h: (+p.hour % 24) + (+p.minute) / 60};
  }
  function mercadoAberto() {
    // ouro: domingo 18h a sexta 17h (NY), com pausa diaria 17h-18h
    var n = horaNY();
    if (n.dia === 'Sat') return false;
    if (n.dia === 'Sun') return n.h >= 18;
    if (n.dia === 'Fri') return n.h < 17;
    return !(n.h >= 17 && n.h < 18);
  }
  function statusBox() {
    if (!E || !E.estado) return '';
    var s = E.estado, c = s.carteira, cfg = s.config, min = (Date.now() - new Date(s.atualizado)) / 60000;
    var aberto = mercadoAberto(), ult = (s.analises || [])[s.analises.length - 1] || {}, ver = ult.veredito || '';
    var mesa = (s.mesas || [])[0];
    // 1. o robo (processo no PC) esta vivo?
    var robo = min <= 20 ? ['ok', 'Robo online', 'ultima rodada ha ' + Math.max(0, Math.round(min)) + ' min · roda a cada 15 min']
      : min <= 40 ? ['warn', 'Robo atrasado', 'ultima rodada ha ' + Math.round(min) + ' min']
      : ['err', 'Robo parado', 'sem rodada ha ' + (min > 120 ? Math.round(min / 60) + ' h' : Math.round(min) + ' min') + ' · PC desligado ou pm2 caiu'];
    // 2. mercado
    var merc = aberto ? ['ok', 'Mercado aberto', 'negocia dom 18h a sex 17h (NY)'] : ['off', 'Mercado fechado', 'volta dom 18h NY (20h/19h em Brasilia); pausa diaria 17h-18h NY'];
    // 3. o que a simulacao esta fazendo
    var sit;
    if (c.posicao) sit = ['ok', 'Em operacao: ' + c.posicao.lado + ' ' + c.posicao.lotes + ' ' + K().unidade, 'entrada ' + c.posicao.entrada.toFixed(2) + ' · agora <b id="sFlut" class="' + cls(c.flutuante) + '">' + usd(c.flutuante, true) + '</b>'];
    else if (c.pendente && !pausadoEfetivo()) sit = ['warn', 'Sinal de ' + (c.pendente.lado > 0 ? 'COMPRA' : 'VENDA') + ': esperando o gatilho de 5 min', 'entra se um candle de 5 min confirmar ate ' + dt(c.pendente.ate) + ' · senao cancela'];
    else if (pausadoEfetivo()) sit = ['warn', 'Robo pausado', 'nao abre posicao nova (Configuracoes > Pausar)'];
    else if (c.travado_dia) sit = [c.travado_dia === 'META' ? 'ok' : 'err', 'Dia encerrado: ' + (c.travado_dia === 'META' ? 'meta +' + cfg.META_DIA : 'stop ' + cfg.STOP_DIA), 'volta a operar no proximo dia (18h NY)'];
    else if (!aberto) sit = ['off', 'Aguardando o mercado abrir', ''];
    else if (min > 40) sit = ['err', 'Nao esta operando', 'o robo nao roda ha ' + Math.round(min) + ' min'];
    else if (cfg.USAR_MESA && mesa && mesa.vies === 0) sit = ['warn', 'Mesa em Hold: nao opera hoje', 'a mesa de agentes nao viu vantagem (' + esc(mesa.data) + ')'];
    else if (/BLOQUEADO/.test(ver)) sit = ['warn', 'Bloqueado por noticia', esc((ver.match(/BLOQUEADO: ([^;|]+)/) || [])[1] || '')];
    else sit = ['ok', 'Procurando entrada', 'ultimo veredito: ' + esc(ver.split('|')[0] || '-') + (mesa ? ' · mesa ' + esc(mesa.rating) : '')];
    if (travaPausada()) sit[2] = (sit[2] ? sit[2] + ' · ' : '') + '<span class="neg">trava diaria pausada</span>';
    function bloco(x) { return '<div class="card"><span class="dot ' + x[0] + '"></span><div><div class="t">' + x[1] + '</div><div class="d">' + x[2] + '</div></div></div>'; }
    return '<div class="status">' + bloco(robo) + bloco(merc) + bloco(sit) + '</div>';
  }

  // ---------- resultado ao vivo (preco a cada 10 s) ----------
  var ultPreco = null;
  function aplicarPreco() {
    if (!E || !E.estado || ultPreco == null) return;
    var c = E.estado.carteira, p = c.posicao, set = function (id, html, k) { var el = $(id); if (el) { el.innerHTML = html; if (k !== undefined) el.className = k; } };
    set('pxKpi', ultPreco.toFixed(2)); set('pxPos', ultPreco.toFixed(2));
    if (!p) return;
    var sinal = p.lado === 'COMPRA' ? 1 : -1, pts = sinal * (ultPreco - p.entrada), r = pts * p.lotes * K().mult;
    set('pnlVivo', usd(r, true), cls(r)); set('sFlut', usd(r, true), cls(r));
    set('pnlPts', (pts >= 0 ? '+' : '') + pts.toFixed(2) + ' pontos (US$/oz) desde a entrada');
    var dia = c.resultado_dia + r; set('diaVivo', usd(dia, true)); var dv = $('diaVivo'); if (dv) dv.className = cls(dia);
    // cursor: 0% = stop, 50% = entrada, 100% = alvo
    var cur = $('pnlCursor');
    if (cur) {
      var f = pts >= 0 ? 50 + 50 * pts / Math.abs(p.alvo - p.entrada) : 50 - 50 * (-pts) / Math.abs(p.entrada - p.stop);
      cur.style.left = 'calc(' + Math.max(0, Math.min(100, f)) + '% - 2px)';
    }
  }
  function puxarPreco() {
    if (aba !== 'painel' || document.hidden || !mercadoAberto()) return;
    fetch('api.php?a=preco&ativo=' + ATIVO, {credentials: 'same-origin'}).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) return;
      ultPreco = j.preco;
      var el = $('pxIdade'); if (el) el.textContent = '· preco de ' + new Date(j.ts * 1000).toLocaleTimeString('pt-BR') + ', atualiza a cada 10 s';
      aplicarPreco();
    }).catch(function () {});
  }
  setInterval(puxarPreco, 10000);

  // ---------- controle: robo e ordens manuais ----------
  function pausadoEfetivo() {
    var sv = E.config_salva || {};
    return sv.PAUSADO !== undefined ? !!sv.PAUSADO : !!E.estado.config.PAUSADO;
  }
  function travaPausada() {
    var sv = E.config_salva || {};
    return sv.TRAVA_PAUSADA !== undefined ? !!sv.TRAVA_PAUSADA : !!E.estado.config.TRAVA_PAUSADA;
  }
  function controle() {
    var s = E.estado, c = s.carteira, pausa = pausadoEfetivo(), p = c.posicao, tp = travaPausada();
    var lotePadrao = s.config.LOTE_FIXO > 0 ? 'fixo ' + s.config.LOTE_FIXO : 'auto (risco ' + usd(s.config.RISCO_POR_TRADE) + ')';
    var h = '<div class="card" style="margin-bottom:14px"><h2>Controle</h2>'
      + '<div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-end">'
      + '<div><div class="mut" style="font-size:12px;margin-bottom:6px">ROBO</div>'
      + (pausa ? '<button class="btn" id="bIniciar">Iniciar robo</button>' : '<button class="btn sec" id="bPausar">Pausar robo</button>')
      + '<div class="mut" style="font-size:12px;margin-top:4px">' + (pausa ? 'pausado: nao abre posicao sozinho' : 'ligado: abre e fecha sozinho') + '</div></div>'
      + '<div><div class="mut" style="font-size:12px;margin-bottom:6px">TRAVA DIARIA</div>'
      + (tp ? '<button class="btn" id="bTravaOn">Reativar travas</button>' : '<button class="btn sec" id="bTravaOff">Pausar travas</button>')
      + '<div class="' + (tp ? 'neg' : 'mut') + '" style="font-size:12px;margin-top:4px">' + (tp ? 'PAUSADA: sem limite de ' + usd(s.config.STOP_DIA) + '/' + usd(s.config.META_DIA, true) + ' no robo e no manual' : 'ativa: ' + usd(s.config.STOP_DIA) + ' / ' + usd(s.config.META_DIA, true) + ' por dia') + '</div></div>'
      + '<div style="flex:1;min-width:280px"><div class="mut" style="font-size:12px;margin-bottom:6px">ORDEM MANUAL (preco de agora)</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
      + '<input id="mLote" type="number" step="' + K().lote_min + '" min="' + K().lote_min + '" max="50" placeholder="' + esc(K().unidade) + ': ' + esc(lotePadrao) + '" style="width:190px">'
      + '<button class="btn" id="bComprar" style="background:#4cc38a;color:#06140d">Comprar</button>'
      + '<button class="btn" id="bVender" style="background:#ff6b6b;color:#1a0606">Vender</button>'
      + (p ? '<button class="btn sec" id="bFechar">Fechar ' + esc(p.lado) + '</button>' : '')
      + '</div><div class="mut" style="font-size:12px;margin-top:4px">stop/alvo pelo modo das Configuracoes (' + esc(s.config.SL_TP_MODO) + ') · respeita a trava de ' + usd(s.config.STOP_DIA) + '/' + usd(s.config.META_DIA, true) + ' · comprar com venda aberta inverte a posicao</div></div>'
      + '</div><div id="ctlMsg" class="msg" style="margin-top:10px">' + ((s.log_comandos || []).length ? 'Ultimo: ' + s.log_comandos.map(esc).join(' · ') : '') + '</div></div>';
    return h;
  }
  function ligarControle() {
    function msg(t, err) { var m = $('ctlMsg'); if (m) { m.textContent = t; m.className = 'msg' + (err ? ' err' : ''); } }
    function acompanhar() { [8000, 20000, 35000, 50000].forEach(function (ms) { setTimeout(carregar, ms); }); }
    function salvar(campo, v, texto) {
      msg('Enviando...');
      var b = {}; b[campo] = v;
      post('api.php?a=config&ativo=' + ATIVO, b).then(function (j) {
        if (!j.ok) { msg('Erro: ' + j.err, true); return; }
        E.config_salva = j.config; render(); msg(texto + ' O PC aplica em ate 20 s.');
      });
    }
    function pausar(v) { salvar('PAUSADO', v, v ? 'Robo pausado.' : 'Robo iniciado.'); }
    function travas(pausa) {
      if (pausa && !window.confirm('Pausar a trava diaria? O robo e as ordens manuais deixam de parar em ' + usd(E.estado.config.STOP_DIA) + ' / ' + usd(E.estado.config.META_DIA, true) + '.')) return;
      salvar('TRAVA_PAUSADA', pausa, pausa ? 'Travas pausadas.' : 'Travas reativadas.');
    }
    if ($('bTravaOff')) $('bTravaOff').onclick = function () { travas(true); };
    if ($('bTravaOn')) $('bTravaOn').onclick = function () { travas(false); };
    function ordem(cmd) {
      var l = $('mLote').value, body = {cmd: cmd};
      if (l !== '') { body.lotes = Number(l); if (!(body.lotes >= K().lote_min && body.lotes <= 50)) { msg('Entre ' + K().lote_min + ' e 50 ' + K().unidade + '.', true); return; } }
      var nome = cmd === 'comprar' ? 'COMPRA' : (cmd === 'vender' ? 'VENDA' : 'fechamento');
      if (!window.confirm('Enviar ' + nome + (body.lotes ? ' de ' + body.lotes + ' ' + K().unidade : '') + ' de ' + ATIVO + ' no preco de agora (simulado)?')) return;
      ['bComprar', 'bVender', 'bFechar'].forEach(function (id) { if ($(id)) $(id).disabled = true; });
      post('api.php?a=comando&ativo=' + ATIVO, body).then(function (j) {
        if (!j.ok) { msg('Erro: ' + j.err, true); return; }
        msg(nome + ' enviada. O PC executa em ate 20 s; o painel atualiza sozinho.'); acompanhar();
      });
    }
    if ($('bPausar')) $('bPausar').onclick = function () { pausar(true); };
    if ($('bIniciar')) $('bIniciar').onclick = function () { pausar(false); };
    if ($('bComprar')) $('bComprar').onclick = function () { ordem('comprar'); };
    if ($('bVender')) $('bVender').onclick = function () { ordem('vender'); };
    if ($('bFechar')) $('bFechar').onclick = function () { ordem('fechar_posicao'); };
  }

  function painelBaixo() {
    var s = E.estado, c = s.carteira, g = s.gasto || {};
    var h = '<div class="card" style="margin-bottom:14px"><h2>Simulacao · candles de 15 min <span class="mut" style="text-transform:none;letter-spacing:0;font-weight:400">· ' + esc(K().simbolo) + ', o que o analista ve</span></h2>'
      + '<div id="graf" style="height:400px"></div>'
      + '<p class="mut" style="font-size:12px;margin-top:6px"><span style="color:#e8b95a">EMA20</span> · <span style="color:#7aa2ff">EMA50</span> · setas = entradas e saidas da simulacao · linhas = entrada, stop e alvo da posicao aberta · atualiza a cada rodada (15 min)</p></div>';
    h += '<div class="card" style="margin-bottom:14px"><h2>Curva do saldo</h2>' + curva(s.operacoes, c.capital_inicial) + '</div>';
    var pct = g.teto ? Math.min(100, (g.usd || 0) / g.teto * 100) : 0;
    h += '<div class="card"><h2>API Anthropic (' + esc(g.mes) + ')</h2><div>' + usd(g.usd || 0) + ' de ' + usd(g.teto) + ' · ' + (g.chamadas || 0) + ' chamadas · acima do teto vai para o claude -p do servidor</div><div class="bar"><i style="width:' + pct + '%"></i></div></div>';
    return h;
  }

  // ---------- grafico ao vivo (TradingView), criado uma vez so ----------
  var tvSimbolo = null;
  function criarTV() {
    var simb = K().tv;
    if (tvSimbolo === simb) return; tvSimbolo = simb;
    $('tvTitulo').textContent = ATIVO + ' ao vivo';
    var box = document.querySelector('#vivo .tradingview-widget-container');
    box.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    var sc = document.createElement('script');
    sc.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    sc.async = true;
    sc.innerHTML = JSON.stringify({
      autosize: false, width: '100%', height: 480, symbol: simb, interval: '15', timezone: 'America/Sao_Paulo',
      theme: 'dark', style: '1', locale: 'br', backgroundColor: '#111117', gridColor: 'rgba(35,35,45,0.6)',
      hide_side_toolbar: false, allow_symbol_change: false, withdateranges: true, save_image: false,
      studies: ['STD;EMA', 'STD;RSI'], support_host: 'https://www.tradingview.com'
    });
    box.appendChild(sc);
  }

  // ---------- grafico da simulacao (lightweight-charts) ----------
  var graf = null;
  function desenharGrafico() {
    var el = $('graf'), cs = E.estado.candles || [];
    if (graf) { graf.remove(); graf = null; }
    if (!el) return;
    if (!window.LightweightCharts || !cs.length) { el.innerHTML = '<p class="mut">' + (cs.length ? 'Biblioteca do grafico nao carregou.' : 'Os candles aparecem depois da proxima rodada da maquina.') + '</p>'; el.style.height = 'auto'; return; }
    var off = -new Date().getTimezoneOffset() * 60;   // eixo no horario local
    graf = LightweightCharts.createChart(el, {
      autoSize: true,
      layout: {background: {type: 'solid', color: '#111117'}, textColor: '#b4b4c0', fontSize: 12},
      grid: {vertLines: {color: '#1c1c24'}, horzLines: {color: '#1c1c24'}},
      timeScale: {timeVisible: true, secondsVisible: false, borderColor: '#23232d'},
      rightPriceScale: {borderColor: '#23232d'},
      crosshair: {mode: 0}
    });
    var serie = graf.addCandlestickSeries({upColor: '#4cc38a', downColor: '#ff6b6b', borderVisible: false, wickUpColor: '#4cc38a', wickDownColor: '#ff6b6b'});
    serie.setData(cs.map(function (k) { return {time: k[0] + off, open: k[1], high: k[2], low: k[3], close: k[4]}; }));
    graf.addLineSeries({color: '#e8b95a', lineWidth: 1, priceLineVisible: false, lastValueVisible: false})
      .setData(cs.map(function (k) { return {time: k[0] + off, value: k[5]}; }));
    graf.addLineSeries({color: '#7aa2ff', lineWidth: 1, priceLineVisible: false, lastValueVisible: false})
      .setData(cs.map(function (k) { return {time: k[0] + off, value: k[6]}; }));

    var ini = cs[0][0], fim = cs[cs.length - 1][0];
    function barra(iso) { var t = Math.floor(Date.parse(iso) / 1000 / 900) * 900; return (t >= ini && t <= fim + 900) ? Math.min(t, fim) + off : null; }
    var mk = [];
    (E.estado.operacoes || []).forEach(function (o) {
      var compra = o.lado === 'COMPRA', ta = barra(o.aberta_em), tf = barra(o.fechada_em);
      if (ta) mk.push({time: ta, position: compra ? 'belowBar' : 'aboveBar', color: compra ? '#4cc38a' : '#ff6b6b', shape: compra ? 'arrowUp' : 'arrowDown', text: (compra ? 'C ' : 'V ') + o.lotes});
      if (tf) mk.push({time: tf, position: compra ? 'aboveBar' : 'belowBar', color: o.resultado >= 0 ? '#4cc38a' : '#ff6b6b', shape: 'circle', text: (o.resultado >= 0 ? '+' : '') + Math.round(o.resultado)});
    });
    var p = E.estado.carteira.posicao;
    if (p) {
      var compra = p.lado === 'COMPRA', ta = barra(p.aberta_em);
      if (ta) mk.push({time: ta, position: compra ? 'belowBar' : 'aboveBar', color: compra ? '#4cc38a' : '#ff6b6b', shape: compra ? 'arrowUp' : 'arrowDown', text: (compra ? 'C ' : 'V ') + p.lotes + ' (aberta)'});
      serie.createPriceLine({price: p.entrada, color: '#b4b4c0', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'entrada'});
      serie.createPriceLine({price: p.stop, color: '#ff6b6b', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'stop'});
      serie.createPriceLine({price: p.alvo, color: '#4cc38a', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'alvo'});
    }
    mk.sort(function (a, b) { return a.time - b.time; });
    serie.setMarkers(mk);
    graf.timeScale().setVisibleLogicalRange({from: cs.length - 120, to: cs.length + 3});
  }

  function curva(ops, ini) {
    var pts = [ini].concat((ops || []).map(function (o) { return o.saldo; }));
    if (pts.length < 2) return '<p class="mut">Sem operacoes fechadas ainda.</p>';
    var mn = Math.min.apply(null, pts), mx = Math.max.apply(null, pts); if (mx === mn) { mx += 1; mn -= 1; }
    var W = 1000, H = 140, d = pts.map(function (v, i) { return (i ? 'L' : 'M') + (i / (pts.length - 1) * W).toFixed(1) + ' ' + (H - 8 - (v - mn) / (mx - mn) * (H - 16)).toFixed(1); }).join(' ');
    var y0 = (H - 8 - (ini - mn) / (mx - mn) * (H - 16)).toFixed(1);
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none"><line x1="0" x2="' + W + '" y1="' + y0 + '" y2="' + y0 + '" stroke="#3a3a46" stroke-dasharray="6 6"/><path d="' + d + '" fill="none" stroke="' + (pts[pts.length - 1] >= ini ? '#4cc38a' : '#ff6b6b') + '" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg><p class="mut" style="font-size:12px">min ' + usd(mn) + ' · max ' + usd(mx) + '</p>';
  }

  function mesa() {
    var ms = E.estado.mesas || [];
    var h = '<div class="acoes" style="margin:0 0 14px"><button class="btn" data-cmd="mesa_agora">Rodar a mesa agora</button><span class="mut" style="align-self:center;font-size:13px">roda na proxima rodada (ate 15 min) · ~US$1,40 pela API</span></div>';
    if (!ms.length) return h + '<p class="mut">Nenhuma mesa ainda.</p>';
    ms.forEach(function (m, i) {
      h += '<div class="card mesa"><div class="cab"><b>' + esc(m.data) + '</b>' + tagRating(m.rating) + '<span class="mut">vies ' + (m.vies > 0 ? '+' : '') + m.vies + ' · via ' + esc(m.via) + ' · ' + (m.segundos || 0) + ' s</span></div>'
        + md(m.resumo)
        + (m.relatorio_mercado ? '<details' + (i === 0 ? '' : '') + '><summary>Analista de mercado</summary>' + md(m.relatorio_mercado) + '</details>' : '')
        + (m.relatorio_noticias ? '<details><summary>Analista de noticias</summary>' + md(m.relatorio_noticias) + '</details>' : '')
        + '</div>';
    });
    return h;
  }

  function analises() {
    var a = (E.estado.analises || []).slice().reverse();
    if (!a.length) return '<p class="mut">Sem analises ainda.</p>';
    var h = '<div class="card scroll"><table><tr><th>Quando</th><th class="r">Preco</th><th>Veredito</th><th>Mesa</th><th>Manchetes</th><th class="r">Dia</th></tr>';
    a.forEach(function (x) {
      var n = x.noticias || {};
      h += '<tr><td>' + dt(x.ts) + '</td><td class="r">' + (x.preco ? x.preco.toFixed(2) : '-') + '</td><td>' + esc(x.veredito) + '</td><td>' + (x.mesa ? tagRating(x.mesa.rating) : '-') + '</td><td><span class="' + cls(n.score) + '">' + (n.score != null ? (n.score > 0 ? '+' : '') + Number(n.score).toFixed(2) : '-') + '</span> <span class="mut">' + esc((n.motivos || [])[0] || '') + '</span></td><td class="r ' + cls(x.dia) + '">' + usd(x.dia, true) + '</td></tr>';
    });
    return h + '</table></div>';
  }

  function operacoes() {
    var ops = (E.estado.operacoes || []).slice().reverse(), dias = E.estado.dias || {};
    var h = '<div class="card scroll" style="margin-bottom:14px"><h2>Dias</h2><table><tr><th>Dia</th><th class="r">Resultado</th><th>Trava</th><th class="r">Ops</th></tr>';
    Object.keys(dias).sort().reverse().forEach(function (d) { var x = dias[d]; h += '<tr><td>' + esc(d) + '</td><td class="r ' + cls(x.resultado) + '">' + usd(x.resultado, true) + '</td><td>' + esc(x.trava || '-') + '</td><td class="r">' + x.ops + '</td></tr>'; });
    h += '</table></div><div class="card scroll"><h2>Operacoes</h2>';
    if (!ops.length) return h + '<p class="mut">Nenhuma operacao fechada.</p></div>';
    h += '<table><tr><th>Fechada</th><th>Lado</th><th class="r">Lotes</th><th class="r">Entrada</th><th class="r">Saida</th><th class="r">Resultado</th><th>Saida por</th><th class="r">Saldo</th></tr>';
    ops.forEach(function (o) { h += '<tr title="' + esc(o.motivo) + '"><td>' + dt(o.fechada_em) + '</td><td>' + esc(o.lado) + '</td><td class="r">' + o.lotes + '</td><td class="r">' + o.entrada + '</td><td class="r">' + o.saida + '</td><td class="r ' + cls(o.resultado) + '">' + usd(o.resultado, true) + '</td><td>' + esc(o.saida_por) + '</td><td class="r">' + usd(o.saldo) + '</td></tr>'; });
    return h + '</table></div>';
  }

  // ---------- testes de performance ----------
  var TST = {}, TSTcarregando = {};
  function carregarTestes() {
    if (TSTcarregando[ATIVO]) return;
    var a = ATIVO; TSTcarregando[a] = true;
    fetch('api.php?a=testes&ativo=' + a, {credentials:'same-origin'}).then(function (r) { return r.json(); })
      .then(function (j) { TST[a] = j; TSTcarregando[a] = false; if (aba === 'testes' && ATIVO === a) render(); })
      .catch(function () { TSTcarregando[a] = false; TST[a] = {ok:false}; if (aba === 'testes') render(); });
  }
  function linhaTeste(v, modo, primeira) {
    var x = v[modo].resumo, fl = x.fator_lucro == null ? '-' : x.fator_lucro.toFixed(2);
    return '<div class="tp-l">'
      + (primeira ? '<div class="nm"><b>' + esc(v.id.toUpperCase()) + ' · ' + esc(v.nome) + '</b><small>arrojo <span class="nivel"><i style="width:' + (v.nivel * 10) + '%"></i></span></small></div>' : '<div class="nm"></div>')
      + '<div>' + (modo === 'com_trava' ? '<span class="tag hold">com trava</span>' : '<span class="tag">sem trava</span>') + '</div>'
      + '<div class="r ' + cls(x.resultado) + '" style="font-weight:600">' + usd(x.resultado, true) + '</div>'
      + '<div class="r">' + x.ops + '</div>'
      + '<div class="r">' + (x.ops ? x.acerto.toFixed(0) + '%' : '-') + '</div>'
      + '<div class="r">' + fl + '</div>'
      + '<div class="r neg">' + (x.drawdown ? usd(x.drawdown) : '-') + '</div>'
      + '<div class="r"><span class="pos">' + x.dias_pos + '</span>/<span class="neg">' + x.dias_neg + '</span></div>'
      + '<div class="r">' + (modo === 'com_trava' ? '<span class="pos">' + x.dias_meta + '</span>/<span class="neg">' + x.dias_stop + '</span>' : '-') + '</div>'
      + '</div>';
  }
  function num(v) { if (!v) return '0'; var a = Math.abs(v); return (v < 0 ? '-' : '+') + (a >= 1000 ? (a / 1000).toFixed(1).replace('.', ',') + 'k' : Math.round(a)); }
  function diasTeste(v) {
    var c = v.com_trava.dias || {}, s = v.sem_trava.dias || {};
    var ks = Object.keys(c).concat(Object.keys(s)).filter(function (k, i, a) { return a.indexOf(k) === i; }).sort().slice(-30);
    var h = '<div class="tp-dias"><div class="lb">Por dia, ultimos ' + ks.length + '<br><b style="color:var(--fg)">com trava</b> / sem trava</div><div class="cx">';
    ks.forEach(function (k) {
      var a = c[k] || {resultado: 0, ops: 0}, b = s[k] || {resultado: 0, ops: 0};
      h += '<div class="d ' + (a.resultado > 0 ? 'p' : (a.resultado < 0 ? 'n' : '')) + (a.em_andamento ? ' hj' : '') + '" title="' + esc(k)
        + (a.em_andamento ? ' (em andamento)' : '') + '\ncom trava: ' + usd(a.resultado, true) + ' em ' + a.ops + ' ops' + (a.trava ? ' (' + a.trava + ')' : '')
        + '\nsem trava: ' + usd(b.resultado, true) + ' em ' + b.ops + ' ops"><span class="dt">' + k.slice(8, 10) + '/' + k.slice(5, 7) + '</span><b class="' + cls(a.resultado) + '">' + num(a.resultado)
        + '</b><span class="s">' + num(b.resultado) + '</span></div>';
    });
    return h + '</div></div>';
  }
  function tabelaOps(m, titulo) {
    var x = m.resumo, ops = (m.operacoes || []).slice().reverse();
    var h = '<h3>' + titulo + ' <span class="mut" style="font-weight:400;font-size:13px">' + x.ops + ' operacoes · saldo final ' + usd(x.saldo)
      + ' · ganho medio ' + usd(x.ganho_medio, true) + ' · perda media ' + usd(x.perda_media, true)
      + ' · maior ganho ' + usd(x.maior_ganho, true) + ' · maior perda ' + usd(x.maior_perda, true) + '</span></h3>';
    if (m.posicao) h += '<p style="font-size:13px;margin:4px 0">Posicao aberta agora: ' + esc(m.posicao.lado) + ' ' + m.posicao.lotes + ' @ ' + m.posicao.entrada + ' desde ' + dt(m.posicao.aberta_em) + '</p>';
    if (!ops.length) return h + '<p class="mut">Nenhuma operacao: com essa configuracao o robo nao achou entrada no periodo.</p>';
    h += '<div class="scroll" style="max-height:460px;overflow-y:auto"><table><tr><th>Dia</th><th>Aberta</th><th>Fechada</th><th>Lado</th><th class="r">Lotes</th><th class="r">Entrada</th><th class="r">Saida</th><th class="r">Resultado</th><th>Saida por</th><th class="r">Saldo</th></tr>';
    ops.forEach(function (o) {
      h += '<tr><td>' + esc(o.dia) + '</td><td>' + dt(o.aberta_em) + '</td><td>' + dt(o.fechada_em) + '</td><td>' + esc(o.lado) + '</td><td class="r">' + o.lotes
        + '</td><td class="r">' + o.entrada + '</td><td class="r">' + o.saida + '</td><td class="r ' + cls(o.resultado) + '">' + usd(o.resultado, true)
        + '</td><td>' + esc(o.saida_por) + '</td><td class="r">' + usd(o.saldo) + '</td></tr>';
    });
    return h + '</table></div>';
  }
  function corpoTeste(v) {
    var c = v.cfg, k = K();
    var p = '<p class="mut" style="font-size:13px;margin:6px 0">' + esc(v.desc) + '. Risco ' + usd(c.RISCO_POR_TRADE) + ' por operacao'
      + (c.LOTE_FIXO ? ' (' + c.LOTE_FIXO + ' ' + esc(k.unidade || 'contrato') + ' fixo)' : '') + ' · entra com pontuacao &ge; ' + c.LIMIAR_ENTRADA
      + ' · stop ' + c.STOP_ATR + ' ATR · alvo ' + c.ALVO_ATR + ' ATR · gatilho 5 min ' + (c.GATILHO_5M ? 'sim' : 'nao')
      + ' · 30/60 min ' + (c.MTF_ATIVO ? (c.MTF_VETO ? 'com veto' : 'pontuando') : 'nao') + '</p>';
    return p + tabelaOps(v.com_trava, 'Com trava (+/-US$200 por dia)') + tabelaOps(v.sem_trava, 'Sem trava (opera o dia inteiro)');
  }
  function testes() {
    var j = TST[ATIVO];
    if (!j) { carregarTestes(); return '<div class="card"><p class="mut">Carregando os testes de ' + esc(ATIVO) + '...</p></div>'; }
    if (!j.ok || !j.testes) return '<div class="card"><p class="mut">Ainda nao ha testes publicados para ' + esc(ATIVO) + '. A maquina roda os testes uma vez por dia.</p></div>';
    var t = j.testes, pe = t.periodo;
    var h = '<div class="card" style="margin-bottom:14px"><h2>Testes Performance · ' + esc(t.nome || t.ativo) + '</h2>'
      + '<p class="mut" style="font-size:13px;margin:4px 0 0">10 versoes, da mais arrojada para a mais conservadora, cada uma em duas linhas: <b>com trava</b> (para no dia ao bater ' + usd(t.meta_dia, true) + ' ou ' + usd(t.stop_dia) + ') e <b>sem trava</b> (opera o dia inteiro, sem limite). '
      + 'Historico de ' + dt(pe.inicio) + ' a ' + dt(pe.fim) + ' (' + pe.dias + ' dias). Comecou com os 58 dias que o Yahoo libera em 5 e 15 min e segue rodando todo dia, continuando a mesma carteira (comecou com ' + usd(t.capital) + ' em cada linha), so candles e macro (sem mesa e sem noticias). Atualizado em ' + dt(t.atualizado) + '. Clique numa versao para ver todas as operacoes.</p></div>';
    h += '<div class="tp-h"><div>Versao</div><div>Modo</div><div class="r">Resultado</div><div class="r">Ops</div><div class="r">Acerto</div><div class="r">F. lucro</div><div class="r">Pior queda</div><div class="r">Dias +/-</div><div class="r">Meta/Stop</div></div>';
    t.versoes.forEach(function (v, i) {
      h += '<details class="tp" data-i="' + i + '"><summary>' + linhaTeste(v, 'com_trava', true) + linhaTeste(v, 'sem_trava', false) + diasTeste(v) + '</summary><div class="tp-corpo"></div></details>';
    });
    return h;
  }

  function configuracoes() {
    var s = E.estado, cfg = s.config, ed = s.editaveis || {}, salva = E.config_salva || {};
    var pend = Object.keys(salva).some(function (k) { return k[0] !== '_' && cfg[k] !== undefined && String(cfg[k]) !== String(salva[k]); });
    var h = pend ? '<div class="aviso">Ha configuracao salva que a maquina ainda nao aplicou. Ela baixa na proxima rodada (ate 15 min).</div>' : '';
    h += '<form id="fcfg" class="card"><h2>Configuracoes</h2>';
    Object.keys(ed).forEach(function (k) {
      if (k === 'TETO_MES_USD' && !E.editavel_teto) return;   // orcamento da API e do Fabio
      var m = ed[k], v = salva[k] !== undefined ? salva[k] : cfg[k], campo;
      if (m.tipo === 'bool') campo = '<input type="checkbox" name="' + k + '"' + (v ? ' checked' : '') + '>';
      else if (m.opcoes || k === 'MODELO_API') campo = '<select name="' + k + '">' + (m.opcoes || s.modelos || []).map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
      else campo = '<input type="number" step="any" name="' + k + '" value="' + esc(v) + '" min="' + m.min + '" max="' + m.max + '">';
      h += '<div class="row"><label>' + esc(m.desc) + '<small>' + esc(k) + (m.min != null ? ' · ' + m.min + ' a ' + m.max : '') + '</small></label>' + campo + '</div>';
    });
    h += '<div class="acoes"><button class="btn" type="submit">Salvar</button><span id="cmsg" class="msg" style="align-self:center"></span></div></form>';
    h += '<div class="card" style="margin-top:14px"><h2>Acoes</h2><div class="acoes" style="margin-top:0">'
      + '<button class="btn sec" data-cmd="mesa_agora">Rodar a mesa agora</button>'
      + '<button class="btn sec" data-cmd="fechar_posicao">Fechar posicao</button>'
      + '<button class="btn danger" data-cmd="zerar_carteira" data-confirma="1">Zerar carteira (US$25 mil)</button></div>'
      + '<p class="mut" style="margin-top:10px;font-size:13px">Executam na proxima rodada da maquina (ate 15 min).</p>' + historico() + '</div>';
    return h;
  }

  function historico() {
    var cs = (E.comandos || []).slice(-8).reverse(), log = E.estado.log_comandos || [];
    var h = '';
    if (cs.length) h += '<p style="margin-top:10px;font-size:13px" class="mut">Pedidos: ' + cs.map(function (c) { return esc(c.cmd) + ' (' + dt(c.ts) + ')'; }).join(' · ') + '</p>';
    if (log.length) h += '<p style="font-size:13px">Ultima rodada: ' + log.map(esc).join(' · ') + '</p>';
    return h;
  }

  function render() {
    var h = idade(), ehPainel = aba === 'painel' && E && E.estado;
    if (E && E.estado) h += ({painel: painel, mesa: mesa, analises: analises, operacoes: operacoes, testes: testes, config: configuracoes})[aba]();
    $('status').innerHTML = statusBox();
    $('conteudo').innerHTML = h;
    $('conteudo2').innerHTML = ehPainel ? painelBaixo() : '';
    $('vivo').style.display = aba === 'painel' ? '' : 'none';
    if (aba === 'painel') criarTV();
    if (ehPainel) { desenharGrafico(); ligarControle(); aplicarPreco(); if (ultPreco == null) puxarPreco(); } else if (graf) { graf.remove(); graf = null; }
    document.querySelectorAll('details.tp').forEach(function (d) {
      d.addEventListener('toggle', function () {
        var corpo = d.querySelector('.tp-corpo'), j = TST[ATIVO];
        if (d.open && !corpo.innerHTML && j && j.testes) corpo.innerHTML = corpoTeste(j.testes.versoes[+d.dataset.i]);
      });
    });
    var f = $('fcfg');
    if (f) f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var body = {}, ed = E.estado.editaveis;
      Object.keys(ed).forEach(function (k) { var el = f.elements[k]; if (!el || (k === 'TETO_MES_USD' && !E.editavel_teto)) return; body[k] = ed[k].tipo === 'bool' ? el.checked : (ed[k].tipo === 'str' ? el.value : Number(el.value)); });
      $('cmsg').textContent = 'Salvando...';
      post('api.php?a=config&ativo=' + ATIVO, body).then(function (j) {
        if (j.ok) { E.config_salva = j.config; $('cmsg').textContent = 'Salvo. A maquina aplica na proxima rodada.'; }
        else $('cmsg').textContent = 'Erro: ' + (j.campos ? 'fora da faixa em ' + j.campos.join(', ') : j.err);
      });
    });
    document.querySelectorAll('[data-cmd]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.confirma && !window.confirm('Zerar a carteira simulada e voltar para US$25 mil?')) return;
        b.disabled = true;
        post('api.php?a=comando&ativo=' + ATIVO, {cmd: b.dataset.cmd}).then(function (j) { b.textContent = j.ok ? 'Pedido enviado' : 'Erro'; carregar(); });
      });
    });
  }

  $('ativos').addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (b) trocarAtivo(b.dataset.a);
  });
  pintarAtivos();
  $('tabs').addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    aba = b.dataset.t;
    document.querySelectorAll('#tabs button').forEach(function (x) { x.classList.toggle('on', x === b); });
    render();
  });
  $('sair').addEventListener('click', function () {
    fetch('auth.php?a=logout', {method:'POST', credentials:'same-origin', headers:{'X-Dash':'1'}}).then(function () { location.reload(); });
  });
  carregar();
  setInterval(function () { if (aba !== 'config' && aba !== 'testes') carregar(); }, 60000);
})();
</script>
<?php endif; ?>
</body>
</html>
