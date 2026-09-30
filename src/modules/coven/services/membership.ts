import 'server-only';
import { cache } from 'react';
import { findWorkspaceRole } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { RowId } from '../../../lib/validation';
import { type WorkspacePermission, rolePermits } from './access-control';
import type { WorkspaceRole } from '../types';

// CLAUDE.md rule 5's two layers live here: `assertMembership` is the check,
// and the `Membership` it returns is the proof the check ran. The brand below
// is the whole mechanism — see claude-docs/db/membership-proof.md, "The Membership proof".

// Not exported, which is what makes `Membership` unconstructible outside this
// module: no other file can name the property, so no object literal satisfies
// the type.
declare const brand: unique symbol;

// One lookup per (user, workspace) per server render, however many layouts and
// pages ask and whatever permission each asks for: the check below the lookup
// stays uncached. Keyed by the two ids rather than the session, which
// `cache()` would compare by identity. Outside a render — the GraphQL route
// handler included — it is the plain finder (claude-docs/graphql.md, "The two
// transports").
const workspaceRole = cache(findWorkspaceRole);

/**
 * Proof that `assertMembership` admitted this user to this workspace at this
 * role. Every workspace-scoped finder and `AuditWriter` method demands one and
 * scopes its own query by `workspaceId`, so forgetting the check is a compile
 * error rather than a missing runtime guard (DESIGN.md §8).
 */
export type Membership = {
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: WorkspaceRole;
  readonly [brand]: true;
};

/**
 * The membership check, for every workspace-scoped operation: `permission` is
 * what the call is about to do, checked against the role's statements
 * (`access-control.ts`).
 *
 * ```ts
 * const membership = await assertMembership(session, workspaceId, { spell: ['create'] });
 * await withAudit(session, (write) => write.insertInWorkspace(membership, spells, { title }));
 * ```
 *
 * A site admin gets no bypass: admins curate the compendium and reach no
 * workspace (CLAUDE.md's domain invariants), so `session.role` is not read.
 *
 * @throws {Forbidden} the user holds no live membership of `workspaceId` —
 * an id that is not a uuid included — or holds one whose role does not carry
 * `permission`.
 */
export async function assertMembership(
  session: Session,
  workspaceId: string,
  permission: WorkspacePermission,
): Promise<Membership> {
  // An empty request authorizes vacuously, so it would admit any member to
  // anything. A call that means "a member, at all" asks for the read it is
  // about to do; reaching here with `{}` is a bug in the caller, not a refusal.
  if (Object.keys(permission).length === 0) {
    throw new Error('assertMembership requires a permission to check');
  }

  // An id is whatever string the client sent. One that cannot name a
  // workspace is refused as one the user is not in, rather than asked of the
  // database, where it would be a driver error.
  if (!RowId.safeParse(workspaceId).success) throw new Forbidden();

  const role = await workspaceRole(session.userId, workspaceId);

  // Bare, and deliberately the same refusal a wrong id earns: whether a
  // workspace exists is itself private (claude-docs/auth.md).
  if (!role) throw new Forbidden();

  if (!rolePermits(role, permission)) {
    throw new Forbidden(`A ${role} may not ${describe(permission)}`);
  }

  // The one cast to the brand in the codebase, and the reason the type is
  // worth anything: it is reachable only past both refusals above.
  return { workspaceId, userId: session.userId, role } as Membership;
}

/** `{ spell: ['create'] }` as `spell: create` — for the log line, never for a test to match on. */
function describe(permission: WorkspacePermission): string {
  return Object.entries(permission)
    .map(([resource, actions]) => {
      const list = 'actions' in actions ? actions.actions : actions;
      return `${resource}: ${list.join(', ')}`;
    })
    .join('; ');
}
