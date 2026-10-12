# 霹靂神州：天罪自走棋（Pili Shenzhou Auto Chess）

以霹靂布袋戲「霹靂神州三部曲」為主題的 TFT 式自走棋網頁遊戲。
純前端（HTML + CSS + JavaScript），無需任何建置工具或後端，直接開啟即可遊玩。

## 檔案說明

| 檔案 | 說明 |
|---|---|
| `index.html` | 遊戲主頁（入口） |
| `data.js` | 角色、羈絆、技能等遊戲資料 |
| `main.js` | 遊戲主邏輯（商店、經濟、戰鬥、羈絆結算） |
| `style.css` | 樣式表 |
| `README.md` | 本說明文件 |

## 本機測試

直接用瀏覽器開啟 `index.html` 即可。
若要用本機伺服器測試（建議，避免部分瀏覽器對本機檔案的限制）：

```bash
# Python 3
python -m http.server 8000
# 然後開啟 http://localhost:8000
```

## 部署到 GitHub Pages（步驟）

1. **建立倉庫**：登入 GitHub → 右上角 `+` → `New repository`。
   - Repository name 例如 `pili-auto-chess`
   - 勾選 **Public**（Private 倉庫的 Pages 需付費方案）
   - 按 `Create repository`

2. **上傳檔案**：進入新倉庫 → `Add file` → `Upload files`，
   把本資料夾內的 **5 個檔案**（`index.html`、`data.js`、`main.js`、`style.css`、`README.md`）
   全部拖進去 → 下方 `Commit changes`。
   > ⚠️ 請上傳到倉庫**根目錄**，不要放進子資料夾，否則網址要多一層路徑。

3. **開啟 Pages**：倉庫 → `Settings` → 左側 `Pages`。
   - `Source` 選 **Deploy from a branch**
   - `Branch` 選 **main**、資料夾選 **/ (root)**
   - 按 `Save`

4. **取得網址**：等待約 1～2 分鐘，重新整理 Pages 頁面，會出現：
   ```
   https://你的帳號.github.io/pili-auto-chess/
   ```
   點擊即可遊玩。

## 常見錯誤排解

| 症狀 | 原因與解法 |
|---|---|
| 開啟網址顯示 **404** | Pages 尚未建置完成（等 1～2 分鐘）；或分支／資料夾選錯；或檔名不是 `index.html` |
| 畫面出現但**樣式全跑掉** | `style.css` 未上傳，或檔名大小寫不符（GitHub Pages 區分大小寫） |
| 主控台出現 **data.js / main.js 404** | 檔案未上傳到根目錄，或 `index.html` 內引用路徑不符 |
| 改了檔案但**畫面沒變** | 瀏覽器快取，按 `Ctrl+F5`（Mac：`Cmd+Shift+R`）強制重新整理 |
| 倉庫是 **Private** 導致 Pages 無法使用 | 改為 Public，或升級方案 |
| 檔名含**中文或空格** | 改為英文小寫檔名（如 `index.html`），避免路徑問題 |
| `git push` 被拒 | 先 `git pull --rebase` 再 push；或改用網頁上傳方式 |

## 更新遊戲

修改檔案後重新上傳（`Add file` → `Upload files` 覆蓋），或使用 Git：

```bash
git add .
git commit -m "更新遊戲內容"
git push
```

Pages 會自動重新建置，約 1 分鐘後生效。

## 版權聲明

本作為**非官方免費同人作品**，角色出處與羈絆設定為遊戲化改編，非嚴謹劇集考據。
霹靂相關名稱與角色版權歸原權利方所有。
