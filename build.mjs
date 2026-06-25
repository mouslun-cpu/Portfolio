#!/usr/bin/env node
/* ========================================================================
   build.mjs — 把 works.json 變成靜態網站（GitHub Pages 友善）
   用法：node build.mjs
   產出：index.html、works/<slug>.html、sitemap.xml
   零相依套件，只用 Node 內建模組。
   ======================================================================== */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(ROOT, "works.json"), "utf8"));
const { profile, works } = data;
const SITE = profile.siteUrl ? profile.siteUrl.replace(/\/$/, "") : "";

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* 排序：精選優先，再依 date 新到舊 */
const sorted = [...works].sort((a, b) =>
  (b.featured ? 1 : 0) - (a.featured ? 1 : 0) ||
  (b.date || "").localeCompare(a.date || ""));

/* 預設漸層色板 */
const GRADIENTS = [
  "linear-gradient(140deg,#5C7090,#43556E)",
  "linear-gradient(140deg,#5E8C7F,#456B5F)",
  "linear-gradient(140deg,#CF8A52,#B5713A)",
  "linear-gradient(140deg,#B5746A,#965248)",
  "linear-gradient(140deg,#7B7AB5,#565591)",
  "linear-gradient(140deg,#4D8B8B,#356060)",
];
const gradientOf = (w, i) => w.cardGradient || GRADIENTS[i % GRADIENTS.length];

const fmtDate = (d = "") => d.replace("-", ".");

/* ==text== → <mark>text</mark>（先 esc 再 replace） */
const taglineHtml = (text = "") =>
  esc(text).replace(/==(.+?)==/g, "<mark>$1</mark>");

/* ---- <head> ---- */
const head = (title, desc, canonical, prefix = "") => `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ""}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ""}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Noto+Serif+TC:wght@600;700&family=Noto+Sans+TC:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${prefix}styles.css">
</head>
<body>`;

/* ---- 頁首 ---- */
const siteHeader = (prefix = "") => {
  return `
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="${prefix}index.html">
      <span class="brand-logo">A</span>
      <span>${esc(profile.name.toUpperCase())}</span>
    </a>
  </div>
  <div class="header-rule"></div>
</header>`;
};

/* ---- 頁尾 ---- */
const siteFooter = () => `
<footer class="site-footer">
  <div class="wrap">
    <span>© ${new Date().getFullYear()} ${esc(profile.name)}</span>
  </div>
</footer>
</body></html>`;

/* ---- 精選大卡 ---- */
const featuredCard = (w, num) => {
  const grad = gradientOf(w, num - 1);
  const cats = (w.categories || []).join(" · ");
  const numStr = String(num).padStart(2, "0");
  const hasImg = w.cover && !w.cover.endsWith(".svg");
  const imgBg = hasImg
    ? `background: linear-gradient(rgba(0,0,0,.22), rgba(0,0,0,.5)), url('${esc(w.cover)}') center/cover no-repeat;`
    : `background:${grad};`;
  return `
<a class="card-featured" href="works/${esc(w.slug)}.html" data-cats="${esc((w.categories || []).join("|"))}">
  <div class="card-featured-img" style="${imgBg}">
    <div class="card-featured-title">${esc(w.title)}</div>
    <div class="card-featured-cat">${esc(cats)} · ${fmtDate(w.date || "")}</div>
  </div>
  <div class="card-featured-body">
    <div class="card-featured-body-left">
      <div class="card-featured-num">${numStr} — ${esc(cats)}</div>
      <div class="card-featured-body-title">${esc(w.title)}</div>
      <p class="card-featured-summary">${esc(w.summary)}</p>
    </div>
    <div class="card-featured-date">${fmtDate(w.date || "")}</div>
  </div>
</a>`;
};

