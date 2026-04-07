import { useEffect, useMemo, useState } from "react";
import { fetchStations, geocodeCity } from "./api";
import { Filters } from "./components/Filters";
import { MapPanel } from "./components/MapPanel";
import { StationList } from "./components/StationList";
import type { FuelType, Station } from "./types";

type ViewMode = "list" | "map";
type LegalPage = "app" | "impressum" | "datenschutz";

const defaultRadius = Number(import.meta.env.VITE_DEFAULT_RADIUS_KM || 5);
const defaultFuel: FuelType = "e10";
const geolocationEnabled = import.meta.env.VITE_ENABLE_GEOLOCATION !== "false";

const legalContact = {
  name: import.meta.env.VITE_LEGAL_NAME || "Elmar Hepp",
  email: import.meta.env.VITE_LEGAL_EMAIL || "elmar.hepp@gmail.com",
  addressLine1:
    import.meta.env.VITE_LEGAL_ADDRESS_LINE_1 || "Richard-Wagner-Str. 25",
  addressLine2:
    import.meta.env.VITE_LEGAL_ADDRESS_LINE_2 || "76744 Wörth am Rhein",
  country: import.meta.env.VITE_LEGAL_COUNTRY || "Deutschland",
  contentResponsible:
    import.meta.env.VITE_LEGAL_CONTENT_RESPONSIBLE || "Elmar Hepp",
};

const getLegalPageFromHash = (hash: string): LegalPage => {
  if (hash === "#impressum") {
    return "impressum";
  }

  if (hash === "#datenschutz") {
    return "datenschutz";
  }

  return "app";
};

const SiteFooter = () => (
  <footer className="app-footer">
    <div>
      <strong>Rechtliches & Quellen</strong>
      <p>
        Preisdaten via Tankerkönig, Kartendaten © OpenStreetMap-Mitwirkende,
        Ortssuche via Open-Meteo.
      </p>
    </div>

    <nav className="footer-links" aria-label="Rechtliche Informationen">
      <a href="#impressum">Impressum</a>
      <a href="#datenschutz">Datenschutz</a>
    </nav>
  </footer>
);

