## The endpoint

`src/app/api/graphql/route.ts` mounts GraphQL Yoga as a Next.js route handler,
answering `GET` and `POST` at `/api/graphql`. It runs in the app's own process:
no separate service, no second deploy, no extra hosting cost.

- **The proxy does not guard it.** `src/proxy.ts`'s matcher skips `/api/*`, so a
  signed-out request reaches Yoga rather than being redirected to `/sign-in`.
  The endpoint has to refuse in its own error shape, since a fetch cannot follow
  a redirect to a page. A signed-out request reaches the schema with a `null`
  session (["The request context"](endpoint.md)), and a scope or a
  service refuses it there.
- **The handler takes the request only.** Next also passes a route context,
  `{ params }`, and this route has no params. So Yoga gets an empty server
  context instead of a Next type it has no field in common with, and the
  request context is built from Yoga's own `request`.

### The IDE: Altair, local development only

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
therefore reads "on only where the app is not publicly reachable". One test pins
it: `tests/e2e/graphql.spec.ts`, against the production build, which fails when
the IDE is forced on. The IDE itself, in local development, is developer tooling
and has no test (M14.27). Introspection and field suggestions follow the same rule
(["Protections"](protections.md)). Using it — and querying by hand where it is
off — is [`manual-api-testing.md`](manual-api-testing.md).

### No CORS

`cors: false`, so the endpoint sends no `Access-Control-*` headers at all.
Yoga's default is not neutral: it echoes back whatever `Origin` a request
carries and adds `Access-Control-Allow-Credentials: true`. That lets any origin
read a response made with the visitor's cookie. The client is same-origin, so it
needs no grant. Staging and the hotfix previews share `sorrelandsalt.com` with
production, so an open grant would also let one environment's pages read
another's responses.

### Refusing a write from another site

Having no CORS grant stops another site reading a response. It does not stop that
site sending one: a form on its page can post to this endpoint with the visitor's
cookie attached, and the mutation runs. So `src/graphql/csrf.ts` refuses, before
Yoga runs and so before any resolver, every request that is not `GET`, `HEAD` or
`OPTIONS` unless both of these hold:

- Its `content-type` is `application/json` (else 415). A form cannot send that
  type without a preflight, and the endpoint never answers a preflight with a grant.
- It carries `x-sorrel-client: web`, which the site's own client adds, or an
  `Origin` whose host is this request's host (else 403).

`GET` is left alone: Yoga refuses a mutation sent over `GET`, so a read is all it
can do. `/api/auth/*` is a separate route and unaffected.

By hand, add the header to a `curl` (`-H 'x-sorrel-client: web'`); Altair is
served from this origin and sends its own `Origin`.

The standard `@graphql-yoga/plugin-csrf-prevention` was not used: it asks for its
header only on form-style content types and lets a JSON post through, so it would
not refuse a JSON post that carries neither the header nor an `Origin`.

Refusing a cross-site write: a request that could change data must be JSON and carry an Origin naming this host or the client header (which another site cannot add without a preflight the endpoint never grants).

`SameSite=Strict` alone, and an Origin-only check, were rejected as the cross-site defence (the record is [`mb.282-graphql-refuses-cross-site.md`](../design-decisions/mb.282-graphql-refuses-cross-site.md)).

### Tests and the two copies of `graphql`

`graphql` ships a CommonJS build and an ESM build, and a schema made by one
fails the other's `instanceof` ("Cannot use GraphQLSchema from another module
or realm"). Under Vitest, Pothos and Yoga are externalized, so Node gives them
the CommonJS build. A test file is transformed by Vite, which would take the
ESM one. `vitest.config.mts` aliases a bare `graphql` import to the CommonJS
entry, so test code and the packages share one copy. `next build` bundles
consistently and needs no such alias. `tests/e2e/graphql.spec.ts` runs against
the production build.

### `graphql` is pinned to 16

`graphql@^16` is a direct dependency, although Yoga, Pothos and codegen all
accept 17. One package does not: `@escape.tech/graphql-armor`, which depends on `graphql@^16.10.0` as a hard dependency in each of its sub-packages (open issue #885,
"Support graphql v17"), so installing 17 would put a second copy of 16 under armor. `graphql-request`, the client §7 first chose, accepted only
`14 - 16` and was dropped for a small `fetch` wrapper (M10.31;
[`m10.31-graphql-request-dropped.md`](../design-decisions/m10.31-graphql-request-dropped.md)). `msw` 3 declares it as a peer, so the one copy is the app's own. Staying on 16 keeps one copy of `graphql` in the
tree, and two copies are the classic "Cannot use GraphQLSchema from another
module or realm" failure. Armor is the only blocker;
move to 17 when it accepts 17. The catalogue is [`dependencies.md`](../dependencies.md).

### The request context

`src/graphql/context.ts`'s `createContext` runs once per request, as Yoga's
`context` option. It gives every resolver three things, typed as `Context` in
`src/graphql/types.ts`:

- **`session`**, the service-level `Session` from `sessionStateFromHeaders` over the
  request's own headers, or `null` when signed out. It does not use
  `getSession()`, which reads `headers()` for server components. A signed-out
  request is not refused here: the endpoint answers, and whichever scope or
  service the query reaches refuses it.
- **`accessPause`**, set with the pause's end when a pause stands on the signed-in user and the operation
  is not one of the signed-in support form's alone (`isSupportOperation` in `src/graphql/paused-operations.ts`,
  which reads Yoga's `params`); such an operation keeps the session and carries no pause. `session` is then
  `null`, so a public read answers as for anyone signed out, and a refusal from a scope (`unauthorizedError` in
  `src/graphql/builder.ts`) or from `sessionOf` is `AccessPaused`, which leaves as `ACCESS_PAUSED` with
  `pausedUntil` (`claude-docs/design-decisions/m15.52-site-access-pause.md`).
- **`loaders`**, a fresh set of DataLoader instances for this request.
- **`emailVerification`**, `src/lib/email-verification.ts`'s sender bound to
  this request's host and cookie, which the `setEmail` resolver passes to its
  service: a service may not import `auth`, so the Better Auth side of the email
  page reaches it this way
  ([`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "The email page").
- **`passwords`**, `src/lib/password-setter.ts`'s `passwordSetter` bound to
  this request's headers, which the `setPassword` resolver passes to its
  service, for the same reason
  ([`auth/passwords.md`](../auth/passwords.md), "Setting a first password").
