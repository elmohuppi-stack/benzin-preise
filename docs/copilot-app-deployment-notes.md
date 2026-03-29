# Copilot App And Deployment Notes

## App Ueberblick

- Monorepo mit zwei Workspaces: `backend` und `frontend`
- Backend: Fastify API-Proxy auf Tankerkoenig
- Frontend: React + Vite + Leaflet (mit Marker-Clustering)
- Standardstandort: Woerth am Rhein (49.0489, 8.2596)
- Standardkraftstoff: `e10` (Anzeige: Super E10)

## Relevante Frontend-Interaktionen

- Listenklick waehlt Tankstelle und wechselt automatisch auf Kartenansicht
- Ausgewaehlte Tankstelle wird auf der Karte hervorgehoben (roter Ring)
- Karte loest bei `moveend` und `zoomend` eine neue Suche aus
- API-Request nach Karteninteraktion ist per Debounce verzoegert (derzeit 350 ms)

## Datenfluss

1. Frontend ruft `GET /api/stations` gegen Backend auf
2. Backend ruft Tankerkoenig `list.php` und bei Bedarf `prices.php` auf
3. Backend normalisiert Preise (`selected`, `e5`, `e10`, `diesel`)
4. Frontend rendert Liste und Karte aus derselben Stationsmenge

## Wichtige Dateien

- `frontend/src/App.tsx`: Hauptzustand, Suchablauf, Debounce-Trigger fuer Karteninteraktion
- `frontend/src/components/MapPanel.tsx`: Leaflet-Karte, Marker, Viewport-Events
- `frontend/src/components/StationList.tsx`: Listenansicht
- `frontend/src/styles.css`: Responsive UI und Header/Layout
- `backend/src/server.js`: API-Endpunkte
- `backend/src/tankerkoenig.js`: Upstream-Integration und Mapping

## Railway Setup

- Service `api`: Root Directory `backend`
- Service `web`: Root Directory `frontend`
- Optional zusaetzlich Redis-Service

## Railway Variablen

### api

- `NODE_ENV=production`
- `PORT=3000`
- `TANK_API_KEY=<api_key>`
- `TANK_API_BASE_URL=https://creativecommons.tankerkoenig.de/json`
- `FRONTEND_ORIGIN=https://<web-domain>`
- `REQUEST_TIMEOUT_MS=6000`
- `UPSTREAM_RETRY_COUNT=2`
- `UPSTREAM_RETRY_BASE_DELAY_MS=250`
- `CACHE_TTL_SECONDS=60`
- `RATE_LIMIT_WINDOW_SECONDS=60`
- `RATE_LIMIT_MAX_REQUESTS=90`
- `REDIS_URL=<optional>`

### web

- `VITE_API_BASE_URL=https://<api-domain>`
- `VITE_DEFAULT_RADIUS_KM=5`
- `VITE_DEFAULT_FUEL_TYPE=e10`
- `VITE_ENABLE_GEOLOCATION=true`

## Deployment Ablauf

1. Build lokal pruefen: `npm run build -w frontend`
2. Deploy API: `railway up --service api`
3. Deploy Web: `railway up --service web`
4. Health pruefen: `https://<api-domain>/health`
5. Frontend Funktion pruefen (Stadt, Standort, Karte, Liste, Filter)

## Bekannte Stolpersteine

- Bei Domainwechsel `FRONTEND_ORIGIN` im Backend aktualisieren und API neu deployen
- Falls Karte nach Tabwechsel unvollstaendig wirkt: `invalidateSize` muss aktiv bleiben
- Historische Preisdaten sind upstream nicht retroaktiv verfuegbar
