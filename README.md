# Benzinpreise App

Monorepo mit Frontend (React + Vite) und Backend (Fastify API-Proxy zur Tankstellen-API).

## Features

- Suche per Stadtname oder aktuellem Standort
- Ergebnisliste und Kartenansicht mit Marker-Clustering
- Auswahl und Hervorhebung der aktiven Tankstelle auf der Karte
- Automatisches Nachladen bei Kartenbewegung und Zoom (inklusive Debounce)
- Mobile-optimierte Bedienung mit kompaktem Header und Toggle fuer Suche/Filter
- Kraftstofffilter fuer `Super E5`, `Super E10`, `Diesel`
- Kleines Node/Fastify-Backend als API-Key-Proxy mit Validierung, Rate-Limit und In-Memory-Cache

## Lokaler Start ohne Docker

Empfohlen fuer die normale Entwicklung mit Vite und Node direkt auf dem Host.

1. Abhaengigkeiten installieren:

```bash
npm install
```

2. Env-Dateien vorbereiten:

```bash
make env
```

oder alternativ manuell:

- `cp backend/.env.example backend/.env`
- `cp frontend/.env.example frontend/.env`

3. Entwicklung starten:

```bash
make start
```

oder alternativ:

```bash
npm run dev
```

4. Lokal testen:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Healthcheck: `http://localhost:3000/health`

Stoppen:

```bash
make stop
```

> Der lokale Dev-Start ohne Docker wird im aktiven Terminal mit `Ctrl+C` beendet.

## Lokaler Start mit Docker

Optional, wenn du die Container lokal pruefen willst. Fuer normale Entwicklung ist `make start` meist angenehmer.

1. Docker-Env-Dateien vorbereiten:

```bash
make env-docker
```

2. Fuer einen sinnvollen lokalen Docker-Test diese Werte setzen:

`backend/.env.production`

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
TANK_API_KEY=<dein-echter-key>
TANK_API_BASE_URL=https://creativecommons.tankerkoenig.de/json
REQUEST_TIMEOUT_MS=6000
UPSTREAM_RETRY_COUNT=2
UPSTREAM_RETRY_BASE_DELAY_MS=250
CACHE_TTL_SECONDS=600
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_MAX_REQUESTS=90
FRONTEND_ORIGIN=http://localhost:3001
```

`frontend/.env.production`

```env
VITE_API_BASE_URL=http://localhost:3002
VITE_DEFAULT_RADIUS_KM=5
VITE_DEFAULT_FUEL_TYPE=e10
VITE_ENABLE_GEOLOCATION=true
```

3. Container starten:

```bash
make docker-start
```

Direkt ohne `make`:

```bash
docker compose up --build
```

4. Lokal testen:

- Frontend: `http://localhost:3001`
- Healthcheck: `http://localhost:3002/health`
- API-Test:

```bash
curl "http://localhost:3002/api/stations?lat=49.0489&lng=8.2596&radius=5&fuel=e10&sort=price"
```

Stoppen:

```bash
make docker-stop
```

Logs ansehen:

```bash
make docker-logs
```

## Hilfreiche Make-Kommandos

- `make start` - lokaler Start ohne Docker
- `make stop` - Hinweis zum Stoppen des lokalen Dev-Starts
- `make docker-start` - Start per `docker compose`
- `make docker-stop` - Container stoppen
- `make docker-logs` - Logs live anzeigen
- `make build` - Projekt bauen
- `make health` - lokalen Backend-Healthcheck pruefen

## Konfiguration

Wichtige Defaults im Frontend:

- `VITE_DEFAULT_RADIUS_KM=5`
- `VITE_DEFAULT_FUEL_TYPE=e10`
- `VITE_ENABLE_GEOLOCATION=true`

## Wichtige Endpunkte

- `GET /health`
- `GET /api/stations?lat=...&lng=...&radius=5&fuel=e5&sort=price`

## Deployment mit Hetzner Cloud (aktueller Stand)

Das produktive Setup wurde auf **Host-`nginx` + Docker Compose** vereinfacht:

- Projektpfad auf dem Server: `/var/www/benzin-preise`
- `web` Container liefert das statische Frontend auf `127.0.0.1:3001`
- `api` Container liefert das Backend auf `127.0.0.1:3002`
- der Host-`nginx` routet diese beiden internen Ports auf die Domains
  - `benzin.elmarhepp.de`
  - `benzin-api.elmarhepp.de`

### Backend-Variablen (`backend/.env.production`)

Fuer den ersten HTTP-Go-Live:

- `NODE_ENV=production`
- `PORT=3000`
- `TANK_API_KEY=<api_key>`
- `TANK_API_BASE_URL=https://creativecommons.tankerkoenig.de/json`
- `FRONTEND_ORIGIN=http://benzin.elmarhepp.de`
- `REQUEST_TIMEOUT_MS=6000`
- `UPSTREAM_RETRY_COUNT=2`
- `UPSTREAM_RETRY_BASE_DELAY_MS=250`
- `CACHE_TTL_SECONDS=600`
- `RATE_LIMIT_WINDOW_SECONDS=60`
- `RATE_LIMIT_MAX_REQUESTS=90`

Nach spaeterer TLS-Aktivierung auf `https://...` umstellen.

### Frontend-Variablen (`frontend/.env.production`)

Fuer den ersten HTTP-Go-Live:

- `VITE_API_BASE_URL=http://benzin-api.elmarhepp.de`
- `VITE_DEFAULT_RADIUS_KM=5`
- `VITE_DEFAULT_FUEL_TYPE=e10`
- `VITE_ENABLE_GEOLOCATION=true`

### Deploy-Befehle auf dem Server

```bash
ssh elmarhepp
cd /var/www/benzin-preise
git pull --ff-only
docker compose up -d --build
```

### Interne Smoke-Tests auf dem Server

```bash
curl http://127.0.0.1:3002/health
curl -I http://127.0.0.1:3001
```

### Oeffentliche Tests nach DNS-Propagation

- `http://benzin-api.elmarhepp.de/health`
- `http://benzin.elmarhepp.de`
- danach optional HTTPS aktivieren
