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
//
// Izza Impressora (programa do Windows): ver impressao.php (imp_parear, imp_poll, imp_resultado).
define('WB', 1);
require __DIR__ . '/lib.php';
require __DIR__ . '/impressao.php';

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
        'instrucoes' => array(),   // campo -> {texto, baseHash, por, em}; ausente = padrao do codigo
        'ferramentas' => array(),  // nome -> {descricao, baseHash, por, em}
        'historicoInstrucoes' => array(),
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

if ($action === 'imp_parear' || $action === 'imp_poll' || $action === 'imp_resultado') imp_rotas_programa($action, $method);

// Eventos da Saipos (webhook da Order API, 24/11/2026): a Saipos chama este endereco quando o
// pedido que a Izza mandou muda de status la: CONFIRMED, READY_TO_DELIVER, DISPATCHED,
// CONCLUDED, CANCELLED. Cancelar e sempre na Saipos (Fábio, 24/11) e a Saipos informa o painel:
// o pedido vira "Cancelado na Saipos", o card vai para Concluidos e acende o alerta. Pronto/saiu
// move o card para "Saiu / pronto", e o bot avisa quem pediu. O endereco leva a chave `k`
// (Integracoes > Saipos mostra); a Saipos so manda { event, cod_store, order_id }.
function saipos_chave() {
    $arq = data_dir() . '/saipos-webhook.key';
    $k = is_file($arq) ? trim((string)file_get_contents($arq)) : '';
    if ($k === '') { $k = bin2hex(random_bytes(20)); file_put_contents($arq, $k); }
    return $k;
}
if ($action === 'saipos_webhook') {
    if ($method !== 'POST') falha(405, 'metodo');
    $k = isset($_GET['k']) ? (string)$_GET['k'] : '';
    if ($k === '' || !hash_equals(saipos_chave(), $k)) falha(401, 'chave');
    $p = corpo();
    $ev = strtoupper(trim((string)(isset($p['event']) ? $p['event'] : '')));
    $cod = trim((string)(isset($p['cod_store']) ? $p['cod_store'] : ''));
    $oid = trim((string)(isset($p['order_id']) ? $p['order_id'] : ''));
    $log = data_dir() . '/saipos-webhook.json';
    $l = json_read($log, array());
    $l[] = array('em' => date('c'), 'event' => $ev, 'cod_store' => $cod, 'order_id' => $oid);
    json_write($log, array_slice($l, -500));
    if ($ev === '' || $oid === '') out(200, array('ok' => false, 'erro' => 'evento ou order_id vazio'));
    $db = db_load();
    $loja = '';
    foreach ($db['lojas'] as $id => $lj) {
        $c = isset($lj['config']['integracoes']['saipos']['codStore']) ? trim((string)$lj['config']['integracoes']['saipos']['codStore']) : '';
        if ($c !== '' && $c === $cod) { $loja = $id; break; }
    }
    if ($loja === '') out(200, array('ok' => false, 'erro' => 'cod_store sem loja no painel'));
    // o pedido: pelo order_id que o bot gravou ao lancar
    $parq = data_dir() . '/pedidos-' . $loja . '.json';
    $lk = fopen($parq . '.lock', 'c'); flock($lk, LOCK_EX);
    $ps = json_read($parq, array());
    $ped = null;
    for ($i = count($ps) - 1; $i >= 0; $i--) {
        if (is_array($ps[$i]) && isset($ps[$i]['saipos']['order_id']) && (string)$ps[$i]['saipos']['order_id'] === $oid) { $ped = &$ps[$i]; break; }
    }
    if ($ped !== null) {
        $ped['saipos']['status'] = $ev;
        $ped['saipos']['statusEm'] = date('c');
        if ($ev === 'CANCELLED') { $ped['status'] = 'cancelado'; $ped['canceladoEm'] = date('c'); }
        json_write($parq, $ps);
    }
    flock($lk, LOCK_UN); fclose($lk);
    if ($ped === null) out(200, array('ok' => false, 'erro' => 'pedido nao encontrado'));
    $pid = (string)$ped['id'];
    // coluna do Quadro
    $col = array('CONFIRMED' => 'preparo', 'READY_TO_DELIVER' => 'saiu', 'DISPATCHED' => 'saiu', 'CONCLUDED' => 'concluido', 'CANCELLED' => 'concluido');
    if (isset($col[$ev])) {
        $qarq = data_dir() . '/quadro-' . $loja . '.json';
        $lk = fopen($qarq . '.lock', 'c'); flock($lk, LOCK_EX);
        $q = json_read($qarq, array());
        $ordem = array('novo' => 0, 'preparo' => 1, 'saiu' => 2, 'concluido' => 3);
        $agora = isset($q[$pid]['col']) ? $q[$pid]['col'] : 'novo';
        // so anda para a frente (a loja pode ja ter movido no painel)
        if ($ordem[$col[$ev]] > (isset($ordem[$agora]) ? $ordem[$agora] : 0)) {
            unset($q[$pid]);
            $q[$pid] = array('col' => $col[$ev], 'por' => 'saipos', 'em' => date('c'));
            if (count($q) > 500) $q = array_slice($q, -500, null, true);
            json_write($qarq, $q);
        }
        flock($lk, LOCK_UN); fclose($lk);
    }
    // evento para o bot (bot_eventos) e alerta do cancelamento
    $earq = data_dir() . '/saipos-eventos-' . $loja . '.json';
    $lk = fopen($earq . '.lock', 'c'); flock($lk, LOCK_EX);
    $es = json_read($earq, array());
    $es[] = array('id' => 'se-' . novo_id(), 'event' => $ev, 'order_id' => $oid, 'pedido' => $pid, 'codigo' => isset($ped['codigo']) ? $ped['codigo'] : null, 'em' => date('c'), 'visto' => false);
    json_write($earq, array_slice($es, -500));
    flock($lk, LOCK_UN); fclose($lk);
    if ($ev === 'CANCELLED') {
        $aarq = data_dir() . '/alertas-' . $loja . '.json';
        $lk = fopen($aarq . '.lock', 'c'); flock($lk, LOCK_EX);
        $al = json_read($aarq, array());
        $al[] = array('id' => 'cancel-' . $oid, 'tipo' => 'cancelado', 'nivel' => 'urgente', 'marca' => $loja,
            'titulo' => 'Pedido cancelado na Saipos',
            'texto' => 'Pedido nº ' . (isset($ped['codigo']) ? $ped['codigo'] : '?') . (isset($ped['total']) ? ' · R$ ' . number_format((float)$ped['total'], 2, ',', '.') : '') . ': cancelado na Saipos.',
            'nome' => isset($ped['nome']) ? $ped['nome'] : '', 'telefone' => isset($ped['telefone']) ? $ped['telefone'] : '',
            'codigo' => isset($ped['codigo']) ? $ped['codigo'] : null, 'pedido' => $pid, 'em' => date('c'), 'recebidoEm' => date('c'));
        json_write($aarq, array_slice($al, -1000));
        flock($lk, LOCK_UN); fclose($lk);
    }
    out(200, array('ok' => true));
}

