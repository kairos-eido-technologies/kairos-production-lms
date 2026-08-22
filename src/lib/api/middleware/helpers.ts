import { randomUUID } from "crypto";
import { repository } from "../../db/repository";
import { generateSequentialRoleId } from "../../id-generator";

export function makeId(): string {
  return `${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export async function generateUniqueRoleId(role: "admin" | "teacher" | "student"): Promise<string> {
  return generateSequentialRoleId(role);
}

export async function insertNotification(
  db: any,
  userId: string,
  title: string,
  message: string,
  link?: string,
): Promise<void> {
  await repository.createNotification(userId, title, message, link);
}

export async function insertMessage(
  db: any,
  fromId: string,
  toId: string,
  subject: string,
  body: string,
): Promise<void> {
  await repository.createMessage(fromId, toId, subject, body);
}
