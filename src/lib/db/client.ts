import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import "dotenv/config";

// Database connection
const connectionString = process.env.DATABASE_URL || "";

if (!connectionString && process.env.NODE_ENV === "production") {
  throw new Error("DATABASE_URL environment variable is not set");
}

let client: postgres.Sql | null = null;
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
  const connectionString = process.env.DATABASE_URL || "";
  if (!connectionString) {
    throw new Error(
      "[DATABASE] DATABASE_URL environment variable is not set. Please set DATABASE_URL in your .env file."
    );
  }
  if (!client || process.env.VERCEL) {
    client = postgres(connectionString, {
      prepare: false,
      ssl: "require",
      max: process.env.VERCEL ? 1 : 5,
      connect_timeout: 2, // 2 seconds fast timeout
      idle_timeout: 1,   // Close idle connections immediately in serverless
      max_lifetime: 30,  // Reconnect short-lived sockets
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
