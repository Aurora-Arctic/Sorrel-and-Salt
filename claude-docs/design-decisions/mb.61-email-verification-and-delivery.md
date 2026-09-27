# MB.61 — First-party email verification and email delivery

**Decided 2026-09-26.** Scoping only; nothing here is built. The site will
vouch for an email address itself, by mailing a link, instead of trusting only
what Google or Discord report. That one capability settles four things that
were waiting on it:

- **An address is trusted whichever provider it arrived through.** Facebook and
  Microsoft profiles are pinned unverified on arrival and prove the address by
  mail, so `users.emailVerified` comes to mean exactly one thing: Google,
  Discord, or we vouched.
- **Squatting is resolved for every address**, not only the bootstrap one. An
  unverified account is provisional and expires; it cannot hold an address
  against its owner for longer than one verification window after its last
  mail, or three hours after its sign-up.
- **MB.54 becomes the email page**: prefilled from the provider, editable,
  effective once verified, and the same page changes an email later.
- **Invitations go by email**, workspace and admin alike, accepted only by a
  signed-in account whose verified email matches.

The work is six new tasks, three rewritten in place, and one re-scoped:

- MB.65 builds the mail transport.
- MB.66 turns Better Auth's verification on, audited and session-bound.
- MB.67 makes unverified accounts provisional and sweeps expired ones.
- MB.68 promotes the primary admin at first-party verification.
- MB.54 is re-scoped to build the email page on those.
- MB.69 and MB.70 are the admin invitation's table and behaviour (story 62).
- M7.3, M7.4 and M7.5 are rewritten for delivery by mail.

MB.69 and MB.70 are separate because CLAUDE.md puts a table and the service
that governs it in separate tasks. The approved plan that produced this record
is beside it as [`mb.61-plan.md`](mb.61-plan.md).

## Where things stand

Everything below was read from the installed Better Auth, `1.7.5`, in
`node_modules/better-auth/dist` and `node_modules/@better-auth/core/dist`, not
from its documentation.

- **The verification token is a signed JWT, and it is never stored.**
  `api/routes/email-verification.mjs` signs `{ email, updateTo }` as HS256
  with `BETTER_AUTH_SECRET` and verifies it the same way. Nothing is written to
  the `verifications` table for this flow; that table serves OAuth state and
  password reset. So the token cannot be stored hashed, because it is not
  stored at all, and it cannot be made single-use without a store to mark it
  used in. The default lifetime is 3600 seconds. What bounds replay is the
  endpoint itself: once the row is verified, `/verify-email` returns early and
  writes nothing.
- **The verify write is one column through the adapter.** `/verify-email`
  calls `internalAdapter.updateUserByEmail(email, { emailVerified: true })`,
  bracketed by the `beforeEmailVerification` and `afterEmailVerification`
  options, which receive the full user and the request. The write passes
  through `databaseHooks.user.update.before`, which sees only the patch and
  the endpoint context and may merge columns into the same statement, and
  `update.after`, which runs after commit. There is no `onEmailVerification`
  option in this version.
- **Both endpoints are always mounted.** `/verify-email` and
  `/send-verification-email` exist whatever the configuration; without
  `emailVerification.sendVerificationEmail` they answer
  `VERIFICATION_EMAIL_NOT_ENABLED`.
- **An OAuth sign-up with an unverified address creates the row first.**
  `oauth2/link-account.mjs` inserts `users` and `accounts` with
  `emailVerified` as the provider reported it, then mails when
  `emailVerification.sendOnSignUp ?? provider.requireEmailVerification`, and
  withholds the session only when the provider's own
  `requireEmailVerification` is set, redirecting to
  `?error=email_not_verified`. A failed send is logged and swallowed.
- **The squat happens before any hook of ours runs.** The same file finds the
  existing row by email and, when that row is unverified, refuses to link the
  new provider to it (`accountLinking.requireLocalEmailVerified`, default
  `true`, deprecated with the stated intent of becoming unconditional). The
  browser is sent `?error=account_not_linked`, which `src/lib/sign-in.ts` does
  not map, so the owner sees the generic sentence. `user.validateUserInfo`
  runs only after that refusal, on a successful link or a create, and Better
  Auth's `hooks.before` on the callback runs before the code exchange, so no
  hook of ours ever sees the profile at the moment of refusal.
