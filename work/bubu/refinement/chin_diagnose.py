import bpy, numpy as np, json, sys
from pathlib import Path
R=Path('/Users/kobee/Documents/Codex/2026-10-02/3d-ar/work/bubu')
bpy.ops.wm.open_mainfile(filepath=str(R/'exports/pose-03/bubu-master.blend'))
m=bpy.data.objects['Bubu'];s=bpy.context.scene
P=np.array([v.co[:] for v in m.data.vertices])
W=np.zeros((len(P),8))
for v in m.data.vertices:
 for g in v.groups:W[v.index,g.group]=g.weight
version=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'before'
np.savez(R/f'refinement/chin-coordinates-{version}.npz',P=P,W=W)
# This anatomical region is independent of the existing weight mask.
# The front of the lower muzzle and hanging chin fur, below the nose.
chin=(abs(P[:,0])<.065)&(P[:,1]<-.083)&(P[:,2]>.235)&(P[:,2]<.306)
face=(abs(P[:,0])<.065)&(P[:,1]<-.083)&(P[:,2]>.235)
ids=np.flatnonzero(face);base=P[ids];reports=[]
for f in [1,111,373,637]:
 s.frame_set(f);bpy.context.view_layer.update()
 ev=m.evaluated_get(bpy.context.evaluated_depsgraph_get());em=ev.to_mesh();v=np.array([x.co[:] for x in em.vertices]);ev.to_mesh_clear()
 # Compare every jaw-to-upper-muzzle vector length to rest length.
 anchor=np.flatnonzero((P[:,1]<-.13)&(P[:,2]>.30))[0]
 error=np.abs(np.linalg.norm(v[ids]-v[anchor],axis=1)-np.linalg.norm(P[ids]-P[anchor],axis=1))
 reports.append({'frame':f,'jaw_to_muzzle_max_error_mm':float(error.max()*1000)})
r={'chin_vertices':int(chin.sum()),'chin_head_weight_min':float(W[chin,3].min()),'chin_head_weight_median':float(np.median(W[chin,3])),'frames':reports}
(R/f'refinement/chin-{version}.json').write_text(json.dumps(r,indent=2))
if version=='after':
 assert r['chin_head_weight_min']>1-1e-8
 assert all(x['jaw_to_muzzle_max_error_mm']<.001 for x in reports)
print('CHIN_DIAGNOSIS',json.dumps(r),flush=True)
