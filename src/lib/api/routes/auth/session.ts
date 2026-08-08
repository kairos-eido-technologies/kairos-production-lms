import { getDb } from "../../../db/client";
import { users } from "../../../db/schema";
import { verifyToken } from "../../../auth";
import { eq } from "drizzle-orm";

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

  const db = getDb();
  await db
    .update(users)
    .set({ lastActive: new Date() })
    .where(eq(users.id, payload.userId));

  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.userId),
  });

  if (!user) {
    return new Response(
      JSON.stringify({ ok: false, error: "User not found" }),
      { status: 404, headers: { "content-type": "application/json" } },
    );
  }

  const { passwordHash, ...userWithoutPassword } = user;
  return new Response(
    JSON.stringify({ ok: true, user: userWithoutPassword }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
