import { sendPasswordResetEmail } from "../../../mail";
import { serverStore } from "../../../db/server-store";
import { supabase } from "../../../db/supabase-client";

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

    let user: any = null;
    try {
      const { data: sUser } = await supabase.from("users").select("*").eq("email", emailLower).maybeSingle();
      if (sUser) {
        user = sUser;
      }
    } catch (sErr) {
      console.warn("⚠️ Supabase query warning in forgotPasswordRoute:", sErr);
    }

    if (!user) {
      user = serverStore.getUserByEmail(emailLower);
    }

    if (!user) {
      return new Response(
        JSON.stringify({ error: "No account found with this email address." }),
        { status: 404, headers: { "content-type": "application/json" } }
      );
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      await supabase.from("users").update({ reset_password_code: resetCode }).eq("id", user.id);
    } catch (sErr) {}

    serverStore.updateUser(user.id, { resetPasswordCode: resetCode });

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
