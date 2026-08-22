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

function getConnectionString(): string {
  let url = process.env.DATABASE_URL || "";
  try {
    const envFile = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, "utf8");
      const match = content.match(/DATABASE_URL=(.+)/);
      if (match && match[1]) {
        url = match[1].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch (e) {}

  return url;
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
