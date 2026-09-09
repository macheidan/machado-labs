<?php
// /rotinas: o painel simplificado do que roda sozinho na maquina do Fabio.
// O HTML e gerado em C:\claude_project\Hub\agenda\painel.py e sobe por FTPS
// como _painel.html (negado pelo .htaccess). So sai daqui, depois do login.
define('ROTINAS', 1);
require __DIR__ . '/lib.php';

header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: no-referrer');

$auth = current_session();

function e($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

if ($auth) {
    $arquivo = __DIR__ . '/_painel.html';
    $html    = is_file($arquivo) ? (string)@file_get_contents($arquivo) : '';

    // barra de saida injetada no fim do painel; o painel em si nao sabe de login
    $barra = '<div style="max-width:760px;margin:2.5rem auto 0;padding:0 1rem;font:13px Segoe UI,system-ui,sans-serif;color:#6f685c;display:flex;gap:1rem;align-items:center">'
           . '<span>' . e($auth['email']) . '</span>'
           . '<button id="sair" style="font:inherit;cursor:pointer;background:none;border:1px solid #c9c1b0;border-radius:8px;padding:.3rem .7rem;color:inherit">Sair</button>'
           . '<a href="/dash/" style="margin-left:auto;color:#9a5f06">dash</a></div>'
           . '<script>document.getElementById("sair").addEventListener("click",function(){'
           . 'fetch("auth.php?a=logout",{method:"POST",credentials:"same-origin",headers:{"X-Dash":"1"}})'
           . '.then(function(){if(window.google&&google.accounts){try{google.accounts.id.disableAutoSelect();}catch(e){}}location.reload();});});</script>';

    if ($html === '') {
        $html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Rotinas</title></head>'
              . '<body style="font-family:Segoe UI,system-ui,sans-serif;padding:2rem"><h1>Rotinas</h1>'
              . '<p>Nenhum painel publicado ainda. Ele sobe da maquina do Fabio no fim de cada rodada '
              . '(<code>Hub/agenda/publicar.py</code>).</p></body></html>';
    }
    $pos = strripos($html, '</body>');
    echo $pos === false ? $html . $barra : substr($html, 0, $pos) . $barra . substr($html, $pos);
    exit;
}
?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="robots" content="noindex, nofollow, noarchive" />
<meta name="referrer" content="no-referrer" />
<meta name="theme-color" content="#09090d" />
<title>rotinas</title>
<link rel="icon" href="/favicon.png" />
<style>
  :root{--bg:#09090d;--bg-2:#111117;--line:#23232d;--fg:#f1f1f5;--fg-2:#b4b4c0;--fg-3:#7c7c8a;--acc:#e8b95a;--err:#ff6b6b}
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:var(--bg);color:var(--fg);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.5;min-height:100dvh}
  .center{min-height:100dvh;display:grid;place-items:center;padding:24px}
  .card{width:100%;max-width:380px;background:var(--bg-2);border:1px solid var(--line);border-radius:18px;padding:32px 28px;display:flex;flex-direction:column;gap:18px}
  .brand{display:flex;align-items:center;gap:10px;color:var(--fg-2);font-size:13px;letter-spacing:.4px;text-transform:uppercase}
  .brand b{width:28px;height:28px;border-radius:8px;background:var(--acc);color:#1a1405;display:grid;place-items:center;font-weight:700;font-size:13px}
  h1{font-size:22px;font-weight:600;letter-spacing:-.3px}
  p.sub{color:var(--fg-2);font-size:14px}
  .msg{font-size:13px;color:var(--fg-3);min-height:18px}
  .msg.err{color:var(--err)}
  #gbtn{display:flex;justify-content:center;min-height:44px}
</style>
</head>
<body>
<main class="center">
  <div class="card">
    <div class="brand"><b>R</b><span>rotinas</span></div>
    <h1>Area restrita</h1>
    <p class="sub">Entre com a conta Google autorizada para ver o painel.</p>
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
    fetch('auth.php?a=login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Dash': '1' },
      body: JSON.stringify({ credential: resp.credential })
    }).then(function (r) {
      if (r.status === 200) { location.reload(); return; }
      if (r.status === 403) setMsg('Conta nao autorizada.', true);
      else setMsg('Falha no login (' + r.status + ').', true);
    }).catch(function () { setMsg('Sem conexao com o servidor.', true); });
  }

  fetch('auth.php?a=config', { credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (cfg) {
      if (!cfg || !cfg.clientId) { setMsg('Google Client ID nao configurado.', true); return; }
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = function () {
        google.accounts.id.initialize({
          client_id: cfg.clientId, callback: onGoogle,
          auto_select: true, ux_mode: 'popup', use_fedcm_for_prompt: true
        });
        google.accounts.id.renderButton(document.getElementById('gbtn'), {
          theme: 'filled_black', size: 'large', shape: 'pill',
          text: 'signin_with', width: 300, locale: 'pt-BR'
        });
        google.accounts.id.prompt();
      };
      s.onerror = function () { setMsg('Nao foi possivel carregar o Google.', true); };
      document.head.appendChild(s);
    })
    .catch(function () { setMsg('Sem conexao com o servidor.', true); });
})();
</script>
</body>
</html>
