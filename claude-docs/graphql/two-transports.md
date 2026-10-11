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
same `Session` from the request's headers (["The request
context"](request-context.md)), and the resolver calls the same function.

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
  first (db/membership-proof.md, "One lookup per render").
- **`cache()` does nothing in the route handler.** Only the Flight renderer
  opens a React cache scope; a Next route handler runs without one, and there
  `cache(fn)` is `fn`. The GraphQL path's dedupe is the request's DataLoaders
  (rule 9), not this.
- **Mutations are never wrapped, and never run in a page.** A write is not
  memoised, and it reaches the database only through a resolver. There are no
  server actions, and lint's `sorrel/no-use-server` (`lint/sorrel-lint.js`)
  fails a `'use server'` directive, which no `no-restricted-imports` rule
  could see. There are no bespoke route handlers beyond
  this one and `/api/auth/*`
  ([`auth/graphql-only-exception.md`](../auth/graphql-only-exception.md)), and
  lint's `sorrel/route-allowlist` fails any other `route` file under
  `src/app/`, by its path: a file is not an import either.
- **Admin is not an exception to either.** `/admin`'s pages read through
  services, and its writes go through this endpoint
  ([`auth/admin-guard.md`](../auth/admin-guard.md), "The admin guard").
- **The service enforces its own authorization,** never trusting a caller to
  have checked. Each service's tests refuse by direct call
  (`tests/modules/*/services/`), and each field's GraphQL file reads the same
  refusal as the browser does, `extensions.code` through the shared harness
  (MB.186). A test of the two paths agreeing over a throwaway schema went with
  MB.227: with the check in the service and nowhere else, it repeated both.
- **The boundary is mechanical.** Lint stops a resolver, page or component
  importing anything under `src/db` at runtime, and `server-only` fails the
  build of a client bundle that reaches a service (["The access
  boundary"](access-boundary.md)).
