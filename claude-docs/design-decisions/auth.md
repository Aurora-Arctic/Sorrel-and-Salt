# Auth decisions

How people sign in and what they may do once in: sign-in methods, site and coven roles, invitations, access pauses and the privilege ledger.

## Granting and revoking admin

> **2026-10-10:** The admin role ledger below ("What the audit trail records", built by MB.58) is superseded by `user_privilege_changes`, one ledger for every privilege, written by a trigger on `users` with the route the writer declares, and append-only by the database (MB.194, MB.195; (see "One privilege ledger, written by the database")). MB.196 removed the code that named the old table and MB.197 drops it. What this record says about the ledger is history.

**Decided 2026-09-24.** Scoping only; nothing here is built. There are two
kinds of admin, both holding the same `role`:

- **The primary keeper** is the account whose email matches
  `ADMIN_BOOTSTRAP_EMAIL`, promoted by a verified Google or Discord sign-in.
  It cannot be revoked or deleted by anyone, including itself. Changing who it
  is means changing the variable and redeploying.
- **Every other keeper** is granted by an existing keeper from MB.52's
  `/admin/users`, and any keeper can revoke one.

Every change is appended to its own ledger. The work is four tasks, and four
new user stories (58–61) in DESIGN.md §10:

- MB.60 fixes the bootstrap promotion.
- MB.58 adds the ledger table.
- MB.59 adds granting and revoking.
- MB.61 scopes first-party email verification, which does not block the other
  three but changes several things around them (see "Email verification").

MB.58 and MB.59 are separate because CLAUDE.md puts a table and the service
that governs it in separate tasks.

### Where things stand

`users.role` is `user | admin`. The only thing that sets it is
`src/lib/auth.ts`'s sign-up hook, which promotes a new user whose email
matches `ADMIN_BOOTSTRAP_EMAIL`, compared case-insensitively. The seed's
bootstrap user is written straight to the database. Four properties of that
hook, all describing the code as it stands today and none of them kept, bound
what follows:

- **Today it runs on create only.** Changing the variable later promotes
  nobody who already has an account, so today the variable can name the first
  admin and nothing after that, and a second keeper means an `UPDATE` in
  `psql`. After this decision a second keeper is made by the first from
  `/admin/users`; the variable names only the primary keeper.
- **It matches the email string and ignores `emailVerified`.** Discord maps
  `emailVerified` from `profile.verified`, and Facebook always reports `false`
  (`@better-auth/core/dist/social-providers/`). Until the real owner has an
  account, whoever first signs up carrying that address is made admin. That
  includes an address typed into MB.54's form. On a freshly reset database the
  gap opens again.
- **An unverified account squatting the address locks the real owner out.**
  Better Auth links a new provider to an existing user by email only if the
  existing row is verified (`accountLinking.requireLocalEmailVerified`
  defaults to `true`, `better-auth/dist/oauth2/link-account.mjs`). So once an
  unverified account holds the address, the owner's verified Google sign-in is
  refused with `account_not_linked`, and nobody is ever promoted. This is a
  denial of the primary keeper, not just a wrong promotion. MB.60 fixes the
  promotion; the squat waits for MB.61 (see "What is simplified"). MB.67
  closed it: an unverified account lapses one verification window after its
  last mail, and three hours after sign-up at most.
- **`role` is read on every request.** M2.7's `getSession` asks Better Auth,
  which reads the `users` row, and `session.cookieCache` is not configured. A
  revocation therefore takes effect on the revoked admin's next request.
  Turning the cookie cache on would open a window as long as its TTL, so MB.59
  pins the current behaviour with a test.

### Decision

A is the everyday path now, B follows email verification (below), and C is
not built. A wins because the
surfaces it needs are already scheduled, and because its main failure, a
compromised admin minting another, is no better under B or C. Every option
lets someone holding an admin session act as that keeper. Two things limit the
damage:

- admin is a narrow role, with no workspace access (DESIGN.md §5, asserted by
  M6.6);
- the primary keeper is out of reach, so they can always revoke whoever was
  wrongly made admin.

The ledger is what brings misuse to light.

**The trust root is the variable.** Whoever can set `ADMIN_BOOTSTRAP_EMAIL`
on the Vercel project chooses the primary keeper. That is already true of
`DATABASE_URL`, which grants everything; this adds no new power.

### The primary keeper

**Who it is.** The live keeper whose email matches `ADMIN_BOOTSTRAP_EMAIL`,
compared case-insensitively. It is read from the variable at the time of each
check, not stored on the row. So the protection always follows whatever the
variable currently names, and changing it needs no migration and no data fix.
Better Auth lowercases every email it writes and looks up, so at most one live
row can match; MB.60's test asserts that, since the partial unique index is on
the raw column and a hand-inserted mixed-case row would otherwise make two.

**How it becomes admin (MB.60).**

- **Promotion happens at sign-in, not only when the account is created.**
  After every OAuth callback, a user whose email matches, who is still `user`,
  and whose sign-in just came through a provider that vouches for the address
  is promoted.
- **Only Google and Discord vouch for an address.** Google marks an email
  verified only for a domain its owner has proved to Google, and Discord only
  for an address it has mailed a code to. Facebook never reports an address as
  verified in Better Auth's mapping, so it can never promote. Microsoft is
  excluded deliberately: with `tenantId: 'common'`, an attacker's own Entra
  tenant can issue an id token carrying any `email`, and Better Auth reads
  `email_verified` and the `verified_*_email` claims off that token
  (`microsoft-entra-id.mjs`). Those claims are meant to be Microsoft's own,
  but this is the surface the 2023 "nOAuth" attack used, and the safe default
  is not to rely on it. The decision is made on the provider's fresh profile at
  the callback, not on the stored `users.emailVerified`, so a later feature
  that sets that column (MB.61) cannot widen who qualifies.
- **The address can still be squatted until MB.61's follow-ups land.**
  Refusing to create an account holding the address unverified would close it
  today, and was in MB.60's first draft; it came out because first-party
  verification settles squatting for every address, not one, and lands before
  launch. What that leaves open is stated under "What is simplified". MB.67 closed
  it: the squatting row lapses one verification window after its last mail,
  and three hours after sign-up at most.
- **A non-qualifying match** (Microsoft, Facebook, or a Google/Discord
  profile arriving unverified) on an existing account signs in as an ordinary
  user. The reason goes to the server log, with the user id and not the
  address, because a sign-in screen should not reveal that an address is
  special.
- **Verification is required here and only here.** A grant through A does not
  check it. What the granting admin is trusting is the OAuth account behind the
  row, not the address on it, so `/admin/users` shows each user's linked
  providers and whether the email is verified (MB.52), and confirming who
  someone is before granting them admin is the granting admin's job.
- **One address is one account, and that account can be both.** Site Keeper is
  a column on the account; workspace roles are rows in `workspace_members`,
  and the two are independent (DESIGN.md §5). So the same account can be a
  site keeper and a steward, practitioner or observer of any number of workspaces at
  once. What admin never does is add workspace access: a keeper who is also a
  member reads and writes that workspace as the member they are, and nothing
  else. `users_email_unique` holds one live row per email and Better Auth
  lowercases on every write and lookup, so an address cannot have two
  accounts, one keeper and one not; it has one account that several providers
  can be linked to, verified or not as a whole. Better Auth marks the row
  verified the first time a verified provider links to it.

**It costs nothing per request.** The check runs in Better Auth's
after-callback hook, where `ctx.context.newSession.user` is already loaded.
That makes it one comparison per sign-in and no query. Sessions last days, so
it runs a few times per user per week. It writes only on the one sign-in that
promotes. Better Auth's session-create hook would be the other place to put
it, but it receives only a `userId`, so it would cost one extra lookup per
sign-in. `newSession.user` is the stored row, though, not the fresh profile;
as built (MB.60), `user.validateUserInfo`, which Better Auth calls with the
fresh profile on sign-up, link and sign-in, records it in a per-request store
for the after hook to read, still with no query.

**The promotion writes through `withAudit`, with no new exemption.** At the
callback the user is authenticated, so the hook builds an ordinary `Session`
from the row it already holds and calls the same service MB.59 builds, stamped
as the user. CLAUDE.md rule 3's two identity bootstraps stay two; the
create-time promotion that used one of them goes away.

**It cannot be revoked or deleted, by anyone, including itself.**

- **The service** refuses with an explaining `Forbidden`.
- **On `/admin/users`** the row carries a "Primary admin" label. The revoke
  control stays visible but `aria-disabled`, with the reason written beside it
  in plain language, naming no variable: _"This is the primary keeper and can't
  be removed. Changing who the primary keeper is takes a change to the site's
  configuration."_ A user who tries anyway is told the same thing. The service
  refusal carries the same wording. How to make that change (the variable and
  the redeploy) lives in `../auth/README.md`, not in the UI. "Owner" is not used, because
  it is already a workspace role.
- **Future deletion paths:** v1 has no path that deletes a user. Any path
  added later that soft-deletes a `users` row must refuse the primary keeper
  too.

**Changing the variable demotes the old primary keeper to an ordinary admin
and does not revoke them.** They keep `role: 'admin'`. Because protection
follows the variable, they simply become revocable like any other keeper. The
new address is promoted, and becomes the protected admin, at its first
qualifying sign-in. This is also the recovery path if the primary keeper loses
their OAuth account.

**The last keeper is normally the primary keeper, and a count guards the rest.**
While the primary keeper exists, revoking any other keeper always succeeds and
cannot leave zero keepers. But between changing the variable and the new
address's first qualifying sign-in, nobody is protected, and if the new
address can only sign in through Microsoft or Facebook, nobody ever will be.
So the revoke service also refuses, with an explaining `Forbidden`, any change
that would leave zero live keepers. It locks the live keeper rows `for update`
before counting, so two keepers revoking each other at the same moment cannot
both succeed. The count is a fallback: with the primary keeper in place it is
never reached, and MB.59's test proves that by removing the primary keeper from
the fixture.

**A deployed environment refuses to start without the variable.** Everything
above holds only while it is set, so MB.60 makes the app refuse to start
without it in production, staging and every hotfix preview. The check keys on
`NODE_ENV=production`, as `BETTER_AUTH_SECRET`'s does, and not on
`VERCEL_ENV`. `next build` and `next start` always run at
`NODE_ENV=production`, so this single condition covers all three deploy
targets. It also covers CI's `build` leg and the Playwright runs, which set a
fixed placeholder on the reserved `.invalid` domain, the same way they set
`BETTER_AUTH_SECRET`. `next dev` and Vitest are exempt, and an unset variable
there promotes nobody.

**Three Better Auth options stay off, pinned by test**, because each would let
the local email change under the primary keeper and move the protection to
someone else:

- `user.changeEmail.enabled` (default off; `update-user` already rejects
  `email`). It stays off for good: MB.54's verified flow is how an email
  changes.
