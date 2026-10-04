import bpy,sys,json,importlib.util,math
import numpy as np
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('ct',R/'work/process_cat.py');ct=importlib.util.module_from_spec(spec);spec.loader.exec_module(ct)
for i,name in enumerate(['dog','fluffy dog','poodle dog'],1):
 out=R/'work/bubu/inspection'/f'pose-{i:02}';out.mkdir(exist_ok=True)
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(Path(__file__).resolve().parents[2]/'assets/originals')+'/'+name+' 3d model.glb')
 m=next(o for o in bpy.context.scene.objects if o.type=='MESH')
 ct.select([m]);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 lo,hi=ct.world_bounds([m]);scale=.52/max(hi-lo);m.scale=(scale,)*3;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 lo,hi=ct.world_bounds([m]);m.location=-Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z));bpy.ops.object.transform_apply(location=True,rotation=False,scale=False)
 tri=len(m.data.polygons);mod=m.modifiers.new('Mobile','DECIMATE');mod.ratio=min(1,120000/tri);bpy.ops.object.modifier_apply(modifier=mod.name)
 m.name='Bubu';ct.standardize_images([m],out/'textures',4096,True)
 bpy.ops.wm.save_as_mainfile(filepath=str(out/'mobile.blend'))
 p=np.empty(len(m.data.vertices)*3);m.data.vertices.foreach_get('co',p);p=p.reshape(-1,3);np.save(out/'vertices.npy',p)
 (out/'summary.json').write_text(json.dumps({'source':name,'bounds_min':p.min(0).tolist(),'bounds_max':p.max(0).tolist(),'vertices':len(p),'triangles':len(m.data.polygons)},indent=2))
 scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.eevee.taa_render_samples=16
 scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100;scene.world=bpy.data.worlds.new('World');scene.world.color=(.4,.4,.4)
 scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.6
 lo,hi=ct.world_bounds([m]);target=(lo+hi)/2
 cam=bpy.data.cameras.new('Camera');cam.type='ORTHO';cam.ortho_scale=.65;ob=bpy.data.objects.new('Camera',cam);scene.collection.objects.link(ob);scene.camera=ob
 for pos,power in [((-1,-1,2),100),((1,1,1),80)]:
  ld=bpy.data.lights.new('Soft','AREA');ld.energy=power;ld.size=2;light=bpy.data.objects.new('Soft',ld);scene.collection.objects.link(light);light.location=pos;ct.aim(light,target)
 for tag,pos in [('front',(0,-2,.18)),('side',(2,0,.18)),('other',(0,2,.18)),('three',(1.5,-2,1))]:
  ob.location=target+Vector(pos);ct.aim(ob,target);scene.render.filepath=str(out/(tag+'.png'));bpy.ops.render.render(write_still=True)
 print('INSPECT_READY',i,flush=True)
