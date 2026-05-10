# Hetzner Multi-App Deployment Template

Diese Vorlage kannst du in andere Projekte kopieren, wenn GitHub Copilot neue Apps auf demselben Hetzner-Server deployen soll.

## Ziel

- ein gemeinsamer Hetzner-Server
- mehrere Apps parallel per Subdomain
- Host-`nginx` als zentraler Router
- `docker compose` pro App
- TLS per Let's Encrypt / Certbot
- DNS bei Spaceship ueber `A @` und `A *`

---

## 1. Werte pro App festlegen

Passe fuer jedes neue Projekt nur diese Werte an:

| Variable          | Beispiel                |
| ----------------- | ----------------------- |
| `APP_SLUG`        | `todo-app`              |
| `FRONTEND_DOMAIN` | `todo.elmarhepp.de`     |
| `API_DOMAIN`      | `todo-api.elmarhepp.de` |
| `WEB_PORT`        | `3011`                  |
| `API_PORT`        | `3012`                  |
| `DEPLOY_PATH`     | `/var/www/todo-app`     |

> Wichtig: Ports muessen pro App eindeutig sein.

---

## 2. DNS-Annahmen bei Spaceship

Empfohlenes Basis-Setup:

| Typ | Host | Wert           |
| --- | ---- | -------------- |
| `A` | `@`  | `<hetzner-ip>` |
| `A` | `*`  | `<hetzner-ip>` |

Damit zeigen alle Subdomains auf denselben Server. Welche App ausgeliefert wird, entscheidet danach `nginx` auf Hetzner.

---

## 3. Erwartete Produktions-Umgebung

### Root `.env`

```env
APP_DOMAIN=<FRONTEND_DOMAIN>
API_DOMAIN=<API_DOMAIN>
```

### Backend `backend/.env.production`

```env
NODE_ENV=production
PORT=3000
FRONTEND_ORIGIN=https://<FRONTEND_DOMAIN>
```

### Frontend `frontend/.env.production`

```env
VITE_API_BASE_URL=https://<API_DOMAIN>
```

Weitere App-spezifische Variablen kommen zusaetzlich dazu.

---

## 4. Docker-Compose-Konvention

Die App darf **keine oeffentlichen Ports 80/443** direkt belegen. Stattdessen nur localhost-Bindings:

```yaml
services:
  api:
    ports:
      - "127.0.0.1:<API_PORT>:3000"

  web:
    ports:
      - "127.0.0.1:<WEB_PORT>:80"
```

---

## 5. Nginx-Template auf Hetzner

Datei:

```bash
/etc/nginx/sites-available/<APP_SLUG>.conf
```

Inhalt:

```nginx
server {
    listen 80;
    server_name <FRONTEND_DOMAIN>;
    return 301 https://$host$request_uri;
}

server {
    listen 80;
    server_name <API_DOMAIN>;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name <FRONTEND_DOMAIN>;

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
    listen 443 ssl;
    server_name <API_DOMAIN>;

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
```

Danach:

```bash
ln -s /etc/nginx/sites-available/<APP_SLUG>.conf /etc/nginx/sites-enabled/<APP_SLUG>.conf
nginx -t
systemctl reload nginx
certbot --nginx -d <FRONTEND_DOMAIN> -d <API_DOMAIN>
```

---

## 6. Standard-Deploy-Ablauf fuer Copilot

Wenn du ein neues Projekt mit Copilot auf diesem Server deployen willst, ist das der Zielablauf:

1. Repo nach `/var/www/<APP_SLUG>` bringen
2. Produktions-`env` anlegen oder aktualisieren
3. `docker compose up -d --build`
4. Nginx-Site einrichten
5. HTTPS per Certbot aktivieren
6. technisch verifizieren:

```bash
curl -I https://<FRONTEND_DOMAIN>/
curl -i https://<API_DOMAIN>/health
docker compose ps
nginx -t
```

---

## 7. Prompt-Vorlage fuer neue Projekte

Diesen Text kannst du in ein neues Repo kopieren oder direkt an Copilot geben:

```text
Diese App soll nach meinem Standard auf dem Hetzner-Multi-App-Server deployed werden.

Rahmenbedingungen:
- zentraler Host-Nginx auf Hetzner
- DNS bei Spaceship mit Wildcard auf die Server-IP
- keine App darf direkt 80/443 belegen
- Deployment-Pfad: /var/www/<APP_SLUG>
- Frontend-Domain: https://<FRONTEND_DOMAIN>
- API-Domain: https://<API_DOMAIN>
- interne Ports: WEB=<WEB_PORT>, API=<API_PORT>
- HTTPS via certbot --nginx

Bitte richte Docker-Compose, Produktions-Env, Nginx und die Verifikationsschritte entsprechend ein.
```

---

## 8. Empfehlung fuer dein Domain-Schema

Fuer bis zu 20 Apps ist dieses Muster sauber und skalierbar:

- `benzin.elmarhepp.de`
- `benzin-api.elmarhepp.de`
- `todo.elmarhepp.de`
- `todo-api.elmarhepp.de`
- `wiki.elmarhepp.de`
- `wiki-api.elmarhepp.de`

So bleibt `elmarhepp.de` als Root-Domain frei fuer eine Landingpage oder ein Portal.
