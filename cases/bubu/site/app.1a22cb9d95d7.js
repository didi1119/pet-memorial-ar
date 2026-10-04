(() => {
  'use strict';
  const viewer = document.getElementById('dog');
  const arButton = document.getElementById('ar-button');
  const arLabel = document.getElementById('ar-label');
  const hint = document.getElementById('device-hint');
  const status = document.getElementById('load-status');
  const reset = document.getElementById('reset');
  const choices = document.getElementById('pose-choices');
  const arChoices = document.getElementById('ar-switcher');
  const errorPanel = document.getElementById('error-panel');
  const motionButton = document.getElementById('motion-toggle');
  const motionStatus = document.getElementById('motion-status');
  const poseNames = { 'pose-01': '趴著陪你', 'pose-02': '翻翻肚肚', 'pose-03': '乖乖坐好' };
  const poseName = pose => poseNames[pose.id] || pose.label;
  const apple = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const mobile = apple || /Android/i.test(navigator.userAgent);
  let poses = [], selected, generation = 0, expectedURL;
  let modelInFlight = false, sourcePose, scenePose;
  let loaded = false, usdzReady = !apple, usdzFailed = false;
  let arTimer, fetchController, blobURL, presenting = false;
  const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let motionEnabled = !reducedMotionQuery?.matches;
  const protectedURLs = new Set();
  const blobCache = new Map();
  function syncAR() {
    const available = loaded && usdzReady && window.isSecureContext && viewer.canActivateAR;
    arButton.disabled = !available;
    arLabel.textContent = available || (loaded && !mobile) ? '讓布布陪我一下' : !loaded || (apple && !usdzReady && !usdzFailed) ? '等布布準備好…' : '換個瀏覽器，再靠近一點';
    if (!mobile) hint.textContent = '用手機打開這個網址，為布布留一個小小的位置。';
    else if (!window.isSecureContext) hint.textContent = '請用正式網址開啟，才能讓布布出現在相機畫面裡。';
    else if (usdzFailed) hint.textContent = '相機用的檔案還沒有準備好。可以重新開啟，或使用下方的下載檔。';
    else if (apple && !usdzReady) hint.textContent = '第一次需要多等一下，正在準備布布的身影。';
    else if (available) hint.textContent = '慢慢掃描地面，找一個想讓牠待著的位置。';
    else if (loaded) hint.textContent = apple ? '請用 Safari 開啟這個網址，再讓布布來到身邊。' : '請用支援 AR 的 Chrome 開啟；也可以先在這裡看看布布。';
  }
  function resetCamera(pose = scenePose || selected) {
    const orbit = pose?.camera_orbit || '-45deg 78deg 105%';
    viewer.cameraOrbit = orbit;
    viewer.setAttribute('camera-orbit', orbit);
    viewer.cameraTarget = 'auto auto auto';
    viewer.fieldOfView = '30deg';
  }
  function applyMotion() {
    viewer.animationName = 'Idle';
    viewer.setAttribute('animation-name', 'Idle');
    motionButton.disabled = !loaded;
    motionButton.textContent = motionEnabled ? '暫停預覽' : '播放預覽';
    motionButton.setAttribute('aria-pressed', String(motionEnabled));
    motionStatus.textContent = !loaded ? '等牠一下下…' : presenting || motionEnabled ? '輕輕呼吸，陪你一會兒' : '把這一刻，停留一下';
    if (!loaded) return;
    // Preview pause is for comparison. AR always uses the embedded idle loop.
    if (motionEnabled || presenting) viewer.play();
    else viewer.pause();
  }
  function markReady() {
    loaded = true;
    if (!presenting) resetCamera(scenePose);
    errorPanel.hidden = true;
    status.textContent = '布布在這裡。';
    status.setAttribute('data-ready', 'true');
    reset.disabled = false;
    applyMotion();
    syncAR();
    clearInterval(arTimer);
    let checks = 0;
    arTimer = setInterval(() => { syncAR(); if (++checks >= 12) clearInterval(arTimer); }, 500);
  }
  function loadDesiredPose() {
    if (modelInFlight) return;
    if (scenePose?.id === selected.id) { markReady(); return; }
    // Serialize GLB decoding. Rapid selections replace the desired pose only,
    // avoiding canceled decoder results and several 4K models in memory.
    modelInFlight = true;
    sourcePose = selected;
    expectedURL = new URL(sourcePose.glb, document.baseURI).href;
    viewer.setAttribute('src', sourcePose.glb);
    if (!presenting) resetCamera(sourcePose);
  }
  async function prepareUSDZ(pose, currentGeneration) {
    // Reuse a previously launched Quick Look file, bounded by three poses.
    const cachedURL = blobCache.get(pose.id);
    if (cachedURL) {
      blobURL = cachedURL;
      viewer.setAttribute('ios-src', blobURL);
      usdzReady = true;
      syncAR();
      return;
    }
    const controller = new AbortController();
    fetchController = controller;
    try {
      const response = await fetch(pose.usdz, { credentials: 'same-origin', signal: controller.signal });
      if (!response.ok) throw new Error('USDZ unavailable');
      const bytes = await response.arrayBuffer();
      const magic = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 4));
      if (magic.length < 4 || magic[0] !== 0x50 || magic[1] !== 0x4b || magic[2] !== 3 || magic[3] !== 4) throw new Error('Invalid USDZ');
      if (currentGeneration !== generation) return;
      blobURL = URL.createObjectURL(new Blob([bytes], { type: 'model/vnd.usdz+zip' }));
      blobCache.set(pose.id, blobURL);
      viewer.setAttribute('ios-src', blobURL);
      usdzReady = true;
    } catch (error) {
      if (currentGeneration !== generation || error.name === 'AbortError') return;
      usdzFailed = true;
    }
    if (currentGeneration === generation) syncAR();
  }
  function selectPose(pose) {
    if (selected?.id === pose.id) return;
    selected = pose;
    generation++;
    loaded = false;
    usdzReady = !apple;
    usdzFailed = false;
    clearInterval(arTimer);
    fetchController?.abort();
    // Quick Look may still use a Blob after Safari becomes visible again.
    if (blobURL && !protectedURLs.has(blobURL)) {
      URL.revokeObjectURL(blobURL);
      for (const [id, url] of blobCache) if (url === blobURL) blobCache.delete(id);
    }
    blobURL = undefined;
    arButton.disabled = true;
    reset.disabled = true;
    motionButton.disabled = true;
    motionStatus.textContent = '等牠一下下…';
    status.setAttribute('data-ready', 'false');
    errorPanel.hidden = true;
    viewer.setAttribute('poster', pose.poster);
    viewer.setAttribute('alt', `布布，${poseName(pose)}。可以輕輕拖曳，從不同角度看看牠。`);
    viewer.setAttribute('data-pose', pose.id);
    if (apple) viewer.removeAttribute('ios-src');
    else viewer.setAttribute('ios-src', pose.usdz);
    status.textContent = '布布正在靠近…';
    document.getElementById('selected-pose').textContent = poseName(pose);
    document.getElementById('pose-height').textContent = `${Math.round(pose.height_m * 100)} cm`;
    document.getElementById('download-glb').href = pose.glb;
    document.getElementById('download-usdz').href = pose.usdz;
    for (const button of document.querySelectorAll('[data-pose-choice]')) button.setAttribute('aria-pressed', String(button.dataset.poseChoice === pose.id));
    syncAR();
    if (apple) prepareUSDZ(pose, generation);
    loadDesiredPose();
  }
  function buildChoices() {
    for (const pose of poses) {
      const button = document.createElement('button');
      button.className = 'pose-card';
      button.dataset.poseChoice = pose.id;
      button.setAttribute('aria-pressed', 'false');
      const image = document.createElement('img');
      image.src = pose.poster;
      image.alt = '';
      image.width = 240;
      image.height = 180;
      const label = document.createElement('span');
      label.textContent = poseName(pose);
      button.append(image, label);
      button.addEventListener('click', () => selectPose(pose));
      choices.append(button);
      const arChoice = document.createElement('button');
      arChoice.textContent = poseName(pose);
      arChoice.dataset.poseChoice = pose.id;
      arChoice.setAttribute('aria-pressed', 'false');
      arChoice.addEventListener('click', () => selectPose(pose));
      arChoices.append(arChoice);
    }
  }
  viewer.addEventListener('progress', event => {
    if (!loaded && selected) status.textContent = '布布正在靠近…';
  });
  viewer.addEventListener('load', event => {
    if (!modelInFlight || !selected || new URL(event.detail.url, document.baseURI).href !== expectedURL) return;
    modelInFlight = false;
    scenePose = sourcePose;
    loadDesiredPose();
  });
  viewer.addEventListener('error', () => {
    modelInFlight = false;
    scenePose = undefined;
    if (sourcePose && sourcePose.id !== selected?.id) { loadDesiredPose(); return; }
    loaded = false;
    status.textContent = '身影暫時沒有顯示出來';
    motionButton.disabled = true;
    motionStatus.textContent = '我們再試一次';
    errorPanel.hidden = false;
    arButton.disabled = true;
    arLabel.textContent = '再試一次';
    hint.textContent = '可以先換個樣子，或重新開啟這個頁面。';
  });
  viewer.addEventListener('ar-status', event => {
    const arStatus = event.detail.status;
    presenting = arStatus === 'session-started' || arStatus === 'object-placed';
    arChoices.hidden = !presenting;
    applyMotion();
    if (arStatus === 'failed') hint.textContent = '這次相機畫面沒有開啟。請確認相機權限，或查看下方的小提示。';
    else if (arStatus === 'not-presenting') syncAR();
  });
  // Overlay taps must not also move the object on the floor.
  arChoices.addEventListener('beforexrselect', event => event.preventDefault());
  arButton.addEventListener('click', () => {
    if (arButton.disabled) return;
    if (blobURL) protectedURLs.add(blobURL);
    // Invoke during the user gesture; network work is already complete.
    viewer.activateAR().catch(() => { hint.textContent = '這次沒有開啟相機畫面。請確認相機權限，或查看下方的小提示。'; });
  });
  reset.addEventListener('click', () => resetCamera(scenePose || selected));
  motionButton.addEventListener('click', () => {
    motionEnabled = !motionEnabled;
    applyMotion();
  });
  reducedMotionQuery?.addEventListener?.('change', event => {
    if (event.matches) {
      motionEnabled = false;
      applyMotion();
    }
  });
  document.getElementById('reload').addEventListener('click', () => location.reload());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncAR(); });
  window.addEventListener('pageshow', event => {
    if (event.persisted) { applyMotion(); syncAR(); }
  });
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    fetchController?.abort();
    for (const url of blobCache.values()) URL.revokeObjectURL(url);
  });
  (async () => {
    try {
      const response = await fetch('poses.json', { credentials: 'same-origin', cache: 'no-cache' });
      if (!response.ok) throw new Error('Manifest unavailable');
      const manifest = await response.json();
      poses = manifest.poses;
      if (!Array.isArray(poses) || poses.length !== 3) throw new Error('Invalid poses');
      await customElements.whenDefined('model-viewer');
      viewer.constructor.modelCacheSize = 1;
      buildChoices();
      selectPose(poses.find(pose => pose.id === manifest.default_pose) || poses[0]);
    } catch {
      status.textContent = '身影暫時沒有顯示出來';
      errorPanel.hidden = false;
      hint.textContent = '重新開啟這個頁面，我們再試一次。';
    }
  })();
})();
