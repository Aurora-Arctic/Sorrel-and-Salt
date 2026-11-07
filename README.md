# Sorrel & Salt

Sorrel & Salt is an invite-only web app for covens (groups of practitioners) to keep what they have and what they make. It has three parts: the keeper-curated ingredient reference (the **compendium**, public to read), each workspace's own ingredients and stock (**ingredients**), and the spells a workspace makes (**grimoire**).

It is built with Next.js, React, TypeScript, PostgreSQL and Drizzle, and GraphQL. The specification is [`claude-docs/DESIGN.md`](claude-docs/DESIGN.md). The rules every change follows are in [`CLAUDE.md`](CLAUDE.md).

## Local setup

1. Clone the repo and run `cd Sorrel-and-Salt`.
2. `npm ci`
3. `npm run setup`
4. Start the stack with `make docker-up`, or open the folder in VS Code and choose "Reopen in Container".
5. `npm run dev` starts the dev server on <http://localhost:8000>.

[`claude-docs/day-1.md`](claude-docs/day-1.md) walks through the first day, and [`claude-docs/commands.md`](claude-docs/commands.md) lists every command.

`make` and `docker` run on the host. The devcontainer has neither, so run the npm scripts directly inside it.

Before every commit, run `npm run pre-commit` (lint, format check and types on the files you changed). The git hook runs the same checks on the files you staged. To verify a change, run the `:coverage` script variants: a plain `npm run test` pass can still fail CI's 80% threshold.

## Gitflow

`feature/*` goes to `staging`, and `staging` goes to `main` through `release/MAJOR.MINOR.PATCH`. `hotfix/*` opens both, and `main-sync/*` brings `main` back down. Staging carries the same branch protections as production. One task per PR. [`CLAUDE.md`](CLAUDE.md) has the full workflow.

Deploys are CI-only. [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) deploys through the Vercel CLI on a push to `main` (production) or `staging` (preview), and on a `hotfix/*` to `main` PR (preview URL commented on the PR). `vercel.json` disables Vercel's own Git integration, and nothing else deploys.

## Documentation

- [`CLAUDE.md`](CLAUDE.md): architecture rules, domain invariants and conventions.
- [`claude-docs/DESIGN.md`](claude-docs/DESIGN.md): the specification.
- [`claude-docs/`](claude-docs/): subsystem summaries, a doc per component, and per-task design decisions. [`claude-docs/README.md`](claude-docs/README.md) explains the layout.
