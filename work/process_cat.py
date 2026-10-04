"""Prepare an imported cat GLB for editing, browser viewing, and future AR.

Run with Blender, outside the restricted Metal sandbox:
  Blender --background --factory-startup --python work/process_cat.py -- \
    --input outputs/cat-high-detail.glb --output-dir outputs --work-dir work

Only run after the actual generated asset is present. No network access is used.
The 0.40 m height is an explicit scale assumption, not measured from the photo.
The supplied source GLB is never changed. Generated files require --overwrite
when already present. --no-render permits export without preview rendering.
"""

import argparse
import hashlib
import json
import math
import re
import struct
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix, Vector


def arguments():
    values = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=Path("outputs/cat-high-detail.glb"))
    parser.add_argument("--output-dir", type=Path, default=Path("outputs"))
    parser.add_argument("--work-dir", type=Path, default=Path("work"))
    parser.add_argument("--height", type=float, default=0.40)
    parser.add_argument("--max-dimension", type=float, default=None,
                        help="Set the largest dimension instead of imposing the same height on different poses.")
    parser.add_argument("--mobile-triangles", type=int, default=100000)
    parser.add_argument("--mobile-texture-size", type=int, default=2048)
    parser.add_argument("--preserve-materials", action="store_true",
                        help="Preserve imported normals and material properties for supplied models.")
    parser.add_argument("--preserve-jpeg", action="store_true",
                        help="Keep opaque JPEG textures in their original format; PNG remains the default.")
    parser.add_argument("--resolution", type=int, default=1200)
    parser.add_argument("--samples", type=int, default=64)
    parser.add_argument("--engine", choices=("EEVEE", "CYCLES"), default="EEVEE")
    parser.add_argument("--preview-azimuth", type=float, default=-55.0,
                        help="Camera angle about Blender Z, in degrees; adjust after inspecting the source.")
    parser.add_argument("--preview-elevation", type=float, default=12.0)
    parser.add_argument("--no-render", action="store_true")
    parser.add_argument("--overwrite", action="store_true")
    result = parser.parse_args(values)
    if result.height <= 0 or result.mobile_triangles < 1000:
        parser.error("height must be positive and mobile-triangles must be at least 1000")
    if result.resolution < 256 or result.samples < 1:
        parser.error("resolution must be at least 256 and samples must be positive")
    for key in ("input", "output_dir", "work_dir"):
        setattr(result, key, getattr(result, key).expanduser().resolve())
    return result


def log(message):
    print(f"[cat] {message}", flush=True)


def ensure_finished(result, operation):
    if "FINISHED" not in result:
        raise RuntimeError(f"{operation} returned {result}")


def select(objects):
    bpy.ops.object.select_all(action="DESELECT")
    available = [obj for obj in objects if obj.name in bpy.context.view_layer.objects]
    for obj in available:
        obj.hide_set(False)
        obj.select_set(True)
    if available:
        bpy.context.view_layer.objects.active = available[0]


def world_bounds(objects):
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    lows, highs = [], []
    for obj in objects:
        if obj.type == "MESH":
            evaluated = obj.evaluated_get(depsgraph)
            mesh = evaluated.to_mesh(preserve_all_data_layers=False, depsgraph=depsgraph)
            try:
                if not len(mesh.vertices):
                    continue
                positions = np.empty(len(mesh.vertices) * 3, dtype=np.float32)
                mesh.vertices.foreach_get("co", positions)
                matrix = np.asarray(evaluated.matrix_world, dtype=np.float64)
                positions = positions.reshape(-1, 3) @ matrix[:3, :3].T + matrix[:3, 3]
                lows.append(positions.min(axis=0))
                highs.append(positions.max(axis=0))
            finally:
                evaluated.to_mesh_clear()
    if not lows:
        raise ValueError("The imported asset contains no mesh geometry")
    low = Vector(np.min(lows, axis=0))
    high = Vector(np.max(highs, axis=0))
    if not all(math.isfinite(value) for value in (*low, *high)):
        raise ValueError("Mesh bounds contain non-finite values")
    return low, high


