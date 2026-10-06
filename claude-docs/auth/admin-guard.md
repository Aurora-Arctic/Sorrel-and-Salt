## The admin guard (M5.4)

`/admin` answers three visitors three ways, all from the server:

| Visitor              | Answer                                                  | From                                    |
| -------------------- | ------------------------------------------------------- | --------------------------------------- |
| Signed out           | 307 to `/sign-in?next=<path and query>`                 | The proxy, then `requireSession()`      |
| Signed in, not admin | **403**, the styled not-authorized page at the same URL | `requireAdminSession()`'s `forbidden()` |
| Admin                | The layout: `AdminNav` above the page                   | `src/app/admin/layout.tsx`              |

- **`requireAdminSession()`** (`src/lib/request-session.ts`) is
  `requireSession()` — so a signed-out visitor and an unverified account are
  redirected exactly as on every other page, an unverified admin included —
  then the identity module's `assertSiteAdmin()`. The check is the service's;
  the helper only translates its `Forbidden` into Next's `forbidden()`, the way
  `/coven/[slug]` will translate a refusal into a 404. It returns the
  `Session`, not the `SiteAdmin` proof: a page reads, and a write mints its own
  proof in the service it calls.
- **A 403 page, not a 404.** `/admin` is a path everyone already knows, so
  pretending it does not exist buys no secrecy and only makes the app look
  broken (CLAUDE.md's domain invariants; ["The three errors"](service-session.md)). The page says the account lacks admin rights and
  offers the way back to `/`. It never names an admin and offers no way to ask
  for access ([`components/not-authorized.md`](../components/not-authorized.md)).
- **`forbidden()` is Next's, behind `experimental.authInterrupts`** in
  `next.config.ts`. It throws, and Next answers 403 with a `noindex` robots
  tag and `src/app/forbidden.tsx` at the same URL. The boundary is at the root
  because the layout is what throws it, and a segment's own `forbidden.tsx`
  sits inside that segment's layout. It is the one `forbidden()` in the app:
  `/coven/[slug]` answers 404.
- **The browser renders that page, not the server.** A `forbidden()` or
  `notFound()` thrown during render with no `<Suspense>` above it fails the
  server render, so Next sends the status with an empty
  `<html id="__next_error__">` shell and the browser renders the page from the
  RSC payload the response carries. The refusal is still the server's: the
  403 comes first and the payload holds no admin markup — but the page needs
  JavaScript to show, and on it the root layout's pre-paint scripts do not
  run. React would create them in the browser inert, and warn, so
  `src/app/pre-paint-scripts.tsx` renders them only while hydrating the
  server's HTML; the stored theme is therefore not applied on such a page,
  which shows the system's.
- **That is Next's behaviour for every thrown error page, kept on purpose.**
  Its `not-found`, `forbidden` and `error` files are browser-side error
  boundaries, and React runs none while rendering on the server, so a thrown
  `notFound()` and a thrown error's 500 are drawn by the browser too; a
  `<Suspense>` above the throw only turns the status into a 200
  ([vercel/next.js#62228](https://github.com/vercel/next.js/issues/62228),
  open since 2024). An unmatched URL throws nothing and is the one
  server-rendered 404 — a missing page under `/admin` included, which never
  reaches the guard. A proxy rewrite to a page with `{ status: 403 }` would
  server-render the refusal, and was turned down so that every error page
  works one way; it can still go in front of this guard later without
  changing it.
- **The layout calls it, and so does every page under `/admin`.** A layout
  does not re-run on client-side navigation, and it does not decide whether
  its child segments render — the router renders them (Next's authentication
  guide, "Layouts and auth checks").
  `requireSession()`'s lookup is `cache()`-wrapped, so the second call costs
  nothing. An admin page is still no data boundary: the compendium and the
  vocabularies it lists are public reads, every write is a GraphQL mutation
  whose service asserts the role itself, and a page that reads anything
  private — `/admin/users` (MB.52) — carries its own service-level assertion
  ([`admin-users.md`](admin-users.md), "The user list").
- **No way around `/api/graphql`.** Admin writes are GraphQL mutations like
  every other (CLAUDE.md rule 1): `tests/guards/no-server-actions.test.ts`
  refuses a server action and `tests/guards/route-handlers.test.ts` a route
  handler beyond the GraphQL endpoint and `/api/auth/*`.
- **Tests.** `tests/lib/request-session.test.ts` covers the three answers and
  the unverified admin; `tests/app/pre-paint-scripts.test.tsx` that a
  browser-rendered page gets no script and no warning;
  `tests/app/admin/layout.test.tsx` proves the layout
  and the index page each await the guard before rendering;
  `tests/e2e/admin.spec.ts` asserts the redirect, the 403 with no admin markup
  anywhere in the document, and the layout, against the built server.
