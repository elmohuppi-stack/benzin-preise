export type FuelType = "e5" | "e10" | "diesel";

export type Station = {
  id: string;
  name: string;
  brand: string;
  street: string;
  houseNumber: string;
  postCode: number;
  place: string;
  lat: number;
  lng: number;
  dist: number;
  isOpen: boolean;
  prices: {
    e5: number | null;
    e10: number | null;
    diesel: number | null;
    selected: number | null;
  };
};

export type StationResponse = {
  source: "cache" | "upstream" | "stale";
  stale: boolean;
  count: number;
  stations: Station[];
  lastUpdated: string;
  ageMinutes: number;
};
