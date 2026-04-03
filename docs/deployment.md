# Deployment Guide (Hetzner Cloud)

Diese Datei ist die praktische Schritt-fuer-Schritt-Anleitung fuer das Produktiv-Deployment der App auf Hetzner Cloud.

## Zielarchitektur

- 1 Hetzner Cloud VM
- Docker + `docker compose`
- `web` Container mit Caddy und statischem Frontend
- `api` Container mit kleinem Node/Fastify-Backend
- eigene Domain mit zwei Subdomains:
  - `app.<deine-domain>`
  - `api.<deine-domain>`

---

## 1. Voraussetzungen

Du brauchst:

1. eine Hetzner Cloud VM (empfohlen: Ubuntu 24.04, 2 vCPU, 4 GB RAM)
2. eine Domain bei einem Registrar oder DNS-Anbieter
3. deinen echten `TANK_API_KEY`
4. SSH-Zugriff auf den Server

---

## 2. DNS einrichten

Lege diese DNS-Eintraege an:

| Typ | Host  | Ziel          |
| --- | ----- | ------------- |
| `A` | `app` | `<server-ip>` |
| `A` | `api` | `<server-ip>` |

Beispiel:

- `app.example.de` -> `203.0.113.10`
- `api.example.de` -> `203.0.113.10`

> Wichtig: Port `80` und `443` muessen auf dem Server erreichbar sein, damit Caddy automatisch TLS-Zertifikate anfordern kann.

---

## 3. Server vorbereiten

Per SSH verbinden:

```bash
ssh root@<server-ip>
```

Docker und Git installieren:

```bash
apt update && apt upgrade -y
apt install -y ca-certificates curl gnupg git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Optional sinnvoll:

- UFW/Firewall aktivieren
- nur `22`, `80`, `443` freigeben
- Root-Login deaktivieren und normalen Deploy-User nutzen

---

## 4. Repository deployen

```bash
mkdir -p /opt/benzin-preise
cd /opt
git clone <repo-url> benzin-preise
cd /opt/benzin-preise
```

Wenn das Repo privat ist, nutze SSH-Deploy-Keys.

---

## 5. Produktions-Env-Dateien anlegen

### Root `.env`

```bash
cp .env.example .env
nano .env
```

Inhalt:

```env
APP_DOMAIN=app.<deine-domain>
API_DOMAIN=api.<deine-domain>
```

### Backend `backend/.env.production`

```bash
cp backend/.env.example backend/.env.production
nano backend/.env.production
```

Empfohlener Inhalt:

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

FRONTEND_ORIGIN=https://app.<deine-domain>
```

### Frontend `frontend/.env.production`

```bash
cp frontend/.env.example frontend/.env.production
nano frontend/.env.production
```

Inhalt:

```env
VITE_API_BASE_URL=https://api.<deine-domain>
VITE_DEFAULT_RADIUS_KM=5
VITE_DEFAULT_FUEL_TYPE=e10
VITE_ENABLE_GEOLOCATION=true
```

---

## 6. Deployment starten

Im Projektverzeichnis:

```bash
cd /opt/benzin-preise
docker compose up -d --build
```

Container pruefen:

```bash
docker compose ps
docker compose logs --tail=100 api
docker compose logs --tail=100 web
```

---

## 7. Go-Live pruefen

### Healthcheck

```bash
curl -fsS https://api.<deine-domain>/health
```

### API-Test

```bash
curl -fsS "https://api.<deine-domain>/api/stations?lat=49.0489&lng=8.2596&radius=5&fuel=e10&sort=price"
```

### Frontend testen

Im Browser:

- `https://app.<deine-domain>` oeffnen
- Suche per Stadt testen
- Karte und Trefferliste pruefen
- Tankstellenpreise sichtbar?

---

## 8. Spaetere Updates deployen

```bash
cd /opt/benzin-preise
git pull --ff-only
docker compose up -d --build
```

Logs bei Problemen:

```bash
docker compose logs -f api
docker compose logs -f web
```

---

## 9. Rollback

Wenn ein Deploy fehlschlaegt:

```bash
cd /opt/benzin-preise
git log --oneline -n 5
git checkout <stabiler-commit>
docker compose up -d --build
```

---

## 10. Haeufige Fehlerquellen

### TLS-Zertifikat wird nicht ausgestellt

Pruefe:

- Domain zeigt wirklich auf die Hetzner-IP
- Port `80` offen
- Port `443` offen
- kein anderer Webserver blockiert die Ports

### API liefert 503

Pruefe in `backend/.env.production`:

- `TANK_API_KEY` gesetzt?
- kein Platzhalterwert mehr?

### Frontend kann API nicht erreichen

Pruefe:

- `VITE_API_BASE_URL=https://api.<deine-domain>`
- `FRONTEND_ORIGIN=https://app.<deine-domain>`
- `docker compose ps`

---

## 11. Repo-interne Referenzen

- Detailplan: `docs/hetzner-deployment-plan.md`
- Folge-Deployments: `docs/hetzner-followup-deployments-runbook.md`
