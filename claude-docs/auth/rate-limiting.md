## Rate limiting (MB.76)

Better Auth's limiter covers `/api/auth/*` and nothing else; GraphQL's
protections are graphql-armor's (M3.3). MB.74 chose it over leaving the
shipped defaults ([`design-decisions/mb.74-better-auth-plugins.md`](../design-decisions/mb.74-better-auth-plugins.md)).

- **On wherever `NODE_ENV` is `production`**, which is every deploy (staging and
  hotfix previews included) and every `next start`, Playwright's server
  among them. Off under `next dev`, which compose's `app` runs, and Vitest.
  That is Better Auth's own default, written out in `rateLimit.enabled` so a
  bump cannot move it.
- **The limits are Better Auth's built-in rules**, keyed on client address
  and path: `/sign-in/*` 3 requests per 10 seconds, `/send-verification-email`
  3 per 60 seconds, and every other path 100 per 10 seconds. Past one, the
  endpoint answers `429` with `X-Retry-After` in seconds and runs nothing.
- **Counted in `rate_limits`** (`storage: 'database'`, the table in
  ["Tables"](tables.md)). One row per `<address>|<path>` key, incremented
  atomically through the adapter, with expired rows pruned in the background. In
  memory, Better Auth's default, each Fluid Compute instance would keep its own
  count and a cold one would forget. The cost is a read and a write per
  `/api/auth/*` request.
- **The client address is `x-vercel-forwarded-for`**
  (`advanced.ipAddress.ipAddressHeaders`). Vercel sets it to the address the
  connection came from, overwriting whatever a client sent, and it is the one
  of Vercel's three copies (`x-forwarded-for`, `x-real-ip`) that a proxy placed
  in front of Vercel could not overwrite. No other header is read, so a
  client varying its own `x-forwarded-for` stays in its bucket.
- **An unresolved address shares one bucket.** Better Auth trusts a header
  only when it holds exactly one address. Otherwise, at production, the
  request is keyed `no-trusted-ip|<path>` and one warning is logged per
  instance; on `/sign-in/social` that bucket is three sign-ins per ten seconds
  for everyone in it. Under `next dev` and Vitest it falls back to `127.0.0.1`
  instead. Off Vercel the header is absent, so a local `next start` counts
  every request in the shared bucket, which with one client is the same thing.
- **What staging carries.** Vercel documents all three headers as the
  client's single public address (its "Request headers" reference).
  <!-- MB.76: replace with what staging's requests were observed to carry. -->

## Rules the first-party sign-in routes add (Wave 16)

Email and password, passkeys and two-factor add routes under `/api/auth/*`. The
limiter counts them the same way, per client address and path, and the rules
below come from Better Auth's own source (`dist/api/rate-limiter/index.mjs` and
`dist/plugins/two-factor/index.mjs`, 1.7.12) unless a task is named.

| Route                                                         | Limit              | Where the rule comes from                                                                         |
| ------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------- |
| `/sign-up/*`, `/change-password`, `/change-email`             | 3 per 10 seconds   | Better Auth's built-in rule, with `/sign-in/*`                                                    |
| `/request-password-reset`, `/forget-password*`                | 3 per 60 seconds   | Better Auth's built-in rule, with `/send-verification-email`                                      |
| `/reset-password` and `/reset-password/:token`                | 100 per 10 seconds | No special rule, so the every-other-path default; the token's 15-minute life (M16.3) is its guard |
| `/two-factor/*`                                               | 3 per 10 seconds   | The `twoFactor` plugin's own rule                                                                 |
| `/passkey/*`, which includes `/passkey/verify-authentication` | 3 per 10 seconds   | A `customRules` entry M16.7 adds, because the passkey plugin ships no rate rule                   |

The `/passkey/*` rule counts every passkey route, so it also limits listing,
renaming and removing passkeys on the account page, three a path per ten
seconds. Each path counts on its own, and a person renaming one passkey makes
one request, so the limit does not get in the way of the account page.

A plugin's rule replaces the built-in one for its paths, and an entry in
`rateLimit.customRules` replaces both. The `haveIBeenPwned` plugin has no rate
rule of its own and adds no route: it checks inside the routes above, with one
request to the Have I Been Pwned service per password set.

**The limiter slows an address; the lockout slows an account.** Guessing a
password from many addresses stays under the per-address count, so M16.5 counts
failed password sign-ins per account in `sign_in_failures`: every 5th failure
locks the password, for 1, 5 and 15 minutes and then 1 hour each time, the count
starts over after 24 hours with no failure, and nothing disables it for good
(DESIGN.md §8, "Passwords"; [`passwords.md`](passwords.md), "Lockout"). The `twoFactor` plugin also locks an
account after repeated wrong codes (10 failures for 900 seconds by default,
`accountLockout` in its options); whether M16.5's count or that one governs wrong
codes is M16.10's decision.