- `overrideUserInfoOnSignIn` on every provider (default off; on, a sign-in
  rewrites the local email from the provider's profile).
- `accountLinking.trustedProviders` (default empty; a trusted provider skips
  the verification check when linking).

**The seed's bootstrap user is not a keeper.** Every seed, including the
category and form seed that runs on staging and production, needs a creator
row, because every `created_by` is `NOT NULL` and references `users.id`. That
row (`admin@seed.sorrelandsalt.com`) cannot be removed, but nothing needs it to
be an admin: no OAuth account is attached, it is unverified, so linking to it
is refused, and nobody can sign in as it. MB.58 demotes it to `role: 'user'`
as a named rider, so it neither appears on `/admin/users` as a revocable admin
nor gets a ledger row. `minimal` becomes one system user and one user.

### Granting

- A keeper may grant admin to any live user, verified or not. Granting to an
  existing keeper is refused with a message and writes no ledger row.
- The grantee must already have an account. There is no promotion in advance
  by email; that would be B.
- Admin carries no workspace access and implies no membership, so a grant
  never touches `workspace_members`. Memberships the person already holds are
  untouched too; they go on being a member where they were a member.
- **Keeper changes can be paused (MB.62, MB.63).** The primary keeper can
  switch granting and revoking off for every other keeper, so a rogue admin
  can neither mint keepers nor remove the good ones while the switch is on.
  The primary keeper itself is exempt, so it can clean up without unpausing;
  the exemption protects nothing a rogue admin could reach, since the
  primary keeper is set by the variable and cannot be revoked. The switch
  lives in the database, since a variable would need a redeploy to flip and
  a column on the primary admin's own row would move with the variable.
  This record had it as a one-row `site_settings` table; MB.62 built it as
  `admin_role_change_pauses`, one row per pause, because the one row could
  not be seeded on a fresh database
  (see "The admin-role-change pause is a ledger, not a settings row"). Only the primary keeper
  may pause or resume, each pause records who began and who ended it, and a
  change refused while paused says so and names no one.
  _Amended 2026-10-11:_ Pause now asks first, in a modal saying whom it
  stops. MB.63 had it act at once, since pausing takes nothing away and
  Resume is the way back; the owner chose a confirmation at MB.115's
  sign-off instead. Resume still acts at once.
- Granting admin also sets `canCreateWorkspace` to `true`, in the same
  write. The flag is what lets anyone create a workspace, keepers included,
  and a CHECK on `users` refuses a keeper without it, so the gate reads the
  flag alone (MB.177;
  (see "Every admin holds `canCreateWorkspace`")).
  This record had keepers create regardless of the flag, set only so the row
  would state what the person may do. Revoking admin leaves it, as revoking
  the flag itself leaves existing workspaces (M5.8).

### Revoking

- Any keeper may revoke any keeper except the primary keeper, including
  themselves. There is no hierarchy beyond the primary keeper.
- A revoke that would leave zero live keepers is refused (see above).
- Revoking does not delete anything the admin wrote. Rows are stamped with a
  person, not a role.
- The revoked user's next request sees `role: 'user'`. Their sessions stay
  valid, since they are still a user; only `/admin` and the admin mutations
  close to them.
- `canCreateWorkspace` is not cleared; the grant was a vouching too.

### What the audit trail records

`users.updated_by` and `updated_at` are not enough, because the next update to
the row overwrites them. M5.8's approval control is the first such update. So
each change to `role` appends a row to `admin_role_changes`:

| Column             | Records                                                          |
| ------------------ | ---------------------------------------------------------------- |
| `user_id`          | The user whose role changed                                      |
| `change`           | `bootstrap`, `grant` or `revoke`                                 |
| `note`             | Optional free text                                               |
| `created_by`       | Who made the change, from the session, never the request body    |
| `created_at`       | When                                                             |
| rest of the spread | Carried like every table; nothing in v1 updates or deletes a row |

- **Append-only by the repository, not by grant.** `sorrel` owns its tables,
  so a `REVOKE UPDATE` would not bind it. The repository exposes an insert and
  a read, and nothing else.
- **`bootstrap` rows** are written by the sign-in promotion and the
  verification promotion (MB.59 adds this to the role write MB.60 and MB.68
  share), through the same service and `withAudit`, stamped as the promoted
  user. The `standard` seed writes one for fixture E, and MB.58's
  migration backfills one for each existing keeper.
- **This is not the v2 edit history.** Edit history records every column of
  every content table. This ledger records a single privilege, and it would
  stay the readable account of why even once the v2 trigger records that
  `role` changed.
- **Readable by keepers only**, on `/admin/users`, through a service that
  asserts admin.

### Out of scope

- **Approving a second keeper (two-person grants).** Worth revisiting once
  keepers are no longer people who know each other.
- **Notifying existing keepers of a grant.** There is no email delivery in v1;
  MB.61 may change that.
- **M5.8's `canCreateWorkspace` provenance** has the same overwrite problem.
  That is M5.8's question.
- **Squatting other users' addresses**, for the same reason as the primary
  admin's: an unverified account holding someone's email locks that person's
  verified sign-in out. MB.67 resolves it for every address: an unverified
  account is provisional and expires one verification window after its last
  mail, and three hours after sign-up at most.

### The follow-up

MB.58 through MB.63, written into `TASKS.md` with their acceptance criteria,
and stories 58–62 in DESIGN.md §10 (58 and 59 for MB.61's follow-ups and
MB.54, 60 and 61 for MB.59, 62 for the admin invitation MB.61's follow-ups
mint; story 4 reworded for email invitations).

- **MB.60** is live the moment MB.12 sets `ADMIN_BOOTSTRAP_EMAIL` in a
  deployed environment, so it lands in Wave 6 before MB.12. It writes no ledger
  row, since the table does not exist yet; MB.59 adds that.
- **MB.61** lands in Wave 6 before MB.54, which waits for its follow-ups.
- **MB.65 through MB.70** are those follow-ups, minted by MB.61's record:
  the mail transport, verification, provisional accounts and promotion at
  verification in Wave 6 ahead of MB.54, and the admin invitation's table and
  behaviour in Wave 8 after MB.63.
- **MB.58 and MB.59** need MB.52's list, M5.7's admin gate and the GraphQL
  layer, so they go in Wave 8 after M5.8.
- **MB.62 and MB.63**, the pause switch's table and behaviour, follow MB.59 in
  Wave 8. Two tasks because CLAUDE.md puts a table and the service that
  governs it in separate tasks. MB.62 made the table a pause ledger rather
  than this record's `site_settings` row
  (see "The admin-role-change pause is a ledger, not a settings row"). Two rejected shapes: an
  `ADMIN_GRANTS_PAUSED` variable, because flipping it would be a redeploy, the
  friction this whole decision exists to remove; and "only the primary keeper
  may grant", which needs no switch but makes the primary keeper the only
  grantor for good.

## Revoking workspace creation, and its ledger

> **2026-10-10:** The workspace-creation ledger below (built by MB.193) is superseded by `user_privilege_changes`, one ledger for every privilege, written by a trigger on `users` with the route the writer declares, and append-only by the database (MB.194, MB.195; (see "One privilege ledger, written by the database")). MB.196 removed the code that named the old table and MB.197 drops it. What this record says about the ledger is history.

**Amends:** DESIGN.md §5 (`users`, "once `true` it stays `true`"), §8 (the
invite gate) and §17's open sign-up row, and CLAUDE.md's invite-gate bullet.
**Mints:** MB.193, the ledger's table task.

### The question

M5.8's entry asked for a keeper to grant and revoke `canCreateWorkspace`, and
for the change to record who made it and when. Two things stood against it:

- **DESIGN.md said the flag never turns off.** §5 had "once `true` it stays
  `true`", §8 "persist once held", and CLAUDE.md repeated it. The entry's
  revoke, and MB.177's criterion refusing a revoke on a keeper, assumed the
  opposite.
- **The row cannot hold the record.** `users.updated_by` and `updated_at` are
  overwritten by the next update to the row: a verified email change, a role
  grant, Better Auth's own writes. M2.9's record named this gap and left it to
  M5.8 ((see "Granting and revoking admin"), "Out of scope").

### Decided

**A keeper may revoke the flag.** Revoking stops the user creating new
workspaces. It touches no workspace they already created: they stay its
owner, since the flag governs creating, not keeping. A keeper's flag cannot
be revoked, because MB.177's CHECK holds every keeper to it; the service
refuses that with an explaining error before the CHECK would, and revoking
admin first is the route. "Once `true` it stays `true`" becomes "it stays
`true` until a keeper revokes it": nothing automatic clears it.

**Every change is a ledger row, in `workspace_creation_changes`** (MB.193).
One row per change to the flag, append-only by the repository, MB.58's shape
for a second privilege. `change` names the route:

| `change`     | Written by                                                      |
| ------------ | --------------------------------------------------------------- |
| `grant`      | a keeper approving a user on `/admin/users` (M5.8)              |
| `revoke`     | a keeper revoking it there (M5.8)                               |
| `invitation` | accepting a workspace invitation, which sets it (M7.5)          |
| `admin`      | being made admin while it was off, since MB.177 sets it (MB.59) |

`created_by` is the actor and `created_at` when, from the session through
`withAudit`, never the request. The ledger is not backfilled: who set a flag
held before it is not known, and a row stamped by guess would be a false
record. A holder with no row predates the ledger.

**The table lands first, alone** (CLAUDE.md, "A table task, then a behaviour
task"), so M5.8 builds on MB.193 and writes its rows in the same transaction
as the flag.

### Rejected

- **The row's audit stamps alone.** Free, and lost on the user's next update.
- **Two columns on `users`, who set the flag and when.** Enough for a flag
  set once, but a revoke and a later grant would overwrite them as the stamps
  are overwritten.
- **A one-way flag, as DESIGN.md had it.** The owner wants an approval made
  in error to be undoable.

### Consequences

- **An invitation re-grants a revoked user.** Accepting a workspace invitation
  sets the flag, so a member can undo a keeper's revoke by inviting the
  person. M7.5 decides whether it should, and writes its `invitation` row
  either way.
- **MB.59's `setUserRole`** writes the `admin` row when a grant turns the flag
  on, in the same transaction as its own ledger row.
- **The approval asks first**, in the user's row, naming them; so does a
  revoke.

## Permission statements over a role rank

**Decided 2026-09-20.** `assertMembership`'s third argument is a permission
request — `{ spell: ['create'] }` — checked against per-role statements built
with better-auth's access-control module, rather than a `minRole` compared
against an ordinal rank.

This supersedes the `assertMembership(session, workspaceId, minRole)` signature
DESIGN.md §8 and CLAUDE.md rule 5 carried until now; both are corrected in the
same PR. What it does **not** change is the `Membership` proof, which is the
substance of M6.3: the brand, the finder convention and the compile assertions
are identical under either signature.

### What was on the table

Ordinal rank was the specification, and it is not a bespoke pattern —
hierarchical RBAC is what GitHub (`read < triage < write < maintain < admin`)
and GitLab (`guest < reporter < … < owner`) do, and `workspace_role` declares
`viewer`, `member`, `owner` in that order precisely so it can be compared.
Against it: CASL, which buys conditional and field-level rules v1 expresses as
SQL predicates instead (rule 7), at the price of a dependency and a second
vocabulary beside the services; and Casbin/OpenFGA/Oso, which are policy
engines for authorization that changes at runtime, where this is three fixed
roles.

### Why statements won

**A rank bakes in the claim that every role sits on one line.** It is true
today. The day it stops being true — a curator who may edit the grimoire but
invite nobody, a billing contact who may do the reverse — every
`assertMembership(…, 'member')` call site silently starts meaning "or anything
ranked above member", including roles whose authors never considered that call.
The failure is quiet and distributed, which is the shape of bug the second
authorization layer exists to make loud.

**The standard tool was already installed.** better-auth exports
`createAccessControl` and `role` from `better-auth/plugins/access`, usable
without the organization plugin MB.30 turned down. So the dependency cost is
zero, which is what decided it against CASL: the statement map is the same
shape either way, and one of them is already in the tree.

**It types the vocabulary.** `newRole` rejects a resource the statements do not
declare, and the request type rejects an action that resource does not carry —
so `{ spell: ['publish'] }` is a compile error rather than a permission nobody
holds and no test misses. A rank has nothing to misspell, but it also has
nothing to say.

### What it costs, stated rather than glossed

**A vocabulary written ahead of most of its services.** TASKS.md's wave
argument is that a rule written before its service tends not to match it, and
five resources × seventeen actions is more rule than Wave 5 has services for.
The mitigation is that the map is derived from invariants already fixed
elsewhere — DESIGN.md §9's routes, "observers write nothing", the members page
being owner-only — and that later milestones extend it in their own PR, the
same way each adopts the proof in its own PR. Where a later service finds the
map wrong, the map is what yields.

**An empty request authorizes vacuously.** `authorize({})` succeeds for every
role, so `assertMembership(session, id, {})` would admit any member to
anything. It throws an `Error` rather than a `Forbidden`: a steward would sail
through it too, so it is a bug in the caller and reads as one. A call meaning
"a member, at all" asks for the read it is about to do.

**Several resources in one request are ANDed**, which is better-auth's default
and the safe reading of "this call needs both". A call wanting either passes
`'OR'` explicitly, and none does yet.

### What it does not cover

The **site role** — `users.role`, `'user' | 'admin'` — is a different axis and
is not in this map. `assertMembership` never reads it, which is what makes "a
site keeper has no access to any workspace's ingredients or grimoire" true by
construction rather than by a branch someone could add. Compendium, category
and form curation is gated on the site role by M5.2 and M5.7; if those adopt
this mechanism they build a **second** access control over site roles, because
merging the two statement maps is how a keeper comes to hold `spell:
['delete']`.

## A site keeper sees which covens a user belongs to

The owner's call: a site keeper may see which covens a user owns or belongs
to, with the role, read-only. A keeper who approves coven creation, revokes
it, grants admin or impersonates someone needs to know what that person
already holds. This record says how far that reaches and where it stops.
DESIGN.md §10 (story 19) and §7 (`User.memberships`) carry the result.

### What story 19 said, and where it was enforced

Story 19 read "As a keeper, have no special access to any workspace's
private data." Three places held it to the letter:

- `membershipsOf` (`src/modules/coven/services/memberships.ts`) answered
  `Forbidden` for any user id but the caller's own, "a site keeper included,
  since a keeper reaches no workspace".
- `User.memberships` in GraphQL resolves through that service, so a keeper's
  `users { … memberships }` failed too (DESIGN.md §7: "the caller's own
  only").
- [`auth/admin-users.md`](../auth/admin-users.md) said `/admin/users` "reads
  nothing below `users` and `accounts`".

`tests/modules/coven/services/memberships.test.ts` pinned the refusal.

### What the owner decided, and why

"Private data" now means a workspace's **contents**: its ingredients, its
grimoire and its members page. Which covens a user holds, and with what
role, is not among them. It is the user's standing on the site, and the
admin is the person who decides what that standing should be (approve
creation, M5.8; revoke it; grant admin, MB.59; impersonate, MB.53). Asking
a keeper to do those blind was the cost of the old reading.

### What stays refused

A keeper still reaches no coven.

- The service hands over a workspace's `id`, `name` and `slug` and nothing
  beneath. No ingredient, spell or member list comes with it.
- The modal links to no `/coven/[slug]`. It would be a 404 to a non-member
  anyway, and a link would suggest otherwise.
- Every workspace-scoped finder still wants a `Membership` proof, which an
  admin cannot build for a coven they are not in
  ([rule 5](../../CLAUDE.md)). Direct-id reads of a coven's ingredients and
  grimoire stay refused, as M6.6 asserts.
- Any caller who is not a site keeper may still ask `membershipsOf` after
  their own id only.

### The mechanism

- `membershipsOf` permits a key when it is the caller's own **or** the
  caller's `session.role === 'admin'`. Any other key is a `Forbidden` in its
  slot. It is still two queries whatever the batch size, and the finder
  already leaves out soft-deleted memberships and workspaces. No SDL change:
  `User.memberships` resolves for a keeper because the service allows it.
- On `/admin/users`, pressing a user's name opens a modal at once (M9.18's
  `RouteModal`) at `?user=<id>`. The page reads the user, their memberships
  and their providers on the server and the modal arrives with the
  navigation, so no GraphQL query is added (rule 1).
  [`auth/admin-users.md`](../auth/admin-users.md), "The user modal (M9.19)".

### The tests that pin each half

- `tests/modules/coven/services/memberships.test.ts`: a keeper is answered
  for anyone, and the precondition is asserted (the admin holds no
  membership in that coven, so the answer could not have come from
  membership); another member asking after someone else is still refused.
- `tests/db/workspace-isolation.test.ts`: one test in which E reads D's
  membership of X and is still refused X's ingredients by direct id. It
  fails if either half changes.
- `tests/modules/identity/graphql/users.test.ts`: a keeper's
  `users { … memberships }` resolves through the loader.
- Page and component tests for the modal, and an e2e test in
  `tests/e2e/admin.spec.ts` tagged `@story-19`.

### What it corrected

Story 19 and the `User` type in DESIGN.md (§10, §7), the notes on keepers in
§8 and the `/admin/users` row in §9, the two keeper lines in CLAUDE.md,
[`auth/admin-users.md`](../auth/admin-users.md), [`../auth/README.md`](../auth/README.md) and
`tests/acceptance/README.md`.

## Invited By on the coven members table

Live home: `claude-docs/db/invitations.md`; the column is `workspace_members.invited_by` in `src/modules/coven/schema/workspaces.ts`.

### Decision

- **The inviter is recorded on the membership when it is written.** A nullable `workspace_members.invited_by` column (a foreign key to `users.id`) is set once, at acceptance, from the stamped invitation's `created_by` (the `InvitationRow` that `write.acceptInvitation` returns), whenever acceptance inserts or revives a membership. The value comes from the database row inside `withAudit`, never from the request. It is not the membership's own `created_by`, which is the person who accepted because acceptance runs under their session.
- **Duplicate invitations:** the one accepted, and only if it seated the member.
- **No backfill.** No production membership came from an invitation when it landed. Seeds and fixtures leave it null unless a test sets it.
- **The members table shows the name in an Invited By cell**, empty when null, read in the page's existing batched `displayNamesOf` call.
- **The migration is expand-only** (a column add plus a foreign key), so it needs no `.ack.md`.

### Why

A user id, not an `invitation_id`: an invitation's `created_by` never changes, so copying it loses nothing, and the read path stays at one column with no join onto a `namedWrites` table and no rule 4 question about soft-deleted invitations.

### Rules out

- Reading the inviter by joining the invitation table at display time.
- An `invitation_id` column on the membership.

## A coven invitation is accepted from the account page as well as from the mail

_The file keeps its first name, "accept from the landing", because the plan, the task entry and other docs link to it. The list started on the landing and moved to the account page the same week; see "Where the list lives"._

_Decided on 2026-10-12 with the owner, from the question "how hard would it be to let a user see invitations in the interface, and would it cause any security risk".

### Context

Until M10.32 an invitation reached its person one way: the mailed link. The row stores only the token's hash, the link appears in no response, and `/invite/[token]` accepts it only for a signed-in account whose verified email matches the row's (M7.5, MB.70). A mail lost to a spam filter left a new account on `/coven` reading that someone must invite them, when someone already had.

### The decision

The account page lists the pending coven invitations addressed to the signed-in account's verified email, each with an Accept, in its Invitations section, and `acceptInvitationById` accepts one by id. M10.34 later added a Decline beside each Accept. The `/coven` landing (M2.8) says how many wait and links there. The mailed link keeps working unchanged. Admin invitations, the site tier, are not listed and cannot be accepted by id.

### Why it is safe enough, and what it gives up

The design already ranks the two gates. DESIGN.md §14 says a link "only proves receipt and can be forwarded", and that binding it to a verified address is what stops it being a bearer token. The verified address is the gate the design relies on; the link is receipt. The list and the by-id accept keep that gate, ANDed in SQL by the same predicate the token write holds: the session's user must hold the invited address, verified, on a live row. So:

- Nothing is copyable: the token still appears in no response, and an id read off a steward's pending list admits only the account the invitation names.
- Nothing is enumerable: every read is filtered by the session's own address, and an id the address does not hold answers `NotFound`, never "different address".
- Nothing new is disclosed: the invitee learns the coven's name, the role and who invited them, which the mail already says (M7.3) and the Accept page already shows after the address check.
- Single use holds: the by-id write matches a pending row only, as the token write does.
- Unverified accounts see nothing: `requireSession()` keeps them on the email page, and the predicate requires the verified flag.

What it gives up is the link's proof of receipt. A verified address proves the mailbox was the person's when it was verified (Google or Discord said so, or our own mail was followed, MB.61); the link proves it still is at invitation time, and nothing re-verifies. An address passed on since, a reassigned work mailbox or a lapsed domain, could accept an invitation meant for its new holder.

**The site tier stays mail-only because of that.** (see "Granting and revoking admin") calls a keeper link "a bearer token for the site's highest privilege" and accepts the risk for covens because "the worst case is one coven's data". The same argument bounds the stale-address case to one coven's seat.

### Where the list lives

_Changed on 2026-10-13, the owner's call, after the first build._ The first build listed the invitations on the `/coven` landing itself. The owner moved the list to `/account`, as a fourth section named Invitations (`id="account-invitations"`, in the page's "On this page" nav). The owner gave no further reason. What follows from the move:

- **The account page holds the list and the Accept.** It is paged with `?after=` and `?before=`, its pager links keep `#account-invitations`, and it is always shown, with the table's empty state when none wait ([`components/received-invitations.md`](../components/received-invitations.md)).
- **The landing keeps a notice, not the list.** When invitations wait, a success notice says "You have N invitations waiting." and links to `/account#account-invitations`. The paragraph for an account that cannot yet create a coven says to accept on the account page or through the mailed link, and that accepting also allows starting a coven of one's own. With none waiting it says an invitation "shows up on your account page". Nothing on the landing sits on a card any more. The landing no longer pages or reads the list; it reads only the count.
- **The shell carries the count.** `viewerOf` reads it for a verified account, with `countReceivedInvitations(session, undefined)`; an unverified account reads 0 and costs no query. It is one count statement per shell page. The account menu shows a dot on the avatar, a red count link to the same section beside Your Account, and a tooltip on the count ([`components/account-menu.md`](../components/account-menu.md)). Accepting refreshes the router, so the count drops at once.
- **The theme switch stays in the bar** at every width (the owner's call, in the same session). MB.7 had moved it into the account menu at a phone's width; that row, its styles and its test are gone.
- **A member who already has a coven can now see the list**, since the account page is not the landing. Declining one was left for a later task, which the owner minted as M10.34 (below).

### What it changes in the rules

- **Two more reads take no proof** (`db/membership-proof.md`, "The reads that take no proof"): the invitee holds no `Membership` yet, as with `findInvitationByToken`, so the session row stands in for the proof. The fix to that list also records `findInvitedCoven`, which M7.5 added without listing it.
- **An inviter's name reaches someone who shares no coven with them** (`auth/display-names.md`). The mail already carries it; the list says no more than the mail, and reads it through a finder scoped to the invitee's own invitations, not through the loader.
- **No GraphQL list query**, following the two existing pending lists: the account page is a server component and reads the service directly. One mutation is added.
- **An impersonating admin sees the impersonated user's invitations**, as MB.53 reproduces what that user would see.

### Left for a later task, now done

A Decline write, so an unwanted invitation can be cleared without joining. The account page already showed a member their pending invitations, but the only thing they could do with one was accept it. The owner minted it as **M10.34** on 2026-10-13, and it is built: a Decline beside each Accept, a nullable `invitations.declined_at`, and the coven's steward seeing the invitation marked declined until they remove it. It is one task rather than a column task then a behaviour task, on the owner's call. How it works is in [`db/invitations.md`](../db/invitations.md), "Declining from the account page".

## A third site role, `curator`

The owner's call: someone should be able to curate the Compendium without
being able to see or change who uses the site. Until now one check,
`role === 'admin'`, opened every admin screen, so curation could not be handed
out without also handing out the People page. This record says how the third
role works and where it stops. DESIGN.md §5 (`users`, the `role` paragraph,
`canCreateWorkspace` and `user_privilege_changes`) carries the result.

### Where things stood

A site account was a `user` or an `admin`. Every admin screen, whether it
edited an ingredient or promoted a person, passed the same check, and the
CHECK on `users` (MB.177) held every keeper to the coven-creation flag. A
reviewer who should only edit the Compendium would have needed the whole
admin role: the user list, impersonation, admin invitations and the right to
make more keepers.

### Decision

- **A third role, `curator`.** It may use every curation screen a keeper can:
  the Compendium, categories and category groups, forms and form groups,
  deities and deity traditions, celestial bodies and zodiac signs, and
  references. It reaches nothing on the People page: the user list, one
  user's details and covens, role changes, granting and revoking coven
  creation, impersonation (as the actor), admin invitations, the pause and
  the privilege ledger. A coven's invitations stay its owner's: a curator
  invites to the covens they own and to no other.
- **Two proofs, not one** (CLAUDE.md rule 5, on the site role).
  `assertCurator` returns a branded `Curator` for a curator or a keeper.
  `SiteAdmin` is a `Curator` plus a second brand, so every keeper proof is a
  curator proof and never the reverse. The compendium-tier writer methods ask
  for a `Curator`; the people-page methods keep asking for a `SiteAdmin`. A
  curator who reaches a people-page method fails to compile, not only at run
  time. `curates(role)` in `src/lib/site-roles.ts` is the one place the
  curating roles are listed, read by `assertCurator`, the GraphQL `curator`
  scope and the shell.
- **The CHECK is widened and renamed.** Migration 0074 adds `curator` to the
  `user_role` and `user_privilege` enums and replaces
  `users_admin_can_create_workspace` with `users_privileged_can_create_workspace`:
  `role = 'user' or can_create_workspace`. Every curator and keeper holds the
  flag, so the coven-creation gate still reads the flag alone
  (see "Every admin holds `canCreateWorkspace`").
  The CHECK names `user`, the one role that may lack the flag, rather than
  `admin` and `curator`: Postgres refuses to use an enum value in the same
  transaction that adds it, and naming `user` also means a later role is held
  to the flag without the CHECK changing again. The drop of the old CHECK has
  its own sidecar, `0074_curator-role.ack.md`.
- **The ledger records each role as its own privilege.** The trigger
  `record_privilege_change()` writes `admin` and `curator` grants and revokes
  separately. User to curator writes a curator grant and a `create_workspace`
  grant. Curator to admin writes a curator revoke and a keeper grant at one
  instant. Curator to user writes a curator revoke alone, because the flag
  stays, as revoking admin leaves it.
- **One Change Role dialog** on the user screen replaces the Promote and
  Revoke pair. It offers every role but the one the user holds, plus the
  optional note, and sends the existing `setUserRole` mutation. Its confirm
  button reads Promote or Demote by the ladder user, curator, admin. A
  curator's role name is bold in the list, as a keeper's is.
- **`setUserRole` keeps its rules.** It stays behind the primary keeper's pause
  and refuses the role the user already holds. Leaving `admin` runs the
  existing revoke guards (the primary keeper and the last keeper). Becoming a
  curator sets the role and the flag in one write. `revokeWorkspaceCreation`
  refuses any role but `user`, since the CHECK would refuse the write anyway.
  Accepting a keeper invitation as a curator makes them a keeper.
- **A keeper can invite a curator as well as a keeper** (the owner's ask,
  2026-10-16, folded into this task). A site-tier invitation names the role
  it grants in a new column, `invitations.site_role`, `curator` or `admin`
  and never `user` (migration 0075, its CHECKs comparing the column as text
  for the reason 0074's does). The invite form offers both, Curator chosen to
  begin with, so that granting the People page is a choice; the mail, the
  Accept page and the pending list name the role. The mutation, the services
  and the mail keep their "admin invitation" names: a keeper is who sends
  one, and renaming them would buy no behaviour. The button that opens the
  form, and the form's title, became **New Invitation** (the owner's choice,
  2026-10-16), since "Invite Admin" no longer says what it sends.
- **An invitation never lowers a role.** The ladder is user, curator, admin
  (`outranks` in `src/lib/site-roles.ts`). One is not sent to an address
  whose account already holds the invited role or a higher one; one that an
  account has outgrown since it was sent is stamped accepted and grants
  nothing, so a keeper who accepts an old curator invitation stays a keeper.
- **The menu hides People; the guards refuse it.** The admin navigation and
  the `/admin` index drop the People section for a curator (`managesPeople`).
  That is only what is shown. Every people-page service and page still
  refuses a curator by itself, and the tests call each by direct id. The
  shell's viewer flag `isAdmin` became `canCurate`.
- **Site roles and coven roles stay independent.** A curator creates covens
  and has the same rights as anyone in their own, owner in the ones they
  create. They get no access to any other coven's Ingredients or Grimoire,
  and `/coven/[slug]` is a 404 to them as a non-member, as it is to a keeper.

### The owner's decisions, 2026-10-16

- **The role is named `curator`, not `editor`.** The task entry, the issue
  title and this file's name were corrected to match.
- **One Change Role dialog**, not a Promote and Revoke pair for each role.
- **Curators land on `/admin`** after sign-in, and the brand link takes them
  there, as for keepers.
- **A seeded fixture F**, a site curator in no workspace, beside E.
- **Curators get no access to the People page at all.** The backlog's "V Fast
  Follow" item, that curators should see some of their collaborators'
  details, is left where it is and no task is minted for it now.

### Decisions taken in the plan

- **The component workshop stays admin-only.** It is not curation, and its
  code already says a wider viewing role is v2.
- **The privilege ledger is admin-only.** It is part of the People page.
- **A curator can be impersonated** like any non-keeper. Better Auth's admin
  plugin only shields targets in its `adminRoles`, which stays `['admin']`,
  and it refuses a curator as the actor because the role holds no permission
  there. A test pins both.

### What it costs

- **A privileged account is no longer exactly "an admin".** Anything that
  asked "is this a site keeper?" to mean "may curate" had to be found and
  moved to `assertCurator`; the ones that mean "may manage people" kept
  `assertSiteAdmin`. A new curation service picks `assertCurator`, a new
  people-page one `assertSiteAdmin`.
- **A former curator keeps the creation flag**, as a former admin does. Taking
  the role away does not take away the right to create covens; a keeper
  revokes that separately.
- **A rollback to the deploy before** meets a role it does not know only on an
  account a keeper has made curator since, and that account still holds the flag.

## One demo coven on every environment

The owner's call. Today a new account can see only the compendium:
`canCreateWorkspace` is `false`, no invitation has arrived, and
`/coven/[slug]` is a 404 to a non-member. A person who signs in sees nothing of
what a coven is for, and staging has no demo data at all. This record says what
the demo coven is and where it stops. DESIGN.md §5 (`workspaces`), §5's
`canCreateWorkspace` paragraph and the seed section carry the result. The
approved plan is [`process.md`, "The demo coven: every account is seated as an observer at sign-up (plan)"](process.md#the-demo-coven-every-account-is-seated-as-an-observer-at-sign-up-plan).

### Decision

- **One coven, "Sorrel & Salt Demo", slug `sorrel-and-salt-demo`, on every
  environment.** It is marked by `workspaces.demo boolean NOT NULL DEFAULT
false` and a partial unique index on `demo WHERE demo AND deleted_at IS NULL`,
  so at most one live demo coven exists. A boolean is not a `kind`: the row is
  still a workspace that takes members, and the "no personal workspaces" rule
  stands. Its id is the constant `DEMO_WORKSPACE_ID` in `src/db/bootstrap.ts`,
  which makes the seed idempotent by id the way the system user is. Code reads
  the column, never the constant.
- **Every account is an observer in it.** The seat is made when the account is
  created, and the seed backfills existing accounts. Observers write nothing, so
  the seat shows a coven without opening anything.
- **The system user and every site keeper hold a steward seat,** so keepers can
  edit the demo by hand. This amends M6.6 for this one coven: a keeper still
  reaches no other workspace, and `assertMembership` still never reads
  `session.role`; the access runs through a real membership row.
- **A user may leave it, and is never re-added.** The existing Leave action
  applies. A left seat is a soft-deleted row, and the seed counts soft-deleted
  rows as existing.
- **The contents are new, seeded reference data.** They are written against the
  real compendium, resolved by formal name, and additive like the vocabularies:
  the seed never overwrites a hand edit.
- **The screens say it is a demo.**

What does not change: the compendium is still the one public surface,
`/coven/[slug]` is still a 404 to a non-member, `canCreateWorkspace` stays
`false` until an invitation or a keeper grant, observers write nothing, and
keepers reach no other workspace.

### Choices inside the decision, and what was rejected

- **A failed sign-up seat does not fail the sign-up.** The seat is inserted in
  a Better Auth `user.create.after` hook that never throws; a failed insert is
  logged and the next seed run's backfill repairs it. Rejected: letting the
  hook throw. Better Auth cannot roll the user row back, so a sign-up that
  half-fails is worse than a missing seat.
- **The seed joins the `demo` scenario and not `standard`.** Fixture users A–G
  would gain a membership and shift every memberships test. Rejected:
  adding it to `standard`. Tests that need the demo coven seed it themselves.
- **A slug clash is refused, never resolved with `-2`.** If another live coven
  already holds `sorrel-and-salt-demo`, the seed throws an error naming it, and an
  admin renames one of the two. Rejected: taking `sorrel-and-salt-demo-2`, which
  would put the demo at a URL nobody can predict and leave a human coven on the
  name. The seed cannot reuse `freeSlug` because that sits in a `server-only`
  service.
- **A keeper who left the demo coven stays out of it.** The seed inserts an
  steward seat only when no row exists for the pair, deleted rows included, so
  an ex-admin's or a leaver's choice is respected until another steward invites
  and promotes them. Rejected: re-seating on every run, which would undo
  Leave.
- **Demoting a keeper sets their seat back to `viewer`; it does not drop the
  seat.** The person is still an account in the coven. Rejected: deleting the
  seat, which would make demotion also a removal.
- **The system user can never be removed or re-roled.** Its steward seat is what
  keeps the last-owner guard from ever binding a keeper.
- **The demo coven cannot be deleted.** `deleteWorkspace` refuses it with an
  explaining error. Renaming is left as it is.
- **The demo coven's notice is a quiet warning, aligned with the content and spanning its full width, its text stopping at the reading measure, and its Demo badge sits at the top right of the overview page's title, and the spell preview pane, which covers the layout, shows the same notice** (M15.15; owner, 2026-10-30).
- **A coven of their own comes before the demo coven.** Amended 2026-10-30 by the owner: `byCovenName` lists the demo coven last, so the landing is the demo coven only when it is the account's only coven.

## An invitation card is a third shape of `invitations`

The owner's call. The site is invite-gated, and an invitation has always named
an address. The owner wants to hand out printed cards: a card carries a code, and
whoever holds it signs in, with any provider and any address, and comes away able
to create their own coven. The approved design canvas is
<https://claude.ai/artifact/7AnDLSLhJFQPDAUKXmRhcy>. This record covers the row
shape only (M15.17). What a card admits is M15.18, and the admin screen that
mints, downloads and revokes them is M15.19.

### What changed

`invitations` gains `kind` (`address` or `card`, default `address`) and a
nullable `batch_id`; `email` becomes nullable; and the two tier CHECKs are
replaced.

- **`invitations_kind_known`** limits `kind` to the two values. `kind` is text
  with a CHECK rather than an enum, so a later kind needs no enum migration.
- **`invitations_kind_shape`**: an `address` row has an email, and a `card` row
  has a null `email`, `workspace_id`, `role` and `site_role`. A card is bound to
  no address, coven or site role, and the database says so.
- **`invitations_tier`** and **`invitations_site_role_tier`** keep today's rule
  for an address row and are skipped for a card, which names neither a tier nor
  a site role.
- **`batch_id`** is the mint a card came from, a plain uuid. A batch has no
  table of its own: it is the set of rows sharing one id, which is all
  "revoke the batch" and "which batch did this account arrive from" need.

Migration `0096_invitation-cards.sql` is expand-only apart from the CHECK swap:
each of the two replaced constraints is dropped and re-added in the same
transaction, so no existing row is unchecked. The sidecar acknowledges that.

### Why a third shape of the same table, not a table of its own

- **One token resolves to one row.** `invitations_token_hash_unique` spans every
  row, so a presented token can never be ambiguous between two tables, and the
  accept path keeps a single lookup.
- **The lifecycle is shared.** Pending, accepted, revoked and expired mean the
  same thing for a card, with the same audit columns and the same dead-link
  order, so the accept predicate, the revoke writer and the expiry clock exist
  once (see "Workspace and admin invitations are one two-tier table").
- **A card's expiry is the end of its printed day in UTC-12.** The stored
  instant is the next day at 12:00 UTC, so the card works through its printed
  day in every zone; the printed day is the stored instant less 36 hours.
  Chosen by the owner on 2026-10-31 over the keeper's zone and over end of day
  UTC, because the zone is not stored and UTC would still cut a card short in
  the Americas.
- **A separate table** would repeat all of that and add a second place for a
  forgotten writer to grant something.

### The token rule is amended

CLAUDE.md said a token "appears in no response and is never copied". That holds
for the address kinds, where the token travels only in the mailed link. A
**card's token is returned once, at minting, to the keeper who minted it**,
because the admin prints it. Only the hash is stored, so it cannot be read back
afterwards, and it appears in no later response. A card token is 16 characters
from a 57-symbol alphabet (M15.18), still hashed and stored as the other kinds
are.

### Left alone

No service, repository writer or resolver changes here; nothing reads `kind`
until M15.18, which adds the `card` value to `user_privilege_route` in its own
migration. Every existing writer inserts an address row, and the column
default makes that so.

### Beta batches and one card per account

- **`invitations.beta`** (`boolean NOT NULL DEFAULT false`) marks a card minted for beta testers. The CHECK `invitations_beta_card_only` refuses it on a row that is not a card. It is written on every card of the batch at minting and never changed.
- **On every row, not on a batches table.** A batch is still the rows sharing one `batch_id`; a flag set once at minting and read with the card needs no table of its own, and the column is additive.
- **One card per account.** An account that has accepted a card is refused a second with `used-another-card`, and the second card stays pending for someone else. The service checks it and the accept statement's card arm adds `NOT EXISTS` an accepted card by the session's account, so a call that skips the service stamps nothing. The account that accepted this card is still told `used-by-you`. The refusal records no card attempt, since the card still admits someone.
- **The landing page reads without a session.** `/i/<token>` shows a welcome while the card is pending, and a beta tester's section when its batch is beta, through `liveCardOf(token)`, which answers only whether the card is live and whether it is beta.
- **Beta and billing** is in DESIGN.md §13, "Subscription billing": a first coven gets one free month, a beta tester's first coven three.

## The invitation mail mints its token in the job step

### The rule

CLAUDE.md rule 5: every workspace-scoped finder and writer takes a `Membership` proof first, and the site tier takes the `SiteAdmin` proof `assertSiteAdmin` returns. Each invitation writer decides the tier from the proof it is handed.

### The exception

`rotateInvitationToken(invitationId)` in `src/db/repository/write.ts` takes no proof. It mints a token with `newToken()` (`crypto.randomBytes(32)`, base64url), writes the token's hash on the invitation through `withAudit` as the System account, and returns the plaintext token with the row. It writes only an invitation that is pending (not accepted, revoked, declined, expired or deleted), bound to an address (never a printed card), and in a live coven or on the site tier. For any other id it writes nothing and returns null.

Only the invitation mail calls it: `invitationMessage` in `src/modules/identity/services/secret-link-mail.ts`, which the secret-link job's step runs. `tests/guards/invitation-token-rotation.test.ts` fails if any other file names it, and if that service calls it more than once.

### Why

The coven and admin invitation mails go through the secret-link job, whose run holds the invitation's id and the origin and never the token, because a run's arguments stay in the job's event log ([`support.md`, "Mail is sent through a retried job"](support.md#mail-is-sent-through-a-retried-job)). Only the token's hash is stored, so the step cannot read the token back: it has to mint one and store its hash. The step holds only the id, so there is no session to prove membership or the site role with. The inviter's proof was checked when the invitation was made, and the rotation changes only the token, on a row that is still pending.

Each attempt mints again, so when the transport refuses a mail and the step is retried, the link in the refused mail stops working and only the newest mailed link works. The token minted at insert, whose hash fills the not-null column, is told to nobody.

### What it proves

- `tests/db/repository/invitation-token-rotation.test.ts`: a pending coven or site invitation gets a fresh token's hash, stamped by the System account; each call gives a new token; an accepted, revoked, declined, expired or deleted invitation, a card, an invitation into a deleted coven and an unknown id are left as they were.
- `tests/workflows/invitation-mail.test.ts`: a mail refused twice is retried, each attempt mails a different token, and only the last one's hash is on the row; an accepted, revoked or expired invitation and a card send nothing and write nothing.

### Options rejected

| Option                                                                                       | Against                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Derive the token from a random value on the row and the server secret, re-signed in the step | Changes the invariant that a token comes from `randomBytes` and only its hash is stored; a rotation of the secret voids every pending invitation                                    |
| Leave both invitation mails tried once                                                       | A refused mail is lost, and the inviter sees no error                                                                                                                               |
| Put the token in the run                                                                     | The token is copied into the event log for as long as its events are kept                                                                                                           |
| A rotation method on `AuditWriter`                                                           | Every `withAudit` caller holds a writer, so any of them could rotate a token; the rotation is instead reached through a context private to `write.ts`, and nothing else can name it |

## What the site access pause closes, and what it decides along the way

M15.52 lets a site keeper pause a user's access to the site, until a time or with no end date, and lift it early.
DESIGN.md §8, "An admin can pause a user's access", carries the rule; [`../auth/admin-bootstrap.md`](../auth/admin-bootstrap.md),
"Pausing a user's access", carries the mechanics. This record carries the choices the task left open, each with its reason.
The owner was away while it was built; the coordinator decided the first one, and the rest were chosen to fit DESIGN.md and
the existing code.

### A user already paused is refused, not re-paused

The coordinator's decision. `pauseUserAccess` on a user with a standing pause answers a validation error,
"This user is already paused; lift the pause first". The repository's writer could replace a standing pause in one step
(DESIGN.md §5, `user_access_pauses`), but the service does not use that: a keeper who pauses a user should see the pause
already there, and changing it is a lift followed by a new pause, two rows on the history. A run-out pause does not stand,
so a new pause over it goes ahead, and the writer lifts the run-out row first as §5 says.

### Every pause needs a note

Amended 2026-11-02, on the owner's call: the owner wants a note required on every site pause, dated or open-ended. As first
built the note was optional, and an empty one was stored as none. A pause shuts a user out of everything but support, so the
next admin to open the user, or to answer their support request, needs the reason on the row. The rule is held three times:

- the GraphQL argument `note` on `pauseUserAccess` is required, and `UserAccessPause.note` is non-null;
- `pauseUserAccess` refuses a missing note, or one blank once trimmed, with a validation error on `note`, "Write a note
  saying why", in the imperative of its sibling sentences ("Choose a time in the future", "Keep the note to 500 characters");
- migration `0122_user-access-pause-note-required` makes `user_access_pauses.note` NOT NULL, with the CHECK
  `user_access_pauses_note_not_blank` (`note ~ '[^[:space:]]'`), so a raw write without a reason fails too.

The migration has no backfill. `user_access_pauses` had reached neither staging nor main, and the owner's dev database held
no pause with a missing note when it was written; any other database with one is a developer's own, reset by `db:reset`.
The panel marks Note required and holds Pause Access until it has text. A coven pause (M15.55) is a different decision, an
owner's rather than a keeper's, and its note stays optional.

### A paused user may sign in to reach support

Amended 2026-11-02, on the owner's call. As first built, a session hook in `src/lib/auth.ts` refused every new session to a
paused account, so a paused user could not sign in at all, and could reach support only through the signed-out form. The
owner asked: "can a user who is paused still access the support form while logged in? They should be able to. If we want
them not to that will be governed by a support timeout." So a paused account now signs in by every method, and the pause
closes everything but support:

- `/support`, `/account/support` and the pages beneath them act as the user, and so does every API call whose root fields
  are all the signed-in support form's (sending a request, reading their own requests and replies, replying, resolving);
- every other signed-in page redirects to `/access-paused`, and every other API call answers
  `ACCESS_PAUSED` with `pausedUntil`;
- the other public pages read the user as signed out, as before;
- a support time-out still refuses the sending, with its own sentence, since whether a paused user may write to support is
  the time-out's to decide.

The session hook and the sign-in panel's turn to the paused page went. Setting a pause still ends every session the user
holds, so a pause takes effect at once, and the user's next sign-in lands on the paused page, through the landing's redirect.

**One check, read once per request.** `sessionStateFromHeaders` in `src/lib/request-session.ts` reads the standing pause for
every session and records it as `accessPause`; the page guards, the shell and the GraphQL context decide from that. The cost
is one more indexed query on every signed-in request, which the hook had avoided by refusing the session instead.

**Which API calls count as support.** `isSupportOperation` in `src/graphql/paused-operations.ts` parses the operation and
allows it only when every root selection is a field on its list, written out as a field. A fragment at the root, a document
that does not parse, or a document with several operations and none named is refused, so the check never has to resolve a
fragment to be sure. The alternative, a scope on each support field that admits a paused session, would have spread the
rule across the schema and let a support field shield a sibling in the same operation.

**The entry and sign-in pages read a paused account as signed in**, since they only send it on to `?next=` or its
landing. Read as signed out, they would offer Sign In to an account that is signed in, and the sign-in page would loop.

**A paused user is told so.** The owner: "A paused user should be able to see that they're paused." AppShell draws a caution
notice above every page a paused user reaches signed in, in its own `Site Access` landmark since the page owns `main`:
"Your site access is paused until …", or "with no end date", linking to `/access-paused`. The shell's viewer for a
paused user carries no coven, curation, creation or invitation, so it offers none of the pages the pause closes, and keeps
the count of their own requests waiting on them. An impersonating admin sees the same notice.

**Where the user lands.** `/` has no shell, so it carries no notice; it only sends the account on. `/access-paused` has no
shell either, and reads the pause itself (below).

### The paused page reads the viewer's own pause

The page first learned the pause's end from `?until=`, written by the redirect, and read nothing from the database, so a
signed-out visitor could learn nothing from it. Once a paused account stayed signed in (option A, above), the owner asked
for the query to go (2026-11-02): the page now reads the viewer's own standing pause through `getShellSession()`, the same
read the shell's notice uses, so it can only ever describe the pause on the session that opens it, and tells a visitor
about no other account. A visitor with no session is sent to `/sign-in`, and a session with no pause standing, lifted or
ended, to `/`, so the page's earlier third case, a pause whose end has passed with a link to Sign In, is gone: an ended
pause is not standing. `accessPausedPath` and the `?until=` parse went with it; the redirects and the shell's notice link to
`ACCESS_PAUSED_PATH`. The proxy still lets `/access-paused` through as public, because it reads a paused session as
signed out and would otherwise send it to sign in.

**The end's format.** The notice, this page and the coven's paused page print a dated end with `LocalTime` (`long`), the
format the keeper's pause panel and the support time-out notice use (the owner's call, 2026-11-02). The server renders it in
UTC and hydration matches that; once hydrated it prints the viewer's own time zone, read as an external store, so the two
renders never mismatch.

**Its Support link opens the dialog.** The owner asked that it open the Support dialog, as the footer's link does, rather than
navigate to `/support`. It is a `SupportLink`, which sets `?support=` on the page's own address; the root layout draws
`SupportDialog` on every page, this one included, so the page needed no change to its frame. The dialog's reads and the
send are support operations, which a paused session makes as itself.

### Ending the sessions is part of the pause's own write

`setUserAccessPause` deletes the user's `sessions` rows in the same transaction as the pause row, inside `withAudit`. A pause
that committed without its session delete would leave the user signed in until the session expired. The rows have no audit
columns and no `deleted_at`, the same as when Better Auth's own sign-out deletes them, so a hard delete is right.

### An impersonation shows what the paused user sees

A keeper may impersonate a paused user, and is shown exactly what that user would see while paused (the owner's rule,
2026-11-02). The impersonation session is read by the same check as the user's own, described above, so the admin reaches
support, is sent to `/access-paused` from every other signed-in page, reads the other public pages signed out under the
notice, and has every other signed-in API call refused with `ACCESS_PAUSED` and `pausedUntil`, through the scope plugin's
`unauthorizedError` and through `sessionOf`.

The impersonation banner is drawn by the root layout, so it stays on `/access-paused` and every public page, and Stop
Impersonating returns the admin to their own session. Once the pause is lifted or runs out, the same impersonation reaches
the normal pages on its next request.

Earlier the same day the owner had the impersonation refused, with the refusal named under Impersonate; that was replaced by
this rule, and the refusal's wording in `impersonationRefusal` went with it.

### Pausing another keeper waits on keeper changes

While the primary keeper has paused keeper changes (MB.62), pausing another keeper is refused for every keeper but the primary
admin, through the same `assertChangesOpen` a revoke of admin uses. That pause exists to stop a rogue admin acting against the
others, and pausing a keeper's access would be another way to do it. Pausing a user or a curator is not affected. Lifting is not
gated: it only restores access.

### Lifting with nothing standing answers NotFound

`liftUserAccessPause` returns the lifted row, so it is non-null in the schema, as the scope registry
(`tests/db/graphql-query-scopes.test.ts`) requires of every keeper write. A user with no standing pause, a run-out one
included, answers `NotFound`, "No pause stands on this user", rather than a quiet success, so the admin is told the lift did
nothing.

### Where the compendium proof sits

The criterion "a paused user still reads `/compendium` as a signed-out visitor" is proved in
`tests/db/access-pause-sign-in.test.ts`: a paused account's new cookie reads as no session through `sessionFromHeaders`, as
`getSession()` does on every public page but support's, and the proxy lets both compendium routes through with it. The
compendium page's own signed-out view is already proved by its page test. M15.53's Playwright spec walks a paused sign-in
into support in a browser.

### Left for M15.53

No GraphQL read of the pause history landed here. M15.53 added it as the paged `userAccessPauses` query on the
keyset finder `findUserAccessPausePage`, with the admin user modal's controls.

### The user is emailed when a pause is set

`pauseUserAccess` takes an `AccessPauseNotifier` (`origin()`) and a required `message`, stored on `user_access_pauses.message` (trimmed, refused when missing or blank, at most 500 characters; the column stays nullable). Once the write's transaction has committed it starts the `accessPauseMail` durable job through `startMailJob`, which mails the user's account address. The email gives the end date as UTC or says there is none, carries the message, and says the user can still sign in to reach `/support`; it never carries the keeper's note, which is for staff only. Its link opens `/support`. A failed send is logged and never thrown, so the pause stands. A refused caller writes and mails nothing, and lifting a pause sends no email.

## How the coven access pause refuses a member, and what it decides along the way

M15.55 lets a coven's owner pause one member's access to that coven, until a time or with no end date, and lift it early.
DESIGN.md §8, "A steward can pause one member's access to their coven", carries the rule, and §5, `workspace_member_pauses`,
the table (M15.54). This record carries the choices the task left open, each with its reason. The owner was away while it
was built; the choices were made to fit DESIGN.md, the site pause before it (see "What the site access pause closes, and what it decides along the way")
and the existing code.

### A new steward-only permission, `member: pause`

`src/lib/access-control.ts` gives the `member` resource a `pause` statement, held by the `owner` role alone. A permission is a
per-role statement, never a rank (`CLAUDE.md` rule 5), so the service asks for `{ member: ['pause'] }` rather than checking for
the steward role. Pausing and lifting both ask for it.

### The pause is read in the same query as the role

`assertMembership` reads the seat through `findWorkspaceSeat(userId, workspaceId)` in `src/db/repository/memberships.ts`. It
is the old role lookup with a left join to `workspace_member_pauses` on a pause that stands: not lifted, not deleted, and with
`until` null or still in the future. It answers `{ role, pause }`, so a member with no pause costs the same one query as
before, and React's `cache()` still dedupes it per render ([`../db/membership-proof.md`](../db/membership-proof.md),
"One lookup per render"). `findWorkspaceRole` now answers that seat's role alone, for the callers that need no pause.

A pause that has run out stops standing the moment `until` passes, with nothing written: the join compares `until` with the
database's clock on every read.

### A paused member is refused with `AccessPaused`, before the permission is checked

`AccessPaused` (`src/lib/errors.ts`) extends `Forbidden` and carries `until`. The GraphQL route sends it with the code
`ACCESS_PAUSED`, the same code a site-paused session's refused calls use, and `pausedUntil` (`src/graphql/errors.ts`), so the
browser can tell a paused member from a stranger and say when the pause ends. A stranger still gets the bare `Forbidden`:
only someone who holds a seat learns the coven is there.

The pause is checked before the permission, so a paused member is told they are paused whatever they asked for, rather than
"your role doesn't allow that" for a write and "paused" for a read.

### The member keeps the seat; every other coven is unaffected

The pause is a row beside the membership, never a change to it. The member's role, their spells and their place on the
members list stay as they were, and lifting the pause is all it takes to restore access. The join is keyed on the workspace,
so a pause in one coven refuses nothing in another.

### Each caller of the membership lookup, and what a pause does to it

- **`assertMembership`**, and so every workspace-scoped service: refused with `AccessPaused`.
- **Leaving** (`leaveWorkspace`): allowed. A paused member may still leave the coven (the owner's call, 2026-11-02). It reads
  the seat through `assertSeatToLeave`, the same check as `assertMembership` for `workspace: read` except that a paused seat
  passes. Leaving stays the caller's own seat alone, with no user id to name another, and the last-owner guard still runs,
  though a steward cannot be paused. A lifted or run-out pause does not stand, so it changes nothing.
- **`membershipsOf` and `findMembershipsOfUsers`** (the coven switcher, My Covens, `firstCovenSlugOf`, the participants of a
  working): they still list the paused coven, because the seat is kept, and M15.56 shows the member a paused page there
  rather than hiding the coven. Since M15.56 each row also carries `pause`, `{ until }` or null, read by the same left
  join `findWorkspaceSeat` uses, so the list still costs one query; `membershipsOf` answers it as `MembershipOfUser`.
  `MembershipWithWorkspace` stays without it, since `listMembers` and `updateMemberRole` return that type and read no pause.
- **The coven pages** (`requireCovenMembership()` in `src/lib/request-session.ts`): `AccessPaused` is a `Forbidden`, so a
  paused member gets the coven's 404 until M15.56 catches it first and shows the paused page.
- **Invitation acceptance**: reads `findWorkspaceRole`, so a paused member still counts as seated and is not seated again.
- **`firstCovenSlugOf`** may land a paused member on a paused coven after sign-in. Left as it is; M15.56's paused page is
  where they land.

### A member already paused is refused, not re-paused

As with the site pause: `pauseMemberAccess` on a member with a standing pause answers a validation error on `userId`, "This
member is already paused; lift the pause first". Changing a pause is a lift followed by a new pause, two rows on the history.
A run-out pause does not stand, so a new pause over it goes ahead, and the writer closes the run-out row first (§5). Two
stewards pausing in the same moment both pass the read; the partial unique index lets one write land, and the other gets the
same validation error.

Every refusal of a pause carries its sentence as the error's own message, as the site pause's do: the already-paused one, a
past end ("Choose a time in the future") and a long note ("Keep the note to 500 characters"), each a validation error whose
issue holds the same sentence. Neither pause screen names a field when it reads a refusal, so the browser shows the
message, and a validation error left on its default would read "Invalid input". An id that cannot name a user is refused in
the same words as a person with no seat, "That person is not a member of this coven".

### A steward cannot be paused

Pausing a steward, the caller included, is refused with `Forbidden`: "An owner's access can't be paused. Change their role
first if they should be paused." This keeps someone in every coven who can lift a pause.

### Who is refused, and how

- A practitioner, an observer, a steward of another coven and a site keeper with no seat: refused by `assertMembership`. A site keeper
  in the demo coven holds a steward seat there (M6.6), so they may pause a member of the demo coven and no other.
- A target with no seat in the coven: `Forbidden`, "That person is not a member of this coven", once the caller is proven an
  owner, so it tells a steward nothing they cannot already see on the members list.
- A target id that cannot name a user: a bare `Forbidden`, as the coven's other member-role checks answer, rather than the
  site pause's validation error.
- `until` not in the future: a validation error on `until`. A note over 500 characters, after trimming: a validation error on
  `note`. A blank note is stored as none.

### Lifting with nothing standing answers NotFound

`liftMemberAccessPause` is non-null in the schema and returns the lifted row. A member with no standing pause, a run-out one
included, answers `NotFound`, "No pause stands on this member", so the owner is told the lift did nothing.

### The provisional-account sweep removes a paused account with its pauses

Both pause tables' `user_id` foreign keys cascade on delete. The sweep hard-deletes a provisional account
([`../db/identity-model.md`](../db/identity-model.md)); a plain foreign key from a pause would have
blocked it, and a pause with no end would have kept the account forever. Cascading follows `accounts` and `sessions`. The
other choice, leaving paused accounts out of the sweep, would have let a pause hold an unused account the sweep is meant to
remove. The two tables had not reached any shared database, so their migrations (0118, 0119) were changed in place rather
than followed by a new one.

### A paused member cannot be made a steward

Promoting a paused member to steward would leave a standing pause on a steward, which the rule above forbids. `updateMemberRole` refuses it with a `ValidationError` saying "This member's access is paused; lift the pause first to make them a steward", and makes the same promotion once the pause is lifted. The refusal, rather than lifting the pause in passing, keeps a lift a deliberate act with its own lifted pair. Moves to practitioner or observer still go through while the pause stands. Added in M15.56's PR, on the owner's call.

### Support time-outs go with a swept account

`support_timeouts.user_id` was a plain foreign key to `users`, so a provisional account holding a support time-out blocked the expiry job's delete the way a pause would have. Migration 0120 re-adds it with `ON DELETE CASCADE`, as the two pause tables have, so the time-out goes with the account. Added in M15.56's PR, on the owner's call; the long form is [`../db/identity-model.md`](../db/identity-model.md).

### What M15.56 adds

M15.56 builds the screens on this service (claude-docs/components/member-list.md, "Pausing access").

- **The steward's controls.** Pause Access and Lift Pause on each practitioner's and observer's row of the members page, stewards only, and nothing on a steward's row. The page reads the pauses standing on its members in one query, `standingMemberPauses`. Each dialog lists the member's earlier pauses through `Workspace.memberPauses`, a paged list read by `listMemberPauses`, naming who set and who lifted each (`setBy`, `liftedBy`).
- **The paused page is its own route, `/coven-paused/<slug>`.** The coven guard, `requireCovenMembership`, sends a paused member there from every page of the coven, and still turns every other refusal into a 404. The page sits outside the coven's layout for three reasons:
  1. A layout is not run again on a move between the coven's own pages, so a page drawn in place would need every page to catch the pause itself.
  2. `/coven/paused` would collide with a coven whose slug is "paused".
  3. The page reads the pause from the database, through `pausedCovenBySlug`, rather than trusting an end carried in the address. A stranger gets the 404 there too, and anyone with no pause standing is sent back to the coven.
- **The browser follows a refusal there.** A GraphQL answer carrying `ACCESS_PAUSED` on a coven page sends the browser to that coven's paused page (`src/lib/graphql-client.ts`). The error is still thrown, so the control that asked shows its own refusal until the page is left.
- **The Earlier Pauses list reads the newest 25.** Older ones are not shown; there is no further page.
- **The member's own screens mark a paused coven and offer no write in it** (the owner's call, 2026-11-02, "Build it, and hide writes"). `viewerOf` gives each `ShellWorkspace` a `paused` field and reads `canReadMembers`, `canInvite` and `canWrite` false for a paused coven, as for an observer seat. Every write target is chosen from `canWrite`, so this one change leaves the paused coven out of Add Ingredient's destinations, the compendium's plus and its default coven, the three dots' covens on the compendium cards, and the public entry page's cupboard. The coven switcher lists the paused coven with a second line, "Paused until …" or "Paused, with no end date"; it stays pickable, and the paused page is where it lands. The compendium's In My Covens lists it disabled with the same line, since the narrowed read drops a coven it cannot prove. The services still refuse every write: hiding is presentation.
- **Reads across all the viewer's covens skip a paused one.** `covensHoldingEntry`, `covensOpeningEntry` and the compendium page's holding count each read every coven under its own proof, so a paused coven's refusal would blank the answer for every coven. They leave the paused coven out before reading instead.

### The member is emailed when a pause is set

`pauseMemberAccess` takes a `MemberPauseNotifier` (`origin()`) and an optional `message`, stored on `workspace_member_pauses.message` (trimmed, null when blank, at most 500 characters). Once the write's transaction has committed it starts the `memberPauseMail` durable job through `startMailJob`, which mails the member's account address. The email names the coven, gives the end date as UTC or says there is none, and carries the message when one was written; it never carries the owner's note, which stays for the coven's stewards. Its link opens `/support`. A failed send is logged and never thrown, so the pause stands. A refused caller writes and mails nothing, and lifting a pause sends no email.

## The coven pause mail step reads a pause without a Membership proof

### Decision

`findWorkspaceMemberPauseForMail(pauseId)` in `src/db/repository/workspace-member-pauses.ts` reads one coven pause row by id and takes no `Membership`. It is a named exception to rule 5.

### Why

The email about a coven pause is sent by a durable job. A job has no session, so its step cannot call `assertMembership` and has nothing to prove. The job's run carries only the pause id, because ids are all a run should hold. The step reads the row, the user and the coven, builds the email and sends it.

### What keeps it safe

- The finder is reached only from the mail step in `src/modules/coven/`, after the service has already refused or accepted the write.
- It returns a pause row and the names the email needs, and nothing else about the coven.
- It is still scoped by soft delete: a deleted pause or coven is not returned.
- It is listed in `.claude/rules/database.md`, under Rule 5, beside the invitation token rotation.

## Split the Curator and Keepers Navs

The owner's decisions, which the code follows.

- **Two areas replace `/admin`.** `/curator` holds curation: the compendium, categories and category groups, forms and form groups, deities and traditions, celestial bodies and zodiac signs. `/keepers` holds Support, People and Invitations. The site bar offers a verified curator or keeper both links, labelled Curator and Keepers.
- **The name and prefix are Keepers.** The word "admin" stays in identifiers: the `admin` navigation region, `AdminNav`, `requireAdminSession`, `ADMIN_PAGES`.
- **No redirects.** Every `/admin` address is gone, and `next.config.ts` gains no redirect. Better Auth's own `/admin/impersonate-user` and `/admin/stop-impersonating` keep their paths, mounted under `/api/auth`. `tests/guards/no-admin-addresses.test.ts` keeps `src/` free of the old addresses.
- **Support is the only Keepers page a curator reaches.** Both layouts use `requireCuratorSession`. Every People and Invitations page calls `requireAdminSession` itself and answers a curator with the 403 page.
- **People is split into two pages.** People holds Users and Privilege Changes. Invitations holds Invitations, Invitation Cards and Card Sign-Ups. Both are admin-only.
- **Landings.** A keeper lands on `/keepers` (`ADMIN_LANDING`), a curator on `/curator` (`CURATOR_LANDING`), both from `postSignInLanding` and from a site invitation's acceptance (by the invitation's site role). The impersonation banner returns to `/keepers/users`. The account menu's support count links to `/keepers/support?view=mine`, and only the Keepers link carries the count.
- **The add-ingredient button** on any `/curator` or `/keepers` page opens `/curator/compendium?new=ingredient-compendium`.
- **Out of scope.** The workshop is Storybook-only and unchanged. The documents page from M15.71 is not placed in either area here.

