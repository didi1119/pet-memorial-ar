/* 黑醬（剪紙人偶）。顏色取自照片：灰棕虎斑、白下巴、藍綠眼睛。 */
'use strict';
const CAT = {
  fur: '#8c7864', furL: '#b7a38a', furM: '#a08b74', furD: '#4a3c32', furDD: '#3b3029',
  white: '#f1ebe1', nose: '#c38b7f', ear: '#d6a798', iris: '#9fcfc2', iris2: '#6fa69a', pupil: '#24221e', rim: '#3a302a', ghost: '#ffe2b0'
};

/* 正面的頭。原點＝頭中心，寬約 224。
   o.blink 0..1、o.turn -1..1（往左／右轉）、o.look [dx,dy] 瞳孔、o.kitten、o.earL/earR（弧度）、o.detail（特寫）、o.mouth 'calm'|'open'|'treat' */
function catHead(ctx, o = {}) {
  const C = o.colors || CAT;
  const turn = o.turn || 0, kit = o.kitten ? 1 : 0;
  const X = x => x * (1 - .16 * Math.abs(turn)) + turn * 30 - (Math.sign(x) === -Math.sign(turn) ? Math.abs(x) * .1 * Math.abs(turn) : 0) * Math.sign(x);
  const P = pts => pts.map(([x, y]) => [X(x), y]);
  const d = o.depth ?? 1;
  const ex = 42 + kit * 2, ey = -8, es = 1 + kit * .28;

  // 耳朵（在頭後面）
  const ear = (side, rot) => {
    withT(ctx, side * 60 + turn * 16 * (side === Math.sign(turn) ? .6 : 1.2), -58, side * .16 + (rot || 0), 1 - kit * .1, 1 - kit * .14, () => {
      const outer = [[-40, 12], [-32, -30], [-10, -88], [4, -86], [22, -40], [42, 6]].map(([x, y]) => [x * side, y]);
      piece(ctx, blob(outer, .85), C.fur, { depth: d * .6 });
      const inner = [[-24, 2], [-18, -34], [-4, -70], [8, -40], [22, 0]].map(([x, y]) => [x * side, y]);
      piece(ctx, blob(inner, .85), C.ear, { depth: .25, tex: .5 });
      for (let i = 0; i < 3; i++) piece(ctx, ribbon([[(-10 + i * 9) * side, 0], [(-8 + i * 7) * side, -26 - i * 4], [(-4 + i * 4) * side, -46 - i * 4]], 3.2, .8, { taper: .6 }), C.white, { depth: .15, tex: .2, edge: false });
    });
  };
  ear(-1, -(o.earL || 0));
  ear(1, o.earR || 0);

  // 頭：兩頰有一點毛的蓬度
  const headPts = [[0, -84], [42, -80], [76, -62], [98, -30], [108, 4], [122, 28], [106, 36], [112, 50], [90, 66], [54, 82], [0, 90], [-54, 82], [-90, 66], [-112, 50], [-106, 36], [-122, 28], [-108, 4], [-98, -30], [-76, -62], [-42, -80]]
    .map(([x, y]) => [x + turn * 8, y * (1 - kit * .06)]);
  piece(ctx, blob(headPts, .9), C.fur, { depth: d });
  // 眼周的淺色毛與臉頰的一點暖色
  for (const s of [-1, 1]) wash(ctx, ell(X(s * ex), ey + 4, 40 * es, 30 * es), C.furL, .8, 5);
  wash(ctx, ell(X(0), 6, 16, 26), C.furL, .6, 6);
  // 額頭的 M 與頭頂條紋
  const st = { depth: .18, tex: .5, edge: false };
  piece(ctx, ribbon(P([[0, -88], [0, -68], [0, -46]]), 9, 5, { taper: .5 }), C.furD, st);
  for (const s of [-1, 1]) {
    piece(ctx, ribbon(P([[s * 20, -86], [s * 22, -66], [s * 14, -44]]), 8, 4, { taper: .5 }), C.furD, st);
    piece(ctx, ribbon(P([[s * 46, -78], [s * 42, -60], [s * 30, -46]]), 8, 4, { taper: .5 }), C.furD, st);
    piece(ctx, ribbon(P([[s * 72, -62], [s * 64, -50]]), 6, 3, { taper: .6 }), C.furD, st);
    // 眼尾延伸到臉頰的線
    piece(ctx, ribbon(P([[s * 70, -6], [s * 88, 0], [s * 108, 6]]), 7, 3, { taper: .5 }), C.furD, st);
    piece(ctx, ribbon(P([[s * 64, 16], [s * 86, 26], [s * 106, 34]]), 6, 2.5, { taper: .5 }), C.furD, st);
  }
  // 眼睛
  const blink = clamp(o.blink || 0);
  for (const s of [-1, 1]) {
    const far = Math.sign(turn) === -s ? 1 - .3 * Math.abs(turn) : 1;
    withT(ctx, X(s * ex), ey, 0, es * far, es, () => {
      const eyePts = [[-25, 5], [-16, -11], [0, -17], [17, -14], [26, -8], [19, 7], [2, 13], [-14, 11]].map(([x, y]) => [x * s, y]);
      if (blink > .86 || o.eyes === 'closed') {
        piece(ctx, ribbon([[-24 * s, -2], [-6 * s, 6], [12 * s, 5], [26 * s, -4]], 5.5, 3.5, { taper: .5 }), C.rim, { depth: .2, tex: .3, edge: false });
        return;
      }
      ctx.save();
      ctx.translate(0, 6); ctx.scale(1, Math.max(.08, 1 - blink)); ctx.translate(0, -6);
      piece(ctx, blob(eyePts.map(([x, y]) => [x * 1.09, y * 1.12 + 1]), .9), C.rim, { depth: .3, tex: .35 });
      const eyeP = blob(eyePts, .9);
      // 虹膜：上深下亮
      ctx.save();
      const g = ctx.createLinearGradient(0, -18, 0, 14); g.addColorStop(0, C.iris2); g.addColorStop(.55, C.iris); g.addColorStop(1, '#cbe6dc');
      piece(ctx, eyeP, g, { depth: .15, tex: .25, edge: false });
      ctx.restore();
      ctx.save(); ctx.clip(eyeP);
      const lk = o.look || [0, 0];
      if (o.detail) {
        ctx.globalAlpha = .35; ctx.strokeStyle = '#4c7f75'; ctx.lineWidth = .9;
        for (let a = 0; a < 40; a++) { const an = a / 40 * TAU; ctx.beginPath(); ctx.moveTo(lk[0] + Math.cos(an) * 9, -2 + lk[1] + Math.sin(an) * 9); ctx.lineTo(lk[0] + Math.cos(an) * 19, -2 + lk[1] + Math.sin(an) * 19); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      const pw = (o.pupil ?? 7.5) + kit * 2;
      piece(ctx, ell(lk[0] + 1 * s, -2 + lk[1], pw, 14, 0), C.pupil, { depth: .1, tex: .2, edge: false });
      // 上眼瞼的陰影
      wash(ctx, ell(0, -20, 30, 10), 'rgba(40,30,25,.35)', 1, 2);
      ctx.restore();
      piece(ctx, ell(lk[0] + 6 * s - 4, -9 + lk[1], 4.2 + kit, 4.2 + kit), 'rgba(255,255,255,.95)', { depth: 0, tex: 0 });
      piece(ctx, ell(lk[0] - 5 * s, 5 + lk[1], 1.8, 1.8), 'rgba(255,255,255,.7)', { depth: 0, tex: 0 });
      ctx.restore();
    });
  }
  // 白色口鼻與下巴
  const mz = { depth: .3, tex: .55 };
  piece(ctx, blob(P([[0, 56], [18, 60], [24, 70], [14, 80], [0, 82], [-14, 80], [-24, 70], [-18, 60]]), .9), C.white, mz);
  piece(ctx, ell(X(-17), 45, 23 * (1 - .1 * Math.abs(turn)), 17), C.white, mz);
  piece(ctx, ell(X(17), 45, 23 * (1 - .1 * Math.abs(turn)), 17), C.white, mz);
  // 鼻子
  piece(ctx, blob(P([[-12, 20], [0, 17], [12, 20], [8, 28], [0, 34], [-8, 28]]), .8), C.nose, { depth: .3, tex: .4 });
  wash(ctx, ell(X(-3), 22, 4, 2), 'rgba(255,255,255,.5)');
  // 嘴
  const mouth = o.mouth || 'calm';
  if (mouth === 'open' || mouth === 'treat') {
    piece(ctx, blob(P([[-10, 48], [0, 44], [10, 48], [8, 60], [0, 64], [-8, 60]]), .9), '#7a4b48', { depth: .2, tex: .3 });
    piece(ctx, ell(X(0), 58, 5, 3.4), '#e19b98', { depth: 0, tex: 0 });
  }
  piece(ctx, ribbon(P([[0, 34], [0, 42]]), 3, 3), C.rim, { depth: 0, tex: 0, edge: false });
  piece(ctx, ribbon(P([[0, 41], [-8, 47], [-16, 45]]), 3, 2, { taper: .3 }), C.rim, { depth: 0, tex: 0, edge: false });
  piece(ctx, ribbon(P([[0, 41], [8, 47], [16, 45]]), 3, 2, { taper: .3 }), C.rim, { depth: 0, tex: 0, edge: false });
  // 鬍鬚
  if (o.whiskers !== false) {
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const y0 = 40 + i * 9, sway = Math.sin((o.t || 0) * 1.3 + i + s) * 2;
      piece(ctx, ribbon(P([[s * 34, y0], [s * 80, y0 - 6 + i * 6 + sway], [s * 128, y0 - 14 + i * 14 + sway * 2]]), 2.6, .7, { taper: .2 }), 'rgba(250,246,238,.92)', { depth: .2, tex: 0, edge: false, shadowAlpha: .35 });
    }
    for (const s of [-1, 1]) piece(ctx, ribbon(P([[s * 30, -40], [s * 46, -64], [s * 52, -86]]), 1.8, .5, { taper: .2 }), 'rgba(250,246,238,.8)', { depth: .15, tex: 0, edge: false });
  }
}

/* 坐姿正面。原點＝前腳中間的地面。o.tailUp 0..1、o.tailSway、o.head（傳給 catHead）、o.headTilt、o.chin（抬頭） */
function catSitFront(ctx, o = {}) {
  const C = o.colors || CAT, t = o.t || 0, d = o.depth ?? 1;
  const up = clamp(o.tailUp || 0), sway = (o.tailSway ?? 1) * Math.sin(t * 1.6) * 10;
  const wrap = [[110, -40], [160, -10], [148, 20], [80, 26], [0, 22], [-56, 10]];
  const high = [[100, -70], [168, -140], [186, -240], [180, -318], [150, -352], [118, -338]];
  const tail = wrap.map((p, i) => [lerp(p[0], high[i][0], up) + (up > .5 ? sway * i / 5 : 0), lerp(p[1], high[i][1], up) + (up <= .5 ? sway * .3 * i / 5 : 0)]);
  const drawTail = () => {
    piece(ctx, ribbon(tail, 32, 22, { roundEnd: true, n: 40 }), C.fur, { depth: d * .8 });
    for (const [a, b] of [[.18, .25], [.36, .43], [.54, .61], [.72, .79]]) piece(ctx, ribbon(tail, 33, 24, { from: a, to: b, n: 40 }), C.furD, { depth: .15, tex: .5, edge: false });
    piece(ctx, ribbon(tail, 32, 22, { from: .88, to: 1, roundEnd: true, n: 40 }), C.furDD, { depth: .15, tex: .5, edge: false });
  };
  if (up > .5) drawTail();
  // 後腿（從兩側露出）
  piece(ctx, blob([[-150, -6], [-156, -70], [-130, -142], [-80, -192], [0, -206], [80, -192], [130, -142], [156, -70], [150, -6], [96, 8], [0, 10], [-96, 8]], .9), C.fur, { depth: d });
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) piece(ctx, ribbon([[s * (150 - i * 6), -120 + i * 34], [s * (128 - i * 4), -128 + i * 34], [s * (104 - i * 2), -116 + i * 36]], 11, 4, { taper: .5 }), C.furD, { depth: .15, tex: .5, edge: false });
  for (const s of [-1, 1]) piece(ctx, ell(s * 128, -4, 36, 15), C.furL, { depth: .4 });
  // 胸口
  piece(ctx, blob([[-72, -262], [-94, -200], [-98, -120], [-80, -40], [-42, -8], [0, -4], [42, -8], [80, -40], [98, -120], [94, -200], [72, -262], [0, -284]], .9), C.fur, { depth: d * .8 });
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) piece(ctx, ribbon([[s * 96, -230 + i * 40], [s * 80, -226 + i * 40], [s * 66, -218 + i * 42]], 9, 3, { taper: .5 }), C.furD, { depth: .12, tex: .5, edge: false });
  piece(ctx, blob([[-46, -262], [-58, -216], [-40, -170], [0, -150], [40, -170], [58, -216], [46, -262], [0, -274]], .9), C.white, { depth: .3 });
  // 前腳
  for (const s of [-1, 1]) {
    piece(ctx, blob([[s * 16, -176], [s * 60, -180], [s * 58, -120], [s * 54, -50], [s * 58, -14], [s * 18, -12], [s * 20, -60], [s * 16, -120]], .85), C.furM, { depth: .6 });
    for (let i = 0; i < 3; i++) piece(ctx, ribbon([[s * 18, -122 + i * 28], [s * 38, -126 + i * 28], [s * 58, -120 + i * 28]], 7, 5, { taper: .4 }), C.furD, { depth: .1, tex: .5, edge: false });
    piece(ctx, ell(s * 38, -8, 30, 15), C.white, { depth: .5 });
    for (const k of [-1, 1]) piece(ctx, ribbon([[s * 38 + k * 9, -14], [s * 38 + k * 9, -2]], 2, 1.5), 'rgba(90,70,60,.6)', { depth: 0, tex: 0, edge: false });
  }
  if (up <= .5) drawTail();
  if (o.bandana) o.bandana(ctx);
  // 頭
  withT(ctx, 0, -292 + (o.headY || 0), (o.headTilt || 0), 1, 1, () => {
    if (o.chin) ctx.translate(0, -o.chin * 8);
    catHead(ctx, Object.assign({ t, depth: d }, o.head || {}));
  });
  if (o.bandanaFront) o.bandanaFront(ctx);
}

