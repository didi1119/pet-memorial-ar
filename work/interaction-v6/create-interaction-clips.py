#!/usr/bin/env python3
"""Append approved one-shot Pet/Call clips without re-exporting source GLBs.

Run with the bundled Python runtime (NumPy is already available there).
Source JSON arrays and every original BIN byte are kept unchanged; only new
animation/accessor/bufferView records and the buffer length are appended.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import math
import os
from pathlib import Path
import struct
import tempfile

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
FPS = 30
CLIPS = {
    "Pet": {
        "duration_seconds": 2.8,
        "yaw_degrees": 1.6,
        "lean_degrees": 1.5,
        "raise_degrees": 0.0,
        "ear_left_degrees": 5.5,
        "ear_right_degrees": 5.0,
        "head_envelope": [0.16, 0.86, 1.50, 2.68],
        "left_ear_envelope": [0.35, 0.65, 0.72, 1.12],
        "right_ear_envelope": [0.62, 0.85, 0.94, 1.30],
        "intent": "gentle head lean and asymmetric ear response, then rest",
    },
    "Call": {
        "duration_seconds": 3.2,
        "yaw_degrees": 3.4,
        "lean_degrees": 0.0,
        "raise_degrees": 1.8,
        "ear_left_degrees": 3.0,
        "ear_right_degrees": 2.8,
        "head_envelope": [0.12, 0.72, 1.82, 3.05],
        "left_ear_envelope": [0.25, 0.55, 1.05, 1.80],
        "right_ear_envelope": [0.32, 0.64, 1.12, 1.90],
        "intent": "slight attentive head raise and turn, then rest",
    },
}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical(data) -> bytes:
    return json.dumps(data, sort_keys=True, separators=(",", ":")).encode()


def atomic_write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix=path.name + ".", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


class GLB:
    def __init__(self, raw: bytes):
        self.raw = raw
        magic, version, length = struct.unpack_from("<III", raw)
        assert (magic, version, length) == (0x46546C67, 2, len(raw))
        pos = 12
        chunks = []
        while pos < len(raw):
            size, kind = struct.unpack_from("<II", raw, pos)
            chunks.append((kind, raw[pos + 8:pos + 8 + size]))
            pos += 8 + size
        assert pos == len(raw) and [x[0] for x in chunks] == [0x4E4F534A, 0x004E4942]
        self.doc = json.loads(chunks[0][1])
        self.bin = chunks[1][1]
        assert len(self.doc["buffers"]) == 1 and "uri" not in self.doc["buffers"][0]
        assert len(self.bin) >= self.doc["buffers"][0]["byteLength"]

    def accessor(self, index: int) -> np.ndarray:
        a = self.doc["accessors"][index]
        assert "sparse" not in a
        view = self.doc["bufferViews"][a["bufferView"]]
        assert view["buffer"] == 0
        dimension = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}[a["type"]]
        dtype = np.dtype({5126: "<f4", 5125: "<u4", 5123: "<u2", 5121: "<u1"}[a["componentType"]])
        offset = view.get("byteOffset", 0) + a.get("byteOffset", 0)
        stride = view.get("byteStride", dtype.itemsize * dimension)
        return np.ndarray((a["count"], dimension), dtype=dtype, buffer=self.bin,
                          offset=offset, strides=(stride, dtype.itemsize)).copy()

    def accessor_bytes(self, index: int) -> bytes:
        return self.accessor(index).tobytes()


def quat_mul(a, b):
    av, bv = np.asarray(a)[:3], np.asarray(b)[:3]
    return np.r_[a[3] * bv + b[3] * av + np.cross(av, bv), a[3] * b[3] - av @ bv]


def quat_axis(axis, angle, speed=0.0):
    h = angle / 2
    value = np.r_[np.asarray(axis) * math.sin(h), math.cos(h)]
    derivative = np.r_[np.asarray(axis) * math.cos(h) * speed / 2, -math.sin(h) * speed / 2]
    return value, derivative


def quat_matrix(q):
    x, y, z, w = np.asarray(q) / np.linalg.norm(q)
    return np.array([[1 - 2 * (y*y + z*z), 2 * (x*y - z*w), 2 * (x*z + y*w)],
                     [2 * (x*y + z*w), 1 - 2 * (x*x + z*z), 2 * (y*z - x*w)],
                     [2 * (x*z - y*w), 2 * (y*z + x*w), 1 - 2 * (x*x + y*y)]])


def pulse(t, stops):
    """A C2 minimum-jerk rise, short hold, and return; zero at both ends."""
    start, peak, release, finish = stops
    if t <= start or t >= finish:
        return 0.0, 0.0
    if peak <= t <= release:
        return 1.0, 0.0
    if t < peak:
        u = (t - start) / (peak - start)
        return u**3 * (10 - 15*u + 6*u*u), 30*u*u*(1-u)**2/(peak-start)
    u = (t - release) / (finish - release)
    return 1 - u**3 * (10 - 15*u + 6*u*u), -30*u*u*(1-u)**2/(finish-release)


def components(vertex_count, triangles):
    """Exclude detached whisker/hair islands from the head click volume."""
    parent = list(range(vertex_count))
    size = [1] * vertex_count
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    def union(a, b):
        a, b = find(int(a)), find(int(b))
        if a == b:
            return
        if size[a] < size[b]:
            a, b = b, a
        parent[b] = a
        size[a] += size[b]
    for tri in triangles:
        union(tri[0], tri[1])
        union(tri[1], tri[2])
    labels = np.array([find(i) for i in range(vertex_count)])
    ids, counts = np.unique(labels, return_counts=True)
    return labels, dict(zip(ids.tolist(), counts.tolist()))


def anatomy(source: GLB, ident: str):
    doc = source.doc
    nodes = doc["nodes"]
    node_map = {n["name"]: i for i, n in enumerate(nodes) if "name" in n}
    # Existing V5 rigs deliberately use identity rest rotations; inspect rather
    # than assume a Blender local-axis convention survived export.
    for node in nodes:
        assert "matrix" not in node
        assert np.allclose(node.get("rotation", [0, 0, 0, 1]), [0, 0, 0, 1])
        assert np.allclose(node.get("scale", [1, 1, 1]), [1, 1, 1])
    skin = doc["skins"][0]
    bones = [nodes[j]["name"] for j in skin["joints"]]
    assert set(bones) == {"Root", "Chest", "Head", "EarLeft", "EarRight", "TailTip"}
    primitive = doc["meshes"][0]["primitives"][0]
    assert len(doc["meshes"][0]["primitives"]) == 1
    attr = primitive["attributes"]
    p = source.accessor(attr["POSITION"]).astype(float)
    j = source.accessor(attr["JOINTS_0"]).astype(int)
    w = source.accessor(attr["WEIGHTS_0"]).astype(float)
    bw = {name: np.sum(w * (j == index), axis=1) for index, name in enumerate(bones)}
    pivot = np.array(nodes[node_map["Head"]]["translation"], dtype=float)
    ear_bases = [pivot + np.array(nodes[node_map[n]]["translation"]) for n in ["EarLeft", "EarRight"]]
    landmarks = json.loads((ROOT / "work/motion-geometry/landmarks.json").read_text())["poses"][ident]
    head_center_blender = np.array(landmarks["head"]["center"])
    head_center_gltf = head_center_blender[[0, 2, 1]] * [1, 1, -1]
    # Rigid head-front vertices define the actual horizontal face direction.
    # The supplied landmark only chooses the anterior half; the resulting axis
    # is measured from source vertices relative to the actual GLB Head pivot.
    preliminary = head_center_gltf - pivot
    preliminary[1] = 0
    preliminary /= np.linalg.norm(preliminary)
    rigid = (bw["Head"] > .90) & ((bw["EarLeft"] + bw["EarRight"]) < .03)
    radius = np.array(landmarks["head"]["radii"])[[0, 2, 1]]
    body_head_zone = np.sum(((p - head_center_gltf) / radius)**2, axis=1) <= 1.1**2
    labels, counts = components(len(p), source.accessor(primitive["indices"]).ravel().reshape(-1, 3))
    component_head_counts = {label: int(np.sum((labels == label) & rigid & body_head_zone)) for label in counts}
    main_component = max(component_head_counts, key=component_head_counts.get)
    main = labels == main_component
    # Ear-base line follows existing skull tilt. Keep the click volume below it
    # and exclude vertices carrying ear weights, preserving tilted faces.
    e0, e1 = ear_bases
    slope = (e1[1] - e0[1]) / (e1[0] - e0[0])
    crown_plane = e0[1] + slope * (p[:, 0] - e0[0]) + .004
    head_click = rigid & body_head_zone & main & (p[:, 1] <= crown_plane)
    assert head_click.sum() > 500
    front_distance = (p - pivot) @ preliminary
    front_cut = np.percentile(front_distance[head_click], 70)
    front = head_click & (front_distance >= front_cut)
    assert front.sum() > 150
    front_center = p[front].mean(axis=0)
    forward = front_center - pivot
    forward[1] = 0
    forward /= np.linalg.norm(forward)
    up = np.array([0., 1., 0.])
    pitch_axis = np.cross(forward, up)
    pitch_axis /= np.linalg.norm(pitch_axis)
    # In right-handed glTF coordinates this positive pitch MUST raise the
    # anterior head surface. Verify a landmark displacement before accepting it.
    lift_probe, _ = quat_axis(pitch_axis, math.radians(CLIPS["Call"]["raise_degrees"]))
    lifted = (p[front] - pivot) @ quat_matrix(lift_probe).T + pivot
    lift_y = lifted[:, 1] - p[front, 1]
    assert np.min(lift_y) > 0, (ident, "pitch direction does not lift every selected anterior vertex")
    # Detect actual source yaw and ear axes from existing Idle rotation data.
    axes = {}
    for channel in doc["animations"][0]["channels"]:
        name = nodes[channel["target"]["node"]]["name"]
        if channel["target"]["path"] != "rotation" or name not in ["Head", "EarLeft", "EarRight"]:
            continue
        sampler = doc["animations"][0]["samplers"][channel["sampler"]]
        values = source.accessor(sampler["output"]).astype(float)
        if sampler.get("interpolation") == "CUBICSPLINE":
            values = values[1::3]
        nonzero = np.flatnonzero(np.linalg.norm(values[:, :3], axis=1) > 1e-5)
        assert len(nonzero)
        axis = values[nonzero[0], :3]
        axes[name] = axis / np.linalg.norm(axis)
    assert np.allclose(axes["Head"], up)
    margin = .003
    bounds_min = p[head_click].min(axis=0) - margin
    bounds_max = p[head_click].max(axis=0) + margin
    bounds_min[1] = max(bounds_min[1], pivot[1] + .004)
    inside_box = np.all((p >= bounds_min) & (p <= bounds_max), axis=1)
    root_only_inside = inside_box & (bw["Root"] >= .999)
    chest_inside = inside_box & (bw["Chest"] > .10)
    # Pose-05's protected raised paw can share a head AABB. Report and propose
    # a compact centered radius if necessary rather than expand toward the paw.
    box_center = (bounds_min + bounds_max) / 2
    radius_for_hit = float(np.min((bounds_max - bounds_min) / 2))
    metadata = {
        "pose": ident,
        "coordinate_system": "right-handed glTF / model-viewer model coordinates in meters; +Y up",
        "head_bounds": {"min": bounds_min.tolist(), "max": bounds_max.tolist()},
        "head_center": box_center.tolist(),
        "head_hit_radius_m": radius_for_hit,
        "head_bounds_selection": {
            "method": "Head weight >0.90, total Ear weights <0.03, source head ellipsoid, main head geometry component, below tilted ear-base crown plane; 3 mm margin",
            "source_vertices": int(len(p)), "selected_vertices": int(head_click.sum()),
            "detached_components_excluded": len(counts)-1,
            "root_only_vertices_inside_box": int(root_only_inside.sum()),
            "chest_weight_over_10pct_vertices_inside_box": int(chest_inside.sum()),
            "possible_paw_or_body_overlap": bool(root_only_inside.any() or chest_inside.any()),
            "hint": "Use the compact center radius as a fallback if the expanded head AABB admits a protected paw/body vertex.",
        },
        "head_pivot": pivot.tolist(),
        "front_surface_center": front_center.tolist(),
        "front_surface_vertex_count": int(front.sum()),
        "forward_axis": forward.tolist(),
        "head_yaw_axis": axes["Head"].tolist(),
        "head_raise_axis": pitch_axis.tolist(),
        "head_lean_axis": forward.tolist(),
        "ear_left_axis_from_idle": axes["EarLeft"].tolist(),
        "ear_right_axis_from_idle": axes["EarRight"].tolist(),
        "call_raise_direction_probe": {
            "degrees": CLIPS["Call"]["raise_degrees"],
            "front_vertex_lift_min_m": float(lift_y.min()),
            "front_vertex_lift_mean_m": float(lift_y.mean()),
            "front_vertex_lift_max_m": float(lift_y.max()),
            "all_front_vertices_raise": bool((lift_y > 0).all()),
        },
    }
    return node_map, bones, p, j, w, metadata


def pose_clip_spec(clip_name, anatomy_data):
    spec = dict(CLIPS[clip_name])
    if anatomy_data['pose'] == 'pose-01' and clip_name == 'Call':
        # Its approved lower muzzle has a narrow skin blend. A gentler combined
        # turn/raise retains the approved deformation range without new weights.
        spec.update(yaw_degrees=3.0, raise_degrees=1.0)
    return spec


def rotation_sample(t, clip_name, bone, anatomy_data):
    spec = pose_clip_spec(clip_name, anatomy_data)
    if bone == "Head":
        value, speed = pulse(t, spec["head_envelope"])
        yaw = math.radians(spec["yaw_degrees"])
        secondary = math.radians(spec["lean_degrees"] + spec["raise_degrees"])
        axis = anatomy_data["head_lean_axis"] if clip_name == "Pet" else anatomy_data["head_raise_axis"]
        a, da = quat_axis(anatomy_data["head_yaw_axis"], yaw * value, yaw * speed)
        b, db = quat_axis(axis, secondary * value, secondary * speed)
        return quat_mul(a, b), quat_mul(da, b) + quat_mul(a, db)
    if bone in ["EarLeft", "EarRight"]:
        side = "left" if bone == "EarLeft" else "right"
        value, speed = pulse(t, spec[side + "_ear_envelope"])
        angle = math.radians(spec["ear_" + side + "_degrees"])
        return quat_axis(anatomy_data["ear_" + side + "_axis_from_idle"], angle * value, angle * speed)
    return np.array([0., 0., 0., 1.]), np.zeros(4)


def add_accessor(doc, binary, values, kind, name, with_minmax=False):
    binary.extend(b"\0" * (-len(binary) % 4))
    values = np.asarray(values, dtype="<f4")
    if values.ndim == 1:
        values = values[:, None]
    payload = values.tobytes()
    view_index = len(doc["bufferViews"])
    doc["bufferViews"].append({"buffer": 0, "byteOffset": len(binary), "byteLength": len(payload), "name": name})
    binary.extend(payload)
    accessor_index = len(doc["accessors"])
    accessor = {"bufferView": view_index, "componentType": 5126, "count": len(values), "type": kind, "name": name}
    if with_minmax:
        accessor["min"] = values.min(axis=0).astype(float).tolist()
        accessor["max"] = values.max(axis=0).astype(float).tolist()
    doc["accessors"].append(accessor)
    return accessor_index


def append_clip(doc, binary, name, node_map, bones, anatomy_data):
    spec = pose_clip_spec(name, anatomy_data)
    duration = spec["duration_seconds"]
    times = np.linspace(0, duration, round(duration * FPS) + 1)
    sample_time = add_accessor(doc, binary, times, "SCALAR", name + "/time-30fps", True)
    static_time = add_accessor(doc, binary, [0, duration], "SCALAR", name + "/static-time", True)
    unit_scale = add_accessor(doc, binary, [[1, 1, 1], [1, 1, 1]], "VEC3", name + "/unit-scale")
    identity_rotation = add_accessor(doc, binary, [[0, 0, 0, 1], [0, 0, 0, 1]], "VEC4", name + "/identity-rotation")
    animation = {"name": name, "channels": [], "samplers": []}
    for bone in bones:
        node = node_map[bone]
        translation = doc["nodes"][node].get("translation", [0, 0, 0])
        rest_translation = add_accessor(doc, binary, [translation, translation], "VEC3", name + "/" + bone + "/rest-translation")
        if bone in ["Head", "EarLeft", "EarRight"]:
            samples = [rotation_sample(float(t), name, bone, anatomy_data) for t in times]
            values = np.array([record for q, dq in samples for record in [dq, q, dq]])
            rotation = add_accessor(doc, binary, values, "VEC4", name + "/" + bone + "/rotation-cubic")
            rot_sampler = {"input": sample_time, "output": rotation, "interpolation": "CUBICSPLINE"}
        else:
            rot_sampler = {"input": static_time, "output": identity_rotation, "interpolation": "STEP"}
        for path, sampler in [
            ("translation", {"input": static_time, "output": rest_translation, "interpolation": "STEP"}),
            ("rotation", rot_sampler),
            ("scale", {"input": static_time, "output": unit_scale, "interpolation": "STEP"}),
        ]:
            animation["channels"].append({"sampler": len(animation["samplers"]), "target": {"node": node, "path": path}})
            animation["samplers"].append(sampler)
    doc["animations"].append(animation)
    return animation


def cubic_values(times, data, t):
    """Read the actual float32 GLB keys, then sample glTF Hermite rotation."""
    if t <= times[0]:
        return data[1].copy()
    if t >= times[-1]:
        return data[-2].copy()
    k = int(np.searchsorted(times, t, side="right") - 1)
    dt = float(times[k+1] - times[k])
    u = float((t - times[k])/dt)
    a, da = data[3*k+1], data[3*k+2]
    b, db = data[3*(k+1)+1], data[3*(k+1)]
    return (2*u**3-3*u*u+1)*a + (u**3-2*u*u+u)*dt*da + (-2*u**3+3*u*u)*b + (u**3-u*u)*dt*db


def clip_metrics(glb, name, anatomy_data, p, j, w, bones, node_map):
    animation = next(x for x in glb.doc["animations"] if x["name"] == name)
    spec = pose_clip_spec(name, anatomy_data)
    tracks = {}
    for channel in animation["channels"]:
        sampler = animation["samplers"][channel["sampler"]]
        bone = glb.doc["nodes"][channel["target"]["node"]]["name"]
        tracks[(bone, channel["target"]["path"])] = (glb.accessor(sampler["input"]).ravel().astype(float),
                                                      glb.accessor(sampler["output"]).astype(float), sampler["interpolation"])
    time_grid = np.linspace(0, spec["duration_seconds"], round(spec["duration_seconds"]*FPS*4)+1)
    head_pivot = np.array(anatomy_data["head_pivot"])
    head_front = np.array(anatomy_data["front_surface_center"])
    rigid_h = np.sum(w * ((j == bones.index("Head")) | (j == bones.index("EarLeft")) | (j == bones.index("EarRight"))), axis=1)
    maximum_displacement = 0.0
    floor_motion = 0.0
    peaks = {n: 0.0 for n in bones}
    quaternion_norm_error = 0.0
    sampled = []
    inverse_bind = glb.accessor(glb.doc["skins"][0]["inverseBindMatrices"]).astype(float).reshape(-1,4,4).transpose(0,2,1)
    parents = {c: idx for idx, node in enumerate(glb.doc["nodes"]) for c in node.get("children", [])}
    def evaluate(t):
        locals_ = {}
        rotations = {}
        for bone in bones:
            times, data, interp = tracks[(bone, "rotation")]
            q = cubic_values(times, data, t) if interp == "CUBICSPLINE" else data[0]
            norm = np.linalg.norm(q)
            rotations[bone] = (q/norm, float(abs(norm-1)))
            matrix = np.eye(4)
            matrix[:3,:3] = quat_matrix(q)
            matrix[:3,3] = glb.doc["nodes"][node_map[bone]].get("translation", [0,0,0])
            locals_[node_map[bone]] = matrix
        worlds = {}
        def world(idx):
            if idx in worlds:
                return worlds[idx]
            local = locals_.get(idx, np.eye(4))
            worlds[idx] = world(parents[idx]) @ local if idx in parents else local
            return worlds[idx]
        matrices = np.array([world(node_map[bone]) @ inverse_bind[k] for k, bone in enumerate(bones)])
        moved = np.zeros_like(p)
        for slot in range(j.shape[1]):
            matrices_for_slot = matrices[j[:,slot]]
            transformed = np.einsum("nij,nj->ni",matrices_for_slot[:,:3,:3],p) + matrices_for_slot[:,:3,3]
            moved += transformed * w[:,slot,None]
        return moved, rotations
    rest, _ = evaluate(0)
    endpoint, _ = evaluate(spec["duration_seconds"])
    floor = p[:,1] < .03
    for t in time_grid:
        moved, rotations = evaluate(float(t))
        displacement = np.linalg.norm(moved-rest,axis=1)
        maximum_displacement = max(maximum_displacement,float(displacement.max()))
        if floor.any():
            floor_motion = max(floor_motion,float(displacement[floor].max()))
        for bone,(q,error) in rotations.items():
            peaks[bone] = max(peaks[bone],float(math.degrees(2*math.atan2(np.linalg.norm(q[:3]),abs(q[3])))))
            quaternion_norm_error = max(quaternion_norm_error,error)
        if abs(t*FPS - round(t*FPS)) < 1e-6:
            q=rotations["Head"][0]
            front=(head_front-head_pivot) @ quat_matrix(q).T + head_pivot
            sampled.append({"seconds":float(t),"head_angle_degrees":float(math.degrees(2*math.atan2(np.linalg.norm(q[:3]),abs(q[3])))),
                            "front_lift_m":float(front[1]-head_front[1]),"max_vertex_motion_m":float(displacement.max())})
    keys_endpoint_identity = all(np.array_equal(tracks[(bone,"rotation")][1][1 if tracks[(bone,"rotation")][2]=="CUBICSPLINE" else 0], [0,0,0,1]) and
                                 np.array_equal(tracks[(bone,"rotation")][1][-2 if tracks[(bone,"rotation")][2]=="CUBICSPLINE" else -1], [0,0,0,1]) for bone in bones)
    endpoint_tangents_zero = all(np.array_equal(tracks[(bone,"rotation")][1][0],np.zeros(4)) and
                                 np.array_equal(tracks[(bone,"rotation")][1][-1],np.zeros(4)) for bone in ["Head","EarLeft","EarRight"])
    scales_unit = all(np.array_equal(tracks[(bone,"scale")][1],np.ones((2,3))) for bone in bones)
    checks = {
        "identity_rotation_start_end": keys_endpoint_identity,
        "zero_start_end_rotation_velocity": endpoint_tangents_zero,
        "unit_scale_all_bones_all_times": scales_unit,
        "root_chest_tail_rotations_fixed": all(peaks[x]==0 for x in ["Root","Chest","TailTip"]),
        "floor_contact_fixed": floor_motion < 1e-8,
        "rest_endpoint_geometry_exact": np.array_equal(rest,endpoint),
        "head_motion_below_15mm": maximum_displacement < .015,
        "left_ear_within_6degrees": peaks["EarLeft"] <= 6.00001,
        "right_ear_within_5p5degrees": peaks["EarRight"] <= 5.50001,
        "sampled_quaternion_norm_error_below_1e_minus_6": quaternion_norm_error < 1e-6,
    }
    assert all(checks.values()), (name, checks)
    return {
        **spec, "fps":FPS,"rotation_interpolation":"CUBICSPLINE with analytic quaternion tangents",
        "authored_key_count_per_animated_bone":round(spec["duration_seconds"]*FPS)+1,
        "measured_sample_count":len(time_grid),"measured_sample_fps":FPS*4,
        "bone_peak_local_rotation_degrees":peaks,
        "max_vertex_motion_m":maximum_displacement,"floor_vertex_motion_m":floor_motion,
        "max_endpoint_vertex_difference_m":float(np.linalg.norm(endpoint-rest,axis=1).max()),
        "max_sampled_quaternion_norm_error":quaternion_norm_error,
        "head_hierarchy_vertices_over_99pct":int((rigid_h>.99).sum()),
        "checks":checks,"checks_passed":all(checks.values()),"frame_samples":sampled,
    }


def create(ident):
    source_path = ROOT / "outputs/poses" / (ident + ".glb")
    destination = HERE / "exports" / (ident + ".glb")
    source = GLB(source_path.read_bytes())
    assert [a.get("name") for a in source.doc["animations"]] == ["Idle"]
    node_map, bones, p, j, w, anatomy_data = anatomy(source, ident)
    doc = copy.deepcopy(source.doc)
    binary = bytearray(source.bin)
    for name in CLIPS:
        append_clip(doc, binary, name, node_map, bones, anatomy_data)
    doc["buffers"][0]["byteLength"] = len(binary)
    json_bytes = json.dumps(doc,separators=(",", ":")).encode()
    json_bytes += b" " * (-len(json_bytes) % 4)
    binary += b"\0" * (-len(binary) % 4)
    raw = struct.pack("<III",0x46546C67,2,12+8+len(json_bytes)+8+len(binary)) + struct.pack("<II",len(json_bytes),0x4E4F534A) + json_bytes + struct.pack("<II",len(binary),0x004E4942) + binary
    candidate = GLB(raw)
    preserved = {
        "source_bin_exact_prefix":candidate.bin[:len(source.bin)]==source.bin,
        "source_accessors_exact_prefix":candidate.doc["accessors"][:len(source.doc["accessors"])]==source.doc["accessors"],
        "source_buffer_views_exact_prefix":candidate.doc["bufferViews"][:len(source.doc["bufferViews"])]==source.doc["bufferViews"],
        "idle_json_exact":candidate.doc["animations"][0]==source.doc["animations"][0],
        "idle_sampler_bytes_exact":all(candidate.accessor_bytes(s[k])==source.accessor_bytes(s[k]) for s in source.doc["animations"][0]["samplers"] for k in ["input","output"]),
        "meshes_nodes_skins_images_materials_textures_exact":all(candidate.doc.get(k)==source.doc.get(k) for k in ["meshes","nodes","skins","images","materials","textures","samplers","scenes","scene","asset"]),
        "source_unchanged_on_disk":source_path.read_bytes()==source.raw,
        "new_clip_order": [a["name"] for a in candidate.doc["animations"]]==["Idle","Pet","Call"],
    }
    assert all(preserved.values())
    report = {
        "pose":ident,"source":str(source_path),"destination":str(destination),
        "source_sha256":sha(source.raw),"destination_sha256":sha(raw),
        "source_size_bytes":len(source.raw),"destination_size_bytes":len(raw),
        "source_bin_size_bytes":len(source.bin),"source_bin_sha256":sha(source.bin),
        "destination_original_bin_prefix_sha256":sha(candidate.bin[:len(source.bin)]),
        "source_idle_json_sha256":sha(canonical(source.doc["animations"][0])),
        "source_idle_accessor_sha256":sha(b"".join(source.accessor_bytes(s[k]) for s in source.doc["animations"][0]["samplers"] for k in ["input","output"])),
        "preservation_checks":preserved,"preservation_passed":all(preserved.values()),
        **anatomy_data,
        "clips":{name:clip_metrics(candidate,name,anatomy_data,p,j,w,bones,node_map) for name in CLIPS},
        "visual_naturalness_verified":False,
        "scope":"isolated GLB animation append; no source output edits, no USDZ/AR interactions added",
    }
    atomic_write(destination, raw)
    assert destination.read_bytes()==raw
    atomic_write(HERE / (ident+"-generation-metrics.json"),json.dumps(report,indent=2).encode()+b"\n")
    print(json.dumps({"pose":ident,"output":str(destination),"source_preserved":report["preservation_passed"],
                      "head_bounds":report["head_bounds"],"head_bounds_overlap":report["head_bounds_selection"]["possible_paw_or_body_overlap"],
                      "clips":{n:{"duration":m["duration_seconds"],"max_motion_mm":m["max_vertex_motion_m"]*1000,"checks_passed":m["checks_passed"]} for n,m in report["clips"].items()}}),flush=True)
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pose",action="append",choices=["pose-%02d"%i for i in range(1,7)])
    args = parser.parse_args()
    reports = [create(ident) for ident in args.pose or ["pose-%02d"%i for i in range(1,7)]]
    if not args.pose:
        summary = {"fps":FPS,"clips":CLIPS,"pose_count":len(reports),
                   "generation_checks_passed":all(r["preservation_passed"] and all(c["checks_passed"] for c in r["clips"].values()) for r in reports),
                   "poses": [{k:r[k] for k in ["pose","source_sha256","destination_sha256","head_bounds","head_center","head_hit_radius_m","head_bounds_selection","head_raise_axis","call_raise_direction_probe"]} for r in reports]}
        atomic_write(HERE/"generation-summary.json",json.dumps(summary,indent=2).encode()+b"\n")


if __name__ == "__main__":
    main()
