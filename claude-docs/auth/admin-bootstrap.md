## Admin bootstrap and the self-created user (M2.3, MB.60)

DESIGN.md §5: the account matching `ADMIN_BOOTSTRAP_EMAIL`
(`claude-docs/secrets.md`) is the **primary keeper**. Everyone else gets the
column defaults (`role: 'user'`, `canCreateWorkspace: false`) on sign-up.
This file is the shape; the argument is
[`design-decisions/m2.9-granting-admin.md`](../design-decisions/m2.9-granting-admin.md)
for the admin and
[`design-decisions/mb.61-email-verification-and-delivery.md`](../design-decisions/mb.61-email-verification-and-delivery.md)
for verification.

### Promotion at sign-in, from Google or Discord only (MB.60)

The primary keeper is promoted at a **sign-in**, not when the account is
created, and only when that sign-in's provider vouches for the address
([`m2.9-granting-admin.md`](../design-decisions/m2.9-granting-admin.md),
"The primary keeper"):

- **Google and Discord qualify; Microsoft and Facebook never do**, since
  only those two verify an address in a way that can be trusted
  (`VOUCHING_PROVIDERS`). Facebook never reports verified in Better Auth's
  mapping, and Microsoft's `tenantId: 'common'` lets any Entra tenant mint
  the claim (nOAuth). A steward who signs in only through those two is
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
- **Every keeper grant also seats the steward of the demo coven**, in the same
  `withAudit` as the role write (`writeSiteRoleGrant`): the promotion here, the
  MB.59 grant and an accepted admin invitation. See
  [`db/demo-coven-seed.md`](../db/demo-coven-seed.md), "How a keeper gains and
  loses the seat".
- **Changing the variable** and redeploying promotes the new address at
  its next qualifying sign-in or verification, even if that account
  already exists. The previous primary keeper keeps `role: 'admin'` and
  simply stops being protected (MB.59). It is also how to recover from a
  primary keeper who has lost their OAuth account.

### Promotion at first-party verification (MB.68)

The second way to become the primary admin: **follow the verification link
our own mail sent to the bootstrap address, from a browser signed in to that
account.** Our mail vouches for the address as Google or Discord would, so a
Microsoft- or Facebook-only steward is promoted too.

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
primary keeper's protection to whoever holds it then:

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
  provider's own mapping, because their `PROFILE` entry says `vouches: false`
  (`src/lib/social-providers-config.ts`). Google and Discord keep theirs. The one exception
  is the callback of an explicit link, where every provider vouches
  ("Linking a second provider" below); it writes nothing to the row.
