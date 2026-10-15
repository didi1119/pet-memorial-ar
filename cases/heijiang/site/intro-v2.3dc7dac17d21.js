/* 黑醬・在身邊 — 開場短片（二版：紙雕定格動畫影片）
   每次打開先停在入口；點了才播放（手機瀏覽器要使用者點一下才能出聲）。 */
(() => {
  'use strict';
  const FILM = document.documentElement.dataset.film || 'film/heijiang-film.mp4';
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  function build() {
    const o = document.createElement('div');
    o.id = 'intro';
    o.innerHTML = `
      <div class="intro-gate" role="dialog" aria-labelledby="intro-gate-title">
        <svg class="gate-mark" viewBox="0 0 34 34" aria-hidden="true" fill="none"><path d="M8 17V7l7 5h4l7-5v10c0 11-18 11-18 0Z"/><path d="m13 21 4 2 4-2M5 19l7 1m-7 4 7-2m17-3-7 1m7 4-7-2"/></svg>
        <button type="button" class="gate-button" id="intro-start"><span id="intro-gate-title">輕點，看看黑醬</span><small>一分多鐘的小故事，有聲音。</small></button>
        <button type="button" class="gate-skip" id="intro-skip-gate">直接去找牠</button>
      </div>
      <div class="intro-film" hidden>
        <video id="intro-video" playsinline preload="auto" src="${FILM}"></video>
        <button type="button" class="intro-skip" id="intro-skip">略過 →</button>
        <button type="button" class="intro-sound" id="intro-sound" hidden>點一下開聲音</button>
      </div>`;
    return o;
  }

  function mount() {
    if (document.getElementById('intro')) return;
    const o = build();
    document.body.prepend(o);
    document.documentElement.classList.add('intro-open');
    const video = o.querySelector('#intro-video');
    const film = o.querySelector('.intro-film');
    const gate = o.querySelector('.intro-gate');
    const sound = o.querySelector('#intro-sound');
    let closed = false;
    const close = (fast) => {
      if (closed) return; closed = true;
      o.classList.add('leaving');
      try { video.pause(); } catch {}
      setTimeout(() => { o.remove(); document.documentElement.classList.remove('intro-open'); }, fast ? 500 : 1400);
    };
    o.querySelector('#intro-start').addEventListener('click', () => {
      if (video.dataset.broken) { close(true); return; }
      gate.hidden = true; film.hidden = false;
      video.muted = false; video.currentTime = 0;
      const p = video.play();
      // 少數瀏覽器仍擋有聲播放：先靜音播放，給一個開聲音的按鈕
      if (p && p.catch) p.catch(() => { video.muted = true; video.play().catch(() => {}); sound.hidden = false; });
    });
    sound.addEventListener('click', () => { video.muted = false; sound.hidden = true; });
    o.querySelector('#intro-skip-gate').addEventListener('click', () => close(true));
    o.querySelector('#intro-skip').addEventListener('click', () => close(true));
    video.addEventListener('ended', () => close(false));
    // 影片載入失敗：入口還是留著，點了直接進頁面
    video.addEventListener('error', () => { if (film.hidden) video.dataset.broken = '1'; else close(true); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && !film.hidden) video.pause(); else if (!document.hidden && !film.hidden && !closed) video.play().catch(() => {}); });
  }

  if (!reduced) mount();
  document.getElementById('intro-replay')?.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'auto' }); mount(); });
})();
