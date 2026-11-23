<?php
// /whatsbot/api.php: tudo que o painel le e grava, e o canal do bot.
//
// Painel (cookie de sessao + header X-WB em escrita):
//   GET  ?a=estado                      lojas visiveis, config, status do bot, equipe, historico
//   POST ?a=pausa        {loja, ligado, motivo}
//   POST ?a=numero       {loja, id?, numero, nome, tipo, obs}      cria ou edita
//   POST ?a=numero_del   {loja, id}
//   POST ?a=regra        {loja, id?, texto, ativa}
//   POST ?a=regra_del    {loja, id}
//   POST ?a=config       {loja, horario?, horarioCliente?, tempoEntrega?, tempoRetirada?, escopo?, foraDaLista?}
//   POST ?a=usuario      {email, nome, lojas:{loja:papel|""}}
//   POST ?a=usuario_del  {email}
//   POST ?a=loja         {id, nome, telefone, ativo}               so superadmin
//   POST ?a=loja_token   {id}                                      so superadmin; devolve o token UMA vez
//
// Bot (Authorization: Bearer <token da loja>):
//   GET  ?a=bot&loja=dame               config da loja
//   POST ?a=bot_status&loja=dame        status (online, pausa local, conexao...)
define('WB', 1);
require __DIR__ . '/lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['a']) ? $_GET['a'] : '';

