# 布布頭部動作修正
User request: optimize unnatural motion, specifically head turns / tilts. Existing public update is authorized.
- [x] Reproduce and inspect actual skinned deformation at extrema; record old mesh strain.
- [x] Establish failing head/neck regression: 99th percentile edge length deviation <12% for prone/seated poses. Old prone19%, seated44%.
- [x] Replace discontinuous facial skin mask with a smooth anatomical neck plane and intermediate neck bone; keep whole face rigid and floor anchored.
- [x] Limit roll, slower smooth fifth-order easing, head glances with neck contribution and fewer repeated gestures. Head at rest in supine pose.
- [x] Compare all three poses visually across extrema, full-cycle geometry / exported animation / texture / ARKit checks.
- [x] Rebuild isolated v2 release; publish same free URL and verify public byte hashes and three pose choices. Retain v1 rollback archive.
No change to approved UI or 黑醬. Phone AR remains separate device verification.

Completion: v2 production deployment 757e4409-ac0f-4a80-9aa3-ec201ff1924a. Same URL. All18 public hashes verified; three0-error/warning GLB checks; three strict ARKit USDZ checks; original rest positions/normals/UV and JPEG bytes unchanged;32s exported timelines.769 frames checked per pose; all contacts0mm and rigid facial distances <0.00002mm error. Old / new neck regression documented: prone99th percentile strain19.1% ->5.6%, seated44.5% ->8.7%; sampled largest edge changes after final weight seam correction within16%. Public three poses loaded; browser error log empty. User phone AR remains separate. Previous v1 release / source preserved under work/bubu/refinement/v1 for rollback.
