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
  types.ts        # the module's types, named by the index — internal, see "Where types live"
  schema/*.ts     # the Drizzle tables the module owns — public too, see below
  validation/*.ts # Zod input schemas the form and the service share — public, see below
  services/*.ts   # authorization + business logic; every file opens with `import 'server-only'`
  graphql/*.ts    # Pothos types and fields registered on the shared builder
  loaders/*.ts    # defineLoader factories
```

A module's index re-exports its `graphql/` files, so loading the index is what
registers its types: `src/graphql/schema/index.ts` imports `@/modules/identity`,
`@/modules/coven`, `@/modules/vocabulary` and `@/modules/ingredients` for that side effect, never the
`graphql/` path, which is internal. `identity` has `User` and `me`; `coven` has
`Workspace`, `WorkspaceMember`, the `membershipsByUser` loader and the
`User.memberships` field; `vocabulary` has `CorrespondenceSuggestion`,
`FormSuggestion`, `SuggestionClaimant` and the `planetSuggestions`,
`zodiacSuggestions` and `formSuggestions` connections; `ingredients` has
`Ingredient`, the `compendium`, `ingredient`, `possibleDuplicates` and
`ingredientSuggestions` queries,
the two workspace ingredient mutations, and `CommonNameSuggestion` and
`commonNameSuggestions`, whose claimants reuse `vocabulary`'s
`SuggestionClaimant` — the edge runs that way round — plus the
`categoriesByIngredient` and `folkNamesByIngredient` loaders. A field on another module's type is added from the module allowed to
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
  `AuditInfo`), a `types.ts` beside each of the three, the printed SDL, and the two composition points:
  `schema/index.ts` and `loaders/index.ts`.
- **`src/lib/`** — the host and the pure functions: `auth.ts` (Better Auth
  composition), the session helpers, `mail.ts`, `errors.ts`, `slugify.ts`
  (pinned there by `tests/guards/slug-rule.test.ts`), `pagination.ts`.
- **`src/app/`, `src/components/`, `src/emails/`, `src/scss/`, `src/proxy.ts`**
  — presentation. A module never imports any of them.

## Ownership

Every table has exactly one owner. The services column is what exists today;
a service lands in the module that owns the table it writes.

| Module        | Tables                                                                                                                      | Services today                                                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `identity`    | `users`, `sessions`, `accounts`, `verifications`, `rate_limits`; later `admin_invitations`                                  | `admin-role.ts`, `profile.ts`, `provisional-accounts.ts`, `workshop-access.ts`                                                     |
| `coven`       | `workspaces`, `workspace_members`, `workspace_invitations`                                                                  | `membership.ts`, `memberships.ts`, `access-control.ts`                                                                             |
| `vocabulary`  | `category_groups`, `categories`, `ingredient_form_groups`, `ingredient_forms`, `planets`, `zodiac_signs`                    | `suggestions.ts`                                                                                                                   |
| `ingredients` | `ingredients` (both tiers), `ingredient_folk_names`, `ingredient_categories`, `inventory_items`, `retired_ingredient_slugs` | `duplicates.ts`, `common-names.ts`, `ingredient-children.ts`, `workspace-ingredients.ts`; `schema/units.ts` is the unit vocabulary |
| `grimoire`    | `spells`, `spell_ingredients`, `spell_categories`                                                                           | `spell-visibility.ts`                                                                                                              |

**The compendium is a tier inside `ingredients`, not a module**: the
`workspace_id IS NULL` tier of the one table, reached through `ingredients`'
services, because a module of its own would own no table and import
everything `ingredients` owns
([`design-decisions/mb.86-modular-monolith.md`](design-decisions/mb.86-modular-monolith.md),
"The five modules"; splitting the table is under its "What it rules out").
The reads that cross the tiers are the seam below.

## The public surface

A module offers three things to the rest of the tree, and nothing else:

- **`index.ts`** — the behaviour surface. It re-exports the services the
  module means to offer, its GraphQL refs and its loader factories, and names
  the public ones of its types from `types.ts`. A name missing from it is a decision to take in the module, not a
  reason to import the file underneath.
- **`schema/*.ts`** — the data surface, for whatever needs a table object
  without loading a `server-only` service: the seed, the repository,
  drizzle-kit and a cross-module foreign key. Above the database layer a
  table object is inert, so a page importing one leaks nothing
  ([`design-decisions/mb.86-modular-monolith.md`](design-decisions/mb.86-modular-monolith.md),
  "The five modules").
- **`validation/*.ts`** — the input surface. A Zod schema is run by the
  form before a request is sent and by the service again after, so a client
  component must be able to import it — which the index cannot offer once it
  re-exports a `server-only` service. A validation file imports `zod` and
  dependency-free files such as `schema/units.ts`, nothing else, and
  `tests/guards/client-safe-validation.test.ts` fails one that reaches further
  ([`validation.md`](validation.md)).

`services/`, `graphql/`, `loaders/` and `types.ts` are internal. A deep import
of any of them from outside the module is a boundary violation, whatever the importer.

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
| `vocabulary`  | `identity`, `coven`                              |
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
  `@/modules/*/graphql`, `@/modules/*/graphql/**`, `@/modules/*/loaders`,
  `@/modules/*/loaders/**` and `@/modules/*/types`. It is restated in every override, because an
  override replaces the top-level rule rather than merging with it
  ([`db/query-building.md`](db/query-building.md), "Where queries may be
  built"). The bare `@/modules/<name>` index import matches none of the
  patterns, so no negation is needed. The lint sees only the alias spelling.
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
`tests/guards/module-boundaries.test.ts` must name every top-level function in
`src/db/repository/` whose SQL reads the compendium tier**, exported or not —
anything calling `inCompendium(…)`, the predicate's one spelling since MB.100,
or writing `workspace_id is null` or `isNull(workspaceId)` out by hand, and
anything that reads both tiers in one statement. The guard cuts each file at
every top-level `function` and `const`, so a predicate is named by the
declaration it is written in, and a private helper is listed under its own
name rather than credited to whichever export happens to sit above it. It
fails an unlisted function, and it fails a listed one that no longer exists or
no longer reads the tier.

It holds the predicate, twelve finders and the writer today: `inCompendium` in
`predicates.ts`, which is `workspace_id IS NULL` itself; `findSimilarIngredients`
(M4.7), the fuzzy duplicate match; `findVocabularySuggestions` (MB.94, forms
M4.7a), the planet, zodiac and form autofill; `findCommonNameSuggestions`
(M4.7a), the common-name autofill; `findManyOfIngredients` (M4.8), an
ingredient's folk names and category links; `findCompendiumPage` (M8.5), the
public list, and `findCompendiumCount` (MB.105), its count;
`findOneIngredient` (M8.5), one row in the compendium or a proof's coven;
`findIngredientSuggestions` (MB.138), the substitute picker's search;
`findCompendiumEntryByIdentity` (M5.2), the entry a colliding compendium
write names; `findCompendiumEntryBySlug` and `findCompendiumSlugRedirect`
(MB.82), the entry at an address and the one a retired address redirects to;
`findIngredientsInSpellsIncludingSoftDeleted` (M5.3), what a readable spell
holds, deleted or not; and `writerFor` (M5.2), the private builder of `withAudit`'s writer, whose
compendium-tier methods update and soft-delete a row only under
`workspace_id IS NULL` and clear the tier's lapsed slug retirements. The
list, its count, the identity lookup, the two address finders and the writer
touch the compendium tier alone; each of the rest reads the compendium and the
proofs' workspaces in a single statement. A later task that adds such a finder
— M8.3's local-beats-compendium resolution — adds the finder's name to
`TIER_SEAM` in its own PR, with a one-line reason beside it.
The list is then the scope of the extraction task, read from one file.

## Where types live

A `type` or `interface` lives in a type-only file, one whose every statement
is an import, a type, a `declare` or an `export type` re-export, and a code file
declares none (MB.108). The default home is a `types.ts` beside the code that
uses it, rather than a central `src/types/`, so a type is found next to its
users and a code file reads as behaviour.

Three kinds stay in their code file, because moving them would cost more than
it tidies:

- **A type derived from a value declared in the same file**, such as
  `z.output<typeof LocalIngredientInput>`, `(typeof UNIT_DIMENSIONS)[number]`
  or `Loaders` from the private `LOADERS`. A types file would have to import
  the value back. The Zod pairs also share one name between the schema and its
  type, so one import carries both.
- **A branded proof**, `Membership` and `SiteAdmin`. Its `unique symbol` stays
  unexported beside the one function that mints it (CLAUDE.md rule 5).
- **`Executor` and `Transaction`** in the repository, both `typeof db`. Only
  the files whose exemptions `lint-db-client-boundary.test.ts` pins may import
  the client, and a types file would be one more.

A type declared inside a function, a `describe` or a `declare global` block
belongs to that code and stays with it. So `src/graphql/pagination.ts` keeps
its `PothosSchemaTypes` augmentation beside the prototype patch it types.

Where the file goes follows from who imports it, because importing a types
file, `import type` included, carries that file's own imports along:

- **A module's types** are in `src/modules/<name>/types.ts`, at the module
  root rather than under `services/`, so the file carries no
  `import 'server-only'`. It is internal like `services/`: the index names its
  public types in one `export type { … } from './types'` line, which keeps a
  module-internal type such as `IngredientFields` off the surface, and the lint
  group and the guard above ban a deep import of it.
- **A validation file's helper types** are in `validation/types.ts`, not the
  module's `types.ts`. `client-safe-validation.test.ts` follows type imports
  too, and the module's file reaches its tables.
- **`src/lib/types.ts` imports nothing.** `lib/validation.ts` reaches it
  through `errors.ts`, which puts it inside that same client-safe walk. The
  session types read the `users` table and Better Auth, so they are in
  `src/lib/session.ts` instead.
- **The repository's types** are in `src/db/repository/types.ts`. The index
  re-exports the writer's type, and the types a caller passes to a finder or
  gets back from one, by name. The table shapes and the rest of `selectFrom`'s
  options stay inside the folder
  ([`db/repository-files.md`](db/repository-files.md),
  "The repository's files").
- **Presentation's types** sit beside the component, route or template that
  uses them. A component's props are in `src/components/<Name>/types.ts`, which
  its story imports too. An app route's are in a `types.ts` in the route's
  directory, which Next never serves, because only a `page` or `route` file
  makes a segment public.
- **A test's types** are in the `types.ts` of its own directory, and the
  harness's in `tests/support/`'s. A shape two tests share is declared once
  there, and one that repeats a `src/` type imports that type instead, so a
  test cannot drift from the shape it tests.
- **A script's types** are in `scripts/types.ts`, imported as
  `import type { … } from './types.ts'`. Node's own type stripping runs those
  scripts, and it needs the extension and erases only a type-only import.

`tests/guards/types-in-type-files.test.ts` enforces this over `src/`, `scripts/`
and `tests/` (MB.109). It reads every column-0 `type` and `interface` in a file
that is not type-only, and fails any that is not one of the three kinds above.
It recognises the first two from the declaration itself: a `typeof` naming a
value the same file declares, or a key naming a `declare const …: unique symbol`
in the same file. The third is a pinned list, so a new exception is a change to
the guard rather than a quiet addition.

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
`tests/support/db/` ([`testing/db-harness.md`](testing/db-harness.md)).

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

Three modules register types today and two register loaders. What is fixed
is that the host reaches each through the module's index.

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
   the entry in `claude-docs/tasks/` for the task that adds it.
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
