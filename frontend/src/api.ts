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

  const response = await fetch(
    `${apiBaseUrl}/api/stations?${query.toString()}`,
  );
  if (!response.ok) {
    throw new Error("Fehler beim Laden der Tankstellen");
  }

  return response.json();
};
