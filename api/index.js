let serverInstance = null;

async function getServer() {
  if (!serverInstance) {
    const mod = await import("../dist/server/server.js");
    serverInstance = mod.default || mod;
  }
  return serverInstance;
}

export default async function handler(req, res) {
  try {
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
        body = typeof req.body === "string" || Buffer.isBuffer(req.body)
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
