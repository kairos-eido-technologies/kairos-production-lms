import { repository } from "../db/repository";
import { generateSequentialRoleId } from "../id-generator";
import { hashPassword } from "../auth";

export const userService = {
  async listUsers() {
    return repository.getUsers();
  },

  async createUser(body: {
    id?: string;
    name?: string;
    email: string;
    password?: string;
    role?: string;
    group?: string | null;
    status?: string;
    phone?: string | null;
  }) {
    const rawRole = (body.role || "student").toLowerCase().trim();
    const role: "student" | "teacher" | "admin" =
      rawRole === "admin" || rawRole === "teacher" ? rawRole : "student";

    const email = (body.email || "").toLowerCase().trim();
    if (!email) {
      throw new Error("Email is required");
    }

    const existingUser = await repository.getUserByEmail(email);
    if (existingUser) {
      const err = new Error("A user with this email already exists.");
      (err as any).statusCode = 409;
      throw err;
    }

    const nextId = body.id || (await generateSequentialRoleId(role));
    const rawPassword = (body.password || "").trim();
    const passwordHash = rawPassword
      ? await hashPassword(rawPassword)
      : await hashPassword("Welcome123!");

    const user = await repository.createUser({
      id: nextId,
      name: body.name || email.split("@")[0],
      email,
      passwordHash,
      role,
      group: body.group || null,
      status: body.status || "active",
      phone: body.phone || null,
      isEmailVerified: true,
    });

    return user;
  },

  async updateUser(id: string, data: any) {
    return repository.updateUser(id, data);
  },

  async deleteUser(id: string) {
    return repository.deleteUser(id);
  },
};
