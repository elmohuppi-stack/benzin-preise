# Hetzner Cloud Deployment Plan

## Zielbild

Deployment der App auf Hetzner Cloud mit einer bewusst einfachen Produktionsarchitektur:

- 1 VM als Start (kostenguenstig und schnell)
- kleines Node/Fastify-Backend fuer `GET /health` und `GET /api/stations`
- statisches Frontend via Caddy
- `docker-compose.yml` fuer den kompletten Start mit einem Befehl
- kein Redis, kein Postgres, keine zusaetzliche Stateful-Infrastruktur

Dieses Setup ist auf wenig Betriebsaufwand ausgelegt und kann spaeter bei Bedarf erweitert werden.

## Architektur (MVP)

- `app.<deine-domain>` -> `web` (Caddy + statisches Frontend)
- `api.<deine-domain>` -> `web` (Caddy Reverse Proxy) -> `api` Container
- nur zwei produktive Services: `web` und `api`

## Phase 1: Vorbereitung (Lokal)

1. Domain-Strategie festlegen:

- `app.<deine-domain>` fuer Frontend
- `api.<deine-domain>` fuer Backend

2. Secrets sammeln:

- `TANK_API_KEY`

3. Repo auf Produktionsbranch pruefen:

- `main` ist deploybar
- Smoke-Tests lokal erfolgreich

## Phase 2: Hetzner VM anlegen

1. VM erstellen:

- Ubuntu 24.04 LTS
- Region in DE (niedrige Latenz)
- 2 vCPU / 4 GB RAM als Startpunkt

2. Basis-Hardening:

- SSH Key statt Passwort
- Root Login deaktivieren
- Firewall aktivieren (nur 22, 80, 443)
- Optional Fail2Ban

3. Systempakete installieren:

- Docker Engine
- Docker Compose Plugin
- Git

## Phase 3: DNS einrichten

1. A-Records setzen:

- `app.<deine-domain>` -> VM IPv4
- `api.<deine-domain>` -> VM IPv4

2. TTL waehrend Migration auf 300 Sekunden setzen.

## Phase 4: Server-Verzeichnis und Konfiguration

1. Deployment-Verzeichnis erstellen, z. B.:

- `/opt/benzin-preise`

2. Projekt klonen:

- `git clone <repo-url> /opt/benzin-preise`

3. Compose-Domainwerte anlegen:

- `/opt/benzin-preise/.env`

Beispielwerte:

- `APP_DOMAIN=app.<deine-domain>`
- `API_DOMAIN=api.<deine-domain>`

4. Datei fuer Backend-Env erstellen:

- `/opt/benzin-preise/backend/.env.production`

Beispielwerte:

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

5. Datei fuer Frontend-Env erstellen:

- `/opt/benzin-preise/frontend/.env.production`

Beispielwerte:

- `VITE_API_BASE_URL=https://api.<deine-domain>`
- `VITE_DEFAULT_RADIUS_KM=5`
- `VITE_DEFAULT_FUEL_TYPE=e10`
- `VITE_ENABLE_GEOLOCATION=true`

## Phase 5: Container-Orchestrierung

Die benoetigten Dateien liegen bereits im Repo:

- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/Caddyfile`

1. Starten:

- `docker compose up -d --build`

2. Was dabei passiert:

- `api` startet als kleines Node-Backend auf Port 3000
- `web` baut das Frontend und liefert es via Caddy aus
- Caddy kuemmert sich um HTTPS und routet `api.<deine-domain>` intern an `api:3000`

## Phase 6: Erstabnahme (Smoke-Tests)

1. Backend Health:

- `GET https://api.<deine-domain>/health`

2. API Suche:

- `GET https://api.<deine-domain>/api/stations?lat=52.52&lng=13.405&radius=5&fuel=e10&sort=price`

3. Frontend:

- `https://app.<deine-domain>` laden
- Suche, Karte, Liste, Marker-Highlight pruefen

4. Frontend-Verhalten:

- Suche, Karte, Liste und Marker-Highlight pruefen

## Phase 7: CI/CD (empfohlen)

1. Deployment-Key erstellen:

- dedizierter SSH Key fuer GitHub Actions

2. GitHub Secrets setzen:

- `HETZNER_HOST`
- `HETZNER_USER`
- `HETZNER_SSH_KEY`

3. Workflow:

- Trigger auf Push nach `main`
- SSH auf VM
- `git pull`
- `docker compose up -d --build`
- kurze Smoke-Checks

## Phase 8: Backup, Monitoring, Betrieb

1. Backup:

- regelmaessiges Backup des Repos und der `.env.production` Werte
- optional Snapshot/Backup der Hetzner-VM

2. Monitoring:

- Container-Restart-Policy aktivieren
- Logs zentral sammeln (mindestens Docker Logs rotieren)
- Uptime-Check fuer `/health`

3. Alerting:

- HTTP 5xx Schwelle
- hohe Antwortzeiten

## Phase 9: Rollback-Strategie

1. Vor jedem Deploy:

- git tag setzen oder Commit merken

2. Rollback:

- `git checkout <letzter-stabiler-tag>`
- `docker compose up -d --build`

3. Hinweis:

- Es gibt keine externe Redis-/Postgres-Abhaengigkeit; ein Rollback ist dadurch unkompliziert.

## Unterschiede zu Railway (Kurz)

- Kein automatisches PaaS-Buildrouting, stattdessen Docker/Caddy selbst verwalten.
- Domains, TLS, Deploy-Pipeline und Rollback liegen in eigener Verantwortung.
- Mehr Kontrolle (Kosten/Setup), aber mehr Betriebsaufwand.

## Go-Live Checkliste

1. DNS zeigt auf Hetzner-IP.
2. HTTPS-Zertifikate sind ausgestellt.
3. `app` und `api` antworten produktiv.
4. CORS passt (`FRONTEND_ORIGIN`).
5. `docker compose ps` zeigt `api` und `web` als laufend.
6. Backup-Job bzw. VM-Snapshot ist eingerichtet.
7. Monitoring/Healthcheck aktiv.

## Folge-Deployments

Fuer alle weiteren Deployments nach dem Go-Live siehe:

- `docs/hetzner-followup-deployments-runbook.md`
