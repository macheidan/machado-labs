<?php
// /trader/api.php: estado, configuracoes e comandos de cada conta simulada. So com login.
// Conta = (usuario do login Google, ativo de ?ativo=XAUUSD|MNQ), em u/<usuario>/<ativo>/.
// _estado.json sobe da maquina do Fabio (Hub/trader/web.py); config.json e comandos.json sao
// gravados aqui e a maquina busca pela fila (a=fila, com token) a cada 20 s.
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
function ler_json($f, $padrao) {
    if (!is_file($f)) return $padrao;
    $d = json_decode((string)@file_get_contents($f), true);
    return is_array($d) ? $d : $padrao;
}

$method = $_SERVER['REQUEST_METHOD'];
$a = isset($_GET['a']) ? $_GET['a'] : '';

// fila rapida: a maquina do Fabio consulta a cada 20 s com o token (token.dat, negado no .htaccess)
if ($a === 'fila' && $method === 'GET') {
    $tok = (string)@file_get_contents(__DIR__ . '/token.dat');
    $env = isset($_SERVER['HTTP_X_TRADER_TOKEN']) ? (string)$_SERVER['HTTP_X_TRADER_TOKEN'] : '';
    if (strlen($tok) < 32 || !hash_equals(trim($tok), $env)) out(401, array('ok' => false, 'err' => 'token'));
    $contas = array();
    foreach (USUARIOS as $email => $u) {
        foreach (ATIVOS as $at => $_s) {
            $p = __DIR__ . '/u/' . $u . '/' . $at;
            $contas[$u . '/' . $at] = array('config' => ler_json($p . '/config.json', new stdClass()),
                                            'comandos' => ler_json($p . '/comandos.json', array()));
        }
    }
    out(200, array('ok' => true, 'contas' => $contas));
}

$sess = current_session();
if (!$sess) out(401, array('ok' => false, 'err' => 'unauthorized'));
$usuario = $sess['usuario'];
$ativo = ativo_pedido();
$dir = pasta_conta($usuario, $ativo);

// faixa aceita por campo; a maquina valida de novo ao baixar (config.validar)
$CAMPOS = array(
    'META_DIA' => array('n', 10, 5000), 'STOP_DIA' => array('n', -5000, -10),
    'RISCO_POR_TRADE' => array('n', 5, 2000), 'LIMIAR_ENTRADA' => array('n', 0.5, 6),
    'STOP_ATR' => array('n', 0.3, 6), 'ALVO_ATR' => array('n', 0.3, 10),
    'BLOQUEIO_NOTICIA_MIN' => array('i', 0, 240), 'SPREAD' => array('n', 0, 5),
    'SL_TP_MODO' => array('m', array('atr', 'percentual')), 'SL_PCT' => array('n', 0.01, 5),
    'TP_PCT' => array('n', 0.01, 10), 'LOTE_FIXO' => array('n', 0, 50),
    'DIRECAO' => array('m', array('ambas', 'compra', 'venda')),
    'TETO_MES_USD' => array('n', 0, 1000),
    'MODELO_API' => array('m', array('claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5')),
    'USAR_MESA' => array('b'), 'MANCHETES_CLAUDE' => array('b'), 'PAUSADO' => array('b'),
    'TRAVA_PAUSADA' => array('b'),
    'MODELO_MANCHETES' => array('m', array('claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5')),
    'RADAR_ATIVO' => array('b'), 'RADAR_FORCA' => array('n', 0.2, 1), 'RADAR_CONFIRMAR_OPUS' => array('b'),
    'SAIR_ANTES_NOTICIA' => array('b'), 'SAIR_ANTES_MIN' => array('i', 1, 120),
    'MTF_ATIVO' => array('b'), 'MTF_VETO' => array('b'), 'GATILHO_5M' => array('b'),
    'GATILHO_JANELA' => array('i', 1, 6),
);
// o teto da API e o orcamento do Fabio: so ele muda
if ($usuario !== 'fabio') unset($CAMPOS['TETO_MES_USD']);
$COMANDOS = array('mesa_agora', 'fechar_posicao', 'zerar_carteira', 'comprar', 'vender');

// testes de performance (10 versoes x com/sem trava), iguais para todos os usuarios
if ($a === 'testes' && $method === 'GET') {
    $f = __DIR__ . '/testes/' . $ativo . '.json';
    if (!is_file($f)) out(200, array('ok' => true, 'testes' => null));
    header('Content-Type: application/json; charset=utf-8');
    echo '{"ok":true,"arquivo_em":"' . date('c', filemtime($f)) . '","testes":';
    readfile($f);
    echo '}';
    exit;
}

