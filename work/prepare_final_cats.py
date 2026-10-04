from pathlib import Path
import json
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
names = ['domestic cat 3d model (1).glb', 'tabby cat 3d model (1).glb', 'tabby cat 3d model (2).glb', 'tabby cat 3d model.glb', 'bengal cat 3d model (1).glb', 'bengal cat 3d model.glb']
rows = []
for index, name in enumerate(names, 1):
    ident = f'pose-{index:02d}'
    out = ROOT / 'work/final-pose-exports' / ident
    work = ROOT / 'work/final-pose-work' / ident
    out.mkdir(parents=True, exist_ok=True)
    work.mkdir(parents=True, exist_ok=True)
    command = ['/Applications/Blender.app/Contents/MacOS/Blender', '--background', '--factory-startup', '--python', str(ROOT / 'work/process_cat.py'), '--', '--input', str((Path(__file__).resolve().parents[1]/'assets/originals') / name), '--output-dir', str(out), '--work-dir', str(work), '--max-dimension', '0.46', '--mobile-triangles', '100000', '--mobile-texture-size', '4096', '--preserve-materials', '--preserve-jpeg', '--preview-azimuth', '-135', '--resolution', '900', '--samples', '24']
    print(f'Preparing {index}/6: {name}', flush=True)
    start = time.monotonic()
    with (work / 'processing.log').open('w') as log:
        result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
    if result.returncode:
        print((work / 'processing.log').read_text()[-6000:], flush=True)
        raise SystemExit(result.returncode)
    metrics = json.loads((out / 'cat-metrics.json').read_text())
    if metrics['usdz_validation']['status'] != 'passed':
        raise RuntimeError(f'{ident} USDZ validation failed')
    rows.append({'id': ident, 'source_name': name, 'source': metrics['source'], 'export_dir': str(out), 'height_m': metrics['mobile_geometry']['dimensions'][2], 'dimensions_m': metrics['mobile_geometry']['dimensions'], 'triangles': metrics['mobile_geometry']['triangles'], 'glb_bytes': (out / 'cat-ar.glb').stat().st_size, 'usdz_bytes': (out / 'cat-ar.usdz').stat().st_size, 'source_static': True})
    (ROOT / 'work/final-pose-inventory.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2))
    print(f'Ready {ident} ({time.monotonic()-start:.1f}s): GLB {rows[-1]["glb_bytes"]/1e6:.1f}MB / USDZ {rows[-1]["usdz_bytes"]/1e6:.1f}MB', flush=True)
print('All six exports finished.', flush=True)
