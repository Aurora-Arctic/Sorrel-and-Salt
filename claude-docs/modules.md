# Modules

`src/` is a modular monolith (MB.86). Five domain modules under `src/modules/`
own every table and every service; the database layer, the GraphQL host, `lib`
and the presentation tree are infrastructure that composes them. A module has a
public surface, an allowed set of modules it may import, and two lint
mechanisms — a path glob and a plugin rule — that make a boundary crossing fail in the diff that
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
`graphql/` path, which is internal. `identity` has `User`, `me`, the admin user list's `users` connection and the
`providersByUser` loader; `coven` has
`Workspace`, `WorkspaceMember`, the `membershipsByUser` loader and the
`User.memberships` field; `vocabulary` has `CorrespondenceSuggestion`,
`FormSuggestion`, `DeitySuggestion`, `SuggestionClaimant` and the
`celestialBodySuggestions`, `zodiacSuggestions`, `formSuggestions` and
`deitySuggestions` connections, and `Deity` and `DeityTradition` with the
`deityTraditionsById` and `ingredientFormsById` loaders (MB.167) and the
`otherNamesByDeity` loader (M14.23); `ingredients` has
`Ingredient`, `IngredientDeity` and `IngredientDeityInput`, the `compendium`, `ingredient`, `possibleDuplicates` and
`ingredientSuggestions` queries,
the workspace ingredient mutations, the compendium's three (M5.5), and `CommonNameSuggestion` and
`commonNameSuggestions`, whose claimants reuse `vocabulary`'s
`SuggestionClaimant` — the edge runs that way round — plus the
`categoriesByIngredient`, `folkNamesByIngredient`, `substitutesByIngredient` and
`deitiesByIngredient` loaders. A field on another module's type is added from the module allowed to
import it — `memberships` lives in `coven` because `identity` imports
nothing.

What stays outside a module, and why:

- **`src/db/`** — `connection.ts`, `repository/`, `audit.ts`, `bootstrap.ts`,
  `vocabularies.ts`, `migrations/`, `seed/`. The repository is the one query
  author for every module (CLAUDE.md rules 2 and 4), so it is shared rather
  than owned. The seed is the one legitimately cross-domain composer and
  reaches tables through the modules' schema files. `vocabularies.ts` lists
  the curated vocabularies by shape, two-tier and flat, for both of them to
  read (MB.208): tables and types, no client.
- **`src/graphql/`** — the builder, the context, pagination, armor, Altair,
  `loaders/define-loader.ts`, `schema/audit.ts` (the cross-cutting
  `AuditInfo`), a `types.ts` beside each of the three, the printed SDL, and the two composition points:
  `schema/index.ts` and `loaders/index.ts`.
- **`src/lib/`** — the host and the pure functions: `auth.ts` (Better Auth
  composition), the session helpers, `mail.ts`, `errors.ts`, `slugify.ts`
  (pinned there by a `no-restricted-imports` path in `.oxlintrc.json`),
  `pagination.ts`.
- **`src/app/`, `src/components/`, `src/emails/`, `src/scss/`, `src/proxy.ts`**
  — presentation. A module never imports any of them.

## Ownership

Every table has exactly one owner. The services column is what exists today;
a service lands in the module that owns the table it writes.

| Module        | Tables                                                                                                                                                                                                                                                         | Services today                                                                                                                                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `identity`    | `users`, `user_privilege_changes`, `admin_role_change_pauses`, `sessions`, `accounts`, `verifications`, `rate_limits`                                                                                                                                          | `admin-role.ts`, `admin-changes.ts`, `profile.ts`, `provisional-accounts.ts`, `workshop-access.ts`                                                                                                                         |
| `coven`       | `workspaces`, `workspace_members`, `invitations` (both tiers, MB.201)                                                                                                                                                                                          | `membership.ts`, `memberships.ts`, `access-control.ts`                                                                                                                                                                     |
| `vocabulary`  | `category_groups`, `categories`, `ingredient_form_groups`, `ingredient_forms`, `celestial_bodies`, `zodiac_signs`, `deity_traditions`, `deities` (MB.128)                                                                                                      | `categories.ts`, `category-groups.ts`, `ingredient-form-values.ts`, `ingredient-form-groups.ts`, `groups.ts`, `curated-values.ts`, `curated-writes.ts`, `curated-lists.ts`, `held-entries.ts`, `suggestions.ts`            |
| `ingredients` | `ingredients` (both tiers), `ingredient_folk_names`, `ingredient_substitutes`, `ingredient_deities`, `ingredient_categories`, `inventory_items`, `retired_ingredient_slugs`, `workspace_compendium_entries` (M12.13); `references`, `reference_links` (MB.152) | `duplicates.ts`, `common-names.ts`, `ingredient-children.ts`, `workspace-ingredients.ts`, `cupboard-entries.ts` (M12.14); `schema/units.ts` is the unit vocabulary                                                         |
| `grimoire`    | `spells`, `spell_steps`, `spell_categories`                                                                                                                                                                                                                    | `spell-visibility.ts`, `spells.ts` (M10.5), `validation/categories/summarize.ts` (M10.7, pure, browser-safe), `validation/categories/compare.ts` (M10.8, pure, browser-safe), `spell-reads.ts` and `step-views.ts` (M10.9) |

