import { getDb } from "../../../db/client";
import { users } from "../../../db/schema";
import { hashPassword, verifyPassword, generateToken } from "../../../auth";
import { eq } from "drizzle-orm";

export async function loginRoute(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password required" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const db = getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Invalid email or password" }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return new Response(
        JSON.stringify({ error: "Invalid email or password" }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }

    if (user.status === "inactive") {
      return new Response(
        JSON.stringify({ error: "Account is inactive. Contact admin." }),
        { status: 403, headers: { "content-type": "application/json" } }
      );
    }

    const [updatedUser] = await db
      .update(users)
      .set({ lastActive: new Date() })
      .where(eq(users.id, user.id))
      .returning();

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Remove password from response
    const finalUser = updatedUser ?? user;
    const { passwordHash: _, ...userWithoutPassword } = finalUser;

    return new Response(
      JSON.stringify({
        ok: true,
        token,
        user: userWithoutPassword,
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "set-cookie": `auth_token=${token}; HttpOnly; Secure; Path=/; Max-Age=86400; SameSite=Strict`,
        },
      }
    );
  } catch (error) {
    console.error("Login error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
