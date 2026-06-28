#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Watcher de vendas sob demanda. Fica de olho na fila do dashboard
(vendas_req.php no HostGator): quando o Fábio aperta "atualizar vendas" no
dashboard (entre 18h e 24h), chega um pedido aqui; o watcher coleta o Saipos
do DIA, reconsolida e republica o JSON, e marca o pedido como concluído.

Fluxo por ciclo:
  GET  dash/vendas_req.php           -> {req, done}
  se req > done:
    python saipos_vendas.py --dia HOJE --headless   (grava vendas.json)
    python runner.py --so-consolida                 (mescla hist + sobe JSON via FTP)
    POST dash/vendas_req.php {act:done, msg}

Só stdlib (urllib). Reusa a basic auth da pasta /dashboard.

Config (config.json), além do que o runner já usa:
  "dash_base": "https://fabiomachado.com.br/dashboard",
  "dash_user": "<usuario da basic auth .htpasswd>",
  "dash_pass": "<senha da basic auth>"

Uso:
  python vendas_watch.py                 # loop, checa a cada 6s (Ctrl+C pra sair)
  python vendas_watch.py --once          # checa uma vez e sai (pra Agendador a cada 1min)
  python vendas_watch.py --intervalo 10  # loop com outro intervalo
  python vendas_watch.py --dia 2026-06-28  # força um dia específico ao coletar
"""

import sys
import json
import time
import base64
import argparse
import subprocess
import urllib.request
import urllib.error
from pathlib import Path
from datetime import date, datetime

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = Path(__file__).resolve().parent
CFG_FILE = AQUI / "config.json"


def log(msg):
    print(f"[{datetime.now():%H:%M:%S}] {msg}", flush=True)


def cfg():
    return json.loads(CFG_FILE.read_text(encoding="utf-8")) if CFG_FILE.exists() else {}


def _auth_header(c):
    u, p = c.get("dash_user", ""), c.get("dash_pass", "")
    if not u:
        return {}
    tok = base64.b64encode(f"{u}:{p}".encode("utf-8")).decode("ascii")
    return {"Authorization": "Basic " + tok}


def _url(c):
    base = (c.get("dash_base") or "").rstrip("/")
    if not base:
        raise SystemExit("[ERRO] falta 'dash_base' no config.json (ex: https://fabiomachado.com.br/dashboard)")
    return base + "/vendas_req.php"


def ler_fila(c):
    req = urllib.request.Request(_url(c) + "?t=" + str(int(time.time())), headers=_auth_header(c))
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def marcar_done(c, msg=""):
    body = json.dumps({"act": "done", "msg": msg}).encode("utf-8")
    h = {"Content-Type": "application/json", **_auth_header(c)}
    req = urllib.request.Request(_url(c), data=body, headers=h, method="POST")
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def coletar(dia):
    """Roda o coletor do Saipos pro dia e reconsolida+publica. Devolve (ok, msg)."""
    py = sys.executable
    try:
        log(f"coletando Saipos do dia {dia} ...")
        r1 = subprocess.run([py, str(AQUI / "saipos_vendas.py"), "--dia", dia, "--headless"],
                            cwd=str(AQUI), timeout=600)
        if r1.returncode != 0:
            return False, f"saipos rc={r1.returncode}"
        log("consolidando e publicando ...")
        r2 = subprocess.run([py, str(AQUI / "runner.py"), "--so-consolida"],
                            cwd=str(AQUI), timeout=300)
        if r2.returncode != 0:
            return False, f"runner rc={r2.returncode}"
        return True, "ok"
    except subprocess.TimeoutExpired:
        return False, "timeout"
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"


def ciclo(c, dia_forcado=None):
    """Um check: se há pedido pendente, coleta. Devolve True se processou."""
    try:
        fila = ler_fila(c)
    except urllib.error.HTTPError as e:
        log(f"fila HTTP {e.code} (basic auth? dash_user/dash_pass)"); return False
    except Exception as e:
        log(f"fila indisponível: {type(e).__name__}"); return False

    req, done = int(fila.get("req", 0)), int(fila.get("done", 0))
    if req <= done:
        return False

    log(f"pedido pendente (req={req} > done={done})")
    dia = dia_forcado or date.today().isoformat()
    ok, msg = coletar(dia)
    try:
        marcar_done(c, ("ok " if ok else "erro ") + dia + (("" if ok else " " + msg)))
    except Exception as e:
        log(f"falha ao marcar done: {type(e).__name__}")
    log(("✓ atualizado: " if ok else "✗ falhou: ") + msg)
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--once", action="store_true", help="checa uma vez e sai")
    ap.add_argument("--intervalo", type=int, default=6, help="segundos entre checks no modo loop")
    ap.add_argument("--dia", default=None, help="força um dia (YYYY-MM-DD) ao coletar")
    a = ap.parse_args()
    c = cfg()

    if a.once:
        ciclo(c, a.dia)
        return

    log(f"watcher de vendas no ar — checando a cada {a.intervalo}s (Ctrl+C pra sair)")
    try:
        while True:
            ciclo(c, a.dia)
            time.sleep(a.intervalo)
    except KeyboardInterrupt:
        log("encerrado")


if __name__ == "__main__":
    main()
