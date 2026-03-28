# Railway Deployment Blueprint (Frontend + Backend + Redis)

## 1) Ziel

Dieses Dokument beschreibt ein produktionsnahes Deployment fuer eine Benzinpreis-Webapp auf Railway mit:

- Frontend-Service (Vite + React + TypeScript, statisch ausgeliefert)
- Backend-Service (Node.js + Fastify/Express als API-Proxy)
- Redis-Service (Caching und optionale Rate-Limit-Storage)

## 2) Empfohlene Repository-Struktur

```text
benzin-preise/
  frontend/
  backend/
  docs/
```

Optional spaeter:

- `infra/` fuer IaC-Skripte
- `.github/workflows/` fuer CI-Gates

## 3) Railway Projektaufbau

## 3.1 Services

1. `api` (Node.js)
2. `web` (Static Frontend)
3. `redis` (Railway Redis Template)

## 3.2 Umgebungen

1. `staging` fuer develop Branch
2. `production` fuer main Branch

## 3.3 Branch-Zuordnung

1. Push/Merge auf `develop` deployed nach `staging`
2. Push/Merge auf `main` deployed nach `production`

## 4) Build- und Startkommandos

## 4.1 Backend (`api`)

- Build: `npm ci && npm run build`
- Start: `npm run start`
- Healthcheck Route: `GET /health`

## 4.2 Frontend (`web`)

- Build: `npm ci && npm run build`
- Output: `dist/`
- Start: statische Auslieferung (Railway Static Site oder Node-Serve)

Hinweis:
Wenn du statt Vite ein Next.js-Frontend nutzt, Build/Start entsprechend auf `next build` und `next start` anpassen.

## 5) Umgebungsvariablen (mit Default-Vorschlaegen)

## 5.1 Backend: Pflichtvariablen

- `NODE_ENV=production`
- `PORT=3000`
- `TANK_API_KEY=<dein_api_key>`
- `TANK_API_BASE_URL=https://creativecommons.tankerkoenig.de/json`
- `FRONTEND_ORIGIN=https://<deine_web_domain>`

## 5.2 Backend: Performance/Sicherheit

- `REQUEST_TIMEOUT_MS=6000`
- `UPSTREAM_RETRY_COUNT=2`
- `UPSTREAM_RETRY_BASE_DELAY_MS=250`
- `CACHE_TTL_SECONDS=60`
- `RATE_LIMIT_WINDOW_SECONDS=60`
- `RATE_LIMIT_MAX_REQUESTS=90`
- `LOG_LEVEL=info`

## 5.3 Redis

- `REDIS_URL=<railway_intern_bereitgestellt>`

## 5.4 Frontend

- `VITE_API_BASE_URL=https://<deine_api_domain>`
- `VITE_DEFAULT_RADIUS_KM=5`
- `VITE_DEFAULT_FUEL_TYPE=e5`
- `VITE_ENABLE_GEOLOCATION=true`

## 6) Netz, CORS und Domains

1. Eigene Domains konfigurieren:
   - `api.deinedomain.tld` fuer Backend
   - `app.deinedomain.tld` fuer Frontend
2. CORS im Backend nur fuer `FRONTEND_ORIGIN` erlauben.
3. HTTPS erzwingen.

## 7) Caching-Strategie

1. Cache-Key auf Basis von:
   - gerundetem Standort (z. B. 3 Nachkommastellen)
   - Radius
   - Kraftstofftyp
2. TTL initial auf 60 Sekunden setzen.
3. Bei API-Fehlern optional stale Cache bis 180 Sekunden ausliefern (degradierter Modus).

## 8) Deployment-Ablauf

1. Lokale Qualitaetschecks:
   - Lint
   - Unit-Tests
   - Build
2. Merge nach `develop` => automatisches Staging Deployment.
3. Smoke-Test in Staging:
   - `/health`
   - Suchanfrage mit Testkoordinate
   - Frontend ruft Backend korrekt auf
4. Merge nach `main` => Production Deployment.
5. Production Smoke-Test und Monitoring checken.

## 9) Monitoring und Alerting (Minimum)

1. API Error Rate (5xx) ueber Schwelle alarmieren.
2. P95 Latenz beobachten.
3. Cache Hit Rate beobachten.
4. Upstream API Fehler getrennt markieren.

## 10) Rollback-Plan

1. Railway auf letzte stabile Deployment-Version zuruecksetzen.
2. Bei wiederkehrender Upstream-Stoerung:
   - Retry verringern
   - stale Cache aktivieren
3. Incident kurz dokumentieren (Ursache, Dauer, Fix).

## 11) Definition of Done fuer Infrastruktur

1. Staging und Production existieren.
2. Frontend und Backend laufen mit Custom Domain.
3. Redis ist verbunden und Cache aktiv.
4. Healthcheck stabil.
5. Fehler und Latenz sind sichtbar im Monitoring.
