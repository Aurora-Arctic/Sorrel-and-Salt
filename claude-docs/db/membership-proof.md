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

The **site role** is not consulted. `session.role` is `'user' | 'admin'` and a
site admin curates the compendium and reaches no workspace at all, so
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

### The three reads that take no proof

`findWorkspaceRole(userId, workspaceId)` is what mints a proof, so it cannot
demand one. It is narrow on purpose — it answers with a role, not with rows —
so it cannot stand in for a finder.

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

The admin user list's two reads, `findUserPage` and `findProvidersOfUsers`
(MB.52), are not among them: they span no workspace either, but they take the
`SiteAdmin` proof instead ([`auth/admin-users.md`](../auth/admin-users.md),
"The user list").

`tests/db/repository/index.test.ts` and `soft-delete-finder-guard.test.ts`
both pin the repository's export list, so a fourth exception is a decision
rather than an addition.

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
