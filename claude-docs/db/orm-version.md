## Why the ORM stays on 0.45.2 (MB.20)

`drizzle-orm` is pinned to `0.45.2` and `drizzle-kit` to `0.31.10` — the newest
releases on either package's stable dist-tag, and both **deliberately not
upgraded**. The facts, as of 2026-09-17:

- `drizzle-orm@0.45.2` last published **2026-03-27**. There is no GA `1.0.0`;
  the `rc` tag points at `1.0.0-rc.4`, with `rc.5-<hash>` CI snapshots after it.
  The stable line is effectively frozen.
- `npm audit` therefore carries a standing moderate advisory
  (GHSA-67mh-4wv8-2f99) reached only through
  `drizzle-kit` → `@esbuild-kit/esm-loader` → a nested `esbuild ~0.18.20`.
  **It has no runtime exposure**: the advisory is esbuild's _dev server_
  accepting cross-origin requests, `drizzle-kit` is a devDependency and
  build-time CLI that never ships to Vercel, and nothing here runs
  `esbuild serve`. `checks.yml`'s `audit` leg is non-blocking at every
  severity (`npm audit --json … || true`) and only comments on the PR.

Moving to the `1.0.0-rc.*` line was scoped as MB.19 and **retired**: it would
trade a stable-but-frozen dependency for a prerelease one, and the advisory it
clears is not reachable. What makes staying put sustainable is MB.20 — dropping
`@pothos/plugin-drizzle` removes the component that tracked the ORM's version
and would eventually have forced the upgrade. With it gone, `drizzle-orm` is
reachable only from the database layer, and is banned by lint everywhere else
(see ["Where queries may be built"](query-building.md)), so it is a query
builder behind a choke point rather than an architectural commitment.

**Revisit when any of these fires** — not before:

- `drizzle-orm` / `drizzle-kit` `1.0` goes GA on the `latest` dist-tag.
- `drizzle-kit generate` cannot express DDL a task needs. Both candidates are
  now settled, and neither fired. M4.1a: it emitted all three of `ingredients`'
  partial unique indexes, predicates and the `lower(name)` expression included,
  with no hand-editing. M4.6: it emitted the multicolumn trigram index from a
  schema-level `index().using('gin', …)`, both `gin_trgm_ops` operator classes
  included. The one hand-edit that migration carries is an `IF NOT EXISTS`
  added for idempotency (see the [migrations section](migrations-and-scripts.md))
  — a keyword, not DDL the generator could not express.
- The advisory gains a runtime path, or escalates past moderate.
