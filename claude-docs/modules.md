# Modules

`src/` is a modular monolith (MB.86). Five domain modules under `src/modules/`
own every table and every service; the database layer, the GraphQL host, `lib`
and the presentation tree are infrastructure that composes them. A module has a
public surface, an allowed set of modules it may import, and two mechanisms —
lint and a guard test — that make a boundary crossing fail in the diff that
adds it. The record behind the shape, and what a later extraction would
replace, is
[`design-decisions/mb.86-modular-monolith.md`](design-decisions/mb.86-modular-monolith.md).

## Layout

```
src/modules/<name>/
  index.ts        # the public surface: services, types, GraphQL refs, loader factories
  schema/*.ts     # the Drizzle tables the module owns — public too, see below
  validation/*.ts # Zod input schemas the form and the service share — public, see below
  services/*.ts   # authorization + business logic; every file opens with `import 'server-only'`
  graphql/*.ts    # Pothos types and fields registered on the shared builder
  loaders/*.ts    # defineLoader factories
```

A module's index re-exports its `graphql/` files, so loading the index is what
registers its types: `src/graphql/schema/index.ts` imports `@/modules/identity`
and `@/modules/coven` for that side effect, never the `graphql/` path, which
is internal. `identity` has `User` and `me`; `coven` has `Workspace`,
`WorkspaceMember`, the `membershipsByUser` loader and the `User.memberships`
field. A field on another module's type is added from the module allowed to
import it — `memberships` lives in `coven` because `identity` imports
nothing.

What stays outside a module, and why:

- **`src/db/`** — `connection.ts`, `repository/`, `audit.ts`, `bootstrap.ts`,
  `migrations/`, `seed/`. The repository is the one query author for every
  module (CLAUDE.md rules 2 and 4), so it is shared rather than owned. The
  seed is the one legitimately cross-domain composer and reaches tables
  through the modules' schema files.
- **`src/graphql/`** — the builder, the context, pagination, armor, Altair,
  `loaders/define-loader.ts`, `schema/audit.ts` (the cross-cutting
  `AuditInfo`), the printed SDL, and the two composition points:
  `schema/index.ts` and `loaders/index.ts`.
- **`src/lib/`** — the host and the pure functions: `auth.ts` (Better Auth
  composition), the session helpers, `mail.ts`, `errors.ts`, `slugify.ts`
  (pinned there by `tests/guards/slug-rule.test.ts`), `pagination.ts`.
- **`src/app/`, `src/components/`, `src/emails/`, `src/scss/`, `src/proxy.ts`**
  — presentation. A module never imports any of them.

## Ownership

Every table has exactly one owner. The services column is what exists today;
a service lands in the module that owns the table it writes.

| Module        | Tables                                                                                                                            | Services today                                                                 |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `identity`    | `users`, `sessions`, `accounts`, `verifications`, `rate_limits`; later `admin_invitations`                                        | `admin-role.ts`, `profile.ts`, `provisional-accounts.ts`, `workshop-access.ts` |
| `coven`       | `workspaces`, `workspace_members`, `workspace_invitations`                                                                        | `membership.ts`, `memberships.ts`, `access-control.ts`                         |
| `vocabulary`  | `category_groups`, `categories`, `ingredient_form_groups`, `ingredient_forms`                                                     | none yet                                                                       |
| `ingredients` | `ingredients` (both tiers), `ingredient_folk_names`, `ingredient_categories`, `inventory_items`; later `retired_ingredient_slugs` | none yet; `schema/units.ts` is the unit vocabulary                             |
| `grimoire`    | `spells`, `spell_ingredients`, `spell_categories`                                                                                 | `spell-visibility.ts`                                                          |

**The compendium is a tier inside `ingredients`, not a module.** Both tiers
share one table, one identity model, one search component and one detail
page, and the local-beats-compendium resolution reads both in one statement.
The compendium is the `workspace_id IS NULL` tier, reached through
`ingredients`' services; the reads that cross the tiers are the seam below.

## The public surface

A module offers three things to the rest of the tree, and nothing else:

- **`index.ts`** — the behaviour surface. It re-exports the services the
  module means to offer, their types, its GraphQL refs and its loader
  factories. A name missing from it is a decision to take in the module, not a
  reason to import the file underneath.
