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
  `usersById` loader resolves them to display names once a field reads it (M6.18). A test walks every object type in the
  schema and fails on any type other than `AuditInfo` with an audit-named
  field, so a per-table audit shape fails in the PR that adds it.
- **`ok: Boolean!` stays beside the real fields.** It mirrors Better Auth's
  `/api/auth/ok`: it answers without a session or the database, which is what
  the route's tests and the e2e spec probe the endpoint with.

### Resolver helpers

A resolver holds only what the transport adds to the service it calls, and
the transport's share is written once, in `src/graphql/context-helpers.ts`
(MB.212). None of it decides who may: that is the service's (CLAUDE.md
rule 1).

- **`sessionOf(context)`** is the session, non-null, or `Forbidden` for a
  signed-out caller: the refusal a field scope gives, so the transport maps
  one shape. It narrows the type for a service that takes a `Session`; a
  scoped field has refused a null session already, and the service checks
  again. `.oxlintrc.json` holds a module's resolvers and loaders to it: oxlint
  has no `no-restricted-syntax` to refuse `if (!session) throw new
Forbidden()` itself, so its `src/modules/*/graphql/**` and
  `src/modules/*/loaders/**` override refuses a runtime import of
  `Forbidden`, which the statement cannot be written without and which
  neither directory has another use for.
- **`definedArgs(args)`** makes each null absent: GraphQL sends null for an
  optional argument or input field, and a service's filter or input takes
  `undefined`. A list passes the fields it names, `definedArgs({ query,
groupId })`, never a connection's whole `args`, which also carry `first`
  and the cursors. A lone scalar keeps its `?? undefined` in place.
- **`suggestionConnection(name, type, suggest)`** registers a picker's
  suggestion field — `celestialBodySuggestions`, `zodiacSuggestions`,
  `formSuggestions`, `deitySuggestions`, `commonNameSuggestions` and
  `referenceSuggestions` — as one connection taking an optional
  `workspaceId` and `query`, an absent `query` sent as a blank one.
  `ingredientSuggestions`, whose `workspaceId` is required, is written out.

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
id's slot for anyone but the caller, unless the caller is a site admin, who
may list anyone's by name and role (M9.19) and reaches none of those
workspaces' contents. A `WorkspaceMember` carries `role`, `joinedAt`,
`workspace`, `user` and `audit`; `Workspace` is `id`, `name`, `slug`,
`members` and `audit`. `memberships` is a bare list, bounded by its parent:
a user sits in the covens they joined, and no more.