def geometry_metrics(objects):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    counts = {"mesh_objects": 0, "vertices": 0, "triangles": 0,
              "uv_missing_meshes": [], "nonfinite_meshes": [],
              "degenerate_triangles": 0, "material_names": set()}
    details = []
    for obj in objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
        try:
            mesh.calc_loop_triangles()
            vertices = np.empty(len(mesh.vertices) * 3, dtype=np.float32)
            mesh.vertices.foreach_get("co", vertices)
            vertices = vertices.reshape(-1, 3)
            if not np.isfinite(vertices).all():
                counts["nonfinite_meshes"].append(obj.name)
            triangle_indices = np.empty(len(mesh.loop_triangles) * 3, dtype=np.int32)
            mesh.loop_triangles.foreach_get("vertices", triangle_indices)
            triangle_indices = triangle_indices.reshape(-1, 3)
            degenerate = 0
            if len(triangle_indices):
                corners = vertices[triangle_indices]
                twice_area = np.linalg.norm(np.cross(corners[:, 1] - corners[:, 0],
                                                    corners[:, 2] - corners[:, 0]), axis=1)
                degenerate = int((twice_area < 1e-14).sum())
            names = sorted({material.name for material in mesh.materials if material})
            counts["mesh_objects"] += 1
            counts["vertices"] += len(mesh.vertices)
            counts["triangles"] += len(mesh.loop_triangles)
            counts["degenerate_triangles"] += degenerate
            counts["material_names"].update(names)
            if not mesh.uv_layers:
                counts["uv_missing_meshes"].append(obj.name)
            details.append({"object": obj.name, "vertices": len(mesh.vertices),
                            "triangles": len(mesh.loop_triangles),
                            "uv_layers": [uv.name for uv in mesh.uv_layers],
                            "materials": names})
        finally:
            evaluated.to_mesh_clear()
    low, high = world_bounds(objects)
    counts["material_names"] = sorted(counts["material_names"])
    counts.update({"bounds_min": list(low), "bounds_max": list(high),
                   "dimensions": list(high - low), "meshes": details})
    if counts["nonfinite_meshes"] or not counts["triangles"]:
        raise ValueError(f"Invalid geometry: {counts}")
    return counts


def material_images(objects):
    materials = {mat for obj in objects if obj.type == "MESH"
                 for mat in obj.data.materials if mat}
    images, nodes, visited = set(), [], set()

    def visit(tree):
        if tree is None or tree.as_pointer() in visited:
            return
        visited.add(tree.as_pointer())
        for node in tree.nodes:
            if node.type == "TEX_IMAGE" and node.image:
                images.add(node.image)
                nodes.append(node)
            if node.type == "GROUP":
                visit(node.node_tree)

    for material in materials:
        visit(material.node_tree)
    return materials, images, nodes


def standardize_images(objects, folder, max_dimension=None, preserve_jpeg=False):
    """Decode texture pixels into lossless PNG; avoid WebP-only GLB extensions."""
    folder.mkdir(parents=True, exist_ok=True)
    materials, images, nodes = material_images(objects)
    converted, mapping = [], {}
    for index, original in enumerate(sorted(images, key=lambda image: image.name)):
        if original.source not in {"FILE", "GENERATED"}:
            raise ValueError(f"Unsupported animated or tiled texture: {original.name}")
        width, height = original.size[:]
        if not width or not height or not original.has_data:
            raise ValueError(f"Texture failed to decode: {original.name}")
        name = re.sub(r"[^A-Za-z0-9_-]+", "_", original.name)[:60] or "texture"
        # JPEG has no alpha channel; Blender may nevertheless expose 4 decoded
        # channels. Keep the original encoded data when no resampling is needed.
        keep_jpeg = preserve_jpeg and original.file_format == "JPEG"
        output_format = "JPEG" if keep_jpeg else "PNG"
        path = folder / f"{index:02d}_{name}.{'jpg' if keep_jpeg else 'png'}"
        copy = original.copy()
        try:
            # Blender Image.copy() does not preserve modified pixel buffers.
            # Packed pristine files can reload; generated/edited images need pixels copied.
            if original.source == "GENERATED" or original.is_dirty:
                pixels = np.empty(len(original.pixels), dtype=np.float32)
                original.pixels.foreach_get(pixels)
                copy.pixels.foreach_set(pixels)
                copy.update()
            output_width, output_height = width, height
            if max_dimension and max(width, height) > max_dimension:
                factor = max_dimension / max(width, height)
                output_width, output_height = max(1, round(width * factor)), max(1, round(height * factor))
                copy.scale(output_width, output_height)
            copy.file_format = output_format
            copy.filepath_raw = str(path)
            if output_format == original.file_format and (output_width, output_height) == (width, height) and original.packed_file:
                path.write_bytes(bytes(original.packed_file.data))
            else:
                copy.save()
            replacement = bpy.data.images.load(str(path), check_existing=False)
            replacement.name = f"Cat_{name}"
            replacement.colorspace_settings.name = original.colorspace_settings.name
            replacement.alpha_mode = original.alpha_mode
            replacement.pack()
            mapping[original] = replacement
            converted.append({"name": original.name, "source_format": original.file_format,
                              "source_width": width, "source_height": height,
                              "width": output_width, "height": output_height,
                              "colorspace": original.colorspace_settings.name,
                              "output_format": output_format, "bytes": path.stat().st_size})
        finally:
            bpy.data.images.remove(copy)
    for node in nodes:
        node.image = mapping[node.image]
    for original in images:
        if original.users == 0:
            bpy.data.images.remove(original)
    return {"materials": len(materials), "images": converted}


