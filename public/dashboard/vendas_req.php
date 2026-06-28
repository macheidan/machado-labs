<?php
// Vendas sob demanda: fila de "pedido de atualização" PC/mobile <-> watcher local.
// O dashboard (botão atualizar vendas, 18h-24h) faz POST {act:"req"} pra enfileirar.
// O watcher na máquina do Fábio lê via GET, coleta o Saipos do dia, e marca
// POST {act:"done"} quando termina. Protegido pela mesma basic auth (.htaccess).
//
//   GET                       -> {"req":<ts>,"done":<ts>,"msg":"","at":"<iso>"}
//   POST {"act":"req"}        -> registra pedido  (req = agora)
//   POST {"act":"done","msg"} -> registra término (done = agora)

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$file = __DIR__ . '/vendas_req.json';

function estado($file) {
    $s = array('req' => 0, 'done' => 0, 'msg' => '', 'at' => '');
    if (is_file($file)) {
        $j = json_decode((string)file_get_contents($file), true);
        if (is_array($j)) $s = array_merge($s, $j);
    }
    return $s;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    echo json_encode(estado($file), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $d = json_decode($raw, true);
    if (!is_array($d)) $d = array();
    $act = isset($d['act']) ? $d['act'] : 'req';

    $s = estado($file);          // read-modify-write: preserva o outro campo
    $now = time();
    if ($act === 'done') {
        $s['done'] = $now;
        $s['msg']  = isset($d['msg']) ? mb_substr((string)$d['msg'], 0, 200) : '';
        $s['at']   = date('c');
    } else {                     // 'req'
        $s['req'] = $now;
    }

    $ok = @file_put_contents($file, json_encode($s, JSON_UNESCAPED_UNICODE), LOCK_EX);
    if ($ok === false) {
        http_response_code(500);
        echo '{"ok":false,"err":"write_failed"}';
        exit;
    }
    echo json_encode($s, JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo '{"ok":false,"err":"method"}';
