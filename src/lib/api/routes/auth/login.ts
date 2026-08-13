import { getDb } from "../../../db/client";
import { users } from "../../../db/schema";
import { hashPassword, verifyPassword, generateToken } from "../../../auth";
import { eq } from "drizzle-orm";
import { serverStore } from "../../../db/server-store";

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

    try {
      const db = getDb();
      user = await db.query.users.findFirst({
        where: eq(users.email, emailLower),
      });
    } catch (dbErr) {
      console.warn("⚠️ Database query timed out / blocked locally during login.");
    }

    if (!user) {
      // Fallback 1: Supabase HTTPS REST API (always reachable, persistent store)
      try {
        const { supabase } = await import("../../../db/supabase-client");
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
        console.warn("⚠️ Supabase HTTPS fallback failed during login:", sErr);
      }
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

      // Default Teacher account fallback
      if (emailLower === "sarah.jenkins@itech.com" && password === "teacher123") {
        const teacherUser = serverStore.saveUser({
          id: "TCH01",
          name: "Dr. Sarah Jenkins",
          email: "sarah.jenkins@itech.com",
          role: "teacher",
          status: "active",
          joinedAt: new Date("2025-01-01T00:00:00.000Z").toISOString(),
          isEmailVerified: true,
        });
        const token = generateToken({
          userId: teacherUser.id,
          email: teacherUser.email,
          role: teacherUser.role,
        });

        return new Response(
          JSON.stringify({
            ok: true,
            token,
            user: teacherUser,
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

    // Seed accounts (admin/teacher) use known default passwords —
    // if matching seed credentials are provided, bypass bcrypt verification.
    const isSeedAdmin = emailLower === "admin@itech.com" && password === "admin123";
    const isSeedTeacher = emailLower === "sarah.jenkins@itech.com" && password === "teacher123";

    if (isSeedAdmin || isSeedTeacher) {
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
      const db = getDb();
      // Update lastActive and ensure user is persisted in Postgres DB
      await db
        .insert(users)
        .values({
          id: user.id,
          name: user.name,
          email: user.email.toLowerCase().trim(),
          passwordHash: user.passwordHash,
          role: user.role || "student",
          status: user.status || "active",
          joinedAt: user.joinedAt ? new Date(user.joinedAt) : new Date(),
          lastActive: new Date(),
          isEmailVerified: user.isEmailVerified ?? true,
          phone: user.phone || null,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: { lastActive: new Date() },
        });
    } catch (dbErr) {
      console.warn("⚠️ Database update lastActive timed out during login:", dbErr);
    }

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
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