/* 坐姿背面。原點＝地面。o.look 0..1：回頭看（露出右頰與一隻眼） */
function catSitBack(ctx, o = {}) {
  const C = o.colors || CAT, t = o.t || 0, d = o.depth ?? 1;
  const sway = (o.tailSway ?? 1) * Math.sin(t * 1.4);
  const up = clamp(o.tailUp || 0);
  const lowT = [[60, -30], [150, -2], [226, -18], [256, -58], [244, -94]];
  const upT = [[40, -120], [100, -210], [118, -320], [96, -390], [64, -396]];
  const tail = lowT.map((p, i) => [lerp(p[0], upT[i][0], up) + sway * 8 * i / 4, lerp(p[1], upT[i][1], up) + sway * (up > .5 ? 4 : -6) * i / 4]);
  const drawTail = () => {
    piece(ctx, ribbon(tail, 34, 24, { roundEnd: true, n: 40 }), C.fur, { depth: d * .7 });
    for (const [a, b] of [[.2, .27], [.38, .45], [.56, .63], [.74, .8]]) piece(ctx, ribbon(tail, 35, 25, { from: a, to: b, n: 40 }), C.furD, { depth: .1, tex: .5, edge: false });
    piece(ctx, ribbon(tail, 34, 24, { from: .88, to: 1, roundEnd: true, n: 40 }), C.furDD, { depth: .1, tex: .5, edge: false });
  };
  drawTail();
  const body = [[-150, -4], [-158, -84], [-134, -164], [-94, -232], [-58, -278], [0, -292], [58, -278], [94, -232], [134, -164], [158, -84], [150, -4], [80, 8], [0, 10], [-80, 8]];
  piece(ctx, blob(body, .9), C.fur, { depth: d });
  // 背上的條紋
  piece(ctx, ribbon([[0, -284], [2, -160], [0, -24]], 24, 16, { taper: .3 }), C.furD, { depth: .15, tex: .5, edge: false });
  for (let i = 0; i < 6; i++) {
    const y = -250 + i * 40, wv = 60 + Math.sin(Math.PI * (i + 1) / 7) * 80;
    for (const s of [-1, 1]) piece(ctx, ribbon([[s * 8, y], [s * wv * .55, y + 10], [s * wv, y + 30]], 15, 5, { taper: .4 }), C.furD, { depth: .12, tex: .5, edge: false });
  }
  // 頭（背面）
  const look = clamp(o.look || 0);
  withT(ctx, look * 6, -330, look * .1 + (o.headTilt || 0), 1, 1, () => {
    for (const s of [-1, 1]) {
      const rot = s === 1 ? look * .25 : -look * .1;
      withT(ctx, s * 58, -50, s * .06 + rot, 1, 1, () => {
        piece(ctx, blob([[-40 * s, 18], [-30 * s, -50], [-14 * s, -92], [4 * s, -54], [34 * s, -6], [30 * s, 18]], .9), C.fur, { depth: d * .7 });
        if (s === 1 && look > .3) piece(ctx, blob([[-20, 4], [-12, -44], [-6, -66], [6, -36], [20, -4]], .9), C.ear, { depth: .2, tex: .5, alpha: range(look, .3, .7) });
      });
    }
    piece(ctx, blob([[0, -96], [62, -86], [100, -48], [108, 4], [92, 48], [50, 70], [0, 76], [-50, 70], [-92, 48], [-108, 4], [-100, -48], [-62, -86]], .9), C.fur, { depth: d });
    for (const [x, w] of [[0, 10], [-28, 8], [28, 8], [-56, 6], [56, 6]]) piece(ctx, ribbon([[x, -92], [x * 1.1, -50], [x * 1.15, -6]], w, 3, { taper: .5 }), C.furD, { depth: .12, tex: .5, edge: false });
    if (look > 0) {
      // 回頭：右頰、口鼻、一隻眼睛
      ctx.save(); ctx.globalAlpha *= range(look, .15, .6);
      const k = look;
      piece(ctx, blob([[60, -40], [100, -40], [128 + 8 * k, -6], [130 + 10 * k, 22], [108, 46], [70, 50], [56, 10]], .9), C.fur, { depth: .5 });
      piece(ctx, blob([[96, 6], [124 + 10 * k, 4], [138 + 10 * k, 22], [124 + 8 * k, 40], [100, 38]], .9), C.white, { depth: .3 });
      piece(ctx, blob([[132 + 10 * k, 6], [142 + 10 * k, 10], [138 + 10 * k, 18]], .8), C.nose, { depth: .2 });
      withT(ctx, 96 + 6 * k, -16, -.15, 1, 1, () => {
        const b = clamp(o.blink || 0);
        if (b > .86) { piece(ctx, ribbon([[-14, 0], [0, 4], [14, 0]], 4.5, 3), C.rim, { depth: .1, tex: 0, edge: false }); return; }
        ctx.save(); ctx.scale(1, Math.max(.08, 1 - b));
        piece(ctx, blob([[-16, 2], [-4, -12], [14, -10], [18, 0], [6, 10], [-8, 8]], .9), C.rim, { depth: .2 });
        piece(ctx, blob([[-12, 2], [-2, -8], [12, -7], [14, 0], [4, 7], [-6, 6]], .9), C.iris, { depth: 0, tex: .2, edge: false });
        piece(ctx, ell(6, -1, 4, 7), C.pupil, { depth: 0, tex: 0, edge: false });
        piece(ctx, ell(3, -4, 2.2, 2.2), '#fff', { depth: 0, tex: 0 });
        ctx.restore();
      });
      for (let i = 0; i < 3; i++) piece(ctx, ribbon([[124, 26 + i * 6], [170, 18 + i * 10], [210, 12 + i * 18]], 2.4, .6, { taper: .2 }), 'rgba(250,246,238,.9)', { depth: .15, tex: 0, edge: false });
      ctx.restore();
    }
  });
}

