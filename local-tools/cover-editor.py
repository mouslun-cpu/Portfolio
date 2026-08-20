from __future__ import annotations

import base64, json, mimetypes, re, shutil, subprocess, tempfile
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
OUTPUTS = {"card": ("cover-card.png", (1600, 1600)), "detail": ("cover.png", (1600, 900)), "portrait": (None, (900, 1600))}

def works():
    data = json.loads((ROOT / "works.json").read_text(encoding="utf-8"))
    result = []
    for work in data["works"]:
        folder = ROOT / "assets" / "works" / work["slug"]
        images = [p.relative_to(ROOT).as_posix() for p in sorted(folder.rglob("*")) if p.is_file() and p.suffix.lower() in EXTENSIONS] if folder.exists() else []
        result.append({"slug": work["slug"], "title": work["title"], "images": images})
    return result

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args): print(fmt % args)
    def send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status); self.send_header("Content-Type", "application/json; charset=utf-8"); self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)
    def do_GET(self):
        path = unquote(urlparse(self.path).path)
        if path == "/":
            body = (ROOT / "local-tools" / "cover-editor.html").read_bytes()
            self.send_response(200); self.send_header("Content-Type", "text/html; charset=utf-8"); self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body); return
        if path == "/api/works": self.send_json(200, works()); return
        if path.startswith("/assets/"):
            target, assets = (ROOT / path.lstrip("/")).resolve(), (ROOT / "assets").resolve()
            if assets not in target.parents or not target.is_file(): self.send_error(404); return
            self.send_response(200); self.send_header("Content-Type", mimetypes.guess_type(target.name)[0] or "application/octet-stream"); self.send_header("Content-Length", str(target.stat().st_size)); self.end_headers()
            with target.open("rb") as file: shutil.copyfileobj(file, self.wfile)
            return
        self.send_error(404)
    def do_POST(self):
        endpoint = urlparse(self.path).path
        if endpoint not in {"/api/save", "/api/upload"}: self.send_error(404); return
        try:
            request = json.loads(self.rfile.read(int(self.headers.get("Content-Length", "0"))).decode())
            slug = request["slug"]
            if slug not in {work["slug"] for work in works()}: raise ValueError("找不到作品")
            folder = (ROOT / "assets" / "works" / slug).resolve()
            if endpoint == "/api/upload":
                suffix = Path(request["name"]).suffix.lower()
                if suffix not in EXTENSIONS: raise ValueError("僅支援 PNG、JPG、JPEG 或 WebP 圖片")
                raw = base64.b64decode(request["data"], validate=True)
                if len(raw) > 15 * 1024 * 1024: raise ValueError("圖片請小於 15 MB")
                stem = re.sub(r"[^A-Za-z0-9_-]+", "-", Path(request["name"]).stem).strip("-") or "image"
                target = folder / "sources" / f"{datetime.now():%Y%m%d-%H%M%S}-{stem}{suffix}"
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(raw)
                with Image.open(target) as image: image.verify()
                self.send_json(200, {"message": "已匯入來源圖片", "source": target.relative_to(ROOT).as_posix()}); return
            source, mode, crop = request["source"], request["mode"], request["crop"]
            image_path = (ROOT / source).resolve()
            if folder not in image_path.parents or image_path.suffix.lower() not in EXTENSIONS: raise ValueError("無效的圖片路徑")
            name, size = OUTPUTS[mode]
            with Image.open(image_path) as image:
                image = ImageOps.exif_transpose(image).convert("RGB")
                x, y = max(0, min(int(crop["x"]), image.width - 1)), max(0, min(int(crop["y"]), image.height - 1))
                w, h = max(1, min(int(crop["width"]), image.width - x)), max(1, min(int(crop["height"]), image.height - y))
                edited = image.crop((x, y, x + w, y + h)).resize(size, Image.Resampling.LANCZOS)
            if mode == "portrait":
                target = folder / "gallery" / f"{image_path.stem}-portrait.png"
                target.parent.mkdir(parents=True, exist_ok=True)
            else:
                target = folder / name
            if target.exists(): shutil.copy2(target, target.with_name(f"{target.stem}.bak.{datetime.now():%Y%m%d-%H%M%S}{target.suffix}"))
            with tempfile.NamedTemporaryFile(suffix=".png", dir=folder, delete=False) as file: edited.save(file.name, "PNG", optimize=True); temporary = Path(file.name)
            temporary.replace(target)
            build = subprocess.run(["node", "build.mjs"], cwd=ROOT, capture_output=True, text=True, check=True)
            self.send_json(200, {"message": "已儲存並重建作品集", "target": target.relative_to(ROOT).as_posix(), "build": (build.stdout or "").strip()})
        except Exception as error: self.send_json(400, {"error": str(error)})

if __name__ == "__main__":
    print("封面裁切器：http://127.0.0.1:8010")
    ThreadingHTTPServer(("127.0.0.1", 8010), Handler).serve_forever()
