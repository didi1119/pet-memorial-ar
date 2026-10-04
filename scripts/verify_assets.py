"""Verify restored asset bytes without loading 3D engines or contacting a server."""
from pathlib import Path
import hashlib,json,sys
ROOT=Path(__file__).resolve().parents[1]
def digest(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for data in iter(lambda:f.read(1048576),b''):h.update(data)
 return h.hexdigest()
def verify(root=ROOT):
 catalog=json.loads((root/'assets/catalog.json').read_text())
 missing=[];bad=[]
 for e in catalog['entries']:
  p=root/e['path']
  if not p.is_file():missing.append(e['path'])
  elif p.stat().st_size!=e['bytes'] or digest(p)!=e['sha256']:bad.append(e['path'])
 for a in catalog['restore_aliases']:
  p=root/a['to'];src=root/a['from']
  if not p.is_file():missing.append(a['to'])
  elif not src.is_file() or digest(p)!=digest(src):bad.append(a['to'])
 if missing or bad:
  print(json.dumps({'missing':missing,'mismatched':bad},ensure_ascii=False,indent=2));return False
 print(f"Verified {len(catalog['entries'])} asset files and {len(catalog['restore_aliases'])} authoring aliases.");return True
if __name__=='__main__':sys.exit(0 if verify() else 1)
