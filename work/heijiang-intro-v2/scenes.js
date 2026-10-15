/* 黑醬・在身邊 二版 — 各場景。每個場景 fn(ctx, lt, t) 從單位矩陣畫滿整格。 */
'use strict';
const ALL_TEXT = '那天晚上紙箱裡有一點點聲音說我小的一天長成了黑醬早上六點肚子四隻腳到就是牠鑰匙響已經在門口藍色領巾寫著名字那也後來窗邊陽光空塊還很愛你們直都回頭慢慢眨下眼身給琦與蓓撿到隻貓有人要收編嗎群組今天傍晚，。：！？・77';
const SANS = '"Noto Sans CJK TC","Noto Sans CJK SC",sans-serif';

/* ---------- 共用小物 ---------- */
function fillBG(ctx, color, tex = .9) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = color; ctx.fillRect(0, 0, W, H);
  if (tex) { ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = tex; ctx.fillStyle = PAPER_PAT; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}
function paperRect(ctx, x, y, w, h, color, o = {}) { piece(ctx, o.r ? rrect(x, y, w, h, o.r) : poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]), color, o); }

// 紙箱：原點＝正面底邊中心。content 畫在箱子裡（正面之前）
function box3(ctx, o = {}) {
  const w = o.w || 300, h = o.h || 220, d = o.d || 120, dx = d * .55, dy = -d * .38;
  const C = { front: '#caa77b', side: '#ad8c64', in: '#6b5440', inSide: '#806650', flap: '#d6b68b', flapD: '#b99a72', tape: '#e2cfae' };
  const top = -h;
  const open = o.open ?? 1;
  PIECE_SEED = o.seed || 300;
  if (open > 0) {
    // 後蓋
    piece(ctx, poly([[-w / 2 + dx, top + dy], [w / 2 + dx, top + dy], [w / 2 + dx - 6, top + dy - 90 * open], [-w / 2 + dx + 4, top + dy - 96 * open]]), C.flapD, { depth: .6 });
    // 左右蓋往外翻
    piece(ctx, poly([[-w / 2, top], [-w / 2 + dx, top + dy], [-w / 2 + dx - 90 * open, top + dy - 30 * open], [-w / 2 - 92 * open, top - 18 * open]]), C.flap, { depth: .6 });
    piece(ctx, poly([[w / 2, top], [w / 2 + dx, top + dy], [w / 2 + dx + 70 * open, top + dy - 58 * open], [w / 2 + 70 * open, top - 52 * open]]), C.flap, { depth: .6 });
    // 箱內
    piece(ctx, poly([[-w / 2, top], [w / 2, top], [w / 2 + dx, top + dy], [-w / 2 + dx, top + dy]]), C.in, { depth: .2, tex: .6 });
    piece(ctx, poly([[w / 2, top], [w / 2 + dx, top + dy], [w / 2 + dx, top + dy + 40], [w / 2, top + 40]]), C.inSide, { depth: 0, tex: .6 });
  } else {
    piece(ctx, poly([[-w / 2, top], [w / 2, top], [w / 2 + dx, top + dy], [-w / 2 + dx, top + dy]]), C.flap, { depth: .3 });
    piece(ctx, poly([[-w / 2 + dx / 2, top + dy / 2 - 1], [w / 2 + dx / 2, top + dy / 2 - 1], [w / 2 + dx / 2, top + dy / 2 + 1], [-w / 2 + dx / 2, top + dy / 2 + 1]]), 'rgba(80,60,40,.5)', { depth: 0, tex: 0, edge: false });
    piece(ctx, poly([[-12 + dx / 2, top + dy / 2 - 6], [12 + dx / 2, top + dy / 2 - 6], [12, top], [-12, top]]), C.tape, { depth: .1, tex: .3 });
  }
  if (o.content) { ctx.save(); o.content(ctx, { top, dx, dy, w, h }); ctx.restore(); }
  PIECE_SEED = (o.seed || 300) + 50;
  piece(ctx, poly([[w / 2, 0], [w / 2, top], [w / 2 + dx, top + dy], [w / 2 + dx, dy]]), C.side, { depth: .8 });
  piece(ctx, poly([[-w / 2, 0], [-w / 2, top], [w / 2, top], [w / 2, 0]]), C.front, { depth: .9 });
  if (o.tape) piece(ctx, poly([[-16, top], [16, top], [16, top + 70], [-16, top + 70]]), C.tape, { depth: .1, tex: .3 });
  if (o.label) { paperRect(ctx, -w / 2 + 34, top + 70, 120, 78, '#f4efe4', { depth: .2 }); for (let i = 0; i < 4; i++) wash(ctx, rrect(-w / 2 + 46, top + 86 + i * 14, 70 + (i % 2) * 22, 4, 2), '#a59a8a', .8); }
  if (open > 0) piece(ctx, poly([[-w / 2, top], [w / 2, top], [w / 2 - 8, top + 50 * open], [-w / 2 + 8, top + 46 * open]]), C.flapD, { depth: .5 });
  if (o.front) { ctx.save(); o.front(ctx, { top, dx, dy, w, h }); ctx.restore(); }
  wash(ctx, poly([[-w / 2, 0], [w / 2, 0], [w / 2, -26], [-w / 2, -26]]), 'rgba(60,40,25,.18)', 1, 6);
}

