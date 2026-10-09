## The schema

The schema is code-first, built with Pothos in `src/graphql/builder.ts` and
assembled in `src/graphql/schema/index.ts`. A type lives in its own file in the
`graphql/` directory of the module that owns its rows, and the index loads each
module — through its `@/modules/<name>` index, never the deep path — for the
side effect of registering on the builder; only the cross-cutting `AuditInfo`
stays under `src/graphql/schema/` ([`modules.md`](../modules.md)).

- **No ORM plugin.** `@pothos/plugin-drizzle` is deliberately absent (MB.20,
  DESIGN.md §7). An object type is declared by hand as an `objectRef` over the
  row type the service returns, such as `typeof ingredients.$inferSelect`. So a
  column whose type changes still fails `npm run typecheck`: `t.exposeString`
  over a column that became a number no longer compiles, and neither does a
  resolver returning the wrong shape. `tests/graphql/builder.test.ts` pins
  both with `@ts-expect-error` inside a function that is never called. `tsc`
  checks it, and nothing registers on the real builder.
- **Every Pothos package is a stable major:** `@pothos/core`,
  `@pothos/plugin-scope-auth`, `@pothos/plugin-relay` and
  `@pothos/plugin-complexity`, all at 4. A `0.x` plugin entering the tree is a
  decision to argue for in the diff.
- **Fields are non-null by default** (`defaultFieldNullability: false`), as the
  §7 sketch reads. A field that can be null says so with `nullable: true`,
  which makes the null something the field means rather than an accident of
  the default. Pothos's own default is the reverse.
- **Typed text that narrows a list is `query`.** `compendium` and the five
  autocompletes all take it as `query: String`, and a blank or absent one is
  no filter. The same text is `query` all the way down, through the filter
  types and the services to the SQL. It is not `search` or `term`, because one
  thing gets one name, and `query` is the usual name for search text in
  GraphQL APIs. The exception is `possibleDuplicates(name: String!)`: its text
  is a whole name about to be saved, compared as a whole, not a fragment to
  filter by, and it stays `name` just as far down.
- **Two date scalars, an instant and a day.** `DateTime` is graphql-scalars'
  `DateTimeISO` under the plain name. A resolver hands it a `Date`, and the
  wire carries an ISO 8601 string. `DateTimeISO` rather than the package's
  `DateTime` because the latter serializes to a `Date` and leaves the string
  to `JSON.stringify`. `LocalDate` (MB.153) is the package's own, for a
  reference's `modified` and `accessed`, which are days rather than instants:
  `YYYY-MM-DD` both ways, as a `date` column reads in Drizzle's string mode,
  and a value that is not a calendar day is refused before any resolver runs.
- **`AuditInfo` is defined once**, in `src/graphql/schema/audit.ts`. An
  audited type exposes its stamps as `audit: AuditInfo!`, resolved from the row
  itself, and never as flat fields of its own. It carries the four stamps:
  `createdAt`, `createdBy`, `updatedAt`, `updatedBy`. `deleted_at` never
  surfaces, because no ordinary finder returns a soft-deleted row. `createdBy`/`updatedBy` are bare ids for now; MB.10's
  loader resolves them to display names. A test walks every object type in the
  schema and fails on any type other than `AuditInfo` with an audit-named
  field, so a per-table audit shape fails in the PR that adds it.
- **`ok: Boolean!` stays beside the real fields.** It mirrors Better Auth's
  `/api/auth/ok`: it answers without a session or the database, which is what
  the route's tests and the e2e spec probe the endpoint with.

### `me`, `User` and the first module types

`me: User!` is the signed-in user, read through `getMe(session)` in the
`identity` module. The service takes no id, so there is no other user a
caller could name. A signed-out request is refused by the `signedIn` scope
before the resolver runs, and the service's `Session` parameter means a null
could not reach it anyway. A session whose user row is gone or soft-deleted
gets `NotFound`: Better Auth reads the session's user without our filter, so
the session can outlive the row.

`User` carries `id`, `name`, `image`, `email`, `emailVerified`, `role`,
`canCreateWorkspace`, `providers`, `memberships` and `audit`. Four of those
are private: `email`, `emailVerified`, `role` and `canCreateWorkspace` are the
user's own business, not a co-member's, and carry the `self`-or-`admin` scope
below. `providers`, the ids of the sign-in providers linked to the account,
is an admin's alone, through the `providersByUser` loader: a user reads their
own from Better Auth, on `/account` (MB.52). They stay
non-null, so a query for another user's email fails with `Forbidden` rather
than returning the user without it — ask for what you may read.

`User.memberships: [WorkspaceMember!]!` is registered by the `coven` module,
not `identity`, because `identity` may import no module
([`modules.md`](../modules.md)). It resolves through the `membershipsByUser`
loader, whose service, `membershipsOf(session, userIds)`, answers each id with
that user's live memberships in live workspaces — or a `Forbidden` in that
id's slot for anyone but the caller, a site admin included, since an admin
reaches no workspace. A `WorkspaceMember` carries `role`, `joinedAt`,
`workspace` and `audit`; `Workspace` is `id`, `name`, `slug` and `audit`,
the minimum a switcher needs, and M6 adds to it. `memberships` is a bare list,
bounded by its parent, like every nested list (DESIGN.md §7).

`users(query: String, awaitingApproval: Boolean)` is the admin user list
(MB.52), a paged connection of the ordinary `User`, so `email` resolves through
its scope and no second path. `query` matches a substring of the name or the
email, and `awaitingApproval` narrows to `canCreateWorkspace = false`. Its
service, `listUsers`, refuses anyone but a site admin, and the query carries
no scope of its own: it is a read, which M5.7's mutation sweep does not reach
([`auth/admin-users.md`](../auth/admin-users.md), "The user list").

