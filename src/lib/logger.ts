import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function createRequestLogger(request: Request) {
  const url = new URL(request.url);
  const requestId = crypto.randomUUID().slice(0, 8);
  return logger.child({
    requestId,
    method: request.method,
    path: url.pathname,
  });
}
