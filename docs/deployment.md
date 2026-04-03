# Deployment Guide (Hetzner Cloud)

Diese Datei ist die praktische Schritt-fuer-Schritt-Anleitung fuer das Produktiv-Deployment der App auf Hetzner Cloud.

## Zielarchitektur

- 1 Hetzner Cloud VM
- Docker + `docker compose`
- Host-`nginx` als zentraler Reverse Proxy fuer mehrere Apps
- `web` Container mit statischem Frontend auf lokalem Port `3001`
- `api` Container mit kleinem Node/Fastify-Backend auf lokalem Port `3002`
- eigene Domain mit zwei Subdomains:
  - `benzin.elmarhepp.de`
  - `benzin-api.elmarhepp.de`

---

## 1. Voraussetzungen

Du brauchst:

1. eine Hetzner Cloud VM (empfohlen: Ubuntu 24.04, 2 vCPU, 4 GB RAM)
2. eine Domain bei einem Registrar oder DNS-Anbieter
3. deinen echten `TANK_API_KEY`
4. SSH-Zugriff auf den Server

---

## 2. DNS einrichten

Lege spaeter diese DNS-Eintraege an:

| Typ | Host         | Ziel          |
| --- | ------------ | ------------- |
| `A` | `benzin`     | `<server-ip>` |
| `A` | `benzin-api` | `<server-ip>` |

Beispiel:

- `benzin.elmarhepp.de` -> `203.0.113.10`
- `benzin-api.elmarhepp.de` -> `203.0.113.10`

> Die DNS-Umstellung kann auch spaeter erfolgen. Fuer das erste Server-Setup reicht es, die App intern auf `127.0.0.1:3001` und `127.0.0.1:3002` erreichbar zu machen.

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
mkdir -p /var/www/benzin-preise
cd /var/www
git clone <repo-url> benzin-preise
cd /var/www/benzin-preise
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
APP_DOMAIN=benzin.elmarhepp.de
API_DOMAIN=benzin-api.elmarhepp.de
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

FRONTEND_ORIGIN=https://benzin.elmarhepp.de
```

### Frontend `frontend/.env.production`

```bash
cp frontend/.env.example frontend/.env.production
nano frontend/.env.production
```

Inhalt:

```env
VITE_API_BASE_URL=https://benzin-api.elmarhepp.de
VITE_DEFAULT_RADIUS_KM=5
VITE_DEFAULT_FUEL_TYPE=e10
VITE_ENABLE_GEOLOCATION=true
```

---

## 6. Deployment starten

Im Projektverzeichnis:

```bash
cd /var/www/benzin-preise
docker compose up -d --build
```

Container pruefen:

```bash
docker compose ps
docker compose logs --tail=100 api
docker compose logs --tail=100 web
curl http://127.0.0.1:3002/health
curl -I http://127.0.0.1:3001
```

---

## 7. Nginx als zentralen Router konfigurieren

Die App selbst belegt keine oeffentlichen Ports mehr. Stattdessen leitet Host-`nginx` die Domains an die internen Containerports weiter.

### Beispiel-Nginx-Config

Datei z. B. unter:

```bash
/etc/nginx/sites-available/benzin-preise.conf
```

Inhalt:

```nginx
server {
    listen 80;
    server_name benzin.elmarhepp.de;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name benzin-api.elmarhepp.de;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Danach aktivieren und reloaden:

```bash
ln -s /etc/nginx/sites-available/benzin-preise.conf /etc/nginx/sites-enabled/benzin-preise.conf
nginx -t
systemctl reload nginx
```

### Interner Test vor DNS-Go-Live

```bash
curl -H 'Host: benzin.elmarhepp.de' http://127.0.0.1/
curl -H 'Host: benzin-api.elmarhepp.de' http://127.0.0.1/health
```

### Nach DNS-Umstellung

```bash
curl http://benzin-api.elmarhepp.de/health
```

Dann im Browser:

- `http://benzin.elmarhepp.de`

HTTPS kann danach in einem zweiten Schritt via Certbot oder bestehender Nginx-TLS-Konfiguration aktiviert werden.

---

## 8. Spaetere Updates deployen

```bash
cd /var/www/benzin-preise
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
cd /var/www/benzin-preise
git log --oneline -n 5
git checkout <stabiler-commit>
docker compose up -d --build
```

---

## 10. Haeufige Fehlerquellen

### Nginx liefert die App nicht aus

Pruefe:

- `curl http://127.0.0.1:3001` liefert HTML
- `curl http://127.0.0.1:3002/health` liefert JSON
- `nginx -t` ist erfolgreich
- die `server_name` Werte stimmen

### API liefert 503

Pruefe in `backend/.env.production`:

- `TANK_API_KEY` gesetzt?
- kein Platzhalterwert mehr?

### Frontend kann API nicht erreichen

Pruefe:

- `VITE_API_BASE_URL=https://benzin-api.elmarhepp.de` (spaeter) oder intern korrekt gesetzt
- `FRONTEND_ORIGIN=https://benzin.elmarhepp.de`
- `docker compose ps`
- Nginx-Proxy zeigt auf `127.0.0.1:3002`

---

## 11. Repo-interne Referenzen

- Detailplan: `docs/hetzner-deployment-plan.md`
- Folge-Deployments: `docs/hetzner-followup-deployments-runbook.md`
