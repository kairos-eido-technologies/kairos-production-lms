import { getDb } from "../../../db/client";
import { users } from "../../../db/schema";
import { hashPassword } from "../../../auth";
import { eq } from "drizzle-orm";

export async function resetPasswordRoute(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { email, code, newPassword } = body;

    const emailLower = email?.toLowerCase().trim();
    if (!emailLower || !code || !newPassword) {
      return new Response(
        JSON.stringify({ error: "Email, code, and new password are required." }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters." }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const db = getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.email, emailLower),
    });

    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found." }),
        { status: 404, headers: { "content-type": "application/json" } }
      );
    }

    if (!user.resetPasswordCode || user.resetPasswordCode !== code.trim()) {
      return new Response(
        JSON.stringify({ error: "Incorrect or expired reset code." }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await db
      .update(users)
      .set({
        passwordHash,
        resetPasswordCode: null,
      })
      .where(eq(users.id, user.id));

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Password reset successfully",
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (error) {
    console.error("resetPasswordRoute error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
