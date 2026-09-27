# GraphQL

The one application-data path from the browser (CLAUDE.md rule 1). DESIGN.md §7
is the specification; this is the current shape.

## The endpoint

`src/app/api/graphql/route.ts` mounts GraphQL Yoga as a Next.js route handler,
answering `GET` and `POST` at `/api/graphql`. It runs in the app's own process:
no separate service, no second deploy, no extra hosting cost.

- **The proxy does not guard it.** `src/proxy.ts`'s matcher skips `/api/*`, so
  a signed-out request reaches Yoga rather than being redirected to
  `/sign-in`. The endpoint has to refuse in its own error shape, since a fetch
  cannot follow a redirect to a page. A signed-out request reaches the schema
  with a `null` session ("The request context" below), and a scope or a
  service refuses it there.
- **The handler takes the request only.** Next also passes a route context,
  `{ params }`, and this route has no params. So Yoga gets an empty server
  context instead of a Next type it has no field in common with, and the
  request context is built from Yoga's own `request`.

## The two transports

CLAUDE.md rule 1, as the code has it. There are two ways in, and both end at
the same service function, so a permission checked once holds for both.

**A server component reads through the service directly.** It calls
`requireSession()` and hands the session to the service; nothing is
serialized and no request is made to the app's own endpoint.

```ts
// A coven's layout and its page (M6.10), each asking:
const session = await requireSession();
const membership = await assertMembership(session, workspaceId, { workspace: ['read'] });
```

**Everything the browser starts goes through `/api/graphql`**: every mutation,
and every read that happens without a navigation. `createContext` builds the
same `Session` from the request's headers ("The request context" below), and
the resolver calls the same function.

```ts
// The `signedIn` scope has already refused a null session by the time this runs.
resolve: async (_query, { workspaceId }, { session }) =>
  (await assertMembership(session!, workspaceId, { workspace: ['read'] })).role,
```

- **Reads dedupe inside a render through React `cache()`.** A layout and a
  page asking the same question cost one query; the next request starts empty.
  Wrap the _lookup_, keyed by ids and other primitives, not a function taking
  the session: `cache()` compares objects by identity, so two callers holding
  equal sessions would each miss. `assertMembership`'s role lookup is the
  first (db.md, "One lookup per render").
- **`cache()` does nothing in the route handler.** Only the Flight renderer
  opens a React cache scope; a Next route handler runs without one, and there
  `cache(fn)` is `fn`. The GraphQL path's dedupe is the request's DataLoaders
  (rule 9), not this.
