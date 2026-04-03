const inMemoryStore = new Map();

const buildMemoryItem = (value, ttlSeconds) => ({
  value,
  expiresAt: Date.now() + ttlSeconds * 1000,
});

const readFreshMemoryItem = (key) => {
  const item = inMemoryStore.get(key);
  if (!item) {
    return null;
  }

  if (item.expiresAt < Date.now()) {
    return null;
  }

  return item.value;
};

const readStaleMemoryItem = (key) => {
  const item = inMemoryStore.get(key);
  return item?.value ?? null;
};

export const createCache = ({ logger }) => {
  logger.info("Nutze deploymentfreundlichen In-Memory-Cache.");

  return {
    kind: "memory",
    async get(key) {
      return readFreshMemoryItem(key);
    },
    async getStale(key) {
      return readStaleMemoryItem(key);
    },
    async set(key, value, ttlSeconds) {
      inMemoryStore.set(key, buildMemoryItem(value, ttlSeconds));
    },
  };
};
