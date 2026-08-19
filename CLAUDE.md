# CLAUDE.md — 作品集維護規範

這是 Allen 的個人作品集。**這個檔案是給 AI Agent（你）看的維護指南。**
當 Allen 說「幫我更新作品集」「把某個專案加進作品集」「重建作品集」時，照這份規範執行。

---

## 這個專案怎麼運作（先讀懂架構）

資料驅動、零相依、純靜態，可直接部署到 GitHub Pages：

```
Portfolio/
  works.json          ← 單一資料來源。所有作品內容都寫在這裡（你主要編輯這個）
  build.mjs           ← 建置腳本：node build.mjs → 產生 HTML
  styles.css          ← 品牌樣式（配色已定義在 :root，通常不用改）
  index.html          ← 【產生物】作品牆，不要手改
  works/<slug>.html   ← 【產生物】各作品內頁，不要手改
  assets/works/<slug>/cover.*  ← 各作品封面圖
  sitemap.xml         ← 【產生物】
  CLAUDE.md           ← 本檔
```

**鐵則：只編輯 `works.json` 和 `assets/`，永遠不要手改 `index.html` 或 `works/*.html`——它們每次 build 會被覆蓋。**

---

## 維護流程（標準作業）

### A. 新增一個作品

1. **找到專案資料夾**：作品來自 `C:\Users\weilu\Desktop\SideProject\` 下的各專案資料夾。
2. **讀檔萃取內容**，依序找尋可用資訊（不要只看一個檔）：
   - `README.md`、`CLAUDE.md`、`AGENTS.md`（最常有專案說明）
   - `package.json`（看技術棧、專案名）
   - 主要原始碼（`App.tsx`、`index.html`、`app.py` 等）了解它實際做什麼
   - **重要**：很多 README 是樣板（如 "Run and deploy your AI Studio app"、Vite 預設說明），這種要忽略，改從原始碼與資料夾結構判斷專案真正在做什麼，**用你自己的話寫給人看的描述**，不要照抄樣板。
3. **截圖當封面**（可選但建議）：若專案能跑或有現成截圖，存到 `assets/works/<slug>/cover.webp`（或 .png/.svg）。沒有就先留空，build 會自動產生品牌色字母佔位圖。
4. **在 `works.json` 的 `works` 陣列加一筆**（欄位見下方 schema）。
5. **跑建置**：在 `Portfolio/` 執行 `node build.mjs`。
6. 把新增/更新的檔案交給 Allen（present_files）。

### B. 補完或修改既有作品

直接改 `works.json` 對應條目 → 重新 `node build.mjs`。
（注意：目前 `pawlive` 的描述是佔位文字，標註「待補」，下次維護時應讀原始碼補完。）

### C. 批次掃描（Allen 說「把我所有專案整理進來」時）

逐一掃 `SideProject/` 下每個資料夾，判斷哪些適合公開展示（個人理財、報稅等隱私專案要先問 Allen 要不要收錄），其餘比照流程 A 加入。

---

## works.json 資料結構

```jsonc
{
  "profile": {
    "name": "Allen",
    "siteUrl": "https://allen.github.io",   // GitHub Pages 網址，影響 canonical / sitemap
    "tagline": "一句話定位",
    "bio": "首頁自我介紹段落",
    "links": [
      { "label": "寄信給我", "url": "mailto:..." },
      { "label": "GitHub", "url": "https://...", "nav": true }  // nav:true 會出現在頂部選單
    ]
  },
  "works": [
    {
      "slug": "kebab-case-英數",        // 必填，唯一，會變成 works/<slug>.html 的檔名
      "type": "work",                   // 可選，work（預設）或 skill；首頁可與主題交叉篩選
      "title": "作品名稱",               // 必填
      "categories": ["分類A", "分類B"],  // 必填，自動產生篩選按鈕與標籤配色
      "summary": "卡片上的一句話",        // 必填
      "cover": "assets/works/<slug>/cover.svg",  // 可選，留空則用佔位圖
      "description": "作品內頁主文。用 \\n 分段，描述動機、做了什麼、過程。",
      "highlights": ["亮點1", "亮點2"],  // 可選，內頁條列
      "tools": ["React", "Gemini API"], // 可選，技術棧藥丸
      "links": [                         // 可選，第一個會是橘色主按鈕
        { "label": "前往作品", "url": "..." },
        { "label": "查看原始碼", "url": "..." }
      ],
      "date": "2026-06",                 // 可選，YYYY-MM，用於排序
      "featured": true                   // 可選，true 會置頂並標★精選
    }
  ]
}
```

排序規則：精選優先，再依 `date` 由新到舊（build.mjs 自動處理）。

---

## 品牌配色（來自 AllenSpeacial.json，已寫進 styles.css）

| 用途 | 色碼 |
|------|------|
| 頁面背景（暖奶油） | `#F6F0DA` |
| 主色（霧藍） | `#6F91B5` |
| 深藍 | `#28738A` |
| 輔色（鼠尾草綠） | `#89C0B7` |
| 淺青 | `#B7E1E4` |
| 草綠 | `#C7DB95` |
| 點綴 / CTA（橘） | `#FF8838` |
| 主文字（近黑） | `#1C2325` |

要調整風格時改 `styles.css` 的 `:root` 變數即可，不要散落在各處硬寫色碼。

---

## 部署與安全架構（Zeabur + Google OAuth 白名單保護）

專案具備伺服器端守衛 (`server.mjs`)，在公網上線時僅限授權的 Google 帳號訪問：

1. **架構模式**：
   - 伺服器啟動入口：`npm start`（執行 `server.mjs`，若無靜態檔案會自動跑 `build.mjs`）。
   - 身分驗證：Google OAuth 2.0 + Signed Session Cookie。
   - 存取限制：比對登入者 Email 是否在 `ALLOWED_EMAILS` 白名單中，未授權者一律 403 阻擋，靜態檔案與作品資料完全受到伺服器中介層保護。

2. **Zeabur 環境變數設定**：
   - `PORT`: `3000` (Zeabur 自動注入)
   - `BASE_URL`: Zeabur 服務網址（如 `https://portfolio.zeabur.app`）
   - `GOOGLE_CLIENT_ID`: Google Cloud Console 申請之 OAuth 用戶端 ID
   - `GOOGLE_CLIENT_SECRET`: Google Cloud OAuth 用戶端密鑰
   - `SESSION_SECRET`: 加密 Session 的隨機密鑰字串
   - `ALLOWED_EMAILS`: 允許登入的 Google 信箱（例如 `mouslun0509@gmail.com`，多個信箱以逗號分隔）

3. **Google Cloud Console 設定**：
   - 建立 OAuth 2.0 用戶端 ID（網頁應用程式）。
   - 「已授權的重新導向 URI」設定為：
     - 本機測試：`http://localhost:3000/auth/google/callback`
     - 線上環境：`https://<你的zeabur網址>/auth/google/callback`

4. **更新與維護流程**：
   - 改 `works.json` → `npm run build` → `git add . && git commit -m "..." && git push origin main`。
   - Zeabur 會自動拉取並重啟服務。

