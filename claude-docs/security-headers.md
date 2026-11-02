# Security headers

What the browser is told about every page, set in `next.config.ts` through `src/lib/security-headers.ts`.

## What is sent

| Header                    | Value                             | On                                                  |
| ------------------------- | --------------------------------- | --------------------------------------------------- |
| `Content-Security-Policy` | The policy below                  | Every page; not `/api/*`, not the workshop          |
| `Referrer-Policy`         | `strict-origin-when-cross-origin` | The same paths                                      |
| `X-Content-Type-Options`  | `nosniff`                         | Every path, `/api/*` included, but not the workshop |

The workshop (`/workshop/*`, staging only) is left out of all three: it sets its own policy in `src/proxy.ts`, and a second `Content-Security-Policy` header would make the browser apply both. `/api/*` is left out of the policy because a policy on a JSON response protects nothing, and because in development Altair, the in-browser query tool, loads its assets from a CDN.

**HSTS** (`Strict-Transport-Security`, which tells the browser to use HTTPS only) is not set here. Checked on 2026-10-30: the production domain already answers with `strict-transport-security: max-age=63072000`, which Vercel adds. The header is ignored over plain http, so setting it again would add nothing.

## The policy

- `default-src 'self'`: anything not named below comes from the site itself.
- `script-src 'self' 'unsafe-inline'`: Next streams its page data in inline scripts, and the root layout's four pre-paint scripts (theme, Facebook hash, `data-js`, card density) are inline, so they run before first paint. `'unsafe-eval'` is added in development only, where React's debugging tools need it.
- `style-src 'self' 'unsafe-inline'`: React `style` attributes and Next's inline style blocks.
- `img-src 'self' data: blob:`: small build images are inlined as `data:` URIs.
- `font-src 'self'`: `next/font` serves both fonts from this site.
- `connect-src 'self'`: the site's own `/api/graphql` and `/api/auth/*`. Development adds `ws: wss:` for hot reload.
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`: no plugins, no re-pointed relative links, no forms sent to another site, and no framing by any site.

There is no nonce (a one-use random value that marks which inline scripts may run). A nonce needs every page rendered per request, which would end the cached public compendium, so the inline scripts are allowed as a group instead. Nothing here loads from another origin, so a script injected from elsewhere is still refused.

Zod, which the browser bundle uses, probes for `eval` with `new Function` and catches the failure; the policy would report that as a violation. `src/app/providers.tsx` sets Zod's `jitless` option in the browser to skip the probe.

## Adding a third-party source

Add the origin to the one directive that needs it in `contentSecurityPolicy` (`src/lib/security-headers.ts`): a script host to `script-src`, an API to `connect-src`, an image host to `img-src`. Name the host; never `*` or a bare scheme. Put a comment beside the new entry saying what loads from it. Then run `tests/e2e/security-headers.spec.ts` against a build: it fails on any console report of a blocked load.

## Tests

`tests/lib/security-headers.test.ts` checks which paths get which headers. `tests/e2e/security-headers.spec.ts` loads the home page, `/compendium` and a signed-in page in a browser and fails on any policy violation.
