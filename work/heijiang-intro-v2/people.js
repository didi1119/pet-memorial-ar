/* 琦琦與蓓蓓（剪紙人偶）。照婚禮合照：
   琦琦（77）：長黑髮、齊瀏海、珍珠耳環，身形圓潤一點；婚禮是蕾絲白紗與頭紗。
   蓓蓓：黑色短髮、側分瀏海，中性帥氣；婚禮是白襯衫配灰色格紋背心、珍珠手環。 */
'use strict';
const PPL = {
  skin: '#f1d8c4', skinS: '#ddb9a2', blush: '#e79f92', hair: '#29211f', hairL: '#55443d', lip: '#a65c52', line: '#3b2f2a',
  qi: { day: '#e2c3ba', dayL: '#ecd5ce', skirt: '#c9b59c', home: '#d8c7b4' },
  bei: { day: '#c6ccd2', pants: '#4b5361', home: '#8b949b' },
  white: '#fbf8f3', lace: '#e9e3da', vest: '#8f9196', vestD: '#6d6f74', vestL: '#b1b3b7', pearl: '#fbf6ec', olive: '#6e7355', oliveD: '#565a42'
};

function armPath(S, a1, a2, L1 = 116, L2 = 108) {
  const E = [S[0] + Math.sin(a1) * L1, S[1] + Math.cos(a1) * L1];
  const A = a1 + a2;
  const Wr = [E[0] + Math.sin(A) * L2, E[1] + Math.cos(A) * L2];
  return { E, Wr, A };
}
function hand(ctx, x, y, ang, side, o = {}) {
  withT(ctx, x, y, -ang, 1, 1, () => {
    piece(ctx, blob([[-17, -6], [17, -6], [19, 20], [14, 40], [0, 46], [-14, 40], [-19, 20]].map(([a, b]) => [a * (o.w || 1), b]), .9), PPL.skin, { depth: .5 });
    piece(ctx, ell(-side * 16, 14, 7, 13, side * .5), PPL.skin, { depth: .3 });
    for (const k of [-6, 3]) piece(ctx, ribbon([[k, 26], [k + 1, 40]], 1.6, 1), 'rgba(170,120,100,.45)', { depth: 0, tex: 0, edge: false });
  });
}
// 兩節手臂 IK：肩膀到指定的手的位置。bend 決定手肘往外(1)或往內(-1)
function armIK(ctx, side, T, sleeve, o = {}) {
  const S = [side * 102 * (o.bw || 1), 40], L1 = o.L1 || 116, L2 = o.L2 || 108;
  let dx = T[0] - S[0], dy = T[1] - S[1]; let d = Math.hypot(dx, dy);
  const dd = clamp(d, Math.abs(L1 - L2) + 1, L1 + L2 - 1);
  const th = Math.atan2(dy, dx), al = Math.acos(clamp((L1 * L1 + dd * dd - L2 * L2) / (2 * L1 * dd), -1, 1));
  // 手肘自動往下、往外（放鬆的手臂自然垂的方向）；o.bend 為 1/-1 時才強制指定
  const cand = [1, -1].map(b => [S[0] + Math.cos(th + b * al) * L1, S[1] + Math.sin(th + b * al) * L1]);
  const score = E => E[1] + .35 * Math.abs(E[0]);
  const E = (o.bend === 1 || o.bend === -1) ? cand[o.bend * side === 1 ? 0 : 1] : (score(cand[0]) >= score(cand[1]) ? cand[0] : cand[1]);
  const ang = Math.atan2(T[1] - E[1], T[0] - E[0]);
  const Wr = [E[0] + Math.cos(ang) * L2, E[1] + Math.sin(ang) * L2];
  const bare = o.bare;
  piece(ctx, ribbon([S, [lerp(S[0], E[0], .5), lerp(S[1], E[1], .5)], E, [lerp(E[0], Wr[0], .5), lerp(E[1], Wr[1], .5)], Wr], o.w0 || 44, o.w1 || 32, { roundStart: true }), bare ? PPL.skin : sleeve, { depth: .8 });
  if (o.cuff) piece(ctx, ribbon([[lerp(E[0], Wr[0], .82), lerp(E[1], Wr[1], .82)], Wr], (o.w1 || 32) + 4, (o.w1 || 32) + 4), o.cuff, { depth: .2, tex: .5 });
  if (o.bracelet) for (let i = 0; i < 6; i++) { const px = lerp(E[0], Wr[0], .9) + (i - 2.5) * 6 * -Math.sin(ang), py = lerp(E[1], Wr[1], .9) + (i - 2.5) * 6 * Math.cos(ang); piece(ctx, ell(px, py, 3.6, 3.6), PPL.pearl, { depth: .2, tex: 0 }); }
  if (o.hand !== false) hand(ctx, Wr[0], Wr[1], Math.PI / 2 - ang, side, o);
  return { E, Wr, A: ang };
}
function arm(ctx, side, a1, a2, sleeve, o = {}) {
  if (Array.isArray(a1)) return armIK(ctx, side, a1, sleeve, Object.assign({}, o, { bend: a2 === 'force1' ? 1 : a2 === 'force-1' ? -1 : 'auto' }));
  const S = [side * 102 * (o.bw || 1), 40];
  const s1 = side * a1, s2 = side * a2;
  const { E, Wr, A } = armPath(S, -s1, -s2, o.L1, o.L2);
  const bare = o.bare;
  piece(ctx, ribbon([S, [lerp(S[0], E[0], .5), lerp(S[1], E[1], .5)], E, Wr], o.w0 || 44, o.w1 || 32, { roundStart: true }), bare ? PPL.skin : sleeve, { depth: .8 });
  if (o.cuff) piece(ctx, ribbon([[lerp(E[0], Wr[0], .82), lerp(E[1], Wr[1], .82)], Wr], (o.w1 || 32) + 4, (o.w1 || 32) + 4), o.cuff, { depth: .2, tex: .5 });
  if (o.bracelet) for (let i = 0; i < 6; i++) { const u = .92; const px = lerp(E[0], Wr[0], u) + (i - 2.5) * 6 * Math.cos(A), py = lerp(E[1], Wr[1], u) - (i - 2.5) * 6 * Math.sin(A) * -1; piece(ctx, ell(px, py, 3.6, 3.6), PPL.pearl, { depth: .2, tex: 0 }); }
  if (o.hand !== false) hand(ctx, Wr[0], Wr[1], -A, side, o);
  return { E, Wr, A };
}

