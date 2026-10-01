## Admin bootstrap and the self-created user (M2.3, MB.60)

DESIGN.md §5: the account matching `ADMIN_BOOTSTRAP_EMAIL`
(`claude-docs/secrets.md`) is the **primary admin**. Everyone else gets the
column defaults (`role: 'user'`, `canCreateWorkspace: false`) on sign-up.

### Promotion at sign-in, from Google or Discord only (MB.60)

The primary admin is promoted at a **sign-in**, not when the account is
created, and only when that sign-in's provider vouches for the address:

- **Google and Discord qualify; Microsoft and Facebook never do.** Google
  marks an address verified only for a domain its owner has proved to Google,
  and Discord only for one it has mailed a code to. Facebook never reports
  verified in Better Auth's mapping. Microsoft is excluded on purpose: with
  `tenantId: 'common'`, an attacker's own Entra tenant can issue an id token
  carrying any `email` and `email_verified` claim (the 2023 "nOAuth"
  surface). First-party verification lets them in another way: the address
  is also promoted when its owner verifies it by mail, from a session holding
  that row ("Promotion at first-party verification" below).
- **The decision uses the provider's fresh profile at that callback**, never
  the stored `users.emailVerified`. A row our own mail has marked verified
  still promotes nobody at a later Microsoft sign-in. So nothing that later sets the column can widen who
  qualifies. The profile must also carry the account's own address: a linked
  Google account whose address has since moved vouches for the new one, not
  this one.
- **Match is case-insensitive**, and at most one live row can match:
  `users_email_lower_case` (migration 0019) holds every address to lower
  case, so the raw-column unique index cannot admit two rows differing by
  case alone. Better Auth lowercases on every write; the constraint is for a
  row written by hand.
- **An already-admin user is not rewritten**, and an address the variable
  does not name is never promoted. With the variable unset (`next dev`,
  Vitest), nobody is.
- **A refused match signs in as an ordinary user.** The reason goes to the
  server log as `primary admin not promoted: user <id> (<reason>)`. It uses
  the id, never the address, because a sign-in screen should not reveal that
  an address is special.

**How it is wired** (`src/lib/auth.ts`, `src/modules/identity/services/admin-role.ts`):

- The after-callback hook (`hooks.after`, matching `/callback/:id`) has
  `ctx.context.newSession.user` loaded, so it costs no query. But that is
  the **stored** row. The fresh profile is seen only by
  `user.validateUserInfo`, which Better Auth calls with it on sign-up, link
  and sign-in alike.
- `validateUserInfo` never refuses. It records `{ providerId, email,
emailVerified }` into a Better Auth request state
  (`defineRequestState` from `@better-auth/core/context`). That is an
  `AsyncLocalStorage` store scoped to one request, so nothing carries
  between sign-ins. The after hook reads it back. `@better-auth/core` is a
  declared dependency, at `better-auth`'s own version, so npm dedupes the two
  to one copy.
- The hook builds an ordinary `Session` from the row it holds and calls
  `promotePrimaryAdmin`. That writes `role: 'admin'` through
  `withAudit`, stamped as the user themselves, with
  `write.updateById(users, …)`. So CLAUDE.md rule 3's identity bootstraps
  stay two; the create-time promotion that was one of them is gone. The role
  write is the one MB.59's grant and revoke will share, adding the ledger row.
- **Changing the variable** promotes the new address at its next qualifying
  sign-in or verification, even if that account already exists. The previous primary admin
  keeps `role: 'admin'` and simply stops being protected (MB.59). This is
  also the recovery path if the primary admin loses their OAuth account.

### Promotion at first-party verification (MB.68)

The second way to become the primary admin: **follow the verification link
our own mail sent to the bootstrap address, from a browser signed in to that
account.** Our mail vouches for the address the way Google or Discord would,
so a Microsoft- or Facebook-only owner is promoted too
([`design-decisions/mb.61-email-verification-and-delivery.md`](../design-decisions/mb.61-email-verification-and-delivery.md)).

