import { getDb } from "../../db/client";
import { files } from "../../db/schema";
import { eq } from "drizzle-orm";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { verifyToken } from "../../auth";

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface CachedFile {
  id: string;
  filename: string;
  mime: string;
  buffer: Buffer;
}

// Global server memory cache for uploaded files (PDFs, PPTs, images)
const globalRef = globalThis as unknown as { __fileCache?: Map<string, CachedFile> };
const fileCache = globalRef.__fileCache || new Map<string, CachedFile>();
if (process.env.NODE_ENV !== "production") {
  globalRef.__fileCache = fileCache;
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
  // Security Guard: Check authentication token
  const authHeader = request.headers.get("authorization") ?? "";
  let token: string | null = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    const cookies = request.headers.get("cookie") ?? "";
    const match = cookies.match(/(?:^|; )auth_token=([^;]+)/);
    token = match?.[1] ?? null;
  }
  if (!token || !verifyToken(token)) {
    return new Response(JSON.stringify({ error: "Unauthorized: File upload requires an active session" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("form-data") && !contentType.includes("multipart")) {
    return new Response(JSON.stringify({ error: "Content-Type must be multipart/form-data" }), { status: 400, headers: { "content-type": "application/json" } });
  }

  const form = await request.formData();
  const fileField = form.get("file") as any;
  if (!fileField || typeof fileField.arrayBuffer !== "function") {
    return new Response(JSON.stringify({ error: "No file provided" }), { status: 400, headers: { "content-type": "application/json" } });
  }

  const ownerId = (form.get("ownerId") as string) || null;
  const filename = fileField.name || "upload.bin";
  const mime = fileField.type || "application/octet-stream";

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
  if (fileField.size && fileField.size > MAX_FILE_SIZE) {
    return new Response(
      JSON.stringify({ error: "File too large. Maximum allowed size is 50 MB." }),
      { status: 413, headers: { "content-type": "application/json" } }
    );
  }

  const arrayBuf = await fileField.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  if (buffer.length > MAX_FILE_SIZE) {
    return new Response(
      JSON.stringify({ error: "File too large. Maximum allowed size is 50 MB." }),
      { status: 413, headers: { "content-type": "application/json" } }
    );
  }
  const id = makeId();
  const storageKey = `${id}-${filename}`;

  // Store in memory cache
  fileCache.set(id, { id, filename, mime, buffer });

  // Write to disk (/tmp/uploads or cwd/uploads)
  const baseDir = process.env.VERCEL ? os.tmpdir() : process.cwd();
  const uploadsDir = path.join(baseDir, "uploads");
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, storageKey);
    await fs.writeFile(filePath, buffer);
  } catch (fsErr) {
    console.warn("⚠️ File write to disk warning:", fsErr);
  }

  // Attempt DB record creation
  try {
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
  } catch (dbErr) {
    console.warn("⚠️ Database insert file metadata timed out (using memory cache):", dbErr);
  }

  const url = `/api/files?id=${encodeURIComponent(id)}`;
  return new Response(JSON.stringify({ ok: true, id, url }), { status: 200, headers: { "content-type": "application/json" } });
}

async function downloadRoute(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400, headers: { "content-type": "application/json" } });

  // 1. Check in-memory fileCache first for instant zero-latency serving
  const cached = fileCache.get(id);
  if (cached) {
    return new Response(new Uint8Array(cached.buffer), {
      status: 200,
      headers: {
        "content-type": cached.mime || "application/octet-stream",
        "content-disposition": `inline; filename="${cached.filename.replace(/"/g, '"')}"`,
      },
    });
  }

  // 2. Check disk /tmp or cwd
  const baseDir = process.env.VERCEL ? os.tmpdir() : process.cwd();
  const diskPaths = [
    path.join(baseDir, "uploads"),
    path.join(process.cwd(), "uploads"),
    path.join(os.tmpdir(), "uploads"),
  ];

  for (const dir of diskPaths) {
    try {
      const filesInDir = await fs.readdir(dir);
      const matchFile = filesInDir.find((f) => f.startsWith(`${id}-`));
      if (matchFile) {
        const fullPath = path.join(dir, matchFile);
        const data = await fs.readFile(fullPath);
        const filename = matchFile.slice(id.length + 1);
        const isPdf = filename.endsWith(".pdf");
        const isPng = filename.endsWith(".png");
        const isJpg = filename.endsWith(".jpg") || filename.endsWith(".jpeg");
        const mime = isPdf ? "application/pdf" : isPng ? "image/png" : isJpg ? "image/jpeg" : "application/octet-stream";

        return new Response(data, {
          status: 200,
          headers: {
            "content-type": mime,
            "content-disposition": `inline; filename="${filename.replace(/"/g, '"')}"`,
          },
        });
      }
    } catch (_) {}
  }

  // 3. Fall back to DB metadata lookup
  try {
    const db = getDb();
    const row = await db.query.files.findFirst({ where: eq(files.id, id) });
    if (row) {
      for (const dir of diskPaths) {
        const filePath = path.join(dir, row.storageKey);
        try {
          const data = await fs.readFile(filePath);
          return new Response(data, {
            status: 200,
            headers: {
              "content-type": row.mime || "application/octet-stream",
              "content-disposition": `inline; filename="${row.filename.replace(/"/g, '"')}"`,
            },
          });
        } catch (_) {}
      }
    }
  } catch (dbErr) {
    console.warn("⚠️ Database file lookup warning:", dbErr);
  }

  return new Response(JSON.stringify({ error: "File not found" }), { status: 404, headers: { "content-type": "application/json" } });
}
