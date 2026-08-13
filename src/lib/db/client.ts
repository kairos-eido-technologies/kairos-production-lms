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

export function getDb() {
  const connectionString = process.env.DATABASE_URL || "";
  if (!connectionString) {
    throw new Error(
      "[DATABASE] DATABASE_URL environment variable is not set. Please set DATABASE_URL in your .env file."
    );
  }
  if (!client) {
    client = postgres(connectionString, { prepare: false, ssl: "require" });
  }
  return drizzle(client, { schema });
}

export async function closeDb() {
  if (client) {
    await client.end();
    client = null;
  }
}