## First-party sign-in comes into v1: a password, a passkey, a second factor

Until now v1 signed in through four OAuth providers (Google, Discord, Facebook, Microsoft) and nothing else. From Wave 16 (M16.2–M16.10) a person can also sign in with an email address and a password, with a passkey (a key stored on their device, unlocked by a fingerprint, face or PIN), and can add a second step from an authenticator app to password sign-ins. This record says why the old rule stood, why it changes, what the change costs, and what is accepted as it ships. `DESIGN.md` §2, §8, §10, §13 and §14 carry the result.

### Why OAuth only was the v1 rule

A password means the site holds something worth stealing, and with it come a reset flow, a lockout, and a way to recover an account. The v1 design (`DESIGN.md` §2, a section since replaced by "Sign-in methods") argued that without email delivery a reset could only be a link copied by a keeper after checking identity out of band, which is unworkable at fifty users and makes the admin a single point of failure. (see "Better Auth's plugin roster: what lands before launch, what waits") then made passkeys the v2 answer, in place of email and password, and listed two-factor, a CAPTCHA and the breached-password check as guards that exist only for a password sign-in.

### Why it changes now

The owner's call: someone without a Google, Discord, Facebook or Microsoft account, or who would rather not use one, should still be able to use the site. The reason the old argument held has also gone. Mail delivery exists (MB.65, MB.61), so a reset is a mailed link and not a keeper's errand. The account page and the verification link are in place (Wave 10).