**The compendium is a tier inside `ingredients`, not a module**: the
`workspace_id IS NULL` tier of the one table, reached through `ingredients`'
services, because a module of its own would own no table and import
everything `ingredients` owns
([`design-decisions/mb.86-modular-monolith.md`](design-decisions/mb.86-modular-monolith.md),
"The five modules"; splitting the table is under its "What it rules out").
The reads that cross the tiers are the seam below.

**`references` and `reference_links` are `ingredients`' too** (MB.151), though
the links reach vocabulary rows as well as ingredients. The link table keys
into `ingredients`, which `vocabulary` may not import, and an ingredient's
links are written inside the ingredient's own `withAudit` transaction, which
a module above `ingredients` could not be called from without a cycle. So a
vocabulary row's references are read from `ingredients`, as `User.memberships`
is added from `coven`, and the compendium-tier rows belong to the tier seam's
extraction unit
([`design-decisions/mb.151-references.md`](design-decisions/mb.151-references.md)).

**`invitations` is `coven`'s, both tiers** (MB.201). A row with a null
workspace and role is a site-tier invitation, which grants admin. The table
sits with the workspace it mostly names because its foreign key needs
`workspaces`, and `coven` imports `identity`, never the reverse. The admin
tier reaches it as admin curation reaches `ingredients`: `identity`'s
site-tier service calls the repository's named writes and finders under the
`SiteAdmin` proof, and imports nothing of `coven`'s
([`design-decisions/mb.201-two-tier-invitations.md`](design-decisions/mb.201-two-tier-invitations.md)).
The two tables it replaced, `workspace_invitations` and `admin_invitations`,
were undeclared by MB.202 and dropped by MB.203.

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
  dependency-free files such as `schema/units.ts`, nothing else, and a
  `.oxlintrc.json` override fails a runtime import of `server-only`,
  `postgres`, `drizzle-orm`, `src/db` or a service from one
  ([`validation.md`](validation.md)).

`services/`, `graphql/`, `loaders/` and `types.ts` are internal. A deep import
of any of them from outside the module is a boundary violation, whatever the importer.

## Shared steps inside a module

A step several services of one module repeat lives once in a service file
the index does not re-export, and each service calls it between its own
checks (MB.210, on the owner's call for shared steps over a descriptor
factory): every exported service keeps its function, its JSDoc, and its own
`assertSiteAdmin(` and `expireCompendium()`, so a reader sees the
check and the expiry in the service they guard.

- **`vocabulary/services/curated-writes.ts`** — a curated write's steps,
  each taking the table's `CuratedVocabulary` descriptor (`types.ts`):
  `refuseSlugCollision`, `liveRow` for an id that may name nothing,
  `parseUnderLiveParent` for a row filed under a group, and a group's
  `moveTarget`, `updateGroup` and `deleteGroup`, built on
  `group-moves.ts` and a `CuratedGroup` whose `members` are the `MovedRows`
  it moves — their column, their slug rule, and the walk that reads them.
- **`vocabulary/services/curated-lists.ts`** — `readableFilter` and
  `cachedFilteredList`, the list and count of a vocabulary filtered by a
  group. Each service still spells its own two cache keys, which
  [`db/compendium-cache.md`](db/compendium-cache.md) lists.
- **`vocabulary/services/held-entries.ts`** — `refuseWhileHeld`, a delete
  refused while live compendium entries hold the row; `describeEntry`, the
  one way a refusal names an entry, its label unquoted; and
  `redirectRefusal`, a write ending other entries' redirects. The index
  re-exports the last two for the compendium's service.