const LegalPageView = ({ page }: { page: Exclude<LegalPage, "app"> }) => {
  const isImpressum = page === "impressum";

  return (
    <main className="legal-page">
      <a className="back-link" href="#">
        ← Zur Tankstellenübersicht
      </a>

      <article className="legal-card">
        <p className="legal-eyebrow">Rechtliches</p>
        <h1>{isImpressum ? "Impressum" : "Datenschutzerklärung"}</h1>
        <p className="legal-note">
          Stand: 07. April 2026. Die Kontaktdaten werden aus der
          Frontend-Konfiguration geladen.
        </p>

        {isImpressum ? (
          <>
            <section className="legal-section">
              <h2>Angaben gemäß § 5 DDG</h2>
              <p>
                {legalContact.name}
                <br />
                {legalContact.addressLine1}
                <br />
                {legalContact.addressLine2}
                <br />
                {legalContact.country}
              </p>
            </section>

            <section className="legal-section">
              <h2>Kontakt</h2>
              <p>
                E-Mail: {legalContact.email}
                <br />
                Website: benzin.elmarhepp.de
              </p>
            </section>

            <section className="legal-section">
              <h2>
                Verantwortlich für redaktionelle Inhalte (§ 18 Abs. 2 MStV)
              </h2>
              <p>
                {legalContact.contentResponsible}
                <br />
                {legalContact.addressLine1}
                <br />
                {legalContact.addressLine2}
                <br />
                {legalContact.country}
              </p>
            </section>

            <section className="legal-section">
              <h2>Quellen und Daten</h2>
              <ul className="legal-list">
                <li>Preisdaten: Tankerkönig</li>
                <li>Kartenmaterial: OpenStreetMap</li>
                <li>Ortssuche: Open-Meteo Geocoding API</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>Haftungshinweis</h2>
              <p>
                Die Inhalte dieses Angebots werden mit Sorgfalt erstellt. Für
                Aktualität, Vollständigkeit und Richtigkeit der bereitgestellten
                Informationen kann dennoch keine Gewähr übernommen werden.
              </p>
            </section>
          </>
        ) : (
          <>
            <section className="legal-section">
              <h2>1. Verantwortliche Stelle</h2>
              <p>
                {legalContact.name}
                <br />
                {legalContact.addressLine1}
                <br />
                {legalContact.addressLine2}
                <br />
                {legalContact.country}
                <br />
                E-Mail: {legalContact.email}
              </p>
            </section>

            <section className="legal-section">
              <h2>2. Zweck der Datenverarbeitung</h2>
              <p>
                Diese Website zeigt Tankstellen und aktuelle Kraftstoffpreise in
                Ihrer Umgebung an. Dafür werden technische Zugriffsdaten,
                Suchangaben und – nur nach Ihrer Freigabe – Standortdaten
                verarbeitet.
              </p>
            </section>

            <section className="legal-section">
              <h2>3. Verarbeitete Daten</h2>
              <ul className="legal-list">
                <li>
                  Server-Logdaten wie IP-Adresse, Datum/Uhrzeit, angefragte URL
                  und User-Agent zur sicheren Bereitstellung der Website.
                </li>
                <li>
                  Suchparameter wie Ort, Koordinaten, Radius, Kraftstoffart und
                  Sortierung zur Anzeige passender Tankstellen.
                </li>
                <li>
                  Standortdaten nur dann, wenn Sie die Funktion „Standort
                  nutzen“ in Ihrem Browser aktiv freigeben.
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>4. Eingesetzte Dienste, Empfänger und Drittanbieter</h2>
              <ul className="legal-list">
                <li>
                  <strong>OpenStreetMap:</strong> Zum Anzeigen der Karte werden
                  Kartentiles von OpenStreetMap bzw. den eingebundenen
                  Tile-Servern geladen. Dabei werden insbesondere Ihre
                  IP-Adresse, Browser-Metadaten und die aufgerufene Seite
                  technisch an diese Server übermittelt.
                </li>
                <li>
                  <strong>Open-Meteo Geocoding API:</strong> Bei der Ortssuche
                  wird der eingegebene Stadtname an den Geocoding-Dienst
                  übermittelt, damit passende Ortskoordinaten ermittelt werden
                  können.
                </li>
                <li>
                  <strong>Tankerkönig:</strong> Für die Anzeige der
                  Kraftstoffpreise werden Suchkoordinaten, Radius, Kraftstoffart
                  und Sortierung über das eigene Backend an die
                  Tankerkönig-Schnittstelle weitergegeben.
                </li>
                <li>
                  <strong>Hosting bei Hetzner:</strong> Die technische
                  Bereitstellung der Website erfolgt auf einem Server bei
                  Hetzner Online GmbH. Dabei können im Rahmen des Hostings
                  technisch notwendige Verbindungs- und Server-Logdaten
                  verarbeitet werden.
                </li>
              </ul>
              <p>
                Soweit externe Dienste eingebunden sind, gelten zusätzlich die
                Datenschutzinformationen der jeweiligen Anbieter. Je nach
                technischer Auslieferung kann dabei nicht vollständig
                ausgeschlossen werden, dass Daten auch an Empfänger außerhalb
                der EU bzw. des EWR übermittelt werden.
              </p>
            </section>

            <section className="legal-section">
              <h2>5. Rechtsgrundlagen</h2>
              <ul className="legal-list">
                <li>
                  Art. 6 Abs. 1 lit. f DSGVO für den sicheren und stabilen
                  Betrieb der Website sowie die Bereitstellung der Suche.
                </li>
                <li>
                  Art. 6 Abs. 1 lit. a DSGVO für die freiwillige Nutzung der
                  Standortfreigabe.
                </li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>6. Speicherdauer</h2>
              <p>
                Zwischengespeicherte Suchergebnisse werden in diesem Projekt
                aktuell nur kurzfristig – etwa für 10 Minuten – vorgehalten.
                Server-Logs werden nur so lange gespeichert, wie dies für den
                sicheren und störungsfreien Betrieb der Website erforderlich
                ist. Soweit Daten direkt bei Drittanbietern verarbeitet werden,
                richtet sich die Speicherdauer ergänzend nach deren jeweiligen
                Datenschutzbestimmungen.
              </p>
            </section>

            <section className="legal-section">
              <h2>7. Ihre Rechte</h2>
              <p>
                Sie haben im Rahmen der gesetzlichen Vorgaben das Recht auf
                Auskunft, Berichtigung, Löschung, Einschränkung der
                Verarbeitung, Datenübertragbarkeit sowie Widerspruch gegen
                bestimmte Verarbeitungen. Außerdem haben Sie das Recht, erteilte
                Einwilligungen – etwa zur Standortfreigabe – jederzeit mit
                Wirkung für die Zukunft zu widerrufen sowie sich bei einer
                Datenschutzaufsichtsbehörde zu beschweren.
              </p>
            </section>

            <section className="legal-section">
              <h2>8. Cookies, Local Storage und Consent-Banner</h2>
              <p>
                Diese Website setzt derzeit keine Analyse- oder
                Marketing-Cookies ein und verwendet nach aktuellem Stand auch
                keine nicht erforderlichen Einträge in `localStorage` oder
                `sessionStorage`. Deshalb wird aktuell kein Cookie-Consent-
                Banner eingeblendet. Die Seite nutzt nur technisch erforderliche
                Verbindungen und externe Anfragen für Karten-, Orts- und
                Preisdaten. Falls künftig optionale Tracking- oder Marketing-
                Dienste ergänzt werden, wird vor deren Aktivierung eine
                entsprechende Einwilligung eingeholt.
              </p>
            </section>

            <section className="legal-section">
              <h2>9. Standortfreigabe und Widerruf</h2>
              <p>
                Die Nutzung der Funktion „Standort nutzen“ erfolgt
                ausschließlich nach Ihrer ausdrücklichen Freigabe im Browser.
                Sie können diese Berechtigung jederzeit in den Browser- oder
                Geräteeinstellungen widerrufen oder künftig blockieren, ohne
                dass die übrigen Funktionen der Website wesentlich eingeschränkt
                werden.
              </p>
            </section>
          </>
        )}
      </article>

      <SiteFooter />
    </main>
  );
};

