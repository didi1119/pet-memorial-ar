# 備份與恢復

三組完整備份（在 Release 以 184 個分段儲存）：

- `websites.zip`：黑醬、布布的完整獨立網站，包括 18 個動態模型檔與第三方授權文字。
- `originals.zip`：使用者提供的 9 個原始 GLB，以及可取得的原始參考圖。
- `editable.zip`：最新版黑醬可編輯副本、原始高細節 master、骨架 master、布布可編輯檔與處理基準，並包含重建／比較所需的歷史模型。

`assets/catalog.json` 按檔案記錄雜湊，`assets/SHA256SUMS` 核對完整下載包。恢復時只接受目錄中列出的檔案，不解開不明路徑，不覆蓋修改過的內容。

本機既有 3d-ar 工作區與所有舊版本保留。這次整理另建立 `/Users/kobee/Documents/Codex/pet-memorial-ar`，備份包保留在原工作區的 `outputs/寵物AR資產庫`。

還原工具會自動下載分段、核對每段雜湊、合併三個 ZIP，然後再次核對完整檔案。分段只是傳輸方式，不減少任何素材。已有完整 ZIP 的離線還原也支援。
