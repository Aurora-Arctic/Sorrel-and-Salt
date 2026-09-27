# Restructure `src/` into a modular monolith (new MB task)

## Context

The question was how to change the project's structure so a later move to microservices is a transport change rather than a rewrite. The surveys found that the existing rules already give most of a modular monolith: services take a session value rather than a request, `src/db/repository.ts` is the only query author, audit columns reference users by id, and there are no server actions. What blocks a split is not the rules but the **layout**: `src/db/schema`, `src/services`, `src/graphql/schema` and `src/graphql/loaders` each mix every domain, so no unit could be lifted out, and nothing says which module owns which table.

The code is small now (about 6,000 lines, six services, one GraphQL field, no loaders) and Wave 8 starts adding the real services. The move is cheap before that and expensive after.

**Decisions taken with the user:**

- **Keep one `ingredients` table.** Splitting it doubles every referrer's foreign keys, forks the identity machinery, makes the merged two-tier list a paged union the M3.6 helper cannot page, and reverses a recorded DESIGN.md §5 decision, while moving almost none of the extraction cost forward. Instead the cross-tier reads become a countable, guarded set.
- **Directories plus lint, not npm workspace packages.** Packages would touch every guard, glob and alias for no boundary that a lint rule plus a guard test cannot give.
- **Deliverable is a decision record plus the actual restructure**, as one new MB task on a new branch off `origin/staging`. No commit, push or PR unless the user asks.

## Target shape

Five modules, named from the project's own vocabulary and cut along the foreign-key graph. Every table has exactly one owner.

| Module        | Owns (tables)                                                                                                                      | Owns (code today)                                                       | May import (modules)                     |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------- |
| `identity`    | `users`, `sessions`, `accounts`, `verifications` (later `admin_invitations`)                                                       | `admin-role.ts`, `provisional-accounts.ts`, `workshop-access.ts`        | none                                     |
| `coven`       | `workspaces`, `workspace_members`, `workspace_invitations`                                                                         | `membership.ts`, `access-control.ts`                                    | identity                                 |
| `vocabulary`  | `category_groups`, `categories`, `ingredient_form_groups`, `ingredient_forms`                                                      | (schema only today)                                                     | identity                                 |
| `ingredients` | `ingredients` (both tiers), `ingredient_folk_names`, `ingredient_categories`, `inventory_items` (later `retired_ingredient_slugs`) | schema, `lib/units.ts` (the one module that owns the units, db.md M9.2) | identity, coven, vocabulary              |
| `grimoire`    | `spells`, `spell_ingredients`, `spell_categories`                                                                                  | `spell-visibility.ts`                                                   | identity, coven, vocabulary, ingredients |

The compendium is a **tier and an access path inside `ingredients`**, not a module: the two tiers share one table, one identity model, one search component and one detail page, so a module boundary between them would be fictional. The extraction unit for a future "reference data" service is the compendium tier plus `vocabulary`, and the seam is pinned (below).

Layout per module:

```
src/modules/<name>/
  index.ts        # the public surface: tables, service functions, types, GraphQL refs, loader factories
  schema/*.ts     # Drizzle tables (moved from src/db/schema/)
  services/*.ts   # authorization + business logic (moved from src/services/)
  graphql/*.ts    # Pothos types and fields registered on the shared builder (empty today except where noted)
  loaders/*.ts    # defineLoader factories (empty today)
```

What stays where it is, as infrastructure and host:

