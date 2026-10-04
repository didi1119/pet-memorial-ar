#!/usr/bin/env python3
"""Build a seamless ambient Idle from approved V6 assets without re-exporting.

Only this directory is written. Every byte of the source BIN chunk is retained
as an exact prefix, including geometry, textures, skins and old motion data.
New timeline/rotation accessors are appended and only one Idle is exposed.
"""
from __future__ import annotations

import argparse
import copy
import importlib.util
import json
import math
from pathlib import Path
import struct
import sys

import numpy as np

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("approved_v6_motion", ROOT / "work/interaction-v6/create-interaction-clips.py")
v6 = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(v6)
DURATION = 32.0
PERIOD = 8.0
FPS = 30
REPEATS = 4
POSES = [f"pose-{i:02d}" for i in range(1, 7)]
PROFILE = {
    "pose-01": {"pet_start": 5.8, "call_start": 18.8, "pet_strength": .90, "call_strength": .80, "ear_offset": 0.00},
    "pose-02": {"pet_start": 4.7, "call_start": 20.5, "pet_strength": .85, "call_strength": .85, "ear_offset": .20},
    "pose-03": {"pet_start": 7.2, "call_start": 17.2, "pet_strength": .90, "call_strength": .85, "ear_offset": -.15},
    "pose-04": {"pet_start": 5.4, "call_start": 22.0, "pet_strength": .85, "call_strength": .82, "ear_offset": .35},
    "pose-05": {"pet_start": 8.1, "call_start": 19.6, "pet_strength": .88, "call_strength": .85, "ear_offset": -.25},
    "pose-06": {"pet_start": 6.5, "call_start": 21.0, "pet_strength": .90, "call_strength": .85, "ear_offset": .10},
}


def schedules(anatomy):
    """Stretch the approved shape gently; vary onset times between poses."""
    profile = PROFILE[anatomy["pose"]]
    heads, ears = [], []
    for kind, stretch in [("Pet", 1.15), ("Call", 1.25)]:
        source = v6.pose_clip_spec(kind, anatomy)
        start = profile[kind.lower() + "_start"]
        strength = profile[kind.lower() + "_strength"]
        target = {key: source[key] * strength for key in ["yaw_degrees", "lean_degrees", "raise_degrees"]}
        heads.append({"shape_source": kind, "strength_fraction": strength,
                      "time_stretch": stretch, "envelope_seconds": [start + t * stretch for t in source["head_envelope"]],
                      **target})
        for side, bone in [("left", "EarLeft"), ("right", "EarRight")]:
            ears.append({"bone": bone, "shape_source": kind,
                         "envelope_seconds": [start + t * stretch for t in source[side + "_ear_envelope"]],
                         "degrees": source["ear_" + side + "_degrees"] * strength})
    for bone, start, degrees, stops in [
        ("EarLeft", 1.7, 4.2, [0, .22, .26, .72]),
        ("EarRight", 11.6, 3.8, [0, .23, .29, .78]),
        ("EarLeft", 26.4, 4.6, [0, .24, .28, .80]),
        ("EarRight", 29.2, 4.0, [0, .24, .27, .79]),
    ]:
        ears.append({"bone": bone, "shape_source": "spontaneous_ear",
                     "envelope_seconds": [start + profile["ear_offset"] + t for t in stops], "degrees": degrees})
    for events in [heads, [e for e in ears if e["bone"] == "EarLeft"], [e for e in ears if e["bone"] == "EarRight"]]:
        ordered = sorted(events, key=lambda e: e["envelope_seconds"][0])
        assert all(0 < e["envelope_seconds"][0] < e["envelope_seconds"][-1] < DURATION for e in ordered)
        assert all(a["envelope_seconds"][-1] < b["envelope_seconds"][0] for a, b in zip(ordered, ordered[1:]))
    return {"head_events": heads, "ear_events": sorted(ears, key=lambda e: e["envelope_seconds"][0])}


def normalize_with_derivative(q, dq):
    length = np.linalg.norm(q)
    unit = q / length
    derivative = (dq - unit * (unit @ dq)) / length
    return unit, derivative


