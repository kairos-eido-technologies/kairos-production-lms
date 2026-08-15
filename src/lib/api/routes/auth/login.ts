import { hashPassword, verifyPassword, generateToken } from "../../../auth";
import { serverStore } from "../../../db/server-store";
import { supabase } from "../../../db/supabase-client";

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

    const emailLower = email.toLowerCase().trim();
    let user: any = null;

    // 1. Supabase HTTPS REST API (Primary fast persistent store)
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", emailLower)
        .maybeSingle();

      if (data && !error) {
        user = {
          ...data,
          passwordHash: data.password_hash || data.passwordHash,
          joinedAt: data.joined_at || data.joinedAt,
          isEmailVerified: data.is_email_verified ?? data.isEmailVerified ?? true,
          emailVerificationCode: data.email_verification_code || data.emailVerificationCode,
        };
        serverStore.saveUser({
          id: user.id,
          name: user.name,
          email: user.email,
          passwordHash: user.passwordHash,
          role: user.role,
          status: user.status,
          joinedAt: user.joinedAt,
          isEmailVerified: user.isEmailVerified ?? false,
          phone: user.phone || null,
        });
      }
    } catch (sErr) {
      console.warn("⚠️ Supabase HTTPS query failed during login:", sErr);
    }

    if (!user) {
      // Fallback 2: check serverStore memory cache
      const storeUser = serverStore.getUserByEmail(emailLower);
      if (storeUser) {
        user = storeUser;
      }
    }

    if (!user) {
      // Default Admin account fallback
      if (emailLower === "admin@itech.com" && password === "admin123") {
        const adminUser = serverStore.saveUser({
          id: "ADM01",
          name: "Administrator",
          email: "admin@itech.com",
          role: "admin",
          status: "active",
          joinedAt: new Date("2025-01-01T00:00:00.000Z").toISOString(),
          isEmailVerified: true,
        });
        const token = generateToken({
          userId: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
        });

        return new Response(
          JSON.stringify({
            ok: true,
            token,
            user: adminUser,
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              "set-cookie": `auth_token=${token}; HttpOnly; Secure; Path=/; Max-Age=86400; SameSite=Strict`,
            },
          }
        );
      }


      return new Response(
        JSON.stringify({ error: "Invalid email or password" }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }

    // Seed accounts (admin) use a known default password —
    // if matching seed credentials are provided, bypass bcrypt verification.
    const isSeedAdmin = emailLower === "admin@itech.com" && password === "admin123";

    if (isSeedAdmin) {
      // Seed credentials matched successfully
    } else if (!user.passwordHash) {
      // Security enforcement: non-seed account with no password hash cannot authenticate
      return new Response(
        JSON.stringify({ error: "Invalid email or password" }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    } else {
      const passwordValid = await verifyPassword(password, user.passwordHash);
      if (!passwordValid) {
        return new Response(
          JSON.stringify({ error: "Invalid email or password" }),
          { status: 401, headers: { "content-type": "application/json" } }
        );
      }
    }

    if (user.status === "inactive") {
      return new Response(
        JSON.stringify({ error: "Account is inactive. Contact admin." }),
        { status: 403, headers: { "content-type": "application/json" } }
      );
    }

    try {
      await supabase.from("users").update({
        last_active: new Date().toISOString(),
      }).eq("id", user.id);
    } catch (sErr) {}

    serverStore.saveUser({
      ...user,
      passwordHash: user.passwordHash,
      lastActive: new Date().toISOString(),
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const { passwordHash: _, ...userWithoutPassword } = user;

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
      JSON.stringify({ error: "Internal server error", details: (error as any)?.message, stack: (error as any)?.stack }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
