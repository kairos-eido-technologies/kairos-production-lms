import { promises as fs } from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { getDb } from "../../db/client";
import { files } from "../../db/schema";
import { eq } from "drizzle-orm";
import os from "os";

const execFileAsync = promisify(execFile);

// Common LibreOffice paths on Windows & Linux
const LO_PATHS = [
  "soffice",
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  "/usr/bin/soffice",
  "/usr/local/bin/soffice",
];

async function findLibreOffice(): Promise<string | null> {
  for (const sofficePath of LO_PATHS) {
    try {
      await execFileAsync(sofficePath, ["--version"]);
      return sofficePath;
    } catch {
      // try next
    }
  }
  return null;
}

async function convertPptxToImages(pptxPath: string, outDir: string): Promise<string[]> {
  console.log(`[LibreOffice Converter] 🔍 Searching for LibreOffice installation...`);
  const soffice = await findLibreOffice();
  if (!soffice) {
    console.error("[LibreOffice Converter] ❌ LibreOffice executable not found on server system!");
    throw new Error(
      "LibreOffice is not installed on this server. Please install LibreOffice to enable PPTX rendering.",
    );
  }
  console.log(`[LibreOffice Converter] ✅ LibreOffice executable found: ${soffice}`);

  // Convert PPTX → PNG images safely using execFile argument array (No Shell Injection)
  console.log(`[LibreOffice Converter] 🖥️ Executing converter for: ${pptxPath}`);
  const { stdout, stderr } = await execFileAsync(
    soffice,
    ["--headless", "--convert-to", "png", "--outdir", outDir, pptxPath],
    { timeout: 60_000 },
  );
  if (stdout) console.log(`[LibreOffice Converter stdout]: ${stdout.trim()}`);
  if (stderr) console.warn(`[LibreOffice Converter stderr]: ${stderr.trim()}`);

  // Collect output PNG files (LibreOffice names them: basename0.png, basename1.png, ...)
  const base = path.basename(pptxPath, path.extname(pptxPath));
  const allFiles = await fs.readdir(outDir);

  const pngFiles = allFiles
    .filter((f) => f.startsWith(base) && f.endsWith(".png"))
    .sort((a, b) => {
      // Sort numerically: basename0.png < basename1.png < ...
      const numA = parseInt(a.replace(base, "").replace(".png", "") || "0", 10);
      const numB = parseInt(b.replace(base, "").replace(".png", "") || "0", 10);
      return numA - numB;
    });

  console.log(`[LibreOffice Converter] 🖼️ Extracted ${pngFiles.length} PNG slide images from presentation.`);
  return pngFiles.map((f) => path.join(outDir, f));
}

