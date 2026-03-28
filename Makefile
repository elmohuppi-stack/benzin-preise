SHELL := /bin/zsh

.PHONY: help setup env install start start-backend start-frontend build health clean

help:
	@echo "Verfuegbare Ziele:"
	@echo "  make setup          - Installiert Abhaengigkeiten und legt .env Dateien an"
	@echo "  make env            - Legt fehlende .env Dateien aus .env.example an"
	@echo "  make install        - Installiert npm Abhaengigkeiten"
	@echo "  make start          - Startet Frontend und Backend zusammen"
	@echo "  make start-backend  - Startet nur das Backend"
	@echo "  make start-frontend - Startet nur das Frontend"
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

start:
	npm run dev

start-backend:
	npm run dev:backend

start-frontend:
	npm run dev:frontend

build:
	npm run build

health:
	curl -s http://localhost:3000/health

clean:
	rm -rf frontend/dist backend/dist
	@echo "Build-Artefakte entfernt."
