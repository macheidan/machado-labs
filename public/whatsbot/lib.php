<?php
// /whatsbot: nucleo do painel da Izza (sessao, login, banco em JSON, permissao).
// Incluido por index.php, auth.php e api.php. Nao serve nada sozinho.
//
// Modelo de negocio (2026-11-22): o painel administra VARIAS lojas e cada
// pessoa pode ter um papel diferente em cada uma. O Fabio (SUPERADMIN) ve tudo
// e nunca fica trancado para fora, mesmo com o banco vazio.
if (!defined('WB')) { http_response_code(404); exit; }

const CLIENT_ID   = '431718871014-ot8oobfkds0v0hgh4j85d4g3o21fkva1.apps.googleusercontent.com';
const SUPERADMIN  = 'machadofabio@gmail.com';
const SESSION_TTL = 2592000; // 30 dias
const COOKIE      = 'wb_s';
const COOKIE_PATH = '/whatsbot/';

// Papeis por loja, do menor ao maior. O que cada um pode: ver pode_*().
const PAPEIS = array('operador' => 1, 'gerente' => 2, 'dono' => 3);

function data_dir() {
    $d = __DIR__ . '/data';
    if (!is_dir($d)) @mkdir($d, 0750, true);
    if (!is_file($d . '/.htaccess')) @file_put_contents($d . '/.htaccess', "Require all denied\n");
    return $d;
}

function wb_http_get($url) {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_SSL_VERIFYPEER => true));
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

// ---------------------------------------------------------------- arquivos JSON
function json_read($arq, $padrao) {
    if (!is_file($arq)) return $padrao;
    $d = json_decode((string)@file_get_contents($arq), true);
    return is_array($d) ? $d : $padrao;
}

