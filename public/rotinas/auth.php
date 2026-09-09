<?php
// /rotinas/auth.php: config, login e logout. Responde JSON.
define('ROTINAS', 1);
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

// CSRF: cookie e SameSite=Strict e ainda exigimos um header custom em toda escrita.
function require_header() {
    if (empty($_SERVER['HTTP_X_DASH']) || $_SERVER['HTTP_X_DASH'] !== '1') {
        out(403, array('ok' => false, 'err' => 'csrf'));
    }
}

if ($action === 'config' && $method === 'GET') {
    out(200, array('ok' => true, 'clientId' => CLIENT_ID));
}

if ($action === 'login' && $method === 'POST') {
    require_header();
    $raw = file_get_contents('php://input');
    if (strlen($raw) > 16384) out(413, array('ok' => false, 'err' => 'too_big'));
    $d    = json_decode($raw, true);
    $cred = is_array($d) && isset($d['credential']) ? (string)$d['credential'] : '';
    if ($cred === '' || strlen($cred) > 4096) out(400, array('ok' => false, 'err' => 'no_credential'));

    list($code, $resp) = dash_http_get('https://oauth2.googleapis.com/tokeninfo?id_token=' . rawurlencode($cred));
    $info = $code === 200 ? json_decode((string)$resp, true) : null;
    if (!is_array($info)) out(401, array('ok' => false, 'err' => 'token_invalid'));

    $okAud   = isset($info['aud']) && hash_equals(CLIENT_ID, (string)$info['aud']);
    $okIss   = isset($info['iss']) && in_array($info['iss'], array('accounts.google.com', 'https://accounts.google.com'), true);
    $okExp   = isset($info['exp']) && (int)$info['exp'] > time();
    $okMail  = isset($info['email']) && strtolower($info['email']) === ALLOWED_EMAIL;
    $okVerif = isset($info['email_verified']) && ($info['email_verified'] === 'true' || $info['email_verified'] === true);

    if (!$okAud || !$okIss || !$okExp) out(401, array('ok' => false, 'err' => 'token_invalid'));
    if (!$okMail || !$okVerif)         out(403, array('ok' => false, 'err' => 'forbidden'));

    $tok = bin2hex(random_bytes(32));
    $s   = load_sessions();
    $s[hash('sha256', $tok)] = array(
        'email' => ALLOWED_EMAIL,
        'exp'   => time() + SESSION_TTL,
        'ua'    => substr(isset($_SERVER['HTTP_USER_AGENT']) ? (string)$_SERVER['HTTP_USER_AGENT'] : '', 0, 120),
        'at'    => date('c'),
    );
    save_sessions($s);
    set_session_cookie($tok, time() + SESSION_TTL);
    out(200, array('ok' => true, 'email' => ALLOWED_EMAIL));
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

if ($action === 'me' && $method === 'GET') {
    $s = current_session();
    if (!$s) out(401, array('ok' => false, 'err' => 'unauthorized'));
    out(200, array('ok' => true, 'email' => $s['email']));
}

out(404, array('ok' => false, 'err' => 'not_found'));
