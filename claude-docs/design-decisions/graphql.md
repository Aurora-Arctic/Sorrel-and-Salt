# Graphql decisions

The GraphQL transport, its codegen and loaders, the server read path, and the public compendium reads.

## graphql-codegen types the browser's documents

**Status:** decided. The live summary is `claude-docs/graphql/client-types.md`.

### Decision

Keep `@graphql-codegen/cli` with `@graphql-codegen/client-preset`, reading the committed `src/graphql/schema.graphql`. The chain is Pothos, then the SDL, then generated types, so one reviewable file carries every contract change first. Output is committed under `src/gql/`, outside `src/graphql/` (the server layer the import fence guards), and Prettier ignores it. A guard in `tests/guards/` regenerates in memory and compares, inside the existing Vitest job, with no new CI leg. There are no generated hooks: `useQuery` runs a `TypedDocumentNode` through the request function.

### Why

Pothos types only the server. Without codegen, every browser document is `request<HandWrittenType>(doc)`, a hand-kept type that drifts silently when a field is renamed. DESIGN.md §14 names a single typed contract as what makes the GraphQL transport worth its cost.

### Rules out

- `gql.tada`: fewer files, but still a generated artefact to keep fresh, a TypeScript-plugin dependency for good diagnostics, and an inference cost that grows with the number of documents. A legitimate choice, not preferred over the standard tool.
- No typegen (hand-written result types, optionally checked with Zod): the browser half of the contract drifts silently.
- The community `typescript-react-query` hooks plugin.

## React cache() wrapper and the server read path

**Status:** decided. Live home: `claude-docs/graphql/two-transports.md`, "The two transports".

### Decision

1. **The `cache()` key is primitives.** The cache wraps the role lookup inside `assertMembership`, keyed on `(userId, workspaceId)`, not a new `(session, workspaceId)` export. Every caller of `assertMembership` gets the dedupe with no per-task adoption, whatever permission it asks for.
2. **On the GraphQL path `cache()` is inert and DataLoader (rule 9) is the dedupe.** Route Handlers have no React cache dispatcher, so `cache()` is a pass-through there. The docs say so rather than claim memoisation on both transports.
3. **A test that must observe a server render lives under `tests/rsc/`**, a vitest project `rsc` that sets `ssr.resolve.conditions` and `externalConditions` to `['react-server']`. Dedupe is observable only inside a Flight render, and the condition cannot be global: in the `db` project `react-dom/server` resolves to a file that throws under it, and `@/lib/auth` pulls it in through react-email.
4. **The render test counts `findWorkspaceRole` calls, not Postgres statements.** Only `src/db/repository.ts` imports the client (rule 2), so a repository call is a round trip and the test mocks the repository and stays off Postgres. Layout and page ask about the same workspace with two distinct `asUser(A)` objects, to prove the key is the ids and not the session object. The count must be one.
5. **A guard fails on `'use server'` anywhere in `src/**`.** A directive is not an import, so `no-restricted-imports` cannot catch a server action. The scan asserts it found `src/app/api/graphql/route.ts`, so an empty scan cannot pass.
6. **The refusal is asserted on both transports.** A direct call rejects `Forbidden`; the GraphQL path answers `data: null` with `errors[0].originalError instanceof Forbidden` (the original error, not the message). A site keeper in no workspace gets the same pair, so "admin is not an exception" is asserted.
7. **The rule for the two paths.** A server component calls `requireSession()` and passes the session to a service; the browser posts to `/api/graphql`, `createContext` builds the same `Session` and the resolver calls the same service. Mutations are never `cache()`-wrapped and never run in a page.

### Why

`cache()` compares objects by identity (objects go in a `WeakMap`, primitives in a `Map`). A wrapper keyed on the session dedupes only when both callers hold the same `Session` object, which is true through `getSession()` and false for `asUser()` and any caller that rebuilds the session.

### Rules out

- A `cache()` wrapper keyed on `(session, workspaceId)`.
- Claiming `cache()` memoises on the GraphQL path.
- Server actions.
- The `react-server` condition on the `db` project.

## `me` query, `User` type and field-level auth scope