/* ---- 小卡（3-col grid） ---- */
const smallCard = (w, num) => {
  const grad = gradientOf(w, num - 1);
  const firstCat = (w.categories || [])[0] || "";
  const numStr = String(num).padStart(2, "0");
  const hasImg = w.cover && !w.cover.endsWith(".svg");
  const imgBg = hasImg
    ? `background: linear-gradient(rgba(0,0,0,.2), rgba(0,0,0,.48)), url('${esc(w.cover)}') center/cover no-repeat;`
    : `background:${grad};`;
  return `
<a class="card-small" href="works/${esc(w.slug)}.html" data-cats="${esc((w.categories || []).join("|"))}">
  <div class="card-small-img" style="${imgBg}">
    <div class="card-small-img-title">${esc(w.title)}</div>
  </div>
  <div class="card-small-num">${numStr} — ${esc(firstCat)}</div>
  <div class="card-small-summary">${esc(w.summary)}</div>
  <div class="card-small-date">${fmtDate(w.date || "")}</div>
</a>`;
};

/* ================================================================
   INDEX.HTML
   ================================================================ */
const allCats = [...new Set(works.flatMap(w => w.categories || []))];
const chips = ["全部", ...allCats].map((c, i) =>
  `<button class="chip${i === 0 ? " active" : ""}" data-cat="${c === "全部" ? "" : esc(c)}">${esc(c)}</button>`
).join("");

const meta = profile.meta || {};
const metaCells = [
  { label: "領域 / FIELD", value: meta.field || profile.role || "AI 應用開發" },
  { label: "範疇 / SCOPE", value: meta.scope || "設計 + 前端" },
  { label: "工具 / STACK", value: meta.stack || "React · LLM" },
  { label: "作品 / WORKS", value: `${String(works.length).padStart(2, "0")} 件` },
].map(m => `<div class="meta-cell">
    <div class="meta-cell-label">${esc(m.label)}</div>
    <div class="meta-cell-value">${esc(m.value)}</div>
  </div>`).join("");

const [firstWork, ...restWorks] = sorted;

const index = `${head(`${profile.name} Portfolio`, profile.bio || "", SITE ? SITE + "/" : "")}
${siteHeader()}
<main>

  <!-- HERO -->
  <section class="hero wrap" id="about">
    <div class="hero-top">
      <span class="hero-sub-name">My</span>
    </div>
    <h1 class="hero-title">Portfolio<span class="dot">.</span></h1>
    <h2 class="hero-tagline">${taglineHtml(profile.tagline)}</h2>
    <p class="hero-bio">${esc(profile.bio)}</p>
  </section>

  <!-- WORKS -->
  <section class="wrap" id="works">
    <div class="section-divider">
      <span class="divider-label">SELECTED WORK</span>
      <span class="divider-line"></span>
      <span class="divider-right">共 ${works.length} 件作品</span>
    </div>
    <div class="filters">${chips}</div>
    <div class="works-grid">
      ${sorted.map((w, i) => smallCard(w, i + 1)).join("\n")}
    </div>
  </section>

</main>
${siteFooter()}
<script>
const chips = document.querySelectorAll(".chip");
const allCards = document.querySelectorAll(".card-small");
chips.forEach(ch => ch.addEventListener("click", () => {
  chips.forEach(c => c.classList.remove("active"));
  ch.classList.add("active");
  const cat = ch.dataset.cat;
  allCards.forEach(card => {
    const cats = (card.dataset.cats || "").split("|");
    card.style.display = (!cat || cats.includes(cat)) ? "" : "none";
  });
}));
</script>`;

writeFileSync(join(ROOT, "index.html"), index);

/* ================================================================
   WORKS/*.HTML
   ================================================================ */
if (!existsSync(join(ROOT, "works"))) mkdirSync(join(ROOT, "works"));

const paraToHtml = (text = "") =>
  text.split("\n").filter(Boolean).map(p => `<p>${esc(p)}</p>`).join("\n");

