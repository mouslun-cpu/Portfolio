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

## 部署到 GitHub Pages

1. 把整個 `Portfolio/` 資料夾推上 GitHub repo。
2. Repo Settings → Pages → Source 選 `main` 分支、`/ (root)` 資料夾。
3. 若 repo 名不是 `<帳號>.github.io`，網址會是 `https://<帳號>.github.io/<repo>/`，
   此時要把 `works.json` 的 `siteUrl` 設成該網址（影響 canonical 與 sitemap）。
4. 之後每次更新：改 `works.json` → `node build.mjs` → git commit & push。

> 不需要 GitHub Actions，也不需要任何套件安裝——build.mjs 只用 Node 內建模組。
