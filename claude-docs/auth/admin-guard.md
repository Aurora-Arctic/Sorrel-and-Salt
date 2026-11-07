## The admin guard

Since M15.77 the admin area is two: `/curator` for curation and `/keepers` for support, people and invitations. Both layouts call `requireCuratorSession()`. The curation pages
(the compendium with its references, and the vocabularies) are open to a curator as
well as a keeper, described in
"The curator guard" below. Support under `/keepers` is open to both too. The People and Invitations pages (users, the privilege
ledger, invitations, invitation cards and card sign-ups) stay admin-only and are guarded by `requireAdminSession()`, which this
section describes. Both answer in the same three ways, all from the server:

| Visitor                                    | Answer                                                  | From                                 |
| ------------------------------------------ | ------------------------------------------------------- | ------------------------------------ |
| Signed out                                 | 307 to `/sign-in?next=<path and query>`                 | The proxy, then `requireSession()`   |
| Signed in, not allowed on this page        | **403**, the styled not-authorized page at the same URL | The guard's `forbidden()`            |
| Allowed (see the guard on the page's kind) | The layout: `AdminNav` above the page                   | `src/app/(shell)/keepers/layout.tsx` |

- **`requireAdminSession()`** (`src/lib/request-session.ts`) is
  `requireSession()` — so a signed-out visitor and an unverified account are
  redirected exactly as on every other page, an unverified admin included —
  then the identity module's `assertSiteAdmin()`. The check is the service's;
  the helper only translates its `Forbidden` into Next's `forbidden()`, the way
  `/coven/[slug]` translates a refusal into a 404 ([coven-guard.md](coven-guard.md)). It returns the
  `Session`, not the `SiteAdmin` proof: a page reads, and a write mints its own
  proof in the service it calls.
- **A 403 page, not a 404.** `/curator` and `/keepers` are paths everyone already knows, so
  pretending it does not exist buys no secrecy and only makes the app look
  broken (CLAUDE.md's domain invariants; ["The three errors"](service-session.md)). The page says the account lacks keeper rights and
  offers the way back to `/`. It never names a keeper and offers no way to ask
  for access ([`../components/error-page.md`](../components/error-page.md)).
- **`forbidden()` is Next's, behind `experimental.authInterrupts`** in
  `next.config.ts`. It throws, and Next answers 403 with a `noindex` robots
  tag and `src/app/(shell)/forbidden.tsx` at the same URL. The boundary sits in
  the `(shell)` group, above the admin layout, because the layout is what throws
  it, and a segment's own `forbidden.tsx` sits inside that segment's layout. It is the one `forbidden()` in the app:
  `/coven/[slug]` answers 404.
- **The 403 renders inside the navigation shell.** `src/app/(shell)/layout.tsx`
  wraps both areas, so a signed-in non-keeper sees the shell's bar around
  the not-authorised page, with no Admin entry in it.
- **The browser renders that page, not the server.** A `forbidden()` or
  `notFound()` thrown during render with no `<Suspense>` above it fails the
  server render, so Next sends the status with an empty
  `<html id="__next_error__">` shell and the browser renders the page from the
  RSC payload the response carries. The refusal is still the server's: the
  403 comes first and the payload holds no keeper markup — but the page needs
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
  server-rendered 404 — a missing page under either area included, which never
  reaches the guard. A proxy rewrite to a page with `{ status: 403 }` would
  server-render the refusal, and was turned down so that every error page
  works one way; it can still go in front of this guard later without
  changing it.
- **The layout calls its guard, and so does every page under `/curator` and `/keepers`.** A layout
  does not re-run on client-side navigation, and it does not decide whether
  its child segments render — the router renders them (Next's authentication
  guide, "Layouts and auth checks").
  `requireSession()`'s lookup is `cache()`-wrapped, so the second call costs
  nothing. An admin page is still no data boundary: the compendium and the
  vocabularies it lists are public reads, every write is a GraphQL mutation
  whose service asserts the role itself, and a page that reads anything
  private — `/keepers/users` — carries its own service-level assertion
  ([`admin-users.md`](admin-users.md), "The user list").
- **A tabbed page's own layout runs no guard**. Each tabbed page is
  a route group, `src/app/(shell)/keepers/(people)/` and the like, whose `layout.tsx`
  draws the heading and the tabs and reads nothing
  ([`components/tabbed-page.md`](../components/tabbed-page.md)). A layout
  does not re-run on a tab press, so a guard there would add nothing to
  `src/app/(shell)/keepers/layout.tsx`'s and each tab page's. The tabbed pages add no
  `loading.tsx` and no other `<Suspense>` boundary: a tab's loading state
  is the tab row's own, shown only while a pressed tab is on its way. So
  nothing streams ahead of the guard on a direct request, and a refusal any
  tab's page throws keeps its 403 with no boundary to turn it into a 200
  (above); a tab's page refusing during a tab press is a client-side
  navigation, which has no status to keep. `tests/e2e/admin.spec.ts`
  asserts the 403 at `/keepers/users`, a tab.
- **No way around `/api/graphql`.** Admin writes are GraphQL mutations like
  every other (CLAUDE.md rule 1): lint's `sorrel/no-use-server` refuses a
  server action and `sorrel/route-allowlist` a route handler beyond the
  GraphQL endpoint and `/api/auth/*` (`lint/sorrel-lint.js`).
- **Tests.** `tests/lib/request-session.test.ts` covers the three answers and
  the unverified admin; `tests/app/pre-paint-scripts.test.tsx` that the
  server HTML carries all three scripts (theme, Facebook hash, script mark) and hydrates without a warning;
  `tests/app/(shell)/curator/layout.test.tsx` and `tests/app/(shell)/keepers/layout.test.tsx` proves the layout
  and the index page each await the guard before rendering;
  `tests/e2e/admin.spec.ts` asserts the 403 with no keeper markup anywhere in
  the document, and the layout, against the built server; the signed-out
  redirect is `tests/e2e/route-protection.spec.ts`'s.

## The curator guard

A curator is a signed-in account whose site role is `curator`: it uses every
curation screen a keeper can and none of the people pages. The guard that lets
it in is `requireCuratorSession()`, beside `requireAdminSession()` in
`src/lib/request-session.ts`. It is `requireSession()` and then the identity
module's `assertCurator()`, which passes a curator or a keeper; the helper turns
its `Forbidden` into Next's `forbidden()` and returns the `Session`, exactly as
the admin guard does. A signed-out visitor and an unverified account are
redirected first, as everywhere.

| Page                                                                                                                                                                             | Guard                     | A curator gets |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------------- |
| `/curator` and `/keepers` layouts and indexes, `/keepers/support`, the compendium, categories, forms, deities and astrology pages                                                | `requireCuratorSession()` | The page       |
| `/keepers/documents/[key]`, the four documents' tabs                                                                                                                             | `requireAdminSession()`   | **403**        |
| `/keepers/users`, `/keepers/privilege-changes` (the `(people)` group), `/keepers/invitations`, `/keepers/invitation-cards`, `/keepers/card-sign-ups` (the `(invitations)` group) | `requireAdminSession()`   | **403**        |
| `/keepers/business-cards`, a keeper's own business cards                                                                                                                         | `requireAdminSession()`   | **403**        |
| The workshop (`assertWorkshopAccess`)                                                                                                                                            | `assertSiteAdmin`         | Refused        |

- **The layout cannot guard the people pages.** Both layouts run
  `requireCuratorSession()`, so they let a curator through; each page in the
  `(people)` and `(invitations)` groups calls `requireAdminSession()` itself, which is why the rule
  that every page calls its own guard matters here.
- **The nav and the index hide People from a curator, and that is display
  only.** `AdminNav` and the `/keepers` index take `managesPeople`, which is true
  for a keeper; a curator's lists leave out the People and Invitations pages
  ([`components/admin-nav.md`](../components/admin-nav.md)). A curator who types
  `/keepers/users` still gets the 403 from the page's guard.
- **The services check again.** The curation services call `assertCurator` and
  the people-page services `assertSiteAdmin`
  ([`db/site-admin-proof.md`](../db/site-admin-proof.md), "The Curator proof"),
  and GraphQL puts the `curator` scope on curation fields and keeps `admin` on
  the people ones ([`graphql/schema.md`](../graphql/schema.md), "Auth scopes").
- **A curator lands on `/curator` after signing in**, a keeper on `/keepers`
  (`postSignInLanding` in `src/lib/sign-in.ts`), and the site bar's Curator and Keepers
  links and the brand link follow the viewer's `canCurate`, true for either role.
- **Impersonation.** A curator can be impersonated like any non-keeper, because
  Better Auth's `adminRoles` stays `['admin']`; being a curator grants no
  impersonation of anyone.
- **Tests.** `tests/lib/request-session.test.ts` covers the curator, admin and
  user answers; `tests/app/(shell)/keepers/layout.test.tsx` the layout and index;
  `tests/modules/identity/services/curator-boundary.test.ts` that a curator is
  refused every people-page service; `tests/e2e/admin.spec.ts` the curator
  against the built server.
