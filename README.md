# 寵物 AR 客製資產庫

資產持有人：didi1119。私人保存；依你的指示整理黑醬與布布的網站、原始模型、動畫、可編輯檔、製作程式及已完成的檢查紀錄。

| 案例 | 主人 | 姿勢 | 已發布網站 |
| --- | --- | --- | --- |
| 黑醬 | 琦琦、蓓蓓 | 6 | https://heijiang-always-here.pages.dev/ |
| 布布 | Tiffany、Jeremy | 3 | https://bubu-always-here.pages.dev/ |

整理資產庫不會更動這兩個網站。黑醬保留已確認的 V7 自然動作；布布保留 V3 下巴跟隨及翻肚肚角度修正版。

[查看中文資產總表](資產總表.md)

## 這裡保存什麼

- `cases/`：兩個可獨立搬移的網站與個案設定。
- `work/`：模型處理、骨架／動畫製作、網站打包的原始程式與參數。
- `assets/catalog.json`：每個檔案的用途、大小、SHA-256 與備份位置。
- `assets/bundles.json`：三個大型下載包的完整性紀錄。
- `assets/editable/heijiang/`：從現行 V7 動態模型建立的可編輯 Blender 版本；下載備份後可使用。
- `previews/`：目前作品的畫面紀錄。
- `verification/`：模型、動作、公開發布及下巴修正的檢查紀錄。
- `docs/`：資產權限、恢復方式與後續客製流程。

## 在另一台電腦恢復

1. 登入你的 GitHub，複製這個私人專案。
2. 安裝 Python 3 與 GitHub CLI，讓 `gh` 登入此帳號。
3. 在專案資料夾執行：

```sh
python3 scripts/restore_assets.py --download
python3 scripts/verify_assets.py
```

這會從本專案的 `v2026.10.04` Release 下載三個包，先核對整包與每個檔案，再恢復大型資產。預設不覆蓋已被修改的檔案。

也可以手動下載 Releases 中的 `websites.zip`、`originals.zip`、`editable.zip`，放入 `downloads/` 後執行 `python3 scripts/restore_assets.py`。

## 本機查看

```sh
python3 -m http.server 8000 --directory cases/bubu/site
# 黑醬改用 cases/heijiang/site
```

瀏覽器打開 http://127.0.0.1:8000/ 可查看網站。手機相機 AR 需 HTTPS 和實際裝置；本機預覽與模型檢查不能代替實機驗證。

## 之後做客製服務

先閱讀 [客製製作流程](docs/CUSTOMIZATION.md)。可沿用紀念頁介面、姿勢切換、AR 入口與部署方式；每隻寵物的骨架、動作、接地與鏡頭需依模型調整。這是已完成案例的資產與製作模板，尚未包含接單、收款或自動生成平台。

大型模型放在私人 Release，避免 Git 歷史反覆累積大型二進位檔；GitHub 官方文件說明了 [Release 資產與檔案上限](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)。不使用付費 Git LFS 或付費模型儲存。
