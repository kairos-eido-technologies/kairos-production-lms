import { getDb, isDatabaseHealthy, markDbUnhealthy, markDbHealthy } from "../../../db/client";
import { users } from "../../../db/schema";
import { verifyToken } from "../../../auth";
import { eq } from "drizzle-orm";
import { serverStore } from "../../../db/server-store";

function getTokenFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|; )auth_token=([^;]+)/);
  return match?.[1] ?? null;
}

export async function sessionRoute(request: Request): Promise<Response> {
  const token = getTokenFromCookie(request);
  if (!token) {
    return new Response(
      JSON.stringify({ ok: false, error: "No active session" }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }

  const payload = verifyToken(token);
  if (!payload) {
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid session" }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }

  let user: any = null;

  if (isDatabaseHealthy()) {
    try {
      const db = getDb();
      await db
        .update(users)
        .set({ lastActive: new Date() })
        .where(eq(users.id, payload.userId));

      user = await db.query.users.findFirst({
        where: eq(users.id, payload.userId),
      });
      if (user) markDbHealthy();
    } catch (err) {
      markDbUnhealthy();
    }
  }

  // Fallback: try serverStore for ANY user (not just admin) when DB is slow
  if (!user) {
    const storeUser =
      serverStore.getUserById(payload.userId) ||
      serverStore.getUserByEmail(payload.email);
    if (storeUser) {
      // Patch dates so they match the DB shape the rest of the app expects
      user = {
        ...storeUser,
        joinedAt: storeUser.joinedAt ? new Date(storeUser.joinedAt) : new Date(),
        lastActive: storeUser.lastActive ? new Date(storeUser.lastActive) : null,
      };
      // Update lastActive in serverStore so it's reflected immediately
      serverStore.updateUser(storeUser.id, { lastActive: new Date().toISOString() });
    }
  }

  // Final hardcoded fallback for default admin account
  if (!user && payload.userId === "ADM01") {
    user = {
      id: "ADM01",
      name: "Administrator",
      email: "admin@itech.com",
      role: "admin",
      status: "active",
      joinedAt: new Date("2025-01-01T00:00:00.000Z"),
      isEmailVerified: true,
    };
  }

  if (!user) {
    return new Response(
      JSON.stringify({ ok: false, error: "User not found" }),
      { status: 404, headers: { "content-type": "application/json" } },
    );
  }

  const { passwordHash, emailVerificationCode, resetPasswordCode, ...userWithoutPassword } = user;
  return new Response(
    JSON.stringify({ ok: true, user: userWithoutPassword }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
