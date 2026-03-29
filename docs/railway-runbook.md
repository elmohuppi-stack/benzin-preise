# Railway Runbook (Konkretes Setup)

## Ziel

Dieses Runbook beschreibt die konkrete Einrichtung in Railway fuer ein Monorepo mit zwei Services.

## Services anlegen

1. Neues Railway-Projekt erstellen.
2. Service `api` aus diesem Repo anlegen.
3. Service `web` aus diesem Repo anlegen.
4. Optional Redis-Service hinzufuegen.

## Root Directory pro Service

- `api` Service: `backend`
- `web` Service: `frontend`

Beide Services verwenden jeweils die lokale `nixpacks.toml` Datei im Service-Ordner.

Wenn `Root Directory` nicht gesetzt ist, baut Railway das Monorepo vom Repo-Root und CLI-Deploys mit `railway up --service ...` laufen in Fehler wie `No start command detected`. In der aktuell verlinkten Production-Umgebung stehen beide Services noch auf `rootDirectory: null`.

Setze deshalb im Railway-Dashboard pro Service unter `Settings` mindestens eine der folgenden Varianten:

1. Bevorzugt: `Root Directory` auf `backend` bzw. `frontend` setzen.
2. Fallback ohne Root Directory:

- `api` Build Command: `npm run build:api`
- `api` Start Command: `npm run start:api`
- `web` Build Command: `npm run build:web`
- `web` Start Command: `npm run start:web`

## Build/Start auf Railway

- Backend:
  - Install: `npm ci`
  - Build: `npm run build`
  - Start: `npm run start`
- Frontend:
  - Install: `npm ci`
  - Build: `npm run build`
  - Start: `npm run start`

## Umgebungsvariablen

## Backend (`api`)

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
- `REDIS_URL=<railway_redis_url_optional>`

## Frontend (`web`)

- `VITE_API_BASE_URL=https://<api-domain>`
- `VITE_DEFAULT_RADIUS_KM=5`
- `VITE_DEFAULT_FUEL_TYPE=e10`
- `VITE_ENABLE_GEOLOCATION=true`

## Domains

- `api.<deine-domain>` -> backend service
- `app.<deine-domain>` -> frontend service

## Smoke-Test nach Deploy

1. Backend Health: `GET /health`
2. Frontend laden und Standort setzen.
3. Suchrequest pruefen:

- `GET /api/stations?lat=52.52&lng=13.405&radius=5&fuel=e10&sort=price`

4. Karte und Liste zeigen Treffer.
