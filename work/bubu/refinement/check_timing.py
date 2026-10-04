from pathlib import Path
import struct,json
import numpy as np
R=Path(__file__).resolve().parents[1]
def tracks(p):
 raw=p.read_bytes();jl=struct.unpack_from('<I',raw,12)[0];d=json.loads(raw[20:20+jl]);buf=raw[28+jl:]
 def acc(i):
  a=d['accessors'][i];bv=d['bufferViews'][a['bufferView']];dim={'SCALAR':1,'VEC4':4}[a['type']]
  return np.ndarray((a['count'],dim),'<f4',buffer=buf,offset=bv.get('byteOffset',0)+a.get('byteOffset',0),strides=(bv.get('byteStride',dim*4),4))
 result={}
 for c in d['animations'][0]['channels']:
  if c['target']['path']!='rotation':continue
  name=d['nodes'][c['target']['node']]['name']
  if name not in ['Head','Neck']:continue
  sp=d['animations'][0]['samplers'][c['sampler']];t=acc(sp['input']).ravel();q=acc(sp['output']);q=q/np.linalg.norm(q,axis=1,keepdims=True)
  vel=2*np.arccos(np.clip(abs(np.sum(q[1:]*q[:-1],axis=1)),0,1))/np.diff(t)*180/np.pi
  result[name]={'max_angular_speed_deg_s':float(vel.max()),'duration_seconds':float(t[-1]-t[0])}
 return result
records=[]
for i in range(1,4):
 ident=f'pose-{i:02}';old=tracks(R/'refinement/v1/exports'/ident/'bubu.glb');new=tracks(R/'exports'/ident/'bubu.glb')
 assert all(abs(t['duration_seconds']-32)<1e-5 for t in new.values())
 total=sum(t['max_angular_speed_deg_s'] for t in new.values())
 assert total<8,(ident,total)
 records.append({'pose':ident,'old':old,'new':new,'new_head_and_neck_speed_bound':total})
(R/'refinement/timing-check.json').write_text(json.dumps(records,indent=2)+'\n')
print(json.dumps(records,indent=2))