export const App = () => {
  const [activePage, setActivePage] = useState<LegalPage>(() =>
    typeof window !== "undefined"
      ? getLegalPageFromHash(window.location.hash)
      : "app",
  );
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
    "cache" | "upstream" | "stale" | null
  >(null);
  const [isStale, setIsStale] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [position, setPosition] = useState({ lat: 49.0489, lng: 8.2596 });
  const [cityQuery, setCityQuery] = useState("");
  const [locationLabel, setLocationLabel] = useState("Wörth am Rhein");
  const [resolvingCity, setResolvingCity] = useState(false);
  const [headerPanelOpen, setHeaderPanelOpen] = useState(false);

  const fuelLabel =
    fuel === "e5" ? "Super E5" : fuel === "e10" ? "Super E10" : "Diesel";
  const sortLabel = sort === "price" ? "Preis" : "Entfernung";

  const title = useMemo(() => {
    return `${stations.length} Treffer ${loading ? "- lade" : ""}`;
  }, [stations.length, loading]);

  const canRefresh = ageMinutes >= 10;
  const minutesUntilRefresh = Math.max(0, 10 - ageMinutes);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncActivePage = () => {
      setActivePage(getLegalPageFromHash(window.location.hash));
    };

    window.addEventListener("hashchange", syncActivePage);
    return () => window.removeEventListener("hashchange", syncActivePage);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.title =
      activePage === "impressum"
        ? "Impressum – Benzinpreise"
        : activePage === "datenschutz"
          ? "Datenschutz – Benzinpreise"
          : `Benzinpreise bei ${locationLabel}`;
  }, [activePage, locationLabel]);

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
    if (activePage !== "app") {
      return;
    }

    void loadStations();
  }, [activePage, fuel, radius, sort, position.lat, position.lng]);

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

  if (activePage !== "app") {
    return (
      <div className="app-shell">
        <LegalPageView page={activePage} />
      </div>
    );
  }

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
          />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};
