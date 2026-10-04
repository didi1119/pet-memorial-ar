from pathlib import Path
import json,struct,hashlib,subprocess,zipfile,io,re
import numpy as np
from PIL import Image
R=Path(__file__).resolve().parents[2]
def glb(p):
 b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];return json.loads(b[20:20+n]),b[28+n:]
def img_hashes(p):
 d,b=glb(p);hashes=[]
 for im in d.get('images',[]):
  v=d['bufferViews'][im['bufferView']];off=v.get('byteOffset',0);raw=b[off:off+v['byteLength']];hashes.append(hashlib.sha256(raw).hexdigest())
 return hashes
reports=[]
for i,src in enumerate(['dog','fluffy dog','poodle dog'],1):
 out=R/'work/bubu/exports'/f'pose-{i:02}';m=json.loads((out/'metrics.json').read_text())
 assert m['contact_displacement_mm']<.001 and m['face_shape_error_mm']<.001 and m['loop_error_mm']<.001
 assert m['face_vertices_checked']>50,m
 assert m['max_displacement_mm']>(3 if i==2 else 10),m
 assert m['duration_seconds']==32 and m['animated_frames_checked']==769
 expected=img_hashes((Path(__file__).resolve().parents[2]/'assets/originals')/(src+' 3d model.glb'))
 actual=img_hashes(out/'bubu.glb');assert actual==expected,(i,expected,actual)
 d,b=glb(out/'bubu.glb')
 old,oldbuf=glb(R/'work/bubu/refinement/v1/exports'/f'pose-{i:02}'/'bubu.glb')
 def read_acc(doc,buf,ai):
  a=doc['accessors'][ai];v=doc['bufferViews'][a['bufferView']];dim={'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
  return np.ndarray((a['count'],dim),dtype='<f4',buffer=buf,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',dim*4),4))
 for key in ['POSITION','NORMAL','TEXCOORD_0']:
  va=read_acc(d,b,d['meshes'][0]['primitives'][0]['attributes'][key]);vb=read_acc(old,oldbuf,old['meshes'][0]['primitives'][0]['attributes'][key])
  assert va.shape==vb.shape and np.allclose(va,vb,atol=1e-6),(i,key,'rest geometry changed')
 dur=[d['accessors'][s['input']]['max'][0]-d['accessors'][s['input']]['min'][0] for s in d['animations'][0]['samplers']]
 assert all(abs(t-32)<1e-5 for t in dur)
 assert len(d['animations'])==1 and d['animations'][0]['name']=='Idle' and len(d['skins'])==1
 with zipfile.ZipFile(out/'bubu.usdz') as z:
  assert z.testzip() is None and all(x.compress_type==0 for x in z.infolist())
  usdimages=[hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist() if n.endswith(('.jpg','.png'))]
  assert usdimages==expected,(i,usdimages,expected)
  assert z.namelist()[0].endswith(('.usd','.usdc','.usda'))
 strict=subprocess.run(['/usr/bin/usdchecker','--arkit','--strict',str(out/'bubu.usdz')],capture_output=True,text=True)
 (out/'usdz-validation.txt').write_text(strict.stdout+strict.stderr);assert strict.returncode==0,(i,strict.stdout,strict.stderr)
 stage=subprocess.run(['/usr/bin/usdcat',str(out/'bubu.usdz')],capture_output=True,text=True,check=True).stdout
 tps=float(re.search(r'timeCodesPerSecond\s*=\s*([0-9.]+)',stage).group(1));start=float(re.search(r'startTimeCode\s*=\s*([0-9.]+)',stage).group(1));end=float(re.search(r'endTimeCode\s*=\s*([0-9.]+)',stage).group(1))
 assert abs((end-start)/tps-32)<1e-6,(i,'USDZ duration')
 assert 'autoPlay = true' in stage and 'playbackMode = "loop"' in stage and 'SkelAnimation' in stage and 'skel:animationSource' in stage
 for f in ['bubu.glb','bubu.usdz']:assert (out/f).stat().st_size<25*1048576
 reports.append({'pose':i,'geometry_checks':m,'source_texture_bytes_preserved':True,'usdz_strict_passed':True,'embedded_32_second_animation':True})
(R/'work/bubu/validation.json').write_text(json.dumps(reports,indent=2)+'\n')
print('Three animated GLB/USDZ pairs passed geometry, texture identity and strict ARKit checks.')
