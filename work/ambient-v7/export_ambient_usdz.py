#!/usr/bin/env python3
"""Patch approved USDZ skeleton samples from candidate GLB, retaining all assets.

Run with Blender's bundled Python (pxr and numpy). Uses native UsdSkel to
evaluate the exported stage, independently of the glTF evaluator below.
"""
from pathlib import Path
import argparse, hashlib, io, json, math, struct, subprocess, zipfile
import numpy as np
from pxr import Gf, Sdf, Usd, UsdGeom, UsdSkel, Vt

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT/'work/ambient-v7'
C = np.array([[1,0,0,0],[0,0,1,0],[0,-1,0,0],[0,0,0,1]], dtype=float)
CI = C.T

def sha(raw): return hashlib.sha256(raw).hexdigest()

def stable(value):
    if isinstance(value,dict):return {k:stable(value[k]) for k in sorted(value)}
    if isinstance(value,(list,tuple)):return [stable(v) for v in value]
    if isinstance(value,(str,int,float,bool)) or value is None:return value
    return str(value)

def image_dimensions(raw):
    if raw.startswith(b'\x89PNG\r\n\x1a\n'):return list(struct.unpack_from('>II',raw,16))
    assert raw.startswith(b'\xff\xd8'),'Expected retained JPEG or PNG'
    i=2
    while i<len(raw):
        if raw[i]!=255:i+=1;continue
        while raw[i]==255:i+=1
        marker=raw[i];i+=1
        if marker in (0xD8,0xD9,0x01) or 0xD0<=marker<=0xD7:continue
        n=struct.unpack_from('>H',raw,i)[0]
        if marker in (0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF):
            h,w=struct.unpack_from('>HH',raw,i+3);return [w,h]
        i+=n
    raise AssertionError('No JPEG image dimensions')

def qmul(a,b):
    av,bv=np.asarray(a[:3]),np.asarray(b[:3])
    return np.r_[a[3]*bv+b[3]*av+np.cross(av,bv),a[3]*b[3]-np.dot(av,bv)]

def qmat(q):
    x,y,z,w=np.asarray(q)/np.linalg.norm(q)
    return np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],
                     [2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],
                     [2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])

def trs(t,q,s):
    m=np.eye(4);m[:3,:3]=qmat(q)@np.diag(s);m[:3,3]=t;return m

def slerp(a,b,u):
    a=np.array(a,dtype=float,copy=True);b=np.array(b,dtype=float,copy=True)
    a/=np.linalg.norm(a);b/=np.linalg.norm(b);dot=np.dot(a,b)
    if dot<0: b=-b;dot=-dot
    if dot>.9995: q=a*(1-u)+b*u
    else:
        ang=math.acos(np.clip(dot,-1,1));q=(a*math.sin((1-u)*ang)+b*math.sin(u*ang))/math.sin(ang)
    return q/np.linalg.norm(q)

