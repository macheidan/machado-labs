<?php
// /trader/api.php: estado da simulacao, configuracoes e comandos. So com login.
// O estado (_estado.json) sobe da maquina do Fabio (Hub/trader/web.py) a cada 15 min;
// config.json e comandos.json sao gravados aqui e a maquina baixa na rodada seguinte.
define('TRADER', 1);
require __DIR__ . '/lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function out($code, $arr) {
    http_response_code($code);
    echo json_encode($arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function require_header() {
    if (empty($_SERVER['HTTP_X_DASH']) || $_SERVER['HTTP_X_DASH'] !== '1') out(403, array('ok' => false, 'err' => 'csrf'));
}
function ler_json($nome, $padrao) {
    $f = __DIR__ . '/' . $nome;
    if (!is_file($f)) return $padrao;
    $d = json_decode((string)@file_get_contents($f), true);
    return is_array($d) ? $d : $padrao;
}

if (!current_session()) out(401, array('ok' => false, 'err' => 'unauthorized'));

$method = $_SERVER['REQUEST_METHOD'];
$a = isset($_GET['a']) ? $_GET['a'] : '';

// faixa aceita por campo; a maquina valida de novo ao baixar (config.validar)
$CAMPOS = array(
    'META_DIA' => array('n', 10, 5000), 'STOP_DIA' => array('n', -5000, -10),
    'RISCO_POR_TRADE' => array('n', 5, 2000), 'LIMIAR_ENTRADA' => array('n', 0.5, 6),
    'STOP_ATR' => array('n', 0.3, 6), 'ALVO_ATR' => array('n', 0.3, 10),
    'BLOQUEIO_NOTICIA_MIN' => array('i', 0, 240), 'SPREAD' => array('n', 0, 5),
    'TETO_MES_USD' => array('n', 0, 1000),
    'MODELO_API' => array('m', array('claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5')),
    'USAR_MESA' => array('b'), 'MANCHETES_CLAUDE' => array('b'), 'PAUSADO' => array('b'),
);
$COMANDOS = array('mesa_agora', 'fechar_posicao', 'zerar_carteira');

if ($a === 'estado' && $method === 'GET') {
    $f = __DIR__ . '/_estado.json';
    $estado = is_file($f) ? json_decode((string)file_get_contents($f), true) : null;
    out(200, array(
        'ok' => true,
        'estado' => $estado,
        'config_salva' => ler_json('config.json', new stdClass()),
        'comandos' => ler_json('comandos.json', array()),
        'arquivo_em' => is_file($f) ? date('c', filemtime($f)) : null,
    ));
}

if ($a === 'config' && $method === 'POST') {
    require_header();
    $raw = file_get_contents('php://input');
    if (strlen($raw) > 8192) out(413, array('ok' => false, 'err' => 'too_big'));
    $d = json_decode($raw, true);
    if (!is_array($d)) out(400, array('ok' => false, 'err' => 'json'));
    $cfg = ler_json('config.json', array());
    $erros = array();
    foreach ($d as $k => $v) {
        if (!isset($CAMPOS[$k])) continue;
        $r = $CAMPOS[$k];
        if ($r[0] === 'b') { $cfg[$k] = ($v === true || $v === 'true' || $v === 1 || $v === '1'); continue; }
        if ($r[0] === 'm') { if (in_array($v, $r[1], true)) $cfg[$k] = $v; else $erros[] = $k; continue; }
        if (!is_numeric($v)) { $erros[] = $k; continue; }
        $n = $r[0] === 'i' ? (int)$v : (float)$v;
        if ($n < $r[1] || $n > $r[2]) { $erros[] = $k; continue; }
        $cfg[$k] = $n;
    }
    if ($erros) out(422, array('ok' => false, 'err' => 'fora_da_faixa', 'campos' => $erros));
    $cfg['_salvo_em'] = date('c');
    if (@file_put_contents(__DIR__ . '/config.json', json_encode($cfg, JSON_PRETTY_PRINT), LOCK_EX) === false)
        out(500, array('ok' => false, 'err' => 'gravar'));
    out(200, array('ok' => true, 'config' => $cfg));
}

if ($a === 'comando' && $method === 'POST') {
    require_header();
    $d = json_decode((string)file_get_contents('php://input'), true);
    $cmd = is_array($d) && isset($d['cmd']) ? (string)$d['cmd'] : '';
    if (!in_array($cmd, $COMANDOS, true)) out(400, array('ok' => false, 'err' => 'comando'));
    $lista = ler_json('comandos.json', array());
    $lista[] = array('id' => bin2hex(random_bytes(8)), 'cmd' => $cmd, 'ts' => date('c'));
    $lista = array_slice($lista, -30);
    @file_put_contents(__DIR__ . '/comandos.json', json_encode($lista), LOCK_EX);
    out(200, array('ok' => true));
}

out(404, array('ok' => false, 'err' => 'not_found'));