- **It is safe only because verification is session-bound.**
  `beforeEmailVerification` refuses a link followed from no session or from
  another user's ("First-party verification" below), so the promotion runs
  only for someone signed in to the row, who received the mail at the
  address. Without that binding, a stranger's sign-up carrying the bootstrap
  address would become admin the moment its owner clicked a mail they never
  asked for.
- **`afterEmailVerification` promotes only the row the check admitted.**
  Better Auth also calls it on a change-email link, which skips
  `beforeEmailVerification` and needs no session. `changeEmail` is off, so
  no such link is minted, but the hook still requires the per-request
  acting-user id that only `beforeEmailVerification` sets on this endpoint,
  so a stray one verifies and promotes nobody.
- **It calls `promotePrimaryAdminAtVerification`**, which checks only the
  address and the current role, then makes the same `withAudit` write as the
  sign-in promotion, stamped as the user. There is no profile to check: the
  verification is the vouch. It runs once, on the write that flips
  `emailVerified`; a second use of the link finds the row verified and calls
  no hook. An already-verified row is promoted at a Google or Discord sign-in,
  or not at all.
- **The sign-in rule is untouched.** The callback still decides on the fresh
  Google or Discord profile, never the stored column, so a Microsoft sign-in
  over a row our mail has verified still promotes nobody. Verification is an
  event, not a state the sign-in reads.
- **No ledger row yet.** MB.59 adds a `bootstrap` row to the shared role
  write once MB.58's table exists, and so to both promotions at once.

**Three Better Auth options stay off, pinned by `tests/lib/auth.test.ts`.**
Each would let the address on an account change under the primary admin and
move the protection to whoever holds it now:

- `user.changeEmail.enabled` — set `false` explicitly. An email changes
  through MB.54's verified flow.
- `overrideUserInfoOnSignIn` on every provider — on, a sign-in rewrites
  the stored email from the provider's profile.
- `account.accountLinking.trustedProviders` — a trusted provider skips the
  verified-email check when linking.

Two linking options are pinned beside them (MB.71):
`accountLinking.allowDifferentEmails` on and `allowUnlinkingAll` off. Neither
is read at sign-in; "Linking a second provider" below has why.

**A squat lasts three hours at most (MB.67).** An unverified
sign-up carrying the address, made before the owner's first sign-in or after a
database reset, makes Better Auth refuse to link the owner's verified sign-in
to it (`requireLocalEmailVerified`), and the owner sees the generic
`account_not_linked` sentence. The row is provisional: one verification
window after its last mail, and three hours after its sign-up whatever it
resends, the next OAuth callback deletes it and the owner's sign-in lands in a
fresh account. "Provisional accounts" below has the shape.

### First-party verification (MB.66)

The site vouches for an address itself by mailing a link, so
`users.emailVerified` means one thing: **Google, Discord or our own mail
said so.** The argument is
[`design-decisions/mb.61-email-verification-and-delivery.md`](../design-decisions/mb.61-email-verification-and-delivery.md);
this is the shape.

