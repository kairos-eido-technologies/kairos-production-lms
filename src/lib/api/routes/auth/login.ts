import { verifyPassword, generateToken } from "../../../auth";
import { repository } from "../../../db/repository";
import { validateRequestBody, loginSchema } from "../../validation";
import { logger } from "../../../logger";

export async function loginRoute(request: Request): Promise<Response> {
  try {
    const validation = await validateRequestBody(request, loginSchema);
    if (validation.errorResponse) {
      return validation.errorResponse;
    }

    const { email, password } = validation.data;
    const emailLower = email.toLowerCase().trim();
    const user: any = await repository.getUserByEmail(emailLower);

    if (!user || !user.passwordHash) {
      return new Response(JSON.stringify({ error: "Invalid email or password" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return new Response(JSON.stringify({ error: "Invalid email or password" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    if (user.status === "inactive") {
      return new Response(JSON.stringify({ error: "Account is inactive. Contact admin." }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }

    // Update lastActive in database
    await repository.updateUser(user.id, { lastActive: new Date() });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const {
      passwordHash: _,
      emailVerificationCode: __,
      resetPasswordCode: ___,
      ...userWithoutPassword
    } = user;

    const isProd = process.env.NODE_ENV === "production";
    const cookieStr = `auth_token=${token}; HttpOnly; ${isProd ? "Secure; " : ""}Path=/; Max-Age=86400; SameSite=Lax`;

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
          "set-cookie": cookieStr,
        },
      },
    );
  } catch (error) {
    logger.error({ err: error }, "Login route error");
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}

