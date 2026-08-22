import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, generateToken, verifyToken } from "../src/lib/auth";
import { requireAuth, requireRole } from "../src/lib/api/middleware/auth";

describe("Authentication & Security Module", () => {
  it("hashes and correctly verifies passwords with bcrypt", async () => {
    const rawPassword = "securePassword123!";
    const hash = await hashPassword(rawPassword);
    expect(hash).toBeDefined();
    expect(hash).not.toBe(rawPassword);
    expect(hash.startsWith("$2")).toBe(true);

    const isMatch = await verifyPassword(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await verifyPassword("wrongPassword", hash);
    expect(isWrongMatch).toBe(false);
  });

  it("generates and verifies valid JWT tokens", () => {
    const payload = {
      userId: "STU-100",
      email: "student100@itech.com",
      role: "student" as const,
    };

    const token = generateToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.email).toBe(payload.email);
    expect(decoded?.role).toBe(payload.role);
  });

  it("rejects invalid or tampered JWT tokens", () => {
    const fakeToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.payload";
    const decoded = verifyToken(fakeToken);
    expect(decoded).toBeNull();
  });

  it("allows access to public endpoints without auth", () => {
    const req = new Request("http://localhost:5173/api/certificates/verify?id=ITECH-2026-1001", {
      method: "GET",
    });
    const errorRes = requireAuth(req);
    expect(errorRes).toBeNull();
  });

  it("blocks non-public routes when auth token is missing", () => {
    const req = new Request("http://localhost:5173/api/users", {
      method: "GET",
    });
    const errorRes = requireAuth(req);
    expect(errorRes).not.toBeNull();
    expect(errorRes?.status).toBe(401);
  });

  it("enforces role guards correctly", () => {
    const adminToken = generateToken({ userId: "ADM01", email: "admin@itech.com", role: "admin" });
    const studentToken = generateToken({
      userId: "STU-1",
      email: "student@itech.com",
      role: "student",
    });

    const adminReq = new Request("http://localhost:5173/api/users", {
      method: "POST",
      headers: { authorization: `Bearer ${adminToken}` },
    });

    const studentReq = new Request("http://localhost:5173/api/users", {
      method: "POST",
      headers: { authorization: `Bearer ${studentToken}` },
    });

    const adminError = requireRole(adminReq, "admin");
    expect(adminError).toBeNull();

    const studentError = requireRole(studentReq, "admin");
    expect(studentError).not.toBeNull();
    expect(studentError?.status).toBe(403);
  });
});