def original_head_peak(source):
    animation = source.doc["animations"][0]
    c = next(c for c in animation["channels"] if c["target"]["path"] == "rotation" and source.doc["nodes"][c["target"]["node"]]["name"] == "Head")
    sampler = animation["samplers"][c["sampler"]]
    values = source.accessor(sampler["output"]).astype(float)
    assert sampler.get("interpolation") == "LINEAR"
    return float(np.max(2 * np.arctan2(np.linalg.norm(values[:, :3], axis=1), np.abs(values[:, 3]))))


def rotation_sample(t, bone, anatomy, events, head_peak):
    if bone == "Head":
        phase = 2 * math.pi * t / PERIOD
        # Same source yaw profile, analytic derivatives remove tiny linear-key
        # changes in angular velocity. It never exceeds the approved amplitude.
        angle = head_peak * math.sin(phase)
        speed = head_peak * (2 * math.pi / PERIOD) * math.cos(phase)
        q, dq = v6.quat_axis(anatomy["head_yaw_axis"], angle, speed)
        for event in events["head_events"]:
            value, derivative = v6.pulse(t, event["envelope_seconds"])
            if value == 0 and derivative == 0:
                continue
            yaw, _ = v6.quat_axis(anatomy["head_yaw_axis"], math.radians(event["yaw_degrees"]))
            secondary_axis = anatomy["head_lean_axis"] if event["shape_source"] == "Pet" else anatomy["head_raise_axis"]
            secondary, _ = v6.quat_axis(secondary_axis, math.radians(event["lean_degrees"] + event["raise_degrees"]))
            target = v6.quat_mul(yaw, secondary)
            # Convex rotation blend, not an added angle. Differentiating the
            # normalized quaternion makes both transitions C2 smooth.
            raw = (1 - value) * q + value * target
            draw = (1 - value) * dq + derivative * (target - q)
            q, dq = normalize_with_derivative(raw, draw)
        return q, dq
    side = "left" if bone == "EarLeft" else "right"
    active = [e for e in events["ear_events"] if e["bone"] == bone]
    angle, speed = 0.0, 0.0
    for event in active:
        value, derivative = v6.pulse(t, event["envelope_seconds"])
        angle += math.radians(event["degrees"]) * value
        speed += math.radians(event["degrees"]) * derivative
    return v6.quat_axis(anatomy["ear_" + side + "_axis_from_idle"], angle, speed)


def tiled_values(source, sampler):
    times = source.accessor(sampler["input"]).ravel().astype(float)
    values = source.accessor(sampler["output"])
    assert sampler.get("interpolation") in ["LINEAR", "STEP"]
    assert np.array_equal(values[0], values[-1])
    if len(times) == 2 and np.array_equal(values[0], values[1]):
        return np.array([0., DURATION]), values.copy()
    assert len(times) == 193 and abs(times[-1] - times[0] - PERIOD) < 1e-6
    expected = np.arange(len(times)) / 24 + times[0]
    assert np.max(abs(times - expected)) < 1e-6
    # Original exporter has a1/24s offset. Content stays exact; only the new
    # timeline is normalized and tiled, with no inserted rest interval.
    return np.arange(REPEATS * (len(times) - 1) + 1) / 24, np.concatenate([values[:-1]] * REPEATS + [values[-1:]], axis=0)


def build_animation(source, doc, binary, anatomy, events):
    animation = {"name": "Idle", "channels": [], "samplers": []}
    modified = {"Head", "EarLeft", "EarRight"}
    head_peak = original_head_peak(source)
    samples = np.arange(round(DURATION * FPS) + 1) / FPS
    sample_index = v6.add_accessor(doc, binary, samples, "SCALAR", "AmbientIdle/time-30fps", True)
    track_reports = {}
    for channel in source.doc["animations"][0]["channels"]:
        old_sampler = source.doc["animations"][0]["samplers"][channel["sampler"]]
        target = channel["target"]
        name = source.doc["nodes"][target["node"]]["name"]
        path = target["path"]
        label = "AmbientIdle/" + name + "/" + path
        if name in modified and path == "rotation":
            pairs = [rotation_sample(float(t), name, anatomy, events, head_peak) for t in samples]
            # Enforce byte-identical wrap pose and velocity after trig evaluation.
            pairs[-1] = (pairs[0][0].copy(), pairs[0][1].copy())
            values = np.array([item for q, dq in pairs for item in [dq, q, dq]])
            output = v6.add_accessor(doc, binary, values, "VEC4", label + "-cubic")
            new_sampler = {"input": sample_index, "output": output, "interpolation": "CUBICSPLINE"}
            track_reports[name + "/" + path] = {"mode": "analytic_bounded_ambient", "key_count": len(samples), "interpolation": "CUBICSPLINE"}
        else:
            times, values = tiled_values(source, old_sampler)
            time_index = v6.add_accessor(doc, binary, times, "SCALAR", label + "-time", True)
            value_kind = source.doc["accessors"][old_sampler["output"]]["type"]
            output = v6.add_accessor(doc, binary, values, value_kind, label)
            new_sampler = {"input": time_index, "output": output, "interpolation": old_sampler.get("interpolation", "LINEAR")}
            original = source.accessor(old_sampler["output"])
            same_values = np.array_equal(values[:len(original)], original) if len(original) > 2 else np.array_equal(values, original)
            assert same_values
            track_reports[name + "/" + path] = {"mode": "original_values_tiled_exact", "key_count": len(times), "interpolation": new_sampler["interpolation"], "first_original_loop_key_values_exact": same_values, "source_output_sha256": v6.sha(original.tobytes())}
        animation["channels"].append({"sampler": len(animation["samplers"]), "target": copy.deepcopy(target)})
        animation["samplers"].append(new_sampler)
    doc["animations"] = [animation]
    return track_reports