`setEmail(email: String!, next: String): User!` is the schema's first
mutation (MB.54), registered by `identity` on the `Mutation` root that
`src/graphql/schema/index.ts` declares beside `Query`. Signed-in only, by
scope; the resolver hands the session, the address, the context's
`emailVerification` sender and `next` — where the mailed link's landing
goes on to (MB.111) — to `setEmail` in the identity module. It answers the row as it is — the address
changes only once the mailed link is followed
([`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "The email page") — and a refusal, an address held by
another verified account or a second mail inside the minute included, is a
`VALIDATION` error on the `email` field.

Their GraphQL files hold the transport's half (MB.180, MB.186;
["The workspace ingredient mutations"](#the-workspace-ingredient-mutations)
says what that half is), and a signed-out caller at `me`, `users` and
`setEmail` is `tests/db/graphql-query-scopes.test.ts`'s.
`tests/modules/identity/graphql/me.test.ts` holds the caller's own row and
`memberships` through the request's loader. `users.test.ts` holds the default
page, the cursor and the filters reaching `listUsers`, the nodes being `me`'s
`User`, and `providers`' `admin` scope refused on a user's own row; who is
refused the list is `services/user-list.test.ts`'s. `user-private-fields.test.ts`
holds the four private fields' `self`-or-`admin` scope, below.
`set-email.test.ts` holds `next` reaching the sender, and one `VALIDATION`;
every refusal's rule is `services/email.test.ts`'s.

### `planetSuggestions` and `zodiacSuggestions`

The autofill behind the planet and zodiac fields (MB.94), registered by
`vocabulary`. Each takes `workspaceId`, an optional `query` and the
connection arguments, as DESIGN.md §7's sketch gives them, and its nodes are:

```graphql
type CorrespondenceSuggestion {
  value: String!
  description: String # the curated row's; null for a value only in use
  curated: Boolean!
}
```

- **One type for both fields.** A planet and a sign suggestion carry the same
  three things, and neither carries a group. `form`'s suggestion, which does,
  is its own type, below.
- **Each is a `pagedConnection`**, one list over both buckets: curated values
  first, name matches before description matches, then values in use in the
  compendium and the named workspace that no live row curates. `curated` tells
  a client which bucket a row came from, and the order is the finder's
  ([`db/member-autofill.md`](../db/member-autofill.md), "The member's autofill").
- **`query` is optional.** Blank or absent, the field lists the whole
  vocabulary and every in-use value, still a page at a time.
- **Two refusals, one type.** Signed out, the resolver refuses with
  `Forbidden` before the service is reached. Signed in, `assertMembership`
  refuses a workspace the caller does not belong to with the same
  `Forbidden`, a site admin included. The field carries no scope, because
  `pagedConnection` takes none and the resolver's null check is the same
  early refusal.
- **A null `workspaceId` reads the compendium alone** (M5.5): the curated
  rows, then the values in use in the compendium, under no proof, so no
  membership is asked and any signed-in caller is answered. It is the admin's
  compendium form, which names no coven; signed out is still refused, because
  MB.80's public line is drawn field by field and no public page reads these.
  The form, not the field, keeps a compendium entry to the curated rows
  (MB.162; [`components/ingredient-form.md`](../components/ingredient-form.md),
  "On the compendium").

`tests/modules/vocabulary/graphql/suggestions.test.ts` holds the transport's
half (MB.186): the nodes, an absent `query` sent as a blank one, a page by
cursor, `zodiacSuggestions` reading its own vocabulary, and the compendium-only
mode with its one `FORBIDDEN`, signed out. The buckets, the thresholds and who
is refused under a coven are `services/suggestions.test.ts`'s; a signed-out
caller under a coven is `tests/db/graphql-query-scopes.test.ts`'s, and a `workspaceId` naming no
coven `tests/db/graphql-workspace-ids.test.ts`'s.

### `formSuggestions` and `commonNameSuggestions`

The autofill behind the form and common-name fields (M4.7a). `formSuggestions`
is registered by `vocabulary`, over the same finder as the two above;
`commonNameSuggestions` by `ingredients`, since folk names are its table:

```graphql
type Query {
  formSuggestions(
    workspaceId: ID # null reads the compendium alone (M5.5)
    query: String
    first: Int
    after: String
  ): QueryFormSuggestionsConnection!
  commonNameSuggestions(
    workspaceId: ID
    query: String
    first: Int
    after: String
  ): QueryCommonNameSuggestionsConnection!
}

type FormSuggestion {
  id: ID # the curated row's, which a pick sends; null for a value only in use (MB.167)
  value: String!
  description: String # the curated row's; null for a value only in use
  group: String # the curated row's group; null for a value only in use
  curated: Boolean!
  claimants: [SuggestionClaimant!]!
}

type CommonNameSuggestion {
  value: String!
  claimants: [SuggestionClaimant!]!
}

type SuggestionClaimant {
  name: String! # the claiming ingredient's display name
  canonicalName: String # its formal name; null for a `none` entry, and for an `unknown` one with none recorded
}
```

- **`group` is how two same-named forms are told apart.** `ingredient_forms`
  is unique on the slug alone, so "Wax" may be both an _animal_ part and a
  _substance_, and `ingredients.form` stores the string. The pair comes back as
  two suggestions, in group order, and a client renders "Wax (Substance)".
- **`id` is what a pick sends** (MB.167): the curated row's, as `formId`, or
  as a deity entry's `deityId`; null for a value only in use, which is sent
  as text. A planet or sign records no pick, so its suggestion has no `id`.
- **`claimants` names who already holds the value**, in the compendium and the
  named workspace only: formal name first, and a claimant with none by its
  label, so a `none` entry is not hidden. A nested list rather than a connection
  — the guard in ["Pagination"](pagination.md) allows one, bounded by its parent
  — and never longer than the in-scope ingredients.
- **A common-name suggestion has one bucket.** There is no curated vocabulary
  of common names, so no `curated` and no `description`. The in-use names are
  every in-scope entry's display name and live folk names: "Cat's Claw" is the
  display name of five seeded rows, and the story's own example.
- The refusals are `planetSuggestions`': `Forbidden` from the resolver when
  signed out, from `assertMembership` when signed in elsewhere, a site admin
  included. So is a null `workspaceId`, which reads the compendium alone
  (M5.5), its claimants included.

`tests/modules/vocabulary/graphql/form-suggestions.test.ts` holds what
`suggestions.test.ts` holds for the two above, with each curated row's `id`
and `group` and every suggestion's `claimants`; the rules are
`services/form-suggestions.test.ts`'s. `commonNameSuggestions`' file,
`ingredients/graphql/common-names.test.ts`, is described with the compendium's
reads, below.

### `deitySuggestions`

The autofill behind the deities field (MB.130), registered by `vocabulary`
over the same finder, taking the same arguments as `formSuggestions`:

```graphql
type DeitySuggestion {
  id: ID # the curated row's, which a pick sends; null for a value only in use (MB.167)
  value: String!
  description: String # the curated row's; null for a value only in use
  tradition: String # the curated row's tradition; null for a value only in use
  curated: Boolean!
}
```

- **`tradition` is `formSuggestions`' `group`** under the vocabulary's own
  word. It tells two same-named deities apart, and a client renders
  "Hecate (Greek)". A deity under a soft-deleted tradition comes back as a
  value in use, with no tradition.
- **No `claimants`.** They show which entries already share an identity with
  the one being written, and a deity is no part of an ingredient's identity
  ([`db/member-autofill.md`](../db/member-autofill.md), "The member's
  autofill").
- Each live row of an ingredient's deities, in `ingredient_deities`
  (MB.167), is one value in use, folded and counted once, from the compendium
  and the named workspace only.
- The refusals, and a null `workspaceId`, are `planetSuggestions`'.

`tests/modules/vocabulary/graphql/deity-suggestions.test.ts` holds what
`suggestions.test.ts` holds, with each curated row's `id` and `tradition`;
the rules are `services/deity-suggestions.test.ts`'s.

### `possibleDuplicates`

Story 16's "did you mean" (MB.11), registered by `ingredients` over M4.7's
`findPossibleDuplicates` ([`db/fuzzy-matching.md`](../db/fuzzy-matching.md),
"Fuzzy matching"). M5.10's name field calls it as the name is typed, with
`workspaceId`, the whole `name` and the connection arguments (DESIGN.md §7's
sketch); its edge carries the match's score:

```graphql
type QueryPossibleDuplicatesConnectionEdge {
  cursor: String!
  node: Ingredient!
  score: Float! # the name's trigram similarity to the entry, 0.4 to 1
}
```

- **A node is an `Ingredient`**, the type `compendium` and `ingredient`
  return. So a warning links by `slug`, tells the tier by `isGlobal`, and
  shows `canonicalName` beside the label. Without the formal name, "Did you
  mean Cat's Claw?" could mean five different plants. `folkNames` and
  `categories` come through the request's loaders, as they do elsewhere.
- **Compendium entries and the named coven's own, and nothing else.** A match
  in another coven never comes back, whether it matched by label or by folk
  name. The filter is the finder's, in SQL.
- **The threshold is M4.7's**: 0.4 by `%`, from `select.ts`'s one
  `SIMILARITY_THRESHOLD`, set per read. It is not the compendium search's 0.5
  word similarity. A search finds an entry from a fragment; this asks whether
  a whole name is nearly one already there.
- **Best match first, a page at a time, each edge carrying its score.** Pages
  are keyed `(-score, name, id)`. The score is the best trigram similarity
  among the label, the formal name and the live folk names. It is never below
  the threshold, and 1 means an exact match: that name is already there, as
  opposed to a near miss. It lives on the edge rather than on `Ingredient`,
  as `compendium`'s does, because it describes the match, not the entry.
  Page sizes are the usual default and maximum. A blank `name` gets an empty
  page, not every entry.
- **The refusals are `planetSuggestions`'.** The resolver refuses a signed-out
  caller with `Forbidden`. For a signed-in caller the check is the service's
  `assertMembership` for `ingredient: ['read']`, which refuses a coven the
  caller is not in, a site admin included. A viewer is answered, because every
  row the field returns is one a reader of the coven could already list.
- **A null `workspaceId` matches the compendium alone** (M5.5), asking no
  membership, as `planetSuggestions` does: the admin's compendium form,
  which drops the entry being edited from what it shows.

### `ingredientSuggestions`

The substitute picker's search (MB.138), registered by `ingredients` over
`suggestIngredients` and the finder `findIngredientSuggestions`
([`db/compendium-read.md`](../db/compendium-read.md), "The ingredient
picker's search"). MB.131's combobox calls it as a substitute is typed, with
`workspaceId`, `query` and the connection arguments, and picking a node
writes a link to it (DESIGN.md §5, `ingredient_substitutes`).

- **A node is an `Ingredient`**, as on `possibleDuplicates`, because a pick
  needs the id that `commonNameSuggestions`' strings do not carry. The
  combobox shows `canonicalName` beside the label and the tier by
  `isGlobal`, which is what MB.131 asks a substitute suggestion to show.
- **Compendium entries and the named coven's own, and nothing else**, which
  is exactly what a coven's substitute may link. A compendium entry's
  substitute may link only the compendium, so the admin form reads
  `compendium(query)`, which already holds nothing else.
- **It matches as `compendium` does**, by word similarity at 0.5 against the
  label, the formal name and the live folk names, accents folded, so a typed
  prefix finds its entry. `possibleDuplicates`' whole-string 0.4 does not:
  `mu` is under 0.4 similar to Mugwort and 0.67 word-similar. Best match
  first, with no score on the edge, since a picker ranks rather than reports.
  A blank `query` lists both tiers by name, so an opened box lists something.
- **The refusals are `possibleDuplicates`'**: `Forbidden` for a signed-out
  caller from the resolver, then `assertMembership` for `ingredient: ['read']`.
  A viewer is answered, a coven the caller is not in is refused, and so is a
  site admin, who belongs to no coven.

### `compendium`, `ingredient` and `ingredientFormValues`

The compendium's reads (M8.5), registered by `ingredients`, with the
vocabulary types by `vocabulary`. All three are public (MB.80): no `signedIn`
scope, and the list and the vocabulary resolvers pass no session at all.
Their arguments, `Ingredient` and the six vocabulary types are DESIGN.md §7's
sketch, and `src/graphql/schema.graphql` is the SDL as built; what the sketch
leaves out is the list's connection:

```graphql
type QueryCompendiumConnection {
  edges: [QueryCompendiumConnectionEdge!]!
  pageInfo: PageInfo!
  totalCount: Int! # the entries under the filter
  countBefore: Int # how many of them precede this page; null on an empty page
}

type QueryCompendiumConnectionEdge {
  cursor: String!
  node: Ingredient!
  score: Float # the search's word similarity, 0 to 1; null without a search
}
```

- **The `compendium` query is the search.** `query`, `categoryIds` and
  `form` are the service's, filtered in SQL
  ([`db/compendium-read.md`](../db/compendium-read.md), "The compendium
  read"): the query at least 0.5 word-similar (`<%`) to the label, the formal
  name or a live folk name, case- and accent-folded, so a prefix and a
  transposed pair both find their entry; every listed category (AND; M8.12
  adds a mode); the form under `canonical_key`'s fold. The browser never holds more than a page (rule
  8), so it cannot be the search, which is why M8.4's client-side
  `filterIngredients()` was retired (DESIGN.md §14). `element` (M8.13) is
  that task's argument to add, and matches an entry whose `elements` holds
  it, among others or alone (MB.157). The admin's two to-do lists, which M5.5
  puts on `/admin/compendium`: `withoutReferences: true` (MB.153), only the
  entries citing no live compendium reference, so an entry whose one link is
  unlinked, or cites a soft-deleted reference, is on it, as its bibliography
  reads empty; and `nomenclature` (M5.5), only the entries so classified, so
  `unknown` is the formal names still to look up. Either left out, or
  `withoutReferences: false`, is no filter, and `totalCount` counts under
  the same filter.
- **A search is ranked, best match first.** It pages
  `(score DESC, name, id)`, and each edge carries `score`: the row's word
  similarity to the query, the best of the label, the formal name and its folk
  names. Without a search the list pages `(name, id)` and `score` is null. A
  query shorter than two characters is no search — one letter would filter and
  rank by noise — so it lists every entry, unranked. The score lives on the
  edge rather than on `Ingredient` because it describes the match, not the
  entry. How the rank reaches a keyset page is
  [`db/compendium-read.md`](../db/compendium-read.md)'s ("The compendium read").
- **The list numbers its pages.** `totalCount` and `countBefore` are
  `countCompendium`'s, over the same parsed filter as the page, so a search
  counts at the page's 0.5 rather than the server's 0.6 and never counts fewer
  rows than its pages hold. The formula and the Last request are
  ["Pagination"](pagination.md)'s. A signed-out visitor reads both, as the list
  is public.
- **`ingredient` is non-null, and a miss is `NOT_FOUND`**, as `me` answers
  one: an id that names nothing, a soft-deleted entry, and a coven's own entry
  asked for without its coven all read the same, since a workspace entry's
  existence is private. `workspaceId` names the coven whose own entry may be
  asked for — the service asks `assertMembership(…, { ingredient: ['read'] })`,
  refusing a non-member, a site admin and a signed-out caller with
  `Forbidden` — and without it the read is the compendium alone. A malformed
  id is a miss, not a driver error.
- **`Ingredient` is declared over the row** (`typeof ingredients.$inferSelect`)
  and never exposes `canonicalKey` or `workspaceId`. `folkNames`,
  `categories`, `substitutes`, `deities` and `references` go through the five
  ingredient loaders, `folkNamesByIngredient`, `categoriesByIngredient`,
  `substitutesByIngredient`, `deitiesByIngredient` and
  `referencesByIngredient`, keyed by the row itself; `Category.group`,
  `IngredientFormValue.group` and `Deity.tradition` through the three id-keyed
  group loaders, `categoryGroupsById`, `ingredientFormGroupsById` and
  `deityTraditionsById`; and `formChoice` through `ingredientFormsById`
  (MB.167; ["Loaders"](loaders.md)).
- **`Substitute` is a link or a typed name** (DESIGN.md §7, MB.138; built by
  MB.140): `name` is what it shows — the linked ingredient's label, its last
  once deleted, or the typed text — and `ingredient` is the one to follow,
  null on typed text and on a deleted link, so a client links exactly when it
  is set. `Ingredient.substitutes` is non-null, `[]` with none, and sorted by
  `name`. A page of ingredients reads its substitutes in one statement, the
  linked ingredients joined in, through the hatch
  ([`db/soft-delete.md`](../db/soft-delete.md)). It carries no `audit`, as
  `folkNames` carries none.
- **`IngredientDeity` is a pick or a typed name** (DESIGN.md §7, MB.167),
  read as `Substitute` is: `name` is as saved — a pick's curated spelling, or
  the typed text — and `deity` the curated `Deity` picked, null on typed text
  and once that deity or its tradition is retired. `Ingredient.deities` is
  non-null, `[]` with none, and in the order entered. `Deity` carries its
  `tradition`, which tells two "Hecate"s apart, and is registered by
  `vocabulary` in `graphql/deities.ts` with `DeityTradition`.
  `Ingredient.formChoice` is the curated `IngredientFormValue` that
  `formId` records, null when the form was typed and once the form or its
  group is retired, so the text stands alone.
- **`ReferenceLink` is a reference and the link's locator** (DESIGN.md §7,
  MB.151; built by MB.153). `Ingredient.references` is non-null, `[]` with
  none, and filed alphabetically by citation, less a leading quotation mark
  and an initial _A_, _An_ or _The_. The service sorts, since the citation
  exists only in TypeScript. A page of ingredients reads its references in one
  statement, the references joined in, and only a live reference the
  ingredient's readers may read answers
  ([`db/references.md`](../db/references.md)). The `Reference` type is
  ["References"](#references-reference-createreference-updatereference-and-referencesuggestions)'s.
- **`IngredientFormValue`, not `IngredientForm`**: one row is one permitted
  value of `ingredients.form`, and `IngredientForm` is the entry-form component
  (DESIGN.md §7). Only forms whose group is live are listed, as
  `formSuggestions` counts curated, and the group is what tells two "Wax"
  values apart.
- **The three refuse nothing a scope would, and a sweep holds the line.**
  `tests/db/graphql-query-scopes.test.ts` names every `Query` field with the
  outcome a null session gets, fails on a field it does not name, and runs
  each. A query added later has to say which side it is on. Since MB.185 it
  does the same for every `Mutation` field, all of which refuse, and for
  every query taking a `workspaceId` it runs a null one too, so the
  compendium-only mode is no way round the session; `ingredientSuggestions`,
  whose `workspaceId` is `ID!`, is classified as refused by the SDL before
  any resolver runs. Each table must equal the schema's field list, and none
  may be empty, so no resolver file holds a signed-out test of its own.
- **Cost.** A page of 100 with `categories { group { … } }` prices above
  `MAX_COST`, since a bare list multiplies its selection by 10, and is refused;
  the chip-decorated list pages at 25 or 50 (["Protections"](protections.md)).

The read fields' GraphQL files hold their half the same way (MB.180, MB.185;
["The workspace ingredient mutations"](#the-workspace-ingredient-mutations)
below says what that half is). `compendium.test.ts` holds the filters reaching
the read together, the edge's `score`, the page numbers, one read per page for
each loader, and one `VALIDATION`; what each filter matches is
`tests/db/repository/ingredients.test.ts`'s. `ingredient.test.ts` holds the
coven forwarded, one `NOT_FOUND` and one `FORBIDDEN`. `duplicates.test.ts`,
`common-names.test.ts` and `ingredient-suggestions.test.ts` hold the nodes,
the edge's `score` where there is one, a page by cursor, the compendium-only
mode reaching its service with a null workspace, and one `FORBIDDEN`; the
thresholds, the scope, what the compendium-only mode answers and who is
refused are their services' tests' (MB.187).

### The workspace ingredient mutations

Stories 15, 25 and 34's writes (M8.8, the delete M5.3), registered by
`ingredients` over the services in `services/workspace-ingredients.ts`
([`db/workspace-ingredients.md`](../db/workspace-ingredients.md), "Workspace
ingredients"): `createWorkspaceIngredient`, `updateIngredient` and
`deleteIngredient`, each taking the coven as `workspaceId`, with the
signatures DESIGN.md §7's sketch gives them.

- **The coven is an argument, and neither input can name a tier or a
  stamp.** Neither input type declares `workspaceId` or an audit column, and
  GraphQL refuses a field its type does not declare before any resolver runs. The
  service asks the proof for the argument's coven, `{ ingredient: ['create'] }`,
  `['update']` or `['delete']`, which owners and members hold and viewers,
  site admins and non-members do not. All three carry the `signedIn` scope. A coven id
  that is not a uuid answers `FORBIDDEN`, as it does at every field taking a
  `workspaceId`
  ([`db/membership-proof.md`](../db/membership-proof.md#what-the-check-asks),
  "What the check asks"), and an ingredient
  id that is not one answers `NOT_FOUND`: the same answers a real id the
  caller cannot reach gets, never a masked driver error.
- **`IngredientInput` is the create's.** Only `name` is required, so story
  29's one-field stub is `{ name }`. With no formal name, a `nomenclature`
  left out or sent as `null` becomes `none`.
- **`IngredientUpdateInput` is the whole ingredient, and replaces the row.**
  Every field is non-null, so leaving one out is a schema error rather than a
  silent clear. GraphQL has no field that is required and also nullable, so a
  caller clears a text field with `""` and a list with `[]`. The shared Zod
  schema takes both as absent, as it takes a blank form field. The type's SDL
  description states the rule. There is no exception: `element` was one, a
  nullable enum with no empty value to send, until MB.159 replaced it with
  `elements`, a `[IngredientElement!]!` where `[]` clears (DESIGN.md §7,
  MB.157). `Ingredient.elements` and `IngredientInput.elements` are the
  nullable `[IngredientElement!]`, as `planets` is.
- **A reference is a `ReferenceLinkInput`**, `{ referenceId, locator }`
  (MB.153): an existing reference, created a moment before through
  `createReference` when it is new, and where in it, if anywhere. Optional on
  `IngredientInput`, required on the update input where `[]` clears, as every
  list there is. The shared schema refuses the same reference twice at the
  repeat, whatever its locator, so `reference_links_ingredient_unique`'s 23505
  is never what a member sees. The service holds a new one to the tier rule —
  a coven's ingredient cites the compendium's or its own coven's, a compendium
  entry only the compendium's — and anything else, an id naming nothing or a
  soft-deleted reference included, is the same `VALIDATION` field error on
  the entry, `['references', i]`. The list replaces the links as the
  substitutes are replaced: a link is matched by its reference, keeps its row
  and takes the locator sent, and a list that changes nothing writes nothing.
  A link to a soft-deleted reference is not shown, so the form never sends it
  back, and the save leaves it in place for a restore.
- **A substitute is a `SubstituteInput`**, `{ ingredientId }` to link or
  `{ name }` for one not entered. Both fields are nullable, since GraphQL here
  has no one-of input, and the shared schema holds an entry to exactly one
  ([`validation.md`](../validation.md)). The service then holds a new link
  to the tier rule (DESIGN.md §5): a coven's ingredient may link the
  compendium or its own coven, a compendium entry only the compendium, and
  never itself. Anything else — another coven's ingredient, a deleted one, an
  id that names nothing — is the same `VALIDATION` field error on the entry,
  so a refusal says nothing about what exists elsewhere. A link the ingredient
  already holds is kept as it is, its ingredient deleted or not. The list
  replaces the live rows as folk names are replaced: a link matched by its
  ingredient, a name as written, and a list that changes nothing writes
  nothing.
- **A form's pick is `formId`, a deity an `IngredientDeityInput`** (MB.167).
  `formId` sits beside `form`, nullable on the create and non-null on the
  update, where `""` clears it. It must name a curated form — live, under a
  live group — and `form` must fold to that form's name, which is written in
  its spelling; anything else is a `VALIDATION` field error at `['formId']`
  or `['form']`, never a 23503. A deity entry is `{ deityId }` or `{ name }`,
  exactly one, as a substitute's is; a deity picked anew must be curated, and
  one the ingredient already holds is kept once retired, sent back by id or
  by name. The list replaces the live rows in the order sent
  ([`db/ingredient-children.md`](../db/ingredient-children.md)).
- **The categories are `categoryIds`** (MB.125, story 30): `[ID!]` on the
  create, `[ID!]!` on the update where `[]` clears, as every list there is.
  Each must name a live category — an id naming none, or a soft-deleted one,
  is a `VALIDATION` field error at `['categoryIds', i]` — and a repeat is
  written once rather than refused, since a chip is on or off. The set
  replaces the ingredient's pairs in its own transaction: a pair kept keeps
  its stamps, one dropped is hard-deleted (MB.34) and one added is stamped
  from the session. A pair whose category is soft-deleted is not shown, so
  the form never sends it back, and the save leaves it in place for a restore.
- **The answer is the entity as a fresh read gives it.** It carries every
  field, and its `audit` is stamped from the session. `folkNames` and
  `categories` come through the loaders, after the write has committed. A
  client reconciles its cache from the answer without a refetch.
  `updateIngredient` first clears the entry from `categoriesByIngredient`,
  `folkNamesByIngredient`, `substitutesByIngredient`, `deitiesByIngredient`
  and `referencesByIngredient`. Root mutation fields run in turn within one
  request, so an earlier field may already have loaded the categories, folk
  names, substitutes, deities or references this write replaced.
- **A delete answers the deleted id, not the entity** — the schema's first
  delete, so this is the convention the next one follows. The row is
  soft-deleted, and a list evicts a row by its id; the deleted `Ingredient`
  itself would be a poor answer, since its `folkNames` and `categories`
  resolve through loaders that read live parents only, and would come back
  empty. An id the coven does not hold live — the compendium's, another
  coven's, one already deleted — is `NOT_FOUND`.
- **A refusal is an error, never a payload** (["Errors"](errors.md)). A Zod
  failure is `VALIDATION`, with one `fieldErrors` entry per issue whose path is
  in the input's own shape, such as `['folkNames', 1]`. A collision is
  `VALIDATION` on the field that caused it, and a substitute link the tier
  rule forbids is `VALIDATION` on its entry, such as `['substitutes', 1]`.
  Either way `data` is null, and the transaction wrote nothing, folk names,
  substitutes and deities included.

A GraphQL test file holds the transport's half alone (MB.180): one refusal per
error code per field, with the precondition that would have let it succeed, beside
what only the transport can show — the SDL's own refusals, an `authScopes` gate,
the loaders cleared after a write, one read per page, the edge fields, and a mode
no service test reaches. Which roles are refused at which rows, and every Zod
rule, are the service and validation tests' alone
([`design-decisions/mb.180-graphql-transport-half.md`](../design-decisions/mb.180-graphql-transport-half.md)).
Every GraphQL test file runs through `tests/support/graphql/run.ts`, Yoga with
the route's `maskedErrors`, and reads a refusal as `extensions.code`, never as
the thrown type — the ingredients files since MB.185, the vocabulary, identity
and coven files since MB.186. A test that watches a loader or shares one across
operations, or records what a sender was asked to mail, hands `run` its own.

`tests/modules/ingredients/graphql/workspace-ingredients.test.ts` holds the three
mutations' half: the input that names a stamp or a tier, or leaves a field out,
refused before any resolver runs; the answer equal to a fresh read; the child
loaders cleared between two updates in one request; and per mutation one
`VALIDATION`, one `FORBIDDEN` (a viewer, who reads the row) and, for the update
and the delete, one `NOT_FOUND`.

### The compendium mutations

Story 18's writes (M5.5), registered by `ingredients` in
`graphql/compendium-entries.ts` over M5.2's services
([`db/compendium-writes.md`](../db/compendium-writes.md), "Compendium
writes"): `createCompendiumIngredient`, `updateCompendiumIngredient` and
`deleteCompendiumIngredient`, with the signatures DESIGN.md §7's sketch
gives them. Everything the workspace mutations above say of the inputs'
lists, the answer and a refusal holds here, bar the tier and MB.162's
curated values.

- **The site admin's alone, twice.** Each carries `authScopes: { admin: true }`,
  and the service's `assertSiteAdmin` refuses again; a coven's owner is
  refused as its viewer is. No coven is an argument, and neither input
  declares a tier or a stamp.
- **`CompendiumIngredientInput` is the create's**: `IngredientInput`'s
  fields with `nomenclature` required, since every compendium entry declares
  one (DESIGN.md §5). Leaving it out is a schema error before any resolver
  runs.
- **`CompendiumIngredientUpdateInput` is the whole entry**, every field
  non-null, `""` or `[]` clearing one and `formId: ""` for no pick, as
  `IngredientUpdateInput` is (MB.159). `categoryIds` is among them, so an
  update that left it out cannot silently unfile the entry. The update clears
  the entry from the five child loaders first, as `updateIngredient` does.
- **`endRedirect` answers MB.82's question.** A write taking an address
  another entry still redirects from is `VALIDATION` with one `fieldErrors`
  entry at `['endRedirect']`, naming that entry and when its window
  closes; the same call with `endRedirect: true` goes through
  ([`db/ingredient-slugs.md`](../db/ingredient-slugs.md), "Ingredient
  slugs").
- **A delete is soft and answers the deleted id**, as `deleteIngredient`
  does; a spell holding the entry still reaches it. A coven's ingredient, a
  deleted entry and an id that names nothing are `NOT_FOUND`, so the admin
  reaches no coven's row by id.

`tests/modules/ingredients/graphql/compendium-entries.test.ts` holds the three
writes' half: the input left short refused before any resolver runs, the
loaders cleared between two updates, `endRedirect` reaching the service on the
create and the update, and per mutation one `FORBIDDEN` — a coven's owner,
since `authScopes: { admin: true }` is a gate of its own — one `NOT_FOUND` for
the update and the delete, and one `VALIDATION` for the two that take an input.
Every other non-admin, and every collision, is
`services/compendium-entries.test.ts`'s.

### References: `Reference`, `createReference`, `updateReference` and `referenceSuggestions`

A source, kept once and linked from every row it supports (DESIGN.md §5,
"References"; MB.151, built by MB.153), registered by `ingredients` over
`services/references.ts` ([`db/references.md`](../db/references.md)).

- **`Reference` is declared over the row** and never exposes `workspaceId`;
  the tier is `isGlobal`, as on `Ingredient`. Its fields are §5's, its
  `kind` the enum `ReferenceKind` with the database's values, `web_page`
  included, and its two days `LocalDate`s. `citation` is the one renderer's
  output joined plain, `renderCitation` in `src/lib/citation.ts`, so a chip,
  a sort and a screen reader read one string; a surface that shows italics
  calls the renderer for its parts.
- **One input, `ReferenceInput`, for both writes.** An update replaces the
  reference, so a field left out or `null` is cleared: a day has no empty
  value to send, which is why this input, unlike the ingredient's, is not
  made all non-null. The shared schema validates it per `kind`, each refusal
  `VALIDATION` on the field that failed — a web page's `url` and
  `accessed`, a chapter's, an article's or an entry's `container`, a book's
  `published` — never a constraint's name ([`validation.md`](../validation.md)).
- **The tier is the `workspaceId` argument.** Null writes the compendium,
  under `assertSiteAdmin`; a coven's is written under
  `assertMembership(…, { ingredient: ['create'] })` or `['update']`, which
  owners and members hold and viewers, site admins and non-members do not.
  Both carry `signedIn`. A member citing a compendium reference cannot edit
  it: under their coven the id names nothing there, `NOT_FOUND`, and without
  one the admin check is `FORBIDDEN`. `updateReference` reaches every row
  citing it, so it clears `referencesByIngredient` whole. There is no
  `deleteReference` in v1. Revalidating the `compendium` tag on a
  compendium-tier write is M8.7's, with every other admin mutation.
- **`referenceSuggestions` is the picker's search**, which MB.154's field
  reads: the compendium's references and the named coven's, never another's,
  matched at the compendium search's 0.5 word similarity against `authors`,
  `title` and `container`, accents folded, best match first. It cannot match
  the rendered citation, which rule 7 would need in SQL. A blank `query`, or
  one under two characters, lists both tiers by title. The refusals are
  `ingredientSuggestions`'. A null `workspaceId` reads the compendium's
  alone, asking no membership, which is all a compendium entry may cite
  (M5.5; `planetSuggestions`' bullet says why it stays signed-in).

`tests/modules/ingredients/graphql/references.test.ts` holds their half: the
tier the `workspaceId` argument names, `referencesByIngredient` cleared by a
write, `Ingredient.references` read signed out, `withoutReferences` reaching
the read, the search's compendium-only mode, and one refusal per error code at
each field — `FORBIDDEN` and `VALIDATION` on both writes, `NOT_FOUND` on the
update. The tier rule, the order and who else is refused are
`services/references.test.ts`'s and `services/ingredient-references.test.ts`'s.

### Categories: `categories`, `createCategory`, `updateCategory` and `deleteCategory`

The category vocabulary (M5.6), registered by `vocabulary` over
`services/categories.ts` ([`db/categories.md`](../db/categories.md),
"Category writes"). `Category` and `CategoryGroup` are DESIGN.md §7's
sketch, as the chips read them (MB.36).

- **`categories` is public** (MB.80): no scope, and no session reaches the
  service. It pages the live categories under live groups by their group's name,
  then their own, then id (MB.126, the owner's call: the picker's order),
  each group through `categoryGroupsById`, one read for a whole page.
  `query` and `groupId`, both optional, narrow it as `users(query:)` narrows
  the user list (MB.178): a name holding the query, a group's categories, and
  a `groupId` that is not a uuid an empty page rather than an error. The
  admin page reads the same service on navigation (rule 1). Like the
  compendium's, the connection carries `totalCount` and `countBefore`, from
  `countCategories` over `findCategoryCount`, the page's own filter and key, for
  "Page X of Y". MB.126's picker
  and M8.11's filter read it from the browser: one page of the hard maximum
  holds the 63 seeded categories.
- **One input, `CategoryInput`, for both writes**: `name`, `description`
  and `groupId`, all required. There is no slug, which follows the name
  (M4.3). An update replaces the category and keeps a seeded row's
  `seedKey` (MB.171).
- **The writes carry `admin`**, the scope M5.7 puts on every admin
  mutation, and `assertSiteAdmin` refuses again in the service, which is the
  gate. A slug collision is `VALIDATION` on `name`, naming the category
  holding the address (MB.43). A retired or unknown group is `VALIDATION` on
  `groupId`, and an unknown, deleted or malformed id is `NOT_FOUND`.
- **`deleteCategory` answers the deleted id**, as `deleteIngredient` does.
  While a live compendium entry is filed under the category it is
  `FORBIDDEN`, and the message names the entries and how many more, verbatim
  to the admin. Both writes clear `categoriesByIngredient`, which an earlier
  root field may have filled. Revalidating the `compendium` tag is M8.7's.

`tests/modules/vocabulary/graphql/categories.test.ts` holds their half (MB.186):
a page with its groups in one read, the count, the cursor, the two filters
reaching the read and the count, and per write one refusal per error code —
`FORBIDDEN` to a coven's owner, since `authScopes: { admin: true }` is a gate
of its own; `VALIDATION` on the create and the update; `NOT_FOUND` on the
update and the delete; and the delete's in-use `FORBIDDEN`, its message
verbatim. Every other non-admin, what a filter matches, a malformed `groupId`
and every collision are `services/categories.test.ts`'s.

### Forms: `ingredientFormGroups` and the three form writes

The form vocabulary's writes (M5.6a), registered by `vocabulary` over
`services/ingredient-form-values.ts` ([`db/categories.md`](../db/categories.md),
"Form writes"), in the categories' shape. The type is `IngredientFormValue`,
not `IngredientForm`, which is the entry-form component (DESIGN.md §7).

- **`ingredientFormValues` counts its pages** (M5.6a): `totalCount` and
  `countBefore`, from `countIngredientFormValues`, for the admin page's "Page X
  of Y". `query` and `groupId`, both optional, narrow it as they narrow
  `categories` (MB.178): a name holding the query, a group's forms, and a
  `groupId` that is not a uuid an empty page rather than an error.
  **`ingredientFormGroups`** is public too, the live groups by name, a form's
  group picked from them; six are seeded, so it carries no count.
- **One input, `IngredientFormValueInput`, for both writes**: `name`,
  `description` and `groupId`, required, and `endRedirect`, the admin's
  answer to a rename that would end another entry's redirect (MB.82). No
  slug: a form's is its name and its group, `formSlug`, and follows either.
- **The writes carry `admin`**, and `assertSiteAdmin` refuses again in the
  service. A slug collision is `VALIDATION` on `name`, naming the form holding
  the address; a retired or unknown group is `VALIDATION` on `groupId`; a
  rename that would make a compendium entry another's identity or address is
  `VALIDATION` on `name`, naming both; one that would end a redirect is
  `VALIDATION` on `endRedirect`; an unknown, deleted or malformed id is
  `NOT_FOUND`.
- **`deleteIngredientFormValue` answers the deleted id**, and is `FORBIDDEN`
  while a live compendium entry picked the form, naming the entries and how
  many more. Update and delete clear `ingredientFormsById`, which an earlier
  root field may have filled reading a `formChoice`.

`tests/modules/vocabulary/graphql/ingredient-form-values.test.ts` holds their
half as `categories.test.ts` does, with the groups' page, `ingredientFormsById`
cleared by an update, and `endRedirect` reaching the update as its
`VALIDATION`; the rules are `services/ingredient-form-values.test.ts`'s.

### Planets and signs: `planets`, `zodiacSigns` and the six writes

The two flat astrology vocabularies' reads and writes (MB.95), registered by
`vocabulary` over `services/astrology.ts`
([`db/astrology-vocabularies.md`](../db/astrology-vocabularies.md), "The
admin writes"), in the forms' shape without the group. One type per
vocabulary, `Planet` and `ZodiacSign`, though the rows share a shape, so a
client never asks which table a value came from; the module registers both
from one table of names, so the two cannot drift.

- **`planets` and `zodiacSigns` are public** (MB.80) and count their pages,
  `totalCount` and `countBefore`, for the admin pages' "Page X of Y". An
  optional `query` narrows them to the names holding it, read literally.
- **One input per vocabulary, `PlanetInput` and `ZodiacSignInput`**: `name`
  and `description`, required. No slug: it follows the name.
- **The writes carry `admin`**, and `assertSiteAdmin` refuses again in the
  service. A slug collision is `VALIDATION` on `name`, naming the row
  holding the address; an unknown, deleted or malformed id is `NOT_FOUND`.
  A rename carries onto every live compendium entry listing the value.
- **`deletePlanet` and `deleteZodiacSign` answer the deleted id**, and are
  `FORBIDDEN` while a live compendium entry lists the value, naming the
  entries and how many more. No loader holds a planet or a sign, so neither
  write clears one.

`tests/modules/vocabulary/graphql/astrology.test.ts` holds both lists' half — a
page counted, and `query` reaching the read and the count — and the six
writes' as `categories.test.ts` does, a held value's `FORBIDDEN` included. A
rename carried onto the entries, and every other rule, are
`services/astrology.test.ts`'s.

### Groups: the category-group and form-group writes

The two group vocabularies' writes (M5.6b), registered by `vocabulary` over
`services/category-groups.ts` and `services/ingredient-form-groups.ts`
([`db/categories.md`](../db/categories.md), "Group writes"), in the
categories' shape. There is no new list query: the admin pages read the
services on navigation (rule 1), and `ingredientFormGroups` already answers
the browser.

- **Two inputs, each for both of its writes.** `CategoryGroupInput` is
  `name`, `description`, `colorDark` and `colorLight`, all required;
  `IngredientFormGroupInput` is `name` and `description`. No slug, which
  follows the name.
- **`createCategoryGroup`, `updateCategoryGroup` and `deleteCategoryGroup`;
  `createIngredientFormGroup`, `updateIngredientFormGroup` and
  `deleteIngredientFormGroup`.** Each carries `admin`, and
  `assertSiteAdmin` refuses again in the service, which is the gate. A colour
  under 4.5:1 on its own ground is `VALIDATION` on `colorDark` or
  `colorLight`, the message naming the theme, the surface and the ratio
  verbatim (MB.36, MB.43). A slug collision is `VALIDATION` on `name`, as is
  a form-group rename that would re-slug a form onto another's address. An
  unknown, deleted or malformed id is `NOT_FOUND`.
- **A delete takes an optional `moveTo` and answers the deleted id.** The
  group's live categories or forms move to the group `moveTo` names, a form
  re-slugged there, before the soft delete, in one transaction. A group with
  live rows and no other live group named, or a moved form that would take
  another's address, is `VALIDATION` on `moveTo`. A form group is never
  `FORBIDDEN` for a compendium entry's pick, since the moved forms stay
  curated.
- **The writes clear the loaders an earlier root field may have filled**:
  `categoryGroupsById` on a category group's update and delete, and
  `categoriesByIngredient` on its delete; `ingredientFormGroupsById` and
  `ingredientFormsById` on a form group's update and delete. Revalidating the
  `compendium` tag is M8.7's.

`tests/modules/vocabulary/graphql/category-groups.test.ts` and
`ingredient-form-groups.test.ts` hold the writes' half: the loaders cleared by
an update, `moveTo` reaching the delete, and per write one refusal per error
code — `FORBIDDEN` to a coven's owner, `VALIDATION` (a colour, a collision or
`moveTo`), and `NOT_FOUND` on the update and the delete. Every other
non-admin, each colour and every collision are
`services/category-groups.test.ts`'s and `services/ingredient-form-groups.test.ts`'s.

### Auth scopes: the second check

`@pothos/plugin-scope-auth` gives the schema three scopes, all read off the
context without a query:

| Scope      | Holds when                                   |
| ---------- | -------------------------------------------- |
| `signedIn` | the request has a session                    |
| `admin`    | the session's role is admin                  |
| `self`     | the user id it is given is the session's own |

A scope is the second check, never the first. The service's own check is the
gate (CLAUDE.md rule 1), and a scope on a field is a cheap early refusal in
front of it: `me` carries `signedIn`; `User.email`, `role` and
`canCreateWorkspace` carry `{ self: user.id, admin: true }`, which holds if
either does; M5.7 puts `admin` on every admin mutation, and M5.6's three
category writes and M5.5's three compendium writes carry it from the first. `ok` and the
compendium's queries, `categories` among them, carry no scope at all, and the sweep above names
them so. The private fields'
test hands `me` another user's row, standing in for a service that chose the
wrong one, which is the bug the scope is behind, and reads each refusal as
`extensions.code` through the shared harness. A
scope refusal throws `Forbidden` from `src/lib/errors.ts`, the same type a
service throws, so the transport maps one refusal shape whichever check said
no (MB.43).

### The SDL snapshot

The schema is TypeScript, so it has no readable document of its own.
`src/graphql/schema.graphql` is that document: the printed SDL, committed, and
checked by `tests/graphql/schema-snapshot.test.ts` through Vitest's
`toMatchFileSnapshot`. It is one of the two permitted snapshots, beside the
design tokens (DESIGN.md §11), because the schema is a contract and a change to
it should show up in the diff rather than pass silently.

- **A schema change fails the test until the file is regenerated.** Vitest
  never overwrites an existing snapshot without `-u`, and under `CI` it does
  not write a missing one either, so CI fails on a changed schema and on a
  deleted file alike. Locally, a missing file is written on the first run.
- **Regenerating is the deliberate step:**
  `npm run test -- tests/graphql/schema-snapshot.test.ts -u`. The rewritten
  file is committed with the change that moved it, and a reviewer reads the
  contract change in `schema.graphql`'s diff.
- **Only a contract change moves it.** Pothos's `toSchema()` sorts types and
  fields lexicographically by default, so reordering the imports in
  `src/graphql/schema/index.ts` changes nothing.
- **Prettier ignores it.** `printSchema` owns the layout, and a reformat would
  fail the test. `.prettierignore` carries it.