- **Each provider maps `emailVerified` its own way, and one option overrides
  all of them.** Google reports `email_verified`, Discord `profile.verified`,
  Facebook `false` on the id-token path and `email_verified ?? false` on the
  Graph path, and Microsoft the `email_verified` claim or membership in the
  `verified_primary_email`/`verified_secondary_email` claims of an id token its
  `common` tenant will accept from any tenant, the nOAuth surface MB.60 names.
  Every provider spreads the result of `mapProfileToUser(profile)` after its
  own `emailVerified`, so `mapProfileToUser: () => ({ emailVerified: false })`
  forces a provider unverified, and Better Auth then treats it exactly as it
  treats an address it was never told about.
- **The app configures none of this yet.** `src/lib/auth.ts` has no
  `emailVerification` and no `account.accountLinking`; `changeEmail`, every
  provider's `overrideUserInfoOnSignIn` and `trustedProviders` are pinned off
  (MB.60). The one database hook is `user.create.before`, which stamps the
  row as its own creator. There is no `user.update` hook, so a Better Auth
  write of `emailVerified` today would leave `updated_by` stale while the
  `set_updated_at` trigger moved `updated_at`. `src/services/admin-role.ts`
  decides promotion on the callback's fresh profile, carried from
  `validateUserInfo` in a per-request store.
- **The create hook publishes no GUC.** It stamps `createdBy` and `updatedBy`
  and nothing more: Better Auth's adapter gives it no transaction to publish
  into. CLAUDE.md rule 3 said both identity bootstraps publish
  `app.current_user_id`; only the seed does, and this PR corrects the
  sentence. The seed can because it owns its transaction; the hook cannot.
- **Schema.** `users.email` is not null, lowercase by check constraint, and
  unique among live rows; `users.emailVerified` defaults to `false`.
  `verifications`, `sessions` and `accounts` are Better Auth's adapter tables
  and carry no audit columns. `workspace_invitations` exists from M7.1 with
  `token_hash`, a seven-day default expiry, `accepted_at`, `accepted_by`,
  `revoked_at`, a `viewer | member` check and the six audit columns; no
  invitation service exists, and `/invite/*` is already public in
  `src/proxy.ts`.
- **Nothing sends mail.** No provider, no SMTP, no test inbox anywhere in the
  repo, and the site will send a few messages a week: a verification at
  sign-up, a resend, an invitation.

## The approaches

Four questions, each with the options that were weighed.

### 1. The token

**A. Better Auth's own JWT.** Use the flow as shipped, with `expiresIn` at its
default hour and `autoSignInAfterVerification` off.

- **Cost: it is not stored hashed and it is not single-use.** MB.61 was
  written assuming both, by analogy with an invitation token. The analogy
  does not hold: an invitation grants membership and is redeemed by whoever
  holds it, so its single use matters, whereas this token flips one boolean
  on a row the holder already controls, and a second use finds nothing left
  to flip. A leaked token is worth one hour of the ability to mark an address
  verified, and only for an address the leaker's mail already reached.
- **What it buys:** no second verification system beside Better Auth's, no
  table to audit, and the endpoints that are mounted anyway are the ones in
  use.

**B. Our own `email_verifications` table** with a `randomBytes` token stored
hashed, single-use, expiring, and our own send and verify routes.

- **Failure: it duplicates the mounted flow.** Better Auth's endpoints stay
  reachable whatever we build, so the app carries two verifiers and has to
  keep the second one inert.
- **Failure: it needs a transport rule 1 does not allow.** A verify route of
  our own is a bespoke handler, and rule 1's one exception is Better Auth's
  handshake, not ours.

**Resolved: A.** The task's "stored hashed like an invitation's" is corrected
in `TASKS.md`; invitations keep their hashed tokens.

### 2. The squat

**A. Unverified rows are provisional and expire.** A row whose address was
never verified is swept once it is older than one token lifetime from its
last verification mail, together with its `accounts` and `sessions` rows. The
sweep runs in a Better Auth `hooks.before` on `/callback/:id`, so it fires on
the next sign-in by anyone and needs no scheduler. `requireLocalEmailVerified`
stays at its default.