if ($action === 'bot' || $action === 'bot_status' || $action === 'bot_padroes' || $action === 'bot_pedidos' || $action === 'bot_clientes' || $action === 'bot_alertas' || $action === 'bot_eventos' || $action === 'bot_clientes_base') {
    $loja = isset($_GET['loja']) ? preg_replace('/[^a-z0-9_-]/', '', $_GET['loja']) : '';
    $db = db_load();
    if ($loja === '' || !isset($db['lojas'][$loja])) falha(404, 'loja');
    bot_auth($db, $loja);

    if ($action === 'bot' && $method === 'GET') {
        $l = $db['lojas'][$loja];
        $c = isset($l['config']) ? $l['config'] : config_padrao();
        out(200, array('ok' => true, 'loja' => $loja, 'ativo' => !isset($l['ativo']) || $l['ativo'], 'config' => $c, 'agora' => date('c')));
    }
    // textos padrao do codigo (instrucoes e ferramentas): o bot manda quando mudam
    if ($action === 'bot_padroes' && $method === 'POST') {
        $p = corpo();
        $p['recebidoEm'] = date('c');
        json_write(data_dir() . '/padroes-' . $loja . '.json', $p);
        out(200, array('ok' => true));
    }
    // pedidos do WhatsApp (historico.js do bot): upsert por id, guarda os 5000 mais novos
    if ($action === 'bot_pedidos' && $method === 'POST') {
        $p = corpo();
        $novos = isset($p['pedidos']) && is_array($p['pedidos']) ? $p['pedidos'] : array();
        $arq = data_dir() . '/pedidos-' . $loja . '.json';
        $lk = fopen($arq . '.lock', 'c'); flock($lk, LOCK_EX);
        $todos = json_read($arq, array());
        $idx = array();
        // Imprime sozinho (Izza Impressora) quando o pedido ENTRA: status lancado, com comanda e
        // sem imprimir:false (o Titan e a Saipos imprimem a deles). Antes de 24/11 imprimia na
        // chegada, o que com a aprovacao pelo painel tiraria comanda de pedido ainda nao aprovado.
        $chegaram = array();
        // pedido que o admin excluiu (pedido_excluir) nao volta quando o bot reenvia o historico
        $fora = array_flip(json_read(data_dir() . '/pedidos-excluidos-' . $loja . '.json', array()));
        foreach ($todos as $i => $x) if (isset($x['id'])) $idx[$x['id']] = $i;
        foreach ($novos as $x) {
            if (!is_array($x) || empty($x['id'])) continue;
            $x['id'] = substr((string)$x['id'], 0, 80);
            if (isset($fora[$x['id']])) continue;
            $velho = isset($idx[$x['id']]) ? $todos[$idx[$x['id']]] : null;
            if ($velho && !empty($velho['impressoAuto'])) $x['impressoAuto'] = $velho['impressoAuto'];
            // o cancelamento veio da Saipos direto ao painel: o bot ainda pode mandar a versao de antes
            if ($velho && isset($velho['status']) && $velho['status'] === 'cancelado' && (!isset($x['status']) || $x['status'] !== 'cancelado')) {
                $x['status'] = 'cancelado';
                if (isset($velho['canceladoEm'])) $x['canceladoEm'] = $velho['canceladoEm'];
                if (isset($velho['saipos'])) $x['saipos'] = array_merge(isset($x['saipos']) && is_array($x['saipos']) ? $x['saipos'] : array(), $velho['saipos']);
            }
            $entra = isset($x['status']) && $x['status'] === 'lancado' && !empty($x['comanda'])
                && !(isset($x['imprimir']) && $x['imprimir'] === false) && empty($x['impressoAuto']);
            if ($entra) { $x['impressoAuto'] = date('c'); $chegaram[] = $x; }
            if ($velho) $todos[$idx[$x['id']]] = $x; else { $idx[$x['id']] = count($todos); $todos[] = $x; }
        }
        usort($todos, function ($a, $b) { return strcmp(isset($a['em']) ? $a['em'] : '', isset($b['em']) ? $b['em'] : ''); });
        if (count($todos) > 5000) $todos = array_slice($todos, -5000);
        json_write($arq, $todos);
        flock($lk, LOCK_UN); fclose($lk);
        if ($chegaram) imp_auto($db, $loja, $chegaram);
        out(200, array('ok' => true, 'total' => count($todos)));
    }
    // alertas da tela da loja (monitor do bot): upsert por id; o mesmo id volta com resolvido=true
    if ($action === 'bot_alertas' && $method === 'POST') {
        $p = corpo();
        $novos = isset($p['alertas']) && is_array($p['alertas']) ? $p['alertas'] : array();
        $arq = data_dir() . '/alertas-' . $loja . '.json';
        $lk = fopen($arq . '.lock', 'c'); flock($lk, LOCK_EX);
        $todos = json_read($arq, array());
        $idx = array();
        foreach ($todos as $i => $x) if (isset($x['id'])) $idx[$x['id']] = $i;
        $campos = array_flip(array('id', 'tipo', 'nivel', 'titulo', 'texto', 'nome', 'telefone', 'codigo', 'em', 'resolvido', 'resolvidoPor', 'marca', 'fala', 'resumo', 'pedido'));
        foreach ($novos as $x) {
            if (!is_array($x) || empty($x['id'])) continue;
            $x = array_intersect_key($x, $campos);
            $x['id'] = substr((string)$x['id'], 0, 80);
            foreach (array('titulo', 'texto', 'nome', 'fala', 'resumo') as $k) if (isset($x[$k])) $x[$k] = mb_substr((string)$x[$k], 0, 500);
            if (isset($idx[$x['id']])) {
                $i = $idx[$x['id']];
                if (!empty($todos[$i]['resolvido']) && empty($x['resolvido'])) unset($x['resolvido']);
                $todos[$i] = array_merge($todos[$i], $x);
                if (!empty($x['resolvido']) && empty($todos[$i]['resolvidoEm'])) $todos[$i]['resolvidoEm'] = date('c');
            } elseif (!empty($x['tipo'])) {
                $x['recebidoEm'] = date('c');
                $idx[$x['id']] = count($todos);
                $todos[] = $x;
            }
        }
        if (count($todos) > 1000) $todos = array_slice($todos, -1000);
        json_write($arq, $todos);
        flock($lk, LOCK_UN); fclose($lk);
        out(200, array('ok' => true));
    }
    // Eventos para o bot (24/11/2026): aprovar/recusar decididos no painel e a coluna de cada
    // pedido no Quadro ("Saiu / pronto" avisa o cliente). O bot pergunta a cada 4 s (GET) e
    // devolve o resultado de cada decisao (POST feitas).
    if ($action === 'bot_eventos') {
        $arq = data_dir() . '/decisoes-' . $loja . '.json';
        if ($method === 'GET') {
            $ds = json_read($arq, array());
            $pend = array_values(array_filter($ds, function ($x) { return is_array($x) && isset($x['estado']) && $x['estado'] === 'pendente'; }));
            $q = json_read(data_dir() . '/quadro-' . $loja . '.json', array());
            $corte = time() - 12 * 3600;
            $q = array_filter($q, function ($x) use ($corte) { return is_array($x) && isset($x['em']) && strtotime($x['em']) > $corte; });
            $se = array_values(array_filter(json_read(data_dir() . '/saipos-eventos-' . $loja . '.json', array()), function ($x) { return is_array($x) && empty($x['visto']); }));
            out(200, array('ok' => true, 'decisoes' => $pend, 'quadro' => (object)$q, 'saipos' => $se));
        }
        if ($method === 'POST') {
            $p = corpo();
            $vistos = isset($p['saiposVistos']) && is_array($p['saiposVistos']) ? array_flip(array_map('strval', $p['saiposVistos'])) : array();
            if ($vistos) {
                $earq = data_dir() . '/saipos-eventos-' . $loja . '.json';
                $lk2 = fopen($earq . '.lock', 'c'); flock($lk2, LOCK_EX);
                $es = json_read($earq, array());
                foreach ($es as &$e) if (isset($e['id']) && isset($vistos[$e['id']])) $e['visto'] = true;
                unset($e);
                json_write($earq, $es);
                flock($lk2, LOCK_UN); fclose($lk2);
            }
            $feitas = array();
            foreach ((isset($p['feitas']) && is_array($p['feitas']) ? $p['feitas'] : array()) as $f) if (is_array($f) && !empty($f['id'])) $feitas[(string)$f['id']] = $f;
            $lk = fopen($arq . '.lock', 'c'); flock($lk, LOCK_EX);
            $ds = json_read($arq, array());
            foreach ($ds as &$x) {
                if (!isset($x['id']) || !isset($feitas[$x['id']]) || $x['estado'] !== 'pendente') continue;
                $f = $feitas[$x['id']];
                $x['estado'] = !empty($f['ok']) ? 'feita' : 'falhou';
                $x['erro'] = !empty($f['ok']) ? null : mb_substr((string)(isset($f['erro']) ? $f['erro'] : 'falhou'), 0, 300);
                if (!empty($f['codigo'])) $x['codigo'] = substr((string)$f['codigo'], 0, 30);
                $x['feitaEm'] = date('c');
            }
            unset($x);
            json_write($arq, $ds);
            flock($lk, LOCK_UN); fclose($lk);
            out(200, array('ok' => true));
        }
    }
    // Base de clientes que a loja importou no painel (planilha): o bot pergunta com a versao que
    // ja tem e so recebe a lista quando mudou.
    if ($action === 'bot_clientes_base' && $method === 'GET') {
        $b = json_read(data_dir() . '/clientes-base-' . $loja . '.json', null);
        if (!$b) out(200, array('ok' => true, 'versao' => null, 'clientes' => array()));
        if (isset($_GET['v']) && (string)$_GET['v'] === (string)$b['versao']) out(200, array('ok' => true, 'versao' => $b['versao'], 'mesma' => true));
        out(200, array('ok' => true, 'versao' => $b['versao'], 'clientes' => $b['clientes']));
    }
    // clientes que ja pediram pelo WhatsApp, com o cadastro da base da loja: substitui a lista
    if ($action === 'bot_clientes' && $method === 'POST') {
        $p = corpo();
        $cl = isset($p['clientes']) && is_array($p['clientes']) ? $p['clientes'] : array();
        json_write(data_dir() . '/clientes-' . $loja . '.json', array('clientes' => $cl, 'recebidoEm' => date('c')));
        out(200, array('ok' => true, 'total' => count($cl)));
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

// impressoras e fila de impressao (impressao.php)
if (in_array($action, array('impressao', 'imp_codigo', 'imp_remover', 'imp_config', 'imprimir'), true)) imp_rotas_painel($action, $method, $eu, $db);

if ($action === 'estado' && $method === 'GET') {
    $lojas = array();
    foreach ($db['lojas'] as $id => $l) {
        if (!papel_em($eu, $id)) continue;
        $st = json_read(data_dir() . '/status-' . $id . '.json', null);
        $pad = pode($eu, $id, 'ver') ? json_read(data_dir() . '/padroes-' . $id . '.json', null) : null;
        $cfg = isset($l['config']) ? $l['config'] : config_padrao();
        $cfg = mascara_segredos($cfg);
        // o prompt (instrucoes e ferramentas) e do produto: so o administrador geral ve
        if (!$eu['superadmin']) {
            if (is_array($pad)) unset($pad['instrucoes'], $pad['ferramentas']);
            unset($cfg['instrucoes'], $cfg['ferramentas']);
        }
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
                'instrucoes' => pode($eu, $id, 'instrucoes'), 'clientes' => pode($eu, $id, 'clientes'),
                'integracoes' => pode($eu, $id, 'integracoes'),
            ),
            'config' => $cfg,
            'status' => $st,
            'padroes' => $pad,
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

// Bairros de uma cidade (ficha: entrega por bairro). Vem do OpenStreetMap (limites
// administrativos; se a cidade nao tiver, os lugares marcados como bairro) e fica em
// cache 90 dias em data/bairros-<cidade>-<uf>.json.
if ($action === 'bairros' && $method === 'GET') {
    $cid = trim(isset($_GET['cidade']) ? (string)$_GET['cidade'] : '');
    $uf = strtoupper(preg_replace('/[^A-Za-z]/', '', isset($_GET['uf']) ? (string)$_GET['uf'] : ''));
    if ($cid === '' || strlen($uf) !== 2) falha(400, 'Preencha a cidade e a UF (ex.: Porto Alegre / RS).');
    if (!preg_match('/^[\p{L} \'.-]{2,60}$/u', $cid)) falha(400, 'Nome de cidade inválido.');
    $plano = function_exists('iconv') ? @iconv('UTF-8', 'ASCII//TRANSLIT', $cid) : $cid;
    $slug = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower((string)$plano)), '-') . '-' . strtolower($uf);
    $arq = data_dir() . '/bairros-' . $slug . '.json';
    // lista que vem junto do painel (bairros/), para nao depender do servico de mapas
    $fixo = json_read(__DIR__ . '/bairros/' . $slug . '.json', null);
    if ($fixo) out(200, array('ok' => true) + $fixo);
    $cache = json_read($arq, null);
    if ($cache && isset($cache['em']) && time() - strtotime($cache['em']) < 90 * 86400) out(200, array('ok' => true) + $cache);

    $nomeRe = str_replace(array('.', '-'), array('\\\\.', '\\\\-'), $cid);
    $area = 'area["ISO3166-2"="BR-' . $uf . '"]->.uf;rel["boundary"="administrative"]["admin_level"="8"]["name"~"^' . $nomeRe . '$",i](area.uf);map_to_area->.c;';
    $consultas = array(
        '[out:json][timeout:40];' . $area . 'rel["boundary"="administrative"]["admin_level"~"^(9|10)$"](area.c);out tags;',
        '[out:json][timeout:40];' . $area . '(node["place"~"^(suburb|neighbourhood|quarter)$"](area.c);way["place"~"^(suburb|neighbourhood|quarter)$"](area.c);rel["place"~"^(suburb|neighbourhood|quarter)$"](area.c););out tags;',
    );
    @set_time_limit(150);
    $nomes = array();
    $erro = false;
    $servidores = array('https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter');
    foreach ($consultas as $q) foreach ($servidores as $srv) {
        if ($nomes) break 2;
        $url = $srv . '?data=' . rawurlencode($q);
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 35, CURLOPT_USERAGENT => 'painel-whatsbot/1.0'));
            $r = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        } else {
            list($code, $r) = wb_http_get($url);
        }
        $j = $code === 200 ? json_decode((string)$r, true) : null;
        if (!is_array($j) || !isset($j['elements'])) { $erro = true; continue; }
        $erro = false;
        foreach ($j['elements'] as $e) {
            if (!empty($e['tags']['name'])) $nomes[$e['tags']['name']] = true;
        }
        if ($nomes) break 2;
        break; // respondeu vazio: tenta a proxima consulta, nao outro servidor
    }
    $nomes = array_keys($nomes);
    if (!$nomes) falha($erro ? 502 : 404, $erro ? 'O serviço de mapas não respondeu. Tente de novo em instantes.' : 'Não achei os bairros de ' . $cid . '/' . $uf . ' no mapa. Confira o nome da cidade.');
    $chave = function ($s) { $p = function_exists('iconv') ? @iconv('UTF-8', 'ASCII//TRANSLIT', $s) : $s; return strtolower((string)$p); };
    usort($nomes, function ($a, $b) use ($chave) { return strcmp($chave($a), $chave($b)); });
    $res = array('cidade' => $cid, 'uf' => $uf, 'bairros' => $nomes, 'fonte' => 'OpenStreetMap', 'em' => date('c'));
    json_write($arq, $res);
    out(200, array('ok' => true) + $res);
}

