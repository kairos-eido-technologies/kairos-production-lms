import { getDb } from "../../db/client";
import { requireAuth, requireRole, PUBLIC_PATHS } from "../middleware/auth";
import { logger } from "../../logger";
import { usersRoute } from "./users";
import { coursesRoute } from "./courses";
import { certificatesRoute } from "./certificates";
import { assessmentsRoute } from "./assessments";
import { communicationsRoute } from "./communications";
import { calendarRoute } from "./calendar";
import { checkpointsRoute } from "./checkpoints";
import { emailsRoute } from "./emails";

export { requireAuth, requireRole, PUBLIC_PATHS };


export async function contentRoute(request: Request): Promise<Response> {
  try {
    // Security: authenticate every request before touching the DB (allow-listed public paths pass through)
    const authError = requireAuth(request);
    if (authError) return authError;

    let db: any = null;
    try {
      db = getDb();
    } catch (dbErr) {}

    // Dispatch to domain route handlers
    const emailRes = await emailsRoute(request);
    if (emailRes) return emailRes;

    const userRes = await usersRoute(request, db);
    if (userRes) return userRes;

    const courseRes = await coursesRoute(request, db);
    if (courseRes) return courseRes;

    const certRes = await certificatesRoute(request, db);
    if (certRes) return certRes;

    const assessRes = await assessmentsRoute(request, db);
    if (assessRes) return assessRes;

    const commsRes = await communicationsRoute(request, db);
    if (commsRes) return commsRes;

    const calRes = await calendarRoute(request, db);
    if (calRes) return calRes;

    const cpRes = await checkpointsRoute(request, db);
    if (cpRes) return cpRes;

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    logger.error({ err }, "Content route error");
    return new Response(
      JSON.stringify({
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
}

