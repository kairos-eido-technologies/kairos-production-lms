import { hashPassword } from "../../../auth";
import { repository } from "../../../db/repository";
import { validateRequestBody, resetPasswordSchema } from "../../validation";
import { logger } from "../../../logger";

export async function resetPasswordRoute(request: Request): Promise<Response> {
  try {
    const validation = await validateRequestBody(request, resetPasswordSchema);
    if (validation.errorResponse) {
      return validation.errorResponse;
    }

    const { email, code, newPassword } = validation.data;
    const emailLower = email.toLowerCase().trim();

    const user = await repository.getUserByEmail(emailLower);
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found." }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    const rawStoredCode = (user as any).resetPasswordCode || "";
    const [storedCode, timestampStr] = rawStoredCode.split(":");
    const codeAgeMs = timestampStr ? Date.now() - parseInt(timestampStr, 10) : 0;
    const MAX_CODE_AGE = 15 * 60 * 1000; // 15 minutes

    if (!storedCode || storedCode !== code.trim() || (timestampStr && codeAgeMs > MAX_CODE_AGE)) {
      return new Response(
        JSON.stringify({ error: "Incorrect or expired reset code. Please request a new code." }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        },
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await repository.updateUser(user.id, {
      passwordHash,
      ...({ resetPasswordCode: null } as any),
    });

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Password reset successfully",
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch (error) {
    logger.error({ err: error }, "resetPasswordRoute error");
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

