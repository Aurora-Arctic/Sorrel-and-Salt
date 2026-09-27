# MB.86 — Domain modules with a guarded boundary

**Decided (2026-09-27):** `src/` is a modular monolith. Five domain modules under `src/modules/`, each owning its tables and its services, with a public surface and an allowed dependency graph enforced by lint and by a guard test. The `ingredients` table stays one table with two tiers, and the reads that cross the tiers are a named, countable set in the repository. Modules are directories under one package, not npm workspace packages. The approved plan, with the amendments made while executing it, is [`mb.86-plan.md`](mb.86-plan.md); the working summary is [`../modules.md`](../modules.md).

## What the question was

What would make a later move to separately deployed services a transport change rather than a rewrite. The rules already gave most of a modular monolith: a service takes a session value rather than a request, `src/db/repository.ts` is the only query author, audit columns reference users by id, and there are no server actions. What blocked a split was the layout, not the rules. `src/db/schema`, `src/services`, `src/graphql/schema` and `src/graphql/loaders` each mixed every domain, so no unit could be lifted out, and nothing said which code owned which table. At six services and one GraphQL field the move costs an afternoon; after Wave 8 adds the real services it costs a wave.

## The five modules

| Module        | Owns                                                                                                                              | May import                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `identity`    | `users`, `sessions`, `accounts`, `verifications`; later `admin_invitations`                                                       | nothing                                          |
| `coven`       | `workspaces`, `workspace_members`, `workspace_invitations`                                                                        | `identity`                                       |
| `vocabulary`  | `category_groups`, `categories`, `ingredient_form_groups`, `ingredient_forms`                                                     | `identity`                                       |
| `ingredients` | `ingredients` (both tiers), `ingredient_folk_names`, `ingredient_categories`, `inventory_items`; later `retired_ingredient_slugs` | `identity`, `coven`, `vocabulary`                |
| `grimoire`    | `spells`, `spell_ingredients`, `spell_categories`                                                                                 | `identity`, `coven`, `vocabulary`, `ingredients` |

**Why these five.** The cut follows two things that already existed. The first is the foreign-key graph: every table has exactly one owner, and an edge in the table above is exactly a foreign key or a service call that already crosses in that direction — `spell_ingredients` references `ingredients`, `ingredients` references `workspaces` and `categories`, everything references `users` through the audit stamps. Drawn that way the graph is acyclic without any table being moved, which is the test of a cut being real rather than imposed. The second is the project's vocabulary: CLAUDE.md's three nouns — Compendium, Ingredients, Grimoire — are what a user sees, and `identity` and `coven` are the two things a user is a member of. A module named from a noun the codebase already uses consistently is one nobody has to learn.

**Why the compendium is a tier, not a module.** The compendium and a workspace's ingredients share one table, one identity model (formal name plus form), one search component and one detail page, and the local-beats-compendium resolution reads both in one statement. A `compendium` module would own no table of its own and would import everything `ingredients` owns; the boundary between them would be a line on a diagram that no import could respect. So the compendium is an access path inside `ingredients` — the `workspace_id IS NULL` tier — and the future extraction unit for a reference-data service is that tier plus `vocabulary`. What makes that extraction countable rather than notional is the seam pinned below.

**Why the public surface is the index plus the schema files.** A module's `index.ts` is its behaviour surface: the services, the types, the GraphQL refs and the loader factories it means to offer. Its `schema/*.ts` files are public as well, and for a reason rather than for convenience: the seed, the repository, drizzle-kit and a cross-module foreign key all need a table object without loading a service, and every service carries `import 'server-only'`, which the seed's `tsx` runtime cannot resolve. A table object is inert without the database client or a runtime `drizzle-orm`, both already banned above the database layer, so letting a page import one leaks nothing. `services/`, `graphql/` and `loaders/` are internal. This replaced the plan's list of pinned infrastructure exceptions: what looked like exceptions were schema imports, and the two type imports (`Membership`, `WorkspaceRole`) come from `@/modules/coven`'s index.

## What it rules out

### Splitting `ingredients` into two tables

The obvious shape for a "compendium module" is a `compendium_entries` table beside a workspace-scoped `ingredients` table. It was considered at length and rejected, because the costs are large, immediate and structural, and what it buys is small:

