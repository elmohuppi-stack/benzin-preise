import type { FuelType, StationResponse } from "./types";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

export const fetchStations = async ({
  lat,
  lng,
  radius,
  fuel,
  sort,
}: {
  lat: number;
  lng: number;
  radius: number;
  fuel: FuelType;
  sort: "price" | "dist";
}): Promise<StationResponse> => {
  const query = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radius),
    fuel,
    sort,
  });

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/stations?${query.toString()}`);
  } catch {
    throw new Error(
      "API nicht erreichbar. Wenn Docker lokal laeuft, bitte https://api.localhost/health einmal im Browser oeffnen und das Zertifikat bestaetigen.",
    );
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new Error(
      payload?.error ||
        `Fehler beim Laden der Tankstellen (${response.status})`,
    );
  }

  return response.json();
};

type GeocodeResult = {
  lat: number;
  lng: number;
  name: string;
};

export const geocodeCity = async (city: string): Promise<GeocodeResult> => {
  const query = city.trim();
  if (!query) {
    throw new Error("Bitte einen Stadtnamen eingeben");
  }

  const params = new URLSearchParams({
    name: query,
    count: "1",
    language: "de",
    format: "json",
  });

  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error("Stadt konnte nicht gesucht werden");
  }

  const data = (await response.json()) as {
    results?: Array<{ latitude: number; longitude: number; name: string }>;
  };

  const first = data.results?.[0];
  if (!first) {
    throw new Error("Keine passende Stadt gefunden");
  }

  return {
    lat: first.latitude,
    lng: first.longitude,
    name: first.name,
  };
};
