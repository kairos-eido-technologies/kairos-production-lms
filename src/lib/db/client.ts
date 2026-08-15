import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import "dotenv/config";
import fs from "fs";
import path from "path";

function getConnectionString(): string {
  let url = process.env.DATABASE_URL || "";
  try {
    const envFile = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, "utf8");
      const match = content.match(/DATABASE_URL=(.+)/);
      if (match && match[1]) {
        url = match[1].trim();
      }
    }
  } catch (e) {}

  if (url.includes("db.pzmtbnsquhlplakcaezl.supabase.co")) {
    url = "postgresql://postgres.pzmtbnsquhlplakcaezl:kmHmzt6nClQNyzY7@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres";
  }

  return url;
}

let client: postgres.Sql | null = null;
let currentUrl = "";
let dbHealthy = true;
let lastCheckTime = 0;
const CIRCUIT_BREAKER_WINDOW_MS = 30000; // 30 seconds

export function isDatabaseHealthy(): boolean {
  if (!dbHealthy && Date.now() - lastCheckTime < CIRCUIT_BREAKER_WINDOW_MS) {
    return false;
  }
  return true;
}

export function markDbUnhealthy() {
  if (dbHealthy) {
    console.warn("⚠️ Database port 6543/5432 is unreachable locally. Activating 30s zero-latency circuit breaker (serverStore fallback).");
  }
  dbHealthy = false;
  lastCheckTime = Date.now();
}

export function markDbHealthy() {
  dbHealthy = true;
}

export function getDb() {
  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error(
      "[DATABASE] DATABASE_URL environment variable is not set. Please set DATABASE_URL in your .env file."
    );
  }
  if (!client || currentUrl !== connectionString || process.env.VERCEL) {
    if (client && !process.env.VERCEL) {
      try { client.end().catch(() => {}); } catch (e) {}
    }
    currentUrl = connectionString;
    client = postgres(connectionString, {
      prepare: false,
      ssl: "require",
      max: process.env.VERCEL ? 1 : 5,
      connect_timeout: 4,
      idle_timeout: 1,
      max_lifetime: 30,
    });
  }
  return drizzle(client, { schema });
}

export async function closeDb() {
  if (client) {
    await client.end();
    client = null;
  }
}

