import express from 'express';
import cookieSession from 'cookie-session';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 自動確保 build 產物存在
if (!fs.existsSync(path.join(__dirname, 'index.html'))) {
  console.log('⚡ index.html 不存在，正在執行自動建置 (node build.mjs)...');
  try {
    execSync('node build.mjs', { cwd: __dirname, stdio: 'inherit' });
  } catch (err) {
    console.error('❌ 建置失敗:', err);
  }
}

const app = express();

// 確保 PORT 為合法數字 (相容 Zeabur 與本機環境)
let rawPort = process.env.PORT;
if (!rawPort || isNaN(Number(rawPort))) {
  rawPort = 3000;
}
const PORT = Number(rawPort);


// Trust proxy for secure cookies on Zeabur/Cloud platforms
app.set('trust proxy', 1);

// Cookie Session 設定 (30 天有效)
const SESSION_SECRET = process.env.SESSION_SECRET || 'portfolio-auth-secret-key-2026-allen';
const isProduction = process.env.NODE_ENV === 'production' || (process.env.BASE_URL && process.env.BASE_URL.startsWith('https'));

app.use(
  cookieSession({
    name: 'portfolio_session',
    keys: [SESSION_SECRET],
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 取得基礎網址
function getBaseUrl(req) {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL.replace(/\/+$/, '');
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}`;
}

// 取得白名單清單
function getAllowedEmails() {
  const raw = process.env.ALLOWED_EMAILS || '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

// 檢查 Email 是否在白名單內
function isEmailAllowed(email) {
  if (!email) return false;
  const allowed = getAllowedEmails();
  if (allowed.length === 0) {
    console.warn('⚠️ ALLOWED_EMAILS 未設定，拒絕所有訪問！請在環境變數中設定授權 Email。');
    return false;
  }
  return allowed.includes(email.toLowerCase());
}

// 認證頁面通用樣式
const AUTH_PAGE_STYLE = `
  :root {
    --bg-page: #F6F0DA;
    --primary: #6F91B5;
    --deep-blue: #28738A;
    --accent: #FF8838;
    --text: #1C2325;
    --muted: #5C7090;
    --card-bg: #FFFFFF;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", "Helvetica Neue", sans-serif;
    background: var(--bg-page);
    color: var(--text);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
  }
  .auth-card {
    background: var(--card-bg);
    max-width: 440px;
    width: 100%;
    border-radius: 20px;
    padding: 2.5rem 2rem;
    box-shadow: 0 12px 36px rgba(40, 115, 138, 0.12);
    text-align: center;
    border: 1px solid rgba(111, 145, 181, 0.2);
  }
  .avatar {
    width: 68px;
    height: 68px;
    margin: 0 auto 1.25rem;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary), var(--deep-blue));
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.75rem;
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(40, 115, 138, 0.25);
  }
  .title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--deep-blue);
    margin-bottom: 0.5rem;
  }
  .subtitle {
    font-size: 0.95rem;
    color: var(--muted);
    line-height: 1.6;
    margin-bottom: 2rem;
  }
  .btn-google {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    padding: 0.85rem 1.25rem;
    background: #FFFFFF;
    color: #374151;
    border: 1.5px solid #D1D5DB;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.04);
  }
  .btn-google:hover {
    background: #F9FAFB;
    border-color: #9CA3AF;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.08);
  }
  .btn-primary {
    display: inline-block;
    width: 100%;
    padding: 0.85rem 1.25rem;
    background: var(--accent);
    color: #FFFFFF;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.2s ease;
    margin-top: 0.75rem;
  }
  .btn-primary:hover {
    background: #E67628;
    transform: translateY(-1px);
  }
  .badge-warning {
    display: inline-block;
    background: #FEF3C7;
    color: #92400E;
    padding: 0.35rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.85rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }
  .email-tag {
    background: #E5E7EB;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    font-family: monospace;
    font-size: 0.9rem;
    color: #1F2937;
  }
  .footer-note {
    font-size: 0.8rem;
    color: #9CA3AF;
    margin-top: 1.75rem;
  }
