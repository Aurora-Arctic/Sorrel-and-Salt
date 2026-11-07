# 7. GraphQL API

Single route handler at `/api/graphql`. No separate service, no additional hosting cost.

**Stack:** GraphQL Yoga (server), Pothos (code-first schema, no ORM plugin — §2), DataLoader, graphql-codegen for client types.

**Client:** a small `fetch` wrapper in `src/lib/graphql-client.ts` plus TanStack Query, not Apollo. Apollo's normalized cache duplicates what TanStack Query already does here and adds ~40 kB. Codegen (`client-preset`, reading the committed SDL) generates a typed document node per operation into `src/gql/`, and no hooks: the request function runs a typed document through TanStack Query. Forms are react-hook-form with the Zod resolver; the suggesting fields of M5.10a are a headless combobox on Downshift, not react-select — §14 carries both arguments.

**Four rules follow from dropping the Drizzle plugin (MB.20), and bind every M3 task:**

- **Object types are declared by hand**, against the row type the service returns (`typeof ingredients.$inferSelect` and friends) — never a table-derived object type. TypeScript still fails the build when a column's type changes under a field.
- **`auditColumns` maps to one shared `AuditInfo` object type, defined once.** A per-table audit shape is a bug.
- **Every Pothos package in the stack is a stable major.** A `0.x` Pothos plugin entering the dependency tree is a decision argued for in the diff, not a convenience.
- **The GraphQL layer imports `drizzle-orm` for _types_ only.** Runtime query building stays behind `src/db/repository/` (§3's rule 2). A `no-restricted-imports` rule enforces it rather than leaving it to review (MB.33): a runtime import from `src/graphql` fails `npm run lint`, while `import type` — erased at compile time, and so unable to build anything — passes.

None of this rules the plugin out permanently — it is additive, and re-adopting it once it reaches a stable major is a contained change.

## Resolvers are thin

```ts
// src/modules/ingredients/graphql/compendium.ts
builder.queryField('compendium', (t) =>
  t.pagedConnection({
    type: IngredientRef,
    args: { query: t.arg.string({ required: false }) },
    resolve: (_, { query }, page) => listCompendium({ query }, page), // the filter is the service's, in SQL
  }),
);
```

No database access in a resolver, ever. Same lint rule as `db`.

## The three GraphQL costs, and how each is paid

**N+1 queries.** A query for 50 ingredients each with categories fires 101 queries without batching. DataLoader instances are created per-request in the Yoga context — `categoriesByIngredient`, `usersById`. This is a cost concern as much as a performance one.

**Authorization surface.** Handled by the service-layer choke point in §3. Pothos auth scopes provide a second check on sensitive fields (`User.email`) and on admin mutation fields, but the service layer is the real gate.

**Client-composable expense.** `graphql-armor` applies a depth limit of 7, and disables introspection and field suggestions in production. Aliasing and directive-overload protections come with it. Cost is limited by `@pothos/plugin-complexity` rather than by armor, because armor's check runs before variables are bound and so prices `first: $n` at one row. The complexity plugin prices a connection at the page it will actually fetch.

## Errors — one shape, so a message can land beside its field

Services throw rather than answering with an empty list or a success that did nothing — §11 asserts it as "not a silent no-op", and `auth/service-session.md` carries the full argument. Three types live in `src/lib/errors.ts`: `Forbidden`, `NotFound`, and `ValidationError`, which carries `issues: { path: (string | number)[]; message: string }[]`. A fourth, `StaleWrite` (M13.16), carries `currentRevision`: a revisioned write named a revision the row has since moved past (`components/autosave.md`). None of them carries a status code or a GraphQL error code — a service called from a seed or a script has no use for one — so the mapping below belongs to the transport, and MB.43 is where it lives.

Yoga maps them on the way out through `maskedErrors.maskError`, which keeps masking on: anything that is _not_ one of the four leaves as "Unexpected error", so no stack trace and no constraint name reaches a client. M11.10 makes the same promise for pages.

| Thrown            | `extensions.code` | Also carries                              |
| ----------------- | ----------------- | ----------------------------------------- |
| `ValidationError` | `VALIDATION`      | `extensions.fieldErrors`, from its issues |
| `AccessPaused`    | `ACCESS_PAUSED`   | `extensions.pausedUntil`, ISO or `null`   |
| `Forbidden`       | `FORBIDDEN`       | —                                         |
| `NotFound`        | `NOT_FOUND`       | —                                         |
| `StaleWrite`      | `STALE_WRITE`     | `extensions.currentRevision`              |
| anything else     | masked            | —                                         |

The message is the service's, verbatim. That is what carries M5.6b's "which column failed and what the ratio was", M5.2's duplicate naming the colliding entry, and M10.3's explaining refusal all the way to the person reading the form — a rewrite at the transport is how those become "Invalid input" again.

```json
{
  "errors": [
    {
      "message": "Invalid input",
      "path": ["createWorkspaceIngredient"],
      "extensions": {
        "code": "VALIDATION",
        "fieldErrors": [{ "path": ["canonicalName"], "message": "A botanical name is required" }]
      }
    }
  ],
  "data": null
}
```

**An issue's `path` names the input field**, in the shape of the mutation's own `input` — `['canonicalName']`, `['folkNames', 2]`. A rule belonging to no single field uses the empty path and the form renders it above the fields. Most refusals do have a field: the duplicate-identity collision of §5 names `canonicalName` (or `name`, for an entry whose label is its identity), a slug collision names `name` — the slug is derived and has no field of its own — a write that would end another entry's redirect names `endRedirect`, the confirmation it lacks, the contrast floor names `colorDark` or `colorLight`. What is genuinely not a field stays a `Forbidden` with a message — the last-owner guard refuses an action and offers a remedy, which is not a bad value in a box. Either way: **never a bare constraint name.**

**The client validates first and renders both sources the same way.** The Zod resolver runs the shared schema before the mutation is sent, so a well-behaved form never asks the server to reject what it could have caught; the service runs that same schema again, because the browser is not the only caller. Returned `fieldErrors` go into react-hook-form through `setError(path, { message })`, an empty path through `setError('root', …)`, and both render through the same inline error element the resolver's own errors use — one component, two sources, so a server-only rule is not a second visual language. `FORBIDDEN` and `NOT_FOUND` are not form errors; the page decides what to do with them (§9).

## Caching — three layers in v1

**One rule above all: a cache is keyed by viewer identity or holds nothing workspace-scoped** (CLAUDE.md rule 6). A cache is the easiest way to leak one workspace's data into another's response.

**1. DataLoader — per-request batching.** Collapses the 50-ingredient N+1 from 101 queries to 3. Free, no invalidation problem, non-negotiable.

**2. React `cache()` — per-request memoization.** Wraps service functions so a layout and a page requesting the same workspace hit Postgres once. Scoped to the request, no staleness risk.

**3. Next.js data cache with tag invalidation.** The compendium, the categories, the form vocabulary, the celestial body (`celestial_bodies`) and zodiac vocabularies and the deity vocabulary are read on nearly every page, mutated only by keepers, and identical for every viewer. Ideal cache target — all six share the `compendium` tag, and every keeper mutation across the six fires `revalidateTag`. The two public compendium pages (§9) are dynamic over the cached compendium reads, the layout reading the session when present; their reads sit under the same tag, so the same call refreshes them (MB.80, MB.83).

```ts
export const getCompendium = unstable_cache(() => compendiumService.listGlobal(), ['compendium'], {
  tags: ['compendium'],
  revalidate: 3600,
});
// admin mutation:
revalidateTag('compendium', { expire: 0 });
```

`revalidateTag` takes two arguments in Next 16 — the single-argument form is deprecated and a type error, so `npm run typecheck` rejects the one-argument call outright. The second argument is `{ expire: 0 }`, not the otherwise-recommended `'max'`, because a keeper who has just edited the compendium must see that edit on the very next read: `'max'` serves stale content for up to a year while the revalidation runs behind it, whereas `{ expire: 0 }` never serves stale and makes the next request a blocking miss.

Persistent across requests and shared across instances. Should remove most compendium reads from Postgres entirely. The wrapper is `src/lib/compendium-cache.ts`'s `cachedCompendiumRead`, called in the services over each list and its count, keyed by their arguments; Vitest aliases `next/cache` to a pass-through, and only one e2e server keeps a data cache ([`db/compendium-cache.md`](../db/compendium-cache.md), M8.6). Vercel's native Next.js support makes `revalidateTag` and ISR first-class, so this layer does most of the work. The help articles, the FAQ and the glossary are cached the same way under the tag `help`, revalidated on every keeper write to them (MB.175). The site's published documents (privacy, disclaimer, code of ethics, terms) are cached the same way by `src/lib/documents-cache.ts`'s `cachedDocumentRead`, under the tag `documents` with an hourly expiry; they are public and carry no viewer identity.

**`updateTag` is unavailable to this project.** It is the read-your-own-writes call — it expires the tag immediately rather than serving stale — but it may only be called from a Server Action and throws anywhere else, Route Handlers included. Every mutation here goes through the `/api/graphql` route handler (§3), and there are no server actions, so `revalidateTag(tag, { expire: 0 })` is the documented substitute wherever `updateTag` cannot be reached.

**`unstable_cache` is the legacy path, deliberately.** Its successor is the `use cache` directive under the `cacheComponents` flag, which `next.config.ts` does not set — so nothing changes today, and the two caches coexist as separate layers when it eventually does. The swap is not free either: `unstable_cache` persists values across deployments, while a `use cache` entry never carries over to a new deploy because its cache key includes the build id. A compendium that survives a deploy is worth more here than the newer directive.

**Not cached:** anything workspace-scoped. Ingredients and notes change from under you when a co-member edits, and stale shared state in a collaborative app is worse than an extra query.

**Layer 4 (Yoga response cache) is deferred to v2** — see §13.

## Help articles

The help articles, the FAQ and the glossary are rows a keeper edits (§5, `help_articles`; §10, "Help and FAQ articles"). The module is `help`, and it follows the same split as the site documents.

- **Writes** (`createHelpArticle`, `updateHelpArticle`, `deleteHelpArticle`) check `assertSiteAdmin` alone and run inside `withAudit`. A curator is refused, as with the site documents. Each write calls `revalidateTag` on the `help` tag with `{ expire: 0 }`.
- **The keeper's reads** (`helpArticles`, `helpArticle`) also take the `SiteAdmin` proof and go through `/api/graphql`, since the keeper's page is a client-driven list. `helpArticles` is a `t.pagedConnection` over `findPage` (rule 8), filterable by `kind`.
- **Public reads** take no session: the FAQ, the article index, one article with its children, a child by its parent's slug and its own, and the glossary. They are called by server components directly and wrapped in `unstable_cache` under the tag `help`, as the compendium's reads are, because they carry no viewer identity (rule 6). The glossary page reads its terms through the same cursor helper a page at a time and follows the cursors to the end inside the cached read, so one page can carry every term and an anchor always exists.
- **Rules the service holds**: the reserved slug `glossary`; the one-level parent rule; a delete refused while the row has live children, with an error that says why; and the Markdown stored as written, rendered only through the standard sanitising renderer on the way out.

## Schema sketch

```graphql
type Query {
  me: User!
  workspace(slug: String!): Workspace
  # Every list is a Relay connection (first/after/last/before), paged by one helper
  compendium(
    query: String
    categoryIds: [ID!]
    forms: [String!] # entries holding a live variant of any one of these forms (M8.13, M11.22)
    elements: [IngredientElement!] # entries whose elements hold any one of these (M8.13)
    categoryMode: CategoryMode = all # all or any of the chosen categories (M8.12)
    deityIds: [ID!] # entries linked to any one of these deities (M11.22)
    zodiacSigns: [String!] # entries holding any one of these signs (M11.22)
    celestialBodies: [String!] # entries holding any one of these celestial bodies (M11.22)
    toxic: ToxicFilter # any, toxic or not_toxic: the entry or any live form flagged (M11.22)
    withoutReferences: Boolean # the keeper's to-do list: live entries with no live link (§5, M5.5)
    withoutForms: Boolean # the keeper's second to-do list: live entries with no live variant (M12.30)
    nomenclature: Nomenclature # the other to-do list: unknown is the formal names still to look up (M5.5)
    first: Int
    after: String
  ): QueryCompendiumConnection!
  ingredient(id: ID!, workspaceId: ID): Ingredient! # NOT_FOUND on a miss; workspaceId opens a coven's own entry to its members
  ingredientFormValues(first: Int, after: String): QueryIngredientFormValuesConnection! # the keeper-curated form vocabulary
  categories(query: String, groupId: ID, first: Int, after: String): QueryCategoriesConnection! # the live categories by name, each with its group (M5.6); query and groupId narrow them (MB.178)
  celestialBodies(query: String, first: Int, after: String): QueryCelestialBodiesConnection! # the curated celestial bodies by name; query narrows them (MB.95)
  zodiacSigns(query: String, first: Int, after: String): QueryZodiacSignsConnection! # the curated signs, likewise
  deities(query: String, traditionId: ID, first: Int, after: String): QueryDeitiesConnection! # the curated deities by tradition, then name; query and traditionId narrow them (MB.132)
  deityTraditions(first: Int, after: String): QueryDeityTraditionsConnection! # the live traditions by name
  # §5's fuzzy duplicate warning: compendium and this workspace, best match first
  possibleDuplicates(
    workspaceId: ID # null reads the compendium alone, for the admin's compendium form (M5.5)
    name: String!
    first: Int
    after: String
  ): QueryPossibleDuplicatesConnection!
  # A substitute's picker: what it may link, the compendium and this workspace, best match first (§5)
  ingredientSuggestions(
    workspaceId: ID!
    query: String
    form: String # the form a substitute is for: an entry holding it ranks first, then one holding a form of its group (MB.215)
    first: Int
    after: String
  ): QueryIngredientSuggestionsConnection!
  # The reference picker: the compendium's and this workspace's references, matched on authors, title and container (§5)
  referenceSuggestions(
    workspaceId: ID # null reads the compendium alone (M5.5)
    query: String
    first: Int
    after: String
  ): QueryReferenceSuggestionsConnection!
  # Curated bodies or signs first, then values in use in the compendium and this workspace (§5)
  celestialBodySuggestions(
    workspaceId: ID # null reads the compendium alone (M5.5)
    query: String
    first: Int
    after: String
  ): QueryCelestialBodySuggestionsConnection!
  zodiacSuggestions(
    workspaceId: ID # null reads the compendium alone (M5.5)
    query: String
    first: Int
    after: String
  ): QueryZodiacSuggestionsConnection!
  # A connection of Ingredient: the coven's own entries, plus every compendium entry its cupboard names (§5, M12.18);
  # an own entry sharing a compendium entry's name hides neither (M12.28). Stock reads through Ingredient.stock.
  workspaceIngredients(
    workspaceId: ID!
    query: String
    categoryIds: [ID!]
    forms: [String!] # filter as compendium's do (M9.4, M11.22)
    elements: [IngredientElement!] # entries whose elements hold any one of these (M8.13)
    categoryMode: CategoryMode = all # all or any of the chosen categories (M8.12)
    deityIds: [ID!]
    zodiacSigns: [String!]
    celestialBodies: [String!]
    toxic: ToxicFilter
    source: IngredientSource # local or compendium only; all by default (M9.7)
    inStock: Boolean # keeps entries the coven holds in stock (M9.7)
    lowStockOnly: Boolean # keeps entries running low (M9.8)
    first: Int
    after: String
  ): QueryWorkspaceIngredientsConnection!
  grimoire(
    workspaceId: ID!
    orderBy: GrimoireOrder! = UPDATED_DESC
    status: SpellStatus
    query: String # title and intent, best match first; under 2 characters no search (M10.11)
    first: Int
    after: String
  ): QueryGrimoireConnection! # workspace-visible + own private spells; status filters in SQL
  spell(id: ID!, workspaceId: ID!): Spell! # NOT_FOUND for a spell this reader may not see
  mySupportRequests(first: Int, after: String): QueryMySupportRequestsConnection! # the session's own requests, still open (open, waiting on the sender) ahead of resolved and closed, newest first within each, each with its replies; the finder ANDs created_by (M15.1)
  mySupportRequest(id: ID!): SupportRequest! # one of the session's own; NOT_FOUND for another sender's
  supportDialogState: SupportDialogState! # open to a signed-out caller: whether the Support dialog shows the form, the signed-out form, the time-out or the email page's prompt, about the caller alone (M15.40)
  supportRequest(id: ID!): SupportRequest! # curator or keeper; NOT_FOUND for a request a curator may not see
  supportRequests(
    about: SupportAbout
    status: SupportStatus
    errorCode: Int
    first: Int
    after: String
  ): QuerySupportRequestsConnection! # curator or keeper; open ahead of resolved, newest first; a curator's holds only curatorVisible or assigned requests, filtered in SQL
}

# Mutations return the entity; a delete returns the deleted id, since a
# deleted entity's children would resolve empty. A refusal travels in `errors[].extensions` —
# a code, and `fieldErrors` for a validation failure — rather than in a payload
# type pairing an entity with a userErrors list. See Errors above.
type Mutation {
  createWorkspace(input: WorkspaceInput!): Workspace! # gated on canCreateWorkspace, which every keeper and curator holds
  createWorkspaceIngredient(workspaceId: ID!, input: IngredientInput!): Ingredient! # input.categoryIds files it (story 30, MB.125)
  updateIngredient(workspaceId: ID!, id: ID!, input: IngredientUpdateInput!): Ingredient! # replaces the row: every field non-null, "" or [] clears — categoryIds included
  promoteFolkName(workspaceId: ID, id: ID!, folkNameId: ID!): Ingredient! # swaps the display name with one folk name in one write; a null workspaceId is the compendium tier under the admin proof, and the swap is then global (M8.3a)
  deleteIngredient(workspaceId: ID!, id: ID!): ID! # a soft delete of the coven's own ingredient; a spell holding it keeps it
  createReference(workspaceId: ID, input: ReferenceInput!): Reference! # a null workspaceId writes the compendium tier, under the admin proof (§5)
  updateReference(workspaceId: ID, id: ID!, input: ReferenceInput!): Reference! # reaches every row linking it; nothing deletes one in v1
  addIngredientToWorkspace(workspaceId: ID!, variantId: ID!, input: StockInput!): InventoryItem! # stock is of one form (MB.215); refused beside variantId when the coven holds that form already (M9.3)
  updateStock(workspaceId: ID!, id: ID!, input: StockInput!): InventoryItem! # a field left out keeps its value, null clears it (M9.3)
  deleteStock(workspaceId: ID!, id: ID!): ID! # a soft delete of the jar; the entry stays (M9.4)
  createSpell(workspaceId: ID!, input: SpellInput!): Spell! # every field nullable: a draft needs nothing, a complete spell a title; steps is the recipe in order (M10.10); categoryIds the assigned categories (M10.14)
  updateSpell(workspaceId: ID!, id: ID!, input: UpdateSpellInput!): Spell! # a field left out keeps its value, null clears it; steps, when given, is the whole recipe, and categoryIds the whole set of assigned categories (M10.14); expectedRevision must be sent, null writes regardless, a stale one is STALE_WRITE; visibility only widens once the spell is complete (M10.10, a draft moves either way)
  setSpellVisibility(id: ID!, visibility: SpellVisibility!): Spell! # private -> workspace; workspace -> private only while the spell is a draft
  duplicateSpell(workspaceId: ID!, id: ID!): Spell # a private draft copy by the caller, titled with " (Copy)" added, holding the fields, assigned categories and live steps in order; no workings, revision 1; for roles that may create a spell, of a spell the caller can read (M13.20)
  deleteSpell(workspaceId: ID!, id: ID!): ID! # a soft delete of the spell and its steps in one transaction, for stewards and practitioners, of a spell the caller can read; a shared or complete spell goes too, since visibility governs widening, not existence; stock is untouched (M13.11)
  createInvitation(workspaceId: ID!, email: String!, role: InvitableRole!): Invitation! # the link is mailed; no response carries it
  acceptInvitation(token: String!): Invitation! # either tier (MB.202); the session's verified email must match the invitation's, and the page lands by tier
  acceptInvitationById(id: ID!): Invitation! # the workspace tier alone (M10.32); the account page lists the pending ones to the verified holder of the address, and the same match admits
  declineInvitationById(id: ID!): Invitation! # the workspace tier alone (M10.34); the same match, stamping the invitation declined and granting nothing; its link then says so, and the coven's stewards see it declined until they remove it
  revokeInvitation(workspaceId: ID!, id: ID!): Invitation! # Revoke on a pending invitation, and Remove on a declined one (M10.34)
  setEmail(email: String!, next: String): User! # MB.54; counts once verified by mail; the link lands on the way to next (MB.111)
  setName(name: String!): User! # MB.88; the session's own row, trimmed, through withAudit; blank or over-long is VALIDATION on name; Better Auth's /update-user is disabled
  # admin mutations gated by users.role; grantWorkspaceCreation(userId) and revokeWorkspaceCreation(userId) are admin-only, as is setUserRole(userId, role, note), which gives or takes the curator role too; the curation mutations are open to a curator as well (M11.20)
  createAdminInvitation(email: String!, note: String): Invitation! # the site tier; mailed, never returned (MB.70); accepted by acceptInvitation, a grant through the admin role service
  revokeAdminInvitation(id: ID!): Invitation! # the site tier
  createCategory(input: CategoryInput!): Category! # CategoryInput: name, description, groupId; the slug follows the name
  updateCategory(id: ID!, input: CategoryInput!): Category!
  deleteCategory(id: ID!): ID! # refused while a live compendium entry is filed under it; a coven keeps its links (M5.6)
  createIngredientFormValue(input: IngredientFormValueInput!): IngredientFormValue! # name, description, groupId, endRedirect; the slug is the name and the group
  updateIngredientFormValue(id: ID!, input: IngredientFormValueInput!): IngredientFormValue! # a rename carries onto the compendium entries picking it (M5.6a)
  deleteIngredientFormValue(id: ID!): ID! # refused while a live compendium entry picks it; a coven keeps its text and its pick
  createCompendiumIngredient(input: CompendiumIngredientInput!, endRedirect: Boolean): Ingredient! # IngredientInput's fields, nomenclature required (M5.5)
  updateCompendiumIngredient(
    id: ID!
    input: CompendiumIngredientUpdateInput!
    endRedirect: Boolean
  ): Ingredient! # replaces the entry as updateIngredient does; endRedirect confirms MB.82's refusal
  deleteCompendiumIngredient(id: ID!): ID! # a soft delete; a spell holding the entry keeps it
  createCelestialBody(input: CelestialBodyInput!): CelestialBody! # CelestialBodyInput: name, description; the slug follows the name (MB.95)
  updateCelestialBody(id: ID!, input: CelestialBodyInput!): CelestialBody! # a rename carries onto the compendium entries listing it
  deleteCelestialBody(id: ID!): ID! # refused while a live compendium entry lists it; a coven keeps what it wrote
  createZodiacSign(input: ZodiacSignInput!): ZodiacSign! # the celestial bodies' three, for the signs
  updateZodiacSign(id: ID!, input: ZodiacSignInput!): ZodiacSign!
  deleteZodiacSign(id: ID!): ID!
  createCategoryGroup(input: CategoryGroupInput!): CategoryGroup! # name, description, colorDark, colorLight; each colour 4.5:1 on its own ground (M5.6b)
  updateCategoryGroup(id: ID!, input: CategoryGroupInput!): CategoryGroup! # touches no category
  deleteCategoryGroup(id: ID!, moveTo: ID): ID! # its live categories move to moveTo first; needed only when it has some
  createIngredientFormGroup(input: IngredientFormGroupInput!): IngredientFormGroup! # name, description, icon; icon absent or null means the generic (M12.6)
  updateIngredientFormGroup(id: ID!, input: IngredientFormGroupInput!): IngredientFormGroup! # name, description, icon; icon absent or null clears it; a rename re-slugs its live forms
  deleteIngredientFormGroup(id: ID!, moveTo: ID): ID! # its live forms move to moveTo first, re-slugged there
  createDeity(input: DeityInput!): Deity! # DeityInput: name, description, traditionId; the slug follows the name (MB.132)
  updateDeity(id: ID!, input: DeityInput!): Deity! # a rename carries onto the compendium entries picking it
  deleteDeity(id: ID!): ID! # refused while a live compendium entry picks it; a coven keeps its pick
  createDeityTradition(input: DeityTraditionInput!): DeityTradition! # name, description
  updateDeityTradition(id: ID!, input: DeityTraditionInput!): DeityTradition! # touches no deity
  deleteDeityTradition(id: ID!, moveTo: ID): ID! # its live deities move to moveTo first; needed only when it has some
  sendSupportRequest(input: SupportRequestInput!): SupportRequest! # a verified session; refuses the eleventh in 24 hours and a send during a time-out, each with an explaining error (M15.1)
  sendSignedOutSupportRequest(input: SignedOutSupportRequestInput!): Boolean! # open to anyone; refused after ten sends from one address or thirty from one client in 24 hours; written as the seeded signed-out sender; returns nothing, as replies come by email (M15.40)
  resolveMySupportRequest(id: ID!): SupportRequest! # the sender's own open or waiting request, resolved without a reply; starts the request's job (M15.42, M15.46)
  replyToSupportRequest(requestId: ID!, body: String!, waitingOnSender: Boolean): SupportReply! # a keeper on any request, a curator on one assigned to them; mails a notice with no reply text; waitingOnSender moves an open request to waiting_on_sender and is refused on any other status (M15.42)
  sendSupportMessage(requestId: ID!, body: String!): SupportRequest! # the sender's own request: reopens a waiting or resolved one; on a closed one opens a new request linked to it, returned (M15.42)
  addSupportInternalNote(requestId: ID!, body: String!): SupportReply! # staff-only note; changes no status, mails no one (M15.42)
  closeSupportRequest(id: ID!): SupportRequest! # an open, waiting or resolved request; a keeper on any, a curator on one assigned to them (M15.42)
  assignSupportRequest(id: ID!, assigneeId: ID): SupportRequest! # admin only; null unassigns
  setSupportRequestCuratorVisible(id: ID!, visible: Boolean!): SupportRequest! # admin only
  resolveSupportRequest(id: ID!): SupportRequest! # a keeper on any request, a curator on one assigned to them; starts the request's job, which mails the closing-soon notice on day 5 and closes it on day 7 (M15.46)
  setSupportRequestIssueUrl(id: ID!, issueUrl: String): SupportRequest! # admin only; must be an issue on Aurora-Arctic/Sorrel-and-Salt
  timeOutSupportSender(userId: ID!, until: DateTime, note: String!): SupportTimeout! # admin only; no until is no end date, and a blank note is refused
  liftSupportTimeout(id: ID!): SupportTimeout! # admin only
}

type Ingredient {
  id: ID!
  name: String! # the display label
  slug: String! # the public address (MB.80)
  canonicalName: String # the formal name; null for none, set for a named kind, either for unknown
  nomenclature: Nomenclature!
  folkNames: [FolkName!]! # flattened from ingredient_folk_names; the id lets promoteFolkName name one (M12.1)
  variants: [IngredientVariant!]! # its forms, by form name; [] for an entry that is information only (MB.215); no form or formChoice of its own since MB.222
  description: String
  elements: [IngredientElement!] # in the order chosen, a repeat refused (§5)
  celestialBodies: [String!] # in the order entered, as every list here is
  zodiacSigns: [String!]
  deities: [IngredientDeity!]! # in the order entered, through a loader; [] when none (MB.167)
  colors: [String!]
  safetyNotes: String
  toxic: Boolean! # the ingredient's own flag; each form carries its own, and the two never union (M11.21)
  substitutes: [Substitute!]! # alphabetical by name, through a loader; [] when none (MB.138)
  references: [ReferenceLink!]! # alphabetical by citation, through a loader; [] when none (MB.151)
  isGlobal: Boolean!
  categories: [Category!]!
  stock(workspaceId: ID!): [InventoryItem!]! # the coven's jars of this entry, one per form it holds; empty for a local it holds unstocked; a loader keyed by ingredient and workspace (M9.4)
  audit: AuditInfo!
  # a v2 notes section slots in here
}

# One form of an ingredient (§5, ingredient_variants). Each list adds to the ingredient's; nothing overrides it.
type IngredientVariant {
  id: ID!
  form: String! # free text, not an enum — the vocabulary is data
  formChoice: IngredientFormValue # the curated form picked for form; null when typed, or once retired (MB.167)
  description: String
  safetyNotes: String
  toxic: Boolean! # this form's own flag, never read from the ingredient (M11.21)
  elements: [IngredientElement!]
  celestialBodies: [String!]
  zodiacSigns: [String!]
  colors: [String!]
  categories: [Category!]! # this form's own, beside the ingredient's
  substitutes: [Substitute!]! # what may stand in for this form
  references: [ReferenceLink!]! # this form's own sources, beside the ingredient's
  audit: AuditInfo!
}

# A coven's jar of one form of an ingredient (§5, inventory_items; MB.215). Built by M9.4.
type InventoryItem {
  id: ID!
  ingredient: Ingredient! # through MB.9's loader
  variant: IngredientVariant! # the form held, beneath its ingredient
  quantityOnHand: Float # null is "held, unweighed"; 0 is out of stock
  unit: InventoryUnit
  unitDimension: UnitDimension # derived from unit on write, never input
  lowStockThreshold: Float
  source: String
  acquiredDate: LocalDate
  audit: AuditInfo!
}

# The inventory_unit enum, built from the unit table in src/modules/ingredients/units/. Two fluid ounces: the UK and US ounces differ by about four per cent, so both are stored.
enum InventoryUnit {
  mg
  g
  kg
  oz
  lb
  ml
  l
  tsp
  tbsp
  fl_oz_uk
  fl_oz_us
  cup
  piece
  drop
  pinch
}

enum UnitDimension {
  weight
  volume
  count
} # what a unit measures; conversion stays inside one (§11); M9.4
# The fields of one jar, M4.5's Zod schema on the wire (M9.4). variantId is the mutation's argument, not a field.
input StockInput {
  quantityOnHand: Float
  unit: InventoryUnit
  lowStockThreshold: Float # a missing threshold takes the dimension's default on add (M9.3)
  source: String
  acquiredDate: LocalDate
}

# Whether an entry must match all of the chosen categories or any one of them (M8.12).
enum CategoryMode {
  all
  any
}

# A folk name with the id promoteFolkName takes (M12.1).
type FolkName {
  id: ID!
  name: String!
}

# Which tier workspaceIngredients reads from (M9.7).
enum IngredientSource {
  all
  local
  compendium
}

# A link or a typed name (§5, ingredient_substitutes), as a spell layer is.
type Substitute {
  name: String! # the linked ingredient's label, its last once deleted; the typed name otherwise
  ingredient: Ingredient # null on a typed name, and once the linked ingredient is deleted
  variant: IngredientVariant # the linked ingredient's form, when the link names one (MB.215)
}

# A source, kept once and linked from every row it supports (§5, references).
type Reference {
  id: ID!
  kind: ReferenceKind!
  authors: String
  title: String!
  container: String
  contributors: String
  edition: String
  volume: String
  issue: String
  series: String
  place: String
  publisher: String
  published: String
  pages: String
  host: String
  url: String
  modified: LocalDate
  accessed: LocalDate
  note: String
  citation: String! # Chicago bibliography form, rendered on the server, plain; a surface that shows italics renders the parts itself
  isGlobal: Boolean!
  audit: AuditInfo!
}

# One row's link to a source; the locator is the link's, not the reference's.
type ReferenceLink {
  reference: Reference!
  locator: String # "p. 112", "chap. 13"
}

enum ReferenceKind {
  book
  chapter
  article
  entry
  web_page
}

# A deity picked or typed (§5, ingredient_deities), as a substitute is a link or a name.
type IngredientDeity {
  name: String! # a pick's curated spelling as saved, or the typed text
  deity: Deity # null on a typed name, and once the deity or its tradition is retired
}

# The curated vocabularies as a chip or a filter reads them: public, no audit.
type Category {
  id: ID!
  name: String!
  slug: String!
  description: String!
  group: CategoryGroup!
}

type CategoryGroup {
  id: ID!
  name: String!
  slug: String!
  description: String!
  colorDark: String! # the pair a chip wears (MB.36)
  colorLight: String!
}

type IngredientFormValue {
  id: ID!
  name: String!
  slug: String!
  description: String!
  group: IngredientFormGroup! # what tells two same-named forms apart
}

type CelestialBody {
  # ZodiacSign has the same four fields
  id: ID!
  name: String!
  slug: String!
  description: String!
}

type IngredientFormGroup {
  id: ID!
  name: String!
  slug: String!
  description: String!
  icon: FormGroupIcon # NULL is the generic (M12.6)
}

type Deity {
  id: ID!
  name: String!
  slug: String!
  description: String!
  tradition: DeityTradition! # what tells two same-named deities apart (MB.167)
}

type DeityTradition {
  id: ID!
  name: String!
  slug: String!
  description: String!
}

enum IngredientElement {
  earth
  air
  fire
  water
  spirit
}

type User {
  id: ID!
  name: String!
  image: String
  email: String! # self or admin: a Pothos scope behind the service (§7, "The three GraphQL costs")
  role: UserRole! # self or admin
  canCreateWorkspace: Boolean! # self or admin
  memberships: [WorkspaceMember!]! # the caller's own, or anyone's to a site keeper (M9.19), through a loader
  audit: AuditInfo!
}

type WorkspaceMember {
  role: WorkspaceRole! # viewer | member | owner
  joinedAt: DateTime!
  workspace: Workspace!
  user: CoMember! # the name through usersById (MB.10), one read per page of members
  email: String # stewards only, holding member: readEmail (M11.19), through a loader; FORBIDDEN to anyone else. Read off the member's users row now, never copied onto workspace_members
  audit: AuditInfo!
}

type CoMember {
  id: ID!
  name: String # never an email address; null for anyone the viewer has never shared a coven with
}

type Workspace {
  id: ID!
  name: String!
  slug: String! # the /coven/[slug] segment
  members(first: Int, after: String, last: Int, before: String): WorkspaceMembersConnection! # live members in joining order, to roles holding member: read (M6.11)
  audit: AuditInfo!
}

enum ToxicFilter {
  any
  toxic
  not_toxic
}

enum FormGroupIcon {
  botanical
  animal
  mineral
  substance
  fluid
  curio
}

enum GrimoireOrder {
  UPDATED_DESC # last edited first, the default
  CREATED_DESC # newest first
  TITLE_ASC # by title, untitled spells last
}

enum Nomenclature {
  botanical
  fungal
  zoological
  mineral
  chemical
  unknown
  none
}

type Spell {
  id: ID!
  title: String # null on a draft not yet named (M13.15)
  intent: String
  jarDescription: String
  sealWaxColor: String
  moonPhase: String
  dayOfWeek: String
  visibility: SpellVisibility! # private | workspace
  status: SpellStatus! # draft | complete
  categories: [Category!]! # assigned intent
  derivedCategories: [Category!]! # union across linked ingredients; a custom row contributes none
  categoryGaps: CategoryComparison! # intended-not-present, present-not-intended
  note: String
  steps: [SpellStep!]! # in position order: the recipe (story 80)
  revision: Int! # raised by one on every save; a save names the one it read (M13.15)
  audit: AuditInfo!
}

type CategoryComparison {
  intendedNotPresent: [Category!]! # assigned, but carried by no ingredient in the spell
  presentNotIntended: [Category!]! # carried by an ingredient in the spell, but not assigned
}

type SpellStep {
  id: ID!
  position: Int!
  body: String # the instruction; null on an ingredient-only step
  ingredient: Ingredient # kept once deleted (M5.3); null on a custom, one-off row (MB.40) and on an instruction-only step
  name: String # the ingredient's display label when linked; the custom name otherwise; null on an instruction-only step
  variant: IngredientVariant # the form laid, on a linked row (MB.215); still answered once that form alone is deleted (M10.9)
  form: String # the variant's form when linked; the custom row's free text otherwise
  quantity: Float
  unit: InventoryUnit # M9.2's inventory_unit enum
  note: String
  audit: AuditInfo!
}

enum InvitableRole {
  viewer
  member
} # owner is not invitable
type Invitation {
  id: ID!
  workspace: Workspace # null on the site tier, which grants admin (MB.201)
  email: String!
  role: InvitableRole # null on the site tier, with the workspace
  expiresAt: DateTime! # ISO 8601 on the wire
  acceptedAt: DateTime
  revokedAt: DateTime
  audit: AuditInfo!
  # no url and no token: the link exists only in the mail (MB.61)
}

enum SupportAbout {
  accessibility
  bug
  account
  compendium
  privacy
  feedback
  question
} # listed in this order (M15.1)
enum SupportStatus {
  open
  waiting_on_sender
  resolved
  closed
}
enum SupportReplyAuthorRole {
  sender
  staff
}
enum SupportReplyVisibility {
  public
  internal
}
enum SupportSenderTier {
  beta_tester # accepted a printed card (invitations.kind = 'card'); derived on read, never stored
  standard
}
input SupportRequestInput {
  about: SupportAbout!
  subject: String! # 1–120 characters
  message: String! # 1–4,000 characters
  path: String # the page it was sent from, coven slug included; a curator reads it with the segment after /coven/ redacted; an invitation token is redacted on write
  errorCode: Int # the HTTP status of the error page it was sent from
  errorReference: String # the digest of the error page it was sent from
}
input SignedOutSupportRequestInput {
  about: SupportAbout! # accessibility, account, bug, privacy or question only
  email: String! # where the reply is mailed
  subject: String! # 1–120 characters
  message: String! # 1–4,000 characters
  path: String
  errorCode: Int
  errorReference: String
  website: String # a trap for bots: the form hides it, so any value drops the send
}
enum SupportDialogKind {
  form
  signedOut
  timedOut
  unverified
}
type SupportDialogState {
  kind: SupportDialogKind!
  until: DateTime # when the time-out ends; set only for timedOut
}
type SupportRequest {
  id: ID!
  about: SupportAbout!
  subject: String!
  message: String!
  path: String
  errorCode: Int
  status: SupportStatus! # a resolved request past its seventh day reads as closed before its job has closed it (M15.46)
  sender: User # a curator or keeper reads it; a sender is the session's own user; null once the account is gone
  assignedTo: User
  curatorVisible: Boolean!
  issueUrl: String # staff only
  errorReference: String # staff only
  resolvedBy: User
  resolvedAt: DateTime
  closedAt: DateTime # a lapsed resolved request reads as closed on its seventh day
  lastSenderActivityAt: DateTime
  lastStaffActivityAt: DateTime
  linkedFromId: ID # the closed request this one follows up
  senderTier: SupportSenderTier! # curator or keeper only
  replies: [SupportReply!]! # through a loader; an internal note reaches staff only, filtered in SQL
  timeouts: [SupportTimeout!]! # the sender's, past and active; admin only
  audit: AuditInfo!
}
type SupportReply {
  id: ID!
  body: String!
  authorRole: SupportReplyAuthorRole!
  visibility: SupportReplyVisibility!
  author: User # created_by; null once the account is gone
  audit: AuditInfo!
}
type SupportTimeout {
  id: ID!
  userId: ID!
  until: DateTime # null for a time-out with no end date
  note: String!
  liftedAt: DateTime
  audit: AuditInfo! # createdBy is the keeper who set it
}

scalar DateTime # ISO 8601 on the wire; a Date in a resolver
scalar LocalDate # a calendar date, YYYY-MM-DD on the wire, for a reference's dates (MB.153)
# One shape for every audited type, never flat fields on the type itself.
# The four stamps only: no finder returns a soft-deleted row.
type AuditInfo {
  createdAt: DateTime!
  createdBy: ID!
  updatedAt: DateTime!
  updatedBy: ID!
}
```

There is no `Form` enum in the schema. A variant's `form` is free text over a keeper-curated vocabulary (§5), so an enum would rewrite the SDL every time a keeper curates a value; the vocabulary is read as data through `ingredientFormValues` and the filter argument is a `String`.

**The type is `IngredientFormValue`, not `IngredientForm`, deliberately.** One row is one permitted _value_ of a variant's `form`. Naming it after its table (`ingredient_forms`) would be the conventional mapping, but `IngredientForm` is already the entry-form component (§11) — and per this project's vocabulary rule a term means exactly one thing, so the newer of the two yields. The table keeps its name; only the GraphQL type diverges from it.

Adding `canonicalName`, `nomenclature` and `folkNames` moves M3.4's SDL snapshot, which is what that snapshot is for.

**`celestialBodies`, `zodiacSigns` and `colors` replace `planet`, `zodiac` and `color` outright, with no deprecation window** (MB.134, built by MB.136): on `Ingredient`, and on `IngredientInput` and `IngredientUpdateInput` alike, each a `[String!]` where the single field was a `String` — non-null on the update input, as its other fields are, where `[]` clears. Nothing outside the app reads the API, so the client and the schema change in one deploy and no reader is left on the old shape. A list left empty reads back as null, because that is what is stored (§5).

**`deities` and the form's pick move to the pick model in one deploy** (MB.167): `Ingredient.deities` becomes `[IngredientDeity!]!`, each a name and the curated `Deity` picked, in the order entered, and `Ingredient.formChoice` reads the curated form `formId` records, both through loaders. Both inputs take `formId: ID` beside `form` — non-null on the update input, where `""` clears — and `deities: [IngredientDeityInput!]`, each a `deityId` or a `name`, exactly one, as `SubstituteInput` is. `formSuggestions` and `deitySuggestions` carry each curated row's `id`, null for a value only in use, which is what a pick sends. Named after the table, not `DeityInput`, which MB.132's admin CRUD keeps ([`design-decisions/mb.167-read-and-write-the-pick.md`](../design-decisions/mb.167-read-and-write-the-pick.md)). Since MB.222 the form's pick is a variant's: `IngredientVariant.formChoice`, and `formId` beside `form` on `IngredientVariantInput`.

**`elements` replaces `element` the same way** (MB.157, built by MB.159): a `[IngredientElement!]` where the single field was an `IngredientElement`, on `Ingredient` and both inputs, non-null on the update input where `[]` clears. That ends the update input's one exception, `element`, which was nullable because an enum has no empty value to send; an empty list is one, so every field of `IngredientUpdateInput` is now non-null. The enum still refuses a value outside the five before a resolver runs, and the shared schema refuses a repeat. The compendium's element filter (M8.13) takes a list of its own, `elements: [IngredientElement!]`, on both list queries, and matches an entry whose list holds any one of them (§9).

**`Reference` and `Ingredient.references`** (MB.151, built by MB.153): the two ingredient inputs take `references: [ReferenceLinkInput!]`, each an existing reference's id with an optional `locator`, non-null on the update input where `[]` clears, and `ReferenceInput` takes a reference's fields as §5 lists them, validated per `kind`. `citation` is rendered on the server by the one renderer and is plain text, so a chip, a sort and a screen reader read it as one string; the page renders the parts the same function returns, with the italics. `LocalDate` is graphql-scalars', beside the `DateTimeISO` behind `DateTime`, because an accessed date is a day and not an instant.

**`IngredientVariant` and `Ingredient.variants`** (MB.215, built by MB.218 and MB.219): a list nested on its ingredient, so a bare list bounded by its parent rather than a connection, read through a loader as every child of an ingredient is. Both ingredient inputs take `variants: [IngredientVariantInput!]!`, each a form, its pick, its own fields and its own categories, substitutes and references, and the whole entry saves in one mutation: there is no `createIngredientVariant`, for the reason §5 gives. A variant's error is pathed to it, `['variants', 1, 'form']`, so the entry form places it beside that variant's field. Until MB.222 the inputs also took the old top-level `form` and `formId`, read as one variant when `variants` was absent; MB.222 removed them and made `variants: [IngredientVariantInput!]!` required on all four ingredient input types, so an entry with no form sends `[]`.

`SpellStep.ingredient` is nullable from the first line of the SDL, not widened later: a custom, one-off row (§5, MB.40) has no ingredient, and a consumer that has always had to branch on that never meets it as a breaking change. `name` and `form` resolve from the linked ingredient when there is one, so a recipe view reads one shape whichever kind of row it is rendering. `name` is nullable too, because an instruction-only step lays no ingredient at all (story 80, M13.1): a step is an instruction, an ingredient, or both, in one list, so the recipe reads in the order it is done.

Cursor pagination on every list query — the grimoire and compendium especially, and the vocabularies too — through one shared helper (`t.pagedConnection`): Relay connections, default page size 25, hard server-side maximum 100 returned silently rather than refused, cursors encoding a stable sort key plus id, never an offset. The key may have several parts, computed ones included, so a search can page by its score: the compendium's pages `(score DESC, name, id)` and carries each row's rank on its edge as `score` — its word similarity to the query, weighted by the field it matched (MB.115; [`db/compendium-read.md`](../db/compendium-read.md)) — null on a list without a search. A connection may also carry `totalCount` and `countBefore` — the rows under its filter, and how many come before its first edge, 0 on the first page — and the compendium's does, so its pager reads "Page X of Y": page `floor(countBefore / size) + 1` of `max(1, ceil(totalCount / size))`, with Last asking for `last: totalCount % size || size` so it ends on the page Next walks to. The position is counted from the first edge's key and never used to seek, so a cursor is still never an offset; the count runs only when one of the two fields is selected. The cost limit prices each connection at that effective page size, whether `first` is a literal or a variable. A list nested on an object (`Ingredient.categories`, `Spell.steps`) stays a bare list, bounded by its parent. The sketch above shows the connection arguments, not every generated type.
