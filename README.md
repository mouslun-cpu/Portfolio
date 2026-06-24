# Allen 的個人作品集

一個資料驅動、零相依、純靜態的個人作品集網站，部署於 GitHub Pages。
設計給課程自我介紹使用，首頁以明確的 **Profile** 區呈現作者，下方為作品牆。

🔗 線上網址：<https://mouslun-cpu.github.io/Portfolio/>

## 怎麼運作

所有作品內容都集中在 **`works.json`**，跑 `node build.mjs` 就會產生靜態網頁。
不需要任何套件、不需要 GitHub Actions。

```
works.json   ← 內容來源（編輯這個）
build.mjs    ← node build.mjs → 產生 HTML
styles.css   ← 品牌樣式（配色在 :root）
index.html   ← 【產生物】作品牆
works/*.html ← 【產生物】各作品內頁
assets/      ← 封面圖
```

> ⚠️ 不要手改 `index.html` / `works/*.html`，它們每次建置都會被覆蓋。只改 `works.json` 與 `assets/`。

## 新增一件作品

1. 在 `works.json` 的 `works` 陣列加一筆（欄位說明見 `CLAUDE.md`）。
2. 把封面圖放到 `assets/works/<slug>/cover.svg`（或 .png/.webp），沒有就留空會用佔位圖。
3. 執行建置：

   ```bash
   node build.mjs
   ```

4. 提交並推送：

   ```bash
   git add -A && git commit -m "新增作品：<名稱>" && git push
   ```

## 部署到 GitHub Pages（首次設定）

1. 推上這個 repo 的 `main` 分支。
2. GitHub repo → **Settings → Pages** → Source 選 `Deploy from a branch` → 分支 `main`、資料夾 `/ (root)` → Save。
3. 等一兩分鐘，網站就會在 <https://mouslun-cpu.github.io/Portfolio/> 上線。

## 給 AI Agent 維護

`CLAUDE.md` 是給 AI 看的維護規範——可以直接請 AI「讀某個專案、整理進作品集」，
它會讀該專案的 README / 原始碼、寫出描述、更新 `works.json` 並重建。
