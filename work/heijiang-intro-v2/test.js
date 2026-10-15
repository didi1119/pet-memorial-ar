'use strict';
window.drawTest = (name) => {
  const ctx = FILM_CTX; ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle = '#efe6d8'; ctx.fillRect(0,0,W,H);
  ctx.save(); ctx.globalCompositeOperation='multiply'; ctx.fillStyle=PAPER_PAT; ctx.fillRect(0,0,W,H); ctx.restore();
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
  T[name]();
  return document.getElementById('c').toDataURL('image/png');
};