### What the change costs

- **A column now in use.** `accounts.password` already exists and is null today. It holds a hash from M16.2.
- **Mail for resets.** A new template, `src/emails/reset-password.tsx` (M16.3), and a second notice mail when a password changes.
- **A lockout counter.** One table, `sign_in_failures` (M16.4), and a write outside `withAudit` (M16.5), because a failed sign-in has no session to audit. `CLAUDE.md` rule 3 names its repository file as one of two that write outside `withAudit` (see "Two repository files that import the database client and write outside `withAudit`").
- **Two plugins and their tables.** `@better-auth/passkey` with a `passkey` table (M16.6), and `twoFactor` with a `two_factors` table and a `users.two_factor_enabled` column (M16.9).
- **The Better Auth version.** The installed `better-auth` and `@better-auth/core` already meet the passkey plugin's peer range, so nothing needs bumping. `package.json` is the one statement of the version.
- **More to defend.** A password can be guessed, reused elsewhere or phished, which an OAuth-only site did not have to answer for. The password policy in `DESIGN.md` §8, "Passwords", is the answer, and each rule in it names its source.

### What stays the same

The invite gate. Any new account, by any method, has `canCreateWorkspace` false and an observer seat in the demo coven, and nothing else. An unverified account reaches only `/account/email` and the public pages. Sign-in by passkey or by password earns nothing a provider sign-in does not.

### Hashing, accepted as it ships

Better Auth hashes a password with scrypt (read in `node_modules/@better-auth/utils/dist/password.node.mjs`, installed `better-auth`): cost N=2^14 (16384), r=16, p=1, a 64-byte key, memory use about 32 MiB (128 x N x r bytes), and a 16-byte random salt. The stored value is `salt:key`, both hex, with no tag naming the scheme. The password is normalised to Unicode form NFKC before hashing, and verification compares the full password, so nothing truncates it.

That cost is below the floor in the OWASP Password Storage Cheat Sheet for scrypt, N=2^17 with r=8. **The owner accepted it as good enough (2026-10-16). Nothing in Wave 16 changes it.**

The way out, for a later task if it is ever wanted: a custom `password.hash` and `password.verify` pair in the `emailAndPassword` options, using Node's built-in Argon2id (Node 24.7 and later). Verification would tell an old scrypt hash from a new one by its shape (`salt:key` against Argon2's `$argon2id$` prefix),, so existing accounts keep working. It is not scheduled.

### Where each rule is written

| Where                                                                                              | What it says                                                                    |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `DESIGN.md` §8, "Passwords"                                                                        | The policy table, the hashing, and refusal while the breach list is unreachable |
| `DESIGN.md` §10, stories 70–75                                                                     | The six user stories                                                            |
| [`../tasks/m16.md`](../tasks/m16.md)                                                               | The tasks and the sources the policy comes from                                 |
| [`../auth/plugins.md`](../auth/plugins.md), [`../auth/rate-limiting.md`](../auth/rate-limiting.md) | The plugins' status and the rate rules each adds                                |

## Two repository files that import the database client and write outside `withAudit`

`CLAUDE.md` rule 2 lets only `src/db/repository/` import the database client, and inside the repository only the files that run a query carry the lint exemption. Rule 3 sends every write through `withAudit(session, fn)`, which opens the transaction and stamps the audit columns from the session. Wave 16 added two repository files that do both things the rules guard: each imports the client, and each writes without `withAudit`. The owner accepted both on 2026-10-30.

With them, eight files hold rule 2's exemption: five inside the repository (`write.ts`, `select.ts`, `provisional-users.ts`, `sign-in-failures.ts` and `passkeys.ts`) and three outside it (`src/lib/auth.ts`, `scripts/db-seed.ts` and `tests/db/test-database-isolation.test.ts`). These two are the seventh and the eighth.

### `src/db/repository/sign-in-failures.ts` (M16.4)

**What it writes.** The `sign_in_failures` table: one row per account, counting failed password sign-ins for the per-account lockout (M16.5).

- `recordSignInFailure` adds one failure in a single `INSERT … ON CONFLICT DO UPDATE`, creating the row at one, so two failures racing each other both count.
- `lockPasswordSignIn` sets the end of a timed lock.
- `clearSignInFailures` deletes the row on a successful sign-in or a reset.
- `readSignInFailure` reads the row.

**Why outside `withAudit`.** A failed sign-in has no session, so there is no actor for `withAudit` to take its audit ids from. The sign-in hooks M16.5 adds to `src/lib/auth.ts` call these functions before any session exists. The table has no audit columns for the same reason: there would be nobody to stamp.

### `src/db/repository/passkeys.ts` (the passkey audit fix, on M16.8)

**What it writes.** One delete from the `passkeys` table. `removePasskeyKeepingAWayIn(userId, passkeyId, providerIds)` removes an account's passkey unless it is the account's last way to sign in: no other passkey, no account for a provider in `providerIds`, and no password. It answers `'removed'`, `'last-way-in'` or `'not-held'`. The check and the delete run in one transaction that locks the account's `users` row, so two removals racing each other run one after the other, and the second sees the first's delete rather than leaving the account with no way in.

**Why outside `withAudit`.** The `passkeys` table is the passkey plugin's own and has no audit columns, so there is nothing for `withAudit` to stamp. The plugin's own passkey writes (registration, renaming, the sign-in counter) already go through Better Auth's adapter in `src/lib/auth.ts`, outside `withAudit`. This file exists so that the last-way-in check and the delete share one lock, which the plugin's own delete endpoint cannot give.

### What the rules say now

- `CLAUDE.md` rule 2 counts only the files outside the repository ("three files outside it hold a named exemption"), so it is unchanged.
- `CLAUDE.md` rule 3 and `.claude/rules/database.md` rule 3 name both writers beside the two identity bootstraps (the sign-up hook and `src/db/seed/`), and link here.
- `.claude/rules/database.md` rule 2 lists both files among the five inside the repository that carry the exemption.

## A deleted co-member reads under their last name

The owner's call, made while building MB.10: when the `usersById` loader is
asked for a deleted user who shared a coven with the viewer, it answers with
the name that user's row held when it was deleted. The result is in
[`auth/display-names.md`](../auth/display-names.md), and in CLAUDE.md rule 4
and DESIGN.md §5's third enforcement rule, which now name a third exception.

