## Workspaces and membership (M6.2)

`src/modules/coven/schema/workspaces.ts` holds DESIGN.md §5's two workspace tables and
the `workspace_role` enum (`viewer`, `member`, `owner`). The declaration
order reads as a hierarchy and is not one: M6.3 gives each role its own
permission statements, so nothing compares two roles (see ["The Membership
proof"](membership-proof.md)).
`0004_black_slyde.sql` is the migration.

- **`workspaces`** — `id`, `name`, `slug`, + audit, and **nothing else**.
  There is no `kind` column and no automatically created workspace: every
  workspace behaves identically, taking members and being deleted by an owner.
  `workspaces-schema.test.ts` pins the whole column set rather than asserting
  the absence of one name, so a later `kind`/`type`/`personal` column turns it
  red instead of going unnoticed. The entity is `workspaces` even though it
  routes under `/coven/[slug]`; only the URL segment says coven (§5's naming
  note).
- **`workspaces_slug_unique`** is partial on `deleted_at IS NULL`, per the
  [partial-index convention](soft-delete.md) — the slug is what
  `/coven/[slug]` routes on, so a plain unique constraint would let a deleted
  workspace hold a name hostage forever.
- **`workspace_members`** — `workspaceId`, `userId`, `role`, `joinedAt`, +
  audit, with a composite primary key on the pair and no surrogate `id`. The
  pair _is_ the membership's identity: a surrogate key would let the same user
  join the same workspace twice, with two rows disagreeing about their role.
  `joinedAt` is deliberately distinct from `created_at` — a role change
  rewrites the row without changing when the person joined.
- **`owner` is a role here but not an invitable one.** That narrowing lives on
  `workspace_invitations` (M7.1), whose check constraint rejects it — see
  ["Invitations"](invitations.md); ownership is granted afterwards by an existing owner on
  the members page.
- Both tables carry the full six-column audit spread, and every `*_by` column
  references `users.id` as MB.5 specifies. `workspace_members` keeps all six
  despite being a join table — MB.34 hard-deletes two others, and this is not
  one of them: who removed whom, and when, is worth keeping. The tables are inert at Wave 3 —
  nothing queries them until M6.3's service and its `Membership` proof land in
  Wave 5, which is the point of CLAUDE.md's table-task-then-behaviour-task
  rule.
