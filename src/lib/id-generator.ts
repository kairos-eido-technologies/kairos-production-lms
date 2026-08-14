import { supabase } from "./db/supabase-client";
import { serverStore } from "./db/server-store";

/**
 * Generates unique sequential IDs for users based on role:
 * - Students: STU-1, STU-2, STU-3...
 * - Teachers: TCH-1, TCH-2, TCH-3...
 * - Admins: ADM-1, ADM-2, ADM-3...
 */
export async function generateSequentialRoleId(role: "admin" | "teacher" | "student"): Promise<string> {
  const prefix = role === "teacher" ? "TCH" : role === "admin" ? "ADM" : "STU";
  const existingIds: string[] = [];

  // 1. Fetch existing user IDs for this role from Supabase
  try {
    const { data: users } = await supabase.from("users").select("id").eq("role", role);
    if (users) {
      existingIds.push(...users.map((u: any) => u.id));
    }
  } catch (err) {
    console.warn("⚠️ Failed to fetch IDs from Supabase:", err);
  }

  // 2. Fetch existing user IDs for this role from serverStore
  try {
    const storeUsers = serverStore.getAllUsers();
    for (const u of storeUsers) {
      if (u.role === role) {
        existingIds.push(u.id);
      }
    }
  } catch (err) {
    console.warn("⚠️ Failed to fetch IDs from serverStore:", err);
  }

  // 3. Extract highest numeric index
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
