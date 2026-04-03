import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config.js";
import { createCache } from "./cache.js";
import {
  fetchPricesByStationIdsWithRetry,
  fetchStationsWithRetry,
  mapStations,
} from "./tankerkoenig.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const roundCoord = (value) => Number(value).toFixed(3);
const isSearchRecord = (value) =>
  Boolean(
    value &&
    typeof value === "object" &&
    typeof value.fetchedAtMs === "number" &&
    Array.isArray(value.stations),
  );

const buildSearchResponse = (record, source, stale = false) => ({
  source,
  stale,
  count: record.stationCount ?? record.stations.length,
  stations: record.stations,
  lastUpdated: record.fetchedAt,
  ageMinutes: Math.max(
    0,
    Math.floor((Date.now() - record.fetchedAtMs) / 60000),
  ),
});

const app = Fastify({ logger: { level: config.logLevel } });
const cache = createCache({ logger: app.log });

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
  service: "api",
  cache: cache.kind,
  uptimeSeconds: Math.round(process.uptime()),
  timestamp: new Date().toISOString(),
}));

app.get("/api/stations", async (request, reply) => {
  const lat = Number(request.query.lat);
  const lng = Number(request.query.lng);
  const radius = clamp(Number(request.query.radius || 5), 1, 25);
  const fuel = (request.query.fuel || "e10").toLowerCase();
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
  if (isSearchRecord(cached)) {
    return buildSearchResponse(cached, "cache");
  }

  const cachedStale = await cache.getStale(cacheKey);

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

    const stationIds = stations
      .map((station) => station.id)
      .filter((stationId) => typeof stationId === "string" && stationId.length);

    const pricesByStationId = await fetchPricesByStationIdsWithRetry({
      baseUrl: config.tankApiBaseUrl,
      apiKey: config.tankApiKey,
      stationIds,
      timeoutMs: config.requestTimeoutMs,
      retryCount: config.retryCount,
      retryBaseDelayMs: config.retryBaseDelayMs,
    });

    const mapped = mapStations(stations, fuel, pricesByStationId);
    const record = {
      fetchedAtMs: Date.now(),
      fetchedAt: new Date().toISOString(),
      stationCount: mapped.length,
      stations: mapped,
    };

    await cache.set(cacheKey, record, config.cacheTtlSeconds);
    return buildSearchResponse(record, "upstream");
  } catch (error) {
    const errorMessage =
      error instanceof Error && error.message
        ? error.message
        : "Benzinpreisdienst aktuell nicht erreichbar";

    app.log.error(
      { err: error, errorMessage },
      "Fehler bei Tankstellenabfrage",
    );

    if (isSearchRecord(cachedStale)) {
      return buildSearchResponse(cachedStale, "stale", true);
    }

    const statusCode = errorMessage.includes("TANK_API_KEY") ? 503 : 502;

    return reply.code(statusCode).send({
      error: errorMessage,
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
