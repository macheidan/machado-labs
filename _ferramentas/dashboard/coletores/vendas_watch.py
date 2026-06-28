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

Só stdlib. A FILA é lida/marcada via FTP (reusa ftp_server/ftp_user/ftp_pass
que o runner já usa) — NÃO precisa de credencial extra. O navegador é quem
escreve o pedido (req) pelo vendas_req.php; o watcher lê e marca done por FTP.

Uso:
  python vendas_watch.py                 # loop, checa a cada 6s (Ctrl+C pra sair)
  python vendas_watch.py --once          # checa uma vez e sai (pra Agendador a cada 1min)
  python vendas_watch.py --intervalo 10  # loop com outro intervalo
  python vendas_watch.py --dia 2026-06-28  # força um dia específico ao coletar
"""

import io
import sys
import ssl
import json
import time
import argparse
import subprocess
from ftplib import FTP_TLS
from pathlib import Path
from datetime import date, datetime

QUEUE = "vendas_req.json"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = Path(__file__).resolve().parent
CFG_FILE = AQUI / "config.json"


def log(msg):
    print(f"[{datetime.now():%H:%M:%S}] {msg}", flush=True)


def cfg():
    return json.loads(CFG_FILE.read_text(encoding="utf-8")) if CFG_FILE.exists() else {}


def _ftp(c):
    srv, usr, pwd = c.get("ftp_server"), c.get("ftp_user"), c.get("ftp_pass")
    if not (srv and usr and pwd):
        raise SystemExit("[ERRO] faltam credenciais FTP no config.json (ftp_server/ftp_user/ftp_pass)")
    ctx = ssl._create_unverified_context()
    f = FTP_TLS(context=ctx)
    f.connect(srv, int(c.get("ftp_port", 21)), timeout=40)
    f.login(usr, pwd)
    f.prot_p()
    f.cwd(c.get("ftp_dir", "/dashboard"))
    return f


def _baixar_fila(f):
    if QUEUE not in f.nlst():
        return {"req": 0, "done": 0, "msg": "", "at": ""}
    buf = io.BytesIO()
    f.retrbinary("RETR " + QUEUE, buf.write)
    j = json.loads(buf.getvalue().decode("utf-8", "replace") or "{}")
    return j if isinstance(j, dict) else {"req": 0, "done": 0}


def ler_fila(c):
    f = _ftp(c)
    try:
        return _baixar_fila(f)
    finally:
        f.quit()


def marcar_done(c, msg=""):
    f = _ftp(c)
    try:
        st = _baixar_fila(f)               # read-modify-write: preserva req
        st["done"] = int(time.time())
        st["msg"] = (msg or "")[:200]
        st["at"] = datetime.now().isoformat(timespec="seconds")
        data = json.dumps(st, ensure_ascii=False).encode("utf-8")
        f.storbinary("STOR " + QUEUE, io.BytesIO(data))
        return st
    finally:
        f.quit()


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
    except Exception as e:
        log(f"fila indisponível (FTP): {type(e).__name__}: {e}"); return False

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
