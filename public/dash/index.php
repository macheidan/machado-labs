<?php
// /dash: tela de navegacao dos projetos pessoais.
// Protegida no servidor: sem sessao valida, a lista de projetos nem chega ao navegador.
define('DASH', 1);
require __DIR__ . '/lib.php';

header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: no-referrer');

$auth = current_session();

// ---------------------------------------------------------------------------
// Lista de projetos. Para adicionar um novo, copie um bloco e ajuste.
//   url = null  -> cartao aparece desativado, com a nota do campo "estado"
//   ext = true  -> abre em nova aba
// ---------------------------------------------------------------------------
$GRUPOS = array(
    array(
        'titulo' => 'Dia a dia',
        'itens'  => array(
            array('sigla' => 'PS', 'nome' => 'Cofre de senhas', 'desc' => 'Senhas e notas com criptografia no navegador.', 'url' => '/ps/', 'alvo' => 'fabiomachado.com.br/ps'),
            array('sigla' => 'CC', 'nome' => 'Comer Certo', 'desc' => 'Diario de calorias com atalhos e estimativa por IA.', 'url' => '/comer/', 'alvo' => 'fabiomachado.com.br/comer'),
            array('sigla' => 'IN', 'nome' => 'Investimentos', 'desc' => 'Patrimonio, alocacao e evolucao mensal.', 'url' => 'https://investimentos.fabiomachado.com.br', 'alvo' => 'investimentos.fabiomachado.com.br', 'ext' => true),
            array('sigla' => 'VG', 'nome' => 'Viagem EUA 2026', 'desc' => 'Roteiro, voos, orcamento e compras da familia.', 'url' => 'https://viagem-2026-8a398.web.app', 'alvo' => 'viagem-2026-8a398.web.app', 'ext' => true),
        ),
    ),
    array(
        'titulo' => 'Criacao',
        'itens'  => array(
            array('sigla' => 'RF', 'nome' => 'Referencias', 'desc' => 'Bibliotecas de prompt: lettering, criativos, layout, fontes.', 'url' => '/refs/', 'alvo' => 'fabiomachado.com.br/refs'),
            array('sigla' => 'AD', 'nome' => 'Admin do site', 'desc' => 'Editor de posts do machado-labs via Sveltia CMS.', 'url' => '/admin/', 'alvo' => 'fabiomachado.com.br/admin'),
            array('sigla' => 'ML', 'nome' => 'Site publico', 'desc' => 'fabiomachado.com.br, posts e paginas no ar.', 'url' => '/', 'alvo' => 'fabiomachado.com.br'),
        ),
    ),
    array(
        'titulo' => 'Maquina',
        'itens'  => array(
            array('sigla' => 'RT', 'nome' => 'Rotinas', 'desc' => 'Painel do que roda sozinho: revisao de Ads e cada rodada com sinal e ultima data.', 'url' => '/rotinas/', 'alvo' => 'fabiomachado.com.br/rotinas'),
        ),
    ),
);

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
<title>dash</title>
<link rel="icon" href="/favicon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet" />
<style>
  :root{
    --bg:#09090d; --bg-2:#111117; --bg-3:#17171f; --line:#23232d; --line-2:#2f2f3b;
    --fg:#f1f1f5; --fg-2:#b4b4c0; --fg-3:#7c7c8a;
    --acc:#e8b95a; --acc-2:#f5d48a; --ok:#5ad38a; --err:#ff6b6b;
    --font:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    --mono:'Geist Mono',ui-monospace,Menlo,Consolas,monospace;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:var(--bg);color:var(--fg);font-family:var(--font);font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased;min-height:100dvh}
  button{font:inherit;color:inherit;cursor:pointer;background:none;border:0}
  a{color:inherit;text-decoration:none}

  /* ---------- login ---------- */
  .center{min-height:100dvh;display:grid;place-items:center;padding:24px}
  .card{width:100%;max-width:380px;background:var(--bg-2);border:1px solid var(--line);border-radius:18px;padding:32px 28px;display:flex;flex-direction:column;gap:18px}
  .brand{display:flex;align-items:center;gap:10px;color:var(--fg-2);font-size:13px;letter-spacing:.4px;text-transform:uppercase}
  .brand b{width:28px;height:28px;border-radius:8px;background:var(--acc);color:#1a1405;display:grid;place-items:center;font-weight:700;font-size:13px}
  .card h1{font-size:22px;font-weight:600;letter-spacing:-.3px}
  .card p.sub{color:var(--fg-2);font-size:14px}
  .msg{font-size:13px;color:var(--fg-3);min-height:18px}
  .msg.err{color:var(--err)}
  #gbtn{display:flex;justify-content:center;min-height:44px}

  /* ---------- dashboard ---------- */
  .wrap{max-width:1000px;margin:0 auto;padding:clamp(28px,6vh,64px) clamp(16px,4vw,32px) 64px}
  header.top{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:clamp(28px,5vh,48px)}
  .top .dir{display:flex;align-items:center;gap:14px}
  .top .who{font-family:var(--mono);font-size:12px;color:var(--fg-3)}
  .sair{padding:7px 12px;border-radius:9px;border:1px solid var(--line-2);font-size:13px;color:var(--fg-2);transition:border-color .15s,color .15s}
  .sair:hover{border-color:var(--err);color:var(--err)}

  .grupo{margin-bottom:clamp(28px,5vh,44px)}
  .grupo h2{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;color:var(--fg-3);
    padding-bottom:10px;border-bottom:1px solid var(--line);margin-bottom:18px}
  .grade{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(268px,1fr))}

  .item{display:flex;gap:14px;align-items:flex-start;background:var(--bg-2);border:1px solid var(--line);
    border-radius:14px;padding:16px;transition:border-color .15s,background .15s,transform .15s}
  .item:hover{border-color:var(--line-2);background:var(--bg-3);transform:translateY(-2px)}
  .item .sig{flex:none;width:38px;height:38px;border-radius:10px;background:var(--bg-3);border:1px solid var(--line-2);
    display:grid;place-items:center;font-family:var(--mono);font-size:12px;font-weight:500;color:var(--acc);letter-spacing:.5px}
  .item:hover .sig{background:var(--acc);color:#1a1405;border-color:var(--acc)}
  .item .txt{min-width:0}
  .item .nome{font-size:15px;font-weight:600;letter-spacing:-.2px;display:flex;align-items:center;gap:6px}
  .item .nome .seta{color:var(--fg-3);font-size:12px}
  .item .desc{display:block;font-size:13px;color:var(--fg-2);margin-top:3px}
  .item .alvo{display:block;font-family:var(--mono);font-size:11px;color:var(--fg-3);margin-top:8px;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

  .item.off{opacity:.55;cursor:default}
  .item.off:hover{border-color:var(--line);background:var(--bg-2);transform:none}
  .item.off:hover .sig{background:var(--bg-3);color:var(--acc);border-color:var(--line-2)}

  footer.pe{margin-top:8px;font-size:12px;color:var(--fg-3);font-family:var(--mono)}
</style>
</head>
<body>

<?php if (!$auth): ?>
<main class="center">
  <div class="card">
    <div class="brand"><b>D</b><span>dash</span></div>
    <h1>Area restrita</h1>
    <p class="sub">Entre com a conta Google autorizada para ver os projetos.</p>
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

<?php else: ?>
<div class="wrap">
  <header class="top">
    <div class="brand"><b>D</b><span>dash</span></div>
    <div class="dir">
      <span class="who"><?= e($auth['email']) ?></span>
      <button class="sair" id="sair">Sair</button>
    </div>
  </header>

  <?php foreach ($GRUPOS as $g): ?>
  <section class="grupo">
    <h2><?= e($g['titulo']) ?></h2>
    <div class="grade">
      <?php foreach ($g['itens'] as $p):
        $temUrl = !empty($p['url']);
        $ext    = !empty($p['ext']);
        $tag    = $temUrl ? 'a' : 'div';
      ?>
      <<?= $tag ?> class="item<?= $temUrl ? '' : ' off' ?>"<?= $temUrl ? ' href="' . e($p['url']) . '"' : '' ?><?= $ext ? ' target="_blank" rel="noopener noreferrer"' : '' ?>>
        <span class="sig"><?= e($p['sigla']) ?></span>
        <span class="txt">
          <span class="nome"><?= e($p['nome']) ?><?php if ($ext): ?><span class="seta">&#8599;</span><?php endif; ?></span>
          <span class="desc"><?= e($p['desc']) ?></span>
          <span class="alvo"><?= e(isset($p['estado']) ? $p['estado'] : $p['alvo']) ?></span>
        </span>
      </<?= $tag ?>>
      <?php endforeach; ?>
    </div>
  </section>
  <?php endforeach; ?>

  <footer class="pe">acesso restrito &middot; <?= e(ALLOWED_EMAIL) ?></footer>
</div>
<script>
document.getElementById('sair').addEventListener('click', function () {
  fetch('auth.php?a=logout', {
    method: 'POST', credentials: 'same-origin', headers: { 'X-Dash': '1' }
  }).then(function () {
    if (window.google && google.accounts) { try { google.accounts.id.disableAutoSelect(); } catch (e) {} }
    location.reload();
  });
});
</script>
<?php endif; ?>

</body>
</html>
