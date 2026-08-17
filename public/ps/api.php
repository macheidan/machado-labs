<?php
// /ps: cofre de senhas pessoal.
// Login: Google Identity Services (ID token) validado aqui, restrito a ALLOWED_EMAIL.
// Dados: um blob criptografado no navegador (AES-GCM, chave derivada da senha-mestra).
// O servidor nunca ve o conteudo em claro. Sessao via cookie HttpOnly.

const CLIENT_ID     = '431718871014-ot8oobfkds0v0hgh4j85d4g3o21fkva1.apps.googleusercontent.com';
const ALLOWED_EMAIL = 'machadofabio@gmail.com';
const SESSION_TTL   = 2592000; // 30 dias
const COOKIE        = 'ps_s';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$dir    = __DIR__;
$vaultF = $dir . '/vault.dat';
$sessF  = $dir . '/sessions.dat';
$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['a']) ? $_GET['a'] : '';

function out($code, $arr) {
    http_response_code($code);
    echo json_encode($arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function body() {
    $raw = file_get_contents('php://input');
    if (strlen($raw) > 5 * 1024 * 1024) out(413, array('ok' => false, 'err' => 'too_big'));
    $d = json_decode($raw, true);
    return is_array($d) ? $d : array();
}
function http_get($url) {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
        ));
        $r = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return array($code, $r);
    }
    $ctx = stream_context_create(array('http' => array('timeout' => 10, 'ignore_errors' => true)));
    $r = @file_get_contents($url, false, $ctx);
    $code = 0;
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) $code = (int)$m[1];
    return array($code, $r);
}
function load_sessions($f) {
    if (!is_file($f)) return array();
    $d = json_decode((string)@file_get_contents($f), true);
    if (!is_array($d)) return array();
    $now = time();
    foreach ($d as $k => $v) if (!isset($v['exp']) || $v['exp'] < $now) unset($d[$k]);
    return $d;
}
function save_sessions($f, $d) {
    @file_put_contents($f, json_encode($d), LOCK_EX);
}
function set_cookie($val, $exp) {
    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    if (PHP_VERSION_ID >= 70300) {
        setcookie(COOKIE, $val, array(
            'expires' => $exp, 'path' => '/ps/', 'secure' => $secure,
            'httponly' => true, 'samesite' => 'Strict',
        ));
    } else {
        setcookie(COOKIE, $val, $exp, '/ps/; samesite=Strict', '', $secure, true);
    }
}
function current_session($sessF) {
    if (empty($_COOKIE[COOKIE])) return null;
    $tok = $_COOKIE[COOKIE];
    if (!preg_match('/^[a-f0-9]{64}$/', $tok)) return null;
    $h = hash('sha256', $tok);
    $s = load_sessions($sessF);
    if (!isset($s[$h])) return null;
    return $s[$h];
}
function require_auth($sessF) {
    $s = current_session($sessF);
    if (!$s || $s['email'] !== ALLOWED_EMAIL) out(401, array('ok' => false, 'err' => 'unauthorized'));
    // CSRF: exige header custom alem do SameSite=Strict
    if ($_SERVER['REQUEST_METHOD'] !== 'GET' && (empty($_SERVER['HTTP_X_PS']) || $_SERVER['HTTP_X_PS'] !== '1')) {
        out(403, array('ok' => false, 'err' => 'csrf'));
    }
    return $s;
}

// ---------- rotas ----------

if ($action === 'config' && $method === 'GET') {
    out(200, array('ok' => true, 'clientId' => CLIENT_ID));
}

if ($action === 'login' && $method === 'POST') {
    $d = body();
    $cred = isset($d['credential']) ? (string)$d['credential'] : '';
    if ($cred === '' || strlen($cred) > 4096) out(400, array('ok' => false, 'err' => 'no_credential'));

    list($code, $resp) = http_get('https://oauth2.googleapis.com/tokeninfo?id_token=' . rawurlencode($cred));
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
    $s = load_sessions($sessF);
    $s[hash('sha256', $tok)] = array(
        'email' => ALLOWED_EMAIL,
        'exp'   => time() + SESSION_TTL,
        'ua'    => substr(isset($_SERVER['HTTP_USER_AGENT']) ? (string)$_SERVER['HTTP_USER_AGENT'] : '', 0, 120),
        'at'    => date('c'),
    );
    save_sessions($sessF, $s);
    set_cookie($tok, time() + SESSION_TTL);
    out(200, array('ok' => true, 'email' => ALLOWED_EMAIL));
}

if ($action === 'logout' && $method === 'POST') {
    if (!empty($_COOKIE[COOKIE])) {
        $s = load_sessions($sessF);
        unset($s[hash('sha256', $_COOKIE[COOKIE])]);
        save_sessions($sessF, $s);
    }
    set_cookie('', time() - 3600);
    out(200, array('ok' => true));
}

if ($action === 'me' && $method === 'GET') {
    $s = current_session($sessF);
    if (!$s) out(401, array('ok' => false, 'err' => 'unauthorized'));
    out(200, array('ok' => true, 'email' => $s['email']));
}

if ($action === 'vault' && $method === 'GET') {
    require_auth($sessF);
    if (!is_file($vaultF)) out(200, array('ok' => true, 'blob' => null, 'rev' => 0));
    $v = json_decode((string)@file_get_contents($vaultF), true);
    if (!is_array($v) || empty($v['blob'])) out(200, array('ok' => true, 'blob' => null, 'rev' => 0));
    out(200, array('ok' => true, 'blob' => $v['blob'], 'rev' => (int)$v['rev'], 'updated' => $v['updated']));
}

if ($action === 'vault' && $method === 'POST') {
    require_auth($sessF);
    $d = body();
    if (!isset($d['blob']) || !is_string($d['blob']) || $d['blob'] === '') out(400, array('ok' => false, 'err' => 'bad_payload'));
    if (!preg_match('/^[A-Za-z0-9+\/=:._-]+$/', $d['blob'])) out(400, array('ok' => false, 'err' => 'bad_blob'));
    $baseRev = isset($d['rev']) ? (int)$d['rev'] : 0;

    $fp = fopen($vaultF, 'c+');
    if (!$fp) out(500, array('ok' => false, 'err' => 'open_failed'));
    flock($fp, LOCK_EX);
    $cur = json_decode((string)stream_get_contents($fp), true);
    $curRev = is_array($cur) && isset($cur['rev']) ? (int)$cur['rev'] : 0;
    if ($curRev !== $baseRev) {
        flock($fp, LOCK_UN); fclose($fp);
        out(409, array('ok' => false, 'err' => 'conflict', 'rev' => $curRev));
    }
    // guarda uma geracao anterior como backup
    if (is_array($cur) && !empty($cur['blob'])) @file_put_contents($dir . '/vault.prev.dat', json_encode($cur), LOCK_EX);
    $newRev = $curRev + 1;
    $out = json_encode(array('blob' => $d['blob'], 'rev' => $newRev, 'updated' => date('c')));
    ftruncate($fp, 0); rewind($fp); fwrite($fp, $out); fflush($fp);
    flock($fp, LOCK_UN); fclose($fp);
    out(200, array('ok' => true, 'rev' => $newRev));
}

out(404, array('ok' => false, 'err' => 'not_found'));
