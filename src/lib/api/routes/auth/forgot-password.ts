import { sendPasswordResetEmail } from "../../../mail";
import { repository } from "../../../db/repository";
import { validateRequestBody, forgotPasswordSchema } from "../../validation";
import { logger } from "../../../logger";

export async function forgotPasswordRoute(request: Request): Promise<Response> {
  try {
    const validation = await validateRequestBody(request, forgotPasswordSchema);
    if (validation.errorResponse) {
      return validation.errorResponse;
    }

    const { email } = validation.data;
    const emailLower = email.toLowerCase().trim();

    const user = await repository.getUserByEmail(emailLower);
    if (!user) {
      // Prevent user enumeration: return generic success
      return new Response(
        JSON.stringify({
          ok: true,
          message: "If an account with that email exists, a reset code was sent.",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    await repository.updateUser(user.id, {
      ...({ resetPasswordCode: `${resetCode}:${Date.now()}` } as any),
    });

    await sendPasswordResetEmail(user.email, resetCode, user.name);

    return new Response(
      JSON.stringify({
        ok: true,
        message: "If an account with that email exists, a reset code was sent.",
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch (error) {
    logger.error({ err: error }, "forgotPasswordRoute error");
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

