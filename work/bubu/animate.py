import bpy,sys,json,math,struct,importlib.util,zipfile,subprocess,hashlib
from pathlib import Path
import numpy as np
from mathutils import Vector,Quaternion
from pxr import Sdf
R=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('ct',R/'work/process_cat.py');ct=importlib.util.module_from_spec(spec);spec.loader.exec_module(ct)
ident=sys.argv[sys.argv.index('--')+1];idx=int(ident[-2:])
out=R/'work/bubu/exports'/ident;out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(R/'work/bubu/inspection'/ident/'mobile.blend'))
mesh=bpy.data.objects['Bubu'];ct.select([mesh]);mesh.rotation_mode='XYZ';mesh.rotation_euler.z=math.pi if idx!=2 else -math.pi/2
if idx==3:mesh.scale=(.8,)*3
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
P=np.empty(len(mesh.data.vertices)*3);mesh.data.vertices.foreach_get('co',P);P=P.reshape(-1,3)
mesh.location.z=-P[:,2].min();bpy.ops.object.transform_apply(location=True,rotation=False,scale=False)
mesh.data.vertices.foreach_get('co',P.ravel())
def sm(lo,hi,x):
 v=np.clip((x-lo)/(hi-lo),0,1);return v*v*(3-2*v)
def ell(center,radii,a=.6,b=1.2):
 dist=np.linalg.norm((P-np.array(center))/np.array(radii),axis=1);return 1-sm(a,b,dist)
cfg={
1:dict(head=(0,-.165,.218),radii=(.105,.10,.08),pivot=(0,-.12,.175),body=(0,-.015,.13),br=(.12,.19,.08),head_z=(.145,.175),core_y=(-.12,-.095),core_z=(.165,.18),ear_z=.2,head_deg=6.5,lift_deg=2.5,tilt_deg=1.8),
2:dict(head=(0,-.188,.065),radii=(.10,.105,.07),pivot=(0,-.125,.06),body=(0,.0,.075),br=(.13,.16,.09),head_z=(.012,.04),core_y=(-.16,-.12),core_z=(.025,.04),ear_z=.075,head_deg=0,lift_deg=0,tilt_deg=0),
3:dict(head=(0,-.055,.335),radii=(.105,.10,.086),pivot=(0,-.032,.285),body=(0,-.025,.195),br=(.105,.135,.13),head_z=(.24,.28),core_y=(-.025,.035),core_z=(.285,.3),ear_z=.32,head_deg=7,lift_deg=2.8,tilt_deg=2)
}[idx]
floor=sm(.013,.037,P[:,2])
# A continuous oblique neck boundary keeps muzzle / eyes / jaw together.
# The old isolated face box introduced discontinuous skin weights.
q=P[:,2]-.30*P[:,1]
neck_limits={1:(.10,.205),3:(.215,.312)}
if idx in neck_limits:
 start,end=neck_limits[idx];head=sm(start,end,q)*floor
 if idx==3:
  # The hanging beard reaches below the oblique skull boundary. Keep the
  # complete lower muzzle rigid, with a broad fade into the rear neck/chest.
  jaw=sm(.18,.235,P[:,2])*(1-sm(-.083,-.015,P[:,1]))
  head=np.maximum(head,jaw)*floor
else:
 # The skull rests on the floor in the supine pose; do not twist it.
 head=(1-sm(-.165,-.08,P[:,1]))*floor
body=ell(cfg['body'],cfg['br'],.4,1.3)*floor*(1-head)
face=((abs(P[:,0])<.065)&(P[:,1]<-.083)&(P[:,2]>.235)) if idx==3 else ((head>.999999)&(abs(P[:,0])<.057))
chin=face&(P[:,2]<.306) if idx==3 else np.zeros(len(P),dtype=bool)
# Drooping furred ears share the rigid skull motion. Separate ear weights
# crossed the neck region and created a fifth influence that had to be dropped.
# Keeping root/chest/neck/head continuous removes that normalization seam.
ear_left=np.zeros(len(P));ear_right=np.zeros(len(P))
paw_left=np.zeros(len(P));paw_right=np.zeros(len(P))
if idx==2:
 paw_left=ell((.08,-.03,.145),(.045,.065,.06),.35,1.05)*sm(.11,.145,P[:,2])*(1-head)
 paw_right=ell((-.08,-.03,.145),(.045,.065,.06),.35,1.05)*sm(.11,.145,P[:,2])*(1-head)
 body*=1-np.maximum(paw_left,paw_right)