`;

// ==================== 認證相關路由 ====================

// 登入頁面
app.get('/auth/login', (req, res) => {
  if (req.session?.user?.authenticated && isEmailAllowed(req.session.user.email)) {
    return res.redirect('/');
  }

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>作品集存取驗證 - Allen</title>
  <style>${AUTH_PAGE_STYLE}</style>
</head>
<body>
  <div class="auth-card">
    <div class="avatar">A</div>
    <h1 class="title">Allen 的作品集</h1>
    <p class="subtitle">本專案設有隱私保護機制，僅限經授權的 Google 帳號登入查閱。</p>
    
    <a href="/auth/google" class="btn-google">
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>
      使用 Google 帳號登入
    </a>

    <div class="footer-note">受授權保護的私人展示專案</div>
  </div>
</body>
</html>`;
  res.send(html);
});

// 發起 Google OAuth 授權請求
app.get('/auth/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).send('❌ 伺服器未設定 GOOGLE_CLIENT_ID 環境變數。請在 Zeabur 或 .env 設定。');
  }

  const redirectUri = `${getBaseUrl(req)}/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
    access_type: 'online',
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// Google OAuth 回呼處理
app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.redirect('/auth/login');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${getBaseUrl(req)}/auth/google/callback`;

  try {
    // 1. 交換 Token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Google token exchange error:', tokenData);
      return res.status(400).send(`Google 授權失敗: ${tokenData.error_description || tokenData.error || '未知錯誤'}`);
    }

    // 2. 獲取用戶資料
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    if (!userData.email) {
      return res.status(400).send('無法從 Google 取得 Email 資訊。');
    }

    const email = userData.email.toLowerCase();

    // 3. 白名單核對
    if (isEmailAllowed(email)) {
      req.session.user = {
        email: email,
        name: userData.name || 'Allen',
        picture: userData.picture || '',
        authenticated: true,
      };
      return res.redirect('/');
    }

    // 4. 未獲授權 (403 畫面)
    const unauthorizedHtml = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>存取權限受限 - Allen 作品集</title>
  <style>${AUTH_PAGE_STYLE}</style>
</head>
<body>
  <div class="auth-card">
    <div class="badge-warning">權限不足</div>
    <h1 class="title" style="color: #B91C1C;">存取未獲授權</h1>
    <p class="subtitle">
      您目前登入的 Google 帳號 <span class="email-tag">${email}</span> 不在授權白名單內。<br><br>
      若這是您的作品集，請確認伺服器 <code>ALLOWED_EMAILS</code> 設定是否包含此信箱。
    </p>

    <a href="/auth/google" class="btn-primary">切換其他 Google 帳號</a>
    <a href="/auth/logout" class="btn-google" style="margin-top: 0.75rem;">登出</a>
  </div>
