import dns from "node:dns";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import "dotenv/config";
import fs from "fs";
import path from "path";

try {
  dns.setDefaultResultOrder?.("ipv4first");
} catch (e) {}

function normalizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  let url = rawUrl.trim().replace(/^["']|["']$/g, "");

  // Direct Supabase hostname db.<ref>.supabase.co is IPv6-only and fails with ENOTFOUND on Vercel
  if (url.includes(".supabase.co") && url.includes("db.")) {
    const dbMatch = url.match(/db\.([a-z0-9]+)\.supabase\.co/i);
    if (dbMatch && dbMatch[1]) {
      const projectRef = dbMatch[1];
      // Replace host with IPv4 compatible pooler
      url = url.replace(`db.${projectRef}.supabase.co`, `aws-0-ap-northeast-1.pooler.supabase.com`);
      // Ensure username contains the project ref required by Supabase pooler
      if (url.includes("://postgres:") || url.includes("://postgres@")) {
        url = url.replace("://postgres:", `://postgres.${projectRef}:`);
      }
    }
  }

  return url;
}

function getConnectionString(): string {
  if (process.env.DATABASE_URL) {
    return normalizeSupabaseUrl(process.env.DATABASE_URL);
  }
  if (process.env.SUPABASE_DATABASE_URL) {
    return normalizeSupabaseUrl(process.env.SUPABASE_DATABASE_URL);
  }
  try {
    const envFile = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, "utf8");
      const match = content.match(/DATABASE_URL=(.+)/);
      if (match && match[1]) {
        return normalizeSupabaseUrl(match[1]);
      }
    }
  } catch (e) {}

  return "";
}

let client: postgres.Sql | null = null;
let currentUrl = "";

export function getDb() {
  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error(
      "[DATABASE] DATABASE_URL environment variable is not set. Please set DATABASE_URL in your .env file or Vercel Environment Variables.",
    );
  }
  if (!client || currentUrl !== connectionString) {
    if (client) {
      try {
        client.end().catch(() => {});
      } catch (e) {}
    }
    currentUrl = connectionString;
    client = postgres(connectionString, {
      prepare: false,
      ssl: "require",
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      max_lifetime: 60 * 15,
      onnotice: () => {},
    });
  }
  return drizzle(client, { schema });
}

export function resetDbClient() {
  if (client) {
    try {
      client.end({ timeout: 2 }).catch(() => {});
    } catch (e) {}
    client = null;
  }
}

export async function closeDb() {
  if (client) {
    await client.end();
    client = null;
  }
}
