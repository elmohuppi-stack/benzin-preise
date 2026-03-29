import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_HISTORY_DAYS = 30;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizePrice = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const isNotFoundError = (error) =>
  Boolean(error && typeof error === "object" && error.code === "ENOENT");

const toHistoryPoint = (station, timestampMs) => {
  if (!station?.id) {
    return null;
  }

  const point = {
    timestampMs,
    e5: normalizePrice(station.prices?.e5),
    e10: normalizePrice(station.prices?.e10),
    diesel: normalizePrice(station.prices?.diesel),
  };

  if (point.e5 === null && point.e10 === null && point.diesel === null) {
    return null;
  }

  return point;
};

export const createSearchSnapshotStore = ({
  storageDir,
  logger,
  minFetchIntervalMinutes,
  historyRetentionDays = DEFAULT_HISTORY_DAYS,
}) => {
  const snapshotLogPath = path.join(
    path.resolve(storageDir),
    "search-snapshots.ndjson",
  );
  const latestByKey = new Map();
  const byStation = new Map();
  const freshnessWindowMs = Math.max(1, minFetchIntervalMinutes) * 60 * 1000;
  const maxHistoryDays = Math.max(
    DEFAULT_HISTORY_DAYS,
    Number(historyRetentionDays) || DEFAULT_HISTORY_DAYS,
  );
  const historyRetentionMs = maxHistoryDays * DAY_MS;
  let searchSnapshotCount = 0;
  let stationPricePointCount = 0;

  let initPromise;
  let writeQueue = Promise.resolve();

  const appendHistoryPoint = (station, timestampMs) => {
    const point = toHistoryPoint(station, timestampMs);
    if (!point) {
      return;
    }

    const cutoffMs = Date.now() - historyRetentionMs;
    const current = byStation.get(station.id) || [];
    const next = current.filter((entry) => entry.timestampMs >= cutoffMs);

    next.push(point);
    byStation.set(station.id, next);
  };

  const applyRecord = (record) => {
    if (record?.type === "search-snapshot") {
      latestByKey.set(record.cacheKey, record);
      searchSnapshotCount += 1;
      for (const station of record.stations || []) {
        appendHistoryPoint(station, record.fetchedAtMs);
      }
      return;
    }

    if (record?.type === "station-price") {
      stationPricePointCount += 1;
      appendHistoryPoint(
        {
          id: record.stationId,
          prices: record.prices,
        },
        record.fetchedAtMs,
      );
    }
  };

  const ensureReady = async () => {
    if (!initPromise) {
      initPromise = (async () => {
        await mkdir(path.dirname(snapshotLogPath), { recursive: true });

        let content = "";
        try {
          content = await readFile(snapshotLogPath, "utf8");
        } catch (error) {
          if (!isNotFoundError(error)) {
            throw error;
          }
        }

        for (const line of content.split("\n")) {
          if (!line.trim()) {
            continue;
          }

          try {
            applyRecord(JSON.parse(line));
          } catch (error) {
            logger.warn(
              { error },
              "Snapshot-Zeile konnte nicht geladen werden",
            );
          }
        }
      })();
    }

    await initPromise;
  };

  const appendRecord = async (record) => {
    const payload = `${JSON.stringify(record)}\n`;
    const writeOperation = async () => {
      await mkdir(path.dirname(snapshotLogPath), { recursive: true });
      await appendFile(snapshotLogPath, payload, "utf8");
    };

    const pending = writeQueue.then(writeOperation, writeOperation);
    writeQueue = pending.catch(() => {});
    await pending;
  };

  return {
    async getLatestSearch(cacheKey) {
      await ensureReady();
      return latestByKey.get(cacheKey) || null;
    },

    isFresh(record, nowMs = Date.now()) {
      return Boolean(
        record?.fetchedAtMs && nowMs - record.fetchedAtMs < freshnessWindowMs,
      );
    },

    async saveSearchResult({ cacheKey, query, stations }) {
      await ensureReady();

      const fetchedAtMs = Date.now();
      const record = {
        type: "search-snapshot",
        cacheKey,
        query,
        fetchedAtMs,
        fetchedAt: new Date(fetchedAtMs).toISOString(),
        stationCount: stations.length,
        stations,
      };

      await appendRecord(record);
      applyRecord(record);
      return record;
    },

    async saveStationPricePoint({ stationId, prices }) {
      await ensureReady();

      const fetchedAtMs = Date.now();
      const record = {
        type: "station-price",
        stationId,
        fetchedAtMs,
        fetchedAt: new Date(fetchedAtMs).toISOString(),
        prices: {
          e5: normalizePrice(prices?.e5),
          e10: normalizePrice(prices?.e10),
          diesel: normalizePrice(prices?.diesel),
        },
      };

      await appendRecord(record);
      applyRecord(record);
      return record;
    },

    async getHistory(stationId, days = 7) {
      await ensureReady();

      const safeDays = clamp(Number(days) || 7, 1, maxHistoryDays);
      const cutoffMs = Date.now() - safeDays * DAY_MS;
      const points = (byStation.get(stationId) || [])
        .filter((entry) => entry.timestampMs >= cutoffMs)
        .map((entry) => ({
          timestamp: new Date(entry.timestampMs).toISOString(),
          e5: entry.e5,
          e10: entry.e10,
          diesel: entry.diesel,
        }));

      return {
        stationId,
        days: safeDays,
        count: points.length,
        points,
      };
    },

    async getStorageInfo() {
      await ensureReady();
      return {
        snapshotLogPath,
        uniqueSearches: latestByKey.size,
        trackedStations: byStation.size,
      };
    },

    async getStats() {
      await ensureReady();

      let latestSnapshotMs = 0;
      for (const record of latestByKey.values()) {
        if (record.fetchedAtMs > latestSnapshotMs) {
          latestSnapshotMs = record.fetchedAtMs;
        }
      }

      return {
        snapshotLogPath,
        uniqueSearches: latestByKey.size,
        trackedStations: byStation.size,
        totalSearchSnapshots: searchSnapshotCount,
        totalStationRefreshPoints: stationPricePointCount,
        lastUpstreamSnapshotAt:
          latestSnapshotMs > 0
            ? new Date(latestSnapshotMs).toISOString()
            : null,
      };
    },
  };
};