// Ao vivo (23/11/2026): alertas da loja e os pedidos mais novos. O navegador pergunta a cada 15 s;
// `v` e a versao de pedidos que ele ja tem (so manda a lista quando mudou).
if ($action === 'ao_vivo' && $method === 'GET') {
    $loja = isset($_GET['loja']) ? (string)$_GET['loja'] : '';
    exige($eu, $db, $loja, 'ver');
    imp_vigia($loja);
    $al = json_read(data_dir() . '/alertas-' . $loja . '.json', array());
    $al = array_slice($al, -300);
    $parq = data_dir() . '/pedidos-' . $loja . '.json';
    clearstatcache();
    $ver = is_file($parq) ? filemtime($parq) . '-' . filesize($parq) : '';
    $ped = null;
    if ($ver !== '' && (!isset($_GET['v']) || $_GET['v'] !== $ver)) {
        // registro inteiro (resumo, endereco, pagamento): o Quadro mostra e imprime a comanda.
        // 150 cobre um expediente inteiro (o Quadro mostra desde as 15 h)
        $ped = array_values(array_filter(array_slice(json_read($parq, array()), -150), 'is_array'));
    }
    // Quadro (kanban): coluna de cada pedido, movida pela loja
    $quadro = json_read(data_dir() . '/quadro-' . $loja . '.json', array());
    // decisoes de aprovar/recusar das ultimas 12 h: o Quadro mostra "enviando" e o erro do bot
    $corteD = time() - 12 * 3600;
    $dec = array_values(array_filter(array_slice(json_read(data_dir() . '/decisoes-' . $loja . '.json', array()), -60), function ($x) use ($corteD) { return is_array($x) && isset($x['em']) && strtotime($x['em']) > $corteD; }));
    out(200, array('ok' => true, 'alertas' => $al, 'pedidosVersao' => $ver, 'pedidos' => $ped, 'quadro' => (object)$quadro, 'decisoes' => $dec, 'agora' => date('c')));
}

