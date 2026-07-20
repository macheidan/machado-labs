#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Coletor de vendas diárias do Saipos para o dashboard pessoal.

Enxuto e autocontido: reusa a SESSÃO já logada do dre-ai (browser profile),
extrai do dia anterior por marca o valor vendido, total de pizzas e total de
pedidos, e grava em data/vendas.json. Sem Google Sheets, sem export Excel.

Valor e pedidos: relatório sales-by-period.
Pizzas: relatório store-item-sold, lido direto do scope AngularJS (vm.itemsResult
e vm.choicesResult), aplicando as regras do Fábio:
  - soma a quantidade dos produtos, desconsiderando bebidas (por categoria);
  - promoções de 2 pizzas / pizza em dobro contam x2;
  - soma a opção "Pequena Combo" pelos filhos, descontando "Nenhum".

Uso:
  python saipos_vendas.py                       # ontem, grava vendas.json
  python saipos_vendas.py --dia 2026-06-21
  python saipos_vendas.py --descobrir           # dump do sales-by-period (DAME)
  python saipos_vendas.py --descobrir-itens --loja LOV   # dump do scope -> data/_scope_LOV.json
  python saipos_vendas.py --testar-pizzas --loja DAME    # calcula pizzas do _scope salvo (offline)

Config: copie config.example.json para config.json. Por padrão aponta para o
profile já logado do dre-ai. Se cair no login, reusa o saipos_config.json do
dre-ai via "creds_from".
"""

import sys
import re
import os
import json
import argparse
from pathlib import Path
from datetime import date, datetime, timedelta

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT     = Path(__file__).resolve().parent.parent      # _ferramentas/dashboard
DATA_DIR = ROOT / "data"
CFG_FILE = Path(__file__).parent / "config.json"

SAIPOS_URL    = "https://conta.saipos.com"
SAIPOS_REPORT = "https://conta.saipos.com/#/app/report/sales-by-period"
SAIPOS_ITENS  = "https://conta.saipos.com/#/app/report/store-item-sold"

DOW_PT = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]

# Rótulos do sales-by-period (confirmados via --descobrir 2026-06-21)
LBL_VALOR   = ["Total dos pedidos"]                # != "Qtde total de pedidos"
LBL_PEDIDOS = ["Qtde total de pedidos", "Quantidade total de pedidos"]

# Regras de contagem de pizzas (configuráveis no config.json)
DEF_BEBIDAS_CAT = ["bebidas", "vinhos"]            # categorias desconsideradas
DEF_BEBIDAS_KW  = ["coca", "fruki", "água", "agua", "guaran", "sprite", "fanta",
                   "suco", "heineken", "corona", "stella", "brahma", "skol",
                   "cerveja", "vinho", "red bull", "monster", "h2o"]  # fallback s/ categoria
DEF_OPCOES_PIZZA  = ["pequena combo"]              # opções cujos filhos (≠ Nenhum) são pizzas
DEF_IGNORAR_FILHO = ["nenhum"]
DEF_DOBRO = ["em dobro", "2 pizzas", "pizza em dobro"]


def load_cfg():
    if not CFG_FILE.exists():
        print("[ERRO] config.json não encontrado. Copie config.example.json.")
        sys.exit(1)
    cfg = json.loads(CFG_FILE.read_text(encoding="utf-8"))
    cfg["profile_dir"] = os.path.expandvars(cfg.get("profile_dir", ""))
    # fallback de credenciais: reusa o saipos_config.json do dre-ai (não duplica a senha)
    if not cfg.get("senha") and cfg.get("creds_from"):
        f = Path(os.path.expandvars(cfg["creds_from"]))
        if f.exists():
            c = json.loads(f.read_text(encoding="utf-8"))
            cfg["email"] = cfg.get("email") or c.get("email", "")
            cfg["senha"] = c.get("senha", "")
    return cfg


# ── sales-by-period: valor e pedidos ─────────────────────────────────────────
def parse_valor_brl(t):
    if not t:
        return None
    s = re.sub(r"[R$\s]", "", str(t)).replace(".", "").replace(",", ".")
    try:
        return float(s)
    except Exception:
        return None


def extrair_valor(page):
    try:
        page.wait_for_function(
            "() => /R\\$\\s*[\\d.,]+/.test(document.body.innerText)", timeout=20000)
    except PWTimeout:
        pass
    texto = page.locator("body").inner_text(timeout=5000)
    for lbl in LBL_VALOR:
        m = re.search(rf"{lbl}[^R$]{{0,80}}(R\$\s*[\d.,]+)", texto, re.IGNORECASE)
        if m:
            return parse_valor_brl(m.group(1))
    vals = re.findall(r"R\$\s*[\d.]+,\d{2}", texto)
    return max((parse_valor_brl(v) for v in vals), default=None)


def extrair_inteiro(page, labels):
    texto = page.locator("body").inner_text(timeout=5000)
    for lbl in labels:
        m = re.search(rf"{lbl}\D{{0,40}}(\d[\d.]*)", texto, re.IGNORECASE)
        if m:
            try:
                return int(m.group(1).replace(".", ""))
            except Exception:
                continue
    return None


def extrair_canais(page):
    """Tabelas CANAL | QTDE | VALOR do sales-by-period (Delivery Direto, iFood,
    Telefone, WhatsApp...). Retorna {nome: {"pedidos": int, "valor": float}}.
    Método do DRE: Site = Delivery Direto, iFood = iFood, Saipos = resto
    (o resto é calculado no front: total - ifood - site)."""
    try:
        texto = page.locator("body").inner_text(timeout=5000)
    except Exception:
        return {}
    i = texto.find("CANAL")
    if i < 0:
        return {}
    j = texto.find("PEDIDO", i)
    trecho = texto[i:j] if j > i else texto[i:]
    canais = {}
    for m in re.finditer(r"^([^\t\n]+)\t(\d[\d.]*)\tR\$\s*([\d.,]+)", trecho, re.MULTILINE):
        nome = m.group(1).strip()
        if not nome or nome.upper() == "CANAL":
            continue
        try:
            canais[nome] = {"pedidos": int(m.group(2).replace(".", "")),
                            "valor": parse_valor_brl(m.group(3))}
        except Exception:
            continue
    return canais


# ── store-item-sold: pizzas via scope AngularJS ──────────────────────────────
JS_SCOPE = r"""() => {
  const el = document.querySelector('[ng-repeat*="choicesResult"]') ||
             document.querySelector('[ng-repeat*="itemsResult"]');
  if (!el) return null;
  const vm = angular.element(el).scope().vm;
  const norm = s => (s || '').trim().toLowerCase();
  const catById = {};
  (vm.categories || []).forEach(c => catById[c.id_store_category_item] = c.desc_store_category_item);
  const catByName = {};
  (vm.storeItems || []).forEach(it => catByName[norm(it.desc_store_item)] = catById[it.id_store_category_item] || '');
  const produtos = (vm.itemsResult || []).map(it => ({
    nome: it.desc_item, qtd: it.total_qtt, cat: catByName[norm(it.desc_item)] || '' }));
  const opcoes = (vm.choicesResult || []).map(c => ({
    nome: c.desc_store_choice, qtd: c.total_qtt,
    filhos: (c.choiceItems || []).map(ci => ({ nome: ci.desc_store_choice_item, qtd: ci.total_qtt })) }));
  return { produtos, opcoes };
}"""


def extrair_scope(page):
    return page.evaluate(JS_SCOPE)


def pizzas_from_scope(d, cfg):
    """Aplica as regras de contagem. Retorna (total, detalhe)."""
    beb_cat = [c.lower() for c in cfg.get("bebidas_cat", DEF_BEBIDAS_CAT)]
    beb_kw  = [k.lower() for k in cfg.get("bebidas_kw", DEF_BEBIDAS_KW)]
    opz     = [o.lower() for o in cfg.get("opcoes_pizza", DEF_OPCOES_PIZZA)]
    ign     = [i.lower() for i in cfg.get("ignorar_filho", DEF_IGNORAR_FILHO)]
    dob     = [x.lower() for x in cfg.get("dobro_kw", DEF_DOBRO)]
    produtos = (d or {}).get("produtos", [])
    opcoes   = (d or {}).get("opcoes", [])

    def eh_bebida(p):
        cat = (p.get("cat") or "").lower()
        if cat:
            return any(b in cat for b in beb_cat)
        return any(k in p["nome"].lower() for k in beb_kw)

    def fator(nome):
        return 2 if any(x in nome.lower() for x in dob) else 1

    det = {"produtos": 0, "combo": 0}
    for p in produtos:
        if not eh_bebida(p):
            det["produtos"] += round(p["qtd"]) * fator(p["nome"])
    for o in opcoes:
        if o["nome"].strip().lower() in opz:
            det["combo"] += sum(round(f["qtd"]) for f in o["filhos"]
                                if f["nome"].strip().lower() not in ign)
    return det["produtos"] + det["combo"], det


def extrair_pizzas(page, cfg, dia):
    abrir_relatorio(page, dia, SAIPOS_ITENS, "store-item-sold")
    page.wait_for_timeout(1500)
    total, _ = pizzas_from_scope(extrair_scope(page), cfg)
    return total


# ── login / loja (reaproveitado do dre-ai, validado) ─────────────────────────
def garantir_login(page, cfg):
    page.goto(SAIPOS_URL, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(2000)
    html = page.content().lower()
    if not ("login" in page.url.lower() or 'type="password"' in html or "esqueceu" in html):
        print("  Já estava logado ✓")
        return
    if not cfg.get("senha"):
        print("  [ERRO] Caiu no login e não há senha (config.json / creds_from).")
        sys.exit(1)
    page.evaluate(f"""(function() {{
        var e=document.querySelector('input[ng-model*="email"], input[type="text"]');
        var s=document.querySelector('input[ng-model*="password"], input[type="password"]');
        if(!e||!s) return;
        function inj(el,v){{el.value=v;el.dispatchEvent(new Event('input',{{bubbles:true}}));el.dispatchEvent(new Event('change',{{bubbles:true}}));}}
        inj(e,{json.dumps(cfg['email'])}); inj(s,{json.dumps(cfg['senha'])});
    }})();""")
    page.wait_for_timeout(600)
    page.locator("button[type='submit']").first.click()
    page.wait_for_timeout(2500)
    try:
        page.wait_for_selector(".confirm", timeout=4000)
        page.evaluate("document.querySelector('.confirm').click()")
        page.wait_for_timeout(2000)
    except PWTimeout:
        pass
    print(f"  Login OK ✓  ({page.url})")


def selecionar_loja(page, loja, idx):
    page.wait_for_timeout(1000)
    try:
        h = page.locator("a.button-header").first.inner_text(timeout=2000).upper()
        if loja.upper() in h:
            print(f"  Já na loja {loja} ✓")
            return
    except Exception:
        pass

    def clicar():
        vis = [b for b in page.locator(".btn-primary.m-b-0").all() if b.is_visible()]
        if vis:
            (vis[idx] if idx < len(vis) else vis[0]).click()
            return True
        return False

    if [b for b in page.locator(".btn-primary.m-b-0").all() if b.is_visible()]:
        clicar(); page.wait_for_timeout(2000); print(f"  Loja {loja} ✓"); return
    try:
        page.locator("a.button-header").first.click(timeout=5000)
        page.wait_for_timeout(1000)
        if clicar():
            page.wait_for_timeout(2000); print(f"  Loja {loja} ✓"); return
    except Exception:
        pass
    print(f"  [AVISO] Não confirmou seleção de {loja} (segue mesmo assim).")


def fechar_modais(page):
    """Fecha pop-ups do Saipos (novidades/avisos) que aparecem ao navegar e
    interceptam cliques nos campos do relatório. Best-effort, não derruba nada."""
    for _ in range(4):
        try:
            modal = page.locator("[uib-modal-window], .modal.in, .modal.show").first
            if not modal.is_visible(timeout=600):
                break
        except Exception:
            break
        clicou = False
        for sel in ("[uib-modal-window] button[ng-click*='close']",
                    "[uib-modal-window] button[ng-click*='cancel']",
                    "[uib-modal-window] button[ng-click*='dismiss']",
                    "[uib-modal-window] .close",
                    "[uib-modal-window] button:has-text('Fechar')",
                    "[uib-modal-window] button:has-text('Entendi')",
                    "[uib-modal-window] button:has-text('OK')"):
            try:
                b = page.locator(sel).first
                if b.is_visible(timeout=400):
                    b.click(timeout=2500)
                    clicou = True
                    break
            except Exception:
                continue
        if not clicou:
            try:
                page.keyboard.press("Escape")
            except Exception:
                pass
        page.wait_for_timeout(600)
    # remove backdrops órfãos que sobram e continuam bloqueando o ponteiro
    try:
        page.evaluate("""() => {
          document.querySelectorAll('.modal-backdrop').forEach(e => e.remove());
          document.body.classList.remove('modal-open');
        }""")
    except Exception:
        pass


def abrir_relatorio(page, dia, url=SAIPOS_REPORT, slug="sales-by-period", dia_fim=None):
    page.goto(url, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(2000)
    if slug not in page.url:
        page.evaluate(f"window.location.hash = '#/app/report/{slug}'")
        page.wait_for_timeout(500)
        page.reload(wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(3000)
    fechar_modais(page)
    d = dia.strftime("%d/%m/%Y")
    d2 = (dia_fim or dia).strftime("%d/%m/%Y")
    inputs = []
    for sel in ["input[ng-model='dateString']", "input[placeholder*='data']",
                "input[placeholder*='Data']"]:
        try:
            page.wait_for_selector(sel, timeout=5000)
            inputs = page.locator(sel).all()
            if len(inputs) >= 2:
                break
        except PWTimeout:
            continue
    if len(inputs) >= 2:
        for inp, val in zip(inputs[:2], [d, d2]):   # início e fim (iguais = 1 dia)
            try:
                inp.click(click_count=3, timeout=8000)
            except PWTimeout:
                fechar_modais(page)                  # modal apareceu no meio: fecha e repete
                inp.click(click_count=3, timeout=8000)
            inp.type(val, delay=70); inp.press("Tab")
        page.wait_for_timeout(400)
    for sel in ["button[ng-click*='search']", "button[ng-click*='Search']",
                "button[ng-click*='filter']"]:
        try:
            el = page.locator(sel).first
            if el.is_visible(timeout=1000):
                el.click(); break
        except Exception:
            continue
    page.wait_for_timeout(3500)


def coletar_loja(page, loja, idx, dia, cfg):
    selecionar_loja(page, loja, idx)
    abrir_relatorio(page, dia, SAIPOS_REPORT, "sales-by-period")
    valor   = extrair_valor(page)
    pedidos = extrair_inteiro(page, LBL_PEDIDOS)
    pizzas  = extrair_pizzas(page, cfg, dia)
    return {"valor": valor, "pizzas": pizzas, "pedidos": pedidos}


def coletar_loja_periodo(page, loja, idx, d1, d2, cfg):
    """Mesma coleta, mas para um intervalo (ex.: mês até hoje)."""
    selecionar_loja(page, loja, idx)
    abrir_relatorio(page, d1, SAIPOS_REPORT, "sales-by-period", dia_fim=d2)
    valor   = extrair_valor(page)
    pedidos = extrair_inteiro(page, LBL_PEDIDOS)
    canais  = extrair_canais(page)
    abrir_relatorio(page, d1, SAIPOS_ITENS, "store-item-sold", dia_fim=d2)
    page.wait_for_timeout(1500)
    pizzas, _ = pizzas_from_scope(extrair_scope(page), cfg)
    return {"valor": valor, "pizzas": pizzas, "pedidos": pedidos, "canais": canais}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dia", help="YYYY-MM-DD (padrão: ontem)")
    ap.add_argument("--descobrir", action="store_true",
                    help="dump do sales-by-period (screenshot+texto)")
    ap.add_argument("--descobrir-itens", dest="descobrir_itens", action="store_true",
                    help="dump do scope do store-item-sold -> data/_scope_<loja>.json")
    ap.add_argument("--testar-pizzas", dest="testar_pizzas", action="store_true",
                    help="calcula pizzas do _scope salvo (sem abrir browser)")
    ap.add_argument("--loja", default="DAME", help="loja para os modos --descobrir*/--testar")
    ap.add_argument("--so-mes", dest="so_mes", action="store_true", help="coleta só o mês até hoje")
    ap.add_argument("--sem-mes", dest="sem_mes", action="store_true", help="pula o resumo do mês")
    ap.add_argument("--headless", action="store_true")
    args = ap.parse_args()

    cfg = load_cfg()
    dia = (date.fromisoformat(args.dia) if args.dia else date.today() - timedelta(days=1))
    DATA_DIR.mkdir(exist_ok=True)

    if args.testar_pizzas:
        d = json.loads((DATA_DIR / f"_scope_{args.loja.upper()}.json").read_text(encoding="utf-8"))
        total, det = pizzas_from_scope(d, cfg)
        print("PRODUTOS (qtd | categoria | nome):")
        for p in d.get("produtos", []):
            print(f"  {round(p['qtd']):>5}  [{p.get('cat','')}]  {p['nome']}")
        print("\nOPÇÕES (qtd | nome):")
        for o in d.get("opcoes", []):
            print(f"  {round(o['qtd']):>5}  {o['nome']}")
        print(f"\n  pizzas de produtos = {det['produtos']}")
        print(f"  pizzas de combo    = {det['combo']}  (Pequena Combo sem 'Nenhum')")
        print(f"  PIZZAS = {total}")
        return

    print(f"\n=== Vendas Saipos — {dia.isoformat()} ===\n")
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            user_data_dir=cfg["profile_dir"],
            headless=args.headless,
            slow_mo=250,
            args=["--start-maximized"],
        )
        page = ctx.new_page()
        garantir_login(page, cfg)

        if args.descobrir:
            selecionar_loja(page, args.loja.upper(), cfg["lojas"][args.loja.upper()])
            abrir_relatorio(page, dia)
            png = DATA_DIR / f"_descoberta_{args.loja.upper()}.png"
            txt = DATA_DIR / f"_descoberta_{args.loja.upper()}.txt"
            page.screenshot(path=str(png), full_page=True)
            txt.write_text(page.locator("body").inner_text(timeout=5000), encoding="utf-8")
            print(f"  Salvos {png.name} e {txt.name}")
            ctx.close()
            return

        if args.descobrir_itens:
            loja = args.loja.upper()
            selecionar_loja(page, loja, cfg["lojas"][loja])
            abrir_relatorio(page, dia, SAIPOS_ITENS, "store-item-sold")
            page.wait_for_timeout(2000)
            d = extrair_scope(page)
            out = DATA_DIR / f"_scope_{loja}.json"
            out.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
            np_, no_ = (len(d.get("produtos", [])), len(d.get("opcoes", []))) if d else (0, 0)
            print(f"  Salvo {out.name} ({np_} produtos, {no_} opções)")
            ctx.close()
            return

        # ── diário (grava JÁ, pra não perder se o mês falhar) ──
        if not args.so_mes:
            lojas = {}
            for loja, idx in cfg["lojas"].items():
                print(f"── {loja} ──")
                lojas[loja] = coletar_loja(page, loja, idx, dia, cfg)
                print(f"   {lojas[loja]}")
            saida = {"data": dia.isoformat(), "dow": DOW_PT[dia.weekday()],
                     "lojas": lojas,
                     "gerado_em": datetime.now().isoformat(timespec="seconds")}
            (DATA_DIR / "vendas.json").write_text(
                json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"\n✓ vendas.json ({dia.isoformat()})")

        # ── mês até hoje (best-effort; não derruba o diário) ──
        if not args.sem_mes:
            try:
                d1 = date.today().replace(day=1)
                d2 = date.today()
                mes = {}
                for loja, idx in cfg["lojas"].items():
                    print(f"── {loja} (mês {d1.day:02d}–{d2.day:02d}/{d2.month:02d}) ──")
                    mes[loja] = coletar_loja_periodo(page, loja, idx, d1, d2, cfg)
                    print(f"   {mes[loja]}")
                if all(v.get("valor") is None for v in mes.values()):
                    # Saipos rendeu em branco (acontece fora da madrugada):
                    # não sobrescreve o vendas_mes.json bom da última coleta.
                    print("\n  [mês] coleta vazia — vendas_mes.json mantido")
                else:
                    (DATA_DIR / "vendas_mes.json").write_text(json.dumps(
                        {"mes": d1.strftime("%Y-%m"), "de": d1.isoformat(), "ate": d2.isoformat(),
                         "lojas": mes, "gerado_em": datetime.now().isoformat(timespec="seconds")},
                        ensure_ascii=False, indent=2), encoding="utf-8")
                    print("\n✓ vendas_mes.json")
            except Exception as e:
                print(f"  [mês] falhou: {type(e).__name__} {e}")

        ctx.close()


if __name__ == "__main__":
    main()
