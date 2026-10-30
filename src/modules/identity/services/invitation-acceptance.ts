import 'server-only';
import {
  findInvitationByToken,
  findInvitedCoven,
  findOneById,
  findOpenAdminRoleChangePause,
  findReceivedInvitation,
  findWorkspaceRole,
  withAudit,
} from '../../../db/repository';
import type { AuditWriter, InvitationRow, SiteInvitationRow } from '../../../db/repository';
import { Forbidden, NotFound } from '../../../lib/errors';
import { RowId } from '../../../lib/validation';
import { sameAddress } from '../../../lib/primary-admin';
import type { Session } from '../../../lib/session';
import { outranks } from '../../../lib/site-roles';
import { users } from '../schema/users';
import { isPrimaryAdmin } from './primary-admin';
import { writeSiteRoleGrant } from './user-role';
import type {
  InvitationCheck,
  InvitationRefusal,
  InvitationStanding,
  WorkspaceInvitationRow,
} from '../types';

// The one accept service for both tiers of `invitations`: the token names the invitation, the session's verified address admits
// (claude-docs/db/invitations.md, "Invitation acceptance details"). No message names a workspace, as the reader is not yet a member.

const MESSAGES: Record<InvitationRefusal, string> = {
  invalid: "This invitation link isn't valid. Check that you opened the whole link from the email.",
  accepted: 'This invitation has already been accepted.',
  declined:
    'This invitation was declined. If you change your mind, ask whoever sent it for a new one.',
  revoked: 'This invitation was withdrawn. Ask whoever sent it for a new one.',
  expired: 'This invitation has expired. Ask whoever sent it for a new one.',
  closed: "The coven this invitation was for has been deleted, so it can't be accepted.",
  'different-address':
    'This invitation was sent to a different email address. Sign in with the account that uses that address.',
  unverified:
    "Your email address isn't confirmed yet. Confirm it, then open this link again to accept.",
  paused: "Admin changes are paused, so this invitation can't be accepted until they are resumed.",
};

/** A refusal, worded. */
function refused(reason: InvitationRefusal): InvitationStanding {
  return { acceptable: false, reason, message: MESSAGES[reason] };
}

/** Why a link is dead, or `undefined` while live: accepted, declined, revoked, expired in that order, so a link in two states reports one reason. */
function deadLink(invitation: InvitationRow): InvitationRefusal | undefined {
  if (invitation.acceptedAt) return 'accepted';
  if (invitation.declinedAt) return 'declined';
  if (invitation.revokedAt) return 'revoked';
  if (invitation.expiresAt.getTime() <= Date.now()) return 'expired';
  return undefined;
}

function isSiteTier(invitation: InvitationRow): invitation is SiteInvitationRow {
  return invitation.workspaceId === null;
}

// The database's CHECK ties a role to a workspace, so a row with one has both.
function isWorkspaceTier(invitation: InvitationRow): invitation is WorkspaceInvitationRow {
  return invitation.workspaceId !== null && invitation.role !== null;
}

/** Whether the admin-change pause holds this invitation: while paused, only one the primary admin sent is accepted. */
async function heldByPause(invitation: SiteInvitationRow): Promise<boolean> {
  if (!(await findOpenAdminRoleChangePause(invitation))) return false;
  const inviter = await findOneById(users, invitation.createdBy);
  return inviter === undefined || !isPrimaryAdmin(inviter);
}

/** What the checks make of a found invitation, or of none: dead-link checks, then the address, then the tier's own. One body for both ways in. */
async function checkInvitation(
  session: Session,
  invitation: InvitationRow | undefined,
): Promise<InvitationCheck> {
  if (!invitation) return { refusal: 'invalid' };
  const dead = deadLink(invitation);
  if (dead) return { refusal: dead };

  const user = await findOneById(users, session.userId);
  if (!user || invitation.email === null || !sameAddress(user.email, invitation.email))
    return { refusal: 'different-address' };
  if (!user.emailVerified) return { refusal: 'unverified' };

  if (isSiteTier(invitation)) {
    if (await heldByPause(invitation)) return { refusal: 'paused' };
    return { tier: 'site', invitation, user };
  }
  if (!isWorkspaceTier(invitation)) return { refusal: 'invalid' };
  // A deleted coven is refused as `closed` after the dead-link and address checks, so an earlier reason wins
  // and a stranger learns nothing (claude-docs/db/invitations.md, "Invitation acceptance details").
  const coven = await findInvitedCoven(invitation.workspaceId);
  if (!coven) return { refusal: 'closed' };
  return { tier: 'workspace', invitation, user, coven };
}

async function standingOf(session: Session, token: string): Promise<InvitationCheck> {
  return checkInvitation(session, await findInvitationByToken(token));
}

/** The same checks over an id the account page listed; the read is the session's own, so any id that is not its own reads as none. */
async function standingById(session: Session, id: string): Promise<InvitationCheck> {
  if (!RowId.safeParse(id).success) return { refusal: 'invalid' };
  const standing = await checkInvitation(session, await findReceivedInvitation(session, id));
  // The account page lists live covens only, so an id into a deleted one reads as none; only the link names the reason.
  return standing.refusal === 'closed' ? { refusal: 'invalid' } : standing;
}