- **`schema/*.ts`** — the data surface. The seed, the repository, drizzle-kit
  and a cross-module foreign key all need a table object without loading a
  service, and a service carries `server-only`, which the seed's `tsx` runtime
  cannot resolve. A table object is inert without the database client or a
  runtime `drizzle-orm`, both already banned above the database layer, so
  letting a page import one leaks nothing.
- **`validation/*.ts`** — the input surface. A Zod schema is run by the
  form before a request is sent and by the service again after, so a client
  component must be able to import it — which the index cannot offer once it
  re-exports a `server-only` service. A validation file imports `zod` and
  dependency-free files such as `schema/units.ts`, nothing else, and
  `tests/guards/client-safe-validation.test.ts` fails one that reaches further
  ([`validation.md`](validation.md)).

`services/`, `graphql/` and `loaders/` are internal. A deep import of any of
them from outside the module is a boundary violation, whatever the importer.

## The boundary

Three import conventions, each chosen for a reason the alternative lacks:

- **Cross-module behaviour imports use `@/modules/<name>`** — the index, by
  alias. This is the first use of the `@/` alias inside `src/`; the alias is
  what lets one lint glob name every cross-module import.
- **The drizzle-kit-reachable graph uses relative paths.** A schema file
  reaches another schema file, `schema/units.ts` or `src/db/audit.ts` by a
  relative path — `../../identity/schema/users` — because drizzle-kit loads
  the schema glob with its own loader, which may not honour tsconfig paths.
- **Intra-module imports are relative.** A service reaches its own schema as
  `../schema/spells`, never through its own index, which would be a cycle.

The dependency graph is fixed and acyclic:

| Module        | May import                                       |
| ------------- | ------------------------------------------------ |
| `identity`    | nothing                                          |
| `coven`       | `identity`                                       |
| `vocabulary`  | `identity`                                       |
| `ingredients` | `identity`, `coven`, `vocabulary`                |
| `grimoire`    | `identity`, `coven`, `vocabulary`, `ingredients` |

Every edge is a foreign key or a service call that already crosses in that
direction. A new edge is a design change: add it to `ALLOWED` in the guard in
the same PR and say why in the PR body.

**A module never imports presentation** — `src/app`, `src/components`,
`src/emails`, `src/proxy`. The direction is one way: presentation composes
modules.

### Enforcement

Two layers, in the shape every boundary here takes — the lint gives fast
feedback and the guard gives precision:

- **Lint.** `.oxlintrc.json` carries one `no-restricted-imports` pattern group
  banning `@/modules/*/services`, `@/modules/*/services/**`,
  `@/modules/*/graphql`, `@/modules/*/graphql/**`, `@/modules/*/loaders` and
  `@/modules/*/loaders/**`. It is restated in every override, because an
  override replaces the top-level rule rather than merging with it
  ([`db.md`](db.md), "Where queries may be built"). The bare
  `@/modules/<name>` index import matches none of the patterns, so no
  negation is needed. The lint sees only the alias spelling.
- **Guard.** `tests/guards/module-boundaries.test.ts` scans every file under
  `src/` — the git index plus untracked files, as `slug-rule.test.ts` does —
  and resolves both alias and relative specifiers to a path. It asserts: an
  import resolving into another module lands on its `index.ts`, a
  `schema/*.ts` file or a `validation/*.ts` file; the module-to-module edges
  are a subset of `ALLOWED`; no module imports presentation; the set of
  directories under `src/modules/` is exactly the roster; and the `TIER_SEAM`
  pin over the repository (below).
  It is what catches the relative spelling the lint cannot.
  A type-only import counts exactly like a runtime one: `import type` is
  erased at compile time but couples to the file all the same, and the index
  exports the type too.

The two M3.9 guards that named `src/services` — `lint-access-boundary.test.ts`
and `server-only-services.test.ts` — point at `src/modules/*/services`. The
`.oxlintrc.json` override that bans a service from reading a request
(`next/headers`, `lib/auth`, `lib/request-session`) matches
`src/modules/*/services/**/*.ts`; the database-layer override that permits a
runtime `drizzle-orm` import covers `src/modules/*/schema/**/*.ts`. A module's
`graphql/` and `loaders/` sit above its services rather than beside them, so
the access-boundary override that bans `src/db` from resolvers and pages
covers `src/modules/*/graphql/**/*.ts` and `src/modules/*/loaders/**/*.ts`
too, and `lint-access-boundary.test.ts` probes both.