function personHead(ctx, o) {
  const who = o.who, wed = o.outfit === 'wedding', tn = o.turn || 0;
  const F = x => x + tn * 14;
  // 頭髮（後）
  if (who === 'qi') {
    if (wed) {
      piece(ctx, ell(0, -214, 50, 38), PPL.hair, { depth: .6 });
      piece(ctx, blob([[-80, -116], [-84, -168], [-50, -210], [0, -220], [50, -210], [84, -168], [80, -116], [72, -96], [-72, -96]], .9), PPL.hair, { depth: .8 });
    } else {
      piece(ctx, blob([[-84, -130], [-90, -178], [-52, -214], [0, -224], [52, -214], [90, -178], [86, -130], [94, -60], [100, 20], [106, 92], [82, 124], [56, 104], [42, 12], [-42, 12], [-56, 104], [-82, 124], [-106, 92], [-100, 20], [-94, -60]], .9), PPL.hair, { depth: .8 });
    }
  } else {
    piece(ctx, blob([[-76, -104], [-82, -152], [-62, -198], [-18, -220], [32, -216], [72, -192], [84, -150], [80, -104]], .9), PPL.hair, { depth: .8 });
  }
  // 耳朵、脖子、臉
  for (const s of [-1, 1]) piece(ctx, ell(s * 72 + tn * 4, -98, 12, 18), PPL.skin, { depth: .4 });
  const full = who === 'qi' ? 1 : 0;
  piece(ctx, blob([[0, -182], [44, -174], [68, -142], [74, -100], [70 + full * 4, -62], [50 + full * 8, -32 + full * 2], [20 + full * 4, -20], [0, -18], [-20 - full * 4, -20], [-50 - full * 8, -32 + full * 2], [-70 - full * 4, -62], [-74, -100], [-68, -142], [-44, -174]], .9), PPL.skin, { depth: .9 });
  // 五官
  const eyes0 = o.eyes || 'smile';
  for (const s of [-1, 1]) {
    const eyes = s === 1 && o.eyesR ? o.eyesR : eyes0;
    const ex = F(s * 28) * (Math.sign(tn) === -s ? 1 - .12 * Math.abs(tn) : 1), ey = -96;
    piece(ctx, ribbon([[ex - 13, ey - 26 - (s * (o.brow || 0))], [ex, ey - 30], [ex + 13, ey - 27]], 4.2, 3, { taper: .4 }), PPL.hairL, { depth: .1, tex: 0, edge: false });
    if (eyes === 'smile') piece(ctx, ribbon([[ex - 12, ey + 2], [ex, ey - 7], [ex + 12, ey + 2]], 4.6, 4, { taper: .25 }), PPL.line, { depth: .1, tex: 0, edge: false });
    else if (eyes === 'closed') piece(ctx, ribbon([[ex - 12, ey - 2], [ex, ey + 5], [ex + 12, ey - 2]], 4.2, 4, { taper: .25 }), PPL.line, { depth: .1, tex: 0, edge: false });
    else {
      const ly = eyes === 'down' ? 4 : 0, lx = (o.lookX || 0);
      piece(ctx, ell(ex + lx, ey + ly, 7.5, eyes === 'down' ? 6 : 9.5), PPL.line, { depth: .15, tex: 0 });
      piece(ctx, ell(ex + lx + 2.5, ey + ly - 3, 2.6, 2.6), '#fff', { depth: 0, tex: 0 });
    }
    if (who === 'qi' && eyes !== 'open' && eyes !== 'down') piece(ctx, ribbon([[ex + s * 11, ey + (eyes === 'smile' ? 0 : -1)], [ex + s * 17, ey - 5]], 2.4, 1, { taper: .2 }), PPL.line, { depth: 0, tex: 0, edge: false });
    wash(ctx, ell(F(s * 46), -68, 16, 9), PPL.blush, .42, 4);
  }
  piece(ctx, ribbon([[F(-1), -82], [F(3), -72], [F(-3), -68]], 3, 2.4), PPL.skinS, { depth: 0, tex: 0, edge: false });
  const m = o.mouth || 'smile';
  if (m === 'grin') {
    piece(ctx, blob([[F(-15), -56], [F(15), -56], [F(10), -44], [F(0), -40], [F(-10), -44]], .9), '#8b4740', { depth: .15, tex: 0 });
    piece(ctx, ribbon([[F(-12), -55], [F(12), -55]], 4, 4), '#fff', { depth: 0, tex: 0, edge: false });
  } else if (m === 'o') {
    piece(ctx, ell(F(0), -52, 6, 7), '#8b4740', { depth: .1, tex: 0 });
  } else {
    piece(ctx, ribbon([[F(-12), -58], [F(0), -51], [F(12), -58]], 4, 3.4, { taper: .3 }), PPL.lip, { depth: .05, tex: 0, edge: false });
  }
  // 頭髮（前）
  if (who === 'qi') {
    piece(ctx, blob([[-74, -118], [-80, -162], [-48, -204], [0, -214], [48, -204], [80, -162], [76, -118], [60, -128], [44, -120], [26, -130], [10, -122], [-8, -131], [-26, -122], [-44, -130], [-60, -120]], .9), PPL.hair, { depth: .6 });
    if (!wed) for (const s of [-1, 1]) piece(ctx, blob([[s * 64, -150], [s * 82, -150], [s * 92, -80], [s * 100, -10], [s * 96, 40], [s * 84, 16], [s * 76, -40], [s * 66, -100]], .9), PPL.hair, { depth: .5 });
    else for (const s of [-1, 1]) piece(ctx, ribbon([[s * 70, -138], [s * 78, -96], [s * 72, -60]], 10, 3, { taper: .5 }), PPL.hair, { depth: .3 });
    piece(ctx, ribbon([[-42, -196], [0, -205], [42, -196]], 9, 9, { taper: .8 }), PPL.hairL, { depth: 0, tex: .4, edge: false, alpha: .7 });
    if (o.earrings || wed) for (const s of [-1, 1]) { piece(ctx, ribbon([[s * 72, -82], [s * 73, -66]], 1.6, 1.6), '#c9b48a', { depth: 0, tex: 0, edge: false }); piece(ctx, ell(s * 73, -60, 6, 7.5), PPL.pearl, { depth: .3, tex: 0 }); wash(ctx, ell(s * 71, -62, 2, 2.4), '#fff', .9); }
  } else {
    piece(ctx, blob([[-74, -106], [-80, -150], [-62, -196], [-18, -218], [32, -212], [70, -188], [82, -148], [78, -110], [70, -122], [62, -146], [40, -160], [12, -154], [-14, -148], [-40, -134], [-58, -114], [-68, -96]], .9), PPL.hair, { depth: .6 });
    for (const s of [-1, 1]) piece(ctx, blob([[s * 76, -134], [s * 66, -132], [s * 66, -100], [s * 74, -96]], .9), PPL.hair, { depth: .3 });
    piece(ctx, ribbon([[-30, -200], [10, -206], [46, -192]], 8, 8, { taper: .8 }), PPL.hairL, { depth: 0, tex: .4, edge: false, alpha: .7 });
  }
}

