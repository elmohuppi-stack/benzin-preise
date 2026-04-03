# Hetzner Cloud Deployment Plan

## Aktuelle Zielarchitektur

Die App wird auf Hetzner Cloud aktuell in einer einfachen Multi-App-Architektur betrieben:

- 1 VM mit Host-`nginx` als zentralem Router
- Projektpfad: `/var/www/benzin-preise`
- `web` Container auf `127.0.0.1:3001`
- `api` Container auf `127.0.0.1:3002`
- Domains:
  - `benzin.elmarhepp.de`
  - `benzin-api.elmarhepp.de`

Das Backend ist bewusst klein gehalten: API-Key-Schutz, Validierung, Rate-Limit und In-Memory-Cache.

## Server-Status

Der interne Deploy ist bereits verifiziert:

- `curl http://127.0.0.1:3002/health` -> OK
- `curl -I http://127.0.0.1:3001` -> Frontend antwortet

## Benoetigte Server-Bausteine

1. Ubuntu-VM auf Hetzner
2. Docker + Docker Compose
3. Host-`nginx`
4. DNS bei Spaceship fuer die beiden Subdomains
5. spaeter optional HTTPS via Certbot

## Verzeichnisstruktur auf dem Server

```bash
/var/www/benzin-preise
```

Dort liegen Repo, `docker-compose.yml` und die Produktions-Env-Dateien.

## Produktions-Umgebungsvariablen

### `backend/.env.production`

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

Nach TLS-Aktivierung die Domainwerte auf `https://...` umstellen.

### `frontend/.env.production`

Fuer den ersten HTTP-Go-Live:

- `VITE_API_BASE_URL=http://benzin-api.elmarhepp.de`
- `VITE_DEFAULT_RADIUS_KM=5`
- `VITE_DEFAULT_FUEL_TYPE=e10`
- `VITE_ENABLE_GEOLOCATION=true`

## Deployment-Ablauf

### 1. Repo aktualisieren

```bash
ssh elmarhepp
cd /var/www/benzin-preise
git pull --ff-only
```

### 2. Container starten oder aktualisieren

```bash
docker compose up -d --build
```

### 3. Interne Smoke-Tests

```bash
curl http://127.0.0.1:3002/health
curl -I http://127.0.0.1:3001
```

## Host-Nginx Routing

Beispiel fuer `/etc/nginx/sites-available/benzin-preise.conf`:

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

Aktivieren:

```bash
ln -sf /etc/nginx/sites-available/benzin-preise.conf /etc/nginx/sites-enabled/benzin-preise.conf
nginx -t
systemctl reload nginx
```

## DNS bei Spaceship

Fuer `elmarhepp.de`:

- `A benzin -> 178.104.142.181`
- `A benzin-api -> 178.104.142.181`

## Oeffentliche Tests nach DNS-Propagation

```bash
curl http://benzin-api.elmarhepp.de/health
```

Im Browser:

- `http://benzin.elmarhepp.de`

## HTTPS spaeter aktivieren

Sobald DNS weltweit sichtbar ist, kann HTTPS ueber Host-`nginx` aktiviert werden, z. B. mit:

```bash
certbot --nginx -d benzin.elmarhepp.de -d benzin-api.elmarhepp.de
```

Danach die Env-Dateien auf `https://...` umstellen und die Container einmal neu bauen.

## Folge-Deployments

Siehe:

- `docs/hetzner-followup-deployments-runbook.md`
- `docs/deployment.md`
