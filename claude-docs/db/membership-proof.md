## The Membership proof (M6.3)

CLAUDE.md rule 5 asks for two authorization layers: the check, and a proof the
check ran. `assertMembership` is the first and its return value is the second.

```ts
const membership = await assertMembership(session, workspaceId, { spell: ['create'] });
const drafts = await findManyInWorkspace(membership, spells, eq(spells.status, 'draft'));
await withAudit(session, (write) => write.insertInWorkspace(membership, spells, { title }));
```

`Membership` is `{ workspaceId, userId, role }` carrying a `unique symbol`
brand that `src/modules/coven/services/membership.ts` does not export. No other file can
name the property, so no object literal satisfies the type and the one cast to
it in the codebase sits past both of `assertMembership`'s refusals. The brand
is erased at compile time, so the layer costs nothing at runtime (DESIGN.md
§8) — the trade MB.29 made when it deferred RLS.

### What the check asks

The third argument is a **permission**, not a minimum role: `{ spell:
['create'] }`, checked against per-role statements built with better-auth's
`createAccessControl` (`src/modules/coven/services/access-control.ts`). Naming a resource or
an action the statements do not declare is a compile error. Several resources
in one request are ANDed, and an empty one throws (§8) an `Error` rather than a
`Forbidden`: a request that would authorize vacuously is a caller's bug, and
reads as one.

Why statements rather than the rank the design doc originally specified, and
what that costs while most of the services are still unwritten:
[`m6.3-permission-statements.md`](../design-decisions/m6.3-permission-statements.md).

The **site role** is not consulted. `session.role` is `'user' | 'curator' | 'admin'` and a
curator or site admin curates the compendium and reaches no workspace at all, so
`assertMembership` never reads it — which is what makes that invariant true by
construction rather than by a branch someone could add later.

**An id that is not a uuid is refused before the lookup.** A `workspaceId` is
whatever string the client sent, and compared with a `uuid` column anything
else is a driver error, which the route would mask as
`INTERNAL_SERVER_ERROR`. `assertMembership` checks it with `RowId` from
`src/lib/validation.ts` and refuses it with the bare `Forbidden` an unknown
workspace gets, so every workspace-scoped service answers it the same way
without a guard of its own. `tests/db/graphql-workspace-ids.test.ts` sends a
malformed id to every GraphQL field that takes a `workspaceId`, and fails on a
field it does not name.

**Where the viewer census lives.** `tests/db/graphql-viewer-writes.test.ts`
sends every mutation that takes a `workspaceId` as a viewer, expects `FORBIDDEN`
with every table unchanged, then sends it again as a member (an owner, where the
probe says so) and expects it to be admitted. A mutation with no probe in
`tests/support/graphql-workspace-probes.ts` fails the test, and so does one that
is not on its short exceptions list (`leaveWorkspace`, which every role may call).
A folk name or a category is written inside its ingredient's own save, so it takes
the ingredient's permission; `workspace-ingredients.test.ts` proves it.
**A role that lacks the permission is told so.** A stranger and an unknown id get the bare `Forbidden`, since whether a coven exists is private; a member who is really there and lacks the permission is told, in the one sentence every such refusal carries: "Your role in this coven doesn't allow that. Ask an owner if you need it." (the owner's call at MB.119's review). It names neither the role nor the permission, and it is the alert a button on a stale page shows. Only a workspace-scoped call reaches it, so "coven" is always right. A test asserts the `Forbidden` kind, never the sentence.

### One lookup per render

`assertMembership` reads the role through `cache(findWorkspaceRole)`, so a
layout and a page asking about the same workspace in one server render cost one
query, whatever permission each asks for; the permission check under it runs
every time and costs nothing. The cache is keyed by `(userId, workspaceId)`
rather than the session, because `cache()` compares object arguments by identity
and two callers holding equal sessions would each miss. It lives as long as the
render and no longer, and outside a render it is the plain finder: the GraphQL
route handler has no React cache scope, so its dedupe is the request's
DataLoaders ([`graphql/two-transports.md`](../graphql/two-transports.md), "The
two transports").

**The finder convention** has a file of its own: [`finder-convention.md`](finder-convention.md).

### The reads that take no proof

`findWorkspaceRole(userId, workspaceId)` is what mints a proof, so it cannot
demand one. It is narrow on purpose — it answers with a role, not with rows —
so it cannot stand in for a finder. It also finds no role in a deleted
workspace, the same live-workspace check `findMembershipsOfUsers` makes, which
is how deleting a workspace (M6.14) refuses every member at once while their
membership rows stay as they were.

`findMembershipsOfUsers(userIds)` is the second, for the same kind of reason:
a user's own memberships span workspaces, so there is no one workspace to
hold a proof for. It answers the live `workspace_members` rows of those users
whose workspace is live too — the workspace's `deleted_at` is a correlated
`EXISTS`, as in `findManyInSpell`, because the repository keeps one select
builder. Who may ask about which ids is the calling service's decision:
`membershipsOf` in `coven` answers the caller's own id and refuses every
other, an admin's included.

`findUserByEmail(email)` is the third (MB.54), for the same kind of reason
again: an address is claimed site-wide, so there is no workspace to hold a proof
for. It answers the live row holding the address, compared lower-cased as
`users_email_lower_case` holds every row to, and what a hit means is the calling
service's decision — `setEmail` refuses an address a verified row holds and lets
a provisional one be claimed over, and the `/verify-email` gate refuses one any
other live row holds (`auth/admin-bootstrap.md`, "The email page").

`findInvitationByToken(token)` is the fourth (MB.69, both tiers since
MB.202), for a different reason: the one asking is an invitee who is not yet
a member of the workspace nor an admin, so there is no proof of either kind
to hold. What admits is holding the token, which the read hashes itself, so a
hash out of a dumped row finds nothing. It answers the live invitation the
token names, on either tier and whatever its state; the accept beside it
matches only the session's user holding the invited address, verified
([`invitations.md`](invitations.md), "Written and read by tier").

`findInvitedCoven(workspaceId)` is the fifth (M7.5), beside it: the name and
slug of the live coven an invitation names, for the Accept page's heading and
where acceptance lands, and nothing else of the row. The service calls it only
after the address check, so only the account the invitation names reads the
name.

**The received reads (M10.32)** take no proof for the token read's reason,
with the session row in the token's place: `findReceivedInvitationPage`,
`findReceivedInvitationCount`, `findReceivedInvitation`,
`findReceivedInvitationCovens` and `findReceivedInvitationInviters` each AND
`heldVerifiedBySession(session)`, the predicate the accept write already
holds, and the workspace tier, so a signed-in account reads only the coven
invitations addressed to its own verified email, and the coven's name and
slug and the inviter's name for those alone ([`invitations.md`](invitations.md),
"Accepting from the account page").

