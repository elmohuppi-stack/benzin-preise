import dotenv from "dotenv";

dotenv.config();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 3000),
  logLevel: process.env.LOG_LEVEL || "info",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL || "",
  tankApiKey: process.env.TANK_API_KEY || "",
  tankApiBaseUrl:
    process.env.TANK_API_BASE_URL ||
    "https://creativecommons.tankerkoenig.de/json",
  requestTimeoutMs: toNumber(process.env.REQUEST_TIMEOUT_MS, 6000),
  retryCount: toNumber(process.env.UPSTREAM_RETRY_COUNT, 2),
  retryBaseDelayMs: toNumber(process.env.UPSTREAM_RETRY_BASE_DELAY_MS, 250),
  cacheTtlSeconds: toNumber(process.env.CACHE_TTL_SECONDS, 60),
  upstreamMinRefreshMinutes: toNumber(
    process.env.UPSTREAM_MIN_REFRESH_MINUTES,
    10,
  ),
  searchStorageDir: process.env.SEARCH_STORAGE_DIR || "./data",
  historyRetentionDays: toNumber(process.env.HISTORY_RETENTION_DAYS, 30),
  redisUrl: process.env.REDIS_URL || "",
  rateLimitWindowSeconds: toNumber(process.env.RATE_LIMIT_WINDOW_SECONDS, 60),
  rateLimitMaxRequests: toNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 90),
};
