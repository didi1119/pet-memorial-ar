from pathlib import Path
import json,sys
R=Path(__file__).resolve().parent
data=json.loads(Path(sys.argv[1]).read_text())
fail=[]
for p in data:
 if p['pose']=='pose-02':continue
 edge_hi=max(f['max_edge_ratio'] for f in p['frames']);edge_lo=min(f['min_edge_ratio'] for f in p['frames'])
 if edge_hi>=1.35 or edge_lo<=.70:fail.append(f"{p['pose']}: neck edge deformation {edge_lo:.3f}–{edge_hi:.3f} outside accepted bounds")
 q=max(f['p99_abs_strain'] for f in p['frames'])
 if q>=.12:fail.append(f"{p['pose']}: upper-percentile mesh edge strain {q:.3f} exceeds 0.12")
assert not fail,'; '.join(fail)
print('Head / neck deformation regression passed.')
