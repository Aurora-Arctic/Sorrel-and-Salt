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
import type {
  AuditWriter,
  CardAttemptReason,
  InvitationRow,
  SiteInvitationRow,
} from '../../../db/repository';
import { Forbidden, NotFound } from '../../../lib/errors';
import { looksLikeCardToken } from '../../../lib/invitation-token';
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

const JOIN_BY_INVITATION = 'You can still join by invitation: ask a coven to invite you.';

// A card has no email and no sender, so the three refusals that point at either are worded for a printed card.
const CARD_MESSAGES: Partial<Record<InvitationRefusal, string>> = {
  invalid: `That code doesn't match a card. Check the link or the QR code printed on the card and try again. ${JOIN_BY_INVITATION}`,
  revoked: `This card has been withdrawn. ${JOIN_BY_INVITATION}`,
  expired: `This card has expired. ${JOIN_BY_INVITATION}`,
};

/** The words for a refusal, a card's own where it has them. */
function messageOf(reason: InvitationRefusal, card: boolean | undefined): string {
  return (card && CARD_MESSAGES[reason]) || MESSAGES[reason];
}

/** A refusal, worded. */
function refused(reason: InvitationRefusal, card?: boolean): InvitationStanding {
  return { acceptable: false, reason, message: messageOf(reason, card) };
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
  const card = invitation.kind === 'card';
  const dead = deadLink(invitation);
  if (dead) return { refusal: dead, card };

  const user = await findOneById(users, session.userId);
  // A card is bound to no address, so any verified account admits; every other kind is held by its address.
  if (invitation.kind === 'card') {
    if (!user) return { refusal: 'invalid', card };
    if (!user.emailVerified) return { refusal: 'unverified', card };
    return { tier: 'card', invitation, user };
  }
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
  const standing = await checkInvitation(session, await findInvitationByToken(token));
  // A token that names nothing is worded for a card when it has a card code's shape.
  return standing.refusal === 'invalid' && looksLikeCardToken(token)
    ? { refusal: 'invalid', card: true }
    : standing;
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
  if (standing.refusal) return refused(standing.refusal, standing.card);
  if (standing.tier === 'card') return { acceptable: true, tier: 'card' };
  return standing.tier === 'site'
    ? { acceptable: true, tier: 'site', siteRole: standing.invitation.siteRole }
    : { acceptable: true, tier: 'workspace', slug: standing.coven.slug, name: standing.coven.name };
}

// An id is not a link, so "open the whole link" would mislead.
const INVALID_BY_ID = 'No invitation sent to you has this id.';

function refusalError(reason: InvitationRefusal, byId = false, card?: boolean): Error {
  if (reason === 'invalid') return new NotFound(byId ? INVALID_BY_ID : messageOf(reason, card));
  return new Forbidden(messageOf(reason, card));
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
  if (standing.refusal) throw refusalError(standing.refusal, byId, standing.card);
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
      if (standing.tier === 'card') {
        // A card seats nobody and grants no role: the right to create a coven is all it gives.
        if (!user.canCreateWorkspace) {
          const [granted] = await write.updateById(users, user.id, { canCreateWorkspace: true });
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
    { via: standing.tier === 'card' ? 'card' : 'invitation', note: invitation.note ?? undefined },
  );
  if (!accepted) {
    const again = await recheck();
    throw refusalError(again.refusal ?? 'invalid', byId, again.refusal ? again.card : undefined);
  }
  return accepted;
}

// A refused card open the admin hears of: the card is dead for one of these reasons. A declined card cannot occur.
function recordableReason(card: InvitationRow, userId: string): CardAttemptReason | undefined {
  const dead = deadLink(card);
  if (dead === 'revoked' || dead === 'expired') return dead;
  // The account that accepted the card is the one it worked for, so its return to the link is no refusal.
  if (dead === 'accepted' && card.acceptedBy !== userId) return dead;
  return undefined;
}

/**
 * Notes that the session's account opened a card link and was refused: a row per card, account and reason, counting.
 * Works out the reason itself and records nothing for an unknown token, an address invitation, a pending card, an
 * unverified account or the account that accepted the card; the caller names the token and nothing else.
 */
export async function recordCardAttempt(session: Session, token: string): Promise<void> {
  const card = await findInvitationByToken(token);
  if (!card || card.kind !== 'card') return;
  const reason = recordableReason(card, session.userId);
  if (!reason) return;
  const user = await findOneById(users, session.userId);
  if (!user?.emailVerified) return;
  await withAudit(session, (write) => write.recordCardAttempt(card.id, reason));
}