// Historico de pedidos e clientes (o bot manda; o painel so mostra)
if (($action === 'pedidos' || $action === 'clientes') && $method === 'GET') {
    $loja = isset($_GET['loja']) ? (string)$_GET['loja'] : '';
    exige($eu, $db, $loja, $action === 'pedidos' ? 'ver' : 'clientes');
    if ($action === 'pedidos') {
        $ps = json_read(data_dir() . '/pedidos-' . $loja . '.json', array());
        // operador ve so os ultimos 7 dias de expediente (Fábio, 24/11/2026); o dia vira as 15 h
        if (!$eu['superadmin'] && nivel($eu, $loja) < 2) {
            $ini = (new DateTime('today 15:00', new DateTimeZone('America/Sao_Paulo')))->getTimestamp();
            if (time() < $ini) $ini -= 86400;
            $corte = $ini - 6 * 86400;
            $ps = array_values(array_filter($ps, function ($p) use ($corte) { return is_array($p) && isset($p['em']) && strtotime($p['em']) >= $corte; }));
        }
        out(200, array('ok' => true, 'pedidos' => $ps));
    }
    $c = json_read(data_dir() . '/clientes-' . $loja . '.json', array('clientes' => array(), 'recebidoEm' => null));
    out(200, array('ok' => true) + $c);
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

// Quadro (kanban, 23/11/2026): a loja move o pedido entre as colunas. Guarda os 500 mais novos.
case 'quadro_mover':
    exige($eu, $db, $loja, 'ver');
    $id = isset($d['id']) ? substr((string)$d['id'], 0, 80) : '';
    $col = isset($d['coluna']) ? (string)$d['coluna'] : '';
    if ($id === '' || !in_array($col, array('novo', 'preparo', 'saiu', 'concluido'), true)) falha(400, 'coluna');
    $arq = data_dir() . '/quadro-' . $loja . '.json';
    $lk = fopen($arq . '.lock', 'c'); flock($lk, LOCK_EX);
    $q = json_read($arq, array());
    unset($q[$id]);
    $q[$id] = array('col' => $col, 'por' => $eu['email'], 'em' => date('c'));
    if (count($q) > 500) $q = array_slice($q, -500, null, true);
    json_write($arq, $q);
    flock($lk, LOCK_UN); fclose($lk);
    out(200, array('ok' => true));

// Excluir pedido do Historico e do Quadro (24/11/2026, Fábio: "admin pode excluir pedidos do
// historico/kanban"). So o admin geral. O id vai para pedidos-excluidos-<loja>.json para o bot nao
// trazer de volta no proximo envio do historico. Nao mexe na Saipos: venda la se cancela la.
case 'pedido_excluir':
    if (!$eu['superadmin']) falha(403, 'Só o administrador geral exclui pedidos.');
    exige($eu, $db, $loja, 'ver');
    $pid = isset($d['id']) ? substr((string)$d['id'], 0, 80) : '';
    if ($pid === '') falha(400, 'id');
    $parq = data_dir() . '/pedidos-' . $loja . '.json';
    $lk = fopen($parq . '.lock', 'c'); flock($lk, LOCK_EX);
    $ps = json_read($parq, array());
    $tirado = null; $resto = array();
    foreach ($ps as $x) { if (is_array($x) && isset($x['id']) && $x['id'] === $pid) $tirado = $x; else $resto[] = $x; }
    if ($tirado) json_write($parq, $resto);
    $earq = data_dir() . '/pedidos-excluidos-' . $loja . '.json';
    $ex = json_read($earq, array());
    if (!in_array($pid, $ex, true)) { $ex[] = $pid; json_write($earq, array_slice($ex, -5000)); }
    flock($lk, LOCK_UN); fclose($lk);
    if (!$tirado) falha(404, 'Pedido não encontrado.');
    $qarq = data_dir() . '/quadro-' . $loja . '.json';
    $lk = fopen($qarq . '.lock', 'c'); flock($lk, LOCK_EX);
    $q = json_read($qarq, array());
    if (isset($q[$pid])) { unset($q[$pid]); json_write($qarq, $q); }
    flock($lk, LOCK_UN); fclose($lk);
    $desc = trim((isset($tirado['codigo']) && $tirado['codigo'] ? 'nº ' . $tirado['codigo'] . ' ' : '') . (isset($tirado['nome']) ? $tirado['nome'] : '') . ' ' . (isset($tirado['em']) ? $tirado['em'] : ''));
    db_tx(function (&$db) use ($eu, $loja, $desc) { db_log($db, $eu['email'], $loja, 'excluiu um pedido', $desc); });
    out(200, array('ok' => true));

// Aprovar ou recusar pelo painel (24/11/2026, etapa 3): a decisao fica na fila e o bot executa
// (bot_eventos) com as mesmas acoes da tela do monitor: lanca no sistema de pedidos (Izza, Saipos
// ou Titan), confirma ao cliente ou passa a conversa para a loja. So pedido "Aguardando a loja".
case 'pedido_decidir':
    exige($eu, $db, $loja, 'ver');
    $pid = isset($d['id']) ? substr((string)$d['id'], 0, 80) : '';
    $dec = isset($d['decisao']) ? (string)$d['decisao'] : '';
    if ($pid === '' || !in_array($dec, array('aprovar', 'recusar'), true)) falha(400, 'decisao');
    $motivo = isset($d['motivo']) ? mb_substr(trim((string)$d['motivo']), 0, 200) : '';
    $p = null;
    foreach (array_reverse(json_read(data_dir() . '/pedidos-' . $loja . '.json', array())) as $x) if (is_array($x) && isset($x['id']) && $x['id'] === $pid) { $p = $x; break; }
    if (!$p) falha(404, 'Pedido não encontrado.');
    if (!isset($p['status']) || $p['status'] !== 'enviado') falha(409, 'Esse pedido já foi decidido.');
    if (empty($p['aprovaNoPainel'])) falha(409, 'Esse pedido é aprovado no sistema da loja (Titan), não no painel.');
    $arq = data_dir() . '/decisoes-' . $loja . '.json';
    $lk = fopen($arq . '.lock', 'c'); flock($lk, LOCK_EX);
    $ds = json_read($arq, array());
    foreach ($ds as $x) if (isset($x['pedido']) && $x['pedido'] === $pid && $x['estado'] === 'pendente') { flock($lk, LOCK_UN); fclose($lk); falha(409, 'Já foi enviado à Izza; aguarde.'); }
    $nova = array('id' => 'dc-' . novo_id(), 'pedido' => $pid, 'decisao' => $dec, 'motivo' => $motivo, 'por' => $eu['email'], 'em' => date('c'), 'estado' => 'pendente');
    $ds[] = $nova;
    if (count($ds) > 500) $ds = array_slice($ds, -500);
    json_write($arq, $ds);
    flock($lk, LOCK_UN); fclose($lk);
    out(200, array('ok' => true, 'decisao' => $nova));

// Alerta resolvido por alguem da loja (um, ou todos os abertos)
case 'alerta_resolver':
    exige($eu, $db, $loja, 'ver');
    $id = isset($d['id']) ? (string)$d['id'] : '';
    $todosAbertos = !empty($d['todos']);
    $arq = data_dir() . '/alertas-' . $loja . '.json';
    $lk = fopen($arq . '.lock', 'c'); flock($lk, LOCK_EX);
    $al = json_read($arq, array());
    $n = 0;
    foreach ($al as &$x) {
        if (!empty($x['resolvido'])) continue;
        if ($todosAbertos || (isset($x['id']) && $x['id'] === $id)) {
            $x['resolvido'] = true; $x['resolvidoPor'] = $eu['email']; $x['resolvidoEm'] = date('c'); $n++;
        }
    }
    unset($x);
    json_write($arq, $al);
    flock($lk, LOCK_UN); fclose($lk);
    out(200, array('ok' => true, 'resolvidos' => $n));

// Integracoes com outros sistemas (23/11/2026): configuracao por loja. Segredo nunca volta ao
// navegador (mascara_segredos); campo de segredo vazio = manter o que ja estava.
case 'integracoes':
    exige($eu, $db, $loja, 'integracoes');
    $in = isset($d['integracoes']) && is_array($d['integracoes']) ? $d['integracoes'] : null;
    if (!$in) falha(400, 'integracoes');
    $op = array('pedidos' => array('izza', 'titan', 'saipos', 'webhook'), 'cardapio' => array('izza', 'titan', 'saipos'), 'clientes' => array('izza', 'titan', 'saipos'));
    $novo = array();
    foreach ($op as $k => $vals) $novo[$k] = isset($in[$k]) && in_array($in[$k], $vals, true) ? $in[$k] : 'izza';
    $campos = array('titan' => array('url', 'usuario', 'senha'), 'saipos' => array('idPartner', 'codStore', 'secret', 'ambiente'), 'webhook' => array('url', 'segredo'));
    foreach ($campos as $sis => $cs) {
        $novo[$sis] = array();
        foreach ($cs as $c) $novo[$sis][$c] = isset($in[$sis][$c]) ? mb_substr(trim((string)$in[$sis][$c]), 0, 500) : '';
    }
    if ($novo['webhook']['url'] !== '' && !preg_match('#^https://#i', $novo['webhook']['url'])) falha(400, 'O endereço do webhook precisa começar com https://');
    db_tx(function (&$db) use ($eu, $loja, $novo) {
        $c = &cfg_de($db, $loja);
        $velho = isset($c['integracoes']) ? $c['integracoes'] : array();
        foreach (array(array('titan', 'senha'), array('saipos', 'secret'), array('webhook', 'segredo')) as $s) {
            $v = $novo[$s[0]][$s[1]];
            if ($v === '' || $v === '__definido__') $novo[$s[0]][$s[1]] = isset($velho[$s[0]][$s[1]]) ? $velho[$s[0]][$s[1]] : '';
            if ($v === '__apagar__') $novo[$s[0]][$s[1]] = '';
        }
        $novo['atualizadoEm'] = date('c');
        $novo['atualizadoPor'] = $eu['email'];
        $c['integracoes'] = $novo;
        db_log($db, $eu['email'], $loja, 'mudou as integrações', 'pedido: ' . $novo['pedidos'] . ', cardápio: ' . $novo['cardapio'] . ', clientes: ' . $novo['clientes']);
    });
    out(200, array('ok' => true));

// Importar a base de clientes da loja (24/11/2026): planilha lida no navegador, a lista vem pronta.
// Substitui a importacao anterior; o bot cria quem falta e atualiza quem existe (nunca apaga).
// Dame e Lov nao precisam: a base delas vem da intranet sozinha.
case 'clientes_importar':
    exige($eu, $db, $loja, 'clientes');
    $in = isset($d['clientes']) && is_array($d['clientes']) ? $d['clientes'] : null;
    if (!$in) falha(400, 'clientes');
    if (count($in) > 30000) falha(400, 'No máximo 30.000 clientes por importação.');
    $cl = array();
    foreach ($in as $c) {
        if (!is_array($c)) continue;
        $tel = preg_replace('/\D/', '', (string)(isset($c['telefone']) ? $c['telefone'] : ''));
        if (strlen($tel) < 10 || strlen($tel) > 13) continue;
        $x = array('telefone' => $tel);
        foreach (array('nome', 'rua', 'numero', 'complemento', 'bairro') as $k) $x[$k] = mb_substr(trim((string)(isset($c[$k]) ? $c[$k] : '')), 0, 120);
        $cl[] = $x;
    }
    if (!$cl) falha(400, 'Nenhum cliente com telefone válido na planilha.');
    json_write(data_dir() . '/clientes-base-' . $loja . '.json', array('versao' => (string)time(), 'em' => date('c'), 'por' => $eu['email'], 'clientes' => $cl));
    db_tx(function (&$db) use ($eu, $loja, $cl) { db_log($db, $eu['email'], $loja, 'importou clientes', count($cl) . ' clientes'); });
    out(200, array('ok' => true, 'total' => count($cl)));

case 'clientes_base':
    exige($eu, $db, $loja, 'clientes');
    $b = json_read(data_dir() . '/clientes-base-' . $loja . '.json', null);
    out(200, array('ok' => true, 'total' => $b ? count($b['clientes']) : 0, 'em' => $b ? $b['em'] : null, 'por' => $b ? $b['por'] : null));

// Endereco que se passa a Saipos para ela avisar os status (saipos_webhook). Um so para todas as lojas.
case 'saipos_url':
    exige($eu, $db, $loja, 'integracoes');
    $base = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . strtok($_SERVER['REQUEST_URI'], '?');
    out(200, array('ok' => true, 'url' => $base . '?a=saipos_webhook&k=' . saipos_chave()));

// Teste do webhook: o servidor manda um pedido de exemplo, assinado, para o endereco da loja.
case 'integracao_teste':
    exige($eu, $db, $loja, 'integracoes');
    $w = isset($db['lojas'][$loja]['config']['integracoes']['webhook']) ? $db['lojas'][$loja]['config']['integracoes']['webhook'] : array();
    $url = isset($w['url']) ? (string)$w['url'] : '';
    if (!preg_match('#^https://#i', $url)) falha(400, 'Salve antes um endereço https:// para o webhook.');
    $corpo = json_encode(array('evento' => 'teste', 'loja' => $loja, 'em' => date('c'), 'pedido' => array(
        'id' => 'teste-' . time(), 'cliente' => array('nome' => 'Cliente de teste', 'telefone' => '5551900000000', 'retirada' => true),
        'itens' => array(array('tipo' => 'pizza', 'tamanho' => 'grande', 'sabores' => array('Sabor de teste'))), 'total' => 0, 'pagamento' => 'teste')), JSON_UNESCAPED_UNICODE);
    $ch = curl_init($url);
    curl_setopt_array($ch, array(CURLOPT_POST => true, CURLOPT_POSTFIELDS => $corpo, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_HTTPHEADER => array('Content-Type: application/json', 'User-Agent: izza-painel/1', 'X-Izza-Evento: teste',
            'X-Izza-Assinatura: sha256=' . hash_hmac('sha256', $corpo, isset($w['segredo']) ? (string)$w['segredo'] : ''))));
    curl_exec($ch);
    $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $erro = curl_error($ch);
    curl_close($ch);
    out(200, array('ok' => true, 'http' => $http, 'erro' => $erro));

// Modelo da comanda que o painel imprime (pedido aprovado pela Izza, sem sistema de pedidos)
case 'comanda':
    exige($eu, $db, $loja, 'horario');
    $cm = isset($d['comanda']) && is_array($d['comanda']) ? $d['comanda'] : null;
    if (!$cm) falha(400, 'comanda');
    if (strlen(json_encode($cm)) > 20000) falha(413, 'Comanda grande demais.');
    db_tx(function (&$db) use ($eu, $loja, $cm) {
        $c = &cfg_de($db, $loja);
        $c['comanda'] = $cm;
        db_log($db, $eu['email'], $loja, 'mudou o modelo da comanda', '');
    });
    out(200, array('ok' => true));

// Ficha de particularidades da loja (22/11/2026): referencia do negocio, o bot NAO le.
case 'ficha':
    exige($eu, $db, $loja, 'horario');
    $f = isset($d['ficha']) && is_array($d['ficha']) ? $d['ficha'] : null;
    if (!$f) falha(400, 'ficha');
    $bruto = json_encode($f, JSON_UNESCAPED_UNICODE);
    if (strlen($bruto) > 250000) falha(413, 'Ficha grande demais.');
    db_tx(function (&$db) use ($eu, $loja, $f) {
        $c = &cfg_de($db, $loja);
        $c['ficha'] = $f;
        $c['fichaPor'] = $eu['email'];
        $c['fichaEm'] = date('c');
        db_log($db, $eu['email'], $loja, 'atualizou as particularidades da loja', '');
    });
    out(200, array('ok' => true));

case 'instrucao':
case 'ferramenta':
    exige($eu, $db, $loja, 'instrucoes');
    $pad = json_read(data_dir() . '/padroes-' . $loja . '.json', null);
    if (!$pad) falha(409, 'O bot desta loja ainda não mandou os textos padrão. Espere ele ficar no ar.');
    if ($action === 'instrucao') {
        $campo = isset($d['campo']) ? (string)$d['campo'] : '';
        $tetos = array('identidade' => 3000, 'regrasCasa' => 11500, 'tomEquipe' => 4000);
        if (!isset($tetos[$campo]) || !isset($pad['instrucoes'][$campo])) falha(400, 'campo');
        $padrao = (string)$pad['instrucoes'][$campo];
        $max = $tetos[$campo];
    } else {
        $campo = isset($d['nome']) ? (string)$d['nome'] : '';
        $padrao = null;
        foreach ((isset($pad['ferramentas']) ? $pad['ferramentas'] : array()) as $f) if ($f['nome'] === $campo) $padrao = (string)$f['descricao'];
        if ($padrao === null) falha(400, 'ferramenta');
        $max = 2000;
    }
    $novo = array_key_exists('texto', $d) && $d['texto'] !== null ? str_replace("\r\n", "\n", (string)$d['texto']) : null;
    if ($novo !== null) {
        $novo = trim($novo);
        if (mb_strlen($novo) < 10) falha(400, 'Texto curto demais.');
        if (mb_strlen($novo) > $max) falha(400, 'Passou do limite de ' . number_format($max, 0, ',', '.') . ' caracteres.');
        // marcadores que o bot troca por valor ({LINK}, {TEMPO_ENTREGA}...) nao podem sumir
        preg_match_all('/\{[A-Z_]+\}/', $padrao, $m1);
        $faltam = array();
        foreach (array_unique($m1[0]) as $ph) if (strpos($novo, $ph) === false) $faltam[] = $ph;
        if ($faltam) falha(400, 'Faltam os marcadores ' . implode(', ', $faltam) . ' (o bot troca cada um pelo valor certo).');
        if ($novo === trim($padrao)) $novo = null; // igual ao padrao = padrao
    }
    $chave = $action === 'instrucao' ? 'instrucoes' : 'ferramentas';
    $baseHash = hash('sha256', $padrao);
    db_tx(function (&$db) use ($eu, $loja, $chave, $campo, $novo, $baseHash, $padrao) {
        $c = &cfg_de($db, $loja);
        if (!isset($c[$chave]) || !is_array($c[$chave])) $c[$chave] = array();
        $antes = isset($c[$chave][$campo]) ? $c[$chave][$campo] : null;
        $textoAntes = $antes ? ($chave === 'instrucoes' ? $antes['texto'] : $antes['descricao']) : $padrao;
        if (!isset($c['historicoInstrucoes']) || !is_array($c['historicoInstrucoes'])) $c['historicoInstrucoes'] = array();
        array_unshift($c['historicoInstrucoes'], array('id' => novo_id(), 'alvo' => $chave . ':' . $campo, 'texto' => $textoAntes, 'eraPadrao' => !$antes, 'substituidoEm' => date('c'), 'por' => $eu['email']));
        $c['historicoInstrucoes'] = array_slice($c['historicoInstrucoes'], 0, 40);
        if ($novo === null) unset($c[$chave][$campo]);
        else $c[$chave][$campo] = array($chave === 'instrucoes' ? 'texto' : 'descricao' => $novo, 'baseHash' => $baseHash, 'por' => $eu['email'], 'em' => date('c'));
        if (!$c[$chave]) $c[$chave] = new stdClass();
        $c['atualizadoEm'] = date('c');
        $rot = $chave === 'instrucoes' ? array('identidade' => 'identidade', 'regrasCasa' => 'regras da casa', 'tomEquipe' => 'tom da equipe')[$campo] : 'ferramenta ' . $campo;
        db_log($db, $eu['email'], $loja, ($novo === null ? 'voltou ao padrão: ' : 'editou ') . $rot, $novo === null ? '' : mb_substr($novo, 0, 200));
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