- `src/db/` — `connection.ts`, `repository.ts`, `audit.ts`, `bootstrap.ts`, `migrations/`, `seed/`. The seed stays: it is the one legitimately cross-domain composer and reaches tables through module indexes.
- `src/graphql/` — `builder.ts`, `context.ts`, `pagination.ts`, `armor.ts`, `altair.ts`, `loaders/define-loader.ts`, `loaders/index.ts` (composes module factories), `schema/index.ts` (imports each module's `graphql/` for registration, then `toSchema()`), `schema/audit.ts` (cross-cutting `AuditInfo`), `schema.graphql`.
- `src/lib/` — the host: `auth.ts` (Better Auth composition, imports identity services), `request-session.ts`, `session.ts`, `auth-client.ts`, `sign-in.ts`, `social-providers*.ts`, `mail.ts`, `errors.ts`, `slugify.ts` (pinned by `tests/guards/slug-rule.test.ts`, do not move), `pagination.ts`.
- `src/app/`, `src/components/`, `src/emails/`, `src/scss/`, `src/proxy.ts` — presentation.

## Boundary rules (the mechanism plus its guard, per the sweep-task rule)

1. **Cross-module imports go through `@/modules/<name>` only.** No deep import of another module's `schema/`, `services/`, `graphql/` or `loaders/`. Relative imports never leave a module directory.
2. **The dependency graph is the table above and is acyclic.** `identity` imports no module; `grimoire` may import all four others.
3. **Infrastructure and host (`src/db`, `src/graphql`, `src/lib`, `src/app`, `src/components`, `src/proxy.ts`) import module indexes only.** Pinned exceptions, each named in the guard: `src/db/audit.ts` and `src/db/repository.ts` import `identity/schema/users` directly (the users ↔ audit cycle is entered through `audit.ts` and a barrel would change evaluation order); `repository.ts` also imports `accounts`, `spells`, `workspaceMembers` for `deleteProvisionalUsers`, `readableSpells` and `findWorkspaceRole`, and its type-only `Membership`/`WorkspaceRole` imports come from `@/modules/coven`.
4. **The ingredient tier seam is enumerated.** A repository export whose SQL reads the compendium tier (`workspace_id is null` / `isNull(workspaceId)`) or reads both tiers in one statement must appear in a `TIER_SEAM` allowlist in the guard. Empty today; M4.5/M5.1/M8.x add to it. This is what makes the future extraction point countable.

Enforcement, two layers like every other boundary here:

- **Lint (fast feedback):** one `.oxlintrc.json` override per module (`src/modules/<X>/**/*.ts`) restricting the other four modules' deep paths: `**/modules/<Y>/*` and `**/modules/<Y>/**` for each `Y ≠ X`. Neither pattern matches the bare `@/modules/<Y>` index import, so no `!` negation is needed. Plus one override for `src/{app,components,graphql,lib}/**` restricting `**/modules/*/*` and `**/modules/*/**`. The existing `src/services/**/*.ts` override becomes `src/modules/*/services/**/*.ts`.
- **Guard test (precise):** new `tests/guards/module-boundaries.test.ts`, in the style of `tests/guards/slug-rule.test.ts` (scans `git ls-files` plus untracked files under `src/`): parses import specifiers, resolves relative and `@/` forms to a path, and asserts (a) any import resolving into a different module resolves exactly to its `index.ts`, (b) the module-to-module edges are a subset of the allowed graph, (c) the infrastructure exceptions are exactly the pinned list, (d) rule 4's `TIER_SEAM` pin over `src/db/repository.ts` text, in the style of `tests/guards/soft-delete-finder-guard.test.ts`.

## Files to move (with `git mv`, so history follows)

Pattern: `src/db/schema/<t>.ts → src/modules/<owner>/schema/<t>.ts`; `src/services/<s>.ts → src/modules/<owner>/services/<s>.ts`. Representative:

- `src/db/schema/users.ts`, `auth.ts` → `src/modules/identity/schema/`
- `src/db/schema/workspaces.ts`, `workspace-invitations.ts` → `src/modules/coven/schema/`
- `src/db/schema/categories.ts`, `ingredient-forms.ts` → `src/modules/vocabulary/schema/`
- `src/db/schema/ingredients.ts`, `ingredient-folk-names.ts`, `ingredient-categories.ts`, `inventory-items.ts` → `src/modules/ingredients/schema/`; `src/lib/units.ts` → `src/modules/ingredients/units.ts`
- `src/db/schema/spells.ts`, `spell-ingredients.ts`, `spell-categories.ts` → `src/modules/grimoire/schema/`
- `src/services/membership.ts`, `access-control.ts` → `src/modules/coven/services/`; `spell-visibility.ts` → `grimoire/services/`; `admin-role.ts`, `provisional-accounts.ts`, `workshop-access.ts` → `identity/services/`
- New: five `src/modules/<name>/index.ts` barrels; `src/modules/README.md` is not needed, the doc is `claude-docs/modules.md`.

Tests mirror the move (MB.41: `tests/` mirrors `src/`): `tests/db/<t>-schema.test.ts` and `tests/services/*.test.ts` → `tests/modules/<owner>/…`. Infrastructure tests stay in `tests/db/` (repository, audit, seed, trigger, isolation, pagination, workspace-isolation, spell-visibility if it tests the finder). `tests/db/inventory-items-schema.test.ts` has a literal `src/db/schema/inventory-items.ts` path to update.

## Import-path updates (mechanical, `@/modules/...`)

- `src/db/audit.ts`, `src/db/repository.ts`, `src/db/seed/*.ts`, `src/lib/auth.ts`, `src/lib/session.ts`, `src/proxy.ts`, `src/graphql/loaders/index.ts` (add the composition of module loader maps), `src/graphql/schema/index.ts` (import module `graphql/` registrations).
- Every test importing `@/db/schema/*`, `@/services/*`, `@/lib/units`.
- `tests/support/as-user.ts` and `tests/support/fixtures/*` (`@/db/schema/...` → module indexes).

## Config and guard edits

- `drizzle.config.ts`: `schema: './src/modules/*/schema/*.ts'`. **Must produce no migration**: `npm run db:generate` reports no changes and `src/db/migrations/` is unchanged in the diff.
- `.oxlintrc.json`: as in the boundary rules above.
- `vitest.config.mts`: `db` project include adds `tests/modules/**/*.test.ts`; `unit` project exclude adds `tests/modules/**`. Coverage include (`src/**`) unchanged.
- `tests/guards/lint-service-session-boundary.test.ts`: `PROBE_DIR` → `src/modules/coven/services/__lint-probe-session__`.
- `tests/guards/lint-db-client-boundary.test.ts`: `RESTRICTED` adds `src/modules`; `CLIENT_EXEMPT` unchanged.
- `tests/guards/lint-loader-boundary.test.ts`: `PROBE_DIRS` swaps `src/services/…` for `src/modules/grimoire/loaders/…`.
- `.gitignore`'s `__lint-probe*__/` already covers the new probe locations.

## Docs (corrected in the PR that makes them wrong)

- New `claude-docs/design-decisions/mb.NN-modular-monolith.md`: what was decided, the five modules and why these five, why the compendium is a tier not a module, why the table is not split (the downsides list from this session), why directories not packages, the pinned exceptions, and what a future extraction would replace (the `TIER_SEAM` finders, the cross-module joins, the `Membership` proof becoming a signed token minted by `coven`). Status line, date.
- Copy this plan to `claude-docs/design-decisions/mb.NN-plan.md` (user's standing preference).
- New `claude-docs/modules.md` summary: the layout, the ownership table, the boundary rules, how to add a module or a table. Link from `claude-docs/README.md`.
- `CLAUDE.md`: rule 1 (`src/services/` → `src/modules/*/services/`), rule 2's lint override path, rule 9's loader registration path, a new short **Modules** convention pointing at `claude-docs/modules.md`. Fix the two stale lines noticed on the way: "Port, don't rewrite from memory" and the `resume-2026` standing rule (user memory says everything is new).
- `claude-docs/DESIGN.md` §3 tree (the design doc wins, so fix it in the same PR).
- `claude-docs/db.md`, `graphql.md`, `auth.md`, `testing.md`: only the path references that move (`src/services/`, `src/db/schema/`, `src/graphql/schema/`, `src/graphql/loaders/index.ts`); no re-argument.
- `claude-docs/TASKS.md`: new MB entry (estimate about 4–5h and say so in the entry), added to the Wave 7 list after MB.80; Asana card in `Bugfixes` and in the Wave 7 card's notes.

## Explicitly not in this task (recorded in the decision record as follow-ups)

- Splitting the `ingredients` table (rejected, argued above).
- npm workspace packages (deferred until a module is actually being extracted).
- Pushing the spell-specific finders (`findManySpells`, `findOneSpell`, `findManyInSpell`) down into `grimoire`: the soft-delete guard pins the repository's export list and this is a separate behaviour task.
- A validated central `env.ts` (`lib/auth.ts` throws at import today); per-module seeds; GraphQL federation.

## Execution order

1. Re-check the next free MB id on the board and in TASKS.md (MB.85 is the last today; peer sessions mint concurrently), mint it, run `/create-feature` off `origin/staging` (which has moved past this branch to M3.7's merge).
2. Write the failing guard first: `tests/guards/module-boundaries.test.ts` with the allowed graph, exceptions and `TIER_SEAM = []`. Watch it fail on the current layout.
3. `git mv` schema, services, units and their tests; create the five `index.ts` barrels; update imports; wire `graphql/schema/index.ts` and `loaders/index.ts` composition.
4. `.oxlintrc.json`, `drizzle.config.ts`, `vitest.config.mts`, the three lint guards.
5. Docs, decision record, plan copy, TASKS.md, CLAUDE.md, DESIGN.md §3.

## Verification

- `npm run db:generate` → "No schema changes", `git status` shows nothing new under `src/db/migrations/`.
- `npm run lint`, `npm run typecheck`, `npm run format:check`.
- `npm run test:coverage` green with the 80% threshold (the `db` project must pick up `tests/modules/**`; confirm by count of test files before and after the move).
- `npm run test:stories` still lists 51 stories and `01-accounts` passes.
- `npm run build` (RSC graph: `lib/auth.ts` now imports `@/modules/identity`; Vitest green is not build green).
- `npm run workshop:build` unaffected but run in CI's `build` leg anyway.
- Guard proof: temporarily add a deep import `@/modules/coven/services/membership` inside `src/modules/grimoire/services/spell-visibility.ts` and confirm both `npm run lint` and the new guard fail, then revert.
- `npm run e2e` if Docker is available on the host; otherwise note it as run in CI.

## Amendments during execution

The plan above is the one approved, verbatim. Eight things changed while it was carried out; the record ([`mb.86-modular-monolith.md`](mb.86-modular-monolith.md)) and the summary ([`../modules.md`](../modules.md)) describe the shape as built.

1. **Stacked on M3.9, not on `staging`.** The branch is based on `feature/m3.9-lint-rules-enforcing-access-boundary` (PR #187, in review): M3.9 adds `import 'server-only'` to every service and two guards (`tests/guards/lint-access-boundary.test.ts`, `tests/guards/server-only-services.test.ts`) that name `src/services`. MB.86 adopts the marker and re-points those guards at `src/modules/*/services`.
2. **A module's public surface is its `index.ts` plus its `schema/*.ts` files**; `services/`, `graphql/` and `loaders/` are internal. Schema is public because the seed, the repository, drizzle-kit and cross-module foreign keys must reach a table without loading a service — a service carries `server-only`, which the seed's `tsx` runtime cannot resolve — and a table object is inert without the client or runtime `drizzle-orm`, both already banned above the database layer. So the plan's "pinned infrastructure exceptions" are not needed: the repository's `users`/`accounts`/`spells`/`workspaceMembers` imports and `audit.ts`'s `users` import are schema imports, and the `Membership`/`WorkspaceRole` type imports come from `@/modules/coven`'s index.
3. **Import conventions.** Cross-module behaviour imports use the `@/modules/<name>` alias — the first use of the alias inside `src/`. The drizzle-kit-reachable graph (schema files, `src/db/audit.ts`, `schema/units.ts`) uses relative paths, because drizzle-kit's loader may not honour tsconfig paths. Intra-module imports are relative.
4. **`src/lib/units.ts` moves to `src/modules/ingredients/schema/units.ts`**, not `src/modules/ingredients/units.ts`: the tables are built from it, so it sits in the drizzle-kit graph.
5. **Lint is one pattern group, not one override per module.** A single `no-restricted-imports` group bans `@/modules/*/services`, `…/services/**`, `…/graphql`, `…/graphql/**`, `…/loaders` and `…/loaders/**`, restated in every override; the services override's glob becomes `src/modules/*/services/**/*.ts`; the db-layer override gains `src/modules/*/schema/**/*.ts`. The guard `tests/guards/module-boundaries.test.ts` resolves both alias and relative specifiers and enforces: the public-surface rule; the allowed edge set (identity → none; coven → identity; vocabulary → identity; ingredients → identity, coven, vocabulary; grimoire → all four); the no-presentation rule (a module never imports `src/app`, `src/components`, `src/emails` or `src/proxy`); a fixed module roster; and the `TIER_SEAM` allowlist over `src/db/repository.ts` — any exported finder reading `workspace_id is null` / `isNull(workspaceId)` must be named there; empty today.
6. **Tests mirror the move**: `tests/modules/<name>/schema/*.test.ts` and `tests/modules/<name>/services/*.test.ts`, with the Vitest `db` project including `tests/modules/**`; `tests/db/support/` becomes `tests/support/db/`; `tests/rsc/services/` becomes `tests/rsc/modules/coven/`; `tests/lib/units.test.ts` becomes `tests/modules/ingredients/schema/units.test.ts`.
7. **Estimate: about 5h**, stated in the TASKS.md entry, since a task larger than a sitting says so in its own entry.
8. **The `users` ↔ `audit.ts` import cycle is gone.** drizzle-kit loads the schema glob file by file, so any schema file can be the first module evaluated, and the first one (`coven/schema/workspace-invitations.ts`) reached `src/db/audit.ts` before `users` and hit the cycle the seed's import-order rule existed to dodge. Rather than hand every schema file the ordering, `audit.ts` now exports factories (`auditStampColumnsReferencing`, `deletionColumnsReferencing`) that take a thunk to `users.id`, and the instances `auditStampColumns` and `auditColumns` are built and exported beside `users` in `src/modules/identity/schema/users.ts`. Every table imports them from there; `audit.ts` imports nothing from a module; the seed and repository import-order rules and their comments are removed.
