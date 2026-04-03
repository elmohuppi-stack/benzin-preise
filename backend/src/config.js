import dotenv from "dotenv";

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH });

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 3000),
  logLevel: process.env.LOG_LEVEL || "info",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  tankApiKey: process.env.TANK_API_KEY || "",
  tankApiBaseUrl:
    process.env.TANK_API_BASE_URL ||
    "https://creativecommons.tankerkoenig.de/json",
  requestTimeoutMs: toNumber(process.env.REQUEST_TIMEOUT_MS, 6000),
  retryCount: toNumber(process.env.UPSTREAM_RETRY_COUNT, 2),
  retryBaseDelayMs: toNumber(process.env.UPSTREAM_RETRY_BASE_DELAY_MS, 250),
  cacheTtlSeconds: toNumber(process.env.CACHE_TTL_SECONDS, 600),
  rateLimitWindowSeconds: toNumber(process.env.RATE_LIMIT_WINDOW_SECONDS, 60),
  rateLimitMaxRequests: toNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 90),
};
