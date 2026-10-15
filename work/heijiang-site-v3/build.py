"""三版（生日禮物）網站：把 src/ 組進 cases/heijiang/site。

- 霞鶩文楷 TC 只保留頁面用到的字（含 app.js 動態寫入的字），合成一個小 woff2
- 檔名帶內容雜湊（與既有 app／style 作法相同），index.html 不快取
- 模型、poses.json、app.js、model-viewer 不動；影片與二版開場程式沿用 work/heijiang-intro-v2/site
執行：python3 work/heijiang-site-v3/build.py
"""
from pathlib import Path
import hashlib, json, re, shutil, subprocess, sys, tempfile

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(__file__).resolve().parent / 'src'
SITE = ROOT / 'cases/heijiang/site'
V2 = ROOT / 'work/heijiang-intro-v2'
FONT_DIR = Path('/tmp/claude-0/-home-claude/fd477d40-969c-533f-957f-cd163ab26b15/scratchpad/node_modules/@fontsource/lxgw-wenkai-tc')
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
hashed = lambda p: f'{p.stem}.{sha(p)[:12]}{p.suffix}'

# ---------- 1. 字型子集 ----------
def used_text():
    t = (SRC / 'index.html').read_text() + (SRC / 'page.js').read_text()
    t += (SITE / 'app.9f99a175f66d.js').read_text()
    t += (V2 / 'site/intro-v2.js').read_text()
    t += '0123456789：，。！？・～─—（）「」『』…▷↓↑←→＋'
    return ''.join(sorted(set(ch for ch in t if ord(ch) > 32)))

def build_font(out_dir: Path) -> Path:
    from fontTools.ttLib import TTFont
    from fontTools.merge import Merger
    from fontTools import subset
    chars = used_text()
    cps = {ord(c) for c in chars}
    css = (FONT_DIR / '400.css').read_text()
    # 找出涵蓋這些字的分片
    pieces = []
    for m in re.finditer(r"url\(\./files/(lxgw-wenkai-tc-(\d+)-400-normal\.woff2)\).*?unicode-range:\s*([^;]+);", css, re.S):
        fname, idx, ranges = m.group(1), m.group(2), m.group(3)
        covered = set()
        for r in ranges.split(','):
            r = r.strip()[2:]
            if '-' in r:
                a, b = r.split('-'); covered.update(range(int(a, 16), int(b, 16) + 1))
            elif '?' in r:
                lo = int(r.replace('?', '0'), 16); hi = int(r.replace('?', 'F'), 16); covered.update(range(lo, hi + 1))
            else:
                covered.add(int(r, 16))
        if covered & cps:
            pieces.append((fname, covered & cps))
    tmp = Path(tempfile.mkdtemp())
    subsets = []
    for fname, cp in pieces:
        f = TTFont(FONT_DIR / 'files' / fname)
        opts = subset.Options(); opts.flavor = None; opts.hinting = False; opts.desubroutinize = True
        opts.layout_features = ['*']; opts.name_IDs = ['*']; opts.notdef_outline = True
        sub = subset.Subsetter(opts); sub.populate(unicodes=sorted(cp)); sub.subset(f)
        p = tmp / (fname.replace('.woff2', '.ttf')); f.flavor = None; f.save(p); subsets.append(p)
    if len(subsets) == 1:
        merged = TTFont(subsets[0])
    else:
        merged = Merger().merge([str(p) for p in subsets])
    merged.flavor = 'woff2'
    out = tmp / 'wenkai-subset.woff2'; merged.save(out)
    present = set(merged.getBestCmap().keys())
    missing = [c for c in chars if ord(c) not in present and ord(c) > 127]
    if missing: print('字型缺字（會用系統字型補）:', ''.join(missing), file=sys.stderr)
    out_dir.mkdir(parents=True, exist_ok=True)
    final = out_dir / hashed(out); shutil.copyfile(out, final)
    for old in out_dir.glob('wenkai-subset.*.woff2'):
        if old != final: old.unlink()
    print(f'字型：{len(present)} 字，{final.stat().st_size // 1024} KB')
    return final

# ---------- 2. 清掉舊版、放新檔 ----------
for pat in ['intro.*.js', 'intro.*.css', 'intro-v2.*.js', 'intro-v2.*.css', 'style.*.css', 'page.*.js', 'hero*.png']:
    for old in SITE.glob(pat): old.unlink()
for d in ['story', 'icons', 'fonts']:
    if (SITE / d).exists(): shutil.rmtree(SITE / d)
shutil.copytree(SRC / 'story', SITE / 'story')
shutil.copytree(SRC / 'icons', SITE / 'icons')
shutil.copyfile(SRC / 'hero.png', SITE / 'hero.png'); shutil.copyfile(SRC / 'hero@1x.png', SITE / 'hero@1x.png')
font = build_font(SITE / 'fonts')
font_rel = f'fonts/{font.name}'

names = {}
for src in [V2 / 'site/intro-v2.js', V2 / 'site/intro-v2.css', SRC / 'page.js']:
    n = hashed(src); shutil.copyfile(src, SITE / n); names[src.name] = n
css = (SRC / 'style.css').read_text().replace('__FONT__', font_rel)
tmpcss = SITE / 'style.css'; tmpcss.write_text(css); style_name = hashed(tmpcss); tmpcss.rename(SITE / style_name)

films = sorted((SITE / 'film').glob('heijiang-film.*.mp4'))
assert films, '需要先用 heijiang-intro-v2/build.py 放入影片'
film_rel = f'film/{films[-1].name}'

html = (SRC / 'index.html').read_text()
for k, v in {'__FILM__': film_rel, '__FONT__': font_rel, '__INTRO_CSS__': names['intro-v2.css'], '__INTRO_JS__': names['intro-v2.js'], '__PAGE_JS__': names['page.js'], '__STYLE__': style_name}.items():
    html = html.replace(k, v)
(SITE / 'index.html').write_text(html)

manifest = json.loads((SITE / 'manifest.webmanifest').read_text())
manifest['icons'] = [
    {'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
    {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
    {'src': 'icons/icon-512-maskable.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
]
manifest['description'] = '給琦琦。想黑醬的時候，就來這裡。'
manifest['background_color'] = manifest['theme_color'] = '#f3ede3'
(SITE / 'manifest.webmanifest').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

headers = (SITE / '_headers').read_text()
for path, rule in [('/fonts/*', 'Cache-Control: public, max-age=31536000, immutable'), ('/story/*', 'Cache-Control: public, max-age=604800'), ('/hero*.png', 'Cache-Control: public, max-age=604800')]:
    if path not in headers: headers = headers.rstrip('\n') + f'\n{path}\n  {rule}\n'
(SITE / '_headers').write_text(headers)
print(json.dumps({'style': style_name, 'font': font_rel, 'film': film_rel, **names}, ensure_ascii=False))
