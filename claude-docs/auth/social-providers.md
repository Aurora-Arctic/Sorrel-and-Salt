## Social providers (M2.4/M2.5, M2.6)

The roster is `SOCIAL_PROVIDERS` in `src/lib/social-providers.ts`: Discord,
Google, Facebook and Microsoft, re-scoped at M2.6 (GitHub was the original
second provider and was dropped). `socialProviders()` in `src/lib/auth.ts`
registers a provider only when **both** halves of its pair are set as non-empty
strings (`clientCredentials`, `src/lib/social-providers-config.ts`), never with
an empty string, which Better Auth would treat as a configured but broken
provider rather than an absent one. The sign-in page greys out a provider that
is not configured. Facebook and Microsoft are pinned unverified on arrival (see
["First-party verification"](admin-bootstrap.md#first-party-verification-mb66)),
and Microsoft's tenant is stated as `common` so personal accounts can sign in.
Every provider's `mapProfileToUser` also stands in a placeholder for a profile
with no address (see ["The email
page"](admin-bootstrap.md#the-email-page-mb54)). MB.12 completed a real browser
sign-in with all four on staging; the credentials and the manual steps behind
them are `claude-docs/secrets.md`.

Facebook appends `#_=_` to the redirect URI it sends the browser back to, and
a fragment survives every redirect whose `Location` carries none, so it would
reach whatever page the sign-in lands on. The server never sees a fragment,
so the root layout strips exactly that one before first paint, in an inline
script beside the theme one (`src/app/pre-paint-scripts.tsx`); an in-page
anchor keeps its own.

`/api/auth/ok` (Better Auth's built-in health endpoint, no database access)
is what `route.test.ts`'s other case uses to confirm the route is mounted
and responding independent of any provider being configured at all.
