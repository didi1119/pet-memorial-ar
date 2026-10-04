"""True local skeletal idle motion, preserving supplied geometry/materials."""
import bpy, json, sys, math, importlib.util, struct, zipfile, subprocess
from pathlib import Path
import numpy as np
from mathutils import Vector, Quaternion
from pxr import Sdf
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('cat_tools',ROOT/'work/process_cat.py');ct=importlib.util.module_from_spec(spec);spec.loader.exec_module(ct)
args=sys.argv[sys.argv.index('--')+1:];ident=args[0]
out=ROOT/'work/idle-v5-exports'/ident;out.mkdir(parents=True,exist_ok=True)
work=ROOT/'work/idle-v5-work'/ident;work.mkdir(parents=True,exist_ok=True)
config=json.loads((ROOT/'work/motion-geometry/landmarks.json').read_text())
c=config['poses'][ident]
pose_control=json.loads((ROOT/'work/idle-v5-motion-config.json').read_text())['poses'][ident]
A=pose_control['amplitudes']
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'work/previous-model-v3/poses'/(ident+'.glb')))
mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
ct.select([mesh]);bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM');bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
mesh.name='Cat';mesh.data.name='CatMesh'
ct.standardize_images([mesh],work/'textures',max_dimension=4096,preserve_jpeg=True)
P=np.empty(len(mesh.data.vertices)*3,dtype=np.float64);mesh.data.vertices.foreach_get('co',P);P=P.reshape(-1,3)
def smooth(lo,hi,x):
    v=np.clip((x-lo)/(hi-lo),0,1);return v*v*(3-2*v)
def ellipse(center,radii,inner=.65,outer=1.15):
    dist=np.sqrt(np.sum(((P-np.asarray(center))/np.asarray(radii))**2,axis=1));return 1-smooth(inner,outer,dist)
floor=smooth(.03,.065,P[:,2])
head=ellipse(c['head']['center'],c['head']['radii'],.75,1.2)*floor
# Keep the face rigid; only neck transitions may blend with chest or root.
def gated_mask(gates):
    value=np.ones(len(P))
    for g in gates:
        part=smooth(g['lo'],g['hi'],P[:,g['axis']])
        if g['direction']=='decreasing':part=1-part
        value*=part
    return value
face_core=gated_mask(pose_control['face_gates'])*floor
head=np.maximum(head,face_core)
chest=ellipse(c['body']['center'],c['body']['radii'],.45,1.3)*floor*(1-head)
ears=[]
for e in c['ears']:
    mask=ellipse(e['center'],e['radii'],.45,1.1)*smooth(e['z_fade_start'],e['z_fade_full'],P[:,2])
    ears.append(np.minimum(mask,head))
tail=ellipse(c['tail']['center'],c['tail']['radii'],.45,1.12)*floor if c.get('tail') else np.zeros(len(P))
if c.get('tail'):
    extra=c['tail']['additional_region']
    if 'y_fade_start' in extra:tail*=smooth(extra['y_fade_start'],extra['y_fade_full'],P[:,1])
    if 'z_fade_start' in extra:tail*=smooth(extra['z_fade_start'],extra['z_fade_full'],P[:,2])
    if 'z_max' in extra:tail*=1-smooth(extra['z_max']-.02,extra['z_max'],P[:,2])
# Protected paw/tail contacts remain root-controlled with feathered transitions.
protected=np.zeros(len(P))
for gates in pose_control.get('protected_gates',[]):protected=np.maximum(protected,gated_mask(gates))
head*=1-protected;chest*=1-protected;tail*=1-protected
ears=[e*(1-protected) for e in ears]
head=np.clip(head-ears[0]-ears[1],0,1)*(1-tail)
chest*=1-tail
W=np.column_stack([np.maximum(0,1-chest-head-ears[0]-ears[1]-tail),chest,head,ears[0],ears[1],tail])
# Retain at most four bone influences before export, with normalized skin weights.
small=np.argsort(W,axis=1)[:,:2];np.put_along_axis(W,small,0,axis=1);W/=W.sum(axis=1,keepdims=True)
# Anatomically identified disconnected whisker islands must follow the head,
# including tips overlapping the raised-paw bounding box. Only weights change.
rigid_whisker_ids=np.empty(0,dtype=int)
if ident=='pose-05':
    from mathutils.kdtree import KDTree
    whiskers=np.asarray(json.loads((ROOT/'work/idle-v5-geometry/pose-05-side-whisker-points.json').read_text())['vertices'])
    kd=KDTree(len(whiskers))
    for i,q in enumerate(whiskers):kd.insert(tuple(q),i)
    kd.balance()
    candidates=np.flatnonzero(np.all((P>=whiskers.min(axis=0)-1e-5)&(P<=whiskers.max(axis=0)+1e-5),axis=1))
    rigid_whisker_ids=np.asarray([i for i in candidates if kd.find(tuple(P[i]))[2]<1e-5],dtype=int)
    assert len(rigid_whisker_ids)>=len(whiskers)*.95
    W[rigid_whisker_ids]=0;W[rigid_whisker_ids,2]=1

