# Sorrel & Salt — make wrapper. Every target is a thin wrapper over an npm
# script or a docker compose invocation, and every one is named unprefixed
# (`build`, not `npm-build`) because that is how DESIGN.md and CLAUDE.md name
# them. Only `codegen` is a placeholder — it exits non-zero until
# graphql-codegen is wired up.
#
# `## ` lines are FUNCTIONAL: the `help` target below awk-parses them into the
# list a human reads. Only the LAST `## ` line before a target survives, so
# each one is a single line, sitting immediately above its target.

.DEFAULT_GOAL := help

.PHONY: help install dev dev-debug build start \
	lint lint-fix format format-check typecheck check-destructive-ddl pre-commit \
	test-stories test-debug test-ui e2e-ui e2e-trace \
	db-generate db-migrate db-seed db-drop db-reset db-studio db-psql codegen \
	workshop workshop-build \
	docker-build docker-up docker-workshop docker-studio docker-all docker-e2e docker-down docker-rebuild docker-logs \
	docker-update-token playwright-server-up playwright-server-down docker-codegen \
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

## Flag destructive DDL (DROP/RENAME/type change/NOT NULL additions) in migrations new on this branch
check-destructive-ddl:
	npm run check:destructive-ddl

## The pre-commit checks: lint, format:check, typecheck
pre-commit:
	npm run pre-commit

## The acceptance suite only, printed as a checklist of the v1 user stories
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

## Drizzle Studio on 4983 — browse the local database
db-studio:
	npm run db:studio

## psql against the compose postgres service
db-psql:
	$(COMPOSE) exec postgres psql -U sorrel sorrel

## Run graphql-codegen (not wired up yet — exits non-zero)
codegen:
	npm run codegen

## Ladle component workshop dev server on 61000
workshop:
	npm run workshop

## Build the static component workshop to ./build
workshop-build:
	npm run workshop:build

# Host-level docker compose wrappers — claude-docs/docker.md is the
# walkthrough. `docker-build`, `docker-down` and `docker-rebuild` all pass
# every profile, so a new profiled service that forgets one of the three is
# left orphaned by `docker-down`. The devcontainer is its own compose overlay
# under `.devcontainer/`, started by the editor rather than by `docker-up`;
# refresh its Claude token explicitly with `make docker-update-token`.

## Build the local dev images (app + workshop + studio + e2e)
docker-build:
	$(COMPOSE) --profile workshop --profile studio --profile e2e build

## Start the app (8000) and Postgres detached, migrating and seeding first
docker-up:
	$(COMPOSE) up -d

## Also start the Ladle workshop on 61000 (compose profile: workshop)
docker-workshop:
	$(COMPOSE) --profile workshop up -d

## Also start Drizzle Studio on 4983 (compose profile: studio)
docker-studio:
	$(COMPOSE) --profile studio up -d

# `e2e` is named out on purpose — it is a one-shot suite run, not a service
# to leave up — even though enabling its profile is what makes
# `playwright-server` startable here.
## Start every long-running service: app, Postgres, workshop, studio, browser server
docker-all:
	$(COMPOSE) --profile workshop --profile studio --profile e2e up -d app postgres workshop studio playwright-server

## Run the Playwright e2e suite once, against the dedicated e2e image (compose profile: e2e)
docker-e2e:
	$(COMPOSE) --profile e2e run --rm e2e

## Stop and remove the local stack, workshop/e2e profiles included (named volumes kept)
docker-down:
	$(COMPOSE) --profile workshop --profile studio --profile e2e down

## Tear down including volumes, then rebuild and start the app
docker-rebuild:
	$(COMPOSE) --profile workshop --profile studio --profile e2e down -v && $(COMPOSE) up --build -d

## Follow the local stack logs
docker-logs:
	$(COMPOSE) logs -f

## Refresh the devcontainer's Claude Code OAuth token in Docker/.env
docker-update-token:
	./Docker/update-token.sh

# So `npm run e2e` can run from inside the Alpine, browser-less devcontainer
# against a Chromium in the Debian e2e image.
## Start the long-lived Playwright browser server (compose profile: e2e)
playwright-server-up:
	$(COMPOSE) --profile e2e up -d playwright-server

## Stop the Playwright browser server
playwright-server-down:
	$(COMPOSE) --profile e2e stop playwright-server

# `sorrel-app`, not `app`: `.app` is an HSTS-preloaded gTLD in every real
# browser, so a genuine Chrome navigating to plain http://app:8000 is upgraded
# to https and fails. `sorrel-app` is a second, non-reserved DNS alias on the
# same container — see Docker/docker-compose.yaml's `app` service.
## Record a Playwright spec on the browser server's display (:7900) — pass NAME=<spec>
docker-codegen: playwright-server-up
	$(COMPOSE) exec -u $$(id -u):$$(id -g) playwright-server \
		npx playwright codegen --target playwright-test \
		--output e2e/$(NAME).spec.ts http://sorrel-app:8000

# Local CI via act — see claude-docs/ci.md's "Running CI locally" section for
# what each target buys and which legs cannot work locally.
#
# Three facts the recipes below depend on. Each check workflow is
# workflow_call-only with a required `image` input, so `act-image` builds the
# same Dockerfile.node `testing` target locally under the tag the job asks
# for — `docker run` then never reaches GHCR and the container
# `credentials:` block is a no-op, hence the dummy GITHUB_TOKEN. Every job's
# first step resolves checkout-to-app by a remote owner/repo/path@main ref
# rather than `./`, so act needs a real clone of this repo's main at its cache
# path, which `--action-offline-mode` then stops it re-fetching. And
# `--matrix name:<leg>` is what keeps act from running all six legs at once.
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

# The destructive-ddl leg scans *nothing* locally: its `destructive-ddl-files`
# input comes from pr-gate.yml's paths-filter job, which act's `-j` invocation
# has no equivalent of, and checks.yml reads set-but-empty as "no migrations
# changed". So this proves the wiring, not the scan — the scan is
# tests/guards/destructive-ddl-check.test.ts and
# `npm run check:destructive-ddl -- --self-test`.
## Run one checks.yml leg locally via act — CHECK=lint|format|typecheck|build|audit|destructive-ddl
act-check: act-image act-cache-checkout
	act -W .github/workflows/checks.yml -j check --matrix name:$(CHECK) --input image=$(ACT_IMAGE) -s GITHUB_TOKEN=dummy-token --action-offline-mode

## Run every locally runnable act check in sequence
act-test:
	$(MAKE) act-check CHECK=lint
	$(MAKE) act-check CHECK=format
	$(MAKE) act-check CHECK=typecheck
	$(MAKE) act-check CHECK=destructive-ddl
