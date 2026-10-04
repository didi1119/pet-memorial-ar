# 布布下巴與翻肚肚視角修正

User request: seated chin must follow head yaw; supine initial preview should match attached reference. Same public release is authorized.

- [x] Reproduced hanging chin partial weights (minimum Head 0.208); old chin-to-muzzle separation changed by 4.38 mm at maximum yaw.
- [x] Added continuous jaw-to-rear-neck fade. Independent region covers 8011 chin vertices, all Head weight 1; 16997 muzzle/face vertices verified across all 769 frames. Jaw-to-upper-muzzle distances preserved within 0.000042 mm at extrema.
- [x] Kept 7 degree seated yaw / 2.8 degree lift / 2 degree tilt and 32 second loop. Floor contacts remain fixed. p99 edge strain 11.32%, sampled edge ratios 0.722–1.276, within existing regression limits.
- [x] Matched attached belly view at theta -80 degrees, polar 40 degrees, radius 95%. Initial selection, reset after manual drag, and rapid pose changes verified. Other pose angles preserved; loading poster / thumbnail updated. AR placement and model orientation preserved.
- [x] All three GLBs have zero validation errors / warnings; all three USDZs pass strict ARKit. Original rest geometry, normals, UVs and JPEG bytes preserved.
- [x] Production 1139d86d-a868-48fe-8a4c-b7362e8a512e at same free URL. All 18 public files match release hashes. All three public poses loaded without browser errors; 390 x 844 preview keeps complete dog in frame.

V2 rollback retained under work/bubu/refinement/v2. Updated source / website packages and screenshots in outputs/布布. No changes to 黑醬. Physical phone camera AR remains user verification.