/* 原點＝脖子底。o.who 'bei'|'qi'，o.outfit 'day'|'wedding'|'home'，
   o.arms {l:[肩,肘], r:[肩,肘]}（弧度，正值往身體前方收），o.armsFront，o.lower 'stand'|'sit'|null */
function person(ctx, o = {}) {
  const who = o.who, outfit = o.outfit || 'day', wed = outfit === 'wedding', t = o.t || 0;
  const bw = who === 'qi' ? 1.1 : 1, W2 = pts => pts.map(([x, y]) => [x * bw, y]);
  const top = who === 'qi' ? (outfit === 'home' ? PPL.qi.home : PPL.qi.day) : (outfit === 'home' ? PPL.bei.home : PPL.bei.day);
  const sleeve = wed ? (who === 'bei' ? PPL.white : PPL.skin) : top;
  const arms = o.arms || { l: [.08, .1], r: [.08, .1] };
  const armOpt = side => ({ bw, w0: who === 'qi' ? 48 : 44, w1: who === 'qi' ? 35 : 32, bare: wed && who === 'qi', bracelet: wed && who === 'bei' && side === 1, cuff: wed && who === 'bei' ? '#f2efe9' : null, ...(o.armOpt || {}) });
  // 頭紗
  if (wed && who === 'qi' && o.veil !== false) {
    const sw = Math.sin(t * .9) * 6;
    piece(ctx, blob([[-40, -232], [40, -232], [120, -150], [168 + sw, 0], [200 + sw, 230], [150, 330], [-150, 330], [-200 - sw, 230], [-168 - sw, 0], [-120, -150]], .85), 'rgba(255,255,255,.42)', { depth: .5, tex: .25, shadowAlpha: .1, edgeColor: 'rgba(255,255,255,.7)' });
  }
  // 下半身
  if (o.lower === 'stand') lowerBody(ctx, who, outfit, o);
  if (o.lower === 'sit') {
    const c = who === 'bei' ? (outfit === 'home' ? '#5b636e' : PPL.bei.pants) : (outfit === 'home' ? '#bfae9a' : PPL.qi.skirt);
    piece(ctx, blob(W2([[-122, 236], [122, 236], [134, 330], [96, 352], [-96, 352], [-134, 330]]), .9), c, { depth: .7 });
  }
  if (o.bust) piece(ctx, poly(W2([[-112, 200], [112, 200], [118, 900], [-118, 900]])), wed ? (who === 'bei' ? PPL.vest : PPL.white) : top, { depth: .9 });
  if (!o.armsFront) { if (o.skipArm !== 'l') arm(ctx, -1, arms.l[0], arms.l[1], sleeve, armOpt(-1)); if (o.skipArm !== 'r') arm(ctx, 1, arms.r[0], arms.r[1], sleeve, armOpt(1)); }
  // 上身
  const torso = W2([[-34, -6], [-84, 10], [-114, 40], [-120, 120], [-110, 252], [-60, 268], [0, 272], [60, 268], [110, 252], [120, 120], [114, 40], [84, 10], [34, -6]]);
  if (wed && who === 'qi') {
    piece(ctx, blob(W2([[-34, -6], [-84, 10], [-110, 40], [-112, 96], [-60, 110], [60, 110], [112, 96], [110, 40], [84, 10], [34, -6]]), .9), PPL.skin, { depth: .9 });
    const bod = blob(W2([[-102, 76], [-60, 60], [-24, 80], [0, 92], [24, 80], [60, 60], [102, 76], [100, 150], [90, 250], [0, 262], [-90, 250], [-100, 150]]), .9);
    piece(ctx, bod, PPL.white, { depth: .5 });
    ctx.save(); ctx.clip(bod); const r = rng(7);
    for (let i = 0; i < 140; i++) { const x = (r() - .5) * 230, y = 70 + r() * 190; wash(ctx, ell(x, y, 3 + r() * 5, 2 + r() * 4, r() * 3), PPL.lace, .9); }
    for (let i = 0; i < 9; i++) wash(ctx, ribbon([[-110 + i * 26, 80 + (i % 2) * 10], [-104 + i * 26, 170], [-110 + i * 26, 260]], 1.4, 1.4), '#ddd5ca', .8);
    ctx.restore();
    piece(ctx, ribbon([[-46, 6], [0, 34], [46, 6]], 2, 2), '#c7ae7c', { depth: .1, tex: 0, edge: false });
    piece(ctx, ell(0, 36, 4, 5), '#d8c08e', { depth: .15, tex: 0 });
  } else if (wed && who === 'bei') {
    piece(ctx, blob(torso, .9), PPL.white, { depth: .9 });
    for (let i = 0; i < 3; i++) piece(ctx, ribbon([[-40 + i * 40, 60], [-38 + i * 40, 250]], 1.2, 1.2), 'rgba(200,195,188,.6)', { depth: 0, tex: 0, edge: false });
    const vest = blob([[-30, 26], [-92, 38], [-104, 140], [-100, 256], [0, 268], [100, 256], [104, 140], [92, 38], [30, 26], [0, 128]], .9);
    piece(ctx, vest, PPL.vest, { depth: .5 });
    ctx.save(); ctx.clip(vest);
    for (let x = -120; x <= 120; x += 26) { wash(ctx, rrect(x, 0, 2.2, 300, 1), PPL.vestD, .55); wash(ctx, rrect(x + 9, 0, 1, 300, .5), PPL.vestL, .5); }
    for (let y = 30; y <= 300; y += 26) { wash(ctx, rrect(-130, y, 260, 2.2, 1), PPL.vestD, .55); wash(ctx, rrect(-130, y + 9, 260, 1, .5), PPL.vestL, .5); }
    ctx.restore();
    piece(ctx, ribbon([[0, 128], [0, 266]], 2, 2), PPL.vestD, { depth: 0, tex: 0, edge: false });
    for (const y of [150, 190, 230]) piece(ctx, ell(-6, y, 5, 5), '#4a4b4f', { depth: .2, tex: 0 });
    for (const s of [-1, 1]) piece(ctx, poly([[s * 4, -2], [s * 40, -6], [s * 26, 30]]), PPL.white, { depth: .4 });
  } else {
    piece(ctx, blob(torso, .9), top, { depth: .9 });
    if (who === 'qi') {
      piece(ctx, ribbon([[-40, 2], [0, 26], [40, 2]], 12, 12), PPL.qi.dayL, { depth: .2, tex: .7 });
      for (let i = 0; i < 9; i++) wash(ctx, ribbon([[-96 + i * 24, 60], [-94 + i * 24, 250]], 2, 2), 'rgba(160,120,110,.25)', 1);
    } else {
      piece(ctx, ribbon([[-34, 0], [0, 22], [34, 0]], 8, 8), 'rgba(0,0,0,.08)', { depth: 0, tex: 0, edge: false });
      if (outfit === 'home') { piece(ctx, blob([[-58, 168], [58, 168], [74, 248], [-74, 248]], .9), '#838c93', { depth: .3 }); piece(ctx, ribbon([[-34, 172], [0, 184], [34, 172]], 3, 3), 'rgba(60,66,72,.35)', { depth: 0, tex: 0, edge: false }); }
    }
  }
  if (o.extra) o.extra(ctx);
  // 脖子
  piece(ctx, blob(W2([[-20, -44], [20, -44], [22, 8], [0, 14], [-22, 8]]), .9), PPL.skin, { depth: .3 });
  wash(ctx, ell(0, -24, 22, 10), PPL.skinS, .5, 3);
  // 頭
  withT(ctx, 0, 0, o.headTilt || 0, who === 'qi' ? 1.06 : 1, 1, () => personHead(ctx, Object.assign({}, o, { who, outfit })));
  if (o.afterHead) o.afterHead(ctx);
  if (o.armsFront) { const L = o.skipArm === 'l' ? null : arm(ctx, -1, arms.l[0], arms.l[1], sleeve, armOpt(-1)); const R = o.skipArm === 'r' ? null : arm(ctx, 1, arms.r[0], arms.r[1], sleeve, armOpt(1)); if (o.onArms) o.onArms(ctx, L, R); }
  else if (o.onArms) o.onArms(ctx);
}