def animation_metrics(candidate):
    peaks, endpoints, finite, unit_error = {}, {}, True, 0.
    animation = candidate.doc["animations"][0]
    for channel in animation["channels"]:
        sampler = animation["samplers"][channel["sampler"]]
        times = candidate.accessor(sampler["input"]).ravel().astype(float)
        data = candidate.accessor(sampler["output"]).astype(float)
        name = candidate.doc["nodes"][channel["target"]["node"]]["name"]
        path = channel["target"]["path"]
        key = name + "/" + path
        finite &= bool(np.isfinite(times).all() and np.isfinite(data).all() and (np.diff(times) > 0).all())
        cubic = sampler["interpolation"] == "CUBICSPLINE"
        values = data[1::3] if cubic else data
        endpoints[key] = {"pose_error": float(np.linalg.norm(values[0] - values[-1])),
                          "velocity_error": float(np.linalg.norm(data[2] - data[-3])) if cubic else None}
        if path == "rotation":
            check_times = np.arange(round(DURATION * 120) + 1) / 120
            if cubic:
                sampled = np.array([v6.cubic_values(times, data, float(t)) for t in check_times])
            else:
                sampled = values
            norm = np.linalg.norm(sampled, axis=1)
            unit_error = max(unit_error, float(np.max(abs(norm - 1))))
            q = sampled / norm[:, None]
            peaks[name] = float(np.max(np.degrees(2 * np.arctan2(np.linalg.norm(q[:, :3], axis=1), abs(q[:, 3])))))
    checks = {"exactly_one_exposed_Idle": [a["name"] for a in candidate.doc["animations"]] == ["Idle"],
              "finite_monotonic_all_tracks": finite,
              "all_tracks_start_0_end_32": all(candidate.accessor(s["input"])[0, 0] == 0 and candidate.accessor(s["input"])[-1, 0] == DURATION for s in animation["samplers"]),
              "exact_loop_pose_every_channel": all(e["pose_error"] == 0 for e in endpoints.values()),
              "exact_head_ear_loop_velocity": all(e["velocity_error"] == 0 for e in endpoints.values() if e["velocity_error"] is not None),
              "unit_quaternion_error_below_2e_minus_6": unit_error < 2e-6,
              "head_rotation_within_approved_5degrees": peaks["Head"] <= 5.00001,
              "left_ear_within_6degrees": peaks["EarLeft"] <= 6.00001,
              "right_ear_within_5p5degrees": peaks["EarRight"] <= 5.50001,
              "Root_and_Chest_rotation_fixed": peaks["Root"] == 0 and peaks["Chest"] == 0}
    assert all(checks.values()), checks
    return {"checks": checks, "passed": all(checks.values()), "bone_peak_rotation_degrees": peaks,
            "loop_channel_endpoints": endpoints, "max_sampled_quaternion_norm_error": unit_error, "rotation_sample_fps": 120}


