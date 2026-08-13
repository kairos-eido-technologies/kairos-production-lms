import "dotenv/config";
import bcrypt from "bcryptjs";
import { getDb } from "./src/lib/db/client";
import { users } from "./src/lib/db/schema";
import { eq } from "drizzle-orm";

async function seedAdmin() {
  console.log("🔐 Seeding Admin account...");
  
  try {
    const db = getDb();
    const adminPasswordHash = await bcrypt.hash("admin123", 10);
    const adminEmail = "admin@itech.com";

    // Check if admin already exists
    const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail));

    if (existingAdmin.length > 0) {
      // Update password hash and status
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
      console.log("✅ Admin account updated successfully!");
    } else {
      // Insert new admin account
      await db.insert(users).values({
        id: "ADM01",
        name: "Administrator",
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: "admin",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
        status: "active",
        joinedAt: new Date(),
        isEmailVerified: true,
        phone: "+1 (555) 019-2834",
      });
      console.log("✅ Admin account created successfully!");
    }

    console.log("\n🔑 Admin Credentials:");
    console.log("-----------------------");
    console.log("Email:    admin@itech.com");
    console.log("Password: admin123");
    console.log("Role:     admin");
    console.log("-----------------------\n");
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Failed to seed admin account:", err?.message || err);
    process.exit(1);
  }
}

seedAdmin();