/* 側面站姿（面朝右），頭轉向鏡頭。o.knead 0..1：前腳輪流踩 */
function catStandSide(ctx, o = {}) {
  const C = o.colors || CAT, t = o.t || 0, d = o.depth ?? 1;
  const kn = o.knead || 0, ph = t * TAU * 1.3;
  const leg = (x, far, lift, shade, hind) => {
    withT(ctx, x, -96, 0, 1, 1, () => {
      const shape = hind ? [[-34, -40], [30, -44], [30, 10], [18, 50], [16, 96 - lift], [-14, 96 - lift], [-12, 54], [-30, 4]] : [[-20, -30], [22, -30], [20, 40], [16, 96 - lift], [-14, 96 - lift], [-18, 40]];
      piece(ctx, blob(shape, .85), shade ? '#6f5e4f' : C.furM, { depth: .6 });
      if (!shade) for (let i = 0; i < 2; i++) piece(ctx, ribbon([[-16, 40 + i * 24], [16, 38 + i * 24]], 6, 4, { taper: .4 }), C.furD, { depth: .1, tex: .5, edge: false });
      piece(ctx, ell(6, 96 - lift, 22, 11), shade ? '#d9d0c4' : C.white, { depth: .4 });
    });
  };
  // 遠側的腳
  leg(-96, true, 0, true, true); leg(116, true, kn * Math.max(0, Math.sin(ph + Math.PI)) * 26, true);
  // 尾巴
  const sw = Math.sin(t * 1.5) * 12;
  const tail = [[-150, -120], [-196, -170], [-214, -250 + sw * .3], [-196 + sw, -310], [-166 + sw * 1.4, -320]];
  piece(ctx, ribbon(tail, 30, 22, { roundEnd: true, n: 40 }), C.fur, { depth: d * .7 });
  for (const [a, b] of [[.2, .27], [.4, .47], [.6, .67]]) piece(ctx, ribbon(tail, 31, 23, { from: a, to: b, n: 40 }), C.furD, { depth: .1, tex: .5, edge: false });
  piece(ctx, ribbon(tail, 30, 22, { from: .86, to: 1, roundEnd: true, n: 40 }), C.furDD, { depth: .1, tex: .5, edge: false });
  // 身體
  const br = Math.sin(t * 2.2) * 2;
  piece(ctx, blob([[-164, -112], [-130, -168 - br], [-40, -186 - br], [60, -184 - br], [140, -170], [176, -126], [164, -82], [110, -64], [0, -58], [-110, -64], [-162, -80]], .9), C.fur, { depth: d });
  piece(ctx, ribbon([[-130, -74], [-40, -64], [60, -64], [140, -78]], 22, 18, { taper: .6 }), C.furL, { depth: .1, tex: .5, edge: false });
  for (let i = 0; i < 7; i++) { const x = -130 + i * 40; piece(ctx, ribbon([[x, -180 - br], [x - 8, -140], [x - 18, -98]], 18, 6, { taper: .4 }), C.furD, { depth: .12, tex: .5, edge: false }); }
  // 近側的腳
  leg(-118, false, 0, false, true); leg(136, false, kn * Math.max(0, Math.sin(ph)) * 26);
  piece(ctx, blob([[110, -170], [160, -196], [196, -170], [186, -110], [140, -96]], .9), C.fur, { depth: .4 });
  piece(ctx, blob([[150, -170], [186, -168], [184, -120], [156, -112]], .9), C.white, { depth: .2, alpha: .9 });
  // 頭
  withT(ctx, 176, -214, (o.headTilt || 0) + Math.sin(t * .9) * .02, .82, .82, () => catHead(ctx, Object.assign({ t, depth: d, turn: .35 }, o.head || {})));
}