arm=bpy.data.armatures.new('IdleSkeleton');rig=bpy.data.objects.new('IdleRig',arm);bpy.context.collection.objects.link(rig)
ct.select([rig]);bpy.ops.object.mode_set(mode='EDIT')
names=['Root','Chest','Head','EarLeft','EarRight','TailTip']
points=[(0,0,0),c['body']['center'],c['head']['pivot'],c['ears'][0]['base'],c['ears'][1]['base'],c['tail']['pivot'] if c.get('tail') else c['body']['center']]
for i,name in enumerate(names):
    bone=arm.edit_bones.new(name);bone.head=points[i];bone.tail=Vector(points[i])+Vector((0,0,.04));bone.use_deform=True
    if i:bone.parent=arm.edit_bones['Head' if i in [3,4] else 'Root']
bpy.ops.object.mode_set(mode='OBJECT')
for j,name in enumerate(names):
    group=mesh.vertex_groups.new(name=name)
    for i in np.flatnonzero(W[:,j]>1e-6):group.add([int(i)],float(W[i,j]),'REPLACE')
modifier=mesh.modifiers.new('True skeletal idle','ARMATURE');modifier.object=rig;mesh.parent=rig
scene=bpy.context.scene;scene.render.fps=24;scene.frame_start=1;scene.frame_end=193
scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
for p in rig.pose.bones:p.rotation_mode='QUATERNION'
def rotation(name,world_axis,angle):
    bone=rig.pose.bones[name];axis=bone.bone.matrix_local.to_3x3().inverted()@Vector(world_axis);bone.rotation_quaternion=Quaternion(axis,angle)
def flick(t,start,width):
    return math.sin(math.pi*(t-start)/width)**2 if start<t<start+width else 0
for frame in range(1,194):
    scene.frame_set(frame);t=(frame-1)/24
    breath=math.sin(4*math.pi*t/8)
    rig.pose.bones['Chest'].scale=(1+A['chest_width_pct']/100*breath,1+A['chest_height_pct']/100*breath,1)
    rotation('Head',(0,0,1),math.radians(A['head_deg'])*math.sin(2*math.pi*t/8))
    rotation('EarLeft',(0,1,0),math.radians(A['ear_left_deg'])*flick(t,2.2,.65))
    rotation('EarRight',(0,1,0),-math.radians(A['ear_right_deg'])*flick(t,5.1,.58))
    rotation('TailTip',(0,0,1),math.radians(A['tail_deg'])*math.sin(2*math.pi*t/8) if c.get('tail') else 0)
    for p in rig.pose.bones:
        p.keyframe_insert('rotation_quaternion',frame=frame,group=p.name);p.keyframe_insert('scale',frame=frame,group=p.name)
rig.animation_data.action.name='Idle'
# Sample actual evaluated skinned geometry, independent of intended amplitudes.
base=None;max_disp=0;floor_disp=0;per_frame=[];floor_ids=np.flatnonzero(P[:,2]<.03)
for frame in range(1,194):
    scene.frame_set(frame);bpy.context.view_layer.update();ev=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());em=ev.to_mesh()
    v=np.empty(len(em.vertices)*3);em.vertices.foreach_get('co',v);v=v.reshape(-1,3);ev.to_mesh_clear()
    if base is None:base=v.copy()
    d=np.linalg.norm(v-base,axis=1);max_disp=max(max_disp,float(d.max()));floor_disp=max(floor_disp,float(d[floor_ids].max()) if len(floor_ids) else 0)
    per_frame.append({'frame':frame,'max_displacement_m':float(d.max())})