export async function pptxSlidesRoute(request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return new Response(null, { status: 405, headers: { Allow: "GET" } });
  }

  const url = new URL(request.url);
  const rawFileId = url.searchParams.get("id");
  console.log(`[pptx-slides API] 📡 Incoming slide conversion request for fileId: "${rawFileId}"`);

  if (!rawFileId) {
    console.warn("[pptx-slides API] ⚠️ Request rejected: Missing id parameter.");
    return json({ error: "Missing id parameter" }, 400);
  }

  // Sanitize fileId to prevent path traversal
  const fileId = path.basename(decodeURIComponent(rawFileId)).replace(/[^a-zA-Z0-9._-]/g, "");
  if (!fileId) {
    return json({ error: "Invalid id parameter" }, 400);
  }

  try {
    let pptxPath: string | null = null;

    // 1. Check local disk uploads folders for file matching fileId
    const diskPaths = [path.join(process.cwd(), "uploads"), path.join(os.tmpdir(), "uploads")];

    for (const dir of diskPaths) {
      try {
        const filesInDir = await fs.readdir(dir);
        const match = filesInDir.find(
          (f) => f === fileId || f.startsWith(`${fileId}-`) || f.startsWith(fileId),
        );
        if (match) {
          pptxPath = path.join(dir, match);
          console.log(`[pptx-slides API] 📂 Local disk match found: "${pptxPath}"`);
          break;
        }
      } catch (_) {}
    }

    // 2. Fall back to Supabase Storage and metadata lookup if not found directly on disk
    if (!pptxPath) {
      console.log(`[pptx-slides API] 🔍 File not found on local disk. Checking Supabase storage and DB metadata...`);
      try {
        const { storageClient } = await import("../../storage");
        let matchName: string | null = null;

        if (storageClient) {
          // 2a. Search objects in course-materials bucket
          const { data: storageList } = await storageClient.storage
            .from("course-materials")
            .list("", { search: fileId });

          matchName = storageList && storageList.length > 0 ? storageList[0].name : null;
        }

        if (!matchName) {
          const { getDb } = await import("../../db/client");
          const { files } = await import("../../db/schema");
          const { eq } = await import("drizzle-orm");
          const db = getDb();
          const row = await db.query.files.findFirst({ where: eq(files.id, fileId) });
          if (row) {
            matchName = row.storageKey || `${fileId}-${row.filename || "file.pptx"}`;
          }
        }

        const candidateNames = matchName
          ? [matchName]
          : [fileId, `${fileId}.pptx`, `${fileId}.ppt`];

        if (storageClient) {
          for (const nameToTry of candidateNames) {
            const { data: blob, error: dlErr } = await storageClient.storage
              .from("course-materials")
              .download(nameToTry);

            if (!dlErr && blob) {
              const arrayBuf = await blob.arrayBuffer();
              const buffer = Buffer.from(arrayBuf);
              const targetDir = path.join(os.tmpdir(), "uploads");
              await fs.mkdir(targetDir, { recursive: true });
              const savedPath = path.join(targetDir, nameToTry);
              await fs.writeFile(savedPath, buffer);
              pptxPath = savedPath;
              console.log(`[pptx-slides API] ☁️ Downloaded file from Supabase storage to "${savedPath}"`);
              break;
            }
          }
        }
      } catch (sErr) {
        console.warn("⚠️ Storage file lookup warning in pptx-slides:", sErr);
      }
    }

    if (!pptxPath) {
      console.warn(`[pptx-slides API] ❌ Presentation file not found for fileId: "${fileId}"`);
      return json({ error: "File not found" }, 404);
    }

    // Check cache: if PNG files already exist for this fileId, return them
    const cacheDir = path.join(process.cwd(), "uploads", "pptx-cache", fileId);
    await fs.mkdir(cacheDir, { recursive: true });

    const cachedPngs = (await fs.readdir(cacheDir)).filter((f) => f.endsWith(".png")).sort();

    let pngPaths: string[];

    if (cachedPngs.length > 0) {
      console.log(`[pptx-slides API] ⚡ Cache HIT! Returning ${cachedPngs.length} cached slide PNGs.`);
      pngPaths = cachedPngs.map((f) => path.join(cacheDir, f));
    } else {
      console.log(`[pptx-slides API] ⚙️ Cache MISS. Invoking LibreOffice to render PNG slides...`);
      pngPaths = await convertPptxToImages(pptxPath, cacheDir);
      console.log(`[pptx-slides API] 🎉 LibreOffice conversion complete. Generated ${pngPaths.length} PNG slides.`);
    }

    if (pngPaths.length === 0) {
      console.warn("[pptx-slides API] ⚠️ No slides were generated by LibreOffice.");
      return json({ error: "No slides found in this presentation" }, 422);
    }

    // Read PNGs and return as base64 data URLs
    const slideDataUrls: string[] = [];
    for (const p of pngPaths) {
      const data = await fs.readFile(p);
      slideDataUrls.push(`data:image/png;base64,${data.toString("base64")}`);
    }

    return json({ ok: true, slides: slideDataUrls });
  } catch (err) {
    console.error("[pptx-slides API] ❌ Exception during slide conversion:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: msg }, 500);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
