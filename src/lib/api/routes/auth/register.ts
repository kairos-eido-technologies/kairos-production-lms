import { getDb } from "../../../db/client";
import { users } from "../../../db/schema";
import { hashPassword, generateToken } from "../../../auth";
import { eq } from "drizzle-orm";
import { sendVerificationEmail } from "../../../mail";
import { randomUUID } from "crypto";
import { serverStore } from "../../../db/server-store";
import { supabase } from "../../../db/supabase-client";


export async function registerRoute(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { name, email, password, phone } = body;

    // Validation
    if (!name?.trim()) {
      return new Response(
        JSON.stringify({ error: "Name is required" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const emailLower = email?.toLowerCase().trim();
    if (!emailLower || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailLower)) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    if (!password || password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    // Check if user already exists
    let existingUser = null;
    try {
      const db = getDb();
      existingUser = await db.query.users.findFirst({
        where: eq(users.email, emailLower),
      });
    } catch (dbErr) {
      console.warn("⚠️ Database query timed out / blocked locally during registration.");
      // Fallback: check serverStore so we don't allow duplicate accounts on cold starts
      existingUser = serverStore.getUserByEmail(emailLower);
    }

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "An account with that email already exists" }),
        { status: 409, headers: { "content-type": "application/json" } }
      );
    }

    // Create new user with verification details
    const passwordHash = await hashPassword(password);
    
    // Generate unique student ID (STU-<uuid short>)
    const newUserId = `STU-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    let createdUserRecord: any = null;

    try {
      const db = getDb();
      const newUser = await db
        .insert(users)
        .values({
          id: newUserId,
          name: name.trim(),
          email: emailLower,
          passwordHash,
          role: "student",
          status: "active",
          joinedAt: new Date(),
          lastActive: new Date(),
          isEmailVerified: false,
          emailVerificationCode: verificationCode,
          phone: phone || null,
        })
        .returning();
      createdUserRecord = newUser[0];
    } catch (dbErr) {
      console.warn("⚠️ Database insert timed out locally. Created local fallback user session.");
      createdUserRecord = {
        id: newUserId,
        name: name.trim(),
        email: emailLower,
        passwordHash,
        role: "student",
        status: "active",
        joinedAt: new Date(),
        lastActive: new Date(),
        isEmailVerified: false,
        emailVerificationCode: verificationCode,
        phone: phone || null,
      };
    }

    if (!createdUserRecord) {
      throw new Error("Failed to create user");
    }

    // Always sync registered user into serverStore & Supabase
    serverStore.saveUser({
      id: createdUserRecord.id,
      name: createdUserRecord.name,
      email: createdUserRecord.email,
      passwordHash,
      role: createdUserRecord.role || "student",
      status: "active",
      joinedAt: createdUserRecord.joinedAt ? new Date(createdUserRecord.joinedAt).toISOString() : new Date().toISOString(),
      isEmailVerified: false,
      emailVerificationCode: verificationCode,
      phone: createdUserRecord.phone || null,
    });

    try {
      await supabase.from("users").upsert({
        id: createdUserRecord.id,
        name: createdUserRecord.name,
        email: createdUserRecord.email,
        password_hash: passwordHash,
        role: "student",
        status: "active",
        joined_at: new Date().toISOString(),
        is_email_verified: false,
        email_verification_code: verificationCode,
        phone: phone || null,
      }, { onConflict: "id" });
    } catch (sErr) {
      console.warn("⚠️ Supabase HTTPS sync warning:", sErr);
    }

    // Send the real verification email
    await sendVerificationEmail(emailLower, verificationCode, name.trim());

    const token = generateToken({
      userId: createdUserRecord.id,
      email: createdUserRecord.email,
      role: createdUserRecord.role,
    });

    const { passwordHash: _, emailVerificationCode: __, ...userWithoutPassword } = createdUserRecord;

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
          "set-cookie": `auth_token=${token}; HttpOnly; Secure; Path=/; Max-Age=86400; SameSite=Strict`,
        },
      }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
