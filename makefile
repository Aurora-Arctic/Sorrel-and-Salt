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
	lint lint-fix format format-check typecheck check-stories check-destructive-ddl pre-commit \
	db-generate db-migrate db-seed db-reset codegen \
	workshop workshop-build \
	docker-build docker-up docker-workshop docker-down docker-rebuild docker-logs \
	docker-update-token \
	act-image act-cache-checkout act-lint act-format act-typecheck act-destructive-ddl act-test

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

## Flag destructive DDL (DROP/RENAME/type narrowing/NOT NULL additions) in migrations (M1.5)
check-destructive-ddl:
	npm run check:destructive-ddl

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

# Local CI via act (M0.23). Runs the real reusable per-check workflows
# (.github/workflows/{lint,format,typecheck}.yml) against a locally-built
# testing image, so a failing check surfaces here instead of only in pr-gate.
# Ported from resume-2026; act-vitest / act-playwright arrive with their
# workflows. act-build needs actions/cache@v6 pre-cached the way
# act-cache-checkout pre-caches checkout-to-app — deferred with them. audit
# and the published build-image are deliberately left out.
#
# Each per-check workflow is workflow_call-only with a required `image` input
# (normally build-image.yml's GHCR push). `act-image` builds the same
# Dockerfile.node `testing` target locally under the tag the job asks for, so
# `docker run` never reaches GHCR and the container `credentials:` block is a
# no-op — hence the dummy GITHUB_TOKEN. Every job's first step resolves
# checkout-to-app by a remote owner/repo/path@main ref (not ./), so act needs a
# real clone of this repo's main at its cache path; --action-offline-mode then
# keeps act from re-fetching it. The clone only runs the first time per machine
# (or whenever ~/.cache/act is cleared).
#
# `--input should-run=true` on lint/typecheck: both gate every real step
# behind `if: inputs.should-run`, whose `default: true` GitHub applies for a
# workflow_call but act (invoked with -W on the file directly) does not —
# without it the job "passes" having run nothing. format.yml has no such input.
ACT_IMAGE := sorrel-and-salt-testing:local
ACT_CHECKOUT_CACHE := $(HOME)/.cache/act/Aurora-Arctic-Sorrel-and-Salt-.github-actions-checkout-to-app@main

## Build the Dockerfile.node testing image act runs the checks in
act-image:
	docker build -f Docker/Dockerfile.node --target testing -t $(ACT_IMAGE) .

## Clone this repo's main to act's cache so checkout-to-app resolves offline
act-cache-checkout:
	@[ -d "$(ACT_CHECKOUT_CACHE)" ] || \
		git clone --branch main https://github.com/Aurora-Arctic/Sorrel-and-Salt "$(ACT_CHECKOUT_CACHE)"

## Run the lint workflow locally via act
act-lint: act-image act-cache-checkout
	act -W .github/workflows/lint.yml -j lint --input image=$(ACT_IMAGE) --input should-run=true -s GITHUB_TOKEN=dummy-token --action-offline-mode

## Run the format-check workflow locally via act
act-format: act-image act-cache-checkout
	act -W .github/workflows/format.yml -j format --input image=$(ACT_IMAGE) -s GITHUB_TOKEN=dummy-token --action-offline-mode

## Run the typecheck workflow locally via act
act-typecheck: act-image act-cache-checkout
	act -W .github/workflows/typecheck.yml -j typecheck --input image=$(ACT_IMAGE) --input should-run=true -s GITHUB_TOKEN=dummy-token --action-offline-mode

# destructive-ddl.yml's `changed-files`/`pr-body` inputs come from pr-gate.yml
# reading dorny/paths-filter's list-files output and github.event.pull_request.body
# — neither exists under act's local `-j` invocation (no real PR, no paths-filter
# job to feed it), so both are left unset here. That means this local run always
# exercises the "no explicit file list" fallback (scans every committed migration
# under src/db/migrations/*.sql — see the script's own header) rather than the
# real PR's changed-file set, and never has a real ack line to find. Good enough
# to catch "does the workflow/script wiring itself work"; not a substitute for
# the self-test (`npm run check:destructive-ddl -- --self-test`), which is what
# actually exercises the ack-line gating logic.
## Run the destructive-ddl workflow locally via act
act-destructive-ddl: act-image act-cache-checkout
	act -W .github/workflows/destructive-ddl.yml -j destructive-ddl --input image=$(ACT_IMAGE) --input should-run=true -s GITHUB_TOKEN=dummy-token --action-offline-mode

## Run every act-* check target in sequence
act-test: act-lint act-format act-typecheck act-destructive-ddl
