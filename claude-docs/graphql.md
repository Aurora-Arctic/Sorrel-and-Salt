# GraphQL

The one application-data path from the browser (CLAUDE.md rule 1). DESIGN.md §7
is the specification; this is the current shape.

**Every section is a file under `graphql/`**, moved there whole. This page keeps
each `## ` and `### ` heading with a link to where it lives; a citation in code
names that file, not this page.

## The endpoint

`src/app/api/graphql/route.ts` mounts GraphQL Yoga at `/api/graphql` in the app's own process, and `src/proxy.ts` skips it so a signed-out request reaches the schema with a `null` session rather than a redirect. [`graphql/endpoint.md`](graphql/endpoint.md)

## The two transports

A server component calls the service directly with `requireSession()`'s session and everything the browser starts goes through `/api/graphql`, both ending at the same service function, with React `cache()` deduping a render's reads and guard tests failing `'use server'` and any other route handler. [`graphql/two-transports.md`](graphql/two-transports.md)

## The IDE: Altair, local development only

A browser navigating to `/api/graphql` gets Altair, rendered by `altair-static` before Yoga sees the request and signed in by the tab's own cookie, only where `NODE_ENV` is not `production`, which rules out every deploy and the e2e server. [`graphql/altair.md`](graphql/altair.md)

## Protections

`src/graphql/armor.ts` caps every query in every environment — depth 7, cost 5000, 15 aliases, 50 directives, 1000 tokens — with cost priced by `@pothos/plugin-complexity` at each connection's page size, and turns introspection and field suggestions off in production. [`graphql/protections.md`](graphql/protections.md)

## No CORS

The endpoint sets `cors: false` and sends no `Access-Control-*` headers, because Yoga's default echoes any `Origin` with credentials allowed, the same-origin client needs no grant, and staging and the hotfix previews share `sorrelandsalt.com` with production. [`graphql/no-cors.md`](graphql/no-cors.md)

## The schema

Code-first Pothos with no ORM plugin and fields non-null by default: the `DateTime` scalar, `AuditInfo`, every field from `me` to the workspace ingredient mutations, the `signedIn`, `admin` and `self` scopes as the second check, and the committed `schema.graphql` snapshot. [`graphql/schema.md`](graphql/schema.md)

### `me`, `User` and the first module types

In [`graphql/schema.md`](graphql/schema.md#me-user-and-the-first-module-types).

### `planetSuggestions` and `zodiacSuggestions`

In [`graphql/schema.md`](graphql/schema.md#planetsuggestions-and-zodiacsuggestions).

### `formSuggestions` and `commonNameSuggestions`

In [`graphql/schema.md`](graphql/schema.md#formsuggestions-and-commonnamesuggestions).

### `possibleDuplicates`

In [`graphql/schema.md`](graphql/schema.md#possibleduplicates).

### `compendium`, `ingredient` and `ingredientFormValues`

In [`graphql/schema.md`](graphql/schema.md#compendium-ingredient-and-ingredientformvalues).

### The workspace ingredient mutations

In [`graphql/schema.md`](graphql/schema.md#the-workspace-ingredient-mutations).

### Auth scopes: the second check

In [`graphql/schema.md`](graphql/schema.md#auth-scopes-the-second-check).

### The SDL snapshot

In [`graphql/schema.md`](graphql/schema.md#the-sdl-snapshot).

## Client types

`npm run codegen` runs graphql-codegen's `client-preset` over the committed SDL and every `graphql()` call to write `src/gql/`, one `TypedDocumentNode` per document and no hooks, and `tests/guards/codegen-staleness.test.ts` fails output that differs from a fresh run. [`graphql/client-types.md`](graphql/client-types.md)

## The client

A client component reads through `graphql-request` and TanStack Query, not Apollo, using `src/lib/graphql-client.ts`'s browser-only `graphqlQuery` and `graphqlRequest` under one `QueryClientProvider`, whose cache is not keyed by viewer, so sign-out must clear it. [`graphql/client.md`](graphql/client.md)

### Defaults

In [`graphql/client.md`](graphql/client.md#defaults).

### The provider

In [`graphql/client.md`](graphql/client.md#the-provider).

## Pagination

Every list query is a Relay connection through `t.pagedConnection`, 25 rows by default and clamped to 100, paged by a sort-key-and-id cursor rather than an offset and optionally counted, and `tests/guards/pagination.test.ts` fails a `Query` field returning a bare list. [`graphql/pagination.md`](graphql/pagination.md)

## Errors

A service throws `ValidationError`, `Forbidden` or `NotFound` from `src/lib/errors.ts`, and `src/graphql/errors.ts`'s `maskError` attaches `VALIDATION`, `FORBIDDEN` or `NOT_FOUND` on the way out, keeps the service's message verbatim, and masks anything else in every environment. [`graphql/errors.md`](graphql/errors.md)

## The request context

`src/graphql/context.ts`'s `createContext` runs once per request and gives every resolver its `session`, `null` when signed out rather than a refusal, a fresh set of `loaders`, and the `emailVerification` sender bound to the request's host and cookie. [`graphql/request-context.md`](graphql/request-context.md)

## Loaders: one set per request, never at module level

`defineLoader` returns a factory taking the session, never an instance, `createLoaders(session)` builds a fresh set from the `LOADERS` registry per request, a refusal is per key, and only `src/graphql/loaders/define-loader.ts` may import `dataloader` at runtime. [`graphql/loaders.md`](graphql/loaders.md)

## The access boundary

Resolvers, pages and components reach services and nothing below them: an `.oxlintrc.json` override bans runtime imports of `src/db` from `src/graphql/**`, `src/app/**` and `src/components/**`, and every service's `import 'server-only'` fails a client bundle that reaches it. [`graphql/access-boundary.md`](graphql/access-boundary.md)

## Tests and the two copies of `graphql`

A schema from one of `graphql`'s CommonJS and ESM builds fails the other's `instanceof`, so `vitest.config.mts` aliases a bare `graphql` import to the CommonJS entry that Pothos and Yoga already load, and `next build` needs no such alias. [`graphql/two-graphql-copies.md`](graphql/two-graphql-copies.md)

## `graphql` is pinned to 16

`graphql@^16` is a direct dependency although Yoga, Pothos and codegen accept 17, because `graphql-request` accepts only `14 - 16` and one copy in the tree avoids the two-realm failure, and it moves to 17 once `graphql-request` does. [`graphql/graphql-pin.md`](graphql/graphql-pin.md)
