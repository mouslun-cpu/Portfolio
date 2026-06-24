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

const allCats = [...new Set(works.flatMap((w) => w.categories || []))];
const tagColor = (cat) => {
  const palette = ["--tag-1", "--tag-2", "--tag-3", "--tag-4", "--tag-5", "--tag-6"];
  return "var(" + palette[allCats.indexOf(cat) % palette.length] + ")";
};

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
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${prefix}styles.css">
</head>
<body>`;

const header = (prefix = "") => `
<header class="site-header"><div class="wrap">
  <a class="brand" href="${prefix}index.html">${esc(profile.name)}<span>.</span></a>
  <nav class="nav">
    <a href="${prefix}index.html#works">作品</a>
    <a href="${prefix}index.html#about">Profile</a>
    ${(profile.links || []).filter(l => l.nav).map(l => `<a href="${esc(l.url)}">${esc(l.label)}</a>`).join("")}
  </nav>
</div></header>`;

const footer = () => `
<footer class="site-footer"><div class="wrap">
  <div>© ${new Date().getFullYear()} ${esc(profile.name)}．個人作品集</div>
  <div>${(profile.links || []).map(l => `<a href="${esc(l.url)}">${esc(l.label)}</a>`).join("　")}</div>
</div></footer>
</body></html>`;

const card = (w) => {
  const tags = (w.categories || []).map(c =>
    `<span class="tag" style="background:${tagColor(c)}">${esc(c)}</span>`).join("");
  const thumb = w.cover
    ? `<div class="thumb"><img src="${esc(w.cover)}" alt="${esc(w.title)} 封面" loading="lazy"></div>`
    : `<div class="thumb placeholder">${esc(w.title.slice(0, 1))}</div>`;
  return `<a class="card" href="works/${esc(w.slug)}.html" data-cats="${esc((w.categories || []).join("|"))}">
    ${thumb}
    <div class="body">
      ${w.featured ? `<span class="featured-badge">★ 精選</span>` : ""}
      <div class="tags">${tags}</div>
      <h3>${esc(w.title)}</h3>
      <p>${esc(w.summary)}</p>
      ${w.date ? `<div class="meta">${esc(w.date)}</div>` : ""}
    </div>
  </a>`;
};

/* ---------- index.html ---------- */
const sorted = [...works].sort((a, b) =>
  (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (b.date || "").localeCompare(a.date || ""));

const chips = ["全部", ...allCats]
  .map((c, i) => `<button class="chip${i === 0 ? " active" : ""}" data-cat="${c === "全部" ? "" : esc(c)}">${esc(c)}</button>`)
  .join("");

const avatarHtml = profile.avatar
  ? `<img src="${esc(profile.avatar)}" alt="${esc(profile.name)}">`
  : esc(profile.name.slice(0, 1));

const index = `${head(`${profile.name}｜個人作品集 Profile`, profile.bio, SITE ? SITE + "/" : "")}
${header()}
<main>
  <section class="hero wrap" id="about">
    <span class="eyebrow">Profile</span>
    <div class="profile-head">
      <div class="avatar">${avatarHtml}</div>
      <div class="profile-id">
        <h1>${esc(profile.name)}<span class="accent">.</span></h1>
        ${profile.role ? `<div class="role">${esc(profile.role)}</div>` : ""}
      </div>
    </div>
    <div class="tagline">${esc(profile.tagline)}</div>
    <p class="bio">${esc(profile.bio)}</p>
    <div class="hero-links">
      ${(profile.links || []).map((l, i) =>
        `<a class="btn${i === 0 ? " primary" : ""}" href="${esc(l.url)}">${esc(l.label)}</a>`).join("")}
    </div>
  </section>
  <section class="wrap" id="works">
    <h2 class="section-title">作品</h2>
    <p class="section-sub">共 ${works.length} 件．依精選與時間排序</p>
    <div class="filters">${chips}</div>
    <div class="grid" id="grid">
      ${sorted.map(card).join("\n")}
    </div>
  </section>
</main>
${footer()}
<script>
  const chips = document.querySelectorAll(".chip");
  const cards = document.querySelectorAll(".card");
  chips.forEach(ch => ch.addEventListener("click", () => {
    chips.forEach(c => c.classList.remove("active"));
    ch.classList.add("active");
    const cat = ch.dataset.cat;
    cards.forEach(card => {
      const cats = (card.dataset.cats || "").split("|");
      card.style.display = (!cat || cats.includes(cat)) ? "" : "none";
    });
  }));
</script>`;

writeFileSync(join(ROOT, "index.html"), index);

/* ---------- 作品內頁 ---------- */
if (!existsSync(join(ROOT, "works"))) mkdirSync(join(ROOT, "works"));

const paraToHtml = (text = "") =>
  text.split("\n").filter(Boolean).map(p => `<p>${esc(p)}</p>`).join("\n");

for (const w of works) {
  const canonical = SITE ? `${SITE}/works/${w.slug}.html` : "";
  const tags = (w.categories || []).map(c =>
    `<span class="tag" style="background:${tagColor(c)}">${esc(c)}</span>`).join(" ");
  const cover = w.cover
    ? `<div class="work-cover"><img src="../${esc(w.cover)}" alt="${esc(w.title)} 封面"></div>` : "";
  const highlights = (w.highlights || []).length
    ? `<h2>作品亮點</h2><ul>${w.highlights.map(h => `<li>${esc(h)}</li>`).join("")}</ul>` : "";
  const tools = (w.tools || []).length
    ? `<h2>使用工具</h2><div class="tool-pills">${w.tools.map(t => `<span class="pill">${esc(t)}</span>`).join("")}</div>` : "";
  const links = (w.links || []).length
    ? `<div class="work-links">${w.links.map((l, i) =>
        `<a class="btn${i === 0 ? " primary" : ""}" href="${esc(l.url)}">${esc(l.label)}</a>`).join("")}</div>` : "";

  const page = `${head(`${w.title}｜${profile.name}`, w.summary, canonical, "../")}
${header("../")}
<main class="wrap">
  <section class="work-hero">
    <a class="back-link" href="../index.html">← 回作品牆</a>
    <h1>${esc(w.title)}</h1>
    <div class="tags">${tags}</div>
    ${w.date ? `<div class="meta" style="color:var(--muted);font-weight:600">${esc(w.date)}</div>` : ""}
  </section>
  ${cover}
  <section class="work-body">
    <h2>關於這個作品</h2>
    ${paraToHtml(w.description)}
    ${highlights}
    ${tools}
    ${links}
  </section>
</main>
${footer()}`;
  writeFileSync(join(ROOT, "works", `${w.slug}.html`), page);
}

/* ---------- sitemap ---------- */
if (SITE) {
  const urls = [`${SITE}/`, ...works.map(w => `${SITE}/works/${w.slug}.html`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `  <url><loc>${u}</loc></url>`).join("\n") + `\n</urlset>\n`;
  writeFileSync(join(ROOT, "sitemap.xml"), xml);
}

console.log(`✅ 建置完成：1 個首頁 + ${works.length} 個作品內頁`);