- **Cost: the owner blocked inside the window waits.** Their verified sign-in
  is refused with `account_not_linked` until the sweep runs, at most one token
  lifetime after the squatter's last mail. The sign-in page shows the one
  generic `account_not_linked` sentence (MB.71) and does not say when to
  retry, since saying so would confirm the address is held.
- **Cost: the sweep is a delete with no session behind it.** It runs in
  `src/lib/auth.ts` beside the create hook and stamps the row as itself. The
  argument is below, under the audit trail.
- **Cost: a slow legitimate user loses the row.** Someone who signs up and
  does not click within the window signs up again. They lose nothing, since
  an unverified row holds nothing, but it is a second mail.

**B. Allow takeover.** `accountLinking.requireLocalEmailVerified: false`, so a
verified provider sign-in claims the unverified row, pinned by a test that
fails when Better Auth makes the flag unconditional.

- **Failure: it is a merge, not an eviction.** The squatter's Facebook account
  stays linked to the row the owner just verified through Google, so the
  squatter can still sign in to it. Better Auth does not unlink on takeover,
  and no hook of ours runs at that point to do it. This is the reason the flag
  is deprecated.
- **Failure: it cuts both ways.** The same flag lets an attacker's verified
  sign-in claim a legitimate user's not-yet-verified row.

**C. Verify before the row exists.** Refuse creation in `validateUserInfo`
when the provider's address is unverified, hold the pending provider identity
in a table of our own with a hashed token, and create the row on the next
sign-in once the mail was followed.

- **Failure: a second provider round trip for every new user**, because the
  OAuth code is consumed by the refused attempt.
- **Failure: it is option 1.B by another door**, with Better Auth's
  verification unused and a pending-identity store to audit.

**Resolved: A.**

### 3. Delivery

Free tiers as read on 2026-09-26, against a site that sends a few messages a
week.

| Provider         | Free tier                                                             | Sending domain                                      | At the cap         | Non-delivery mode                            | Vercel Marketplace                                        |
| ---------------- | --------------------------------------------------------------------- | --------------------------------------------------- | ------------------ | -------------------------------------------- | --------------------------------------------------------- |
| Resend           | 3,000/month, 100/day, one verified domain                             | Required for a from-address of our own              | Pauses; no overage | Test addresses only                          | Native; provisions the key into the project's environment |
| Brevo            | 300/day                                                               | A verified sender; own domain for DKIM              | Stops for the day  | `X-Sib-Sandbox: drop` header, every plan     | None                                                      |
| Postmark         | 100/month, sandbox sends count                                        | Required, plus account approval before sending      | Stops              | Sandbox server that never delivers           | None                                                      |
| Mailgun          | 100/day, one domain, one day of logs                                  | Required; the sandbox domain allows five recipients | Stops              | `o:testmode`                                 | None                                                      |
| Mailtrap Sending | 4,000/month, 150/day, one domain                                      | Required                                            | Stops              | A separate Sandbox product (below)           | None                                                      |
| Amazon SES       | None for an account created after July 2025; $0.10 per thousand after | Required, plus a production-access request          | Pay                | Sandbox delivers to verified recipients only | None                                                      |

- **Resend** is the choice for production. The volume is two orders of
  magnitude above what the site sends, the cap pauses rather than bills, and
  the Marketplace integration puts the key into the project without a copy in
  CI. Its weakness is that it has no sandbox of its own, which the next
  question absorbs.
- **Brevo** is a marketing suite that also has a transactional API: the free
  account carries campaigns, a contacts database, CRM, automation, SMS and
  chat, and a paid add-on to remove its branding from emails, where the
  sources do not settle whether that reaches API-sent mail. Its sandbox header
  was its real advantage, and previews no longer need it.
- **Postmark** has the best deliverability and the cleanest sandbox, at 100
  messages a month with sandbox sends counted and an approval step first.
  Enough for production alone; tight the moment anything else shares it.
- **Mailgun** and **Mailtrap Sending** offer nothing over the three, and
  **SES** has no free tier for a new account and starts every account in a
  sandbox that needs a request to leave.

**Resolved: Resend in production, and nothing else ever sends live.**

### 4. Keeping mail away from real people outside production

Every environment that is not production must be unable to reach a real inbox,
whatever its configuration.

**A. A recipient allowlist with redirect.** In a preview, deliver only to
listed addresses and redirect the rest to the first one.