`Workspace.members` is a coven's live members, in the order they joined, and
is a paged connection rather than a bare list, because a coven's roll grows
with every invitation and nothing about its parent bounds it (CLAUDE.md rule
8; M6.11). Its service, `listMembers(session, workspace, page, query?)` in
`src/modules/coven/services/members.ts`, checks `member: read`, which the
owner holds and, from M6.13, the member too, and reads one page through the
repository's `findMemberPage`. The optional `query: String` argument narrows
the page to the members whose name holds the text, case-insensitively and with
`%` and `_` read literally, in SQL; blank is no filter. A coven at a time, not batched across covens by
a loader: no page lists two covens' members at once
([`m6.11-members-without-a-loader.md`](../design-decisions/m6.11-members-without-a-loader.md)).
`WorkspaceMember.user` is a `CoMember`, an `id` and a nullable `name`, and
never the `User` type, whose email a scope would have to guard. The name
resolves through `usersById` (MB.10;
[`auth/display-names.md`](../auth/display-names.md)), so the names on a page
of members are one read. Through `me`, a member's name sits eight levels
down, one past the depth limit (["Protections"](protections.md)), so
`workspace(id: ID!): Workspace!` reaches a coven from the query root, where a
name sits six levels down. Its service, `workspaceById` in
`src/modules/coven/services/workspace-by-id.ts`, checks `workspace: read` and
answers the same bare `FORBIDDEN` to a stranger and to an id no coven holds, so
the answer says nothing of whether the coven exists. The Record a Working dialog's
participant box searches the members through it as the user types
([`components/spell-card.md`](../components/spell-card.md), "Record a Working,
Edit and the More menu"). The members page does not need it: a server component
calls `listMembers` directly (M6.13). `tests/modules/coven/services/workspace-by-id.test.ts`
holds the refusals, and `graphql/workspace-members.test.ts` the field.

`users(query: String, awaitingApproval: Boolean, role: UserRole)` is the admin user list
(MB.52), a paged connection of the ordinary `User`, so `email` resolves through
its scope and no second path. `query` matches a substring of the name or the
email, `awaitingApproval` narrows to `canCreateWorkspace = false`, and `role`
to one site role. Its
service, `listUsers`, refuses anyone but a site admin, and the query carries
no scope of its own: it is a read, which M5.7's mutation sweep does not reach
([`auth/admin-users.md`](../auth/admin-users.md), "The user list").

`privilegeChanges(userId: ID, privilege: UserPrivilege, query: String)` is
the privilege ledger (MB.199; `query`, part of the subject's name or email,
MB.200's), a paged connection of `PrivilegeChange`, newest first: `id`,
`privilege`, `change` (`PrivilegeChangeKind`), `via` (`PrivilegeRoute`), the
nullable `note`, `audit`, and `subject` and `actor` as the ordinary `User`,
nullable where no live account holds the id. The two share the
`usersByIdForAdmin` loader, so a page reads its users once. The query carries
the `admin` scope, the first paged connection to, and its service,
`listPrivilegeChanges`, refuses anyone but a site admin again
([`auth/admin-users.md`](../auth/admin-users.md), "The privilege ledger").

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

`setName(name: String!): User!` is the account page's Name section (MB.88):
signed-in only, by scope, and `setName` in the identity module renames the
session's own row, trimmed, through `withAudit`. A blank or over-long name
is a `VALIDATION` error on `name`, and a provisional account is
`FORBIDDEN` ([`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "The
account page").

`setPassword(newPassword: String!): Boolean!` is the account page's Password
section for an account with no password yet: signed-in only, by scope, and
`setPassword` in the identity module gives the session's own account a first
password through Better Auth. A refused password, or an account that already
has one, is a `VALIDATION` error on `newPassword`, and a provisional account is
`FORBIDDEN` ([`auth/passwords.md`](../auth/passwords.md), "Setting a first
password").

`grantWorkspaceCreation(userId: ID!): User!` and
`revokeWorkspaceCreation(userId: ID!): User!` are M5.8's approval and its
undoing: each writes `canCreateWorkspace` on a live user and a row in MB.193's
ledger, and answers the row. Each carries the `admin` scope, and its service
refuses anyone but a site admin again, as it refuses a change that changes
nothing and an admin's flag, as `FORBIDDEN` with a message naming the user ([`auth/admin-users.md`](../auth/admin-users.md), "Approving workspace
creation").

Their GraphQL files hold the transport's half (MB.180, MB.186;
["The workspace ingredient mutations"](#the-workspace-ingredient-mutations)
says what that half is), and a signed-out caller at `me`, `users`,
`setEmail`, `setName`, the two creation writes and `privilegeChanges` is `tests/db/graphql-query-scopes.test.ts`'s.
`tests/modules/identity/graphql/me.test.ts` holds the caller's own row and
`memberships` through the request's loader. `users.test.ts` holds the default
page and the filters reaching `listUsers`, the nodes being `me`'s
`User`, and `providers`' `admin` scope refused on a user's own row; who is
refused the list is `services/user-list.test.ts`'s. `user-private-fields.test.ts`
holds the four private fields' `self`-or-`admin` scope, below.
`set-email.test.ts` holds `next` reaching the sender, and one `VALIDATION`;
every refusal's rule is `services/email.test.ts`'s.
`workspace-creation.test.ts` holds, per write, an admin's answer and one
refusal per error code the service gives an admin; who is refused, and the
`admin` scope, are `services/workspace-creation.test.ts`'s and the sweep's.
`privilege-changes.test.ts` holds every field, the filters reaching the
service, one user read per page, and one non-admin's `FORBIDDEN`; the order and
who the service refuses are `services/privilege-changes.test.ts`'s.

### `celestialBodySuggestions` and `zodiacSuggestions`

The autofill behind the celestial body and zodiac fields (MB.94), registered by
`vocabulary`. Each takes `workspaceId`, an optional `query` and the
connection arguments, as DESIGN.md §7's sketch gives them, and its nodes are:

```graphql
type CorrespondenceSuggestion {
  value: String!
  description: String # the curated row's; null for a value only in use
  curated: Boolean!
}
```

- **One type for both fields.** A celestial body and a sign suggestion carry the same
  three things, and neither carries a group. `form`'s suggestion, which does,
  is its own type, below.
- **Each is a `pagedConnection`**, one list over both buckets: curated values
  first, name matches before description matches, then values in use in the
  compendium and the named workspace that no live row curates. `curated` tells
  a client which bucket a row came from, and the order is the finder's
  ([`db/member-autofill.md`](../db/member-autofill.md), "The member's autofill").
- **`query` is optional.** Blank or absent, the field lists the whole
  vocabulary and every in-use value, still a page at a time.
- **Two refusals, one type.** Signed out, the resolver's `sessionOf` refuses with
  `Forbidden` before the service is reached. Signed in, `assertMembership`
  refuses a workspace the caller does not belong to with the same
  `Forbidden`, a site admin included. The field carries no scope, because the
  resolver's null check is the same early refusal.
- **A null `workspaceId` reads the compendium alone** (M5.5): the curated
  rows, then the values in use in the compendium, under no proof, so no
  membership is asked and any signed-in caller is answered. It is the admin's
  compendium form, which names no coven; signed out is still refused, because
  MB.80's public line is drawn field by field and no public page reads these.
  The form, not the field, keeps a compendium entry to the curated rows
  (MB.162; [`components/ingredient-form.md`](../components/ingredient-form.md),
  "On the compendium").

`tests/modules/vocabulary/graphql/suggestions.test.ts` holds the transport's
half (MB.186): the nodes, a page by cursor, `zodiacSuggestions` reading its
own vocabulary, and the compendium-only mode reaching its service. The buckets,
an absent `query`, the thresholds and who is refused under a coven are
`services/suggestions.test.ts`'s; a signed-out caller, under a coven or none, is `tests/db/graphql-query-scopes.test.ts`'s, and a `workspaceId` naming no
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
  _substance_, and a variant's `form` stores the string. The pair comes back as
  two suggestions, in group order, and a client renders "Wax (Substance)".
- **`id` is what a pick sends** (MB.167): the curated row's, as `formId`, or
  as a deity entry's `deityId`; null for a value only in use, which is sent
  as text. A celestial body or sign records no pick, so its suggestion has no `id`.
- **`claimants` names who already holds the value**, in the compendium and the
  named workspace only: formal name first, and a claimant with none by its
  label, so a `none` entry is not hidden. A nested list rather than a connection
  — the guard in ["Pagination"](pagination.md) allows one, bounded by its parent
  — and never longer than the in-scope ingredients.
- **A common-name suggestion has one bucket.** There is no curated vocabulary
  of common names, so no `curated` and no `description`. The in-use names are
  every in-scope entry's display name and live folk names: "Cat's Claw" is the
  display name of five seeded rows, and the story's own example.
- The refusals are `celestialBodySuggestions`': `Forbidden` from the resolver when
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
  matchedName: String # the other name the query matched (M14.23); null when the name matched, or for a value in use
}
```

- **A deity is found by its other names too** (M14.23). A query that matches
  none of the deity's name but one of its live `deity_other_names` finds it in
  tier 0, and `matchedName` carries the closest such name, so the picker can
  say "Also called Woden" on Odin's row. A pick still sends the deity's `id`
  and its `value`, never the other name.
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
- The refusals, and a null `workspaceId`, are `celestialBodySuggestions`'.

`tests/modules/vocabulary/graphql/deity-suggestions.test.ts` holds what
`suggestions.test.ts` holds, with each curated row's `id` and `tradition`;
the rules are `services/deity-suggestions.test.ts`'s.

### `compendiumMatches`

M12.20's question before a duplicate: `compendiumMatches(workspaceId, name)`
lists the compendium entries whose name or formal name is exactly the typed
one, folded to lower case, and no other tier, so no coven's own entry is ever
offered. `findCompendiumMatches` asserts read membership of the coven first,
so a viewer is answered and a non-member is `FORBIDDEN` by direct id. It is
paged (`t.pagedConnection`, ordered by name, the form asks for five), and a
blank name answers empty. Its node is the `Ingredient`, whose
`inCupboard(workspaceId)` says whether that coven's cupboard holds it
(through the batched `cupboardEntryByIngredient` loader, so a page is one
read); `possibleDuplicates` nodes carry it too. `workspaceId` is nullable
there, answering false, so the admin's call shares the document.

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
- **The refusals are `celestialBodySuggestions`'.** The resolver refuses a signed-out
  caller with `Forbidden`. For a signed-in caller the check is the service's
  `assertMembership` for `ingredient: ['read']`, which refuses a coven the
  caller is not in, a site admin included. A viewer is answered, because every
  row the field returns is one a reader of the coven could already list.
- **A null `workspaceId` matches the compendium alone** (M5.5), asking no
  membership, as `celestialBodySuggestions` does: the admin's compendium form,
  which drops the entry being edited from what it shows.

### `ingredientSuggestions`

The substitute picker's search (MB.138), registered by `ingredients` over
`suggestIngredients` and the finder `findIngredientSuggestions`
([`db/compendium-read.md`](../db/compendium-read.md), "The ingredient
picker's search"). MB.131's combobox calls it as a substitute is typed, with
`workspaceId`, `query`, an optional `form`, an optional `categoryIds` and the connection arguments, and picking a node
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
  label, the formal name, the live folk names and the live variants' forms and
  descriptions, accents folded, so a typed prefix finds its entry. `possibleDuplicates`' whole-string 0.4 does not:
  `mu` is under 0.4 similar to Mugwort and 0.67 word-similar. Best match
  first, under the compendium's weights, with no score on the edge, since a picker ranks rather than reports.
  A blank `query` lists both groups by name, so an opened box lists something.
- **Each edge carries a `group` (M12.19)**, the `SuggestionGroup` enum, `yours` or `compendium`. `yours` is the coven's cupboard, its own entries and the compendium entries it holds, listed first; `compendium` is the rest. Each group is ranked by score within itself and holds up to eight to start. A coven's own entry and a compendium entry sharing its name both appear: a name match hides nothing (M12.28). A held entry's node answers `cupboardEntry(workspaceId)` for the label the coven gave it. `group` is on the edge, not the node, because it depends on the viewing coven, as `score` does on `compendium`. `form` ranks within each group ([`db/compendium-read.md`](../db/compendium-read.md)).
- **`categoryIds` keeps entries carrying any of the ids**, on the entry or on one of its variants, through the compendium filter's `any` mode. Null or empty is no filter. The spell builder's Add to Jar picker sends the categories pressed above its box; the list is paged, so a filter applied after fetching would miss matches.
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
  score: Float # the search's weighted rank, 0 to 1; null without a search
}
```

- **The `compendium` query is the search.** `query`, `categoryIds`,
  `forms`, `deityIds`, `zodiacSigns`, `celestialBodies` and `toxic` are the service's, filtered in SQL
  ([`db/compendium-read.md`](../db/compendium-read.md), "The compendium
  read"): the query at least 0.5 word-similar (`<%`) to the label, the formal
  name, a live folk name, or a live variant's form or description (MB.218),
  case- and accent-folded, so a prefix and a
  transposed pair both find their entry; every listed category (AND; M8.12
  adds a mode); and four lists and a toxic setting (M11.22, [`../design-decisions/m11.22-search-facets.md`](../design-decisions/m11.22-search-facets.md)). `forms` keeps an entry holding a live variant whose form, trimmed and lower-cased, is any one of the list, so an entry with two forms is found under either, once (MB.222). `deityIds` keeps an entry with a live link to any one of the listed curated deities. `zodiacSigns` and `celestialBodies` keep an entry whose own list holds any one of the values, folded on both sides. `toxic` is the `ToxicFilter` enum, `any`, `toxic` or `not_toxic` (lower case, as `Nomenclature` is): `toxic` keeps an entry flagged on itself or on any live form, `not_toxic` one where neither holds, a retired form's flag counts for nothing, and `any` or leaving it out is no filter. Within one kind the chosen values OR; across kinds the filters AND. An empty list, a blank entry, or a value matching nothing is no filter rather than an error. The single `form: String` argument is gone; the admin list sends a one-item `forms`. The facet screen and its counts are M12.3 and M12.4. The browser never holds more than a page (rule
  8), so it cannot be the search, which is why M8.4's client-side
  `filterIngredients()` was retired (DESIGN.md §14). `elements` (M8.13, `[IngredientElement!]`, lower case) matches an entry whose
  `elements`, or those of any live variant, hold any one listed, among others or alone, by array overlap
  in SQL (MB.157, MB.215). On `workspaceIngredients` too. The admin's two to-do lists, which M5.5
  puts on `/admin/compendium`: `withoutReferences: true` (MB.153), only the
  entries citing no live compendium reference, so an entry whose one link is
  unlinked, or cites a soft-deleted reference, is on it, as its bibliography
  reads empty; and `nomenclature` (M5.5), only the entries so classified, so
  `unknown` is the formal names still to look up. A third, `withoutForms: true`
  (M12.30), keeps only the entries with no live form, so one whose forms are all
  soft-deleted is on it, and it is public as the rest of the query is (MB.80).
  Any left out, or `withoutReferences: false` or `withoutForms: false`, is no filter, and `totalCount` counts under
  the same filter.
- **A search is ranked, best match first.** It pages
  `(score DESC, name, id)`, and each edge carries `score`, its rank: the
  query's word similarity to each field it matched — the label, the formal
  name, a folk name, a variant's form or description — times that field's
  weight, the best kept. The weights run from 1 for the label down to 0.2 for
  a description, so a word in an entry's own name outranks the same word in
  another entry's prose; the five and why are
  [`db/compendium-read.md`](../db/compendium-read.md)'s. Without a search the list pages `(name, id)` and `score` is null. A
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
  and never exposes `identityKey` or `workspaceId`. `folkNames`,
  `categories`, `substitutes`, `deities` and `references` go through the five
  ingredient loaders, `folkNamesByIngredient`, `categoriesByIngredient`,
  `substitutesByIngredient`, `deitiesByIngredient` and
  `referencesByIngredient`, keyed by the row itself, and `variants` through
  `variantsByIngredient` (MB.218); `Category.group`,
  `IngredientFormValue.group` and `Deity.tradition` through the three id-keyed
  group loaders, `categoryGroupsById`, `ingredientFormGroupsById` and
  `deityTraditionsById`; `Deity.otherNames` through `otherNamesByDeity`
  (M14.23); and a variant's `formChoice` through
  `ingredientFormsById` (MB.167; ["Loaders"](loaders.md)).
- **`FolkName` is an id and a name** (DESIGN.md §7, M12.1). The id is the live
  row's, so a client can name one to `promoteFolkName`; it carries no `audit`.
  `Ingredient.folkNames` is non-null, `[]` with none, and sorted by `name`. The
  inputs still take bare strings: a name typed and not yet saved has no id.
  The public entry page's `IngredientDetail.folkNames` stays a list of names,
  since it only displays them.
- **`Substitute` is a link or a typed name** (DESIGN.md §7, MB.138; built by
  MB.140): `name` is what it shows — the linked ingredient's label, its last
  once deleted, or the typed text — and `ingredient` is the one to follow,
  null on typed text and on a deleted link, so a client links exactly when it
  is set. `Ingredient.substitutes` is non-null, `[]` with none, and sorted by
  `name`. A page of ingredients reads its substitutes in one statement, the
  linked ingredients joined in, through the hatch
  ([`db/soft-delete.md`](../db/soft-delete.md)). It carries no `audit`, as
  `folkNames` carries none. `variant` (MB.218) is the linked ingredient's form
  the link names, null without one and wherever `ingredient` is null: it is
  found among the linked ingredient's variants through `variantsByIngredient`,
  so a form is read beneath its ingredient and never by its id alone.
- **`IngredientVariant` is one form of an ingredient** (DESIGN.md §7, MB.215;
  built by MB.218): its own fields, `formChoice` (below), and `categories`, `substitutes` and `references`, that form's
  own additions through `categoriesByVariant`, `substitutesByVariant` and
  `referencesByVariant`, keyed by the variant row, which carries its
  ingredient's tier. An ingredient's own lists are its rows with no variant, so
  nothing appears in both and nothing is merged: a client shows a form's beside
  its ingredient's (the union rule).
- **`IngredientDeity` is a pick or a typed name** (DESIGN.md §7, MB.167),
  read as `Substitute` is: `name` is as saved — a pick's curated spelling, or
  the typed text — and `deity` the curated `Deity` picked, null on typed text
  and once that deity or its tradition is retired. `Ingredient.deities` is
  non-null, `[]` with none, and in the order entered. `Deity` carries its
  `tradition`, which tells two "Hecate"s apart, and is registered by
  `vocabulary` in `graphql/deities.ts` with `DeityTradition`.
  `IngredientVariant.formChoice` is the curated `IngredientFormValue` that
  the variant's `formId` records, null when the form was typed and once the
  form or its group is retired, so the text stands alone. `Ingredient` has no
  `form` or `formChoice` since MB.222: a client reads an entry's forms
  through `variants`.
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
  value of a variant's `form`, and `IngredientForm` is the entry-form component
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
  may be empty, so no resolver file holds a signed-out test of its own. Since
  M5.7 every `Mutation` field is also named as an admin write or one any
  session may reach, and each admin write is run signed in as A, a coven's
  owner who holds no site role, with E admitted and the service's own refusal
  as the preconditions in the same case
  (["Auth scopes: the second check"](#auth-scopes-the-second-check) says how it tells
  the scope from the service).
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
the edge's `score` where there is one, a page by cursor, and the
compendium-only mode reaching its service with a null workspace, with
`ingredient-suggestions.test.ts`'s one `FORBIDDEN`; the
thresholds, the scope, what the compendium-only mode answers and who is
refused are their services' tests' (MB.187).

**MB.215: `IngredientVariant` and `Ingredient.variants`.** MB.218 adds the type for an ingredient's forms, `IngredientVariant { id, form, formChoice, description, safetyNotes, elements, celestialBodies, zodiacSigns, colors, categories, substitutes, references, audit }`, and `Ingredient.variants: [IngredientVariant!]!`, a list nested on its ingredient and so bare rather than a connection, since the pagination guard reads `Query` alone; each list comes through a loader, and `Substitute` gains `variant`. MB.219 adds `variants: [IngredientVariantInput!]` to `ingredientInputFields`, so the four ingredient inputs carry it, and there is no variant mutation (DESIGN.md §7). MB.222 dropped `Ingredient.form` and `formChoice` and the inputs' `form` and `formId`, made `variants` required on all four inputs, and made the `compendium` query's `form` argument match an entry holding a live variant of that form (M11.22 later turned it into the `forms` list). The SDL snapshot and `src/gql/` follow each ([`../design-decisions/mb.215-ingredient-variants.md`](../design-decisions/mb.215-ingredient-variants.md)).

### `compendiumSourcingScore` and the `sort` argument

`compendiumSourcingScore(id: ID!): SourcingScore` is a curator's read of one compendium entry's sourcing score: `score`, an integer, and `facts`, each a `SourcingFact` with its `fact` (the `SourcingFactKind` enum), its Title Case `label` and its `points`. Every fact is listed, zero-point ones too, and the points add up to the score. The field carries the `curator` scope with an `unauthorizedResolver` that answers `null`, so a member, a viewer or a signed-out request reads `null` rather than an error, by direct id too. The resolver calls `readSourcingScore`, which checks the curator again (rule 1) and reads the entry's forms and citations through the per-request loaders. `Ingredient` has no score field, so a coven's ingredient, the public read, `llms.txt` and the `.well-known` files never carry one. `tests/modules/ingredients/services/compendium-sourcing.test.ts` and the `nulls` probe in `tests/db/graphql-query-scopes.test.ts` hold this.

`compendium` takes an optional `sort: CompendiumSort`, whose one value `sourcing_score` orders the list by that score, lowest first ([`../db/compendium-read.md`](../db/compendium-read.md), "The sourcing sort"). Anyone who is not a curator or admin is refused with `Forbidden`.

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
- **The four ingredient input types spread one field set**,
  `ingredientInputFields(t, { tier, whole })` in `graphql/ingredient-input.ts`
  (MB.211): `whole` makes every field non-null, and the compendium tier
  requires `nomenclature` on a create too. The field descriptions vary with
  the two switches, so the SDL is the one the four declared by hand.
- **`IngredientInput` is the create's.** Only `name` and `variants` are
  required, so story 29's one-field stub is `{ name, variants: [] }` (MB.222). With no formal name, a `nomenclature`
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
  nullable `[IngredientElement!]`, as `celestialBodies` is.
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
  `formId` sits beside `form` on each `IngredientVariantInput`, non-null,
  where `""` means the form was typed. It must name a curated form — live,
  under a live group — and `form` must fold to that form's name, which is
  written in its spelling; anything else is a `VALIDATION` field error at
  `['variants', i, 'formId']` or `['variants', i, 'form']`, never a 23503. A deity entry is `{ deityId }` or `{ name }`,
  exactly one, as a substitute's is; a deity picked anew must be curated, and
  one the ingredient already holds is kept once retired, sent back by id or
  by name. The list replaces the live rows in the order sent
  ([`db/ingredient-children.md`](../db/ingredient-children.md)).
- **`categoryMode`** (M8.12): a `CategoryMode` enum, `all` or `any`, beside
  `categoryIds` on `compendium` and `workspaceIngredients`, defaulting to `all`.
  `any` matches an entry holding any of the ids; it changes nothing with fewer
  than two.
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
  `folkNamesByIngredient`, `substitutesByIngredient`, `deitiesByIngredient`,
  `referencesByIngredient` and `variantsByIngredient`, and empties the three
  variant child loaders, through `clearIngredientChildren`, which
  clears every loader `loaders/ingredient-children.ts` defines (MB.211). Root mutation fields run in turn within one
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

**`variants` on all four inputs** (MB.219): `[IngredientVariantInput!]!`, each
a whole form whose every field but `id` is non-null, `""` or `[]` clearing
one, as MB.159 holds every row-replacing input. The list itself is
required on all four, the two creates included, since MB.222 removed the
inputs' top-level `form` and `formId`, which an input without it used to
read as its one form: a create with no form, such as story 29's one-field
stub, sends `variants: []`. `SubstituteInput` gains `substituteVariantId`, one
form of the linked ingredient. A form's refusal is `VALIDATION` pathed to it,
`['variants', 1, 'form']`. Both update mutations clear `variantsByIngredient`
with the other child loaders, so a second update in one request answers its
own forms.

`tests/modules/ingredients/graphql/workspace-ingredients.test.ts` holds the three
mutations' half: the input that names a tier, or leaves a field out, refused
before any resolver runs; the answer equal to a fresh read; the child
loaders cleared between two updates in one request; and per mutation one
`VALIDATION`, one `FORBIDDEN` (a viewer, who reads the row) and, for the update
and the delete, one `NOT_FOUND`.

### `workspaceIngredients`

Story 14's list (M9.4), registered by `ingredients` in
`graphql/workspace-ingredient-list.ts` over `listWorkspaceIngredients`
([`db/stock.md`](../db/stock.md), "The workspace ingredient list"): a coven's
own entries and the compendium entries it holds a jar of, a page at a time,
as a `t.pagedConnection` of `Ingredient`. It takes the coven as `workspaceId`,
and `query`, `categoryIds`, `forms`, `deityIds`, `zodiacSigns`, `celestialBodies` and `toxic` (M11.22), which filter as `compendium`'s do, still under the coven's membership check.
Two more arguments are the coven's alone (M9.7), left out of `compendium`: `source`, an
`IngredientSource` of `local` (the coven's own entries) or `compendium` (the
compendium entries it holds), where leaving it out lists both; and `inStock`, which keeps an
entry only when one of the coven's jars of it is not at 0, a jar with no quantity counting as
held, so a local entry with no jar leaves; and `lowStockOnly` (M9.8), which keeps an
entry only when one of its jars is at 0 or at or under a threshold above 0 (Out of Stock or Low Stock). A coven the caller is not in answers `FORBIDDEN`; any member, viewers included,
may read it. An entry's jars are its `stock` field, below, so a page reads its
stock in one batch whatever its length.

**The coven's pages are numbered on the server only (M9.6).** The Ingredients page shows "Page X of Y" like the compendium's, from `countWorkspaceIngredients`, which `workspaceIngredients` does not expose: the connection carries no `totalCount`, because only the server-rendered page counts. The count is not cached, as the data is the coven's.

`tests/modules/ingredients/graphql/workspace-ingredient-list.test.ts` holds the
transport's half: the page and its cursor, the arguments reaching the read,
one read each for a page's stock, its categories and its jars' forms, and the
one refusal. Which rows the list holds is the service test's.

### `compendiumFacets` and `workspaceIngredientFacets`

The numbers beside each choice in the search's filter panel (M12.3): for
every value of every filter, how many entries the list would hold with that
value picked. `compendiumFacets` sits in `graphql/compendium.ts` and takes
exactly `compendium`'s filter arguments (`query`, `categoryIds`,
`categoryMode`, the six facet arguments, `withoutReferences`, `withoutForms`,
`reviewed` and `nomenclature`), with no page. `workspaceIngredientFacets` sits in
`graphql/workspace-ingredient-list.ts` and takes `workspaceIngredients`'
(`workspaceId`, `query`, the category arguments, the six facet
arguments, and the coven-only `source`, `inStock` and `lowStockOnly`), so a count agrees with the list under the same filter. Each resolver hands its arguments to its service,
`compendiumFacets` or `workspaceIngredientFacets` in
`services/ingredient-facets.ts`, and checks nothing itself. How each value
is counted is [`db/compendium-read.md`](../db/compendium-read.md),
`findCompendiumFacets`, and which rows a coven's counts read is
[`db/stock.md`](../db/stock.md), "The workspace ingredient list".

`compendiumFacets` answers one `CompendiumFacets` object and
`workspaceIngredientFacets` one `IngredientFacets`. Neither is a list, so neither is
a connection (a paged list), and the pagination guard, which fails a bare
list on `Query`, has nothing to exempt. Its seven lists are bounded by the
vocabularies and by the forms, deities and categories the counted entries
carry. Each item's `value` has the type of the argument it would be sent
back as, so a client can put a picked value straight into the next query.
`CompendiumFacets` adds `withoutReferences`, how many entries cite no live
reference under the rest of the filter, and `withoutForms`, how many have no live form, each the same whether its switch is on or
off; a coven's list has no such switch. The seven shared fields are written
once, in `facetFields`, which both types spread.

`CompendiumFacets.reviewed` (M14.8) is a nullable `ReviewFacetCount` list:
how many entries are reviewed (`value: true`) and how many need review
(`value: false`), counted under the rest of the filter with `reviewed` left
out. It is null, with no error, for anyone who neither curates nor
administers, so the public panel and a signed-out caller can ask for the
facets and learn nothing of the mark. Both `compendium` and
`compendiumFacets` take a `reviewed: Boolean` argument; sent by anyone but a
curator or an admin it is `FORBIDDEN`, refused by `compendiumFilterFor` in the
service ([`db/compendium-read.md`](../db/compendium-read.md), `reviewed`).

A coven's `IngredientFacets` also carries two counts that a compendium list has no
switch for (M9.7), so the two answers are two types and the fields are non-null on
the coven's alone. `source` is a `SourceFacetCount` list (`value` is `local` or
`compendium`, `count` an `Int!`) that always holds both values, zeros kept, each
counted with the Source setting blanked and everything else, In Stock
included, kept. `inStock` and `lowStockOnly` are each one `Int!`: how many entries the list would
hold with that switch on, under the rest of the filter and the chosen Source. A
count equals the list's `totalCount` under the same filter.

```graphql
type CompendiumFacets {
  # the seven fields of IngredientFacets, then:
  withoutReferences: Int!
  withoutForms: Int!
  reviewed: [ReviewFacetCount!] # null to anyone but a curator or an admin
}

type ReviewFacetCount {
  value: Boolean! # true reviewed, false needs review
  count: Int!
}

type IngredientFacets {
  # a coven's also has source: [SourceFacetCount!]!, inStock: Int! and lowStockOnly: Int!
  forms: [NameFacetCount!]!
  deities: [IdFacetCount!]!
  categories: [IdFacetCount!]!
  zodiacSigns: [NameFacetCount!]!
  celestialBodies: [NameFacetCount!]!
  elements: [ElementFacetCount!]!
  toxic: [ToxicFacetCount!]!
}

type NameFacetCount {
  value: String!
  count: Int!
}

type IdFacetCount {
  value: ID!
  count: Int!
}

type ElementFacetCount {
  value: IngredientElement!
  count: Int!
}

type ToxicFacetCount {
  value: ToxicFilter! # toxic or not_toxic, never any
  count: Int!
}
```

`compendiumFacets` is public like `compendium`: no `signedIn` scope and no
session, and its service caches the answer under the `compendium` tag
([`db/compendium-cache.md`](../db/compendium-cache.md)).

`compendiumFacets` also takes `covenIds: [ID!]` (M12.55, In My Covens on the
public compendium): count only the entries that a live
`workspace_compendium_entries` row of any one of these covens holds. The
resolver hands it to `compendiumFacetsHeldIn` (`services/compendium-held-in.ts`),
which deduplicates the ids, keeps the first 20, and asks
`assertMembership` for each against the caller's session with
`ingredient:read`, which every role holds, viewers included. An id the caller is not a member of, or one that is not a uuid, is
dropped without an error, so a foreign coven's id narrows nothing and says
nothing about that coven. With no id left, or none given, or no session, the
answer is the cached, public one above. With at least one, it is read per
request and never cached (rule 6). `covensNot: Boolean` turns it to Not In:
count only the entries none of the proved covens holds, and with no
`covenIds` given, none of the caller's covens, every membership counted. If
`covenIds` were given and every one was dropped, it is the cached answer
under Not In too, so a foreign id never changes it. `compendium` itself takes no `covenIds`: the
page reads the narrowed list through the service, `listCompendiumHeldIn` and
`countCompendiumHeldIn`, never through the GraphQL list.
`workspaceIngredientFacets` refuses as `workspaceIngredients` does: a
signed-out caller and a coven the caller is not in both answer `FORBIDDEN`,
and any member, viewers included, may read it. It is never cached.

`tests/modules/ingredients/graphql/ingredient-facets.test.ts` holds the
transport's half: the arguments reaching each service, each value typed as
its argument, the No Refs count with the switch on and off, and the refusal of a non-member naming a coven by id; `covenIds` reaching the held-in service is its `compendiumFacets covenIds (M12.55)` block, and the membership proof, the foreign id included, is `tests/modules/ingredients/services/compendium-held-in.test.ts`. The
signed-out answers are `tests/db/graphql-query-scopes.test.ts`'s, and a
malformed `workspaceId` is `tests/db/graphql-workspace-ids.test.ts`'s.

### Stock: `InventoryItem`, `Ingredient.stock` and the stock writes

Story 14's jars (M9.4), registered by `ingredients` in `graphql/stock.ts` over
the stock service ([`db/stock.md`](../db/stock.md), "The stock service").

- **`InventoryItem`** is one jar: one form of one ingredient in one coven. Its
  `ingredient` loads through `ingredientsById`, keyed by the jar's coven, and
  its `variant` is the form it names, found in `variantsByIngredient`'s
  answer, so a page of jars costs one read for each. `quantityOnHand` and
  `lowStockThreshold` are `Float`: Postgres returns `numeric` as text, and the
  field turns it into a number. `unit` is the `InventoryUnit` enum and
  `unitDimension` the `UnitDimension` enum, both built from
  `src/modules/ingredients/schema/units.ts`, so the schema cannot drift from
  the one module that owns the units. `acquiredDate` is a `LocalDate`.
- **`Ingredient.stock(workspaceId)`** is the coven's live jars of the entry, one
  per form it holds, empty when it holds none. It reads through the
  `stockByIngredient` loader ([`loaders.md`](loaders.md)), so a page of entries
  makes one read per coven named. A coven the caller is not in refuses at the
  field, `FORBIDDEN` with the field's path.
- **`StockInput`** has every field optional and no `unitDimension`, which the
  service derives from the unit. On `updateStock` a field left out keeps its
  value and `null` clears it. The form is the add's own `variantId` argument,
  never an input field, so a jar cannot be moved to another form.
- **`addIngredientToWorkspace(workspaceId, variantId, input)`** starts a jar of
  one form. A form the coven already holds is `VALIDATION` beside `variantId`,
  and an id naming no form the coven may read, such as an entry with no forms,
  is `NOT_FOUND`. Picking the one form of a single-form entry without asking
  is the page's job (M9.6); the API always takes a form.
- **`updateStock(workspaceId, id, input)`** answers the changed jar, and
  **`deleteStock(workspaceId, id)`** soft-deletes it and answers its id.
- **`saveStock(workspaceId, ingredientId, input: SaveStockInput!): [InventoryItem!]!`**
  (M9.9) is the stock dialog's one Save, over the three writes' rules in one
  transaction. `SaveStockInput` is three lists, so a delete cannot carry a
  quantity and `StockInput`'s omit-keeps, null-clears reading holds in each
  row:

  ```graphql
  input SaveStockInput {
    create: [CreateJarInput!]! # { variantId: ID!, input: StockInput! }
    update: [UpdateJarInput!]! # { id: ID!, input: StockInput! }
    delete: [ID!]!
  }
  ```

  `ingredientId` scopes the batch: a jar or form of another ingredient or coven,
  a deleted one, or an id that is not one is `NOT_FOUND` and nothing is
  written. The answer is the ingredient's live jars after the write. A bad row
  is one `VALIDATION` error carrying every bad row's `fieldErrors`, each
  `path` in the shape of the input: `create.<i>.input.<field>` and
  `update.<i>.input.<field>` for `StockInput`'s rules, and
  `create.<i>.variantId` for a form the coven already holds. A jar named twice
  is `VALIDATION` at `update.<i>.id` or `delete.<i>`. An empty save writes
  nothing and answers the current jars. The single-jar mutations stay: the
  entry page and anything saving one jar still use them.

All four writes carry the `signedIn` scope, and the service asks the proof for
`inventory: update`, which viewers do not hold. The add, the update and `saveStock`
clear the changed jar's (or the ingredient's) `stockByIngredient` key, so a second write in one request
answers its own stock; the delete answers no row to key by, so it clears the
loader whole.

`tests/modules/ingredients/graphql/stock.test.ts` holds the transport's half:
each answer equal to a fresh read, the loader cleared between two updates in
one request, and per field one refusal per error code it can answer. Which
roles are refused at which jars is `services/stock.test.ts`'s.

### Cupboard entries: `CupboardEntry` and `Ingredient.cupboardEntry`

A coven's own say over a compendium entry it holds (M12.14), registered by
`ingredients` in `graphql/cupboard-entries.ts` over the cupboard-entry service
([`db/workspace-compendium-entries.md`](../db/workspace-compendium-entries.md),
"Reading it").

- **`CupboardEntry`** is one row of `workspace_compendium_entries`: its `id`,
  the seven overrides (`label`, `description`, `safetyNotes`, `elements`,
  `celestialBodies`, `zodiacSigns`, `colors`), and two fields worked out on
  read. A null override means "the compendium's value", and an empty list is
  one the coven cleared on purpose. `annotated` is true when any of the seven
  is set, so a list can mark the entries a coven has said something about.
  `compendiumName` is the compendium entry's own name, read off the parent
  `Ingredient`, so a page can show it beside the coven's label.
- **`Ingredient.cupboardEntry(workspaceId)`** is that coven's live row for the
  entry, or null: null for an entry the coven does not hold, and for a coven's
  own ingredient, which has no cupboard entry. It reads through the
  `cupboardEntryByIngredient` loader ([`loaders.md`](loaders.md)), so a page of
  entries makes one read per coven named. A coven the caller is not in refuses
  at the field, `FORBIDDEN` with the field's path, as `Ingredient.stock` does.
  Any member reads it, viewers included.

The field answers the row beside the entry rather than merged into it, so
`Ingredient` itself still answers the compendium's values and `isGlobal` stays
true for a compendium entry. Forms, folk names, substitutes, categories,
references and `toxic` have no override and always read from the compendium.

**`Ingredient.retired: Boolean!`** (M12.24) is true for a compendium entry
the curators have retired, which `ingredient(id, workspaceId)` still answers
to a member of a coven whose cupboard names it, and false for every other
entry. It resolves through the service's `isRetired` off the row. The
entry's child fields read through the loaders, whose keys carry no reading
coven, so they answer nothing for a retired entry yet; the entry page reads
them through `ingredientDetailOf` instead
([`db/workspace-compendium-entries.md`](../db/workspace-compendium-entries.md),
"When the compendium retires the entry").
`tests/modules/ingredients/graphql/ingredient.test.ts` holds its transport
half.

`tests/modules/ingredients/graphql/cupboard-entries.test.ts` holds the
transport's half: the answer and its `annotated`, a viewer answered, the
refusal at the field, the nulls, and one repository read for a page of entries,
counted by a spy.

**The three writes** (M12.15) take the coven and the compendium entry's id, and
answer through the same `nodeOf` as the read, so the loader is cleared and the
answer is a fresh read:

- **`addCupboardEntry(workspaceId, ingredientId, input)`** answers the new
  `CupboardEntry`. `input` is optional.
- **`annotateCupboardEntry(workspaceId, ingredientId, input, expectedRevision)`**
  answers the row after the change, with its `revision`. A stale
  `expectedRevision` is `STALE_WRITE`; leaving it out writes over a newer one. A field left out keeps its value, `null` hands it back
  to the compendium, and a list, even empty, is the coven's own.
- **`removeCupboardEntry(workspaceId, ingredientId)`** answers the
  `ingredientId`, as the other deletes answer the id. It is refused with
  `VALIDATION` while the coven holds a jar of the entry.

A viewer is `FORBIDDEN`, an entry the coven does not hold is `NOT_FOUND`,
and a taken label is `VALIDATION` beside `label`
([`db/workspace-compendium-entries.md`](../db/workspace-compendium-entries.md),
"Writing it").

**Make It Ours** (M12.23), `convertCompendiumEntryToLocal(workspaceId,
ingredientId)`, makes a compendium entry the coven holds into the coven's
own, the entry page's Make It Ours, and answers a `ConvertedCompendium`:
`entry`, the new own `Ingredient`, and `dropped`, the same
`DroppedOnConvert`, in which only `folkNames` can be non-empty (a folk name
the new name took). A viewer is `FORBIDDEN`, an entry the coven does not
hold `NOT_FOUND`, and a taken label or an own entry of the same identity
`VALIDATION` beside `label`, `canonicalName` or `name`
([`db/workspace-compendium-entries.md`](../db/workspace-compendium-entries.md),
"Converting a compendium entry into our own").

### The grimoire: `Spell`, `grimoire`, `spell` and the two saves

The coven's spells as the API reads them (M10.9), registered by `grimoire` in
`graphql/spell.ts` over `services/spell-reads.ts`. Every read asks the proof
for `spell: read`, which every role in the coven holds, and every row comes
through the finders that keep a private spell its author's
([`db/spell-visibility.md`](../db/spell-visibility.md)). So a private spell
never reaches a resolver: it is left out of a list in SQL, and by id it is
`NOT_FOUND`, the same answer as a spell that does not exist.

- **`grimoire(workspaceId, orderBy, status, query, first, after)`** is a cursor page
  (a page that resumes from the last row it gave, rather than counting rows to
  skip) of the coven's shared spells and the caller's own private ones. It is
  declared with `t.pagedConnection` and reads through `findGrimoirePage`.
  - `orderBy` is the `GrimoireOrder` enum, and each order's cursor key ends
    in the spell's id, so spells that tie on the rest still page once each:

    | Value                    | Order                                  |
    | ------------------------ | -------------------------------------- |
    | `UPDATED_DESC` (default) | last edited first, by `updatedAt`      |
    | `CREATED_DESC`           | newest first, by `createdAt`           |
    | `TITLE_ASC`              | by title, A to Z, untitled spells last |

    A draft may go untitled (M13.15), so `TITLE_ASC` sorts on whether the
    title is missing first, then on the title read as empty when missing. A
    cursor compares its key as one row value, which a null part would break.

  - `status` is the `SpellStatus` enum, `draft` or `complete`. Given, it
    keeps only the spells of that status, filtered in SQL; left out, the page
    holds both. The grimoire page (M10.11) reads its Drafts tab through it.
  - `query` searches the title and the intent (M10.11), through the
    weighted search the ingredient lists use
    ([`db/compendium-read.md`](../db/compendium-read.md)): a title match
    counts for twice an intent match, and the best match comes first, with
    `orderBy` breaking a tie. A search under two characters
    (`MIN_QUERY_LENGTH`, counted in composed code points) is no search, the
    same floor the compendium keeps; `listGrimoire` and `countGrimoire` drop
    it, so the page and its count agree. The grimoire page's type-ahead reads
    through it.
- **`spell(id, workspaceId): Spell!`** is one spell. It takes the coven as
  `ingredient(id, workspaceId)` does, so the membership check runs before any
  read. A spell in another coven, or another author's private spell, is
  `NOT_FOUND`.
- **`Spell`** carries its own columns, `status` and `visibility` as the
  `SpellStatus` and `SpellVisibility` enums built from the columns, and three
  lists that each load through a loader ([`loaders.md`](loaders.md)). Its
  `title` is nullable, because a draft may go untitled until it is complete
  (M13.15), and `revision` is the count a save names (M10.10, below). The
  lists:
  - `steps` (`stepsBySpell`): every live step in recipe order, instructions
    and one-off rows included.
  - `categories` (`assignedCategoriesBySpell`): the categories the author
    assigned, what the spell intends.
  - `derivedCategories` (`derivedCategoriesBySpell`): what the spell is made
    of. Each linked step contributes its ingredient's own categories and those
    of the form it lays, never another form's. A one-off row and an
    instruction contribute none. An ingredient deleted since still
    contributes (M5.3).

  `categoryGaps` is a `CategoryComparison`: `intendedNotPresent`, assigned but
  carried by no ingredient, and `presentNotIntended`, carried but not
  assigned. It is worked out by `compareSpellCategories` from the two category
  loaders' cached answers, so it costs no read of its own.

- **`SpellStep`** is one step. `ingredient` is the linked ingredient, kept and
  answered even once it has been deleted, and `variant` the form it lays,
  answered too once that form alone has been deleted, through
  `findFormsInSpellsIncludingSoftDeleted` (M10.9). `name` and `form` read the
  linked row's when there is one and the step's own text otherwise.
  `quantity` is a `Float`, turned from Postgres's `numeric` text, and `unit`
  the stock's `InventoryUnit` enum.

- **`createSpell(workspaceId, input: SpellInput)`** and
  **`updateSpell(workspaceId, id, input: UpdateSpellInput)`** (M10.10) save a
  spell's fields and its recipe, over `services/spells.ts`. Both answer the
  `Spell`, and both clear that spell's three loaders first, so the answer's
  steps and categories are the ones just written, even in a request that read
  them before the save.
  - `steps` is a list of `SpellStepInput`, the whole recipe in order. A step
    with an `id` is a saved step, kept; one without is new; a saved step left
    out is removed. On `updateSpell`, leaving `steps` out leaves the recipe
    as it is. [`db/grimoire.md`](../db/grimoire.md), "Saving a recipe", has
    the rules and the checks.
  - `categoryIds` (M10.14) is the whole set of categories the spell is
    assigned: one left out is unassigned, and `[]` empties the set. On
    `updateSpell`, leaving it out leaves the set as it is. An id that names
    no live category is `VALIDATION` at `['categoryIds', index]`.
    [`db/grimoire.md`](../db/grimoire.md), "Saving its categories", has the rules.
  - Every other field is nullable. On `updateSpell`, a field left out keeps
    its value, and null clears it. A `status`, `visibility`, `steps` or
    `categoryIds` sent as null is read as left out, since none of the four
    can be cleared that way.
  - `expectedRevision` is the revision the save was written against. GraphQL
    cannot require a field that may be null, so the schema has it as a
    nullable `Int`, and the service refuses a save that leaves it out as
    `VALIDATION`. Null writes whatever the revision is. A revision no longer
    current is `STALE_WRITE`, with `extensions.currentRevision`.
  - A viewer is `FORBIDDEN`; a spell the caller cannot read is `NOT_FOUND`.

A page of spells with all three lists costs the same reads as one spell: the
page, then eight batched reads (three for the steps, two for the assigned
categories, three for the derived ones), plus one membership check per coven
named. A coven the caller is not in refuses at the field, `FORBIDDEN` with the
field's path.

`tests/modules/grimoire/graphql/spell.test.ts` holds the transport's half: the
fields, the gaps both ways, the refusal codes by direct id, the paging, the
`orderBy`, `status` and `query` arguments, and the read count for a page of one and
of four, which is also where the loaders' batching is proved. Which reader
sees which spell is `services/spell-reads.test.ts`'s. The saves' transport half is
`tests/modules/grimoire/graphql/spell-saves.test.ts`: the answer and its
revision, the loaders cleared, the nulls, and one refusal per code.

### Workings: `Spell.workings`, `workingCount`, the four writes and the preview

A working is one time a spell was made (M13.4, M13.5), registered by
`graphql/working.ts` over `services/workings.ts`. No resolver authorizes or
queries: every service asks for `working: read | create | update | delete`, and
a private working is its recorder's in SQL, so by id it is `NOT_FOUND`.

- **`Spell.workings(first, after)`** is a cursor page of the workings of the
  spell the caller may read, newest `workedOn` first. It is declared with
  `t.pagedConnection` and reads through `findWorkingsPage`. The service reads
  the participants and the deductions of the whole page in one query each,
  so a page costs the same reads however many workings it holds.
- **`Spell.workingCount: Int!`** counts the complete workings the caller may
  read, through the `workingCountBySpell` loader: one query per coven for a
  whole page of spells, and `0` for a spell with none. A completion clears it.
- **`SpellWorking`** has `status`, `workedOn` (a `LocalDate`), `completedAt`,
  `note`, `visibility`, `participants`, `deductions`, `warnings` and `audit`.
  A participant is a `userId` or a typed `name`; a member's name is the one
  their row last held. A deduction is in the jar's own unit.
  `warnings` is filled only on the answer to a completion.
- **`recordWorking(workspaceId, spellId, input)`**, **`updateWorking(workspaceId, id, input)`**,
  **`completeWorking(workspaceId, id)`** and **`deleteWorking(workspaceId, id)`**.
  `WorkingInput` mirrors `validation/working.ts`; a bad participant lands on
  `participants.<index>` as `VALIDATION`. `completeWorking` answers
  `CompleteWorkingResult { working, warnings }`, one warning per step it took
  nothing for, with a `NotDeductedReason`. `deleteWorking` answers the id.
  Making a complete working private again is `FORBIDDEN` with its explaining
  message.
- **`workingDeductionPreview(workspaceId, spellId)`** answers what completing
  a working would take from each jar and what it would take nothing for, using
  the same `planDeductions` as completion and writing nothing.

`tests/modules/grimoire/graphql/working.test.ts` holds the transport's half.

### The compendium mutations

Story 18's writes (M5.5), registered by `ingredients` in
`graphql/compendium-entries.ts` over M5.2's services
([`db/compendium-writes.md`](../db/compendium-writes.md), "Compendium
writes"): `createCompendiumIngredient`, `updateCompendiumIngredient` and
`deleteCompendiumIngredient`, with the signatures DESIGN.md §7's sketch
gives them. Everything the workspace mutations above say of the inputs'
lists, the answer and a refusal holds here, bar the tier and MB.162's
curated values.

- **A curator's or the site admin's, twice.** Each carries `authScopes: { curator: true }`,
  and the service's `assertCurator` refuses again (M11.20); a coven's owner is
  refused as its viewer is. No coven is an argument, and neither input
  declares a tier or a stamp.
- **`CompendiumIngredientInput` is the create's**: `IngredientInput`'s
  fields with `nomenclature` required, since every compendium entry declares
  one (DESIGN.md §5). Leaving it out is a schema error before any resolver
  runs.
- **`CompendiumIngredientUpdateInput` is the whole entry**, every field
  non-null, `""` or `[]` clearing one and a variant's `formId: ""` for no
  pick, as `IngredientUpdateInput` is (MB.159). `categoryIds` is among them, so an
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

**`setCompendiumEntryReviewed(id: ID!, reviewed: Boolean!): Ingredient!`**
(M14.8) sets a curator's review mark on a compendium entry, or clears it so
the entry needs review. It carries `authScopes: { curator: true }` and the
service's `assertCurator` refuses again; a coven's ingredient, a deleted
entry and an unknown id are `NOT_FOUND`. It answers the entry, but no field
of `Ingredient` carries the mark or the reviewer: the compendium's reads are
cached and shared by every viewer (CLAUDE.md, rule 6), so the admin's
details read the mark on the server through `readCompendiumReview`
([`db/compendium-read.md`](../db/compendium-read.md)), never through the
type. Create, update and promote set the mark in their services
([`db/compendium-writes.md`](../db/compendium-writes.md)).

**`compendiumEntryUsers(id: ID!): Int!`** (M12.25) answers how many covens
hold a compendium entry in their cupboard, for the delete confirm. It carries
`authScopes: { curator: true }` and the service's `assertCurator` refuses
again; an id that is not a live compendium entry (a coven's ingredient, a
deleted entry, an unknown id) is `NOT_FOUND`. It is a count and never names a
coven ([`db/workspace-compendium-entries.md`](../db/workspace-compendium-entries.md),
"Counting covens").

`tests/modules/ingredients/graphql/compendium-entries.test.ts` holds the three
writes' half: the input left short refused before any resolver runs, the
loaders cleared between two updates, `endRedirect` reaching the update's
service, one `NOT_FOUND` for the update and the delete, and one `VALIDATION`
for the create. A non-admin at the `admin` scope is the sweep's; who the
service refuses is `services/compendium-entries.test.ts`'s, and every collision
is `services/compendium-entry-slugs.test.ts`'s.

### Promoting a common name: `promoteFolkName`

`promoteFolkName(workspaceId: ID, id: ID!, folkNameId: ID!): Ingredient!`
(M8.3a) swaps an ingredient's display name with one of its common names
([`db/workspace-ingredients.md`](../db/workspace-ingredients.md), "Workspace
ingredients"). It takes `createReference`'s shape: a null `workspaceId` names a
compendium entry and carries the `curator` scope, anything else the `signedIn`
scope with the membership check deciding. It answers the swapped entity, and
clears the child loaders as `updateIngredient` does. A common name that is not
live on that ingredient answers `NOT_FOUND`.

### References: `Reference`, `reference`, `createReference`, `updateReference` and `referenceSuggestions`

A source, kept once and linked from every row it supports (DESIGN.md §5,
"References"; MB.151, built by MB.153), registered by `ingredients` over
`services/references.ts` ([`db/references.md`](../db/references.md)).

- **`Reference` is declared over the row** and never exposes `workspaceId`;
  the tier is `isGlobal`, as on `Ingredient`. Its fields are §5's, its
  `kind` the enum `ReferenceKind` with the database's values, `web_page`
  included, and its two days `LocalDate`s. The type's text fields and the
  input's are built from `REFERENCE_TEXT_FIELDS` (MB.209, MB.212), the one
  list of them, so a field added to `CitationFields` reaches the wire too. `citation` is the one renderer's
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
  The scope follows the same argument: a null one carries `admin`, a coven's
  `signedIn` (M5.7). A member citing a compendium reference cannot edit
  it: under their coven the id names nothing there, `NOT_FOUND`, and without
  one the admin check is `FORBIDDEN`. `updateReference` reaches every row
  citing it, so it clears `referencesByIngredient` whole. There is no
  `deleteReference` in v1. A compendium-tier write
  expires the `compendium` tag, as every admin write does (M8.7).
- **`reference(id, workspaceId)` reads one source whole**, for the
  ingredient form's edit panel to open on (MB.115): a null `workspaceId`
  the compendium's alone, a coven's its own or the compendium's, never
  another coven's — `getReference`, under `ingredient: ['read']`, the
  picker's tiers and permission, so it answers nothing the picker does not
  already offer. Another coven's id is `NOT_FOUND`, as an id naming nothing
  is; a coven the caller is not in is `FORBIDDEN`. It carries no scope and
  refuses a signed-out caller through `sessionOf`, as the suggestion
  fields do, whatever the tier. One row, so no connection.
- **`referenceSuggestions` is the picker's search**, which MB.154's field
  reads: the compendium's references and the named coven's, never another's,
  matched at the compendium search's 0.5 word similarity against `authors`,
  `title` and `container`, accents folded, best match first. It cannot match
  the rendered citation, which rule 7 would need in SQL. A blank `query`, or
  one under two characters, lists both tiers by title. The refusals are
  `ingredientSuggestions`'. A null `workspaceId` reads the compendium's
  alone, asking no membership, which is all a compendium entry may cite
  (M5.5; `celestialBodySuggestions`' bullet says why it stays signed-in).

`tests/modules/ingredients/graphql/references.test.ts` holds their half: the
tier the `workspaceId` argument names, `referencesByIngredient` cleared by a
write, `Ingredient.references` read signed out, `withoutReferences` reaching
the read, the search's compendium-only mode, and one refusal per error code at
each field — `VALIDATION` on both writes, `NOT_FOUND` on the update and on
`reference`, which also reads a source whole; a member
at the compendium tier's `admin` scope is the sweep's. The tier rule, the order and who else is refused are
`services/references.test.ts`'s and `services/ingredient-references.test.ts`'s.

### Curated vocabularies: one factory for the seven

Every admin-curated vocabulary — categories and their groups, forms and
their groups, deities and their traditions, celestial bodies and signs — is the same
type, input and three writes, so `vocabulary/graphql/curated.ts`'s
`curatedVocabularyWrites` registers them, on the precedent of the loop the
astrology file held over its two (MB.212). Given an unimplemented
`objectRef`, it implements the type as `id`, `name`, `slug` and
`description`; registers `<Type>Input` with `name` and `description`,
both required, and no slug, which follows the name; and registers
`create<Type>`, `update<Type>` and `delete<Type>`, each under the `admin`
scope, the delete answering the id. It answers the implemented ref. What a
vocabulary adds is told to it:

- **`parent`**, for a value filed under another — a category's `group`, a
  form's `group`, a deity's `tradition`: the field, read through its loader,
  and the id column, which is also the input's required `ID`.
- **`fields` and `input`**, the type's and the input's own: a category
  group's two colours, a form group's `icon`.
- **`services`**, the three exported writes, each calling `assertSiteAdmin`
  itself; the input reaches them through `definedArgs`.
- **`moveTo`**, present for a group whose delete moves its rows first: the
  delete takes an optional `moveTo`, and the list names the loaders the move
  leaves stale. **`clears`** names those an update or a delete leaves stale.
- **`descriptions`**, the update's and the delete's, passed through, so the
  SDL is what each file declared by hand; the create carries none.

Each vocabulary's list query stays in its own file, since the filters
differ. The SDL snapshot is the proof the factory moved nothing.

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
  root field may have filled. Each write expires the `compendium` tag (M8.7).

`tests/modules/vocabulary/graphql/categories.test.ts` holds their half (MB.186):
a page with its groups in one read, the count, the two filters reaching the
read and the count, and per write one refusal per error code the service gives
an admin — `VALIDATION` on the create and the update, `NOT_FOUND` on the
update and the delete, and the delete's in-use `FORBIDDEN`. A non-admin at the
`admin` scope is the sweep's; who the service refuses, what a filter matches, a
malformed `groupId` and every collision are `services/categories.test.ts`'s.

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
  `description` and `groupId`, required. No `endRedirect` since MB.220: a
  rename moves no compendium entry's address. No slug: a form's is its name
  and its group, `formSlug`, and follows either.
- **The writes carry `admin`**, and `assertSiteAdmin` refuses again in the
  service. A slug collision is `VALIDATION` on `name`, naming the form holding
  the address; a retired or unknown group is `VALIDATION` on `groupId`; a
  rename that would give a compendium entry two forms of one name is
  `VALIDATION` on `name`, naming the entry (MB.220); an unknown, deleted or
  malformed id is `NOT_FOUND`.
- **`deleteIngredientFormValue` answers the deleted id**, and is `FORBIDDEN`
  while a live compendium entry picked the form, naming the entries and how
  many more. Update and delete clear `ingredientFormsById`, which an earlier
  root field may have filled reading a `formChoice`.

`tests/modules/vocabulary/graphql/ingredient-form-values.test.ts` holds their
half as `categories.test.ts` does, with the groups' page, `ingredientFormsById`
cleared by an update; the rules are `services/ingredient-form-values.test.ts`'s.

### Celestial bodies and signs: `celestialBodies`, `zodiacSigns` and the six writes

The two flat astrology vocabularies' reads and writes (MB.95), registered by
`vocabulary` over `services/astrology.ts`
([`db/astrology-vocabularies.md`](../db/astrology-vocabularies.md), "The
admin writes"), in the forms' shape without the group. One type per
vocabulary, `CelestialBody` and `ZodiacSign`, though the rows share a shape, so a
client never asks which table a value came from; the module registers both
from one table of names, so the two cannot drift.

- **`celestialBodies` and `zodiacSigns` are public** (MB.80) and count their pages,
  `totalCount` and `countBefore`, for the admin pages' "Page X of Y". An
  optional `query` narrows them to the names holding it, read literally.
- **One input per vocabulary, `CelestialBodyInput` and `ZodiacSignInput`**: `name`
  and `description`, required. No slug: it follows the name.
- **The writes carry `admin`**, and `assertSiteAdmin` refuses again in the
  service. A slug collision is `VALIDATION` on `name`, naming the row
  holding the address; an unknown, deleted or malformed id is `NOT_FOUND`.
  A rename carries onto every live compendium entry listing the value.
- **`deleteCelestialBody` and `deleteZodiacSign` answer the deleted id**, and are
  `FORBIDDEN` while a live compendium entry lists the value, naming the
  entries and how many more. No loader holds a celestial body or a sign, so neither
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
  `name`, `description`, `color`, all required;
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
  `ingredientFormsById` on a form group's update and delete. Each write expires
  the `compendium` tag (M8.7).

`tests/modules/vocabulary/graphql/category-groups.test.ts` and
`ingredient-form-groups.test.ts` hold the writes' half: the loaders cleared by
an update, `moveTo` reaching the delete, and per write one refusal per error
code — `VALIDATION` (a colour, a collision or `moveTo`), and `NOT_FOUND` on the
update and the delete. A non-admin at the `admin` scope is the sweep's; who the
service refuses, each colour and every collision are
`services/category-groups.test.ts`'s and `services/ingredient-form-groups.test.ts`'s.

### Deities: `deities`, `deityTraditions` and the six writes

The deity vocabulary's reads and writes (MB.132), registered by `vocabulary`
over `services/deities.ts` and `services/deity-traditions.ts`
([`db/deity-vocabulary.md`](../db/deity-vocabulary.md), "The admin's
writes"), the forms' and form groups' shape together. `Deity` and
`DeityTradition` are MB.167's types, built for an ingredient's pick; the
admin's input takes the name `DeityInput`, which MB.167 left free by naming
the pick's `IngredientDeityInput`.

- **`deities` and `deityTraditions` are public** (MB.80). `deities` counts
  its pages for the admin page's "Page X of Y" and lists each deity under its
  tradition, by the tradition's name and then its own; `query` and
  `traditionId` narrow it as `categories`' two arguments do, a
  `traditionId` that is not a uuid an empty page. `deityTraditions` is the
  live traditions by name and carries no count.
- **`DeityInput`** is `name`, `description` and `traditionId`, required,
  and `otherNames`, optional (M14.23): the whole list, so a save brings the
  stored names to the list sent and an absent list clears them. A name the
  list repeats in any case, or another live deity of the tradition holds, is
  `VALIDATION` on `['otherNames', index]`, naming the deity that holds it.
  `Deity.otherNames` is non-null, `[]` with none, and alphabetical, read
  through `otherNamesByDeity`. **`DeityTraditionInput`** is `name` and `description`. No slug, which
  follows the name, and a deity's its tradition too; no `endRedirect`, since a
  deity moves no entry's address.
- **The writes carry `admin`**, and `assertSiteAdmin` refuses again in the
  service. A slug collision is `VALIDATION` on `name`; a retired or unknown
  tradition is `VALIDATION` on `traditionId`; an unknown, deleted or
  malformed id is `NOT_FOUND`. A deity's rename carries onto every live
  compendium entry's link to it.
- **`deleteDeity` answers the deleted id**, and is `FORBIDDEN` while a live
  compendium entry picked the deity, naming the entries and how many more.
  **`deleteDeityTradition` takes an optional `moveTo`** and answers the
  deleted id: its live deities move to the tradition `moveTo` names first,
  each re-slugged there, and one with live deities and no other live
  tradition named, or a move onto another deity's address, is `VALIDATION` on
  `moveTo`. A tradition's rename re-slugs its deities, and one that would
  collide is `VALIDATION` on `name`. It is never `FORBIDDEN` for a
  compendium entry's pick.
- **The writes clear the loaders an earlier root field may have filled**:
  `deitiesByIngredient` on every deity and tradition write but a create,
  `otherNamesByDeity` on a deity's update and delete, and
  `deityTraditionsById` on a tradition's update and delete.
  Each write expires the `compendium` tag (M8.7).

`tests/modules/vocabulary/graphql/deities.test.ts` holds their half: a
filtered page and its count, the loaders cleared by an update, `moveTo`
reaching the delete, and per write one refusal per error code. Every other
role and rule is `services/deities.test.ts`'s and
`services/deity-traditions.test.ts`'s.

### Auth scopes: the second check

`@pothos/plugin-scope-auth` gives the schema four scopes, all read off the
context without a query:

| Scope      | Holds when                                      |
| ---------- | ----------------------------------------------- |
| `signedIn` | the request has a session                       |
| `curator`  | the session's role is curator or admin (M11.20) |
| `admin`    | the session's role is admin                     |
| `self`     | the user id it is given is the session's own    |

A scope is the second check, never the first. The service's own check is the
gate (CLAUDE.md rule 1), and a scope on a field is a cheap early refusal in
front of it: `me` carries `signedIn`; `User.email`, `role` and
`canCreateWorkspace` carry `{ self: user.id, admin: true }`, which holds if
either does; every people mutation (roles, creation approval, pause, admin invitations) carries `admin`, each from the task that
built it, M5.8's two creation writes included, and every compendium and vocabulary write carries `curator`, which an admin holds too (M11.20); `createReference` and
`updateReference` carry `curator` when their `workspaceId` is null, the compendium's
tier, and `signedIn` otherwise. `ok` and the
compendium's queries, `categories` among them, carry no scope at all, and the sweep above names
them so. The private fields'
test hands `me` another user's row, standing in for a service that chose the
wrong one, which is the bug the scope is behind, and reads each refusal as
`extensions.code` through the shared harness. A
scope refusal throws `Forbidden` from `src/lib/errors.ts`, the same type a
service throws, so the transport maps one refusal shape whichever check said
no (MB.43).

**The sweep proves the two checks apart (M5.7).**
`tests/db/graphql-query-scopes.test.ts` names every `Mutation` field as an
admin write, with what it governs, or one any session may reach, so a write
added later says which it is. It runs each admin write signed in as A — a
coven's owner, the highest workspace role and still no site role — with E
admitted past the scope and the service's own refusal as the preconditions in
the same case. The code cannot tell the checks
apart, since both answer `FORBIDDEN`, but the message can: the scope's
refusal is `Forbidden`'s default message, and `assertSiteAdmin` says "Only a
site admin may do this". So a non-admin hearing the default was refused by
the scope before the service ran, and the field fails the sweep the moment
its `admin` scope goes. What the service refuses, and to whom, stays its own
test's (MB.180). What an admin governs is a closed type, `Governed`, beside
the sweep, so an admin write outside it is a visible change. The admin's
reach into no coven is M6.6's (`tests/db/workspace-isolation.test.ts`).

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
