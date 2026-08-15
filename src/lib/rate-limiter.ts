// In-memory token bucket rate limiter for DDoS and abuse prevention
interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

const ipBuckets = new Map<string, RateLimitBucket>();

// Clean up stale IP records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of ipBuckets.entries()) {
    if (now - bucket.lastRefill > 5 * 60 * 1000) {
      ipBuckets.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  maxTokens: number; // Maximum burst allowed
  refillRatePerSec: number; // Tokens added per second
}

const DEFAULT_AUTH_CONFIG: RateLimitConfig = {
  maxTokens: 30,
  refillRatePerSec: 0.5, // 30 tokens / min
};

const DEFAULT_FILE_CONFIG: RateLimitConfig = {
  maxTokens: 60,
  refillRatePerSec: 1.0, // 60 tokens / min
};

const DEFAULT_API_CONFIG: RateLimitConfig = {
  maxTokens: 200,
  refillRatePerSec: 3.33, // 200 tokens / min
};

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

export function checkRateLimit(
  request: Request,
  configOverride?: RateLimitConfig
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const url = new URL(request.url);
  const ip = getClientIp(request);
  const key = `${ip}:${url.pathname.startsWith("/api/auth") ? "auth" : url.pathname.startsWith("/api/files") ? "files" : "api"}`;

  let config = DEFAULT_API_CONFIG;
  if (url.pathname.startsWith("/api/auth")) {
    config = DEFAULT_AUTH_CONFIG;
  } else if (url.pathname.startsWith("/api/files") || url.pathname.startsWith("/api/pptx-slides")) {
    config = DEFAULT_FILE_CONFIG;
  }
  if (configOverride) {
    config = configOverride;
  }

  const now = Date.now();
  let bucket = ipBuckets.get(key);

  if (!bucket) {
    bucket = {
      tokens: config.maxTokens - 1,
      lastRefill: now,
    };
    ipBuckets.set(key, bucket);
    return { allowed: true, remaining: bucket.tokens };
  }

  // Refill tokens based on elapsed time
  const elapsedSecs = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(config.maxTokens, bucket.tokens + elapsedSecs * config.refillRatePerSec);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true, remaining: Math.floor(bucket.tokens) };
  }

  const missingTokens = 1 - bucket.tokens;
  const retryAfter = Math.ceil(missingTokens / config.refillRatePerSec);

  return { allowed: false, remaining: 0, retryAfter };
}
