#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Coletor de YouTube do /v3. Usa o RSS público de cada canal (SEM API key):
  https://www.youtube.com/feeds/videos.xml?channel_id=UC...
Pega os últimos vídeos (título, link, thumbnail estável i.ytimg.com, data).

Grava data/youtube.json: [{canal, cat, titulo, url, vid, thumb, data}]

Config: edite CANAIS abaixo. Aceita channel_id (UC...) direto OU "@handle"
(resolvido na hora pela página do canal). channel_id é mais rápido/robusto.

Uso:  python youtube.py
"""

import re
import sys
import json
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
UA = {"User-Agent": "Mozilla/5.0 (machado-dashboard)"}
YT = "{http://www.youtube.com/xml/schemas/2015}"
MEDIA = "{http://search.yahoo.com/mrss/}"
ATOM = "{http://www.w3.org/2005/Atom}"

# 🎛️ CANAIS — troque pelos seus. (nome exibido, channel_id ou @handle, categoria)
CANAIS = [
    ("Two Minute Papers", "UCbfYPyITQ-7l4upoX8nvctg", "Pesquisa"),
    ("Matt Wolfe",        "UChpleBmo18P08aKCIgti38g", "Ferramentas"),
    ("AI Explained",      "UCNJ1Ymd5yFuUPtn21xtRbbw", "Fundo"),
    ("Matthew Berman",    "UCawZsQWqfGSbCI5yjkdVkTA", "IA"),
    ("AICodeKing",        "UC0m81bQuthaQZmFbXEY9QSw", "Dev"),
    ("Fireship",          "UCsBjURrPoezykLs9EqgamOA", "Dev"),
    ("Y Combinator",      "UCcefcZRL2oaA_uBNeo5UOWg", "Startups"),
    ("Flow Podcast",      "UC4ncvgh5hFr5O83MH7-jRJg", "Podcast"),
]

POR_CANAL = 10     # quantos vídeos por canal (RSS traz ~15)
TOTAL = 40         # teto final (frontend pagina de 10 em 10)

# 🎯 INTERESSES — vídeos cujo título bate aqui sobem pro topo (edite à vontade)
INTERESSES = [
    "claude", "anthropic", "gpt", "openai", "gemini", "llm", "agent", "agente",
    "automation", "automação", "ai ", " ia ", "artificial intelligence",
    "startup", "business", "negócio", "empreend", "saas", "small business",
    "restaurant", "food", "delivery", "pme",
]


def get(url, timeout=20):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read()


# ── shorts ───────────────────────────────────────────────────────────────────
# O RSS não marca shorts. Teste: youtube.com/shorts/<vid> mantém a URL para
# shorts e redireciona para /watch em vídeo normal. Cache para não re-testar.
_SHORTS_CACHE = DATA_DIR / "_yt_shorts_cache.json"


def _cache_load():
    try:
        return json.loads(_SHORTS_CACHE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def is_short(vid, cache):
    if vid in cache:
        return cache[vid]
    short = False
    try:
        req = urllib.request.Request(
            f"https://www.youtube.com/shorts/{vid}", headers=UA, method="HEAD")
        with urllib.request.urlopen(req, timeout=15) as r:
            short = "/shorts/" in r.geturl()
    except Exception:
        pass  # na dúvida, deixa passar
    cache[vid] = short
    return short


def resolve_id(handle):
    """@handle/URL -> channel_id (UC...). Best-effort pela página do canal."""
    if handle.startswith("UC") and len(handle) >= 22:
        return handle
    url = handle if handle.startswith("http") else f"https://www.youtube.com/{handle.lstrip('/')}"
    try:
        html = get(url).decode("utf-8", "replace")
    except Exception:
        return ""
    m = re.search(r'"externalId":"(UC[\w-]{20,26})"', html) or \
        re.search(r'youtube\.com/channel/(UC[\w-]{20,26})', html)
    return m.group(1) if m else ""


def feed(channel_id, n):
    url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
    root = ET.fromstring(get(url))
    out = []
    for e in root.findall(ATOM + "entry")[:n]:
        vid = (e.findtext(YT + "videoId") or "").strip()
        titulo = (e.findtext(ATOM + "title") or "").strip()
        data = (e.findtext(ATOM + "published") or "").strip()
        thumb = ""
        grp = e.find(MEDIA + "group")
        if grp is not None:
            th = grp.find(MEDIA + "thumbnail")
            if th is not None:
                thumb = th.get("url", "")
        if vid and titulo:
            out.append({
                "vid": vid,
                "titulo": titulo,
                "url": f"https://www.youtube.com/watch?v={vid}",
                # thumb estável e hotlinkável (não expira):
                "thumb": thumb or f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
                "data": data,
            })
    return out


def interessa(titulo):
    t = f" {titulo.lower()} "
    return any(k in t for k in INTERESSES)


def main():
    DATA_DIR.mkdir(exist_ok=True)
    cache = _cache_load()
    itens = []
    for nome, ref, cat in CANAIS:
        cid = resolve_id(ref)
        if not cid:
            print(f"  [{nome}] não resolveu '{ref}'")
            continue
        try:
            n_shorts = 0
            for v in feed(cid, POR_CANAL):
                if "#short" in v["titulo"].lower() or is_short(v["vid"], cache):
                    n_shorts += 1
                    continue
                v["canal"], v["cat"] = nome, cat
                itens.append(v)
            print(f"  [{nome}] ok ({cid})" + (f" — {n_shorts} shorts fora" if n_shorts else ""))
        except Exception as e:
            print(f"  [{nome}] {type(e).__name__}")
    try:
        _SHORTS_CACHE.write_text(json.dumps(cache), encoding="utf-8")
    except Exception:
        pass
    # interesses primeiro, depois o resto; recente primeiro dentro de cada grupo
    itens.sort(key=lambda x: (interessa(x["titulo"]), x.get("data", "")), reverse=True)
    itens = itens[:TOTAL]
    out = DATA_DIR / "youtube.json"
    out.write_text(json.dumps({"gerado_em": datetime.now().isoformat(timespec="seconds"),
                               "itens": itens}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n✓ youtube.json — {len(itens)} vídeos")
    for x in itens[:8]:
        print(f"  [{x['canal']:<18}] {x['titulo'][:54]}")


if __name__ == "__main__":
    main()