### What the task left open

MB.10's acceptance criteria ask that "a deleted user still resolves to a
stable display value", without saying which. Nothing in v1 deletes a user
yet: Better Auth's own account deletion is a hard delete that every audit
foreign key refuses (MB.74), and the provisional-account sweep hard-deletes
only unverified rows, which hold no seat (MB.67). But `users` carries
`deleted_at`, so a later task can soft-delete one, and a row they last
edited would still name them.

### The two options

| Option                          | What a deleted co-member reads as | What it costs                                                                                                                                                          |
| ------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A fixed label                   | The same label for every one      | Nothing. The read never touches a deleted user's row: a co-member's seat with no live user behind it can only be a deleted user.                                       |
| **The last known name, chosen** | The name their row last held      | The finder reads a deleted user's row, so it is a third named exception to rule 4, ending `…IncludingSoftDeleted` and pinned by the soft-delete guard like the others. |

The owner chose the last known name. It matches what the viewer saw when
the edit was made, as a substitute keeps showing the last name of the
ingredient it links (MB.138), and the name is stable because no writer
touches a deleted row.

### What the exception covers, and what it doesn't

`findCoMemberNamesIncludingSoftDeleted` skips two filters, each for a reason
the task states:

- **The asked-about user's seat**, so that a member removed from the coven
  still counts as a co-member.
- **The asked-about user's row**, so that a deleted user still has a name.

Two filters stay, both applied by `existsIn`:

- **The viewer's own seat must be live.** Leaving a coven ends the view of
  its members.
- **The coven must be live.** A deleted coven shares nobody.

The finder returns an id and a name per user, never the rest of the row, so
the email address of a deleted user never leaves the repository.

### A fourth read without a proof

Every workspace-scoped finder takes the `Membership` proof that
`assertMembership` returns (CLAUDE.md rule 5). This one can't: the viewer's
covens are several, and a proof names one. It takes the viewer's id
instead, which the service reads off the session, as `findMembershipsOfUsers`
takes the user ids its service has cleared. The repository's comments called
a fourth such read a decision. The task's co-member gate is that decision,
and this record is where it is written down.

## RLS role split, `FORCE`, and identity on the read path

**Status:** superseded by MB.29

> MB.29 defers RLS to the public launch and makes the second authorization
> layer a branded `Membership` proof instead, so nothing below is scheduled for
> v1: MB.25, MB.26, M6.4 and M6.5 are retired. The findings stand — this record
> is the specification for the migration that adds policies when that launch
> comes, and it is deliberately left otherwise untouched.

The question that started this was whether RLS is overkill for a project this
size. It is not — the failure mode it guards is one workspace's grimoire
becoming visible to another (DESIGN.md §8), and half its infrastructure was
already paid for by M1.19's GUC, which the v2 history trigger needs regardless.

But checking §8 against the code showed the design as written does not work, in
two ways that concealed each other. Neither had surfaced, because the first kept
the policies from applying at all and so the second could not yet bite.

### The two findings

**1. The policies would have been inert.** The application connects as `sorrel`
(`Docker/docker-compose.yaml`) and `drizzle-kit migrate` runs against that same
`DATABASE_URL` (`package.json`), so `sorrel` owns every table its policies would
filter. Postgres does not apply a table's policies to that table's owner unless
`ALTER TABLE … FORCE ROW LEVEL SECURITY` is set, and that clause appeared
nowhere in the repo — not in DESIGN.md, TASKS.md, `../db/README.md` or any migration. Neon
is the same shape: the integration injects a connection string for the
table-owning role.

M6.5 exists precisely to catch this and would have — but only after M6.4 had
shipped believing the opposite, and only if M6.5's own test were not itself
connected as the owner, in which case it would have reported "the database
refused the read" for the wrong reason and passed.

**2. Fixing only that would have broken every read.**
`set_config('app.current_user_id', …, true)` is published inside `withAudit`
(M1.19), which `src/db/repository/write.ts` documents as "the only write path". Reads
go through `findMany`/`findOne` → `selectFrom`, which uses the bare client with
no transaction (M1.20). A GUC set with `is_local => true` exists only inside a
transaction, so a policy reading it on a read would find it unset on a fresh
pooled connection, or reset to `''` on one that had served a write — an error on
the `::uuid` cast in the first case, zero rows in the second. Nothing planned
would have caught it: M6.5 asserts a read is _refused_, which is what a totally
broken read path looks like.

### Decided

- **`sorrel` keeps its identity and gains `BYPASSRLS`.** It remains owner of the
  database and of `sorrel_template` with `CREATEDB`, which M1.9's per-worker
  clones depend on. It runs migrations and the seed, and stops being what the
  application connects as.
- **`sorrel_app` is new**: `LOGIN`, `NOBYPASSRLS`, owning nothing, granted
  `USAGE` on schema `public` and DML on its tables via `ALTER DEFAULT
PRIVILEGES` so future migrations are covered without anyone remembering a
  `GRANT`.
- **M6.4 sets `FORCE ROW LEVEL SECURITY` as well as `ENABLE`.**
- **The app derives its connection**: `DATABASE_URL` stays the owner's string —
  which is what `drizzle.config.ts`, `scripts/db-seed.ts` and
  `db-global-setup.ts` already want — and `connection.ts` swaps in
  `DATABASE_APP_ROLE` / `DATABASE_APP_PASSWORD`. Both are required; absent, the
  process throws rather than falling back, so `FORCE` stays a backstop and does
  not become a crutch.
- **A startup assertion** refuses a connection whose role is superuser, holds
  `rolbypassrls`, or owns a known application table. Ownership is invisible in a
  connection string, so without this a misconfigured environment disables the
  whole layer silently.
- **Reads carry identity through `withViewer`**, re-entrant, never nested with
  `withAudit`.
- **Policies read the user only through `app.current_user_id()`**, a `stable`
  helper returning `nullif(current_setting('app.current_user_id', true), '')::uuid`
  — `NULL` rather than an error when unset, so a misconfiguration denies instead
  of 500s. **`app.is_member(uuid, workspace_role)` is `security definer`** with
  an explicit `search_path`; without it a policy on `workspace_members` that
  subqueries `workspace_members` is infinite policy recursion, which Postgres
  rejects outright.

### Rules this sets

- The application must never connect as a role that owns application tables. If
  a future environment makes that unavoidable, that is a decision to re-argue
  here, not a `// eslint-disable`-shaped exception at a call site.
- A test that asserts RLS refused something must also assert _why_ it could have
  succeeded: the connected role neither owns the table nor holds `rolbypassrls`,
  and the GUC is populated. A green RLS test proves nothing about RLS otherwise.
- Every policy reads identity through `app.current_user_id()`. A second
  `current_setting` call anywhere in a policy is a bug, because it is the copy
  that will not get updated.
- `ingredients.workspace_id` is nullable and `NULL` means the global compendium.
  Any policy on that table needs `workspace_id IS NULL OR …` or the compendium
  disappears for every signed-in user.
- Workspace-scoped is not the same as "has a `workspace_id` column".
  `spell_ingredients` and `spell_categories` reach their workspace through
  `spells`. Guards must enumerate the set, not infer it from a column name.

### Not decided here

Whether the Neon–Vercel integration still auto-creates a branch per preview
deployment. M1.1 assumed it does and said the assumption was unverified;
`vercel.json` has since disabled Git-integration deploys in favour of
`vercel deploy --prebuilt` from CI. Deriving the connection is correct either
way, which is why this record does not wait on the answer. **MB.27** establishes
it.

## Better Auth's organization plugin for workspaces and invitations

**Status:** not adopted

DESIGN.md §2's Auth row said Better Auth was chosen because its "Organization
plugin matches the workspace model". Nobody had run it. M6.2 hand-rolled
`workspaces` and `workspace_members`, and M6.7 → M7.7 were about to hand-build
the rest beside a plugin that ships create, invite, accept, cancel, remove,
update-role, leave and a last-owner guard. This spike ran the plugin against a
real database to answer six questions, and the answer is that the plugin's
model and this project's are different in the places that matter — audit,
soft delete, the token, the transport — and every place they agree we would
wrap anyway.

**Decision:** workspaces, membership and invitations stay hand-built on
`workspaces`, `workspace_members` and M7.1's `workspace_invitations`, behind
services, through `withAudit`, with the `Membership` proof. The plugin is not
configured, not scheduled, and DESIGN.md §2 no longer names it as the reason
Better Auth was chosen. No task is minted.

### How the spike ran

A throwaway branch (`spike/mb.30-organization-plugin`, deleted) added the
plugin's three tables as Drizzle schema, an `active_organization_id` column on
`sessions` (the plugin declares it), a generated migration, and one test file
in the `db` project — 29 tests, all green in 0.8s. Nothing from it merges; the
excerpts below are the code that produced each answer.

The plugin was configured the way the design would want it, so the spike
tested the best case rather than the defaults:

```ts
organization({
  ac,
  roles: { viewer: ac.newRole({}), member: ac.newRole({}), owner: ac.newRole({/* all */}) },
  creatorRole: 'owner',
  allowUserToCreateOrganization: async (user) =>
    user.canCreateWorkspace === true || user.role === 'admin', // M6.7's gate, verbatim
  invitationExpiresIn: 60 * 60 * 24 * 7,
  schema: {
    organization: { additionalFields: { createdBy, updatedBy } },
    member: { additionalFields: { createdBy } },
  }, // audit probe
  organizationHooks: {
    beforeCreateOrganization: async ({ user }) => ({
      data: { createdBy: user.id, updatedBy: user.id },
    }),
    beforeAddMember: async ({ user }) => ({ data: { createdBy: user.id } }),
    beforeCreateInvitation: async ({ invitation }) => {
      if (invitation.role.split(',').includes('owner'))
        throw new APIError('BAD_REQUEST', { code: 'OWNER_NOT_INVITABLE', message: '…' });
    },
  },
});
```

The worker clone carries no tables until M1.27, so the file's `beforeAll` ran
`migrate(db, { migrationsFolder: 'src/db/migrations' })` itself. Fixture users
were inserted directly (self-referencing `created_by`, per MB.5).

### The six questions

#### 1. Slug — enforced by code only, no format, case-sensitive; resolution works but leaks existence and writes on read

```ts
// duplicate → BAD_REQUEST ORGANIZATION_ALREADY_EXISTS, from findOrganizationBySlug in
// crud-org.mjs, before the DB unique is reached
await auth.api.createOrganization({ body: { name: 'Dup', slug: 'coven-a' }, headers: hD });

// no format at all — z.string().min(1) — and case is significant:
await auth.api.createOrganization({ body: { name: 'Ugly', slug: 'Not A Slug !!' }, headers: hD }); // ok
await auth.api.createOrganization({ body: { name: 'Cased', slug: 'Coven-A' }, headers: hD }); // ok, distinct from coven-a
// select count(*) from organizations where lower(slug) = 'coven-a'  → 2

// /coven/[slug] resolves:
const org = await auth.api.getFullOrganization({
  query: { organizationSlug: 'coven-a' },
  headers: hA,
});
// org.members[].user.{id,name,email,image}, org.invitations[] (all of them — see Q4)

// but a non-member and an unknown slug are told different things:
//   member of X asks for coven-a  → FORBIDDEN  USER_IS_NOT_A_MEMBER_OF_THE_ORGANIZATION
//   anyone asks for no-such-coven → BAD_REQUEST ORGANIZATION_NOT_FOUND
```

CLAUDE.md's `/coven/[slug]` rule is "404 to a non-member, indistinguishable
from an unknown slug" — the plugin distinguishes them. Wrappable in a layout
that maps both to `notFound()`, but a wrapper is also all M6.10 is. Two more
things surfaced on this path. The forbidden read has a **write side effect**:
`getFullOrganization` and `getOrganization` call
`setActiveOrganization(session.token, null)` on a non-member before throwing,
so a read updates `sessions`. And the slug uniqueness the plugin generates is a
plain `UNIQUE("slug")` — not the partial `WHERE deleted_at IS NULL` index rule
4 requires — because the plugin has no soft delete to make partial (Q2).

#### 2. Last-owner guard — holds on all three paths, with one undifferentiated error and a hard delete underneath

```ts
// sole owner A, organization 'solo':
updateMemberRole({ memberId: A, role: 'member', organizationId: solo }); // → YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER
removeMember({ memberIdOrEmail: A, organizationId: solo }); // → YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER
leaveOrganization({ organizationId: solo }); // → YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER

// two owners A and O2: A demotes O2 → ok; a now-member O2 promoting themselves back
// → YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_MEMBER

// the same self-demotion in 'solo' (A alone) and 'with' (A owner, B member):
expect(errWithOthers).toEqual(errAlone); // identical status, code and message

// and what "remove" means:
await auth.api.removeMember({ memberIdOrEmail: memberIdB, organizationId: twoOwners, headers: hA });
await db.select().from(members).where(eq(members.id, memberIdB)); // → []  (row gone)
```

So story 11 is covered as a refusal, on `removeMember` and `updateMemberRole`
as well as `leave` (`crud-members.mjs` counts members holding `creatorRole`
before each). But M6.8 requires the refusal to say _which_ remedy applies —
"other members exist, promote one" versus "you are the only member, delete
instead" — because M6.16 builds its guided exit on that distinction. The plugin
gives one code for both, so the service would count members itself before or
after calling it, and at that point the plugin's check is redundant with ours.
Note also the guard reads `role.split(',')`: roles are a comma-joined string,
and a member can hold several at once, which the `workspace_role` enum forbids.

`removeMember`, `leaveOrganization` and `deleteOrganization` all hard-delete
(`adapter.delete` / `deleteMany` in `adapter.mjs`; `deleteOrganization` removes
members, invitations and the organization in one transaction). M6.14's
"deletion is soft; nothing is destroyed" and M6.15's "both soft" cannot hold on
plugin tables; `disableOrganizationDeletion: true` would stop the worst case,
and a soft delete written beside it would be invisible to every plugin finder
— `listOrganizations` would still return a workspace we had marked deleted.

#### 3. Owner-not-invitable — the plugin allows it; a hook can refuse it; role validation is looser than the configured role set

```ts
// default behaviour: an owner may invite an owner
const bare = makeAuth({ hooks: { beforeCreateInvitation: undefined } });
(
  await bare.api.createInvitation({ body: { email, role: 'owner', organizationId }, headers: hA })
).role(
  // → 'owner'

  // with the hook: refused cleanly, our code and message intact
  // → { status: 'BAD_REQUEST', code: 'OWNER_NOT_INVITABLE', message: 'Ownership is granted on the members page after the person joins' }

  // a member (viewer/member hold no invitation:create) inviting anyone:
  // → FORBIDDEN YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION   (never reaches the role check)
  // a member granted invitation:create, inviting an owner:
  // → FORBIDDEN YOU_ARE_NOT_ALLOWED_TO_INVITE_USER_WITH_THIS_ROLE

  // and, with roles = { viewer, member, owner } configured:
  await auth.api.createInvitation({ body: { email, role: 'admin', organizationId }, headers: hA }),
).role;
// → 'admin'   — accepted, stored, and would become the member's role on acceptance
```

`crud-invites.mjs` validates roles against `Object.keys(defaultRoles)` ∪
`Object.keys(options.roles)`, so the plugin's built-in `admin`, `member` and
`owner` are always admissible names whatever role set is configured. DESIGN.md
§5 puts the `viewer | member` narrowing in a database check constraint so "no
future code path can widen it by accident"; with the plugin the narrowing would
live in a hook, and the table's `role` column is untyped text.

#### 4. Invitation states — five conditions collapse to one error; the id is the token, in plaintext, readable by every member, redeemable only with the invited email

```ts
const inv = await auth.api.createInvitation({ body: { email: N.email, role: 'member', organizationId }, headers: hA });
inv.id   // a v4 uuid — this is what acceptInvitation({ invitationId }) takes, i.e. the token
await db.select().from(invitations).where(eq(invitations.id, inv.id));  // → 1 row, status 'pending'

// any member — a viewer — reads it:
(await auth.api.getFullOrganization({ query: { organizationId }, headers: hC })).invitations.map(i => i.id) // contains inv.id
(await auth.api.listInvitations({ query: { organizationId }, headers: hC })).map(i => i.id)                 // contains inv.id

// but knowing it is not enough:
acceptInvitation({ invitationId: inv.id }, as C)   // → FORBIDDEN YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION
acceptInvitation({ invitationId: inv.id }, as N)   // → ok, member row created, N.emailVerified was false

// then every way a link can be dead:
accept again (already accepted)                    // → BAD_REQUEST INVITATION_NOT_FOUND
cancelInvitation as owner, then accept             // → BAD_REQUEST INVITATION_NOT_FOUND
rejectInvitation as recipient, then accept         // → BAD_REQUEST INVITATION_NOT_FOUND
update invitations set expires_at = yesterday; accept
                                                   // → BAD_REQUEST INVITATION_NOT_FOUND  (row still status 'pending')
accept a random uuid                               // → BAD_REQUEST INVITATION_NOT_FOUND
```

Story 7 wants three distinct reasons — expired, revoked, already used — and
M7.7 wants a deterministic answer when two apply. `acceptInvitation` checks
`!invitation || expiresAt < now || status !== 'pending'` in one expression and
throws one code; `getInvitation` does the same with a generic message; the
`beforeAcceptInvitation` hook runs only after that check, so it cannot
differentiate either. Expiry is a clock comparison, not a state: an expired row
stays `pending` forever. Our service would read the `invitations` row itself to
classify it — and then it owns the state machine, not the plugin.

The token model is the other half. The plugin's invitation **id is the
credential**: a v4 UUID (`gen_random_uuid()` or `crypto.randomUUID()`, CSPRNG
either way, 122 random bits), stored as the primary key, returned by
`getFullOrganization` and `listInvitations` to any member. M7.1's "no column
holds the plaintext token" and M7.3's "the URL appears in that response body
and nowhere else" are both false under the plugin. The exposure is bounded, not
open: acceptance is bound to `invitation.email === session.user.email`,
unconditionally, so a forwarded or leaked id redeems only for the invited
address. That binding is itself a design change — a copy-link whose recipient
signs in with a GitHub account under a different email is refused with no
recourse — and it is not an option, it is hard-coded in `crud-invites.mjs`.

#### 5. Active organization — every endpoint we need takes an explicit id, but the session column exists, is written on create/accept/forbidden-read, and is what an omitted id silently falls back to

```ts
// createOrganization as A → sessions.active_organization_id = the new org (side effect)
// acceptInvitation as N   → set to the accepted org, inside the plugin's transaction
// getFullOrganization for a non-member → set to null before the FORBIDDEN (Q1)

// with A's column nulled by hand:
listMembers({ query: { organizationId } })                     // ok
createInvitation({ body: { …, organizationId } })              // ok, lands in organizationId
getFullOrganization({ query: { organizationId } })             // ok
getFullOrganization({ query: { organizationSlug: 'act' } })    // ok
// …and the column is still null afterwards: reads don't touch it

getActiveMember({ headers: hA })                                // → BAD_REQUEST NO_ACTIVE_ORGANIZATION (the one that needs it)

// the foot-gun, exactly as §9 describes it:
// set A's column to `other`, then:
createInvitation({ body: { email, role: 'member' } })          // no organizationId → lands in `other`
```

So `setActiveOrganization` can be ignored on the read side — nothing we would
call depends on it if we always pass the id. It cannot be ignored on the write
side: the plugin adds the column to `sessions`, writes it on three paths, and
every endpoint whose `organizationId` is optional defaults to it. §9 keeps the
workspace in the URL specifically so that two tabs cannot disagree; under the
plugin the disagreement is one forgotten argument away, and the type of every
call permits forgetting it. Absent, not impossible — the sweep-task rule's own
tell.

#### 6. Test harness — `auth.api.*` works in the `db` project with a fabricated session; the server-only path bypasses the gate

```ts
async function sessionFor(auth, user) {
  const ctx = await auth.$context;
  const session = await ctx.internalAdapter.createSession(user.id);       // a real sessions row
  const signature = createHmac('sha256', SECRET).update(session.token).digest('base64');
  return new Headers({
    cookie: `better-auth.session_token=${encodeURIComponent(`${session.token}.${signature}`)}`,
  });
}
// better-call's getSignedCookie: `<value>.<44-char base64 HMAC-SHA256 ending '='>`
await auth.api.createOrganization({ body: { name: 'Coven A', slug: 'coven-a' }, headers: hA });  // ok

// B has canCreateWorkspace = false:
createOrganization({ body: {…}, headers: hB })                  // → FORBIDDEN YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION
createOrganization({ body: { …, userId: B.id } })  /* no headers */   // → ok: `isSystemAction` skips the predicate
addMember({ body: { userId, role, organizationId } })                  // no session, no permission check at all
```