// grava inteiro num .tmp e renomeia: ninguem le arquivo pela metade
function json_write($arq, $dados) {
    $tmp = $arq . '.tmp' . getmypid();
    $ok = @file_put_contents($tmp, json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
    if ($ok === false) return false;
    return @rename($tmp, $arq);
}

function db_file() { return data_dir() . '/whatsbot.json'; }

function db_vazio() {
    return array('versao' => 1, 'lojas' => array(), 'usuarios' => array(), 'log' => array());
}

function db_load() {
    $db = json_read(db_file(), db_vazio());
    foreach (array('lojas', 'usuarios', 'log') as $k) if (!isset($db[$k]) || !is_array($db[$k])) $db[$k] = array();
    return $db;
}

// Le, muda e grava com trava exclusiva: dois cliques ao mesmo tempo nao se apagam.
// $fn recebe o banco por referencia e devolve o que a acao responde.
function db_tx($fn) {
    $lock = fopen(data_dir() . '/.lock', 'c');
    flock($lock, LOCK_EX);
    try {
        $db = db_load();
        $res = $fn($db);
        if (!json_write(db_file(), $db)) throw new Exception('nao consegui gravar');
        return $res;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function db_log(&$db, $email, $loja, $acao, $detalhe = '') {
    array_unshift($db['log'], array(
        'em' => date('c'), 'email' => $email, 'loja' => $loja, 'acao' => $acao,
        'detalhe' => mb_substr((string)$detalhe, 0, 300),
    ));
    if (count($db['log']) > 600) $db['log'] = array_slice($db['log'], 0, 600);
}

// ---------------------------------------------------------------- sessao
function sess_file() { return data_dir() . '/sessions.json'; }

function load_sessions() {
    $d = json_read(sess_file(), array());
    $now = time();
    foreach ($d as $k => $v) if (!isset($v['exp']) || $v['exp'] < $now) unset($d[$k]);
    return $d;
}

function save_sessions($d) { json_write(sess_file(), $d); }

function set_session_cookie($val, $exp) {
    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    setcookie(COOKIE, $val, array(
        'expires' => $exp, 'path' => COOKIE_PATH, 'secure' => $secure,
        'httponly' => true, 'samesite' => 'Strict',
    ));
}

function current_session() {
    if (empty($_COOKIE[COOKIE])) return null;
    $tok = $_COOKIE[COOKIE];
    if (!preg_match('/^[a-f0-9]{64}$/', $tok)) return null;
    $s = load_sessions();
    $h = hash('sha256', $tok);
    return isset($s[$h]) ? $s[$h] : null;
}

// Usuario da sessao, ja resolvido contra o banco: quem foi removido perde o
// acesso na hora, mesmo com cookie valido.
function current_user($db) {
    $s = current_session();
    if (!$s) return null;
    return usuario_de($db, $s['email']);
}

function usuario_de($db, $email) {
    $email = strtolower(trim((string)$email));
    if ($email === SUPERADMIN) {
        $u = isset($db['usuarios'][$email]) ? $db['usuarios'][$email] : array();
        $lojas = array();
        foreach ($db['lojas'] as $id => $l) $lojas[$id] = 'dono';
        return array('email' => $email, 'nome' => isset($u['nome']) ? $u['nome'] : 'Fábio', 'superadmin' => true, 'lojas' => $lojas);
    }
    if (!isset($db['usuarios'][$email])) return null;
    $u = $db['usuarios'][$email];
    if (isset($u['ativo']) && !$u['ativo']) return null;
    $lojas = array();
    foreach ((isset($u['lojas']) ? $u['lojas'] : array()) as $id => $p) {
        if (isset($db['lojas'][$id]) && array_key_exists($p, PAPEIS)) $lojas[$id] = $p;
    }
    if (!$lojas) return null;
    return array('email' => $email, 'nome' => isset($u['nome']) ? $u['nome'] : '', 'superadmin' => false, 'lojas' => $lojas);
}

// ---------------------------------------------------------------- permissao
function papel_em($u, $loja) { return isset($u['lojas'][$loja]) ? $u['lojas'][$loja] : null; }
function nivel($u, $loja) { $p = papel_em($u, $loja); return $p ? PAPEIS[$p] : 0; }

// operador: pausa e numeros. gerente: + regras, horario e tempos. dono: + escopo e equipe.
function pode($u, $loja, $o_que) {
    if ($o_que === 'regras' || $o_que === 'instrucoes') return false;
    if ($u['superadmin']) return true;
    $n = nivel($u, $loja);
    switch ($o_que) {
        case 'ver': case 'pausar': case 'numeros': return $n >= 1;
        case 'horario': case 'clientes':            return $n >= 2;
        case 'escopo': case 'equipe':               return $n >= 3;
        case 'integracoes':                         return $n >= 3;
        // Regras, instrucoes e ferramentas: SO VISUALIZACAO (Fabio, 22/11/2026: "nao quero
        // que mude o bot"). Nem o superadmin edita; o bot tambem ignora esses campos.
        case 'regras': case 'instrucoes':           return false;
    }
    return false;
}

// ---------------------------------------------------------------- utilidades
function so_digitos($s) { return preg_replace('/\D/', '', (string)$s); }

// Telefone BR em digitos com DDI. 10-11 digitos ganham o 55 na frente.
function normaliza_numero($s) {
    $d = so_digitos($s);
    if (strlen($d) === 10 || strlen($d) === 11) $d = '55' . $d;
    return (strlen($d) >= 12 && strlen($d) <= 13) ? $d : null;
}

function novo_id() { return bin2hex(random_bytes(6)); }

// "18:30" -> 18.5 ; "24:00" -> 24
function hora_dec($s) {
    if (!preg_match('/^(\d{1,2}):(\d{2})$/', trim((string)$s), $m)) return null;
    $h = (int)$m[1]; $mi = (int)$m[2];
    if ($h > 24 || $mi > 59 || ($h === 24 && $mi > 0)) return null;
    return round($h + $mi / 60, 4);
}

function e($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

// Segredo de integracao (senha do Titan, secret da Saipos, segredo do webhook) nunca vai ao
// navegador: volta como "__definido__" quando existe. So o bot (GET api.php?a=bot) le o valor.
function mascara_segredos($cfg) {
    if (!isset($cfg['integracoes']) || !is_array($cfg['integracoes'])) return $cfg;
    foreach (array(array('titan', 'senha'), array('saipos', 'secret'), array('webhook', 'segredo')) as $s) {
        if (isset($cfg['integracoes'][$s[0]][$s[1]])) $cfg['integracoes'][$s[0]][$s[1]] = $cfg['integracoes'][$s[0]][$s[1]] !== '' ? '__definido__' : '';
    }
    return $cfg;
}
