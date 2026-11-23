<?php
// /whatsbot: painel de administracao da Izza (bot de atendimento no WhatsApp).
// Nao listado (noindex, fora do sitemap). Login Google: o Fabio e quem ele
// cadastrar na equipe, cada um com papel por loja.
define('WB', 1);
require __DIR__ . '/lib.php';

header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: no-referrer');

$db = db_load();
$eu = current_user($db);
$v = '20261123d';
?><!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="robots" content="noindex, nofollow, noarchive" />
<meta name="referrer" content="no-referrer" />
<title>Izza · painel</title>
<link rel="icon" href="/favicon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="app.css?v=<?= $v ?>" />
<script>
  try { var t = localStorage.getItem('wb_tema'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) {}
</script>
</head>
<body>
<?php if (!$eu): ?>
<main class="login">
  <div class="login-card">
    <div class="marca"><span class="logo">iz</span><span>Izza · painel</span></div>
    <h1>Entrar</h1>
    <p class="muted">Use a conta Google cadastrada na equipe da loja.</p>
    <div id="gbtn"></div>
    <div id="login-msg" class="login-msg"></div>
  </div>
</main>
<script>
(function () {
  var msg = document.getElementById('login-msg');
  function setMsg(t, err) { msg.textContent = t || ''; msg.className = 'login-msg' + (err ? ' err' : ''); }
  function onGoogle(resp) {
    setMsg('Verificando...');
    fetch('auth.php?a=login', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-WB': '1' },
      body: JSON.stringify({ credential: resp.credential })
    }).then(function (r) {
      if (r.status === 200) { location.reload(); return; }
      if (r.status === 403) setMsg('Essa conta não está na equipe de nenhuma loja. Peça acesso ao dono.', true);
      else setMsg('Falha no login (' + r.status + ').', true);
    }).catch(function () { setMsg('Sem conexão com o servidor.', true); });
  }
  fetch('auth.php?a=config', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (cfg) {
    var s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = function () {
      google.accounts.id.initialize({ client_id: cfg.clientId, callback: onGoogle, auto_select: true, ux_mode: 'popup', use_fedcm_for_prompt: true });
      google.accounts.id.renderButton(document.getElementById('gbtn'), { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', width: 300, locale: 'pt-BR' });
      google.accounts.id.prompt();
    };
    s.onerror = function () { setMsg('Não foi possível carregar o Google.', true); };
    document.head.appendChild(s);
  }).catch(function () { setMsg('Sem conexão com o servidor.', true); });
})();
</script>
<?php else: ?>
<div id="app" class="layout">
  <aside class="sidebar" id="sidebar">
    <div class="marca"><span class="logo">iz</span><span>Izza · painel</span></div>
    <div class="side-label">Menu</div>
    <nav id="nav"></nav>
    <div class="side-foot muted" id="side-foot"></div>
  </aside>
  <div class="overlay" id="overlay"></div>
  <div class="main">
    <header class="topbar">
      <button class="icon-btn only-mobile" id="menu-btn" aria-label="Menu">☰</button>
      <div class="loja-sel">
        <label for="loja" class="muted">Loja</label>
        <select id="loja"></select>
      </div>
      <div class="top-right">
        <button class="icon-btn" id="tema-btn" aria-label="Tema claro/escuro" title="Tema">◐</button>
        <div class="user" id="user"></div>
      </div>
    </header>
    <main class="content" id="content"><div class="vazio">Carregando…</div></main>
  </div>
</div>
<div class="toast" id="toast"></div>
<div class="modal-fundo" id="modal" hidden><div class="modal" id="modal-corpo"></div></div>
<script src="app.js?v=<?= $v ?>"></script>
<?php endif; ?>
</body>
</html>
