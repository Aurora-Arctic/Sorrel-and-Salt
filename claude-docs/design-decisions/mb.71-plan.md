<!-- The approved plan for MB.71, stored beside the records it touches. The decision it rests on is mb.61-email-verification-and-delivery.md; this file is how the task was scoped and is not maintained after the PR lands. -->

# MB.71 — Link a second sign-in method from the account page

## Context

An admin who signed up through Discord clicks "Continue with Microsoft" and gets
`Sign-in didn't work. Please try again.` The row is verified (by Discord, or by
MB.66's mail), and the question was whether first-party verification now makes a
Microsoft sign-in linkable.

**It does not, and it cannot.** The refusal is Better Auth's implicit-link gate in
`oauth2/link-account.mjs` (`handleOAuthUserInfo`): a sign-in whose provider
account is unknown is linked to the row holding its email only if the _provider_
vouches for the address (or is in `trustedProviders`) and the _row_ is verified.
Verification fixes the second half; the first half is the one that refuses.
Microsoft is pinned `emailVerified: false` (`src/lib/auth.ts`) because with
`tenantId: 'common'` any Entra tenant can mint an id token carrying any `email`
(nOAuth, MB.60). Trusting Microsoft for implicit linking would let such a token
sign in as **any verified row**, the admin's included. The row being verified is
the wrong side of the equation: what is unproven is the Microsoft account's claim
on the address, and no amount of verifying the row changes that.

Today's redirect is `?error=account_not_linked`, which `src/lib/sign-in.ts` does
not map, hence the generic sentence. (Its `unable_to_link_account` sentence is
also wrong: that code means "provider did not vouch during a link", not "already
linked elsewhere".)

**What it takes: explicit linking from a signed-in session**, which Better Auth
already ships as `POST /link-social` (client: `authClient.linkSocial`). The admin,
signed in through Discord, adds Microsoft from an account page. That flow:

- starts under a session, and the OAuth state stores `link: { userId, email }`
  server-side (`api/routes/account.mjs`), not client-supplied;
- at the callback (`api/routes/callback.mjs`, `if (link)` branch) requires the
  provider to vouch **or** be trusted, then the email to match unless
  `allowDifferentEmails`, then creates the `accounts` row. It never writes
  `emailVerified`, issues no session (so MB.60's after-hook does not run), and
  does **not** check `requireLocalEmailVerified`, so it works for an unverified
  row too, which is the other reading of "without a verified email";
- after that, a Microsoft sign-in is resolved by `(providerId, accountId=oid)`
  through `findAccountOwnerByKey` before any email lookup. The `email` claim is
  never consulted again, so nOAuth cannot reach it. `promotePrimaryAdmin`
  answers `already-admin` before the provider check, so no warning is logged.

**The one hurdle**: the same `emailVerified: false` pin makes the link branch
answer `unable_to_link_account`. The fix is to make the pin flow-aware using
Better Auth's public `getOAuthState()` (`better-auth/api`, `api/state/oauth.mjs`),
which during a callback holds the parsed state. `link` is present only for a
flow `/link-social` began under a session. On sign-in and sign-up `link` is
undefined and Microsoft stays pinned unverified, so the takeover surface is
unchanged. In the link branch the profile's `emailVerified` feeds only Better
Auth's gate; the guards that matter there are the session that started the flow
and the account-id binding afterwards.

`trustedProviders` stays pinned off. `requireLocalEmailVerified` stays at its
default. `overrideUserInfoOnSignIn` and `updateUserInfoOnLink` stay off, so a
linked provider's profile never rewrites the row.

## Scope: one new task, `MB.71 — Link a second sign-in method from the account page`

Scheduled in Wave 6 after MB.54 (which creates the `/account/email` surface) and
after MB.67 (whose `account_not_linked` sentence this supersedes; see error
mapping below). Size ~3h with unlink. Story 1 ("sign in with any of the four providers") is the story it serves;
consider a §10 line if a story number is wanted.

### 1. `src/lib/auth.ts`: flow-aware pin for Microsoft and Facebook

Replace both `mapProfileToUser: () => ({ emailVerified: false })` with one shared
mapper:

```ts
import { getOAuthState } from 'better-auth/api';
// Vouched only inside a link flow /link-social began under a session: there the
// value feeds Better Auth's link gate alone, and the account is bound by its id
// afterwards. On a sign-in `link` is absent and the profile stays unverified.
const vouchOnlyWhenLinking = async () => ({
  emailVerified: (await getOAuthState())?.link !== undefined,
});
```

Add `account: { accountLinking: { allowDifferentEmails: true } }` (decided): the
Discord address and the Microsoft address are usually different mailboxes, and
the option is read only in the link branches, never on sign-in. Pin it by test
beside the options that stay off. The row's email is untouched by a link
(`updateUserInfoOnLink` off), so invitations and the email page keep keying on
the address the user verified.

In `validateUserInfo`, skip recording `signInProfile` when
`source.action === 'link-account'`: the after-hook never runs on a link, but the
promotion profile should not carry a Microsoft "verified" it did not earn.

### 2. Reading the linked providers

A `linkedProviders()` helper beside `getSession()` in
`src/lib/request-session.ts` wrapping `auth.api.listUserAccounts({ headers })`,
`cache()`-wrapped, returning `ProviderId[]`. MB.66's `sendVerificationEmail`
already reads the same list through the internal adapter; the two can share the
mapping.

### 3. The page: `/account` (`src/app/account/page.tsx`)

Protected by default (`src/proxy.ts` deny-by-default; `requireSession()`).
Renders a `SignInMethods` component (`src/components/SignInMethods/`, with
`index.scss`, `index.stories.tsx`, test at `tests/components/SignInMethods/`):
the four providers from `SOCIAL_PROVIDERS`, each "Linked" or an "Add" button.
"Add" calls `authClient.linkSocial({ provider, callbackURL: '/account',
errorCallbackURL: '/account?error=' })` from `src/lib/auth-client.ts` (export
`linkSocial` beside `signIn`). Unconfigured providers render greyed, reusing
`SignInPanel`'s `configured` prop pattern. Link errors are shown in a
`role="alert"` from a new `linkErrorMessage()` in `src/lib/sign-in.ts` covering
`account_already_linked_to_different_user`, `email_does_not_match`,
`unable_to_link_account`, `access_denied`. MB.54's `/account/email` links here
and back.

**Unlink is in scope.** Each linked provider gets a "Remove" button, rendered
only when two or more are linked, calling `authClient.unlinkAccount({
providerId })`. `allowUnlinkingAll` stays at its default `false`, pinned by
test, so Better Auth refuses to remove the last one
(`FAILED_TO_UNLINK_LAST_ACCOUNT`); the page also maps that refusal to a sentence
in case two tabs race. Removing a provider deletes the `accounts` row (Better
Auth's own table, not under rule 4) and leaves the user row untouched.
Size becomes ~3h.

### 4. Sign-in page error mapping (`src/lib/sign-in.ts`, `SignInPanel`)

- `account_not_linked` gets **one generic sentence, the same whatever the
  provider and whatever the real cause** (decided): "Sign-in didn't work. If you
  signed in before with a different provider, sign in that way, then add this
  one under Account." It neither confirms that an account holds the address nor
  distinguishes the squat case from the never-vouching-provider case; both share
  the code, and telling them apart would reveal which addresses are taken. No
  provider parameter is added to `errorCallbackURL`.
- This supersedes MB.67's planned mapping of `account_not_linked` to a squat
  sentence ("an unverified account holds the address and lapses within the
  hour"): MB.67's TASKS.md entry and the MB.61 record are corrected in the
  same pass so MB.67 does not add a second, more revealing sentence. If MB.67
  lands first, MB.71 replaces its sentence.
- Correct `unable_to_link_account`'s sentence (it means the provider did not
  vouch during a link, not "already linked to a different method").

### 5. Tests (TDD, `tests/`)

- `tests/lib/auth.test.ts`: the mapper answers `false` with no OAuth state and
  `true` with a `link` state (drive it through `auth.handler` rather than a
  mocked store where possible); `allowDifferentEmails` pinned as decided;
  `trustedProviders`/`requireLocalEmailVerified` pins unchanged.
- `tests/db/account-linking.test.ts`, on `tests/support/oauth.ts`: sign up
  through Discord; `POST /link-social` for Microsoft with that session, complete
  `/callback/microsoft` with a profile reporting `email_verified: false` → an
  `accounts` row on the same user; then a fresh `POST /sign-in/social` +
  callback for Microsoft signs into **that** user. The guard test: the same
  Microsoft callback with **no** link state (plain sign-in) over the Discord row
  still redirects `account_not_linked`, with the row asserted present and
  verified beforehand, so the refusal is the pin and not a missing fixture. A
  link started under user A cannot attach to user B (`link.userId` from the
  session). `/link-social` without a session is 401.
- `tests/lib/sign-in.test.ts`: `account_not_linked` maps to the one generic
  sentence; link-page codes map through `linkErrorMessage()`; unlink refusal
  sentence.
- Unlink: with Discord and Microsoft linked, `POST /unlink-account` for
  Microsoft removes the row and a Microsoft sign-in is refused again; with one
  provider linked it is refused with `FAILED_TO_UNLINK_LAST_ACCOUNT` and the
  row survives; a user cannot unlink another user's account (session-bound).
- Component test for `SignInMethods` (role/label queries); Playwright spec for
  `/account` with the axe scan.

### 6. Docs

- `claude-docs/auth.md`: a "Linking a second provider" subsection under
  first-party verification: the flow, why implicit linking from Microsoft is
  never enabled, why the link flow may skip the provider's vouch, and the
  `allowDifferentEmails` argument. Update the "three options stay off" list
  (still off) and the tests list.
- `claude-docs/design-decisions/mb.61-email-verification-and-delivery.md`:
  a short "Kept" bullet is now wrong-by-omission; add that a never-vouching
  provider is added by explicit link, not by sign-in.
- `claude-docs/TASKS.md`: MB.71 entry (story, argument, criteria), Wave 6 row
  and the minted-tasks paragraph; MB.67's `account_not_linked` sentence becomes the one generic
  sentence above. DESIGN.md §5 `users` paragraph: one clause on linking.
- Asana: MB.71 as a subtask of the Wave 6 card, id added to the card's notes.

## Verification

- `npm run test:coverage` green (unit + db), `npm run test:stories`,
  `npm run pre-commit`.
- Manual on `make docker-up`: sign in with Discord, open `/account`, add
  Microsoft, sign out, sign in with Microsoft → same account, `/admin` still
  admin. Then, signed out, "Continue with Microsoft" on a _second_ Microsoft
  account whose address equals the admin's → the one generic
  `account_not_linked` sentence, no new session.
