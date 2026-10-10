# MB.201 — Workspace and admin invitations are one two-tier table

**Status:** decided · **Date:** 2026-10-10

M7.1 built `workspace_invitations` and MB.69 built `admin_invitations`, each
with its own task, schema file, schema test and doc entry. They hold the same
nine columns but for the workspace pair and the note, and nothing writes or
reads either yet: M7.2 to M7.7 and MB.70 were each about to build a token
path, an accept, a revoke, a pending list and an acceptance page on its own
table. The owner asked for one table instead, while the copy is still a copy
of nothing ([`mb.194-plan.md`](mb.194-plan.md), "The invitations"). DESIGN.md
§5, `invitations`, carries the model; this record carries why.

## The model

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

## Why now

Nothing writes or reads either old table: both are released, and both are
inert until M7.2 and MB.70. The merge is a schema task and a code task now,
against five tasks each building two of everything later and a merge of
live rows after that. M2.9's two objections to reusing the workspace table
for admin invitations, that it was scoped to a workspace and that its CHECK
refused anything but a workspace role, are both answered by the nullable
pair.

## What was rejected

- **Two tables with one convention.** Keep both, and build the token, the
  accept and the revoke the same way twice. Every rule would be written
  twice and kept alike by review, which is what a schema exists to avoid.
- **A `kind` column beside the nullable pair.** A third column saying what
  the pair already says, and a second CHECK to keep the two agreeing. The
  pair is the statement, as it is in `ingredients`.
- **Placing the table in `identity`.** `identity` may import no other module,
  so its schema could not reference `workspaces`, and the table would lose
  the foreign key that makes a workspace-tier row point at a real coven.

## Not exported through `@/modules/coven`'s index

The plan said the table would be "exported through `@/modules/coven`'s index
for the identity service". `modules.md`, "The public surface", makes
`schema/*.ts` the data surface and keeps tables out of the index, and the
identity service needs no table object: it reaches the table only through
the repository's named calls, which import the schema file themselves. So
the table is reached at `@/modules/coven/schema/invitations`, as every other
table is.

## The plan's section, as approved

Copied from [`mb.194-plan.md`](mb.194-plan.md), which is not maintained after its PR lands; the record above is what holds where the two differ.

**`invitations`**, in `src/modules/coven/schema/invitations.ts` — `id`, `workspaceId` (nullable → `workspaces.id`), `email`, `role` (nullable `workspace_role`), `tokenHash`, `expiresAt` (default seven days), `acceptedAt`, `acceptedBy`, `revokedAt`, `note` (nullable), `...auditColumns`.

- CHECK `invitations_tier`: `(workspace_id is null) = (role is null)`. CHECK `invitations_role_invitable`: `role is null or role in ('viewer', 'member')`, the allowed set as today. Unique partial index on `token_hash`, as both tables have.
- A null `workspaceId` is a site-tier invitation, which grants admin on acceptance; the pattern and the wording follow `ingredients`' compendium tier. `note` is allowed on both tiers; the workspace tier's UI may simply not offer it.
- Marked `namedWrites` (MB.198): the table is what authorises a membership or a grant, so it takes only its named writes, each deciding the tier from its proof:
  - `insertInvitation(membership, values)` fills `workspaceId` from the proof and requires `role`; `insertInvitation(admin, values)` writes a null pair. One function, two overloads, hashing the token in the repository as `insertAdminInvitation` does.
  - `acceptInvitation(token)` under no proof, matching a pending row whose address the session holds verified, as `acceptAdminInvitation` does today.
  - `revokeInvitation(membership, id)` ANDs the proof's workspace; `revokeInvitation(admin, id)` ANDs `workspace_id is null`.
  - Finders: `findInvitationByToken(token)` (every state, so the service can say which), `findPendingInvitationsInWorkspace(membership)`, `findPendingSiteInvitations(admin)`.
- Policy stays in two services: `coven`'s `createInvitation` / `revokeInvitation` (owner only, role chosen) and `identity`'s `createAdminInvitation` / `revokeAdminInvitation` (admin only, refused while paused). One accept service in `identity`, `acceptInvitation(session, token)`, which on a workspace row adds the membership and declares `via: 'invitation'` for the flag, and on a site row sets the role and declares the same route with the invitation's note; one route, `/invite/[token]`, redirecting by tier (into the workspace, or to `/admin`). If the branches grow apart, two thin pages over the one service.

## Migration

`0057_two-tier-invitations.sql`, by `npm run db:generate`, then
hand-appended as `0046_admin-invitations.sql` was. Additive only, so the
destructive-DDL check passes with no sidecar. The hand-written part, kept
here verbatim so the migration can be regenerated under another number on a
rebase and the same block appended again:

<!-- BEGIN MB.201 hand-written migration statements -->

```sql
-- MB.201: `invitations`, workspace and admin invitations in one two-tier
-- table, the shape `ingredients` has: a null workspace and role is the site
-- tier (claude-docs/design-decisions/mb.201-two-tier-invitations.md).
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
-- its workspace and role and has no note; an admin invitation is the site
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