class Glb:
    def __init__(self,path):
        self.path=Path(path);raw=self.path.read_bytes();self.digest=sha(raw)
        assert struct.unpack_from('<III',raw)==(0x46546c67,2,len(raw))
        off=12;self.doc=None;self.bin=None
        while off<len(raw):
            size,typ=struct.unpack_from('<II',raw,off);payload=raw[off+8:off+8+size];off+=8+size
            if typ==0x4e4f534a:self.doc=json.loads(payload)
            elif typ==0x004e4942:self.bin=payload
        assert self.doc is not None and self.bin is not None
        self.nodes=self.doc['nodes'];self.skin=self.doc['skins'][0]
        self.parents={ch:i for i,n in enumerate(self.nodes) for ch in n.get('children',[])}
        self.joints=self.skin['joints'];self.names=[self.nodes[j]['name'] for j in self.joints]
        self.ibm=self.acc(self.skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
        anim=next(a for a in self.doc['animations'] if a['name']=='Idle')
        self.channels={}
        for ch in anim['channels']:
            samp=anim['samplers'][ch['sampler']]
            times=self.acc(samp['input']).reshape(-1).astype(float)
            values=self.acc(samp['output']).astype(float)
            kind=samp.get('interpolation','LINEAR')
            if kind=='CUBICSPLINE': values=values.reshape(len(times),3,-1)
            self.channels[(ch['target']['node'],ch['target']['path'])]=(times,values,kind)
        alltimes=np.concatenate([v[0] for v in self.channels.values()])
        self.start=float(alltimes.min());self.end=float(alltimes.max());self.duration=self.end-self.start
        self.keytimes=np.unique(alltimes)
        meshnode=next(n for n in self.nodes if n.get('skin')==0 and 'mesh' in n)
        primitives=self.doc['meshes'][meshnode['mesh']]['primitives']
        assert len(primitives)==1, 'Approved source has one skinned primitive'
        attrs=primitives[0]['attributes'];self.points=self.acc(attrs['POSITION']).astype(float)
        inds=self.acc(attrs['JOINTS_0']).astype(int);weights=self.acc(attrs['WEIGHTS_0']).astype(float)
        self.weights=np.zeros((len(self.points),len(self.joints)))
        np.add.at(self.weights,(np.arange(len(inds))[:,None],inds),weights)
        self.hom=np.c_[self.points,np.ones(len(self.points))]

    def acc(self,i):
        a=self.doc['accessors'][i];v=self.doc['bufferViews'][a['bufferView']]
        dtype={5120:'i1',5121:'u1',5122:'<i2',5123:'<u2',5125:'<u4',5126:'<f4'}[a['componentType']]
        dims={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];dt=np.dtype(dtype)
        values=np.ndarray((a['count'],dims),dtype=dt,buffer=self.bin,
            offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',dims*dt.itemsize),dt.itemsize)).copy()
        assert 'sparse' not in a
        if a.get('normalized') and a['componentType']!=5126:
            values=values.astype(float)/np.iinfo(dt).max
            if np.issubdtype(dt,np.signedinteger):values=np.maximum(values,-1)
        return values

    def value(self,node,path,t):
        channel=self.channels.get((node,path))
        if channel is None:
            return np.array(self.nodes[node].get(path,{'translation':[0,0,0],'rotation':[0,0,0,1],'scale':[1,1,1]}[path]),float)
        times,vals,kind=channel
        if t<=times[0]:return vals[0,1] if kind=='CUBICSPLINE' else vals[0]
        if t>=times[-1]:return vals[-1,1] if kind=='CUBICSPLINE' else vals[-1]
        i=int(np.searchsorted(times,t,side='right')-1);dt=times[i+1]-times[i];u=(t-times[i])/dt
        if kind=='STEP':return vals[i]
        if kind=='CUBICSPLINE':
            value=((2*u**3-3*u**2+1)*vals[i,1]+(u**3-2*u**2+u)*dt*vals[i,2]
                   +(-2*u**3+3*u**2)*vals[i+1,1]+(u**3-u**2)*dt*vals[i+1,0])
            return value/np.linalg.norm(value) if path=='rotation' else value
        assert kind=='LINEAR'
        return slerp(vals[i],vals[i+1],u) if path=='rotation' else vals[i]*(1-u)+vals[i+1]*u

    def local_values(self,t):
        return [[self.value(j,p,t) for p in ('translation','rotation','scale')] for j in self.joints]

    def skin_matrices(self,t):
        cache={}
        def world(i):
            if i not in cache:
                node=self.nodes[i]
                if 'matrix' in node:local=np.array(node['matrix']).reshape(4,4).T
                else:local=trs(*(self.value(i,p,t) for p in ('translation','rotation','scale')))
                cache[i]=world(self.parents[i])@local if i in self.parents else local
            return cache[i]
        return np.array([world(j)@ib for j,ib in zip(self.joints,self.ibm)])

def stage_signature(stage, components=False):
    """Semantic checksum of every authored scene field except allowed timeline/Idle samples."""
    layer=stage.GetRootLayer();root=layer.pseudoRoot
    parts=[('layer',stable({k:root.GetInfo(k) for k in root.ListInfoKeys() if k not in ('startTimeCode','endTimeCode','timeCodesPerSecond')}))]
    for prim in stage.Traverse():
        parts.append(('prim',str(prim.GetPath()),prim.GetTypeName(),stable(prim.GetAllMetadata())))
        for rel in prim.GetRelationships():parts.append(('rel',str(rel.GetPath()),str(rel.GetTargets()),stable(rel.GetAllMetadata())))
        for attr in prim.GetAttributes():
            if prim.GetTypeName()=='SkelAnimation' and attr.GetName() in ('rotations','scales'):continue
            if not attr.IsAuthored():continue
            parts.append(('attr',str(attr.GetPath()),stable(attr.GetAllMetadata()),str(attr.Get()),str([(t,attr.Get(t)) for t in attr.GetTimeSamples()])))
    return parts if components else sha(repr(parts).encode())

def usd_queries(stage):
    skel=next(UsdSkel.Skeleton(p) for p in stage.Traverse() if p.GetTypeName()=='Skeleton')
    anim=next(UsdSkel.Animation(p) for p in stage.Traverse() if p.GetTypeName()=='SkelAnimation')
    mesh=next(p for p in stage.Traverse() if p.GetTypeName()=='Mesh')
    root=next(UsdSkel.Root(p) for p in stage.Traverse() if p.GetTypeName()=='SkelRoot')
    cache=UsdSkel.Cache();assert cache.Populate(root,Usd.PrimDefaultPredicate)
    return skel,anim,mesh,cache,cache.GetSkelQuery(skel),cache.GetSkinningQuery(mesh)

def map_geometry(glb,stage,mesh,skel):
    usd_points=np.asarray(mesh.GetAttribute('points').Get(),float)
    converted=np.c_[usd_points,np.ones(len(usd_points))]@C.T
    names=[str(j).split('/')[-1] for j in skel.GetJointsAttr().Get()]
    assert names==glb.names,(names,glb.names)
    indices=mesh.GetAttribute('primvars:skel:jointIndices')
    widths=indices.GetMetadata('elementSize');inds=np.array(indices.Get()).reshape(-1,widths)
    ws=np.array(mesh.GetAttribute('primvars:skel:jointWeights').Get()).reshape(-1,widths)
    uw=np.zeros((len(usd_points),len(names)))
    np.add.at(uw,(np.arange(len(inds))[:,None],inds),ws)
    mapping=[];lookup={}
    for i,p in enumerate(glb.points):lookup.setdefault(tuple(np.round(p,5)),[]).append(i)
    for p,w in zip(converted[:,:3],uw):
        candidates=lookup.get(tuple(np.round(p,5)),[])
        assert candidates,'No GLB vertex at USD bind point '+str(p)
        distance=np.linalg.norm(glb.points[candidates]-p,axis=1)
        wi=np.max(np.abs(glb.weights[candidates]-w),axis=1)
        # Blender's approved GLB exporter prunes tiny influences which its USD
        # exporter keeps; baseline maximum is below0.0002. Keep approved USD
        # weights and include this pre-existing difference in the error bound.
        good=np.flatnonzero((distance<3e-7)&(wi<5e-4))
        assert len(good),'Geometry/weight mismatch '+str((p,float(distance.min()),float(wi.min())))
        mapping.append(candidates[int(good[np.argmin(distance[good])])])
    mapping=np.array(mapping)
    return usd_points,uw,mapping,{'usd_vertex_count':len(usd_points),'glb_vertex_count':len(glb.points),
        'bind_position_max_difference_m':float(np.linalg.norm(glb.points[mapping]-converted[:,:3],axis=1).max()),
        'joint_weights_max_difference':float(np.abs(glb.weights[mapping]-uw).max()),
        'all_usd_vertices_mapped_to_matching_glb_bind_positions':True,
        'weight_tolerance':0.0005,
        'weight_precision_note':'Approved Blender GLB prunes tiny influences that approved USD retains; all unchanged USD weights are checked and measured against GLB'}

def validate_world(glb,stage,report_dir,baseline=False):
    skel,anim,mesh,cache,sq,skin=usd_queries(stage)
    points,weights,mapping,gcheck=map_geometry(glb,stage,mesh,skel)
    start=stage.GetStartTimeCode();fps=stage.GetTimeCodesPerSecond()
    # Full-loop samples include every GLB key and a regular120fps grid; also
    # verify120fps half-step times, where USD interpolates baked rotations.
    keytimes=np.unique(np.r_[glb.keytimes,np.linspace(glb.start,glb.end,round(glb.duration*120)+1)])
    probe=np.unique(np.r_[keytimes,(keytimes[:-1]+keytimes[1:])/2])
    xform=np.array(UsdGeom.XformCache(start).GetLocalToWorldTransform(skel.GetPrim())).T
    assert np.max(np.abs(xform-C))<1e-7
    max_mat=0.;max_bound=0.;max_time=0.;max_scale=0.;max_rot=0.;extrema={0,len(probe)-1}
    # An all-vertices coordinate error bound, accounting for each vertex's
    # approved weights and coordinate, can be computed from matrix deltas.
    usd_hom=np.c_[points,np.ones(len(points))]
    # Per-joint maximal weighted absolute homogeneous bind components form a
    # conservative bound without repeatedly skinning the full mesh.
    coefficient=np.array([np.max(np.abs(usd_hom)*weights[:,j,None],axis=0) for j in range(len(glb.joints))])
    weight_delta=weights-glb.weights[mapping]
    weight_coefficient=np.array([np.max(np.abs(usd_hom)*np.abs(weight_delta[:,j,None]),axis=0) for j in range(len(glb.joints))])
    weight_sum_coefficient=np.max(np.abs(usd_hom)*np.abs(weight_delta.sum(axis=1)[:,None]),axis=0)
    position_delta=glb.hom[mapping]-usd_hom@C.T
    position_coefficient=np.array([np.max(np.abs(position_delta)*glb.weights[mapping,j,None],axis=0) for j in range(len(glb.joints))])
    stats=[];joint_rotations=[]
    for ti,t in enumerate(probe):
        tc=start+(t-glb.start)*fps
        usdmat=np.array(sq.ComputeSkinningTransforms(tc)).transpose(0,2,1)
        glbmat=glb.skin_matrices(t)
        # Convert GLB skin matrices into USD bind coordinates, then compare
        # directly in world space after the skeleton container transform.
        ud=xform@usdmat;gd=glbmat@C
        delta=ud-gd;matrix=float(np.abs(delta).max())
        error_bound_vector=(np.sum(np.abs(delta[:,:3,:])*coefficient[:,None,:],axis=(0,2))
            +np.sum(np.abs(gd[:,:3,:]-gd[0,:3,:])*weight_coefficient[:,None,:],axis=(0,2))
            +np.sum(np.abs(gd[0,:3,:])*weight_sum_coefficient[None,:],axis=1)
            +np.sum(np.abs(glbmat[:,:3,:])*position_coefficient[:,None,:],axis=(0,2)))
        bound=float(np.linalg.norm(error_bound_vector))+2e-7
        if matrix>max_mat:max_mat=matrix
        if bound>max_bound:max_bound=bound;max_time=float(t)
        vals=glb.local_values(t)
        scale=float(np.max(np.abs(np.array([v[2] for v in vals])-1)))
        head=vals[glb.names.index('Head')][1];rotation=float(2*math.acos(np.clip(abs(head[3]/np.linalg.norm(head)),-1,1)))
        stats.append((scale,rotation));joint_rotations.append([v[1] for v in vals])
    stats=np.asarray(stats)
    for column in range(stats.shape[1]):extrema.update([int(np.argmax(stats[:,column])),int(np.argmin(stats[:,column]))])
    # All animated joints' individual axis maxima/minima plus equal loop
    # intervals exercise head/ear gesture extrema and continuous breathing.
    joint_rotations=np.asarray(joint_rotations)
    for name in ('Chest','Head','EarLeft','EarRight','TailTip'):
        idx=glb.names.index(name)
        array=joint_rotations[:,idx,:]
        for column in range(4):extrema.update([int(np.argmax(array[:,column])),int(np.argmin(array[:,column]))])
    extrema.update(int(np.argmin(np.abs(probe-t))) for t in np.linspace(glb.start,glb.end,33))
    full=[];native_world_first=None;native_world_last=None
    for i in sorted(extrema):
        t=float(probe[i]);tc=start+(t-glb.start)*fps
        native=Vt.Vec3fArray(mesh.GetAttribute('points').Get());assert skin.ComputeSkinnedPoints(sq.ComputeSkinningTransforms(tc),native,tc)
        native_world=np.c_[np.asarray(native,float),np.ones(len(native))]@xform.T
        gm=glb.skin_matrices(t);mapped=glb.hom[mapping]
        reference=np.zeros((len(mapping),4))
        for j in range(len(glb.joints)):reference+=(mapped@gm[j].T)*glb.weights[mapping,j,None]
        errors=np.linalg.norm(native_world[:,:3]-reference[:,:3],axis=1)
        full.append({'seconds':t-glb.start,'all_vertices':len(mapping),'max_world_difference_m':float(errors.max()),'rms_world_difference_m':float(np.sqrt(np.mean(errors**2)))})
        if i==0:native_world_first=native_world
        if i==len(probe)-1:native_world_last=native_world
    native_loop=float(np.linalg.norm(native_world_first[:,:3]-native_world_last[:,:3],axis=1).max())
    result={'geometry':gcheck,'full_loop_probe_count':len(probe),'duration_seconds':glb.duration,
        'all_loop_skin_matrix_max_component_difference':max_mat,
        'all_vertices_full_loop_conservative_world_error_bound_m':max_bound,
        'worst_bound_seconds':max_time-glb.start,'native_full_mesh_extrema_and_loop_samples':full,
        'native_full_mesh_max_world_difference_m':max(x['max_world_difference_m'] for x in full),
        'native_full_mesh_loop_endpoint_difference_m':native_loop,
        'method':'Independent glTF LINEAR/CUBICSPLINE evaluator vs native UsdSkel query; every source key +120fps samples/midpoints; all-mesh native checks at gesture/chest extrema and33 loop frames',
        'precision_note':'UsdSkel scales are schema-required half3; small chest-scale rounding differences are measured, while rotations are float32',
        'passed':max_bound<.0005 and native_loop<1e-6 and max(x['max_world_difference_m'] for x in full)<.0002}
    return result

def export(ident,baseline=False):
    reportdir=WORK/'usdz'/ident;reportdir.mkdir(parents=True,exist_ok=True)
    source=ROOT/'work/pre-v7-ambient/poses'/(ident+'.usdz')
    glbpath=ROOT/'work/pre-v7-ambient/poses'/(ident+'.glb') if baseline else WORK/'exports'/(ident+'.glb')
    glb=Glb(glbpath)
    if baseline:
        stage=Usd.Stage.Open(str(source));result=validate_world(glb,stage,reportdir,True)
        (reportdir/'baseline-equivalence.json').write_text(json.dumps(result,indent=2)+'\n')
        print(ident,'BASELINE',result['passed'],'bound_m',result['all_vertices_full_loop_conservative_world_error_bound_m'],'fullmesh_m',result['native_full_mesh_max_world_difference_m'],flush=True)
        return result
    unpack=reportdir/'stage';unpack.mkdir(exist_ok=True)
    with zipfile.ZipFile(source) as z:
        members=z.namelist();assert members[0].endswith(('.usd','.usda','.usdc'))
        z.extractall(unpack);old_images={name:sha(z.read(name)) for name in members[1:]}
    stage=Usd.Stage.Open(str(unpack/members[0]));before_parts=stage_signature(stage,True);before=sha(repr(before_parts).encode())
    skel,anim,mesh,cache,sq,skin=usd_queries(stage)
    assert [str(j).split('/')[-1] for j in anim.GetJointsAttr().Get()]==glb.names
    static=np.asarray(anim.GetTranslationsAttr().Get(),float)
    # All translations in this approved candidate are stationary. Preserve
    # their original authored values rather than serializing redundant tracks.
    for t in glb.keytimes:
        candidate=np.array([v[0] for v in glb.local_values(float(t))]);candidate[0]=(CI@np.r_[candidate[0],1])[:3]
        assert np.max(np.abs(candidate-static))<1e-7,'Unexpected animated joint translation'
    times=np.unique(np.r_[glb.keytimes,np.linspace(glb.start,glb.end,round(glb.duration*120)+1)])
    # Deduplicate near-equal float32 source and ideal grid keytimes. Retain the
    # source keytime precision, with maximum removed separation below1us.
    keep=np.r_[True,np.diff(times)>1e-6];times=times[keep]
    if times[-1]<glb.end:times=np.r_[times,glb.end]
    qroot=np.array([math.sqrt(.5),0,0,math.sqrt(.5)])
    rots=anim.GetRotationsAttr();scales=anim.GetScalesAttr();rots.Clear();scales.Clear()
    for i,t in enumerate(times):
        vals=glb.local_values(float(t));quats=[v[1] for v in vals];quats[0]=qmul(qroot,quats[0])
        rq=Vt.QuatfArray([Gf.Quatf(float(q[3]),Gf.Vec3f(*(float(v) for v in q[:3]))) for q in quats])
        sv=Vt.Vec3hArray([Gf.Vec3h(*(float(v) for v in local[2])) for local in vals])
        tc=1+(float(t)-glb.start)*24
        assert rots.Set(rq,tc) and scales.Set(sv,tc)
        if i==0:assert rots.Set(rq) and scales.Set(sv)
    stage.SetStartTimeCode(1);stage.SetEndTimeCode(1+glb.duration*24);stage.SetTimeCodesPerSecond(24)
    after_parts=stage_signature(stage,True)
    if after_parts!=before_parts:
        changed=[{'before':str(a)[:1500],'after':str(b)[:1500]} for a,b in zip(before_parts,after_parts) if a!=b]
        (reportdir/'field-difference-debug.json').write_text(json.dumps(changed,indent=2)+'\n')
    assert after_parts==before_parts,'Non-animation scene fields changed'
    assert stage.GetRootLayer().Save()
    out=WORK/'usdz'/(ident+'.usdz')
    if out.exists():out.unlink()
    subprocess.run(['/usr/bin/usdzip',str(out),'--asset',str(unpack/members[0])],cwd=unpack,check=True,capture_output=True,text=True)
    strict=subprocess.run(['/usr/bin/usdchecker','--arkit','--strict',str(out)],capture_output=True,text=True,timeout=180)
    (reportdir/'usdchecker-strict.txt').write_text(strict.stdout+strict.stderr)
    with zipfile.ZipFile(out) as z:
        new_images={name:sha(z.read(name)) for name in z.namelist()[1:]}
        assert old_images==new_images,'Embedded image bytes changed'
        assert all(m.compress_type==zipfile.ZIP_STORED for m in z.infolist())
        dimensions={name:image_dimensions(z.read(name)) for name in z.namelist() if name.lower().endswith(('.jpg','.jpeg','.png'))}
        assert dimensions and all(v==[4096,4096] for v in dimensions.values())
    reopened=Usd.Stage.Open(str(out));assert stage_signature(reopened)==before
    result=validate_world(glb,reopened,reportdir)
    result.update(pose=ident,source_usdz=str(source),source_usdz_sha256=sha(source.read_bytes()),
        candidate_glb=str(glbpath),candidate_glb_sha256=glb.digest,file=str(out),sha256=sha(out.read_bytes()),bytes=out.stat().st_size,
        texture_members_sha256=new_images,texture_dimensions=dimensions,original_embedded_image_bytes_unchanged=True,
        all_non_animation_scene_fields_semantically_unchanged=True,animation_baked_sample_count=len(times),
        arkit_strict_exit_code=strict.returncode,arkit_strict_passed=strict.returncode==0,phone_ar_verified=False)
    result['passed']=result['passed'] and strict.returncode==0
    (reportdir/'report.json').write_text(json.dumps(result,indent=2)+'\n')
    print(ident,'PASS' if result['passed'] else 'FAIL','keys',len(times),'bound_m',result['all_vertices_full_loop_conservative_world_error_bound_m'],'fullmesh_m',result['native_full_mesh_max_world_difference_m'],'strict',strict.returncode,flush=True)
    assert result['passed'],ident+' validation failed'
    return result

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--pose',action='append');parser.add_argument('--baseline',action='store_true');parser.add_argument('--summary-name');args=parser.parse_args()
    results=[export(p,args.baseline) for p in args.pose or ['pose-%02d'%i for i in range(1,7)]]
    summary={'passed':all(r['passed'] for r in results),'phone_ar_verified':False,'results':results}
    (WORK/'usdz'/(args.summary_name or ('baseline-summary.json' if args.baseline else 'validation-summary.json'))).write_text(json.dumps(summary,indent=2)+'\n')
