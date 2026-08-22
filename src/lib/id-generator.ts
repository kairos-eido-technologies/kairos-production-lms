import { getDb } from "./db/client";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

/**
 * Generates unique sequential IDs for users based on role:
 * - Students: STU-1, STU-2, STU-3...
 * - Teachers: TCH-1, TCH-2, TCH-3...
 * - Admins: ADM-1, ADM-2, ADM-3...
 */
export async function generateSequentialRoleId(
  role: "admin" | "teacher" | "student",
): Promise<string> {
  const prefix = role === "teacher" ? "TCH" : role === "admin" ? "ADM" : "STU";
  const existingIds: string[] = [];

  try {
    const db = getDb();
    const roleUsers = await db.select({ id: users.id }).from(users).where(eq(users.role, role));
    for (const u of roleUsers) {
      if (u.id) existingIds.push(u.id);
    }
  } catch (err) {
    console.warn("⚠️ Failed to fetch IDs from database:", err);
  }

  // Extract highest numeric index
  let maxNum = 0;
  const regex = new RegExp(`^${prefix}-?(\\d+)$`, "i");

  for (const id of existingIds) {
    if (!id) continue;
    const match = id.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `${prefix}-${nextNum}`;
}
