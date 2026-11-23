<?php
// /whatsbot/impressao.php: fila de impressao da Izza (23/11/2026), incluido pelo api.php.
//
// O programa "Izza Impressora" (Windows, fica na bandeja) e pareado com a loja por um codigo
// de 6 digitos gerado no painel. Depois ele pergunta a cada 3 s se ha comanda na fila
// (imp_poll), imprime direto na impressora do Windows e devolve o resultado (imp_resultado).
// So o programa chama a nuvem: nao precisa de porta aberta nem de Tailscale na loja.
//
// Onde fica cada coisa:
//   config da loja (whatsbot.json) -> config.impressao {auto, impressoras:[{id, disp, nome, ativa, tipo, modelo, vias, papel}]}
//   data/impressao-<loja>.json      -> computadores pareados {id: {nome, maquina, tokenHash, vistoEm, versao, impressoras}}
//   data/imp-codigos.json           -> codigos de pareamento validos por 10 min (globais: o codigo diz a loja)
//   data/imp-fila-<loja>.json       -> trabalhos (os 300 mais novos), com as linhas da comanda ja montadas
//   impressora/versao.txt           -> "versao sha256" do instalador publicado (atualizacao automatica)
//
// A comanda e montada aqui (comanda_linhas), com o mesmo desenho do painel (app.js linhasComanda):
// o programa so transforma as linhas em comandos da termica (ESC/POS) ou em pagina do Windows.
if (!defined('WB')) { http_response_code(404); exit; }

const IMP_ONLINE_S = 25;   // visto ha menos que isso = computador ligado
const IMP_REENVIA_S = 60;  // trabalho entregue sem resposta volta para a fila depois disso
const IMP_TENTATIVAS = 3;

