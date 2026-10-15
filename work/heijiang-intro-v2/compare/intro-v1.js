/* 黑醬・在身邊 — 開場短片（手繪風格 SVG 動畫 + 程式鋼琴配樂）
   自含式：不載入任何外部圖片或音檔。 */
(() => {
  'use strict';
  // 77（琦琦）是收編黑醬的人：長頭髮。
  const QIQI = 'long';
  const FILM_SECONDS = 57.2;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  /* ---------- 畫 ---------- */
  const FUR = '#b9a080', FUR2 = '#a88f70', DARK = '#4a3b30', INK = '#483d35', PINK = '#e5b5a4', GREEN = '#8fb3a3', GREEN2 = '#3a5e55', PAPER = '#f4f0e9', SKIN = '#f3e2d0', HAIR = '#2e2622';
  const stroke = `stroke="${INK}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`;
  const stripe = `fill="none" stroke="${DARK}" stroke-width="4.5" stroke-linecap="round" opacity=".82"`;

  // 側面的黑醬：原點在腳底中央，面向右。
  function catSide({ eyes = 'open', mouth = 'calm', cls = '' } = {}) {
    const eyeOpen = `<g class="eyes"><ellipse cx="50" cy="-98" rx="5.2" ry="6.6" fill="${GREEN}"/><ellipse cx="50" cy="-98" rx="1.7" ry="5.4" fill="${GREEN2}"/><ellipse cx="51.6" cy="-100.5" rx="1.2" ry="1.4" fill="#fff" opacity=".8"/>
      <ellipse cx="73" cy="-98" rx="5.2" ry="6.6" fill="${GREEN}"/><ellipse cx="73" cy="-98" rx="1.7" ry="5.4" fill="${GREEN2}"/><ellipse cx="74.6" cy="-100.5" rx="1.2" ry="1.4" fill="#fff" opacity=".8"/></g>`;
    const eyeShut = `<g class="eyes"><path d="M44 -97 q6 5 12 0" fill="none" stroke="${DARK}" stroke-width="2"/><path d="M67 -97 q6 5 12 0" fill="none" stroke="${DARK}" stroke-width="2"/></g>`;
    const mouthCalm = `<path d="M79 -84 q-6 7 -11 2 M79 -84 q6 7 11 2" fill="none" stroke="${DARK}" stroke-width="1.4"/>`;
    const mouthYawn = `<ellipse cx="82" cy="-78" rx="8" ry="10" fill="#b4756c" stroke="${DARK}" stroke-width="1.4"/><ellipse cx="82" cy="-73" rx="4" ry="3" fill="#e2a0a0"/>`;
    return `<g class="cat ${cls}">
      <path d="M-82 -60 C-125 -66 -138 -18 -112 -2" fill="none" stroke="${FUR}" stroke-width="13" stroke-linecap="round"/>
      <path d="M-82 -60 C-125 -66 -138 -18 -112 -2" fill="none" stroke="${DARK}" stroke-width="13" stroke-linecap="butt" stroke-dasharray="7 15" opacity=".75"/>
      <path d="M-82 -60 C-125 -66 -138 -18 -112 -2" fill="none" ${stroke} stroke-width="1.2" opacity=".5"/>
      <g class="leg-back"><rect x="-72" y="-44" width="19" height="46" rx="9" fill="${FUR2}" ${stroke}/><rect x="-50" y="-44" width="19" height="46" rx="9" fill="${FUR}" ${stroke}/></g>
      <ellipse cx="-14" cy="-64" rx="80" ry="43" fill="${FUR}" ${stroke}/>
      <path d="M-62 -96 q9 16 2 34 M-42 -103 q10 18 1 38 M-20 -106 q9 20 -1 40 M3 -105 q8 19 -1 36 M25 -100 q7 16 0 30" ${stripe}/>
      <path d="M-70 -55 q16 -8 30 2" fill="none" stroke="${DARK}" stroke-width="3" opacity=".35"/>
      <g class="paw paw-b"><rect x="44" y="-46" width="19" height="48" rx="9" fill="${FUR2}" ${stroke}/></g>
      <g class="paw paw-a"><rect x="22" y="-46" width="19" height="48" rx="9" fill="${FUR}" ${stroke}/></g>
      <g class="head">
        <path d="M38 -118 L28 -150 L60 -124 Z" fill="${FUR}" ${stroke}/><path d="M40 -122 L34 -141 L52 -126 Z" fill="${PINK}"/>
        <path d="M74 -124 L98 -152 L92 -116 Z" fill="${FUR}" ${stroke}/><path d="M78 -124 L92 -140 L88 -121 Z" fill="${PINK}"/>
        <circle cx="62" cy="-95" r="31" fill="${FUR}" ${stroke}/>
        <path d="M50 -122 v10 M61 -125 v12 M72 -122 v10" fill="none" stroke="${DARK}" stroke-width="3.2" stroke-linecap="round" opacity=".8"/>
        <path d="M34 -92 q-4 10 2 20" fill="none" stroke="${DARK}" stroke-width="3" opacity=".5"/>
        ${eyes === 'open' ? eyeOpen : eyeShut}
        <ellipse cx="78" cy="-80" rx="12" ry="8" fill="#f6efe4" opacity=".9"/>
        <path d="M80 -88 l5 0 l-2.5 4 Z" fill="#c98b86" stroke="${DARK}" stroke-width="1"/>
        ${mouth === 'yawn' ? mouthYawn : mouthCalm}
        <path d="M86 -90 l22 -6 M87 -86 l24 0 M86 -82 l22 6" fill="none" stroke="${INK}" stroke-width="1" opacity=".6"/>
        <path d="M40 -84 q-10 -2 -18 2" fill="none" stroke="${INK}" stroke-width="1" opacity=".5"/>
      </g>
    </g>`;
  }

  // 窩在紙箱裡的黑醬（露出上半身）。原點在箱口中央。
  function catInBox({ eyes = 'open', small = false } = {}) {
    const s = small ? 0.62 : 1;
    const eyesSvg = eyes === 'open'
      ? `<g class="eyes"><ellipse cx="14" cy="-50" rx="5" ry="6.4" fill="${GREEN}"/><ellipse cx="14" cy="-50" rx="1.7" ry="5.2" fill="${GREEN2}"/><ellipse cx="34" cy="-50" rx="5" ry="6.4" fill="${GREEN}"/><ellipse cx="34" cy="-50" rx="1.7" ry="5.2" fill="${GREEN2}"/></g>`
      : eyes === 'happy'
        ? `<g class="eyes"><path d="M8 -49 q6 -6 12 0" fill="none" stroke="${DARK}" stroke-width="2"/><path d="M28 -49 q6 -6 12 0" fill="none" stroke="${DARK}" stroke-width="2"/></g>`
        : `<g class="eyes"><path d="M8 -50 q6 5 12 0" fill="none" stroke="${DARK}" stroke-width="2"/><path d="M28 -50 q6 5 12 0" fill="none" stroke="${DARK}" stroke-width="2"/></g>`;
    return `<g class="cat-box" transform="scale(${s})">
      <path d="M-62 -10 C-95 -14 -100 18 -75 26" fill="none" stroke="${FUR}" stroke-width="12" stroke-linecap="round"/>
      <path d="M-62 -10 C-95 -14 -100 18 -75 26" fill="none" stroke="${DARK}" stroke-width="12" stroke-dasharray="6 14" opacity=".7"/>
      <ellipse cx="-8" cy="-6" rx="64" ry="34" fill="${FUR}" ${stroke}/>
      <path d="M-52 -34 q8 14 2 28 M-32 -40 q9 16 1 30 M-10 -42 q8 16 -1 32 M12 -38 q7 14 0 26" ${stripe}/>
      <g class="head">
        <path d="M2 -72 L-10 -104 L22 -80 Z" fill="${FUR}" ${stroke}/><path d="M4 -76 L-3 -94 L14 -81 Z" fill="${PINK}"/>
        <path d="M38 -80 L62 -106 L56 -72 Z" fill="${FUR}" ${stroke}/><path d="M42 -80 L56 -95 L52 -78 Z" fill="${PINK}"/>
        <circle cx="24" cy="-48" r="31" fill="${FUR}" ${stroke}/>
        <path d="M12 -76 v10 M24 -79 v12 M36 -76 v10" fill="none" stroke="${DARK}" stroke-width="3.2" stroke-linecap="round" opacity=".8"/>
        ${eyesSvg}
        <path d="M21.5 -38 l5 0 l-2.5 4 Z" fill="#c98b86" stroke="${DARK}" stroke-width="1"/>
        <path d="M24 -34 q-6 7 -11 2 M24 -34 q6 7 11 2" fill="none" stroke="${DARK}" stroke-width="1.4"/>
        <path d="M-4 -40 l-22 -5 M-4 -36 l-23 1 M30 -40 l24 -5 M31 -36 l23 1" fill="none" stroke="${INK}" stroke-width="1" opacity=".55"/>
      </g>
    </g>`;
  }

  // 被抱著的黑醬（正面）。原點在身體中心。
  function catHeld() {
    return `<g class="cat-held">
      <ellipse cx="0" cy="10" rx="50" ry="58" fill="${FUR}" ${stroke}/>
      <path d="M-34 -22 q10 10 0 24 M-14 -30 q8 12 0 26 M8 -30 q8 12 0 26 M28 -22 q10 10 0 24" ${stripe}/>
      <ellipse cx="0" cy="34" rx="22" ry="20" fill="#e9d6bd" opacity=".9"/>
      <rect x="-40" y="38" width="20" height="40" rx="10" fill="${FUR2}" ${stroke}/>
      <rect x="20" y="38" width="20" height="40" rx="10" fill="${FUR2}" ${stroke}/>
      <g class="head">
        <path d="M-28 -52 L-40 -92 L-6 -66 Z" fill="${FUR}" ${stroke}/><path d="M-26 -58 L-33 -80 L-15 -66 Z" fill="${PINK}"/>
        <path d="M28 -52 L40 -92 L6 -66 Z" fill="${FUR}" ${stroke}/><path d="M26 -58 L33 -80 L15 -66 Z" fill="${PINK}"/>
        <circle cx="0" cy="-36" r="36" fill="${FUR}" ${stroke}/>
        <path d="M-12 -68 v12 M0 -71 v14 M12 -68 v12" fill="none" stroke="${DARK}" stroke-width="3.2" stroke-linecap="round" opacity=".8"/>
        <path d="M-34 -40 q-3 10 2 18 M34 -40 q3 10 -2 18" fill="none" stroke="${DARK}" stroke-width="3" opacity=".5"/>
        <g class="eyes"><path d="M-20 -36 q6 -6 12 0" fill="none" stroke="${DARK}" stroke-width="2.2"/><path d="M8 -36 q6 -6 12 0" fill="none" stroke="${DARK}" stroke-width="2.2"/></g>
        <ellipse cx="0" cy="-16" rx="13" ry="8" fill="#f6efe4" opacity=".9"/>
        <path d="M-2.5 -24 l5 0 l-2.5 4 Z" fill="#c98b86" stroke="${DARK}" stroke-width="1"/>
        <path d="M0 -20 q-6 7 -11 2 M0 -20 q6 7 11 2" fill="none" stroke="${DARK}" stroke-width="1.4"/>
        <path d="M-22 -26 l-24 -5 M-22 -22 l-25 2 M22 -26 l24 -5 M22 -22 l25 2" fill="none" stroke="${INK}" stroke-width="1" opacity=".55"/>
      </g>
    </g>`;
  }

  // 背影的黑醬，回頭看一眼。原點在腳底中央。
  function catBack() {
    return `<g class="cat-back">
      <path d="M30 -20 C70 -30 78 -90 48 -118" fill="none" stroke="${FUR}" stroke-width="13" stroke-linecap="round"/>
      <path d="M30 -20 C70 -30 78 -90 48 -118" fill="none" stroke="${DARK}" stroke-width="13" stroke-dasharray="7 15" opacity=".7"/>
      <rect x="-38" y="-40" width="20" height="42" rx="9" fill="${FUR2}" ${stroke}/>
      <rect x="18" y="-40" width="20" height="42" rx="9" fill="${FUR2}" ${stroke}/>
      <path d="M-44 -30 C-52 -70 -48 -110 0 -112 C48 -110 52 -70 44 -30 Q0 -14 -44 -30 Z" fill="${FUR}" ${stroke}/>
      <path d="M-28 -96 q-6 16 -2 34 M-10 -104 q-4 18 0 40 M10 -104 q4 18 0 40 M28 -96 q6 16 2 34" ${stripe}/>
      <g class="head-back">
        <path d="M-26 -126 L-36 -158 L-4 -134 Z" fill="${FUR}" ${stroke}/>
        <path d="M26 -126 L36 -158 L4 -134 Z" fill="${FUR}" ${stroke}/>
        <circle cx="0" cy="-114" r="32" fill="${FUR}" ${stroke}/>
        <path d="M-12 -140 v14 M0 -144 v18 M12 -140 v14" fill="none" stroke="${DARK}" stroke-width="3.2" stroke-linecap="round" opacity=".8"/>
      </g>
      <g class="head-turn">
        <path d="M-30 -128 L-40 -160 L-10 -136 Z" fill="${FUR}" ${stroke}/><path d="M-28 -134 L-34 -150 L-18 -138 Z" fill="${PINK}"/>
        <path d="M14 -132 L30 -162 L34 -126 Z" fill="${FUR}" ${stroke}/><path d="M18 -134 L28 -150 L30 -130 Z" fill="${PINK}"/>
        <circle cx="0" cy="-112" r="32" fill="${FUR}" ${stroke}/>
        <path d="M-14 -138 v12 M-2 -141 v15 M10 -138 v12" fill="none" stroke="${DARK}" stroke-width="3.2" stroke-linecap="round" opacity=".8"/>
        <path d="M-30 -112 q-3 10 2 18" fill="none" stroke="${DARK}" stroke-width="3" opacity=".5"/>
        <g class="eyes"><ellipse cx="8" cy="-114" rx="5.4" ry="7" fill="${GREEN}"/><ellipse cx="8" cy="-114" rx="1.8" ry="5.6" fill="${GREEN2}"/><ellipse cx="9.8" cy="-116.8" rx="1.3" ry="1.5" fill="#fff" opacity=".8"/></g>
        <path d="M24 -104 l5 0 l-2.5 4 Z" fill="#c98b86" stroke="${DARK}" stroke-width="1"/>
        <path d="M26.5 -100 q-6 6 -10 1" fill="none" stroke="${DARK}" stroke-width="1.4"/>
        <path d="M30 -106 l20 -6 M31 -102 l22 0 M30 -98 l20 5" fill="none" stroke="${INK}" stroke-width="1" opacity=".55"/>
      </g>
    </g>`;
  }

  // 紙箱。原點在箱口前緣中央（箱內的東西畫在 inner 之後、front 之前）。
  function box(inner = '') {
    return `<g class="box">
      <path d="M-35 -20 L-35 -70 L105 -70 L105 -20 Z" fill="#cdb28c" ${stroke}/>
      <path d="M-70 0 L-108 -8 L-75 -28 L-35 -20 Z" fill="#d6bd98" ${stroke}/>
      <path d="M-70 0 L-35 -20 L105 -20 L70 0 Z" fill="#8f765a" ${stroke}/>
      <g class="box-inner">${inner}</g>
      <path d="M-70 0 L70 0 L70 86 L-70 86 Z" fill="#dcc39f" ${stroke}/>
      <path d="M70 0 L105 -20 L105 66 L70 86 Z" fill="#c6a981" ${stroke}/>
      <path d="M-58 10 l14 0 M-58 16 l9 0" fill="none" stroke="${INK}" stroke-width="1" opacity=".35"/>
      <path d="M0 2 L0 84" fill="none" stroke="${INK}" stroke-width="1" opacity=".18"/>
    </g>`;
  }

  // 一雙手，從下方捧著（以粗線條畫手臂，指頭扶在箱子前面）。座標與紙箱同一組。
  function hands() {
    const skin = '#f0dfcc';
    const arm = (d) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="58" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${skin}" stroke-width="55" stroke-linecap="round"/>`;
    const finger = (d) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${skin}" stroke-width="10" stroke-linecap="round"/>`;
    return `<g class="hands">
      ${arm('M-215 330 C-170 250 -120 160 -62 84')}
      ${arm('M215 330 C170 250 120 160 62 84')}
      ${finger('M-74 70 l6 -22')}${finger('M-60 66 l4 -26')}${finger('M-46 68 l2 -24')}
      ${finger('M74 70 l-6 -22')}${finger('M60 66 l-4 -26')}${finger('M46 68 l-2 -24')}
      <path d="M-72 96 q14 -6 28 -2 M72 96 q-14 -6 -28 -2" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".45"/>
    </g>`;
  }

  // 另一雙手，從右上伸過來，停在小貓頭前。絕對座標。
  function reachingHand() {
    const skin = '#f3e4d3';
    const arm = (d, w) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 3}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${skin}" stroke-width="${w}" stroke-linecap="round"/>`;
    const finger = (d) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${skin}" stroke-width="9" stroke-linecap="round"/>`;
    return `<g class="reach">
      ${arm('M430 120 C380 150 320 210 272 258', 40)}
      <path d="M430 120 C410 132 390 146 372 162" fill="none" stroke="#d9c4b4" stroke-width="40" stroke-linecap="round"/>
      <path d="M430 120 C410 132 390 146 372 162" fill="none" stroke="${INK}" stroke-width="43" stroke-linecap="round" opacity=".0"/>
      <ellipse cx="266" cy="266" rx="19" ry="16" transform="rotate(-40 266 266)" fill="${skin}" stroke="${INK}" stroke-width="1.5"/>
      ${finger('M258 258 l-24 -2')}${finger('M254 266 l-28 4')}${finger('M256 274 l-26 10')}${finger('M262 280 l-18 16')}
      <path d="M270 252 l-10 -16" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round"/><path d="M270 252 l-10 -16" fill="none" stroke="${skin}" stroke-width="8" stroke-linecap="round"/>
    </g>`;
  }

  // 琦琦與蓓蓓。hair: 'long'（長髮、瀏海、珍珠耳環）或 'short'（短髮）。原點在脖子底。
  // outfit: 'day'（日常）、'wedding'（白紗／背心）、'sleep'。eyes: 'happy' | 'dot' | 'shut'
  function person({ hair = 'long', outfit = 'day', eyes = 'happy', body = 'bust', cls = '' } = {}) {
    const faceEyes = eyes === 'happy'
      ? `<path d="M-14 -33 q5 -5 10 0 M4 -33 q5 -5 10 0" fill="none" stroke="${INK}" stroke-width="1.8"/>`
      : eyes === 'shut'
        ? `<path d="M-14 -31 q5 4 10 0 M4 -31 q5 4 10 0" fill="none" stroke="${INK}" stroke-width="1.8"/>`
        : `<circle cx="-9" cy="-32" r="2.2" fill="${INK}"/><circle cx="9" cy="-32" r="2.2" fill="${INK}"/>`;
    const hairBack = hair === 'long'
      ? `<path d="M-33 -50 C-33 -78 33 -78 33 -50 L37 14 C22 22 -22 22 -37 14 Z" fill="${HAIR}" ${stroke}/>` : '';
    const hairFront = hair === 'long'
      ? `<path d="M-27 -42 C-28 -70 28 -70 27 -42 L20 -46 C14 -58 -14 -58 -20 -46 Z" fill="${HAIR}" ${stroke}/>`
      : `<path d="M-27 -44 C-29 -70 29 -70 27 -42 C22 -50 10 -54 -2 -50 C-12 -48 -22 -46 -27 -44 Z" fill="${HAIR}" ${stroke}/><path d="M-26 -42 q-3 8 -1 14" fill="none" stroke="${HAIR}" stroke-width="5" stroke-linecap="round"/>`;
    const earrings = hair === 'long' ? `<circle cx="-24" cy="-24" r="2.4" fill="#fff" stroke="${INK}" stroke-width=".8"/><circle cx="24" cy="-24" r="2.4" fill="#fff" stroke="${INK}" stroke-width=".8"/>` : '';
    let clothes;
    if (outfit === 'wedding' && hair === 'long') {
      clothes = `<path d="M-60 -62 C-80 -20 -78 40 -64 70 L-34 70 C-44 30 -40 -10 -30 -40 Z" fill="#fff" opacity=".55" stroke="#dcd2c6"/>
        <path d="M-44 40 C-44 10 -20 0 0 0 C20 0 44 10 44 40 Z" fill="#fbf8f3" ${stroke}/>
        <path d="M-30 22 q10 -6 20 0 M10 22 q10 -6 20 0 M-24 32 q8 -5 16 0 M8 32 q8 -5 16 0" fill="none" stroke="#dcd2c6" stroke-width="1"/>`;
    } else if (outfit === 'wedding') {
      clothes = `<path d="M-44 40 C-44 10 -20 0 0 0 C20 0 44 10 44 40 Z" fill="#fbf8f3" ${stroke}/>
        <path d="M-28 40 L-28 10 L-12 4 L0 20 L12 4 L28 10 L28 40 Z" fill="#9c9ea3" ${stroke}/>
        <path d="M-22 14 v26 M-12 10 v30 M12 10 v30 M22 14 v26 M-28 22 h56 M-28 32 h56" fill="none" stroke="#6f7176" stroke-width=".8" opacity=".6"/>
        <path d="M-10 2 L0 12 L10 2" fill="none" stroke="${INK}" stroke-width="1.2"/>`;
    } else if (outfit === 'sleep') {
      clothes = '';
    } else {
      clothes = hair === 'long'
        ? `<path d="M-44 40 C-44 10 -20 0 0 0 C20 0 44 10 44 40 Z" fill="#e9c9c0" ${stroke}/><path d="M-8 2 q8 8 16 0" fill="none" stroke="${INK}" stroke-width="1"/>`
        : `<path d="M-44 40 C-44 10 -20 0 0 0 C20 0 44 10 44 40 Z" fill="#cfd4d8" ${stroke}/><path d="M-10 2 q10 8 20 0" fill="none" stroke="${INK}" stroke-width="1"/>`;
    }
    const fullBody = body === 'full'
      ? (hair === 'long'
        ? `<path d="M-30 36 L-46 150 L46 150 L30 36 Z" fill="${outfit === 'wedding' ? '#fbf8f3' : '#e9c9c0'}" ${stroke}/>`
        : `<path d="M-30 36 L-32 96 L32 96 L30 36 Z" fill="${outfit === 'wedding' ? '#9c9ea3' : '#cfd4d8'}" ${stroke}/><rect x="-30" y="92" width="26" height="58" rx="6" fill="#8d8f94" ${stroke}/><rect x="4" y="92" width="26" height="58" rx="6" fill="#8d8f94" ${stroke}/>`)
      : '';
    return `<g class="person ${cls}">
      ${hairBack}
      ${fullBody}
      ${clothes}
      <rect x="-9" y="-12" width="18" height="16" fill="${SKIN}" ${stroke}/>
      <circle cx="0" cy="-34" r="26" fill="${SKIN}" ${stroke}/>
      ${hairFront}
      ${earrings}
      ${faceEyes}
      <path d="M-6 -22 q6 6 12 0" fill="none" stroke="${INK}" stroke-width="1.5"/>
      <ellipse cx="-15" cy="-25" rx="5" ry="3" fill="#e8b4a8" opacity=".45"/><ellipse cx="15" cy="-25" rx="5" ry="3" fill="#e8b4a8" opacity=".45"/>
    </g>`;
  }

  // 床上：兩顆枕頭、棉被、兩個睡著的人（只露頭）。原點在床的中心。
  function bed() {
    return `<g class="bed">
      <rect x="-150" y="-60" width="300" height="150" rx="26" fill="#efe5d8" ${stroke}/>
      <rect x="-128" y="-74" width="100" height="44" rx="18" fill="#fbf8f3" ${stroke}/>
      <rect x="28" y="-74" width="100" height="44" rx="18" fill="#fbf8f3" ${stroke}/>
      <path d="M-150 10 L150 10 L150 90 L-150 90 Z" fill="#e3d4c2" ${stroke}/>
      <path d="M-120 30 q30 -8 60 0 t60 0 t60 0" fill="none" stroke="#c9b7a2" stroke-width="1"/>
    </g>`;
  }

  // 正面坐著、戴領巾的黑醬。原點在身體底。
  function catBandana() {
    return `<g class="cat-bandana">
      <path d="M60 -30 C100 -40 104 -100 70 -120" fill="none" stroke="${FUR}" stroke-width="13" stroke-linecap="round"/>
      <path d="M60 -30 C100 -40 104 -100 70 -120" fill="none" stroke="${DARK}" stroke-width="13" stroke-dasharray="7 15" opacity=".7"/>
      <path d="M-52 0 C-60 -60 -40 -110 0 -112 C40 -110 60 -60 52 0 Z" fill="${FUR}" ${stroke}/>
      <path d="M-30 -96 q-6 16 -2 34 M-10 -104 q-4 18 0 40 M10 -104 q4 18 0 40 M30 -96 q6 16 2 34" ${stripe}/>
      <ellipse cx="0" cy="-30" rx="26" ry="30" fill="#e6dccb" opacity=".9"/>
      <rect x="-44" y="-30" width="20" height="34" rx="10" fill="${FUR2}" ${stroke}/>
      <rect x="24" y="-30" width="20" height="34" rx="10" fill="${FUR2}" ${stroke}/>
      <g class="head">
        <path d="M-28 -128 L-40 -168 L-6 -142 Z" fill="${FUR}" ${stroke}/><path d="M-26 -134 L-33 -156 L-15 -142 Z" fill="${PINK}"/>
        <path d="M28 -128 L40 -168 L6 -142 Z" fill="${FUR}" ${stroke}/><path d="M26 -134 L33 -156 L15 -142 Z" fill="${PINK}"/>
        <circle cx="0" cy="-112" r="36" fill="${FUR}" ${stroke}/>
        <path d="M-12 -144 v12 M0 -147 v14 M12 -144 v12" fill="none" stroke="${DARK}" stroke-width="3.2" stroke-linecap="round" opacity=".8"/>
        <path d="M-34 -116 q-3 10 2 18 M34 -116 q3 10 -2 18" fill="none" stroke="${DARK}" stroke-width="3" opacity=".5"/>
        <g class="eyes"><ellipse cx="-13" cy="-110" rx="6" ry="7.5" fill="${GREEN}"/><ellipse cx="-13" cy="-110" rx="2" ry="6" fill="${GREEN2}"/><ellipse cx="13" cy="-110" rx="6" ry="7.5" fill="${GREEN}"/><ellipse cx="13" cy="-110" rx="2" ry="6" fill="${GREEN2}"/><ellipse cx="-11" cy="-113" rx="1.4" ry="1.6" fill="#fff" opacity=".85"/><ellipse cx="15" cy="-113" rx="1.4" ry="1.6" fill="#fff" opacity=".85"/></g>
        <ellipse cx="0" cy="-92" rx="13" ry="8" fill="#f6efe4" opacity=".9"/>
        <path d="M-2.5 -100 l5 0 l-2.5 4 Z" fill="#c98b86" stroke="${DARK}" stroke-width="1"/>
        <path d="M0 -96 q-6 7 -11 2 M0 -96 q6 7 11 2" fill="none" stroke="${DARK}" stroke-width="1.4"/>
        <path d="M-22 -102 l-24 -5 M-22 -98 l-25 2 M22 -102 l24 -5 M22 -98 l25 2" fill="none" stroke="${INK}" stroke-width="1" opacity=".55"/>
      </g>
      <g class="bandana">
        <path d="M-44 -84 C-22 -68 22 -68 44 -84 L4 -28 Z" fill="#5aa7c9" ${stroke}/>
        <path d="M-44 -84 C-22 -68 22 -68 44 -84" fill="none" stroke="#3d87a8" stroke-width="5"/>
        <text x="3" y="-56" text-anchor="middle" font-size="16" font-weight="500" fill="#fff" font-family="'Songti TC','Noto Serif TC',serif" letter-spacing="1">黑醬</text>
      </g>
    </g>`;
  }

  // 一個小小的、淡淡的黑醬（側坐），用在最後陪在他們身邊。
  function catGhost() {
    return `<g class="cat-ghost" opacity=".45">
      <path d="M-40 -8 C-70 -12 -74 20 -50 24" fill="none" stroke="${FUR}" stroke-width="10" stroke-linecap="round"/>
      <path d="M-34 0 C-40 -40 -24 -66 0 -66 C24 -66 40 -40 34 0 Z" fill="${FUR}" ${stroke}/>
      <path d="M-14 -56 q-3 12 0 26 M10 -56 q3 12 0 26" ${stripe}/>
      <path d="M-18 -72 L-26 -96 L-4 -82 Z M18 -72 L26 -96 L4 -82 Z" fill="${FUR}" ${stroke}/>
      <circle cx="0" cy="-66" r="20" fill="${FUR}" ${stroke}/>
      <path d="M-10 -68 q4 -4 8 0 M2 -68 q4 -4 8 0" fill="none" stroke="${DARK}" stroke-width="1.6"/>
    </g>`;
  }

  function heart(x, y, s = 1, cls = '') {
    return `<g transform="translate(${x} ${y}) scale(${s})"><g class="heart ${cls}"><path d="M0 6 C-8 -2 -8 -10 -2 -10 C1 -10 0 -7 0 -6 C0 -7 -1 -10 2 -10 C8 -10 8 -2 0 6 Z" fill="#d9a3a3" opacity=".85"/></g></g>`;
  }

  function pawPrint(x, y, r = 1, cls = '') {
    return `<g transform="translate(${x} ${y}) rotate(${r})"><g class="paw-print ${cls}"><ellipse cx="0" cy="4" rx="7" ry="6"/><circle cx="-7" cy="-5" r="2.6"/><circle cx="-2.5" cy="-8.5" r="2.6"/><circle cx="2.5" cy="-8.5" r="2.6"/><circle cx="7" cy="-5" r="2.6"/></g></g>`;
  }

  const svg = `<svg class="film" viewBox="0 0 360 640" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <defs>
    <filter id="wobble" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".11"/></feComponentTransfer></filter>
    <linearGradient id="night" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="640"><stop offset="0" stop-color="#2a2733"/><stop offset=".55" stop-color="#4b4149"/><stop offset="1" stop-color="#8c7566"/></linearGradient>
    <linearGradient id="dawn" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="640"><stop offset="0" stop-color="#5e5058"/><stop offset=".6" stop-color="#b59a86"/><stop offset="1" stop-color="#e8d9c6"/></linearGradient>
    <linearGradient id="morning" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="640"><stop offset="0" stop-color="#c8b0a0"/><stop offset=".6" stop-color="#eee3d5"/><stop offset="1" stop-color="${PAPER}"/></linearGradient>
    <linearGradient id="dusk" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="640"><stop offset="0" stop-color="#4a4556"/><stop offset=".55" stop-color="#8e7c80"/><stop offset="1" stop-color="#e3d4c6"/></linearGradient>
    <linearGradient id="beam" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbf0" stop-opacity=".95"/><stop offset=".7" stop-color="#fff6e2" stop-opacity=".25"/><stop offset="1" stop-color="#fff6e2" stop-opacity="0"/></linearGradient>
    <radialGradient id="ground"><stop offset="0" stop-color="#5a4538" stop-opacity=".22"/><stop offset="1" stop-color="#5a4538" stop-opacity="0"/></radialGradient>
  </defs>

  <g class="scene s1" data-scene="1">
    <rect x="-400" y="-400" width="1160" height="1440" fill="url(#night)"/>
    <g class="stars" fill="#fff3d6"><circle cx="40" cy="70" r="1.4"/><circle cx="120" cy="40" r="1"/><circle cx="210" cy="90" r="1.3"/><circle cx="330" cy="60" r="1"/><circle cx="70" cy="160" r="1"/><circle cx="300" cy="170" r="1.2"/><circle cx="160" cy="140" r=".9"/></g>
    <path d="M292 96 a30 30 0 1 0 22 50 a24 24 0 1 1 -22 -50 Z" fill="#f3e3bf" opacity=".9"/>
    <ellipse cx="180" cy="470" rx="150" ry="22" fill="url(#ground)"/>
    <g filter="url(#wobble)"><g transform="translate(180 400)">${box(`<g class="kit breathe" transform="translate(0 -4)">${catInBox({ eyes: 'shut', small: true })}</g>`)}</g></g>
  </g>

  <g class="scene s2" data-scene="2">
    <rect x="-400" y="-400" width="1160" height="1440" fill="url(#dawn)"/>
    <g filter="url(#wobble)"><g class="lift" transform="translate(180 340)">${hands()}${box(`<g class="kit peek" transform="translate(0 -4)">${catInBox({ eyes: 'open', small: true })}</g>`)}</g></g>
  </g>

  <g class="scene s3" data-scene="3">
    <rect x="-400" y="-400" width="1160" height="1440" fill="url(#morning)"/>
    <g filter="url(#wobble)"><g transform="translate(180 340)">${hands()}${box(`<g class="kit look" transform="translate(0 -6)">${catInBox({ eyes: 'open', small: true })}</g>`)}</g>
      <g class="reach"><g transform="translate(304 296) scale(1.05)">${person({ hair: QIQI, outfit: 'day', eyes: 'happy' })}</g>
        <path d="M284 330 C268 318 252 304 238 294" fill="none" stroke="${INK}" stroke-width="22" stroke-linecap="round"/><path d="M284 330 C268 318 252 304 238 294" fill="none" stroke="${SKIN}" stroke-width="19" stroke-linecap="round"/>
        <ellipse cx="232" cy="290" rx="12" ry="10" fill="${SKIN}" ${stroke}/></g></g>
  </g>

  <g class="scene s4a" data-scene="4a">
    <rect x="-400" y="-400" width="1160" height="1440" fill="${PAPER}"/>
    <rect x="30" y="380" width="300" height="60" rx="30" fill="#e6d5c3"/><path d="M50 410 q65 -10 130 0 t130 0" fill="none" stroke="#b89c86" stroke-width="1" stroke-dasharray="3 5"/>
    <g filter="url(#wobble)"><g class="grow" transform="translate(170 392)">${catSide({ eyes: 'shut', cls: 'knead' })}</g></g>
  </g>

  <g class="scene s4b" data-scene="4b">
    <rect x="-400" y="-400" width="1160" height="1440" fill="${PAPER}"/>
    <ellipse cx="180" cy="470" rx="150" ry="22" fill="url(#ground)"/>
    <g filter="url(#wobble)"><g transform="translate(180 380)">${box(`<g class="loaf" transform="translate(4 -2)">${catInBox({ eyes: 'happy' })}</g>`)}</g></g>
  </g>

  <g class="scene s4c" data-scene="4c">
    <rect x="-400" y="-400" width="1160" height="1440" fill="${PAPER}"/>
    <ellipse cx="180" cy="420" rx="150" ry="20" fill="url(#ground)"/>
    <g filter="url(#wobble)"><g transform="translate(170 400)">${catSide({ eyes: 'shut', mouth: 'yawn', cls: 'yawn' })}</g></g>
  </g>

  <g class="scene s4d" data-scene="4d">
    <rect x="-400" y="-400" width="1160" height="1440" fill="${PAPER}"/>
    <rect x="70" y="90" width="110" height="120" rx="6" fill="#fff8ea" stroke="${INK}" stroke-width="1.2"/><path d="M125 90 v120 M70 150 h110" fill="none" stroke="${INK}" stroke-width="1" opacity=".5"/>
    <path d="M70 90 L-40 420 L180 420 L180 210 Z" fill="url(#beam)" opacity=".5"/>
    <g filter="url(#wobble)"><g transform="translate(180 380)">${bed()}
      <g transform="translate(-78 -52) scale(.78)">${person({ hair: 'long', outfit: 'sleep', eyes: 'shut' })}</g>
      <g transform="translate(78 -52) scale(.78)">${person({ hair: 'short', outfit: 'sleep', eyes: 'shut' })}</g>
      <path d="M-150 10 L150 10 L150 90 L-150 90 Z" fill="#e3d4c2" ${stroke}/>
      <path d="M-120 30 q30 -8 60 0 t60 0 t60 0" fill="none" stroke="#c9b7a2" stroke-width="1"/>
      <g class="stomp" transform="translate(60 12) scale(.62)">${catSide({ eyes: 'open', cls: 'knead' })}</g>
    </g></g>
  </g>

  <g class="scene s4e" data-scene="4e">
    <rect x="-400" y="-400" width="1160" height="1440" fill="${PAPER}"/>
    <rect x="200" y="120" width="150" height="330" rx="4" fill="#e7dccd" ${stroke}/><rect x="214" y="134" width="122" height="302" rx="3" fill="#f6f1e8" stroke="${INK}" stroke-width="1"/><circle cx="322" cy="290" r="4" fill="${INK}"/>
    <ellipse cx="180" cy="458" rx="170" ry="16" fill="url(#ground)"/>
    <g filter="url(#wobble)">
      <g transform="translate(262 300) scale(.78)"><g class="arrive-a">${person({ hair: 'long', outfit: 'day', eyes: 'happy', body: 'full' })}</g></g>
      <g transform="translate(316 306) scale(.78)"><g class="arrive-b">${person({ hair: 'short', outfit: 'day', eyes: 'happy', body: 'full' })}</g></g>
      <g class="wait" transform="translate(96 450) scale(.9)">${catBack().replace('class="cat-back"', 'class="cat-back turned"')}</g>
      ${heart(150, 300, 1, 'h1')}${heart(130, 280, .8, 'h2')}
    </g>
  </g>

  <g class="scene s4f" data-scene="4f">
    <rect x="-400" y="-400" width="1160" height="1440" fill="${PAPER}"/>
    <g filter="url(#wobble)">
      <rect x="30" y="360" width="300" height="14" rx="4" fill="#d6c3a8" ${stroke}/><rect x="50" y="374" width="10" height="90" fill="#c9b396" ${stroke}/><rect x="300" y="374" width="10" height="90" fill="#c9b396" ${stroke}/>
      <g transform="translate(262 352) scale(.82)">${person({ hair: 'short', outfit: 'day', eyes: 'dot' })}</g>
      <path d="M100 360 L108 306 L220 306 L212 360 Z" fill="#bfc3c8" ${stroke}/><path d="M112 318 L214 318 L208 350 L106 350 Z" fill="#e8ecef"/><path d="M90 360 L230 360" fill="none" stroke="${INK}" stroke-width="3"/>
      <g transform="translate(160 362) scale(.42)"><g class="keyboard-cat">${catSide({ eyes: 'shut' })}</g></g>
      <g transform="translate(56 350) scale(.78)"><g class="tea">${person({ hair: 'long', outfit: 'day', eyes: 'happy' })}
        <path d="M30 20 l30 -8" fill="none" stroke="${INK}" stroke-width="14" stroke-linecap="round"/><path d="M30 20 l30 -8" fill="none" stroke="${SKIN}" stroke-width="11" stroke-linecap="round"/>
        <rect x="56" y="-4" width="20" height="18" rx="4" fill="#fbf8f3" ${stroke}/><path d="M76 2 q8 3 0 8" fill="none" ${stroke}/>
        <path d="M62 -10 q3 -6 0 -12 M70 -10 q3 -6 0 -12" fill="none" stroke="${INK}" stroke-width="1" opacity=".5" class="steam"/>
      </g></g>
    </g>
  </g>

  <g class="scene s4g" data-scene="4g">
    <rect x="-400" y="-400" width="1160" height="1440" fill="${PAPER}"/>
    <ellipse cx="180" cy="430" rx="130" ry="18" fill="url(#ground)"/>
    <g filter="url(#wobble)"><g transform="translate(180 420)"><g class="sit">${catBandana()}</g></g></g>
  </g>

  <g class="scene s5" data-scene="5">
    <rect x="-400" y="-400" width="1160" height="1440" fill="${PAPER}"/>
    <g class="bunting"><path d="M-10 70 Q180 150 370 70" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".6"/>
      ${[1, 2, 3, 4, 5, 6, 7, 8].map(i => { const u = i / 9.2; const x = (1 - u) * (1 - u) * -10 + 2 * (1 - u) * u * 180 + u * u * 370; const y = (1 - u) * (1 - u) * 70 + 2 * (1 - u) * u * 150 + u * u * 70; const c = ['#5d5a66', '#e9e4dc', '#7a4a52'][i % 3]; return `<path d="M${(x - 12).toFixed(1)} ${(y + 1).toFixed(1)} l24 0 l-12 26 Z" fill="${c}" stroke="${INK}" stroke-width=".9" opacity=".95"/>`; }).join('')}
    </g>
    <g filter="url(#wobble)">
      <path d="M-20 640 C20 540 40 470 90 430 C130 410 170 470 190 640 Z" fill="#fbf8f3" ${stroke}/>
      <g transform="translate(112 300) scale(1.05)">${person({ hair: 'long', outfit: 'wedding', eyes: 'happy' })}</g>
      <g transform="translate(252 296) scale(1.05)">${person({ hair: 'short', outfit: 'wedding', eyes: 'happy' })}</g>
      <path d="M122 340 C150 350 160 372 170 392" fill="none" stroke="${INK}" stroke-width="22" stroke-linecap="round"/><path d="M122 340 C150 350 160 372 170 392" fill="none" stroke="#fbf8f3" stroke-width="19" stroke-linecap="round"/>
      <path d="M242 340 C214 350 204 372 194 392" fill="none" stroke="${INK}" stroke-width="22" stroke-linecap="round"/><path d="M242 340 C214 350 204 372 194 392" fill="none" stroke="#fbf8f3" stroke-width="19" stroke-linecap="round"/>
      <g transform="translate(182 346) scale(.78)"><g class="held-cat">${catHeld()}</g></g>
      <ellipse cx="160" cy="394" rx="16" ry="12" transform="rotate(-20 160 394)" fill="${SKIN}" ${stroke}/>
      <ellipse cx="204" cy="394" rx="16" ry="12" transform="rotate(20 204 394)" fill="${SKIN}" ${stroke}/>
    </g>
  </g>

  <g class="scene s6" data-scene="6">
    <rect x="-400" y="-400" width="1160" height="1440" fill="${PAPER}"/>
    <path d="M360 0 L360 120 L-40 520 L-40 400 Z" fill="url(#beam)" class="beam"/>
    <g class="motes" fill="#fff" opacity=".9"><circle cx="250" cy="200" r="1.6"/><circle cx="200" cy="260" r="1.2"/><circle cx="290" cy="150" r="1"/><circle cx="150" cy="330" r="1.4"/><circle cx="120" cy="380" r="1"/><circle cx="220" cy="310" r="1.1"/></g>
    <ellipse cx="180" cy="470" rx="150" ry="22" fill="url(#ground)"/>
    <g filter="url(#wobble)"><g transform="translate(180 400)">${box('')}</g></g>
  </g>

  <g class="scene s6b" data-scene="6b">
    <rect x="-400" y="-400" width="1160" height="1440" fill="url(#dusk)"/>
    <g class="stars" fill="#fff3d6"><circle cx="50" cy="60" r="1.2"/><circle cx="140" cy="36" r="1"/><circle cx="230" cy="80" r="1.3"/><circle cx="320" cy="50" r="1"/><circle cx="90" cy="130" r=".9"/><circle cx="290" cy="150" r="1.1"/></g>
    <rect x="80" y="110" width="200" height="150" rx="6" fill="#2f2c3a" stroke="${INK}" stroke-width="1.2"/><path d="M180 110 v150 M80 185 h200" fill="none" stroke="#6b6577" stroke-width="1"/>
    <g filter="url(#wobble)">
      <rect x="30" y="400" width="300" height="80" rx="22" fill="#d9c5b0" ${stroke}/><rect x="20" y="380" width="24" height="90" rx="10" fill="#cdb79f" ${stroke}/><rect x="316" y="380" width="24" height="90" rx="10" fill="#cdb79f" ${stroke}/>
      <g transform="translate(120 392) scale(.9)">${person({ hair: 'long', outfit: 'day', eyes: 'shut' })}</g>
      <g transform="translate(206 392) scale(.9)">${person({ hair: 'short', outfit: 'day', eyes: 'shut' })}</g>
      <g class="ghost" transform="translate(290 412)">${catGhost()}</g>
      ${heart(300, 330, 1, 'h3')}${heart(282, 300, .7, 'h4')}
    </g>
  </g>

  <g class="scene s7" data-scene="7">
    <rect x="-400" y="-400" width="1160" height="1440" fill="${PAPER}"/>
    <g fill="#bfa98f" opacity=".85">
      ${[[62, 500, -20], [94, 468, -16], [110, 432, -12], [142, 404, -8], [156, 370, -5], [188, 344, -3], [200, 316, -1], [228, 300, 0]].map((p, i) => pawPrint(p[0], p[1], p[2], 'p' + i)).join('')}
    </g>
    <ellipse cx="236" cy="318" rx="80" ry="12" fill="url(#ground)"/>
    <g filter="url(#wobble)"><g transform="translate(236 300)"><g class="back-cat">${catBack()}</g></g></g>
  </g>

  <rect x="-400" y="-400" width="1160" height="1440" filter="url(#grain)" class="grain" opacity=".55" style="mix-blend-mode:multiply"/>
  <text class="caption" id="intro-caption" x="180" y="566" text-anchor="middle"></text>
  <g class="title" id="intro-title"><text x="183" y="548" text-anchor="middle">黑醬・在身邊</text><text class="title-sub" x="180" y="582" text-anchor="middle">給琦琦與蓓蓓</text></g>
</svg>`;

  /* ---------- 時間軸 ---------- */
  const timeline = [
    { t: 0.0, scene: '1' },
    { t: 1.0, caption: '那天，有人撿到一隻貓。' },
    { t: 4.0, scene: '2', caption: '' },
    { t: 4.9, caption: '問：有人要牠嗎？' },
    { t: 8.0, scene: '3', caption: '' },
    { t: 8.8, caption: '77 說：我。' },
    { t: 12.0, scene: '4a', caption: '' },
    { t: 12.7, caption: '踩踩、踩踩。' },
    { t: 15.0, scene: '4b', caption: '' },
    { t: 15.5, caption: '紙箱，是牠的。' },
    { t: 18.0, scene: '4c', caption: '' },
    { t: 18.5, caption: '好大一個哈欠。' },
    { t: 21.0, scene: '4d', caption: '' },
    { t: 21.7, caption: '早上六點，有人在踩你的肚子。' },
    { t: 25.0, scene: '4e', caption: '' },
    { t: 25.8, caption: '門一開，牠就在那裡。' },
    { t: 29.0, scene: '4f', caption: '' },
    { t: 29.7, caption: '鍵盤是牠的。工作，等一下。' },
    { t: 33.0, scene: '4g', caption: '' },
    { t: 33.7, caption: '領巾上，寫著牠的名字。' },
    { t: 37.0, scene: '5', caption: '' },
    { t: 37.9, caption: '那一天，牠也在。' },
    { t: 41.0, scene: '6', caption: '' },
    { t: 45.0, scene: '6b' },
    { t: 45.8, caption: '後來，牠先走了。' },
    { t: 48.4, caption: '' },
    { t: 48.9, caption: '可是牠很愛你們。一直都是。' },
    { t: 52.0, scene: '7', caption: '' },
    { t: 54.2, title: true },
    { t: FILM_SECONDS, end: true }
  ];

  /* ---------- 音樂（鋼琴） ---------- */
  const N = { F2: 41, G2: 43, A2: 45, Bb2: 46, C3: 48, D3: 50, E3: 52, F3: 53, G3: 55, A3: 57, Bb3: 58, C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, Bb4: 70, C5: 72, D5: 74, E5: 76, F5: 77, G5: 79, A5: 81, Bb5: 82, C6: 84 };
  // [time, note, duration, velocity]
  // 和弦走向：F 大調。0–4 前奏、4–21 收編與長大、21–37 日常（多一點流動）、37–41 婚禮、41–45 留白、45–52 想念、52–57 結尾。
  const bass = [
    [0.0, 'F2', 2.0, .42], [2.0, 'C3', 2.0, .36],
    [4.0, 'F2', 1.8, .4], [4.5, 'C3', 1.5, .3], [5.0, 'A3', 1.2, .28], [5.5, 'C4', 1.0, .24],
    [6.0, 'D3', 1.8, .4], [6.5, 'A3', 1.5, .3], [7.0, 'F4', 1.0, .22],
    [8.0, 'Bb2', 1.8, .4], [8.5, 'F3', 1.5, .3], [9.0, 'D4', 1.2, .26],
    [10.0, 'C3', 1.8, .38], [10.5, 'G3', 1.4, .28], [11.0, 'E4', 1.0, .22],
    [12.0, 'F2', 1.8, .42], [12.5, 'C3', 1.5, .3], [13.0, 'A3', 1.2, .28], [13.5, 'C4', 1.0, .24],
    [14.0, 'Bb2', 1.8, .4], [14.5, 'F3', 1.5, .3], [15.0, 'D4', 1.2, .26],
    [16.0, 'G2', 1.8, .4], [16.5, 'D3', 1.5, .3], [17.0, 'Bb3', 1.2, .26],
    [18.0, 'C3', 1.8, .4], [18.5, 'G3', 1.4, .3], [19.0, 'E4', 1.0, .22],
    [20.0, 'F2', 1.0, .4], [20.5, 'C3', .8, .28],
    [21.0, 'F2', 1.8, .42], [21.5, 'C3', 1.5, .3], [22.0, 'A3', 1.2, .28], [22.5, 'C4', 1.0, .24],
    [23.0, 'A2', 1.8, .4], [23.5, 'E3', 1.5, .3], [24.0, 'C4', 1.2, .26],
    [25.0, 'D3', 1.8, .42], [25.5, 'A3', 1.5, .3], [26.0, 'F4', 1.0, .22],
    [27.0, 'Bb2', 1.8, .4], [27.5, 'F3', 1.5, .3], [28.0, 'D4', 1.2, .26],
    [29.0, 'G2', 1.8, .4], [29.5, 'D3', 1.5, .3], [30.0, 'Bb3', 1.2, .26],
    [31.0, 'C3', 1.8, .4], [31.5, 'G3', 1.4, .3], [32.0, 'E4', 1.0, .22],
    [33.0, 'F2', 1.8, .42], [33.5, 'C3', 1.5, .3], [34.0, 'A3', 1.2, .28], [34.5, 'C4', 1.0, .24],
    [35.0, 'Bb2', 1.8, .4], [35.5, 'F3', 1.5, .3], [36.0, 'D4', 1.2, .26], [36.5, 'C3', .6, .3],
    [37.0, 'D3', 1.5, .42], [37.5, 'A3', 1.2, .3], [38.0, 'F4', 1.0, .24],
    [38.5, 'Bb2', 1.5, .42], [39.0, 'F3', 1.2, .3], [39.5, 'D4', 1.0, .24],
    [40.0, 'F2', 2.5, .42], [40.5, 'C3', 2.0, .3], [41.0, 'A3', 2.0, .2],
    [45.0, 'D3', 2.2, .34], [45.5, 'A3', 1.8, .24],
    [47.0, 'Bb2', 2.2, .34], [47.5, 'F3', 1.8, .24],
    [49.0, 'F2', 2.0, .36], [49.5, 'C3', 1.6, .26], [50.0, 'A3', 1.2, .22],
    [51.0, 'C3', 1.0, .34], [51.5, 'G3', .8, .24],
    [52.0, 'Bb2', 1.5, .4], [52.5, 'F3', 1.2, .3], [53.0, 'D4', 1.0, .24],
    [53.5, 'C3', 1.5, .4], [54.0, 'G3', 1.2, .3], [54.5, 'E4', 1.0, .22],
    [55.0, 'F2', 4.0, .44], [55.5, 'C3', 3.5, .32], [56.0, 'A3', 3.0, .26], [56.5, 'F4', 3.0, .2]
  ];
  const melody = [
    [1.0, 'A5', 1.5, .5], [2.5, 'F5', 1.5, .44],
    [4.0, 'C5', .75, .6], [4.75, 'D5', .75, .56], [5.5, 'F5', 1.5, .66], [7.0, 'E5', 1.0, .55],
    [8.0, 'D5', .75, .6], [8.75, 'C5', .75, .56], [9.5, 'A4', 1.5, .6], [10.5, 'G4', .5, .46], [11.0, 'E5', 1.0, .5],
    [12.0, 'F5', .5, .62], [12.5, 'G5', .5, .6], [13.0, 'A5', 1.0, .7], [14.0, 'G5', .5, .58], [14.5, 'F5', 1.0, .64],
    [15.5, 'D5', .5, .56], [16.0, 'Bb4', 1.0, .6], [17.0, 'C5', .5, .56], [17.5, 'D5', .5, .58], [18.0, 'E5', 1.5, .62],
    [19.5, 'F5', .5, .56], [20.0, 'A5', 1.0, .6],
    [21.0, 'C5', .5, .58], [21.5, 'A4', .5, .54], [22.0, 'C5', 1.0, .6], [23.0, 'E5', .5, .58], [23.5, 'C5', .5, .54], [24.0, 'E5', 1.0, .6],
    [25.0, 'F5', .75, .64], [25.75, 'A5', .75, .62], [26.5, 'F5', .5, .56], [27.0, 'D5', 1.0, .6], [28.0, 'F5', .5, .56], [28.5, 'D5', .5, .52],
    [29.0, 'Bb4', .75, .6], [29.75, 'D5', .75, .58], [30.5, 'G5', 1.0, .64], [31.5, 'E5', 1.0, .58], [32.5, 'C5', .5, .52],
    [33.0, 'A5', 1.0, .66], [34.0, 'G5', .5, .58], [34.5, 'F5', 1.0, .62], [35.5, 'D5', .5, .56], [36.0, 'F5', .5, .56], [36.5, 'G5', .5, .58],
    [37.0, 'F5', 1.5, .7], [38.5, 'D5', 1.5, .64], [40.0, 'C5', 1.5, .6],
    [41.0, 'A5', 3.5, .3],
    [45.5, 'A4', 1.0, .48], [46.5, 'F5', 1.5, .5],
    [47.5, 'D5', 1.0, .48], [48.5, 'C5', 1.5, .5],
    [49.5, 'A4', 1.0, .46], [50.5, 'C5', .5, .44], [51.0, 'E5', 1.0, .5],
    [52.0, 'D5', .75, .62], [52.75, 'F5', .75, .62], [53.5, 'E5', 1.0, .64], [54.5, 'D5', .5, .56],
    [55.0, 'F5', 4.0, .6], [55.0, 'A5', 4.0, .4], [55.0, 'C6', 4.0, .24]
  ];

  function makePiano(ctx) {
    const master = ctx.createGain();
    master.gain.value = 0;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass'; tone.frequency.value = 3200; tone.Q.value = .4;
    const delay = ctx.createDelay(1.0); delay.delayTime.value = .34;
    const feedback = ctx.createGain(); feedback.gain.value = .22;
    const wet = ctx.createGain(); wet.gain.value = .22;
    const damp = ctx.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 1800;
    tone.connect(master);
    tone.connect(delay); delay.connect(damp); damp.connect(feedback); feedback.connect(delay); damp.connect(wet); wet.connect(master);
    master.connect(ctx.destination);
    function note(when, midi, dur, vel) {
      const f = 440 * Math.pow(2, (midi - 69) / 12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(vel, when + .012);
      g.gain.exponentialRampToValueAtTime(vel * .45, when + .35);
      g.gain.exponentialRampToValueAtTime(Math.max(vel * .12, .0002), when + dur);
      g.gain.exponentialRampToValueAtTime(.0001, when + dur + 1.4);
      g.connect(tone);
      const partials = [[1, 1], [2, .32], [3, .13], [4.01, .05], [.5, .06]];
      for (const [ratio, amp] of partials) {
        const o = ctx.createOscillator();
        o.type = ratio === 1 ? 'triangle' : 'sine';
        o.frequency.value = f * ratio;
        if (ratio === 2) o.detune.value = 3;
        const pg = ctx.createGain(); pg.gain.value = amp * (ratio === 1 ? .55 : 1);
        o.connect(pg); pg.connect(g);
        o.start(when); o.stop(when + dur + 1.6);
      }
    }
    return { master, note };
  }

  /* ---------- 播放 ---------- */
  function buildOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'intro';
    overlay.innerHTML = `
      <div class="intro-gate" role="dialog" aria-labelledby="intro-gate-title">
        <svg class="gate-mark" viewBox="0 0 34 34" aria-hidden="true" fill="none"><path d="M8 17V7l7 5h4l7-5v10c0 11-18 11-18 0Z"/><path d="m13 21 4 2 4-2M5 19l7 1m-7 4 7-2m17-3-7 1m7 4-7-2"/></svg>
        <button type="button" class="gate-button" id="intro-start"><span id="intro-gate-title">輕點，看看黑醬</span><small>三十秒的小故事，有聲音。</small></button>
        <button type="button" class="gate-skip" id="intro-skip-gate">直接去找牠</button>
      </div>
      <div class="intro-stage" hidden>
        ${svg}
        <p class="sr-caption" id="intro-live" aria-live="polite"></p>
        <button type="button" class="intro-skip" id="intro-skip">略過 →</button>
      </div>`;
    return overlay;
  }

  function play(overlay, { onDone }) {
    const stage = overlay.querySelector('.intro-stage');
    const gate = overlay.querySelector('.intro-gate');
    const caption = overlay.querySelector('#intro-caption');
    const live = overlay.querySelector('#intro-live');
    const title = overlay.querySelector('#intro-title');
    const scenes = overlay.querySelectorAll('.scene');
    gate.hidden = true;
    stage.hidden = false;

    let ctx, piano;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      piano = makePiano(ctx);
    } catch { ctx = null; }
    const startAt = (ctx ? ctx.currentTime : performance.now() / 1000) + 0.12;
    if (ctx) {
      try { ctx.resume?.()?.catch?.(() => {}); } catch {}
      piano.master.gain.setValueAtTime(0.0001, startAt);
      piano.master.gain.exponentialRampToValueAtTime(.8, startAt + .6);
      for (const [t, n, d, v] of bass) piano.note(startAt + t, N[n], d, v);
      for (const [t, n, d, v] of melody) piano.note(startAt + t, N[n], d, v);
    }
    const now = () => (ctx ? ctx.currentTime : performance.now() / 1000) - startAt;

    let index = 0, raf, finished = false;
    function setScene(id) {
      for (const s of scenes) s.classList.toggle('active', s.dataset.scene === id);
    }
    function setCaption(text) {
      caption.classList.remove('show');
      if (!text) return;
      // 讓淡出先走一小段，再換字淡入
      setTimeout(() => { caption.textContent = text; live.textContent = text; caption.classList.add('show'); }, 180);
    }
    function finish(skipped) {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      if (ctx) {
        const t = ctx.currentTime;
        piano.master.gain.cancelScheduledValues(t);
        piano.master.gain.setValueAtTime(piano.master.gain.value || .8, t);
        piano.master.gain.exponentialRampToValueAtTime(.0001, t + (skipped ? .5 : 2.2));
        setTimeout(() => ctx.close?.(), skipped ? 700 : 2600);
      }
      overlay.classList.add('leaving');
      setTimeout(() => { overlay.remove(); onDone?.(); }, 1600);
    }
    function tick() {
      const t = now();
      while (index < timeline.length && timeline[index].t <= t) {
        const step = timeline[index++];
        if (step.scene) setScene(step.scene);
        if ('caption' in step) setCaption(step.caption);
        if (step.title) { setCaption(''); title.classList.add('show'); }
        if (step.end) { finish(false); return; }
      }
      raf = requestAnimationFrame(tick);
    }
    setScene('1');
    raf = requestAnimationFrame(tick);
    overlay.querySelector('#intro-skip').addEventListener('click', () => finish(true));
    document.addEventListener('visibilitychange', () => { if (document.hidden && !finished) finish(true); }, { once: true });
  }

  function mount({ auto }) {
    if (document.getElementById('intro')) return;
    const overlay = buildOverlay();
    document.body.prepend(overlay);
    document.documentElement.classList.add('intro-open');
    const done = () => { document.documentElement.classList.remove('intro-open'); };
    overlay.querySelector('#intro-start').addEventListener('click', () => play(overlay, { onDone: done }));
    overlay.querySelector('#intro-skip-gate').addEventListener('click', () => { overlay.classList.add('leaving'); setTimeout(() => { overlay.remove(); done(); }, 600); });
    if (!auto) overlay.querySelector('#intro-start').focus?.({ preventScroll: true });
  }

  // 每次打開都先看到入口；「直接去找牠」可以跳過，頁尾也有「再看一次開場」。
  if (!reduced) mount({ auto: true });
  const replay = document.getElementById('intro-replay');
  if (replay) replay.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'auto' }); mount({ auto: false }); });
})();
