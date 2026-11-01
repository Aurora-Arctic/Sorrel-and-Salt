# Every target wraps an npm script or a docker compose invocation, named as
# DESIGN.md and CLAUDE.md name them.
#
# `## ` lines are FUNCTIONAL: `help` awk-parses them. Only the LAST `## `
# line before a target survives, so each is one line immediately above it.

.DEFAULT_GOAL := help

.PHONY: help install dev dev-debug build start \
	lint lint-fix format format-check typecheck check-destructive-ddl check-migration-order pre-commit \
	test-stories test-debug test-ui e2e-ui e2e-trace \
	db-generate db-migrate db-seed db-drop db-reset db-reset-demo db-studio db-psql codegen \
	workshop workshop-build \
	docker-build docker-up docker-workshop docker-studio docker-jobs docker-all docker-e2e docker-down docker-rebuild docker-logs \
	docker-update-token playwright-server-up playwright-server-down playwright-audit-up playwright-audit-down lighthouse-up lighthouse-down docker-codegen \
	act-image act-cache-checkout act-check act-test

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

## Next.js dev server with the Node inspector on 9229
dev-debug:
	npm run dev:debug

## Next.js production build
build:
	npm run build

## Serve the production build (PORT, default 8000)
start:
	npm run start

## Oxlint, then Stylelint over the Sass
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

## Flag destructive DDL in migrations new on this branch
check-destructive-ddl:
	npm run check:destructive-ddl

## Refuse a migration older than one already on this branch's base
check-migration-order:
	npm run check:migration-order

## The pre-commit checks on changed files: lint, format:check, typecheck
pre-commit:
	npm run pre-commit

## The story suite (Playwright flows under tests/e2e/stories/), printed as a checklist of the v1 user stories
test-stories:
	npm run test:stories

## Vitest under --inspect-brk, single-worker, halted until a debugger attaches on 9230
test-debug:
	npm run test:debug

## Vitest UI on its default port, forwarded via devcontainer.json
test-ui:
	npm run test:ui

## Playwright UI mode on 9324
e2e-ui:
	npm run e2e:ui

## Serve a written Playwright trace on 9323 — pass TRACE=path/to/trace.zip
e2e-trace:
	npm run e2e:trace -- $(TRACE)

## Generate a Drizzle migration from the schema
db-generate:
	npm run db:generate

## Apply pending Drizzle migrations
db-migrate:
	npm run db:migrate

## Seed a scenario — SEED_SCENARIO=minimal|standard|demo, default minimal
db-seed:
	npm run db:seed

## Drop the public and drizzle schemas, leaving an empty database
db-drop:
	npm run db:drop

## Drop, migrate and reseed — the one command for a wedged local database
db-reset:
	npm run db:reset

## Drop, migrate and reseed with the demo scenario — covens, spells and the curated compendium
db-reset-demo:
	npm run db:reset:demo

## Drizzle Studio on 4983 — browse the local database
db-studio:
	npm run db:studio

## psql against the compose postgres service
db-psql:
	$(COMPOSE) exec postgres psql -U sorrel sorrel

## Regenerate the client GraphQL types in src/gql from the committed SDL
codegen:
	npm run codegen

## Storybook component workshop dev server on 61000
workshop:
	npm run workshop

## Build the static component workshop to .reports/workshop
workshop-build:
	npm run workshop:build

# Docker compose wrappers — claude-docs/docker.md. `docker-build`,
# `docker-down` and `docker-rebuild` pass every profile; a new profiled
# service missing from one of them is left orphaned by `docker-down`.
# `audit` has nothing to build, and is listed on `docker-build` all the same
# so the three stay one list.

## Build the local dev images (app + workshop + studio + jobs + e2e)
docker-build:
	$(COMPOSE) --profile workshop --profile studio --profile jobs --profile e2e --profile audit build

## Start the app (8000) and Postgres detached, migrating and seeding first
docker-up:
	$(COMPOSE) up -d

## Also start the Storybook workshop on 61000 (compose profile: workshop)
docker-workshop:
	$(COMPOSE) --profile workshop up -d

## Also start Drizzle Studio on 4983 (compose profile: studio)
docker-studio:
	$(COMPOSE) --profile studio up -d

## Also start the job-run viewer on 3456 (compose profile: jobs)
docker-jobs:
	$(COMPOSE) --profile jobs up -d

