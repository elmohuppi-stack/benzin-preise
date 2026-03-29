import { useEffect, useMemo, useState } from "react";
import { fetchStations, geocodeCity } from "./api";
import { Filters } from "./components/Filters";
import { MapPanel } from "./components/MapPanel";
import { StationList } from "./components/StationList";
import type { FuelType, Station } from "./types";

type ViewMode = "list" | "map";

const defaultRadius = Number(import.meta.env.VITE_DEFAULT_RADIUS_KM || 5);
const defaultFuel = (import.meta.env.VITE_DEFAULT_FUEL_TYPE ||
  "e10") as FuelType;
const geolocationEnabled = import.meta.env.VITE_ENABLE_GEOLOCATION !== "false";

export const App = () => {
  const [fuel, setFuel] = useState<FuelType>(defaultFuel);
  const [radius, setRadius] = useState<number>(defaultRadius);
  const [sort, setSort] = useState<"price" | "dist">("price");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [position, setPosition] = useState({ lat: 49.0489, lng: 8.2596 });
  const [cityQuery, setCityQuery] = useState("");
  const [resolvingCity, setResolvingCity] = useState(false);

  const title = useMemo(() => {
    return `${stations.length} Treffer ${loading ? "- lade" : ""}`;
  }, [stations.length, loading]);

  const loadStations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchStations({
        lat: position.lat,
        lng: position.lng,
        radius,
        fuel,
        sort,
      });

      setStations(response.stations);
      setSelectedId(response.stations[0]?.id || null);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Unerwarteter Fehler beim Laden";
      setError(message);
      setStations([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStations();
  }, [fuel, radius, sort, position.lat, position.lng]);

  const detectLocation = () => {
    if (!geolocationEnabled || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (geo) => {
        setPosition({ lat: geo.coords.latitude, lng: geo.coords.longitude });
      },
      () => {
        setError("Standort konnte nicht gelesen werden.");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const searchByCity = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResolvingCity(true);

    try {
      const result = await geocodeCity(cityQuery);
      setCityQuery(result.name);
      setPosition({ lat: result.lat, lng: result.lng });
    } catch (cityError) {
      const message =
        cityError instanceof Error
          ? cityError.message
          : "Stadt konnte nicht gesucht werden";
      setError(message);
    } finally {
      setResolvingCity(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="top-bar">
        <h1>Benzinpreise in der Naehe</h1>
        <div className="location-controls">
          <button onClick={detectLocation} disabled={!geolocationEnabled}>
            Standort nutzen
          </button>

          <form className="city-form" onSubmit={searchByCity}>
            <input
              type="text"
              placeholder="Stadt eingeben, z.B. Berlin"
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
              aria-label="Stadt"
            />
            <button type="submit" disabled={resolvingCity}>
              {resolvingCity ? "Suche..." : "Stadt suchen"}
            </button>
          </form>
        </div>
      </header>

      <p className="location-label">
        Position: {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
      </p>

      <Filters
        fuel={fuel}
        radius={radius}
        sort={sort}
        onFuelChange={setFuel}
        onRadiusChange={setRadius}
        onSortChange={setSort}
      />

      <div
        className="mobile-toggle"
        role="tablist"
        aria-label="Ansicht umschalten"
      >
        <button
          role="tab"
          aria-selected={viewMode === "list"}
          className={viewMode === "list" ? "active" : ""}
          onClick={() => setViewMode("list")}
        >
          Liste
        </button>
        <button
          role="tab"
          aria-selected={viewMode === "map"}
          className={viewMode === "map" ? "active" : ""}
          onClick={() => setViewMode("map")}
        >
          Karte
        </button>
      </div>

      <main className="content">
        <section
          className={`list-column ${viewMode === "map" ? "mobile-hidden" : ""}`}
        >
          <div className="panel-head">
            <strong>{title}</strong>
            <button onClick={() => void loadStations()} disabled={loading}>
              Aktualisieren
            </button>
          </div>

          {error ? <p className="state error">{error}</p> : null}
          {loading ? <p className="state">Lade Daten...</p> : null}

          {!loading && !error ? (
            <StationList
              stations={stations}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ) : null}
        </section>

        <section
          className={`map-column ${viewMode === "list" ? "mobile-hidden" : ""}`}
        >
          <MapPanel
            stations={stations}
            selectedId={selectedId}
            position={position}
            onSelect={setSelectedId}
          />
        </section>
      </main>
    </div>
  );
};
