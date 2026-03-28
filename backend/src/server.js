import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config.js";
import { createCache } from "./cache.js";
import { fetchStationsWithRetry, mapStations } from "./tankerkoenig.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const roundCoord = (value) => Number(value).toFixed(3);

const app = Fastify({ logger: { level: config.logLevel } });
const cache = createCache({ redisUrl: config.redisUrl, logger: app.log });

await app.register(cors, {
  origin: config.frontendOrigin,
  credentials: false,
});

await app.register(rateLimit, {
  max: config.rateLimitMaxRequests,
  timeWindow: `${config.rateLimitWindowSeconds} seconds`,
});

app.get("/health", async () => ({
  status: "ok",
  cache: cache.kind,
  timestamp: new Date().toISOString(),
}));

app.get("/api/stations", async (request, reply) => {
  const lat = Number(request.query.lat);
  const lng = Number(request.query.lng);
  const radius = clamp(Number(request.query.radius || 5), 1, 25);
  const fuel = (request.query.fuel || "e5").toLowerCase();
  const sort = request.query.sort === "dist" ? "dist" : "price";

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return reply.code(400).send({ error: "lat und lng sind erforderlich" });
  }

  if (!["e5", "e10", "diesel"].includes(fuel)) {
    return reply
      .code(400)
      .send({ error: "fuel muss e5, e10 oder diesel sein" });
  }

  const cacheKey = [
    "stations",
    roundCoord(lat),
    roundCoord(lng),
    radius,
    fuel,
    sort,
  ].join(":");

  const cached = await cache.get(cacheKey);
  if (cached) {
    return {
      source: "cache",
      count: cached.length,
      stations: cached,
    };
  }

  try {
    const stations = await fetchStationsWithRetry({
      baseUrl: config.tankApiBaseUrl,
      apiKey: config.tankApiKey,
      lat,
      lng,
      radius,
      fuel,
      sort,
      timeoutMs: config.requestTimeoutMs,
      retryCount: config.retryCount,
      retryBaseDelayMs: config.retryBaseDelayMs,
    });

    const mapped = mapStations(stations, fuel);
    await cache.set(cacheKey, mapped, config.cacheTtlSeconds);

    return {
      source: "upstream",
      count: mapped.length,
      stations: mapped,
    };
  } catch (error) {
    app.log.error({ error }, "Fehler bei Tankstellenabfrage");
    return reply.code(502).send({
      error: "Benzinpreisdienst aktuell nicht erreichbar",
    });
  }
});

const start = async () => {
  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
