# Archived from the root README.md — end of M0 (M0.34)

Text the M0.34 compression pass removed from the repo's root
[`README.md`](../../../README.md). Same reasoning as
[`CLAUDE.md`](./CLAUDE.md) in this directory: written early in M0, false by the
end of it.

---

## 1. The "early scaffold" status block

```
> **Status: early scaffold.** Most of the commands below arrive with the
> milestone that builds them — see the header of the [`makefile`](makefile) for
> the schedule. What works today: `install`, `dev`, `build`, and the
> lint / format / typecheck trio.
```

Understated the repo by the end of M0: the Docker stack, the component
workshop, `act`, and the whole CI/CD pipeline all work too.

## 2. The Node version

```
1. Install [Node.js](https://nodejs.org/) 22 or newer (with npm).
```

Actively harmful by M0.28. `Docker/Dockerfile.node` pins `NODE_VERSION=26.6.0`
and `deploy.yml` pins `node-version: 26.6.0`, because M0.28 found that Node
22's npm 10 cannot read this repo's npm-11 lockfile (`typescript@7`'s
per-platform deps) — `npm ci` fails outright. A reader following "22 or newer"
walked into precisely the failure M0.28 diagnosed and fixed. See
`m0.28-pipeline-proof-and-node-26.md`.

## 3. The pre-commit check list

```
6. Before every commit: `npm run pre-commit` (lint, `format:check`, typecheck).
```

M0.33 added `check:stories` to both the `pre-commit` npm script and the
`pre-commit` array in `package.json`. Four checks, not three.

## 4. The "not wired up yet" paragraph

```
The database, Docker stack, seed data, GraphQL codegen and the component
workshop are not wired up yet: `npm run db:*`, `npm run codegen` and
`npm run workshop` exit non-zero until their milestones land (M1.x, M3.x,
M0.30). Once Vitest is wired (M1.7), verify with the **`:coverage`** script
variants — a plain `npm run test` pass can still fail CI's 80% threshold.
```

Two flatly false claims by M0.34. The **Docker stack** landed across
M0.11–M0.14 (`make docker-up` runs the app and Postgres 17). The **component
workshop** landed in M0.30 — `npm run workshop` starts Ladle on 61000 and does
not exit non-zero. The database (M1.3) and codegen (M3.5) parts were correct
and are kept, with their milestone numbers sharpened from `M1.x`/`M3.x`. The
Vitest sentence was correct as forward guidance and is kept verbatim.
