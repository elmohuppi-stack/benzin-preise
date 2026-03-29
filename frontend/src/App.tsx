import { useEffect, useMemo, useRef, useState } from "react";
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
const mapSearchDebounceMs = 350;

export const App = () => {
  const [fuel, setFuel] = useState<FuelType>(defaultFuel);
  const [radius, setRadius] = useState<number>(defaultRadius);
  const [sort, setSort] = useState<"price" | "dist">("price");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [ageMinutes, setAgeMinutes] = useState<number>(0);
  const [responseSource, setResponseSource] = useState<
    "cache" | "snapshot" | "upstream" | "stale" | null
  >(null);
  const [isStale, setIsStale] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [position, setPosition] = useState({ lat: 49.0489, lng: 8.2596 });
  const [cityQuery, setCityQuery] = useState("");
  const [locationLabel, setLocationLabel] = useState("Wörth am Rhein");
  const [resolvingCity, setResolvingCity] = useState(false);
  const [headerPanelOpen, setHeaderPanelOpen] = useState(false);
  const [mapSearchTick, setMapSearchTick] = useState(0);
  const mapSearchDebounceRef = useRef<number | null>(null);

  const fuelLabel =
    fuel === "e5" ? "Super E5" : fuel === "e10" ? "Super E10" : "Diesel";
  const sortLabel = sort === "price" ? "Preis" : "Entfernung";

  const title = useMemo(() => {
    return `${stations.length} Treffer ${loading ? "- lade" : ""}`;
  }, [stations.length, loading]);

  const canRefresh = ageMinutes >= 10;
  const minutesUntilRefresh = Math.max(0, 10 - ageMinutes);

  const freshnessLabel = useMemo(() => {
    if (!lastUpdated) {
      return "Noch keine Daten geladen";
    }

    const timestamp = new Date(lastUpdated);
    const local = Number.isNaN(timestamp.getTime())
      ? lastUpdated
      : timestamp.toLocaleString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });

    const sourceLabel =
      responseSource === "upstream"
        ? "Live"
        : responseSource === "snapshot"
          ? "Snapshot"
          : responseSource === "cache"
            ? "Cache"
            : responseSource === "stale"
              ? "Stale (Upstream offline)"
              : "Unbekannt";

    if (canRefresh) {
      return `${sourceLabel} - ${local} - ✓ Neue Preise verfügbar`;
    }

    return `${sourceLabel} - ${local} - Nächste Aktualisierung in ${minutesUntilRefresh} min`;
  }, [
    ageMinutes,
    lastUpdated,
    responseSource,
    canRefresh,
    minutesUntilRefresh,
  ]);

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
      setLastUpdated(response.lastUpdated);
      setAgeMinutes(response.ageMinutes);
      setResponseSource(response.source);
      setIsStale(response.stale);
      setSelectedId(response.stations[0]?.id || null);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Unerwarteter Fehler beim Laden";
      setError(message);
      setStations([]);
      setLastUpdated(null);
      setAgeMinutes(0);
      setResponseSource(null);
      setIsStale(false);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStations();
  }, [fuel, radius, sort, position.lat, position.lng, mapSearchTick]);

  useEffect(() => {
    return () => {
      if (mapSearchDebounceRef.current !== null) {
        window.clearTimeout(mapSearchDebounceRef.current);
      }
    };
  }, []);

  const detectLocation = () => {
    if (!geolocationEnabled || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (geo) => {
        setPosition({ lat: geo.coords.latitude, lng: geo.coords.longitude });
        setLocationLabel("Aktueller Standort");
        setHeaderPanelOpen(false);
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
      setLocationLabel(result.name);
      setHeaderPanelOpen(false);
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

  const handleSelectStation = (stationId: string) => {
    setSelectedId(stationId);
    setViewMode("map");
  };

  const handleMapViewportChange = (nextPosition: {
    lat: number;
    lng: number;
  }) => {
    if (mapSearchDebounceRef.current !== null) {
      window.clearTimeout(mapSearchDebounceRef.current);
    }

    mapSearchDebounceRef.current = window.setTimeout(() => {
      setPosition((prev) => {
        const sameLat = Math.abs(prev.lat - nextPosition.lat) < 0.00005;
        const sameLng = Math.abs(prev.lng - nextPosition.lng) < 0.00005;
        return sameLat && sameLng ? prev : nextPosition;
      });

      // Zoom-Änderungen können bei gleichem Zentrum auftreten, deshalb erzwingen wir dann einen Reload.
      setMapSearchTick((value) => value + 1);
      mapSearchDebounceRef.current = null;
    }, mapSearchDebounceMs);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-main">
          <div>
            <h1>Benzinpreise bei {locationLabel}.</h1>
            <p className="header-subtitle">
              Kompakt vergleichen und direkt auf der Karte finden
            </p>
          </div>
        </div>

        <div
          id="header-tools"
          className={`header-tools ${headerPanelOpen ? "open" : ""}`}
        >
          <form className="city-form" onSubmit={searchByCity}>
            <input
              type="text"
              placeholder="Stadt eingeben, z. B. Wörth am Rhein"
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
              aria-label="Stadt"
            />
            <button type="submit" disabled={resolvingCity}>
              {resolvingCity ? "Suche..." : "Suchen"}
            </button>
          </form>

          <Filters
            className="filters header-filters"
            fuel={fuel}
            radius={radius}
            sort={sort}
            onFuelChange={setFuel}
            onRadiusChange={setRadius}
            onSortChange={setSort}
          />

          <button
            className="geo-btn"
            onClick={detectLocation}
            disabled={!geolocationEnabled}
            aria-label="Standort nutzen"
            title="Standort nutzen"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <circle
                cx="12"
                cy="12"
                r="4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <line
                x1="12"
                y1="2.5"
                x2="12"
                y2="7"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <line
                x1="12"
                y1="17"
                x2="12"
                y2="21.5"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <line
                x1="2.5"
                y1="12"
                x2="7"
                y2="12"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <line
                x1="17"
                y1="12"
                x2="21.5"
                y2="12"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
          </button>
        </div>
      </header>

      <div className="view-controls">
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

        <button
          type="button"
          className="mobile-search-toggle"
          aria-expanded={headerPanelOpen}
          aria-controls="header-tools"
          onClick={() => setHeaderPanelOpen((value) => !value)}
        >
          {headerPanelOpen ? "Suche schließen" : "Suche & Filter"}
        </button>
      </div>

      <main className="content">
        <section
          className={`list-column ${viewMode === "map" ? "mobile-hidden" : ""}`}
        >
          <div className="panel-head">
            <div className="panel-head-main">
              <strong>{title}</strong>
              <div className="result-filters" aria-label="Aktive Suchfilter">
                <span>{fuelLabel}</span>
                <span>{radius} km</span>
                <span>{sortLabel}</span>
              </div>
              <p className={`freshness-hint ${isStale ? "stale" : ""}`}>
                {freshnessLabel}
              </p>
            </div>
            <button
              onClick={() => void loadStations()}
              disabled={loading || !canRefresh}
              className={canRefresh ? "refresh-ready" : ""}
              title={
                canRefresh
                  ? "Neue Preise verfügbar"
                  : "Warte noch vor erneutem Abruf"
              }
            >
              {canRefresh ? "🔄 Aktualisieren" : "Aktualisieren"}
            </button>
          </div>

          {error ? <p className="state error">{error}</p> : null}
          {loading ? <p className="state">Lade Daten...</p> : null}

          {!loading && !error ? (
            <StationList
              stations={stations}
              selectedId={selectedId}
              onSelect={handleSelectStation}
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
            onSelect={handleSelectStation}
            isActive={viewMode === "map"}
            onViewportChange={handleMapViewportChange}
          />
        </section>
      </main>
    </div>
  );
};
