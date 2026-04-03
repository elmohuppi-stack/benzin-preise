# Hetzner Folge-Deployments Runbook

## Zweck

Diese Anleitung beschreibt den Standardablauf fuer alle nachfolgenden Deployments auf Hetzner Cloud nach dem initialen Go-Live.

## Ziel

- Sichere und reproduzierbare Deployments
- Kurze Downtime (idealerweise keine)
- Schnelles Rollback bei Problemen

## Voraussetzungen

1. SSH-Zugriff auf den Server
2. Deployment-Verzeichnis vorhanden (z. B. `/opt/benzin-preise`)
3. Docker und Docker Compose installiert
4. DNS und TLS sind bereits korrekt eingerichtet

## Standardablauf pro Deployment

## 1) Pre-Deployment Checks

1. Lokal auf `main` bzw. Release-Branch:

- `npm install`
- `npm run build`

2. Pruefen, ob neue Env-Variablen benoetigt werden.

3. Release markieren (empfohlen):

- Git Tag setzen, z. B. `release-YYYYMMDD-HHMM`

## 2) Deployment auf Server

1. Auf Server verbinden:

- `ssh <user>@<hetzner-host>`

2. Projekt aktualisieren:

- `cd /opt/benzin-preise`
- `git fetch --all --tags`
- `git checkout main`
- `git pull --ff-only`

3. Container neu bauen/starten:

- `docker compose up -d --build`

4. Laufenden Status pruefen:

- `docker compose ps`
- `docker compose logs --tail=120 api`
- `docker compose logs --tail=120 web`

## 3) Smoke-Tests direkt nach Deployment

1. Backend Health:

- `curl -fsS https://api.<deine-domain>/health`

2. API Endpoint:

- `curl -fsS "https://api.<deine-domain>/api/stations?lat=52.52&lng=13.405&radius=5&fuel=e10&sort=price"`

3. Frontend:

- `https://app.<deine-domain>` im Browser oeffnen
- Suche, Karte, Liste, Marker-Highlight pruefen

4. Frontend-Check:

- `https://app.<deine-domain>` im Browser laden und Suche/Karte pruefen

## 4) Rollback bei Fehlern

1. Letzten stabilen Tag/Commit wechseln:

- `cd /opt/benzin-preise`
- `git checkout <stabiler-tag-oder-commit>`

2. Container mit altem Stand neu deployen:

- `docker compose up -d --build`

3. Smoke-Tests erneut ausfuehren.

Hinweis: Durch die vereinfachte Zielarchitektur gibt es keine zusaetzlichen Redis-/Postgres-Abhaengigkeiten; im Regelfall reicht ein Rebuild von `api` und `web`.

## 5) Nachbereitung

1. Kurzes Deployment-Log erfassen:

- Datum/Uhrzeit
- Commit/Tag
- Ergebnis Smoke-Test
- Auffaelligkeiten und Gegenmassnahmen

2. Falls noetig, Monitoring-Schwellen anpassen.

## Zero-Downtime Verbesserung (Optional)

Wenn spaeter noetig:

1. Blue/Green mit zweiter App-Instanz
2. Vorgelagertes Load-Balancing
3. Gesundheitspruefungen vor Traffic-Switch

## Checkliste (Kurzform)

1. Build lokal erfolgreich
2. Env-Variablen geprueft
3. `git pull --ff-only` auf Server
4. `docker compose up -d --build`
5. `health` und API getestet
6. Frontend manuell geprueft
7. Monitoring ohne Auffaelligkeit
8. Bei Bedarf Rollback auf letzten stabilen Tag