head=np.maximum(0,head-ear_left-ear_right)
neck=head*(1-head);head-=neck
W=np.column_stack([np.maximum(0,1-body-neck-head-ear_left-ear_right-paw_left-paw_right),body,neck,head,ear_left,ear_right,paw_left,paw_right])
small=np.argsort(W,axis=1)[:,:4];np.put_along_axis(W,small,0,axis=1);W/=W.sum(1,keepdims=True)
if idx==3:assert chin.sum()>500 and np.all(W[face,3]>1-1e-8),'Muzzle and hanging chin must share the skull transform'
names=['Root','Chest','Neck','Head','EarLeft','EarRight','PawLeft','PawRight']
points=[(0,0,0),cfg['body'],(0,cfg['pivot'][1]+.035,cfg['pivot'][2]-.035),cfg['pivot'],(.068,cfg['head'][1]+.035,cfg['ear_z']+.035),(-.068,cfg['head'][1]+.035,cfg['ear_z']+.035),(.08,-.015,.12),(-.08,-.015,.12)]
arm=bpy.data.armatures.new('BubuSkeleton');rig=bpy.data.objects.new('BubuRig',arm);bpy.context.collection.objects.link(rig)
ct.select([rig]);bpy.ops.object.mode_set(mode='EDIT')
for i,n in enumerate(names):
 b=arm.edit_bones.new(n);b.head=points[i];b.tail=Vector(points[i])+Vector((0,0,.04))
 if i:b.parent=arm.edit_bones['Head' if n in ['EarLeft','EarRight'] else 'Neck' if n=='Head' else 'Root']
bpy.ops.object.mode_set(mode='OBJECT')
for j,n in enumerate(names):
 vg=mesh.vertex_groups.new(name=n)
 for v in np.flatnonzero(W[:,j]>1e-5):vg.add([int(v)],float(W[v,j]),'REPLACE')
mod=mesh.modifiers.new('Natural localized motion','ARMATURE');mod.object=rig;mesh.parent=rig
scene=bpy.context.scene;scene.render.fps=24;scene.frame_start=1;scene.frame_end=769;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
for p in rig.pose.bones:p.rotation_mode='QUATERNION'
def envelope(t,start,up,hold,end):
 def ease(v):
  v=max(0,min(1,v));return v*v*v*(v*(v*6-15)+10)
 if t<start or t>end:return 0
 if t<up:return ease((t-start)/(up-start))
 if t<hold:return 1
 return 1-ease((t-hold)/(end-hold))
def rot(n,axis,degrees):
 b=rig.pose.bones[n];b.rotation_quaternion=Quaternion(b.bone.matrix_local.to_3x3().inverted()@Vector(axis),math.radians(degrees))
for f in range(1,770):
 scene.frame_set(f);t=(f-1)/24;breath=math.sin(2*math.pi*t/6.4)
 rig.pose.bones['Chest'].scale=(1+.030*breath,1+.012*breath,1+.010*breath)
 yaw=cfg['head_deg']*(envelope(t,2,4.2,4.8,7.8)-.75*envelope(t,13,15.5,16.2,19.8)+.22*envelope(t,24.0,26.2,26.7,30))
 lift=cfg['lift_deg']*envelope(t,12.6,15.1,16.2,19.8)
 tilt=cfg['tilt_deg']*envelope(t,23.8,26.0,26.7,30.0)
 for bone_name,factor in [('Neck',.28),('Head',.72)]:
  b=rig.pose.bones[bone_name];mat=b.bone.matrix_local.to_3x3().inverted()
  b.rotation_quaternion=Quaternion(mat@Vector((0,0,1)),math.radians(yaw*factor))@Quaternion(mat@Vector((1,0,0)),math.radians(-lift*factor))@Quaternion(mat@Vector((0,1,0)),math.radians(tilt*factor))
 rot('EarLeft',(0,1,0),1.5*envelope(t,4.8,5.3,5.4,6.2))
 rot('EarRight',(0,1,0),-1.2*envelope(t,18.8,19.3,19.4,20.2))
 rot('PawLeft',(1,0,0),8*envelope(t,5,6,6.7,8) if idx==2 else 0)
 rot('PawRight',(1,0,0),-7*envelope(t,15,16,16.7,18) if idx==2 else 0)
 for b in rig.pose.bones:b.keyframe_insert('rotation_quaternion',frame=f);b.keyframe_insert('scale',frame=f)