// ------------------------------------------------------------------ comanda
function imp_brl($v) { return 'R$ ' . number_format((float)$v, 2, ',', '.'); }
function imp_tel($t) {
    $d = preg_replace('/\D/', '', (string)$t);
    if (strlen($d) >= 12 && strpos($d, '55') === 0) $d = substr($d, 2);
    if (strlen($d) === 11) return '(' . substr($d, 0, 2) . ') ' . substr($d, 2, 5) . '-' . substr($d, 7);
    if (strlen($d) === 10) return '(' . substr($d, 0, 2) . ') ' . substr($d, 2, 4) . '-' . substr($d, 6);
    return (string)$t;
}
function imp_up($s) { return mb_strtoupper((string)$s, 'UTF-8'); }
function imp_cfg_comanda($cfgLoja) {
    $c = array('papel' => 80, 'letra' => 'media', 'vias' => 1, 'cabecalho' => '', 'rodape' => '',
        'nomeLoja' => true, 'canal' => true, 'tipoDestaque' => true, 'telefone' => true, 'endereco' => true,
        'obsDestaque' => true, 'obsMaiusculas' => true, 'totais' => true, 'troco' => true, 'canhoto' => true);
    $s = isset($cfgLoja['comanda']) && is_array($cfgLoja['comanda']) ? $cfgLoja['comanda'] : array();
    foreach ($s as $k => $v) $c[$k] = $v;
    return $c;
}
function imp_nome_tamanho($id, $cfgLoja) {
    $f = isset($cfgLoja['ficha']) ? $cfgLoja['ficha'] : null;
    if ($f && isset($f['tamanhos']) && is_array($f['tamanhos'])) foreach ($f['tamanhos'] as $t) {
        if (isset($t['id']) && $t['id'] === $id && !empty($t['nome'])) return $t['nome'];
    }
    $id = (string)$id;
    return $id !== '' ? mb_strtoupper(mb_substr($id, 0, 1)) . mb_substr($id, 1) : 'Pizza';
}
function imp_g($a, $k, $p = null) { return is_array($a) && isset($a[$k]) ? $a[$k] : $p; }
// pedido do historico (bot) -> dados da comanda (app.js pedidoParaComanda)
function imp_pedido_comanda($p, $cfgLoja) {
    $c = imp_g($p, 'comanda', array()); if (!is_array($c)) $c = array();
    $cli = imp_g($c, 'cliente', array()); $e = imp_g($p, 'endereco', array());
    $itens = array();
    foreach ((array)imp_g($c, 'itens', array()) as $i) {
        if (!is_array($i)) continue;
        if (imp_g($i, 'tipo') === 'pizza') $itens[] = array('pizza' => true, 'titulo' => '1x ' . imp_nome_tamanho(imp_g($i, 'tamanho', ''), $cfgLoja), 'sabores' => (array)imp_g($i, 'sabores', array()), 'borda' => imp_g($i, 'borda'), 'extras' => (array)imp_g($i, 'extras', array()), 'obs' => imp_g($i, 'obs'));
        else $itens[] = array('titulo' => (imp_g($i, 'qtd') ?: 1) . 'x ' . imp_g($i, 'nome', ''), 'borda' => imp_g($i, 'borda'), 'bordas' => (array)imp_g($i, 'bordas', array()), 'obs' => imp_g($i, 'obs'), 'sabores' => (array)imp_g($i, 'sabores', array()));
    }
    $ret = imp_g($p, 'retirada');
    return array(
        'codigo' => imp_g($p, 'codigo', ''), 'em' => imp_g($p, 'em'), 'nome' => imp_g($p, 'nome') ?: imp_g($cli, 'nome', ''),
        'telefone' => imp_tel(imp_g($p, 'telefone') ?: imp_g($cli, 'telefone', '')),
        'retirada' => $ret !== null ? !!$ret : !!imp_g($cli, 'retirada'),
        'rua' => imp_g($e, 'rua') ?: imp_g($cli, 'rua', ''), 'numero' => imp_g($e, 'numero') ?: imp_g($cli, 'numero', ''),
        'complemento' => imp_g($e, 'complemento') ?: imp_g($cli, 'complemento', ''), 'bairro' => imp_g($e, 'bairro') ?: imp_g($cli, 'bairro', ''),
        'itens' => $itens, 'subtotal' => imp_g($p, 'subtotal'), 'taxa' => imp_g($p, 'taxa') !== null ? imp_g($p, 'taxa') : imp_g($c, 'taxaEntrega'),
        'total' => imp_g($p, 'total'), 'pagamento' => imp_g($p, 'pagamento') ?: imp_g($c, 'pagamento', ''), 'trocoPara' => imp_g($c, 'trocoPara') ?: null,
        'obs' => imp_g($c, 'obs') ?: '', 'semItens' => !count((array)imp_g($c, 'itens', array())), 'resumo' => imp_g($p, 'resumo') ?: '',
    );
}
// pedido de exemplo com sabores da propria loja (app.js pedidoExemplo)
function imp_pedido_exemplo($cfgLoja) {
    $f = imp_g($cfgLoja, 'ficha', array()); $card = imp_g($f, 'cardapio', array());
    $sab = array(); foreach ((array)imp_g($card, 'sabores', array()) as $s) if (imp_g($s, 'ativo') !== false && imp_g($s, 'nome')) $sab[] = $s['nome'];
    $beb = null; foreach ((array)imp_g($card, 'bebidas', array()) as $s) if (imp_g($s, 'ativo') !== false && imp_g($s, 'nome')) { $beb = $s; break; }
    $tam = null; foreach ((array)imp_g($f, 'tamanhos', array()) as $t) if (imp_g($t, 'ativo') !== false && imp_g($t, 'nome')) { $tam = $t; break; }
    $itens = array(array('pizza' => true, 'titulo' => '1x ' . ($tam ? $tam['nome'] : 'Grande'), 'sabores' => count($sab) ? array_slice($sab, 0, 2) : array('Sabor 1', 'Sabor 2'), 'borda' => null, 'extras' => array(), 'obs' => 'sem cebola'));
    if ($beb) $itens[] = array('titulo' => '1x ' . $beb['nome']);
    return array('exemplo' => true, 'codigo' => '1234', 'em' => date('c'), 'nome' => 'Cliente de exemplo', 'telefone' => '(51) 99999-0000', 'retirada' => false,
        'rua' => 'Rua de Exemplo', 'numero' => '100', 'complemento' => 'ap 1', 'bairro' => 'Bairro', 'itens' => $itens,
        'subtotal' => 80, 'taxa' => 8, 'total' => 88, 'pagamento' => 'Dinheiro', 'trocoPara' => 100, 'obs' => '');
}
// Linhas da comanda: {t, c, b, g, inv} | {lr:[esq,dir], b, g} | {hr} | {hr2} | {sp}.
// Mesmo desenho do app.js linhasComanda. $cozinha: sem dados do cliente, valores e canhoto.
function comanda_linhas($p, $cfg, $nomeLoja, $cozinha = false) {
    $L = array();
    $up = function ($s) use ($cfg) { return !empty($cfg['obsMaiusculas']) ? imp_up($s) : (string)$s; };
    $tx = function ($t, $o = array()) use (&$L) { $L[] = array('t' => (string)$t) + $o; };
    $lr = function ($a, $b, $o = array()) use (&$L) { $L[] = array('lr' => array((string)$a, (string)$b)) + $o; };
    $tz = new DateTimeZone('America/Sao_Paulo');
    try { $d = new DateTime(imp_g($p, 'em') ?: 'now'); $d->setTimezone($tz); } catch (Exception $e) { $d = null; }
    $dh = $d ? $d->format('d/m/Y H:i') : ''; $hora = $d ? $d->format('H:i') : '';
    $end = function () use ($p) { $r = array_filter(array(imp_g($p, 'rua'), imp_g($p, 'numero')), function ($x) { return $x !== null && $x !== '' && $x !== false; }); return 'END: ' . implode(', ', $r) . (imp_g($p, 'complemento') ? ' - ' . $p['complemento'] : ''); };
    if (!empty($cfg['nomeLoja'])) $tx($nomeLoja, array('c' => 1, 'b' => 1, 'g' => 1));
    foreach (preg_split('/\n/', (string)imp_g($cfg, 'cabecalho', '')) as $s) if (trim($s) !== '') $tx(trim($s), array('c' => 1));
    if ($cozinha) $tx('*** COZINHA ***', array('c' => 1, 'b' => 1));
    $L[] = array('sp' => 1);
    $tx('PEDIDO N. ' . (imp_g($p, 'codigo') ?: '—'), array('c' => 1, 'b' => 1, 'g' => 1));
    $tx($dh, array('c' => 1));
    if (!empty($cfg['canal'])) $tx('*** WHATSAPP ***', array('c' => 1, 'b' => 1));
    if (!empty($cfg['tipoDestaque'])) $tx(imp_g($p, 'retirada') ? '*** RETIRADA NO BALCAO ***' : '*** ENTREGA ***', array('c' => 1, 'b' => 1));
    $L[] = array('hr' => 1);
    $tx('CLIENTE: ' . imp_g($p, 'nome', ''), array('b' => 1));
    if (!$cozinha) {
        if (!empty($cfg['telefone'])) $tx('TEL: ' . imp_g($p, 'telefone', ''));
        if (!empty($cfg['endereco']) && !imp_g($p, 'retirada')) {
            $tx($end());
            if (imp_g($p, 'bairro')) $tx('BAIRRO: ' . $p['bairro']);
        }
    }
    $L[] = array('hr' => 1);
    if (imp_g($p, 'semItens')) {
        $tx('(pedido sem itens estruturados; resumo abaixo)');
        foreach (explode("\n", (string)imp_g($p, 'resumo', '')) as $s) $tx($s);
    }
    foreach ((array)imp_g($p, 'itens', array()) as $i) {
        $tx(imp_g($i, 'pizza') ? $up($i['titulo']) : imp_g($i, 'titulo', ''), array('b' => 1));
        foreach ((array)imp_g($i, 'sabores', array()) as $s) $tx('   - ' . $s);
        if (imp_g($i, 'borda')) $tx('   Borda: ' . $i['borda']);
        foreach ((array)imp_g($i, 'bordas', array()) as $b) if ($b) $tx('   Borda: ' . $b);
        foreach ((array)imp_g($i, 'extras', array()) as $x) $tx('   + ' . $x, array('b' => 1));
        if (imp_g($i, 'obs')) $tx(' >> OBS: ' . $up($i['obs']) . ' ', array('b' => 1, 'inv' => !empty($cfg['obsDestaque']) ? 1 : 0));
        $L[] = array('sp' => 1);
    }
    $L[] = array('hr' => 1);
    if (!$cozinha) {
        if (!empty($cfg['totais'])) {
            if (imp_g($p, 'subtotal') !== null) $lr('SUBTOTAL', imp_brl($p['subtotal']));
            if (imp_g($p, 'taxa')) $lr('TAXA DE ENTREGA', imp_brl($p['taxa']));
        }
        $lr('TOTAL', imp_brl(imp_g($p, 'total') ?: 0), array('b' => 1, 'g' => 1));
        $L[] = array('hr' => 1);
        $tx('PAGAMENTO: ' . imp_g($p, 'pagamento', ''), array('b' => 1));
        if (!empty($cfg['troco']) && imp_g($p, 'trocoPara')) {
            $tx('Troco para: ' . imp_brl($p['trocoPara']));
            $tx('Troco: ' . imp_brl(round(((float)$p['trocoPara'] - (float)(imp_g($p, 'total') ?: 0)) * 100) / 100), array('b' => 1));
        }
    }
    if (imp_g($p, 'obs')) $tx(' OBS PEDIDO: ' . $up($p['obs']) . ' ', array('b' => 1, 'inv' => !empty($cfg['obsDestaque']) ? 1 : 0));
    $k = 0;
    foreach (preg_split('/\n/', (string)imp_g($cfg, 'rodape', '')) as $s) if (trim($s) !== '') { if (!$k++) $L[] = array('sp' => 1); $tx(trim($s), array('c' => 1)); }
    if (!empty($cfg['canhoto']) && !$cozinha) {
        array_push($L, array('sp' => 1), array('sp' => 1), array('hr2' => 1), array('sp' => 1));
        $tx('PEDIDO N. ' . (imp_g($p, 'codigo') ?: '—'), array('c' => 1, 'b' => 1, 'g' => 1));
        $tx('HORA: ' . $hora, array('c' => 1, 'b' => 1));
        $tx('TEL: ' . imp_g($p, 'telefone', ''));
        if (!imp_g($p, 'retirada')) {
            $tx($end());
            if (imp_g($p, 'bairro')) $tx('BAIRRO: ' . $p['bairro']);
        }
    }
    return $L;
}

