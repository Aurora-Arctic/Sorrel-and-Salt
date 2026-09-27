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
  cannot follow a redirect to a page. Authentication belongs to the request
  context that M3.2 adds, and authorization belongs to the services, as always.
- **The handler takes the request only.** Next also passes a route context,
  `{ params }`, and this route has no params. So Yoga gets an empty server
  context instead of a Next type it has no field in common with.

## GraphiQL: local development only

`graphiql` is on only when `NODE_ENV` is not `production`. Every deploy,
including staging and each hotfix preview, runs at `NODE_ENV=production`, and so
does the e2e server (`next start`). The rule therefore reads "on only where the
app is not publicly reachable". Two tests pin it: a unit test with `NODE_ENV`
stubbed each way, and `tests/e2e/graphql.spec.ts` against the production build.
Each fails when GraphiQL is forced on.

## No CORS

`cors: false`, so the endpoint sends no `Access-Control-*` headers at all.
Yoga's default is not neutral: it echoes back whatever `Origin` a request
carries and adds `Access-Control-Allow-Credentials: true`. That lets any origin
read a response made with the visitor's cookie. The client is same-origin, so it
needs no grant. Staging and the hotfix previews share `sorrelandsalt.com` with
production, so an open grant would also let one environment's pages read
another's responses.

## The schema

`src/graphql/schema/index.ts` holds a one-field placeholder, `ok: Boolean!`,
because a GraphQL schema is not valid without a Query field. It mirrors Better
Auth's `/api/auth/ok`. M3.2 replaces it with the Pothos builder.

## `graphql` is pinned to 16

`graphql@^16` is a direct dependency, although Yoga, Pothos and codegen all
accept 17. `graphql-request`, the client §7 chooses, accepts only `14 - 16`, and
`msw` already brings in 16. Staying on 16 keeps one copy of `graphql` in the
tree, and two copies are the classic "Cannot use GraphQLSchema from another
module or realm" failure. Move to 17 once `graphql-request` accepts it.
