# Auth — summary

**Better Auth**, running in-process as Next.js Route Handlers, with its own
tables reached through the Drizzle adapter (M2.2). No extra service, no
extra deploy, no extra cost — see DESIGN.md §8.

**Every section is a file under `auth/`**, moved there whole. This page keeps
each `## ` and `### ` heading with a link to where it lives; a citation in code
names that file, not this page.

## The one exception to the GraphQL-only rule, and its boundary

`/api/auth/*` is the one exception to the GraphQL-only rule, carrying only the OAuth handshake and the session it yields, and `src/app/api/auth/[...all]/route.ts` hands every request to Better Auth while importing no service or GraphQL code. [`auth/graphql-only-exception.md`](auth/graphql-only-exception.md)

## Tables (M2.2/M2.3)

Better Auth's adapter tables — `users` with the app's `role`, `canCreateWorkspace` and `...auditColumns`, `sessions`, `accounts`, `verifications` and `rate_limits` — keyed by `uuid`, migrated by `drizzle-kit`, and hand-maintained because `@better-auth/cli` emits another major's schema. [`auth/tables.md`](auth/tables.md)

## Config (`src/lib/auth.ts`)

`BETTER_AUTH_SECRET` and `ADMIN_BOOTSTRAP_EMAIL` are required only in production, `baseURL()` picks the origin per request from `allowedHosts` there and is `http://localhost:8000` elsewhere, stored OAuth tokens are encrypted, and session lifetimes are Better Auth's defaults, pinned by test. [`auth/config.md`](auth/config.md)

## Rate limiting (MB.76)

Better Auth's built-in limits cover `/api/auth/*` in production, counted in the `rate_limits` table so every instance shares one count and keyed on `x-vercel-forwarded-for` and the path, with an unresolved address falling into one shared `no-trusted-ip` bucket. [`auth/rate-limiting.md`](auth/rate-limiting.md)

## Social providers (M2.4/M2.5, M2.6)

`SOCIAL_PROVIDERS` lists Discord, Google, Facebook and Microsoft, each registered only when both halves of its credential pair are set, with Facebook and Microsoft arriving unverified, Microsoft's tenant `common`, and Facebook's `#_=_` fragment stripped before first paint. [`auth/social-providers.md`](auth/social-providers.md)

## Admin bootstrap and the self-created user (M2.3, MB.60)

`ADMIN_BOOTSTRAP_EMAIL`'s account is promoted at a Google or Discord sign-in or a session-bound mail verification, a second provider links only from a session, a provisional account lapses within three hours, an address changes only at verification, and sign-up stamps an account as its own creator. [`auth/admin-bootstrap.md`](auth/admin-bootstrap.md)

### Promotion at sign-in, from Google or Discord only (MB.60)

