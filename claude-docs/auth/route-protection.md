## Route protection (M2.7)

Every page is protected unless it is named public, and two layers do the
protecting: a cheap one that owns the redirect, and a secure one that owns the
answer.

| Layer                               | Where                        | Checks                                           | On failure                                                                        |
| ----------------------------------- | ---------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------- |
| Proxy (optimistic)                  | `src/proxy.ts`               | A Better Auth session cookie is present          | 307 to `/sign-in?next=<path and query>`                                           |
| `requireSession()` (secure)         | `src/lib/request-session.ts` | Better Auth finds a live session in the database | The same redirect, from the page                                                  |
| Proxy, `/workshop/*` only           | `src/proxy.ts`               | The secure check, then `assertWorkshopAccess()`  | The redirect, or 403 for a non-admin                                              |
| `requireAdminSession()`, `/admin/*` | `src/lib/request-session.ts` | The secure check, then `assertSiteAdmin()`       | The redirect, or a 403 page for a non-admin (["The admin guard"](admin-guard.md)) |

- **Deny by default.** `PUBLIC_ROUTES` in `src/proxy.ts` is a plain list of
  the pages a signed-out visitor may reach — `/`, the general entry page
  (MB.57); `/sign-in`; `/invite/*`; and `/email/*`, the one prefix under
  `public/`, whose images and fonts a mail client fetches with no cookie
  (MB.66, [`email.md`](../email.md)). MB.83 adds `/compendium`, `/compendium/*`,
  `/robots.txt` and `/sitemap.xml`: the public compendium's two pages and the
  two files a crawler reads (MB.80). Everything else redirects, so a
  route added without anyone thinking about auth is protected, not open. An
  entry is an exact path, or a path ending `/*` for everything beneath it:
  `/` admits only `/`, `/sign-in` does not admit `/sign-in-help`, and
  `/invite/*` does not admit `/invites`. Adding a public page is adding a
  line there.
- **The matcher only keeps the proxy off what is never a page:** Next's own
  `/_next/*` assets and `/api/*`. Nothing in `public/` is exempt: a file placed
  there is a protected page to the matcher, redirected to `/sign-in` — HTML
  where the browser asked for an image — until the PR that adds it also adds
  its entry, and `tests/proxy.test.ts` pins that for `/favicon.ico` and
  `/robots.txt` — the latter until MB.83 lists it. MB.57 found this with the backdrop's images and answered it
  by importing them from their stylesheet instead, so they ship under
  `/_next/static/media` with a content hash. Any future exemption is a named
  prefix, never a file-extension pattern, for the same reason `PUBLIC_ROUTES`
  is a list: what is public is listed, never inferred. It must be a literal Next can read at
  build time, which is why the public list is not expressed in it — as a
  regex negative lookahead it was unreadable, and would have got worse with
  every route. The cost of the split is that the proxy also runs on the
  public pages, which is a cookie-free no-op there beyond forwarding the
  return path. `tests/proxy.test.ts` pins the matcher with Next's
  `unstable_doesMiddlewareMatch` (the installed 16.3 name for the docs'
  `unstable_doesProxyMatch`), and the public list through the proxy itself.
- **`/api/*` is public to the proxy, not to the data.** Better Auth's handshake
  has to be reachable signed out, and `/api/graphql` must refuse in its own
  error shape rather than answer a `fetch` with a redirect to an HTML page. The
  GraphQL context calls `getSession()` and the services refuse.
