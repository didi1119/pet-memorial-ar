from pathlib import Path
import json,hashlib,shutil,struct,zipfile
from PIL import Image
R=Path(__file__).resolve().parents[2];S=R/'work/ar-site/dist';D=R/'work/bubu/dist';D.mkdir(exist_ok=True)
for old in D.rglob('*'):
 if old.is_file():old.unlink()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def hashed(p,folder=''):
 name=folder+p.stem+'.'+sha(p)[:12]+p.suffix;t=D/name;t.parent.mkdir(exist_ok=True,parents=True);shutil.copyfile(p,t);return name
poses=[]
labels=['趴著陪你','翻翻肚肚','乖乖坐好'];sources=['dog','fluffy dog','poodle dog']
for i in range(1,4):
 ident=f'pose-{i:02}';O=R/'work/bubu/exports'/ident;m=json.loads((O/'metrics.json').read_text())
 files={}
 for ext in ['glb','usdz']:
  p=O/('bubu.'+ext);name=f'poses/{ident}.{sha(p)[:12]}.{ext}';(D/'poses').mkdir(exist_ok=True);shutil.copyfile(p,D/name);files[ext]=name
 rgba=Image.open(O/'rest.png').convert('RGBA');im=Image.alpha_composite(Image.new('RGBA',rgba.size,'#f4f0e9'),rgba).convert('RGB');im.resize((480,480),Image.Resampling.LANCZOS).save(O/'poster.jpg',quality=93)
 p=O/'poster.jpg';name=f'poses/{ident}.{sha(p)[:12]}.jpg';shutil.copyfile(p,D/name);files['poster']=name
 raw=(O/'bubu.glb').read_bytes();sz=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+sz]);pos=[a for a in g['accessors'] if a['type']=='VEC3' and 'min' in a][0]
 poses.append({'id':ident,'label':labels[i-1],'camera_orbit':'-80deg 40deg 95%' if i==2 else '-45deg 78deg 105%','height_m':pos['max'][1]-pos['min'][1],'source_name':sources[i-1]+' 3d model.glb','source_sha256':sha((Path(__file__).resolve().parents[2]/'assets/originals')/(sources[i-1]+' 3d model.glb')),'animation':{'name':'Idle','duration_seconds':32},'motion_metrics':m,**files})
manifest={'version':3,'animal':'dog','pet_name':'布布','owners':['Tiffany','Jeremy'],'default_pose':'pose-01','animation_name':'Idle','animation_duration_seconds':32,'automatic_motion':True,'ar_device_verified':False,'poses':poses}
(D/'poses.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
js=(S/'app.js').read_text().replace('黑醬','布布').replace("getElementById('cat')","getElementById('dog')").replace('poses.length !== 6','poses.length !== 3').replace('bounded by six poses','bounded by three poses')
start=js.index('  const poseNames = ');end=js.index('\n',start);js=js[:start]+"  const poseNames = { 'pose-01': '趴著陪你', 'pose-02': '翻翻肚肚', 'pose-03': '乖乖坐好' };"+js[end:]
js=js.replace("function resetCamera() {\n    viewer.cameraOrbit = '-45deg 78deg 105%';", "function resetCamera(pose = scenePose || selected) {\n    const orbit = pose?.camera_orbit || '-45deg 78deg 105%';\n    viewer.cameraOrbit = orbit;\n    viewer.setAttribute('camera-orbit', orbit);")
js=js.replace('if (!presenting) resetCamera();','if (!presenting) resetCamera(sourcePose);')
js=js.replace('  function markReady() {\n    loaded = true;', '  function markReady() {\n    loaded = true;\n    if (!presenting) resetCamera(scenePose);')
js=js.replace("reset.addEventListener('click', resetCamera);", "reset.addEventListener('click', () => resetCamera(scenePose || selected));")
(R/'work/bubu/app.js').write_text(js);app=hashed(R/'work/bubu/app.js')
css=(S/'style.css').read_text().replace('repeat(6,minmax(0,1fr))','repeat(3,minmax(0,1fr))')+'\n@media(min-width:761px){.pose-grid{max-width:660px;margin:auto;gap:28px}.pose-card img{height:140px}}'
(R/'work/bubu/style.css').write_text(css);style=hashed(R/'work/bubu/style.css')
viewer=hashed(S/'model-viewer.min.js')
html=(S/'index.html').read_text().replace('黑醬','布布').replace('琦琦與蓓蓓','Tiffany 與 Jeremy').replace('六個樣子','三個樣子').replace('站在身邊','趴著陪你').replace('id="cat"','id="dog"')
html=html.replace('app.js?v=7',app).replace('style.css?v=7',style).replace('model-viewer.min.js',viewer)
html=html.replace('<meta name="theme-color"','<meta name="robots" content="noindex,nofollow">\n  <meta name="theme-color"',1)
html=html.replace('牠會輕輕呼吸，偶爾偏偏頭、動動耳朵。','牠會輕輕呼吸，偶爾緩緩看看左右。趴著或坐著時，也會稍微抬頭、偏偏頭；翻肚肚時，就放鬆地靠著，偶爾晃晃小手。')
old='<path d="M8 17V7l7 5h4l7-5v10c0 11-18 11-18 0Z"/><path d="m13 21 4 2 4-2M5 19l7 1m-7 4 7-2m17-3-7 1m7 4-7-2"/>'
dog='<path d="M11 10c3-3 9-3 12 0l4 4c3 4 1 10-3 8l-1-5v6c0 7-12 7-12 0v-6l-1 5c-4 2-6-4-3-8l4-4Z"/><path d="M15 20h4l-2 3-2-3Zm-4-4h1m10 0h1"/>'
assert old in html;html=html.replace(old,dog)
# Replace cat favicon with a small paw symbol.
a=html.index('  <link rel="icon"');b=html.index('\n',a)
html=html[:a]+'''  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='16' fill='%23f4f0e9'/%3E%3Cg fill='%23886955'%3E%3Cellipse cx='16' cy='21' rx='7' ry='5'/%3E%3Ccircle cx='8' cy='13' r='3'/%3E%3Ccircle cx='15' cy='9' r='3'/%3E%3Ccircle cx='23' cy='12' r='3'/%3E%3C/g%3E%3C/svg%3E">'''+html[b:]
(D/'index.html').write_text(html)
shutil.copyfile(S/'model-viewer-LICENSE.txt',D/'model-viewer-LICENSE.txt');shutil.copytree(S/'licenses',D/'licenses',dirs_exist_ok=True)
shutil.copyfile(R/'work/cloudflare-free/dist/_headers',D/'_headers')
for path in [D/'index.html',D/app,D/style]:assert not any(s in path.read_text() for s in ['黑醬','琦琦','蓓蓓','六個','six poses'])
files=[p for p in D.rglob('*') if p.is_file()];assert all(p.stat().st_size<25*1048576 for p in files)
report={'asset_version':3,'pet_name':'布布','pose_count':3,'owners':['Tiffany','Jeremy'],'model_count':6,'files':[{'path':str(p.relative_to(D)),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(files)],'max_file_MiB':max(p.stat().st_size for p in files)/1048576,'uses_functions':False,'uses_R2':False,'paid_services_enabled':False}
(D.parent/'prepared-release.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='files'},ensure_ascii=False))