// ------------------------------------------------------------------ arquivos
function imp_arq_disp($loja) { return data_dir() . '/impressao-' . $loja . '.json'; }
function imp_arq_fila($loja) { return data_dir() . '/imp-fila-' . $loja . '.json'; }
function imp_arq_codigos() { return data_dir() . '/imp-codigos.json'; }
// le, muda e grava um arquivo com trava exclusiva
function imp_tx($arq, $padrao, $fn) {
    $lk = fopen($arq . '.lock', 'c'); flock($lk, LOCK_EX);
    try {
        $d = json_read($arq, $padrao);
        $r = $fn($d);
        json_write($arq, $d);
        return $r;
    } finally { flock($lk, LOCK_UN); fclose($lk); }
}
function imp_cfg($cfgLoja) {
    $c = isset($cfgLoja['impressao']) && is_array($cfgLoja['impressao']) ? $cfgLoja['impressao'] : array();
    return array('auto' => !empty($c['auto']), 'impressoras' => isset($c['impressoras']) && is_array($c['impressoras']) ? $c['impressoras'] : array());
}
function imp_versao_app() {
    $t = @file_get_contents(__DIR__ . '/impressora/versao.txt');
    if (!$t || !preg_match('/^(\d+\.\d+\.\d+)\s+([a-f0-9]{64})/', trim($t), $m)) return null;
    $base = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
    return array('versao' => $m[1], 'sha256' => $m[2], 'url' => $base . '/impressora/IzzaImpressora.exe');
}
function imp_dispositivos_publicos($loja) {
    $d = json_read(imp_arq_disp($loja), array('dispositivos' => array()));
    $out = array();
    foreach ((array)imp_g($d, 'dispositivos', array()) as $id => $x) {
        $visto = imp_g($x, 'vistoEm');
        $out[] = array('id' => $id, 'nome' => imp_g($x, 'nome', ''), 'maquina' => imp_g($x, 'maquina', ''), 'versao' => imp_g($x, 'versao', ''),
            'vistoEm' => $visto, 'online' => $visto && time() - strtotime($visto) < IMP_ONLINE_S, 'criadoEm' => imp_g($x, 'criadoEm'),
            'impressoras' => (array)imp_g($x, 'impressoras', array()));
    }
    return $out;
}