Yes, it works — but `asUser(A)` stops being a service-level value. Every
fixture user needs a `sessions` row and a signed cookie, per test file, and
every service test becomes a Better Auth session test. The second finding is
the one that decides it: `crud-org.mjs` treats a headerless call carrying
`userId` as a system action and skips `allowUserToCreateOrganization`;
`addMember` is documented server-only and checks nothing. A service that calls
`auth.api.*` from inside a request therefore has to do its own authorization
first — which is `assertMembership`, which is what we already have.

### The audit probe

The hooks can stamp `created_by` on rows created _through_ a hook: an
organization (`beforeCreateOrganization`) and the creator's member row
(`beforeAddMember`). The member row `acceptInvitation` creates goes through
`adapter.createMember` directly — no hook runs, and the spike's row came back
with `created_by IS NULL`. `beforeUpdateMemberRole`'s return is read only for
`.role`, so `updated_by` has no path at all; deletes are hard. Rule 3 —
every write through `withAudit(session, fn)`, the GUC published on every
transaction — cannot be satisfied by tables the plugin writes, and the v2
history trigger would see no actor on any of them. That is the "cost stated
plainly" the task asked for if the answer had been yes, and it is the reason
the answer is no.

### What the decision rules out

- **Any use of the organization plugin for M6 or M7.** Not the tables, not
  the endpoints, not the guard. `workspaces`, `workspace_members` (M6.2) and
  `workspace_invitations` (M7.1) stay as specified, with the audit spread,
  soft delete, partial unique indexes, the `workspace_role` enum, the
  `viewer | member` check constraint and a hashed token.
- **The M6.2 revert and the M6.3 / M6.7–M6.15 / M7.1–M7.7 re-scoping** the
  task would have minted on a yes. None of it happens; those entries are
  unchanged.
- **Re-arguing this from the plugin's feature list.** The list is accurate —
  it does offer everything the task named. The mismatch is structural: hard
  delete, unaudited writes, a plaintext token that is also the primary key,
  email-bound acceptance with no option, a session-held active workspace, and
  twenty HTTP routes under `/api/auth/organization/*` that carry workspace
  data outside `/api/graphql` (rule 1's "no third access path";
  `disabledPaths` 404s them at the HTTP layer only — `api/index.mjs` checks it
  in `onRequest`, so server-side `auth.api.*` is unaffected — but it is an
  enumerated list to keep in step with every plugin release).

### What it does not rule out

- **Better Auth itself.** Sessions, OAuth, the Drizzle adapter and the
  `users` hooks are unchanged; §2's row now gives the reason that actually
  holds — in-process, no extra service, and the OAuth handshake is the only
  thing it carries.
- **The synthetic-session recipe above.** A `sessions` row plus an HMAC-signed
  `better-auth.session_token` cookie is a working `asUser()` for anything that
  needs Better Auth's own session rather than a service-level one — a
  Playwright sign-in without a live OAuth provider, for instance. Nothing is
  scheduled for it; it is recorded so it is not rediscovered.
- **Nothing to uninstall.** The plugin is part of the `better-auth` package,
  not a separate dependency; it was never configured in `src/lib/auth.ts`.

## Set the account's email: prefilled from the provider, editable, verified before it counts

Only the decisions, the reasons and what they rule out are kept here.

### Where each piece lives (rule 1, rule 3, the module boundary)

Services are lint-banned from `lib/auth`, and `auth.ts` imports `@/modules/identity`, so a module file importing `auth` would be a runtime cycle (`VERIFICATION_LIFETIME_SECONDS` is read at config time — a TDZ failure depending on import order). The Better Auth side is therefore a `src/lib/` helper handed to the service through the request context, the way loaders are:

