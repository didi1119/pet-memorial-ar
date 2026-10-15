/* 黑醬・在身邊 二版 — 時間軸與合成 */
'use strict';
window.FILM_LENGTH = 76;
let FILM_CTX;
const placeholder = (name) => (ctx, lt) => { fillBG(ctx, '#e9e0d2'); ctx.fillStyle = '#7a6a5a'; ctx.font = `60px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(name, 540, 900); };
const fnOr = (name) => (typeof window[name] === 'function' ? window[name] : placeholder(name));

const SCENES = () => [
  { id: 'night', a: 0, b: 8.4, fn: sNight },
  { id: 'phone', a: 7.9, b: 14.4, fn: sPhone },
  { id: 'handoff', a: 13.9, b: 20.4, fn: sHandoff },
  { id: 'grow', a: 19.9, b: 26.4, fn: sGrow },
  { id: 'bed', a: 25.9, b: 31.4, fn: fnOr('sBed') },
  { id: 'box', a: 30.9, b: 35.4, fn: fnOr('sBox') },
  { id: 'door', a: 34.9, b: 40.4, fn: fnOr('sDoor') },
  { id: 'bandana', a: 39.9, b: 45.4, fn: fnOr('sBandana') },
  { id: 'wedding', a: 44.9, b: 52.4, fn: fnOr('sWedding') },
  { id: 'window', a: 52.4, b: 57.4, fn: fnOr('sEmpty') },
  { id: 'sofa', a: 56.9, b: 64.4, fn: fnOr('sSofa') },
  { id: 'roof', a: 63.9, b: 68.4, fn: fnOr('sRoof') },
  { id: 'close', a: 67.9, b: 72.2, fn: fnOr('sClose') },
  { id: 'title', a: 71.4, b: 76.01, fn: fnOr('sTitle') }
];
const CAPTIONS = [
  { a: 1.6, b: 7.4, text: '那天晚上，紙箱裡，\n有一點點聲音。', dark: true },
  { a: 14.6, b: 19.8, text: '77 說：我。' },
  { a: 20.7, b: 25.8, text: '小小的，一天一天，\n長成了黑醬。' },
  { a: 26.5, b: 31.0, text: '早上六點。\n肚子上，有四隻腳。' },
  { a: 31.7, b: 35.1, text: '紙箱一到，就是牠的。' },
  { a: 35.8, b: 40.1, text: '鑰匙一響，\n牠已經在門口。', y: 1650 },
  { a: 40.7, b: 45.1, text: '藍色領巾，\n寫著牠的名字。' },
  { a: 45.8, b: 50.3, text: '那一天，牠也在。' },
  { a: 52.9, b: 57.1, text: '後來，窗邊的陽光，\n空了一塊。' },
  { a: 58.3, b: 61.3, text: '牠還是很愛你們。', dark: true },
  { a: 61.7, b: 64.1, text: '一直都是。', dark: true },
  { a: 68.5, b: 71.5, text: '牠回頭，\n慢慢眨了一下眼。', dark: true }
];
window.ALL_CAPTION_TEXT = CAPTIONS.map(c => c.text).join('');

let SC;
const SCENE_CANVAS = [];
function sceneCanvas(i) { if (!SCENE_CANVAS[i]) { const c = document.createElement('canvas'); c.width = W; c.height = H; SCENE_CANVAS[i] = c; } return SCENE_CANVAS[i]; }

function drawScene(ctx, s, t) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); LAYER_IDX = 0; PIECE_SEED = 1; s.fn(ctx, t - s.a, t); ctx.restore(); }

function renderFilm(ctx, t) {
  SC = SC || SCENES();
  const act = SC.filter(s => t >= s.a && t < s.b);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  if (act.length === 1) drawScene(ctx, act[0], t);
  else if (act.length >= 2) {
    const [A, B] = act;
    if (typeof window.customTransition === 'function' && window.customTransition(ctx, A, B, t)) { /* 自訂轉場 */ }
    else {
      drawScene(ctx, A, t);
      const c = sceneCanvas(0), g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
      drawScene(g, B, t);
      ctx.save(); ctx.globalAlpha = smooth(range(t, B.a, A.b)); ctx.drawImage(c, 0, 0); ctx.restore();
    }
  }
  // 字幕
  if (!window.NO_CAPTIONS) for (const c of CAPTIONS) {
    if (t < c.a - .1 || t > c.b + .1) continue;
    const a = Math.min(smooth(range(t, c.a, c.a + .7)), 1 - smooth(range(t, c.b - .5, c.b)));
    caption(ctx, c.text, a, easeOut(range(t, c.a, c.a + .9)), { dark: c.dark, y: c.y });
  }
  if (typeof window.drawTitle === 'function') window.drawTitle(ctx, t);
  if (window.NO_CAPTIONS) return;
  // 底片顆粒
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .07;
  const gi = Math.floor(t * 12) % 3; ctx.fillStyle = GRAIN[gi]; ctx.translate((gi * 173) % 512, (gi * 97) % 512); ctx.fillRect(-512, -512, W + 1024, H + 1024); ctx.restore();
  // 開頭與結尾的淡入淡出
  const fade = Math.max(1 - range(t, 0, 1.2), range(t, FILM_LENGTH - .8, FILM_LENGTH));
  if (fade > 0) { ctx.save(); ctx.globalAlpha = fade; ctx.fillStyle = t < 10 ? '#0d0c14' : '#f1e8da'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}

window.filmReady = async () => {
  const c = document.getElementById('c'); FILM_CTX = c.getContext('2d');
  makeTextures(FILM_CTX);
  await document.fonts.load(`54px "LXGW WenKai TC"`, ALL_TEXT + window.ALL_CAPTION_TEXT);
  await document.fonts.load(`34px "Noto Sans CJK TC"`, ALL_TEXT);
  await document.fonts.ready;
};
window.frameAt = (t, type = 'image/png') => { renderFilm(FILM_CTX, t); return document.getElementById('c').toDataURL(type, .95); };