// Poe na fila uma comanda para cada impressora ativa da loja (ou so a $soImpressora).
// $pc: dados da comanda (imp_pedido_comanda / imp_pedido_exemplo). Devolve quantos trabalhos entraram.
function imp_enfileira($db, $loja, $pc, $origem, $por, $soImpressora = null, $cfgComanda = null, $pedidoId = null) {
    $cfgLoja = isset($db['lojas'][$loja]['config']) ? $db['lojas'][$loja]['config'] : array();
    $nomeLoja = isset($db['lojas'][$loja]['nome']) ? $db['lojas'][$loja]['nome'] : $loja;
    $cm = $cfgComanda ?: imp_cfg_comanda($cfgLoja);
    $disp = json_read(imp_arq_disp($loja), array('dispositivos' => array()));
    $novos = array();
    foreach (imp_cfg($cfgLoja)['impressoras'] as $im) {
        if ($soImpressora !== null ? imp_g($im, 'id') !== $soImpressora : !imp_g($im, 'ativa')) continue;
        if (!isset($disp['dispositivos'][imp_g($im, 'disp')])) continue;
        $coz = imp_g($im, 'modelo') === 'cozinha';
        $novos[] = array(
            'id' => novo_id(), 'em' => date('c'), 'disp' => $im['disp'], 'impressora' => $im['id'], 'nomeImpressora' => imp_g($im, 'nome', ''),
            'tipo' => imp_g($im, 'tipo') === 'comum' ? 'comum' : 'termica', 'papel' => (int)(imp_g($im, 'papel') ?: imp_g($cm, 'papel', 80)) === 58 ? 58 : 80,
            'letra' => in_array(imp_g($cm, 'letra'), array('normal', 'media', 'grande'), true) ? $cm['letra'] : 'media',
            'vias' => max(1, min(3, (int)(imp_g($im, 'vias') ?: imp_g($cm, 'vias', 1)))),
            'titulo' => (imp_g($pc, 'exemplo') ? 'Teste' : 'Pedido ' . (imp_g($pc, 'codigo') ?: imp_g($pc, 'nome', ''))) . ($coz ? ' (cozinha)' : ''),
            'pedido' => $pedidoId, 'origem' => $origem, 'por' => $por, 'status' => 'pendente', 'tentativas' => 0,
            'linhas' => comanda_linhas($pc, $cm, $nomeLoja, $coz),
        );
    }
    if (!$novos) return 0;
    imp_tx(imp_arq_fila($loja), array(), function (&$f) use ($novos) {
        foreach ($novos as $n) $f[] = $n;
        if (count($f) > 300) $f = array_slice($f, -300);
    });
    return count($novos);
}

