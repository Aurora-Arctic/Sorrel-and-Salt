## Plugins (MB.74)

Two Better Auth plugins are registered: `lastLoginMethod` (below) everywhere,
and `admin`, narrowed to impersonation, outside production only
([`impersonation.md`](impersonation.md)). Every plugin
can mount routes under `/api/auth/*`, the one path outside `/api/graphql`,
and write through the adapter, outside `withAudit`, so each has to earn its
place. MB.74 weighed the whole roster against an OAuth-only, invite-gated site
([`design-decisions/mb.74-better-auth-plugins.md`](../design-decisions/mb.74-better-auth-plugins.md)).

| Plugin or option                                                                                                                                                                    | Status                       | Why                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Rate limiter, `storage: 'database'`                                                                                                                                                 | In use (MB.75, MB.76)        | One count across every instance, keyed on Vercel's own client-address header (["Rate limiting"](rate-limiting.md))                      |
| `account.encryptOAuthTokens`                                                                                                                                                        | In use (MB.76)               | Access and refresh tokens unreadable without the secret; older plaintext rows keep reading (["Config"](config.md))                      |
| `lastLoginMethod`, cookie only                                                                                                                                                      | In use (MB.77)               | The browser remembers its own last provider, so the sign-in page can point at it without the server revealing anything about an address |
| `oAuthProxy`, previews only                                                                                                                                                         | Scheduled (MB.78)            | Lets a hotfix preview finish a sign-in through staging's registered callback                                                            |
| `admin`, impersonation endpoints only                                                                                                                                               | In use (MB.53)               | Every other endpoint would grant admin or delete users outside `withAudit` (M2.9)                                                       |
| `createAccessControl`                                                                                                                                                               | In use (M6.3)                | A helper, not a plugin: workspace permission statements                                                                                 |
| Passkeys                                                                                                                                                                            | v2                           | The first-party credential DESIGN.md §13 names, in place of email and password                                                          |
| Magic link, email OTP                                                                                                                                                               | v2, after passkeys           | Sign-in for someone with none of the four providers                                                                                     |
| `@better-auth/stripe`                                                                                                                                                               | v2 (MB.79)                   | Subscription billing; DESIGN.md §13 sets it against what the owner wants to charge, and a test-mode spike decides                       |
| Two-factor, `captcha`, `haveIBeenPwned`                                                                                                                                             | Only with email and password | Each guards a password sign-in; two-factor never challenges an OAuth one                                                                |
| `organization`                                                                                                                                                                      | Never (MB.30)                | Unaudited writes, hard deletes, a plaintext invitation token, a session-held active workspace                                           |
| `jwt`                                                                                                                                                                               | Never                        | Issues a token beside the cookie for a service this app does not have; its cookie mode needs the cookie cache MB.59 keeps off           |
| `user.deleteUser`                                                                                                                                                                   | Never                        | A hard delete, which every audit foreign key to `users` refuses                                                                         |
| `bearer`, `oneTimeToken`, `deviceAuthorization`, `oauthPopup`, `multiSession`, `oneTap`, `username`, `anonymous`, `phoneNumber`, `siwe`, `genericOAuth`, `openAPI`, `customSession` | Never                        | Other clients, other sign-in schemes, or nothing this app reads                                                                         |

### The last-used provider (MB.77)

`lastLoginMethod` adds an after-hook and nothing else: no route, no write,
and no `users` column, since `storeInDatabase` is unset (pinned in
`tests/lib/auth.test.ts`). On any response that sets the session cookie it
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