- **`identity/services/admin-changes.ts`** — `liveUser`,
  `adminDeclaration`, and `isSiteAdmin` and `refuseBatch` for a batch
  answered slot by slot; `admin-role-pause.ts`'s `assertAdminChangesOpen`
  is the site-role check and the pause in one call.

What no module owns is in `src/lib/`: `allPages` in `pagination.ts`, every
walk over a finder's pages; `plural`, `joinAnd` and `addressTaken` in
`text.ts`, the English a refusal is phrased in; `inIdOrder` in
`in-id-order.ts`, a batch answered in its ids' order. `coven` exports
`readersOf` for every read of the compendium and, optionally, one coven. A
service writing its own slug-collision refusal, move target, `describeEntry`
or page walk is a review finding: MB.224 retired the guard that pinned the
call sites, since it tested where code lives, not what it does.

## The boundary

Three import conventions, each chosen for a reason the alternative lacks:

- **Cross-module behaviour imports use `@/modules/<name>`** — the index, by
  alias. This is the first use of the `@/` alias inside `src/`; the alias is
  what lets one lint glob name every cross-module import.
- **The drizzle-kit-reachable graph uses relative paths.** A schema file
  reaches another schema file, `schema/units.ts`, `src/db/audit.ts` or
  `src/db/table-marks.ts` by a relative path — `../../identity/schema/users`
  — because drizzle-kit loads the schema glob with its own loader, which may
  not honour tsconfig paths.
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
direction. A new edge is a design change: add it to `ALLOWED` in `lint/sorrel-lint.js` in
the same PR and say why in the PR body.

**A module never imports presentation** — `src/app`, `src/components`,
`src/emails`, `src/proxy`. The direction is one way: presentation composes
modules.

### Enforcement

Two lint layers, a path glob for the alias and a plugin rule for the
relative spellings a glob cannot judge (MB.224, which retired the guard that
scanned the import graph on every test run):