// Alerta "impressao falhou" na pagina Alertas (mesmo arquivo do bot_alertas)
function imp_alerta($loja, $id, $titulo, $texto) {
    imp_tx(data_dir() . '/alertas-' . $loja . '.json', array(), function (&$todos) use ($id, $titulo, $texto) {
        foreach ($todos as $x) if (imp_g($x, 'id') === $id) return;
        $todos[] = array('id' => $id, 'tipo' => 'impressao', 'nivel' => 'urgente', 'titulo' => $titulo, 'texto' => $texto, 'em' => date('c'), 'recebidoEm' => date('c'));
        if (count($todos) > 1000) $todos = array_slice($todos, -1000);
    });
}

// Pedido novo que o bot mandou: imprime sozinho se a loja ligou "imprimir sozinho".
// Chamado pelo bot_pedidos com os pedidos que ainda nao existiam no arquivo.
function imp_auto($db, $loja, $novos) {
    $cfgLoja = isset($db['lojas'][$loja]['config']) ? $db['lojas'][$loja]['config'] : array();
    if (!imp_cfg($cfgLoja)['auto']) return;
    foreach ($novos as $p) {
        if (empty($p['comanda']) || in_array(imp_g($p, 'status'), array('recusado', 'expirado'), true)) continue;
        imp_enfileira($db, $loja, imp_pedido_comanda($p, $cfgLoja), 'auto', 'izza', null, null, $p['id']);
    }
}

// Trabalho parado na fila porque o computador esta desligado: um alerta por trabalho (ao_vivo chama).
function imp_vigia($loja) {
    $arq = imp_arq_fila($loja);
    if (!is_file($arq)) return;
    $f = json_read($arq, array());
    foreach (array_slice($f, -30) as $j) {
        if (imp_g($j, 'status') !== 'pendente' || imp_g($j, 'origem') !== 'auto') continue;
        $idade = time() - strtotime($j['em']);
        if ($idade > 90 && $idade < 3600) imp_alerta($loja, 'imp-off-' . $j['id'], 'Comanda não saiu', 'O ' . $j['titulo'] . ' está esperando há ' . round($idade / 60) . ' min: o computador da impressora (' . $j['nomeImpressora'] . ') parece desligado ou sem internet.');
    }
}

// ------------------------------------------------------------------ programa (sem sessao)
function imp_ip() { return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : ''; }
function imp_auth_disp($loja) {
    $h = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION']) ? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] : '');
    if (!preg_match('/^Bearer\s+([a-f0-9]{12})\.([a-f0-9]{40})$/', $h, $m)) falha(401, 'sem token');
    $d = json_read(imp_arq_disp($loja), array('dispositivos' => array()));
    $x = isset($d['dispositivos'][$m[1]]) ? $d['dispositivos'][$m[1]] : null;
    if (!$x || !hash_equals((string)imp_g($x, 'tokenHash'), hash('sha256', $m[2]))) falha(401, 'computador desconectado');
    return $m[1];
}

