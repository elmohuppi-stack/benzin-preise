import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config.js";
import { createCache } from "./cache.js";
import { createHistoryDatabase } from "./historyDb.js";
import { createSearchSnapshotStore } from "./searchStore.js";
import {
  fetchPricesByStationIdsWithRetry,
  fetchStationsWithRetry,
  mapStations,
} from "./tankerkoenig.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const roundCoord = (value) => Number(value).toFixed(3);
const isStoredSearchRecord = (value) =>
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
const cache = createCache({ redisUrl: config.redisUrl, logger: app.log });
const searchStore = createSearchSnapshotStore({
  storageDir: config.searchStorageDir,
  logger: app.log,
  minFetchIntervalMinutes: config.upstreamMinRefreshMinutes,
  historyRetentionDays: config.historyRetentionDays,
});
const historyDb = createHistoryDatabase({
  databaseUrl: config.databaseUrl,
  logger: app.log,
  historyRetentionDays: config.historyRetentionDays,
});

await app.register(cors, {
  origin: config.frontendOrigin,
  credentials: false,
});

await app.register(rateLimit, {
  max: config.rateLimitMaxRequests,
  timeWindow: `${config.rateLimitWindowSeconds} seconds`,
});

app.get("/health", async () => {
  const [storage, database] = await Promise.all([
    searchStore.getStorageInfo(),
    historyDb.getInfo(),
  ]);

  return {
    status: "ok",
    cache: cache.kind,
    searchStorage: storage,
    database,
    timestamp: new Date().toISOString(),
  };
});

app.get("/api/admin/stats", async () => {
  const [storageStats, databaseStats] = await Promise.all([
    searchStore.getStats(),
    historyDb.enabled
      ? historyDb.getStats()
      : Promise.resolve({ enabled: false }),
  ]);

  return {
    timestamp: new Date().toISOString(),
    minRefreshMinutes: config.upstreamMinRefreshMinutes,
    storage: storageStats,
    database: databaseStats,
  };
});

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
  const normalizedQuery = {
    lat: Number(roundCoord(lat)),
    lng: Number(roundCoord(lng)),
    radius,
    fuel,
    sort,
  };

  const cached = await cache.get(cacheKey);
  if (isStoredSearchRecord(cached) && searchStore.isFresh(cached)) {
    return buildSearchResponse(cached, "cache");
  }

  const latestStored = await searchStore.getLatestSearch(cacheKey);
  if (latestStored && searchStore.isFresh(latestStored)) {
    await cache.set(cacheKey, latestStored, config.cacheTtlSeconds);
    return buildSearchResponse(latestStored, "snapshot");
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
    const stored = await searchStore.saveSearchResult({
      cacheKey,
      query: normalizedQuery,
      stations: mapped,
    });

    if (historyDb.enabled) {
      historyDb.saveSearchSnapshot(stored).catch((dbError) => {
        app.log.warn(
          { error: dbError },
          "Postgres-Snapshot konnte nicht gespeichert werden",
        );
      });
    }

    await cache.set(cacheKey, stored, config.cacheTtlSeconds);

    return buildSearchResponse(stored, "upstream");
  } catch (error) {
    app.log.error({ error }, "Fehler bei Tankstellenabfrage");

    if (latestStored) {
      await cache.set(cacheKey, latestStored, config.cacheTtlSeconds);
      return buildSearchResponse(latestStored, "stale", true);
    }

    return reply.code(502).send({
      error: "Benzinpreisdienst aktuell nicht erreichbar",
    });
  }
});

app.get("/api/stations/:id/history", async (request, reply) => {
  const stationId = String(request.params.id || "").trim();
  const days = clamp(
    Number(request.query.days || 7),
    1,
    config.historyRetentionDays,
  );
  const refresh = String(request.query.refresh || "false") === "true";

  if (!stationId) {
    return reply.code(400).send({ error: "station id ist erforderlich" });
  }

  if (refresh) {
    try {
      const pricesByStationId = await fetchPricesByStationIdsWithRetry({
        baseUrl: config.tankApiBaseUrl,
        apiKey: config.tankApiKey,
        stationIds: [stationId],
        timeoutMs: config.requestTimeoutMs,
        retryCount: config.retryCount,
        retryBaseDelayMs: config.retryBaseDelayMs,
      });

      const snapshot = pricesByStationId?.[stationId];
      if (snapshot) {
        const point = await searchStore.saveStationPricePoint({
          stationId,
          prices: snapshot,
        });

        if (historyDb.enabled) {
          historyDb
            .saveStationPricePoint({
              stationId,
              prices: snapshot,
              fetchedAt: point.fetchedAt,
            })
            .catch((dbError) => {
              app.log.warn(
                { error: dbError },
                "Postgres-Refreshpunkt konnte nicht gespeichert werden",
              );
            });
        }
      }
    } catch (error) {
      app.log.warn(
        { error, stationId },
        "Preis-Refresh fuer Historie fehlgeschlagen",
      );
    }
  }

  if (historyDb.enabled) {
    try {
      const dbHistory = await historyDb.getHistory(stationId, days);
      if (dbHistory && dbHistory.count > 0) {
        return dbHistory;
      }
    } catch (error) {
      app.log.warn(
        { error, stationId },
        "Postgres-Historie nicht verfuegbar, nutze Dateispeicher",
      );
    }
  }

  return searchStore.getHistory(stationId, days);
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
