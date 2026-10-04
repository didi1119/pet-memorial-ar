# 寵物客製製作流程

1. 收集寵物名稱、主人稱呼、想念文字、參考照片，以及模型與素材的使用資訊。
2. 複製 `cases/heijiang` 或 `cases/bubu` 作為新案例。保留現有案例作為基準；新案例使用新的資料夾與網站專案。
3. 檢查新模型的細節、紋理、方向、比例與姿勢。以原始 GLB 保留高畫質來源，另準備行動裝置版。
4. 依各姿勢辨識頭、頸、耳、胸、尾與接地區域，調整權重。下巴、嘴邊毛及鬍鬚要跟隨頭部；腳底／靠地的頭部要保持接地。
5. 呼吸、左右看與小幅動作做成一段循環 Idle。沿用已確認的動作風格，不直接套用舊模型的空間座標。
6. 匯出帶動畫的 GLB 與 USDZ，保留 Blender 可編輯檔。檢查貼圖、循環、地面接觸、變形、檔案大小與兩種格式。
7. 修改 HTML／app 的寵物名稱、主人稱呼、紀念文字與姿勢名稱；同步修改 `poses.json`。這些既有案例的文案部分直接在程式內，不能只改 `case.json` 就視為完成。
8. 為每個姿勢確認起始鏡頭、縮圖與重設行為。布布翻肚肚目前為 `-80deg 40deg 95%`。
9. 用新的資產雜湊檔名打包，部署到獨立 HTTPS 網址，驗證公開檔案與 iPhone／Android 實機 AR。
10. 每次交付保留版本標籤、資產目錄、可編輯檔與預覽畫面，再更新私人資產庫。

## 已保存的製作工具

- `work/process_cat.py`：通用模型匯入、行動版輸出與貼圖處理。
- `work/create_idle_v5.py`、`work/idle-v5-motion-config.json`、`work/motion-geometry/landmarks.json`：黑醬原先確認的骨架與動作参数。
- `work/ambient-v7/`：黑醬現行 32 秒自然混合動作；原 V6 基準留在 `work/pre-v7-ambient/poses/`。
- `work/bubu/inspect.py`、`animate.py`：布布模型處理與分姿勢動畫。
- `work/bubu/build_site.py`：從已保存的介面模板建立布布完整網站。

Python／Blender 程式的專案根目錄已改為相對路徑；原始 Downloads 輸入對應到 `assets/originals/`。Blender、USD 工具等外部程式仍需要在執行電腦安裝與設定。個別歷史檢查可能依賴舊版本輸出，先閱讀檔頭與路徑，不把全部歷史工具視為一鍵自動流程。

最新黑醬 `.blend` 是從現行 V7 GLB 匯入的可編輯副本；原始高細節 master、V5 骨架 master 亦保留。網站使用的原 GLB／USDZ 未因此重新匯出或改動。
