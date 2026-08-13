import { hashPassword } from "../../../auth";
import { serverStore } from "../../../db/server-store";
import { supabase } from "../../../db/supabase-client";

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

    let user: any = null;
    try {
      const { data: sUser } = await supabase.from("users").select("*").eq("email", emailLower).maybeSingle();
      if (sUser) {
        user = {
          ...sUser,
          resetPasswordCode: sUser.reset_password_code,
        };
      }
    } catch (sErr) {}

    if (!user) {
      user = serverStore.getUserByEmail(emailLower);
    }

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

    try {
      await supabase
        .from("users")
        .update({
          password_hash: passwordHash,
          reset_password_code: null,
        })
        .eq("id", user.id);
    } catch (sErr) {
      console.warn("⚠️ Supabase sync warning in resetPasswordRoute:", sErr);
    }

    // Sync to serverStore
    serverStore.updateUser(user.id, {
      passwordHash,
      resetPasswordCode: null,
    });

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
