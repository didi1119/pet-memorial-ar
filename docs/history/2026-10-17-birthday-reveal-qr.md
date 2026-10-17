# 黑醬生日：臨時揭曉與QR

## 使用方式

- 給主辦方的中性入口： https://a-little-note.kobeyoga.workers.dev/
- 原生日網址： https://heijiang-always-here.pages.dev/
- 揭曉前只有中性等待卡；原網址、index.html、照片、影片、模型、QR素材一併由伺服器保護。
- 主人現場輸入自己指定的密碼成功一次，即永久公開這個生日網站。新手機／新瀏覽器皆不用密碼；不要為了事先試看而在正式網站輸入正確密碼。
- 公開後中性入口會轉到生日頁。沒有自動再次鎖定、沒有到期日，不必在活動後再請人解鎖。
- AR區旁有「把黑醬帶在身邊」QR小卡；按放大可投影給全場掃描。Escape、收起、點外圍可關閉，鍵盤焦點返回原按鈕。
- 可下載完整紙卡：`cases/heijiang/site/take-heijiang-card.png`；標準QR PNG／SVG也保留。QR指向原生日網址，揭曉後直接開。

## 保護的範圍

使用者確認GitHub維持公開，所以這是網站入口的防提前揭曉，**不是原始內容的全面保密**。公開repo中的原始生日內容、先前已下載檔案與舊部署快照無法由本次入口保護收回。沒有更改GitHub可見性。

Pages `_worker.js`攔截全部路徑，使用D1記錄生日網站是否已揭曉。密碼以獨立隨機salt與SHA-256摘要比對，值只放Pages伺服器秘密設定／忽略的本機`.dev.vars`，不寫前端或Git；測試程式只使用示例密碼。每來源15分鐘最多10次錯誤猜測，POST驗同來源；伺服器設定／D1異常時封閉，不放行素材。

`a-little-note`是獨立的中性入口Worker，只代理已標記為鎖定的等待卡，其他未知回應不轉送；揭曉成功才轉向原網址。只新增此入口與黑醬專用D1，未動布布或其他專案。

## 部署與維護

- Pages專案仍是既有`heijiang-always-here`；`wrangler.jsonc`管理D1綁定。
- D1：`heijiang-birthday-reveal`，初始化檔`work/birthday-reveal/schema.sql`，正式揭曉記錄id為`birthday-2026`，預覽hostname使用獨立id。
- 中性入口設定：`work/birthday-reveal/entrance/wrangler.jsonc`。
- 發布：`wrangler pages deploy cases/heijiang/site --project-name heijiang-always-here --branch main`。
- 保存原Models SHA、不重製動畫，不使用第三方QR產生服務。12個GLB/USDZ與來源逐一SHA一致，所有發布檔案小於25MiB。
- 新增素材已同步到`work/heijiang-site-v3/src`與既有build.py流程。原完整字型建置仍需該流程原本的霞鶩字型來源；本次沿用現行字型與既有雜湊資產。
- 沒有升級／購買方案。本次狀態庫使用[D1免費額度](https://developers.cloudflare.com/d1/platform/pricing/)；流量仍受帳號既有額度限制。

## 驗證

- Node測試13項通過：鎖定內容、圖片與影片／模型阻擋、錯誤密碼、揭曉後新訪客、同來源與頻率限制、故障封閉、原始碼不供應、中性入口未知回應封閉、瀏覽器Origin正確。
- 真正本機Wrangler+D1：錯碼→錯誤卡；主人指定密碼→揭曉；另一390px新context無密碼直接開，QR放大／收起正常；蠟燭與6姿勢保留。未宣稱這次重新做手機實體AR硬體驗收。
- QR原圖104／112／140／240／440尺寸與實際投影對話框截圖皆可由獨立解碼器解出正式URL；完整紙卡PNG也已獨立解碼。
- 已視覺檢查1440投影版、390手機版與等待頁，手機沒有水平溢出。
- 正式線上：中性與原網址等待頁200，錯碼401，index／圖片／影片／模型／QR403；遠端revealed_scopes=0。沒有在正式站輸入正確密碼。
- 實測紀錄與畫面在`verification/birthday-reveal/`。最後發布快照：`https://881f35ee.heijiang-always-here.pages.dev`，正式仍使用固定原網址。