/** Whether the signed-in session may accept the invitation `token` names, and if not why: what `/invite/[token]` shows before Accept. */
export async function invitationStanding(
  session: Session,
  token: string,
): Promise<InvitationStanding> {
  const standing = await standingOf(session, token);
  if (standing.refusal) return refused(standing.refusal);
  return standing.tier === 'site'
    ? { acceptable: true, tier: 'site', siteRole: standing.invitation.siteRole }
    : { acceptable: true, tier: 'workspace', slug: standing.coven.slug, name: standing.coven.name };
}

// An id is not a link, so "open the whole link" would mislead.
const INVALID_BY_ID = 'No invitation sent to you has this id.';

function refusalError(reason: InvitationRefusal, byId = false): Error {
  if (reason === 'invalid') return new NotFound(byId ? INVALID_BY_ID : MESSAGES.invalid);
  return new Forbidden(MESSAGES[reason]);
}

/**
 * Accepts the invitation `token` names as the session's user, answering it as stamped (claude-docs/db/invitations.md,
 * "Invitation acceptance details"). An invitation never lowers a role.
 *
 * @throws {NotFound} the token names no invitation.
 * @throws {Forbidden} the invitation is dead, closed, for another address, unverified, or held by the admin pause.
 */
export async function acceptInvitation(session: Session, token: string): Promise<InvitationRow> {
  return acceptChecked(
    session,
    await standingOf(session, token),
    (write) => write.acceptInvitation(token),
    () => standingOf(session, token),
    false,
  );
}

/**
 * Accepts the coven invitation `id` names, as `acceptInvitationById` for a person who never opened the mailed link; coven invitations only.
 *
 * @throws {NotFound} the id names no coven invitation to this account.
 * @throws {Forbidden} the invitation is already accepted, withdrawn or expired.
 */
export async function acceptInvitationById(session: Session, id: string): Promise<InvitationRow> {
  return acceptChecked(
    session,
    await standingById(session, id),
    (write) => write.acceptReceivedInvitation(id),
    () => standingById(session, id),
    true,
  );
}

/**
 * Declines the coven invitation `id` names as the session's user: the link reports declined and nothing is granted or seated.
 *
 * @throws {NotFound} the id names no coven invitation to this account.
 * @throws {Forbidden} the invitation is already accepted, declined, withdrawn or expired.
 */
export async function declineInvitationById(session: Session, id: string): Promise<InvitationRow> {
  const standing = await standingById(session, id);
  if (standing.refusal) throw refusalError(standing.refusal, true);
  // The received read never reaches the site tier; this only narrows the type.
  if (standing.tier !== 'workspace') throw refusalError('invalid', true);

  // The writer's own match is the last word: a change that committed since the checks leaves nothing to stamp.
  const [declined] = await withAudit(session, (write) => write.declineReceivedInvitation(id));
  if (!declined) {
    const again = await standingById(session, id);
    throw refusalError(again.refusal ?? 'invalid', true);
  }
  return declined;
}

/** The acceptance both ways in share: seat or revive, stamp `invited_by`, grant the creation flag, then re-check if the row went. */
async function acceptChecked(
  session: Session,
  standing: InvitationCheck,
  stamp: (write: AuditWriter) => Promise<InvitationRow[]>,
  recheck: () => Promise<InvitationCheck>,
  byId: boolean,
): Promise<InvitationRow> {
  if (standing.refusal) throw refusalError(standing.refusal, byId);
  const { invitation, user } = standing;
  // Read before the transaction: a live seat is left as it is.
  const seated =
    standing.tier === 'workspace' &&
    (await findWorkspaceRole(user.id, standing.invitation.workspaceId)) !== undefined;

  const accepted = await withAudit(
    session,
    async (write) => {
      // The writer's own match is the last word: a change committed since the checks leaves nothing to stamp.
      const [stamped] = await stamp(write);
      if (!stamped) return undefined;
      if (standing.tier === 'site') {
        // Only upwards: an account holding the role or above is stamped alone.
        const { siteRole } = standing.invitation;
        if (outranks(siteRole, user.role)) {
          const [granted] = await writeSiteRoleGrant(write, user.id, siteRole);
          // Soft-deleted since the read: roll the stamp back with it.
          if (!granted) throw new NotFound('No such user');
        }
        return stamped;
      }
      const { workspaceId, role } = standing.invitation;
      if (!seated) {
        const [revived] = await write.reviveMembership(
          workspaceId,
          user.id,
          role,
          stamped.createdBy,
        );
        if (!revived) await write.insertMembership(workspaceId, user.id, role, stamped.createdBy);
      }
      if (!user.canCreateWorkspace) {
        const [granted] = await write.updateById(users, user.id, { canCreateWorkspace: true });
        if (!granted) throw new NotFound('No such user');
      }
      return stamped;
    },
    { via: 'invitation', note: invitation.note ?? undefined },
  );
  if (!accepted) {
    const again = await recheck();
    throw refusalError(again.refusal ?? 'invalid', byId);
  }
  return accepted;
}
