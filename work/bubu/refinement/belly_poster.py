import bpy, importlib.util, math
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[3]
sp=importlib.util.spec_from_file_location('ct',R/'work/process_cat.py');ct=importlib.util.module_from_spec(sp);sp.loader.exec_module(ct)
O=R/'work/bubu/exports/pose-02'
bpy.ops.wm.open_mainfile(filepath=str(O/'bubu-master.blend'))
s=bpy.context.scene;s.frame_set(1);m=bpy.data.objects['Bubu']
s.render.engine='BLENDER_EEVEE';s.eevee.taa_render_samples=32;s.render.resolution_x=720;s.render.resolution_y=720;s.render.resolution_percentage=100
s.world=bpy.data.worlds.new('Warm world');s.world.use_nodes=True
bg=next(n for n in s.world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs['Color'].default_value=(.86,.83,.78,1);bg.inputs['Strength'].default_value=.5
lo,hi=ct.world_bounds([m]);target=(lo+hi)/2;size=max(hi-lo)
cam=bpy.data.cameras.new('Preview');cam.type='ORTHO';cam.ortho_scale=size*1.16;ob=bpy.data.objects.new('Preview',cam);s.collection.objects.link(ob);s.camera=ob
# Web theta -80deg, polar angle 40deg, converted from glTF Y-up to Blender Z-up.
ob.location=target+Vector((math.sin(math.radians(-80))*math.sin(math.radians(40)),-math.cos(math.radians(-80))*math.sin(math.radians(40)),math.cos(math.radians(40))));ct.aim(ob,target)
for pos,power in [((-1,-2,2),80),((1,0,1),40)]:
 ld=bpy.data.lights.new('Soft','AREA');ld.energy=power;ld.size=1.5;light=bpy.data.objects.new('Soft',ld);s.collection.objects.link(light);light.location=pos;ct.aim(light,target)
s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.film_transparent=True;s.render.filepath=str(O/'rest.png');bpy.ops.render.render(write_still=True)
print('BELLY_POSTER_READY',flush=True)
