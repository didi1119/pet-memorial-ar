/* 黑醬・在身邊 二版 — 紙雕定格動畫引擎
   在瀏覽器的 Canvas 2D 逐格繪製；render.mjs 以固定時間步進取出每一格。 */
'use strict';

const W = 1080, H = 1920, FPS = 24;

/* ---------- 數學 ---------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const range = (t, a, b) => clamp((t - a) / (b - a));
const smooth = t => t * t * (3 - 2 * t);
const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
const backOut = t => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const TAU = Math.PI * 2;
const deg = d => d * Math.PI / 180;

function hash(n) { n = (n << 13) ^ n; return 1 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824; }
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function vnoise(x, seed = 0) { const i = Math.floor(x), f = x - i; const a = hash(i * 57 + seed * 131), b = hash((i + 1) * 57 + seed * 131); return lerp(a, b, smooth(f)); }

/* 定格：角色動作每秒 12 格，並帶一點手擺的微小誤差 */
const STOP = 12;
const stopT = t => Math.floor(t * STOP + 1e-6) / STOP;
function jit(t, id, amt = 1) { const k = Math.floor(t * STOP + 1e-6); return hash(k * 7919 + id * 104729) * amt; }

/* ---------- 紙張質感 ---------- */
let PAPER_TEX, PAPER_PAT, GRAIN = [];
function makeTextures(ctx) {
  const size = 768;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const r = rng(11);
  // 低頻斑駁 + 細顆粒
  const oct = (x, y) => {
    let v = 0, amp = 1, f = 1 / 96, norm = 0;
    for (let o = 0; o < 4; o++) {
      const xi = x * f, yi = y * f;
      const x0 = Math.floor(xi), y0 = Math.floor(yi), fx = smooth(xi - x0), fy = smooth(yi - y0);
      const m = size * f;
      const h = (a, b) => hash(((a % m + m) % m) * 7349 + ((b % m + m) % m) * 3967 + o * 911);
      const top = lerp(h(x0, y0), h(x0 + 1, y0), fx), bot = lerp(h(x0, y0 + 1), h(x0 + 1, y0 + 1), fx);
      v += lerp(top, bot, fy) * amp; norm += amp; amp *= .5; f *= 2;
    }
    return v / norm;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const n = oct(x, y);
    const v = 236 + n * 9 + (r() - .5) * 13;
    const i = (y * size + x) * 4;
    img.data[i] = v + 2; img.data[i + 1] = v; img.data[i + 2] = v - 3; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // 纖維
  g.lineCap = 'round';
  for (let k = 0; k < 2600; k++) {
    const x = r() * size, y = r() * size, len = 6 + r() * 26, a = r() * TAU, bend = (r() - .5) * 10;
    g.strokeStyle = r() < .55 ? `rgba(255,255,255,${.25 + r() * .35})` : `rgba(120,100,80,${.05 + r() * .08})`;
    g.lineWidth = .5 + r() * .9;
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * len / 2 + bend, y + Math.sin(a) * len / 2 - bend, x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }
  PAPER_TEX = c;
  PAPER_PAT = ctx.createPattern(c, 'repeat');
  // 底片顆粒（三張輪替）
  for (let n = 0; n < 3; n++) {
    const gc = document.createElement('canvas'); gc.width = gc.height = 512;
    const gg = gc.getContext('2d'); const gi = gg.createImageData(512, 512); const rr = rng(100 + n);
    for (let i = 0; i < gi.data.length; i += 4) { const v = 128 + (rr() + rr() + rr() - 1.5) * 70; gi.data[i] = gi.data[i + 1] = gi.data[i + 2] = v; gi.data[i + 3] = 255; }
    gg.putImageData(gi, 0, 0);
    GRAIN.push(ctx.createPattern(gc, 'repeat'));
  }
}

/* ---------- 形狀 ---------- */
// 經過各點的平滑封閉曲線（Catmull-Rom → Bézier），手剪紙的形狀都用它
function blob(pts, k = 1) {
  const p = new Path2D(); const n = pts.length;
  p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6 * k, p1[1] + (p2[1] - p0[1]) / 6 * k, p2[0] - (p3[0] - p1[0]) / 6 * k, p2[1] - (p3[1] - p1[1]) / 6 * k, p2[0], p2[1]);
  }
  p.closePath(); return p;
}
function poly(pts) { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath(); return p; }
function ell(cx, cy, rx, ry, rot = 0) { const p = new Path2D(); p.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), rot, 0, TAU); return p; }
function rrect(x, y, w, h, r) { const p = new Path2D(); p.roundRect(x, y, w, h, r); return p; }
// 開放曲線取樣
function curvePts(pts, n = 24) {
  const out = []; const m = pts.length;
  const P = i => pts[clamp(i, 0, m - 1)];
  for (let s = 0; s < m - 1; s++) {
    const p0 = P(s - 1), p1 = P(s), p2 = P(s + 1), p3 = P(s + 2);
    const steps = Math.max(2, Math.round(n / (m - 1)));
    for (let j = 0; j < steps; j++) {
      const t = j / steps, t2 = t * t, t3 = t2 * t;
      out.push([
        .5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        .5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
      ]);
    }
  }
  out.push(pts[m - 1]); return out;
}
// 沿曲線、寬度漸變的紙條（尾巴、條紋、頭髮、鬍鬚、手臂）
function ribbon(pts, w0, w1 = w0, opt = {}) {
  const c = curvePts(pts, opt.n || 28);
  const t0 = opt.from ?? 0, t1 = opt.to ?? 1;
  const N = c.length; const a = Math.floor(t0 * (N - 1)), b = Math.ceil(t1 * (N - 1));
  const L = [], R = [];
  for (let i = a; i <= b; i++) {
    const p = c[i], q = c[Math.min(N - 1, i + 1)], o = c[Math.max(0, i - 1)];
    let dx = q[0] - o[0], dy = q[1] - o[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const u = i / (N - 1);
    let w = lerp(w0, w1, u);
    if (opt.taper) w *= Math.pow(Math.sin(Math.PI * clamp(u, .02, .98)), opt.taper);
    if (opt.capEnd) w *= u > .85 ? Math.sqrt(Math.max(0, 1 - Math.pow((u - .85) / .15, 2))) : 1;
    L.push([p[0] - dy * w / 2, p[1] + dx * w / 2]); R.push([p[0] + dy * w / 2, p[1] - dx * w / 2]);
  }
  const path = new Path2D(); path.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < L.length; i++) path.lineTo(L[i][0], L[i][1]);
  if (opt.roundEnd) { const e = L.length - 1; path.quadraticCurveTo(c[b][0] + (c[b][0] - c[Math.max(0, b - 1)][0]) * 2.2, c[b][1] + (c[b][1] - c[Math.max(0, b - 1)][1]) * 2.2, R[e][0], R[e][1]); }
  for (let i = R.length - 1; i >= 0; i--) path.lineTo(R[i][0], R[i][1]);
  if (opt.roundStart) { path.quadraticCurveTo(c[a][0] - (c[Math.min(N - 1, a + 1)][0] - c[a][0]) * 2.2, c[a][1] - (c[Math.min(N - 1, a + 1)][1] - c[a][1]) * 2.2, L[0][0], L[0][1]); }
  path.closePath(); return path;
}
const mirror = pts => pts.map(([x, y]) => [-x, y]);

