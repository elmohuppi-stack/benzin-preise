import Redis from "ioredis";

const inMemoryStore = new Map();

const buildMemoryItem = (value, ttlSeconds) => ({
  value,
  expiresAt: Date.now() + ttlSeconds * 1000,
});

const readMemoryItem = (key) => {
  const item = inMemoryStore.get(key);
  if (!item) {
    return null;
  }
  if (item.expiresAt < Date.now()) {
    inMemoryStore.delete(key);
    return null;
  }
  return item.value;
};

export const createCache = ({ redisUrl, logger }) => {
  if (!redisUrl) {
    logger.warn("REDIS_URL fehlt. Nutze In-Memory-Cache.");
    return {
      kind: "memory",
      async get(key) {
        return readMemoryItem(key);
      },
      async set(key, value, ttlSeconds) {
        inMemoryStore.set(key, buildMemoryItem(value, ttlSeconds));
      },
    };
  }

  const redis = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
  });

  const connectPromise = redis
    .connect()
    .then(() => logger.info("Redis verbunden"))
    .catch((error) => {
      logger.error(
        { error },
        "Redis nicht erreichbar. Fallback auf In-Memory-Cache.",
      );
      return null;
    });

  return {
    kind: "redis",
    async get(key) {
      await connectPromise;
      if (redis.status !== "ready") {
        return readMemoryItem(key);
      }
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    },
    async set(key, value, ttlSeconds) {
      await connectPromise;
      if (redis.status !== "ready") {
        inMemoryStore.set(key, buildMemoryItem(value, ttlSeconds));
        return;
      }
      await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    },
  };
};