def normalize(objects, target_height):
    low, high = world_bounds(objects)
    height = high.z - low.z
    if height <= 1e-8:
        raise ValueError("Cat height is zero; check the imported asset orientation")
    ground_center = Vector(((low.x + high.x) / 2, (low.y + high.y) / 2, low.z))
    scale = target_height / height
    root = bpy.data.objects.new("Cat_Meters_FloorOrigin", None)
    bpy.context.collection.objects.link(root)
    imported = set(objects)
    for obj in objects:
        if obj.parent not in imported:
            matrix = obj.matrix_world.copy()
            obj.parent = root
            obj.matrix_world = matrix
    root.matrix_world = Matrix.Diagonal((scale, scale, scale, 1.0)) @ Matrix.Translation(-ground_center)
    root["scale_assumption"] = f"Height to ear tips assumed {target_height:.3f} meters; single reference has no scale."
    root["assumed_height_meters"] = target_height
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0
    bpy.context.view_layer.update()
    return root, {"target_height_meters": target_height, "scale_factor": scale,
                  "source_bounds_min": list(low), "source_bounds_max": list(high),
                  "assumption": "Height to ear tips is assumed, not measured; ground is lowest mesh point."}


def export_glb(path, objects):
    select(objects)
    ensure_finished(bpy.ops.export_scene.gltf(
        filepath=str(path), export_format="GLB", use_selection=True,
        export_yup=True, export_apply=True, export_animations=False,
        export_cameras=False, export_lights=False, export_texcoords=True,
        export_normals=True, export_materials="EXPORT", export_image_format="AUTO",
        export_tangents=True,
        export_image_add_webp=False, export_image_webp_fallback=True,
        export_draco_mesh_compression_enable=False), f"GLB export {path.name}")


def make_mobile(objects, target_triangles, source_triangles):
    """Static evaluated copy: source topology, materials, and editability remain intact."""
    collection = bpy.data.collections.new("Cat_AR_Static")
    bpy.context.scene.collection.children.link(collection)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    mobile = []
    for obj in objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = bpy.data.meshes.new_from_object(evaluated, preserve_all_data_layers=True,
                                             depsgraph=depsgraph)
        copy = bpy.data.objects.new(f"AR_{obj.name}", mesh)
        copy.matrix_world = obj.matrix_world.copy()
        collection.objects.link(copy)
        mobile.append(copy)
    ratio = min(1.0, target_triangles / source_triangles)
    if ratio < 1:
        for obj in mobile:
            if len(obj.data.polygons) < 20:
                continue
            select([obj])
            modifier = obj.modifiers.new("Mobile_Budget", "DECIMATE")
            modifier.decimate_type = "COLLAPSE"
            modifier.ratio = ratio
            modifier.use_collapse_triangulate = True
            ensure_finished(bpy.ops.object.modifier_apply(modifier=modifier.name), "Mobile decimation")
    bpy.context.view_layer.update()
    return mobile


def isolate_mobile_materials(objects):
    """Copy material trees before replacing textures, preserving the 4K master."""
    materials, groups = {}, {}

    def copy_groups(tree):
        if tree is None:
            return
        for node in tree.nodes:
            if node.type != "GROUP" or node.node_tree is None:
                continue
            original = node.node_tree
            if original not in groups:
                groups[original] = original.copy()
                copy_groups(groups[original])
            node.node_tree = groups[original]

    for obj in objects:
        for index, original in enumerate(obj.data.materials):
            if original is None:
                continue
            if original not in materials:
                materials[original] = original.copy()
                materials[original].name = f"AR_{original.name}"
                copy_groups(materials[original].node_tree)
            obj.data.materials[index] = materials[original]