loop_error=float(np.linalg.norm(v-base,axis=1).max())
scene.frame_set(1);ct.select([mesh,rig])
bpy.ops.export_scene.gltf(filepath=str(out/'cat-idle.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=False,export_animations=True,export_skins=True,export_force_sampling=True,export_animation_mode='SCENE',export_frame_range=True,export_anim_scene_split_object=False,export_cameras=False,export_lights=False,export_texcoords=True,export_normals=True,export_materials='EXPORT',export_image_format='AUTO',export_tangents=(ident=='pose-01'),export_draco_mesh_compression_enable=False)
# Name the single exported scene clip, and repair only invalid tangent basis data.
path=out/'cat-idle.glb';raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);offset=20+n;bn=struct.unpack_from('<I',raw,offset)[0];buf=bytearray(raw[offset+8:offset+8+bn])
assert len(doc.get('animations',[]))==1
for a in doc['animations']:a['name']='Idle'
for i,node in enumerate(doc['nodes']):
    if 'mesh' not in node or 'skin' not in node:continue
    for parent in doc['nodes']:
        if i in parent.get('children',[]):
            assert not any(k in parent for k in ['matrix','rotation','translation','scale'])
            parent['children'].remove(i)
    for scene_doc in doc['scenes']:
        if i not in scene_doc['nodes']:scene_doc['nodes'].append(i)
def accessor(i):
    a=doc['accessors'][i];bv=doc['bufferViews'][a['bufferView']];dim={'VEC3':3,'VEC4':4}[a['type']]
    return np.ndarray((a['count'],dim),dtype='<f4',buffer=buf,offset=bv.get('byteOffset',0)+a.get('byteOffset',0),strides=(bv.get('byteStride',dim*4),4))
for m in doc['meshes']:
    for p in m['primitives']:
        at=p['attributes']
        if 'TANGENT' not in at:continue
        T=accessor(at['TANGENT']);N=accessor(at['NORMAL']);dot=np.sum(T[:,:3]*N,axis=1);length=np.linalg.norm(T[:,:3],axis=1)
        bad=(length<.999)|(length>1.001)|(np.abs(dot)>.001)
        for i in np.flatnonzero(bad):
            normal=N[i].astype(float);normal/=np.linalg.norm(normal);v=T[i,:3].astype(float);v-=np.dot(v,normal)*normal
            if np.linalg.norm(v)<1e-8:
                axis=np.eye(3)[np.argmin(np.abs(normal))];v=np.cross(normal,axis)
            T[i,:3]=v/np.linalg.norm(v)
j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*((-len(j))%4);buf+=b'\x00'*((-len(buf))%4)
path.write_bytes(struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(buf))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(buf),0x004e4942)+buf)
# Native USD skeleton animation plus original packed materials.
ct.select([mesh,rig]);bpy.ops.wm.usd_export(filepath=str(out/'cat-idle.usdz'),selected_objects_only=True,export_animation=True,export_armatures=True,export_shapekeys=False,only_deform_bones=False,export_materials=True,generate_preview_surface=True,generate_materialx_network=False,export_textures_mode='NEW',relative_paths=True,convert_orientation=True,export_global_forward_selection='NEGATIVE_Z',export_global_up_selection='Y',convert_scene_units='METERS',export_lights=False,export_cameras=False,usdz_downscale_size='4096',root_prim_path='/Cat')
usdz=out/'cat-idle.usdz';unpack=work/'usd-stage';unpack.mkdir(exist_ok=True)
with zipfile.ZipFile(usdz) as z:
    root_name=z.namelist()[0];z.extractall(unpack)
layer=Sdf.Layer.FindOrOpen(str(unpack/root_name));txt=layer.ExportToString();txt=txt.replace('(\n','(\n    autoPlay = true\n    playbackMode = "loop"\n',1)
new=Sdf.Layer.CreateAnonymous('animated-idle.usda');assert new.ImportFromString(txt);assert new.Export(str(unpack/root_name))
usdz.unlink();subprocess.run(['/usr/bin/usdzip',str(usdz),'--asset',str(unpack/root_name)],check=True,cwd=unpack)
report={'variant':'approved_perceptible_six_pose_v5','amplitudes':A,'pose':ident,'clip':'Idle','duration_seconds':8,'fps':24,'bones':names,'vertex_count':len(P),'max_influences':int(np.max((W>1e-6).sum(axis=1))),'max_displacement_m':max_disp,'floor_vertex_displacement_m':floor_disp,'loop_error_m':loop_error,'tail_moves':bool(c.get('tail')),'motion':'localized chest breathing, head yaw, occasional ear flicks, safe tail tip only','rigid_whisker_vertex_count':len(rigid_whisker_ids),'protected_vertex_count':int(np.sum(protected>.999)),'face_rigid_vertex_count':int(np.sum(face_core>.999)),'frame_samples':per_frame}
(out/'animation-metrics.json').write_text(json.dumps(report,indent=2)+'\n')
assert floor_disp<1e-6 and loop_error<1e-6 and 1e-5<max_disp<.015
bpy.context.preferences.filepaths.save_version=0;bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(out/'cat-idle-master.blend'))
print('IDLE_EXPORT_READY',ident,json.dumps({k:v for k,v in report.items() if k!='frame_samples'}),flush=True)
