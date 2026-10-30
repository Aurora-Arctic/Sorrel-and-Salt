## Plugins (MB.74)

Two Better Auth plugins are registered: `lastLoginMethod` (below) everywhere,
and `admin`, narrowed to impersonation, outside production only
([`impersonation.md`](impersonation.md)). Every plugin
can mount routes under `/api/auth/*`, the one path outside `/api/graphql`,
and write through the adapter, outside `withAudit`, so each has to earn its
place. MB.74 weighed the whole roster against an OAuth-only, invite-gated site
([`design-decisions/mb.74-better-auth-plugins.md`](../design-decisions/mb.74-better-auth-plugins.md)).
The owner then brought email and password, passkeys and two-factor into v1
(Wave 16; [`design-decisions/m16.1-first-party-sign-in.md`](../design-decisions/m16.1-first-party-sign-in.md)),
so the rows still marked Wave 16 are planned and not yet registered. `passkey`
is registered ("Passkeys", below).

| Plugin or option                                                                                                                                                                    | Status                  | Why                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rate limiter, `storage: 'database'`                                                                                                                                                 | In use (MB.75, MB.76)   | One count across every instance, keyed on Vercel's own client-address header (["Rate limiting"](rate-limiting.md))                                                                 |
| `account.encryptOAuthTokens`                                                                                                                                                        | In use (MB.76)          | Access and refresh tokens unreadable without the secret; older plaintext rows keep reading (["Config"](config.md))                                                                 |
| `lastLoginMethod`, cookie only                                                                                                                                                      | In use (MB.77)          | The browser remembers its own last provider, so the sign-in page can point at it without the server revealing anything about an address                                            |
| `oAuthProxy`, previews only                                                                                                                                                         | Post-launch (MB.78)     | Lets a hotfix preview finish a sign-in through staging's registered callback                                                                                                       |
| `admin`, impersonation endpoints only                                                                                                                                               | In use (MB.53)          | Every other endpoint would grant admin or delete users outside `withAudit` (M2.9)                                                                                                  |
| `createAccessControl`                                                                                                                                                               | In use (M6.3)           | A helper, not a plugin: workspace permission statements                                                                                                                            |
| `emailAndPassword`                                                                                                                                                                  | Wave 16 (M16.2, M16.3)  | Sign-in and sign-up by address and password, reset and change; `minPasswordLength` 15, `maxPasswordLength` 128, `requireEmailVerification` true. Policy: DESIGN.md §8, "Passwords" |
| `haveIBeenPwned()`                                                                                                                                                                  | Wave 16 (M16.2)         | Refuses a breached password at sign-up, reset and change by sending only a five-character hash prefix to Have I Been Pwned; refuses while that service is unreachable              |
| `passkey`, from `@better-auth/passkey`                                                                                                                                              | In use (M16.6, M16.7)   | The first-party credential with no password. Its peer range for `better-auth` and `@better-auth/core` is met by the installed core; a `passkey` table; ships no rate rule          |
| `twoFactor`                                                                                                                                                                         | Wave 16 (M16.9, M16.10) | An authenticator-app step for password sign-ins, offered not required; never challenges a provider or passkey sign-in. A `two_factors` table and `users.two_factor_enabled`        |
| Magic link, email OTP                                                                                                                                                               | v2                      | Sign-in for someone with none of the four providers                                                                                                                                |
| `@better-auth/stripe`                                                                                                                                                               | v2 (MB.79)              | Subscription billing; DESIGN.md §13 sets it against what the owner wants to charge, and a test-mode spike decides                                                                  |
| `captcha`                                                                                                                                                                           | Not scheduled           | No Wave 16 task registers it; a CAPTCHA guards a password form, and the rate limiter ("Rate limiting") and the per-account lockout (M16.5) are what guard it here                  |
| `organization`                                                                                                                                                                      | Never (MB.30)           | Unaudited writes, hard deletes, a plaintext invitation token, a session-held active workspace                                                                                      |
| `jwt`                                                                                                                                                                               | Never                   | Issues a token beside the cookie for a service this app does not have; its cookie mode needs the cookie cache MB.59 keeps off                                                      |
| `user.deleteUser`                                                                                                                                                                   | Never                   | A hard delete, which every audit foreign key to `users` refuses                                                                                                                    |
| `bearer`, `oneTimeToken`, `deviceAuthorization`, `oauthPopup`, `multiSession`, `oneTap`, `username`, `anonymous`, `phoneNumber`, `siwe`, `genericOAuth`, `openAPI`, `customSession` | Never                   | Other clients, other sign-in schemes, or nothing this app reads                                                                                                                    |

