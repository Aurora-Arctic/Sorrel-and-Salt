# 7. GraphQL API

Single route handler at `/api/graphql`. No separate service, no additional hosting cost.

**Stack:** GraphQL Yoga (server), Pothos (code-first schema, no ORM plugin — §2), DataLoader, graphql-codegen for client types.

**Client:** a small `fetch` wrapper in `src/lib/graphql-client.ts` plus TanStack Query, not Apollo. Apollo's normalized cache duplicates what TanStack Query already does here and adds ~40 kB. Codegen (`client-preset`, reading the committed SDL) generates a typed document node per operation into `src/gql/`, and no hooks: the request function runs a typed document through TanStack Query. Forms are react-hook-form with the Zod resolver; the suggesting fields are a headless combobox on Downshift, not react-select ([`ingredients.md`, "A closed set wears the combobox"](../design-decisions/ingredients.md#a-closed-set-wears-the-combobox)).

**Four rules follow from dropping the Drizzle plugin, and bind every GraphQL task** (long form: `claude-docs/graphql/schema.md`):

- **Object types are declared by hand**, against the row type the service returns (`typeof ingredients.$inferSelect` and friends) — never a table-derived object type. TypeScript still fails the build when a column's type changes under a field.
- **`auditColumns` maps to one shared `AuditInfo` object type, defined once.** A per-table audit shape is a bug.
- **Every Pothos package in the stack is a stable major.** A `0.x` Pothos plugin entering the dependency tree is a decision argued for in the diff, not a convenience. Re-adopting the Drizzle plugin once it reaches a stable major is a contained, additive change.
- **The GraphQL layer imports `drizzle-orm` for _types_ only.** Runtime query building stays behind `src/db/repository/` (§3's rule 2). A `no-restricted-imports` rule enforces it: a runtime import from `src/graphql` fails `npm run lint`, while `import type` — erased at compile time, and so unable to build anything — passes.

## Resolvers are thin

A resolver passes its arguments to a service and returns the result; the filter is the service's, in SQL. No database access in a resolver, ever. Same lint rule as `db`.

## The three GraphQL costs, and how each is paid

**N+1 queries.** A query for 50 ingredients each with categories fires 101 queries without batching. DataLoader instances are created per request in the Yoga context (`claude-docs/graphql/loaders.md`). This is a cost concern as much as a performance one.

**Authorization surface.** Handled by the service-layer choke point in §3. Pothos auth scopes provide a second check on sensitive fields (`User.email`) and on admin mutation fields, but the service layer is the real gate.

**Client-composable expense.** `graphql-armor` applies a depth limit and disables introspection and field suggestions in production, with aliasing and directive-overload protections. Cost is limited by `@pothos/plugin-complexity` rather than by armor, because armor's check runs before variables are bound and so prices `first: $n` at one row; the complexity plugin prices a connection at the page it will actually fetch. The limits are in (claude-docs/graphql/protections.md, "Protections").

## Errors — one shape, so a message can land beside its field

Services throw rather than answering with an empty list or a success that did nothing — §11 asserts it as "not a silent no-op". The types, the `extensions.code` each maps to, the masking of anything else and the transport that maps them are in (claude-docs/graphql/errors.md, "Errors"). None of the service-side types carries a status code or a GraphQL error code, because a service called from a seed or a script has no use for one.

The message is the service's, verbatim: that is what carries a failed column's name and ratio, a duplicate naming the colliding entry, and a refusal that explains itself all the way to the person reading the form.

**An issue's `path` names the input field**, in the shape of the mutation's own `input` — `['canonicalName']`, `['folkNames', 2]`, `['variants', 1, 'form']`. A rule belonging to no single field uses the empty path and the form renders it above the fields. Most refusals do have a field: the duplicate-identity collision of §5 names `canonicalName` (or `name`, for an entry whose label is its identity), a slug collision names `name` — the slug is derived and has no field of its own — a write that would end another entry's redirect names `endRedirect`, the confirmation it lacks, the contrast floor names `colorDark` or `colorLight`. What is genuinely not a field stays a `Forbidden` with a message — the last-owner guard refuses an action and offers a remedy, which is not a bad value in a box. Either way: **never a bare constraint name.**

**The client validates first and renders both sources the same way.** The Zod resolver runs the shared schema before the mutation is sent, so a well-behaved form never asks the server to reject what it could have caught; the service runs that same schema again, because the browser is not the only caller. Returned `fieldErrors` go into react-hook-form through `setError(path, { message })`, an empty path through `setError('root', …)`, and both render through the same inline error element the resolver's own errors use — one component, two sources, so a server-only rule is not a second visual language. `FORBIDDEN` and `NOT_FOUND` are not form errors; the page decides what to do with them (§9).

## Caching — three layers in v1

**One rule above all: a cache is keyed by viewer identity or holds nothing workspace-scoped** (CLAUDE.md rule 6). A cache is the easiest way to leak one workspace's data into another's response.

**1. DataLoader — per-request batching.** Collapses the 50-ingredient N+1 from 101 queries to 3. Free, no invalidation problem, non-negotiable.

**2. React `cache()` — per-request memoization.** Wraps service functions so a layout and a page requesting the same workspace hit Postgres once. Scoped to the request, no staleness risk.

**3. Next.js data cache with tag invalidation.** The compendium, the categories, the form vocabulary, the celestial body and zodiac vocabularies and the deity vocabulary are read on nearly every page, mutated only by keepers, and identical for every viewer. All six share the `compendium` tag, and every keeper mutation across the six fires `revalidateTag`. The two public compendium pages (§9) are dynamic over the cached compendium reads; their reads sit under the same tag, so the same call refreshes them.

```ts
export const getCompendium = unstable_cache(() => compendiumService.listGlobal(), ['compendium'], {
  tags: ['compendium'],
  revalidate: 3600,
});
// admin mutation:
revalidateTag('compendium', { expire: 0 });
```

`revalidateTag` takes two arguments in Next 16 — the single-argument form is deprecated and a type error, so `npm run typecheck` rejects it. The second argument is `{ expire: 0 }`, not the otherwise-recommended `'max'`, because a keeper who has just edited the compendium must see that edit on the very next read: `'max'` serves stale content for up to a year while the revalidation runs behind it, whereas `{ expire: 0 }` never serves stale and makes the next request a blocking miss.

The cache is persistent across requests and shared across instances. The wrapper is `src/lib/compendium-cache.ts`'s `cachedCompendiumRead`, called in the services over each list and its count, keyed by their arguments; Vitest aliases `next/cache` to a pass-through, and only one e2e server keeps a data cache (claude-docs/db/compendium-cache.md, "The wrapper"). The help articles, the FAQ and the glossary are cached the same way under the tag `help`, revalidated on every keeper write to them. The site's published documents (privacy, disclaimer, code of ethics, terms) are cached by `src/lib/documents-cache.ts`'s `cachedDocumentRead`, under the tag `documents` with an hourly expiry; they are public and carry no viewer identity.

**`updateTag` is unavailable to this project.** It is the read-your-own-writes call — it expires the tag immediately rather than serving stale — but it may only be called from a Server Action and throws anywhere else, Route Handlers included. Every mutation here goes through the `/api/graphql` route handler (§3), and there are no server actions, so `revalidateTag(tag, { expire: 0 })` is the substitute wherever `updateTag` cannot be reached.

**`unstable_cache` is the legacy path, deliberately.** Its successor is the `use cache` directive under the `cacheComponents` flag, which `next.config.ts` does not set — so the two caches would coexist as separate layers if it were set. The swap is not free: `unstable_cache` persists values across deployments, while a `use cache` entry never carries over to a new deploy because its cache key includes the build id. A compendium that survives a deploy is worth more here than the newer directive.

**Not cached:** anything workspace-scoped. Ingredients change from under you when a co-member edits, and stale shared state in a collaborative app is worse than an extra query.

**Layer 4 (Yoga response cache) is deferred to v2** — see §13.

## Help articles

The help articles, the FAQ and the glossary are rows a keeper edits (§5, `help_articles`; §10, "Help and FAQ articles"). The module is `help`, and it follows the same split as the site documents.

- **Writes** (`createHelpArticle`, `updateHelpArticle`, `deleteHelpArticle`) check `assertSiteAdmin` alone, run inside `withAudit` and are guarded by the `admin` auth scope. A curator is refused, as with the site documents. Each write calls `revalidateTag` on the `help` tag with `{ expire: 0 }`. A rule refusal is a `ValidationError` pathed to the field (`slug`, `parentId`, `position` or `audience`). The update patch changes only the fields it names, and a null `summary`, `position` or `parentId` clears it. **A new title leaves the slug where it is**, since a link may hold it; only a slug in the patch moves it.
- **Public reads** (`helpFaq`, `helpArticles`, `helpGlossary`, `helpArticle(slug)`) take no session and no auth scope. They answer the `public` audience alone, are called by server components directly and are wrapped in `unstable_cache` under the tag `help`, as the compendium’s reads are, because they carry no viewer identity (rule 6). The three lists are `t.pagedConnection`s over `findPage` (rule 8): the FAQ and the index in position order (a null position last, then by title), the glossary A to Z. The index holds top-level articles only. `helpArticle` answers any public row by its slug, a child as well as a parent, with its public children; any other audience is `NotFound`.
- **Staff reads** (`staffHelpArticle(slug)`, `staffHelpArticles`) carry no auth scope: the service calls `assertCurator` and refuses a reader who is neither with `Forbidden`. They are never cached, since the answer depends on the reader. A curator reaches the `public` and `staff` audiences, a keeper all three; a row beyond the reader’s reach is `NotFound` by slug and absent from the list. `staffHelpArticles` lists every kind, A to Z.
- **Search** (`helpSearch(query)`) answers a signed-out reader too and is never cached. The audience filter is part of the SQL, in both arms below. A blank query answers an empty connection. A full-text match (`websearch_to_tsquery(english, …)` against the weighted `search_vector`, ranked by `ts_rank`) answers first; only when no row in the reader’s reach matches does a word-similarity match on the title answer instead, so a typo still finds its page. Pages are ordered by score through the cursor helper, which carries the score.
- **`HelpArticle.children`** is a bare list bounded by its parent (help nests one level), read through the `helpChildrenByParent` loader: one query per batch, in position order, among the audiences the request’s session reaches. A signed-out request gets the public children.
- **Audience in the SQL, structure in the service.** Every finder filters `audience` in SQL by the reader’s reach. The service holds the shape of a write: the reserved slugs (`glossary`, `staff`, `search`) and a duplicate slug; a parent that is a live article and not itself a child; a term with no parent, position or non-public audience; a child no wider than its parent, and a parent no narrower than a live child (no cascade); and a delete refused while the row has live children, with an error that says why. The Markdown is stored as written, rendered only through the standard sanitising renderer on the way out.

## The schema

The schema is `src/graphql/schema.graphql`, printed from the code and committed, and its field descriptions state each field's gate and refusal; the SDL snapshot test fails when it moves. It is the one home for every type, field and argument (`claude-docs/graphql/schema.md`). These are the design rules behind its shape:

- **Every list is a Relay connection** (first/after/last/before) paged by one helper, except a list nested on its parent and bounded by it, which is a bare list read through a loader (rule 8; `claude-docs/graphql/pagination.md`).
- **Mutations return the entity; a delete returns the deleted id**, since a deleted entity's children would resolve empty. A refusal travels in `errors[].extensions` — a code, and `fieldErrors` for a validation failure — rather than in a payload type pairing an entity with a `userErrors` list.
- **An update input replaces the row**: every field is non-null, and `""` or `[]` clears. That includes `categoryIds`, `elements` (a list, because an enum has no empty value to send but an empty list is one), `celestialBodies`, `zodiacSigns`, `colors`, `references`, `deities` and `variants`.
- **A spell's visibility widens only once it is complete**, and goes through `updateSpell`; no mutation of its own sets it. The complete-spell rules are in §5.
- **Audit shape.** `AuditInfo` carries the four stamps only (`createdAt`, `createdBy`, `updatedAt`, `updatedBy`); no finder returns a soft-deleted row.
- **There is no `Form` enum.** A variant's `form` is free text over a keeper-curated vocabulary (§5), so an enum would rewrite the SDL every time a keeper curates a value; the vocabulary is read as data through `ingredientFormValues` and the filter argument is a `String`.
- **The type is `IngredientFormValue`, not `IngredientForm`, deliberately.** One row is one permitted _value_ of a variant's `form`. `IngredientForm` is already the entry-form component (§11), and a term means exactly one thing here, so the newer of the two yields. The table keeps its name `ingredient_forms`; only the GraphQL type diverges.
- **Lists replace single values.** `celestialBodies`, `zodiacSigns` and `colors` are `[String!]` on `Ingredient` and on each variant, as are `elements: [IngredientElement!]` (the enum refuses a value outside the five before a resolver runs, and the shared schema refuses a repeat). A list left empty reads back as null, because that is what is stored (§5). The compendium's element filter takes a list of its own on both list queries and matches an entry whose list holds any one of them (§9).
- **Deities and the form are picks.** `Ingredient.deities` is `[IngredientDeity!]!`, each a name and the curated `Deity` picked, in the order entered; a variant's `formChoice` reads the curated form its `formId` records, both through loaders. The inputs take `formId: ID` beside `form` and `deities: [IngredientDeityInput!]`, each a `deityId` or a `name`, exactly one, as `SubstituteInput` is. `formSuggestions` and `deitySuggestions` carry each curated row's `id`, null for a value only in use, which is what a pick sends. The input is named after the table, not `DeityInput`, which the admin CRUD keeps ([`ingredients.md`, "Reading and writing the picked form and deities"](../design-decisions/ingredients.md#reading-and-writing-the-picked-form-and-deities)).
- **References.** The two ingredient inputs take `references: [ReferenceLinkInput!]`, each an existing reference's id with an optional `locator`; `ReferenceInput` takes a reference's fields as §5 lists them, validated per `kind`. `citation` is rendered on the server by the one renderer and is plain text, so a chip, a sort and a screen reader read it as one string; the page renders the parts the same function returns, with the italics. `LocalDate` is graphql-scalars', beside the `DateTimeISO` behind `DateTime`, because an accessed date is a day and not an instant.
- **Variants.** `Ingredient.variants` is a bare list bounded by its ingredient, read through a loader as every child of an ingredient is. Every ingredient input takes `variants: [IngredientVariantInput!]!`, each a form, its pick, its own fields and its own categories, substitutes and references, and the whole entry saves in one mutation: there is no `createIngredientVariant`, for the reason §5 gives. An entry with no form sends `[]`. A variant's error is pathed to it, so the entry form places it beside that variant's field.
- **`SpellStep.ingredient` is nullable from the first line of the SDL**, not widened later: a custom, one-off row (§5) has no ingredient, and a consumer that has always had to branch on that never meets it as a breaking change. `name` and `form` resolve from the linked ingredient when there is one, so a recipe view reads one shape whichever kind of row it renders. `name` is nullable too, because an instruction-only step lays no ingredient at all: a step is an instruction, an ingredient, or both, in one list, so the recipe reads in the order it is done.
