import { getDb } from "../../db/client";
import { files } from "../../db/schema";
import { eq } from "drizzle-orm";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { verifyToken } from "../../auth";
import { logger } from "../../logger";

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface CachedFile {
  id: string;
  filename: string;
  mime: string;
  buffer: Buffer;
  size: number;
}

// Bounded LRU memory cache to prevent Out-Of-Memory (OOM) crashes
class BoundedFileCache {
  private cache = new Map<string, CachedFile>();
  private maxBytes: number;
  private currentBytes = 0;

  constructor(maxMegabytes = 50) {
    this.maxBytes = maxMegabytes * 1024 * 1024;
  }

  get(key: string): CachedFile | undefined {
    const item = this.cache.get(key);
    if (item) {
      // Re-insert to update LRU order
      this.cache.delete(key);
      this.cache.set(key, item);
    }
    return item;
  }

  set(key: string, item: Omit<CachedFile, "size"> & { size?: number }): void {
    const size = item.buffer.length;
    // Don't cache single items larger than 10MB to protect memory
    if (size > 10 * 1024 * 1024) return;

    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      this.currentBytes -= existing.size;
      this.cache.delete(key);
    }

    // Evict oldest entries until within limit
    while (this.currentBytes + size > this.maxBytes && this.cache.size > 0) {
      const oldestKey = this.cache.keys().next().value;
      if (!oldestKey) break;
      const oldest = this.cache.get(oldestKey);
      if (oldest) this.currentBytes -= oldest.size;
      this.cache.delete(oldestKey);
    }

    const cachedEntry: CachedFile = { ...item, size };
    this.cache.set(key, cachedEntry);
    this.currentBytes += size;
  }
}

const globalRef = globalThis as unknown as { __fileCache?: BoundedFileCache };
const fileCache = globalRef.__fileCache || new BoundedFileCache(50);
if (process.env.NODE_ENV !== "production") {
  globalRef.__fileCache = fileCache;
}

export async function filesRoute(request: Request): Promise<Response> {
  try {
    if (request.method === "POST") return await uploadRoute(request);
    if (request.method === "GET") return await downloadRoute(request);
    return new Response(null, { status: 405, headers: { Allow: "GET, POST" } });
  } catch (err) {
    logger.error({ err }, "Files route error");
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}


function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".ppt":
      return "application/vnd.ms-powerpoint";
    case ".pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mp3":
      return "audio/mpeg";
    default:
      return "application/octet-stream";
  }
}

function sanitizeSafeFilename(rawFilename: string): string {
  const base = path.basename(rawFilename).trim();
  const ext = path.extname(base);
  const nameWithoutExt = path.basename(base, ext);
  const safeName = nameWithoutExt.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, "").slice(0, 10);
  return `${safeName || "upload"}${safeExt}`;
}

