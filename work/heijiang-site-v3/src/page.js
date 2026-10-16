/* 黑醬・在身邊 — 頁面上的小互動：許願蠟燭 */
(() => {
  'use strict';
  const candle = document.getElementById('candle');
  const text = document.getElementById('wish-text');
  if (!candle || !text) return;
  const lines = ['願望，黑醬幫你記住了。', '牠在旁邊，輕輕眨了一下眼。'];
  let out = false, step = 0;
  const say = (s) => { text.classList.add('swap'); setTimeout(() => { text.textContent = s; text.classList.remove('swap'); }, 450); };
  candle.addEventListener('click', () => {
    if (!out) {
      out = true; candle.classList.add('out'); candle.setAttribute('aria-label', '蠟燭熄了。再點一下，重新點亮。');
      say(lines[0]);
      setTimeout(() => { if (out) say(lines[1]); }, 3200);
    } else {
      out = false; step++; candle.classList.remove('out'); candle.setAttribute('aria-label', '輕點吹熄蠟燭，許個願');
      say(step % 2 ? '再許一個也可以。' : '輕點蠟燭，在心裡說一個願望。');
    }
  });
})();

/* 3D 黑醬載入前的灰底示意圖，在紙房間裡會變成一塊灰；藏起來，只留「黑醬正在靠近…」 */
(() => {
  const mv = document.getElementById('cat');
  if (!mv || !window.customElements) return;
  customElements.whenDefined('model-viewer').then(() => {
    const root = mv.shadowRoot; if (!root || root.getElementById('hj-poster-style')) return;
    const st = document.createElement('style'); st.id = 'hj-poster-style';
    st.textContent = '#default-poster{background-image:none!important;background-color:transparent!important}';
    root.appendChild(st);
  });
})();
