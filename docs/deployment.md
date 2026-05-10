# 🚀 Deployment – benzin-preise

> **Standard-konform nach [deployment-standard.md](./deployment-standard.md)**

## Übersicht

| Aspekt | Wert |
|--------|------|
| App-Slug | `benzin-preise` |
| Frontend-Domain | `benzin.elmarhepp.de` |
| API-Domain | `benzin-api.elmarhepp.de` |
| Web-Port | `3001` |
| API-Port | `3002` |
| Netzwerk | `hetzner-network` (external) |
| Server-Pfad | `/var/www/benzin-preise` |

## Voraussetzungen

- Hetzner-Server mit installiertem [Deployment-Standard](deployment-standard.md)
- `deploy-app.sh` installiert (`/usr/local/bin/deploy-app.sh`)
- `hetzner-network` existiert (`docker network create hetzner-network`)

## Deployment (Erstinstallation)

### 1. Repository auf den Server klonen

```bash
cd /var/www
git clone <repo-url> benzin-preise
cd /var/www/benzin-preise
```

### 2. `.env` anlegen

```bash
cp .env.example .env
nano .env
```

Inhalt:

```env
# === Deployment (Pflicht) ===
APP_SLUG=benzin-preise
WEB_PORT=3001
API_PORT=3002

# === Tankerkoenig API ===
TANK_API_KEY=<dein-echter-api-key>
```

### 3. Deployen

```bash
deploy-app.sh benzin-preise
```

### 4. Container ins `hetzner-network` einbinden

```bash
docker network connect hetzner-network benzin-preise_api-1
docker network connect hetzner-network benzin-preise_web-1
```

### 5. Nginx-Konfiguration

```bash
sudo nano /etc/nginx/sites-available/benzin-preise.conf
```

Inhalt (nach Standard aus deployment-standard.md Abschnitt 5.1):

```nginx
# === FRONTEND ===
server {
    server_name benzin.elmarhepp.de;

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/benzin.elmarhepp.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/benzin.elmarhepp.de/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# === API ===
server {
    server_name benzin-api.elmarhepp.de;

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/benzin.elmarhepp.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/benzin.elmarhepp.de/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# === HTTP → HTTPS ===
server {
    listen 80;
    server_name benzin.elmarhepp.de benzin-api.elmarhepp.de;
    return 301 https://$host$request_uri;
}
```

Aktivieren:

```bash
sudo ln -s /etc/nginx/sites-available/benzin-preise.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL-Zertifikat

```bash
sudo certbot --nginx -d benzin.elmarhepp.de -d benzin-api.elmarhepp.de
```

### 7. Verifikation

```bash
deploy-app.sh benzin-preise status
curl -I https://benzin.elmarhepp.de/
curl https://benzin-api.elmarhepp.de/health
```

## Updates deployen

```bash
deploy-app.sh benzin-preise
```

## Logs ansehen

```bash
deploy-app.sh benzin-preise logs
```

## Rollback

```bash
deploy-app.sh benzin-preise rollback
```

## Bekannte Stolpersteine

- Bei Domainwechsel `FRONTEND_ORIGIN` im Backend aktualisieren und neu deployen
- Historische Preisdaten sind upstream nicht retroaktiv verfügbar
- Nach Migration auf `hetzner-network`: alte Default-Netzwerke mit `docker network prune` bereinigen
