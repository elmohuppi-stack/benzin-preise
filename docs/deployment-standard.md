# 📐 Deployment-Standard für Hetzner Multi-App Server

> **Ziel:** Jede neue App folgt exakt dem gleichen Schema – kein Rätselraten mehr, kein "irgendwie anders".

---

## 📋 Inhaltsverzeichnis

1. [Das Problem](#1-das-problem)
2. [Die Standard-Struktur](#2-die-standard-struktur)
3. [Docker-Compose-Standard](#3-docker-compose-standard)
4. [.env-Standard](#4-env-standard)
5. [Nginx-Standard](#5-nginx-standard)
6. [Deploy-Script](#6-deploy-script)
7. [Checkliste für neue Apps](#7-checkliste-für-neue-apps)
8. [Template-Repo (GitHub)](#8-template-repo-github)
9. [Migration bestehender Apps](#9-migration-bestehender-apps)
10. [Port-Tabelle](#10-port-tabelle)

---

## 1. Das Problem

Aktuell hat fast jede App ein anderes Setup:

| Aspekt | Aktuelle Lage |
|--------|--------------|
| Compose-Dateinamen | `docker-compose.yml`, `docker-compose.prod.yml`, `compose.prod.yaml`, `compose.yaml` |
| Docker-Netzwerke | Jede App in eigenem default-Netzwerk, nur `wetter` nutzt `hetzner-network` |
| .env-Layout | Mal Root, mal Subdirs, mal `.env.production`, mal `.env` |
| container_name | Nur bei `mediathek` und `wetter` |
| healthchecks | Nur bei `mediathek` |

**Konsequenz:** Eine neue App zu deployen bedeutet 4-5 manuelle Entscheidungen, die jedes Mal anders getroffen werden. Das führt zu Fehlern und Frustration.

---

## 1.1 Infrastruktur vs. App-Konfiguration

Bevor wir in den Standard einsteigen, eine grundsätzliche Klärung:

### Wer braucht die Server-IP?

| Ebene | Wo lebt die IP? | Konfiguriert von |
|-------|----------------|-----------------|
| **DNS** (Spaceship) | `A @` + `A *` → `<hetzner-ip>` | **Einmalig** bei Spaceship |
| **Deploy-Script** | Läuft **auf** dem Server → kennt seine IP | Nie konfigurieren |
| **GitHub Actions** (CI/CD, optional) | Als Secret `SERVER_IP` | **Einmalig** in Repo-Settings |
| **.env** der App | ❌ **Nicht** enthalten | — |

**Fazit:** Die Server-IP ist **Infrastruktur-Wissen**, kein App-Detail. Sie steht nicht in `.env`, nicht in `docker-compose.yml` und nicht im Deploy-Script. Du konfigurierst sie **einmal** bei Spaceship (Wildcard-DNS), und danach kümmert sich Nginx um das Routing anhand der Subdomains.

### Was gehört in die `.env` der App?

Nur **App-spezifische** Werte:
- `WEB_PORT` – auf welchem localhost-Port die App lauscht
- `APP_SECRET`, `DB_PASSWORD` – Secrets für diese App
- `DATABASE_URL` – Verbindung zur eigenen DB
- Alles, was zwischen `development` und `production` variiert

### Warum trennen wir das?

Weil die `.env` im App-Repository committed werden könnte (als `.env.example`) – und dort hat die Server-IP nichts zu suchen. Die App soll auf **jedem** Server laufen, nicht nur auf deinem Hetzner-Server.

---

## 2. Die Standard-Struktur

**Jede App** (neu UND migriert) hat **exakt diese Ordnerstruktur**:

```
/var/www/<APP_SLUG>/
├── docker-compose.yml     ← IMMER dieser Name
├── .env                   ← IMMER im Root
├── .env.example           ← Dokumentation aller Variablen
└── ... (App-Code)
```

Keine Ausnahmen. Keine Subdir-`.env.production`-Dateien mehr.

---

## 3. Docker-Compose-Standard

### 3.1 Grundgerüst (für eine App mit eigener DB)

```yaml
# /var/www/<APP_SLUG>/docker-compose.yml
services:
  app:
    image: ghcr.io/your/image:latest   # ODER build: .
    ports:
      - "127.0.0.1:${WEB_PORT}:3000"
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - hetzner-network

  db:
    image: postgres:16-alpine
    volumes:
      - data:/var/lib/postgresql/data
    env_file: .env
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-app}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - hetzner-network

volumes:
  data:

networks:
  hetzner-network:
    external: true
```

### 3.2 Grundgerüst (reines Frontend, keine DB)

```yaml
# /var/www/<APP_SLUG>/docker-compose.yml
services:
  app:
    build: .
    ports:
      - "127.0.0.1:${WEB_PORT}:80"
    env_file: .env
    restart: unless-stopped
    networks:
      - hetzner-network

networks:
  hetzner-network:
    external: true
```

### 3.3 Regeln

| Regel | Begründung |
|-------|-----------|
| ✅ Dateiname `docker-compose.yml` | Einheitlich, kein Raten |
| ✅ Kein `container_name` | Docker-Compose generiert `slug-app-1`, das reicht |
| ✅ `networks: hetzner-network` | Alle Apps im selben Netzwerk – Kommunikation möglich |
| ✅ `external: true` | Netzwerk existiert bereits auf dem Server |
| ✅ `env_file: .env` | Eine zentrale Datei, kein `.env.production` |
| ✅ Healthcheck für DB | Sauberes Dependency-Management |
| ✅ Ports nur `127.0.0.1:` | Keine Exposition nach außen (Nginx macht das) |

### 3.4 Alle Apps ohne DB auf `hetzner-network` umstellen

```bash
# Einmalig: Bestehende Apps zum Netzwerk hinzufügen
for app in benzin-preise elmo-scanner finanzen mathe-quiz sari weather-history; do
  docker network connect hetzner-network "${app}_app-1" 2>/dev/null || true
done
```

---

## 4. .env-Standard

### 4.1 Pflichtvariablen (jede App)

```env
# === Deployment (Pflicht) ===
APP_SLUG=<app-slug>
WEB_PORT=<port>

# Nur wenn API vorhanden:
# API_PORT=<port>

# === App-spezifisch (Beispiele) ===
# APP_SECRET=...
# DB_PASSWORD=...
# DATABASE_URL=postgresql://user:pass@db:5432/dbname
```

### 4.2 `.env.example` (im Repo)

```env
# === Deployment (Pflicht) ===
APP_SLUG=meine-app
WEB_PORT=3081
# API_PORT=3082

# === App-spezifisch ===
# APP_SECRET=<generiere mit: openssl rand -base64 32>
# DB_PASSWORD=<generiere mit: openssl rand -base64 32>
```

### 4.3 Regeln

| Regel | Begründung |
|-------|-----------|
| ✅ `.env` liegt **immer** im Root | Ein Ort für alle Envs |
| ✅ `.env.example` dokumentiert alle Variablen | Neue Entwickler sehen sofort, was rein muss |
| ✅ Secrets werden **nicht** committed | `.env` in `.gitignore`, nur `.env.example` im Repo |
| ✅ `WEB_PORT` als Variable | Ein Wert – überall referenzierbar |

---

## 5. Nginx-Standard

### 5.1 Template (für eine App mit Frontend + API)

```nginx
# /etc/nginx/sites-available/<APP_SLUG>.conf
# === FRONTEND ===
server {
    server_name <FRONTEND_DOMAIN>;

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/<FRONTEND_DOMAIN>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<FRONTEND_DOMAIN>/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:<WEB_PORT>;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# === API ===
server {
    server_name <API_DOMAIN>;

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/<FRONTEND_DOMAIN>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<FRONTEND_DOMAIN>/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:<API_PORT>;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# === HTTP → HTTPS (immer als letztes) ===
server {
    listen 80;
    server_name <FRONTEND_DOMAIN> <API_DOMAIN>;
    return 301 https://$host$request_uri;
}
```

### 5.2 Template (reines Frontend, kein API)

```nginx
# /etc/nginx/sites-available/<APP_SLUG>.conf
server {
    server_name <FRONTEND_DOMAIN>;

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/<FRONTEND_DOMAIN>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<FRONTEND_DOMAIN>/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:<WEB_PORT>;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name <FRONTEND_DOMAIN>;
    return 301 https://$host$request_uri;
}
```

### 5.3 Regeln

| Regel | Begründung |
|-------|-----------|
| ✅ HTTPS-Blöcke zuerst, HTTP-Redirect als letztes | Certbot `--nginx` erwartet diese Reihenfolge |
| ✅ `proxy_set_header` immer vollständig | Sonst funktionieren Weiterleitungen/SSL nicht |
| ✅ Ein Zertifikat für beide Subdomains | `certbot --nginx -d frontend -d api` erstellt ein Multi-Domain-Zertifikat |
| ✅ immer `127.0.0.1:<PORT>` | Nur localhost, nie Docker-interner Port |

---

## 6. Deploy-Script

### 6.1 Installation auf dem Server

```bash
# /usr/local/bin/deploy-app.sh
#!/bin/bash
set -euo pipefail

# ─── Farben ───
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ─── Hilfe ───
usage() {
    echo "Usage: deploy-app.sh <app-slug> [action]"
    echo ""
    echo "Actions:"
    echo "  deploy    (default) Pull & restart"
    echo "  logs      Show container logs"
    echo "  status    Show container status"
    echo "  rebuild   Force rebuild without cache"
    echo "  rollback  Revert to previous commit"
    exit 1
}

# ─── Argumente ───
APP=${1:-}
ACTION=${2:-deploy}
DEPLOY_PATH="/var/www/$APP"

if [ -z "$APP" ]; then
    usage
fi

if [ ! -d "$DEPLOY_PATH" ]; then
    echo -e "${RED}❌ App '$APP' nicht gefunden unter $DEPLOY_PATH${NC}"
    exit 1
fi

# ─── Actions ───
case $ACTION in
    deploy)
        echo -e "${YELLOW}🔄 Pulling latest code for $APP...${NC}"
        cd "$DEPLOY_PATH"
        git pull

        echo -e "${YELLOW}🐳 Starting containers...${NC}"
        docker compose up -d --build

        echo -e "${GREEN}✅ $APP deployed${NC}"
        echo "   WEB_PORT=$(grep WEB_PORT .env | cut -d= -f2 || echo '?')"
        ;;
    logs)
        cd "$DEPLOY_PATH"
        docker compose logs -f --tail=50
        ;;
    status)
        cd "$DEPLOY_PATH"
        docker compose ps
        ;;
    rebuild)
        cd "$DEPLOY_PATH"
        docker compose build --no-cache
        docker compose up -d
        echo -e "${GREEN}✅ $APP rebuilt${NC}"
        ;;
    rollback)
        cd "$DEPLOY_PATH"
        echo -e "${YELLOW}↩️ Rolling back $APP...${NC}"
        git checkout HEAD~1
        docker compose up -d --build
        echo -e "${GREEN}✅ $APP rolled back${NC}"
        ;;
    *)
        usage
        ;;
esac
```

**Installation:**
```bash
sudo cp deploy-app.sh /usr/local/bin/deploy-app.sh
sudo chmod +x /usr/local/bin/deploy-app.sh
```

**Verwendung:**
```bash
deploy-app.sh umami           # deployt umami
deploy-app.sh umami logs      # zeigt Logs
deploy-app.sh umami status    # zeigt Status
deploy-app.sh umami rollback  # Rollback zum vorherigen Commit
```

---

## 7. Checkliste für neue Apps

**Jede neue App** muss diese Liste durchlaufen, bevor sie live geht:

### Vorbereitung

- [ ] **Port reservieren** – aus der Port-Tabelle (Abschnitt 10) den nächsten freien Port wählen
- [ ] **App-Slug festlegen** – kurz, kleingeschrieben, mit Bindestrichen (z.B. `meine-app`)
- [ ] **Subdomains festlegen** – `slug.elmarhepp.de` + ggf. `slug-api.elmarhepp.de`

### Deployment

- [ ] **docker-compose.yml** nach Standard (Abschnitt 3) erstellt
- [ ] **.env** nach Standard (Abschnitt 4) erstellt – mit produktionstauglichen Werten
- [ ] **Netzwerk** nutzt `hetzner-network` (external)
- [ ] **Nginx-Config** nach Standard (Abschnitt 5) erstellt
- [ ] **Nginx-Site aktiviert** (`ln -s sites-available → sites-enabled`)
- [ ] **nginx -t** erfolgreich
- [ ] **certbot --nginx** für Subdomain(s) ausgeführt
- [ ] **HTTPS** verifiziert: `curl -I https://slug.elmarhepp.de/` → 200

### Verifikation

- [ ] **Container laufen**: `deploy-app.sh slug status`
- [ ] **Website erreichbar** im Browser
- [ ] **.env.example** im Repo (ohne Secrets)
- [ ] **Eintrag in Port-Tabelle** (Abschnitt 10) gemacht

---

## 8. Template-Repo (GitHub)

Ein GitHub-Template-Repo vereinfacht den Start neuer Apps drastisch.

### 8.1 Ordnerstruktur des Templates

```
hetzner-app-template/
├── docker-compose.yml      # Standard-Vorlage
├── .env.example            # Alle Variablen dokumentiert
├── .gitignore              # .env, node_modules, etc.
├── nginx/
│   └── app.conf            # Nginx-Template (für Repo-Doku)
└── README.md               # Mit Checkliste
```

### 8.2 `docker-compose.yml` (Template)

```yaml
services:
  app:
    # TODO: image oder build: . eintragen
    image: ghcr.io/your-org/your-image:latest
    ports:
      - "127.0.0.1:${WEB_PORT}:3000"
    env_file: .env
    restart: unless-stopped
    networks:
      - hetzner-network

  db:
    image: postgres:16-alpine
    volumes:
      - data:/var/lib/postgresql/data
    env_file: .env
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-app}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - hetzner-network

volumes:
  data:

networks:
  hetzner-network:
    external: true
```

### 8.3 `.env.example` (Template)

```env
# === Deployment (Pflicht) ===
APP_SLUG=meine-app
WEB_PORT=3081
# API_PORT=3082

# === App-Konfiguration ===
# APP_SECRET=<openssl rand -base64 32>
# DB_PASSWORD=<openssl rand -base64 32>
```

### 8.4 `README.md` (Template)

```markdown
# <App-Name>

## Deployment

Voraussetzung: Hetzner-Server mit [Deployment-Standard](link).

```bash
# Port aus Tabelle reservieren, dann:
cp .env.example .env
# .env mit Werten füllen (WEB_PORT, Secrets)
```

Auf dem Server:
```bash
cd /var/www
git clone <repo-url>
cd <app-slug>
cp .env.example .env
# .env-Werte anpassen (identisch lokal)
deploy-app.sh <app-slug>
```

## Domain(s)
- Frontend: `https://<slug>.elmarhepp.de`
- API: `https://<slug>-api.elmarhepp.de`
```

---

## 9. Migration bestehender Apps

Nicht alles auf einmal. Die Migration erfolgt in Phasen:

### Phase 1: Minimal (sofort, für jede App)

- [ ] `deploy-app.sh` auf dem Server installieren
- [ ] `docker compose` → `hetzner-network` hinzufügen (sofern nicht vorhanden)
- [ ] Compose-Datei auf `docker-compose.yml` umbenennen

### Phase 2: .env (diese Woche)

- [ ] Alle `.env`-Werte **zusätzlich** in eine Root-`.env` übernehmen
- [ ] Subdir-`.env.production` als Fallback bestehen lassen (doppelt gemoppelt)
- [ ] Nach erfolgreichem Test: Subdir-Envs entfernen

### Phase 3: Nginx (bei Gelegenheit)

- [ ] Alle Nginx-Configs auf das einheitliche Format umstellen
- [ ] HTTP-Block ans Ende verschieben
- [ ] `certbot --nginx` drüberlaufen lassen (vereinheitlicht automatisch)

### Phase 4: Saubermachen

- [ ] Alte Docker-Netzwerke löschen (`docker network prune`)

---

## 10. Port-Tabelle

### Aktuelle Belegung

| Port | App | Netzwerk |
|------|-----|----------|
| 3001 | benzin-preise (Web) | eigenes |
| 3002 | benzin-preise (API) | eigenes |
| 3011 | elmo-scanner (Web) | eigenes |
| 3012 | elmo-scanner (API) | eigenes |
| 3021 | finanzen (Web) | eigenes |
| 3022 | finanzen (API) | eigenes |
| 3031 | wetter | `hetzner-network` ✅ |
| 3032 | weather-history (Backend) | eigenes |
| 3033 | weather-history (Frontend) | eigenes |
| 3041 | mathe-quiz (Web) | eigenes |
| 3042 | mathe-quiz (API) | eigenes |
| 3051 | mediathek (Web) | eigenes (`appnet`) |
| 3052 | mediathek (API) | eigenes (`appnet`) |
| 3061 | sari | eigenes |
| **3071** | **→ Umami** 🆕 | **`hetzner-network`** ✅ |

### Nächste freie Ports

| # | App | Web-Port | API-Port |
|---|-----|---------|---------|
| 10 | _reserviert für Umami_ | 3071 | — |
| 11 | _frei_ | 3081 | 3082 |
| 12 | _frei_ | 3091 | 3092 |
| 13 | _frei_ | 3101 | 3102 |
| 14 | _frei_ | 3111 | 3112 |
| 15 | _frei_ | 3121 | 3122 |

> **Port-Schema:** App # → Web `30<App#+1>1`, API `30<App#+1>2`

---

## Kurzreferenz

### Auf dem Server (tägliche Arbeit)

```bash
# Neue App deployen
deploy-app.sh <slug>

# Status prüfen
deploy-app.sh <slug> status

# Logs ansehen
deploy-app.sh <slug> logs

# Rollback
deploy-app.sh <slug> rollback
```

### Neue App von Grund auf

```bash
# 1. Port reservieren (Tabelle in diesem Dokument)
# 2. Template-Repo klonen
git clone git@github.com:dein-user/hetzner-app-template.git /var/www/<slug>

# 3. .env anlegen
cp .env.example .env
# → WEB_PORT und Secrets eintragen

# 4. Deployen
deploy-app.sh <slug>

# 5. Nginx + SSL
sudo cp nginx/app.conf /etc/nginx/sites-available/<slug>.conf
# → Domains eintragen
sudo ln -s /etc/nginx/sites-available/<slug>.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d <slug>.elmarhepp.de -d <slug>-api.elmarhepp.de

# 6. Fertig!
deploy-app.sh <slug> status
```

---

> **Version:** 1.0 | **Stand:** 10.05.2026
> **Nächstes Ziel:** Umami als erste App nach diesem Standard deployen 🚀