# `e2e` itself is a one-shot suite run, not a service to leave up.
## Start every long-running service: app, Postgres, workshop, studio, browser server
docker-all:
	$(COMPOSE) --profile workshop --profile studio --profile e2e up -d app postgres workshop studio playwright-server

## Run the Playwright e2e suite once, against the dedicated e2e image (compose profile: e2e)
docker-e2e:
	$(COMPOSE) --profile e2e run --rm e2e

## Stop and remove the local stack, workshop/studio/jobs/e2e/audit profiles included (named volumes kept)
docker-down:
	$(COMPOSE) --profile workshop --profile studio --profile jobs --profile e2e --profile audit down

## Tear down including volumes, then rebuild and start the app
docker-rebuild:
	$(COMPOSE) --profile workshop --profile studio --profile jobs --profile e2e --profile audit down -v && $(COMPOSE) up --build -d

## Follow the local stack logs
docker-logs:
	$(COMPOSE) logs -f

## Refresh the devcontainer's Claude Code OAuth token in Docker/.env
docker-update-token:
	./Docker/update-token.sh

# For `npm run e2e` from the browser-less devcontainer.
## Start the long-lived Playwright browser server (compose profile: e2e)
playwright-server-up:
	$(COMPOSE) --profile e2e up -d playwright-server

## Stop the Playwright browser server
playwright-server-down:
	$(COMPOSE) --profile e2e stop playwright-server

# For `npm run e2e:audit` from the devcontainer: Microsoft's image, pulled once.
## Start the WebKit/Firefox/phone audit's browser server (compose profile: audit)
playwright-audit-up:
	$(COMPOSE) --profile audit up -d playwright-audit

## Stop the audit's browser server
playwright-audit-down:
	$(COMPOSE) --profile audit stop playwright-audit

# For `npm run lighthouse:seo` from the devcontainer: the same image as the audit's.
## Start the Chromium with a DevTools port for Lighthouse (compose profile: audit)
lighthouse-up:
	$(COMPOSE) --profile audit up -d lighthouse-chrome

## Stop the Lighthouse Chromium
lighthouse-down:
	$(COMPOSE) --profile audit stop lighthouse-chrome

# `sorrel-app`, not `app`: browsers HSTS-preload the `app` gTLD.
## Record a Playwright spec on the browser server's display (:7900) — pass NAME=<spec>
docker-codegen: playwright-server-up
	$(COMPOSE) exec -u $$(id -u):$$(id -g) playwright-server \
		npx playwright codegen --target playwright-test \
		--output tests/e2e/$(NAME).spec.ts http://sorrel-app:8000

# Local CI via act — claude-docs/ci/running-ci-locally.md, "Running CI locally". `act-image`
# builds the `testing` target under the tag the job asks for, so GHCR is
# never reached and the `credentials:` block is a no-op (hence the dummy
# token); checkout-to-app resolves by remote ref, so act needs a clone at its
# cache path; `-j` names the one job to run.
ACT_IMAGE := sorrel-and-salt-testing:local
ACT_CHECKOUT_CACHE := $(HOME)/.cache/act/Aurora-Arctic-Sorrel-and-Salt-.github-actions-checkout-to-app@main
CHECK ?= lint

## Build the Dockerfile.node testing image act runs the checks in
act-image:
	docker build -f Docker/Dockerfile.node --target testing -t $(ACT_IMAGE) .

## Clone this repo's main to act's cache so checkout-to-app resolves offline
act-cache-checkout:
	@[ -d "$(ACT_CHECKOUT_CACHE)" ] || \
		git clone --branch main https://github.com/Aurora-Arctic/Sorrel-and-Salt "$(ACT_CHECKOUT_CACHE)"

# The destructive-ddl leg scans nothing locally: its file list comes from
# pr-gate.yml's paths-filter job. This proves the wiring, not the scan.
## Run one checks.yml leg locally via act — CHECK=lint|format|typecheck|build|audit|destructive-ddl
act-check: act-image act-cache-checkout
	act -W .github/workflows/checks.yml -j $(CHECK) --input image=$(ACT_IMAGE) -s GITHUB_TOKEN=dummy-token --action-offline-mode

## Run every locally runnable act check in sequence
act-test:
	$(MAKE) act-check CHECK=lint
	$(MAKE) act-check CHECK=format
	$(MAKE) act-check CHECK=typecheck
	$(MAKE) act-check CHECK=destructive-ddl
