"""把二版開場（紙雕定格動畫影片）裝進黑醬的網站 cases/heijiang/site。

會換掉一版的開場程式（一版原始檔仍保留在 work/heijiang-intro/），
模型、poses.json、app.js、style.css、manifest 與圖示都不動。
執行：python3 work/heijiang-intro-v2/build.py  （需先有 out/heijiang-film.mp4）
"""
from pathlib import Path
import hashlib, json, re, shutil

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(__file__).resolve().parent
SITE = ROOT / 'cases/heijiang/site'
FILM = SRC / 'out/heijiang-film.mp4'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

assert FILM.exists(), '先執行 render.mjs 與編碼，產生 out/heijiang-film.mp4'
assert FILM.stat().st_size < 25 * 1024 * 1024, 'Cloudflare Pages 單檔上限 25 MiB'

# 一版的開場檔案從網站移除
for old in list(SITE.glob('intro.*.js')) + list(SITE.glob('intro.*.css')) + list(SITE.glob('intro-v2.*.js')) + list(SITE.glob('intro-v2.*.css')):
    old.unlink()
(SITE / 'film').mkdir(exist_ok=True)
for old in (SITE / 'film').glob('heijiang-film.*.mp4'):
    old.unlink()

names = {}
for f in ['intro-v2.js', 'intro-v2.css']:
    p = SRC / 'site' / f
    n = f'{p.stem}.{sha(p)[:12]}{p.suffix}'
    shutil.copyfile(p, SITE / n); names[f] = n
film_name = f'film/heijiang-film.{sha(FILM)[:12]}.mp4'
shutil.copyfile(FILM, SITE / film_name)

html = (SITE / 'index.html').read_text()
html = re.sub(r'\n  <link rel="stylesheet" href="intro[^"]*\.css">', '', html)
html = re.sub(r'\n  <script defer src="intro[^"]*\.js"></script>', '', html)
html = re.sub(r'<html lang="zh-Hant"[^>]*>', f'<html lang="zh-Hant" data-film="{film_name}">', html, count=1)
html = re.sub(r'<button id="intro-replay"[^<]*</button>', '', html)
html = re.sub(r'<div class="intro-tools">.*?</div>', '', html, flags=re.S)
anchor = '\n  <link rel="stylesheet" href="style.'
assert anchor in html and '<script id="intro-gate">' in html
html = html.replace(anchor, f'\n  <link rel="stylesheet" href="{names["intro-v2.css"]}">' + anchor, 1)
html = html.replace('\n</head>', f'\n  <script defer src="{names["intro-v2.js"]}"></script>\n</head>', 1)
closing = '<span>黑醬，謝謝你來過我們的生命。</span></section>'
assert closing in html
html = html.replace(closing, '<span>黑醬，謝謝你來過我們的生命。</span>'
                    '<div class="intro-tools"><button id="intro-replay" class="quiet-button">再看一次開場 ▷</button>'
                    f'<a class="quiet-button" href="{film_name}" download="黑醬・在身邊.mp4">存下這段影片 ↓</a></div></section>', 1)
(SITE / 'index.html').write_text(html)

headers = (SITE / '_headers').read_text()
if '/film/*' not in headers:
    headers = headers.rstrip('\n') + '\n/film/*\n  Cache-Control: public, max-age=31536000, immutable\n  Content-Type: video/mp4\n'
    (SITE / '_headers').write_text(headers)

print(json.dumps({'intro': names, 'film': film_name, 'film_MiB': round(FILM.stat().st_size / 1048576, 2)}, ensure_ascii=False))
