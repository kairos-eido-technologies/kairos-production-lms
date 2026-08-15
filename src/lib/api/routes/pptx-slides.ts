/**
 * /api/pptx-slides?id=<fileId>
 * 
 * Converts an uploaded .pptx file to a series of PNG images using LibreOffice.
 * Returns JSON: { slides: string[] }  (array of base64 data URLs, one per slide)
 */
import { promises as fs } from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { getDb } from "../../db/client";
import { files } from "../../db/schema";
import { eq } from "drizzle-orm";

const execAsync = promisify(exec);

// Common LibreOffice paths on Windows
const LO_PATHS = [
  "soffice",
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
];

async function findLibreOffice(): Promise<string | null> {
  for (const sofficePath of LO_PATHS) {
    try {
      const quoted = sofficePath.includes(" ") ? `"${sofficePath}"` : sofficePath;
      await execAsync(`${quoted} --version`);
      return quoted;
    } catch {
      // try next
    }
  }
  return null;
}

async function convertPptxToImages(
  pptxPath: string,
  outDir: string
): Promise<string[]> {
  const soffice = await findLibreOffice();
  if (!soffice) {
    throw new Error(
      "LibreOffice is not installed on this server. Please install LibreOffice to enable PPTX rendering."
    );
  }

  // Convert PPTX → PNG images (one per slide)
  const cmd = `${soffice} --headless --convert-to png --outdir "${outDir}" "${pptxPath}"`;
  await execAsync(cmd, { timeout: 60_000 });

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

  return pngFiles.map((f) => path.join(outDir, f));
}

import os from "os";

export async function pptxSlidesRoute(request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return new Response(null, { status: 405, headers: { Allow: "GET" } });
  }

  const url = new URL(request.url);
  const fileId = url.searchParams.get("id");
  if (!fileId) {
    return json({ error: "Missing id parameter" }, 400);
  }

  try {
    let pptxPath: string | null = null;

    // 1. Check local disk uploads folders for file matching fileId
    const diskPaths = [
      path.join(process.cwd(), "uploads"),
      path.join(os.tmpdir(), "uploads"),
    ];

    for (const dir of diskPaths) {
      try {
        const filesInDir = await fs.readdir(dir);
        const match = filesInDir.find((f) => f === fileId || f.startsWith(`${fileId}-`) || f.startsWith(fileId));
        if (match) {
          pptxPath = path.join(dir, match);
          break;
        }
      } catch (_) {}
    }

    // 2. Fall back to Supabase Storage and metadata lookup if not found directly on disk
    if (!pptxPath) {
      try {
        const { supabase } = await import("../../db/supabase-client");

        // 2a. Search objects in course-materials bucket
        const { data: storageList } = await supabase.storage
          .from("course-materials")
          .list("", { search: fileId });

        let matchName = storageList && storageList.length > 0 ? storageList[0].name : null;

        if (!matchName) {
          const { data: row } = await supabase.from("files").select("*").eq("id", fileId).maybeSingle();
          if (row) {
            matchName = row.storage_key || row.storageKey || `${fileId}-${row.filename || "file.pptx"}`;
          }
        }

        const candidateNames = matchName
          ? [matchName]
          : [fileId, `${fileId}.pptx`, `${fileId}.ppt`];

        for (const nameToTry of candidateNames) {
          const { data: blob, error: dlErr } = await supabase.storage
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
            break;
          }
        }
      } catch (sErr) {
        console.warn("⚠️ Supabase file lookup warning in pptx-slides:", sErr);
      }
    }

    if (!pptxPath) return json({ error: "File not found" }, 404);

    // Check cache: if PNG files already exist for this fileId, return them
    const cacheDir = path.join(process.cwd(), "uploads", "pptx-cache", fileId);
    await fs.mkdir(cacheDir, { recursive: true });

    const cachedPngs = (await fs.readdir(cacheDir))
      .filter((f) => f.endsWith(".png"))
      .sort();

    let pngPaths: string[];

    if (cachedPngs.length > 0) {
      pngPaths = cachedPngs.map((f) => path.join(cacheDir, f));
    } else {
      pngPaths = await convertPptxToImages(pptxPath, cacheDir);
    }

    if (pngPaths.length === 0) {
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
    console.error("[pptx-slides] Error:", err);
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
