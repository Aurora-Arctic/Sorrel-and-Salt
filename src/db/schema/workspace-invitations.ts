import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from '../audit';
import { users } from './users';
import { workspaceRole, workspaces } from './workspaces';

// How long an unopened invitation stays good. DESIGN.md §5 names no figure, so
// this is the task's own call and it is written where a reader will meet it:
// seven days is long enough that a link mailed on a Friday survives the
// weekend and a holiday after it, and short enough that a forwarded link found
// in an old inbox is dead. It is a *default*, not a policy — M7.3 may pass its
// own `expiresAt`, and the column exists so that omitting one cannot produce an
// invitation that is valid forever.
const DEFAULT_LIFETIME = sql`now() + interval '7 days'`;

// DESIGN.md §5: `id`, `workspaceId`, `email`, `role`, `tokenHash`, `expiresAt`,
// `acceptedAt`, `acceptedBy`, `revokedAt`, + audit. Story 4's table — an owner
// generates a link, the link is shown once, and a leaked database row is not a
// way in.
//
// **Only the hash is stored, and that is this table's reason for existing.**
// There is no plaintext column and there must never be one: M7.2 generates the
// token with `crypto.randomBytes` and hashes it, M7.3 returns the URL exactly
// once in the mutation response, and every later read matches a hash against
// this column. A dumped row therefore yields a hash, which redeems nothing.
//
// The four lifecycle columns are deliberately separate rather than one `status`
// enum. `expiresAt` is a clock comparison, `revokedAt` is an owner's act and
// `acceptedAt`/`acceptedBy` are the redeemer's — and story 7 wants all three
// told apart, with a deterministic answer when two apply at once. Collapsing
// them into one column is exactly the shape MB.30 rejected in Better Auth's
// plugin, which answers every dead link with one `INVITATION_NOT_FOUND`
// (`mb.30-organization-plugin.md`). M7.7 owns the classification; this table
// owns keeping the evidence apart.
//
// No constraint pairs `acceptedAt` with `acceptedBy`, and none pairs
// acceptance with revocation. §5 names one check constraint on this table and
// it is the role one below; the acceptance path is a single service write in
// M7.5, where the pairing is one statement rather than an invariant the
// database has to be taught. CLAUDE.md's rule against hooks the design doc does
// not name applies to CHECKs as readily as to columns.
//
// The table is inert at Wave 3. Nothing queries it until M7.2's token service
// and M7.3's mutation land in Wave 10 — CLAUDE.md's table-task-then-
// behaviour-task rule, which is why the DDL can be constrained now, while the
// table is empty.
export const workspaceInvitations = pgTable(
  'workspace_invitations',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    // The address the invitation was sent to, not a foreign key: an invitee
    // has no account yet, which is the whole point of inviting them.
    email: text('email').notNull(),
    // The same enum `workspace_members.role` stores, because an accepted
    // invitation becomes a membership at that role verbatim. The narrowing to
    // the invitable subset is the CHECK below, not a second enum.
    role: workspaceRole('role').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at').notNull().default(DEFAULT_LIFETIME),
    acceptedAt: timestamp('accepted_at'),
    acceptedBy: uuid('accepted_by').references(() => users.id),
    revokedAt: timestamp('revoked_at'),
    ...auditColumns,
  },
  (table) => [
    // DESIGN.md §5: `role` accepts `viewer` or `member` only. In the database
    // rather than in the service because a check there can be forgotten by the
    // next code path that writes this table, and this one cannot — the same
    // impossible-rather-than-absent test CLAUDE.md's sweep-task rule applies.
    //
    // Written as the allowed set rather than as `role <> 'owner'`, which would
    // be the narrower change to make and the wrong one: `workspace_role` is a
    // three-value enum today, and a fourth value added later would be silently
    // invitable under the negative form and silently refused under this one.
    // Refusing is the safe default for a column that decides what a stranger
    // holding a link may do.
    //
    // Ownership is granted afterwards by an existing owner on the members page
    // (M6.13), once there is an identifiable account to point at. An invitation
    // proves only that someone received a link, and a link can be forwarded.
    check('workspace_invitations_role_invitable', sql`role in ('viewer', 'member')`),
    // The lookup the acceptance path runs: a redeemer presents a token, M7.5
    // hashes it and finds the row by that hash. Unique as well as indexed, and
    // the uniqueness is load-bearing rather than decorative — one hash must
    // resolve to at most one invitation, or redeeming it is a coin toss between
    // two rows that may name different roles.
    //
    // Partial per CLAUDE.md rule 4. The usual argument for the predicate — a
    // tombstone reserving a name nobody can reclaim — is weak here, since no
    // caller ever re-proposes a particular random hash. It is applied anyway:
    // the rule is absolute, the predicate costs nothing, and every finder
    // filters `deleted_at is null` regardless, so the planner still reaches it.
    uniqueIndex('workspace_invitations_token_hash_unique')
      .on(table.tokenHash)
      .where(sql`${table.deletedAt} is null`),
  ],
);
