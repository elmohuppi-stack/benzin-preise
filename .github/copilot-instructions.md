# Copilot instructions for Hetzner multi-app deployments

Dieses Projekt folgt einem wiederverwendbaren Standard fuer Deployments auf einem gemeinsamen Hetzner-Server. Wenn der Nutzer nach Deployment, DNS, Nginx, HTTPS, Docker Compose oder Server-Routing fragt, gehe standardmaessig von diesem Setup aus, sofern der Nutzer nichts anderes verlangt.

## Standard-Architektur

- Viele Apps teilen sich **eine** Hetzner-VM.
- DNS wird bei **Spaceship** verwaltet.
- Bei Spaceship zeigen in der Regel `A @` und `A *` auf dieselbe Hetzner-IP.
- Jede App bekommt **eigene Subdomains** und **nicht automatisch die Root-Domain**.
  - Frontend: `https://<app>.elmarhepp.de`
  - API: `https://<app>-api.elmarhepp.de`
- `elmarhepp.de` selbst bleibt standardmaessig frei fuer Landingpage, Uebersicht oder spaetere andere Nutzung.
- Host-`nginx` auf dem Server ist der zentrale Reverse Proxy fuer **alle** Apps.
- App-Container binden nur an `127.0.0.1`, niemals direkt an oeffentliche Ports `80` oder `443`.

## Server-Konventionen

- SSH-Zugang: `ssh elmarhepp`
- App-Pfad: `/var/www/<app-slug>`
- Nginx-Site: `/etc/nginx/sites-available/<app-slug>.conf`
- Aktivierung per Symlink nach `/etc/nginx/sites-enabled/`
- Zertifikate via `certbot --nginx`

## Docker- und Port-Konventionen

Jede App nutzt eigene interne Ports. Beispiele:

- Frontend-Container: `127.0.0.1:3001:80`
- API-Container: `127.0.0.1:3002:3000`

Bei weiteren Apps **immer freie Ports waehlen** und keine Konflikte erzeugen.

## Env-Konventionen

Wenn eine Frontend/API-App deployed wird, nutze standardmaessig:

```env
APP_DOMAIN=<app>.elmarhepp.de
API_DOMAIN=<app>-api.elmarhepp.de
FRONTEND_ORIGIN=https://<app>.elmarhepp.de
VITE_API_BASE_URL=https://<app>-api.elmarhepp.de
```

## Bevorzugter Deployment-Ablauf

1. Repo nach `/var/www/<app-slug>` deployen oder aktualisieren.
2. Produktions-`env` setzen.
3. `docker compose up -d --build` ausfuehren.
4. Nginx-Site fuer `<app>.elmarhepp.de` und `<app>-api.elmarhepp.de` anlegen.
5. `nginx -t` pruefen und erst dann `systemctl reload nginx`.
6. HTTPS mit `certbot --nginx -d <app>.elmarhepp.de -d <app>-api.elmarhepp.de` aktivieren.
7. Immer per `curl` verifizieren:
   - `curl -I https://<app>.elmarhepp.de/`
   - `curl -i https://<app>-api.elmarhepp.de/health`
   - falls relevant CORS mit `Origin: https://<app>.elmarhepp.de`

## Wichtige Regeln fuer Copilot

- Die Root-Domain **nicht** auf eine einzelne App legen, ausser der Nutzer sagt das ausdruecklich.
- Fuer neue Apps immer eigene Subdomains bevorzugen.
- Kein Caddy oder app-eigenes TLS auf Ports `80/443` einsetzen, solange der Nutzer den zentralen Host-`nginx` nutzt.
- Vor Aussagen wie "funktioniert" oder "HTTPS ist aktiv" immer mit echten `curl`-/`nginx -t`-/`docker compose ps`-Checks verifizieren.
- Bei Aenderungen an Nginx erst Syntax pruefen, dann reloaden.
