## Route protection

Every page is protected unless it is named public, and two layers do the
protecting: a cheap one that owns the redirect, and a secure one that owns the
answer.

| Layer                                                                | Where                        | Checks                                                                                  | On failure                                                                         |
| -------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Proxy (optimistic)                                                   | `src/proxy.ts`               | A Better Auth session cookie is present, on an address a page or `public/` file answers | 307 to `/sign-in?next=<path and query>`                                            |
| `requireSession()` (secure)                                          | `src/lib/request-session.ts` | Better Auth finds a live session in the database                                        | The same redirect, from the page                                                   |
| `requireSignedIn()`, the shell                                       | `src/lib/request-session.ts` | The secure check, without the email check                                               | The same redirect, from the shell layout                                           |
| Proxy, `/workshop/*` only                                            | `src/proxy.ts`               | The secure check, then `assertWorkshopAccess()`                                         | The redirect, or 403 for a non-keeper                                              |
| `requireCuratorSession()`, `/curator/*` pages and `/keepers/support` | `src/lib/request-session.ts` | The secure check, then `assertCurator()`                                                | The redirect, or a 403 page for a user (["The curator guard"](admin-guard.md))     |
| `requireAdminSession()`, `/keepers` people pages                     | `src/lib/request-session.ts` | The secure check, then `assertSiteAdmin()`                                              | The redirect, or a 403 page for a non-keeper (["The admin guard"](admin-guard.md)) |

