const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeFuel = (fuel) => {
  const normalized = (fuel || "e5").toLowerCase();
  return ["e5", "e10", "diesel"].includes(normalized) ? normalized : "e5";
};

export const fetchStationsWithRetry = async ({
  baseUrl,
  apiKey,
  lat,
  lng,
  radius,
  fuel,
  sort,
  timeoutMs,
  retryCount,
  retryBaseDelayMs,
}) => {
  if (!apiKey) {
    throw new Error("TANK_API_KEY fehlt");
  }

  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    rad: String(radius),
    sort,
    type: normalizeFuel(fuel),
    apikey: apiKey,
  });

  const url = `${baseUrl.replace(/\/$/, "")}/list.php?${params.toString()}`;

  let attempt = 0;
  while (attempt <= retryCount) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Upstream HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data?.ok) {
        throw new Error("Upstream Antwort ohne ok=true");
      }

      return data.stations || [];
    } catch (error) {
      clearTimeout(timeout);

      if (attempt === retryCount) {
        throw error;
      }

      const backoffMs = retryBaseDelayMs * (attempt + 1);
      await wait(backoffMs);
      attempt += 1;
    }
  }

  return [];
};

export const mapStations = (stations, fuelType) =>
  stations.map((station) => ({
    id: station.id,
    name: station.name,
    brand: station.brand,
    street: station.street,
    houseNumber: station.houseNumber,
    postCode: station.postCode,
    place: station.place,
    lat: station.lat,
    lng: station.lng,
    dist: station.dist,
    isOpen: station.isOpen,
    prices: {
      e5: station.e5,
      e10: station.e10,
      diesel: station.diesel,
      selected: station[fuelType],
    },
  }));