function imp_rotas_programa($action, $method) {
    if ($method !== 'POST') falha(405, 'metodo');
    $p = corpo();
    if ($action === 'imp_parear') {
        // tentativa errada conta por IP: 20 por hora
        $ip = hash('sha256', imp_ip());
        $bloq = imp_tx(data_dir() . '/imp-tentativas.json', array(), function (&$t) use ($ip) {
            $agora = time();
            foreach ($t as $k => $v) if ($v['ate'] < $agora) unset($t[$k]);
            return isset($t[$ip]) && $t[$ip]['n'] >= 20;
        });
        if ($bloq) falha(429, 'Muitas tentativas. Espere uma hora ou gere um código novo no painel.');
        $cod = preg_replace('/\D/', '', (string)imp_g($p, 'codigo', ''));
        $achou = imp_tx(imp_arq_codigos(), array(), function (&$cs) use ($cod) {
            $agora = time(); $r = null;
            foreach ($cs as $k => $c) {
                if ($c['expira'] < $agora) { unset($cs[$k]); continue; }
                if ($cod !== '' && hash_equals($c['codigo'], $cod)) { $r = $c; unset($cs[$k]); }
            }
            $cs = array_values($cs);
            return $r;
        });
        if (!$achou) {
            imp_tx(data_dir() . '/imp-tentativas.json', array(), function (&$t) use ($ip) {
                if (!isset($t[$ip])) $t[$ip] = array('n' => 0, 'ate' => time() + 3600);
                $t[$ip]['n']++;
            });
            falha(404, 'Código inválido ou vencido. Gere outro no painel (Impressoras > Conectar um computador).');
        }
        $loja = $achou['loja'];
        $db = db_load();
        if (!isset($db['lojas'][$loja])) falha(404, 'loja');
        $id = bin2hex(random_bytes(6)); $seg = bin2hex(random_bytes(20));
        $nome = mb_substr(trim((string)imp_g($p, 'nome', '')), 0, 60) ?: 'Computador';
        $maq = mb_substr(trim((string)imp_g($p, 'maquina', '')), 0, 60);
        imp_tx(imp_arq_disp($loja), array('dispositivos' => array()), function (&$d) use ($id, $seg, $nome, $maq, $achou, $p) {
            $d['dispositivos'][$id] = array('nome' => $nome, 'maquina' => $maq, 'tokenHash' => hash('sha256', $seg), 'criadoEm' => date('c'), 'criadoPor' => $achou['por'],
                'vistoEm' => date('c'), 'versao' => mb_substr((string)imp_g($p, 'versao', ''), 0, 20), 'impressoras' => array());
        });
        db_tx(function (&$db) use ($loja, $nome, $maq, $achou) { db_log($db, $achou['por'], $loja, 'conectou um computador de impressão', $nome . ($maq ? ' (' . $maq . ')' : '')); });
        out(200, array('ok' => true, 'loja' => $loja, 'nomeLoja' => isset($db['lojas'][$loja]['nome']) ? $db['lojas'][$loja]['nome'] : $loja, 'token' => $id . '.' . $seg));
    }

    $loja = isset($_GET['loja']) ? preg_replace('/[^a-z0-9_-]/', '', $_GET['loja']) : '';
    $db = db_load();
    if ($loja === '' || !isset($db['lojas'][$loja])) falha(404, 'loja');
    $disp = imp_auth_disp($loja);

    if ($action === 'imp_poll') {
        $imps = array();
        foreach (array_slice((array)imp_g($p, 'impressoras', array()), 0, 30) as $i) {
            if (is_array($i) && trim((string)imp_g($i, 'nome', '')) !== '') $imps[] = array('nome' => mb_substr((string)$i['nome'], 0, 120), 'padrao' => !empty($i['padrao']));
        }
        $versao = mb_substr((string)imp_g($p, 'versao', ''), 0, 20);
        imp_tx(imp_arq_disp($loja), array('dispositivos' => array()), function (&$d) use ($disp, $imps, $versao) {
            if (!isset($d['dispositivos'][$disp])) return;
            $d['dispositivos'][$disp]['vistoEm'] = date('c');
            $d['dispositivos'][$disp]['impressoras'] = $imps;
            if ($versao !== '') $d['dispositivos'][$disp]['versao'] = $versao;
        });
        // trabalhos deste computador: novos, ou entregues ha mais de 60 s sem resposta
        $falhou = array();
        $jobs = imp_tx(imp_arq_fila($loja), array(), function (&$f) use ($disp, &$falhou) {
            $r = array(); $agora = time();
            foreach ($f as &$j) {
                if (imp_g($j, 'disp') !== $disp) continue;
                $st = imp_g($j, 'status');
                $velho = $st === 'enviado' && $agora - strtotime($j['enviadoEm']) > IMP_REENVIA_S;
                if ($velho && $j['tentativas'] >= IMP_TENTATIVAS) { $j['status'] = 'erro'; $j['erro'] = 'O computador não respondeu.'; $j['fimEm'] = date('c'); $falhou[] = $j; continue; }
                if ($st !== 'pendente' && !$velho) continue;
                if (count($r) >= 5) break;
                $j['status'] = 'enviado'; $j['enviadoEm'] = date('c'); $j['tentativas']++;
                $r[] = array('id' => $j['id'], 'impressora' => $j['nomeImpressora'], 'tipo' => $j['tipo'], 'papel' => $j['papel'], 'letra' => $j['letra'], 'vias' => $j['vias'], 'titulo' => $j['titulo'], 'linhas' => $j['linhas']);
            }
            unset($j);
            return $r;
        });
        foreach ($falhou as $j) imp_alerta($loja, 'imp-' . $j['id'], 'Impressão falhou', $j['titulo'] . ' na ' . $j['nomeImpressora'] . ': ' . $j['erro']);
        $cfg = imp_cfg($db['lojas'][$loja]['config']);
        $minhas = array();
        foreach ($cfg['impressoras'] as $im) if (imp_g($im, 'disp') === $disp) $minhas[] = array('nome' => imp_g($im, 'nome'), 'ativa' => !!imp_g($im, 'ativa'), 'tipo' => imp_g($im, 'tipo'), 'modelo' => imp_g($im, 'modelo'), 'vias' => imp_g($im, 'vias'), 'papel' => imp_g($im, 'papel'));
        out(200, array('ok' => true, 'loja' => $loja, 'nomeLoja' => isset($db['lojas'][$loja]['nome']) ? $db['lojas'][$loja]['nome'] : $loja,
            'auto' => $cfg['auto'], 'impressoras' => $minhas, 'trabalhos' => $jobs, 'app' => imp_versao_app(), 'agora' => date('c')));
    }

    if ($action === 'imp_resultado') {
        $id = (string)imp_g($p, 'id', ''); $ok = !empty($p['ok']); $erro = mb_substr(trim((string)imp_g($p, 'erro', '')), 0, 300);
        $j = imp_tx(imp_arq_fila($loja), array(), function (&$f) use ($disp, $id, $ok, $erro) {
            foreach ($f as &$x) {
                if (imp_g($x, 'id') !== $id || imp_g($x, 'disp') !== $disp) continue;
                $x['status'] = $ok ? 'impresso' : 'erro'; $x['fimEm'] = date('c');
                if (!$ok) $x['erro'] = $erro ?: 'Erro na impressora.'; else unset($x['erro']);
                return $x;
            }
            return null;
        });
        if ($j && !$ok) imp_alerta($loja, 'imp-' . $j['id'], 'Impressão falhou', $j['titulo'] . ' na ' . $j['nomeImpressora'] . ': ' . $j['erro']);
        out(200, array('ok' => true));
    }
    falha(404, 'not_found');
}

