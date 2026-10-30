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

// Not exported, so no other file can name the property and no object literal satisfies `Membership`.
declare const brand: unique symbol;

// One lookup per (user, workspace) per server render, whatever permission each caller asks for; the check stays uncached. Keyed by
// the two ids because `cache()` compares a session by identity. Outside a render, the GraphQL handler included, it is the plain
// finder (claude-docs/graphql/two-transports.md, "The two transports").
const workspaceRole = cache(findWorkspaceRole);

/**
 * Proof that `assertMembership` admitted this user to this workspace at this role. Finders and `AuditWriter` methods demand one,
 * so forgetting the check is a compile error (DESIGN.md §8).
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
 * @throws {Forbidden} the session's email address is unverified, with a message that says to verify it; or the user holds no live membership of `workspaceId` —
 * an id that is not a uuid included — or holds one whose role does not carry
 * `permission`.
 */
export async function assertMembership(
  session: Session,
  workspaceId: string,
  permission: WorkspacePermission,
): Promise<Membership> {
  // An empty request authorizes vacuously and would admit any member to anything, so `{}` is a bug in the caller, not a refusal.
  if (Object.keys(permission).length === 0) {
    throw new Error('assertMembership requires a permission to check');
  }

  // The same rule the pages enforce by redirect: an unverified account reaches the email page and nothing of a coven.
  if (session.emailUnverified) {
    throw new Forbidden(
      'Verify your email address before using a coven. Open the email page from your account to finish.',
    );
  }

  // An id is whatever string the client sent: one that cannot name a workspace is refused as a stranger, not sent to the driver.
  if (!RowId.safeParse(workspaceId).success) throw new Forbidden();

  const role = await workspaceRole(session.userId, workspaceId);

  // Bare, and deliberately the same refusal a wrong id earns: whether a
  // workspace exists is itself private (claude-docs/auth/service-session.md).
  if (!role) throw new Forbidden();

  // Said to a real member, and shown as the alert beside the button they pressed (a stale page after a demotion, say). It names
  // neither the role nor the permission, which are the service's to decide.
  if (!rolePermits(role, permission)) {
    throw new Forbidden("Your role in this coven doesn't allow that. Ask an owner if you need it.");
  }

  // The one cast to the brand in the codebase, and the reason the type is
  // worth anything: it is reachable only past both refusals above.
  return { workspaceId, userId: session.userId, role } as Membership;
}

/**
 * The proofs a read spanning the compendium and, optionally, one coven runs under: none without `workspaceId`, so the
 * compendium alone, else that coven's, checked for `permission`. Every "the compendium, or this coven too" read names its scope
 * this way, so none can widen it by forgetting the check.
 *
 * @throws {Forbidden} a coven is named and the caller is signed out, or
 * `assertMembership` refuses them.
 */
export async function readersOf(
  session: Session | null,
  workspaceId: string | null | undefined,
  permission: WorkspacePermission,
): Promise<Membership[]> {
  if (workspaceId == null) return [];
  // A signed-out caller is refused as a stranger is: whether the coven exists is private.
  if (!session) throw new Forbidden();
  return [await assertMembership(session, workspaceId, permission)];
}
