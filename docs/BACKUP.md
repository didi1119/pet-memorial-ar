# 備份與恢復

三組完整備份（在 Release 以 184 個分段儲存）：

- `websites.zip`：黑醬、布布的完整獨立網站，包括 18 個動態模型檔與第三方授權文字。
- `originals.zip`：使用者提供的 9 個原始 GLB，以及可取得的原始參考圖。
- `editable.zip`：最新版黑醬可編輯副本、原始高細節 master、骨架 master、布布可編輯檔與處理基準，並包含重建／比較所需的歷史模型。

`assets/catalog.json` 按檔案記錄雜湊，`assets/SHA256SUMS` 核對完整下載包。恢復時只接受目錄中列出的檔案，不解開不明路徑，不覆蓋修改過的內容。

本機既有 3d-ar 工作區與所有舊版本保留。這次整理另建立 `/Users/kobee/Documents/Codex/pet-memorial-ar`，備份包保留在原工作區的 `outputs/寵物AR資產庫`。

還原工具會自動下載分段、核對每段雜湊、合併三個 ZIP，然後再次核對完整檔案。分段只是傳輸方式，不減少任何素材。已有完整 ZIP 的離線還原也支援。

## 2026-10-04 雲端核對

全部 184 個分段已存入私人 GitHub Release，伺服器回傳的 SHA-256 與本機清單逐段一致。三個完整 ZIP 的合併、CRC 與內部檔案雜湊已在本機驗證；可編輯模型也已從 GitHub 實際重新下載並核對。詳見 `verification/cloud-backup-check.json`。原始檔與可編輯檔未進行全庫重下載測試，核對依據為全部分段的伺服器 SHA-256。

兩個網站已在乾淨的 GitHub 副本實際重新下載並恢復，47 個網站檔案及 48 個製作路徑別名全部核對一致。詳見 `verification/website-cloud-recovery-check.json`。

下載若因網路中斷而停止，可移走 `downloads/` 中未通過雜湊核對的分段，再重新執行；已核對的分段可繼續使用。這不需要刪除或改動原始模型。
