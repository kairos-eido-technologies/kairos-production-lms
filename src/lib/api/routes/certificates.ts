import { repository } from "../../../lib/db/repository";
import { certificateService } from "../../../lib/services/certificate.service";
import { requireRole } from "../middleware/auth";

export async function certificatesRoute(request: Request, _db?: any): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  // GET /api/certificates/verify -> Public certificate verification
  if (request.method === "GET" && path === "/api/certificates/verify") {
    const certId = url.searchParams.get("id")?.trim();
    if (!certId) {
      return new Response(JSON.stringify({ ok: false, error: "Missing certificate ID" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const verified = await certificateService.verifyCertificate(certId);
    if (!verified) {
      return new Response(
        JSON.stringify({ ok: false, error: "Certificate not found or not approved" }),
        {
          status: 404,
          headers: { "content-type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        certificate: verified,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  // GET /api/certificates/:id -> retrieve certificate by ID
  if (
    request.method === "GET" &&
    path.startsWith("/api/certificates/") &&
    !path.includes("/approve") &&
    !path.includes("/reject")
  ) {
    const certId = path.slice("/api/certificates/".length).trim();
    const cert = await certificateService.getCertificateById(certId);

    if (!cert) {
      return new Response(JSON.stringify({ ok: false, error: "Certificate not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        certificate: cert,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  // GET /api/certificates
  if (request.method === "GET" && path === "/api/certificates") {
    const status = url.searchParams.get("status");
    const pageParam = url.searchParams.get("page");
    const limitParam = url.searchParams.get("limit");

    const certificates = await certificateService.listCertificates(status);
    if (pageParam) {
      const page = Math.max(1, parseInt(pageParam, 10) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(limitParam || "25", 10) || 25));
      const total = certificates.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const paginated = certificates.slice((page - 1) * limit, page * limit);
      return new Response(
        JSON.stringify({ certificates: paginated, total, page, limit, totalPages }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ certificates }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // POST /api/certificates
  if (request.method === "POST" && path === "/api/certificates") {
    const body = await request.json();
    const created = await certificateService.requestCertificate(body);

    return new Response(JSON.stringify({ ok: true, certificate: created }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // PUT /api/certificates/:id/approve
  if (
    request.method === "PUT" &&
    path.startsWith("/api/certificates/") &&
    path.endsWith("/approve")
  ) {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const id = path.slice("/api/certificates/".length, -"/approve".length);
    let body: any = {};
    try {
      body = await request.json();
    } catch (_) {}
    const updated = await certificateService.approveCertificate(id, body?.teacherNote);

    return new Response(JSON.stringify({ ok: true, certificate: updated }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // PUT /api/certificates/:id/reject
  if (
    request.method === "PUT" &&
    path.startsWith("/api/certificates/") &&
    path.endsWith("/reject")
  ) {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const id = path.slice("/api/certificates/".length, -"/reject".length);
    const body = await request.json();
    const updated = await certificateService.rejectCertificate(id, body.reason);

    return new Response(JSON.stringify({ certificate: updated }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // PUT /api/certificates/:id (general update)
  if (request.method === "PUT" && path.startsWith("/api/certificates/")) {
    const roleError = requireRole(request, ["admin", "teacher"]);
    if (roleError) return roleError;

    const id = path.slice("/api/certificates/".length);
    const body = await request.json();
    const updated = await repository.updateCertificate(id, body);

    return new Response(JSON.stringify({ certificate: updated }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  return null;
}
