# Database

The database layer: one Postgres driver call site, a repository that is the only application code allowed to query, and the audit, soft-delete and membership-proof rules that every write and read passes through. DESIGN.md §5 is the specification; these files are the current shape. A citation in code names the file below, not this page. Seed data and work lists live in `claude-docs/compendium/`.

## How the layer connects

`src/db/connection.ts` is the only place the Postgres driver is instantiated. It exports `db`, a Drizzle client built with `drizzle-orm/postgres-js` over the `postgres` package (pure JavaScript, no native binary). `db` reads `DATABASE_URL` from the environment at module load and throws if it is unset: no default, no silent fallback. The client is one per process per URL, held on `globalThis`, so a module evaluated twice in one process (`vi.resetModules()` in a test, a hot reload under `next dev`) reuses the pool rather than opening another that nothing ends ([`testing/db-harness.md`](../testing/db-harness.md#connections-per-run-mb179)).

- **One driver call site.** Nothing outside `connection.ts` calls `postgres(...)`. `src/db/repository/` is the only application code that imports `db` from there; everything else reaches the database through the repository. Three pieces of infrastructure are exempt (`repository-files.md`, "Who may import the client").
- **Local Postgres and Neon use the same code path.** The driver parses `sslmode` off the connection string, so a Neon URL's `?sslmode=require` turns on TLS and a local URL with no `sslmode` stays plaintext. `connection.ts` never branches on environment.
- **The client reads with `onread: false`.** The driver's default for a plaintext connection is Node's custom read mode, which the socket that msw swaps in for a passed-through connection ignores, so the first read fails with `read ENOTCONN`. A Neon URL's `sslmode=require` upgrades to TLS and never uses that mode, so turning it off changes nothing in production. The option is set on every client the project opens: `connection.ts`, the probe, and the `db` test projects' bounded client.
- **`channel_binding` reaches the driver.** The driver reads it from the URL, enforces `require` and defaults to `prefer`; a server that cannot offer channel binding, such as a local Postgres without TLS, fails a `require` URL with `CHANNEL_BINDING_REQUIRED`. Only parameters the driver does not consume are stripped (`src/db/connection-url.ts`).
- **`drizzle.config.ts`** (repo root) drives `drizzle-kit`: dialect `postgresql`, schema at the glob `./src/modules/*/schema/*.ts` (every module's tables, no barrel and no registration step), migrations written to `src/db/migrations`. It reads the same `DATABASE_URL` and throws under the same condition.

The rules that sit on top of the connection: writes go through `withAudit` (`write-path.md`), reads filter soft-deleted rows in the repository (`soft-delete.md`), a workspace-scoped finder takes the `Membership` proof first (`membership-proof.md`), and migrations are forward-only (`expand-contract.md`).

## Files

Ingredients and grimoire have a cross-area map: `ingredients.md` and the top of `grimoire.md`.

- `audit-columns.md`: the two audit column-set factories and their instances.
- `updated-at.md`: the trigger that stamps `updated_at`.
- `write-path.md`: `withAudit`, the one transaction every write opens.
- `soft-delete.md`: how the repository hides deleted rows.
- `hard-delete-join-tables.md`: join tables that carry stamps but no soft delete.
- `finder-convention.md`: how finders and writers split by table shape.
- `keyset-pages.md`: cursor pagination (`findPage`).
- `repository-files.md`: one file per concern in `src/db/repository/`, who may import the client, where queries may be built, `sql` fragments, and debugging a query.
- `membership-proof.md`: `assertMembership` and the `Membership` it returns.
- `site-admin-proof.md`: `assertSiteAdmin`, the same two layers for the site role.
- `identity-model.md`: users, workspaces, memberships, and the provisional-account delete.
- `invitations.md`: the invitation table in its two tiers.
- `migrations-and-scripts.md`: the `db:*` scripts.
- `expand-contract.md`: forward-only migrations and the destructive-DDL acknowledgement.
- `snapshot-and-restore.md`: the Neon snapshot taken before a production migration, and the restore runbook.
- `seed-module.md`: the seed entry point and its idempotence.
- `standard-scenario.md`, `demo-scenario.md`: the `standard` and `demo` seed scenarios.
- `category-seed.md`, `form-vocabulary-seed.md`: the category and form vocabulary seeds.
- `categories.md`: category groups, categories, and an ingredient's category links.
- `astrology-vocabularies.md`, `deity-vocabulary.md`: the celestial body, zodiac and deity vocabularies.
- `member-autofill.md`: the vocabulary autofill read.
- `fuzzy-matching.md`: the trigram index behind name matching.
- `references.md`: sources as `references` rows and `reference_links`.
- `ingredient-slugs.md`: ingredient slugs and the public address.
- `ingredient-children.md`: folk names, categories, substitutes, deities, variants beneath an ingredient.
- `workspace-ingredients.md`: a coven's own ingredients.
- `workspace-compendium-entries.md`: the compendium entries a coven's cupboard holds.
- `stock.md`: the stock table and the unit vocabulary.
- `compendium-read.md`, `compendium-writes.md`, `compendium-cache.md`: the compendium's reads, writes and cache.
- `ingredients.md`: a map of the ingredients module.
- `grimoire.md`, `spell-visibility.md`, `spell-categories.md`: spells, who can read them, and their categories.