function out($code, $arr) {
    http_response_code($code);
    echo json_encode($arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function falha($code, $err) { out($code, array('ok' => false, 'err' => $err)); }

function corpo() {
    $raw = file_get_contents('php://input');
    if (strlen($raw) > 65536) falha(413, 'muito grande');
    $d = json_decode($raw, true);
    return is_array($d) ? $d : array();
}

function txt($d, $k, $max = 200) {
    $v = isset($d[$k]) ? trim((string)$d[$k]) : '';
    return mb_substr(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $v), 0, $max);
}

// config padrao de loja nova: o mais fechado possivel (so os numeros de teste)
function config_padrao() {
    return array(
        'pausa' => array('ligado' => false, 'motivo' => '', 'por' => '', 'em' => ''),
        'escopo' => array('modo' => 'lista', 'de' => 17, 'ate' => 1),
        'foraDaLista' => 'silencio',
        'horario' => array('abre' => 18, 'fecha' => 24),
        'horarioCliente' => null,
        'tempoEntrega' => 'de 40 a 60 minutos',
        'tempoRetirada' => 'de 20 a 30 minutos',
        'numeros' => array(),
        'regras' => array(),
        'atualizadoEm' => date('c'),
    );
}

function &cfg_de(&$db, $loja) {
    if (!isset($db['lojas'][$loja]['config']) || !is_array($db['lojas'][$loja]['config'])) {
        $db['lojas'][$loja]['config'] = config_padrao();
    }
    $c = &$db['lojas'][$loja]['config'];
    foreach (config_padrao() as $k => $v) if (!array_key_exists($k, $c)) $c[$k] = $v;
    return $c;
}

function hhmm($d) { $h = (int)floor($d); $m = (int)round(($d - $h) * 60); return $h . 'h' . ($m ? sprintf('%02d', $m) : ''); }
function descreve_mud($mud) {
    $t = array();
    foreach ($mud as $k => $v) {
        if ($k === 'horario') $t[] = $v ? 'horário ' . hhmm($v['abre']) . '–' . hhmm($v['fecha']) : 'pedido 24 h';
        elseif ($k === 'horarioCliente') $t[] = $v ? 'horário p/ cliente ' . hhmm($v['abre']) . '–' . hhmm($v['fecha']) : 'sem horário p/ cliente';
        elseif ($k === 'tempoEntrega') $t[] = 'entrega ' . $v;
        elseif ($k === 'tempoRetirada') $t[] = 'retirada ' . $v;
        elseif ($k === 'escopo') $t[] = $v['modo'] === 'todos' ? 'atende todo cliente' : ($v['modo'] === 'faixa' ? 'faixa ' . $v['de'] . 'h–' . $v['ate'] . 'h' : 'só números de teste');
        elseif ($k === 'foraDaLista') $t[] = 'fora da faixa: ' . ($v === 'aviso' ? 'avisa' : 'silêncio');
    }
    return implode(' · ', $t);
}

// ======================================================================= BOT
function bot_auth($db, $loja) {
    $h = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION']
       : (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION']) ? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] : '');
    if ($h === '' && isset($_SERVER['HTTP_X_WB_TOKEN'])) $h = 'Bearer ' . $_SERVER['HTTP_X_WB_TOKEN'];
    if (!preg_match('/^Bearer\s+([A-Za-z0-9_-]{20,128})$/', $h, $m)) falha(401, 'sem token');
    $hash = isset($db['lojas'][$loja]['botTokenHash']) ? (string)$db['lojas'][$loja]['botTokenHash'] : '';
    if ($hash === '' || !hash_equals($hash, hash('sha256', $m[1]))) falha(401, 'token invalido');
}

if ($action === 'bot' || $action === 'bot_status') {
    $loja = isset($_GET['loja']) ? preg_replace('/[^a-z0-9_-]/', '', $_GET['loja']) : '';
    $db = db_load();
    if ($loja === '' || !isset($db['lojas'][$loja])) falha(404, 'loja');
    bot_auth($db, $loja);

    if ($action === 'bot' && $method === 'GET') {
        $l = $db['lojas'][$loja];
        $c = isset($l['config']) ? $l['config'] : config_padrao();
        out(200, array('ok' => true, 'loja' => $loja, 'ativo' => !isset($l['ativo']) || $l['ativo'], 'config' => $c, 'agora' => date('c')));
    }
    if ($action === 'bot_status' && $method === 'POST') {
        $st = corpo();
        $st['recebidoEm'] = date('c');
        json_write(data_dir() . '/status-' . $loja . '.json', $st);
        out(200, array('ok' => true));
    }
    falha(405, 'metodo');
}

// ======================================================================= PAINEL
$db = db_load();
$eu = current_user($db);
if (!$eu) falha(401, 'unauthorized');

if ($method === 'POST' && (empty($_SERVER['HTTP_X_WB']) || $_SERVER['HTTP_X_WB'] !== '1')) falha(403, 'csrf');

if ($action === 'estado' && $method === 'GET') {
    $lojas = array();
    foreach ($db['lojas'] as $id => $l) {
        if (!papel_em($eu, $id)) continue;
        $st = json_read(data_dir() . '/status-' . $id . '.json', null);
        $lojas[] = array(
            'id' => $id,
            'nome' => isset($l['nome']) ? $l['nome'] : $id,
            'telefone' => isset($l['telefone']) ? $l['telefone'] : '',
            'ativo' => !isset($l['ativo']) || $l['ativo'],
            'temToken' => !empty($l['botTokenHash']),
            'papel' => papel_em($eu, $id),
            'pode' => array(
                'pausar' => pode($eu, $id, 'pausar'), 'numeros' => pode($eu, $id, 'numeros'),
                'regras' => pode($eu, $id, 'regras'), 'horario' => pode($eu, $id, 'horario'),
                'escopo' => pode($eu, $id, 'escopo'), 'equipe' => pode($eu, $id, 'equipe'),
            ),
            'config' => isset($l['config']) ? $l['config'] : config_padrao(),
            'status' => $st,
        );
    }
    // equipe: quem tem papel em alguma loja que eu administro
    $equipe = array();
    foreach ($db['usuarios'] as $email => $u) {
        $vis = array();
        foreach ((isset($u['lojas']) ? $u['lojas'] : array()) as $lid => $p) {
            if (pode($eu, $lid, 'equipe')) $vis[$lid] = $p;
        }
        if (!$vis && !$eu['superadmin']) continue;
        $equipe[] = array(
            'email' => $email, 'nome' => isset($u['nome']) ? $u['nome'] : '',
            'foto' => isset($u['foto']) ? $u['foto'] : '', 'lojas' => $vis,
            'ultimoAcesso' => isset($u['ultimoAcesso']) ? $u['ultimoAcesso'] : '',
            'superadmin' => $email === SUPERADMIN,
        );
    }
    $log = array();
    foreach ($db['log'] as $r) {
        if ($eu['superadmin'] || ($r['loja'] && papel_em($eu, $r['loja']))) $log[] = $r;
        if (count($log) >= 200) break;
    }
    out(200, array('ok' => true, 'eu' => $eu, 'lojas' => $lojas, 'equipe' => $equipe, 'log' => $log, 'agora' => date('c')));
}

if ($method !== 'POST') falha(404, 'not_found');
$d = corpo();
$loja = isset($d['loja']) ? (string)$d['loja'] : '';

function exige($eu, $db, $loja, $o_que) {
    if ($loja === '' || !isset($db['lojas'][$loja])) falha(404, 'loja');
    if (!pode($eu, $loja, $o_que)) falha(403, 'sem permissao');
}

switch ($action) {

case 'pausa':
    exige($eu, $db, $loja, 'pausar');
    $ligado = !empty($d['ligado']);
    $motivo = txt($d, 'motivo', 200);
    db_tx(function (&$db) use ($eu, $loja, $ligado, $motivo) {
        $c = &cfg_de($db, $loja);
        $c['pausa'] = array('ligado' => $ligado, 'motivo' => $ligado ? $motivo : '', 'por' => $eu['email'], 'em' => date('c'));
        $c['atualizadoEm'] = date('c');
        db_log($db, $eu['email'], $loja, $ligado ? 'pausou o bot' : 'religou o bot', $motivo);
    });
    out(200, array('ok' => true));

case 'numero':
    exige($eu, $db, $loja, 'numeros');
    $num = normaliza_numero(isset($d['numero']) ? $d['numero'] : '');
    if (!$num) falha(400, 'Número inválido. Use DDD + número, ex.: 51 99999-9999.');
    $tipo = isset($d['tipo']) ? (string)$d['tipo'] : '';
    if (!in_array($tipo, array('bloqueado', 'teste', 'sem_teto'), true)) falha(400, 'tipo');
    $id = isset($d['id']) ? preg_replace('/[^a-f0-9]/', '', (string)$d['id']) : '';
    $reg = array('numero' => $num, 'nome' => txt($d, 'nome', 80), 'tipo' => $tipo, 'obs' => txt($d, 'obs', 200));
    $r = db_tx(function (&$db) use ($eu, $loja, $id, $reg) {
        $c = &cfg_de($db, $loja);
        foreach ($c['numeros'] as $n) {
            if ($n['id'] !== $id && $n['tipo'] === $reg['tipo'] && substr($n['numero'], -8) === substr($reg['numero'], -8)) return 'dup';
        }
        $achou = false;
        foreach ($c['numeros'] as &$n) {
            if ($id !== '' && $n['id'] === $id) { $n = array_merge($n, $reg, array('editadoPor' => $eu['email'], 'editadoEm' => date('c'))); $achou = true; }
        }
        unset($n);
        if (!$achou) $c['numeros'][] = array_merge(array('id' => novo_id()), $reg, array('por' => $eu['email'], 'em' => date('c')));
        $c['atualizadoEm'] = date('c');
        db_log($db, $eu['email'], $loja, ($achou ? 'editou número ' : 'adicionou número ') . $reg['tipo'], $reg['numero'] . ($reg['nome'] ? ' (' . $reg['nome'] . ')' : ''));
        return 'ok';
    });
    if ($r === 'dup') falha(409, 'Esse número já está nessa lista.');
    out(200, array('ok' => true));

case 'numero_del':
    exige($eu, $db, $loja, 'numeros');
    $id = isset($d['id']) ? (string)$d['id'] : '';
    db_tx(function (&$db) use ($eu, $loja, $id) {
        $c = &cfg_de($db, $loja);
        foreach ($c['numeros'] as $i => $n) if ($n['id'] === $id) {
            db_log($db, $eu['email'], $loja, 'removeu número ' . $n['tipo'], $n['numero'] . ($n['nome'] ? ' (' . $n['nome'] . ')' : ''));
            array_splice($c['numeros'], $i, 1);
            break;
        }
        $c['atualizadoEm'] = date('c');
    });
    out(200, array('ok' => true));

case 'regra':
    exige($eu, $db, $loja, 'regras');
    $texto = txt($d, 'texto', 400);
    if (mb_strlen($texto) < 5) falha(400, 'Escreva a regra.');
    $ativa = !empty($d['ativa']);
    $id = isset($d['id']) ? preg_replace('/[^a-f0-9]/', '', (string)$d['id']) : '';
    $r = db_tx(function (&$db) use ($eu, $loja, $id, $texto, $ativa) {
        $c = &cfg_de($db, $loja);
        // teto do que vai ao prompt: regra demais dilui as regras da casa
        $total = 0;
        foreach ($c['regras'] as $g) if ($g['ativa'] && $g['id'] !== $id) $total += mb_strlen($g['texto']);
        if ($ativa && $total + mb_strlen($texto) > 1500) return 'teto';
        $achou = false;
        foreach ($c['regras'] as &$g) {
            if ($id !== '' && $g['id'] === $id) { $g['texto'] = $texto; $g['ativa'] = $ativa; $g['editadoPor'] = $eu['email']; $g['editadoEm'] = date('c'); $achou = true; }
        }
        unset($g);
        if (!$achou) $c['regras'][] = array('id' => novo_id(), 'texto' => $texto, 'ativa' => $ativa, 'por' => $eu['email'], 'em' => date('c'));
        $c['atualizadoEm'] = date('c');
        db_log($db, $eu['email'], $loja, ($achou ? 'editou regra' : 'criou regra') . ($ativa ? ' (ativa)' : ' (rascunho)'), $texto);
        return 'ok';
    });
    if ($r === 'teto') falha(409, 'As regras ativas passam de 1.500 caracteres. Desative ou encurte alguma.');
    out(200, array('ok' => true));

case 'regra_del':
    exige($eu, $db, $loja, 'regras');
    $id = isset($d['id']) ? (string)$d['id'] : '';
    db_tx(function (&$db) use ($eu, $loja, $id) {
        $c = &cfg_de($db, $loja);
        foreach ($c['regras'] as $i => $g) if ($g['id'] === $id) {
            db_log($db, $eu['email'], $loja, 'apagou regra', $g['texto']);
            array_splice($c['regras'], $i, 1);
            break;
        }
        $c['atualizadoEm'] = date('c');
    });
    out(200, array('ok' => true));

case 'config':
    if ($loja === '' || !isset($db['lojas'][$loja])) falha(404, 'loja');
    $mud = array();
    if (array_key_exists('horario', $d) || array_key_exists('horarioCliente', $d) || isset($d['tempoEntrega']) || isset($d['tempoRetirada'])) {
        exige($eu, $db, $loja, 'horario');
        foreach (array('horario', 'horarioCliente') as $k) {
            if (!array_key_exists($k, $d)) continue;
            if ($d[$k] === null) { $mud[$k] = null; continue; }
            $a = hora_dec(isset($d[$k]['abre']) ? $d[$k]['abre'] : '');
            $f = hora_dec(isset($d[$k]['fecha']) ? $d[$k]['fecha'] : '');
            if ($a === null || $f === null || $f <= $a) falha(400, 'Horário inválido: o fechamento tem que ser depois da abertura (até 24:00).');
            $mud[$k] = array('abre' => $a, 'fecha' => $f);
        }
        foreach (array('tempoEntrega', 'tempoRetirada') as $k) {
            if (!isset($d[$k])) continue;
            $v = txt($d, $k, 60);
            if (mb_strlen($v) < 3) falha(400, 'Tempo vazio.');
            $mud[$k] = $v;
        }
    }
    if (isset($d['escopo']) || isset($d['foraDaLista'])) {
        exige($eu, $db, $loja, 'escopo');
        if (isset($d['escopo'])) {
            $m = isset($d['escopo']['modo']) ? (string)$d['escopo']['modo'] : '';
            if (!in_array($m, array('todos', 'faixa', 'lista'), true)) falha(400, 'escopo');
            $de = (int)(isset($d['escopo']['de']) ? $d['escopo']['de'] : 17);
            $ate = (int)(isset($d['escopo']['ate']) ? $d['escopo']['ate'] : 1);
            if ($de < 0 || $de > 23 || $ate < 0 || $ate > 23 || $de === $ate) falha(400, 'Faixa inválida.');
            $mud['escopo'] = array('modo' => $m, 'de' => $de, 'ate' => $ate);
        }
        if (isset($d['foraDaLista'])) {
            if (!in_array($d['foraDaLista'], array('silencio', 'aviso'), true)) falha(400, 'foraDaLista');
            $mud['foraDaLista'] = $d['foraDaLista'];
        }
    }
    if (!$mud) falha(400, 'nada para mudar');
    db_tx(function (&$db) use ($eu, $loja, $mud) {
        $c = &cfg_de($db, $loja);
        foreach ($mud as $k => $v) $c[$k] = $v;
        $c['atualizadoEm'] = date('c');
        db_log($db, $eu['email'], $loja, 'mudou o funcionamento', descreve_mud($mud));
    });
    out(200, array('ok' => true));

case 'usuario':
    $email = strtolower(txt($d, 'email', 120));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) falha(400, 'E-mail inválido.');
    if ($email === SUPERADMIN) falha(400, 'Esse é o administrador geral.');
    if ($email === $eu['email']) falha(400, 'Você não pode mudar o próprio acesso.');
    $pedido = isset($d['lojas']) && is_array($d['lojas']) ? $d['lojas'] : array();
    foreach ($pedido as $lid => $p) {
        if (!isset($db['lojas'][$lid])) falha(404, 'loja');
        if (!pode($eu, $lid, 'equipe')) falha(403, 'sem permissao em ' . $lid);
        if ($p !== '' && !array_key_exists($p, PAPEIS)) falha(400, 'papel');
        // so o superadmin cria outro dono
        if ($p === 'dono' && !$eu['superadmin']) falha(403, 'Só o administrador geral define donos.');
    }
    $nome = txt($d, 'nome', 80);
    db_tx(function (&$db) use ($eu, $email, $nome, $pedido) {
        $u = isset($db['usuarios'][$email]) ? $db['usuarios'][$email] : array('lojas' => array(), 'criadoPor' => $eu['email'], 'criadoEm' => date('c'));
        if ($nome !== '') $u['nome'] = $nome;
        foreach ($pedido as $lid => $p) {
            $antes = isset($u['lojas'][$lid]) ? $u['lojas'][$lid] : '';
            if ($antes === 'dono' && !$eu['superadmin']) continue; // gerente/dono nao rebaixa dono
            if ($p === '') unset($u['lojas'][$lid]); else $u['lojas'][$lid] = $p;
            if ($antes !== $p) db_log($db, $eu['email'], $lid, $p === '' ? 'tirou acesso' : 'deu acesso ' . $p, $email);
        }
        $u['ativo'] = true;
        $db['usuarios'][$email] = $u;
    });
    out(200, array('ok' => true));

case 'usuario_del':
    $email = strtolower(txt($d, 'email', 120));
    if (!isset($db['usuarios'][$email]) || $email === SUPERADMIN || $email === $eu['email']) falha(400, 'usuario');
    // so tira as lojas que eu administro; se nao sobrar nenhuma, a pessoa sai
    db_tx(function (&$db) use ($eu, $email) {
        $u = $db['usuarios'][$email];
        foreach (array_keys(isset($u['lojas']) ? $u['lojas'] : array()) as $lid) {
            if (pode($eu, $lid, 'equipe') && ($u['lojas'][$lid] !== 'dono' || $eu['superadmin'])) {
                unset($u['lojas'][$lid]);
                db_log($db, $eu['email'], $lid, 'tirou acesso', $email);
            }
        }
        if (empty($u['lojas'])) unset($db['usuarios'][$email]); else $db['usuarios'][$email] = $u;
    });
    out(200, array('ok' => true));

case 'loja':
    if (!$eu['superadmin']) falha(403, 'sem permissao');
    $id = strtolower(preg_replace('/[^a-zA-Z0-9_-]/', '', isset($d['id']) ? (string)$d['id'] : ''));
    if (strlen($id) < 2 || strlen($id) > 30) falha(400, 'Identificador: 2 a 30 letras/números, sem espaço.');
    $nome = txt($d, 'nome', 80);
    if ($nome === '') falha(400, 'Nome vazio.');
    $tel = txt($d, 'telefone', 30);
    $ativo = !array_key_exists('ativo', $d) || !empty($d['ativo']);
    db_tx(function (&$db) use ($eu, $id, $nome, $tel, $ativo) {
        $nova = !isset($db['lojas'][$id]);
        if ($nova) $db['lojas'][$id] = array('criadoEm' => date('c'), 'config' => config_padrao());
        $db['lojas'][$id]['nome'] = $nome;
        $db['lojas'][$id]['telefone'] = $tel;
        $db['lojas'][$id]['ativo'] = $ativo;
        db_log($db, $eu['email'], $id, $nova ? 'criou a loja' : 'editou a loja', $nome);
    });
    out(200, array('ok' => true));

case 'loja_token':
    if (!$eu['superadmin']) falha(403, 'sem permissao');
    $id = isset($d['id']) ? (string)$d['id'] : '';
    if (!isset($db['lojas'][$id])) falha(404, 'loja');
    $tok = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    db_tx(function (&$db) use ($eu, $id, $tok) {
        $db['lojas'][$id]['botTokenHash'] = hash('sha256', $tok);
        db_log($db, $eu['email'], $id, 'gerou token novo do bot', '');
    });
    out(200, array('ok' => true, 'token' => $tok));
}

falha(404, 'not_found');
