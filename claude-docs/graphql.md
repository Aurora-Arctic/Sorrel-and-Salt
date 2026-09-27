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
IDE is forced on. Using it — and querying by hand where it is off — is
[`manual-api-testing.md`](manual-api-testing.md).

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
assembled in `src/graphql/schema/index.ts`. A type lives in its own file under
`src/graphql/schema/`, which the index imports for its side effect of
registering on the builder.

- **No ORM plugin.** `@pothos/plugin-drizzle` is deliberately absent (MB.20,
  DESIGN.md §7). An object type is declared by hand as an `objectRef` over the
  row type the service returns, such as `typeof ingredients.$inferSelect`. So a
  column whose type changes still fails `npm run typecheck`: `t.exposeString`
  over a column that became a number no longer compiles, and neither does a
  resolver returning the wrong shape. `tests/graphql/builder.test.ts` pins
  both with `@ts-expect-error` inside a function that is never called. `tsc`
  checks it, and nothing registers on the real builder.
- **Every Pothos package is a stable major:** `@pothos/core` and
  `@pothos/plugin-scope-auth`, both at 4. A `0.x` plugin entering the tree is a
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
- **`ok: Boolean!` stands until the first real Query field.** GraphQL needs one
  Query field to be valid. `ok` mirrors Better Auth's `/api/auth/ok`.

### Auth scopes: the second check

`@pothos/plugin-scope-auth` gives the schema two scopes, both read off the
context without a query:

| Scope      | Holds when                  |
| ---------- | --------------------------- |
| `signedIn` | the request has a session   |
| `admin`    | the session's role is admin |

A scope is the second check, never the first. The service's own check is the
gate (CLAUDE.md rule 1), and a scope on a field is a cheap early refusal in
front of it: M3.10 puts one on `User.email`, M5.7 on every admin mutation. A
scope refusal throws `Forbidden` from `src/lib/errors.ts`, the same type a
service throws, so the transport maps one refusal shape whichever check said
no (MB.43).

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
  and is called only by `createContext`. The registry is empty until the first
  loader lands. Each loader arrives with the schema it loads: M4.8
  `categoriesByIngredient`, M6.11 `membersByWorkspace`, MB.9 `ingredientsById`,
  MB.10 `usersById`.
- **Only `define-loader.ts` may import `dataloader` at runtime.**
  `.oxlintrc.json` bans the import everywhere else, and its `src/services/**` and
  `src/db/**` overrides restate the ban because an override replaces the
  top-level rule rather than merging with it. `import type` stays legal.
  `define-loader.ts` is exempt by a named `oxlint-disable-next-line`, and
  `tests/guards/lint-loader-boundary.test.ts` pins that exemption set to that
  one file, untracked files included.

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
