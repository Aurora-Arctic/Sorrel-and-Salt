## The SiteAdmin proof (M5.2)

Rule 5's two layers, on the site role rather than a workspace role.
`assertSiteAdmin(session)` in `identity`'s `services/site-admin.ts` is the
check — `session.role === 'admin'`, or `Forbidden` — and the `SiteAdmin` it
returns, `{ userId }` under a brand the file does not export, is the proof.
Its refusal says "Only a site admin may do this" unless the caller passes a
more particular reason, as the user list does (MB.52). The writer's three
compendium-tier methods demand the proof, and so do the admin user list's two
reads ([`auth/admin-users.md`](../auth/admin-users.md), "The user list") and
the admin-role-change pause's read and its pause and resume (MB.62;
[`mb.62-pause-ledger.md`](../design-decisions/mb.62-pause-ledger.md)):

```ts
const admin = assertSiteAdmin(session);
await withAudit(session, (write) => write.insertInCompendium(admin, ingredients, values));
```

- **`insertInCompendium(admin, table, values)`** fills `workspace_id` with
  null, after `values`, as `insertInWorkspace` fills it from its proof.
- **`updateByIdInCompendium(admin, table, id, values)`** and
  **`softDeleteByIdInCompendium(admin, table, id)`** reach the one row with
  that id only while it is live and in the compendium — `workspace_id IS NULL`
  and `deleted_at IS NULL`, the second as every update ANDs it. A coven's row
  or a deleted one is written nothing and returns nothing, so an admin naming
  a coven's ingredient by id changes nothing.

**Why a proof, when the check is one comparison.** `ingredients` holds both
tiers in one table, so without it a compendium write would be one method call
away from every service that writes ingredients, the coven's own included, and
the admin check would be absent there rather than impossible — the test rule 5
sets. The proof carries nothing the query reads, since the compendium tier has
no id to scope by; what it buys is that the call cannot be written without the
check having run. It is erased at runtime, like `Membership`.

The methods take a **two-tier** table only: `TwoTier` in the folder's `types.ts`,
`{ workspaceId: AnyPgColumn<{ notNull: false }> }`, which `ingredients` and
`retired_ingredient_slugs` satisfy and a table whose `workspace_id` is
`NOT NULL`, like `spells`, does not. The vocabulary tables — categories,
forms, the astrology vocabularies — carry no `workspace_id`, have one tier,
and are written through `insert` and `updateById`: nothing below their
services stops a non-admin write to them, so each of those services checks
the site role itself.

The site role is a separate axis from the workspace role, as `assertMembership`
keeps it: `assertSiteAdmin` reads `session.role` and nothing else, which the
request read off the user's row, and a workspace role counts for nothing. A
cast from the proof's public shape compiles, as `Membership`'s does, and is
review's job; the object literal is pinned as a `@ts-expect-error` in
`tests/db/repository/write.test.ts`.