- **Failure: it still delivers.** A misread list mails a stranger, and the
  guard depends on a variable being right rather than on a transport being
  incapable.

**B. A capture inbox per environment.** Previews send to a service that
accepts mail and never delivers it; local and e2e send to a container that
does the same.

- **Mailtrap Email Sandbox** is the preview inbox: it captures, renders, and
  exposes messages over a REST API, and nothing it receives leaves it. Free
  plan: 50 test emails a month, one sandbox, ten stored messages, one send
  every ten seconds. Staging and every hotfix preview share the one sandbox.
  Fifty a month covers hand-testing; a preview exercised hard hits the cap,
  and then sends fail and are logged, which is the safe direction. Send is
  `POST https://sandbox.api.mailtrap.io/api/send/{sandbox_id}` with an
  `Api-Token` header; messages are read at
  `GET https://mailtrap.io/api/sandboxes/{sandbox_id}/messages?search=` and a
  body at `…/messages/{id}/body.html`.
- **Mailpit** is the local and e2e inbox: the maintained successor to MailHog
  (unmaintained since 2020), a single Go binary with an official Docker
  image, a web UI on `:8025`, and a REST API that both accepts messages
  (`POST /api/v1/send`) and lists them, which is how Playwright reads a mailed
  link. smtp4dev does more and needs the .NET runtime; MailCatcher and Maildev
  are older and less kept.

**C. One SMTP transport everywhere.** Resend, the Mailtrap Sandbox and Mailpit
all accept SMTP, so a single `nodemailer` transport with one `SMTP_URL` per
environment would be one code path.

- **Failure: SMTP from a Vercel function.** Outbound SMTP from a function is
  slow to open and unreliable enough that the user ruled it out. HTTP it is,
  in every environment.

**Resolved: B, over HTTP.** Three HTTP transports in one module, selected by
an explicit variable, with a guard that fails closed (below).

## Decision

**The token is Better Auth's.** A one-hour signed JWT, never stored, replay
bounded by the row already being verified; `autoSignInAfterVerification` is
off, so following the link in a different browser marks the address verified
and issues nothing. A resend issues a new token; the old one stays valid until
it expires, which is the cost of having no store, and it is one hour.

**An unverified account is provisional, and it has a session.** Verification
is offered at sign-up, not required for a session: the row is created, the
mail goes out, the user is signed in. Everything that matters already needs a
verified address: accepting an invitation, being promoted, creating a
workspace. What the session buys is the email page, where a mistyped address
is corrected and a mail resent, which a withheld session would leave with no
page to do that from. The row expires if it is never verified, and a sweep
clears it.

**A squatted address resolves by expiry.** The owner blocked inside the
window is told an unverified account holds the address and when it lapses.

**Delivery is Resend in production, the Mailtrap Sandbox in previews, Mailpit
locally, all over HTTP,** chosen by `MAIL_TRANSPORT` and guarded so that a
wrong value in the wrong environment sends nothing.

**`users.emailVerified` now means one thing.** Facebook and Microsoft are
pinned unverified through `mapProfileToUser`, so a true value was set by
Google, by Discord, or by our own mail. That is what lets the sweep, the
invitation match and the admin invitation key on the column.

**What stays off** stays off: `user.changeEmail` (the email page replaces it),
`overrideUserInfoOnSignIn`, `accountLinking.trustedProviders`, and now
`requireLocalEmailVerified` stays at its default, pinned like the others.

## The token, and who may follow the link

The lifetime is Better Auth's default hour. It is not single-use, and the
section above says why that is acceptable for this write and not for an
invitation's. `autoSignInAfterVerification` is off: the link may be opened
anywhere, and the session it lands in is the one the user already has.

**Verification completes only in a browser holding a session for that
account.** `beforeEmailVerification(user, request)` reads the request's
session and refuses when it is not `user`'s. This is the reviewable claim of
the whole design, and it closes an attack that first-party verification
otherwise opens: an attacker signs up through Microsoft carrying the victim's
address, the victim receives a genuine verification mail from our domain, and
one click would mark the attacker's row as owning the victim's address, after
which the victim's own Google sign-in would link into the attacker's account,
since both sides are now verified. With the session check, the attacker's
click fails because the mail never reached them, and the victim's click fails
because they hold no session for that row. The row then expires. The mail
still says which provider the sign-up used and that an unrequested one can be
ignored.

