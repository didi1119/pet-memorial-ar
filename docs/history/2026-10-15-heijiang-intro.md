# 2026-10-15 黑醬：開場短片與主畫面圖示

## 做了什麼

- 網站每次打開先停在「輕點，看看黑醬」；點了播一段約 57 秒的手繪開場，看完進到 AR 頁面。可以「直接去找牠」跳過，頁尾也有「再看一次開場」。
- 故事：收編、長大、日常（踩肚子、等門、鍵盤、寫著名字的領巾）、婚禮那天、空的紙箱、牠先走了但還是很愛你們、回頭看一眼。琦琦與蓓蓓都有畫出來：琦琦（77）長髮、瀏海、珍珠耳環，婚禮穿白紗；蓓蓓短髮，婚禮是格紋背心。
- 開場是 SVG + CSS 動畫，配樂用 Web Audio 現場合成的鋼琴，沒有外部圖片或音檔，不涉及授權。
- 手機瀏覽器不允許網頁自動出聲，所以開場前有一個「輕點，看看黑醬」的入口；也可以「直接去找牠」或在播放中「略過」。
- 加上 `manifest.webmanifest` 與 `icons/`（180／192／512），加到主畫面時會是黑醬的頭像。iPhone 刻意不設定全螢幕 web app 模式，從主畫面開啟仍走 Safari，AR Quick Look 才穩。
- 設定「減少動態」的裝置不會自動播開場。

## 動到的檔案

- `cases/heijiang/site/index.html`：加 manifest、apple-touch-icon、開場樣式與程式、`#intro-gate` 行內腳本（第一次來先遮住頁面，程式沒載入時 4 秒自動放開）、頁尾按鈕。
- `cases/heijiang/site/_headers`：manifest 不快取、icons 快取一天。
- 新增 `cases/heijiang/site/intro.<hash>.js`、`intro.<hash>.css`、`manifest.webmanifest`、`icons/`。
- 原始檔與產生流程在 `work/heijiang-intro/`：`intro.js`、`intro.css`、`icon.svg`、`build.py`（重新產生雜湊檔名並寫回 index.html）、`preview.html`（本機預覽）。

模型、`poses.json`、`app.js`、`style.css` 完全沒動。

## 部署

1. `python3 scripts/restore_assets.py --download`（把 GLB／USDZ 放回 `cases/heijiang/site/poses/`）。
2. 把整個 `cases/heijiang/site` 上傳到 Cloudflare Pages 專案 `heijiang-always-here`，例如 `npx wrangler pages deploy cases/heijiang/site --project-name heijiang-always-here`。
3. 手機實機確認：第一次開會看到開場；看完後 AR 按鈕與六個姿勢照常。

## 之後可以換的

- `work/heijiang-intro/intro.js` 的 `timeline` 是每一句字幕與每一幕的秒數；`melody`／`bass` 是音符。
- 日常那幾幕可以換成黑醬自己的小習慣。
- `intro.js` 最上面的 `QIQI` 是「77 說：我」那幕伸手的人的髮型（琦琦是長髮 'long'）。
