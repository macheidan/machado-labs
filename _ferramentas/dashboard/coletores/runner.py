#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Runner do dashboard. Roda os coletores, consolida tudo em dashboard-data.json
(no formato que o front consome) e publica via FTPS no HostGator.

A coleta roda na máquina de casa (Task Scheduler, 03h). O JSON tem faturamento,
então NUNCA vai pro git (repo público) — sobe direto por FTP pra /dashboard.

Uso:
  python runner.py                 # coleta tudo, consolida e envia
  python runner.py --so-consolida  # não roda coletores, só junta os .json e envia
  python runner.py --sem-envio     # roda e consolida, mas não envia (debug)
  python runner.py --headless      # vendas (Saipos) em modo headless
"""

import sys
import json
import ssl
import argparse
import subprocess
import urllib.parse
import urllib.request
from ftplib import FTP_TLS
from pathlib import Path
from datetime import datetime, date

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent      # _ferramentas/dashboard
COL  = Path(__file__).parent                         # coletores
DATA = ROOT / "data"
CFG  = COL / "config.json"

MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
         "agosto", "setembro", "outubro", "novembro", "dezembro"]
MES3  = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
SEM   = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]


def log(m):
    print(m, flush=True)


def run(script, *extra, timeout=900):
    cmd = [sys.executable, str(COL / script), *extra]
    log(f"\n▶ {script} {' '.join(extra)}".rstrip())
    try:
        r = subprocess.run(cmd, cwd=str(COL), timeout=timeout)
        ok = r.returncode == 0
        log(f"  {'✓' if ok else '✗ rc=' + str(r.returncode)} {script}")
        return ok
    except Exception as e:
        log(f"  ✗ {script}: {type(e).__name__} {e}")
        return False


def jload(name, default=None):
    f = DATA / name
    if f.exists():
        try:
            return json.loads(f.read_text(encoding="utf-8"))
        except Exception:
            pass
    return default


# ── tradução pt-BR (cache em disco; best-effort, mantém original se falhar) ────
TRAD_CACHE_F = DATA / "_trad_cache.json"
_trad = None


def _trad_load():
    global _trad
    if _trad is None:
        _trad = jload("_trad_cache.json", {}) or {}
    return _trad


def _trad_save():
    if _trad is not None:
        try:
            TRAD_CACHE_F.write_text(json.dumps(_trad, ensure_ascii=False),
                                    encoding="utf-8")
        except Exception:
            pass


def traduzir(txt):
    """en→pt-BR via endpoint público do Google Translate (sem key)."""
    txt = (txt or "").strip()
    if not txt:
        return txt
    cache = _trad_load()
    if txt in cache:
        return cache[txt]
    try:
        q = urllib.parse.quote(txt)
        url = ("https://translate.googleapis.com/translate_a/single"
               f"?client=gtx&sl=auto&tl=pt-BR&dt=t&q={q}")
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        data = json.loads(urllib.request.urlopen(req, timeout=15).read())
        out = "".join(seg[0] for seg in data[0] if seg and seg[0]).strip()
        if out:
            cache[txt] = out
            return out
    except Exception as e:
        log(f"  [trad] {type(e).__name__} em: {txt[:40]}")
    return txt


def encurtar(t, n=200):
    """Corta no limite de palavra, ~n caracteres."""
    t = (t or "").strip()
    if len(t) <= n:
        return t
    corte = t[:n].rsplit(" ", 1)[0].rstrip(",.;:- ")
    return corte + "…"


# ── consolidação ─────────────────────────────────────────────────────────────
def topbar(extras):
    hoje = date.today()
    dia = f"{SEM[hoje.weekday()].capitalize()}, {hoje.day} de {MESES[hoje.month - 1]}"
    cot = (extras or {}).get("cotacoes", {})
    return {
        "dia": dia,
        "clima": (extras or {}).get("clima"),
        "usd": cot.get("usd"),
        "btc": cot.get("btc"),
    }


def fmt_dow(data_iso, dow):
    try:
        d = date.fromisoformat(data_iso)
        return f"{dow}, {d.day} {MES3[d.month - 1]}"
    except Exception:
        return dow


def atualizar_vendas():
    """Mantém histórico de 7 dias em vendas_hist.json e devolve no formato do front."""
    hist = jload("vendas_hist.json", []) or []
    hoje = jload("vendas.json")
    if hoje and hoje.get("lojas"):
        hist = [h for h in hist if h.get("data") != hoje.get("data")]
        hist.append({"data": hoje["data"], "dow": hoje.get("dow", ""), "lojas": hoje["lojas"]})
    hist.sort(key=lambda h: h.get("data", ""), reverse=True)
    hist = hist[:7]
    (DATA / "vendas_hist.json").write_text(
        json.dumps(hist, ensure_ascii=False, indent=2), encoding="utf-8")

    def arr(lj):
        return [round(lj.get("valor") or 0), lj.get("pizzas") or 0, lj.get("pedidos") or 0]

    sales = []
    for h in hist:
        lojas = h.get("lojas", {})
        sales.append({
            "dow":  fmt_dow(h.get("data", ""), h.get("dow", "")),
            "dame": arr(lojas.get("DAME", {})),
            "lov":  arr(lojas.get("LOV", {})),
        })
    return sales


def cls_ia(cat):
    c = (cat or "").lower()
    if "claude" in c:  return "claude"
    if "gpt" in c:     return "gpt"
    if "gemini" in c:  return "gemini"
    if "open" in c:    return "open"
    return "gen"


def map_news(itens, cls):
    out = []
    for x in itens or []:
        cat = x.get("cat", "")
        out.append({
            "resumo": encurtar(traduzir(x.get("resumo_raw", "")[:900]), 600),
            "t":    traduzir(x.get("titulo", "")),
            "url":  x.get("url", "#"),
            "img":  x.get("img", ""),
            "src":  x.get("fonte", ""),
            "data": x.get("data", ""),
            "cat":  cat,
            "c":    cls(cat),
        })
    return out


def map_agenda(ag):
    return [{"data": e.get("data", ""), "h": e.get("h", ""), "d": e.get("d", "")}
            for e in (ag or {}).get("eventos", [])]


def map_proj(pj):
    return [{"n": p.get("nome", ""), "quando": p.get("quando", "")}
            for p in (pj or {}).get("projetos", [])]


def map_gh(news):
    gh = (news or {}).get("github", {})

    def lista(per):
        return [{"r": g.get("repo", ""), "d": encurtar(traduzir(g.get("desc", "")), 135),
                 "lang": g.get("lang", ""), "s": g.get("stars", "")}
                for g in gh.get(per, [])]

    return {"day": lista("day"), "week": lista("week"), "month": lista("month")}


def map_newsletters(nl):
    """Newsletters de IA lidas do Gmail (uma linha por edição)."""
    out = []
    for x in (nl or {}).get("itens", []):
        out.append({
            "i":      "ti-mail",
            "n":      x.get("fonte", ""),
            "s":      "newsletter",
            "h":      traduzir(x.get("titulo", "")),
            "resumo": encurtar(traduzir(x.get("resumo_raw", "")[:900]), 600),
            "url":    x.get("url", "#"),
            "data":   x.get("data", ""),
            "b":      "",
        })
    return out


def map_feeds(fd):
    """Fila priorizada do harvester (painel Fontes & feeds de IA)."""
    campos = ("url", "n", "s", "i", "cat", "data", "b", "img")
    out = []
    for x in (fd or {}).get("itens", []):
        item = {k: x.get(k, "") for k in campos}
        item["h"] = traduzir(x.get("h", ""))
        item["resumo"] = encurtar(traduzir(x.get("resumo_raw", "")[:900]), 600)
        out.append(item)
    return out


def consolidar():
    extras = jload("extras.json", {})
    news   = jload("news.json", {})
    data = {
        "gerado_em": datetime.now().isoformat(timespec="seconds"),
        "topbar":   topbar(extras),
        "sales":    atualizar_vendas(),
        "agenda":   map_agenda(jload("agenda.json", {})),
        "projects": map_proj(jload("projetos.json", {})),
        "ai":       map_news(news.get("ia"), cls_ia),
        "global":   map_news(news.get("global"), lambda c: "pos"),
        "biz":      map_news(news.get("biz"), lambda c: "biz"),
        "github":   map_gh(news),
        "feeds":    map_feeds(jload("feeds.json", {})),
        "newsletters": map_newsletters(jload("newsletters.json", {})),
    }
    _trad_save()
    out = DATA / "dashboard-data.json"
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"\n✓ {out.name}  ({out.stat().st_size} bytes) — "
        f"{len(data['ai'])} IA · {len(data['feeds'])} feeds · "
        f"{len(data['newsletters'])} newsletters · "
        f"{len(data['sales'])} dias de venda")
    return out


# ── envio FTPS ───────────────────────────────────────────────────────────────
def enviar(arquivo, cfg):
    srv = cfg.get("ftp_server")
    usr = cfg.get("ftp_user")
    pwd = cfg.get("ftp_pass")
    dst = cfg.get("ftp_dir", "/dashboard")
    if not (srv and usr and pwd):
        log("\n[AVISO] credenciais FTP ausentes no config.json "
            "(ftp_server / ftp_user / ftp_pass). JSON gravado local, não enviado.")
        return False
    ctx = ssl._create_unverified_context()        # security: loose (igual ao deploy)
    log(f"\n▶ FTPS {usr}@{srv}  ->  {dst}/{arquivo.name}")
    try:
        ftps = FTP_TLS(context=ctx)
        ftps.connect(srv, int(cfg.get("ftp_port", 21)), timeout=40)
        ftps.login(usr, pwd)
        ftps.prot_p()
        try:
            ftps.cwd(dst)
        except Exception:
            ftps.mkd(dst)
            ftps.cwd(dst)
        with open(arquivo, "rb") as f:
            ftps.storbinary(f"STOR {arquivo.name}", f)
        ftps.quit()
        log("  ✓ enviado")
        return True
    except Exception as e:
        log(f"  ✗ falha no envio: {type(e).__name__} {e}")
        return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--so-consolida", dest="so_consolida", action="store_true")
    ap.add_argument("--sem-envio", dest="sem_envio", action="store_true")
    ap.add_argument("--headless", action="store_true")
    a = ap.parse_args()

    DATA.mkdir(exist_ok=True)
    cfg = json.loads(CFG.read_text(encoding="utf-8")) if CFG.exists() else {}

    log(f"=== runner do dashboard — {datetime.now():%Y-%m-%d %H:%M} ===")
    if not a.so_consolida:
        run("extras.py")
        run("projetos.py")
        run("agenda.py")
        run("news.py")
        run("harvester.py")
        run("newsletters.py")
        # Saipos é o único que abre browser e pode travar; timeout curto p/ falhar
        # rápido (5 min) em vez de segurar o runner por 15 min.
        run("saipos_vendas.py", *(["--headless"] if a.headless else []), timeout=300)

    arq = consolidar()
    if not a.sem_envio:
        enviar(arq, cfg)
    log("\n== fim ==")


if __name__ == "__main__":
    main()
