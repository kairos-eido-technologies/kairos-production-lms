import { getDb } from "../../db/client";
import { files } from "../../db/schema";
import { eq } from "drizzle-orm";
import { promises as fs } from "fs";
import path from "path";

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

export async function filesRoute(request: Request): Promise<Response> {
  try {
    if (request.method === "POST") return await uploadRoute(request);
    if (request.method === "GET") return await downloadRoute(request);
    return new Response(null, { status: 405, headers: { Allow: "GET, POST" } });
  } catch (err) {
    console.error("Files route error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { "content-type": "application/json" } });
  }
}

async function uploadRoute(request: Request): Promise<Response> {
  // Accept multipart/form-data with field 'file' and optional 'ownerId'
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("form-data") && !contentType.includes("multipart")) {
    return new Response(JSON.stringify({ error: "Content-Type must be multipart/form-data" }), { status: 400, headers: { "content-type": "application/json" } });
  }

  // formData support in Node's Fetch
  const form = await request.formData();
  const fileField = form.get("file") as any;
  if (!fileField || typeof fileField.arrayBuffer !== "function") {
    return new Response(JSON.stringify({ error: "No file provided" }), { status: 400, headers: { "content-type": "application/json" } });
  }

  const ownerId = (form.get("ownerId") as string) || null;
  const filename = fileField.name || "upload.bin";
  const mime = fileField.type || "application/octet-stream";

  // ── Security: reject files exceeding 50 MB ──────────────────────────────
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
  if (fileField.size && fileField.size > MAX_FILE_SIZE) {
    return new Response(
      JSON.stringify({ error: "File too large. Maximum allowed size is 50 MB." }),
      { status: 413, headers: { "content-type": "application/json" } }
    );
  }

  const arrayBuf = await fileField.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  // Double-check actual buffer size in case fileField.size was unavailable
  if (buffer.length > MAX_FILE_SIZE) {
    return new Response(
      JSON.stringify({ error: "File too large. Maximum allowed size is 50 MB." }),
      { status: 413, headers: { "content-type": "application/json" } }
    );
  }
  const id = makeId();

  const uploadsDir = path.join(process.cwd(), "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  const storageKey = `${id}-${filename}`;
  const filePath = path.join(uploadsDir, storageKey);
  await fs.writeFile(filePath, buffer);

  const db = getDb();
  await db.insert(files).values({
    id,
    filename,
    mime,
    size: buffer.length,
    ownerId,
    storageType: "local",
    storageKey,
  });

  const url = `/api/files?id=${encodeURIComponent(id)}`;
  return new Response(JSON.stringify({ ok: true, id, url }), { status: 200, headers: { "content-type": "application/json" } });
}

async function downloadRoute(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: { "content-type": "application/json" } });

  const db = getDb();
  const row = await db.query.files.findFirst({ where: eq(files.id, id) });
  if (!row) return new Response(JSON.stringify({ error: "File not found" }), { status: 404, headers: { "content-type": "application/json" } });

  if (row.storageType === "local") {
    const filePath = path.join(process.cwd(), "uploads", row.storageKey);
    try {
      const data = await fs.readFile(filePath);
      return new Response(data, {
        status: 200,
        headers: {
          "content-type": row.mime || "application/octet-stream",
          "content-disposition": `inline; filename="${row.filename.replace(/\"/g, "\"")}"`,
        },
      });
    } catch (err) {
      console.error("Failed to read local file", err);
      return new Response(JSON.stringify({ error: "File not available" }), { status: 404, headers: { "content-type": "application/json" } });
    }
  }

  return new Response(JSON.stringify({ error: "Unsupported storage type" }), { status: 500, headers: { "content-type": "application/json" } });
}