def create(ident):
    source_path = ROOT / "work/pre-v7-ambient/poses" / (ident + ".glb")
    destination = HERE / "exports" / (ident + ".glb")
    source = v6.GLB(source_path.read_bytes())
    assert [a["name"] for a in source.doc["animations"]] == ["Idle", "Pet", "Call"]
    _, _, _, _, _, anatomy = v6.anatomy(source, ident)
    events = schedules(anatomy)
    doc = copy.deepcopy(source.doc)
    binary = bytearray(source.bin)
    tracks = build_animation(source, doc, binary, anatomy, events)
    doc["buffers"][0]["byteLength"] = len(binary)
    json_bytes = json.dumps(doc, separators=(",", ":")).encode()
    json_bytes += b" " * (-len(json_bytes) % 4)
    binary += b"\0" * (-len(binary) % 4)
    raw = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(json_bytes) + 8 + len(binary)) + struct.pack("<II", len(json_bytes), 0x4E4F534A) + json_bytes + struct.pack("<II", len(binary), 0x004E4942) + binary
    candidate = v6.GLB(raw)
    preservation = {"source_bin_exact_prefix": candidate.bin[:len(source.bin)] == source.bin,
                    "source_accessor_definitions_exact_prefix": candidate.doc["accessors"][:len(source.doc["accessors"])] == source.doc["accessors"],
                    "source_buffer_views_exact_prefix": candidate.doc["bufferViews"][:len(source.doc["bufferViews"])] == source.doc["bufferViews"],
                    "source_unchanged_on_disk": source_path.read_bytes() == source.raw}
    for key in ["meshes", "nodes", "skins", "images", "materials", "textures", "samplers", "scenes", "scene", "asset", "extensionsUsed", "extensionsRequired"]:
        preservation["source_" + key + "_exact"] = candidate.doc.get(key) == source.doc.get(key)
    assert all(preservation.values())
    metrics = animation_metrics(candidate)
    report = {"pose": ident, "source": str(source_path), "destination": str(destination),
              "source_sha256": v6.sha(source.raw), "destination_sha256": v6.sha(raw),
              "source_size_bytes": len(source.raw), "destination_size_bytes": len(raw),
              "source_bin_size_bytes": len(source.bin), "source_bin_sha256": v6.sha(source.bin),
              "destination_original_bin_prefix_sha256": v6.sha(candidate.bin[:len(source.bin)]),
              "duration_seconds": DURATION, "baseline_period_seconds": PERIOD, "baseline_repetitions": REPEATS,
              "source_idle_start_seconds": float(source.accessor(source.doc["animations"][0]["samplers"][0]["input"])[0, 0]),
              "ambient_rotation_fps": FPS, "original_chest_tail_fps": 24,
              "rotation_composition": "C2 minimum-jerk normalized quaternion convex blend from original3.5degree8s yaw toward an80-90pct approved Pet or Call peak shape; no head angle addition",
              "ear_composition": "nonoverlapping C2 minimum-jerk sparse local-axis pulses; independent timing between poses, bounded by existing approved angles",
              "schedules": events, "tracks": tracks, "anatomy": anatomy,
              "preservation_checks": preservation, "preservation_passed": all(preservation.values()),
              "animation_metrics": metrics, "visual_naturalness_verified": False,
              "scope": "isolated candidate GLB timeline authoring; geometry, textures, skins and all original BIN bytes unchanged; USDZ and web UI handled separately"}
    v6.atomic_write(destination, raw)
    assert destination.read_bytes() == raw
    v6.atomic_write(HERE / (ident + "-generation-metrics.json"), json.dumps(report, indent=2).encode() + b"\n")
    print(json.dumps({"pose": ident, "output": str(destination), "duration": DURATION, "bytes": len(raw), "preservation_passed": report["preservation_passed"], "animation_passed": metrics["passed"], "sha256": report["destination_sha256"]}), flush=True)
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pose", action="append", choices=POSES)
    args = parser.parse_args()
    reports = [create(ident) for ident in args.pose or POSES]
    summary = {"version": 7, "clip": "Idle", "duration_seconds": DURATION, "pose_count": len(reports),
               "generation_checks_passed": all(r["preservation_passed"] and r["animation_metrics"]["passed"] for r in reports),
               "poses": [{k: r[k] for k in ["pose", "destination", "source_sha256", "destination_sha256", "destination_size_bytes", "duration_seconds", "schedules"]} for r in reports]}
    if not args.pose:
        v6.atomic_write(HERE / "generation-summary.json", json.dumps(summary, indent=2).encode() + b"\n")


if __name__ == "__main__":
    main()
