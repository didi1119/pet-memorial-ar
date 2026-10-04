"""Restore only catalogued assets; preserve local edits and reject unknown ZIP paths."""
from pathlib import Path,PurePosixPath
import argparse,hashlib,json,shutil,stat,subprocess,tempfile,zipfile
from verify_assets import digest,verify
ROOT=Path(__file__).resolve().parents[1]
def safe_target(root,name):
 path=PurePosixPath(name)
 if path.is_absolute() or '..' in path.parts or '\\' in name:raise ValueError(f'Unsafe archive path: {name}')
 target=root.joinpath(*path.parts)
 if not target.resolve().is_relative_to(root.resolve()):raise ValueError(f'Path escapes asset library: {name}')
 return target
def restore(root=ROOT,download=False):
 cat=json.loads((root/'assets/catalog.json').read_text());bundles=json.loads((root/'assets/bundles.json').read_text())
 by_path={e['path']:e for e in cat['entries']};folder=root/'downloads';folder.mkdir(exist_ok=True)
 for b in bundles:
  p=folder/b['name']
  if not p.exists() and download:
   subprocess.run(['gh','release','download','v2026.10.04','--repo','didi1119/pet-memorial-ar','--pattern',b['name'],'--dir',str(folder)],check=True)
  if not p.is_file() or p.stat().st_size!=b['bytes'] or digest(p)!=b['sha256']:raise ValueError(f"Missing or mismatched download: {b['name']}")
  with zipfile.ZipFile(p) as z:
   # Validate every entry before applying this archive.
   for item in z.infolist():
    name=item.filename;target=safe_target(root,name)
    if stat.S_ISLNK(item.external_attr>>16) or name not in by_path:raise ValueError(f'Uncatalogued entry: {name}')
    e=by_path[name]
    if item.file_size!=e['bytes']:raise ValueError(f'Unexpected entry size: {name}')
    if target.exists() and (not target.is_file() or digest(target)!=e['sha256']):raise ValueError(f'Local edit preserved; restore stopped at: {name}')
   for item in z.infolist():
    name=item.filename;e=by_path[name];target=safe_target(root,name)
    if target.exists():continue
    target.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=target.parent,delete=False) as temp:
     stage=Path(temp.name)
     try:
      with z.open(item) as source:shutil.copyfileobj(source,temp)
      temp.flush()
      if digest(stage)!=e['sha256']:raise ValueError(f'Entry hash mismatch: {name}')
     except BaseException:
      stage.unlink(missing_ok=True);raise
    stage.replace(target)
  print('Restored',b['name'],flush=True)
 for a in cat['restore_aliases']:
  source=safe_target(root,a['from']);target=safe_target(root,a['to'])
  if not source.is_file():raise ValueError(f'Missing alias source: {source}')
  if target.exists():
   if not target.is_file() or digest(target)!=digest(source):raise ValueError(f'Local edit preserved at: {target}')
  else:target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
 assert verify(root),'Restored asset verification failed'
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--download',action='store_true');args=p.parse_args();restore(download=args.download)
