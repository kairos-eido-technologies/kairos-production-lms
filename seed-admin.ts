import "dotenv/config";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { getDb } from "./src/lib/db/client";
import { users } from "./src/lib/db/schema";
import { eq } from "drizzle-orm";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://pzmtbnsquhlplakcaezl.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bXRibnNxdWhscGxha2NhZXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NjAxNzYsImV4cCI6MjEwMjEzNjE3Nn0.ENqDZPXBDuS2FtRJt2Z6pLMHjVm1tqRMDKm-Y1EkM5w";

async function seedAdmin() {
  console.log("🔐 Seeding Admin account...");
  const adminEmail = "admin@itech.com";
  const adminPasswordHash = await bcrypt.hash("admin123", 10);

  // Strategy 1: Try Drizzle ORM (Postgres Direct)
  try {
    const db = getDb();
    const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail));

    if (existingAdmin.length > 0) {
      await db
        .update(users)
        .set({
          passwordHash: adminPasswordHash,
          role: "admin",
          status: "active",
          isEmailVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(users.email, adminEmail));
      console.log("✅ Admin account updated successfully via Postgres!");
    } else {
      await db.insert(users).values({
        id: "ADM01",
        name: "Administrator",
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: "admin",
        avatar:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
        status: "active",
        joinedAt: new Date(),
        isEmailVerified: true,
        phone: "+1 (555) 019-2834",
      });
      console.log("✅ Admin account created successfully via Postgres!");
    }
    printCredentials();
    process.exit(0);
  } catch (dbErr: any) {
    console.warn(
      "⚠️ Postgres direct connection timed out / blocked. Retrying via Supabase HTTPS API...",
    );

    // Strategy 2: Fallback to Supabase HTTPS REST API (Port 443 — works on any network)
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error } = await supabase.from("users").upsert(
        {
          id: "ADM01",
          name: "Administrator",
          email: adminEmail,
          password_hash: adminPasswordHash,
          role: "admin",
          avatar:
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
          status: "active",
          is_email_verified: true,
          phone: "+1 (555) 019-2834",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      );

      if (error) {
        throw error;
      }
      console.log("✅ Admin account created/updated successfully via Supabase HTTPS API!");
      printCredentials();
      process.exit(0);
    } catch (apiErr: any) {
      console.error("❌ Failed to seed admin account:", apiErr?.message || apiErr);
      process.exit(1);
    }
  }
}

function printCredentials() {
  console.log("\n🔑 Admin Credentials:");
  console.log("-----------------------");
  console.log("Email:    admin@itech.com");
  console.log("Password: admin123");
  console.log("Role:     admin");
  console.log("-----------------------\n");
}

seedAdmin();
