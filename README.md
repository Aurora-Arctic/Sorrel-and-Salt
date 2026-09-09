# Sorrel & Salt

A compendium, ingredient store and grimoire — the admin-curated ingredient
reference (**compendium**), each workspace's own stock (**ingredients**), and
the spells a workspace makes (**grimoire**).

Next.js 16 · React 19 · TypeScript · PostgreSQL 17 + Drizzle · GraphQL.
The specification is [`claude-docs/DESIGN.md`](claude-docs/DESIGN.md); the rules
every change follows are in [`CLAUDE.md`](CLAUDE.md).

> **Status: early scaffold.** Most of the commands below arrive with the
> milestone that builds them — see the header of the [`makefile`](makefile) for
> the schedule. What works today: `install`, `dev`, `build`, and the
> lint / format / typecheck trio.

## Local setup

1. Install [Node.js](https://nodejs.org/) 22 or newer (with npm).
2. Clone the repo and `cd sorrel-and-salt`.
3. `npm install`
4. `npm run dev` — Next.js dev server on <http://localhost:8000>.
5. `make help` — lists every make target and marks the ones that are still
   placeholders.
6. Before every commit: `npm run pre-commit` (lint, `format:check`, typecheck).

The database, Docker stack, seed data, GraphQL codegen and the component
workshop are not wired up yet: `npm run db:*`, `npm run codegen` and
`npm run workshop` exit non-zero until their milestones land (M1.x, M3.x,
M0.30). Once Vitest is wired (M1.7), verify with the **`:coverage`** script
variants — a plain `npm run test` pass can still fail CI's 80% threshold.

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
