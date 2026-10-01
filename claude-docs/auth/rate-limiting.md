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
