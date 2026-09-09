# Sorrel & Salt

A compendium, ingredient store and grimoire — the admin-curated ingredient
reference (**compendium**), each workspace's own stock (**ingredients**), and
the spells a workspace makes (**grimoire**).

Next.js 16 · React 19 · TypeScript · PostgreSQL 17 + Drizzle · GraphQL.
The specification is [`claude-docs/DESIGN.md`](claude-docs/DESIGN.md); the rules
every change follows are in [`CLAUDE.md`](CLAUDE.md).

> **Status: M0 complete.** The toolchain, styling foundation, component
> workshop, Docker stack and CI/CD pipeline are in place. The database, the
> GraphQL layer and the product features themselves begin at M1 — see the
> header of the [`makefile`](makefile) for the schedule.

## Local setup

1. Install [Node.js](https://nodejs.org/) **26.6.0** — the version
   [`Docker/Dockerfile.node`](Docker/Dockerfile.node) and the deploy workflow
   pin. Node 22 ships npm 10, which cannot read this repo's lockfile.
2. Clone the repo and `cd sorrel-and-salt`.
3. `npm install`
4. `npm run dev` — Next.js dev server on <http://localhost:8000>.
5. `make help` — lists every make target and marks the ones that are still
   placeholders.
6. Before every commit: `npm run pre-commit` (lint, `format:check`, typecheck,
   `check:stories`).

The Docker stack (`make docker-up`) and the component workshop
(`npm run workshop`, on 61000) both work today. Still to come: the database and
seed data (M1.3) and GraphQL codegen (M3.5) — `npm run db:*` and
`npm run codegen` exit non-zero until then. Once Vitest is wired (M1.7), verify
with the **`:coverage`** script variants — a plain `npm run test` pass can
still fail CI's 80% threshold.

`make` and `docker` are host-level; the devcontainer has neither, so run the
npm scripts directly inside it.

## Gitflow

`feature/*` → `staging`; `staging` → `main` via `release/MAJOR.MINOR.PATCH`.
`hotfix/*` opens both; `main-sync/*` brings `main` back down. Staging carries the
same branch protections as production. One task per PR. See
[`CLAUDE.md`](CLAUDE.md) for the full workflow.

Deploys are CI-only:
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) deploys through
the Vercel CLI on a push to `main` (production) or `staging` (preview), and on a
`hotfix/*` → `main` PR (preview URL commented on the PR). `vercel.json` disables
Vercel's own Git integration; nothing else deploys.

## Documentation

- [`CLAUDE.md`](CLAUDE.md) — architecture rules, domain invariants, conventions.
- [`claude-docs/DESIGN.md`](claude-docs/DESIGN.md) — the specification.
- [`claude-docs/`](claude-docs/) — subsystem summaries, append-only transcripts,
  a doc per component, and per-task design decisions.
  [`claude-docs/README.md`](claude-docs/README.md) explains the layout.
