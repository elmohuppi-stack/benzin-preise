import pg from "pg";

const DAY_MS = 24 * 60 * 60 * 1000;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizePrice = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const toIsoTimestamp = (value) => {
  if (!value) {
    return new Date().toISOString();
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return new Date().toISOString();
  }

  return timestamp.toISOString();
};

export const createHistoryDatabase = ({
  databaseUrl,
  logger,
  historyRetentionDays,
}) => {
  if (!databaseUrl) {
    return {
      enabled: false,
      async getInfo() {
        return { enabled: false };
      },
      async saveSearchSnapshot() {},
      async saveStationPricePoint() {},
      async getHistory() {
        return null;
      },
    };
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const maxDays = Math.max(30, Number(historyRetentionDays) || 30);

  let initPromise;

  const ensureReady = async () => {
    if (!initPromise) {
      initPromise = (async () => {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS search_snapshots (
            id BIGSERIAL PRIMARY KEY,
            cache_key TEXT NOT NULL,
            fetched_at TIMESTAMPTZ NOT NULL,
            query JSONB NOT NULL,
            station_count INTEGER NOT NULL,
            stations JSONB NOT NULL
          );
        `);

        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_search_snapshots_cache_key_time
          ON search_snapshots (cache_key, fetched_at DESC);
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS station_price_points (
            id BIGSERIAL PRIMARY KEY,
            station_id TEXT NOT NULL,
            fetched_at TIMESTAMPTZ NOT NULL,
            e5 NUMERIC(6,3),
            e10 NUMERIC(6,3),
            diesel NUMERIC(6,3),
            source TEXT NOT NULL,
            search_snapshot_id BIGINT REFERENCES search_snapshots(id) ON DELETE SET NULL
          );
        `);

        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_station_price_points_station_time
          ON station_price_points (station_id, fetched_at DESC);
        `);

        logger.info("Postgres-Historie aktiv");
      })().catch((error) => {
        logger.error(
          { error },
          "Postgres-Historie konnte nicht initialisiert werden",
        );
        throw error;
      });
    }

    await initPromise;
  };

  return {
    enabled: true,

    async getInfo() {
      await ensureReady();
      const countResult = await pool.query(
        "SELECT COUNT(*)::int AS count FROM station_price_points",
      );

      return {
        enabled: true,
        stationPricePoints: countResult.rows[0]?.count || 0,
      };
    },

    async getStats() {
      await ensureReady();

      const [snapshotCount, pointCount, latest] = await Promise.all([
        pool.query("SELECT COUNT(*)::int AS count FROM search_snapshots"),
        pool.query("SELECT COUNT(*)::int AS count FROM station_price_points"),
        pool.query("SELECT MAX(fetched_at) AS latest FROM search_snapshots"),
      ]);

      const latestValue = latest.rows[0]?.latest;

      return {
        enabled: true,
        totalSearchSnapshots: snapshotCount.rows[0]?.count || 0,
        totalStationPricePoints: pointCount.rows[0]?.count || 0,
        lastUpstreamSnapshotAt: latestValue
          ? new Date(latestValue).toISOString()
          : null,
      };
    },

    async saveSearchSnapshot(record) {
      await ensureReady();

      const fetchedAt = toIsoTimestamp(record?.fetchedAt);
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const snapshotResult = await client.query(
          `
            INSERT INTO search_snapshots (cache_key, fetched_at, query, station_count, stations)
            VALUES ($1, $2::timestamptz, $3::jsonb, $4, $5::jsonb)
            RETURNING id
          `,
          [
            String(record.cacheKey || ""),
            fetchedAt,
            JSON.stringify(record.query || {}),
            Number(record.stationCount) || 0,
            JSON.stringify(record.stations || []),
          ],
        );

        const snapshotId = snapshotResult.rows[0]?.id;
        for (const station of record.stations || []) {
          if (!station?.id) {
            continue;
          }

          const e5 = normalizePrice(station.prices?.e5);
          const e10 = normalizePrice(station.prices?.e10);
          const diesel = normalizePrice(station.prices?.diesel);

          if (e5 === null && e10 === null && diesel === null) {
            continue;
          }

          await client.query(
            `
              INSERT INTO station_price_points
                (station_id, fetched_at, e5, e10, diesel, source, search_snapshot_id)
              VALUES ($1, $2::timestamptz, $3, $4, $5, $6, $7)
            `,
            [
              station.id,
              fetchedAt,
              e5,
              e10,
              diesel,
              "search",
              snapshotId || null,
            ],
          );
        }

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },

    async saveStationPricePoint({ stationId, prices, fetchedAt }) {
      await ensureReady();

      const e5 = normalizePrice(prices?.e5);
      const e10 = normalizePrice(prices?.e10);
      const diesel = normalizePrice(prices?.diesel);

      if (e5 === null && e10 === null && diesel === null) {
        return;
      }

      await pool.query(
        `
          INSERT INTO station_price_points
            (station_id, fetched_at, e5, e10, diesel, source, search_snapshot_id)
          VALUES ($1, $2::timestamptz, $3, $4, $5, $6, NULL)
        `,
        [
          String(stationId),
          toIsoTimestamp(fetchedAt),
          e5,
          e10,
          diesel,
          "refresh",
        ],
      );
    },

    async getHistory(stationId, days = 7) {
      await ensureReady();

      const safeDays = clamp(Number(days) || 7, 1, maxDays);
      const cutoff = new Date(Date.now() - safeDays * DAY_MS).toISOString();

      const result = await pool.query(
        `
          SELECT fetched_at, e5, e10, diesel
          FROM station_price_points
          WHERE station_id = $1 AND fetched_at >= $2::timestamptz
          ORDER BY fetched_at ASC
        `,
        [String(stationId), cutoff],
      );

      const points = result.rows.map((row) => ({
        timestamp: new Date(row.fetched_at).toISOString(),
        e5: row.e5 === null ? null : Number(row.e5),
        e10: row.e10 === null ? null : Number(row.e10),
        diesel: row.diesel === null ? null : Number(row.diesel),
      }));

      return {
        stationId: String(stationId),
        days: safeDays,
        count: points.length,
        points,
      };
    },
  };
};
