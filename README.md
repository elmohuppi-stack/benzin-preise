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

Empfohlen, wenn du das spaetere Hetzner-Deployment moeglichst nah lokal pruefen willst.

1. Docker-Env-Dateien vorbereiten:

```bash
make env-docker
```

Dabei werden angelegt:

- `.env`
- `backend/.env.production`
- `frontend/.env.production`

Die lokalen Defaults sind auf diese Domains ausgelegt:

- `APP_DOMAIN=app.localhost`
- `API_DOMAIN=api.localhost`

2. Wichtige Werte setzen:

- In `backend/.env.production`: `TANK_API_KEY` setzen
- `FRONTEND_ORIGIN=https://app.localhost`
- `VITE_API_BASE_URL=https://api.localhost`

3. Container starten:

```bash
make docker-start
```

Direkt ohne `make`:

```bash
docker compose up --build
```

4. Lokal testen:

- Frontend: `https://app.localhost`
- Healthcheck: `https://api.localhost/health`
- API-Test:

```bash
curl -k "https://api.localhost/api/stations?lat=49.0489&lng=8.2596&radius=5&fuel=e10&sort=price"
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

## Deployment mit Hetzner Cloud (vereinfacht)

Das Projekt ist jetzt auf eine einfache Zielarchitektur fuer Hetzner Cloud reduziert:

- `api`: kleines Node/Fastify-Backend aus `backend/`
- `web`: statisches Frontend, gebaut aus `frontend/` und via Caddy ausgeliefert
- `docker-compose.yml` am Repo-Root fuer den gesamten Start

### Backend-Variablen (`backend/.env.production`)

- `NODE_ENV=production`
- `PORT=3000`
- `TANK_API_KEY=<api_key>`
- `TANK_API_BASE_URL=https://creativecommons.tankerkoenig.de/json`
- `FRONTEND_ORIGIN=https://app.<deine-domain>`
- `REQUEST_TIMEOUT_MS=6000`
- `UPSTREAM_RETRY_COUNT=2`
- `UPSTREAM_RETRY_BASE_DELAY_MS=250`
- `CACHE_TTL_SECONDS=600`
- `RATE_LIMIT_WINDOW_SECONDS=60`
- `RATE_LIMIT_MAX_REQUESTS=90`

### Frontend-Variablen (`frontend/.env.production`)

- `VITE_API_BASE_URL=https://api.<deine-domain>`
- `VITE_DEFAULT_RADIUS_KM=5`
- `VITE_DEFAULT_FUEL_TYPE=e10`
- `VITE_ENABLE_GEOLOCATION=true`

### Compose-Setup

1. Domains in Root-Env eintragen:

```bash
cp .env.example .env
```

2. Produktionsdateien anlegen:

```bash
cp backend/.env.example backend/.env.production
cp frontend/.env.example frontend/.env.production
```

3. Werte anpassen und dann deployen:

```bash
docker compose up -d --build
```

### Smoke-Test

- `GET https://api.<deine-domain>/health`
- `GET https://api.<deine-domain>/api/stations?lat=52.52&lng=13.405&radius=5&fuel=e10&sort=price`
- Frontend aufrufen und Suche, Karte und Liste pruefen
