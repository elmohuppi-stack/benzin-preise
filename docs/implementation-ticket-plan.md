# Umsetzungstickets (MVP bis Production)

## Epic A: Plattform und Deployment

### A1 Repo-Struktur anlegen

- Beschreibung: Monorepo mit `frontend/`, `backend/`, `docs/` vorbereiten.
- Akzeptanzkriterien:
  - Beide Apps separat startbar
  - Einheitliche Node-Version dokumentiert
- Aufwand: S

### A2 Hetzner + Docker Compose einrichten

- Beschreibung: `web` und `api` per Docker Compose auf dem Host deployen.
- Akzeptanzkriterien:
  - Beide Container laufen stabil
  - Deploy per `git pull` + `docker compose up -d --build` moeglich
- Aufwand: M

### A3 Nginx, Domains + CORS

- Beschreibung: Host-`nginx` als zentralen Router konfigurieren und CORS absichern.
- Akzeptanzkriterien:
  - Frontend kann API aufrufen
  - mehrere Apps koennen parallel ueber Subdomains betrieben werden
- Aufwand: S

## Epic B: Backend API + Datenqualitaet

### B1 Upstream API Client

- Beschreibung: API-Client fuer Tankstellen + Preise bauen.
- Akzeptanzkriterien:
  - Fehler robust abgefangen
  - Timeouts und Retry aktiv
- Aufwand: M

### B2 Suchendpoint

- Beschreibung: Endpoint fuer Suche nach Koordinate, Radius, Kraftstofftyp.
- Akzeptanzkriterien:
  - Ergebnisse normalisiert
  - Sortierung nach Preis und Entfernung moeglich
- Aufwand: M

### B3 Caching im Minimal-Backend

- Beschreibung: In-Memory-Cache mit TTL fuer wiederholte Suchanfragen.
- Akzeptanzkriterien:
  - Wiederholte Anfragen schneller
  - Cache-Hit sichtbar im Verhalten/Log
- Aufwand: M

### B4 Rate-Limit + Healthcheck

- Beschreibung: API schuetzen und Healthcheck bereitstellen.
- Akzeptanzkriterien:
  - 429 bei Limit-Ueberschreitung
  - `/health` liefert 200
- Aufwand: S

## Epic C: Frontend UX (Handy + Desktop)

### C1 Mobile Liste + Filter

- Beschreibung: Mobile-First Liste mit Filterbar und Sortierung.
- Akzeptanzkriterien:
  - Kraftstofftyp und Radius einstellbar
  - Sortierung aktualisiert Ergebnisse korrekt
- Aufwand: M

### C2 Mobile Karte + Bottom Sheet

- Beschreibung: Karte als Tab mit Marker-Interaktion.
- Akzeptanzkriterien:
  - Marker klickbar
  - Bottom Sheet zeigt Kerninfos
- Aufwand: M

### C3 Desktop Split View

- Beschreibung: Links Liste, rechts Karte, synchronisiert.
- Akzeptanzkriterien:
  - Auswahl in Liste fokussiert Marker
  - Klick auf Marker markiert Listeneintrag
- Aufwand: M

### C4 Empty/Error/Loading States

- Beschreibung: UX fuer Lade-, Fehler- und Leerszenarien.
- Akzeptanzkriterien:
  - Keine blanken Screens
  - Retry und Hilfetexte vorhanden
- Aufwand: S

## Epic D: Qualitaet und Release

### D1 Tests Backend

- Beschreibung: Unit- und Integrationstests fuer API und Mapping.
- Akzeptanzkriterien:
  - Kritische Logik durch Tests abgedeckt
  - CI bricht bei Fehlern
- Aufwand: M

### D2 E2E Kernflow

- Beschreibung: Standort -> Suche -> Liste -> Karte.
- Akzeptanzkriterien:
  - Flow automatisiert testbar
  - Test laeuft in Staging
- Aufwand: M

### D3 Observability

- Beschreibung: Logging, Basis-Metriken, Fehlertracking.
- Akzeptanzkriterien:
  - Fehlerquote und Latenz sichtbar
  - Alerts fuer Schwellwerte gesetzt
- Aufwand: S

### D4 Produktionsfreigabe

- Beschreibung: Go-Live Checkliste ausfuehren.
- Akzeptanzkriterien:
  - Smoke-Test ok
  - Rollback dokumentiert
- Aufwand: S

## Reihenfolge (empfohlen)

1. A1 -> A2 -> A3
2. B1 -> B2 -> B4 -> B3
3. C1 -> C2 -> C4 -> C3
4. D1 -> D2 -> D3 -> D4

## Ziel fuer ersten lauffaehigen MVP

- A1, A2, B1, B2, B4, C1, C2, C4