for (const [idx, w] of sorted.entries()) {
  const num = idx + 1;
  const numStr = String(num).padStart(2, "0");
  const canonical = SITE ? `${SITE}/works/${w.slug}.html` : "";
  const cats = (w.categories || []).join(" · ");
  const grad = gradientOf(w, idx);

  /* 封面：有真實圖（非 SVG 佔位）就顯示 img，否則用漸層 */
  const isRealCover = w.cover && !w.cover.endsWith(".svg");
  const coverContent = isRealCover
    ? `<img src="../${esc(w.cover)}" alt="${esc(w.title)} 封面">`
    : `<div class="work-cover-inner"><span class="work-cover-title">${esc(w.title)}</span></div>`;

  const highlightsHtml = (w.highlights || []).length
    ? `<div class="work-highlights">${w.highlights.map(h =>
        `<div class="work-highlight-item">
          <span class="work-highlight-dot"></span>
          <span class="work-highlight-text">${esc(h)}</span>
        </div>`).join("")}</div>` : "";

  const toolsHtml = (w.tools || []).length
    ? `<div class="tool-pills">${w.tools.map(t => `<span class="pill">${esc(t)}</span>`).join("")}</div>` : "";

  const linksHtml = (w.links || []).length
    ? w.links.map((l, i) =>
        `<a class="btn ${i === 0 ? "primary" : "secondary"}" href="${esc(l.url)}">${esc(l.label)} ↗</a>`
      ).join("") : "";

  const page = `${head(`${w.title}｜${profile.name}`, w.summary, canonical, "../")}
${siteHeader("../")}
<main class="wrap">

  <div class="work-header">
    <div class="work-breadcrumb">
      <a href="../index.html">← WORK</a>&nbsp;&nbsp;/&nbsp;&nbsp;${numStr} ${esc(w.title)}
    </div>
    <div class="work-cat">${esc(cats)}</div>
    <h1 class="work-title">${esc(w.title)}</h1>
    <div class="work-date">${fmtDate(w.date || "")} · 個人專案</div>
  </div>

  <div class="work-cover-wrap" style="${isRealCover ? "" : `background:${grad};`}">
    ${coverContent}
  </div>
  <div class="work-cover-caption">FIG. ${numStr} — 產品主畫面</div>

  <div class="work-body-grid">
    <div class="work-body-main">
      <div class="work-section-label">關於這個作品</div>
      ${paraToHtml(w.description)}
    </div>
    ${(w.highlights || []).length ? `
    <div class="work-body-aside">
      <div class="work-section-label-muted">作品亮點</div>
      ${highlightsHtml}
    </div>` : ""}
  </div>

  ${(w.screenshots || []).length ? `
  <div class="work-screenshots">
    <div class="work-screenshots-label">操作畫面</div>
    <div class="work-screenshots-grid">
      ${(w.screenshots).map((s, si) => `
      <figure class="work-screenshot-item">
        <img src="../${esc(s.src)}" alt="${esc(s.caption || w.title + ' 畫面 ' + (si+1))}" loading="lazy">
        ${s.caption ? `<figcaption>${esc(s.caption)}</figcaption>` : ""}
      </figure>`).join("")}
    </div>
  </div>` : ""}

  <div class="work-footer">
    ${toolsHtml ? `<div class="work-footer-section">
      <div class="work-footer-label">使用工具</div>
      ${toolsHtml}
    </div>` : ""}
    <div class="work-footer-section">
      <div class="work-footer-label">角色</div>
      <div class="work-role-text">設計 + 前端開發</div>
    </div>
    ${linksHtml ? `<div class="work-actions">${linksHtml}</div>` : ""}
  </div>

</main>
${siteFooter()}`;

  writeFileSync(join(ROOT, "works", `${w.slug}.html`), page);
}

/* ================================================================
   SITEMAP
   ================================================================ */
if (SITE) {
  const urls = [`${SITE}/`, ...sorted.map(w => `${SITE}/works/${w.slug}.html`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `  <url><loc>${u}</loc></url>`).join("\n") + `\n</urlset>\n`;
  writeFileSync(join(ROOT, "sitemap.xml"), xml);
}

console.log(`✅ 建置完成：1 個首頁 + ${works.length} 個作品內頁`);