## What an unverified account can and cannot do

It can sign in, reach the email page, change the address, resend the mail, and
sign out. It cannot accept a workspace or admin invitation, be promoted to
admin, create a workspace, or hold its address past one window without
verifying. It is not listed as verified on `/admin/users`, which MB.52 already
shows.

## Provisional accounts and the sweep

**Expiry is one token lifetime from the last verification mail.** The row's
`updated_at` carries that clock: a sign-up sets it, and a resend from a
session holding the row touches it through `withAudit` before mailing, so
every such send pushes the window forward. A resend from no session, which
Better Auth allows, mails but extends nothing; otherwise anyone could keep a
row alive by posting its address. A row with `emailVerified` false and
`updated_at` older than the lifetime is expired.

**And three hours from sign-up at most, added in MB.67.** A resend from the
row's own session still restarts the hour, so without a cap a squatter
resending hourly would hold the address indefinitely and mail its owner each
time. `created_at` older than three hours expires the row whatever it has
resent. Three hours leaves a real user room to find the mail and resend twice;
a link sent in the last hour can outlive the account, and following it finds
no user.

**Only a row someone can sign in to is provisional.** The sweep also requires
a provider `accounts` row. Seeded rows have none. Without that clause the
sweep reaches the seeded bootstrap admin, which is unverified and referenced
by every seeded category, and the foreign key fails the whole statement on
every callback. Marking the seed verified instead was rejected: a verified
row takes an implicit link from any provider vouching for its address, and
that row is an admin.

**The sweep runs in `hooks.before` on `/callback/:id`.** It runs before the
code exchange, on every OAuth callback, and removes every expired row in one
statement rather than looking for the one that matters, because at that point
nothing knows which address is arriving. A partial index on the predicate
keeps it a cheap no-op almost always. A failure is logged and the sign-in
carries on.

**It hard-deletes, decided in MB.67.** Better Auth resolves a returning
provider account through `accounts` before it looks at `users`, so a live
account row would sign a deleted user back in. It also finds a user by
address with no `deleted_at` filter, so a soft-deleted row would still be
matched and still refuse the owner's link. That settled it: the row goes, and
its `accounts` and `sessions` rows go with it by `ON DELETE CASCADE`. The
delete is the repository's named `deleteProvisionalUsers`, beside
`write.delete`, which rejects a table carrying `deleted_at` by design.

**Nothing is stamped.** This record first had the row stamp itself as
`deleted_by`, the create hook's mirror. A hard delete leaves no row to carry
the stamp, and the sweep has no session to name. It publishes no GUC, for the
reason the create hook cannot. The swept ids go to the server log.

**The blocked owner sees the generic sentence.** `account_not_linked` is
mapped in `src/lib/sign-in.ts` to one sentence, the same whatever the cause:
sign in the way you did before, then add this provider under Account. A
squatted address and a never-vouching provider over an existing row redirect
with the same code, and a sentence naming the squat would confirm the address
is taken (MB.71, [`mb.71-plan.md`](mb.71-plan.md)).

## The audit trail, against rules 1 and 3

**Rule 1.** The mail is sent from Better Auth's `sendVerificationEmail`
option, which runs inside `/api/auth/*` on sign-up and on
`/send-verification-email`. That is the existing transport exception, and it
still carries no application data. The email page's change of address goes
through `/api/graphql` to a service under `withAudit`, as every write does.
The resend touch runs inside `/send-verification-email`, since that is where
the resend happens, and still writes through a service under `withAudit` with
the row's own session.

**Rule 3, the verify write.** `/verify-email` writes `emailVerified` through
Better Auth's adapter, outside `withAudit`. It carries the right stamp anyway:
`beforeEmailVerification` records the user's id in MB.60's per-request store,
and `databaseHooks.user.update.before` merges `updatedBy` from it into the
same `UPDATE`, so the row says who verified it and the trigger says when. The
alternative, re-writing the column through `withAudit` from
`afterEmailVerification`, was rejected: a second transaction to restate one
column, after the first already committed. No GUC is published, for the same
reason the create hook publishes none, and the sentence in CLAUDE.md that said
otherwise is corrected in this PR.

