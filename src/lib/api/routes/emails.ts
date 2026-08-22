import { sendAllTestEmails } from "../../mail";
import { requireRole } from "../middleware/auth";

export async function emailsRoute(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/test-emails") {
    const roleError = requireRole(request, ["admin"]);
    if (roleError) return roleError;

    const urlParams = url.searchParams;
    const targetEmail = urlParams.get("email") || "rhemanthjeyanezsingh@karunya.edu.in";
    const results = await sendAllTestEmails(targetEmail);
    return new Response(
      JSON.stringify({
        ok: true,
        message: `Dispatched 13 test email templates to ${targetEmail}`,
        sentCount: results.length,
        results,
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  }

  return null;
}
