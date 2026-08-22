import fs from "fs";
import path from "path";

let serverInstance = null;

async function getServer() {
  if (!serverInstance) {
    const mod = await import("../dist/server/server.js");
    serverInstance = mod.default || mod;
  }
  return serverInstance;
}

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
};

export default async function handler(req, res) {
  try {
    const urlPath = (req.url || "/").split("?")[0];
    const ext = path.extname(urlPath).toLowerCase();

    // Serve static client assets directly from dist/client
    if (ext && MIME_TYPES[ext]) {
      const filePath = path.join(process.cwd(), "dist", "client", urlPath);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.statusCode = 200;
        res.setHeader("content-type", MIME_TYPES[ext]);
        res.setHeader("cache-control", "public, max-age=31536000, immutable");
        return fs.createReadStream(filePath).pipe(res);
      }
    }

    const server = await getServer();
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const fullUrl = `${protocol}://${host}${req.url}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach((v) => headers.append(key, v));
        } else {
          headers.set(key, value);
        }
      }
    }

    let body = undefined;
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      if (req.body) {
        body =
          typeof req.body === "string" || Buffer.isBuffer(req.body)
            ? req.body
            : JSON.stringify(req.body);
      }
    }

    const request = new Request(fullUrl, {
      method: req.method,
      headers,
      body: body || undefined,
    });

    const response = await server.fetch(request);

    res.statusCode = response.status;
    response.headers.forEach((val, key) => {
      res.setHeader(key, val);
    });

    const arrayBuffer = await response.arrayBuffer();
    res.end(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error("Vercel Serverless Handler Error:", err);
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain");
    res.end(`Internal Server Error: ${err?.message || err}`);
  }
}
