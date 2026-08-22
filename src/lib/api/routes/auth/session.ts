import { verifyToken } from "../../../auth";
import { repository } from "../../../db/repository";
import { getTokenFromRequest } from "../../auth-utils";

export async function sessionRoute(request: Request): Promise<Response> {

  const token = getTokenFromRequest(request);
  if (!token) {
    return new Response(JSON.stringify({ ok: false, error: "No active session" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid session" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const user =
    (await repository.getUserById(payload.userId)) ||
    (await repository.getUserByEmail(payload.email));

  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: "User not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  // Update last active timestamp
  await repository.updateUser(user.id, { lastActive: new Date() });

  const { passwordHash: _, ...userWithoutPassword } = user;
  return new Response(JSON.stringify({ ok: true, user: userWithoutPassword }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
