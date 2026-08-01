# DnD Voices — atajos de desarrollo y operación.
#
# `make` sin argumentos lista todo lo disponible.
# Los objetivos con `##` salen en esa lista; el resto son auxiliares.

SHELL := /bin/bash
.DEFAULT_GOAL := help

COMPOSE      := docker compose
COMPOSE_DEV  := docker compose -f docker-compose.dev.yml
COMPOSE_RL   := docker compose -f docker-compose.ratelimit.yml
COMPOSE_E2E  := docker compose -f docker-compose.e2e.yml

# Al levantar sólo la infraestructura, la app corre en el host y llega a
# Postgres y Redis por localhost.
DEV_DB_URL    := postgresql://dndvoices:dndvoices@localhost:5432/dndvoices
DEV_REDIS_URL := redis://localhost:6379

# --- General ------------------------------------------------------------

.PHONY: help
help: ## Lista los comandos disponibles
	@echo "DnD Voices"
	@echo
	@awk 'BEGIN {FS = ":.*?## "} \
		/^# ---/ {sub(/^# --- /, ""); sub(/ -*$$/, ""); printf "\n\033[1m%s\033[0m\n", $$0} \
		/^[a-zA-Z0-9_.-]+:.*?## / {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo

# --- Puesta en marcha ---------------------------------------------------

.PHONY: setup
setup: .env node_modules generate ## Deja el proyecto listo para trabajar
	@echo "Listo. Rellena las claves de .env y ejecuta: make dev"

.env:
	@cp .env.example .env
	@secret=$$(openssl rand -base64 32) && \
		sed -i "s|BETTER_AUTH_SECRET=\"\"|BETTER_AUTH_SECRET=\"$$secret\"|" .env
	@echo "Creado .env con un BETTER_AUTH_SECRET nuevo."
	@echo "Faltan ANTHROPIC_API_KEY y ELEVENLABS_API_KEY."

node_modules: package-lock.json
	npm ci
	@touch node_modules

.PHONY: install
install: ## Instala dependencias desde el lockfile
	npm ci

.PHONY: secret
secret: ## Genera un valor para BETTER_AUTH_SECRET
	@openssl rand -base64 32

# --- Desarrollo ---------------------------------------------------------

.PHONY: dev
dev: db ## Arranca el servidor web con recarga en caliente
	DATABASE_URL=$(DEV_DB_URL) REDIS_URL=$(DEV_REDIS_URL) npm run dev

.PHONY: worker
worker: db ## Arranca el worker de casting y render (hace falta ffmpeg)
	DATABASE_URL=$(DEV_DB_URL) REDIS_URL=$(DEV_REDIS_URL) npm run worker

.PHONY: infra
infra: ## Levanta sólo Postgres y Redis, para desarrollar en el host
	@# El stack completo publica los mismos puertos. Si ya está arriba, sirve
	@# igual de bien y levantar el de desarrollo sólo daría un choque de puertos.
	@if (echo > /dev/tcp/localhost/5432) >/dev/null 2>&1 && \
	    (echo > /dev/tcp/localhost/6379) >/dev/null 2>&1; then \
		echo "Postgres y Redis ya responden en localhost; no levanto nada."; \
	else \
		$(COMPOSE_DEV) up -d --wait; \
	fi

.PHONY: db
db: infra migrate-deploy ## Infraestructura levantada y esquema al día

.PHONY: infra-down
infra-down: ## Para la infraestructura de desarrollo
	$(COMPOSE_DEV) down

.PHONY: build
build: ## Compila la app y el bundle del worker
	npm run build
	npm run build:worker

# --- Base de datos ------------------------------------------------------

.PHONY: migrate
migrate: ## Crea y aplica una migración (uso: make migrate name=mi_cambio)
ifndef name
	$(error Falta el nombre. Uso: make migrate name=mi_cambio)
endif
	@# `infra` va dentro de la receta y no como prerrequisito: así el aviso del
	@# nombre sale antes de arrancar contenedores.
	@$(MAKE) --no-print-directory infra
	DATABASE_URL=$(DEV_DB_URL) npx prisma migrate dev --name $(name)

.PHONY: migrate-deploy
migrate-deploy: infra ## Aplica las migraciones pendientes sin generar ninguna
	DATABASE_URL=$(DEV_DB_URL) npx prisma migrate deploy

.PHONY: generate
generate: ## Regenera el cliente de Prisma
	npx prisma generate

