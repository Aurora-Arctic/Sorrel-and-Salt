import 'server-only';
import {
  findInvitationByToken,
  findOneById,
  findOpenAdminRoleChangePause,
  withAudit,
} from '../../../db/repository';
import type { InvitationRow, SiteInvitationRow } from '../../../db/repository';
import { Forbidden, NotFound } from '../../../lib/errors';
import { sameAddress } from '../../../lib/primary-admin';
import type { Session } from '../../../lib/session';
import { users } from '../schema/users';
import { isPrimaryAdmin } from './primary-admin';
import { writeAdminGrant } from './user-role';
import type { InvitationCheck, InvitationRefusal, InvitationStanding } from '../types';

// The one accept service for both tiers of `invitations` (MB.202), built by
// MB.70 with the site tier's branch; M7.5 adds the workspace's, which until
// then is refused as an invalid link. Holding the token names the invitation,
// and the session's verified address is what admits. The dead-link checks run
// first, so they hold on both tiers, and report one reason per link (M7.7).
// No message names a workspace: the reader is not yet a member of it
// (claude-docs/auth/admin-users.md, "Inviting an admin";
// claude-docs/db/invitations.md).

const MESSAGES: Record<InvitationRefusal, string> = {
  invalid: "This invitation link isn't valid. Check that you opened the whole link from the email.",
  accepted: 'This invitation has already been accepted.',
  revoked: 'This invitation was withdrawn. Ask whoever sent it for a new one.',
  expired: 'This invitation has expired. Ask whoever sent it for a new one.',
  'different-address':
    'This invitation was sent to a different email address. Sign in with the account that uses it.',
  unverified: 'Confirm your email address, then come back to this link to accept the invitation.',
  paused: "Admin changes are paused, so this invitation can't be accepted until they are resumed.",
};

/** A refusal, worded. */
function refused(reason: InvitationRefusal): InvitationStanding {
  return { acceptable: false, reason, message: MESSAGES[reason] };
}

/**
 * Why a link is dead, or `undefined` while it is live: accepted before
 * revoked before expired, so a link in two states reports one reason, and
 * always the same one. An act beats the clock, and the two stamps cannot
 * coexist, the writer matching a pending row only.
 */
function deadLink(invitation: InvitationRow): InvitationRefusal | undefined {
  if (invitation.acceptedAt) return 'accepted';
  if (invitation.revokedAt) return 'revoked';
  if (invitation.expiresAt.getTime() <= Date.now()) return 'expired';
  return undefined;
}

function isSiteTier(invitation: InvitationRow): invitation is SiteInvitationRow {
  return invitation.workspaceId === null;
}

/**
 * Whether MB.63's pause holds this invitation: while admin changes are
 * paused, an invitation is accepted only if the primary admin sent it, as the
 * primary admin's own grant goes through. Another admin's waits for the
 * resume, so one that a rogue admin sent cannot be redeemed meanwhile.
 */
async function heldByPause(invitation: SiteInvitationRow): Promise<boolean> {
  if (!(await findOpenAdminRoleChangePause(invitation))) return false;
  const inviter = await findOneById(users, invitation.createdBy);
  return inviter === undefined || !isPrimaryAdmin(inviter);
}

async function standingOf(session: Session, token: string): Promise<InvitationCheck> {
  const invitation = await findInvitationByToken(token);
  if (!invitation) return { refusal: 'invalid' };
  const dead = deadLink(invitation);
  if (dead) return { refusal: dead };
  // The tier branch. M7.5 adds the workspace's here.
  if (!isSiteTier(invitation)) return { refusal: 'invalid' };

  const user = await findOneById(users, session.userId);
  if (!user || !sameAddress(user.email, invitation.email)) return { refusal: 'different-address' };
  if (!user.emailVerified) return { refusal: 'unverified' };
  if (await heldByPause(invitation)) return { refusal: 'paused' };
  return { invitation, user };
}

/**
 * Whether the signed-in session may accept the invitation `token` names, and
 * if not, why: what `/invite/[token]` shows before offering Accept. The same
 * checks `acceptInvitation` makes, which is what decides.
 */
export async function invitationStanding(
  session: Session,
  token: string,
): Promise<InvitationStanding> {
  const standing = await standingOf(session, token);
  return standing.refusal ? refused(standing.refusal) : { acceptable: true, tier: 'site' };
}

function refusalError(reason: InvitationRefusal): Error {
  return reason === 'invalid' ? new NotFound(MESSAGES.invalid) : new Forbidden(MESSAGES[reason]);
}

/**
 * Accepts the invitation `token` names as the session's user, and answers
 * it as stamped; `/invite/[token]` lands by its tier. On the site tier it is an admin grant, with the creation
 * flag the users CHECK holds every admin to, declared `via: 'invitation'`
 * with the invitation's note so the trigger on `users` records it as the
 * accepting user's act; the invitation is stamped `acceptedAt` and
 * `acceptedBy` in the same transaction. An account already an admin has the
 * invitation stamped and nothing granted, so nothing is recorded.
 *
 * @throws {NotFound} the token names no invitation, or a workspace's, which
 * M7.5 will accept.
 * @throws {Forbidden} the invitation is already accepted, withdrawn or
 * expired; it was sent to another address; the address is not yet verified;
 * or admin changes are paused and another admin than the primary one sent it.
 */
export async function acceptInvitation(session: Session, token: string): Promise<InvitationRow> {
  const standing = await standingOf(session, token);
  if (standing.refusal) throw refusalError(standing.refusal);
  const { invitation, user } = standing;

  const accepted = await withAudit(
    session,
    async (write) => {
      // The writer's own match is the last word: a revoke or a second accept
      // that committed since the checks above leaves nothing to stamp.
      const [stamped] = await write.acceptInvitation(token);
      if (!stamped) return undefined;
      if (user.role !== 'admin') {
        const [granted] = await writeAdminGrant(write, user.id);
        // Soft-deleted since the read: roll the stamp back with it.
        if (!granted) throw new NotFound('No such user');
      }
      return stamped;
    },
    { via: 'invitation', note: invitation.note ?? undefined },
  );
  if (!accepted) {
    const again = await standingOf(session, token);
    throw refusalError(again.refusal ?? 'invalid');
  }
  return accepted;
}
