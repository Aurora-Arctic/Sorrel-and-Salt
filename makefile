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
#
# The db-*, codegen and workshop targets below are placeholders: the script
# names exist so nothing has to be renamed later, but they exit non-zero until
# M1.x wires them to Drizzle, M3.x to graphql-codegen and M0.30 to Ladle.

.DEFAULT_GOAL := help

.PHONY: help install dev build start \
	lint lint-fix format format-check typecheck pre-commit \
	db-generate db-migrate db-seed db-reset codegen \
	workshop workshop-build

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

## The pre-commit trio: lint, format:check, typecheck
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

## Ladle component workshop dev server on 61000 (placeholder until M0.30)
workshop:
	npm run workshop

## Build the static component workshop (placeholder until M0.30)
workshop-build:
	npm run workshop:build
