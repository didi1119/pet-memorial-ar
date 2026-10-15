# 2026-10-16 黑醬：頁面改成給琦琦的生日禮物（三版）

## 做了什麼

- 整頁重新排版，從上到下：剪紙畫像（琦琦、蓓蓓、黑醬）與「琦琦，生日快樂」→ 黑醬口吻的生日信 → 「牠的故事」八張卡片（取自二版短片的畫面，沒有字幕）→ AR（原本的功能，介面重排）→ 「許個願」蠟燭（點一下吹熄，出現一句話；再點一下重新點亮）→ 「牠的短片」（重看、存下影片）→ 結尾。
- 主畫面圖示換成她們兩個加黑醬的剪紙畫像（`icons/`，含 maskable 版）；頁首的小圖示也是同一張。
- 字型：霞鶩文楷 TC 子集（只含頁面用到的 450 字，114 KB），標題、信、字幕都用它，和短片裡的字一致；缺字時退回系統字型。
- 沒有放日期，之後每年都能用。信不署名，由黑醬的口吻寫。
- `app.js`、`poses.json`、模型、model-viewer 都沒動；所有 id 保留。

## 檔案

- `work/heijiang-site-v3/src/`：`index.html`、`style.css`、`page.js`（蠟燭）、`hero.png`／`hero@1x.png`、`icons/`、`story/`。
- `work/heijiang-site-v3/build.py`：字型子集、雜湊檔名、組進 `cases/heijiang/site`；影片沿用 `work/heijiang-intro-v2/site` 與 `cases/heijiang/site/film/`。
- 畫像與故事卡片由 `work/heijiang-intro-v2/` 的引擎算出來：`node render.mjs test portrait,hero`、`node render.mjs clean <秒數,…>`。

## 部署

跟之前一樣：`python3 scripts/restore_assets.py --download`，再把 `cases/heijiang/site` 整個上傳到 Cloudflare Pages 的 `heijiang-always-here`。
