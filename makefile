# Sorrel & Salt — make wrapper.
#
# Ported from resume-2026. Every target is a thin wrapper over an npm script or
# a docker compose invocation, so the same muscle memory works in both repos.
# The one deliberate change from the source: targets are unprefixed (`build`,
# not `npm-build`), because that is how every target is named in DESIGN.md and
# CLAUDE.md — `make db-reset`, `make docker-up`, `make test-stories`.
#
# Targets arrive with the milestone that needs them:
#
#   test, test-watch, test-coverage   M0.9
#   docker-*                          M0.11–M0.13
#   test-stories                      M1.28
#   act-*                             M0.23
#   workshop, workshop-build          M0.30
#   check-stories                     M0.33
#
# The db-* and codegen targets below are placeholders: the script names exist
# so nothing has to be renamed later, but they exit non-zero until M1.x wires
# them to Drizzle and M3.x to graphql-codegen. The workshop targets are live as
# of M0.30 — they run Ladle.

.DEFAULT_GOAL := help

.PHONY: help install dev build start \
	lint lint-fix format format-check typecheck check-stories pre-commit \
	db-generate db-migrate db-seed db-reset codegen \
	workshop workshop-build \
	docker-build docker-up docker-workshop docker-down docker-rebuild docker-logs \
	docker-update-token

COMPOSE := docker compose -f Docker/docker-compose.yaml

## Print this list of targets
help:
	@awk 'BEGIN { FS = ":" } \
		/^## / { doc = substr($$0, 4); next } \
		/^[a-zA-Z0-9_-]+:/ { if (doc != "") printf "  %-14s %s\n", $$1, doc } \
		{ doc = "" }' $(MAKEFILE_LIST)

## Install dependencies
install:
	npm install

## Next.js dev server on port 8000
dev:
	npm run dev

## Next.js production build
build:
	npm run build

## Serve the production build (PORT, default 8000)
start:
	npm run start

## Oxlint
lint:
	npm run lint

## Oxlint with --fix
lint-fix:
	npm run lint:fix

## Prettier, writing changes
format:
	npm run format

## Prettier, checking only
format-check:
	npm run format:check

## tsc --noEmit
typecheck:
	npm run typecheck

## Fail if a src/components/ directory has index.tsx without index.stories.tsx
check-stories:
	npm run check:stories

## The pre-commit checks: lint, format:check, typecheck, check:stories
pre-commit:
	npm run pre-commit

## Generate a Drizzle migration from the schema (placeholder until M1.x)
db-generate:
	npm run db:generate

## Apply pending Drizzle migrations (placeholder until M1.x)
db-migrate:
	npm run db:migrate

## Seed the database (placeholder until M1.x)
db-seed:
	npm run db:seed

## Drop, migrate and reseed the database (placeholder until M1.x)
db-reset:
	npm run db:reset

## Run graphql-codegen (placeholder until M3.x)
codegen:
	npm run codegen

## Ladle component workshop dev server on 61000
workshop:
	npm run workshop

## Build the static component workshop to ./build
workshop-build:
	npm run workshop:build

# Host-level docker compose wrappers. `docker-up` starts the app on 8000 and
# Postgres 17 (M0.13), waiting for the database health check before the app
# starts; the Ladle workshop (61000) is behind the `workshop` compose profile,
# so it only comes up with `docker-workshop`. No Neon connection and no local
# Node version juggling. Unlike resume-2026, `docker-up` does not run
# `update-token` — the devcontainer (M0.14) is its own compose overlay under
# `.devcontainer/`, started by the editor, not by `make docker-up`. Refresh
# its Claude token explicitly with `make docker-update-token`.

## Build the local dev images (app + workshop)
docker-build:
	$(COMPOSE) --profile workshop build

## Start the app (8000) and Postgres detached
docker-up:
	$(COMPOSE) up -d

## Also start the Ladle workshop on 61000 (compose profile: workshop)
docker-workshop:
	$(COMPOSE) --profile workshop up -d

## Stop and remove the local stack, workshop profile included (named volumes kept)
docker-down:
	$(COMPOSE) --profile workshop down

## Tear down including volumes, then rebuild and start the app
docker-rebuild:
	$(COMPOSE) --profile workshop down -v && $(COMPOSE) up --build -d

## Follow the local stack logs
docker-logs:
	$(COMPOSE) logs -f

## Refresh the devcontainer's Claude Code OAuth token in Docker/.env
docker-update-token:
	./Docker/update-token.sh
