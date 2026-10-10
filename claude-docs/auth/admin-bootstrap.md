## Admin bootstrap and the self-created user (M2.3, MB.60)

DESIGN.md §5: the account matching `ADMIN_BOOTSTRAP_EMAIL`
(`claude-docs/secrets.md`) is the **primary admin**. Everyone else gets the
column defaults (`role: 'user'`, `canCreateWorkspace: false`) on sign-up.
This file is the shape; the argument is
[`design-decisions/m2.9-granting-admin.md`](../design-decisions/m2.9-granting-admin.md)
for the admin and
[`design-decisions/mb.61-email-verification-and-delivery.md`](../design-decisions/mb.61-email-verification-and-delivery.md)
for verification.

### Promotion at sign-in, from Google or Discord only (MB.60)

The primary admin is promoted at a **sign-in**, not when the account is
created, and only when that sign-in's provider vouches for the address
([`m2.9-granting-admin.md`](../design-decisions/m2.9-granting-admin.md),
"The primary admin"):

- **Google and Discord qualify; Microsoft and Facebook never do**, since
  only those two verify an address in a way that can be trusted
  (`VOUCHING_PROVIDERS`). Facebook never reports verified in Better Auth's
  mapping, and Microsoft's `tenantId: 'common'` lets any Entra tenant mint
  the claim (nOAuth). An owner who signs in only through those two is
  promoted by verifying the address by mail instead ("Promotion at
  first-party verification" below).
- **The decision reads the provider's fresh profile at that callback**,
  never the stored `users.emailVerified`, so nothing that later sets the
  column widens who qualifies: a row our own mail verified still promotes
  nobody at a Microsoft sign-in. The profile must also carry the account's
  own address: a linked Google account whose address has since moved
  vouches for the new one, not this one.
- **Match is case-insensitive**, and at most one live row can match:
  `users_email_lower_case` (migration 0019) holds every address to lower
  case, since the unique index is on the raw column. Better Auth lowercases
  on every write; the constraint is for a row written by hand.
- **An already-admin user is not rewritten**, and an address the variable
  does not name is never promoted. With the variable unset (`next dev`,
  Vitest), nobody is; a deployed build refuses to start without it
  ([`config.md`](config.md)).
- **A refused match signs in as an ordinary user.** The reason goes to the
  server log as `primary admin not promoted: user <id> (<reason>)`, by id
  and never on screen, so nothing a visitor sees marks the address as
  special.

**How it is wired** (`src/lib/auth.ts`, `src/modules/identity/services/admin-role.ts`):

- The after-callback hook (`hooks.after`, matching `/callback/:id`) has
  `ctx.context.newSession.user` loaded, so it costs no query, but that is
  the **stored** row. Only `user.validateUserInfo` sees the fresh profile,
  on sign-up, link and sign-in alike.
- `validateUserInfo` never refuses. It records the profile's
  `{ providerId, email, emailVerified }` in a Better Auth request state
  (`defineRequestState` from `@better-auth/core/context`), an
  `AsyncLocalStorage` store scoped to one request, so nothing carries
  between sign-ins, and the after hook reads it back. `@better-auth/core`
  is a declared dependency at `better-auth`'s own version, so npm dedupes
  the two to one copy.
- The hook builds an ordinary `Session` from the row it holds and calls
  `promotePrimaryAdmin`, which writes `role: 'admin'` and the creation flag
  through `withAudit` with `write.updateById(users, …)`, stamped as the user
  and declared `{ via: 'bootstrap' }`. By the callback the user is
  authenticated, so this is no identity bootstrap (CLAUDE.md rule 3). The
  trigger on `users` records both grants in `user_privilege_changes`, by that
  route and stamped as the user; the promotion writes no ledger row itself
  (MB.195; [`db/write-path.md`](../db/write-path.md)). MB.59's grant and
  revoke make the same kind of write, declared `admin`.
- **Changing the variable** and redeploying promotes the new address at
  its next qualifying sign-in or verification, even if that account
  already exists. The previous primary admin keeps `role: 'admin'` and
  simply stops being protected (MB.59). It is also how to recover from a
  primary admin who has lost their OAuth account.

### Promotion at first-party verification (MB.68)

The second way to become the primary admin: **follow the verification link
our own mail sent to the bootstrap address, from a browser signed in to that
account.** Our mail vouches for the address as Google or Discord would, so a
Microsoft- or Facebook-only owner is promoted too.

- **It is safe only because verification is session-bound** ("First-party
  verification" below): the promotion runs only for someone signed in to
  the row who received the mail at the address, never for a stranger's
  sign-up that carries it.
- **`afterEmailVerification` promotes only the row a gate admitted.** It
  requires the per-request acting-user id, which `beforeEmailVerification`
  sets, or `gateEmailChange` for a change link, which Better Auth calls the
  hook on without `beforeEmailVerification` ("The email page" below). So a
  change to the bootstrap address, verified from the owner's session,
  promotes too.
- **It calls `promotePrimaryAdminAtVerification`**, which checks only the
  address and the current role, then makes the sign-in promotion's
  `withAudit` write, stamped as the user: the verification is the vouch,
  so there is no profile to check. A second use of a link finds the row
  verified and calls no hook, so a row already verified at the bootstrap
  address is promoted at a Google or Discord sign-in, or not at all.
- **The ledger records it** as the sign-in promotion's is: the trigger on
  `users` writes both grants by the `bootstrap` route, stamped as the user
  (MB.195).

**Three Better Auth options stay off, pinned by `tests/lib/auth.test.ts`**,
since each would let the address on an account change and carry the
primary admin's protection to whoever holds it then:

- `user.changeEmail.enabled`, set `false` explicitly: an email changes
  through the email page instead.
- `overrideUserInfoOnSignIn` on every provider: on, a sign-in rewrites the
  stored email from the provider's profile.
- `account.accountLinking.trustedProviders`: a trusted provider skips the
  verified-email check when linking.

Two linking options are pinned beside them (MB.71):
`accountLinking.allowDifferentEmails` on and `allowUnlinkingAll` off.
Neither is read at sign-in; "Linking a second provider" below has why.

**A squat lasts three hours at most.** An unverified sign-up carrying the
bootstrap address makes Better Auth refuse to link the owner's verified
sign-in to it (`requireLocalEmailVerified`) until the row lapses, and the
owner's next sign-in then lands in a fresh account ("Provisional accounts"
below).

### First-party verification (MB.66)

The site vouches for an address itself by mailing a link, so
`users.emailVerified` means one thing: **Google, Discord or our own mail
said so.** The argument is
[`design-decisions/mb.61-email-verification-and-delivery.md`](../design-decisions/mb.61-email-verification-and-delivery.md);
this is the shape.

- **Facebook and Microsoft arrive unverified**, whatever they report: their
  `mapProfileToUser` answers `emailVerified: false`, spread after the
  provider's own mapping. Google and Discord keep theirs. The one exception
  is the callback of an explicit link, where every provider vouches
  ("Linking a second provider" below); it writes nothing to the row.
- **Offered, never required for a session.** `emailVerification.sendOnSignUp`
  is on, so an OAuth sign-up whose address is unverified is created, mailed
  and signed in. No provider sets `requireEmailVerification`; what needs a
  verified address checks the column. `requireLocalEmailVerified` stays at
  its default, so a provider cannot link into an unverified row, and the
  owner of a squatted address is refused with `account_not_linked` until
  the row lapses ("Provisional accounts" below).
- **The token is Better Auth's**: an HS256 JWT signed with
  `BETTER_AUTH_SECRET`, `expiresIn: 3600`, never stored and not single-use.
  A second use finds the row verified and writes nothing.
  `autoSignInAfterVerification` is off, so the link never issues a session.
- **Only from a session holding that row.** `beforeEmailVerification`
  reads the request's session and refuses unless it is the row's own,
  which is what keeps your click on a mail you never asked for from
  verifying a stranger's sign-up that carries your address (the record's
  "The token, and who may follow the link"). Another user's session is
  redirected to the link's `callbackURL` with `?error=SIGN_IN_TO_VERIFY`,
  the way Better Auth's own refusals on the endpoint are, or answered
  `403` with no `callbackURL`; no session at all goes to sign-in ("The
  email page" below).
- **The write is stamped.** `/verify-email` updates `emailVerified` through
  Better Auth's adapter, outside `withAudit`. `beforeEmailVerification`
  records the user's id in a per-request store, and
  `databaseHooks.user.update.before` merges `updatedBy` from it into the
  same `UPDATE`; the trigger sets `updated_at`. `validateUserInfo` records
  the id the same way on a sign-in or link, which is when Better Auth flips
  the column for a provider that vouches later, and the hook falls back to
  the endpoint's session (`/update-user`). A write with neither is left
  unstamped rather than refused. No GUC is published, as for the create
  hook (the record's "The audit trail, against rules 1 and 3").
- **The mail** is sent through `src/lib/mail.ts` from
  `sendVerificationEmail`, and names the providers linked to the account so
  a reader can tell whether they signed up at all. The template is
  `src/emails/verify-email.tsx` ([`email.md`](../email.md)).

### Linking a second provider (MB.71)

A signed-in user adds another provider from `/account`, and from then on
either one signs in to the same account. Story 1; the scoping, and why
nothing else works, is
[`design-decisions/mb.71-plan.md`](../design-decisions/mb.71-plan.md).

**Signing in never links a provider that does not vouch.** Better Auth's
implicit link at sign-in needs the provider to vouch for the address as
well as the row to be verified, and Microsoft, pinned unverified against
nOAuth, never does; verifying the row fixes the wrong half. So a Microsoft
or Facebook sign-in over an existing row is refused with
`account_not_linked`, and stays refused.

**An explicit link from a session does.** Better Auth's `/link-social`:

- **It starts under a session.** `/link-social` answers 401 without one,
  and writes `link: { userId, email }` into the OAuth state from that
  session. The request body cannot name the user, since `link` is spread
  after any client `additionalData`, and which session carries the
  callback does not matter either. Both are asserted.
- **The callback's link branch creates the `accounts` row** and redirects
  to `/account`, or to `/account?error=<code>`. It issues no session, so the
  after-hook, the promotion and the email-page redirect never run, and with
  `updateUserInfoOnLink` off it writes nothing to `users`: the row keeps
  the address it verified, which invitations and the email page key on.
- **Afterwards the provider signs in by its account id.** Better Auth
  resolves `(providerId, accountId)` before any email lookup, so the linked
  account's address claim is never consulted again and nOAuth cannot reach
  it. A primary admin who signed up through Discord and linked Microsoft
  signs in through either, still admin.

**Inside a link every provider vouches.** The link branch refuses a
provider that does not vouch (`unable_to_link_account`), which the pin
would make Microsoft and Facebook every time. `vouchWhenLinking` in
`src/lib/auth.ts` answers `emailVerified: true` from all four mappers when
Better Auth's `getOAuthState()` carries `link`, which only a flow
`/link-social` began can. On every sign-in it is absent and each provider
keeps its own answer, so the takeover surface is unchanged. Inside a link
the value feeds Better Auth's gate alone; the guards that matter are the
session that started the flow and the account-id binding after it. Google
and Discord are included so a Discord account with no verified address can
be added too. `validateUserInfo` records no promotion profile on an
explicit link, since the vouch was lent, and tells it from an implicit one
by the state, not by `source.action`: Better Auth names both
`link-account`, and the implicit one at sign-in must still reach promotion.

**Different addresses are allowed.** `allowDifferentEmails` is on, since a
user's two providers usually hold different mailboxes, and Better Auth
reads it only in the two link branches, never at sign-in. The row's own
address is untouched. After an unlink, a sign-in through that provider
carrying the row's address is refused again; one carrying another address
creates a new account, as any first sign-in does.

**Removing one.** Better Auth's `/unlink-account` takes the `accounts`
row's own id, and refuses another user's row (`ACCOUNT_NOT_FOUND`).
`allowUnlinkingAll` stays off, so it refuses the last one
(`FAILED_TO_UNLINK_LAST_ACCOUNT`) and a user is never left with no way in.
The endpoint also wants a session younger than Better Auth's `freshAge`, a
day (`SESSION_NOT_FRESH`); the page says to sign in again. Removal
hard-deletes the `accounts` row, which is Better Auth's table and outside
rule 4, and leaves `users` alone.

**The page.** The Sign-In Methods section of the account page
(["The account page"](#the-account-page-mb88) below), which calls
`requireSession()`, so an unverified account never reaches it, though
Better Auth itself would link to an unverified row. The page reads
`linkedAccounts()` (`src/lib/request-session.ts`, Better Auth's
`listUserAccounts` with the request headers) and renders `SignInMethods`
([`components/sign-in-methods.md`](../components/sign-in-methods.md)). A
link's `?error=` goes through `linkErrorMessage` in `src/lib/sign-in.ts`,
and an unlink refusal through `unlinkErrorMessage`. A link lands back on the
account page, `/account`, with its `?error=` when it failed.

**The sign-in page's side.** `account_not_linked` has one sentence
("Provisional accounts" below). At a sign-in, `unable_to_link_account`
means only that writing the account row failed, and gets the plain retry
sentence. The link-only codes (`email_does_not_match`,
`account_already_linked_to_different_user`) land on `/account` and are
`linkErrorMessage`'s.

### Provisional accounts (MB.67)

An unverified account cannot hold an address against its owner past one
verification window, and three hours at most. The argument is
[`design-decisions/mb.61-email-verification-and-delivery.md`](../design-decisions/mb.61-email-verification-and-delivery.md),
"Provisional accounts and the sweep"; this is the shape.

- **What is provisional.** A `users` row with `emailVerified` false that
  holds at least one provider `accounts` row. It has lapsed once its
  `updated_at` is older than `VERIFICATION_LIFETIME_SECONDS` (3600, the same
  constant as the link's `expiresIn`), or its `created_at` is older than
  `PROVISIONAL_CAP_SECONDS` (three hours). Both are measured by the
  database's `now()`, since the database writes both columns.
- **The cap** is there because each resend restarts the hour: without it a
  squatter could hold the address as long as they kept resending. A real
  user has three hours from sign-up to follow a link, however often they
  resend. A link sent in the cap's last hour can outlive the account;
  following it finds no user, and signing in again starts a fresh account.
- **What restarts the window.** A sign-up sets it. Every verification mail
  sent for the row's own account — the sign-up mail, a resend through
  `/send-verification-email` from a session holding the row, or the email
  page's change request — calls `recordVerificationSent` in
  `src/modules/identity/services/email.ts`, a `withAudit` update stamped as
  that user that sets `verification_sent_at` and so, through the trigger,
  `updated_at`, before the mail goes out. Any other write to the row
  touches `updated_at` too. None of these move `created_at`, so none of
  them move the cap. A resend from any other session, or none, is refused
  outright: `requireOwnResend`, a `hooks.before` on
  `/send-verification-email`, answers 401 unless the session holds the
  address posted, so nobody can mail someone else, or keep a row alive by
  posting its address.
- **The sweep.** `hooks.before` on `/callback/:id` deletes every lapsed row
  in one statement, before the code exchange, so a lapsed row holding the
  arriving address is gone before Better Auth looks it up; `gateEmailChange`
  runs it too ("The email page" below). The rows' `accounts` and `sessions`
  go with them by `ON DELETE CASCADE`, so the squatter's cookie signs nobody
  in and its provider account resolves to nothing. Two partial indexes,
  `users_provisional_updated_at_idx` and `users_provisional_created_at_idx`,
  hold only unverified rows, one for each half of the predicate, which
  keeps the usual empty sweep cheap. The swept ids go to the server log at
  `info`.
- **A failed sweep never fails a sign-in.** It is logged at `error` and the
  callback carries on. One lapsed row that another row references makes the
  whole statement fail, because every audit foreign key is `NO ACTION`.
  Nothing in v1 lets an unverified account write beyond its own row, so
  this needs a bug or a hand edit; the one row others write about it, a
  privilege change, the sweep steps around (next).
- **An account an admin has vouched for is not swept** (MB.204). Approving
  an unverified account for coven creation (M5.8) or making it an admin
  (MB.59) writes a `user_privilege_changes` row naming it with a plain
  foreign key, and the sweep skips any account holding one. Deleted, it
  would fail the whole statement on that key, and so every sweep after, and
  the ledger keeps its history: `forbid_rewrite` refuses deleting the row,
  and letting the rows go with the user would erase what the ledger is for.
  Revoking the privilege adds a row rather than removing one, so the account
  is kept until it verifies, with its sessions and provider accounts, and
  goes on holding its address; MB.205 is to warn the admin of that before
  they vouch.
- **Hard delete, outside `withAudit`.** A tombstone would go on blocking
  the owner, since Better Auth looks a user up by address without our
  `deleted_at` filter, and no row survives to carry a stamp. The delete is
  the repository's one named `deleteProvisionalUsers`
  ([`db/provisional-account-delete.md`](../db/provisional-account-delete.md)),
  since `write.delete` rejects a table carrying `deleted_at` by design.
- **Seeded rows are never swept.** They hold no `accounts` row, so nobody
  can sign in to them. The seeded bootstrap user stays unverified on
  purpose: verified, it would take an implicit link from any provider
  vouching for its address, into a row that is an admin until MB.58
  demotes it.
- **The refusal.** `account_not_linked` maps in `src/lib/sign-in.ts` to one
  sentence whatever the cause: _"Sign-in didn't work. If you signed in
  before with a different provider, sign in that way, then add this one
  under Account."_ A squatted address and a provider that never vouches
  share the code, and naming either would confirm the address is taken
  (MB.71).
- **A change never unverifies a row.** An established account asking for a
  new address keeps its verified row until the new one is proven ("The
  email page" below); marked unverified, an account older than the cap
  would go in the next sweep.

### The email page (MB.54)

`/account/email`, protected, is where an account's address is set and
changed: prefilled from the provider, editable, and counting only once
proved. Stories 58 and 59; the plan is
[`design-decisions/mb.54-plan.md`](../design-decisions/mb.54-plan.md), the
component [`components/email-form.md`](../components/email-form.md), and
the tests [`tests.md`](tests.md).

- **One rule: an address becomes the account's at verification, never
  before.** `setEmail(session, email, sender, next?)` in
  `src/modules/identity/services/email.ts` writes nothing to `users.email`.
  It normalises and validates the address (`ValidationError` on `email`),
  refuses one a live _verified_ account holds — a provisional holder lapses
  first — stamps the row as mailed (`recordVerificationSent`, which is also
  what restarts a provisional caller's window), and asks the sender to mail
  the new address a change link. The row's own, still-unverified address is
  mailed again instead; verified, there is nothing to do. Either way `next`
  is handed to the sender as given, for the link's landing.
- **One verification mail a minute per account.** `users.verification_sent_at`
  is set by every mail sent for the row's own account, and `setEmail`
  refuses the next within `RESEND_COOLDOWN_SECONDS` with a `VALIDATION`
  error on `email` naming the seconds left, so the mutation cannot fill an
  inbox. Better Auth's `sendVerificationEmail` hook reads the same clock
  through `verificationWaitFor` and sends nothing inside it, which covers
  the resend path; a direct post to `/send-verification-email` reaches the
  hook only from the row's own session (`requireOwnResend`, above). The
  update hook clears the clock in the write that sets `emailVerified`: the
  mail was answered, so a verified account's next one, a change, is not
  held back by it. The page hands the form the seconds left, so a sign-up
  that lands on it sees the countdown from the start rather than a refusal
  on its first submit.
- **The change link is Better Auth's own.** `src/lib/email-verification.ts`
  mints `/verify-email`'s change token — `createEmailVerificationToken` with
  `updateTo` and `requestType: 'change-email-verification'` — under the same
  secret and the request's own base URL (`resolveBaseURL`, so a preview host
  links to itself), and sends `verify-email.tsx` with `purpose: 'change'`.
  Following it, `/verify-email` swaps `email` and sets `emailVerified` in
  one adapter write, stamped by the update hook. `user.changeEmail` stays
  off: this replaces it, and nothing on `/api/auth` is added.
- **Every link lands on the confirmed view, carrying where the account was
  going** (MB.111). Better Auth would land a sign-up's link where the
  sign-in asked to go; the `sendVerificationEmail` hook rewrites the link's
  `callbackURL` to `verifiedLanding(next)` (`src/lib/account-email.ts`),
  `/account/email?verified&next=<path>`, and the confirmed view's Continue
  goes on to that `next`. The hook reads `next` off the link's own
  `callbackURL` with `returnPathOf`: a sign-up's is the sign-in's
  destination, the one the after-hook put on the email page it landed on;
  one already on the email page — a resend's landing, or a sign-in headed
  there — gives up its own `next`, never the page itself. The email page
  hands its `next` to `setEmail`, and the sender builds the resend and
  change links' landings with the same `verifiedLanding`. `next` passes
  `safeReturnPath` when the link is built as well as when the page reads
  it, so a mailed link never names another site: one that would is
  dropped, and the link lands as it would with none. A sign-up that asked
  for no return path gives none either: the hook reads `NO_RETURN_PATH` off
  the OAuth state rather than the `callbackURL` standing in for it, so its
  link lands on `/account/email?verified`, and an explicit `/coven` is
  carried like any other `next` (MB.113).
- **A refusal keeps the rest of the landing.** `refuseVerification` drops
  the flag before appending `?error=`, so the page never reads a refusal as
  a confirmation, and keeps `next`, so a link sent again from there still
  carries it. Better Auth's own refusals — an expired or broken token —
  append to the landing verbatim, flag and all; the page reads any
  `?error=` as a refusal.
- **Gated before the endpoint.** Better Auth's change branch calls no
  `beforeEmailVerification` and, given no session, mints one for whoever
  opened the link. `gateEmailChange`, a `hooks.before` on `/verify-email` in
  `src/lib/auth.ts`, decodes the token's claims (not verified: it only ever
  refuses, and the endpoint verifies the signature after), refuses unless
  the session holds the row named by `email` (`?error=SIGN_IN_TO_VERIFY`,
  or 403 with no `callbackURL`), runs the provisional sweep, refuses while
  another live row holds `updateTo` (`?error=EMAIL_TAKEN`, which the unique
  index would otherwise 500 on), and records the acting user so the write
  is stamped and `afterEmailVerification` runs — so a change to the
  bootstrap address, verified from the owner's session, promotes (MB.68).
- **A link opened signed out goes to the sign-in page.** Both gates send a
  browser with no session at all to `SIGN_IN_TO_VERIFY_PATH`
  (`/sign-in?next=%2Faccount%2Femail&error=sign_in_to_verify`), whose
  sentence says to sign in and open the link again; the token is still
  good, since the gate refused before the endpoint saw it. Nothing from the
  link travels: not the token, not the address, not the link's own `next`.
  The sign-in's `next` is the fixed email page, so signing in with the
  right account lands there with no error to explain away; the email page
  itself, signed out, would bounce to sign-in with the error buried in the
  return path. Only a browser signed in as someone else is sent to the
  email page with `?error=SIGN_IN_TO_VERIFY`, since the page can tell it
  which account to use.
- **The sender comes through the GraphQL context.** A service may not
  import `auth`, and `auth.ts` imports the identity module, so the Better
  Auth side is `src/lib/email-verification.ts`'s
  `emailVerificationSender(request)`, built per request in
  `src/graphql/context.ts` and passed to the service by the `setEmail`
  resolver — the way loaders are. `resend` calls
  `auth.api.sendVerificationEmail` with the request's own headers, so the
  existing hook restarts the window and mails; `requestChange` mints and
  sends as above. Each takes the `next` `setEmail` was given and lands its
  link at `verifiedLanding(next)`. `auth` is imported at call time there,
  since the route is built at `NODE_ENV=production` in its tests.
- **A provider that shared no address gets a placeholder.** `orPlaceholder`
  in `socialProviders()` maps a profile with no email to
  `<providerId>-<providerAccountId>@pending.invalid`, `emailVerified: false`:
  `.invalid` is reserved (RFC 2606), so nothing can receive it and no
  invitation can match it. The sign-up mail is skipped for it and
  `mail.send` refuses any `.invalid` recipient as the backstop. It is
  provisional like any unverified row, and `email_not_found` never occurs.
- **An unverified sign-in lands on the email page.** The `hooks.after` on
  the callback replaces the endpoint's redirect with
  `/account/email?next=<where it was going>`, or bare `/account/email` when
  the sign-in asked for no return path, whenever the session's row is
  unverified: a Facebook or Microsoft address, a Google or Discord one the
  provider did not vouch for, or the placeholder. It does so on every
  sign-in, not only sign-up, since a provisional account can do nothing
  else. The endpoint's cookies stay: Better Auth merges a hook's `Location`
  over its own and appends cookies. A verified sign-in lands where it
  asked, or with no return path on its role's landing
  (["Route protection"](route-protection.md)).
- **The page.** `src/app/account/email/page.tsx` calls `requireSession()`
  and `getMe`, and passes the form `''` for a placeholder, `next` through
  `safeReturnPath`, the seconds left on the mail clock, `?error=` through
  `src/lib/account-email.ts`'s `verifyErrorMessage` (one sentence per code
  Better Auth or the gate appends, never the code), and the session role's
  `postSignInLanding` as `landing`, which Continue takes when there is no
  `next`. That is `/admin` for an admin, a primary admin a followed link
  has just promoted included, since the page reads the role after the
  link's write. `EmailForm` has two views: `?verified` on a verified row is
  the confirmed one, the address and Continue with nothing to edit;
  otherwise the field, prefilled and always editable, which is how any
  account changes its address later. Its success message names the typed
  address, since the row's is unchanged until the link is followed. Below
  the form, a verified account gets a link to the account page, reading
  "Your account" (["The account page"](#the-account-page-mb88) below), where
  the same field changes the address on a visit to the account.
- **No other page shows an unverified account anything.** `requireSession()`
  sends a session whose row is unverified to
  `/account/email?next=<its own path>` from every page but that one
  (`isEmailPage`, exact on the pathname), so the after-hook's landing is
  not the only way there: a bookmark, a back button or a typed URL all end
  on the email page until the address is proved. `/api/graphql` is not
  gated the same way — the context reads the session and the services
  refuse what a provisional account may not do, which is everything but
  `me` and `setEmail`.

### The account page (MB.88)

`/account` is the one account page: the name the site shows, the address it
writes to, and the ways in, changed in one place. Stories 1 and 59; the
component docs are [`components/name-form.md`](../components/name-form.md),
[`components/email-form.md`](../components/email-form.md) and
[`components/sign-in-methods.md`](../components/sign-in-methods.md).

- **The page.** `src/app/account/page.tsx` calls `requireSession()`, so an
  unverified account is sent to the email page instead, and reads `getMe`
  and `linkedAccounts()`. Under its `<h1>` "Your Account" are three
  sections, each under its own `<h2>`: Name ("Change your name." beneath its
  heading, then `NameForm`), Email
  (`EmailForm`, embedded) and Sign-In Methods (`SignInMethods`, whose
  heading is the section's). It carries no link to `/account/email`.
  Between the heading and the first section, a nav labelled "On this page"
  links to each section by its prefixed id (`#account-name`,
  `#account-email`, `#account-sign-in-methods`), and a hairline `<hr>`
  rules each section from the next (on the owner's call). A section a link
  lands on stops clear of the top inset. Beside the heading, in a
  `.page-header`, is Sign Out (`SignOutButton`,
  [`components/sign-out-button.md`](../components/sign-out-button.md)):
  Better Auth's own sign-out, then a full load of `/` (added in MB.63's PR,
  on the owner's call).
- **The email page stays, for the flows that are not a visit to the
  account.** Every unverified sign-in lands there, it is the only page a
  provisional account can reach, a mailed link lands on its confirmed view,
  and a link opened from the wrong browser is explained there. Its link
  across, offered to a verified account, reads "Your account".
- **The Email section is EmailForm, not a second form.** The same field,
  `setEmail` mutation, one-a-minute cooldown and field errors, with
  `embedded` set: no page heading, which the section gives, and never the
  confirmed view, which stays the email page's. A change link it asks for
  lands on the email page's confirmed view, as any other does.
- **The name changes through GraphQL**, as the address does (CLAUDE.md
  rule 1): `setName(name: String!): User!`, over `setName` in
  `src/modules/identity/services/name.ts`. It writes the session's own row
  through `withAudit`, so it takes no id and names no other user's. It
  trims the name, and refuses a blank or over-long one
  (`NAME_MAX_LENGTH`, 100) as a `VALIDATION` error on `name`, which MB.43
  maps to the field. A provisional account is `FORBIDDEN`, as it is from
  every service but `me` and `setEmail`, and before the input is read.
- **Better Auth's `/update-user` is disabled.** It writes `name` and `image`
  outside `withAudit`, so `src/lib/auth.ts` lists it in `disabledPaths`,
  and Better Auth's router answers it 404 before the endpoint or any hook
  runs. That leaves the name one write path, the audited one.
  `overrideUserInfoOnSignIn` is off, Better Auth's default, which no
  provider in `socialProviders()` changes, so a later sign-in never puts the
  provider's name back.
- **Tests.** The service is `tests/modules/identity/services/name.test.ts`
  (the row renamed and stamped, another user's left alone, the refusals) and
  its mutation `tests/modules/identity/graphql/set-name.test.ts`. The refused
  endpoint is `tests/db/email-verification.test.ts`, the page
  `tests/app/account/page.test.tsx`, and the browser, an axe scan of all
  three sections included, `tests/e2e/account.spec.ts`.

### Granting a second admin (M2.9, MB.59)

Specified in DESIGN.md §5 and argued in
[`design-decisions/m2.9-granting-admin.md`](../design-decisions/m2.9-granting-admin.md).
An admin grants and revokes admin from a user's row on `/admin/users`
(MB.59; [`admin-users.md`](admin-users.md), "Granting and revoking admin"),
where the primary admin cannot be revoked and a revoke that would leave no
admin is refused. Changing who the primary admin is, is that section's too.

A hand fix in `psql` stays possible, for a database no admin can sign in to.
It sets `can_create_workspace` with `role`, since MB.177's CHECK refuses an
admin without the flag, and declares itself first, since the trigger on
`users` refuses a privilege change that names no route (MB.195):

```sql
begin;
select set_config('app.privilege_route', 'manual', true);
-- optional: why, kept on the ledger row as its note
select set_config('app.privilege_note', 'Second admin while no admin can sign in', true);
update users set role = 'admin', can_create_workspace = true, updated_by = '<your user id>'
where id = '<their user id>';
commit;
```

Both settings are transaction-local, so they go in the same transaction as
the `UPDATE`; outside one, `psql` commits each statement alone and the route
is gone before the update runs. The trigger writes a `manual` row per changed
privilege, stamped with the row's `updated_by`, so setting it to your own id
is what names you as the actor. The route is refused rather than defaulted so
that no write, a hand-run one included, changes a privilege without saying how
([`mb.194-privilege-ledger-by-trigger.md`](../design-decisions/mb.194-privilege-ledger-by-trigger.md)).
The same holds for any hand fix to either column, a revoke included, and a
hand fix checks neither the primary admin nor the count the service does. The
tasks that build the rest:

- **MB.58 and MB.59** (built): the ledger, `user_privilege_changes` since
  MB.194, and granting and revoking any other admin from `/admin/users`. The
  primary admin can be neither revoked nor deleted, and a revoke that would
  leave zero admins is refused (the record's "The primary admin" and
  "Revoking").
- **MB.62 and MB.63** (built): the `admin_role_change_pauses` ledger through which
  the primary admin pauses granting and revoking for every other admin (the
  record's "Granting"; MB.62 built the table,
  [`mb.62-pause-ledger.md`](../design-decisions/mb.62-pause-ledger.md)).
- **MB.69 and MB.70**: inviting an admin by email, story 62
  ([`design-decisions/mb.61-email-verification-and-delivery.md`](../design-decisions/mb.61-email-verification-and-delivery.md),
  "The admin invitation (story 62)"; MB.69 built the table, now the site tier of `invitations`,
  [`db/invitations.md`](../db/invitations.md), "Admin invitations").
- **MB.53** (built): Better Auth's `admin` plugin, with only its two
  impersonation endpoints reachable, since the rest would grant admin or
  delete users outside `withAudit` ([`impersonation.md`](impersonation.md)).

### The self-created user

- **Sign-up writes outside `withAudit(session, fn)`**, as one of CLAUDE.md
  rule 3's two identity bootstraps: there is no session yet, because the
  write is how one comes to exist. Like `/api/auth/*` itself (["The one
  exception to the GraphQL-only rule"](graphql-only-exception.md)), it is
  Better Auth's own create-user flow writing straight to the adapter, with
  no service function in between to call `withAudit`. The promotions above
  are not such writes: by then the user is authenticated.
- **`databaseHooks.user.create.before`** (`src/lib/auth.ts`) does the audit
  stamping, and nothing else:
  - It generates the `uuid` itself (`crypto.randomUUID()`) rather than
    leaving it to Postgres's column default, so `createdBy`/`updatedBy`
    (NOT NULL, no database default) can name the row before it exists: a
    self-created account is its own creator, as the seed's bootstrap row
    is (MB.5). `forceAllowId` (Better Auth's own `createWithHooks`) is what
    lets a hook-supplied id override the adapter's default id generation.
  - It leaves `role` and `canCreateWorkspace` out of the returned data, so
    Postgres's own column defaults apply rather than a second
    `'user'`/`false` literal in application code. It never sets `role`,
    whatever the address.
- **`user.additionalFields`** registers `role`, `canCreateWorkspace`,
  `verificationSentAt`, `createdBy` and `updatedBy` with Better Auth's user
  model: without it the adapter silently drops any key in the hook's data
  that is not a known field (`@better-auth/core`'s `transformInput` iterates
  `schema[model].fields` and skips anything else). All five carry
  `input: false`, so no client request can set them and the hook is the
  only path through Better Auth, which is what enforces M2.3's "Nothing in
  the OAuth flow sets the flag" rather than leaving it merely unimplemented,
  and keeps every grant of admin on the paths that record it: the promotions
  above and MB.59's `setUserRole`. `verificationSentAt`, `createdBy` and `updatedBy`
  also carry `returned: false`, keeping the mail clock and raw audit ids
  out of session and user responses. `deletedAt`/`deletedBy` are not
  registered: nothing soft-deletes a user through Better Auth.
- **No `user.fields` mapping.** `name`/`image` keep Better Auth's own
  column names ([`tables.md`](tables.md) has the reverted rename).