- **Mutations are never wrapped, and never run in a page.** A write is not
  memoised, and it reaches the database only through a resolver. There are no
  server actions, and `tests/guards/no-server-actions.test.ts` fails a
  `'use server'` directive anywhere under `src/`, because a directive is not an
  import and no lint rule sees it. There are no bespoke route handlers beyond
  this one and `/api/auth/*` ([`auth.md`](auth.md)'s one exception).
- **Admin is not an exception to either.** `/admin`'s pages read through
  services, and its writes go through this endpoint.
- **The service enforces its own authorization,** never trusting a caller to
  have checked. `tests/modules/coven/services/two-transports.test.ts` proves one refusal
  arrives the same way by both paths: a direct call and a resolver over a
  throwaway schema, for a member of another workspace and for a site admin.
- **The boundary is mechanical.** Lint stops a resolver, page or component
  importing anything under `src/db` at runtime, and `server-only` fails the
  build of a client bundle that reaches a service ("The access boundary"
  below).

## The IDE: Altair, local development only

A browser navigating to `/api/graphql` — a `GET` with `Accept: text/html` —
gets [Altair](https://altairgraphql.dev/) when `NODE_ENV` is not `production`.
The route serves it itself, before Yoga sees the request: the page is
same-origin, so the browser sends the session cookie it already holds and the
IDE is signed in as whoever the tab is, with nothing installed and nothing
pasted. `altair-static` renders the shell; its `<base>` points the assets at
jsDelivr, pinned to the installed package version, so there is no asset route to
serve. The endpoint is written absolute from the request's own origin, because a
relative one would resolve against that `<base>`, and the dev server answers as
`localhost` and as `sorrel-app`. Yoga's own `graphiql` is off — its
`renderGraphiQL` hook never sees the request. `altair-static` is a
`serverExternalPackages` entry in `next.config.ts`: it reads its
`dist/index.html` from disk by `__dirname`, which a bundled copy no longer has.

Every deploy, including staging and each hotfix preview, runs at
`NODE_ENV=production`, and so does the e2e server (`next start`). The rule
therefore reads "on only where the app is not publicly reachable". Two tests pin
it: a unit test with `NODE_ENV` stubbed each way, and
`tests/e2e/graphql.spec.ts` against the production build. Each fails when the
IDE is forced on. Introspection and field suggestions follow the same rule
("Protections" below). Using it — and querying by hand where it is off — is
[`manual-api-testing.md`](manual-api-testing.md).

## Protections

`src/graphql/armor.ts`'s `protections({ production })` is the route's Yoga
`plugins`. It limits what a client can ask for, because a GraphQL client
composes its own queries. Without limits, one request can cost as much compute as the
client likes, and an anonymous client can map the whole schema.

**Everywhere, local development included:**

| Limit      | Value | Enforced by                 | Refusal message                                                 |
| ---------- | ----- | --------------------------- | --------------------------------------------------------------- |
| Depth      | 7     | graphql-armor               | `Syntax Error: Query depth limit of 7 exceeded, found 8.`       |
| Cost       | 5000  | `@pothos/plugin-complexity` | `Query exceeds maximum complexity (complexity: <n>, max: 5000)` |
| Aliases    | 15    | graphql-armor               | graphql-armor's default                                         |
| Directives | 50    | graphql-armor               | graphql-armor's default                                         |
| Tokens     | 1000  | graphql-armor               | graphql-armor's default                                         |

Depth, aliases, directives and tokens come from `@escape.tech/graphql-armor`'s
`EnvelopArmorPlugin`, and are checked at validation, so a refusal is a
validation error and `data` is absent. Depth counts field levels, so `{ ok }`
is 1, and is pinned in the file although 7 is not the package default.
Introspection queries (`__schema`) do not count towards it.

**Cost belongs to the complexity plugin, not to armor.** armor's own cost
check is off (`costLimit: { enabled: false }`). It runs at validation, before
variables are bound, so it multiplied a subtree by a _literal_ `first` only:
`children(first: $n)` was priced at one row whatever `$n` held, and an unsized
connection at one row rather than the 25 it returns. It also refused a literal
`first: 1000`, which the server clamps to 100 and should answer. The
complexity plugin prices a query just before its first root resolver runs,
with variables bound, and `MAX_COST` in `src/graphql/builder.ts` is its limit:

- Every field costs 1. A field with a selection adds that selection's cost
  times a multiplier, which is 1 for an object and 10 for a bare list.
- **A connection's multiplier is the page it will fetch**, `pageSize(args)`
  from `src/lib/pagination.ts`: 25 unsized, and never more than 100, whether
  `first` is a literal, a variable, or past the maximum. It is set once, on
  every connection, through the Relay plugin's
  `defaultConnectionFieldOptions`. `edges` is given a multiplier of 1, so a
  page is not priced twice.
- So two nested pages of 10 cost 331 and are answered, two nested default
  pages (25) cost 1951 and are answered, and two nested pages of 100 cost
  30 301 and are refused, however `first` was written.
- A refusal is thrown from the root field before it resolves, so it is an
  execution error: the response carries `data: null` and no resolver ran.

**Off wherever `NODE_ENV=production`:**

- **Introspection.** `@graphql-yoga/plugin-disable-introspection` refuses
  `__schema` and `__type` at validation, one error per introspection field.
  `__typename` still works, because clients rely on it.
- **Field suggestions.** graphql-js answers a misspelt field with
  `Did you mean "ok"?`. That is a way to find field names by guessing. armor
  removes that clause and leaves the rest of the error, so `{ ko }` is still
  refused as `Cannot query field "ko" on type "Query".`

`NODE_ENV` is the same signal the IDE uses. Every deploy, including staging and
each hotfix preview, runs at `production`, so staging gets the real
protections without any configuration of its own. **A local production build
(`npm run build && npm run start`, and so every e2e run) also has
introspection and suggestions off.** That is correct, because it is the build
that ships, but it can be surprising: Altair's docs pane is empty there, and a
typo gets no hint. Use `npm run dev` for either.

The tests: `tests/app/api/graphql/armor.test.ts` drives the real route over a
throwaway schema that nests without limit and pages without running out of
rows. The real schema is one field deep, so no query against it can reach a
depth or cost limit. It runs depth and cost at `development` and at
`production`, each next to the same query shape just inside the limit, to show
that the refusal comes from the limit, and prices a variable `first` the same
as a literal one. `tests/graphql/pagination.test.ts` pins the pricing itself. `route.test.ts`
checks introspection and suggestions against the real schema in both modes,
and `tests/e2e/graphql.spec.ts` repeats the production case against
`next start`.

## No CORS

`cors: false`, so the endpoint sends no `Access-Control-*` headers at all.
Yoga's default is not neutral: it echoes back whatever `Origin` a request
carries and adds `Access-Control-Allow-Credentials: true`. That lets any origin
read a response made with the visitor's cookie. The client is same-origin, so it
needs no grant. Staging and the hotfix previews share `sorrelandsalt.com` with
production, so an open grant would also let one environment's pages read
another's responses.

## The schema

The schema is code-first, built with Pothos in `src/graphql/builder.ts` and
assembled in `src/graphql/schema/index.ts`. A type lives in its own file in the
`graphql/` directory of the module that owns its rows, and the index loads each
module — through its `@/modules/<name>` index, never the deep path — for the
side effect of registering on the builder; only the cross-cutting `AuditInfo`
stays under `src/graphql/schema/` ([`modules.md`](modules.md)).

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
- **One date scalar, `DateTime`.** It is graphql-scalars' `DateTimeISO` under
  the plain name. A resolver hands it a `Date`, and the wire carries an ISO 8601
  string. `DateTimeISO` rather than the package's `DateTime` because the latter
  serializes to a `Date` and leaves the string to `JSON.stringify`.
- **`AuditInfo` is defined once**, in `src/graphql/schema/audit.ts`. An
  audited type exposes its stamps as `audit: AuditInfo!`, resolved from the row
  itself, and never as flat fields of its own. It carries the four stamps:
  `createdAt`, `createdBy`, `updatedAt`, `updatedBy`. `deleted_at` never
  surfaces, because no finder returns a soft-deleted row and the join tables
  carry no such column. `createdBy`/`updatedBy` are bare ids for now; MB.10's
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

`User` carries `id`, `name`, `image`, `email`, `role`,
`canCreateWorkspace`, `memberships` and `audit`. Three of those are private:
`email`, `role` and `canCreateWorkspace` are the user's own business, not a
co-member's, and carry the `self`-or-`admin` scope below. They stay
non-null, so a query for another user's email fails with `Forbidden` rather
than returning the user without it — ask for what you may read.

`User.memberships: [WorkspaceMember!]!` is registered by the `coven` module,
not `identity`, because `identity` may import no module
([`modules.md`](modules.md)). It resolves through the `membershipsByUser`
loader, whose service, `membershipsOf(session, userIds)`, answers each id with
that user's live memberships in live workspaces — or a `Forbidden` in that
id's slot for anyone but the caller, a site admin included, since an admin
reaches no workspace. A `WorkspaceMember` carries `role`, `joinedAt`,
`workspace` and `audit`; `Workspace` is `id`, `name`, `slug` and `audit`,
the minimum a switcher needs, and M6 adds to it. `memberships` is a bare list,
bounded by its parent, like every nested list (DESIGN.md §7).

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
either does; M5.7 puts `admin` on every admin mutation. The private fields'
test hands `me` another user's row, standing in for a service that chose the
wrong one, which is the bug the scope is behind. A
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

## Client types

Pothos types the server's half of the API. The browser's half is the documents
it sends, and `npm run codegen` types those: graphql-codegen's `client-preset`,
configured in `codegen.ts`, reads the committed SDL and every `graphql()` call in
`src/`, and writes `src/gql/`. Its `graphql()` function has one overload per
document, returning a `TypedDocumentNode` that carries the operation's result and
variables types, so a response is typed from the schema rather than by hand.

```ts
import { graphql } from '@/gql';

const OkQuery = graphql(`
  query Ok {
    ok
  }
`);
// TypedDocumentNode<{ ok: boolean }, Exact<{ [key: string]: never }>>
```

- **The chain is Pothos → `schema.graphql` → `src/gql/`.** Codegen reads the
  snapshot, not the Pothos module, so it needs no database, env or TypeScript
  loader. A schema change is therefore two steps: regenerate the snapshot with
  `-u`, then run `npm run codegen`, and commit both.
- **Only what a document uses is generated.** `client-preset` emits the
  operations it finds and the schema types they reach, so a schema change that
  no document touches leaves `src/gql/` alone. Removing or renaming a field
  that a document selects fails `npm run codegen` at validation.
- **Committed, and guarded.** `tests/guards/codegen-staleness.test.ts`
  regenerates in memory and fails on any file under `src/gql/` that differs, is
  missing or is left over. It runs in CI's `vitest` job; there is no workflow of
  its own. The same file proves that a document gets typed, that an unknown field
  fails, and that an unmapped scalar fails.
- **Custom scalars map to their wire type** in `codegen.ts`: `DateTime` is a
  `string`, because graphql-scalars serialises it to ISO 8601. With
  `strictScalars` on, a new scalar without a mapping fails the run instead of
  typing as `any`.
- **No generated hooks.** `client-preset` generates documents, not hooks.
  `graphqlQuery` runs a `TypedDocumentNode` through TanStack Query ("The
  client" below).
- **Enums are string unions** (`enumsAsTypes`), so no enum object ships to the
  browser.
- **Excluded from formatting and coverage, not from typechecking.** Prettier
  ignores `src/gql/` because the generator owns its layout, and coverage
  excludes it because the guard compares it rather than running it. Each file
  opens with `/* eslint-disable */`, which oxlint honours. `tsc` still checks it.
- `@graphql-typed-document-node/core` is a direct dependency, because the
  generated files import its types.

## The client

A client component reads through `graphql-request` and TanStack Query, not
Apollo, whose normalized cache would duplicate TanStack Query's and add ~40 kB
(DESIGN.md §7). `src/lib/graphql-client.ts` holds the whole of it:

```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { graphql } from '@/gql';
import { graphqlQuery } from '@/lib/graphql-client';

const OkQuery = graphql(`
  query Ok {
    ok
  }
`);

export function Ok() {
  const { data } = useQuery(graphqlQuery(OkQuery)); // data: { ok: boolean } | undefined
  return <p>{data?.ok ? 'Up' : 'Checking…'}</p>;
}
```

- **`graphqlQuery(document, variables)`** returns `queryOptions` keyed
  `[operationName, variables]`. Codegen refuses two operations with one name, so
  the name alone identifies the document, and an invalidation after a mutation
  names it: `queryClient.invalidateQueries({ queryKey: ['Ok'] })`. An anonymous
  operation throws, having nothing to key by.
- **`graphqlRequest(document, variables)`** is the same request outside a
  query — a mutation's `mutationFn`. Both require the variables a document
  declares and accept none when it declares none, checked by `tsc`.
- **Browser only.** The endpoint is resolved against `window.location`, so the
  session cookie rides along same-origin. On the server the call throws: a
  server component reads a service directly (CLAUDE.md rule 1), and a client
  component rendered on the server should use `useQuery`, which does not fetch
  there, rather than `useSuspenseQuery`, which would.
- **A GraphQL error rejects.** `graphql-request` throws a `ClientError` whenever
  the response carries `errors`, so a partial answer never reads as whole. Its
  `response.errors[].extensions` carries the code and field errors (MB.43).

### Defaults

`makeQueryClient()` sets them, for queries only:

| Option         | Value            | Why                                                                                                                                                        |
| -------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `staleTime`    | 30 s             | A remount, or a second component asking the same thing, reuses the answer instead of refetching at once.                                                   |
| `retry`        | `shouldRetry`    | Twice, and only for a fetch that failed or a 5xx. A GraphQL error arrives as a 200 and a 4xx is the request's fault: both would get the same answer again. |
| `throwOnError` | `throwWhenEmpty` | To the nearest error boundary while there is no data to show. A failed background refetch keeps the last answer on screen.                                 |

Mutations keep TanStack Query's own: no retry, since a write is not safely
repeatable, and the error returned to the caller, because a form renders it
field by field rather than replacing the page.

### The provider

`src/app/providers.tsx` mounts one `QueryClientProvider`, and the root layout
wraps the page in it — the page only, since the theme toggle and backdrop
query nothing. A second provider nested lower would split the cache, so an
invalidation in one tree would miss the other; `tests/guards/graphql-client.test.ts`
fails a second one, and fails any Apollo package in the lockfile.

The browser keeps one client for the tab, in a module variable rather than
`useState`, which React throws away if the first render suspends. A server
render builds its own, so one request's cache never reaches another's. The
tab's cache is not keyed by viewer (CLAUDE.md rule 6), so whatever signs a
user out must end with a full navigation or `queryClient.clear()`, or the next
account in the tab reads the last one's answers until they go stale.

## Pagination

Every list query paginates through one helper (CLAUDE.md rule 8): cursor-based,
25 rows by default, and never more than 100. A client asking for more gets 100,
with no error, whether it wrote `first: 1000` or `first: $n`. Each later task
that adds a list query adopts it in its own PR, and the guard below makes
forgetting fail in that PR.

```ts
builder.queryFields((t) => ({
  compendium: t.pagedConnection({
    type: Ingredient,
    args: { search: t.arg.string({ required: false }) },
    resolve: (_parent, { search }, page, { session }) => compendium.list(session, search, page),
  }),
}));
```

The field is a Relay connection. `@pothos/plugin-relay` builds the
`<Parent><Field>Connection` and `…Edge` types and a shared `PageInfo`, and adds
`first`, `after`, `last` and `before`. Edges and nodes are non-null. The plugin's
`Node` interface, global ids and `node`/`nodes` queries are switched off, so
an id is still the row's own uuid. Its offset-based helpers
(`resolveOffsetConnection`, `resolveArrayConnection`) are not used.

It runs in three layers, so the transport, the service and the repository
each keep to their own rules:

- **`src/lib/pagination.ts`** is pure. It holds the two numbers, the `Cursor`,
  the `PageRequest` a finder is asked for, and `resolvePage`. `resolvePage`
  decodes the cursors and clamps the size with `@pothos/core`'s
  `parseCursorConnectionArgs`. It then asks for one row more than the page,
  because the extra row says whether another page follows, and builds `edges`
  and `pageInfo` from the answer. A service names these types without
  importing any runtime code.
- **`t.pagedConnection`** in `src/graphql/pagination.ts` is added to every
  field builder, the same way the Relay plugin adds `t.connection`.
  `builder.ts` imports it for that side effect. Its `resolve` receives a
  decoded, clamped `PageRequest`, never the client's `first` or `after`, so
  no resolver can skip the maximum or read a cursor as an offset.
- **`findPage` and `findPageInWorkspace`** in the repository run the keyset
  query (claude-docs/db.md, "Keyset pages").

**A cursor is the sort key and the id, never an offset**: base64url of
`{"k": <key>, "i": <id>}`. An offset moves when a row is inserted or deleted
ahead of the reader, and a key does not. The key is the text Postgres prints
for the value. A `timestamptz` read into a JS `Date` keeps milliseconds and
loses microseconds, and a cursor built from it would replay every row in that
millisecond. A malformed cursor, or one whose key will not cast to the sort
column's type, is `InvalidCursor` from `src/lib/errors.ts`. `t.pagedConnection`
turns that into an `Invalid cursor` GraphQL error. It is never treated as "from
the start", which would return a page the client did not ask for.

**Depth.** A connection costs two levels, `edges` and `node`, on top of its
field. A root connection holding one nested connection therefore uses all
seven levels: `{ a { edges { node { b { edges { node { name } } } } } } }`. A
list nested on an object stays a bare list, as DESIGN.md §7 sketches, and is
bounded by its parent.

**Cost** is priced at the page each connection will fetch ("Protections"
above).

**The guard.** `tests/guards/pagination.test.ts` fails:

- a `Query` field that returns a bare list;
- a `*Connection` field without `first` and `after`;
- a `.connection(` call anywhere in `src/` except `src/graphql/pagination.ts`,
  untracked files included.

It also proves that the first two checks can fail, by running them against a
throwaway schema.

The tests: `tests/lib/pagination.test.ts` covers the numbers, the clamp and the
cursor codec. `tests/graphql/pagination.test.ts` covers the field over the
transport and its pricing. `tests/db/pagination.test.ts` covers the keyset
walk.

## The request context

`src/graphql/context.ts`'s `createContext` runs once per request, as Yoga's
`context` option. It gives every resolver two things:

- **`session`**, the service-level `Session` from `sessionFromHeaders` over the
  request's own headers, or `null` when signed out. It does not use
  `getSession()`, which reads `headers()` for server components. A signed-out
  request is not refused here: the endpoint answers, and whichever scope or
  service the query reaches refuses it.
- **`loaders`**, a fresh set of DataLoader instances for this request.

## Loaders: one set per request, never at module level

A DataLoader caches for as long as its instance lives. One built at module
level would outlive the request and serve one viewer's answers to the next
(CLAUDE.md rules 6 and 9), so the construction is made impossible rather than
merely absent:

- **`defineLoader(batch)`** in `src/graphql/loaders/define-loader.ts` returns a
  _factory_, `(session) => DataLoader`, not an instance. `batch` receives the
  request's session first, because the service it batches takes one too: a
  loader batches a service call and never bypasses one.
- **`src/graphql/loaders/index.ts`** registers each factory in `LOADERS`, under
  the name a resolver reads it by. `createLoaders(session)` calls every factory
  and is called only by `createContext`. Each loader arrives with the schema it
  loads: `membershipsByUser` (`coven`, for `User.memberships`) is the first;
  M4.8 `categoriesByIngredient`, M6.11 `membersByWorkspace`, MB.9
  `ingredientsById` and MB.10 `usersById` follow. A test that builds a context
  by hand calls `createLoaders(session)` rather than passing `{}`, which the
  `Loaders` type no longer admits. A factory is written in its module's `loaders/`, exported
  through the module's index, and spread into `LOADERS` here
  ([`modules.md`](modules.md)).
- **Only `define-loader.ts` may import `dataloader` at runtime.**
  `.oxlintrc.json` bans the import everywhere else. Its `src/modules/*/services/**`,
  `src/db/**` and access-boundary overrides restate the ban, because an
  override replaces the top-level rule rather than merging with it. `import type` stays legal.
  `define-loader.ts` is exempt by a named `oxlint-disable-next-line`, and
  `tests/guards/lint-loader-boundary.test.ts` pins that exemption set to that
  one file, untracked files included.

## The access boundary

Resolvers, pages and components reach a service and nothing below it
(CLAUDE.md rule 1). Two mechanisms enforce that, one for each direction a
shortcut could take:

- **Nothing above services imports the database layer.** `.oxlintrc.json`'s
  override for `src/graphql/**`, `src/app/**` and `src/components/**` bans a
  runtime import of anything under `src/db`: the repository and the client,
  and also `audit.ts`, the schema, the seed and `bootstrap.ts`. A resolver
  that needs an enum's values gets them from a service. `import type` stays
  legal, since that is how a resolver names a row type (DESIGN.md §7), and it
  can reach nothing. The client stays banned even as a type, under rule 2's
  own group. `src/lib` is outside the override because `lib/auth.ts` hands
  Better Auth the schema tables. The override restates the four top-level bans,
  because an override replaces the rule rather than merging with it
  ([`db.md`](db.md), "Where queries may be built").
- **No client component imports a service.** Every file under
  `src/modules/*/services` opens with `import 'server-only'`. Next resolves that marker
  to a build error in any client bundle that reaches it, whether directly or
  through a `lib` module in between, and wherever the `'use client'` file
  lives. Lint cannot do this, because it scopes a rule by path and a client
  component is marked by a directive, not by its folder. The package is not
  installed: Next ships and resolves it itself. `vitest.config.mts` and
  `vitest.stories.config.mts` alias it to Next's empty stub, since a test is
  not a client bundle.

`tests/guards/lint-access-boundary.test.ts` lints probes in each of the three
directories. It asserts that every module under `src/db` draws the boundary's
diagnostic, and that a type import and a service import draw none. It also
checks that the restated bans still fire. A runtime import of the client draws
two diagnostics, rule 2's and the boundary's. oxlint reports each matching
group, and excluding the client from the boundary group with
`!**/db/connection` silences the client group as well. So the test counts the
boundary's message, not every diagnostic.
`tests/guards/server-only-services.test.ts` walks `src/modules/*/services`, including
uncommitted files, and fails any module without the marker. A new service
adopts the marker in its own PR.

## Tests and the two copies of `graphql`

`graphql` ships a CommonJS build and an ESM build, and a schema made by one
fails the other's `instanceof` ("Cannot use GraphQLSchema from another module
or realm"). Under Vitest, Pothos and Yoga are externalized, so Node gives them
the CommonJS build. A test file is transformed by Vite, which would take the
ESM one. `vitest.config.mts` aliases a bare `graphql` import to the CommonJS
entry, so test code and the packages share one copy. `next build` bundles
consistently and needs no such alias. `tests/e2e/graphql.spec.ts` runs against
the production build.

## `graphql` is pinned to 16

`graphql@^16` is a direct dependency, although Yoga, Pothos and codegen all
accept 17. `graphql-request`, the client §7 chooses, accepts only `14 - 16`, and
`msw` already brings in 16. Staying on 16 keeps one copy of `graphql` in the
tree, and two copies are the classic "Cannot use GraphQLSchema from another
module or realm" failure. Move to 17 once `graphql-request` accepts it.
