# Benzinpreise App

Monorepo mit Frontend (React + Vite) und Backend (Fastify API-Proxy zur Tankstellen-API).

## Features

- Suche per Stadtname oder aktuellem Standort
- Ergebnisliste und Kartenansicht mit Marker-Clustering
- Auswahl und Hervorhebung der aktiven Tankstelle auf der Karte
- Automatisches Nachladen bei Kartenbewegung und Zoom (inklusive Debounce)
- Mobile-optimierte Bedienung mit kompaktem Header und Toggle fuer Suche/Filter
- Kraftstofffilter fuer `Super E5`, `Super E10`, `Diesel`

## Schnellstart

1. Abhaengigkeiten installieren:

```bash
npm install
```

2. Env-Dateien vorbereiten:

- `cp backend/.env.example backend/.env`
- `cp frontend/.env.example frontend/.env`

3. Entwicklung starten:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## Konfiguration

Wichtige Defaults im Frontend:

- `VITE_DEFAULT_RADIUS_KM=5`
- `VITE_DEFAULT_FUEL_TYPE=e10`
- `VITE_ENABLE_GEOLOCATION=true`

## Wichtige Endpunkte

- `GET /health`
- `GET /api/stations?lat=...&lng=...&radius=5&fuel=e5&sort=price`

## Deployment Mit Railway

Das Projekt wird als zwei Services in Railway betrieben:

- Service `api` mit Root Directory `backend`
- Service `web` mit Root Directory `frontend`

### Backend-Variablen (`api`)

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

### Frontend-Variablen (`web`)

- `VITE_API_BASE_URL=https://<api-domain>`
- `VITE_DEFAULT_RADIUS_KM=5`
- `VITE_DEFAULT_FUEL_TYPE=e10`
- `VITE_ENABLE_GEOLOCATION=true`

### Deploy-Befehle

Beispiel fuer den manuellen CLI-Deploy:

```bash
railway up --service api
railway up --service web
```

### Smoke-Test

- `GET https://<api-domain>/health`
- `GET https://<api-domain>/api/stations?lat=52.52&lng=13.405&radius=5&fuel=e10&sort=price`
- Frontend aufrufen und Karte/Liste inklusive Suchfunktionen pruefen