/* ---------- 一片紙 ---------- */
// depth：這片紙浮在下層之上的高度，決定影子；tex：紙紋強度；edge：剪口的淺色邊
function scaleOf(ctx) { const m = ctx.getTransform(); return Math.hypot(m.a, m.b); }
let PIECE_SEED = 1;
function piece(ctx, path, color, o = {}) {
  const d = o.depth ?? 1, s = scaleOf(ctx);
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (d > 0 && !o.noShadow) {
    ctx.shadowColor = `rgba(${o.shadowRGB || '45,30,20'},${o.shadowAlpha ?? .3})`;
    ctx.shadowBlur = (1.5 + d * 4.5) * s * (o.shadowSoft ?? 1);
    ctx.shadowOffsetX = d * 1.4 * s; ctx.shadowOffsetY = d * 2.4 * s;
  }
  ctx.fillStyle = color; ctx.fill(path);
  ctx.shadowColor = 'transparent';
  const tex = o.tex ?? .8;
  if (tex > 0) {
    ctx.save(); ctx.clip(path);
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha *= tex;
    const sd = (o.seed ?? PIECE_SEED++) * 97;
    ctx.translate((sd % 700), ((sd * 7) % 700)); ctx.rotate((sd % 13) * .5);
    const k = 1 / Math.max(.35, s);
    ctx.scale(k * (o.texScale || 1), k * (o.texScale || 1));
    ctx.fillStyle = PAPER_PAT; ctx.fillRect(-4000, -4000, 8000, 8000);
    ctx.restore();
  }
  if (o.edge !== false && d > 0) {
    ctx.lineWidth = (o.edgeW || 1.1) / s; ctx.strokeStyle = o.edgeColor || 'rgba(255,249,238,.38)'; ctx.stroke(path);
  }
  ctx.restore();
}
// 平面的著色（腮紅、光暈）——不是紙片
function wash(ctx, path, color, alpha = 1, blur = 0) {
  ctx.save(); ctx.globalAlpha *= alpha; if (blur) ctx.filter = `blur(${blur * scaleOf(ctx)}px)`;
  ctx.fillStyle = color; ctx.fill(path); ctx.restore();
}
function withT(ctx, x, y, r, sx, sy, fn) { ctx.save(); ctx.translate(x, y); if (r) ctx.rotate(r); if (sx != null) ctx.scale(sx, sy ?? sx); fn(); ctx.restore(); }