.PHONY: studio
studio: db ## Abre Prisma Studio sobre la base de desarrollo
	DATABASE_URL=$(DEV_DB_URL) npx prisma studio

.PHONY: pauses
pauses: ## Recalcula las pausas de las escenas ya analizadas (no gasta créditos)
	npm run pauses:refresh

.PHONY: db-reset
db-reset: infra ## Borra la base de desarrollo y reaplica las migraciones
	@read -p "Esto borra todos los datos de desarrollo. ¿Seguir? [s/N] " ok; \
		[ "$$ok" = "s" ] || { echo "Cancelado."; exit 1; }
	DATABASE_URL=$(DEV_DB_URL) npx prisma migrate reset --force

# --- Calidad ------------------------------------------------------------

.PHONY: check
check: typecheck lint test ## Tipos, lint y unitarios: lo que corre en CI

.PHONY: typecheck
typecheck: ## Comprueba los tipos sin emitir
	npm run typecheck

.PHONY: lint
lint: ## Pasa ESLint
	npm run lint

.PHONY: test
test: ## Tests unitarios
	npm run test

.PHONY: test-watch
test-watch: ## Tests unitarios en modo vigilancia
	npm run test:watch

.PHONY: coverage
coverage: ## Tests unitarios con informe de cobertura
	npm run test:coverage

.PHONY: e2e
e2e: db ## E2E contra un dev server que arranca Playwright
	npm run test:e2e

.PHONY: e2e-ui
e2e-ui: db ## E2E en el modo interactivo de Playwright
	npm run test:e2e:ui

.PHONY: e2e-docker
e2e-docker: ## E2E contra un stack aislado, sin tocar el tuyo
	npm run test:e2e:docker

.PHONY: e2e-down
e2e-down: ## Retira los stacks de prueba
	$(COMPOSE_E2E) down -v
	$(COMPOSE_RL) down -v

.PHONY: e2e-ratelimit
e2e-ratelimit: ## Comprueba que el rate limit de auth bloquea de verdad
	npm run test:e2e:ratelimit

.PHONY: verify
verify: check e2e-docker e2e-ratelimit ## Todo: tipos, lint, unitarios y los dos e2e

.PHONY: browsers
browsers: ## Descarga el navegador que usa Playwright
	npx playwright install chromium

# --- Docker -------------------------------------------------------------

.PHONY: up
up: ## Levanta el stack completo (web, worker, base de datos, cola)
	$(COMPOSE) up -d --build --wait
	@echo "La app está en http://localhost:3000"

.PHONY: down
down: ## Para el stack completo, conservando los datos
	$(COMPOSE) down

.PHONY: down-all
down-all: ## Para el stack y borra sus volúmenes (datos y audio incluidos)
	@read -p "Esto borra la base de datos y el audio generado. ¿Seguir? [s/N] " ok; \
		[ "$$ok" = "s" ] || { echo "Cancelado."; exit 1; }
	$(COMPOSE) down -v
	$(COMPOSE_DEV) down -v
	$(COMPOSE_RL) down -v
	$(COMPOSE_E2E) down -v

.PHONY: logs
logs: ## Sigue los logs de todos los servicios
	$(COMPOSE) logs -f

.PHONY: logs-worker
logs-worker: ## Sigue los logs del worker
	$(COMPOSE) logs -f worker

.PHONY: ps
ps: ## Estado de los contenedores
	$(COMPOSE) ps

.PHONY: shell
shell: ## Abre una shell dentro del contenedor web
	$(COMPOSE) exec web sh

.PHONY: psql
psql: ## Abre psql sobre la base de datos del stack
	$(COMPOSE) exec postgres psql -U dndvoices -d dndvoices

# --- Utilidades ---------------------------------------------------------

.PHONY: clean
clean: ## Borra artefactos de compilación y de tests
	rm -rf .next dist coverage test-results playwright-report .tmp-test-storage

.PHONY: clean-audio
clean-audio: ## Borra los clips y mezclas del storage local
	@read -p "Esto borra el audio generado en ./storage. ¿Seguir? [s/N] " ok; \
		[ "$$ok" = "s" ] || { echo "Cancelado."; exit 1; }
	rm -rf storage/clips storage/renders

.PHONY: ffmpeg-check
ffmpeg-check: ## Comprueba que ffmpeg está disponible para el worker
	@ffmpeg -version >/dev/null 2>&1 && echo "ffmpeg: ok" || \
		{ echo "Falta ffmpeg. Instálalo con: sudo apt install ffmpeg"; exit 1; }