if ($a === 'estado' && $method === 'GET') {
    $f = $dir . '/_estado.json';
    $estado = is_file($f) ? json_decode((string)file_get_contents($f), true) : null;
    out(200, array(
        'ok' => true,
        'usuario' => $usuario, 'ativo' => $ativo, 'ativos' => array_keys(ATIVOS),
        'estado' => $estado,
        'config_salva' => ler_json($dir . '/config.json', new stdClass()),
        'comandos' => ler_json($dir . '/comandos.json', array()),
        'editavel_teto' => $usuario === 'fabio',
        'arquivo_em' => is_file($f) ? date('c', filemtime($f)) : null,
    ));
}

// preco ao vivo do mesmo ativo da simulacao (futuro no Yahoo), com cache de 10 s por ativo
if ($a === 'preco' && $method === 'GET') {
    $cache = __DIR__ . '/u/preco.' . $ativo . '.cache.json';
    $c = ler_json($cache, null);
    if (!$c || !isset($c['lido']) || time() - $c['lido'] >= 10) {
        $url = 'https://query1.finance.yahoo.com/v8/finance/chart/' . rawurlencode(ATIVOS[$ativo]) . '?interval=1m&range=1d';
        $resp = false; $code = 0;
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8,
                CURLOPT_SSL_VERIFYPEER => true, CURLOPT_USERAGENT => 'Mozilla/5.0 (trader-fabio)'));
            $resp = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        }
        $j = $code === 200 ? json_decode((string)$resp, true) : null;
        $m = isset($j['chart']['result'][0]['meta']) ? $j['chart']['result'][0]['meta'] : null;
        if ($m && isset($m['regularMarketPrice'])) {
            $c = array('preco' => (float)$m['regularMarketPrice'], 'ts' => (int)$m['regularMarketTime'], 'lido' => time());
            @mkdir(__DIR__ . '/u', 0755, true);
            @file_put_contents($cache, json_encode($c), LOCK_EX);
        } elseif (!$c) {
            out(502, array('ok' => false, 'err' => 'sem_preco'));
        }
    }
    out(200, array('ok' => true, 'ativo' => $ativo, 'preco' => $c['preco'], 'ts' => $c['ts'], 'idade' => time() - $c['lido']));
}

if ($a === 'config' && $method === 'POST') {
    require_header();
    $raw = file_get_contents('php://input');
    if (strlen($raw) > 8192) out(413, array('ok' => false, 'err' => 'too_big'));
    $d = json_decode($raw, true);
    if (!is_array($d)) out(400, array('ok' => false, 'err' => 'json'));
    $cfg = ler_json($dir . '/config.json', array());
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
    if (@file_put_contents($dir . '/config.json', json_encode($cfg, JSON_PRETTY_PRINT), LOCK_EX) === false)
        out(500, array('ok' => false, 'err' => 'gravar'));
    out(200, array('ok' => true, 'config' => $cfg));
}

if ($a === 'comando' && $method === 'POST') {
    require_header();
    $d = json_decode((string)file_get_contents('php://input'), true);
    $cmd = is_array($d) && isset($d['cmd']) ? (string)$d['cmd'] : '';
    if (!in_array($cmd, $COMANDOS, true)) out(400, array('ok' => false, 'err' => 'comando'));
    $novo = array('id' => bin2hex(random_bytes(8)), 'cmd' => $cmd, 'ts' => date('c'), 'por' => $sess['email']);
    if (($cmd === 'comprar' || $cmd === 'vender') && isset($d['lotes']) && $d['lotes'] !== '' && $d['lotes'] !== null) {
        if (!is_numeric($d['lotes']) || (float)$d['lotes'] < 0.01 || (float)$d['lotes'] > 50) out(422, array('ok' => false, 'err' => 'lotes'));
        $novo['lotes'] = round((float)$d['lotes'], 2);
    }
    $lista = ler_json($dir . '/comandos.json', array());
    $lista[] = $novo;
    $lista = array_slice($lista, -30);
    @file_put_contents($dir . '/comandos.json', json_encode($lista), LOCK_EX);
    out(200, array('ok' => true, 'id' => $novo['id']));
}

out(404, array('ok' => false, 'err' => 'not_found'));