</body>
</html>`;
    return res.status(403).send(unauthorizedHtml);
  } catch (err) {
    console.error('Auth callback exception:', err);
    return res.status(500).send('伺服器在處理 Google 登入時發生錯誤。');
  }
});

// 登出路由
app.get('/auth/logout', (req, res) => {
  req.session = null;
  res.redirect('/auth/login');
});

// ==================== PWA 公開圖示與 Manifest 路由 ====================
const SVG_APP_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3A8A9E"/>
      <stop offset="50%" stop-color="#28738A"/>
      <stop offset="100%" stop-color="#184E5E"/>
    </linearGradient>
    <linearGradient id="accent-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFA463"/>
      <stop offset="100%" stop-color="#FF7A24"/>
    </linearGradient>
    <linearGradient id="cream-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F6F0DA"/>
    </linearGradient>
    <filter id="drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0E2E38" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="116" fill="url(#bg-grad)"/>
  <rect x="12" y="12" width="488" height="488" rx="104" fill="none" stroke="#6F91B5" stroke-width="3" stroke-opacity="0.3"/>
  <g filter="url(#drop-shadow)">
    <path d="M168 140 L344 140 C358 140 370 152 370 166 L370 340 C370 354 358 366 344 366 L168 366 C154 366 142 354 142 340 L142 166 C142 152 154 140 168 140 Z" fill="#4A8094" fill-opacity="0.5" transform="rotate(-6 256 253)" />
    <path d="M256 120 L160 356 C155 368 164 380 177 380 L208 380 C216 380 223 375 226 367 L256 288 L286 367 C289 375 296 380 304 380 L335 380 C348 380 357 368 352 356 L256 120 Z" fill="url(#cream-grad)"/>
    <polygon points="256,228 296,288 256,316 216,288" fill="url(#accent-grad)"/>
    <path d="M256 120 L226 367 L256 288 Z" fill="#E8DFBE" fill-opacity="0.6"/>
  </g>
  <circle cx="256" cy="424" r="6" fill="#FF8838"/>
  <circle cx="232" cy="424" r="3.5" fill="#89C0B7" fill-opacity="0.8"/>
  <circle cx="280" cy="424" r="3.5" fill="#89C0B7" fill-opacity="0.8"/>
</svg>`;

const PWA_MANIFEST_JSON = {
  name: "Allen 作品集",
  short_name: "Allen 作品集",
  description: "Allen 的個人 AI 應用與精選專案作品集",
  start_url: "/",
  id: "/",
  display: "standalone",
  background_color: "#F6F0DA",
  theme_color: "#28738A",
  orientation: "portrait-primary",
  icons: [
    {
      src: "/assets/icon.svg",
      sizes: "192x192 512x512 any",
      type: "image/svg+xml",
      purpose: "any"
    },
    {
      src: "/assets/icon.svg",
      sizes: "192x192 512x512 any",
      type: "image/svg+xml",
      purpose: "maskable"
    }
  ],
  categories: ["portfolio", "productivity", "utilities"]
};

app.get(['/manifest.webmanifest', '/manifest.json'], (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.json(PWA_MANIFEST_JSON);
});

app.get(['/assets/icon.svg', '/apple-touch-icon.png', '/favicon.ico'], (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.send(SVG_APP_ICON);
});

// ==================== 全域身分驗證守衛 ====================
app.use((req, res, next) => {
  // 放行認證路由
  if (req.path.startsWith('/auth/')) {
    return next();
  }

  // 檢查登入與白名單狀態
  if (req.session?.user?.authenticated && isEmailAllowed(req.session.user.email)) {
    return next();
  }

  // 未認證者導向登入頁
  if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
  }

  res.redirect('/auth/login');
});

// ==================== 靜態檔案保護提供 ====================
// 防止重要檔案被直接下載
const forbiddenFiles = ['.env', '.env.example', 'package.json', 'package-lock.json', 'server.mjs', 'build.mjs', 'CLAUDE.md', 'README.md', 'CHANGELOG.md'];
app.use((req, res, next) => {
  const reqFile = path.basename(req.path);
  if (forbiddenFiles.includes(reqFile) || reqFile.startsWith('.env')) {
    return res.status(404).send('Not Found');
  }
  next();
});

// 提供作品集靜態網頁與資產
app.use(express.static(__dirname, {
  extensions: ['html'],
  index: 'index.html',
}));

// Fallback 404
app.use((req, res) => {
  if (req.accepts('html')) {
    return res.status(404).redirect('/');
  }
  res.status(404).send('Not Found');
});

app.listen(PORT, () => {
  console.log(`🚀 Portfolio 伺服器已安全啟動在 http://localhost:${PORT}`);
  console.log(`🔒 授權存取白名單: ${process.env.ALLOWED_EMAILS || '(未設定 - 任何人皆無法瀏覽)'}`);
});

