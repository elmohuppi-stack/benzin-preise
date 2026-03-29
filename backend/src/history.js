const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_HISTORY_DAYS = 30;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizePrice = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const createStationHistoryStore = () => {
  const byStation = new Map();

  const cleanup = (stationId, nowMs, keepMs) => {
    const entries = byStation.get(stationId) || [];
    const filtered = entries.filter(
      (entry) => entry.timestampMs >= nowMs - keepMs,
    );

    if (filtered.length === 0) {
      byStation.delete(stationId);
      return;
    }

    byStation.set(stationId, filtered);
  };

  return {
    addSnapshot(stations) {
      const nowMs = Date.now();
      const keepMs = MAX_HISTORY_DAYS * DAY_MS;

      for (const station of stations) {
        if (!station?.id) {
          continue;
        }

        const point = {
          timestampMs: nowMs,
          e5: normalizePrice(station.prices?.e5),
          e10: normalizePrice(station.prices?.e10),
          diesel: normalizePrice(station.prices?.diesel),
        };

        if (point.e5 === null && point.e10 === null && point.diesel === null) {
          continue;
        }

        const entries = byStation.get(station.id) || [];

        entries.push(point);
        byStation.set(station.id, entries);
        cleanup(station.id, nowMs, keepMs);
      }
    },

    getHistory(stationId, days = 7) {
      const safeDays = clamp(Number(days) || 7, 1, MAX_HISTORY_DAYS);
      const nowMs = Date.now();
      const keepMs = safeDays * DAY_MS;
      const entries = byStation.get(stationId) || [];

      const points = entries
        .filter((entry) => entry.timestampMs >= nowMs - keepMs)
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
  };
};
