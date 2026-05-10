# Hetzner Folge-Deployments Runbook

## Zweck

Diese Anleitung beschreibt den Standardablauf fuer alle weiteren Deployments auf dem bereits eingerichteten Hetzner-Server.

## Aktueller Betriebsmodus

- Projektpfad: `/var/www/benzin-preise`
- Host-`nginx` routet die Domains
- `web` laeuft intern auf `127.0.0.1:3001`
- `api` laeuft intern auf `127.0.0.1:3002`

## Standardablauf pro Deployment

### 1) Vor dem Deploy lokal pruefen

```bash
cd /Users/elmarhepp/workspace/benzin-preise
npm install
npm run build
```

### 2) Auf dem Server deployen

```bash
ssh elmarhepp
cd /var/www/benzin-preise
git pull --ff-only
docker compose up -d --build
```

### 3) Laufenden Status pruefen

```bash
docker compose ps
docker compose logs --tail=120 api
docker compose logs --tail=120 web
```

### 4) Interne Smoke-Tests

```bash
curl http://127.0.0.1:3002/health
curl -I http://127.0.0.1:3001
```

### 5) Oeffentliche Checks

Sobald DNS aktiv ist:

```bash
curl http://benzin-api.elmarhepp.de/health
```

Im Browser:

- `http://benzin.elmarhepp.de`

Nach spaeterer TLS-Aktivierung entsprechend `https://...` verwenden.

## Rollback bei Fehlern

```bash
ssh elmarhepp
cd /var/www/benzin-preise
git log --oneline -n 5
git checkout <stabiler-commit>
docker compose up -d --build
```

Dann die internen Tests erneut ausfuehren.

## Nachbereitung

- Commit/Tag notieren
- Ergebnis der Smoke-Tests kurz festhalten
- bei Bedarf DNS/TLS/Env-Aenderungen dokumentieren

## Kurzcheckliste

1. Lokal Build erfolgreich
2. `git pull --ff-only` auf dem Server
3. `docker compose up -d --build`
4. `curl http://127.0.0.1:3002/health`
5. Frontend ueber Nginx pruefen
6. bei Bedarf Rollback auf letzten stabilen Commit
