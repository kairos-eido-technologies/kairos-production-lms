import { getDb } from "../../../db/client";
import { users } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { sendPasswordResetEmail } from "../../../mail";

export async function forgotPasswordRoute(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { email } = body;

    const emailLower = email?.toLowerCase().trim();
    if (!emailLower || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailLower)) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const db = getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.email, emailLower),
    });

    if (!user) {
      return new Response(
        JSON.stringify({ error: "No account found with this email address." }),
        { status: 404, headers: { "content-type": "application/json" } }
      );
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    await db
      .update(users)
      .set({ resetPasswordCode: resetCode })
      .where(eq(users.id, user.id));

    await sendPasswordResetEmail(user.email, resetCode, user.name);

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Reset code sent successfully",
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (error) {
    console.error("forgotPasswordRoute error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
