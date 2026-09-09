<?php
// /dash: nucleo de sessao/login. Incluido por index.php e auth.php.
// Nao serve nada sozinho.
if (!defined('DASH')) { http_response_code(404); exit; }

const CLIENT_ID     = '431718871014-ot8oobfkds0v0hgh4j85d4g3o21fkva1.apps.googleusercontent.com';
const ALLOWED_EMAIL = 'machadofabio@gmail.com';
const SESSION_TTL   = 2592000; // 30 dias
const COOKIE        = 'dash_s';

function sess_file() { return __DIR__ . '/sessions.dat'; }

function dash_http_get($url) {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_SSL_VERIFYPEER => true,
        ));
        $r    = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return array($code, $r);
    }
    $ctx = stream_context_create(array('http' => array('timeout' => 10, 'ignore_errors' => true)));
    $r   = @file_get_contents($url, false, $ctx);
    $code = 0;
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) $code = (int)$m[1];
    return array($code, $r);
}

function load_sessions() {
    $f = sess_file();
    if (!is_file($f)) return array();
    $d = json_decode((string)@file_get_contents($f), true);
    if (!is_array($d)) return array();
    $now = time();
    foreach ($d as $k => $v) if (!isset($v['exp']) || $v['exp'] < $now) unset($d[$k]);
    return $d;
}

function save_sessions($d) {
    @file_put_contents(sess_file(), json_encode($d), LOCK_EX);
}

function set_session_cookie($val, $exp) {
    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    if (PHP_VERSION_ID >= 70300) {
        setcookie(COOKIE, $val, array(
            'expires'  => $exp,
            'path'     => '/dash/',
            'secure'   => $secure,
            'httponly' => true,
            'samesite' => 'Strict',
        ));
    } else {
        setcookie(COOKIE, $val, $exp, '/dash/; samesite=Strict', '', $secure, true);
    }
}

// Devolve a sessao valida do cookie, ou null.
function current_session() {
    if (empty($_COOKIE[COOKIE])) return null;
    $tok = $_COOKIE[COOKIE];
    if (!preg_match('/^[a-f0-9]{64}$/', $tok)) return null;
    $s = load_sessions();
    $h = hash('sha256', $tok);
    if (!isset($s[$h])) return null;
    if ($s[$h]['email'] !== ALLOWED_EMAIL) return null;
    return $s[$h];
}
