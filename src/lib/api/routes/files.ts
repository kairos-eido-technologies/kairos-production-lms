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

async function uploadRoute(request: Request): Promise<Response> {
  // Security Guard: Check authentication token (flexible in dev mode)
  const authHeader = request.headers.get("authorization") ?? request.headers.get("x-auth-token") ?? "";
  let token: string | null = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : (authHeader || null);
  if (!token) {
    const cookies = request.headers.get("cookie") ?? "";
    const match = cookies.match(/(?:^|; )auth_token=([^;]+)/);
    token = match?.[1] ?? null;
  }
  const isDev = process.env.NODE_ENV !== "production";
  if (!isDev && (!token || !verifyToken(token))) {
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
  const detectedMime = getMimeType(filename);
  const mime = fileField.type && fileField.type !== "application/octet-stream" ? fileField.type : detectedMime;

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

  // 1. Store in memory cache
  fileCache.set(id, { id, filename, mime, buffer });

  // 2. Write to local disk (/tmp/uploads and process.cwd()/uploads)
  const diskDirs = [
    path.join(process.cwd(), "uploads"),
    path.join(os.tmpdir(), "uploads"),
  ];
  for (const dir of diskDirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, storageKey), buffer);
    } catch (fsErr) {
      console.warn("⚠️ File write to disk warning:", fsErr);
    }
  }

  // 3. Upload directly to Supabase Storage 'course-materials' bucket
  let supabasePublicUrl = "";
  try {
    const { supabase } = await import("../../db/supabase-client");
    const { error: sUpErr } = await supabase.storage
      .from("course-materials")
      .upload(storageKey, buffer, {
        contentType: mime,
        upsert: true,
      });

    if (!sUpErr) {
      const { data: pubData } = supabase.storage
        .from("course-materials")
        .getPublicUrl(storageKey);
      if (pubData?.publicUrl) {
        supabasePublicUrl = pubData.publicUrl;
      }
    } else {
      console.warn("⚠️ Supabase storage upload warning:", sUpErr.message);
    }
  } catch (sErr) {
    console.warn("⚠️ Supabase storage upload exception:", sErr);
  }

  // 4. Save metadata to Supabase files table
  try {
    const { supabase } = await import("../../db/supabase-client");
    await supabase.from("files").upsert({
      id,
      filename,
      mime,
      size: buffer.length,
      owner_id: ownerId,
      storage_type: supabasePublicUrl ? "supabase" : "local",
      storage_key: storageKey,
    }, { onConflict: "id" });
  } catch (sErr) {
    console.warn("⚠️ Supabase insert file metadata warning:", sErr);
  }

  const url = `/api/files?id=${encodeURIComponent(id)}`;
  return new Response(
    JSON.stringify({ ok: true, id, url, publicUrl: supabasePublicUrl || url }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}

async function downloadRoute(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || url.searchParams.get("name") || url.searchParams.get("key");
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing id" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const cleanId = decodeURIComponent(id).trim();

  // 1. Check in-memory fileCache first for instant zero-latency serving
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
        (f) => f === cleanId || f.startsWith(`${cleanId}-`) || f.startsWith(cleanId)
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
    const { supabase } = await import("../../db/supabase-client");
    
    // 3a. Search objects in course-materials bucket matching cleanId
    const { data: storageList } = await supabase.storage
      .from("course-materials")
      .list("", { search: cleanId });

    let matchObjName: string | null = null;
    let matchMime: string | null = null;

    if (storageList && storageList.length > 0) {
      // Pick best match starting with cleanId or exact
      const exactOrPrefix = storageList.find((item) => item.name === cleanId || item.name.startsWith(`${cleanId}-`) || item.name.includes(cleanId));
      const target = exactOrPrefix || storageList[0];
      matchObjName = target.name;
      if (target.metadata && (target.metadata as any).mimetype) {
        matchMime = (target.metadata as any).mimetype;
      }
    }

    // 3b. If not found in search, check Supabase files table for metadata
    if (!matchObjName) {
      const { data: row } = await supabase.from("files").select("*").eq("id", cleanId).maybeSingle();
      if (row) {
        matchObjName = row.storage_key || row.storageKey || `${cleanId}-${row.filename || "file"}`;
        matchMime = row.mime;
      }
    }

    // 3c. Try direct download with candidate names if still no match
    const candidateNames = matchObjName
      ? [matchObjName]
      : [cleanId, `uploads/${cleanId}`, `${cleanId}.pdf`, `${cleanId}.pptx`, `${cleanId}.png`];

    for (const nameToTry of candidateNames) {
      const { data: fileBlob, error: dlErr } = await supabase.storage
        .from("course-materials")
        .download(nameToTry);

      if (!dlErr && fileBlob) {
        const arrayBuf = await fileBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const filename = nameToTry.includes("-") ? nameToTry.slice(cleanId.length + 1) : nameToTry;
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
  } catch (sErr) {
    console.error("⚠️ Supabase storage download exception:", sErr);
  }

  return new Response(JSON.stringify({ error: "File not found" }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
}