function stars(ctx, t, seed, n, box, size = 2.2) {
  const r = rng(seed); ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) {
    const x = box[0] + r() * box[2], y = box[1] + r() * box[3], s = size * (.5 + r() * r() * 2), ph = r() * TAU, sp = .6 + r() * 1.4;
    const a = .45 + .55 * (.5 + .5 * Math.sin(t * sp + ph));
    const g = ctx.createRadialGradient(x, y, 0, x, y, s * 4);
    g.addColorStop(0, `rgba(255,246,222,${a})`); g.addColorStop(.3, `rgba(255,236,200,${a * .35})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - s * 4, y - s * 4, s * 8, s * 8);
  }
  ctx.restore();
}
function moon(ctx, x, y, r, glow = 1) {
  radial(ctx, x, y, r * 5, [[0, 'rgba(255,232,180,.35)'], [.3, 'rgba(255,222,170,.12)'], [1, 'rgba(0,0,0,0)']], 'screen', glow);
  piece(ctx, ell(x, y, r, r), '#f5e6c4', { depth: .3, shadowAlpha: .15, tex: .7 });
  wash(ctx, ell(x + r * .25, y - r * .1, r * .22, r * .18), 'rgba(210,190,150,.35)', 1, 2);
  wash(ctx, ell(x - r * .3, y + r * .3, r * .16, r * .12), 'rgba(210,190,150,.3)', 1, 2);
}
function bokeh(ctx, t, seed, n, box, cols, size = 40) {
  const r = rng(seed); ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) {
    const x = box[0] + r() * box[2] + Math.sin(t * .3 + i) * 6, y = box[1] + r() * box[3], s = size * (.5 + r()), c = cols[i % cols.length];
    ctx.globalAlpha = .25 + r() * .45;
    const g = ctx.createRadialGradient(x, y, s * .6, x, y, s);
    g.addColorStop(0, c); g.addColorStop(.85, c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
function leafy(ctx, x, y, s, color, seed, n = 9) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, rr = r() * 90 * s;
    piece(ctx, ell(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .7, (60 + r() * 50) * s, (46 + r() * 36) * s, r()), color, { depth: .6, tex: .8 });
  }
}

/* ---------- 窗（長大、空了的窗邊共用） ---------- */
function windowScene(ctx, lt, cam, o) {
  const season = o.season; // 0 春 1 夏 2 秋；空窗用 1.4（午後）
  const skyTop = o.skyTop || '#bcd3df', skyBot = o.skyBot || '#f1e7d4';
  // 窗外
  layer(ctx, cam, .55, 2.2, g => {
    linear(g, 0, 300, 0, 1200, [[0, skyTop], [1, skyBot]], [0, 200, 1080, 1100]);
    // 遠方的樓
    PIECE_SEED = 40;
    for (let i = 0; i < 6; i++) paperRect(g, 140 + i * 150, 760 - (i % 3) * 70, 120, 600, i % 2 ? '#c9c4bd' : '#d6d0c6', { depth: .4 });
    const leafC = ['#f0c2c8', '#9bb37f', '#d98f4f', '#d3a35c'];
    const ci = Math.floor(season), cf = season - ci;
    const blend = (a, b, f) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const ch = s => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, f)); return `rgb(${ch(16)},${ch(8)},${ch(0)})`; };
    const col = blend(leafC[ci], leafC[Math.min(3, ci + 1)], cf);
    PIECE_SEED = 60;
    piece(g, ribbon([[260, 1300], [300, 900], [380, 640], [520, 420]], 56, 18, { taper: .1 }), '#6c5546', { depth: .6 });
    piece(g, ribbon([[340, 800], [480, 700], [640, 640]], 22, 8), '#6c5546', { depth: .5 });
    leafy(g, 520, 470, 1.2, col, 3, 10); leafy(g, 660, 640, 1, col, 4, 8); leafy(g, 330, 620, .9, col, 5, 7);
    if (season > 1.6 && season < 2.6) for (let i = 0; i < 9; i++) { const r = rng(90 + i); const fx = 300 + r() * 500 + Math.sin(lt * 1.3 + i) * 40, fy = (500 + r() * 400 + lt * 90) % 900 + 300; piece(g, ell(fx, fy, 12, 7, lt + i), col, { depth: .5 }); }
  });
  // 牆與窗框
  layer(ctx, cam, 1, 0, g => {
    PIECE_SEED = 100;
    const wall = new Path2D(); wall.rect(-400, -400, 1880, 2800); wall.rect(200, 300, 680, 880);
    g.save(); g.fillStyle = o.wall || '#efe3cf'; g.fill(wall, 'evenodd');
    g.globalCompositeOperation = 'multiply'; g.globalAlpha = .8; g.fillStyle = PAPER_PAT; g.fill(wall, 'evenodd'); g.restore();
    // 窗框
    const fr = '#f7f1e6';
    paperRect(g, 176, 276, 728, 26, fr, { depth: 1 }); paperRect(g, 176, 1170, 728, 24, fr, { depth: 1 });
    paperRect(g, 176, 276, 26, 918, fr, { depth: 1 }); paperRect(g, 878, 276, 26, 918, fr, { depth: 1 });
    paperRect(g, 527, 290, 26, 890, fr, { depth: .8 }); paperRect(g, 190, 716, 700, 20, fr, { depth: .8 });
    // 窗台
    paperRect(g, 120, 1186, 840, 50, '#e9dcc5', { depth: 1.4 });
    paperRect(g, 140, 1236, 800, 16, '#d6c6ab', { depth: .6 });
    // 窗簾
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? 40 : 1040;
      const cur = blob([[x0, 200], [x0 + s * -180, 210], [x0 + s * -150, 600], [x0 + s * -200, 1000], [x0 + s * -170, 1300], [x0, 1310]], .9);
      piece(g, cur, o.curtain || '#e7c9b5', { depth: 1.6, shadowAlpha: .25 });
      for (let i = 1; i < 4; i++) wash(g, ribbon([[x0 + s * -i * 42, 220], [x0 + s * -(i * 40 + 6), 760], [x0 + s * -(i * 44), 1290]], 6, 10), 'rgba(140,90,70,.12)', 1, 3);
    }
  });
}

/* ---------- S1 夜裡的紙箱 ---------- */
function sNight(ctx, lt, t) {
  const st = stopT(lt);
  const k = ease(range(lt, 0, 8.4));
  const cam = { x: 540 + k * 20, y: 980 + k * 140, z: 1 + k * .3 };
  fillBG(ctx, '#232640', 0);
  layer(ctx, cam, .15, 0, g => {
    linear(g, 0, 0, 0, 1500, [[0, '#191c33'], [.55, '#2e3150'], [1, '#5a4d60']], [-600, -600, 2400, 2600]);
    stars(g, lt, 7, 70, [-300, -200, 1700, 1100]);
    moon(g, 820, 330, 54);
  });
  layer(ctx, cam, .4, 1.5, g => {
    PIECE_SEED = 10; const r = rng(3);
    for (let i = 0; i < 10; i++) {
      const x = -260 + i * 170, hh = 380 + r() * 340, top = 1240 - hh;
      paperRect(g, x, top, 150, hh + 400, '#2d3049', { depth: .6, shadowAlpha: .4 });
      for (let wy = top + 40; wy < 1200; wy += 64) for (let wx = x + 22; wx < x + 130; wx += 42) if (r() < .32) {
        paperRect(g, wx, wy, 22, 28, '#f3cf8e', { depth: .1, tex: .4 });
        radial(g, wx + 11, wy + 14, 50, [[0, 'rgba(255,210,140,.25)'], [1, 'rgba(0,0,0,0)']], 'screen');
      }
    }
  });
  layer(ctx, cam, .75, 0, g => {
    PIECE_SEED = 80;
    paperRect(g, -300, 1080, 1700, 230, '#45475e', { depth: 1 });
    for (let i = 0; i < 14; i++) for (let j = 0; j < 3; j++) wash(g, rrect(-300 + i * 120 + (j % 2) * 60, 1094 + j * 70, 110, 60, 4), 'rgba(255,255,255,.045)');
    leafy(g, 120, 1060, .9, '#2f4a3d', 8, 9); leafy(g, 980, 1080, .8, '#2f4a3d', 9, 8);
  });
  layer(ctx, cam, 1, 0, g => {
    PIECE_SEED = 120;
    paperRect(g, -300, 1300, 1700, 900, '#5a5d73', { depth: 1.2 });
    paperRect(g, -300, 1290, 1700, 22, '#6d7086', { depth: .6 });
    for (let i = 0; i < 12; i++) wash(g, rrect(-300 + i * 150, 1330, 4, 900, 2), 'rgba(0,0,0,.14)');
    // 路燈
    paperRect(g, 196, 380, 22, 960, '#2f3240', { depth: 1.2 });
    piece(g, ribbon([[207, 400], [230, 340], [300, 330], [350, 360]], 18, 14), '#2f3240', { depth: 1 });
    piece(g, blob([[312, 356], [392, 356], [382, 384], [322, 384]], .9), '#2f3240', { depth: 1 });
    piece(g, ell(352, 388, 30, 8), '#ffe9bd', { depth: 0, tex: 0 });
    radial(g, 352, 395, 160, [[0, 'rgba(255,236,190,.9)'], [.25, 'rgba(255,220,160,.3)'], [1, 'rgba(0,0,0,0)']], 'screen');
    beam(g, [[322, 392], [384, 392], [820, 1420], [140, 1420]], 'rgba(255,226,170,.55)', .9, 22);
    radial(g, 520, 1360, 420, [[0, 'rgba(255,214,150,.45)'], [1, 'rgba(0,0,0,0)']], 'screen');
    // 紙箱與小貓
    const peek = easeOut(range(st, 2.2, 3.2));
    withT(g, 560, 1380, -.02, 1, 1, () => box3(g, {
      w: 300, h: 210, d: 120, seed: 400, content: (c, b) => {
        const sy = lerp(60, -48, peek);
        withT(c, 10, b.top + sy, Math.sin(st * 1.6) * .03 + (st > 6 ? .08 : 0), .5, .5, () => {
          PIECE_SEED = 500;
          catHead(c, { t: st, kitten: true, blink: st > 5.4 && st < 5.7 ? 1 : 0, look: [st > 4 ? -4 : 2, -3], earL: Math.sin(st * 3) * .04, earR: st > 3.6 && st < 3.9 ? .2 : 0 });
          for (const s of [-1, 1]) piece(c, ell(s * 40, 116, 26, 16), CAT.white, { depth: .5 });
        });
      }
    }));
    motes(g, lt, 21, 26, [200, 420, 520, 900], 'rgba(255,236,200,.9)', 2.4);
  });
  layer(ctx, cam, 1.5, 8, g => { PIECE_SEED = 700; leafy(g, -40, 1820, 1.4, '#22362d', 12, 8); leafy(g, 1120, 1880, 1.3, '#22362d', 13, 8); });
  radial(ctx, 540, 1000, 1300, [[.4, 'rgba(0,0,0,0)'], [1, 'rgba(10,8,20,.6)']], 'multiply');
}

/* ---------- S2 群組裡的訊息 ---------- */
function bubble(ctx, x, y, w, h, color, right, a, s) {
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x + (right ? w : 0), y + h); ctx.scale(s, s); ctx.translate(-(right ? w : 0), -h);
  ctx.shadowColor = 'rgba(0,0,0,.12)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(0, 0, w, h, 22); ctx.fill();
  ctx.restore();
}
function sPhone(ctx, lt, t) {
  const st = stopT(lt);
  const k = ease(range(lt, 0, 6.5));
  const punch = easeOut(range(lt, 4.4, 5.2)) * .05;
  const cam = { x: 540, y: 960 + k * 20, z: 1.02 + k * .06 + punch };
  fillBG(ctx, '#2a2a3a', 0);
  layer(ctx, cam, .3, 14, g => {
    linear(g, 0, 0, 0, 1920, [[0, '#262840'], [1, '#463d4e']], [-600, -600, 2400, 3200]);
    bokeh(g, lt, 3, 34, [-200, 100, 1500, 1700], ['rgba(255,206,140,.9)', 'rgba(255,170,120,.8)', 'rgba(150,180,255,.6)', 'rgba(255,230,190,.8)'], 70);
  });
  layer(ctx, cam, 1, 0, g => {
    const sway = Math.sin(st * 1.1) * .012 + jit(st, 3, .004);
    // 袖子與手掌（在手機後面）
    PIECE_SEED = 200;
    for (const sd of [-1, 1]) piece(g, ribbon([[540 + sd * 600, 2150], [540 + sd * 430, 1720], [540 + sd * 300, 1420]], 250, 200), PPL.olive, { depth: 1.4 });
    for (const sd of [-1, 1]) piece(g, ribbon([[540 + sd * 330, 1470], [540 + sd * 300, 1400]], 214, 214), PPL.oliveD, { depth: .5 });
    withT(g, 540, 900, -.03 + sway, 1, 1, () => {
      for (const sd of [-1, 1]) piece(g, blob([[sd * 190, 330], [sd * 300, 300], [sd * 336, 420], [sd * 310, 560], [sd * 210, 610], [sd * 150, 520]], .9), PPL.skin, { depth: 1.2 });
      PIECE_SEED = 50;
      // 手機
      piece(g, rrect(-270, -540, 540, 1080, 64), '#24242a', { depth: 2.2, shadowAlpha: .5, tex: .3 });
      const scr = rrect(-250, -520, 500, 1040, 48);
      g.save(); g.fillStyle = '#f4f1ea'; g.fill(scr); g.clip(scr);
      g.globalCompositeOperation = 'multiply'; g.globalAlpha = .25; g.fillStyle = PAPER_PAT; g.fillRect(-300, -600, 600, 1200); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      // 標題列
      g.fillStyle = '#e6e1d6'; g.fillRect(-250, -520, 500, 130);
      g.fillStyle = '#4a433c'; g.font = `500 34px ${SANS}`; g.textAlign = 'center'; g.fillText('社區貓友群組', 0, -432);
      g.font = `400 22px ${SANS}`; g.fillStyle = '#958b7f'; g.fillText('今天 22:41', 0, -360);
      // 照片訊息
      const a1 = range(st, .5, .7), s1 = backOut(range(st, .5, .9));
      if (a1 > 0) {
        bubble(g, -40, -320, 260, 230, '#ffffff', true, a1, s1);
        g.save(); g.globalAlpha *= a1; g.translate(220, -90); g.scale(s1, s1); g.translate(-220, 90);
        const ph = rrect(-30, -310, 240, 210, 16); g.save(); g.clip(ph);
        g.fillStyle = '#3a3d55'; g.fillRect(-30, -310, 240, 210);
        radial(g, 90, -170, 160, [[0, 'rgba(255,220,160,.6)'], [1, 'rgba(0,0,0,0)']], 'screen');
        withT(g, 90, -130, 0, .32, .32, () => box3(g, { w: 300, h: 210, d: 120, seed: 900, content: (c, b) => withT(c, 10, b.top - 48, 0, .5, .5, () => { PIECE_SEED = 950; catHead(c, { t: 1, kitten: true, look: [0, 3] }); }) }));
        g.restore(); g.restore();
      }
      const say = (txt, y, at, right, color, w, x0) => {
        const a = range(st, at, at + .2), s = backOut(range(st, at, at + .4)); if (a <= 0) return;
        const x = right ? 220 - w : (x0 ?? -220);
        bubble(g, x, y, w, 84, color, right, a, s);
        g.save(); g.globalAlpha *= a; g.translate(x + (right ? w : 0), y + 84); g.scale(s, s); g.translate(-(x + (right ? w : 0)), -(y + 84));
        g.fillStyle = '#3b352f'; g.font = `400 38px ${SANS}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(txt, x + 26, y + 43); g.restore();
      };
      say('撿到一隻小貓', -60, 1.5, true, '#d3ebc5', 290);
      say('有人要收編嗎？', 44, 2.3, true, '#d3ebc5', 320);
      // 正在輸入…
      if (st > 3.3 && st < 4.4) { bubble(g, -150, 170, 120, 70, '#ffffff', false, 1, 1); for (let i = 0; i < 3; i++) { g.fillStyle = `rgba(120,110,100,${.4 + .6 * (Math.floor(st * 6 + i) % 3 === 0)})`; g.beginPath(); g.arc(-118 + i * 28, 205, 7, 0, TAU); g.fill(); } }
      if (st >= 4.4) {
        const a = range(st, 4.4, 4.6);
        g.save(); g.globalAlpha *= a; g.fillStyle = '#8a7f73'; g.font = `400 26px ${SANS}`; g.textAlign = 'left'; g.fillText('77', -146, 158); g.restore();
        g.save(); g.globalAlpha *= a; g.fillStyle = '#c7b8a6'; g.beginPath(); g.arc(-196, 214, 30, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.font = `500 24px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('77', -196, 215); g.restore();
        say('我！', 172, 4.4, false, '#ffffff', 130, -150);
        if (st > 4.7) { const ha = range(st, 4.7, 5.0), hs = backOut(range(st, 4.7, 5.1)); g.save(); g.globalAlpha *= ha; g.translate(4, 166); g.scale(hs * 1.6, hs * 1.6); g.fillStyle = '#e8908a'; g.beginPath(); g.moveTo(0, 6); g.bezierCurveTo(-12, -4, -10, -14, -3, -14); g.bezierCurveTo(0, -14, 0, -10, 0, -9); g.bezierCurveTo(0, -10, 0, -14, 3, -14); g.bezierCurveTo(10, -14, 12, -4, 0, 6); g.fill(); g.restore(); }
      }
      g.restore();
      wash(g, rrect(-60, -510, 120, 20, 10), '#24242a', 1);
      // 拇指壓在邊框上
      PIECE_SEED = 260;
      for (const sd of [-1, 1]) {
        piece(g, blob([[sd * 262, 420], [sd * 238, 330], [sd * 214, 268], [sd * 192, 276], [sd * 202, 350], [sd * 226, 440]], .9), PPL.skin, { depth: .9 });
        wash(g, ell(sd * 206, 282, 8, 7), 'rgba(255,255,255,.5)');
      }
    });
  });
  radial(ctx, 540, 900, 1200, [[.5, 'rgba(0,0,0,0)'], [1, 'rgba(10,8,20,.55)']], 'multiply');
}

/* ---------- S3 77 說：我 ---------- */
function sHandoff(ctx, lt, t) {
  const st = stopT(lt);
  if (lt < 3.1) {
    const k = ease(range(lt, 0, 3.1));
    const cam = { x: 560, y: 980, z: 1.04 + k * .06 };
    fillBG(ctx, '#efe2cf');
    layer(ctx, cam, .4, 6, g => {
      PIECE_SEED = 10;
      linear(g, 0, 0, 0, 1920, [[0, '#f3e6d2'], [1, '#e2cfb6']], [-600, -600, 2400, 3200]);
      radial(g, 820, 360, 700, [[0, 'rgba(255,248,226,.9)'], [1, 'rgba(255,240,210,0)']], 'screen');
      leafy(g, 60, 420, 1.3, '#a9b98f', 2, 9); leafy(g, 1040, 1300, 1.1, '#b7c49a', 3, 8);
    });
    layer(ctx, cam, 1, 0, g => {
      // 琦琦
      PIECE_SEED = 100;
      const reach = easeOut(range(st, .5, 1.7));
      const qiT = () => { g.translate(790, 880); g.rotate(-.06 - .08 * reach); g.scale(1.9, 1.9); };
      const qiArms = { l: [lerp(-96, -178, reach), lerp(250, 168, reach)], r: [lerp(40, -118, reach), lerp(260, 186, reach)] };
      g.save(); qiT(); person(g, { who: 'qi', outfit: 'day', bust: true, t: st, eyes: 'down', lookX: -3, mouth: reach > .8 ? 'o' : 'smile', headTilt: -.08 - reach * .06, skipArm: 'l', arms: { l: [.1, .1], r: [qiArms.r, -1] } }); g.restore();
      g.__qi = () => { g.save(); qiT(); PIECE_SEED = 180; armIK(g, -1, qiArms.l, PPL.qi.day, { bw: 1.1, w0: 48, w1: 35 }); g.restore(); };
      // 紙箱與大男生的手
      PIECE_SEED = 300;
      withT(g, 400, 1400, .02, 1.25, 1.25, () => box3(g, {
        w: 300, h: 200, d: 110, seed: 400, content: (c, b) => withT(c, 6, b.top - 40, .14, .55, .55, () => { PIECE_SEED = 500; catHead(c, { t: st, kitten: true, look: [6, -7], earR: st > 1.2 && st < 1.5 ? .25 : 0, mouth: st > 2.0 && st < 2.5 ? 'open' : 'calm' }); for (const s of [-1, 1]) piece(c, ell(s * 40, 112, 24, 15), CAT.white, { depth: .5 }); })
      }));
      PIECE_SEED = 700;
      withT(g, -60, 1550, -.2, 1, 1, () => { piece(g, ribbon([[-200, 120], [120, 60], [240, 10]], 170, 130), PPL.olive, { depth: 1.2 }); });
      withT(g, 206, 1330, -.9, 1.7, 1.7, () => hand(g, 0, 0, 1.6, 1, { w: 1.1 }));
      withT(g, 300, 1210, -.2, 1, 1, () => { piece(g, ribbon([[-400, -40], [-80, 10], [40, 40]], 150, 120), PPL.olive, { depth: 1.2 }); });
      withT(g, 330, 1230, -1.2, 1.6, 1.6, () => hand(g, 0, 0, 1.2, 1, { w: 1.1 }));
      g.__qi();
    });
    layer(ctx, cam, 1.6, 10, g => { PIECE_SEED = 900; leafy(g, -60, 1700, 1.6, '#94a77c', 21, 7); });
  } else {
    const l2 = lt - 3.1, s2 = stopT(l2);
    const k = ease(range(l2, 0, 3.4));
    const cam = { x: 540, y: 900, z: 1.0 + k * .07 };
    fillBG(ctx, '#f0e0cb');
    layer(ctx, cam, .4, 10, g => {
      linear(g, 0, 0, 1080, 1920, [[0, '#f6e8d2'], [1, '#e6cdb0']], [-600, -600, 2400, 3200]);
      radial(g, 300, 300, 900, [[0, 'rgba(255,250,230,.95)'], [1, 'rgba(255,240,210,0)']], 'screen');
      bokeh(g, l2, 9, 12, [0, 0, 1080, 1200], ['rgba(255,240,200,.7)', 'rgba(255,220,180,.6)'], 60);
    });
    layer(ctx, cam, 1, 0, g => {
      const boop = easeOut(range(s2, .9, 1.6));
      PIECE_SEED = 100;
      const hx = lerp(-100, -84, boop), hy = lerp(-84, -96, boop), kx = hx - 1.4, ky = hy + 77;
      withT(g, 660, 880, .06, 2.3, 2.3, () => person(g, { who: 'qi', outfit: 'day', bust: true, t: s2, eyes: boop > .5 ? 'smile' : 'down', lookX: -3, mouth: 'smile', headTilt: -.1, armsFront: true,
        arms: { l: [[kx - 40, ky + 6], 1], r: [[kx + 38, ky + 16], -1] },
        afterHead: c => withT(c, kx, ky, .1, .36, .36, () => { PIECE_SEED = 400; catHeld(c, { t: s2, reach: 0, headTilt: .16, head: { kitten: true, turn: .55, look: [5, -3], blink: boop > .6 ? 1 : 0 } }); })
      }));
    });
    radial(ctx, 420, 760, 900, [[0, 'rgba(255,244,214,.35)'], [1, 'rgba(0,0,0,0)']], 'screen');
  }
  radial(ctx, 540, 960, 1300, [[.55, 'rgba(0,0,0,0)'], [1, 'rgba(60,40,20,.35)']], 'multiply');
}

/* ---------- S4 一天一天長大 ---------- */
function sGrow(ctx, lt, t) {
  const st = stopT(lt);
  const k = ease(range(lt, 0, 6.5));
  const cam = { x: 540, y: 960, z: 1.02 + k * .05 };
  const season = clamp(lt / 6.5 * 2.6, 0, 2.6);
  fillBG(ctx, '#efe3cf');
  windowScene(ctx, lt, cam, { season });
  layer(ctx, cam, 1, 0, g => {
    beam(g, [[230, 320], [860, 320], [1180, 1900], [-60, 1900]], 'rgba(255,240,210,.55)', .7, 40);
    PIECE_SEED = 300;
    piece(g, blob([[300, 1188], [420, 1166], [660, 1166], [780, 1188], [700, 1206], [380, 1206]], .9), '#c9a9a0', { depth: 1 });
    const stage = st < 2.1 ? 0 : st < 4.2 ? 1 : 2;
    const sc = [.46, .66, .86][stage];
    const pop = 1 + .06 * Math.max(0, 1 - (st - [0, 2.1, 4.2][stage]) * 5);
    PIECE_SEED = 400;
    withT(g, 540 + jit(st, 1, 1), 1182, 0, sc * pop, sc / pop, () => catSitBack(g, { t: st, look: stage === 2 ? easeOut(range(st, 5.2, 5.8)) * .7 : 0, tailUp: 0, headTilt: stage === 0 ? Math.sin(st * 2) * .05 : 0 }));
  });
  radial(ctx, 540, 960, 1300, [[.55, 'rgba(0,0,0,0)'], [1, 'rgba(70,50,30,.32)']], 'multiply');
}

/* ---------- 靜態背景快取 ---------- */
const CACHE = {};
function cached(key, x, y, w, h, fn) {
  if (!CACHE[key]) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.translate(-x, -y); const keep = PIECE_SEED; PIECE_SEED = 5000 + Object.keys(CACHE).length * 300; fn(g); PIECE_SEED = keep; CACHE[key] = c; }
  return CACHE[key];
}

/* ---------- S5 早上六點 ---------- */
function alarmClock(ctx, x, y, s) {
  withT(ctx, x, y, 0, s, s, () => {
    for (const k of [-1, 1]) piece(ctx, ell(k * 40, -52, 22, 18, k * .5), '#c9a07a', { depth: .6 });
    piece(ctx, ell(0, 0, 62, 62), '#d9b38a', { depth: 1 });
    piece(ctx, ell(0, 0, 50, 50), '#fbf6ec', { depth: .3 });
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; wash(ctx, ell(Math.sin(a) * 40, -Math.cos(a) * 40, 2.4, 2.4), '#7a6a5a'); }
    piece(ctx, ribbon([[0, 0], [0, 30]], 6, 4), '#4a3f36', { depth: .2, tex: 0 });
    piece(ctx, ribbon([[0, 0], [0, -38]], 4, 3), '#4a3f36', { depth: .2, tex: 0 });
    piece(ctx, ell(0, 0, 5, 5), '#4a3f36', { depth: .2, tex: 0 });
    for (const k of [-1, 1]) piece(ctx, ribbon([[k * 30, 54], [k * 40, 72]], 8, 6), '#b38e6a', { depth: .4 });
  });
}
function sBed(ctx, lt, t) {
  const st = stopT(lt);
  const k = ease(range(lt, 0, 5.5));
  const cam = { x: 560, y: 1000, z: 1.02 + k * .06 };
  fillBG(ctx, '#ddd6d6');
  layer(ctx, cam, .9, 0, g => {
    linear(g, 0, 0, 0, 1300, [[0, '#cfcad6'], [1, '#ecdccd']], [-400, -400, 1900, 2000]);
    PIECE_SEED = 20;
    // 窗與晨光
    paperRect(g, 690, 150, 300, 360, '#f7f1e6', { depth: 1 });
    linear(g, 0, 170, 0, 490, [[0, '#a9b3d3'], [.6, '#f2c3b0'], [1, '#ffdcae']], [710, 170, 260, 320]);
    paperRect(g, 830, 170, 18, 320, '#f7f1e6', { depth: .5 }); paperRect(g, 710, 320, 260, 16, '#f7f1e6', { depth: .5 });
    radial(g, 840, 330, 400, [[0, 'rgba(255,214,170,.5)'], [1, 'rgba(0,0,0,0)']], 'screen');
    // 床頭櫃與鬧鐘
    paperRect(g, -60, 960, 200, 360, '#c7a584', { depth: 1.2 });
    paperRect(g, -60, 960, 200, 26, '#d5b593', { depth: .5 });
    alarmClock(g, 96, 884, .95);
    // 床頭板
    piece(g, blob([[150, 900], [150, 640], [300, 590], [540, 576], [780, 590], [940, 640], [940, 900]], .9), '#b98f6c', { depth: 1.2 });
    for (let i = 0; i < 5; i++) wash(g, rrect(220 + i * 150, 640, 6, 250, 3), 'rgba(90,60,40,.15)');
  });
  layer(ctx, cam, 1, 0, g => {
    PIECE_SEED = 100;
    piece(g, blob([[180, 830], [470, 806], [490, 920], [200, 944]], .9), '#f6f1e8', { depth: 1 });
    piece(g, blob([[600, 806], [900, 830], [890, 944], [600, 920]], .9), '#f6f1e8', { depth: 1 });
    // 蓓蓓的長髮散在枕頭上
    piece(g, blob([[622, 820], [742, 760], [866, 820], [886, 920], [742, 950], [602, 920]], .9), PPL.hair, { depth: .4 });
    PIECE_SEED = 160;
    withT(g, 340, 980, .06, 1, .94, () => personHead(g, { who: 'bei', outfit: 'day', eyes: 'closed', mouth: 'smile' }));
    PIECE_SEED = 200;
    const wake = st > 3.1;
    withT(g, 742, 980, -.05, 1, .94, () => personHead(g, { who: 'qi', outfit: 'day', eyes: 'closed', eyesR: wake ? 'open' : null, mouth: wake ? 'o' : 'smile', lookX: -4 }));
    // 棉被
    PIECE_SEED = 260;
    const br = Math.sin(lt * 1.6) * 6;
    const quilt = blob([[110, 1000], [260, 960], [420, 1000], [560, 960], [700, 990 - br], [860, 960], [980, 1000], [1010, 1400], [1060, 2100], [40, 2100], [80, 1400]], .9);
    piece(g, quilt, '#e9ddcc', { depth: 1.4 });
    g.save(); g.clip(quilt);
    for (let i = 0; i < 9; i++) wash(g, ribbon([[0, 1060 + i * 110], [540, 1040 + i * 112], [1080, 1070 + i * 110]], 3, 3), 'rgba(140,160,190,.35)');
    for (let i = 0; i < 9; i++) wash(g, ribbon([[80 + i * 120, 960], [100 + i * 118, 1500], [80 + i * 124, 2000]], 3, 3), 'rgba(140,160,190,.25)');
    wash(g, ell(330, 1240, 190, 120), 'rgba(255,255,255,.35)', 1, 30); wash(g, ell(740, 1230 - br, 190, 120), 'rgba(255,255,255,.35)', 1, 30);
    wash(g, ell(540, 1330, 80, 260), 'rgba(110,90,80,.18)', 1, 30);
    g.restore();
    piece(g, blob([[110, 1000], [260, 960], [420, 1000], [560, 960], [700, 990 - br], [860, 960], [980, 1000], [970, 1050], [100, 1050]], .9), '#f3ebe0', { depth: .6 });
    // 黑醬在琦琦的肚子上踩
    PIECE_SEED = 400;
    wash(g, ell(760, 1300 - br, 190, 30), 'rgba(90,70,60,.28)', 1, 14);
    withT(g, 770, 1306 - br, 0, -.92, .92, () => catStandSide(g, { t: st, knead: 1, head: { blink: st > 2.2 && st < 2.4 ? 1 : .35, look: [0, 2] } }));
    beam(g, [[720, 300], [960, 300], [700, 1700], [140, 1700]], 'rgba(255,214,170,.6)', .6, 40);
  });
  radial(ctx, 540, 1000, 1300, [[.55, 'rgba(0,0,0,0)'], [1, 'rgba(60,40,40,.35)']], 'multiply');
}

/* ---------- S6 紙箱 ---------- */
function sBox(ctx, lt, t) {
  const st = stopT(lt);
  const cam = { x: 540, y: 1100, z: 1.02 + ease(range(lt, 0, 4.5)) * .05 };
  fillBG(ctx, '#dfe2d4');
  layer(ctx, cam, .85, 1, g => {
    g.drawImage(cached('room', -300, 0, 1700, 2000, c => {
      paperRect(c, -300, 0, 1700, 1150, '#dfe2d4', { depth: 0 });
      for (let i = 0; i < 12; i++) wash(c, rrect(-300 + i * 150, 0, 70, 1150, 0), 'rgba(255,255,255,.12)');
      paperRect(c, -300, 1140, 1700, 40, '#f3efe6', { depth: .8 });
      paperRect(c, -300, 1180, 1700, 900, '#c9a882', { depth: .4 });
      for (let i = 0; i < 9; i++) wash(c, rrect(-300, 1230 + i * 90 + i * i * 6, 1700, 3, 1), 'rgba(90,60,40,.2)');
      paperRect(c, 120, 420, 300, 220, '#f5efe4', { depth: 1, r: 6 });
      paperRect(c, 140, 440, 260, 180, '#c7d1c9', { depth: .3 });
      leafy(c, 260, 560, .5, '#8fa880', 31, 6);
      // 沙發一角與盆栽
      piece(c, blob([[-300, 820], [140, 800], [210, 860], [220, 1300], [-300, 1320]], .9), '#9daeb2', { depth: 1.4 });
      piece(c, blob([[-300, 1010], [160, 990], [200, 1060], [-300, 1080]], .9), '#b0c0c3', { depth: .6 });
      piece(c, blob([[880, 1110], [1010, 1110], [990, 1290], [900, 1290]], .9), '#cf8f6b', { depth: 1 });
      for (let i = 0; i < 7; i++) piece(c, ell(945 + Math.cos(i * .9) * 60, 1000 - i * 40, 26, 70, i * .9 - 2), '#7e9b6e', { depth: .6 });
    }), -300, 0);
  });
  layer(ctx, cam, 1, 0, g => {
    PIECE_SEED = 80;
    piece(g, ell(540, 1460, 440, 120), '#e8d2c2', { depth: .6 });
    piece(g, ell(540, 1460, 400, 100), '#efdfd2', { depth: .2 });
    const open = st < 1.3 ? 0 : 1;
    const wob = st > .5 && st < 1.3 ? Math.sin(st * 30) * .025 : 0;
    const pop = st >= 1.3 ? backOut(range(st, 1.3, 1.75)) : 0;
    withT(g, 560, 1450, wob, 1 + (st >= 1.3 && st < 1.45 ? .03 : 0), 1, () => box3(g, {
      w: 430, h: 300, d: 170, seed: 120, open, tape: !open, label: true, content: (c, b) => {
        if (!open) return;
        withT(c, 30, b.top + lerp(140, -74, pop), Math.sin(st * 1.2) * .03, .92, .92, () => {
          PIECE_SEED = 600;
          catHead(c, { t: st, blink: st > 2.2 ? .55 : 0, look: [0, 2], earL: st > 3 && st < 3.25 ? .25 : 0, mouth: 'calm' });
        });
      },
      front: (c, b) => { if (open && pop > .6) { PIECE_SEED = 680; for (const s of [-1, 1]) piece(c, ell(30 + s * 48, b.top + 6, 32, 19), CAT.white, { depth: .6 }); } }
    }));
    if (st > 1.3 && st < 1.9) { const a = 1 - range(st, 1.5, 1.9); for (const [x, y, r] of [[300, 1020, -.6], [270, 1110, -.2], [830, 1010, .6], [870, 1100, .2]]) piece(g, ribbon([[x, y], [x + Math.cos(r - Math.PI / 2) * -50, y + Math.sin(r - Math.PI / 2) * -50]], 8, 4, { taper: .3 }), `rgba(90,70,55,${a})`, { depth: 0, tex: 0, edge: false }); }
  });
  radial(ctx, 540, 1100, 1300, [[.55, 'rgba(0,0,0,0)'], [1, 'rgba(50,50,40,.3)']], 'multiply');
}

/* ---------- S7 門口 ---------- */
function sDoor(ctx, lt, t) {
  const st = stopT(lt);
  const cam = { x: 560, y: 1000, z: 1.0 + ease(range(lt, 0, 5.5)) * .07 };
  const open = easeOut(range(st, 1.0, 1.7));
  fillBG(ctx, '#efe4d4');
  layer(ctx, cam, 1, 0, g => {
    // 門外的光
    linear(g, 0, 260, 0, 1340, [[0, '#fff7e6'], [1, '#ffe7c2']], [520, 260, 380, 1080]);
    PIECE_SEED = 30;
    leafy(g, 760, 520, .7, 'rgba(170,190,140,.6)', 41, 6);
    // 她們回來了（逆光）
    if (st > 1.5) {
      const step = range(st, 1.6, 3.4), j = Math.floor(step * 6);
      const sc = 1.0 + step * .1;
      PIECE_SEED = 60;
      withT(g, 800 - step * 10, 1338 - 664 * sc + (j % 2) * 4, 0, sc, sc, () => person(g, { who: 'bei', outfit: 'day', lower: 'stand', t: st, eyes: 'smile', mouth: 'grin', step: j * 1.3, headTilt: .05, arms: { l: [[-60, 250], 1], r: [[150, 140], 1] }, armsFront: false }));
      PIECE_SEED = 90;
      withT(g, 640 - step * 30, 1338 - 664 * (sc + .04) + ((j + 1) % 2) * 4, 0, sc + .04, sc + .04, () => person(g, { who: 'qi', outfit: 'day', lower: 'stand', t: st, eyes: 'open', lookX: -4, mouth: 'smile', step: j * 1.6 + 1, headTilt: -.06, arms: { l: [[-150, 120], -1], r: [[60, 250], -1] } }));
      g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(170,140,120,.22)'; g.fillRect(500, 240, 420, 1300); g.restore();
      radial(g, 710, 700, 380, [[0, 'rgba(255,240,210,.35)'], [1, 'rgba(0,0,0,0)']], 'screen');
    }
    // 牆、門框
    PIECE_SEED = 150;
    const wall = new Path2D(); wall.rect(-400, -400, 1880, 1740); wall.rect(520, 260, 380, 1080);
    g.save(); g.fillStyle = '#efe4d4'; g.fill(wall, 'evenodd'); g.globalCompositeOperation = 'multiply'; g.globalAlpha = .8; g.fillStyle = PAPER_PAT; g.fill(wall, 'evenodd'); g.restore();
    paperRect(g, 490, 230, 440, 34, '#f6f1e8', { depth: 1.2 }); paperRect(g, 490, 230, 34, 1110, '#f6f1e8', { depth: 1.2 }); paperRect(g, 896, 230, 34, 1110, '#f6f1e8', { depth: 1.2 });
    // 門板（從左往右收）
    const dx = 520 + 360 * open;
    if (dx < 896) {
      const shade = Math.round(lerp(156, 118, open));
      piece(g, poly([[dx, 262 - 20 * open], [900, 262], [900, 1340], [dx, 1340 + 26 * open]]), `rgb(${shade},${Math.round(shade * .78)},${Math.round(shade * .6)})`, { depth: 1.2 });
      if (open < .6) { const k = 1 - open * 1.6; for (const y of [330, 820]) wash(g, poly([[dx + 40 * k, y], [900 - 40, y], [900 - 40, y + 400], [dx + 40 * k, y + 400]]), 'rgba(255,255,255,.08)'); piece(g, ell(dx + 50 * k, 840, 16, 16), '#d6b98d', { depth: .6 }); }
    }
    // 地板與玄關
    paperRect(g, -400, 1340, 1880, 900, '#d8d3cb', { depth: .3 });
    for (let i = 0; i < 6; i++) wash(g, rrect(-400, 1400 + i * (70 + i * 30), 1880, 3, 1), 'rgba(90,80,70,.18)');
    for (let i = -6; i < 14; i++) wash(g, poly([[540 + i * 90, 1340], [543 + i * 90, 1340], [540 + i * 200, 2100], [534 + i * 200, 2100]]), 'rgba(90,80,70,.14)');
    paperRect(g, -400, 1328, 1880, 22, '#b89270', { depth: .8 });
    beam(g, [[520, 1340], [900, 1340], [1260, 2100], [260, 2100]], 'rgba(255,236,200,.85)', open, 30);
    radial(g, 710, 900, 600, [[0, 'rgba(255,240,210,.45)'], [1, 'rgba(0,0,0,0)']], 'screen', open);
    // 鞋櫃
    PIECE_SEED = 200;
    paperRect(g, -40, 1020, 300, 330, '#cdb393', { depth: 1.2 });
    paperRect(g, -40, 1180, 300, 12, '#b89c7c', { depth: .3 });
    piece(g, blob([[30, 1160], [110, 1150], [124, 1176], [24, 1180]], .9), '#7f8fa3', { depth: .5 });
    piece(g, blob([[140, 1162], [220, 1154], [232, 1178], [136, 1180]], .9), '#c9897a', { depth: .5 });
    // 黑醬在門口等
    PIECE_SEED = 400;
    const up = range(st, 1.2, 1.9);
    withT(g, 300, 1560, 0, .86, .86, () => catSitBack(g, { t: st, tailUp: up, tailSway: up > .5 ? 1.6 : 1, look: .32 + .2 * range(st, 1.6, 2.2), headTilt: st > 2.6 ? Math.sin(st * 2) * .05 : 0 }));
  });
  radial(ctx, 540, 1000, 1300, [[.55, 'rgba(0,0,0,0)'], [1, 'rgba(60,45,30,.35)']], 'multiply');
}

/* ---------- S8 藍色領巾 ---------- */
function sBandana(ctx, lt, t) {
  const st = stopT(lt);
  const cam = { x: 540, y: 960, z: 1.02 + ease(range(lt, 0, 5.5)) * .07 };
  fillBG(ctx, '#e4e7e2');
  layer(ctx, cam, .7, 4, g => {
    g.drawImage(cached('dots', -300, -200, 1700, 2400, c => {
      paperRect(c, -300, -200, 1700, 2400, '#e4e7e2', { depth: 0 });
      const r = rng(5); for (let i = 0; i < 140; i++) piece(c, ell(-300 + r() * 1700, -200 + r() * 2400, 14, 14), '#f3f1ea', { depth: .3, tex: .5 });
      paperRect(c, -300, 1500, 1700, 900, '#d9cdbd', { depth: .6 });
    }), -300, -200);
    radial(g, 300, 300, 900, [[0, 'rgba(255,250,235,.7)'], [1, 'rgba(0,0,0,0)']], 'screen');
  });
  layer(ctx, cam, 1, 0, g => {
    const chin = easeOut(range(st, 3.0, 3.6));
    const band = c => {
      PIECE_SEED = 700;
      // 帶子繞上脖子 → 三角巾落下 → 名字一筆一筆寫上去
      const wrap = easeOut(range(st, .5, 1.1)), drop = range(st, 1.1, 1.6), write = range(st, 1.8, 2.7);
      if (wrap > 0) piece(c, ribbon([[-82, -258], [0, -236], [82, -258]], 22, 22, { from: .5 - wrap * .5, to: .5 + wrap * .5 }), '#4f97bb', { depth: .4 });
      if (drop > 0) {
        const dy = (1 - backOut(drop)) * -60, sq = drop < 1 ? 1 : 1 + .04 * Math.max(0, 1 - (st - 1.6) * 6);
        withT(c, 0, dy, 0, 1, sq, () => {
          piece(c, blob([[-84, -252], [0, -238], [84, -252], [40, -190], [4, -138], [-36, -190]], .7), '#5ba3c6', { depth: .6 });
          piece(c, ribbon([[-80, -248], [-32, -186], [4, -140], [38, -186], [80, -248]], 4, 4), '#4a8fb2', { depth: 0, tex: 0, edge: false });
          if (write > 0) { c.save(); c.beginPath(); c.rect(-60, -240, 120 * write, 80); c.clip(); c.font = `400 30px ${FONT}`; c.fillStyle = '#fbf8f2'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.translate(2, -198); c.rotate(-.04); c.fillText('黑醬', 0, 0); c.restore(); }
        });
      }
      if (st > 3.2 && st < 3.9) { const a = Math.sin(range(st, 3.2, 3.9) * Math.PI); withT(c, 46, -222, st, a * 1.2, a * 1.2, () => { c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); for (let i = 0; i < 8; i++) { const an = i / 8 * TAU, rr = i % 2 ? 3 : 12; c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } c.fill(); }); }
    };
    PIECE_SEED = 100;
    withT(g, 540, 1420, 0, 2.2, 2.2, () => catSitFront(g, { t: st, tailUp: 0, chin: chin * 1.2, headTilt: chin * -.04, bandana: band, head: { blink: chin > .3 ? .6 : (st > 1.1 && st < 1.25 ? 1 : 0), look: [chin > .3 ? 0 : 3, chin > .3 ? 0 : -4], earL: st < 2 ? Math.sin(st * 9) * .06 : 0 } }));
  });
  radial(ctx, 540, 960, 1300, [[.55, 'rgba(0,0,0,0)'], [1, 'rgba(40,50,60,.28)']], 'multiply');
}

/* ---------- S9 婚禮那天 ---------- */
const PENNANT = ['#3f4562', '#f4f1ea', '#5a4f74', '#f4f1ea', '#8a4652', '#f4f1ea', '#2e3248'];
function weddingFrame(ctx, lt) {
  const st = stopT(lt);
  const k = ease(range(lt, 0, 5.7));
  const cam = { x: 560, y: 960 + k * 20, z: 1.0 + k * .1 };
  fillBG(ctx, '#f1eee8');
  layer(ctx, cam, .85, 1.2, g => {
    g.drawImage(cached('brick', -320, -260, 1720, 2440, c => {
      paperRect(c, -320, -260, 1720, 2440, '#e3ded5', { depth: 0 });
      const r = rng(17);
      for (let row = 0; row < 40; row++) for (let col = -1; col < 12; col++) {
        const x = -320 + col * 156 + (row % 2) * 78, y = -260 + row * 62;
        piece(c, rrect(x, y, 148, 54, 8), r() < .5 ? '#f1ede6' : '#ece7df', { depth: .35, shadowAlpha: .16, tex: .7 });
      }
    }), -320, -260);
  });
  layer(ctx, cam, .92, 0, g => {
    // 小旗子
    PIECE_SEED = 40;
    const sw = Math.sin(lt * 1.2) * 4;
    const P0 = [-80, 300], P1 = [540, 470 + sw], P2 = [1160, 210];
    const Q = u => [(1 - u) * (1 - u) * P0[0] + 2 * (1 - u) * u * P1[0] + u * u * P2[0], (1 - u) * (1 - u) * P0[1] + 2 * (1 - u) * u * P1[1] + u * u * P2[1]];
    const pts = []; for (let i = 0; i <= 20; i++) pts.push(Q(i / 20));
    piece(g, ribbon(pts, 3, 3, { n: 40 }), '#6b5d52', { depth: .5, tex: 0 });
    for (let i = 0; i < 7; i++) {
      const u = .1 + i * .125, [x, y] = Q(u), [x2, y2] = Q(u + .05), a = Math.atan2(y2 - y, x2 - x);
      withT(g, x, y, a + Math.sin(lt * 1.5 + i) * .04, 1, 1, () => {
        piece(g, poly([[0, 0], [96, 0], [48, 120]]), PENNANT[i], { depth: .8 });
        g.save(); g.fillStyle = PENNANT[i] === '#f4f1ea' ? '#a4906a' : '#d8c08e'; g.font = `400 18px ${FONT}`; g.textAlign = 'center'; g.fillText('♡', 48, 46); g.restore();
      });
    }
  });
  const petals = (g, seed, n, sz, sp) => { const r = rng(seed); for (let i = 0; i < n; i++) { const x = r() * 1200 - 60 + Math.sin(lt * .8 + i) * 50, y = ((r() * 2200 + lt * sp * (0.7 + r() * .6)) % 2200) - 140; piece(g, ell(x, y, sz, sz * .6, lt * (1 + r()) + i), ['#f6dfe0', '#fbf6ef', '#efd6c9'][i % 3], { depth: .6, tex: .4 }); } };
  layer(ctx, cam, .95, 0, g => { PIECE_SEED = 80; petals(g, 3, 14, 11, 120); });
  layer(ctx, cam, 1, 0, g => {
    wash(g, ell(560, 1250, 420, 640), 'rgba(90,70,60,.16)', 1, 60);
    // 蓓蓓
    const beiT = () => { g.translate(330, 836); g.scale(1.3, 1.3); };
    const catLocal = [-30, 172], qiN = [770, 806], qs = 1.3;
    const mouthW = [qiN[0] + (catLocal[0] + 4 * .62 - 14 * .62 * .96) * qs, qiN[1] + (catLocal[1] - 214 * .62 + 52 * .62 * .96) * qs];
    const handB = [(mouthW[0] - 330) / 1.3 - 8, (mouthW[1] - 836) / 1.3 + 14];
    PIECE_SEED = 100;
    g.save(); beiT(); person(g, { who: 'qi', outfit: 'wedding', lower: 'stand', t: st, eyes: 'down', lookX: 4, turn: .35, headTilt: .1, mouth: 'smile', skipArm: 'r', armsFront: true, arms: { l: [[2, 226]], r: [.1, .1] } }); g.restore();
    // 琦琦抱著黑醬
    PIECE_SEED = 300;
    const nib = Math.floor(st * 3) % 2;
    withT(g, qiN[0], qiN[1], -.02, qs, qs, () => person(g, { who: 'bei', outfit: 'wedding', lower: 'stand', t: st, eyes: 'smile', mouth: 'grin', headTilt: -.04, armsFront: true, skipArm: 'l',
      arms: { l: [.1, .1], r: [[-36, 188]] },
      // 托在屁股下面的那隻手：在貓後面，手掌從下面露出來
      extra: c => { PIECE_SEED = 450; armIK(c, -1, [-24, 262], PPL.white, { cuff: '#f2efe9' }); },
      afterHead: c => withT(c, catLocal[0], catLocal[1], .04, .62, .62, () => { PIECE_SEED = 500; catHeld(c, { t: st, reach: .55, head: { mouth: nib ? 'treat' : 'calm', look: [-5, 3], blink: st > 3.6 && st < 3.8 ? 1 : 0 } }); }) }));
    // 蓓蓓的手拿零食
    PIECE_SEED = 800;
    g.save(); beiT();
    const R = armIK(g, 1, handB, PPL.skin, { bare: true, bw: 1.1, w0: 48, w1: 35 });
    withT(g, R.Wr[0] + 6, R.Wr[1] + 22, .9, 1, 1, () => piece(g, rrect(-4, -22, 8, 34, 4), '#a8714e', { depth: .3, tex: .5 }));
    g.restore();
  });
  layer(ctx, cam, 1.3, 7, g => { PIECE_SEED = 900; petals(g, 9, 6, 22, 220); });
  radial(ctx, 260, 200, 1200, [[0, 'rgba(255,248,232,.5)'], [1, 'rgba(0,0,0,0)']], 'screen');
  radial(ctx, 540, 960, 1300, [[.6, 'rgba(0,0,0,0)'], [1, 'rgba(70,55,45,.28)']], 'multiply');
}
let WEDDING_STILL;
const FLASH_AT = 5.7, PRINT_FROM = 5.86;
function emptyCam(lt) { const k = ease(range(lt, 0, 5.5)); return { x: 520 + k * 50, y: 960, z: 1.0 + k * .05 }; }
const PRINT_POSE = { x: 772, y: 944, w: 236, r: -.07 };
function drawPrint(ctx, x, y, w, r, alpha = 1) {
  const h = w * 16 / 9, b = w * .06, bb = w * .2;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(r);
  ctx.shadowColor = 'rgba(40,30,20,.35)'; ctx.shadowBlur = w * .08; ctx.shadowOffsetX = w * .02; ctx.shadowOffsetY = w * .04;
  ctx.fillStyle = '#fbf8f2'; ctx.fillRect(-w / 2 - b, -h / 2 - b, w + b * 2, h + b + bb);
  ctx.shadowColor = 'transparent';
  ctx.drawImage(WEDDING_STILL, -w / 2, -h / 2, w, h);
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha *= .35; ctx.fillStyle = PAPER_PAT; ctx.fillRect(-w / 2 - b, -h / 2 - b, w + b * 2, h + b + bb);
  ctx.restore();
}
function sWedding(ctx, lt, t) {
  if (!WEDDING_STILL) { WEDDING_STILL = document.createElement('canvas'); WEDDING_STILL.width = W; WEDDING_STILL.height = H; const g = WEDDING_STILL.getContext('2d'); weddingFrame(g, FLASH_AT - .02); }
  if (lt < PRINT_FROM) {
    if (lt < FLASH_AT) weddingFrame(ctx, lt); else ctx.drawImage(WEDDING_STILL, 0, 0);
  } else {
    // 照片落在窗台上
    sEmpty(ctx, t - 52.4 + .0, t);
    const u = ease(range(lt, PRINT_FROM, 7.5));
    const cam = emptyCam(t - 52.4);
    const ex = 540 + cam.z * (PRINT_POSE.x - cam.x), ey = 960 + cam.z * (PRINT_POSE.y - cam.y), ew = PRINT_POSE.w * cam.z;
    drawPrint(ctx, lerp(540, ex, u), lerp(960, ey, u), lerp(1080, ew, u), lerp(0, PRINT_POSE.r, u));
  }
  const fl = lt >= FLASH_AT ? Math.exp(-(lt - FLASH_AT) * 9) : 0;
  if (fl > .01) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = fl; ctx.fillStyle = '#fffaf0'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}

/* ---------- S10 窗邊的陽光，空了一塊 ---------- */
function sEmpty(ctx, lt, t) {
  const cam = emptyCam(lt);
  fillBG(ctx, '#efe0c8');
  windowScene(ctx, lt, cam, { season: 1.15, skyTop: '#d6e2e4', skyBot: '#f6e7cc', wall: '#eee0c8', curtain: '#e4c7b2' });
  layer(ctx, cam, 1, 0, g => {
    beam(g, [[230, 320], [870, 320], [1100, 1900], [120, 1900]], 'rgba(255,236,196,.75)', .85, 36);
    PIECE_SEED = 300;
    piece(g, blob([[300, 1188], [420, 1166], [660, 1166], [780, 1188], [700, 1206], [380, 1206]], .9), '#c9a9a0', { depth: 1 });
    wash(g, ell(540, 1184, 120, 12), 'rgba(110,70,60,.25)', 1, 6);
    // 摺好的領巾
    piece(g, blob([[440, 1170], [560, 1162], [600, 1176], [470, 1186]], .8), '#5ba3c6', { depth: .5 });
    piece(g, ribbon([[452, 1172], [586, 1170]], 3, 3), '#4a8fb2', { depth: 0, tex: 0, edge: false });
    if (WEDDING_STILL) drawPrint(g, PRINT_POSE.x, PRINT_POSE.y, PRINT_POSE.w, PRINT_POSE.r);
    motes(g, lt + 3, 31, 40, [200, 300, 760, 1300], 'rgba(255,240,205,.95)', 2.6);
  });
  radial(ctx, 540, 960, 1300, [[.5, 'rgba(0,0,0,0)'], [1, 'rgba(70,50,30,.38)']], 'multiply');
}

/* ---------- S11 夜裡的沙發 ---------- */
const GHOST = { fur: '#ffe7c4', furL: '#fff3de', furM: '#ffe9cb', furD: '#f2c792', furDD: '#e8b57c', white: '#fffaf0', nose: '#f6c3a8', ear: '#ffd6c0', iris: '#ffe7c4', iris2: '#f2c792', pupil: '#f2c792', rim: '#e8b57c', ghost: '#ffe2b0' };
function sSofa(ctx, lt, t) {
  const st = stopT(lt);
  const k = ease(range(lt, 0, 7.5));
  const cam = { x: 560 + k * 40, y: 1010, z: 1.02 + k * .08 };
  fillBG(ctx, '#33354b');
  layer(ctx, cam, .9, 0, g => {
    linear(g, 0, 0, 0, 1600, [[0, '#2b2d44'], [1, '#45405a']], [-400, -400, 1900, 2600]);
    PIECE_SEED = 20;
    paperRect(g, 640, 240, 340, 420, '#3c3f58', { depth: 1 });
    linear(g, 0, 260, 0, 640, [[0, '#1b1f3a'], [1, '#3b3a62']], [660, 260, 300, 380]);
    stars(g, lt, 41, 12, [660, 260, 300, 380], 1.6);
    moon(g, 880, 340, 30, .7);
    paperRect(g, 800, 260, 14, 380, '#3c3f58', { depth: .5 }); paperRect(g, 660, 450, 300, 14, '#3c3f58', { depth: .5 });
    // 立燈
    paperRect(g, 116, 560, 12, 900, '#2a2a36', { depth: 1 });
    piece(g, poly([[50, 420], [200, 420], [236, 580], [14, 580]]), '#ecd3ad', { depth: 1 });
    radial(g, 122, 560, 700, [[0, 'rgba(255,214,150,.55)'], [.4, 'rgba(255,190,120,.18)'], [1, 'rgba(0,0,0,0)']], 'screen');
    // 地板
    paperRect(g, -400, 1420, 1900, 900, '#3b3548', { depth: .4 });
    piece(g, ell(560, 1560, 520, 110), '#4a4258', { depth: .3 });
  });
  layer(ctx, cam, 1, 0, g => {
    PIECE_SEED = 100;
    // 沙發
    piece(g, blob([[110, 1240], [120, 930], [300, 896], [800, 896], [980, 930], [990, 1240]], .9), '#56636d', { depth: 1.4 });
    piece(g, rrect(150, 1170, 800, 150, 40), '#62707a', { depth: 1 });
    // 兩個人
    PIECE_SEED = 200;
    withT(g, 420, 1010, .02, .92, .92, () => person(g, { who: 'bei', outfit: 'home', lower: 'sit', t: st, eyes: 'down', lookX: 3, turn: .3, headTilt: .3, mouth: 'smile', arms: { l: [[-30, 250]], r: [[132, 236]] }, armsFront: true }));
    PIECE_SEED = 300;
    withT(g, 640, 1000, -.03, .92, .92, () => person(g, { who: 'qi', outfit: 'home', lower: 'sit', t: st, eyes: 'down', lookX: -2, headTilt: -.06, mouth: 'smile', armsFront: true, arms: { l: [[-40, 214]], r: [[40, 220]] },
      afterHead: c => withT(c, 0, 200, -.06, 1, 1, () => { PIECE_SEED = 420; piece(c, rrect(-40, -64, 80, 128, 14), '#3a3b42', { depth: .8 }); piece(c, ell(-22, -46, 7, 7), '#24252b', { depth: .1, tex: 0 }); wash(c, rrect(-40, -64, 80, 128, 14), 'rgba(220,232,255,.08)'); }) }));
    PIECE_SEED = 400;
    // 螢幕朝著她們：光打在臉上
    radial(g, 640, 1150, 260, [[0, 'rgba(200,220,255,.5)'], [1, 'rgba(0,0,0,0)']], 'screen');
    radial(g, 600, 900, 240, [[0, 'rgba(200,220,255,.28)'], [1, 'rgba(0,0,0,0)']], 'screen');
    // 扶手與坐墊前緣
    piece(g, rrect(80, 1060, 110, 280, 50), '#5b6872', { depth: 1.2 });
    piece(g, rrect(910, 1060, 110, 280, 50), '#5b6872', { depth: 1.2 });
    piece(g, rrect(150, 1300, 800, 70, 30), '#4e5a63', { depth: .8 });
    for (const [x, c, sh] of [[376, '#5b636e', '#f2efe9'], [462, '#5b636e', '#f2efe9'], [596, '#bfae9a', '#e9e2d8'], [684, '#bfae9a', '#e9e2d8']]) { piece(g, ribbon([[x, 1330], [x + 4, 1440]], 50, 42, { roundStart: true }), c, { depth: .6 }); piece(g, blob([[x - 26, 1428], [x + 30, 1430], [x + 34, 1458], [x - 28, 1460]], .9), sh, { depth: .5 }); }
    // 牠：淡淡地睡在旁邊
    const ga = smooth(range(lt, 1.6, 3.6)) * (1 + .12 * Math.sin(lt * 2));
    if (ga > 0) {
      radial(g, 830, 1150, 300, [[0, 'rgba(255,214,150,.6)'], [1, 'rgba(0,0,0,0)']], 'screen', ga);
      g.save(); g.globalAlpha = ga * .82; withT(g, 830, 1175, -.05, .5, .5, () => { PIECE_SEED = 600; catCurl(g, { t: lt, colors: GHOST, depth: 0 }); }); g.restore();
      motes(g, lt, 51, 24, [700, 760, 300, 420], 'rgba(255,226,170,.95)', 2.4, (x, y) => ga);
    }
  });
  radial(ctx, 540, 1000, 1300, [[.45, 'rgba(0,0,0,0)'], [1, 'rgba(8,8,20,.55)']], 'multiply');
}

/* ---------- S12 屋頂 ---------- */
function sRoof(ctx, lt, t) {
  const st = stopT(lt);
  const k = ease(range(lt, 0, 4.5));
  const cam = { x: 540, y: lerp(1120, 960, k), z: lerp(1.2, 1.0, k) };
  fillBG(ctx, '#141832');
  layer(ctx, cam, .15, 0, g => {
    linear(g, 0, -200, 0, 1700, [[0, '#10142c'], [.6, '#272a4e'], [1, '#4a4166']], [-600, -600, 2400, 2800]);
    stars(g, lt, 3, 120, [-400, -300, 1900, 1500], 2.4);
    moon(g, 770, 470, 104);
  });
  layer(ctx, cam, .35, 2, g => {
    PIECE_SEED = 30; const r = rng(8);
    for (let i = 0; i < 12; i++) { const x = -400 + i * 170, hh = 260 + r() * 300; paperRect(g, x, 1300 - hh, 160, hh + 600, '#232745', { depth: .5, shadowAlpha: .5 }); for (let j = 0; j < 4; j++) if (r() < .5) paperRect(g, x + 30 + r() * 90, 1300 - hh + 40 + r() * (hh - 80), 18, 22, '#f0cb8a', { depth: 0, tex: .3 }); }
  });
  layer(ctx, cam, .6, 1, g => {
    PIECE_SEED = 80; const r = rng(12);
    for (let i = 0; i < 6; i++) { const x = -300 + i * 300; piece(g, poly([[x, 1500], [x + 140, 1330 + r() * 40], [x + 300, 1500], [x + 300, 2200], [x, 2200]]), '#2b2e4c', { depth: .8, shadowAlpha: .5 }); if (r() < .7) paperRect(g, x + 110, 1420, 34, 40, '#f3cf8e', { depth: .1, tex: .3 }); }
  });
  layer(ctx, cam, 1, 0, g => {
    PIECE_SEED = 150;
    const roof = poly([[-400, 1300], [1500, 1220], [1500, 2400], [-400, 2400]]);
    piece(g, roof, '#38395a', { depth: 1.4, shadowAlpha: .5 });
    g.save(); g.clip(roof); for (let row = 0; row < 14; row++) for (let i = -2; i < 20; i++) wash(g, ell(-400 + i * 100 + (row % 2) * 50, 1340 + row * 70, 52, 36), 'rgba(255,255,255,.04)');
    for (let row = 0; row < 14; row++) wash(g, ribbon([[-400, 1330 + row * 70], [1500, 1250 + row * 70]], 2, 2), 'rgba(0,0,0,.18)'); g.restore();
    piece(g, ribbon([[-400, 1296], [1500, 1216]], 30, 30), '#4b4b6c', { depth: .8 });
    PIECE_SEED = 400;
    withT(g, 560, 1262, -.04, .7, .7, () => catSitBack(g, { t: st, look: easeOut(range(st, 1.8, 2.8)), tailUp: 0, tailSway: .6, blink: st > 3.6 && st < 3.8 ? 1 : 0 }));
    radial(g, 560, 1100, 320, [[0, 'rgba(255,230,190,.16)'], [1, 'rgba(0,0,0,0)']], 'screen');
    motes(g, lt + 8, 61, 18, [300, 500, 600, 800], 'rgba(255,226,170,.9)', 2.2, (x, y) => 1 - range(lt, 2, 4.5));
  });
  radial(ctx, 540, 960, 1300, [[.5, 'rgba(0,0,0,0)'], [1, 'rgba(5,5,18,.6)']], 'multiply');
}

/* ---------- S13 慢慢眨一下眼 ---------- */
function sClose(ctx, lt, t) {
  const st = stopT(lt);
  const cam = { x: 540, y: 960, z: 1.0 + ease(range(lt, 0, 4.3)) * .07 };
  fillBG(ctx, '#1a1c34');
  layer(ctx, cam, .3, 12, g => {
    linear(g, 0, 0, 0, 1920, [[0, '#191b36'], [1, '#3d3557']], [-600, -600, 2400, 3200]);
    bokeh(g, lt, 21, 30, [-200, -100, 1500, 2000], ['rgba(255,226,170,.8)', 'rgba(190,200,255,.5)', 'rgba(255,200,170,.6)'], 60);
  });
  layer(ctx, cam, 1, 0, g => {
    radial(g, 540, 820, 900, [[0, 'rgba(255,214,160,.35)'], [1, 'rgba(0,0,0,0)']], 'screen');
    // 眨眼：0.8–1.6 闔上，停一下，2.1–2.8 張開
    const b = lt < 1.6 ? ease(range(lt, .8, 1.6)) : 1 - ease(range(lt, 2.1, 2.8));
    PIECE_SEED = 90;
    withT(g, 540, 930, 0, 3.3, 3.3, () => { piece(g, blob([[-150, 60], [-120, 20], [0, 30], [120, 20], [150, 60], [190, 400], [-190, 400]], .9), CAT.fur, { depth: 1 }); piece(g, blob([[-70, 70], [0, 60], [70, 70], [80, 300], [-80, 300]], .9), CAT.white, { depth: .4 }); for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) piece(g, ribbon([[sd * 160, 100 + i * 50], [sd * 130, 108 + i * 50], [sd * 100, 120 + i * 52]], 12, 4, { taper: .5 }), CAT.furD, { depth: .1, tex: .5, edge: false }); });
    PIECE_SEED = 100;
    withT(g, 540, 930, Math.sin(lt * .7) * .015 + (lt > 2.8 ? .03 * ease(range(lt, 2.8, 3.6)) : 0), 3.3, 3.3, () => catHead(g, { t: lt, detail: true, blink: b, look: [0, 1], earR: st > 3.2 && st < 3.45 ? .18 : 0, pupil: 9 }));
    radial(g, 540, 600, 700, [[0, 'rgba(255,236,200,.18)'], [1, 'rgba(0,0,0,0)']], 'screen');
  });
  radial(ctx, 540, 960, 1250, [[.42, 'rgba(0,0,0,0)'], [1, 'rgba(5,5,18,.7)']], 'multiply');
}

/* ---------- S14 片名 ---------- */
function sTitle(ctx, lt, t) {
  fillBG(ctx, '#f1e8da');
  radial(ctx, 540, 900, 1100, [[0, 'rgba(255,252,244,.6)'], [1, 'rgba(0,0,0,0)']], 'screen');
  const a1 = smooth(range(lt, .6, 1.6)), a2 = smooth(range(lt, 1.1, 2.2)), a3 = smooth(range(lt, 1.7, 2.8));
  ctx.save(); ctx.globalAlpha = a1;
  PIECE_SEED = 100;
  withT(ctx, 540, 740 + (1 - a1) * 12, 0, .95, .95, () => catHead(ctx, { t: lt, eyes: 'closed', blink: 1 }));
  ctx.restore();
  ctx.save(); ctx.globalAlpha = a2; ctx.font = `400 92px ${FONT}`; ctx.letterSpacing = '16px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#3d322a';
  ctx.fillText('黑醬・在身邊', 548, 1030 + (1 - a2) * 14); ctx.restore();
  ctx.save(); ctx.globalAlpha = a3; ctx.font = `400 40px ${FONT}`; ctx.letterSpacing = '10px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#7a6b5d';
  ctx.fillText('給琦琦與蓓蓓', 545, 1150); ctx.restore();
  // 一排腳印慢慢走過
  for (let i = 0; i < 5; i++) {
    const a = smooth(range(lt, 2.2 + i * .35, 2.6 + i * .35)); if (a <= 0) continue;
    const x = 330 + i * 105, y = 1420 + (i % 2) * 34;
    ctx.save(); ctx.globalAlpha = a * .75; ctx.translate(x, y); ctx.rotate(.25); ctx.fillStyle = '#b8a68f';
    ctx.beginPath(); ctx.ellipse(0, 6, 14, 12, 0, 0, TAU); ctx.fill();
    for (const [dx, dy] of [[-13, -9], [-5, -16], [5, -16], [13, -9]]) { ctx.beginPath(); ctx.ellipse(dx, dy, 5, 6, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
}
