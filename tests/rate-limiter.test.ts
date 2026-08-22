import { describe, it, expect } from "vitest";
import { checkRateLimit, getClientIp } from "../src/lib/rate-limiter";

describe("Token Bucket Rate Limiter", () => {
  it("allows standard request within quota", () => {
    const req = new Request("http://localhost:3000/api/courses", {
      headers: { "x-forwarded-for": "192.168.1.100" },
    });
    const result = checkRateLimit(req, { maxTokens: 10, refillRatePerSec: 1 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeLessThan(10);
  });

  it("extracts client IP from headers accurately", () => {
    const req = new Request("http://localhost:3000/api/courses", {
      headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
    });
    const ip = getClientIp(req);
    expect(ip).toBe("203.0.113.195");
  });

  it("blocks and provides retryAfter when tokens are exhausted", () => {
    const ip = "10.0.0.99";
    const config = { maxTokens: 3, refillRatePerSec: 1 };

    for (let i = 0; i < 3; i++) {
      const req = new Request("http://localhost:3000/api/test-limit", {
        headers: { "x-forwarded-for": ip },
      });
      checkRateLimit(req, config);
    }

    const blockedReq = new Request("http://localhost:3000/api/test-limit", {
      headers: { "x-forwarded-for": ip },
    });
    const blockedResult = checkRateLimit(blockedReq, config);
    expect(blockedResult.allowed).toBe(false);
    expect(blockedResult.retryAfter).toBeGreaterThan(0);
  });
});
