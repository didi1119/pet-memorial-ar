"""Build an independently hostable copy of the accepted V7 static release."""
from pathlib import Path
import hashlib
import json
import shutil
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'work/ar-site/dist'
DEST = ROOT / 'work/cloudflare-free/dist'
DEST.mkdir(parents=True,exist_ok=True)
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
manifest = json.loads((SOURCE/'poses.json').read_text())
assert manifest['version']==7 and len(manifest['poses'])==6
for pose in manifest['poses']:
    for kind, ext in [('glb','glb'),('usdz','usdz'),('poster','jpg')]:
        original=SOURCE/'poses'/f"{pose['id']}.{ext}"
        assert sha(original)==pose['assets'][kind]['sha256']
        assert original.stat().st_size==pose['assets'][kind]['bytes']
        name=f"poses/{pose['id']}.{sha(original)[:12]}.{ext}"
        target=DEST/name
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(original,target)
        pose[kind]=name

html=(SOURCE/'index.html').read_text()
for filename, oldref in [('app.js','app.js?v=7'),('style.css','style.css?v=7'),('model-viewer.min.js','model-viewer.min.js')]:
    source=SOURCE/filename
    name=f"{source.stem}.{sha(source)[:12]}{source.suffix}"
    shutil.copyfile(source,DEST/name)
    assert oldref in html
    html=html.replace(oldref,name)
html=html.replace('<meta name="theme-color"','<meta name="robots" content="noindex,nofollow">\n  <meta name="theme-color"',1)
(DEST/'index.html').write_text(html)
(DEST/'poses.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
shutil.copyfile(SOURCE/'model-viewer-LICENSE.txt',DEST/'model-viewer-LICENSE.txt')
shutil.copytree(SOURCE/'licenses',DEST/'licenses',dirs_exist_ok=True)
(DEST/'_headers').write_text('''/*
  X-Robots-Tag: noindex, nofollow
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
/
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
/poses.json
  Cache-Control: no-cache
/poses/*
  Cache-Control: public, max-age=31536000, immutable
/*.js
  Cache-Control: public, max-age=31536000, immutable
/*.css
  Cache-Control: public, max-age=31536000, immutable
/poses/*.glb
  Content-Type: model/gltf-binary
/poses/*.usdz
  Content-Type: model/vnd.usdz+zip
''')
files=[p for p in DEST.rglob('*') if p.is_file()]
assert all(p.stat().st_size<=25*1024*1024 for p in files)
assert not any(p.name in ['_worker.js','interaction.js'] for p in files)
for pose in manifest['poses']:
    for kind in ['glb','usdz','poster']:
        assert sha(DEST/urlsplit(pose[kind]).path)==pose['assets'][kind]['sha256']
for filename in ['.openai','functions']:
    assert not (DEST/filename).exists()
report={'asset_version':7,'source_commit':'448f0b78c6b3b7b553234b35d7e0098464f5f123',
    'prepared_for':'Cloudflare Pages static Free','model_bytes_and_application_behavior_unchanged':True,
    'pose_count':6,'max_file_MiB':max(p.stat().st_size for p in files)/1048576,
    'all_files_under_25_MiB':True,'uses_functions':False,'uses_R2':False,
    'noindex_is_not_access_control':True,'files':[{'path':str(p.relative_to(DEST)),
       'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(files)]}
(DEST.parent/'prepared-release.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='files'},ensure_ascii=False))
