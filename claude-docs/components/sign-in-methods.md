# SignInMethods

`src/components/SignInMethods/` — the `/account` page's list of the ways into
the account: every roster provider, linked or addable, and removable while
another one is left. Server component `src/app/account/page.tsx` reads the
session, `linkedAccounts()` and `?error=`, and hands the results down as props.
This component renders the list and makes the two Better Auth calls. Why a
second provider is added this way and never at sign-in is
[`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "Linking a second
provider".

## The props contract

| Prop         | Meaning                                                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `linked`     | The signed-in user's provider accounts as `{ id, providerId }`: `id` is the `accounts` row's own id, which `/unlink-account` takes. `LinkedAccount` lives in `src/lib/types.ts`, which is client-safe. |
| `configured` | Providers this environment has credentials for, from `configuredProviders()`. The rest cannot be added.                                                                                                |
| `error`      | A readable sentence for a failed link, from `linkErrorMessage()` (`src/lib/sign-in.ts`), never a raw `?error=` code. Shown as an alert on mount.                                                       |

## Adding one leaves the page

"Add &lt;Provider&gt;" calls `linkSocial` from `src/lib/auth-client.ts` with
`ACCOUNT_PATH` (`/account`) as both `callbackURL` and `errorCallbackURL`. Better
Auth's client then assigns `window.location.href` to the provider, and the
callback lands back here, with `?error=` when it failed. A failure before any
redirect, such as a network error or an unregistered provider, shows
`GENERIC_LINK_ERROR`.

An unconfigured provider's Add is `aria-disabled` with a "Not available right
now." note it describes, and starts nothing. It is not `disabled`, so it
stays in the tab order, as on `/sign-in`. A provider that is linked but no
longer configured still has its Remove: removal
needs no credentials.

## A linked row carries no status text

A linked provider is the row without an Add: it shows its Remove while
another is left, and nothing at all when it is the only one. The rows carry
no `_typography.scss` bullet, since they are controls rather than prose.

## Removing one answers in place

"Remove &lt;Provider&gt;" is rendered only while two or more are linked.
Better Auth refuses the last one anyway (`allowUnlinkingAll` is pinned off), so
the rule only keeps the page honest. It calls `unlinkAccount({ accountId })`.
On success the row leaves the component's own copy of the list, an `<output>`
says "&lt;Provider&gt; was removed.", and the provider's Add returns. There is
no reload, so a list changed in another tab shows only after one. On a refusal
the error's `code` goes through `unlinkErrorMessage()`:
`FAILED_TO_UNLINK_LAST_ACCOUNT` (two tabs racing), `SESSION_NOT_FRESH` (the
session is older than a day: sign in again), or the generic sentence. While a
removal is in flight every Remove is `disabled`, so two cannot race to leave
none. `.btn` greys out under `disabled` as under `aria-disabled`, so the
component adds no styling of its own for it.

The alert and the removal message replace each other, and both clear when a
new action starts. Neither element exists in the DOM without a message.

## No provider marks

The list names providers in text only. SignInPanel's brand marks need its
own stylesheet (Facebook's "f" is a hole in a white shape, shown through a
chip that stylesheet colours), and brand-coloured rows would be styling beyond
the tokens. `index.scss` also carries `.account-page`, the page frame, since no
AppShell exists yet.

## Tests

- `tests/components/SignInMethods/index.test.tsx`: role and label queries
  only, with `@/lib/auth-client` mocked as in SignInPanel's test. It covers
  the four rows, no status text and Add on the unlinked ones, the link call's arguments, the generic link
  failure, an unconfigured Add, no Remove with one linked, removal by row id
  and its message, the survivor losing its Remove, and a mapped and an
  unmapped refusal.
- `tests/e2e/account.spec.ts`: `/account` signed in through
  `tests/e2e/session.ts`, axe-scanned with one provider and with two plus a
  callback error.
- The link and unlink flows themselves are asserted against Better Auth's
  endpoints in `tests/db/account-linking.test.ts`.