**The two writes outside the wrapper stay two, plus their mirror.** The create
hook and the seed are how an identity comes to exist. The verify write and the
sweep are the same identity completing or lapsing, in the same file. The
verify write is stamped as the user. The sweep deletes the row, so nothing is
left to stamp. They are recorded here, beside the two, as rule 3 asks; neither
is a request with a session that could have been used instead.

## Delivery

One module, `src/lib/mail.ts`, one function, `send({ to, subject, text, html
})`, and three transports over HTTP:

| `MAIL_TRANSPORT`   | Sends to                       | Where                                                      |
| ------------------ | ------------------------------ | ---------------------------------------------------------- |
| `resend`           | Resend's API                   | Production only                                            |
| `mailtrap-sandbox` | The Mailtrap Sandbox send API  | Staging and hotfix previews (`VERCEL_ENV=preview`)         |
| `mailpit`          | Mailpit's `POST /api/v1/send`  | Compose: local dev, the `e2e` service, CI's Playwright job |
| unset              | Nowhere; the message is logged | Vitest, and any environment not configured                 |

**The guard fails closed.** At `VERCEL_ENV=production` the module refuses any
value but `resend`; at `preview` it refuses any value but `mailtrap-sandbox`;
in either case it logs and sends nothing. So a preview cannot be pointed at
Resend by a copied variable, and production cannot be pointed at a sandbox.
Both directions are pinned by test in MB.65.

**Keys are read at send time, never at build.** `RESEND_API_KEY` in
Production, `MAILTRAP_SANDBOX_TOKEN` and `MAILTRAP_SANDBOX_ID` in Preview, all
Sensitive: a deployed function reads them from the platform, so `deploy.yml`'s
pulled-environment assertion does not name them and CI keeps no copy.
Compose's services and CI's Playwright job set `MAIL_TRANSPORT=mailpit` and
`MAILPIT_URL`, no secret; the build leg sets neither, having nothing that
reads them. `MAIL_FROM` is the from-address on Resend's verified
domain.

**A failed send is logged, not thrown.** Better Auth already swallows a send
failure at sign-up; the transport does the same everywhere, so a provider
outage degrades to a resend later rather than a failed sign-in or a failed
invitation. The invitation row stays pending, and the owner can revoke and
re-invite.

**The caps are never reached.** Resend pauses at 3,000 a month or 100 a day;
the Sandbox refuses at 50 a month. Neither is a cost. If the Sandbox cap
proves too tight for staging plus previews, the fallback is a second sandbox
on a paid tier, never delivery.

**The manual steps** are a Resend account and the sending domain's DNS
records, and a Mailtrap account with one sandbox. Both go into `secrets.md`'s
"How to set each row" as numbered steps when MB.65 lands.

## MB.54: the email page

`/account/email`, protected, shows the current address and whether it is
verified. Changing it is a `setEmail` mutation to a service under
`withAudit`, refused when a live verified row already holds the address, and
followed by a resend through Better Auth's server API. The provider's address
is what the page starts with.

**A provider that returns no address gets a placeholder.** `mapProfileToUser`
yields `<providerAccountId>@pending.invalid`: `.invalid` is reserved and can
never be mailed or matched, the row and session exist, and the page asks for
an address instead of the callback dying on `email_not_found`. The placeholder
is provisional like any unverified row and is swept with them. The
"bootstrap address is refused outright" criterion goes: typing it is harmless,
since verifying it is the promotion (MB.68) and only its owner's inbox can.

Reached later from the account, the same page is how an email changes (story
59), which is why `changeEmail` stays off.

## Invitations by email

M7.3 no longer returns a URL. `createInvitation` sends the link to the
invited address through `mail.send` and returns an `Invitation`; the URL
appears in no response and no query. M7.4's dialog takes an address and a
role and confirms that the mail was sent; there is no copy control and no link
is ever rendered. M7.5 accepts only when the signed-in account's
`users.email` matches the invitation's, case-insensitively, with
`emailVerified` true; a match that is not yet verified is pointed at
`/account/email`, and a mismatch is told so without naming the workspace.
§7's `InvitationResult` and its `url` go, and `Invitation`,
`acceptInvitation(token)` and `revokeInvitation(id)` are added, the two
mutations M7.5 and M7.6 always needed and the sketch never named.

## The admin invitation (story 62)

