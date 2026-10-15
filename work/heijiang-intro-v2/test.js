'use strict';
window.drawTest = (name) => {
  const ctx = FILM_CTX; ctx.setTransform(1,0,0,1,0,0);
  if (name !== 'portrait' && name !== 'hero') { ctx.fillStyle = '#efe6d8'; ctx.fillRect(0,0,W,H);
  ctx.save(); ctx.globalCompositeOperation='multiply'; ctx.fillStyle=PAPER_PAT; ctx.fillRect(0,0,W,H); ctx.restore(); } else ctx.clearRect(0,0,W,H);
  PIECE_SEED = 1;
  const T = { 
    cats: () => {
      withT(ctx, 290, 420, 0, 1.15, 1.15, () => catHead(ctx, { t: 1 }));
      withT(ctx, 800, 420, 0, 1.15, 1.15, () => catHead(ctx, { t: 1, kitten: true, turn: .4, look: [3, -2] }));
      withT(ctx, 280, 1180, 0, 1, 1, () => catSitFront(ctx, { t: 1, tailUp: 0 }));
      withT(ctx, 780, 1180, 0, 1, 1, () => catSitBack(ctx, { t: 1, look: .8, tailUp: 0 }));
      withT(ctx, 330, 1820, 0, .9, .9, () => catStandSide(ctx, { t: 1, knead: 1 }));
      withT(ctx, 820, 1680, 0, .9, .9, () => catCurl(ctx, { t: 1 }));
    },
    cats2: () => {
      withT(ctx, 300, 700, 0, 1.1, 1.1, () => catHeld(ctx, { t: 1, reach: .6, head: { mouth: 'treat' } }));
      withT(ctx, 800, 900, 0, 1, 1, () => catSitFront(ctx, { t: 1, tailUp: 1 }));
      withT(ctx, 540, 1500, 0, 2.2, 2.2, () => catHead(ctx, { t: 1, detail: true, blink: .5 }));
    }
  };
  T.people = () => {
    withT(ctx, 290, 520, 0, 1, 1, () => person(ctx, { who: 'bei', outfit: 'day', lower: 'stand', eyes: 'smile', arms: { l: [.15, .2], r: [-.1, .9] }, armsFront: true }));
    withT(ctx, 790, 520, 0, 1, 1, () => person(ctx, { who: 'qi', outfit: 'day', lower: 'stand', eyes: 'open', mouth: 'grin', arms: { l: [.1, .1], r: [.1, .1] } }));
    withT(ctx, 290, 1380, 0, .95, .95, () => person(ctx, { who: 'bei', outfit: 'wedding', lower: 'stand', eyes: 'down', turn: .3, headTilt: .08, arms: { l: [.25, .6], r: [.9, .7] }, armsFront: true }));
    withT(ctx, 790, 1380, 0, .95, .95, () => person(ctx, { who: 'qi', outfit: 'wedding', lower: 'stand', eyes: 'smile', mouth: 'grin', arms: { l: [.6, 1.3], r: [.7, 1.2] }, armsFront: true }));
  };
  T.portrait = () => {
    // 正方形圖示：1080×1080（之後裁切）。紙底色＋淡淡的光。
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#f3ede3'; ctx.fillRect(0, 0, 1080, 1080);
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .85; ctx.fillStyle = PAPER_PAT; ctx.fillRect(0, 0, 1080, 1080); ctx.restore();
    radial(ctx, 540, 420, 620, [[0, 'rgba(255,252,244,.9)'], [1, 'rgba(255,252,244,0)']], 'screen', .8);
    PIECE_SEED = 100;
    withT(ctx, 370, 520, -.06, 1.75, 1.75, () => person(ctx, { who: 'qi', outfit: 'day', eyes: 'smile', mouth: 'smile', earrings: true, headTilt: -.04, armsFront: true, arms: { l: [[-70, 262]], r: [[110, 262]] } }));
    PIECE_SEED = 200;
    withT(ctx, 720, 540, .06, 1.75, 1.75, () => person(ctx, { who: 'bei', outfit: 'day', eyes: 'smile', mouth: 'grin', headTilt: .05, armsFront: true, arms: { l: [[-104, 256]], r: [[70, 262]] } }));
    PIECE_SEED = 300;
    withT(ctx, 540, 1060, 0, 1.55, 1.55, () => catSitFront(ctx, { t: 1, tailUp: 1, tailSway: 0, head: { look: [0, -2] } }));
  };
  T.hero = () => {
    // 橫幅人像：透明背景，1080×1150 區域
    ctx.clearRect(0, 0, W, H);
    PIECE_SEED = 100;
    withT(ctx, 350, 600, -.05, 1.9, 1.9, () => person(ctx, { who: 'qi', outfit: 'day', eyes: 'smile', mouth: 'smile', earrings: true, headTilt: -.04, armsFront: true, arms: { l: [[-70, 262]], r: [[112, 262]] } }));
    PIECE_SEED = 200;
    withT(ctx, 740, 620, .05, 1.9, 1.9, () => person(ctx, { who: 'bei', outfit: 'day', eyes: 'smile', mouth: 'grin', headTilt: .05, armsFront: true, arms: { l: [[-106, 256]], r: [[70, 262]] } }));
    PIECE_SEED = 300;
    withT(ctx, 545, 1170, 0, 1.3, 1.3, () => catSitFront(ctx, { t: 1, tailUp: 1, tailSway: 0, head: { look: [0, -2] } }));
  };
  T[name]();
  return document.getElementById('c').toDataURL('image/png');
};
