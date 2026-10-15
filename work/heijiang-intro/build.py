"""把開場短片與主畫面圖示裝進黑醬的網站（cases/heijiang/site）。

只新增檔案與修改 index.html／_headers；模型、poses.json 與 app.js 不動。
執行：python3 work/heijiang-intro/build.py
"""
from pathlib import Path
import hashlib
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(__file__).resolve().parent
SITE = ROOT / 'cases/heijiang/site'


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


# 1. 開場的 JS／CSS 以內容雜湊命名（與既有 app／style 相同作法，可長期快取）。
names = {}
for filename in ['intro.js', 'intro.css']:
    source = SRC / filename
    for old in SITE.glob(f'{source.stem}.*{source.suffix}'):
        old.unlink()
    name = f'{source.stem}.{sha(source)[:12]}{source.suffix}'
    shutil.copyfile(source, SITE / name)
    names[filename] = name

# 2. 主畫面圖示與 manifest。
(SITE / 'icons').mkdir(exist_ok=True)
for size in [512, 192, 180]:
    shutil.copyfile(SRC / f'icons/icon-{size}.png', SITE / f'icons/icon-{size}.png')
manifest = {
    'name': '黑醬・在身邊',
    'short_name': '黑醬',
    'description': '給琦琦與蓓蓓。想黑醬的時候，就來這裡。',
    'lang': 'zh-Hant',
    'start_url': '/',
    'scope': '/',
    'display': 'minimal-ui',
    'background_color': '#f4f0e9',
    'theme_color': '#f4f0e9',
    'icons': [
        {'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
        {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
        {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
    ],
}
(SITE / 'manifest.webmanifest').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

# 3. index.html：加上 manifest、圖示、開場的樣式與程式，以及「再看一次開場」。
html = (SITE / 'index.html').read_text()
html = re.sub(r'\n  <link rel="manifest"[^\n]*', '', html)
html = re.sub(r'\n  <link rel="apple-touch-icon"[^\n]*', '', html)
html = re.sub(r'\n  <link rel="stylesheet" href="intro\.[^\n]*', '', html)
html = re.sub(r'\n  <script defer src="intro\.[^\n]*', '', html)
html = re.sub(r'\n  <script id="intro-gate">.*?</script>', '', html, flags=re.S)
html = re.sub(r'<button id="intro-replay"[^<]*</button>', '', html)

head_additions = (
    '\n  <link rel="manifest" href="manifest.webmanifest">'
    '\n  <link rel="apple-touch-icon" href="icons/icon-180.png">'
    f'\n  <link rel="stylesheet" href="{names["intro.css"]}">'
    # 在開場程式載入前先遮住頁面，避免閃一下；程式沒載入時 4 秒後自動放開。
    '\n  <script id="intro-gate">try{if(!matchMedia(\'(prefers-reduced-motion: reduce)\').matches){document.documentElement.classList.add(\'intro-open\');setTimeout(function(){if(!document.getElementById(\'intro\'))document.documentElement.classList.remove(\'intro-open\')},4000)}}catch(e){}</script>'
)
anchor = '\n  <link rel="stylesheet" href="style.'
assert anchor in html
html = html.replace(anchor, head_additions + anchor, 1)
script_anchor = '\n</head>'
html = html.replace(script_anchor, f'\n  <script defer src="{names["intro.js"]}"></script>{script_anchor}', 1)

closing_old = '<span>黑醬，謝謝你來過我們的生命。</span></section>'
assert closing_old in html
html = html.replace(closing_old, '<span>黑醬，謝謝你來過我們的生命。</span><button id="intro-replay" class="quiet-button intro-replay">再看一次開場 ▷</button></section>', 1)
(SITE / 'index.html').write_text(html)

# 4. _headers：manifest 不快取；圖示快取一天。
headers = (SITE / '_headers').read_text()
if '/manifest.webmanifest' not in headers:
    headers = headers.replace('/poses.json\n  Cache-Control: no-cache\n', '/poses.json\n  Cache-Control: no-cache\n/manifest.webmanifest\n  Cache-Control: no-cache\n/icons/*\n  Cache-Control: public, max-age=86400\n', 1)
    (SITE / '_headers').write_text(headers)

report = {
    'intro_files': names,
    'icons': ['icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'],
    'manifest': 'manifest.webmanifest',
    'models_and_poses_unchanged': True,
}
(SRC / 'build-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False))
