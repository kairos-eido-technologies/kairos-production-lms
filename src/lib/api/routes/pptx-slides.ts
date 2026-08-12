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
    // Look up file record
    const db = getDb();
    const row = await db.query.files.findFirst({ where: eq(files.id, fileId) });
    if (!row) return json({ error: "File not found" }, 404);

    const pptxPath = path.join(process.cwd(), "uploads", row.storageKey);

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