function validateMagicBytes(buffer: Buffer, declaredExt: string): boolean {
  if (buffer.length < 4) return true; // too small to check

  const ext = declaredExt.toLowerCase();

  // PDF check: %PDF (0x25 0x50 0x44 0x46)
  if (ext === ".pdf") {
    return (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    );
  }

  // PNG check: 0x89 0x50 0x4E 0x47
  if (ext === ".png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }

  // JPEG check: 0xFF 0xD8 0xFF
  if (ext === ".jpg" || ext === ".jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // GIF check: GIF8
  if (ext === ".gif") {
    return (
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38
    );
  }

  // ZIP-based Office files (.docx, .pptx): PK\x03\x04 (0x50 0x4B 0x03 0x04)
  if (ext === ".docx" || ext === ".pptx" || ext === ".zip") {
    return (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
      (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08)
    );
  }

  // WebM / MKV: 0x1A 0x45 0xDF 0xA3
  if (ext === ".webm") {
    return buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
  }

  return true;
}

async function uploadRoute(request: Request): Promise<Response> {
  // Security Guard: Check authentication token (flexible in dev mode)
  const authHeader =
    request.headers.get("authorization") ?? request.headers.get("x-auth-token") ?? "";
  let token: string | null = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader || null;
  if (!token) {
    const cookies = request.headers.get("cookie") ?? "";
    const match = cookies.match(/(?:^|; )auth_token=([^;]+)/);
    token = match?.[1] ?? null;
  }
  const isDev = process.env.NODE_ENV !== "production";
  if (!isDev && (!token || !verifyToken(token))) {
    return new Response(
      JSON.stringify({ error: "Unauthorized: File upload requires an active session" }),
      {
        status: 401,
        headers: { "content-type": "application/json" },
      },
    );
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("form-data") && !contentType.includes("multipart")) {
    return new Response(JSON.stringify({ error: "Content-Type must be multipart/form-data" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const form = await request.formData();
  const fileField = form.get("file") as any;
  if (!fileField || typeof fileField.arrayBuffer !== "function") {
    return new Response(JSON.stringify({ error: "No file provided" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const ownerId = (form.get("ownerId") as string) || null;
  const rawFilename = fileField.name || "upload.bin";
  const filename = sanitizeSafeFilename(rawFilename);
  const detectedMime = getMimeType(filename);
  const mime =
    fileField.type && fileField.type !== "application/octet-stream" ? fileField.type : detectedMime;

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
  if (fileField.size && fileField.size > MAX_FILE_SIZE) {
    return new Response(
      JSON.stringify({ error: "File too large. Maximum allowed size is 50 MB." }),
      { status: 413, headers: { "content-type": "application/json" } },
    );
  }

  const arrayBuf = await fileField.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  if (buffer.length > MAX_FILE_SIZE) {
    return new Response(
      JSON.stringify({ error: "File too large. Maximum allowed size is 50 MB." }),
      { status: 413, headers: { "content-type": "application/json" } },
    );
  }

  const ext = path.extname(filename).toLowerCase();
  if (!validateMagicBytes(buffer, ext)) {
    return new Response(
      JSON.stringify({ error: `File content does not match the declared ${ext} file format.` }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const id = makeId();
  const storageKey = `${id}-${filename}`;

  // 1. Store in bounded memory cache
  fileCache.set(id, { id, filename, mime, buffer });

  // 2. Write to local disk (/tmp/uploads and process.cwd()/uploads)
  const diskDirs = [path.join(process.cwd(), "uploads"), path.join(os.tmpdir(), "uploads")];
  for (const dir of diskDirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, storageKey), buffer);
    } catch (fsErr) {
      logger.warn({ err: fsErr }, "File write to disk warning");
    }
  }

  // 3. Upload directly to Supabase Storage 'course-materials' bucket
  let supabasePublicUrl = "";
  try {
    const { storageClient } = await import("../../storage");
    if (storageClient) {
      const { error: sUpErr } = await storageClient.storage
        .from("course-materials")
        .upload(storageKey, buffer, {
          contentType: mime,
          upsert: true,
        });

      if (!sUpErr) {
        const { data: pubData } = storageClient.storage
          .from("course-materials")
          .getPublicUrl(storageKey);
        if (pubData?.publicUrl) {
          supabasePublicUrl = pubData.publicUrl;
        }
      } else {
        logger.warn({ err: sUpErr.message }, "Supabase storage upload warning");
      }
    }
  } catch (sErr) {
    logger.warn({ err: sErr }, "Supabase storage upload exception");
  }

  // 4. Save metadata to files table via Drizzle ORM
  try {
    const { getDb } = await import("../../db/client");
    const { files } = await import("../../db/schema");
    const db = getDb();
    await db
      .insert(files)
      .values({
        id,
        filename,
        mime,
        size: buffer.length,
        ownerId: ownerId || null,
        storageType: supabasePublicUrl ? "supabase" : "local",
        storageKey: storageKey,
      })
      .onConflictDoUpdate({
        target: files.id,
        set: {
          filename,
          mime,
          size: buffer.length,
          storageKey,
          storageType: supabasePublicUrl ? "supabase" : "local",
        },
      });
  } catch (sErr) {
    logger.warn({ err: sErr }, "Insert file metadata warning");
  }

  const url = `/api/files?id=${encodeURIComponent(id)}`;
  return new Response(JSON.stringify({ ok: true, id, url, publicUrl: supabasePublicUrl || url }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

async function downloadRoute(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const rawId =
    url.searchParams.get("id") || url.searchParams.get("name") || url.searchParams.get("key");

  if (!rawId) {
    return new Response(JSON.stringify({ error: "Missing id" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Clean and sanitize ID against path traversal
  const cleanId = path.basename(decodeURIComponent(rawId).trim()).replace(/[^a-zA-Z0-9._-]/g, "");
  if (!cleanId) {
    return new Response(JSON.stringify({ error: "Invalid id" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // 1. Check in-memory bounded fileCache first for instant zero-latency serving
  const cached = fileCache.get(cleanId);
  if (cached) {
    return new Response(new Uint8Array(cached.buffer), {
      status: 200,
      headers: {
        "content-type": cached.mime || getMimeType(cached.filename),
        "content-disposition": `inline; filename="${cached.filename.replace(/"/g, "")}"`,
        "cache-control": "public, max-age=86400",
        "access-control-allow-origin": "*",
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
      const matchFile = filesInDir.find(
        (f) => f === cleanId || f.startsWith(`${cleanId}-`) || f.startsWith(cleanId),
      );
      if (matchFile) {
        const fullPath = path.join(dir, matchFile);
        const data = await fs.readFile(fullPath);
        const filename = matchFile.includes("-") ? matchFile.slice(cleanId.length + 1) : matchFile;
        const mime = getMimeType(filename);

        fileCache.set(cleanId, { id: cleanId, filename, mime, buffer: data });

        return new Response(data, {
          status: 200,
          headers: {
            "content-type": mime,
            "content-disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
            "cache-control": "public, max-age=86400",
            "access-control-allow-origin": "*",
          },
        });
      }
    } catch (_) {}
  }

  // 3. Check Supabase Storage ('course-materials' bucket)
  try {
    const { storageClient } = await import("../../storage");
    let matchObjName: string | null = null;
    let matchMime: string | null = null;

    if (storageClient) {
      // 3a. Search objects in course-materials bucket matching cleanId
      const { data: storageList } = await storageClient.storage
        .from("course-materials")
        .list("", { search: cleanId });

      if (storageList && storageList.length > 0) {
        // Pick best match starting with cleanId or exact
        const exactOrPrefix = storageList.find(
          (item: any) =>
            item.name === cleanId ||
            item.name.startsWith(`${cleanId}-`) ||
            item.name.includes(cleanId),
        );
        const target = exactOrPrefix || storageList[0];
        matchObjName = target.name;
        if (target.metadata && (target.metadata as any).mimetype) {
          matchMime = (target.metadata as any).mimetype;
        }
      }
    }

    // 3b. If not found in search, check database files table for metadata
    if (!matchObjName) {
      const { getDb } = await import("../../db/client");
      const { files } = await import("../../db/schema");
      const { eq } = await import("drizzle-orm");
      const db = getDb();
      const row = await db.query.files.findFirst({ where: eq(files.id, cleanId) });
      if (row) {
        matchObjName = row.storageKey || `${cleanId}-${row.filename || "file"}`;
        matchMime = row.mime;
      }
    }

    // 3c. Try direct download with candidate names if still no match
    const candidateNames = matchObjName
      ? [matchObjName]
      : [cleanId, `uploads/${cleanId}`, `${cleanId}.pdf`, `${cleanId}.pptx`, `${cleanId}.png`];

    if (storageClient) {
      for (const nameToTry of candidateNames) {
        const { data: fileBlob, error: dlErr } = await storageClient.storage
          .from("course-materials")
          .download(nameToTry);

        if (!dlErr && fileBlob) {
          const arrayBuf = await fileBlob.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          const filename = nameToTry.includes("-")
            ? nameToTry.slice(cleanId.length + 1)
            : nameToTry;
          const mime = matchMime || fileBlob.type || getMimeType(nameToTry);

          // Cache in memory and asynchronously write to disk
          fileCache.set(cleanId, { id: cleanId, filename, mime, buffer });
          for (const dir of diskPaths) {
            fs.mkdir(dir, { recursive: true })
              .then(() => fs.writeFile(path.join(dir, nameToTry), buffer))
              .catch(() => {});
          }

          return new Response(new Uint8Array(buffer), {
            status: 200,
            headers: {
              "content-type": mime,
              "content-length": String(buffer.length),
              "content-disposition": `inline; filename="${encodeURIComponent(filename)}"`,
              "cache-control": "public, max-age=86400",
              "access-control-allow-origin": "*",
            },
          });
        }
      }
    }
  } catch (sErr) {
    logger.error({ err: sErr }, "Supabase storage download exception");
  }

  return new Response(JSON.stringify({ error: "File not found" }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
}