## The tier seam

The compendium's future extraction unit is the compendium tier of
`ingredients` plus `vocabulary`. What would make that extraction a rewrite is
an uncounted set of reads that cross from a workspace's rows into the
compendium's. So the set is counted: **`TIER_SEAM` in
`tests/guards/module-boundaries.test.ts` must name every exported function in
`src/db/repository/` whose SQL reads the compendium tier** — anything
containing `workspace_id is null` or `isNull(workspaceId)`, and anything that
reads both tiers in one statement. The guard fails an unlisted finder, and it
fails a listed one that no longer exists.

It is empty today. A later task that adds such a finder — M5.1's admin
reads, the merged two-tier list, local-beats-compendium resolution — adds the
finder's name to `TIER_SEAM` in its own PR, with a one-line reason beside it.
The list is then the scope of the extraction task, read from one file.

## Tests

`tests/` mirrors `src/` (MB.41), so a module's tests sit under
`tests/modules/<name>/`:

- `tests/modules/<name>/schema/*.test.ts` — the table's shape, through
  `tests/support/db/table-metadata.ts`'s `getTableConfig` transcription.
- `tests/modules/<name>/services/*.test.ts` — the service against the real
  rows, in the Vitest `db` project, whose `include` covers
  `tests/modules/**/*.test.ts`.
- `tests/rsc/modules/<name>/` — anything whose behaviour exists only inside a
  server render (today `coven`'s one `assertMembership` lookup per render).

Infrastructure tests stay in `tests/db/` — the repository, audit, seed,
trigger, isolation and pagination tests — and the shared db harness is
`tests/support/db/` ([`testing.md`](testing.md)).

## GraphQL registrations and loaders

- **Types and fields** live in `src/modules/<name>/graphql/*.ts` and register
  on the shared builder (`src/graphql/builder.ts`) for their side effect, the
  way `src/graphql/schema/audit.ts` does. `src/graphql/schema/index.ts` loads
  each module before `toSchema()`, through the module's index — never the
  deep path, which the lint bans in `src/graphql` as everywhere else.
- **Loader factories** live in `src/modules/<name>/loaders/*.ts`, built with
  `defineLoader` (the one file that may import `dataloader`, rule 9). The
  module's index exports them as a map, and `src/graphql/loaders/index.ts`
  spreads each module's map into `LOADERS`, so `createLoaders(session)` still
  builds one fresh set per request.

Both composition points are empty today. The first module to register a type
or a loader settles the exact export name; what is fixed is that the host
reaches it through the index.

## Adding a module

Five things, in one PR, or the guard fails:

1. Add the name to the roster in `tests/guards/module-boundaries.test.ts` and
   its edges to `ALLOWED` — only edges that a foreign key or a service call
   needs, and never one that makes the graph cyclic.
2. Create `src/modules/<name>/index.ts`, even if it exports nothing yet, and
   `schema/` when the first table lands.
3. Create `tests/modules/<name>/`.
4. Add the row to the ownership table above, to
   [`DESIGN.md`](DESIGN.md) §3's tree if the shape changes, and to
   `TASKS.md`'s entry for the task that adds it.
5. Say in the PR body why the existing five could not own it.

## Adding a table

A table lands in its owner's `schema/`, as its own file, imported relatively
by any schema file that references it. Everything the database summary already
requires still applies: the six-column `...auditColumns` spread (or
`...auditStampColumns` on a join table), imported relatively from
`../../identity/schema/users` — the instances live with `users` because every
stamp references it, and `src/db/audit.ts` holds only the factories they are
built from — partial unique indexes, the
`CREATE OR REPLACE TRIGGER` line for `set_updated_at()` in the table's own
migration, and a transcribed entry in `tests/support/db/table-metadata.ts`,
which `tests/db/updated-at-trigger.test.ts` compares against the catalogue
([`db.md`](db.md)). `drizzle.config.ts` reads `src/modules/*/schema/*.ts`, so a
new file is picked up by `npm run db:generate` with no registration step. A
`*.test.ts` file must never sit in `schema/`: the glob would hand it to
drizzle-kit, which cannot load Vitest.
