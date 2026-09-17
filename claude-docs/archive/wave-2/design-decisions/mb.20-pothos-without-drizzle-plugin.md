# MB.20 — Pothos without the Drizzle plugin

**Status:** decided · **Date:** 2026-09-17

`DESIGN.md` §2 and §7 specify **Pothos with the Drizzle plugin** as the
code-first GraphQL stack, on the stated grounds that the plugin "derives
GraphQL types from table definitions, so `auditColumns` flows into the graph
without retyping" (`DESIGN.md:64`). The question raised was whether to keep
that plugin at all, given it is the only `0.x` package in the GraphQL path.

Nothing is installed yet — `package.json` has no `pothos`, `graphql` or
`yoga`, and `src/graphql/{schema,loaders}/` are empty. So this is a decision
about M3, taken before M3 is written, not a refactor.

## Decided

**Keep Pothos and its code-first model. Drop `@pothos/plugin-drizzle`.**

GraphQL object types are declared by hand against the row types the services
return (`typeof ingredients.$inferSelect` and friends), so TypeScript still
fails the build when a column's type changes under a field. `auditColumns` is
mapped once into a shared `AuditInfo` object type rather than derived
per-table.

Everything `DESIGN.md` actually relies on Pothos for survives: compile-checked
resolver return shapes, `@pothos/plugin-scope-auth`'s declarative field guards
(`DESIGN.md:64`, §8's `User.email` scope), per-request DataLoaders, and M3.4's
SDL snapshot.

## Why — the plugin's premises do not hold here

**1. Its primary capability is banned by rule 1.** The plugin exists so that
resolvers can query the database from the GraphQL selection set
(`builder.drizzleObject`, `t.relation`). `DESIGN.md:359` says "No database
access in a resolver, ever. Same lint rule as `db`," and M3.9 adds that rule.
Installing it would mean shipping a plugin whose main API the architecture
forbids calling.

**2. Its stated benefit does not match the schema.** `DESIGN.md:64` justifies
it by `auditColumns` flowing into the graph — but the schema sketch at
`DESIGN.md:417` exposes `audit: AuditInfo!`, a **nested object**, not six flat
columns. `Ingredient.isGlobal: Boolean!` is derived from `workspace_id IS
NULL` and is not a column at all; `Spell.derivedCategories` and
`Spell.categoryGaps` are computed. The graph deliberately does not mirror the
tables, so derivation would be overridden on essentially every type.

**3. `DESIGN.md`'s own example resolver does not use it.** The "resolvers are
thin" snippet (`DESIGN.md:346`) is a plain `t.field` over a manually declared
`IngredientType`, resolving through `compendiumService.list`.

**4. N+1 is already solved elsewhere.** `DESIGN.md:362` and `:372` assign
batching to per-request DataLoaders in the Yoga context
(`categoriesByIngredient`, `membersByWorkspace`); `src/graphql/loaders/` is
already the scaffolded home. Rule 9 binds regardless of the plugin.

**5. Pagination is already custom.** Rule 8 and M3.6 specify one shared cursor
helper — default 25, hard maximum 100, cursors encoding sort key plus id —
not the plugin's connection helpers.

**6. It couples the GraphQL layer to `drizzle-orm`'s version.** This is the
decisive one. `@pothos/plugin-drizzle` is `0.20.0` and tracks the ORM, so it
is the component most likely to force an upgrade off `drizzle-orm@0.45.2`.
Every other Pothos package in the stack is a stable `4.x` (`core` 4.15.1,
`plugin-scope-auth` 4.2.1, `plugin-dataloader` 4.4.6, `plugin-relay` 4.8.1).

## What this rules out

- **Resolver-level database access** stays banned, and now has no plugin
  offering it. M3.9's lint rule is the enforcement; this removes the
  temptation as well.
- **Auto-derivation of GraphQL types from tables.** Adding a column is a
  deliberate two-step — table, then field — rather than automatic exposure.
  For a schema whose audit columns (`created_by`, `updated_by`, `deleted_by`)
  are internal, that is the safer default.
- It does **not** rule out adopting the plugin later. It is additive, and
  re-adopting once it reaches a stable major is a contained change.

## Rules this sets

- **Declare GraphQL object types by hand**, against the row type the service
  returns. Never reach for a table-derived object type.
- **`auditColumns` maps to one shared `AuditInfo` object type**, defined once.
  A per-table audit shape is a bug.
- **Every Pothos package in the stack is a stable major.** A `0.x` Pothos
  plugin entering the dependency tree is a decision, not a convenience.
- The GraphQL layer must not import `drizzle-orm` for anything but _types_.
  Runtime query building stays behind `src/db/repository.ts` (rule 2).

## Related

This decision is what makes leaving `drizzle-orm` on `0.45.2` sustainable —
see `db.md`, "Why the ORM stays on 0.45.2". MB.19, which would have moved
`drizzle-kit`/`drizzle-orm` onto a `1.0.0-rc.*` prerelease, was retired in the
same pass; its reasoning is preserved in `TASKS.md`.
