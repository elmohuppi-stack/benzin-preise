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

## Aktuelles Hetzner Setup

- Projektpfad auf dem Server: `/var/www/benzin-preise`
- Host-`nginx` uebernimmt das Routing fuer mehrere Apps
- Frontend laeuft intern auf `127.0.0.1:3001`
- Backend laeuft intern auf `127.0.0.1:3002`
- Oeffentliche Ziel-Domains:
  - `benzin.elmarhepp.de`
  - `benzin-api.elmarhepp.de`

## Produktions-Variablen

### api (`backend/.env.production`)

- `NODE_ENV=production`
- `PORT=3000`
- `TANK_API_KEY=<api_key>`
- `TANK_API_BASE_URL=https://creativecommons.tankerkoenig.de/json`
- `FRONTEND_ORIGIN=http://benzin.elmarhepp.de` (spaeter `https://...`)
- `REQUEST_TIMEOUT_MS=6000`
- `UPSTREAM_RETRY_COUNT=2`
- `UPSTREAM_RETRY_BASE_DELAY_MS=250`
- `CACHE_TTL_SECONDS=600`
- `RATE_LIMIT_WINDOW_SECONDS=60`
- `RATE_LIMIT_MAX_REQUESTS=90`

### web (`frontend/.env.production`)

- `VITE_API_BASE_URL=http://benzin-api.elmarhepp.de` (spaeter `https://...`)
- `VITE_DEFAULT_RADIUS_KM=5`
- `VITE_DEFAULT_FUEL_TYPE=e10`
- `VITE_ENABLE_GEOLOCATION=true`

## Deployment Ablauf

1. Lokal Build pruefen: `npm run build`
2. Auf den Server: `ssh elmarhepp`
3. Repo aktualisieren: `cd /var/www/benzin-preise && git pull --ff-only`
4. Container neu bauen/starten: `docker compose up -d --build`
5. Intern pruefen: `curl http://127.0.0.1:3002/health`
6. Oeffentlich pruefen: `http://benzin-api.elmarhepp.de/health` und `http://benzin.elmarhepp.de`

## Bekannte Stolpersteine

- Bei Domainwechsel `FRONTEND_ORIGIN` im Backend aktualisieren und API neu deployen
- Falls Karte nach Tabwechsel unvollstaendig wirkt: `invalidateSize` muss aktiv bleiben
- Historische Preisdaten sind upstream nicht retroaktiv verfuegbar
