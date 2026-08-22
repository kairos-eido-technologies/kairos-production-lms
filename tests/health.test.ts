import { describe, it, expect } from "vitest";
import { healthRoute } from "../src/lib/api/routes/health";

describe("Health Check Endpoint", () => {
  it("returns healthy database connectivity status on /api/health", async () => {
    const req = new Request("http://localhost:3000/api/health");
    const res = await healthRoute(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(200);

    const body = await res?.json();
    expect(body.status).toBe("healthy");
    expect(body.database).toBe("connected");
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(body.timestamp).toBeDefined();
  });

  it("ignores non-health routes", async () => {
    const req = new Request("http://localhost:3000/api/other");
    const res = await healthRoute(req);
    expect(res).toBeNull();
  });
});
