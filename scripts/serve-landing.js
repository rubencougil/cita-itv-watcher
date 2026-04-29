import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const PORT = Number.parseInt(process.env.PORT || "4173", 10);
const rootDir = path.resolve("landing");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

async function readFileSafe(filePath) {
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const sanitizedPath = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  const normalized = path.resolve(rootDir, sanitizedPath);
  const relative = path.relative(rootDir, normalized);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  let data = await readFileSafe(normalized);
  if (!data && !path.extname(normalized)) {
    data = await readFileSafe(`${normalized}.html`);
  }

  if (!data) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const ext = path.extname(normalized || ".html") || ".html";
  res.writeHead(200, {
    "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  res.end(data);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Landing servida en http://127.0.0.1:${PORT}`);
});
