# Database — transcript

## 2026-09-10 — M1.2: Drizzle connection module

Added `drizzle-orm`, `drizzle-kit`, and the `postgres` driver (postgres.js —
pure JS, no native binary, matching the "no engine binary" reasoning
`DESIGN.md` §2 gives for choosing Drizzle over Prisma in the first place).
`src/db/connection.ts` reads `DATABASE_URL` and instantiates the driver
exactly once; `drizzle.config.ts` reads the same variable for `drizzle-kit`.

Picked postgres.js over `pg`/`node-postgres` because it parses `sslmode` off
the connection string automatically, so the same client code works against
local Postgres (no `sslmode`, plaintext) and Neon (`?sslmode=require` in the
URL, TLS) without an environment branch — directly satisfies the task's "same
code connects to Neon" acceptance criterion.

Verified against the devcontainer's local Postgres by hand (`npx tsx`, no
test runner yet — Vitest doesn't land until M1.7): the client resolves
`DATABASE_URL`, opens a TCP connection to `postgres:5432`, and completes the
wire-protocol handshake, reaching a real server-side authentication
response. It doesn't get past that in this sandbox, and a `make
docker-rebuild` doesn't change that — this isn't a stale volume. Per
`Docker/docker-compose.yaml`'s own top comment, no `sorrel` role or database
exists in the local Postgres image at all yet: `Docker/Dockerfile.postgres`'s
build-time init sets no `POSTGRES_USER`/`PASSWORD`, so the only role baked in
is `postgres`, with a password generated and discarded in that same build
step. Compose's runtime `POSTGRES_USER=sorrel`/`PASSWORD=sorrel`/`DB=sorrel`
are inert — `PGDATA` is always pre-populated from the image layer on
container start, so Postgres's entrypoint never reads them. This is
deliberate, documented sequencing (real credentials arrive with M1.27), not a
defect in `connection.ts` or in the Postgres image as it stands today —
flagged on both the M1.2 and M1.27 Asana tasks rather than worked around
here. Full query verification against the local stack waits on M1.27.

## 2026-09-10 — M1.15: `auditColumns` and `applyAudit`

Added `src/db/audit.ts`: the `auditColumns` six-column spread and
`applyAudit(operation, payload, session)`, a pure function with no database
access, TDD'd against `src/db/audit.test.ts` (five cases — insert, update,
soft delete, and two covering payload-supplied audit ids being ignored).

`auditColumns`'s `createdBy`/`updatedBy`/`deletedBy` are plain `uuid` columns
rather than the `.references(() => users.id)` DESIGN.md §5 shows — `users`
isn't created until M2.1, so nothing exists yet to reference. Whichever table
lands first with a real FK requirement adds it there.

The test file lives under `src/db/`, which routes it to Vitest's `db`
project (`vitest.config.mts`, M1.7) rather than `unit` — `db`'s include glob
is path-based (`src/db/**/*.test.ts`) and doesn't distinguish a pure test
from one that touches Postgres. DESIGN.md §10 lists `applyAudit()` under
"Unit — Vitest, no DOM," but the file has to live at `src/db/audit.ts` per
the task, so its test runs through `db`'s `globalSetup` (which clones a
`sorrel_test_<n>` database) even though the test itself never opens a
connection. Confirmed this doesn't fail in the devcontainer — `postgres` and
`sorrel_template` are both reachable there — but it does mean this
particular unit test can't run in an environment with no Postgres at all.