In [`auth/admin-bootstrap.md`](auth/admin-bootstrap.md#promotion-at-sign-in-from-google-or-discord-only-mb60).

### Promotion at first-party verification (MB.68)

In [`auth/admin-bootstrap.md`](auth/admin-bootstrap.md#promotion-at-first-party-verification-mb68).

### First-party verification (MB.66)

In [`auth/admin-bootstrap.md`](auth/admin-bootstrap.md#first-party-verification-mb66).

### Linking a second provider (MB.71)

In [`auth/admin-bootstrap.md`](auth/admin-bootstrap.md#linking-a-second-provider-mb71).

### Provisional accounts (MB.67)

In [`auth/admin-bootstrap.md`](auth/admin-bootstrap.md#provisional-accounts-mb67).

### The email page (MB.54)

In [`auth/admin-bootstrap.md`](auth/admin-bootstrap.md#the-email-page-mb54).

### Granting a second admin — decided, not built (M2.9)

In [`auth/admin-bootstrap.md`](auth/admin-bootstrap.md#granting-a-second-admin--decided-not-built-m29).

### The self-created user

In [`auth/admin-bootstrap.md`](auth/admin-bootstrap.md#the-self-created-user).

## The service-level session, and the three errors (M1.26, MB.43)

A service takes `src/lib/session.ts`'s `Session`, an `AuditSession` plus `role` rather than Better Auth's `sessions` row, and ends a call it cannot perform by throwing `Forbidden`, `NotFound` or `ValidationError`, none of which carries a status code. [`auth/service-session.md`](auth/service-session.md)

## Route protection (M2.7)

Every page is protected unless `src/proxy.ts`'s `PUBLIC_ROUTES` lists it: the proxy redirects a cookieless visitor to `/sign-in?next=`, `requireSession()` verifies the session in the database and sends an unverified account to `/account/email`, and with no return path the landing is the role's. [`auth/route-protection.md`](auth/route-protection.md)

## The admin guard (M5.4)

`requireAdminSession()`, called by the `/admin` layout and every page under it, is `requireSession()` then `assertSiteAdmin()`, so a signed-out visitor goes to sign-in and a non-admin gets a styled 403 through Next's `forbidden()`, not a 404. [`auth/admin-guard.md`](auth/admin-guard.md)

## The user list (MB.52)

`/admin/users` lists every live account, with its providers and whether its address is verified, through `listUsers` and `providersOf`, which refuse anyone but a site admin by direct call, paged by the M3.6 helper and filtered in SQL; it confers no workspace access. [`auth/admin-users.md`](auth/admin-users.md)

### Approving workspace creation (M5.8)

In [`auth/admin-users.md`](auth/admin-users.md#approving-workspace-creation-m58).

### Granting and revoking admin (MB.59)

An admin grants or revokes admin from a user's row through `setUserRole`, declared `{ via: 'admin', note }` so the trigger on `users` records it; a grant sets `canCreateWorkspace` too, the primary admin named by `ADMIN_BOOTSTRAP_EMAIL` can never be revoked, a count under a `for update` lock refuses leaving no admin, and a revoke takes effect on the next request because the session cookie cache is off. Changing the primary admin is the variable and a redeploy, then the new address's qualifying sign-in or verification; any future user-deletion path must refuse the primary admin. In [`auth/admin-users.md`](auth/admin-users.md#granting-and-revoking-admin-mb59).

## Plugins (MB.74)

`lastLoginMethod` is registered everywhere, its cookie marking the browser's last provider with no database write, and `admin` outside production for impersonation alone; a table rules on every other plugin and option, with `oAuthProxy` scheduled and `organization` never. [`auth/plugins.md`](auth/plugins.md)

### The last-used provider (MB.77)

In [`auth/plugins.md`](auth/plugins.md#the-last-used-provider-mb77).

## Impersonation (MB.53)

An admin signs in as a non-admin user wherever `ENABLE_IMPERSONATION` is set and `VERCEL_ENV` is not `production`, through the `admin` plugin narrowed to its two impersonation endpoints. Writes stamp the user, `app.impersonated_by` names the admin, and a banner on every page carries Stop. [`auth/impersonation.md`](auth/impersonation.md)

### The gate: `VERCEL_ENV`, and both conditions

In [`auth/impersonation.md`](auth/impersonation.md#the-gate-vercel_env-and-both-conditions).

### Only the two impersonation endpoints are mounted

In [`auth/impersonation.md`](auth/impersonation.md#only-the-two-impersonation-endpoints-are-mounted).

### Who may impersonate whom

In [`auth/impersonation.md`](auth/impersonation.md#who-may-impersonate-whom).

### The audit follows the impersonated user

In [`auth/impersonation.md`](auth/impersonation.md#the-audit-follows-the-impersonated-user).

### Not a third access path

In [`auth/impersonation.md`](auth/impersonation.md#not-a-third-access-path).

### The way out: a banner on every page

In [`auth/impersonation.md`](auth/impersonation.md#the-way-out-a-banner-on-every-page).

### Tests

In [`auth/impersonation.md`](auth/impersonation.md#tests).

## The organization plugin is not used (MB.30)

Workspaces, membership and invitations are hand-built tables behind services, not Better Auth's organization plugin, whose unaudited writes, hard deletes, plaintext invitation token, session-held active workspace and ~20 `/api/auth/organization/*` routes make the mismatch structural. [`auth/no-organization-plugin.md`](auth/no-organization-plugin.md)

## Deploying to staging/production

Every variable auth needs, and the manual steps to set each, is in `secrets.md`; `ADMIN_BOOTSTRAP_EMAIL` is set in Preview and Production, and a deploy without it fails its build at `deploy.yml`'s pulled-environment assertion. [`auth/deploying.md`](auth/deploying.md)

## Tests

`route.test.ts` checks the mount against `/api/auth/ok`, `tests/lib/auth.test.ts` pins the config, database tests drive sign-in, promotion, verification, linking and rate limiting through `auth.handler`, and `tests/proxy.test.ts` and the e2e specs cover route protection. [`auth/tests.md`](auth/tests.md)