- **Facebook and Microsoft arrive unverified**, whatever they report: their
  `mapProfileToUser` answers `emailVerified: false`, spread after the
  provider's own mapping. Google and Discord keep theirs. The one exception is
  the callback of an explicit link, where every provider vouches ("Linking a
  second provider" below); it writes nothing to the row.
- **Offered, never required for a session.** `emailVerification.sendOnSignUp`
  is on, so an OAuth sign-up whose address is unverified is created, mailed
  and signed in. No provider sets `requireEmailVerification`; what needs a
  verified address checks the column. `requireLocalEmailVerified` stays at
  its default, so a provider cannot link into an unverified row: the owner of
  a squatted address is refused with `account_not_linked` until the squatting
  row lapses (below).
- **The token is Better Auth's**: an HS256 JWT signed with
  `BETTER_AUTH_SECRET`, `expiresIn: 3600`, never stored and not single-use.
  A second use finds the row verified and writes nothing.
  `autoSignInAfterVerification` is off, so the link never issues a session.
- **Only from a session holding that row.** `beforeEmailVerification`
  reads the request's session and refuses unless it is the row's own. With
  the link's `callbackURL` present it redirects there with
  `?error=SIGN_IN_TO_VERIFY`, the same way Better Auth's own refusals on the
  endpoint do; without it, `403`. Without the check, a stranger's sign-up
  carrying your address would be verified by your click on a mail you never
  asked for, and your own verified sign-in would then link into their row.
- **The write is stamped.** `/verify-email` updates `emailVerified` through
  Better Auth's adapter, outside `withAudit`. `beforeEmailVerification`
  records the user's id in a per-request store, and
  `databaseHooks.user.update.before` merges `updatedBy` from it into the
  same `UPDATE`; the trigger sets `updated_at`. `validateUserInfo` records
  the id the same way on a sign-in or link, which is when Better Auth flips
  the column for a provider that vouches later, and the hook falls back to the
  endpoint's session (`/update-user`). A write with neither is left
  unstamped rather than refused. No GUC is published, as for the create hook.
- **The mail** is sent through `src/lib/mail.ts` from
  `sendVerificationEmail`, and names the providers linked to the account so
  a reader can tell whether they signed up at all. The template is
  `src/emails/verify-email.tsx` ([`email.md`](../email.md)).

### Linking a second provider (MB.71)

A signed-in user adds another provider from `/account`, and from then on
either one signs in to the same account. Story 1; the scoping is
[`design-decisions/mb.71-plan.md`](../design-decisions/mb.71-plan.md).

**Signing in cannot do it, and never will.** Better Auth's implicit link at
sign-in attaches an unknown provider account to the row holding its email
only when the _provider_ vouches for the address and the row is verified.
Microsoft never vouches: with `tenantId: 'common'`, any Entra tenant can mint
an id token carrying any `email` (nOAuth), so trusting it would let such a
token sign in as any verified row, the primary admin's included. Verifying
the row fixes the wrong half. A Microsoft or Facebook sign-in over an existing
row is refused with `account_not_linked`, and stays refused.

**An explicit link from a session does.** Better Auth's `/link-social`:

- **It starts under a session.** `/link-social` answers 401 without one,
  and writes `link: { userId, email }` into the OAuth state from that
  session. The request body cannot name the user: `link` is spread after
  any client `additionalData`, and whichever session carries the callback
  does not matter either. Both are asserted.
- **The callback's link branch creates the `accounts` row** and redirects to
  `/account`, or to `/account?error=<code>`. It issues no session, so the
  after-hook, the promotion and the email-page redirect never run, and with
  `updateUserInfoOnLink` off it writes nothing to `users`: the row keeps the
  address it verified, which invitations and the email page key on.
- **Afterwards the provider signs in by its account id.** Better Auth
  resolves `(providerId, accountId)` before any email lookup, so the linked
  account's address claim is never consulted again and nOAuth cannot reach
  it. The primary admin who signed up through Discord and linked Microsoft
  signs in through either, still admin.

**Inside a link every provider vouches.** The link branch refuses a
provider that does not vouch (`unable_to_link_account`), and the pin above
would refuse Microsoft and Facebook every time. `vouchWhenLinking` in
`src/lib/auth.ts` answers `emailVerified: true` from all four mappers when
Better Auth's `getOAuthState()` carries `link`, which only a flow
`/link-social` began can. On every sign-in it is absent and each provider
keeps its own answer, so the takeover surface is unchanged. Inside the link the
value feeds Better Auth's gate alone; the guards that matter are the session
that started the flow and the account-id binding after it. Google and Discord
are included so that a Discord account with no verified address can be added
too. `validateUserInfo` records no promotion profile on an explicit link,
since the vouch was lent. It tells an explicit link from an implicit one by
the state, not by `source.action`: Better Auth names both `link-account`, and
the implicit one at sign-in must still reach promotion.

**Different addresses are allowed.** `allowDifferentEmails` is on, because
the Discord address and the Microsoft address are usually different
mailboxes. Better Auth reads it only in the two link branches, never at
sign-in. The row's own address is untouched. After an unlink, a sign-in
through that provider carrying the row's address is refused again. One
carrying some other address creates a new account, as any first sign-in does.

**Removing one.** Better Auth's `/unlink-account` takes the `accounts`
row's own id, and refuses another user's row (`ACCOUNT_NOT_FOUND`).
`allowUnlinkingAll` stays off, so it refuses the last one
(`FAILED_TO_UNLINK_LAST_ACCOUNT`) and a user is never left with no way in.
The endpoint also wants a session younger than Better Auth's `freshAge`, a
day (`SESSION_NOT_FRESH`); the page says to sign in again. Removal
hard-deletes the `accounts` row, which is Better Auth's table and outside
rule 4, and leaves `users` alone.

**The page.** `src/app/account/page.tsx` calls `requireSession()`, so an
unverified account never reaches it and stays on the email page. Better Auth
itself would link to an unverified row. The page reads `linkedAccounts()`
(`src/lib/request-session.ts`, Better Auth's `listUserAccounts` with the
request headers) and renders `SignInMethods`
([`components/sign-in-methods.md`](../components/sign-in-methods.md)). A link's
`?error=` goes through `linkErrorMessage` in `src/lib/sign-in.ts`, and an
unlink refusal through `unlinkErrorMessage`. The page and the email page link
to each other; the email page offers the way only to a verified account.

**The sign-in page's side.** `account_not_linked` has one sentence: sign in
the way you did before, then add this provider under Account ("Provisional
accounts" below). At a sign-in, `unable_to_link_account` means only that
writing the account row failed, and gets the plain retry sentence. The
link-only codes (`email_does_not_match`,
`account_already_linked_to_different_user`) land on `/account` and are
`linkErrorMessage`'s.

### Provisional accounts (MB.67)

An unverified account cannot hold an address against its owner for longer
than a verification link lives. The argument is
[`design-decisions/mb.61-email-verification-and-delivery.md`](../design-decisions/mb.61-email-verification-and-delivery.md),
"Provisional accounts and the sweep"; this is the shape.

- **What is provisional.** A `users` row with `emailVerified` false that
  holds at least one provider `accounts` row. It has lapsed once its
  `updated_at` is older than `VERIFICATION_LIFETIME_SECONDS` (3600, the same
  constant as the link's `expiresIn`), or its `created_at` is older than
  `PROVISIONAL_CAP_SECONDS` (three hours). Both are measured by the
  database's `now()`, since the database writes both columns.
- **Why a cap.** Each resend from the squatter's own session restarts the
  hour and mails the owner. Without the cap, a squatter resending hourly
  would hold the address for as long as they kept it up. With it, a real
  user has three hours from sign-up to follow a link, and resending does not
  extend that. A link sent in the cap's last hour can outlive the account;
  following it finds no user, and signing in again starts a fresh account.
- **What restarts the window.** A sign-up sets it. Every verification mail
  sent for the row's own account — the sign-up mail, a resend through
  `/send-verification-email` from a session holding the row, or the email
  page's change request — calls `recordVerificationSent` in
  `src/modules/identity/services/email.ts`, a `withAudit` update stamped as
  that user that sets `verification_sent_at` and so, through the trigger,
  `updated_at`, before the mail goes out. A resend from no session still
  refused outright — `requireOwnResend`, a `hooks.before` on
  `/send-verification-email`, answers 401 unless the session holds the
  address posted — so nobody can mail someone else, or keep a row alive by
  posting its address. Any other write to the row touches `updated_at` too.
  None of these move `created_at`, so none of them move the cap.
- **The sweep.** `hooks.before` on `/callback/:id` deletes every lapsed row
  in one statement, before the code exchange, so a lapsed row holding the
  arriving address is gone before Better Auth looks it up. Its `accounts`
  and `sessions` rows go with it by `ON DELETE CASCADE`, so the squatter's
  cookie signs nobody in and its provider account resolves to nothing. Two
  partial indexes, `users_provisional_updated_at_idx` and
  `users_provisional_created_at_idx`, hold only unverified rows, one for each
  half of the predicate, which keeps the usual empty sweep cheap. The swept ids go to the
  server log at `info`.
- **A failed sweep never fails a sign-in.** It is logged at `error` and the
  callback carries on. One lapsed row that another row references makes the
  whole statement fail, because every audit foreign key is `NO ACTION`.
  Nothing in v1 lets an unverified account write beyond its own row, so this
  needs a bug or a hand edit.
- **Hard delete, outside `withAudit`.** Better Auth finds a user by address
  without our `deleted_at` filter, so a tombstone would go on blocking the
  owner. The row never verified, so it holds nothing worth keeping, and no
  row survives to carry a stamp. The delete is the repository's one named
  `deleteProvisionalUsers`, since `write.delete` rejects a table carrying
  `deleted_at` by design.
- **Seeded rows are never swept.** They hold no `accounts` row, so nobody
  can sign in to them. The bootstrap admin stays unverified on purpose. A
  verified row would take an implicit link from any provider vouching for
  its address, and that row is an admin.
- **The refusal.** `account_not_linked` is one sentence in
  `src/lib/sign-in.ts`, the same whatever the cause: sign in the way you did
  before, then add this provider under Account. A squatted address and a
  provider that never vouches over an existing row share the code, and naming
  either would confirm the address is taken (MB.71).
- **A change never unverifies a row.** An established account asking for a
  new address keeps its verified row until the new one is proven ("The email
  page" below); marking it unverified would make it older than the cap and
  swept on the next callback.

### The email page (MB.54)

`/account/email`, protected, is where an account's address is set and
changed: prefilled from the provider, editable, and counting only once
proved. Stories 58 and 59; the plan is
[`design-decisions/mb.54-plan.md`](../design-decisions/mb.54-plan.md), and the
component is [`components/email-form.md`](../components/email-form.md).

- **One rule: an address becomes the account's at verification, never
  before.** `setEmail(session, email, sender, next?)` in
  `src/modules/identity/services/email.ts` writes nothing to `users.email`.
  It normalises and validates the address (`ValidationError` on `email`),
  refuses one a live _verified_ account holds — a provisional holder lapses
  first — stamps the row as mailed (`recordVerificationSent`, which is also
  what restarts a provisional caller's window), and asks the sender to mail
  the new address a change link. The row's own, still-unverified address is
  mailed again instead; verified, there is nothing to do. Either way `next`
  is handed to the sender as given, for the link's landing. The criterion this
  replaced, "marks the row unverified", would have put an account older than
  the cap under the sweep.
- **One verification mail a minute per account.** `users.verification_sent_at`
  is set by every mail sent for the row's own account, and `setEmail` refuses
  the next within `RESEND_COOLDOWN_SECONDS` with a `VALIDATION` error on
  `email` naming the seconds left, so the mutation cannot fill an inbox.
  Better Auth's `sendVerificationEmail` hook reads the same clock through
  `verificationWaitFor` and sends nothing inside it, which covers the resend
  path; a direct post to `/send-verification-email` reaches the hook only
  from the row's own session (`requireOwnResend`, above). The update hook
  clears the clock in the write that sets `emailVerified`: the mail was
  answered, so the next one — a change from a verified account — is not held
  back by it. The page hands the form the seconds left, so a sign-up that
  lands on it sees the countdown from the start rather than a refusal on its
  first submit ([`components/email-form.md`](../components/email-form.md)).
- **The change link is Better Auth's own.** `src/lib/email-verification.ts`
  mints `/verify-email`'s change token — `createEmailVerificationToken` with
  `updateTo` and `requestType: 'change-email-verification'` — under the same
  secret and the request's own base URL (`resolveBaseURL`, so a preview host
  links to itself), and sends `verify-email.tsx` with `purpose: 'change'`.
  Following it, `/verify-email` swaps `email` and sets `emailVerified` in one
  adapter write, stamped by the update hook. `user.changeEmail` stays off:
  this replaces it, and nothing on `/api/auth` is added.
- **Every link lands on the confirmed view, carrying where the account was
  going** (MB.111). Better Auth would land a sign-up's link where the sign-in
  asked to go; the `sendVerificationEmail` hook rewrites the link's
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
  it, so a mailed link never names another site — one that would is dropped,
  and the link lands as it would with none. A sign-up that asked for no
  return path gives none either: the hook reads `NO_RETURN_PATH` off the
  OAuth state rather than the `callbackURL` standing in for it, so its link
  lands on `/account/email?verified`, and an explicit `/coven` is carried
  like any other `next` (MB.113).
- **A refusal keeps the rest of the landing.** `refuseVerification` drops the
  flag before appending `?error=`, so the page never reads a refusal as a
  confirmation, and keeps `next`, so a link sent again from there still
  carries it. Better Auth's own refusals — an expired or broken token — append
  to the landing verbatim, flag and all; the page reads any `?error=` as a
  refusal.
- **Gated before the endpoint.** Better Auth's change branch calls no
  `beforeEmailVerification` and, given no session, mints one for whoever
  opened the link. `gateEmailChange`, a `hooks.before` on `/verify-email` in
  `src/lib/auth.ts`, decodes the token's claims (not verified: it only ever
  refuses, and the endpoint verifies the signature after), refuses unless the
  session holds the row named by `email` (`?error=SIGN_IN_TO_VERIFY`, or
  403 with no `callbackURL`), runs the provisional sweep, refuses while
  another live row holds `updateTo` (`?error=EMAIL_TAKEN`, which the unique
  index would otherwise 500 on), and records the acting user so the write is
  stamped and `afterEmailVerification` runs — so a change to the bootstrap
  address, verified from the owner's session, promotes (MB.68).
- **A link opened signed out goes to the sign-in page.** Both gates send a
  browser with no session at all to `SIGN_IN_TO_VERIFY_PATH`
  (`/sign-in?next=%2Faccount%2Femail&error=sign_in_to_verify`), whose sentence
  says to sign in and open the link again — the token is still good, since
  the gate refused before the endpoint saw it. Nothing from the link travels:
  not the token, not the address, not the link's own `next`. The sign-in's
  `next` is the fixed email page, so signing in with the right account lands
  there with no error to explain away. Only a browser signed in as someone
  else is sent to the email page with `?error=SIGN_IN_TO_VERIFY`: it is
  signed in, so the page can tell it which account to use. Signed out, the email page itself is unreachable —
  `requireSession()` would have bounced it to sign-in with the error in the
  return path, which is the confusion this avoids.
- **The sender comes through the GraphQL context.** A service may not import
  `auth`, and `auth.ts` imports the identity module, so the Better Auth side
  is `src/lib/email-verification.ts`'s `emailVerificationSender(request)`,
  built per request in `src/graphql/context.ts` and passed to the service by
  the `setEmail` resolver — the way loaders are. `resend` calls
  `auth.api.sendVerificationEmail` with the request's own headers, so the
  existing hook restarts the window and mails; `requestChange` mints and
  sends as above. Each takes the `next` `setEmail` was given and lands its
  link at `verifiedLanding(next)`. `auth` is imported at call time there,
  since the route is built at `NODE_ENV=production` in its tests.
- **A provider that shared no address gets a placeholder.** `orPlaceholder`
  in `socialProviders()` maps a profile with no email to
  `<providerId>-<providerAccountId>@pending.invalid`, `emailVerified: false`:
  `.invalid` is reserved (RFC 2606), so nothing can receive it and no
  invitation can match it. The sign-up mail is skipped for it and `mail.send`
  refuses any `.invalid` recipient as the backstop. It is provisional like
  any unverified row. `email_not_found` no longer occurs, and its sentence
  in `src/lib/sign-in.ts` is gone.
- **An unverified sign-in lands on the email page.** The `hooks.after` on the
  callback replaces the endpoint's redirect with
  `/account/email?next=<where it was going>` — bare `/account/email` when the
  sign-in asked for no return path — whenever the session's row is unverified —
  a Facebook or Microsoft address, a Google or Discord one the provider did not
  vouch for, or the placeholder — on every sign-in, not only sign-up, since a
  provisional account can do nothing else. The endpoint's cookies stay: Better
  Auth merges a hook's `Location` over its own and appends cookies. A verified
  sign-in lands where it asked, or with no return path on its role's landing
  (["Route protection"](route-protection.md)).
- **The page.** `src/app/account/email/page.tsx` calls `requireSession()`
  and `getMe`, passes `''` for a placeholder, `next` through
  `safeReturnPath`, the session role's `postSignInLanding` as `landing`,
  which Continue takes when there is no `next` — `/admin` for an admin,
  the primary admin a followed link has just promoted included, since the
  page reads the role after the link's write — `?error=` through `src/lib/account-email.ts`'s
  `verifyErrorMessage` — one sentence per code Better Auth or the gate
  appends, never the code — and the seconds left on the mail clock. `EmailForm`
  has two views: `?verified` on a verified row is the confirmed one, the
  address and Continue with nothing to edit; otherwise the field, prefilled
  and always editable, which is how any account changes its address later.
  Its success message names the typed address, since the row's is unchanged
  until the link is followed. Below the form, a verified account gets a link to
  `/account` ("Linking a second provider" above).
- **No other page shows an unverified account anything.** `requireSession()`
  sends a session whose row is unverified to `/account/email?next=<its own
path>` from every page but that one (`isEmailPage`, exact on the pathname),
  so the after-hook's landing is not the only way there: a bookmark, a
  back button or a typed URL all end on the email page until the address is
  proved. `/api/graphql` is not gated the same way — the context reads the
  session and the services refuse what a provisional account may not do,
  which is everything but `me` and `setEmail`.
- **Tests.** `tests/modules/identity/services/email.test.ts` (the service,
  with a fake sender), `tests/modules/identity/graphql/set-email.test.ts`
  (the mutation's `next` reaching the sender), `tests/db/email-change.test.ts`
  (the whole round trip through Better Auth's endpoints, including that an
  aged verified account survives the sweep before and after a change, and
  the change and resend links' landings), `tests/db/email-verification.test.ts`
  (the sign-up link's landing and its refusals), `tests/lib/account-email.test.ts`
  (`verifiedLanding` and `returnPathOf`), `tests/lib/auth.test.ts` (the
  placeholder mapping), `tests/app/account/email/page.test.tsx` (where
  Continue goes, by `next` or by role), `tests/db/sign-in-landing.test.ts`
  (the callback's landing, the email page's and the sign-up link's, by role
  and by return path), and `tests/acceptance/08-email-and-admin.test.ts`
  (stories 58 and 59).

### Granting a second admin — decided, not built (M2.9)

[`design-decisions/m2.9-granting-admin.md`](../design-decisions/m2.9-granting-admin.md)
carries the argument.

- **The primary admin** cannot be revoked or deleted by anyone, itself
  included (MB.59). The UI calls it "Primary admin", and its refusal is in
  plain language that names no variable.
- **Every other admin** is granted and revoked by an admin from
  `/admin/users`, verified or not (MB.59). A grant also sets
  `canCreateWorkspace`. A revoke that would leave zero admins is refused, as a
  fallback for the gap after the variable changes, and the primary admin can
  pause granting and revoking for every other admin through a `site_settings`
  row (MB.62, MB.63).
- **Inviting an admin by email** is MB.69 and MB.70 (story 62): the
  invitation names an address, the link is mailed to it, and only a signed-in
  account whose verified email matches can accept. Accepting is a grant, so it
  writes the ledger row, sets `canCreateWorkspace`, and is refused while
  changes are paused.
- **The ledger.** Each change is appended to `admin_role_changes` (MB.58),
  because the next update to the row overwrites `users.updated_by`.
- **MB.53.** Better Auth's `admin` plugin mounts `set-role`, `update-user`
  and `remove-user` alongside impersonation. MB.53 therefore allows only the
  two impersonation endpoints.
- **MB.61** decided first-party verification
  ([`design-decisions/mb.61-email-verification-and-delivery.md`](../design-decisions/mb.61-email-verification-and-delivery.md)):
  MB.65 builds the mail transport, MB.66 turns Better Auth's verification on,
  MB.67 makes unverified accounts provisional, MB.68 promotes the primary
  admin at verification (above), and MB.54, re-scoped to follow them, is the email
  page where a user sets or changes their address.

Until MB.58 and MB.59 land, a second admin is an `UPDATE` in `psql`.

### The self-created user

- **Why sign-up can't go through `withAudit(session, fn)`.** CLAUDE.md rule 3
  says every write does; OAuth sign-up is the one write that can't, because
  there's no session yet — the write _is_ how one comes to exist. This is the
  same "no third access path" exception `/api/auth/*` already is (see ["The one
  exception to the GraphQL-only rule"](graphql-only-exception.md)), one level
  deeper: a write Better Auth's own create-user flow performs directly against
  the adapter, with no service function in between to call `withAudit`. The
  promotion above is not such a write: by the callback's after hook the user is
  authenticated.
- **`databaseHooks.user.create.before`** (`src/lib/auth.ts`) does the audit
  stamping, and nothing else:
  - Generates a `uuid` itself (`crypto.randomUUID()`) rather than letting
    Postgres's column default assign one, so `createdBy`/`updatedBy` (NOT
    NULL, no database default) can reference it before the row exists —
    `INSERT INTO users (id, created_by, updated_by) VALUES ($1, $1, $1)`,
    the exact self-satisfying pattern MB.5 documents for the seed
    bootstrap row, applied generally: a self-created account is its own
    creator. `forceAllowId` (Better Auth's own `createWithHooks`) is what
    lets a hook-supplied id override the adapter's default id generation.
  - Leaves `role` and `canCreateWorkspace` absent from the returned data,
    so Postgres's own column defaults apply — not duplicated as a second
    `'user'`/`false` literal in application code. It never sets `role`,
    whatever the address.
- **`user.additionalFields`** registers `role`, `canCreateWorkspace`,
  `createdBy`, `updatedBy` with the core Better Auth user model — without
  this, the adapter silently drops any key in the hook's returned data
  that isn't a known field (verified by reading `@better-auth/core`'s
  `transformInput`, which iterates `schema[model].fields` and skips
  anything else). All four carry `input: false`, so no client request can
  set them directly — the hook is the only path, which is what makes
  "Nothing in the OAuth flow sets the flag" and "No API or UI path grants
  admin" actually enforced rather than just unimplemented.
  `createdBy`/`updatedBy` also carry `returned: false` to keep raw audit
  ids out of session/user API responses. `deletedAt`/`deletedBy` are not
  registered at all — nothing before this point in the app soft-deletes a
  user through Better Auth, so there's nothing for it to default or omit.
- **No `user.fields` mapping.** `name`/`image` stay Better Auth's own
  column names — a `displayName`/`avatarUrl` rename was tried and reverted
  (see the ["Tables" section](tables.md)) since it bought nothing but a
  `user.fields` config entry to maintain.
