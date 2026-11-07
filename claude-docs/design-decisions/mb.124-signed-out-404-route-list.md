# MB.124 — A signed-out visitor to an unknown address sees the 404

**Status:** decided and built · **Date:** 2026-11-07

## Context

The proxy sent every cookieless request for a non-public address to `/sign-in?next=`. A visitor who mistyped an address was asked to sign in, and was never told the page does not exist.

## Decision

The proxy redirects only an address that something answers. Anything else passes through to a 404.

- `scripts/page-routes.ts` walks `src/app` and writes `src/lib/page-routes.ts`: every page pattern (route groups and slots dropped, catch-all folders excluded) and every file in `public/`. `npm run generate:routes` runs it, and `prebuild` runs it too.
- `src/proxy.ts` matches the path against that list with `matchPattern` (the matcher moved out of `route-match.ts` so the proxy and the navigation skeletons share one). A match, a `public/` file, `/workshop/*` or a path containing `//` still redirects a signed-out visitor. `/coven/<slug>` matches `/coven/[slug]`, so it still redirects.
- A `(unmatched)/[...missing]` catch-all calls `notFound()`. Its layout picks the frame by session: the public frame when signed out, the shell when signed in. A catch-all is not in the generated list, or it would match everything.
- `tests/guards/page-routes.test.ts` fails when the committed list differs from `src/app`.

## Why a list rather than "redirect only if the session cookie is missing and the page exists"

The proxy runs before routing and cannot ask Next whether a page exists. A generated list is the sweep-task pattern: a mechanism plus a mechanical guard, so a new page cannot be forgotten.

## Public files stay protected

A bare "unknown address passes through" would have served any file dropped into `public/` to a signed-out visitor. Those files are listed so they keep the redirect.
