# Benzinpreise App

Monorepo mit Frontend (React + Vite) und Backend (Fastify API-Proxy zur Tankstellen-API).

## Schnellstart

1. Abhaengigkeiten installieren:

```bash
npm install
```

2. Env-Dateien vorbereiten:

- `cp backend/.env.example backend/.env`
- `cp frontend/.env.example frontend/.env`

3. Entwicklung starten:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## Wichtige Endpunkte

- `GET /health`
- `GET /api/stations?lat=...&lng=...&radius=5&fuel=e5&sort=price`
