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

  // 1. Primary source: Supabase REST API
  try {
    const { supabase } = await import("../../../db/supabase-client");
    const { data: sUser } = await supabase
      .from("users")
      .select("*")
      .eq("id", payload.userId)
      .maybeSingle();

    if (sUser) {
      user = {
        ...sUser,
        joinedAt: sUser.joined_at ? new Date(sUser.joined_at) : new Date(),
        lastActive: new Date(),
        isEmailVerified: sUser.is_email_verified ?? true,
        phone: sUser.phone,
        group: sUser.group_name || sUser.group,
      };
      serverStore.saveUser({
        id: sUser.id,
        name: sUser.name,
        email: sUser.email,
        role: sUser.role,
        status: sUser.status,
        joinedAt: sUser.joined_at,
        isEmailVerified: sUser.is_email_verified ?? true,
        phone: sUser.phone,
      });

      // Update last_active in Supabase
      supabase.from("users").update({ last_active: new Date().toISOString() }).eq("id", sUser.id).then();
    }
  } catch (sErr) {
    console.warn("⚠️ Supabase session query warning:", sErr);
  }

  // Fallback 2: try serverStore for ANY user when DB and Supabase fail
  if (!user) {
    const storeUser =
      serverStore.getUserById(payload.userId) ||
      serverStore.getUserByEmail(payload.email);
    if (storeUser) {
      user = {
        ...storeUser,
        joinedAt: storeUser.joinedAt ? new Date(storeUser.joinedAt) : new Date(),
        lastActive: storeUser.lastActive ? new Date(storeUser.lastActive) : null,
      };
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