**Status:** decided. Live home: `claude-docs/graphql/README.md`.

### Decision

- **`me` returns the signed-in user's identity and their covens**, from `services/profile.ts` `getMe(session)`. It reads the user by id through React `cache()` keyed by the user id, throws `NotFound` when the row is gone or soft-deleted, and takes `Session`, not `Session | null`, so a signed-out call cannot compile.
- **Another user's email is not exposed.** The field is scoped, and a refused scoped field throws `Forbidden` like every scope refusal (`unauthorizedError` in `builder.ts`); the query fails loudly instead of returning the user without it. Scoped fields stay non-null.
- **A service cannot build a `where`** (a runtime `drizzle-orm` import is banned there), so every read is a named repository finder: `findOneById`, `findManyByIds` and `findMembershipsOfUsers` (one user's memberships across workspaces, excluding a soft-deleted membership or workspace).
- **Modules register their GraphQL through the module index**, never `import '@/modules/<name>/graphql'`, which the lint and `module-boundaries.test.ts` refuse.
- **The probe field `ok: Boolean!` stays.** It answers without a session or a database, and the route's tests, the e2e spec and the codegen guard all probe with it.

### Why

Services own authorization and cannot import the query builder, so the repository supplies the reads. A loud refusal beats a silently thinner object.

### Rules out

- A nullable scoped field that hides a refusal.
- A deep module import to register the schema.

## `categoriesByIngredient` and `folkNamesByIngredient` loaders

**Status:** decided. Live home: `claude-docs/graphql/loaders.md`; the loaders are in `src/graphql/loaders/`.

### Decision

A workspace ingredient's folk names and categories never reach anyone outside that workspace, even when the caller knows the ingredient's id and even when the key lies about its workspace. Three layers each suffice alone:

1. **The check.** A workspace ingredient's key costs `assertMembership(session, workspaceId, { ingredient: ['read'] })`. A non-member (or a signed-out caller) gets `Forbidden` in that key's slot.
2. **The SQL.** The read's `EXISTS` admits a child row only when its parent is in the compendium or in a workspace a proof was minted for. The scope comes from the proofs, never the key, so a key claiming `workspaceId: null` or another workspace gets zero rows (`[]`), filtered in the database (rule 7).
3. **The type.** `NotIngredientScoped` makes `findMany(ingredientFolkNames, …)` and its siblings a compile error, so no later service reads these tables around the scoped finder.

Returned: a compendium entry's children to anyone, signed out included (MB.80); a workspace entry's children to any member of that coven, observers included, since ingredients belong to the coven.

### Why

A refusal that depends on one layer is one forgotten check from a leak.

### Rules out

- Trusting the workspace id on the key.
- Filtering children after the fetch.

## Compendium and ingredient GraphQL queries

**Status:** decided. Live home: `claude-docs/db/compendium-read.md`; `claude-docs/db/fuzzy-matching.md` (accent insensitivity).

### Decision

- **A filtered compendium view comes from the browser through GraphQL.** Rule 8 caps every list at 100 rows a page, so the client never holds the whole compendium (or a coven's ingredients) and a client-side filter cannot be the search. `/compendium` is a static ISR page with no request-time API.
- **Search is accent-insensitive through `unaccent`, installed in this task.** The extension, an `IMMUTABLE` SQL wrapper `unaccent_immutable(text)` and expression trigram indexes (`ingredients_unaccent_trgm`, `ingredient_folk_names_unaccent_trgm`). The wrapper names the dictionary explicitly (`public.unaccent('public.unaccent'::regdictionary, $1)`), so `search_path` cannot change what the function means, which is what makes `IMMUTABLE` honest. It is a SQL-language function because `LANGUAGE c` needs superuser. `unaccent` is a trusted extension (PG13+), so the database owner can create it on Neon and in every test clone.
- **`Docker/postgres-init/enable-extensions.sql` creates `unaccent` beside `pg_trgm`**, for parity with the migration, so `sorrel_template` stays the extensions-only base.
- **The compendium read services are built here and the writes stay with the compendium-writes task.**
- **A search matches case-insensitively on `name`, on `canonicalName` and on a live (not soft-deleted) folk name, accents folded both ways** (`una` finds `Uña de Gato` and `Uña` finds `Una`). `%`, `_` and `\` are literal. A blank query is no filter. `form` matches case-insensitively and trims, and combines with `query`.
- **Tests that pin an index list "exactly, not at least"** (`tests/modules/ingredients/schema/ingredients-indexes.test.ts`) include the new indexes. Expected order comes from SQL (`order by name, id`), never a JS `sort`, because the database collates `en_US.utf8`.

### Why

The public and admin lists differ only in a filter the query lacked (`nomenclature`). Folding accents in the database is the only place a trigram index can use it.

### Rules out

- A client-side filter as the compendium search.
- `LANGUAGE c` for the wrapper, or an unnamed dictionary.

## `graphql-request` replaced by a fetch wrapper

**Status:** decided. Live home: `claude-docs/dependencies.md`, "`graphql` 17 is blocked upstream"; the client is `src/lib/graphql-client.ts`.

### Decision

- **The browser sends GraphQL through a small wrapper over the global `fetch`**, not the `graphql-request` package. `send()` POSTs `{ query: print(document), variables }` with `content-type: application/json` and `accept: application/graphql-response+json, application/json` (the same `accept` the package sent, so Yoga's status codes are unchanged).
- **It throws `GraphQLClientError`** (`status` and the response's `errors`) when the status is not OK, the body carries `errors`, or there is no `data`. A partial answer never resolves. Retry and form-error placement rules are unchanged.
- **The class lives in `src/lib/graphql-client-error.ts`**, apart from the client, so a component test that stubs the client does not remove it. `graphql-failure.ts` reads that class.
- **`fetch` is looked up on every request**, so a story or test can stand in for `window.fetch`.
- `DESIGN.md` §7 (Client) and the §14 `userErrors` row name the wrapper.

### Why

`graphql-request` is the old name of a project that moved on; its last release accepts `graphql` 14 to 16 only and held the tree at 16. The repo used only `request()` and `ClientError`, never batching, `gql`, `rawRequest` or a custom `fetch`. One copy of `graphql` in the tree avoids "Cannot use GraphQLSchema from another module or realm". The `graphql` pin now waits on `@escape.tech/graphql-armor` alone.

### Rules out

- Keeping a dependency for two functions.

## The GraphQL file holds the transport's half

The owner's call, taken while scoping the test-suite consolidation: a resolver test proves what only the
transport can show, and the service test owns the rule. This record says what
the suite had been doing instead, what a resolver test can catch, and the two
backstops the change was accepted with. `claude-docs/testing/layer-ownership.md`
carries the rule as a table; `graphql/schema.md` points here.

### Where things stood

`claude-docs/graphql/schema.md` said, of each mutation family, that its test
"runs the three mutations through Yoga with the route's `maskedErrors`, so each
refusal is asserted as the browser receives it" (its lines 528–530, 567 and
610). Read as a doctrine, that sentence asked every resolver file to repeat
every refusal its service makes, and the files did: of the 119 tests under
`tests/modules/ingredients/graphql/`, 75 re-ran a scenario a service,
repository or validation test already proves — the same role refused at the
same row, the same Zod issue, the same search — against their own headers.
`workspace-ingredients.test.ts` opens by saying "The service's own rules are
workspace-ingredients.test.ts's; this file holds the transport's half", and
then holds most of the service's half too.

Two harness styles had grown up beside each other. `workspace-ingredients`,
`compendium-entries` and `references` run Yoga with the route's `maskedErrors`
and assert `extensions.code`, which is the wire. `ingredient`, `duplicates`,
`common-names`, `ingredient-suggestions` and `compendium` call bare
`graphql()` and assert `originalError instanceof Forbidden` — the service's
own observation, seen through a resolver, which is a second copy of the
service test with a slower setup and no new witness.

Every one of those tests runs the real service on Postgres. The resolver's
code path is the same for every caller: it forwards the session and the
arguments, and the service decides. A refusal repeated for a second role or a
second entity exercises no line the first did not.

### What a resolver test can catch

The transport has faults of its own, and they are what its tests are for:

- forgetting to forward the session, or the workspace id, so the service
  answers the wrong question or none;
- the wrong auth scope on a field — `admin` where `signedIn` was meant, or
  none at all;
- an SDL shape the service refuses, such as an input the schema admits but
  Zod does not, or a required argument the SDL made optional;
- an error-to-code mapping wrong for one path, where
  `tests/graphql/errors.test.ts` proves the generic mapping and a field's
  own test proves that field reaches it;
- a loader answering a stale row after the mutation that changed it.

None of these is a rule. Each is a wiring fault, and one test per fault per
field finds it.

### Decision

A GraphQL test file holds the transport's half alone:

- **One refusal per error code per field**, with the precondition that would
  have let it succeed, run through Yoga with the route's `maskedErrors` and
  asserted as `extensions.code`. The precondition is what CLAUDE.md's Testing
  section asks of every authorization test: a test that stays green with the
  guard removed proves nothing.
- **The service test owns the rule.** Which roles are refused at which rows,
  direct-id and with preconditions, is proved once, in
  `tests/modules/*/services/`, and nowhere above it.
- The GraphQL file additionally holds **SDL-level refusals**, **auth-scope
  refusals** — a separate gate, since `authScopes: { admin: true }` refuses
  before the service runs, and no service test reaches it — **loader cache
  clearing**, **one read per page**, **edge fields**, and **any mode no
  service test reaches**, such as the compendium-only `workspaceId: null`
  until MB.187 gives it a service twin.

### Pros and cons, as weighed

Pros:

- The files' own headers and CLAUDE.md rule 1 already said so: two
  transports, one set of rules, because both end at the same service
  function. The change makes the suite match its stated intent rather than
  changing the intent.
- One owner per rule. A reviewer checking a refusal reads one file, and a
  rule that changes is changed in one test.
- Growth at that layer halves. Every new service refusal had been costing two
  tests; it now costs one, plus a resolver test only when a new error code
  appears at a field.
- The real guard is untouched: the service tests, direct-id and
  precondition-asserting, are the constraint the plan never deletes.

Cons:

- A wire regression affecting only one scenario would pass. A resolver that
  special-cased a role — refused stewards where the service refuses observers,
  say — would be caught by the one kept refusal only if it was that role's.
  This is a review concern as much as a test one: a resolver may hold no
  authorization, and a diff that adds some is the bug.
- The time saved is small: roughly 5 s of summed worker time across the
  ingredients files. The payoff is count and growth, not the clock.
- The per-field sections in `graphql/schema.md` must be rewritten, since
  each one names what its test file asserts.
- The class-asserting files must move harness, or the one refusal each keeps
  is a pure duplicate of the service test rather than a wire observation.

### Backstops

The owner accepted the change with two backstops, so that what the per-file
tests stop repeating is still made impossible somewhere:

1. **The field sweep grows.** `tests/db/graphql-query-scopes.test.ts`, which
   already classifies every `Query` field and probes it signed-out, gains the
   same loop over every `Mutation` field, and for every workspace-taking
   field the null-workspace variant. Its first test asserts the probe table
   equals the schema's field list, so a new field cannot forget its gate
   whatever its own file asserts.
2. **One harness.** The six class-asserting resolver files move onto a shared
   Yoga harness, `tests/support/graphql/run.ts` (MB.185), so the one kept
   refusal per code at every field is the wire observation — `extensions.code`
   through the route's `maskedErrors` — and not the thrown type.

### What it rules out

- A GraphQL test that re-runs a service scenario for a second role or a
  second entity. The service test has it.
- `originalError instanceof` assertions in a resolver test. The wire has no
  `originalError`; a test that reads one is observing the service.
- A validation case re-sent through a mutation when
  `tests/graphql/errors.test.ts` already proves that a `ValidationError` maps
  to `VALIDATION` with one `fieldErrors` entry per issue. A field keeps one
  such case, to prove it reaches the mapping, and
  `tests/modules/*/validation/` keeps the rest.

### Consequences

- **MB.185** applies the rule to the ingredients GraphQL files and
  **MB.186** to vocabulary, identity and coven, each rewriting
  `graphql/schema.md`'s per-field sentences to say what the file now holds,
  and each naming every deleted test's owner in its PR body.
- `claude-docs/testing/layer-ownership.md` carries the rule, in the table
  every later consolidation task cites.
- The alternative — keeping every refusal mirrored at the resolver, which is
  what the schema.md sentences read as — was rejected because the suite's own
  headers said it was never the intent, and because the mirrored tests
  watched the service, not the wire.

## The compendium is public and search-indexable

**Decided:** the compendium list and every compendium entry are public and search-indexable, as DESIGN.md §1 and §9 specify, while `canCreateWorkspace`, memberships, a workspace's ingredients and its grimoire stay exactly as gated.

### The shape

- **Two URLs, one page** (DESIGN.md §9's route table): the public, canonical `/compendium/ingredients/[slug]`, and the signed-in `/ingredients/[id]`, which reaches workspace entries too and shows a compendium entry through the public page's component inside `AppShell`. No redirect between them: the in-app route is gated, so a crawler never reaches it. The in-app route keeps the id, not a slug, because outside `/coven/` a slug alone cannot say which workspace's "rosemary" is meant. A workspace entry's slug or id at the public route answers 404, the same answer `/coven/[slug]` gives a non-member, because the existence of a workspace entry is private. **Amended by the Wave 12 review (2026-10-16):** the signed-in route is `/coven/[slug]/ingredients/[id]` (M8.19), under the coven rather than outside it, because opening a coven's own entry needs the coven, and the route takes it from the address as every coven page does; the id stays, for the reason above.
- **The read takes no session.** §7's own cache sketch wraps `compendiumService.listGlobal()` in `unstable_cache`, which cannot see a session, so the read never could. The three compendium queries (`M8.5`'s list and detail, `ingredientFormValues`) carry no `signedIn` scope; every other query and every mutation keeps its scope. graphql-armor is the only bound on that endpoint, which makes `backlog.md`'s WAF item real rather than notional.
- **Static shell, client island (superseded below).** Both public pages read no request-time API, so they are ISR pages under the `compendium` tag, and M8.7's `revalidateTag` already refreshes their HTML on a keeper edit. The signed-in affordances — the shell's chrome and "Add to my ingredients" — are one client island that asks `me` after hydration and shows a sign-in link to a null session. §7 stays on `unstable_cache` without `cacheComponents`; plain ISR does this without the directive.
  **Amended by the Wave 12 review (2026-10-16, the owner's call):** the public pages are dynamic over the cached reads. The layout reads the session when there is one and renders the chrome on the server; there is no client island and no `me` call. Three reasons: the `me` query is signed-in only, so an island could not ask it signed out; a page reading `searchParams` is dynamic in this Next version anyway; and M12.4 needs its GET form to filter before the page hydrates.

- **Route protection.** `PUBLIC_ROUTES` gains `/compendium`, `/compendium/*`, `/robots.txt`, `/sitemap.xml`, `/llms.txt` and `/.well-known/*` (MB.83), with the icon and manifest files M11.16 adds. `tests/proxy.test.ts` moves `/compendium` from the lookalike list to the public list.
- **The search-engine surface** (MB.84): `robots.ts` and `sitemap.ts` as Next metadata routes, `generateMetadata` with a canonical on every compendium page, filtered list views `noindex` with canonical `/compendium` so category combinations are not a crawl trap, a real 404 for an unknown slug, and off production both `robots` disallowing all and an `X-Robots-Tag: noindex` header from the proxy, because `staging.sorrelandsalt.com` is a public URL that would otherwise be indexed as a duplicate. **Amended by MB.84 (2026-10-19, the owner's call):** the home page `/` is crawlable on production too, allowed in `robots.ts` as `/$` (the root alone), so Google can read a site name from it. It is the signed-out front door and carries no workspace data, so `/compendium` remains the only page that shows the site's reference content. Search Console verification and sitemap submission are the owner's action, not code.

### The slug

Ingredients had no slug and are keyed by UUID, and a display label identifies nothing: identity is the formal name and the form (DESIGN.md §5). So:

- **`slugify` of the label, the form and the formal name where one is declared, always** — `ingredientSlug` in `src/lib/slugify.ts`, and nowhere else — stored on every ingredient the way `categories`, `ingredient_forms` and `workspaces` store theirs. `Cat's Claw` / `bark` / _Uncaria tomentosa_ is `cats-claw-bark-uncaria-tomentosa`; an entry declaring no formal name, `graveyard-dirt-earth`. Every declared part goes in for every entry rather than only on a clash, so the shape is deterministic rather than insertion-ordered. What the slug index still refuses is a pair `slugify` folds together and `canonical_key` does not — formal names differing only in punctuation or accents, or words shifting between label and formal name — with an explaining error, as every unique index here is.
- **It follows its inputs** (DESIGN.md §5's `slug`). `name` is freely relabellable because identity moved off it, and the slug moves with it, as it does with the form and the formal name. The old slug goes to `retired_ingredient_slugs` and answers a **308** to the current one — permanent, because a temporary status tells a crawler the old URL is still canonical — until `expires_at`, a generated column: the UTC date of the retirement plus 180 days, at 00:00 UTC whatever the hour of the rename. Sitemaps carry only current slugs.
- **A retired slug is reserved for its whole window.** Nothing else may become it, so a 308 can never come to point at a different ingredient while anything that saw it is inside the window; the ingredient it belonged to may reclaim it at once. A relabel whose slug is reserved changes the name now and records the slug as a **pending claim** — `pending_slug` and `pending_slug_effective_at` on the claimant, one claim per slug by partial unique index, refused otherwise with who holds it and when it lands — that becomes current at the reservation's expiry, retiring the claimant's previous slug in turn.
- **Nothing runs on a schedule.** The redirect, the reservation and the claim all switch by a date comparison at read time, exact at midnight UTC. Vercel Queues deliver events, not dates, and a Hobby cron fires once a day within an hour of its time; both are worse than a predicate. Housekeeping — deleting lapsed retirements, materialising a due claim — rides on the next slug write in that scope, stamped as the admin making it, the lazy shape MB.67's provisional-account sweep already uses.
- **A browser's cached 308** is the residual after the window. Vercel's CDN copy is bounded by the page's revalidate and the tag. MB.84 pins by test that the redirect carries no `max-age`, `Expires` or `Last-Modified`; if the build shows a browser could still hold it, the fallback is an explicit `max-age` bounded to the window's remaining time, set from the proxy.

MB.81 lands the columns and the table; MB.82 the behaviour. Table first, behaviour second, per CLAUDE.md's rule.

**Superseded in part by MB.82 (2026-09-30):** a retired slug is no longer reserved, and there are no pending claims; DESIGN.md §5's `retired_ingredient_slugs` states the rule that replaced them. Once the formal name was in the slug, the entry wanting a retired one was most often the correct entry being added — a create the claims could not serve. The argument, and what the change costs, is [`data.md`, "A taker ends a retired slug's redirect, once confirmed"](data.md#a-taker-ends-a-retired-slugs-redirect-once-confirmed).

**Superseded in part by MB.81 (2026-09-28):** the slug was `slugify(name + ' ' + form)`, a same-label-and-form pair refused and the admin told to distinguish the label. The `standard` seed's two _Uncaria_ barks are exactly that pair, and relabelling one to make room for its address was the address dictating the data. The formal name is what tells such entries apart everywhere else — the identity key, search, MB.84's page title — so it is in the slug too, and MB.82 recomputes the slug when any of its three inputs changes. The slug index is then reachable only where `slugify` folds two different identities together, which is the case its tests exercise.

### What it rules out

- **Better Auth's `anonymous` plugin.** It mints a `users` row and a session cookie per visitor, for the try-before-sign-up of DESIGN.md §13. A public read needs no identity; the plugin would write on every visit and every crawl, put a cookie on pages that are static without one, and add a third identity bootstrap outside `withAudit`. A signed-out reader is `null` from `getSession()`, as `/` already handles. The plugin moves in the mb.74 record from "never" to v2, as try-before-sign-up (DESIGN.md §13), because the feature it exists for is real even though this change does not need it.
- **A slug that stays put on relabel.** Considered and rejected: a permanent address that does not follow the name is a URL that lies, and a redirect with a window costs less than that.
- **Slug-routed workspace entries.** `/coven/[slug]/ingredients/[slug]` would be the shape; not this change.
- **Structured data** beyond `WebPage`. There is no schema.org type for a magical ingredient, and none is needed to be indexed. **Superseded by MB.84's amendment (2026-10-19, the owner's call):** the public pages do carry schema.org JSON-LD, built on `DefinedTerm` and `DefinedTermSet` (an entry, and the list that holds it), and the home page carries `WebSite`. It does not claim a type for the ingredient itself; it describes an entry as a term in a set. See `claude-docs/tasks/mb.md`, MB.84.

### v2: suggesting a change to an entry

The public entry page is where a reader notices a correspondence is wrong, so §13's suggestion queue gains a second subject: a proposed change to an existing entry, beside a proposed new one. DESIGN.md §13, "Compendium and category suggestions", specifies it — offered on the entry page to a signed-in account, accepted by a keeper as an ordinary compendium write — and v1 builds only the entry page's shape. Asking a visitor to sign in before suggesting is the one thing the public compendium asks of anyone, and it is what keeps the queue attributable.

## Each GraphQL document ships as its caller's text

**Status:** decided. Live home: `claude-docs/graphql/client-types.md`.

### Decision

1. **Codegen writes each document as a string** (`documentMode: 'string'`), not a parsed syntax tree, so the browser parses nothing at load. The client sends `String(document)` and reads the operation name with `operationNameOf`.
2. **Callers import `graphql` from `src/lib/graphql-document.ts`**, which returns the text it is given, typed as codegen's generated function. Codegen still finds and types every call, but nothing in the browser imports `src/gql/gql.ts`, the map of every document. `tests/lib/graphql-document.test.ts` asserts that each call's text is the document codegen generated for it.
3. **There are no shared fragments.** A caller's text must be its whole document, so `ReferenceRow` is written out in each caller.
4. **No server package reaches the browser.** The page sizes and the cursor codec live in `src/lib/cursor.ts`, which imports neither `@pothos/core` nor `graphql` and encodes with `btoa` and `atob` rather than `Buffer`; `src/lib/pagination.ts` re-exports them. `tests/guards/browser-server-packages.test.ts` walks every file a `'use client'` file imports and fails on a runtime import of either package, or of `src/gql/`.

### Why

The browser downloaded every document in the app with any one of them. On a production build, first-load scripts (gzip) fell from 454.0 KB to 417.1 KB on `/compendium` (documents held: 130 to 31) and from 485.8 KB to 448.8 KB on a coven's ingredients page (130 to 48). Gone from both: `graphql` (13.2 KB), `@pothos/core` (10.6 KB), the generated map and documents (11.8 KB) and Next's `Buffer` polyfill (5.7 KB).

What stays on first load, with `/compendium`'s gzip share:

| Packages                                                                                                                                          | Size    | Why they stay                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `react-dom`, `react`, `scheduler`, `react-server-dom-turbopack`, `react-is`, `prop-types`                                                         | 75.4 KB | The renderer.                                                                                                                                                                                                                                                                                               |
| `next`, `@swc/helpers`, `next/compiled/process`                                                                                                   | 58.6 KB | The router and runtime.                                                                                                                                                                                                                                                                                     |
| Next's polyfill chunk                                                                                                                             | 39.6 KB | Next's own legacy polyfills, emitted `nomodule` (under `polyfillFiles` in `build-manifest.json`, served as `<script nomodule>`), so a browser that supports modules downloads and runs none of it. It is counted in the first-load figures below only because the measurement lists every script requested. |
| `zod`, `react-hook-form`, `@hookform/resolvers`                                                                                                   | 47.3 KB | Before this change. Now off `/compendium` and `/curator/compendium` apart from what `providers.tsx` needs, and off the ingredients page ([below](#the-date-field-the-sortable-list-and-the-coven-choice-load-apart)). The Grimoire's first load is still 398.7 KB.                                          |
| `@tanstack/query-core`, `@tanstack/react-query`                                                                                                   | 11.7 KB | The GraphQL client's cache.                                                                                                                                                                                                                                                                                 |
| `downshift`, `compute-scroll-into-view`, `@floating-ui/*`                                                                                         | 20.2 KB | The combobox and the popovers.                                                                                                                                                                                                                                                                              |
| `better-auth`, `@better-auth/core`, `@better-auth/passkey`, `@better-fetch/fetch`, `@simplewebauthn/browser`, `better-call`, `nanostores`, `defu` | 18.2 KB | The auth client, for the account menu's sign-out and the impersonation banner. It carries every plugin, passkey included.                                                                                                                                                                                   |

An auth client without the passkey and two-factor plugins for the account menu and the banner (about 5 KB) touches sign-in, so it is the owner's decision and is not built.

### The date field, the sortable list and the coven choice load apart

Five groups left the first-load scripts of `/compendium`, `/curator/compendium` and a coven's Ingredients, and start loading before they are needed: once the page has loaded and is idle (`usePreloadWhenIdle`), and when a person points at, focuses or presses the control that opens them (`preloadOnIntent`). Both are in `src/lib/use-lazy-module.ts`; `lazyModule` shares one import between every caller. Opening shows no loading state; `tests/guards/first-load-scripts.test.ts` fails if a static import brings any of them back.

- **The date field** (`react-day-picker`, `date-fns`, `@date-fns/tz`, about 20.5 KB gzip): only the calendar loads apart (`DateField/lazy-day-picker.ts`); the opener and the typed input stay. Started from every date opener and from Record a Working.
- **The sortable list** (`@dnd-kit/*`, about 13.6 KB): `Combobox/lazy-sortable.tsx`, drawn as a plain list until it arrives. Started from the cards' Edit and Annotate links (`CovenCards/sortable-links.tsx`).
- **The add-to-coven choice** (`IngredientEntry/lazy-coven-choice.tsx`): about 1.7 KB on its own. Started from a compendium card's More.
- **The Edit Stock form** (`StockDialog/lazy-form.tsx`) and **the three ingredient forms** (`IngredientEntry/lazy-forms.tsx`): the forms and their `zod`, `react-hook-form` and `@hookform/resolvers` load apart, started from the opener's hover, focus or press (the `preload` prop of `ModalButton`, `MenuButton` and `IconTip`). First-load files import `Field` parts from their own files, not the `Field` barrel, which the guard counts whole. What remains of `zod` on `/compendium` is what `src/app/providers.tsx` needs.

Measured on a production build, gzip of the scripts requested before the `load` event, at 1280 px, before and after: `/compendium` 405.9 KB to 320.7 KB (27 to 25 scripts), `/curator/compendium` 404.5 KB to 317.0 KB (29 to 27), a coven's Ingredients 440.8 KB to 303.3 KB (31 to 26), a coven's Grimoire 421.8 KB to 398.7 KB (30 to 31). The Grimoire keeps the most. Click-event time to open (Event Timing, Chromium at 6x CPU slowdown, median of 6, 8 ms steps), before and after, at 390 and 1280 px: Edit Stock on a coven card 204 and 172, 196 and 192 ms; Edit Stock from a compendium card 116 and 92, 124 and 84; Make It Ours (coven choice) 80 and 72, 72 and 80; Edit 164 and 176, 184 and 176; Annotate 160 and 176, 180 and 172; Record a Working (14 samples at 390 px) 184 and 180, 224 and 220. Spread overlaps on every row where the after median is higher, so those differences are within noise.

### Rules out

- **Codegen's Babel compiler plugin under Turbopack.** It runs, but Turbopack keeps every export of `src/gql/graphql.ts` live, so a page still held all 130 documents (about 1% smaller). Two tool facts found on the way: the preset's `exports` map hides its `babel` subpath, so the plugin cannot be named from the package; and `withWorkflow` owns the plain `*.ts` and `*.tsx` `turbopack.rules` keys and adds its own content test, so a rule must use brace keys (`*.{ts,cts}`, `*.{tsx,jsx}`) to reach every file.
- **A custom codegen plugin emitting one module per document**: a larger task, and the identity function reaches the same split.
