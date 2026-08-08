import { getDb } from "../../../db/client";
import { users } from "../../../db/schema";
import { verifyToken } from "../../../auth";
import { eq } from "drizzle-orm";
import { sendVerificationEmail } from "../../../mail";

function getTokenFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|; )auth_token=([^;]+)/);
  return match?.[1] ?? null;
}

export async function verifyEmailRoute(request: Request): Promise<Response> {
  try {
    const token = getTokenFromCookie(request);
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Unauthorized — No active session" }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return new Response(
        JSON.stringify({ error: "Unauthorized — Invalid session" }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }

    const body = await request.json();
    const { code } = body;

    if (!code || code.trim().length !== 6) {
      return new Response(
        JSON.stringify({ error: "Invalid verification code format" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const db = getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });

    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "content-type": "application/json" } }
      );
    }

    if (user.isEmailVerified) {
      return new Response(
        JSON.stringify({ ok: true, message: "Email is already verified", user: deletePassword(user) }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    if (user.emailVerificationCode !== code.trim()) {
      return new Response(
        JSON.stringify({ error: "Incorrect verification code" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    // Update user status
    const [updatedUser] = await db
      .update(users)
      .set({
        isEmailVerified: true,
        emailVerificationCode: null,
      })
      .where(eq(users.id, user.id))
      .returning();

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Email verified successfully",
        user: deletePassword(updatedUser ?? { ...user, isEmailVerified: true, emailVerificationCode: null }),
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (error) {
    console.error("verifyEmailRoute error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

export async function resendCodeRoute(request: Request): Promise<Response> {
  try {
    const token = getTokenFromCookie(request);
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }

    const db = getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });

    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "content-type": "application/json" } }
      );
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();

    await db
      .update(users)
      .set({ emailVerificationCode: newCode })
      .where(eq(users.id, user.id));

    // Send email
    await sendVerificationEmail(user.email, newCode, user.name);

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Verification code resent successfully",
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (error) {
    console.error("resendCodeRoute error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

function deletePassword(user: any) {
  const { passwordHash, ...rest } = user;
  return rest;
}