// ------------------------------------------------------------------ painel (com sessao)
function imp_rotas_painel($action, $method, $eu, $db) {
    $vis = function ($j) { unset($j['linhas']); return $j; };
    if ($action === 'impressao' && $method === 'GET') {
        $loja = isset($_GET['loja']) ? (string)$_GET['loja'] : '';
        exige($eu, $db, $loja, 'ver');
        imp_vigia($loja);
        $fila = array_map($vis, array_slice(json_read(imp_arq_fila($loja), array()), -40));
        out(200, array('ok' => true, 'dispositivos' => imp_dispositivos_publicos($loja), 'config' => imp_cfg($db['lojas'][$loja]['config']),
            'fila' => array_reverse($fila), 'app' => imp_versao_app(), 'agora' => date('c')));
    }
    if ($method !== 'POST') return;
    $d = corpo();
    $loja = isset($d['loja']) ? (string)$d['loja'] : '';

    if ($action === 'imp_codigo') {
        exige($eu, $db, $loja, 'horario');
        $cod = imp_tx(imp_arq_codigos(), array(), function (&$cs) use ($loja, $eu) {
            $agora = time(); $usados = array();
            foreach ($cs as $k => $c) { if ($c['expira'] < $agora || $c['loja'] === $loja) unset($cs[$k]); else $usados[$c['codigo']] = 1; }
            do { $n = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT); } while (isset($usados[$n]));
            $cs = array_values($cs);
            $cs[] = array('codigo' => $n, 'loja' => $loja, 'expira' => $agora + 600, 'por' => $eu['email']);
            return $n;
        });
        out(200, array('ok' => true, 'codigo' => $cod, 'expiraEm' => date('c', time() + 600)));
    }
    if ($action === 'imp_remover') {
        exige($eu, $db, $loja, 'horario');
        $id = (string)imp_g($d, 'id', '');
        $nome = imp_tx(imp_arq_disp($loja), array('dispositivos' => array()), function (&$x) use ($id) {
            if (!isset($x['dispositivos'][$id])) return null;
            $n = $x['dispositivos'][$id]['nome']; unset($x['dispositivos'][$id]); return $n;
        });
        if ($nome === null) falha(404, 'Computador não encontrado.');
        db_tx(function (&$db) use ($eu, $loja, $id, $nome) {
            $c = &cfg_de($db, $loja);
            if (isset($c['impressao']['impressoras'])) $c['impressao']['impressoras'] = array_values(array_filter($c['impressao']['impressoras'], function ($i) use ($id) { return imp_g($i, 'disp') !== $id; }));
            db_log($db, $eu['email'], $loja, 'desconectou um computador de impressão', $nome);
        });
        out(200, array('ok' => true));
    }
    if ($action === 'imp_config') {
        exige($eu, $db, $loja, 'horario');
        $disp = json_read(imp_arq_disp($loja), array('dispositivos' => array()));
        $lista = array();
        foreach (array_slice((array)imp_g($d, 'impressoras', array()), 0, 30) as $i) {
            if (!is_array($i) || !isset($disp['dispositivos'][imp_g($i, 'disp')])) continue;
            $nome = mb_substr(trim((string)imp_g($i, 'nome', '')), 0, 120);
            if ($nome === '') continue;
            $lista[] = array('id' => preg_match('/^[a-f0-9]{12}$/', (string)imp_g($i, 'id')) ? $i['id'] : novo_id(), 'disp' => $i['disp'], 'nome' => $nome,
                'ativa' => !empty($i['ativa']), 'tipo' => imp_g($i, 'tipo') === 'comum' ? 'comum' : 'termica',
                'modelo' => imp_g($i, 'modelo') === 'cozinha' ? 'cozinha' : 'completa', 'vias' => max(1, min(3, (int)imp_g($i, 'vias', 1))),
                'papel' => (int)imp_g($i, 'papel') === 58 ? 58 : 80);
        }
        $auto = !empty($d['auto']);
        db_tx(function (&$db) use ($eu, $loja, $lista, $auto) {
            $c = &cfg_de($db, $loja);
            $c['impressao'] = array('auto' => $auto, 'impressoras' => $lista, 'atualizadoEm' => date('c'), 'atualizadoPor' => $eu['email']);
            $at = array(); foreach ($lista as $i) if ($i['ativa']) $at[] = $i['nome'];
            db_log($db, $eu['email'], $loja, 'mudou as impressoras', ($at ? implode(', ', $at) : 'nenhuma ativa') . ($auto ? ' · imprime sozinho' : ''));
        });
        out(200, array('ok' => true, 'impressoras' => $lista));
    }
    if ($action === 'imprimir') {
        exige($eu, $db, $loja, 'ver');
        $cfgLoja = $db['lojas'][$loja]['config'];
        $so = imp_g($d, 'impressora') ? (string)$d['impressora'] : null;
        $cm = null;
        if (is_array(imp_g($d, 'comanda')) && pode($eu, $loja, 'horario')) $cm = array_merge(imp_cfg_comanda($cfgLoja), $d['comanda']);
        $pid = null;
        if (imp_g($d, 'reimprimir')) {
            // copia de um trabalho que ja foi (mesmas linhas)
            $rid = (string)$d['reimprimir'];
            $n = imp_tx(imp_arq_fila($loja), array(), function (&$f) use ($rid, $eu) {
                foreach ($f as $x) if (imp_g($x, 'id') === $rid) {
                    $x['id'] = novo_id(); $x['em'] = date('c'); $x['status'] = 'pendente'; $x['tentativas'] = 0; $x['origem'] = 'painel'; $x['por'] = $eu['email'];
                    unset($x['erro'], $x['enviadoEm'], $x['fimEm']);
                    $f[] = $x; return 1;
                }
                return 0;
            });
            if (!$n) falha(404, 'Impressão não encontrada.');
            out(200, array('ok' => true, 'trabalhos' => 1));
        }
        if (imp_g($d, 'pedido')) {
            $pid = (string)$d['pedido']; $ped = null;
            foreach (json_read(data_dir() . '/pedidos-' . $loja . '.json', array()) as $x) if (imp_g($x, 'id') === $pid) $ped = $x;
            if (!$ped) falha(404, 'Pedido não encontrado.');
            $pc = imp_pedido_comanda($ped, $cfgLoja);
        } else {
            $pc = imp_pedido_exemplo($cfgLoja);
        }
        $n = imp_enfileira($db, $loja, $pc, imp_g($d, 'pedido') ? 'painel' : 'teste', $eu['email'], $so, $cm, $pid);
        if (!$n) falha(409, 'sem_impressora');
        out(200, array('ok' => true, 'trabalhos' => $n));
    }
}