/* 捲成一團睡覺（也用在最後那隻發光的黑醬）。原點＝身體中心 */
function catCurl(ctx, o = {}) {
  const C = o.colors || CAT, t = o.t || 0, d = o.depth ?? 1;
  const br = 1 + Math.sin(t * 1.9) * .018;
  ctx.save(); ctx.scale(1, br);
  piece(ctx, blob([[-176, 4], [-160, -66], [-70, -112], [56, -114], [150, -82], [184, -14], [156, 46], [44, 70], [-80, 66], [-162, 42]], .9), C.fur, { depth: d });
  for (let i = 0; i < 6; i++) {
    const a = -2.6 + i * .42;
    piece(ctx, ribbon([[Math.cos(a) * 60, Math.sin(a) * 30 - 20], [Math.cos(a) * 120, Math.sin(a) * 70 - 26], [Math.cos(a) * 168, Math.sin(a) * 90 - 20]], 16, 5, { taper: .5 }), C.furD, { depth: .1, tex: .5, edge: false });
  }
  ctx.restore();
  // 尾巴繞到前面
  const tail = [[-170, 10], [-130, 62], [-20, 84], [96, 70], [150, 40]];
  piece(ctx, ribbon(tail, 32, 24, { roundEnd: true, n: 40 }), C.fur, { depth: .7 });
  for (const [a, b] of [[.22, .29], [.42, .49], [.62, .69]]) piece(ctx, ribbon(tail, 33, 25, { from: a, to: b, n: 40 }), C.furD, { depth: .1, tex: .5, edge: false });
  piece(ctx, ribbon(tail, 32, 24, { from: .86, to: 1, roundEnd: true, n: 40 }), C.furDD, { depth: .1, tex: .5, edge: false });
  // 前腳與頭
  piece(ctx, ell(96, 30, 34, 16, -.1), C.white, { depth: .5 });
  piece(ctx, ell(140, 22, 30, 15, -.2), C.white, { depth: .5 });
  withT(ctx, 112, -34, -.28, .72, .72, () => catHead(ctx, Object.assign({ t, depth: d, blink: 1, whiskers: true }, o.head || {})));
}