/* ---------- 鏡頭與景深 ---------- */
const LAYER_CANVAS = [];
function layerCanvas(i) { if (!LAYER_CANVAS[i]) { const c = document.createElement('canvas'); c.width = W; c.height = H; LAYER_CANVAS[i] = c; } return LAYER_CANVAS[i]; }
// cam: {x,y,z,r} 以場景座標（1080×1920）描述畫面中心與縮放；p：視差（遠景 <1、近景 >1）
function camTransform(ctx, cam, p = 1) {
  const z = Math.pow(cam.z ?? 1, p);
  ctx.translate(W / 2, H / 2);
  if (cam.r) ctx.rotate(cam.r * p);
  ctx.scale(z, z);
  ctx.translate(-(540 + ((cam.x ?? 540) - 540) * p), -(960 + ((cam.y ?? 960) - 960) * p));
}
let LAYER_IDX = 0;
function layer(ctx, cam, p, blur, fn, o = {}) {
  if (!blur || blur < .3) {
    ctx.save(); camTransform(ctx, cam, p); if (o.alpha != null) ctx.globalAlpha *= o.alpha; fn(ctx); ctx.restore(); return;
  }
  const c = layerCanvas(10 + (LAYER_IDX++ % 6)); const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  g.save(); camTransform(g, cam, p); fn(g); g.restore();
  ctx.save(); ctx.filter = `blur(${blur}px)`; if (o.alpha != null) ctx.globalAlpha *= o.alpha; ctx.drawImage(c, 0, 0); ctx.restore();
}

/* ---------- 光 ---------- */
function radial(ctx, x, y, r, stops, op = 'source-over', alpha = 1) {
  ctx.save(); ctx.globalCompositeOperation = op; ctx.globalAlpha *= alpha;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
function linear(ctx, x0, y0, x1, y1, stops, rect, op = 'source-over', alpha = 1) {
  ctx.save(); ctx.globalCompositeOperation = op; ctx.globalAlpha *= alpha;
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g; if (rect instanceof Path2D) ctx.fill(rect); else ctx.fillRect(...(rect || [-2000, -2000, 5000, 6000])); ctx.restore();
}
// 光束（窗光、路燈）
function beam(ctx, pts, color, alpha, blur = 30) {
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha *= alpha; ctx.filter = `blur(${blur * scaleOf(ctx)}px)`;
  const g = ctx.createLinearGradient(pts[0][0], pts[0][1], (pts[2][0] + pts[3][0]) / 2, (pts[2][1] + pts[3][1]) / 2);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fill(poly(pts)); ctx.restore();
}
// 空氣中的微塵
function motes(ctx, t, seed, n, box, color = 'rgba(255,244,220,.9)', size = 3, mask) {
  const r = rng(seed); ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) {
    const x0 = box[0] + r() * box[2], y0 = box[1] + r() * box[3], sp = .3 + r() * .7, ph = r() * TAU, sz = size * (.4 + r() * 1.2);
    const x = x0 + Math.sin(t * .35 * sp + ph) * 30 + t * 6 * sp, y = y0 + Math.cos(t * .27 * sp + ph * 2) * 24 - t * 4 * sp;
    const a = (.35 + .65 * Math.max(0, Math.sin(t * .8 * sp + ph))) * (mask ? mask(x, y) : 1);
    if (a <= .01) continue;
    const g = ctx.createRadialGradient(x, y, 0, x, y, sz * 3);
    g.addColorStop(0, color); g.addColorStop(.25, color.replace(/[\d.]+\)$/, `${.5 * a})`)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(x - sz * 3, y - sz * 3, sz * 6, sz * 6);
  }
  ctx.restore();
}

/* ---------- 字幕 ---------- */
const FONT = '"LXGW WenKai TC","Noto Serif CJK TC",serif';
function caption(ctx, text, a, rise, o = {}) {
  if (a <= 0) return;
  const size = o.size || 54; const y = (o.y || 1590) + (1 - rise) * 14;
  ctx.save();
  ctx.font = `400 ${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.letterSpacing = `${o.spacing ?? 6}px`;
  const lines = text.split('\n');
  lines.forEach((ln, i) => {
    const yy = y + (i - (lines.length - 1) / 2) * size * 1.6;
    ctx.globalAlpha = a;
    ctx.shadowColor = o.dark ? 'rgba(20,18,30,.85)' : 'rgba(250,244,234,.95)';
    ctx.shadowBlur = 22; ctx.fillStyle = o.dark ? '#f6efe3' : '#3d322a';
    ctx.fillText(ln, W / 2 + 3, yy);
    ctx.shadowBlur = 6; ctx.fillText(ln, W / 2 + 3, yy);
  });
  ctx.restore();
}