- **Why a proxy at all, when the page checks anyway.** A server component
  cannot read its own URL, so only the proxy knows the path to send the visitor
  back to. It also covers what a page check would not: a layout does not re-run
  on client-side navigation (Next's authentication guide, "Layouts and auth
  checks"), and a route that forgets to call `requireSession()` still
  redirects. It never touches the database — Next runs it on every page
  request, prefetches included — so its cost is a cookie read per navigation.
  **The one exception is `/workshop`** (M2.10): the staging component workshop
  is static files under `public/`, with no page to run the secure check, so
  the proxy runs it there itself — `sessionFromHeaders()`, imported only on
  that branch — and applies the admin-only service rule.
  [`workshop.md`](../workshop.md), "On staging", has the whole gate.
- **Why the page checks anyway.** A present cookie is not a valid one: expired,
  revoked, or forged all pass the proxy. `requireSession()` asks Better Auth,
  which verifies the cookie's HMAC and looks the session up. It redirects on
  failure with the path the proxy forwarded in the `x-sorrel-return-path`
  request header (`RETURN_PATH_HEADER`). The proxy sets that header on every
  request it passes, overwriting any value the client sent, and the read still
  goes through `safeReturnPath`. The proxy forwards it on public pages too, so
  `/invite/[token]` can send a signed-out visitor to `/sign-in` and back, since
  accepting requires a sign-in (MB.70). `/` is public but personalised (MB.57): it
  reads the session with `getSession()` to offer a signed-in visitor the landing
  rather than sign-in, and `requireSession()` would redirect the signed-out
  visitors it exists for. `requireSession()` has a second redirect (MB.54): a
  session whose address is unverified goes to
  `/account/email?next=<its own path>` from every page but that one, since a
  provisional account can do nothing else (["The email
  page"](admin-bootstrap.md#the-email-page-mb54)). `/account/email` is the first
  page to call it; every later protected route adopts it in its own PR.
- **The return path round trip.** The proxy builds `next` from the request's
  pathname and query, through `signInPath()` (`src/lib/sign-in.ts`), which
  runs `safeReturnPath` first — a request can really carry a pathname of
  `//evil.example`. `/sign-in` reads `next` back through the same guard and
  hands it to `SignInPanel` as Better Auth's `callbackURL`, and its
  `errorCallbackURL` is `signInPath(next)`, so a failed attempt keeps the
  destination too. One guard on the way out and on the way back is what makes
  the round trip lossless for a safe path and closed for an unsafe one. The
  guard has no fallback: a missing or unsafe `next` is no return path at all
  (`undefined`), because which landing then applies is the role's, and only
  the callback knows the role once any promotion has run.
- **With no return path, the landing is the role's** (MB.113). A verified
  admin lands on `/admin`, `ADMIN_LANDING`; everyone else on `/coven`,
  `POST_SIGN_IN_LANDING`, the post-sign-in landing M2.8 builds — not `/`:
  someone who has just signed in has been through the front door already
  ([`design-decisions/mb.57-post-sign-in-landing.md`](../design-decisions/mb.57-post-sign-in-landing.md)).
  `postSignInLanding(role)` (`src/lib/sign-in.ts`) is the one rule. A return
  path still wins, an explicit `/coven` included, so the sign-in says whether
  it asked for one rather than the callback guessing from the landing path:
  `socialSignInTarget(next)` gives `SignInPanel`'s `signIn.social` call, with
  no `next`, the flag `NO_RETURN_PATH` in Better Auth's `additionalData`, a
  `callbackURL` of `/coven` only because one is required, and a bare `/sign-in`
  as `errorCallbackURL`, so a failed attempt still asks for none. The
  callback's after-hook reads the flag back with `getOAuthState()` and, for a
  verified row, replaces the endpoint's redirect with the landing for the role
  held after `promotePrimaryAdmin` — so the primary admin promoted at this very
  sign-in lands on `/admin`. The flag is client-supplied, as every
  `additionalData` key is, and trusted accordingly: it chooses between two
  landings the account may open anyway, and `/admin`'s guard is the role.
  An unverified account goes to the email page first as ever, bare
  (`/account/email`) with no return path, and the sign-up mail's link lands
  bare on the confirmed view: its Continue takes the role's landing too, read
  when the page renders, after the link has promoted the primary admin (["The
  email page"](admin-bootstrap.md#the-email-page-mb54)). `/`'s Continue offers a signed-in visitor the same landing,
  so an admin's front door leads to `/admin` too
  ([`components/welcome.md`](../components/welcome.md)). The helpers are shared
  with the tests' OAuth harness, whose `signIn` with no destination is
  `SignInPanel`'s sign-in with none.
- **`getSession()` is `cache()`-wrapped**, so a layout and a page asking in the
  same render cost one lookup. It is `sessionFromHeaders(await headers())`;
  the proxy, which has the request but no `headers()`, calls
  `sessionFromHeaders(request.headers)` directly. It returns exactly `{ userId, role }`, the
  [service-level `Session`](service-session.md). It throws on a `role` outside the column's
  enum rather than reading it as `'user'`, because Better Auth types the
  additional field as a plain string and a wrong value there is a bug to
  surface, not a default to apply.

**Services receive the session; they never read it.** Every service takes a
`Session` as its first argument. The page calls `requireSession()` (or the
GraphQL context calls `getSession()`) and passes the result in. That is what
keeps a service callable from a test with `asUser(A)`, from a script, and from
both transports alike. `.oxlintrc.json`'s `src/modules/*/services/**` override makes it
an import error: a service may not import `next/headers`, `better-auth/cookies`,
`lib/auth` or `lib/request-session`. It may still `import type { Session }`
and better-auth's `createAccessControl`. The override restates the three
top-level bans because an override replaces the rule rather than merging
(`claude-docs/db/query-building.md`).
Lint carries it; each ban was proved by a probe in the PR that added it
(MB.224 retired the guard that re-ran the probes).