M2.9's option B, now buildable. `admin_invitations` (MB.69) carries `email`,
`tokenHash`, `expiresAt` defaulting to seven days, `acceptedAt`,
`acceptedBy`, `revokedAt`, a `note`, and the six audit columns, indexed on the
hash. `createAdminInvitation(email)` (MB.70) is admin-only, generates the
token with `crypto.randomBytes`, stores only the hash, mails the link and
returns no URL; it is refused for a non-primary admin while changes are
paused. `/admin-invite/[token]` is public, prompts sign-in, and accepts only a
signed-in account whose verified email matches the invitation's. Accepting is
a grant through MB.59's `setUserRole`, so it writes the ledger row naming the
invitation, sets `canCreateWorkspace`, and is refused while paused. Expired,
revoked and already-accepted tokens are rejected with distinct messages, as
M7.7 does for workspace invitations, and pending invitations are listed and
revocable on `/admin/users`.

## Which of MB.60's restrictions each follow-up lifts

- **MB.66** lifts "an address is verified only when a provider says so", for
  every purpose but one: invitations, the email page and the squat all key on
  the column now.
- **MB.67** lifts "have the owner sign in before anyone else can sign up with
  the address" from `secrets.md` and `auth.md`, and closes the squat
  described under "What is simplified" in
  [`m2.9-granting-admin.md`](m2.9-granting-admin.md).
- **MB.68** adds a second way to become the primary admin: verifying the
  bootstrap address by mail, from a session that holds the row. A Microsoft-
  or Facebook-only owner can now be promoted. It is safe only because of the
  session binding above, and it is the one place first-party verification
  touches promotion.
- **Kept:** the sign-in promotion still decides on the callback's fresh
  Google or Discord profile and never on the stored column, so a Microsoft
  sign-in over a verified row still promotes nobody. Microsoft and Facebook
  never vouch at sign-in, and so are never matched to an existing row by
  address: either is added to an account only by an explicit link from a
  signed-in session (MB.71), where the session and the account-id binding
  guard what the vouch would have. The three pinned options stay pinned.

## What is simplified, and the hole it leaves

The squat closes for every address, MB.54 becomes a page rather than a
pre-session interstitial, the two things MB.60 cut from its first draft land
in MB.67, and both invitation flows exist. Notifying admins of a grant becomes
possible and stays unscheduled.

**The hole:** an owner whose address is squatted waits up to one hour, and is
told so. A leaked verification token is good for one hour and one boolean. A
verification mail that a user did not request is refused when they click it,
which is correct and will read as a broken link; the mail says why.

## Out of scope

- **Notifying existing admins of a grant.** Possible now; not scheduled.
- **Rate-limiting resends** beyond what Better Auth does. The email page's
  resend is a mutation like any other, and a few mails a week never meets a
  cap.
- **A mail log table.** Resend and the Sandbox keep their own logs; nothing
  here reads them.
- **Email and password sign-in**, still §13's, and DMARC beyond what Resend's
  domain setup asks for.
- **A scheduler.** The sweep rides on the next callback; a cron for it is a
  second access path for a query that fires anyway.

## The follow-up

MB.65 through MB.70, written into `TASKS.md` with their acceptance criteria;
M7.3, M7.4 and M7.5 rewritten in place; MB.54 re-scoped; story 62 added to
§11's acceptance file and §7 corrected.

- **MB.65, MB.66, MB.67 and MB.68** land in Wave 6, in that order, between
  MB.61 and MB.54. The transport first, since verification has nothing to
  send with; verification before the sweep, since the sweep keys on the
  column and the resend clock; promotion last, since it is one hook on top.
  MB.54 follows them because its page is built on the session and the resend
  they provide. It then moved to the end of Wave 7, after MB.43: its
  `setEmail` mutation needs M3.1's `/api/graphql` and M3.10's `User` type,
  and rule 1 allows it no other transport.
- **MB.69 and MB.70** follow MB.63 in Wave 8: the admin invitation is a grant
  through MB.59's service under MB.63's pause, and its table lands alone
  first. Two tasks because CLAUDE.md puts a table and the service that
  governs it in separate tasks.
- **M7.3, M7.4 and M7.5** keep their ids and sizes in Wave 10, and M7.3 now
  depends on MB.65.
