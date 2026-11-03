<?php
// /trader: mesa e configuracoes da simulacao de XAUUSD que roda na maquina do Fabio
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
    <div class="brand"><b>T</b><span>trader · XAUUSD simulado</span></div>
    <span class="upd" id="upd">carregando...</span>
    <span class="mut" style="font-size:13px"><?= e($auth['email']) ?></span>
    <button class="btn sec" id="sair" style="padding:4px 10px">Sair</button>
  </header>
  <nav class="tabs" id="tabs">
    <button data-t="painel" class="on">Painel</button>
    <button data-t="mesa">Mesa</button>
    <button data-t="analises">Analises</button>
    <button data-t="operacoes">Operacoes</button>
    <button data-t="config">Configuracoes</button>
  </nav>
  <div id="conteudo"></div>
</div>
<script>
(function () {
  var E = null, aba = 'painel';
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
    fetch('api.php?a=estado', {credentials:'same-origin'}).then(function (r) {
      if (r.status === 401) { location.reload(); return null; } return r.json();
    }).then(function (j) { if (!j) return; E = j; render(); }).catch(function () { $('upd').textContent = 'sem conexao'; });
  }

  function idade() {
    if (!E || !E.estado) return '<div class="aviso">A maquina ainda nao publicou nenhum estado. Ele sobe a cada rodada de 15 min (Hub/trader/web.py).</div>';
    var min = (Date.now() - new Date(E.estado.atualizado)) / 60000;
    $('upd').textContent = 'atualizado ' + dt(E.estado.atualizado);
    if (min > 40) return '<div class="aviso">Ultima rodada ha ' + Math.round(min) + ' min. A simulacao pode estar parada (fim de semana, pausa do mercado ou PC desligado).</div>';
    return '';
  }

  function painel() {
    var s = E.estado, c = s.carteira, p = c.posicao, g = s.gasto || {}, m = (s.mesas || [])[0];
    var tot = c.saldo - c.capital_inicial;
    var trava = c.travado_dia ? ' <span class="tag ' + (c.travado_dia === 'META' ? 'buy' : 'sell') + '">' + esc(c.travado_dia) + '</span>' : '';
    var h = '<div class="grid">'
      + '<div class="card kpi"><div class="l">Saldo</div><div class="v">' + usd(c.saldo) + '</div><div class="s ' + cls(tot) + '">' + usd(tot, true) + ' desde o inicio</div></div>'
      + '<div class="card kpi"><div class="l">Hoje (' + esc(c.dia) + ')</div><div class="v ' + cls(c.resultado_dia) + '">' + usd(c.resultado_dia, true) + trava + '</div><div class="s">trava ' + usd(s.config.STOP_DIA) + ' / ' + usd(s.config.META_DIA, true) + '</div></div>'
      + '<div class="card kpi"><div class="l">XAUUSD</div><div class="v">' + (s.preco ? s.preco.toFixed(2) : '-') + '</div><div class="s">' + (s.config.PAUSADO ? '<span class="neg">entradas pausadas</span>' : 'operando') + '</div></div>'
      + '<div class="card kpi"><div class="l">Mesa de hoje</div><div class="v">' + (m ? tagRating(m.rating) : '-') + '</div><div class="s">' + (m ? esc(m.data) + ' via ' + esc(m.via) : 'sem mesa') + '</div></div>'
      + '</div>';
    h += '<div class="card" style="margin-bottom:14px"><h2>Posicao</h2>' + (p
      ? '<table><tr><th>Lado</th><th class="r">Lotes</th><th class="r">Entrada</th><th class="r">Stop</th><th class="r">Alvo</th><th class="r">Flutuante</th></tr><tr><td>' + tagRating(p.lado === 'COMPRA' ? 'Buy' : 'Sell').replace(/Buy|Sell/, esc(p.lado)) + '</td><td class="r">' + p.lotes + '</td><td class="r">' + p.entrada.toFixed(2) + '</td><td class="r">' + p.stop.toFixed(2) + '</td><td class="r">' + p.alvo.toFixed(2) + '</td><td class="r ' + cls(c.flutuante) + '">' + usd(c.flutuante, true) + '</td></tr></table><p class="mut" style="margin-top:8px;font-size:13px">Aberta ' + dt(p.aberta_em) + ' · ' + esc(p.motivo) + '</p>'
      : '<p class="mut">Sem posicao aberta.</p>') + '</div>';
    h += '<div class="card" style="margin-bottom:14px"><h2>Curva do saldo</h2>' + curva(s.operacoes, c.capital_inicial) + '</div>';
    var pct = g.teto ? Math.min(100, (g.usd || 0) / g.teto * 100) : 0;
    h += '<div class="card"><h2>API Anthropic (' + esc(g.mes) + ')</h2><div>' + usd(g.usd || 0) + ' de ' + usd(g.teto) + ' · ' + (g.chamadas || 0) + ' chamadas · acima do teto vai para o claude -p do servidor</div><div class="bar"><i style="width:' + pct + '%"></i></div></div>';
    return h;
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

  function configuracoes() {
    var s = E.estado, cfg = s.config, ed = s.editaveis || {}, salva = E.config_salva || {};
    var pend = Object.keys(salva).some(function (k) { return k[0] !== '_' && cfg[k] !== undefined && String(cfg[k]) !== String(salva[k]); });
    var h = pend ? '<div class="aviso">Ha configuracao salva que a maquina ainda nao aplicou. Ela baixa na proxima rodada (ate 15 min).</div>' : '';
    h += '<form id="fcfg" class="card"><h2>Configuracoes</h2>';
    Object.keys(ed).forEach(function (k) {
      var m = ed[k], v = salva[k] !== undefined ? salva[k] : cfg[k], campo;
      if (m.tipo === 'bool') campo = '<input type="checkbox" name="' + k + '"' + (v ? ' checked' : '') + '>';
      else if (k === 'MODELO_API') campo = '<select name="' + k + '">' + (s.modelos || []).map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
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
    var h = idade();
    if (E && E.estado) h += ({painel: painel, mesa: mesa, analises: analises, operacoes: operacoes, config: configuracoes})[aba]();
    $('conteudo').innerHTML = h;
    var f = $('fcfg');
    if (f) f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var body = {}, ed = E.estado.editaveis;
      Object.keys(ed).forEach(function (k) { var el = f.elements[k]; if (!el) return; body[k] = ed[k].tipo === 'bool' ? el.checked : (k === 'MODELO_API' ? el.value : Number(el.value)); });
      $('cmsg').textContent = 'Salvando...';
      post('api.php?a=config', body).then(function (j) {
        if (j.ok) { E.config_salva = j.config; $('cmsg').textContent = 'Salvo. A maquina aplica na proxima rodada.'; }
        else $('cmsg').textContent = 'Erro: ' + (j.campos ? 'fora da faixa em ' + j.campos.join(', ') : j.err);
      });
    });
    document.querySelectorAll('[data-cmd]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.confirma && !window.confirm('Zerar a carteira simulada e voltar para US$25 mil?')) return;
        b.disabled = true;
        post('api.php?a=comando', {cmd: b.dataset.cmd}).then(function (j) { b.textContent = j.ok ? 'Pedido enviado' : 'Erro'; carregar(); });
      });
    });
  }

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
  setInterval(function () { if (aba !== 'config') carregar(); }, 60000);
})();
</script>
<?php endif; ?>
</body>
</html>