/* 被抱著（婚禮那張照片的姿勢）。原點＝胸口中心 */
function catHeld(ctx, o = {}) {
  const C = o.colors || CAT, t = o.t || 0, d = o.depth ?? 1;
  const sw = Math.sin(t * 1.2) * 6;
  // 垂下的尾巴與後腳
  const tail = [[30, 110], [44, 190], [36 + sw, 260], [56 + sw, 300]];
  piece(ctx, ribbon(tail, 28, 22, { roundEnd: true, n: 32 }), C.fur, { depth: .6 });
  for (const [a, b] of [[.25, .33], [.5, .58], [.72, .8]]) piece(ctx, ribbon(tail, 29, 23, { from: a, to: b, n: 32 }), C.furD, { depth: .1, tex: .5, edge: false });
  piece(ctx, ribbon(tail, 28, 22, { from: .86, to: 1, roundEnd: true, n: 32 }), C.furDD, { depth: .1, tex: .5, edge: false });
  for (const [x0, x1, y1] of [[-56, -74, 214], [58, 68, 200]]) {
    piece(ctx, blob([[x0 - 30, 60], [x0 + 28, 56], [x1 + 20, y1 - 30], [x1 + 18, y1], [x1 - 18, y1], [x1 - 22, y1 - 40], [x0 - 32, 110]], .85), C.furM, { depth: .6 });
    for (let i = 0; i < 2; i++) piece(ctx, ribbon([[x1 - 22, y1 - 70 + i * 28], [x1 + 20, y1 - 74 + i * 28]], 6, 4, { taper: .4 }), C.furD, { depth: .1, tex: .5, edge: false });
    piece(ctx, ell(x1, y1 + 4, 24, 16), C.white, { depth: .4 });
  }
  // 身體
  piece(ctx, blob([[-84, -150], [-104, -70], [-100, 20], [-80, 88], [-44, 122], [0, 130], [44, 122], [80, 88], [100, 20], [104, -70], [84, -150], [0, -172]], .9), C.fur, { depth: d });
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) piece(ctx, ribbon([[s * 102, -96 + i * 44], [s * 82, -92 + i * 44], [s * 62, -82 + i * 44]], 10, 3, { taper: .5 }), C.furD, { depth: .1, tex: .5, edge: false });
  piece(ctx, blob([[-46, -136], [-58, -60], [-46, 40], [0, 96], [46, 40], [58, -60], [46, -136], [0, -150]], .9), '#e6ddd0', { depth: .3 });
  // 前腳（左腳伸向零食）
  const reach = o.reach || 0;
  piece(ctx, ribbon([[-46, -110], [-66 - reach * 20, -70 - reach * 30], [-80 - reach * 36, -40 - reach * 70]], 34, 28), C.furM, { depth: .6 });
  piece(ctx, ell(-80 - reach * 36, -36 - reach * 70, 18, 13), C.white, { depth: .4 });
  piece(ctx, ribbon([[44, -110], [56, -60], [52, -14]], 34, 28), C.furM, { depth: .6 });
  piece(ctx, ell(52, -10, 18, 13), C.white, { depth: .4 });
  withT(ctx, 4, -214, (o.headTilt ?? -.12), .96, .96, () => catHead(ctx, Object.assign({ t, depth: d, turn: -.45 }, o.head || {})));
}
