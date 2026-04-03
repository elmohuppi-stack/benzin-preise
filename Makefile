SHELL := /bin/zsh

.PHONY: help setup env install env-docker start stop start-backend start-frontend docker-start docker-stop docker-logs build health clean

help:
	@echo "Verfuegbare Ziele:"
	@echo "  make setup          - Installiert Abhaengigkeiten und legt lokale .env Dateien an"
	@echo "  make env            - Legt fehlende lokale .env Dateien aus .env.example an"
	@echo "  make env-docker     - Legt fehlende Docker-/Production-.env Dateien an"
	@echo "  make install        - Installiert npm Abhaengigkeiten"
	@echo "  make start          - Startet Frontend und Backend lokal ohne Docker"
	@echo "  make stop           - Hinweis zum Stoppen des lokalen Dev-Starts"
	@echo "  make start-backend  - Startet nur das Backend lokal"
	@echo "  make start-frontend - Startet nur das Frontend lokal"
	@echo "  make docker-start   - Startet die App per docker compose"
	@echo "  make docker-stop    - Stoppt die Docker-Container"
	@echo "  make docker-logs    - Zeigt die Docker-Logs an"
	@echo "  make build          - Build fuer Frontend und Backend"
	@echo "  make health         - Prueft Backend Health Endpoint"
	@echo "  make clean          - Entfernt Build-Artefakte"

setup: install env
	@echo "Lokales Setup abgeschlossen."

install:
	npm install

env:
	@if [ ! -f backend/.env ]; then cp backend/.env.example backend/.env; echo "backend/.env erstellt"; else echo "backend/.env existiert bereits"; fi
	@if [ ! -f frontend/.env ]; then cp frontend/.env.example frontend/.env; echo "frontend/.env erstellt"; else echo "frontend/.env existiert bereits"; fi

env-docker:
	@if [ ! -f .env ]; then cp .env.example .env; echo ".env erstellt"; else echo ".env existiert bereits"; fi
	@if [ ! -f backend/.env.production ]; then cp backend/.env.example backend/.env.production; echo "backend/.env.production erstellt"; else echo "backend/.env.production existiert bereits"; fi
	@if [ ! -f frontend/.env.production ]; then cp frontend/.env.example frontend/.env.production; echo "frontend/.env.production erstellt"; else echo "frontend/.env.production existiert bereits"; fi

start:
	npm run dev

stop:
	@echo "Lokalen Dev-Start mit Ctrl+C im Terminal beenden."

start-backend:
	npm run dev:backend

start-frontend:
	npm run dev:frontend

docker-start: env-docker
	docker compose up --build

docker-stop:
	docker compose down

docker-logs:
	docker compose logs -f

build:
	npm run build

health:
	curl -s http://localhost:3000/health

clean:
	rm -rf frontend/dist backend/dist
	@echo "Build-Artefakte entfernt."
