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
#   db-studio, docker-studio          MB.21
#   dev-debug, test-debug, test-ui,
#     e2e-ui, e2e-trace, db-psql,
#     playwright-server-up/-down      MB.22
#   docker-codegen                    MB.23
#
# The db-seed/db-reset and codegen targets below are placeholders: the script
# names exist so nothing has to be renamed later, but they exit non-zero until
# M1.21–M1.23 fill in the seed scenarios and M3.x wires graphql-codegen. The
# workshop targets are live as of M0.30 — they run Ladle — db-generate and
# db-migrate as of M1.3, and db-studio as of MB.21.

.DEFAULT_GOAL := help

.PHONY: help install dev dev-debug build start \
	lint lint-fix format format-check typecheck check-destructive-ddl pre-commit \
	test-debug test-ui e2e-ui e2e-trace \
	db-generate db-migrate db-seed db-reset db-studio db-psql codegen \
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

## Next.js dev server with the Node inspector on 9229 (MB.22)
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

## Flag destructive DDL (DROP/RENAME/type change/NOT NULL additions) in migrations new on this branch (M1.5)
check-destructive-ddl:
	npm run check:destructive-ddl

## The pre-commit checks: lint, format:check, typecheck
pre-commit:
	npm run pre-commit

## Vitest under --inspect-brk, single-worker, halted until a debugger attaches on 9230 (MB.22)
test-debug:
	npm run test:debug

## Vitest UI on its default port, forwarded via devcontainer.json (MB.22)
test-ui:
	npm run test:ui

## Playwright UI mode on 9324 (MB.22)
e2e-ui:
	npm run e2e:ui

## Serve a written Playwright trace on 9323 — pass TRACE=path/to/trace.zip (MB.22)
e2e-trace:
	npm run e2e:trace -- $(TRACE)

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

## Drizzle Studio on 4983 — browse the local database (MB.21)
db-studio:
	npm run db:studio

## psql against the compose postgres service (MB.22)
db-psql:
	$(COMPOSE) exec postgres psql -U sorrel sorrel

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
# starts; the Ladle workshop (61000), Drizzle Studio (4983, MB.21) and the
# Playwright browser server (4444/7900, MB.22/MB.23) are behind the
# `workshop`/`studio`/`e2e` compose profiles, so they only come up with
# `docker-workshop`/`docker-studio`/`docker-all` (`playwright-server`) or
# `make playwright-server-up` directly. The one-shot Playwright suite run
# (`docker-e2e`) is never part of `docker-all` — it's a job, not a service to
# leave running. No Neon connection and no local Node version juggling.
# Unlike resume-2026, `docker-up` does not run `update-token` — the
# devcontainer (M0.14) is its own compose overlay under `.devcontainer/`,
# started by the editor, not by `make docker-up`. Refresh its Claude token
# explicitly with `make docker-update-token`.

## Build the local dev images (app + workshop + studio + e2e)
docker-build:
	$(COMPOSE) --profile workshop --profile studio --profile e2e build

## Start the app (8000) and Postgres detached
docker-up:
	$(COMPOSE) up -d

## Also start the Ladle workshop on 61000 (compose profile: workshop)
docker-workshop:
	$(COMPOSE) --profile workshop up -d

## Also start Drizzle Studio on 4983 (compose profile: studio)
docker-studio:
	$(COMPOSE) --profile studio up -d

## Start every long-running service: app, Postgres, workshop, studio and the
## Playwright browser server (MB.23 gave it a display at :7900). `e2e` itself
## is excluded on purpose — it's a one-shot suite run (`docker compose run
## --rm`), not a service to leave up, so it's named out even though enabling
## its profile is what makes `playwright-server` startable here.
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

## Start the long-lived Playwright browser server (compose profile: e2e) — MB.22, so `npm run e2e`
## can run from inside the (Alpine, browser-less) devcontainer against a Chromium in the Debian e2e image
playwright-server-up:
	$(COMPOSE) --profile e2e up -d playwright-server

## Stop the Playwright browser server
playwright-server-down:
	$(COMPOSE) --profile e2e stop playwright-server

## Record a Playwright spec on the browser server's display — see :7900 (MB.23)
## Pass NAME=<spec-name>; writes e2e/<name>.spec.ts
## `sorrel-app`, not `app`: `.app` is an HSTS-preloaded gTLD in every real
## browser, so a genuine Chrome navigating to plain http://app:8000 gets
## silently upgraded to https and fails — see docker-compose.yaml's `app`
## service for the full explanation. `sorrel-app` is the same container
## under a second, non-reserved DNS alias.
docker-codegen: playwright-server-up
	$(COMPOSE) exec -u $$(id -u):$$(id -g) playwright-server \
		npx playwright codegen --target playwright-test \
		--output e2e/$(NAME).spec.ts http://sorrel-app:8000

# Local CI via act (M0.23). Runs the real reusable check workflows against a
# locally-built testing image, so a failing check surfaces here instead of only
# in pr-gate. Ported from resume-2026; act-vitest / act-playwright arrive with
# their workflows. The published build-image is deliberately left out.
#
# One `act-check` target covers every leg of checks.yml (MB.32), where there
# was one target per check workflow before the collapse: `make act-check`
# runs lint, `make act-check CHECK=typecheck` runs typecheck, and so on
# through `format`, `build`, `audit` and `destructive-ddl`. `--matrix name:<leg>`
# is what keeps act from running all six.
#
# `CHECK=build` still needs actions/cache@v6 pre-cached the way
# act-cache-checkout pre-caches checkout-to-app, and `CHECK=audit` wants a real
# PR to comment on — both are expected to fail locally, and neither is in
# act-test below.
#
# Each check workflow is workflow_call-only with a required `image` input
# (normally build-image.yml's GHCR push). `act-image` builds the same
# Dockerfile.node `testing` target locally under the tag the job asks for, so
# `docker run` never reaches GHCR and the container `credentials:` block is a
# no-op — hence the dummy GITHUB_TOKEN. Every job's first step resolves
# checkout-to-app by a remote owner/repo/path@main ref (not ./), so act needs a
# real clone of this repo's main at its cache path; --action-offline-mode then
# keeps act from re-fetching it. The clone only runs the first time per machine
# (or whenever ~/.cache/act is cleared).
#
# act does not apply `workflow_call` input defaults, so a `should-run`-style
# flag arrives empty under `-W`. checks.yml needs no flag passed for that: its
# "Resolve this leg's should-run flag" step treats an empty flag as true,
# precisely so a local run cannot quietly skip the work it was asked to do.
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

# The destructive-ddl leg's `destructive-ddl-files`/`pr-body` inputs come from
# pr-gate.yml reading dorny/paths-filter's list-files output and
# github.event.pull_request.body — neither exists under act's local `-j`
# invocation (no real PR, no paths-filter job to feed it), so both arrive
# empty. checks.yml sets DESTRUCTIVE_DDL_FILES from the input either way, and
# the script reads "set but empty" as "no migrations changed", so this leg
# locally scans *nothing* and never has an ack line to find. Good enough to
# catch "does the workflow/script wiring itself work"; the scan and the
# ack-line gating are covered by src/test/destructive-ddl-check.test.ts and by
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