### The last-used provider (MB.77)

`lastLoginMethod` adds an after-hook and nothing else: no route, no write,
and no `users` column, since `storeInDatabase` is unset
(`tests/lib/auth.test.ts` asserts the column absent;
`tests/db/last-login-method.test.ts` proves the cookie). On any response that sets the session cookie it
also sets `better-auth.last_used_login_method` to the provider id, readable
by the page (not `HttpOnly`), for thirty days, with the session cookie's other
attributes. So a sign-in callback marks its provider, including an unverified
one that our after-hook redirects to the email page: Better Auth runs a
plugin's after-hooks after ours, even when ours throws the redirect, and the
session cookie is already set by then. `/sign-in/social`, a callback refused
with `account_not_linked`, and a link callback set no session, so they mark
nothing. A link keeps the mark on the provider the browser signed in with.

The cookie name is `LAST_USED_PROVIDER_COOKIE` (`src/lib/sign-in.ts`), passed
to the server plugin and to `lastLoginMethodClient` in `src/lib/auth-client.ts`,
because the two must agree. `SignInPanel` reads it through the client plugin
(`components/sign-in-panel.md`, "Last used"). The server never reads it, and
never names a provider for an address: that would tell a visitor the address
has an account. The page can name one because the browser already knows it.

### Passkeys (M16.7)

`passkey` from `@better-auth/passkey` is registered in `src/lib/auth.ts` with
`rpName: 'Sorrel & Salt'` and a `schema` option that maps its `credentialID`
field to the `passkeys` table's `credentialId` column (["Tables"](tables.md)).
The client half is `passkeyClient()` in `src/lib/auth-client.ts`, which adds
`signIn.passkey` and the `passkey` actions.

- **The relying party is the host.** No `rpID` is set, so the plugin takes
  the hostname of the request's base URL. In production the base URL is
  resolved per request across `sorrelandsalt.com`, `staging.sorrelandsalt.com`
  and `hotfix-*.sorrelandsalt.com`, so a passkey made on one is bound to that
  host: production's rpID is `sorrelandsalt.com`, staging's is
  `staging.sorrelandsalt.com`. A passkey made on production is refused on
  staging, because the authenticator signs over production's rpID and staging
  expects its own (`tests/db/passkey-hosts.test.ts`).
  The plugin reads the base URL only when it is a string, and the app's
  is the `allowedHosts` object; it still gets the host because Better Auth
  hands every endpoint a per-request copy of its options whose `baseURL` is
  the resolved origin (`resolveRequestContext` in
  `better-auth/dist/context/helpers.mjs`). The `rpID` option is one fixed
  value for every host, so setting it would break staging or production.
- **A ceremony is verified only from a page on the host it is posted to.**
  WebAuthn lets a page on a subdomain ask for its parent domain's passkey, and
  the plugin accepts any trusted origin, which includes every hotfix host.
  A `hooks.before` check in `src/lib/auth.ts` (`pinPasskeyOrigin`) refuses
  `/passkey/verify-authentication` and `/passkey/verify-registration` with
  `PASSKEY_ORIGIN_MISMATCH` unless the request's `Origin` header is the base
  URL's own origin. Without it, a page on a hotfix host could post a
  production passkey's assertion to production and sign in there.
- **A passkey finds its own account.** The plugin looks the stored row up by
  the credential id the browser sends and verifies the signature with that
  row's public key, so one account's passkey cannot sign in another, and a
  removed passkey has no row and is refused with 401
  (`tests/db/passkey-sign-in.test.ts`).
- **It signs in and earns nothing else.** A passkey sign-in makes a session
  like any other, and `lastLoginMethod` marks it `passkey`. It does not set
  `canCreateWorkspace`, change the role or add a seat, and it cannot create
  an account: a passkey is added only by an account that is already signed
  in.
- **Rate limit.** The plugin ships no rate rule, so `rateLimit.customRules`
  sets `/passkey/*` to three per ten seconds (["Rate limiting"](rate-limiting.md)).

The sign-in page's button and autofill are described in
[`components/sign-in-panel.md`](../components/sign-in-panel.md), "Passkey".
