<?php
// Foco: armazenamento simples (lista de tarefas/lembretes) compartilhado PC/mobile.
// GET  -> devolve foco.json ({"items":[...]})
// POST -> grava o corpo JSON ({"items":[...]}) em foco.json
// Protegido pela mesma basic auth (.htaccess) da pasta /dashboard.

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$file = __DIR__ . '/foco.json';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if (is_file($file)) {
        readfile($file);
    } else {
        echo '{"items":[]}';
    }
    exit;
}

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    if (strlen($raw) > 200000) {
        http_response_code(413);
        echo '{"ok":false,"err":"too_big"}';
        exit;
    }
    $d = json_decode($raw, true);
    if (!is_array($d) || !isset($d['items']) || !is_array($d['items'])) {
        http_response_code(400);
        echo '{"ok":false,"err":"bad_payload"}';
        exit;
    }
    $items = array();
    foreach ($d['items'] as $it) {
        if (!is_array($it)) continue;
        $items[] = array(
            'id'   => isset($it['id'])   ? substr((string)$it['id'], 0, 40)        : uniqid('f', true),
            'text' => isset($it['text']) ? mb_substr((string)$it['text'], 0, 500)  : '',
            'arch' => !empty($it['arch']),
            'ts'   => isset($it['ts'])   ? (int)$it['ts']                          : 0,
        );
    }
    $out = json_encode(array('items' => $items, 'updated' => date('c')), JSON_UNESCAPED_UNICODE);
    $ok = @file_put_contents($file, $out, LOCK_EX);
    if ($ok === false) {
        http_response_code(500);
        echo '{"ok":false,"err":"write_failed"}';
        exit;
    }
    echo '{"ok":true}';
    exit;
}

http_response_code(405);
echo '{"ok":false,"err":"method"}';