- **Every referrer doubles its foreign keys.** `spell_ingredients`, `inventory_items`, `ingredient_folk_names`, `ingredient_categories`, MB.81's `retired_ingredient_slugs`, and v2's notes each gain a second nullable reference and a check that exactly one is set. MB.40's `num_nonnulls` constraint on `spell_ingredients`, today a two-way choice between an ingredient reference and a custom name, becomes three-way.
- **The identity machinery forks.** `canonical_key`, its three checks, the trigram index, the nomenclature biconditional, the `updated_at` trigger line and the nine tests that pin them all exist twice, and the partial unique indexes that reserve an identity have to be reasoned about across two tables.
- **The merged list becomes a union.** The two-tier list a workspace sees — its own entries over the compendium's — is one query with one sort key today. Over two tables it is a paged union, which the M3.6 keyset helper does not page: a cursor encodes one sort key and one id from one table.
- **One id space becomes two.** `/ingredients/[id]`, the GraphQL `Ingredient` type and every loader keyed by ingredient id would need a discriminator, or two routes, two types and two loaders.
- **It reverses a recorded decision and cuts across scheduled work.** DESIGN.md §5's "one table, two tiers" is argued there; MB.81 and MB.82 (the slug), M5.5 (the admin form) and M8.19 (the detail page) are all specified against one table.
- **It is destructive DDL and its own table task**, under the table-then-behaviour rule, and a contract migration on a table the seeds already fill.

What the split buys is one thing: at extraction time, the reference-data service would not have to carry a `WHERE workspace_id IS NULL` on its reads. That is a filter a finder already applies by shape, the way soft-delete filtering is applied. The real extraction cost is the cross-tier reads — the merged list, the local-beats-compendium resolution, the suggestions that draw from both — and those are identical under both designs, because they are joins between the tiers whichever tables the tiers sit in. So the design keeps one table and makes the cross-tier reads a countable set: `TIER_SEAM` in `tests/guards/module-boundaries.test.ts` must name every exported repository finder whose SQL reads the compendium tier. It is empty today; M4.5, M5.1 and Wave 12's tasks add to it, each in its own PR.

### npm workspace packages

A `packages/*` layout with one `package.json` per module gives a physical boundary that the module resolver enforces. It was deferred, not rejected: it would touch every guard, every glob, the `@/` alias, the coverage include, the Vitest projects and the Docker image, for a boundary that `no-restricted-imports` plus a guard test already draws with the same precision. The day a module is actually being extracted, turning its directory into a package is the first step of that task, and nothing done here has to be undone for it.

## What the move surfaced

drizzle-kit loads its schema glob one file at a time, so with the tables in five directories any schema file could be the first module evaluated — and the first one, alphabetically, reached `src/db/audit.ts` before `users`. That is the `users` ↔ `audit.ts` cycle the seed's import-order rule existed to dodge (db.md, "The seed module", and MB.60, where the repository entering from the wrong end built `users` with no stamps and every write to it went out unstamped, silently). One directory had hidden it: `auth.ts` sorted first and happened to import `users` before anything else. Ordering every schema file by hand would have been the boilerplate every new table copies. Instead the cycle is removed: `audit.ts` exports factories that take a thunk to `users.id` and imports nothing from a module, and the column instances are built beside `users` in the identity module and imported from there. The ordering rule, its comments and its two doc paragraphs are gone with it.

## What a future extraction replaces

Three things are in-process today and would become calls across a boundary. Each is named so the extraction task can find it rather than discover it:

- **The `TIER_SEAM` finders.** Every repository export named in the allowlist reads the compendium tier, and each becomes either a call to the reference-data service or a local copy of published reference data. The list is the scope of that task.
- **The cross-module joins.** A spell's derived categories are the union of its ingredients' categories: a join from `spell_ingredients` through `ingredients` to `ingredient_categories`, which is `grimoire` reading `ingredients`' tables in one statement under the `Membership` proof. Across services that becomes a batched request to `ingredients` for the categories of a list of ingredient ids — a loader, by rule 9 — and the same shape holds for any finder that reaches another module's table.
- **The `Membership` proof.** `assertMembership` returns a branded `{ workspaceId, userId, role }` that only the membership service can construct, and every workspace-scoped finder demands it. The brand is a compile-time fact, which is exactly what a network boundary erases: a callee cannot trust a type it did not check. The equivalent across services is a short-lived signed token minted by `coven` carrying the same three fields, verified by the callee before it scopes its query. Same guarantee, exchanged at runtime instead of erased at compile time.

## Not in this task

Recorded here so they are follow-ups rather than omissions:

- **The spell finders stay in the repository.** `findManySpells`, `findOneSpell` and `findManyInSpell` belong in `grimoire`, but `tests/guards/soft-delete-finder-guard.test.ts` pins the repository's export list and moving them is a behaviour task of its own.
- **No central `env` module.** `src/lib/auth.ts` still throws at import on a missing variable; a validated `env.ts` that every module reads is a separate task.
- **Seeds stay in `src/db/seed/`.** The seed is the one legitimately cross-domain composer; per-module seeds composed by it are a later shape, if scenarios grow enough to want it.
- **No GraphQL federation.** One builder, one schema, one endpoint; a module registers on the shared builder. Federation is the transport a real extraction would choose, and choosing it earlier buys nothing.