- **Offered, never required for a session.** `emailVerification.sendOnSignUp`
  is on, so an OAuth sign-up whose address is unverified is created, mailed
  and signed in. No provider sets `requireEmailVerification`, and email and
  password leaves it off ([`passwords.md`](passwords.md)); what needs a
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
  it. A primary keeper who signed up through Discord and linked Microsoft
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
day (`SESSION_NOT_FRESH`). The page reads the session's age first
(`sessionIsFresh()`, `src/lib/request-session.ts`) and, from a stale one,
offers Sign In Again in place of every Remove, which signs out and returns
through `/sign-in` to `/account` with a fresh session; a refusal that still
happens, from a page left open past the day, says to sign in again
([`components/sign-in-methods.md`](../components/sign-in-methods.md), "A
stale session signs in again"). Removal
hard-deletes the `accounts` row, which is Better Auth's table and outside
rule 4, and leaves `users` alone.

**The page.** The Sign-In Methods section of the Sign-In tab, `/account/sign-in`
(["The account page"](#the-account-page-mb88) below), which calls
`requireSession()`, so an unverified account never reaches it, though
Better Auth itself would link to an unverified row. The page reads
`linkedAccounts()` (`src/lib/request-session.ts`, Better Auth's
`listUserAccounts` with the request headers) and `sessionIsFresh()`, and
renders `SignInMethods`
([`components/sign-in-methods.md`](../components/sign-in-methods.md)). A
link's `?error=` goes through `linkErrorMessage` in `src/lib/sign-in.ts`,
and an unlink refusal through `unlinkErrorMessage`. A link lands back on the
Sign-In tab, `/account/sign-in`, with `?error=` and `?provider=` when it failed, so
the page can put the sentence in the row of the provider that failed.

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
"Provisional accounts and the sweep" (written when a callback hook did the removing; a job does it now); this is the shape.

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
- **The expiry job.** Creating an unverified account starts one run of the
  `provisionalAccountExpiry` job (`src/modules/identity/jobs/`), from the
  `user.create.after` hook in `src/lib/auth.ts` through
  `scheduleProvisionalExpiry`. The run sleeps one verification window and
  then calls its step, which deletes the row if it has lapsed. If the row
  has not (a resend moved the window), the step answers the seconds left
  and the run sleeps again; it ends when the row is gone, verified, or
  vouched for. The rows' `accounts` and `sessions` go with the delete by
  `ON DELETE CASCADE`, so the squatter's cookie signs nobody in and its
  provider account resolves to nothing. The step is idempotent: run again
  after it succeeded it finds no row and changes nothing. No request sweeps
  any more: the OAuth callback, `gateEmailChange` and the sign-up route
  read the table as it is. Two partial indexes,
  `users_provisional_updated_at_idx` and `users_provisional_created_at_idx`,
  hold only unverified rows, one for each half of the predicate. The
  mechanism is [`design-decisions/m15.49-job-mechanism.md`](../design-decisions/m15.49-job-mechanism.md).
- **A run that is lost leaves its account in place until the next daily
  cleanup.** A failed start is logged at `error` and the sign-up carries on.
  That account then holds its address until the daily cleanup, which a
  Vercel Cron Job starts once a day, deletes it
  (`src/modules/identity/jobs/provisional-cleanup.ts`). The job runs the delete as its own step with
  retries, so a step that fails is tried again rather than lost.
- **An account a keeper has vouched for is not removed** (MB.204). Approving
  an unverified account for coven creation (M5.8) or making it a keeper
  (MB.59) writes a `user_privilege_changes` row naming it with a plain
  foreign key, and the job skips any account holding one. Deleted, it
  would fail on that key, and
  the ledger keeps its history: `forbid_rewrite` refuses deleting the row,
  and letting the rows go with the user would erase what the ledger is for.
  Revoking the privilege adds a row rather than removing one, so the account
  is kept until it verifies, with its sessions and provider accounts, and
  goes on holding its address; MB.205 is to warn the admin of that before
  they vouch.
- **Hard delete, outside `withAudit`.** A tombstone would go on blocking
  the owner, since Better Auth looks a user up by address without our
  `deleted_at` filter, and no row survives to carry a stamp. The delete is
  the repository's one named `deleteLapsedProvisionalUser`
  ([`db/provisional-account-delete.md`](../db/provisional-account-delete.md)),
  since `write.delete` rejects a table carrying `deleted_at` by design.
- **Seeded rows are never removed.** They hold no `accounts` row, so nobody
  can sign in to them. The seeded bootstrap user stays unverified on
  purpose: verified, it would take an implicit link from any provider
  vouching for its address, into a row that is a keeper until MB.58
  demotes it.
- **The refusal.** `account_not_linked` maps in `src/lib/sign-in.ts` to one
  sentence whatever the cause: _"We couldn't sign you in this way. Use the
  sign-in method you used before, then add this one on your account page."_ A squatted address and a provider that never vouches
  share the code, and naming either would confirm the address is taken
  (MB.71).
- **A change never unverifies a row.** An established account asking for a
  new address keeps its verified row until the new one is proven ("The
  email page" below); marked unverified, an account older than the cap
  would go in the next run.

### The email page (MB.54)

`/account/email`, protected, is where an account's address is set and
changed: prefilled from the provider, editable, and counting only once
proved. Stories 58 and 59; the plan is
[`design-decisions/mb.54-plan.md`](../design-decisions/mb.54-plan.md), the
component [`components/email-form.md`](../components/email-form.md), and
the tests [`tests.md`](tests.md).

- **The API refuses an unverified account too.** The session built from the
  request headers carries `emailUnverified` while the address is unverified,
  and `assertMembership` refuses such a session with an explaining
  `Forbidden`, and `membershipsOf` answers an empty list, so no coven data or name is reachable through `/api/graphql` by
  skipping the page redirect. `me`, `setEmail` and sign-out take no
  membership and still work. `assertSiteAdmin` and `assertCurator` refuse it too, so an unverified keeper or curator reaches no
  curation or people operation either (the `usersById` loader batch is left as it is), and the GraphQL `admin` and `curator` scopes are false for it, so `selfOrAdmin` falls back to `self`. The list is empty rather than refused because the shell draws the email page and public pages from it.
- **One rule: an address becomes the account's at verification, never
  before.** `setEmail(session, email, sender, next?)` in
  `src/modules/identity/services/email.ts` writes nothing to `users.email`:
  the address asked for goes to `users.pending_email` until its link is
  followed, replaced or lapses (below).
  It normalises and validates the address (`ValidationError` on `email`),
  refuses a change from a session created more than
  `EMAIL_CHANGE_WINDOW_SECONDS` ago (a day, as Better Auth's `freshAge` is for
  unlinking a provider) with a `ValidationError` on `email` that says to
  sign in again, which the form shows under the field; resending the row's own
  link asks no such thing. A taken address is not refused: held (by a live _verified_ account;
  a provisional holder lapses first) or free, the call stamps, notifies and
  answers alike, and only a free address is mailed a link, so the response
  does not say which it was. Both mails are handed to `sender.defer` (Next's
  `after`), so the call does not wait for either and a free address does not
  take longer to answer than a taken one. It tells the address being left that a
  change was asked for (`sender.notifyChangeRequested`: when, and the new
  address's domain only, with no link in it), stamps the row as mailed and records the address as pending in one write
  (`recordEmailChange`, which is also what restarts a provisional caller's window), and asks the sender to mail
  the pending address a change link. A held address is recorded as pending too, so the two cases write alike; no link is
  sent to it. The row's own, still-unverified address is
  mailed again instead; verified, there is nothing to do. Either way `next`
  is handed to the sender as given, for the link's landing.
- **The address being left is told twice.** `src/emails/email-change-notice.ts`
  goes to the old address when the change is asked for and again once the
  change completes. The swap's own write holds the old address in
  `users.former_email`, and `afterEmailVerification` starts the account-notice
  job (`kind: 'change-completed'`) with the account id and the origin alone
  (`noticeCompletedChange` in `src/lib/auth.ts`). Its step reads
  `former_email` when it sends, and clears it as the System account once the
  transport took the mail, or once every attempt failed, since nothing sends
  it again; with no run started, the one try in the request clears it after.
  The clear matches the address mailed and the address the mail named, so a
  move made while the notice was going out is still told. A second change that
  completes before the first notice is sent keeps the first address left,
  which is the one the notice is owed to, and that notice names the address
  the account holds when it is sent. `former_email` has no unique index, so the
  address is free for another account to sign up with or change to the moment
  the change completes: the sign-up and the `EMAIL_TAKEN` gate read
  `users.email` alone. The mail carries no action: a link in it would be one a
  thief could press. Nothing is sent to a `.invalid` placeholder, and none is
  held.
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
- **The change link is Better Auth's own, signed when it is sent.** `src/lib/email-verification.ts`
  starts the secret-link job (`kind: 'change'`, [`email.md`](../email.md), "Secret links") with the account's id, the
  request's own base URL (`resolveBaseURL`, so a preview host links to itself) and the guarded `next`, never an address.
  Its step reads `users.email` and `users.pending_email`, mints `/verify-email`'s change token —
  `createEmailVerificationToken` with `updateTo` set to the pending address and
  `requestType: 'change-email-verification'` — under the same secret, and sends `verify-email.tsx` with
  `purpose: 'change'` to the pending address; one a verified account has come to hold is sent nothing.
  Following it, `/verify-email` swaps `email` and sets `emailVerified` in
  one adapter write, stamped by the update hook, which clears `pending_email` in the same write.
- **Only the newest change is honoured, and only while its link lasts.** A second change overwrites `pending_email`
  and the stamp, so the first link is refused at the gate (`?error=CHANGE_REPLACED`) and the second is honoured. The job
  sleeps for the link's lifetime after sending, then clears `pending_email` as the System account, but only while the
  row still carries the stamp it was sent under, so a later change keeps its own address; a link followed after that is
  refused as `?error=TOKEN_EXPIRED`. With `MAIL_TRANSPORT` unset, or a job that did not start, nothing lapses the
  column: it stays until the next change or the swap, and the link itself has expired by then.
- **A pending address blocks nobody.** `pending_email` has no unique index, so an address pending on one account is
  still free for another to sign up with or ask for: the unique index on `email` decides only at verification, and the
  gate refuses `EMAIL_TAKEN` from `users.email` alone, as before (MB.67's provisional sweep reads neither address). `user.changeEmail` stays
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
  or 403 with no `callbackURL`), refuses unless `updateTo` is the row's `pending_email` (`CHANGE_REPLACED`, or
  `TOKEN_EXPIRED` once it was cleared), refuses while
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
  existing hook restarts the window and mails; `requestChange` starts the
  secret-link job as above, and `notifyChangeRequested` the account notice job, each with the account's id. Each takes the `next` `setEmail` was given and lands its
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
- **The page.** `src/app/(shell)/account/email/page.tsx` calls `requireSession()`
  and `getMe`, and passes the form `''` for a placeholder, `next` through
  `safeReturnPath`, the seconds left on the mail clock, `?error=` through
  `src/lib/account-email.ts`'s `verifyErrorMessage` (one sentence per code
  Better Auth or the gate appends, never the code), and the session's
  `signedInLanding` as `landing`, which Continue takes when there is no
  `next`. That is `/keepers` for a keeper, `/curator` for a curator, a primary keeper a followed link
  has just promoted included, since the page reads the role after the
  link's write; a member's first coven; or `/coven` for someone in none
  (MB.257). `EmailForm` has two views: `?verified` on a verified row is
  the confirmed one, the address and Continue with nothing to edit;
  otherwise the field, prefilled and always editable, which is how any
  account changes its address later. Its success message names the typed
  address, since the row's is unchanged until the link is followed. Inside
  the card, a verified account gets a quiet button to the account page,
  reading "Continue to Account" (["The account page"](#the-account-page-mb88) below), where
  the same field changes the address on a visit to the account.
- **The front page offers it directly.** `/` is public, and for an unverified
  signed-in account its Continue points at `/account/email?next=<landing>`
  rather than at a page that would send it there.
- **No other protected page shows an unverified account anything.** The public
  pages, `/` and the compendium, are open to it. `requireSession()`
  sends a session whose row is unverified to
  `/account/email?next=<its own path>` from every protected page but that one
  (`isEmailPage`, exact on the pathname), so the after-hook's landing is
  not the only way there: a bookmark, a back button or a typed URL all end
  on the email page until the address is proved. A link followed inside the
  app does too. The page throws that redirect, not the shell layout, which
  draws round the email page as well, and asks only that someone is signed
  in. When the shell layout threw it, a link into the shell left the browser
  refetching the email page without end (MB.256;
  ["Route protection"](route-protection.md), "Where the email redirect is
  thrown"). `/api/graphql` is not gated the same way — the context reads
  the session and the services refuse what a provisional account may not
  do, which is everything but `me` and `setEmail`.

### The terms page (M15.57)

`/account/terms`, protected, is where an account agrees to the terms of use
(the text is the public page `/terms`). The terms include the disclaimer and
the code of ethics, so agreeing covers all three documents at once. The page
shows the joint version and the date, links the text, and has one Agree &
Continue button.

- **The version is three numbers, shown as one.** The version in force is
  each agreed document's highest published version, read by
  `currentAgreementVersion` (`src/lib/current-agreement-version.ts`) as
  `{ terms, disclaimer, ethics }`, with 0 for a document that has none
  published. It is cached under the `documents` tag, so a publish clears it,
  and the gate reads it there. The acceptance page and `agreeToTerms` read
  the same numbers uncached, through `agreementVersionInForce`: Next can
  serve a cached read once more while it refreshes it, which `next dev` does
  after a publish whenever the process's monotonic clock lags the wall clock,
  and a check against that answer refused the version the page showed. The
  gate may still let one request through on the old numbers. The page and the keepers' screens show it as one joint version,
  `terms.disclaimer.ethics` (for example `1.4.2`), through
  `formatAgreementVersion` (`src/lib/agreement-version.ts`). Publishing a new
  version of any of the three sends every account back through the
  acceptance page; publishing the privacy policy does not
  ([`m15.79-agreement-covers-three-documents.md`](../design-decisions/m15.79-agreement-covers-three-documents.md)).
- **The record is four nullable columns on `users`.** `agreed_terms_version`,
  `agreed_disclaimer_version`, `agreed_ethics_version` and
  `terms_accepted_at` are null until an account agrees. `agreeToTerms`
  (`src/modules/identity/services/terms.ts`) writes all four for the caller's
  own row through `withAudit`. It takes the three numbers the page showed and
  refuses any combination but the one in force, so a page left open across a
  publish cannot agree to text it did not show. The GraphQL mutation of the
  same name takes them as an `AgreementVersionInput` and returns the row.
- **The gate is in `requireSession()`, after the email check.** An account
  is agreed only when all three stored numbers equal the three in force
  (`agreementIsCurrent`); a stored null counts as 0, so a document with
  nothing published asks nothing. The stored numbers travel in Better Auth's
  session, so the gate adds no query of its own. An account that has not
  agreed is redirected to `/account/terms?next=<path>`, the path coming from
  the same proxy-forwarded header and the same `safeReturnPath` guard the
  email page uses. An unverified account proves its address first and agrees
  second; the email page and the acceptance page are each exempt, so the two
  redirects never chase each other. `requireAdminSession()` goes through
  `requireSession()`, so admin pages are gated too.
- **The page names what changed.** Under the joint version, a list headed "Updated Since You Last Agreed" names each of
  the three documents whose version in force differs from the account's
  stored one, each linking its public page (`documentsChangedSince`). A new
  account sees all three.
- **After agreeing the browser makes a full navigation** to `next`, or to the
  signed-in landing page when there is none, so the router does not reuse the
  cached redirect.
- **Not gated:** signed-out visitors, `/terms`, the other document pages,
  the public compendium, and a paused account, which reaches only the support
  pages and cannot agree while paused ("Pausing a user's access").
- **The API is not gated the same way.** `/api/graphql` does not refuse an
  account that has not agreed; the gate covers pages only, as the entry for
  M15.57 specifies.
- **Fixtures have agreed.** The seeded fixture cast and the e2e `signInAs`
  helper record the three versions in force (`agreedInForceSql`,
  `tests/support/db/agreement-in-force.ts`), so a spec lands where it asks;
  pass `termsAgreed: false` to walk the gate.

### The account page (MB.88)

`/account` holds the name the site shows, the address it writes to, and the
coven invitations waiting for that address; the ways in are the Sign-In tab,
`/account/sign-in`, below. Stories 1, 2, 6 and 59; the
component docs are [`components/name-form.md`](../components/name-form.md),
[`components/email-form.md`](../components/email-form.md),
[`components/sign-in-methods.md`](../components/sign-in-methods.md),
[`components/password-section.md`](../components/password-section.md) and
[`components/received-invitations.md`](../components/received-invitations.md).

- **The page.** `src/app/(shell)/account/page.tsx` calls `requireSession()`, so an
  unverified account is sent to the email page instead, and reads `getMe`,
  `linkedAccounts()`, `sessionIsFresh()` and one page of
  `listReceivedInvitations`. Under its `<h1>` "Your
  Account" are three sections, each a region named by its own `<h2>`, which
  the page writes in a `.header` with the section's intro as its `.lede`:
  Name ("The name Sorrel & Salt shows for you.", then `NameForm`), Email
  (`EmailForm`, embedded, whose own status line says what the section is
  for) and Invitations ("Covens that have invited
  this email address to join them.", then `ReceivedInvitations`, M10.32). It
  carries no link to `/account/email`.
  Under the heading, a nav labelled "On This Page"
  (the Sign-In tab has one too, to its four sections) links to each section by its prefixed id (`#account-name`,
  `#account-email`, `#account-invitations`).
  The Invitations section is always shown, with the table's empty state when
  none wait. It pages with `?after=` and `?before=`, and its pager links keep
  `#account-invitations`. Its id, `ACCOUNT_INVITATIONS_ID`, and the link to it,
  `ACCOUNT_INVITATIONS_PATH`, are in `src/lib/sign-in.ts`; the `/coven`
  landing's notice and the account menu's count both link to it. Each section stands on its
  own `.panel`, which parts it from the next, so no rule is drawn between
  them (the owner's call, MB.116; MB.88 ruled them apart with a hairline). A
  section a link lands on stops clear of the top inset. The frame, the
  sections and the panels are primitives
  (`.page-frame--narrow`, `.page-frame__section`, `.panel`;
  [`styling.md`](../styling.md), "The page frame"), so the page has no stylesheet of its own beyond `.page-with-nav` in `_primitives.scss`, shared with the coven index: wider than a phone the nav is a vertical menu in a column left of the sections, sticky under the shell bar, and on a phone it is the same menu, a full-width column above them (`PageNav`, [`page-nav.md`](../components/page-nav.md)). A failed link
  lands back on the Sign-In tab with `?error=` and `?provider=`: that page turns the code into
  a sentence with `linkErrorMessage`, and passes it to `SignInMethods` with
  the provider, when it is one on the roster, so the sentence shows in that
  provider's row. The heading stands alone; Sign Out is in the shell's account menu
  (`SignOutButton`,
  [`components/account-menu.md`](../components/account-menu.md)):
  Better Auth's own sign-out, then a full load of `/` (MB.63, moved by MB.7).
- **The account tabs.** `/account`, `/account/sign-in` and `/account/support` are one `TabbedPage` titled Account, with the tabs Account, Sign-In and Support Requests (`src/app/(shell)/account/(tabs)/layout.tsx`, tabs in `ACCOUNT_TABS` in `src/lib/sign-in.ts`); the route group leaves `/account/email` outside them. Each page runs its own `requireSession()` and reads. The Sign-In tab stacks four sections, each a `.panel`, in this order: Sign-In Methods (which also takes the failed-link `?error=` and `?provider=`), Password (`#password`, which renders with no password to offer setting one), Two-Factor Sign-In (`#two-factor`) and Passkeys (`#passkeys`). `ACCOUNT_SIGN_IN_PATH` is the tab; `ACCOUNT_PASSWORD_PATH` and `ACCOUNT_PASSKEYS_PATH` are its fragment links.
- **Two-Factor Sign-In (M16.10, Story 75).** Its own section; for an account with no password it says so and links to the Password section, since two-factor guards password sign-ins alone. The page writes its heading and intro and hands `TwoFactorSettings` (`components/PasswordSection/two-factor.tsx`) whether it is on ([`components/password-section.md`](../components/password-section.md), "Two-factor").
- **Sign-In Methods lists the password and the passkeys too.** After the providers come a Password row (Set or Not Set, linking to the Password section) and a Passkeys row (how many, linking to the Passkeys section), so the list matches its sentence ([`components/sign-in-methods.md`](../components/sign-in-methods.md)).
- **Passkeys (M16.8, Story 74).** A Passkeys section follows Password and Two-Factor Sign-In, at `/account/sign-in#passkeys`. Its intro says a passkey is tied
  to this website's address and to the device or password manager that holds
  it; that a passkey made on one Sorrel & Salt site, such as staging, does not
  work on another is in the plugin's notes, not on the page ([`plugins.md`](plugins.md), "Passkeys"). The page reads the
  list with `accountPasskeys()` in `src/lib/request-session.ts`, the plugin's
  `listPasskeys` cut to id, name and day added, and hands it to `Passkeys`
  ([`components/passkeys.md`](../components/passkeys.md)), whose Add a
  Passkey, Rename and Remove call the plugin's own routes.
- **The email page stays, for the flows that are not a visit to the
  account.** Every unverified sign-in lands there, it is the only protected page a
  provisional account can reach, a mailed link lands on its confirmed view,
  and a link opened from the wrong browser is explained there. Its way
  across, offered to a verified account, is a quiet "Continue to Account"
  button inside the form's `.panel`, the ground the account page's sections
  stand on too.
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

### Granting a second keeper (M2.9, MB.59)

Specified in DESIGN.md §5 and argued in
[`design-decisions/m2.9-granting-admin.md`](../design-decisions/m2.9-granting-admin.md).
A keeper grants and revokes admin (or sets the curator role, M11.20) from a user's row on `/keepers/users`
(MB.59; [`admin-users.md`](admin-users.md), "Changing a site role"),
where the primary keeper cannot be revoked and a demotion that would leave no
admin is refused. Changing who the primary keeper is, is that section's too.

A hand fix in `psql` stays possible, for a database no keeper can sign in to.
It sets `can_create_workspace` with `role`, since the `users_privileged_can_create_workspace` CHECK (MB.177, M11.20) refuses an
keeper or curator without the flag, and declares itself first, since the trigger on
`users` refuses a privilege change that names no route (MB.195):

```sql
begin;
select set_config('app.privilege_route', 'manual', true);
-- optional: why, kept on the ledger row as its note
select set_config('app.privilege_note', 'Second admin while no keeper can sign in', true);
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
hand fix checks neither the primary keeper nor the count the service does. The
tasks that build the rest:

- **MB.58 and MB.59** (built): the ledger, `user_privilege_changes` since
  MB.194, and granting and revoking any other keeper from `/keepers/users`. The
  primary keeper can be neither revoked nor deleted, and a revoke that would
  leave zero keepers is refused (the record's "The primary keeper" and
  "Revoking").
- **MB.62 and MB.63** (built): the `admin_role_change_pauses` ledger through which
  the primary keeper pauses granting and revoking for every other keeper (the
  record's "Granting"; MB.62 built the table,
  [`mb.62-pause-ledger.md`](../design-decisions/mb.62-pause-ledger.md)).
- **MB.69 and MB.70**: inviting a keeper by email, story 62
  ([`design-decisions/mb.61-email-verification-and-delivery.md`](../design-decisions/mb.61-email-verification-and-delivery.md),
  "The admin invitation (story 62)"; MB.69 built the table, now the site tier of `invitations`,
  [`db/invitations.md`](../db/invitations.md), "Admin invitations").
- **MB.53** (built): Better Auth's `admin` plugin, with only its two
  impersonation endpoints reachable, since the rest would grant admin or
  delete users outside `withAudit` ([`impersonation.md`](impersonation.md)).

### Pausing a user's access (M15.52)

Specified in DESIGN.md §8, "An admin can pause a user's access", and argued in
[`design-decisions/m15.52-site-access-pause.md`](../design-decisions/m15.52-site-access-pause.md).
The table is DESIGN.md §5's `user_access_pauses` (M15.51).

**Who and whom.** `pauseUserAccess(userId, until, note)` and `liftUserAccessPause(userId)` are admin-only
(`assertSiteAdmin`), in `src/modules/identity/services/access-pause.ts`. Each refusal explains itself:

- a curator or a user: `Forbidden`, "Only a site keeper may pause or lift a user’s access";
- the primary keeper, the live keeper whose email matches `ADMIN_BOOTSTRAP_EMAIL`: `Forbidden`, "The primary keeper’s access cannot be paused";
- the admin themselves: `Forbidden`, "You cannot pause your own access";
- the System account or the signed-out sender account (neither is a person; `isStandInAccount` in `src/lib/system-actor.ts`): `Forbidden`, "This account is not a person, so its access cannot be paused". The service refuses; no table constraint does, as for the primary keeper and the admin themselves, and neither account is listed on the Users page;
- another keeper while keeper changes are paused (MB.62), unless the caller is the primary admin: the same refusal a revoke of admin gets;
- a user already paused: a validation error, "This user is already paused; lift the pause first";
- an `until` that is not in the future: a validation error on `until`, "Choose a time in the future";
- a note missing, blank, or over 500 characters: a validation error on `note`, "Write a note saying why" or "Keep the note to 500 characters".

Every pause, dated or open-ended, needs a note saying why: the GraphQL argument is required, the service refuses one blank once trimmed, and the column is NOT NULL with a CHECK that it holds a character other than whitespace. The note is stored trimmed. Lifting a user with no standing pause, a run-out one included, answers `NotFound`.

**What a pause does.** Setting it lifts any run-out live row, deletes every row in `sessions` for the user and inserts
the new pause, all in one `withAudit` transaction (`setUserAccessPause` in `src/db/repository/user-access-pauses.ts`).
The session rows have no audit columns and no `deleted_at`, so they are deleted as Better Auth's own sign-out deletes them.

**Signed in while paused.** A paused account signs in by every method, as any other does: nothing in `src/lib/auth.ts`
reads the pause, so a wrong password still answers 401 and counts as a failed sign-in, and a right one counts as none. The
pause is read once per request, in `sessionStateFromHeaders` in `src/lib/request-session.ts`, which records the standing
pause on every session, an impersonation's included, as `accessPause`. From there:

- **Pages.** `requireSignedIn()`, and every guard built on it, redirects to `/access-paused` from every page but
  `/support` and `/account/support` and the pages beneath them (`isPausedViewPage` in `src/lib/access-paused.ts`).
  `getSession()` answers the session on those pages and on `/` and `/sign-in`, which only send the account on to
  `?next=` or its landing, and `null` on every other public page, so the compendium draws its signed-out view.
- **The shell.** `getShellSession()` answers the session with the pause beside it, and `viewerOf` and `viewerIfSignedIn`
  in `src/lib/viewer.ts` draw a paused viewer with no coven, curation, creation or invitation, keeping the count of their
  own requests waiting on them. AppShell draws a caution notice above the page, in its own `Site Access` landmark:
  "Your site access is paused until …" in UTC, or "with no end date", linking to the paused page.
- **The API.** `createContext` in `src/graphql/context.ts` keeps the session for an operation whose every root field is one
  the signed-in support form uses (`isSupportOperation` in `src/graphql/paused-operations.ts`: `supportDialogState`,
  `mySupportRequests`, `mySupportRequest`, `sendSupportRequest`, `sendSupportMessage`, `resolveMySupportRequest`). Any
  other operation, a fragment at the root, or a document that does not parse runs with no session and `accessPause` set, so a
  public field answers as signed out and the rest answer `ACCESS_PAUSED` with `pausedUntil`.
- **Support time-outs.** A paused user who is also timed out still reaches the support pages and reads their requests and
  threads; only the send is refused, by the time-out, with its own sentence.
- **The terms gate.** `requireSession()` does not send a paused account to `/account/terms`: the API refuses
  `agreeToTerms` while the pause stands, so the acceptance page could only send it back to the paused page, and an
  account that has not agreed to the current terms would never reach its support pages.

The paused page's address carries nothing: the page reads the pause itself. A keeper impersonating a paused user is shown all of this as the user is
(`claude-docs/design-decisions/m15.52-site-access-pause.md`, "An impersonation shows what the paused user sees").

**The paused page.** `/access-paused` is public in the proxy (`src/proxy.ts`), since the proxy reads a paused session as
signed out, and it sits outside the app shell and is not indexed. It reads the viewer's own standing pause through
`getShellSession()`, as the shell does: a dated pause names its end with `LocalTime`, the format the site prints an end in,
and an open-ended one says it has no end date. A visitor with no session is sent to `/sign-in`, and a session with no pause
standing, lifted or ended, to `/`. Its Support link is a `SupportLink`, so it opens the Support dialog over the page as the
footer's does; a paused account sends from it signed in. The page has no account menu, so it also links "your requests" to
`/account/support` itself. It reads the viewer's standing support time-out through `getMySupportTimeout`, skipped for an
unverified account, whose support reads refuse it. With one standing, the page drops that paragraph and its Support link,
since the dialog could send nothing, and says instead "You cannot send a support request until …", in `LocalTime`'s long
form, or with no end "You cannot send a support request: you are timed out with no end date.", then "You can still read your requests.", with "read your requests" linking
to `/account/support`. It also links to the compendium, which it reads as any signed-out visitor.

**Ending.** A dated pause ends by itself once `until` passes, with no write, and a lift stamps `lifted_at` and `lifted_by`.
Either way the next request of a session signed in while paused reaches the whole site.
**In the user modal.** The People page's user modal has a Site Access section (`claude-docs/components/user-detail.md`)
where a keeper sets a pause, lifts the one that stands, and reads the earlier ones with who set and who lifted each. It is
absent on the primary keeper and on the admin's own account. The history is read through `listUserAccessPauses`, a
keyset page newest first, which GraphQL serves as the paged `userAccessPauses` query for site keepers.

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
- **`databaseHooks.user.create.after`** is the sign-up's second write, under the
  same exemption: it inserts a `viewer` `workspace_members` row for the new user in
  the demo coven, stamped by the user as their own row is, with `invited_by`
  null. It finds the coven through `findDemoWorkspace` and does nothing where
  there is none (the `minimal` scenario). It never throws: a failed insert is
  logged with the user id and the demo coven seed's backfill seats the account
  at its next run. It does not touch `canCreateWorkspace`.
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

## Invitation cards (M15.17–M15.19)

An invitation card is a printed QR code that admits one signed-in account. It is a row in `invitations`
with `kind = 'card'`: no email, workspace or role, a `batch_id` shared by the batch it was minted in, and
only the token's hash. Accepting a card follows the invitation-token rules in CLAUDE.md: the link is
`/i/<token>`, and nothing but the mint ever holds the token.

- **Who may.** Only a site keeper. Every service in `src/modules/identity/services/invitation-cards.ts`
  opens with `assertSiteAdmin`, so a curator, a practitioner and a steward are refused by direct call, and the
  GraphQL fields add `authScopes: { admin: true }` over that. The admin page calls
  `requireAdminSession()`, which answers a curator with the styled not-authorized page.
- **Minting.** `createInvitationCards(sheets, expiresAt, beta, note)` makes twelve cards per sheet in one transaction under
  one `batch_id`, at most `MAX_SHEETS_PER_BATCH` (41 sheets, 492 cards), with an expiry in the future and an optional note (trimmed, at most 500 characters, shown on the batch row). `beta` marks every card of the batch as
  minted for beta testers (`invitations.beta`); it is written at minting and never changed, and a CHECK refuses it on any row
  that is not a card. The
  mutation returns each token once, in that response; no query or type but `MintedInvitationCards.tokens`
  has a token, hash or link field, and a test fails if one appears.
- **Revoking.** `revokeInvitationCardBatch(batchId)` sets `revoked_at` on the batch's pending cards only; a
  card already accepted stays accepted. A single card is never revoked on its own.
- **Listing.** `invitationCardBatches` pages one row per batch (minted, expiry, beta, cards, accepted, pending),
  counted in SQL. The Invitation Cards tab at `/keepers/invitation-cards` shows it; the QR codes cannot be
  redrawn from it.
- **Card sign-ups.** `cardArrivals` pages every accepted card with the account, the date and the covens that
  account owns (read as a keeper may read anyone's memberships). `cardArrivalsCsv` returns the same as
  CSV text (Account, Email, Accepted On, Batch, Beta as Yes or No, Covens Owned), with a leading apostrophe on any cell a spreadsheet
  would read as a formula. The Card Sign-Ups tab at `/keepers/card-sign-ups` offers it as a download.
- **One card per account.** An account that has accepted a card is refused a second, with the reason
  `used-another-card`, and the second card stays pending for someone else. The service checks it, and the accept
  statement holds it in SQL too, so a call that skips the service still stamps nothing. The account that accepted
  _this_ card is still told `used-by-you`. The refusal records no card attempt, as the card is still pending.
- **The landing page.** `/i/<token>` shows a welcome above the accept panel while the card is pending (not
  accepted, revoked or expired), and a beta tester's section under it when the batch is beta. It reads
  `liveCardOf(token)`, which takes no session, as the visitor holds only the card, and answers only whether the
  card is live and whether it is beta; any other token, an address invitation's included, gets the panel alone.
- **Refused opens.** When a signed-in, verified account opens a card link that is refused as revoked,
  expired or already accepted by another account, the refused panel sends `recordCardAttempt(token)`
  and the service writes one row per card, account and reason, counting repeats
  ([`db/invitations.md`](../db/invitations.md), "Card attempts"). The mutation takes the token alone;
  the account comes from the session. A signed-out visitor, an unverified account, an unknown token,
  a pending card and the account that accepted the card record nothing, and the signed-out page reads
  nothing of the link beyond the landing page's `liveCardOf`. `invitationCardAttempts(batchId)` lists a batch's refused opens and
  `InvitationCardBatch.refusedOpens` counts them; both are admin only, like every card field.

The component is described in [`components/admin-cards.md`](../components/admin-cards.md).

### Claiming signed-out support requests (M15.48)

A signed-out support send makes no account and no session: the request is written as the seeded signed-out sender account with its `sender_email`. When an account gains a session or verifies its email, every request whose `sender_email` matches the verified address moves to it, with the sender's replies and any time-out bound to that address; an unverified account claims nothing. Record: `design-decisions/m15.48-mailed-link.md`.
