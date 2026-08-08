import { getDb } from "../../../db/client";
import { users } from "../../../db/schema";
import { hashPassword, generateToken } from "../../../auth";
import { eq } from "drizzle-orm";
import { sendVerificationEmail } from "../../../mail";
import { randomUUID } from "crypto";


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

    const db = getDb();

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, emailLower),
    });

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

    if (!newUser[0]) {
      throw new Error("Failed to create user");
    }

    // Send the real verification email
    await sendVerificationEmail(emailLower, verificationCode, name.trim());

    const token = generateToken({
      userId: newUser[0].id,
      email: newUser[0].email,
      role: newUser[0].role,
    });

    const { passwordHash: _, emailVerificationCode: __, ...userWithoutPassword } = newUser[0];

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