function lowerBody(ctx, who, outfit, o) {
  const step = o.step || 0;
  if (outfit === 'wedding' && who === 'qi') {
    const sw = Math.sin((o.t || 0) * .8) * 4;
    piece(ctx, blob([[-84, 240], [84, 240], [170 + sw, 500], [270, 720], [-270, 720], [-170 - sw, 500]], .9), PPL.white, { depth: .8 });
    for (let i = 0; i < 4; i++) piece(ctx, blob([[-100 + i * 6, 290 + i * 40], [100 - i * 6, 290 + i * 40], [220 - i * 10 + sw, 700], [-220 + i * 10 - sw, 700]], .9), 'rgba(255,255,255,.35)', { depth: .2, tex: .2, edge: false, shadowAlpha: .08 });
    return;
  }
  if (who === 'bei') {
    const c = outfit === 'wedding' ? PPL.vest : (outfit === 'home' ? '#5b636e' : PPL.bei.pants);
    for (const s of [-1, 1]) {
      const lift = s === 1 ? Math.max(0, Math.sin(step)) * 30 : Math.max(0, -Math.sin(step)) * 30;
      piece(ctx, ribbon([[s * 50, 250], [s * 50, 450 - lift * .5], [s * 48, 640 - lift]], 76, 58), c, { depth: .7 });
      piece(ctx, blob([[s * 48 - 34, 630 - lift], [s * 48 + 36 + s * 18, 632 - lift], [s * 48 + 40 + s * 18, 662 - lift], [s * 48 - 36, 664 - lift]], .9), '#f2efe9', { depth: .5 });
      piece(ctx, ribbon([[s * 48 - 34, 660 - lift], [s * 48 + 40 + s * 18, 660 - lift]], 6, 6), '#c9c3ba', { depth: .1, tex: .3 });
    }
  } else {
    for (const s of [-1, 1]) {
      const lift = s === 1 ? Math.max(0, Math.sin(step)) * 30 : Math.max(0, -Math.sin(step)) * 30;
      piece(ctx, ribbon([[s * 34, 450], [s * 36, 560 - lift * .5], [s * 36, 640 - lift]], 34, 28), PPL.skin, { depth: .6 });
      piece(ctx, blob([[s * 36 - 22, 630 - lift], [s * 36 + 26 + s * 10, 632 - lift], [s * 36 + 28 + s * 10, 660 - lift], [s * 36 - 24, 660 - lift]], .9), '#7e5d4e', { depth: .5 });
    }
    piece(ctx, blob([[-118, 248], [118, 248], [142, 400], [150, 476], [0, 486], [-150, 476], [-142, 400]], .9), outfit === 'home' ? '#bfae9a' : PPL.qi.skirt, { depth: .8 });
  }
}
