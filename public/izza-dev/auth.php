<?php
// /izza-dev (copia de desenvolvimento do painel da Izza; NAO e o que as lojas usam)/auth.php: config, login e logout. Responde JSON.
define('WB', 1);
require __DIR__ . '/lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['a']) ? $_GET['a'] : '';

function out($code, $arr) {
    http_response_code($code);
    echo json_encode($arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// CSRF: cookie SameSite=Strict e ainda um header custom em toda escrita.
function require_header() {
    if (empty($_SERVER['HTTP_X_WB']) || $_SERVER['HTTP_X_WB'] !== '1') out(403, array('ok' => false, 'err' => 'csrf'));
}

if ($action === 'config' && $method === 'GET') out(200, array('ok' => true, 'clientId' => CLIENT_ID));

if ($action === 'login' && $method === 'POST') {
    require_header();
    $raw = file_get_contents('php://input');
    if (strlen($raw) > 16384) out(413, array('ok' => false, 'err' => 'too_big'));
    $d = json_decode($raw, true);
    $cred = is_array($d) && isset($d['credential']) ? (string)$d['credential'] : '';
    if ($cred === '' || strlen($cred) > 4096) out(400, array('ok' => false, 'err' => 'no_credential'));

    list($code, $resp) = wb_http_get('https://oauth2.googleapis.com/tokeninfo?id_token=' . rawurlencode($cred));
    $info = $code === 200 ? json_decode((string)$resp, true) : null;
    if (!is_array($info)) out(401, array('ok' => false, 'err' => 'token_invalid'));

    $okAud = isset($info['aud']) && hash_equals(CLIENT_ID, (string)$info['aud']);
    $okIss = isset($info['iss']) && in_array($info['iss'], array('accounts.google.com', 'https://accounts.google.com'), true);
    $okExp = isset($info['exp']) && (int)$info['exp'] > time();
    $okVer = isset($info['email_verified']) && ($info['email_verified'] === 'true' || $info['email_verified'] === true);
    if (!$okAud || !$okIss || !$okExp) out(401, array('ok' => false, 'err' => 'token_invalid'));

    $email = strtolower(isset($info['email']) ? (string)$info['email'] : '');
    $db = db_load();
    $u = usuario_de($db, $email);
    if (!$okVer || !$u) out(403, array('ok' => false, 'err' => 'forbidden'));

    // guarda nome e foto do Google para a lista da equipe
    db_tx(function (&$db) use ($email, $info) {
        $u = isset($db['usuarios'][$email]) ? $db['usuarios'][$email] : array('lojas' => array());
        if (empty($u['nome']) && !empty($info['name'])) $u['nome'] = (string)$info['name'];
        if (!empty($info['picture'])) $u['foto'] = (string)$info['picture'];
        $u['ultimoAcesso'] = date('c');
        $db['usuarios'][$email] = $u;
    });

    $tok = bin2hex(random_bytes(32));
    $s = load_sessions();
    $s[hash('sha256', $tok)] = array(
        'email' => $email, 'exp' => time() + SESSION_TTL, 'at' => date('c'),
        'ua' => substr(isset($_SERVER['HTTP_USER_AGENT']) ? (string)$_SERVER['HTTP_USER_AGENT'] : '', 0, 120),
    );
    save_sessions($s);
    set_session_cookie($tok, time() + SESSION_TTL);
    out(200, array('ok' => true, 'email' => $email));
}

if ($action === 'logout' && $method === 'POST') {
    require_header();
    if (!empty($_COOKIE[COOKIE])) {
        $s = load_sessions();
        unset($s[hash('sha256', $_COOKIE[COOKIE])]);
        save_sessions($s);
    }
    set_session_cookie('', time() - 3600);
    out(200, array('ok' => true));
}

out(404, array('ok' => false, 'err' => 'not_found'));
