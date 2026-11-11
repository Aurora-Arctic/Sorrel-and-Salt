import 'server-only';
import { cache } from 'react';
import { findWorkspaceSeat } from '../../../db/repository';
import { AccessPaused, Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { isRowId } from '../../../lib/validation';
import { type WorkspacePermission, rolePermits } from './access-control';
import type { WorkspaceRole } from '../types';

// The brand below is the whole mechanism (claude-docs/db/membership-proof.md, "The Membership proof").

// Not exported, so no other file can name the property and no object literal satisfies `Membership`.
declare const brand: unique symbol;

// Keyed by the two ids because `cache()` compares a session by identity. Outside a render, the GraphQL handler included, it is the plain
// finder (claude-docs/graphql/two-transports.md, "The two transports").
const workspaceSeat = cache(findWorkspaceSeat);

/** Finders and `AuditWriter` methods demand one, so forgetting the check is a compile error (DESIGN.md §8). */
export type Membership = {
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: WorkspaceRole;
  readonly [brand]: true;
};

/**
 * A site keeper gets no bypass, so `session.role` is not read.
 *
 * @throws {Forbidden} the email address is unverified; or no live membership of `workspaceId` (a non-uuid id included) carries `permission`.
 * @throws {AccessPaused} the user's seat in `workspaceId` is paused; carries when the pause ends.
 */
export async function assertMembership(
  session: Session,
  workspaceId: string,
  permission: WorkspacePermission,
): Promise<Membership> {
  return admit(session, workspaceId, permission, false);
}

/**
 * `assertMembership` for a caller that answers a refusal as a value: the `Forbidden` (a paused seat's `AccessPaused` included) comes back
 * instead of being thrown. Any other error still throws.
 */
export async function tryMembership(
  session: Session,
  workspaceId: string,
  permission: WorkspacePermission,
): Promise<Membership | Forbidden> {
  try {
    return await assertMembership(session, workspaceId, permission);
  } catch (error) {
    if (error instanceof Forbidden) return error;
    throw error;
  }
}

/**
 * The proof names the session's own user, so a leave built on it cannot reach anyone else's seat.
 *
 * @throws {Forbidden} as `assertMembership`: unverified, or no live seat.
 */
export async function assertSeatToLeave(
  session: Session,
  workspaceId: string,
): Promise<Membership> {
  return admit(session, workspaceId, { workspace: ['read'] }, true);
}

async function admit(
  session: Session,
  workspaceId: string,
  permission: WorkspacePermission,
  pausedMayPass: boolean,
): Promise<Membership> {
  // An empty request authorizes vacuously and would admit any member to anything, so `{}` is a bug in the caller, not a refusal.
  if (Object.keys(permission).length === 0) {
    throw new Error('assertMembership requires a permission to check');
  }

  if (session.emailUnverified) {
    throw new Forbidden(
      'Verify your email address before using a coven. Open the email page from your account to finish.',
    );
  }

  // An id is whatever string the client sent: one that cannot name a workspace is refused as a stranger, not sent to the driver.
  if (!isRowId(workspaceId)) throw new Forbidden();

  const seat = await workspaceSeat(session.userId, workspaceId);

  // Bare, and deliberately the same refusal a wrong id earns: whether a
  // workspace exists is itself private (claude-docs/auth/service-session.md).
  if (!seat) throw new Forbidden();
  const { role } = seat;

  // Before the role's check, so a paused member is told of the pause whatever they asked for. Its own refusal rather than a bare
  // Forbidden: the user holds the seat and knows the coven exists, so the page can say why and until when.
  if (seat.pause && !pausedMayPass) throw new AccessPaused(seat.pause.until);

  // Said to a real member, and shown as the alert beside the button they pressed (a stale page after a demotion, say). It names
  // neither the role nor the permission, which are the service's to decide.
  if (!rolePermits(role, permission)) {
    throw new Forbidden(
      "Your role in this coven doesn't allow that. Ask a steward if you need it.",
    );
  }

  // The one cast to the brand in the codebase: reachable only past both refusals above.
  return { workspaceId, userId: session.userId, role } as Membership;
}

/**
 * No read can widen its scope by forgetting the check.
 *
 * @throws {Forbidden} a coven is named and the caller is signed out, or `assertMembership` refuses them.
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
