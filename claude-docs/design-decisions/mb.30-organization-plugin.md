# MB.30 — Better Auth's organization plugin for workspaces and invitations

**Status:** decided — **not adopted** · **Date:** 2026-09-17

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

## How the spike ran

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

## The six questions

### 1. Slug — enforced by code only, no format, case-sensitive; resolution works but leaks existence and writes on read

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

### 2. Last-owner guard — holds on all three paths, with one undifferentiated error and a hard delete underneath

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

### 3. Owner-not-invitable — the plugin allows it; a hook can refuse it; role validation is looser than the configured role set

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

### 4. Invitation states — five conditions collapse to one error; the id is the token, in plaintext, readable by every member, redeemable only with the invited email

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

### 5. Active organization — every endpoint we need takes an explicit id, but the session column exists, is written on create/accept/forbidden-read, and is what an omitted id silently falls back to

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

### 6. Test harness — `auth.api.*` works in the `db` project with a fabricated session; the server-only path bypasses the gate

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

## The audit probe

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

## What the decision rules out

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

## What it does not rule out

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
