from playwright.sync_api import sync_playwright
from pathlib import Path

url = (Path(__file__).parent / "index.html").as_uri()
shots = [
    ("shot-ultrawide.png", 3440, 1440),
    ("shot-office.png", 2560, 1080),
    ("shot-mobile.png", 412, 915),
]
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, w, h in shots:
        pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
        pg.goto(url, wait_until="load", timeout=60000)
        pg.wait_for_timeout(2500)
        full = name == "shot-mobile.png"
        pg.screenshot(path=str(Path(__file__).parent / name), full_page=full)
        pg.close()
        print("ok", name)
    b.close()
