import { getDb } from "../../db/client";
import { sql } from "drizzle-orm";

export async function healthRoute(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/health") return null;

  let dbOk = false;
  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    dbOk = true;
  } catch (e) {
    dbOk = false;
  }

  const payload = {
    status: dbOk ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    database: dbOk ? "connected" : "unreachable",
    uptime: process.uptime(),
  };

  return new Response(JSON.stringify(payload), {
    status: dbOk ? 200 : 503,
    headers: { "content-type": "application/json" },
  });
}
