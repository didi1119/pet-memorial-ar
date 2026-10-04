# Ambient Idle V7 candidate authoring

All six GLBs in `exports/` expose one `Idle` clip lasting 32 seconds. Each clip
contains continuous chest breathing and the approved safe tail motion, with
two occasional head response windows and eight short left/right ear pulses.
Head and ear timings differ by pose. No animation selection or interaction
trigger is required for the ambient pattern.

The original six meshes, skin weights, joint hierarchy, inverse bind matrices,
images, materials, texture records, accessor definitions and buffer views are
unchanged. The entire original V6 BIN chunk is retained byte for byte as the
new BIN prefix. New float accessors are appended. The source files in
`outputs/poses/` are read only.

The approved chest and tail animation sample values are repeated exactly four
times. The former export timeline was offset by 1/24 second; the new content
starts at zero and uses the same 24 fps sample values on a 0–32 second timeline.
There is no idle interruption during a head or ear response.

The original 3.5-degree, 8-second head yaw is evaluated analytically. A C2
minimum-jerk envelope blends its quaternion toward a scaled version of the
approved Pet or Call peak rotation. This is a normalized convex rotation blend,
so the head yaw and secondary angle do not accumulate. Head response strength
is 80–90 percent of the approved response amplitude, and timing is stretched
slightly for quiet ambient behavior. The approved standing Call shape uses a
3-degree turn and 1-degree raise before the strength reduction.

The ear axes are measured from the original Idle. Separate C2 pulse envelopes
are distributed through the longer loop instead of repeating an identical
8-second ear schedule. Events for the same ear never overlap. Left/right peaks
stay within the original 6-degree and 5.5-degree limits.

Head and ear tracks use 30 fps CUBICSPLINE keys with analytic tangents. The last
quaternion and tangent are copied from the first quaternion and tangent, making
their periodic endpoint bytes identical. Static translations and unit scales
remain unchanged. The Root transform remains fixed.

| Pose | Pet-style head window (s) | Call-style head window (s) |
| --- | --- | --- |
| 01 | 5.984–8.882 | 18.950–22.613 |
| 02 | 4.884–7.782 | 20.650–24.313 |
| 03 | 7.384–10.282 | 17.350–21.013 |
| 04 | 5.584–8.482 | 22.150–25.813 |
| 05 | 8.284–11.182 | 19.750–23.413 |
| 06 | 6.684–9.582 | 21.150–24.813 |

`create-ambient-clips.py` creates the candidates reproducibly from the V6 files
and uses the prior `work/interaction-v6/create-interaction-clips.py` reader and
math helpers. The author writes only within `work/ambient-v7/`.

Every `pose-XX-generation-metrics.json` contains exact source and destination
hashes, preservation checks, the absolute response envelopes, local axes,
channel schema and rotation limits sampled at 120 fps. `generation-summary.json`
lists all six candidate hashes and schedules.

The generation checks passed for all six candidates. Independent full-loop
skinning, glTF validation, USDZ conversion and visual review are separate
checks. Generation checks alone do not establish visual naturalness or actual
phone camera AR behavior.