def export_usdz(path, objects, texture_size=2048):
    select(objects)
    ensure_finished(bpy.ops.wm.usd_export(
        filepath=str(path), selected_objects_only=True, export_animation=False,
        export_materials=True, generate_preview_surface=True,
        generate_materialx_network=False, export_textures_mode="NEW",
        relative_paths=True, convert_orientation=True,
        export_global_forward_selection="NEGATIVE_Z", export_global_up_selection="Y",
        convert_scene_units="METERS", export_lights=False, export_cameras=False,
        usdz_downscale_size=str(texture_size), root_prim_path="/Cat"), "USDZ export")


def file_info(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return {"path": str(path), "bytes": path.stat().st_size, "sha256": digest.hexdigest()}


def inspect_glb(path):
    """Check container length, buffer ranges, embedded resources, and triangle counts."""
    with path.open("rb") as handle:
        magic, version, total = struct.unpack("<4sII", handle.read(12))
        if magic != b"glTF" or version != 2 or total != path.stat().st_size:
            raise ValueError(f"Invalid GLB header: {path}")
        json_length, json_type = struct.unpack("<II", handle.read(8))
        if json_type != 0x4E4F534A:
            raise ValueError("GLB does not begin with a JSON chunk")
        data = json.loads(handle.read(json_length))
        binary_bytes = 0
        while handle.tell() < total:
            length, kind = struct.unpack("<II", handle.read(8))
            if handle.tell() + length > total:
                raise ValueError("GLB chunk exceeds declared file length")
            if kind == 0x004E4942:
                binary_bytes += length
            handle.seek(length, 1)
    for buffer in data.get("buffers", []):
        if buffer.get("uri") or buffer["byteLength"] > binary_bytes:
            raise ValueError("GLB references external or truncated binary data")
    for view in data.get("bufferViews", []):
        if view.get("byteOffset", 0) + view["byteLength"] > data["buffers"][view.get("buffer", 0)]["byteLength"]:
            raise ValueError("GLB bufferView lies outside its buffer")
    for image in data.get("images", []):
        if "bufferView" not in image or image.get("mimeType") not in {"image/png", "image/jpeg"}:
            raise ValueError("GLB texture must be embedded PNG or JPEG")
    triangles = 0
    for mesh in data.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            if primitive.get("mode", 4) != 4:
                raise ValueError("Unexpected non-triangle primitive in exported cat")
            accessor_index = primitive.get("indices", primitive["attributes"]["POSITION"])
            triangles += data["accessors"][accessor_index]["count"] // 3
    return {"meshes": len(data.get("meshes", [])), "materials": len(data.get("materials", [])),
            "images": len(data.get("images", [])), "triangles": triangles,
            "extensions_required": data.get("extensionsRequired", []),
            "textures_embedded_standard_format": True}


def check_usdz(path, work_dir):
    tool = Path("/usr/bin/usdchecker")
    if not tool.exists():
        return {"status": "unavailable", "device_ar_verified": False}
    result = subprocess.run([str(tool), "--arkit", "--strict", str(path)],
                            capture_output=True, text=True, check=False, timeout=180)
    report = work_dir / "cat-usdz-validation.txt"
    report.write_text(result.stdout + result.stderr, encoding="utf-8")
    return {"status": "passed" if result.returncode == 0 else "failed",
            "returncode": result.returncode, "diagnostics": str(report),
            "device_ar_verified": False}


def aim(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


def render_previews(objects, args):
    scene = bpy.context.scene
    low, high = world_bounds(objects)
    target = (low + high) / 2
    largest = max(high - low)
    if args.engine == "CYCLES":
        ensure_finished(bpy.ops.preferences.addon_enable(module="cycles"), "Enable Cycles for this process")
    scene.render.engine = "CYCLES" if args.engine == "CYCLES" else "BLENDER_EEVEE"
    if args.engine == "CYCLES":
        scene.cycles.samples = args.samples
        scene.cycles.use_denoising = True
        scene.cycles.device = "CPU"
    elif hasattr(scene, "eevee") and hasattr(scene.eevee, "taa_render_samples"):
        scene.eevee.taa_render_samples = args.samples
    scene.render.resolution_x = args.resolution
    scene.render.resolution_y = args.resolution
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"
    scene.world = bpy.data.worlds.new("Preview_Neutral_World")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.88, 0.85, 0.80, 1)
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.45
    bpy.ops.mesh.primitive_plane_add(size=largest * 200, location=(0, 0, -largest * 0.0004))
    floor = bpy.context.object
    floor.name = "Preview_Floor_Excluded_From_Model"
    material = bpy.data.materials.new("Preview_Warm_White")
    material.use_nodes = True
    material.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.86, 0.83, 0.78, 1)
    material.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.80
    floor.data.materials.append(material)
    for name, position, power, size in (
        ("Key", (-1.5, -2.0, 2.2), 80, 1.4),
        ("Fill", (2.0, -0.5, 1.3), 45, 1.7),
        ("Rim", (0.3, 1.8, 2.0), 70, 1.0),
    ):
        data = bpy.data.lights.new(f"Preview_{name}", "AREA")
        data.energy = power * (largest / 0.65) ** 2
        data.shape = "DISK"
        data.size = largest * size
        light = bpy.data.objects.new(data.name, data)
        scene.collection.objects.link(light)
        light.location = target + Vector(position) * largest
        aim(light, target)
    camera_data = bpy.data.cameras.new("Preview_Camera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = largest * 1.45
    camera_data.clip_start = 0.001
    camera_data.clip_end = 1000
    camera = bpy.data.objects.new("Preview_Camera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    paths = []
    views = [("preview", args.preview_azimuth, args.preview_elevation,
              args.output_dir / "cat-preview.png")]
    views.extend((name, angle, 9.0, args.work_dir / f"cat-{name}.png")
                 for name, angle in (("front", -90), ("right", 0), ("rear", 90), ("left", 180)))
    for name, azimuth, elevation, path in views:
        azimuth, elevation = math.radians(azimuth), math.radians(elevation)
        radius = largest * 3.5
        camera.location = target + Vector((math.cos(azimuth) * math.cos(elevation),
                                           math.sin(azimuth) * math.cos(elevation),
                                           math.sin(elevation))) * radius
        aim(camera, target)
        scene.render.filepath = str(path)
        ensure_finished(bpy.ops.render.render(write_still=True), f"Render {name}")
        paths.append(str(path))
    return {"engine": scene.render.engine, "resolution": args.resolution,
            "paths": paths, "orientation_labels_are_blender_axes": True,
            "note": "Front labels use Blender -Y; inspect generated anatomy before treating them as anatomical directions."}


def main():
    args = arguments()
    if not args.input.is_file():
        raise FileNotFoundError(f"Actual source asset is required: {args.input}")
    names = ("cat-master.blend", "cat.glb", "cat-ar.glb", "cat-ar.usdz", "cat-metrics.json")
    targets = [args.output_dir / name for name in names]
    if not args.no_render:
        targets.append(args.output_dir / "cat-preview.png")
    if any(path.resolve() == args.input or (path.exists() and path.samefile(args.input)) for path in targets):
        raise ValueError("Source must have a different filename from generated deliverables")
    existing = [str(path) for path in targets if path.exists()]
    if existing and not args.overwrite:
        raise FileExistsError(f"Use --overwrite to replace generated outputs: {existing}")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    args.work_dir.mkdir(parents=True, exist_ok=True)
    metrics = {"generated_at_utc": datetime.now(timezone.utc).isoformat(),
               "blender_version": bpy.app.version_string, "source": file_info(args.input),
               "device_ar_verified": False, "warnings": []}
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    log("Importing actual generated GLB")
    ensure_finished(bpy.ops.import_scene.gltf(filepath=str(args.input)), "Import GLB")
    objects = list(bpy.context.scene.objects)
    meshes = [obj for obj in objects if obj.type == "MESH"]
    # Generated GLBs omit vertex normals. Smooth the organic surface instead
    # of exporting three separate flat-normal vertices for every triangle.
    for obj in meshes if not args.preserve_materials else []:
        obj.data.polygons.foreach_set("use_smooth", np.ones(len(obj.data.polygons), dtype=bool))
        obj.data.update()
    for material in {mat for obj in meshes for mat in obj.data.materials if mat} if not args.preserve_materials else []:
        if material.use_nodes:
            for node in material.node_tree.nodes:
                if node.type == "BSDF_PRINCIPLED":
                    for link in list(node.inputs["Metallic"].links):
                        material.node_tree.links.remove(link)
                    node.inputs["Metallic"].default_value = 0.0
    metrics["imported_objects"] = {"total": len(objects),
                                   "by_type": {kind: sum(obj.type == kind for obj in objects)
                                               for kind in sorted({obj.type for obj in objects})}}
    metrics["source_geometry"] = geometry_metrics(meshes)
    if args.max_dimension is not None:
        if args.max_dimension <= 0:
            raise ValueError("Largest dimension must be positive")
        dimensions = metrics["source_geometry"]["dimensions"]
        args.height = args.max_dimension * dimensions[2] / max(dimensions)
    root, metrics["scale"] = normalize(objects, args.height)
    if args.max_dimension is not None:
        metrics["scale"]["max_dimension_meters"] = args.max_dimension
        metrics["scale"]["assumption"] = "Largest model dimension assumed; pose-dependent heights preserved. Not a physical measurement."
    high_objects = objects + [root]
    metrics["textures"] = standardize_images(meshes, args.work_dir / "cat-textures", preserve_jpeg=args.preserve_jpeg)
    metrics["high_detail_geometry"] = geometry_metrics(meshes)
    dims = metrics["high_detail_geometry"]["dimensions"]
    if abs(dims[2] - args.height) > 1e-5 or abs(metrics["high_detail_geometry"]["bounds_min"][2]) > 1e-5:
        raise ValueError("Model did not normalize to the intended height and floor")
    for category in ("source_geometry", "high_detail_geometry"):
        geometry = metrics[category]
        if geometry["uv_missing_meshes"]:
            metrics["warnings"].append(f"{category} meshes without UVs: {geometry['uv_missing_meshes']}")
        if geometry["degenerate_triangles"]:
            metrics["warnings"].append(f"{category} has {geometry['degenerate_triangles']} near-zero-area triangles")
    select(high_objects)
    bpy.ops.file.pack_all()
    bpy.context.preferences.filepaths.save_version = 0
    ensure_finished(bpy.ops.wm.save_as_mainfile(filepath=str(args.output_dir / "cat-master.blend")), "Save editable master")
    log("Exporting standard high-detail GLB")
    export_glb(args.output_dir / "cat.glb", high_objects)
    metrics["high_detail_glb"] = inspect_glb(args.output_dir / "cat.glb")
    log("Building static mobile copy")
    mobile = make_mobile(meshes, args.mobile_triangles, metrics["high_detail_geometry"]["triangles"])
    isolate_mobile_materials(mobile)
    metrics["mobile_textures"] = standardize_images(mobile, args.work_dir / "cat-textures-mobile", max_dimension=args.mobile_texture_size, preserve_jpeg=args.preserve_jpeg)
    metrics["mobile_geometry"] = geometry_metrics(mobile)
    metrics["mobile_triangle_target"] = args.mobile_triangles
    if metrics["mobile_geometry"]["triangles"] > args.mobile_triangles * 1.15:
        metrics["warnings"].append("Mobile triangle count exceeds target by more than 15%; inspect before further reduction.")
    export_glb(args.output_dir / "cat-ar.glb", mobile)
    metrics["mobile_glb"] = inspect_glb(args.output_dir / "cat-ar.glb")
    log("Exporting native USDZ with textures")
    export_usdz(args.output_dir / "cat-ar.usdz", mobile, texture_size=args.mobile_texture_size)
    metrics["usdz_validation"] = check_usdz(args.output_dir / "cat-ar.usdz", args.work_dir)
    if metrics["usdz_validation"]["status"] != "passed":
        metrics["warnings"].append("USDZ ARKit strict validation did not pass; review diagnostics before delivery.")
    for obj in mobile:
        obj.hide_render = True
        obj.hide_set(True)
    for obj in meshes:
        obj.hide_render = False
    if not args.no_render:
        log("Rendering reference and four diagnostic directions")
        metrics["renders"] = render_previews(meshes, args)
    select(high_objects)
    bpy.ops.file.pack_all()
    # Keep the neutral studio and disabled AR collection in the editable project.
    # Suppress automatic .blend1 backups inside user-facing deliverables.
    bpy.context.preferences.filepaths.save_version = 0
    ensure_finished(bpy.ops.wm.save_as_mainfile(filepath=str(args.output_dir / "cat-master.blend")), "Save master with preview studio")
    metrics["files"] = [file_info(args.output_dir / name) for name in names if name != "cat-metrics.json"]
    if not args.no_render:
        metrics["files"].append(file_info(args.output_dir / "cat-preview.png"))
    report = args.output_dir / "cat-metrics.json"
    report.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"Outputs saved. Metrics: {report}")
    if metrics["usdz_validation"]["status"] == "failed":
        raise RuntimeError("Files were preserved, but USDZ ARKit validation failed; see cat-metrics.json")


if __name__ == "__main__":
    main()