- **Lint.** `.oxlintrc.json` carries one `no-restricted-imports` pattern group
  banning `@/modules/*/services`, `@/modules/*/services/**`,
  `@/modules/*/graphql`, `@/modules/*/graphql/**`, `@/modules/*/loaders`,
  `@/modules/*/loaders/**` and `@/modules/*/types`. It is restated in every override, because an
  override replaces the top-level rule rather than merging with it
  ([`db/query-building.md`](db/query-building.md), "Where queries may be
  built"). The bare `@/modules/<name>` index import matches none of the
  patterns, so no negation is needed. The lint sees only the alias spelling.
- **Plugin rule.** `sorrel/module-boundaries` in `lint/sorrel-lint.js`
  resolves every alias and relative specifier in a file under `src/` to a
  path, and fails an import into another module that lands on anything but its
  `index.ts`, a `schema/*.ts` file or a `validation/*.ts` file; a
  module-to-module edge its `ALLOWED` map does not name; a module importing
  presentation; and an import into `src/db/repository/` other than its index.
  `import/no-cycle` fails a cycle between files anywhere, the repository
  included since MB.231.
  A type-only import counts exactly like a runtime one: `import type` is
  erased at compile time but couples to the file all the same, and the index
  exports the type too.

Lint's `sorrel/service-server-only` holds every file under
`src/modules/*/services` to its `import 'server-only'`. The
`.oxlintrc.json` override that bans a service from reading a request
(`next/headers`, `lib/auth`, `lib/request-session`) matches
`src/modules/*/services/**/*.ts`; the database-layer override that permits a
runtime `drizzle-orm` import covers `src/modules/*/schema/**/*.ts`. A module's
`graphql/` and `loaders/` sit above its services rather than beside them, so
the access-boundary override that bans `src/db` from resolvers and pages
covers `src/modules/*/graphql/**/*.ts` and `src/modules/*/loaders/**/*.ts`
too.

## The tier seam

The compendium's future extraction unit is the compendium tier of
`ingredients` plus `vocabulary`. What would make that extraction a rewrite is
an uncounted set of reads that cross from a workspace's rows into the
compendium's. So the set is counted, here: **this section names every top-level function in
`src/db/repository/` whose SQL reads the compendium tier**, exported or not —
anything calling `inCompendium(…)`, the predicate's one spelling since MB.100,
or one of the builders that read both tiers through it — `inTiers`,
`readableInTiers`, `readableIngredientParent` and `findPageInTiers` with its
count, each the one spelling of its read since MB.206 — or writing
`workspace_id is null` or `isNull(workspaceId)` out by hand, and anything
that reads both tiers in one statement. A predicate is named by the
declaration it is written in, and a private helper under its own name rather
than credited to whichever export happens to sit above it. Review holds the
list since MB.224 retired the guard that pinned it.

The list follows, by file. Nothing checks it, so it states no total that
could go stale: review compares it with the code. "Compendium" in the last column means
the read touches the compendium tier alone; "both" means it reads the
compendium and a coven's rows in one statement.

**The predicate and the builders over it.** Every other entry reads the tier
through one of these.

| Name                       | File                   | Task   | What it is                                                                                   | Reads      |
| -------------------------- | ---------------------- | ------ | -------------------------------------------------------------------------------------------- | ---------- |
| `inCompendium`             | `predicates.ts`        | MB.100 | The predicate itself, `workspace_id IS NULL`                                                 | compendium |
| `inTiers`                  | `predicates.ts`        | MB.206 | The compendium or the proofs' covens                                                         | both       |
| `readableInTiers`          | `predicates.ts`        | MB.206 | `inTiers`, live rows only                                                                    | both       |
| `readableIngredientParent` | `ingredient-parent.ts` | MB.206 | A child row's ingredient is readable                                                         | both       |
| `readableVariantParent`    | `ingredient-parent.ts` | MB.218 | A row one form owns takes its ingredient's tier, through the form                            | both       |
| `inUseIngredientParent`    | `ingredient-parent.ts` | M12.24 | `readableIngredientParent`, or a retired compendium entry the reading coven's cupboard names | both       |
| `inUseVariantParent`       | `ingredient-parent.ts` | M12.24 | The same, through a form                                                                     | both       |
| `findPageInTiers`          | `finders.ts`           | MB.206 | A cursor page (one that resumes from the last row) over `readableInTiers`                    | both       |
| `findPageCountInTiers`     | `finders.ts`           | MB.206 | Its count                                                                                    | both       |

**The functions.**

| Name                                          | File                   | Task           | What it reads                                                                                                                                  | Reads      |
| --------------------------------------------- | ---------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `findSimilarIngredients`                      | `ingredients.ts`       | M4.7           | The fuzzy duplicate match                                                                                                                      | both       |
| `findManyIngredients`                         | `ingredients.ts`       | MB.9           | A loader's batch of ingredients by id                                                                                                          | both       |
| `findOneIngredient`                           | `ingredients.ts`       | M8.5           | One row in the compendium or a proof's coven                                                                                                   | both       |
| `findReadableVariant`                         | `ingredients.ts`       | M9.3           | The form a jar may name; never a retired entry's                                                                                               | both       |
| `findManyOfIngredients`                       | `ingredients.ts`       | M4.8           | An ingredient's folk names and category links                                                                                                  | both       |
| `findManyOfVariants`                          | `ingredients.ts`       | MB.218         | The rows one form of an ingredient owns                                                                                                        | both       |
| `findDeitiesOfIngredients`                    | `ingredients.ts`       | MB.167         | An ingredient's deities                                                                                                                        | both       |
| `findSubstitutesIncludingSoftDeleted`         | `ingredients.ts`       | MB.140         | An ingredient's or a form's substitutes and the ingredients they link, deleted or not                                                          | both       |
| `findIngredientSuggestions`                   | `ingredients.ts`       | MB.138         | The substitute picker's search                                                                                                                 | both       |
| `findCompendiumPage`                          | `ingredients.ts`       | M8.5           | The public list                                                                                                                                | compendium |
| `findCompendiumCount`                         | `ingredients.ts`       | MB.105         | Its count                                                                                                                                      | compendium |
| `findCompendiumEntryByIdentity`               | `ingredients.ts`       | M5.2           | The entry a colliding compendium write names                                                                                                   | compendium |
| `workspaceListScopeIncludingSoftDeleted`      | `ingredients.ts`       | M9.4, M12.32   | Which rows a coven's ingredient list holds, a retired entry its cupboard names included; the coven's page, count and filter counts all read it | both       |
| `listColumns`                                 | `ingredients.ts`       | M12.18         | The cupboard row joined beside a compendium entry, so a coven's overrides sort and filter                                                      | both       |
| `findCompendiumFacets`                        | `ingredient-facets.ts` | M12.3          | The public list's filter counts                                                                                                                | compendium |
| `inCupboard`                                  | `cupboard-entries.ts`  | M12.14         | The private filter under `findCupboardEntry` and `findCupboardEntriesOf`: a cupboard row only while its entry is live                          | both       |
| `findCupboardEntryIncludingSoftDeleted`       | `cupboard-entries.ts`  | M12.24         | The escape hatch that reads a retired entry for a coven whose live cupboard row names it                                                       | both       |
| `compendiumNamed`                             | `cupboard-entries.ts`  | M12.14         | The private match on a typed name or formal name under `findCompendiumMatchesByName` and `findCompendiumMatchPage`                             | compendium |
| `findCompendiumMatchPage`                     | `cupboard-entries.ts`  | M12.20         | Those exact matches as a page, for the Add flow                                                                                                | compendium |
| `countCovensUsing`                            | `cupboard-entries.ts`  | M12.25         | How many covens' cupboards name an entry, a number and never a name                                                                            | both       |
| `findCompendiumEntryBySlug`                   | `slugs.ts`             | MB.82          | The entry at an address                                                                                                                        | compendium |
| `findCompendiumSlugRedirect`                  | `slugs.ts`             | MB.82          | The entry a retired address redirects to                                                                                                       | compendium |
| `findCompendiumSlugs`                         | `slugs.ts`             | MB.84, M12.2   | Every live entry's address, for the sitemap and `llms.txt`                                                                                     | compendium |
| `findManyStock`                               | `stock.ts`             | M9.3, M12.24   | The private read under a coven's jar finders: jars of a readable form, or of a retired entry the coven uses                                    | both       |
| `findIngredientsInSpellsIncludingSoftDeleted` | `spells.ts`            | M5.3           | What a readable spell holds, deleted or not                                                                                                    | both       |
| `findVocabularySuggestions`                   | `vocabularies.ts`      | MB.94, M4.7a   | The celestial body, zodiac and form autofill                                                                                                   | both       |
| `findCompendiumFormRenameClashes`             | `vocabularies.ts`      | MB.220         | The entries a curated form's rename would give two forms of one name                                                                           | compendium |
| `findCommonNameSuggestions`                   | `common-names.ts`      | M4.7a          | The common-name autofill                                                                                                                       | both       |
| `findReferencesOf`                            | `references.ts`        | MB.153, MB.208 | A sourced row's references, each where its readers may look                                                                                    | both       |
| `findManyReferences`                          | `references.ts`        | MB.153         | What a row written under the proofs may cite                                                                                                   | both       |
| `findReferenceSuggestions`                    | `references.ts`        | MB.153         | The reference picker's search                                                                                                                  | both       |
| `cites`                                       | `references.ts`        | MB.218         | A sourced row citing a live compendium reference                                                                                               | compendium |
| `writerFor`                                   | `write.ts`             | M5.2           | The private builder of `withAudit`'s writer (below)                                                                                            | compendium |

Three kinds of caller are deliberately left off, because they reach the tier
only through an entry above. That is the rule for a private helper, applied
the other way round:

- `findCompendiumMatchesByName` reads it through `compendiumNamed`.
- `citesNothing` (MB.153, the admin's to-do filter) and `citesNowhere` in
  `ingredients.ts` are `cites` negated.
- `findWorkspaceIngredientPage`, `findWorkspaceIngredientCount` and
  `findWorkspaceIngredientFacets` read it through
  `workspaceListScopeIncludingSoftDeleted`, as `findCupboardEntry` and
  `findCupboardEntriesOf` read it through `inCupboard`.

`writerFor`'s compendium-tier methods update and soft-delete a row only under
`workspace_id IS NULL`, clear the tier's lapsed slug retirements, and carry a
curated form's rename onto the compendium variants picking it
(`carryFormRename`, M5.6a, MB.220).

A later task that adds such a function adds its row to the tables above in
its own PR. The list is then the scope of the extraction task, read from one
file.

One entry is not the compendium's: `onSiteTier` (MB.202), `invitations`'
site tier, `workspace_id IS NULL` spelled for that table alone so that no
invitation read calls `inCompendium`. It is listed because it spells the
tier's predicate, and the extraction task leaves it behind.

**MB.215: `ingredients` gains `ingredient_variants`.** The table of an ingredient's forms is `ingredients`' own, beside its other children, and `vocabulary` keeps `ingredient_forms`, the names a variant's form is picked from (DESIGN.md §5; MB.216). The vocabulary reaches variants as it reaches ingredients today: MB.220 points `IN_USE.ingredient_forms` and the `formId` filter at variants through the `TWO_TIER` registry, and a form's rename carries onto the compendium variants picking it, through the writer above, where it carried onto entries and moved their slugs. The seam gained MB.218's `readableVariantParent` and `findManyOfVariants`, each reading both tiers; both are in the tables above ([`design-decisions/mb.215-ingredient-variants.md`](design-decisions/mb.215-ingredient-variants.md)).

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
  the six files whose exemptions `lint-db-client-boundary.test.ts` pins may
  import the client, and a types file would be one more.

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
  group and the plugin rule above ban a deep import of it.
- **A validation file's helper types** are in `validation/types.ts`, not the
  module's `types.ts`, which reaches its tables: a validation file loads in the
  browser.
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

This is a convention, held by review over `src/`, `scripts/` and `tests/`:
MB.224 retired the guard MB.109 added, since where a type is declared is no
behaviour a user depends on, and `tsc` and lint catch a type that went
missing in a move.

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

Five things, in one PR:

1. Add the name and its edges to `ALLOWED` in `lint/sorrel-lint.js` — only edges that a foreign key or a service call
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

## Library comments in full

The full text of comments that the source files now cite and summarise in a line or two.

#### `src/lib/graphql-failure.ts`: `export function placeServerIssues<Name extends string>(`

Places every issue a failed save carries on a react-hook-form form: each
one `toField` names a field for beside that field, the rest, each distinct
message once, joined into one
sentence on the form's `root`, which its alert region shows. Both as
`type: 'server'`, so the next submit or an edit to the field clears them
as it clears the resolver's own. Answers whether it set any error.

`toField` sees the whole issue, path and message, so each form keeps its
own reading of a path: a flat form names a field only for a one-segment
path it shows, the ingredient form follows a path into its lists. It may
also answer `false` for an issue the form takes up itself, which is
placed nowhere: the ingredient form's redirect question asks
rather than errs.

Every error at once rather than `readGraphqlFailure`'s first, as the admin
forms place them, so none carries its own copy of this loop.
Generic over the field names rather than the form's values, so a form's
own `setError` passes as it is: TypeScript cannot work a form's values
back out of its field paths, and infers the names straight from them.

#### `src/lib/text.ts`: `export function noMatchText(noun: string, parts: readonly string[], emptyText: string): st`

What an admin list says when it shows no rows. With a filter in
force, `parts` names each filter as the caller phrases it — `“wort”`, `the
role Admin`, `No Refs` — and the sentence says nothing matches them and how
to see more: "No users match “ada” and the role Admin. Change or clear the
filter to see more." With none, the list itself is empty, and `emptyText`
is the caller's own sentence for that.

`noun` is the plural, matched by a plural verb: one wording for all six
lists, where the compendium said "No entry matches", the invitations "No
invitation matches", the users "No users match", the group and value lists
"No category matches that filter. Try another name." and the ledger "No
admin changes for “x”." The plural reads true however many rows the list
could have held, and each filter is named rather than called "that filter",
so an admin sees which one to change.

#### `src/lib/coven-path.ts`: `export function pathInCoven(`

Where the same page is in another workspace: `/coven/a/ingredients/x`
becomes `/coven/b/ingredients/x` when the page said it opens there (`opens`),
and `/coven/b/ingredients` when it did not. What lies beneath a section (an
ingredient, a spell) belongs to the workspace it was opened in, unless the
page vouched for the next, and would otherwise be a 404 there. Outside a
workspace, or at its index, the answer is the new workspace's index. A people
page the viewer's role cannot open there steps back: invitations to the
members page beside it when members are readable (a member reads them and
cannot invite), anything else to the index.

#### `src/lib/compendium-cache.ts`: `export function cachedCompendiumRead<A extends unknown[], R>(`

`read`, held in the data cache under `COMPENDIUM_TAG` and keyed by `key` and
its arguments, so each argument list is an entry of its own. Only a read
every viewer sees alike may be wrapped: its arguments are the whole key, so
a session among them would be a cache per viewer, and one left out of them
a leak (claude-docs/db/compendium-cache.md lists the reads).

The value is stored as superjson rather than left to Next's `JSON.stringify`,
which would answer a hit's `Date` columns as strings while a miss answered
them as dates.