- **An address nothing answers is a 404, not a sign-in.** The proxy redirects only an address that matches a page pattern or a `public/` file in `src/lib/page-routes.ts` (generated from `src/app` by `npm run generate:routes`, `scripts/page-routes.ts`; `tests/guards/page-routes.test.ts` fails when it is stale), plus `/workshop/*` and any path with `//`. Anything else passes to the `(unmatched)` catch-all, which draws the 404 in the public frame for a signed-out visitor and in the shell for a signed-in one ([`mb.124-signed-out-404-route-list.md`](../design-decisions/mb.124-signed-out-404-route-list.md)).
- **Deny by default.** `PUBLIC_ROUTES` in `src/lib/public-routes.ts` (which `src/proxy.ts` and Sign Out read) is a plain list of the
  pages a signed-out visitor may reach: `/`, the general entry page;
  `/sign-in`; `/forgot-password` and `/reset-password`, since a person who has
  forgotten their password has no session ([`passwords.md`](passwords.md));
  `/invite/*`; `/email/*`, the one prefix under `public/`, whose images and
  fonts a mail client fetches with no cookie ([`email.md`](../email.md));
  `/support`, which shows a signed-out visitor Sign In in place of the form and
  holds no data; `/compendium`, `/compendium/*`, `/robots.txt`, `/sitemap.xml`,
  `/llms.txt` and `/.well-known/*` (which covers `ai-catalog.json` and
  `ard.json`, [`../seo/ai-discovery.md`](../seo/ai-discovery.md)): the public
  compendium's pages and the files a crawler reads, with the manifest and the icon
  files (the icons listed ahead of their existence); and `/opengraph-image`, the site's share card that a
  link preview fetches with no cookie (the compendium's own cards sit under
  `/compendium/*`, [`../seo/share-card.md`](../seo/share-card.md)). The
  `(public)` route group holds these pages, and its layout draws the chrome
  without redirecting ([`app-shell.md`](../components/app-shell.md), "Why a
  route group"). An entry is an exact path, or a path ending `/*` for everything
  beneath it: `/` admits only `/`, `/sign-in` does not admit `/sign-in-help`,
  and `/invite/*` does not admit `/invites`. Adding a public page is adding a
  line there; everything else redirects, so a route added without anyone
  thinking about auth is protected, not open.
- **Search engines.** Off production (`VERCEL_ENV` not `production`) the proxy
  sets `X-Robots-Tag: noindex` on every response it handles, so a preview or the
  staging site is never indexed. On production it sets
  `X-Robots-Tag: noindex, follow` instead, and only for an address carrying one
  of the query parameters in `NOINDEX_PARAMS` (`entry`, `support`), which open a
  dialog over a page. A compendium pager page (`after`, `before`) is its own
  indexable page and gets no header.
- **The matcher** keeps the proxy off what is never a page ("The matcher",
  below). The cost of keeping the public list out of it is that the proxy also
  runs on the public pages, a cookie-free no-op there beyond forwarding the
  return path.
- **`/api/*` is public to the proxy, not to the data.** Better Auth's handshake
  has to be reachable signed out, and `/api/graphql` must refuse in its own
  error shape rather than answer a `fetch` with a redirect to an HTML page. The
  GraphQL context calls `getSession()` and the services refuse.
- **Why a proxy at all, when the page checks anyway.** A server component cannot
  read its own URL, so only the proxy knows the path to send the visitor back
  to. It also covers what a page check would not: a layout does not re-run on
  client-side navigation (Next's authentication guide, "Layouts and auth
  checks"), and a route that forgets to call `requireSession()` still
  redirects. It never touches the database, since Next runs it on every page
  request, prefetches included, so its cost is a cookie read per navigation.
  **The one exception is `/workshop`**: the staging component workshop is static
  files under `public/`, with no page to run the secure check, so the proxy runs
  it there itself (`sessionFromHeaders()`, imported only on that branch) and
  applies the admin-only service rule. [`workshop.md`](../workshop.md), "On
  staging", has the whole gate.
- **Why the page checks anyway.** A present cookie is not a valid one: expired,
  revoked, or forged all pass the proxy. `requireSession()` asks Better Auth,
  which verifies the cookie's HMAC and looks the session up. It redirects on
  failure with the path the proxy forwarded in the `x-sorrel-return-path`
  request header (`RETURN_PATH_HEADER`). The proxy sets that header on every
  request it passes, overwriting any value the client sent, and the read still
  goes through `safeReturnPath`. The proxy forwards it on public pages too, so
  `/invite/[token]` can send a signed-out visitor to `/sign-in` and back, since
  accepting requires a sign-in. `/` is public but personalised: it reads the
  session with `getSession()` to offer a signed-in visitor the landing rather
  than sign-in, and `requireSession()` would redirect the signed-out visitors it
  exists for. `requireSession()` has a second redirect: a session whose address
  is unverified goes to `/account/email?next=<its own path>` from every page but
  that one, since a provisional account can do nothing else
  (["The email page"](admin-bootstrap.md#the-email-page-mb54)). Every protected
  route adopts `requireSession()` in its own PR.

#### Where the email redirect is thrown

In the page, never in the shell layout, `src/app/(shell)/layout.tsx`. The shell
is drawn round the email page too, so the layout reads its viewer through
`viewerOf()`, which calls `requireSignedIn()`: `requireSession()`'s sign-in
redirect without the email check. When the shell layout threw the email
redirect, following a link into the shell from outside it (`/`'s Continue to
`/coven`, say) left the browser refetching the email page about every 80 ms,
without end. A full page load settled, because the server answers it with a 307
before anything is drawn. Thrown by the page instead, the redirect settles both
ways. A layout further down may still throw it: `/curator`'s and `/keepers`'s
do, through `requireCuratorSession()`, and the same link into either settles.
The difference we can see is that the email page sits beneath the shell layout
and not beneath theirs. `tests/e2e/account.spec.ts` follows both links. The cost
is that the shell layout no longer stops an unverified account on a full load,
so a page directly in the shell calls `requireSession()` itself; it must
anyway, since a layout does not re-run on client-side navigation.

- **The return path round trip.** The proxy builds `next` from the request's
  pathname and query, and the public frame's Sign In and an invitation's two choices build it from the page
  the visitor is on, in the link and in the sign-in dialog it opens alike
  ([`components/sign-in-dialog.md`](../components/sign-in-dialog.md)) (password, passkey and OAuth all end at `/sign-in` or
  the callback, which read it back; a new email account from an invitation loads the invitation itself), through `signInPath()` (`src/lib/sign-in.ts`), which runs
  `safeReturnPath` first, since a request can really carry a pathname of
  `//evil.example`. The guard refuses anything not starting with a single `/`,
  any backslash or line break, and the auth pages themselves. `/sign-in` reads `next` back through the same guard and
  hands it to `SignInPanel` as Better Auth's `callbackURL`, and its
  `errorCallbackURL` is `signInPath(next)`, so a failed attempt keeps the
  destination too. One guard on the way out and on the way back is what makes
  the round trip lossless for a safe path and closed for an unsafe one. The
  guard has no fallback: a missing or unsafe `next` is no return path at all
  (`undefined`), because which landing then applies is the role's, and only the
  callback knows the role once any promotion has run.
- **With no return path, the landing is the role's.** A verified admin lands on
  `/keepers` (`ADMIN_LANDING`), a curator on `/curator` (`CURATOR_LANDING`), and
  everyone else on `/coven` (`POST_SIGN_IN_LANDING`), not `/`: someone who has
  just signed in has been through the front door already
  ([`auth.md`, "Where the post-sign-in landing lives"](../design-decisions/auth.md#where-the-post-sign-in-landing-lives)).
  `postSignInLanding(role)` (`src/lib/sign-in.ts`) is the one rule. A return
  path still wins, an explicit `/coven` included, so the sign-in says whether it
  asked for one rather than the callback guessing from the landing path:
  `socialSignInTarget(next)` gives `SignInPanel`'s `signIn.social` call, with no
  `next`, the flag `NO_RETURN_PATH` in Better Auth's `additionalData`, a
  `callbackURL` of `/coven` only because one is required, and a bare `/sign-in`
  as `errorCallbackURL`, so a failed attempt still asks for none. The callback's
  after-hook reads the flag back with `getOAuthState()` and, for a verified row,
  replaces the endpoint's redirect with the landing for the role held after
  `promotePrimaryAdmin`, so the primary keeper promoted at this very sign-in
  lands on `/keepers` or `/curator`. The flag is client-supplied, as every
  `additionalData` key is, and trusted accordingly: it chooses between two
  landings the account may open anyway, and the area's guard is the role.
  - A non-keeper already in a coven is sent into its page directly
    (`signedInLanding` in `src/lib/landing.ts`, the first coven the switcher
    lists), not to `/coven`: `/coven` answers such a visitor with a redirect to
    that page, and the dev server compiles both routes on the way, which shows
    as a blank page. Someone in no coven still lands on `/coven`, and `/coven`
    itself still redirects a member who opens it (a bookmark, or leaving a
    coven). Every Continue (the front door's and the email form's) takes the
    same `signedInLanding`, and the shell's brand and Your Coven links go into
    the first coven directly for the same reason
    ([`app-shell.md`](../components/app-shell.md)).
  - An unverified account goes to the email page first, bare (`/account/email`)
    with no return path, and the sign-up mail's link lands bare on the confirmed
    view: its Continue takes the role's landing too, read when the page renders,
    after the link has promoted the primary keeper
    (["The email page"](admin-bootstrap.md#the-email-page-mb54)). `/`'s Continue
    offers a signed-in visitor the same landing, so a curator's or a keeper's
    front door leads to `/keepers` or `/curator`
    ([`components/welcome.md`](../components/welcome.md)). The helpers are shared
    with the tests' OAuth harness, whose `signIn` with no destination is
    `SignInPanel`'s sign-in with none.
- **A paused session is read once, in `sessionStateFromHeaders`**, which records
  a standing pause on the session state as `accessPause`. `requireSignedIn()`,
  and so every guard built on it, then redirects to `/access-paused` from every
  page but `/support` and `/account/support` and those beneath them
  (`isPausedViewPage` in `src/lib/access-paused.ts`). `getSession()` answers the
  session on those pages and on `/` and `/sign-in`, and `null` elsewhere;
  `sessionFromHeaders()` always answers `null`; `getShellSession()` answers the
  session with the pause, for the shell's viewer and its paused notice
  (`claude-docs/design-decisions/auth.md`, "What the site access pause closes, and what it decides along the way").
  `requireSession()` skips its terms redirect for a paused session, which cannot
  agree while paused.
- **`getSession()` is `cache()`-wrapped**, so a layout and a page asking in the
  same render cost one lookup. It is `sessionFromHeaders(await headers())`; the
  proxy, which has the request but no `headers()`, calls
  `sessionFromHeaders(request.headers)` directly. It returns exactly
  `{ userId, role }`, the [service-level `Session`](service-session.md). It
  throws on a `role` outside the column's enum rather than reading it as
  `'user'`, because Better Auth types the additional field as a plain string and
  a wrong value there is a bug to surface, not a default to apply.

**Services receive the session; they never read it.** Every service takes a
`Session` as its first argument. The page calls `requireSession()` (or the
GraphQL context calls `getSession()`) and passes the result in. That is what
keeps a service callable from a test with `asUser(A)`, from a script, and from
both transports alike. `.oxlintrc.json`'s `src/modules/*/services/**` override
makes it an import error: a service may not import `next/headers`,
`better-auth/cookies`, `lib/auth` or `lib/request-session`. It may still
`import type { Session }` and better-auth's `createAccessControl`. The override
restates the three top-level bans because an override replaces the rule rather
than merging (`claude-docs/db/repository-files.md`).

### The matcher

The proxy's matcher is everything except what is never a page: Next's own
assets (`/_next/*`); `/api/*`, which answers for itself (Better Auth's
handshake; GraphQL refusing in its own error shape rather than redirecting a
fetch); and the Workflow SDK's generated `/.well-known/workflow/` routes, which
take its queue calls and fail if the proxy runs first. Nothing else is exempt,
so a file dropped into `public/` is a protected page to this matcher (a redirect
to `/sign-in`, HTML where the browser asked for an image) until it gets its own
entry in `PUBLIC_ROUTES`; `tests/proxy.test.ts` pins that for a file with no
entry of its own, such as `/robots.txt.bak`. The backdrop's images are imported
by their stylesheet for that reason, so they ship under `/_next/static/media`
with a content hash. A future exemption is a named prefix, never a
file-extension pattern: what is public is listed, never inferred, as in
`PUBLIC_ROUTES`. The matcher must be a literal Next can read at build time,
which is why the public list is not expressed in it (as a regex negative
lookahead it was unreadable). `tests/proxy.test.ts` pins the matcher with Next's
`unstable_doesMiddlewareMatch` (the installed name for the docs'
`unstable_doesProxyMatch`), and the public list through the proxy itself.