rig.animation_data.action.name='Idle'
edges=np.array([e.vertices[:] for e in mesh.data.edges]);e0=np.linalg.norm(P[edges[:,0]]-P[edges[:,1]],axis=1);good=e0>.0002;edges=edges[good];e0=e0[good];maxstrain=0;strain_frames=[]
base=None;maxd=contact=face_error=0;contact_ids=np.flatnonzero(P[:,2]<.013);face_ids=np.flatnonzero(face)
# Direct skin evaluation independently verifies every frame with floor and rigid-face regions.
for f in range(1,770):
 scene.frame_set(f);bpy.context.view_layer.update()
 mats=[]
 for n in names:
  b=rig.pose.bones[n];mats.append(np.asarray(b.matrix@b.bone.matrix_local.inverted()))
 mats=np.array(mats);trans=np.einsum('jkl,vl->jvk',mats[:,:3,:3],P)+mats[:,:3,3,None].transpose(0,2,1)
 v=np.einsum('vj,jvk->vk',W,trans)
 if base is None:base=v.copy()
 ratio=np.linalg.norm(v[edges[:,0]]-v[edges[:,1]],axis=1)/e0;strain=float(np.quantile(abs(ratio-1),.99));maxstrain=max(maxstrain,strain)
 if f in [1,30,90,111,156,210,223,318,354,402,445,469,510,577,625,660,690,720,769]:strain_frames.append({'frame':f,'p99_abs_strain':strain,'max_edge_ratio':float(ratio.max()),'min_edge_ratio':float(ratio.min())})
 dd=np.linalg.norm(v-base,axis=1);maxd=max(maxd,float(dd.max()));contact=max(contact,float(dd[contact_ids].max()))
 if len(face_ids)>1:
  chosen=face_ids[::max(1,len(face_ids)//40)];face_error=max(face_error,float(np.abs(np.linalg.norm(v[chosen]-v[chosen[0]],axis=1)-np.linalg.norm(base[chosen]-base[chosen[0]],axis=1)).max()))
loop=float(np.linalg.norm(v-base,axis=1).max());assert contact<1e-7 and face_error<1e-6 and loop<1e-6,(contact,face_error,loop)
scene.frame_set(1);ct.select([mesh,rig])
bpy.ops.export_scene.gltf(filepath=str(out/'bubu.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=False,export_animations=True,export_skins=True,export_force_sampling=True,export_animation_mode='SCENE',export_frame_range=True,export_anim_scene_split_object=False,export_cameras=False,export_lights=False,export_texcoords=True,export_normals=True,export_materials='EXPORT',export_image_format='AUTO',export_tangents=False,export_draco_mesh_compression_enable=False)
# Keep skinned mesh at scene root to avoid a transform ignored by glTF skin consumers.
p=out/'bubu.glb';raw=p.read_bytes();jl=struct.unpack_from('<I',raw,12)[0];d=json.loads(raw[20:20+jl]);off=20+jl;bl=struct.unpack_from('<I',raw,off)[0];bb=raw[off+8:off+8+bl]
for a in d['animations']:a['name']='Idle'
for i,n in enumerate(d['nodes']):
 if 'mesh' in n and 'skin' in n:
  for parent in d['nodes']:
   if i in parent.get('children',[]):parent['children'].remove(i)
  for s in d['scenes']:
   if i not in s['nodes']:s['nodes'].append(i)
jj=json.dumps(d,separators=(',',':')).encode();jj+=b' '*((-len(jj))%4);bb+=b'\0'*((-len(bb))%4)
p.write_bytes(struct.pack('<III',0x46546c67,2,28+len(jj)+len(bb))+struct.pack('<II',len(jj),0x4e4f534a)+jj+struct.pack('<II',len(bb),0x004e4942)+bb)
ct.select([mesh,rig]);bpy.ops.wm.usd_export(filepath=str(out/'bubu.usdz'),selected_objects_only=True,export_animation=True,export_armatures=True,export_shapekeys=False,only_deform_bones=False,export_materials=True,generate_preview_surface=True,generate_materialx_network=False,export_textures_mode='NEW',relative_paths=True,convert_orientation=True,export_global_forward_selection='NEGATIVE_Z',export_global_up_selection='Y',convert_scene_units='METERS',export_lights=False,export_cameras=False,usdz_downscale_size='4096',root_prim_path='/Bubu')
stage=out/'usd-stage';stage.mkdir(exist_ok=True)
with zipfile.ZipFile(out/'bubu.usdz') as z:root=z.namelist()[0];z.extractall(stage)
layer=Sdf.Layer.FindOrOpen(str(stage/root));txt=layer.ExportToString().replace('(\n','(\n    autoPlay = true\n    playbackMode = "loop"\n',1)
new=Sdf.Layer.CreateAnonymous('loop.usda');assert new.ImportFromString(txt);assert new.Export(str(stage/root))
(out/'bubu.usdz').unlink();subprocess.run(['/usr/bin/usdzip',str(out/'bubu.usdz'),'--asset',str(stage/root)],check=True,cwd=stage)
metrics={'id':ident,'duration_seconds':32,'bones':names,'vertex_count':len(P),'triangles':len(mesh.data.polygons),'max_displacement_mm':maxd*1000,'contact_displacement_mm':contact*1000,'face_shape_error_mm':face_error*1000,'loop_error_mm':loop*1000,'head_yaw_deg':cfg['head_deg'],'head_lift_deg':cfg['lift_deg'],'head_tilt_deg':cfg['tilt_deg'],'chest_width_pct':3.0,'raised_paw_motion':idx==2,'assumed_dimensions':True,'animated_frames_checked':769,'face_vertices_checked':len(face_ids),'chin_vertices_checked':int(chin.sum()),'chin_head_weight_min':float(W[chin,3].min()) if chin.any() else None,'p99_max_edge_strain':maxstrain,'motion_profile':'complete_chin_coupling_v3' if idx==3 else 'natural_neck_coupling_v2'}
(out/'strain.json').write_text(json.dumps({'pose':ident,'frames':strain_frames,'full_cycle_max_p99':maxstrain},indent=2))
assert maxstrain<.12,(ident,maxstrain)
(out/'metrics.json').write_text(json.dumps(metrics,indent=2));assert all((out/n).stat().st_size<25*1048576 for n in ['bubu.glb','bubu.usdz'])
bpy.context.preferences.filepaths.save_version=0;bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(out/'bubu-master.blend'))
# Warm neutral poster and rest / maximum-head-turn comparison.
scene.render.engine='BLENDER_EEVEE';scene.eevee.taa_render_samples=24;scene.render.resolution_x=720;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Warm world');scene.world.use_nodes=True;next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND').inputs['Color'].default_value=(.86,.83,.78,1);next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND').inputs['Strength'].default_value=.5
lo,hi=ct.world_bounds([mesh]);target=(lo+hi)/2;size=max(hi-lo)
cam=bpy.data.cameras.new('Preview');cam.type='ORTHO';cam.ortho_scale=size*1.35;ob=bpy.data.objects.new('Preview',cam);scene.collection.objects.link(ob);scene.camera=ob;ob.location=target+Vector((-.8,-1.5,.8 if idx==2 else .45));ct.aim(ob,target)
for pos,power in [((-1,-2,2),80),((1,0,1),40)]:
 ld=bpy.data.lights.new('Soft','AREA');ld.energy=power;ld.size=1.5;light=bpy.data.objects.new('Soft',ld);scene.collection.objects.link(light);light.location=pos;ct.aim(light,target)
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
for f,tag in [(1,'rest'),(111,'turn'),(373,'lift'),(637,'tilt')]:
 scene.frame_set(f);scene.render.filepath=str(out/(tag+'.png'));bpy.ops.render.render(write_still=True)
print('BUBU_ANIMATION_READY',json.dumps(metrics),flush=True)
