import { hashPassword, generateToken } from "../../../auth";
import { sendVerificationEmail } from "../../../mail";
import { repository } from "../../../db/repository";
import { generateSequentialRoleId } from "../../../id-generator";
import { validateRequestBody, registerSchema } from "../../validation";
import { logger } from "../../../logger";

export async function registerRoute(request: Request): Promise<Response> {
  try {
    const validation = await validateRequestBody(request, registerSchema);
    if (validation.errorResponse) {
      return validation.errorResponse;
    }

    const { name, email, password, phone } = validation.data;
    const emailLower = email.toLowerCase().trim();

    // Check if user already exists in database
    const existingUser = await repository.getUserByEmail(emailLower);
    if (existingUser) {
      return new Response(JSON.stringify({ error: "An account with that email already exists" }), {
        status: 409,
        headers: { "content-type": "application/json" },
      });
    }

    // Create new user with verification details
    const passwordHash = await hashPassword(password);
    const newUserId = await generateSequentialRoleId("student");
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const createdUser = await repository.createUser({
      id: newUserId,
      name: name.trim(),
      email: emailLower,
      passwordHash,
      role: "student",
      status: "active",
      joinedAt: new Date(),
      isEmailVerified: false,
      phone: phone || null,
    });

    // Also store verification code in database
    await repository.updateUser(newUserId, {
      ...({ emailVerificationCode: verificationCode } as any),
    });

    // Send verification email
    await sendVerificationEmail(emailLower, verificationCode, name.trim());

    const token = generateToken({
      userId: createdUser!.id,
      email: createdUser!.email,
      role: createdUser!.role,
    });

    const {
      passwordHash: _,
      emailVerificationCode: __,
      ...userWithoutPassword
    } = createdUser as any;

    const isProd = process.env.NODE_ENV === "production";
    return new Response(
      JSON.stringify({
        ok: true,
        token,
        user: userWithoutPassword,
      }),
      {
        status: 201,
        headers: {
          "content-type": "application/json",
          "set-cookie": `auth_token=${token}; HttpOnly; ${isProd ? "Secure; " : ""}Path=/; Max-Age=86400; SameSite=Lax`,
        },
      },
    );
  } catch (error) {
    logger.error({ err: error }, "Registration route error");
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