### The write that takes no proof

`insertMembership(workspaceId, userId, role)` (M6.7) is the one membership write
with no proof, for the reason `findWorkspaceRole` is the read with none: a
proof is minted from a membership row, so the row that makes a workspace's
creator its owner has none to be written under. It lives in
`src/db/repository/memberships.ts` and is spread into the writer beside
`invitationWrites` (MB.198), so it runs inside `withAudit` and is stamped from
the session. `createWorkspace` calls it in the same transaction as the
workspace row, so a failure leaves neither; M7.5 reuses it to seat an invitee.
Whether a user may be seated is the calling service's decision.

The admin user list's two reads, `findUserPage` and `findProvidersOfUsers`
(MB.52), and the privilege ledger's, `findPrivilegeChangePage` (MB.199), are
not among them: they span no workspace either, but they take the `SiteAdmin`
proof instead ([`auth/admin-users.md`](../auth/admin-users.md), "The user
list" and "The privilege ledger").

`tests/guards/soft-delete-finder-guard.test.ts` pins the escape hatches, so a
fifth exception is a decision rather than an addition.

### Where the proof is weaker than a policy

DESIGN.md §8 states the three gaps — a hand-written `where` under a valid
proof, the tables with no `workspace_id` of their own, and a cast — because
the type looks like it closes more than it does.

- **The first is the live one.** The proof constrains which workspace a query
  is scoped to, not which ids the caller chose to ask about; M6.6's
  per-entity direct-id denial tests cover it.
- **The second is closed.** `spell_ingredients` and `spell_categories` carry a
  `spell_id`, which the unscoped finders refuse and `findManyInSpell` reaches
  through the parent spell (M10.3); `ingredient_folk_names` and
  `ingredient_categories` carry an `ingredient_id`, refused the same way and
  reached through the parent ingredient by `findManyOfIngredients` (M4.8).
- **The third is review's.** `tests/modules/coven/services/membership.test.ts` pins the two the type
  does catch — the object literal and the forgery from a session — as
  `@ts-expect-error` lines, which fail `npm run typecheck` the moment the brand
  stops being required. A runtime assertion could not see that at all: it would
  pass just as happily against a signature that had quietly gone optional.

## The last-owner guard (M6.8)

`assertNotLastOwner(write, membership, userId, becomes)` in
`src/modules/coven/services/last-owner.ts` refuses any change that would leave a
workspace with no owner. `becomes` is the role the person ends up with, or
`null` when they are removed or leave. Every write that can take the owner role
calls it inside `withAudit`: the role change (M9.14), the removal and the
voluntary leave (M6.15).

It reads the workspace's live members through `write.lockLiveMembers(membership)`,
which locks them `for update` in user-id order, as `lockLiveAdmins` does for
admins. Two owners stepping down at once therefore queue on the first row, and
the second counts the first's committed change instead of both seeing two owners.

The refusal is a `LastOwner`, a subclass of `Forbidden` that carries what M6.16
needs to offer a way out: `remedy` is `'promote'` when other members exist
(`promotable` lists their user ids) and `'delete'` when the owner is the only
member. A change that keeps an owner an owner, or touches someone who is not the
last owner, passes.

## Changing a role (M9.14)

`updateMemberRole(session, workspaceId, userId, role)` in
`src/modules/coven/services/member-role.ts` is the one way a role changes. It
asks for `member: update`, which only owners hold, then — in the transaction
that writes — runs `assertNotLastOwner` and calls `write.updateMembershipRole`.
That writer sets the role on the one live row of the proof's workspace and
`userId`, so a pending invitation, a removed member or someone from another
workspace matches nothing and is refused as `Forbidden`; no row is ever
inserted. `joined_at` is not written. The `updateMemberRole` mutation does
nothing but call it.
