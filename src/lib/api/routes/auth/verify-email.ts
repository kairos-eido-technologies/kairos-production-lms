import { verifyToken, generateToken } from "../../../auth";
import { sendVerificationEmail } from "../../../mail";
import { repository } from "../../../db/repository";
import { getTokenFromRequest } from "../../auth-utils";
import { logger } from "../../../logger";

export async function verifyEmailRoute(request: Request): Promise<Response> {
  try {
    const token = getTokenFromRequest(request);
    const body = await request.json().catch(() => ({}));
    const code = body?.code?.toString().trim();
    const requestEmail = body?.email ? body.email.toLowerCase().trim() : null;

    if (!code || code.length !== 6) {
      return new Response(
        JSON.stringify({ error: "Please enter a valid 6-digit verification code" }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }

    let payload: any = null;
    if (token) {
      payload = verifyToken(token);
    }

    const searchEmail = requestEmail || payload?.email;
    const searchUserId = payload?.userId;

    let user: any = null;
    if (searchUserId) {
      user = await repository.getUserById(searchUserId);
    }
    if (!user && searchEmail) {
      user = await repository.getUserByEmail(searchEmail);
    }

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Account not found. Please log in or register again." }),
        { status: 404, headers: { "content-type": "application/json" } },
      );
    }

    // Check verification code (allow master bypass code 123456 strictly in development)
    const expectedCode = (user as any).emailVerificationCode;
    const isDev = process.env.NODE_ENV !== "production";
    const isMasterBypass = isDev && code === "123456";
    if (expectedCode && expectedCode !== code && !isMasterBypass) {
      return new Response(
        JSON.stringify({ error: "Incorrect verification code. Please check your email." }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }

    // Mark email as verified in database
    await repository.updateUser(user.id, {
      isEmailVerified: true,
      ...({ emailVerificationCode: null } as any),
    });

    const updatedUser = await repository.getUserById(user.id);

    const newToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const { passwordHash: _, ...userWithoutPassword } = updatedUser as any;

    const isProd = process.env.NODE_ENV === "production";
    const cookieStr = `auth_token=${newToken}; HttpOnly; ${isProd ? "Secure; " : ""}Path=/; Max-Age=86400; SameSite=Lax`;

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Email verified successfully!",
        token: newToken,
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
    logger.error({ err: error }, "verifyEmailRoute error");
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export async function resendCodeRoute(request: Request): Promise<Response> {
  try {
    const body = await request.json().catch(() => ({}));
    const email = body?.email ? body.email.toLowerCase().trim() : null;

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const user = await repository.getUserByEmail(email);
    if (!user) {
      return new Response(JSON.stringify({ error: "Account not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    await repository.updateUser(user.id, {
      ...({ emailVerificationCode: verificationCode } as any),
    });

    await sendVerificationEmail(user.email, verificationCode, user.name);

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Verification code sent successfully",
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch (error) {
    logger.error({ err: error }, "resendCodeRoute error");
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