| File                                                                              | Role                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/modules/identity/services/email.ts` (new, `server-only`)                     | `setEmail(session, email, sender)`: normalise + validate (`ValidationError`, path `['email']`), mail no link to an address held by a **live verified** account, answering as for a free one (amended by MB.284: it is no longer refused with a message), allow one held only by a provisional row, restart the window for a provisional caller, then `sender.requestChange(row.email, email)` — or `sender.resend(row.email)` when the address is the row's own and unverified; unchanged and verified returns the row with nothing sent. Also `placeholderEmail(providerId, accountId)`, `isPlaceholderEmail`, `isEmailHeldByVerifiedAccount(email)` (used by the service and by the verify hook), and `validateEmailAddress(email): ValidationIssue \| null` — trim, lowercase, one simple shape check, ≤ 254 chars, no `.invalid` domain. **This last function is the v2 seam** (see backlog). Exported from the module index.                                                                                                                                                                                                                                                  |
| `src/lib/email-verification.ts` (new)                                             | `emailVerificationSender(request): EmailVerificationSender` — `resend(email)` calls `auth.api.sendVerificationEmail({ body: { email, callbackURL: '/account/email' }, headers })` (the existing hook extends the window and mails); `requestChange(current, next)` mints the token with `createEmailVerificationToken(secret, current, next, VERIFICATION_LIFETIME_SECONDS, { requestType: 'change-email-verification' })` from `better-auth/api`, builds the link on `resolveBaseURL(auth.options.baseURL, '/api/auth', request)` from `better-auth` (per-request, so staging and hotfix previews get their own host), and sends `verifyEmailMessage({ to: next, url, providers, purpose: 'change' })`. Secret from `(await auth.$context).secret`, so dev's default secret matches.                                                                                                                                                                                                                                                                                                                                                                                              |
| `src/graphql/context.ts`                                                          | `Context` gains `emailVerification: EmailVerificationSender`, built per request.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `src/modules/identity/graphql/user.ts`                                            | `builder.mutationType` (the schema's first) with `setEmail(email: String!): User!`, `authScopes: { signedIn: true }`, resolver one line: `setEmail(session, email, ctx.emailVerification)`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `src/lib/auth.ts`                                                                 | (a) `mapProfileToUser` on all four providers: placeholder when the profile has no email (Google `sub`, Discord `id`, Facebook `sub ?? id`, Microsoft `oid`), `emailVerified: false` for the placeholder; Facebook/Microsoft keep their unconditional `false`. (b) `sendVerificationEmail`: return early for a placeholder. (c) `hooks.before` on `/verify-email`: decode the token payload (base64url, no signature check — the gate only ever refuses, and the endpoint verifies the signature after); when it carries `updateTo`, require `session.user.id` to be the row `email` names (else redirect `?error=SIGN_IN_TO_VERIFY` / 403, exactly as `beforeEmailVerification` does), refuse when any live row holds `updateTo` (`?error=EMAIL_TAKEN`), and `actingUser.set(user.id)` so the update hook stamps the write and `afterEmailVerification` runs. (d) `hooks.after` on `/callback/:id`: when `newSession.user.emailVerified` is false, throw `APIError('FOUND', undefined, { Location: '/account/email?next=' + encodeURIComponent(<endpoint's Location>) })` — the endpoint's `set-cookie` headers survive (`mergeResponseHeaders` sets `location`, appends cookies). |
| `src/lib/mail.ts`                                                                 | Refuse a recipient under `.invalid`: log, return, never fetch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `src/lib/sign-in.ts`                                                              | Drop the `email_not_found` mapping (the code can no longer occur; the generic sentence covers a regression).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `src/lib/account-email.ts` (new)                                                  | `verifyErrorMessage(code)` for `/account/email?error=`: `SIGN_IN_TO_VERIFY`, `EMAIL_TAKEN`, `TOKEN_EXPIRED`, `INVALID_TOKEN`, `INVALID_USER`, `USER_NOT_FOUND` → one readable sentence each, generic fallback.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `src/emails/verify-email.tsx`                                                     | `purpose: 'sign-up' \| 'change'` prop (default sign-up): the change wording says someone asked to use this address for an existing account. Story updated.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `src/app/account/email/page.tsx` (new)                                            | Server component: `requireSession()`, `getMe(session)`; props to the form: `email` (`''` for a placeholder), `verified`, `next = safeReturnPath(searchParams.next)`, `error = verifyErrorMessage(searchParams.error)`. `metadata.title`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `src/components/EmailForm/` (new: `index.tsx`, `index.scss`, `index.stories.tsx`) | Client component. Heading "Your email"; status line (verified / not yet verified / no email yet); one labelled `input type="email"`, **always editable — this page is how any user, verified or not, changes the email the site writes to, at any later time** (story 59). Submitting a different address requests a change (mail to the new address); submitting the same, still-unverified address resends; the same verified address has nothing to do, so the button is disabled with the "verified" status beside it. `useMutation` over `graphqlRequest(SetEmailDocument, { email })` (first codegen document under `src/`); a `VALIDATION` `fieldErrors` entry with path `['email']` renders inline beside the field via `aria-describedby`, an empty path or other code renders in the `role="alert"` region; success shows "We've sent a link to X — open it in this browser, within an hour"; a "Continue" link to `next` when verified. Styles: tokens and mixins only. No react-hook-form yet: one field, and DESIGN §7's resolver pattern arrives with the shared Zod schemas (M4.5) — noted in the component doc.                                                    |
| `src/graphql/schema.graphql`, `src/gql/`                                          | Snapshot regenerated (adds `type Mutation`), `npm run codegen` output committed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

## Where the post-sign-in landing lives

**Decided:** `/` is the public entry page, for everyone. (Since MB.80 the
compendium pages are public as well; `/` stays the entry page and the
post-sign-in landing stays `/coven`.) The post-sign-in
landing — into their workspace, the create form, or the invite-only
explanation (M2.8) — is its own route, **`/coven`**, protected like every
other page. A sign-in with no `next` lands there — a keeper's, since MB.113,
on `/admin` instead, and `safeReturnPath` now has no fallback, since which
landing applies is the role's ([`../auth/route-protection.md`](../auth/route-protection.md), "Route protection").

### The question

DESIGN.md §9 originally made `/` the post-sign-in landing, and M2.7's route
protection first built it that way: a signed-out visit to `/` redirected to
`/sign-in`. It was then directed to leave `/` public as the site's general
entry page, which left two pages claiming one path. Either `/` renders the
entry content signed out and M2.8's three states signed in, or the landing
moves.

### Why the landing moves

- **Two audiences, one file.** The front door is a page of prose that is the
  same for everyone. The landing is per-user routing — a redirect for the
  common case, a form for the second, an explanation for the third. Folded
  into `/`, the most common visitor (signed in, with a workspace) could never
  read the front door at all, because their visit is a redirect.
- **One guard, not two.** `/coven` is protected by the proxy and calls
  `requireSession()` like every other protected page. A combined `/` would
  have to read `getSession()` and then hand-write the three-way branch plus
  the signed-out case, which is `requireSession()`'s redirect rebuilt by hand
  on the one page that must not redirect.
- **The acceptance test stays honest.** Story 2's test reads the landing's
  source for "invite-only". The front door says "invite-only" to everyone, so
  if the landing were `/`, this task's own copy would turn story 2 green a
  wave and a half before M2.8 builds the state the story is about.
- **Nobody lands back on the door they came in by.** After the OAuth round
  trip, a visitor who signed in from the front door arrives at the landing,
  which routes them; with `next` defaulting to `/` they would arrive at the
  same page with one link changed.

### Why `/coven`, not `/home`

The three states are all statements about workspace membership: go into
yours, make one, or here is how one gets in. That is the index of the
workspaces the visitor belongs to, and it sits above `/coven/[slug]`, where
those workspaces live — the only place the site's URL vocabulary already has
a word for it. A generic `/home` would exist only to redirect into
`/coven/[slug]`. The URL segment says _coven_ by §5's rule; code, schema and
prose still say _workspace_.

### What `/` does with the session

It reads `getSession()` — never `requireSession()`, which would protect it
again — for exactly one decision: whether the way in is "Sign in" (to
`/sign-in`) or "Continue" (to `/coven`, or since MB.113 `/admin` for an
admin, the landing a sign-in with no return path gets; since MB.257 the callback and
Continue send a member of a coven straight into it, so `/coven` is only the stop for someone
in none). For an account whose address is unverified, Continue goes straight to
`/account/email?next=<that landing>` (from `sessionIsVerified()`, built by `emailPagePath`), since
every page it could lead to would send the account there; the landing is its `next`, so it goes on
there once verified. Everything else on
the page is the same for both. `/` stays in `PUBLIC_ROUTES`.

### What this rules out

- `/` redirecting anyone, anywhere, for any session state.
- A third route for any part of the landing. The create form and the
  explanation are `/coven`'s states, not siblings of it; M2.8 decides their
  shape.
- Reading `/` in an acceptance test for anything about a signed-in user.

### Since M2.8

`/coven` has its page (`src/app/(shell)/coven/page.tsx`). A member is
redirected into the first coven the switcher lists; someone with none who may
create one is offered the create page; anyone else reads that the site is
invite-only and how to get in. "Continue" on the front door and on the email
page are `<Link>`s, typed by `postSignInLanding` returning Next's `Route`
(since MB.257, `signedInLanding`, which also sends a member into their coven).

Since M10.32, both non-member states tell the account, in a notice, how many
pending coven invitations wait for its verified email and link to the account
page's Invitations section, where they are listed and accepted; a member is
still redirected. The first build listed them on the landing itself, and the
owner moved the list to the account page on 2026-10-13
((see "A coven invitation is accepted from the account page as well as from the mail"),
"Where the list lives").

## First-party email verification and email delivery

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
- MB.68 promotes the primary keeper at first-party verification.
- MB.54 is re-scoped to build the email page on those.
- MB.69 and MB.70 are the admin invitation's table and behaviour (story 62).
- M7.3, M7.4 and M7.5 are rewritten for delivery by mail.

MB.69 and MB.70 are separate because CLAUDE.md puts a table and the service
that governs it in separate tasks.

### Where things stand

Everything below was read from the installed Better Auth, in
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

### Decision

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
window waits for the row to lapse, shown the generic `account_not_linked`
sentence rather than the reason, since naming the squat would confirm the
address is taken (MB.71, "Provisional accounts and the sweep" below).

**Delivery is Resend in production, the Mailtrap Sandbox in previews, Mailpit
locally, all over HTTP,** chosen by `MAIL_TRANSPORT` and guarded so that a
wrong value in the wrong environment sends nothing.

**`users.emailVerified` now means one thing.** Facebook and Microsoft are
pinned unverified through `mapProfileToUser` at every sign-in, so a true value
was set by Google, by Discord, or by our own mail. That is what lets the sweep,
the invitation match and the admin invitation key on the column. Inside an
explicit link, where every provider vouches, the vouch never reaches the row
(MB.71, [`../auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "Linking a second provider").

**What stays off** stays off: `user.changeEmail` (the email page replaces it),
`overrideUserInfoOnSignIn`, `accountLinking.trustedProviders`, and now
`requireLocalEmailVerified` stays at its default, pinned like the others.
Verification does not make a never-vouching provider linkable at sign-in, and
nothing here should: such a provider is added to an account by an explicit
link from a signed-in session (MB.71), with `accountLinking.allowDifferentEmails`
on and `allowUnlinkingAll` off pinned beside these.

### The token, and who may follow the link

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

### What an unverified account can and cannot do

It can sign in, reach the email page, change the address, resend the mail, and
sign out. It cannot accept a workspace or admin invitation or an invitation card (M15.17; a card admits any verified account, and an unverified one is sent to the email page), be promoted to
admin, create a workspace, or hold its address past one window without
verifying. It is not listed as verified on `/admin/users`, which MB.52 already
shows.

### Provisional accounts and the sweep

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
that row is a keeper.

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
is taken (MB.71, (see "Linking a second sign-in method")).

### The audit trail, against rules 1 and 3

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

### Delivery

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

### MB.54: the email page

**Corrected by MB.54's build** (see "Set the account's email: prefilled from the provider, editable, verified before it counts"): a change
never writes `users.email` and never unverifies a row, because an established
account marked unverified would be older than the cap below and swept; the
new address is mailed Better Auth's own change link instead. The shape is
[`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "The email page
(MB.54)"; the rest of this section stands.

`/account/email`, protected, shows the current address and whether it is
verified. Changing it is a `setEmail` mutation to a service, refused when a
live verified row already holds the address. The provider's address is what
the page starts with, and every unverified sign-in lands there.

**A provider that returns no address gets a placeholder.** `mapProfileToUser`
yields `<providerId>-<providerAccountId>@pending.invalid`: `.invalid` is
reserved and can never be mailed or matched, the row and session exist, and
the page asks for an address instead of the callback dying on
`email_not_found`. The placeholder is provisional like any unverified row and
is swept with them. The "bootstrap address is refused outright" criterion
goes: typing it is harmless, since verifying it is the promotion (MB.68) and
only its owner's inbox can.

Reached later from the account, the same page is how an email changes (story
59), which is why `changeEmail` stays off.

### Invitations by email

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

### The admin invitation (story 62)

**Superseded in part by MB.201 and MB.202 (2026-10-10):** `admin_invitations` and `workspace_invitations` became one two-tier `invitations` table, a keeper invitation being its site tier, a null workspace and role. One accept service and one route, `/invite/[token]`, serve both tiers, landing by tier, so there is no `/admin-invite/[token]`; MB.70 keeps the pause, the note and its pending list on `/admin/users` ((see "Workspace and admin invitations are one two-tier table"); [`db/invitations.md`](../db/invitations.md)).

M2.9's option B, now buildable, as a table task and a behaviour task.
`admin_invitations` (MB.69) is shaped like `workspace_invitations`: only the
token's hash is stored, and it expires in seven days. `createAdminInvitation`
(MB.70) mails the link and returns no URL, and `/admin-invite/[token]` accepts
only a signed-in account whose verified email matches the invitation's.
Accepting is a grant through MB.59's `setUserRole`, so it writes the ledger
row and is refused while changes are paused. The two entries in
[`tasks/mb.md`](../tasks/mb.md) hold the columns, the rejections and the
admin list's controls.

### Which of MB.60's restrictions each follow-up lifts

- **MB.66** lifts "an address is verified only when a provider says so", for
  every purpose but one: invitations, the email page and the squat all key on
  the column now.
- **MB.67** lifts "have the owner sign in before anyone else can sign up with
  the address" from `secrets.md` and `../auth/README.md`, and closes the squat
  described under "What is simplified" in
  (see "Granting and revoking admin").
- **MB.68** adds a second way to become the primary admin: verifying the
  bootstrap address by mail, from a session that holds the row. A Microsoft-
  or Facebook-only steward can now be promoted. It is safe only because of the
  session binding above, and it is the one place first-party verification
  touches promotion.
- **Kept:** the sign-in promotion still decides on the callback's fresh
  Google or Discord profile and never on the stored column, so a Microsoft
  sign-in over a verified row still promotes nobody. Microsoft and Facebook
  never vouch at sign-in, and so are never matched to an existing row by
  address: either is added to an account only by an explicit link from a
  signed-in session (MB.71), where the session and the account-id binding
  guard what the vouch would have. The three pinned options stay pinned.

### What is simplified, and the hole it leaves

The squat closes for every address, MB.54 becomes a page rather than a
pre-session interstitial, the two things MB.60 cut from its first draft land
in MB.67, and both invitation flows exist. Notifying keepers of a grant becomes
possible and stays unscheduled.

**The hole:** a steward whose address is squatted waits up to one hour, and is
told so. A leaked verification token is good for one hour and one boolean. A
verification mail that a user did not request is refused when they click it,
which is correct and will read as a broken link; the mail says why.

### Out of scope

- **Notifying existing keepers of a grant.** Possible now; not scheduled.
- **Rate-limiting resends** beyond what Better Auth does. The email page's
  resend is a mutation like any other, and a few mails a week never meets a
  cap.
- **A mail log table.** Resend and the Sandbox keep their own logs; nothing
  here reads them.
- **Email and password sign-in**, still §13's, and DMARC beyond what Resend's
  domain setup asks for.
- **A scheduler.** The sweep rides on the next callback; a cron for it is a
  second access path for a query that fires anyway.

### The follow-up

MB.65 through MB.70, written into `TASKS.md` with their acceptance criteria;
M7.3, M7.4 and M7.5 rewritten in place; MB.54 re-scoped; story 62 added to
§11's acceptance file and §7 corrected.

- **MB.65, MB.66, MB.67 and MB.68** land in Wave 6, in that order, between
  MB.61 and MB.54. The transport first, since verification has nothing to
  send with; verification before the sweep, since the sweep keys on the
  column and the resend clock; promotion last, since it is one hook on top.
  MB.54 follows them because its page is built on the session and the resend
  they provide. It later moved to the end of Wave 7, after MB.43, for the
  reason its entry gives.
- **MB.69 and MB.70** follow MB.63 in Wave 8: the admin invitation is a grant
  through MB.59's service under MB.63's pause, and its table lands alone
  first. Two tasks because CLAUDE.md puts a table and the service that
  governs it in separate tasks.
- **M7.3, M7.4 and M7.5** keep their ids and sizes in Wave 10, and M7.3 now
  depends on MB.65.

## The admin-role-change pause is a ledger, not a settings row

M2.9 gave the primary keeper a switch that stops every other keeper granting
or revoking admin while a rogue admin is dealt with
((see "Granting and revoking admin"), "Granting"). It
specified the switch as a one-row `site_settings` table, its one row seeded by
the migration, holding `adminRoleChangesPaused`, and MB.62 was written to
build that. Building it showed the row could not be seeded, and the owner
chose a different shape. DESIGN.md §5, `admin_role_change_pauses`, carries the
model; this record carries why.

### The problem with one seeded row

Every audited table's `created_by` and `updated_by` are `NOT NULL` foreign
keys to `users` (CLAUDE.md rule 3). A migration that writes the settings row
has to stamp it as somebody, and on a fresh database nobody exists yet:
migrations run before any seed, so the seed's bootstrap user is not there.
The test template, CI's databases, `db:reset` and any new environment are all
migrated empty, so the migration would fail on every one of them. Staging and
production already hold the bootstrap user, which is why the problem only
shows on a fresh database.

The options weighed, briefly:

- **The migration inserts the bootstrap user first**, if missing, then the
  row. It works, but the bootstrap user's fields would be written in a frozen
  migration as well as in the seed, and on a fresh database the migration's
  copy would win, since the seed skips a row it finds. It would also be a
  third writer of `users` outside `withAudit`, beside the two rule 3 names.
- **Move the bootstrap user into a migration outright**, dropping it from
  the seed. One definition, but a larger change to the seed module for a
  switch's sake.
- **The seed writes the row.** A database that is migrated but not seeded has
  no row, so "not paused" would have two spellings, a `false` and an absence,
  and MB.63's update would match nothing there.
- **Treat absence as unpaused and upsert on the first flip.** The same two
  spellings, and an insert the table task had ruled out.
- **Relax the audit stamps on this one table.** Breaks the one shape every
  audited table shares, and the sweep tests with it.

### Decided

**One row per pause.** `admin_role_change_pauses`: `id`, `ended_at` and
`ended_by` (null while the pause holds), and the full `...auditColumns`
spread. Pausing inserts a row, so `created_by` is who paused and `created_at`
when; resuming stamps `ended_at` and `ended_by`. "Paused" is a live row with
no `ended_at`. Nothing is seeded, because no row means nothing has ever been
paused, which is the one state a fresh database can be in. The bootstrap
problem disappears rather than being worked around.

- **At most one open pause**, by a unique index on a constant,
  `((true)) WHERE ended_at IS NULL AND deleted_at IS NULL`, so a second open
  pause is a constraint error, the guarantee the single-row check was for.
  Partial on `deleted_at` as rule 4 has every unique index.
- **The ended pair goes together**, by a CHECK:
  `(ended_at IS NULL) = (ended_by IS NULL)`.
- **Its own pair rather than the update stamps.** Ending is the only update
  the table takes, so `updated_by` would say the same thing today, but
  whether a pause holds is then a column rather than an inference from which
  write came last.

**The history is kept, and that is a by-product, not a feature.** MB.63's
entry had called a history of flips v2's edit history and declined to keep
it. A ledger keeps it anyway, because each pause is its own row: who paused,
who resumed, and when, for the same reason MB.58 keeps the role ledger, since
a single row's `updated_by` is overwritten by the next flip. Nothing in v1
lists it; MB.63 reads only the open pause.

**`site_settings` is not built.** It was a home for site-wide settings, and
the pause was its only tenant; nothing else in v1 names one. A later setting
that is a value rather than an event can make its own case for the table
then.

### The repository

The table is reached through three named calls, each under the `SiteAdmin`
proof, since only a keeper's act asks:

- `findOpenAdminRoleChangePause(admin)`, the open pause or `undefined`;
- the writer's `pauseAdminRoleChanges(admin)`, which opens one and returns no
  row while one is already open (`ON CONFLICT DO NOTHING`, so the caller's
  transaction is not failed by a double click);
- the writer's `resumeAdminRoleChanges(admin)`, which ends the open pause,
  stamping `ended_at` now and `ended_by` from the session, and returns no row
  when none is open.

`NotPauseLedger`, `{ endedAt?: never }`, takes the table off the writer's
generic insert, both updates, both soft deletes and the hard delete, as
`NotAppendOnly` did for MB.58's ledger (removed 2026-10-10 by MB.196: that ledger's successor, `user_privilege_changes`, is append-only by a database trigger instead). Without it the generic insert would
take a pause already ended, and the generic update would reopen one or
backdate it. The two named writes take the writer from fifteen methods to
seventeen, which `write.test.ts` pins as a decision.

**Superseded in part by MB.198 (2026-10-10):** `NotPauseLedger` is gone. The table is marked `namedWrites` in its schema file, and every generic writer method refuses a marked table, so the refusal no longer rests on `ended_at` being a column no other table carries. The pause and the resume moved beside the finder, into `admin-roles.ts`, and `writerFor` spreads them into the writer; the writer's methods and their count are unchanged ([`db/write-path.md`](../db/write-path.md), "Table marks").

Who may pause is MB.63's, as before: only the primary keeper may pause or
resume, and only the primary keeper is exempt from a pause. DESIGN.md §5 had
said the pause covered the primary keeper too; M2.9's record and MB.63's entry
had the exemption, and this PR corrects §5 to match them, on the owner's
call.

## Linking a second sign-in method

Live home: `claude-docs/auth/admin-bootstrap.md`.

### Decision

- **A second provider is added by an explicit link** that `/link-social` began under a session. At sign-in, an unknown provider account is linked to the row holding its email only if the provider vouches for the address, which Microsoft and Facebook never do, so for them the explicit link is the only way. Inside a link `vouchWhenLinking` (`src/lib/auth.ts`) makes every provider vouch, and that value feeds only Better Auth's link decision.
- **The link flow's state is server-side** (Better Auth's `api/routes/account.mjs`), not client-supplied, and uses `allowDifferentEmails`; it then creates the `accounts` row.
- **It never writes `emailVerified`**, issues no session (so the after-hook does not run), and a linked provider's profile never rewrites the row. The link is never consulted again at sign-in, so an email-takeover attack on the provider cannot reach it.
- **Better Auth's `unable_to_link_account` sentence is wrong** for what the code means ("provider did not vouch during a link"), so the page shows a generic sentence instead.

### Why

Linking by email at sign-in lets a provider that does not verify addresses take over an account, so the vouch is lent only inside a flow a session started.

### Rules out

- Linking by an unvouched email at sign-in.

## Better Auth's plugin roster: what lands before launch, what waits

**Decided 2026-09-27.** Scoping only; nothing here is built. Better Auth ships
about twenty-five plugins. This record says, for each, whether it lands before
launch, waits for v2, or is never used here. Two had been decided already and
are unchanged: the `organization` plugin is not used
(see "Better Auth's organization plugin for workspaces and invitations"), and the
`admin` plugin is registered outside production for impersonation alone, with
every other endpoint unreachable (MB.53,
(see "Granting and revoking admin")).

The outcome is four follow-up tasks and one change to §13:

- **MB.75 and MB.76** pin the rate limiter Better Auth already runs, which is
  on in every deploy and counts per instance. MB.76 also turns on encryption
  of the stored OAuth tokens and pins the session lifetimes.
- **MB.77** marks the provider a browser last signed in with on the sign-in
  page.
- **MB.78** registers the OAuth proxy on previews, so a hotfix preview can
  complete a real sign-in.
- **Passkeys become the v2 first-party credential** in DESIGN.md §13, in
  place of email and password.

### The frame

The site signs in through four OAuth providers and nothing else, and it is
invite-gated: an account earns nothing until an invitation or a keeper grants
it (DESIGN.md §2, §8). Most of Better Auth's roster exists to secure a
credential the site holds itself, such as a password or a mailed code, or to
serve a client that is not a browser. This app has neither. So each plugin has
to earn its place against a rule that already excludes it, and against two
architecture rules:

- **Rule 1.** Every plugin mounts routes under `/api/auth/*`, the one path
  outside `/api/graphql`. That exception covers establishing identity, not
  application data.
- **Rule 3.** A plugin writes through Better Auth's adapter, outside
  `withAudit`. That is acceptable for Better Auth's own adapter tables
  (`sessions`, `accounts`, `verifications`), which carry no audit spread, and
  not for anything that is application data.

### Where things stand

Everything below was read from the installed Better Auth, in
`node_modules/better-auth/dist` and `node_modules/@better-auth/core/dist`,
not from its documentation.

- **No plugin is registered.** `src/lib/auth.ts` has no `plugins` key and
  `src/lib/auth-client.ts` none either. The one import from a plugin module is
  `createAccessControl` from `better-auth/plugins/access`, which is a helper
  and not a plugin (M6.3).
- **The rate limiter is already on in every deploy.**
  `context/create-context.mjs` defaults `rateLimit.enabled` to
  `NODE_ENV === 'production'`, which every Vercel build is, staging and hotfix
  previews included (`../auth/README.md`, "Config"). Its storage defaults to `memory`, a
  module-level `Map` in `api/rate-limiter/index.mjs`, so on Fluid Compute each
  function instance counts alone. The built-in rules give sign-in paths 3
  requests per 10 seconds and `/send-verification-email` 3 per 60 seconds,
  keyed on client IP and path. Nothing in the repo configures or pins any of
  it.
- **An unresolved client IP collapses every visitor into one bucket.**
  `getIP` in `@better-auth/core/dist/utils/ip.mjs` reads `x-forwarded-for`
  unless told otherwise, and trusts it only when it holds a single address or
  when `advanced.ipAddress.trustedProxies` is set. Otherwise it returns
  `null`, and the rate limiter keys the request as `no-trusted-ip|<path>`,
  logging a warning once. On `/sign-in/social` that would be three sign-ins
  per ten seconds for the whole site. Whether it happens depends on what
  Vercel sends, which nobody has checked.
- **Database storage for the limiter is built in.** `storage: 'database'`
  uses a `rateLimit` model (`key` unique, `count`, `lastRequest` as a bigint of
  milliseconds), increments it atomically through the adapter's
  `incrementOne`, and prunes expired rows in the background. The Drizzle
  adapter implements `incrementOne`. The table does not exist yet.
- **OAuth tokens are stored in plaintext.** `accounts` holds each provider's
  access, refresh and id tokens as the provider issued them.
  `account.encryptOAuthTokens`, off by default, encrypts the access and
  refresh tokens under `BETTER_AUTH_SECRET`; the id token stays as issued
  (corrected by MB.76, which read the write path). `oauth2/utils.mjs` decrypts only a value that looks
  encrypted, so rows written before the switch keep reading. Nothing in the app
  reads these tokens.
- **Two-factor never challenges an OAuth sign-in.** The plugin's `after` hook
  in `plugins/two-factor/index.mjs` matches only `/sign-in/email`,
  `/sign-in/username` and `/sign-in/phone-number`. Registered today it would
  add a `two_factors` table and a `users.two_factor_enabled` column and
  protect nothing.
- **Last-login-method is a cookie unless told otherwise.**
  `plugins/last-login-method/index.mjs` sets a readable, non-`httpOnly` cookie
  holding the provider id whenever a response sets the session cookie, which
  for this app is `/callback/:id`. It writes to the database only with
  `storeInDatabase`, which would add `users.last_login_method`.
- **The OAuth proxy can serve a preview through a fixed callback.**
  `plugins/oauth-proxy/index.mjs` rewrites a sign-in started on a preview so
  the provider calls back to a fixed `productionURL`. That deployment exchanges
  the code, encrypts the profile and tokens with the shared secret, and
  redirects to the preview's `/callback/:id/oauth-proxy`, which creates the
  user and session there. The redirect target must be a trusted origin, and
  `getTrustedOrigins` in `context/helpers.mjs` derives trusted origins from
  `baseURL.allowedHosts`, which already names `hotfix-*.sorrelandsalt.com`.
  The payload expires after 60 seconds by default.
- **Hotfix previews cannot sign in today.** Every provider requires an exact
  redirect URI registered in advance, and a hotfix slug does not exist until
  its PR does (`secrets.md`, "Hotfix previews still can't complete a real
  sign-in with any provider"). That also leaves MB.53's impersonation unusable
  on a hotfix preview, since a keeper has to sign in before they can
  impersonate anyone.
- **Passkeys, SSO, API keys and the OIDC provider are separate packages.**
  None ships in `better-auth` itself and none is installed.
  `@better-auth/passkey` declared a newer `better-auth` than the installed one
  as its peer, so adopting it meant a core bump.
- **Better Auth's own account deletion is a hard delete.** `/delete-user` in
  `api/routes/update-user.mjs` calls `internalAdapter.deleteUser`, then
  deletes the user's sessions.

### The approaches

Each family is weighed against what it would protect or enable here.

#### Rate limiting

**A. Leave it as shipped.** Memory storage, IP from `x-forwarded-for`.

- **Failure: it limits almost nothing.** Each Fluid Compute instance keeps its
  own count, so a burst spread across instances passes, and a cold instance
  forgets.
- **Failure: the fallback is an outage.** If Vercel's header ever carries more
  than one address, every visitor shares one bucket per path.

**B. Keep memory storage, pin the IP header.** Set `ipAddressHeaders` from a
real deployed request and test that the fallback is unreachable.

- **Cost:** fixes the outage and leaves the counting per instance.

**C. Database storage.** A `rate_limits` table owned by Better Auth's adapter,
plus B's header pin.

- **Cost: one read and one write per `/api/auth/*` request.** Those requests
  are a sign-in, a callback, a session read, a resend. The session read is the
  frequent one, and it already costs a query.
- **What it buys:** one count across every instance.

**Resolved: C.** The table is Better Auth's, like `sessions`, so it carries no
audit spread and no `set_updated_at` trigger (`../auth/README.md`, "Tables"). It lands
alone first, as MB.75, under the table-then-behaviour convention, and MB.76
turns it on.

#### Sign-in convenience

**`lastLoginMethod`, cookie only: adopt.** The sign-in page answers
`account_not_linked` with one sentence: sign in the way you did before, then
add this provider under Account (MB.71). It cannot say which way that was,
because the server naming the provider would confirm the address has an
account. The browser's own cookie can say it, and it reveals nothing the
browser did not already know. No schema, no query. `storeInDatabase` stays
off, since it would add a column for nothing a page reads. MB.77.

**`oneTap`: reject.** It loads Google's script on the public `/` to make
sign-up frictionless, which an invite-gated site does not want.

**`multiSession`: reject.** Several signed-in accounts per browser. One
address is one account (M2.9) and no story asks to switch.

#### Preview sign-in

**`oAuthProxy`, on previews only: adopt.** Registered only at
`VERCEL_ENV=preview`, with `productionURL` set to staging's origin, which
already has registered redirect URIs. It is gated the way MB.53 gates the
`admin` plugin: at production, and locally, the plugin is never constructed,
so its endpoint is absent rather than refusing. MB.78.

- **Cost: the app's callback hooks do not run on the preview side.** The
  preview completes on `/callback/:id/oauth-proxy`, and `src/lib/auth.ts`
  matches `ctx.path === '/callback/:id'` for the provisional-account sweep and
  for the primary-admin promotion. On a preview that means no sweep and no
  promotion at sign-in. The sweep is housekeeping and runs on staging's side
  of the same callback anyway. Promotion at verification still works. MB.78
  decides whether either hook should also match the proxy path, from running
  code.
- **Cost: tokens transit staging.** The profile and tokens are encrypted under
  the Preview secret, which staging and every hotfix preview share already
  (`secrets.md`), and expire in a minute.
- **What it buys:** a hotfix preview a person can sign in to, and so an
  MB.53 impersonation that works where it is meant to. MB.78 lands
  immediately before MB.53.

#### A first-party credential

**Passkeys: v2, and they replace email and password in §13.** §13 keeps email
and password out because a password needs a reset, and a reset is a backdoor
into any account. A passkey is a credential the site holds with no password
and no reset: someone who loses their device signs in through their provider
and enrols another. What it would need: `@better-auth/passkey` and a core
bump to match, a `passkeys` adapter table, an enrol control on MB.71's
`/account` page, and the understanding that a passkey is bound to its origin,
so staging's and production's are distinct.

**Magic link and email OTP: v2, behind passkeys.** Each is a sign-in for
someone who has none of the four providers, over MB.65's mail transport, with
the token or code stored hashed (`storeToken: 'hashed'`, `storeOTP:
'hashed'`). One interaction to settle first: a user who signs in by mail has
no `accounts` row, and MB.67's sweep treats a row with no `accounts` row as
unsweepable. `emailOTP` could also replace MB.66's link with a code typed into
`/account/email`, which is session-bound by construction; MB.66 is built and
its session check does the same job, so that is not worth reopening.

**Email and password: stays v2, and passkeys make it unnecessary.** §13's
reasoning stands for passwords. It no longer argues for a password as the only
way to have a first-party credential.

**Two-factor, `captcha` and `haveIBeenPwned`: only if email and password
lands.** Two-factor challenges password sign-ins only, and every provider
already offers its own; a passkey is phishing-resistant multi-factor on its
own. `captcha` and `haveIBeenPwned` default to password endpoints, and
invite-gating means a bot that signs up earns nothing. Site-wide bot control,
if it is ever needed, is the platform's: Vercel's WAF, already in
`backlog.md`.

#### Other clients and tokens

**`jwt`: reject.** It does not replace the session cookie; it issues a token
beside it, at `/token` and in a `set-auth-jwt` header, for a separate service
to verify against a JWKS endpoint. This app has no such service. Its one
mode that stands in for the cookie, `sessionCookieCache`, requires
`session.cookieCache.strategy = 'jwt'`, and MB.59 pins the cookie cache off so
that a revoked admin is refused on their next request rather than after a
cache lifetime. The cookie plus one session read per request is the cost that
buys that.

**`bearer`: reject.** It rewrites an `Authorization` header into the same
session cookie, so it grants nothing a `Cookie:` header does not (MB.73).

**`oneTimeToken`, `deviceAuthorization`, `oauthPopup`: reject.** Each serves a
client that is not this app's one cookie-authenticated browser client per
origin.

#### Account deletion

**Better Auth's `user.deleteUser`: reject.** It hard-deletes the `users` row.
Every `created_by` and `updated_by` in the schema references `users.id` with
no `ON DELETE` action (`src/db/audit.ts`), so the delete fails for anyone who
has written a single row, and succeeds only for a user who never did
anything. Soft-deleting instead is not safe either, for the reason MB.67
found: Better Auth finds a user by address with no `deleted_at` filter, so a
verified tombstone would take an implicit link from any provider vouching for
its address and bring the account back.

If v2 adds account deletion, it is a service of our own under `withAudit`:

- tombstone the `users` row, so every row it authored keeps its author;
- rewrite its email to `<id>@deleted.invalid`, which can never be mailed or
  matched, so no sign-in finds it;
- hard-delete its `accounts` and `sessions` rows, Better Auth's adapter
  tables, which cascade already;
- refuse the primary keeper (MB.59).

No task is minted: v1 has no deletion story.

#### Everything else

- **`username`, `phoneNumber`, `siwe`:** other sign-in schemes, each with its
  own columns. None fits OAuth-only.
- **`anonymous`:** a `users` row and a session for a visitor, so work done
  before signing up can be kept. Not a sign-in scheme this site wants, and
  not what a public read needs: MB.80 weighed it against the public
  compendium and declined it for v1. It is v2's try-before-sign-up
  (DESIGN.md §13) if that is ever wanted.
- **`genericOAuth`:** the mechanism for a provider outside Better Auth's
  built-in roster. Worth knowing; no such provider is wanted.
- **`openAPI`:** a reference page for `/api/auth/*`. The API a developer
  explores is GraphQL, and MB.73 serves Altair for it.
- **`customSession`:** reshapes `/get-session`. The app reads the session
  through `auth.api.getSession` and maps it itself (`src/lib/request-session.ts`).
- **`admin`** beyond MB.53's two endpoints, and **`organization`:** decided
  already, unchanged.
- **`@better-auth/stripe`:** weighed on its own, against the subscriptions the
  owner means to charge, by MB.79. v2 and not yet adopted; DESIGN.md §13's
  "Subscription billing" carries its fit.

### Decision

**Adopted before launch:**

| Task  | What                                                                                                       |
| ----- | ---------------------------------------------------------------------------------------------------------- |
| MB.75 | The `rate_limits` table, Better Auth's own                                                                 |
| MB.76 | Database-backed rate limiting, a pinned client-IP header, OAuth token encryption, session lifetimes pinned |
| MB.77 | `lastLoginMethod`, cookie only, marked on the sign-in page                                                 |
| MB.78 | `oAuthProxy` at `VERCEL_ENV=preview` only, so hotfix previews complete a sign-in                           |

**v2, in this order:** passkeys, then magic link or email OTP. Two-factor,
`captcha` and `haveIBeenPwned` only if email and password ever lands. The
Stripe plugin is v2 as well, decided separately by MB.79 and left to a
test-mode spike. `anonymous` is v2 too, only if try-before-sign-up is wanted
(MB.80, DESIGN.md §13).

**Never here:** `jwt`, `bearer`, `oneTimeToken`, `deviceAuthorization`,
`oauthPopup`, `multiSession`, `oneTap`, `username`,
`phoneNumber`, `siwe`, `genericOAuth`, `openAPI`, `customSession`, Better
Auth's `user.deleteUser`, and the `admin` and `organization` plugins beyond
what MB.53 and MB.30 already decided.

**The session lifetimes are pinned as they are.** DESIGN.md sets none, so
Better Auth's defaults apply: a session lasts seven days, is extended once a
day while in use, and counts as fresh for a day. MB.76 pins them by test,
in the block MB.59's `cookieCache` pin joins, so a dependency bump that moves a default
fails a test rather than changing how long someone stays signed in.

### Out of scope

- **Building any of it.** Each follow-up is its own task.
- **A shared cache for rate limiting** such as Upstash Redis through
  `secondaryStorage`. The database is already there; a second store is a
  second dependency for a site sending a few sign-ins a day.
- **Rate limiting `/api/graphql`.** Better Auth's limiter covers only
  `/api/auth/*`. GraphQL's protections are graphql-armor's (M3.3).
- **Vercel's WAF.** Stays in `backlog.md`.

### The follow-up

MB.75 through MB.78, written into `TASKS.md` with their acceptance criteria.

- **MB.75, MB.76 and MB.77 close Wave 7**, after MB.71. MB.75 before MB.76 is
  the table-then-behaviour rule. MB.77 follows MB.71 because its mark answers
  the sentence MB.71 writes.
- **MB.78 lands in Wave 8 immediately before MB.53**, whose impersonation it
  makes usable on hotfix previews. _Since moved to Wave 15, post-launch, on the
  owner's call: hotfixes are not needed before launch, and the hotfix path
  needs infrastructure fixes before its branches work properly._
- **DESIGN.md §13** names passkeys as the v2 first-party credential, and §14
  records this decision.

## Every admin holds `canCreateWorkspace`

The owner's call: every keeper can create a coven. The spec already said so,
as a second rule beside the flag, and no keeper row agreed with it. This
record says why the rule became an invariant on the row rather than a second
prong in the gate. DESIGN.md §5, `canCreateWorkspace`, carries the model.

### Decision

The flag is what lets anyone create a workspace, keepers included, and every
admin holds it:

- A CHECK on `users`, `users_admin_can_create_workspace`, refuses a row with
  `role = 'admin'` and `can_create_workspace = false`. It binds soft-deleted
  rows too, since it states a fact about the row, not uniqueness.
- Its migration first sets the flag on every keeper row, soft-deleted
  included, stamped as that keeper as MB.58's backfill was, then adds the
  constraint.
- Promotion writes both columns in its one audited update; MB.59's
  `setUserRole` inherits that. Revoking admin leaves the flag, as before.
- Fixture E is seeded with the flag.
- M6.7's gate reads the flag alone, never `role`.

### Why an invariant and not a second prong

- **One rule, read one way.** With the prong, every reader of "may this
  person create?" had to know the admin rule — the gate, the awaiting filter,
  the user list's column, any future report. With the CHECK, the column is
  the answer.
- **Impossible, not absent.** Setting the flag at the grant alone would leave
  a hand-written `UPDATE`, an older row or a future writer free to break it.
  CLAUDE.md's sweep-task tell applies: the state can be made impossible, so
  it is.
- **No new fixture lost.** E existed to exercise the admin prong. With no
  prong there is nothing for it to distinguish, and E now proves the other
  thing: a keeper creates through the flag like anyone else.

### What it costs

- **M5.8 cannot revoke a keeper's flag.** The CHECK would refuse it; M5.8's
  service refuses it first with an explaining error, and revoking admin is
  the route. Revoking admin leaves the flag, so a former admin keeps it — the
  grant was a vouching too ((see "Granting and revoking admin"),
  "Revoking").
- **A hand-promoted admin needs both columns.** The stop-gap `psql` route
  ([`admin-bootstrap.md`](../auth/admin-bootstrap.md), "Granting a second
  admin") sets `can_create_workspace` with `role`, or the CHECK refuses it.
- **Test rows that insert a keeper set the flag**, through the raw client as
  every setup row is.

**Superseded in part by M11.20 (2026-10-16):** the CHECK now covers curators
too. Its migration replaced `users_admin_can_create_workspace` with
`users_privileged_can_create_workspace`, `role = 'user' or can_create_workspace`,
so every keeper and every curator holds the flag and the gate still reads the
flag alone. The reasoning above stands for both roles; what changed is the
name the CHECK uses, `user` in place of `admin`
(see "A third site role, `curator`").

## One privilege ledger, written by the database

Two tables recorded who changed whose privileges: MB.58's
`admin_role_changes`, one row per change to `users.role`, and MB.193's
`workspace_creation_changes`, one row per change to
`users.can_create_workspace`. They had one shape, each had its own task,
schema file, schema test, enum and doc entry, and each relied on the service
that changed the column remembering to write the row. A third privilege would
have been a third of everything. The owner asked how to stop ledgers
multiplying; this record is the answer.
DESIGN.md §5, `user_privilege_changes`,
carries the model.

### The model

**One table, `user_privilege_changes`**: `userId`, `privilege` (`admin` |
`create_workspace`), `change` (`grant` | `revoke`), `via` (`bootstrap` |
`admin` | `invitation` | `manual`), `note` (nullable), and the full audit
spread. `created_by` is the actor and `created_at` when. `privilege` names the
`users` column a change was to, `role` as `admin` and `can_create_workspace`
as `create_workspace`.

**Filled by a trigger on `users`** (MB.195), `AFTER INSERT OR UPDATE`, one row
per watched column that changed, `change` derived from the old and new values.
Nothing in the application inserts into it.

**The route is declared, and refused when absent.** `via` is read from the
transaction-local setting `app.privilege_route`, which `withAudit(session, fn,
{ via, note })` publishes beside `app.current_user_id`, and `note` from
`app.privilege_note`. A privilege change that declared no route raises.

**Append-only by the database.** `forbid_rewrite()`, attached `BEFORE UPDATE
OR DELETE`, raises on every update and delete from every client. TRUNCATE is
left open, as the test harness's resets need it.

The two old ledgers were copied in by MB.194's migration with their ids and
stamps: `admin_role_changes`' `bootstrap`, `grant` and `revoke` become `admin`
rows with that change, by `bootstrap`, `admin` and `admin`;
`workspace_creation_changes`' `grant` and `revoke` become `create_workspace`
rows by `admin`, its `invitation` a grant by `invitation`, and its `admin` (a
user made admin while the flag was off, MB.177) a grant by `admin`. The old
`admin` change needs no route of its own: the reader sees the `admin` grant
and the `create_workspace` grant at one instant by one actor. MB.196 removes
the code that names the old tables and MB.197 drops them, sweeping again with
`ON CONFLICT (id) DO NOTHING` for rows the outgoing deploy wrote mid-rollout.

It is not §13's edit history. That records every column of every table as a
revision; this records two columns of one table as a privilege's account, the
question a keeper asks when misuse is suspected.

### Why a trigger

- **It cannot be forgotten.** Every path that changes a privilege column
  writes a row: a service, the seed, a later task's new writer, and a `psql`
  break-glass update. With services writing the ledger, each new writer was a
  place to forget it, and a `psql` fix left no trace at all.
- **It cannot be bypassed.** A row the database writes in the same
  transaction as the change cannot be skipped by a caller that holds a
  writer, and the ledger cannot be edited afterwards by one that holds a
  client.
- **A privilege is a column, not a table.** A third flag on `users` is a value
  in `user_privilege` and a line in the trigger, not a table task.

The write path already reserved `app.current_user_id` for this
(`src/db/repository/write.ts`, "what makes the v2 history trigger … one
migration"): the trigger stamps the row with the actor the transaction
published, or with the row's own `updated_by` where none was published, as the
seed and a `psql` fix stamp themselves.

### Why the route is declared, and refused when absent

The trigger knows which column changed and who changed it, but not how the
change came about: a keeper's act, an invitation accepted, the primary
admin's bootstrap and a hand-run fix all set the same column. The service
knows, so it says, through a setting published in the same `set_config`
statement as the actor, transaction-local as that is. A missing route is an
error rather than a default: a default would let a new writer record a wrong
route silently, where an error fails that writer's first test, and a `psql`
fix has to say `manual` before it may change a privilege at all.

Better Auth's own writes to `users` (sign-up, profile, verification) touch
neither column, and the trigger's `WHEN` clause keeps them off its path, so
they need declare nothing.

### Why one database trigger replaces the type markers

Append-only was the writer's job: `NotAppendOnly`, `{ change?: never }`, took
any table with a `change` column off every generic update and delete. It keyed
on an incidental column name, bound only the repository, and bound nothing a
`psql` session or the seed did. `forbid_rewrite()` makes an update or delete
impossible from any client, so `NotAppendOnly` has no table left once the old
ledgers go (MB.196). The two state ledgers, the admin-role-change pause and
the invitations, are written through named methods rather than kept
append-only, and take a single `namedWrites` mark in place of their two
markers (MB.198).

### What was rejected

- **One table per privilege, as built.** Each new flag a table, a migration, a
  schema test, an enum and a doc entry, and a reader of "what happened to this
  user" joining all of them.
- **One table, written by services.** The first draft of the plan: it merged
  the tables but kept every writer responsible for its row, so a forgotten
  insert or a `psql` fix still left no trace, and append-only stayed a matter
  of types.
- **Folding the state ledgers in.** The pause and the invitations hold state
  that moves (open to ended, pending to accepted or revoked), not acts, and
  have no sibling to merge with.
- **Pulling §13's generic edit history forward whole.** It answers a different
  question, every column of every table, at a cost v1 does not need; this
  table can be read beside it when it comes.
- **Defaulting the route.** Covered above: a wrong route recorded silently is
  worse than a writer that fails its own test.

## Workspace and admin invitations are one two-tier table

M7.1 built `workspace_invitations` and MB.69 built `admin_invitations`, each
with its own task, schema file, schema test and doc entry. They hold the same
nine columns but for the workspace pair and the note, and nothing writes or
reads either yet: M7.2 to M7.7 and MB.70 were each about to build a token
path, an accept, a revoke, a pending list and an acceptance page on its own
table. The owner asked for one table instead, while the copy is still a copy
of nothing (see "One privilege ledger, written by the database"). DESIGN.md
§5, `invitations`, carries the model; this record carries why.

### The model

**`invitations`**, in `src/modules/coven/schema/invitations.ts`: `id`,
`workspaceId` (nullable, a foreign key to `workspaces`), `email`, `role`
(nullable `workspace_role`), `tokenHash`, `expiresAt` (default seven days),
`acceptedAt`, `acceptedBy`, `revokedAt`, `note` (nullable), and the full
audit spread.

- CHECK `invitations_tier`: `(workspace_id is null) = (role is null)`. A row
  is in one tier: a workspace and the role it is invited to, or neither.
- CHECK `invitations_role_invitable`:
  `role is null or role in ('viewer', 'member')`, the allowed set as
  `workspace_invitations` had it, so `owner` is invitable on neither tier
  and a fourth role would be refused rather than silently invitable.
- One unique index on `token_hash`, partial on `deleted_at is null`, across
  both tiers: a token names one invitation, whichever tier it is in.
- `note` is allowed on both tiers; the workspace tier's UI may simply not
  offer one.
- Born marked `namedWrites` (MB.198): the row is what authorises a membership
  or a grant, so only its named insert, accept and revoke write it, each
  deciding the tier from the proof it is handed (MB.202).

**Three things a reader must know.**

1. **A null workspace means the site tier**, as a null workspace means a
   compendium entry in `ingredients`. A site-tier invitation grants admin on
   acceptance; the CHECK makes a null workspace and a null role the same
   statement.
2. **The table is `coven`'s.** It sits with the workspace it mostly names
   because its foreign key needs `workspaces`, and `coven` imports `identity`,
   never the reverse. The admin tier reaches it as admin curation reaches
   `ingredients`: `identity`'s service calls the repository's named writes
   and finders under the `SiteAdmin` proof, and imports nothing of `coven`'s
   ([`modules.md`](../modules.md), "Ownership").
3. **Policy stays in two services; the mechanics exist once.** Who may
   invite, the pause, what accepting grants, where it redirects and where
   the pending list is shown stay in `coven`'s `createInvitation` /
   `revokeInvitation` (owner only, role chosen) and `identity`'s
   `createAdminInvitation` / `revokeAdminInvitation` (admin only, refused
   while paused). The token, its hash, the expiry, the pending predicate, the
   accept, the revoke, the finder and the rejections exist once, in the
   repository (MB.202), with one accept service and one `/invite/[token]`
   route that branches by tier.

### Why now

Nothing writes or reads either old table: both are released, and both are
inert until M7.2 and MB.70. The merge is a schema task and a code task now,
against five tasks each building two of everything later and a merge of
live rows after that. M2.9's two objections to reusing the workspace table
for admin invitations, that it was scoped to a workspace and that its CHECK
refused anything but a workspace role, are both answered by the nullable
pair.

### What was rejected

- **Two tables with one convention.** Keep both, and build the token, the
  accept and the revoke the same way twice. Every rule would be written
  twice and kept alike by review, which is what a schema exists to avoid.
- **A `kind` column beside the nullable pair.** A third column saying what
  the pair already says, and a second CHECK to keep the two agreeing. The
  pair is the statement, as it is in `ingredients`.
- **Placing the table in `identity`.** `identity` may import no other module,
  so its schema could not reference `workspaces`, and the table would lose
  the foreign key that makes a workspace-tier row point at a real coven.

### Not exported through `@/modules/coven`'s index

The plan said the table would be "exported through `@/modules/coven`'s index
for the identity service". `modules.md`, "The public surface", makes
`schema/*.ts` the data surface and keeps tables out of the index, and the
identity service needs no table object: it reaches the table only through
the repository's named calls, which import the schema file themselves. So
the table is reached at `@/modules/coven/schema/invitations`, as every other
table is.

### The plan's section, as approved

Copied from (see "One privilege ledger, written by the database"); the record above is what holds where the two differ.

**`invitations`**, in `src/modules/coven/schema/invitations.ts` — `id`, `workspaceId` (nullable → `workspaces.id`), `email`, `role` (nullable `workspace_role`), `tokenHash`, `expiresAt` (default seven days), `acceptedAt`, `acceptedBy`, `revokedAt`, `note` (nullable), `...auditColumns`.

- CHECK `invitations_tier`: `(workspace_id is null) = (role is null)`. CHECK `invitations_role_invitable`: `role is null or role in ('viewer', 'member')`, the allowed set as today. Unique partial index on `token_hash`, as both tables have.
- A null `workspaceId` is a site-tier invitation, which grants admin on acceptance; the pattern and the wording follow `ingredients`' compendium tier. `note` is allowed on both tiers; the workspace tier's UI may simply not offer it.
- Marked `namedWrites` (MB.198): the table is what authorises a membership or a grant, so it takes only its named writes, each deciding the tier from its proof:
  - `insertInvitation(membership, values)` fills `workspaceId` from the proof and requires `role`; `insertInvitation(admin, values)` writes a null pair. One function, two overloads, hashing the token in the repository as `insertAdminInvitation` does.
  - `acceptInvitation(token)` under no proof, matching a pending row whose address the session holds verified, as `acceptAdminInvitation` does today.
  - `revokeInvitation(membership, id)` ANDs the proof's workspace; `revokeInvitation(admin, id)` ANDs `workspace_id is null`.
  - Finders: `findInvitationByToken(token)` (every state, so the service can say which), `findPendingInvitationsInWorkspace(membership)`, `findPendingSiteInvitations(admin)`.
- Policy stays in two services: `coven`'s `createInvitation` / `revokeInvitation` (owner only, role chosen) and `identity`'s `createAdminInvitation` / `revokeAdminInvitation` (admin only, refused while paused). One accept service in `identity`, `acceptInvitation(session, token)`, which on a workspace row adds the membership and declares `via: 'invitation'` for the flag, and on a site row sets the role and declares the same route with the invitation's note; one route, `/invite/[token]`, redirecting by tier (into the workspace, or to `/admin`). If the branches grow apart, two thin pages over the one service.

### Migration

`0057_two-tier-invitations.sql`, by `npm run db:generate`, then
hand-appended as `0046_admin-invitations.sql` was. Additive only, so the
destructive-DDL check passes with no sidecar. The hand-written part, kept
here verbatim so the migration can be regenerated under another number on a
rebase and the same block appended again:

<!-- BEGIN MB.201 hand-written migration statements -->

```sql
-- MB.201: `invitations`, workspace and admin invitations in one two-tier
-- table, the shape `ingredients` has: a null workspace and role is the site
-- tier (claude-docs/design-decisions/auth.md, "Workspace and admin invitations are one two-tier table").
-- Additive: the two old tables stay until MB.203 drops them.
```

prepended above the generated `CREATE TABLE`, and after the generated
statements (the last of which takes a trailing `--> statement-breakpoint`):

```sql
-- Rule 3: a new audited table attaches its own `set_updated_at` trigger, since
-- nothing attaches one for it (claude-docs/db/updated-at.md).
CREATE OR REPLACE TRIGGER set_updated_at BEFORE UPDATE ON "invitations" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
-- Both old tables, with their ids and stamps, so MB.203's final sweep can
-- re-run this with `ON CONFLICT (id) DO NOTHING`. A workspace invitation keeps
-- its workspace and role and has no note; a keeper invitation is the site
-- tier, a null pair, and keeps its note. Production holds no row in either.
INSERT INTO "invitations" ("id", "workspace_id", "email", "role", "token_hash", "expires_at", "accepted_at", "accepted_by", "revoked_at", "note", "created_at", "created_by", "updated_at", "updated_by", "deleted_at", "deleted_by")
SELECT "id", "workspace_id", "email", "role", "token_hash", "expires_at", "accepted_at", "accepted_by", "revoked_at", NULL::text, "created_at", "created_by", "updated_at", "updated_by", "deleted_at", "deleted_by" FROM "workspace_invitations"
UNION ALL
SELECT "id", NULL::uuid, "email", NULL::"workspace_role", "token_hash", "expires_at", "accepted_at", "accepted_by", "revoked_at", "note", "created_at", "created_by", "updated_at", "updated_by", "deleted_at", "deleted_by" FROM "admin_invitations";
```

<!-- END MB.201 hand-written migration statements -->

The copy is one statement so that MB.203 can prepend it as its final sweep
with `ON CONFLICT (id) DO NOTHING`, for rows the pre-switch deploy wrote
during rollout. `invitations-schema.test.ts` re-runs it from the migration's
own text.

## The GraphQL endpoint refuses cross-site writes

### Decision

A small check in `src/graphql/csrf.ts`, called from the route before Yoga, refuses any
write that is not JSON (415) or that carries neither `x-sorrel-client: web` nor an
`Origin` matching its own host (403). The site's client sends the header.
Reads over `GET` are unchanged. Long form: `claude-docs/graphql/endpoint.md`.

### Alternatives

- **`@graphql-yoga/plugin-csrf-prevention`.** The standard package. It requires its
  header only for content types a form can send, or none, and relies on CORS preflight
  for JSON. The acceptance criterion is that a JSON write with neither header nor
  `Origin` is refused, which it does not do.
- **`SameSite=Strict` cookies alone.** Breaks arriving from an emailed link signed in,
  and does not cover a sibling subdomain on the same site.
- **Checking `Origin` only.** Refuses scripts and tools that send none; the header
  covers them without opening a hole, since a cross-site page cannot add it unpreflighted.

### Cost

Anything calling the endpoint outside the site's pages adds the header (curl, the
Node-side Playwright `request`).
