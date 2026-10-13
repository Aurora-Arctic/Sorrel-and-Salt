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
import { users } from '../schema/users';
import { isPrimaryAdmin } from './primary-admin';
import { writeAdminGrant } from './user-role';
import type {
  InvitationCheck,
  InvitationRefusal,
  InvitationStanding,
  WorkspaceInvitationRow,
} from '../types';

// The one accept service for both tiers of `invitations` (MB.202), built by
// MB.70 with the site tier's branch, and M7.5 the workspace's. Holding the token names the invitation,
// and the session's verified address is what admits. The dead-link checks run
// first, so they hold on both tiers, and report one reason per link (M7.7).
// No message names a workspace: the reader is not yet a member of it
// (claude-docs/auth/admin-users.md, "Inviting an admin";
// claude-docs/db/invitations.md).

const MESSAGES: Record<InvitationRefusal, string> = {
  invalid: "This invitation link isn't valid. Check that you opened the whole link from the email.",
  accepted: 'This invitation has already been accepted.',
  declined:
    'This invitation was declined. If you change your mind, ask whoever sent it for a new one.',
  revoked: 'This invitation was withdrawn. Ask whoever sent it for a new one.',
  expired: 'This invitation has expired. Ask whoever sent it for a new one.',
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

/**
 * Why a link is dead, or `undefined` while it is live: accepted before
 * declined before revoked before expired, so a link in two states reports one
 * reason, and always the same one. An act beats the clock, and the invitee's
 * answer beats the owner's Remove that may follow a decline (M10.34);
 * accepted and declined cannot coexist, the writers matching a pending row
 * only and a CHECK holding it.
 */
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

/**
 * What the checks make of a found invitation, or of none: the dead-link
 * checks, then the address, then the tier's own. One body for both ways in,
 * the link's token and the account page's id, so they cannot drift.
 */
async function checkInvitation(
  session: Session,
  invitation: InvitationRow | undefined,
): Promise<InvitationCheck> {
  if (!invitation) return { refusal: 'invalid' };
  const dead = deadLink(invitation);
  if (dead) return { refusal: dead };

  const user = await findOneById(users, session.userId);
  if (!user || !sameAddress(user.email, invitation.email)) return { refusal: 'different-address' };
  if (!user.emailVerified) return { refusal: 'unverified' };

  if (isSiteTier(invitation)) {
    if (await heldByPause(invitation)) return { refusal: 'paused' };
    return { tier: 'site', invitation, user };
  }
  if (!isWorkspaceTier(invitation)) return { refusal: 'invalid' };
  // A deleted coven is refused here, after the address checks so a stranger
  // learns nothing of it, and so the person never sees an Accept that fails
  // on click. The repository write's own live-workspace check is the backstop.
  const coven = await findInvitedCoven(invitation.workspaceId);
  if (!coven) return { refusal: 'invalid' };
  return { tier: 'workspace', invitation, user, coven };
}

async function standingOf(session: Session, token: string): Promise<InvitationCheck> {
  return checkInvitation(session, await findInvitationByToken(token));
}

/**
 * The same checks over an id the account page listed. The read is the session's own
 * (a coven invitation to its verified address, in SQL), so another address's
 * id, a site-tier id, a deleted row and a malformed id all read as none.
 */
async function standingById(session: Session, id: string): Promise<InvitationCheck> {
  if (!RowId.safeParse(id).success) return { refusal: 'invalid' };
  return checkInvitation(session, await findReceivedInvitation(session, id));
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
  if (standing.refusal) return refused(standing.refusal);
  return standing.tier === 'site'
    ? { acceptable: true, tier: 'site' }
    : { acceptable: true, tier: 'workspace', slug: standing.coven.slug, name: standing.coven.name };
}

// An id is not a link, so "open the whole link" would mislead.
const INVALID_BY_ID = 'No invitation sent to you has this id.';

function refusalError(reason: InvitationRefusal, byId = false): Error {
  if (reason === 'invalid') return new NotFound(byId ? INVALID_BY_ID : MESSAGES.invalid);
  return new Forbidden(MESSAGES[reason]);
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
 * On the workspace tier it seats the person at the invited role: a removed
 * member's row is revived, since the pair `(workspace_id, user_id)` is the
 * key and a second insert would collide, and a live member is seated again
 * nowhere, the invitation only stamped. It also sets `canCreateWorkspace`,
 * declared the same way, which re-grants it to a person an admin revoked
 * (M5.8's recorded default); one who holds it gets no ledger row.
 *
 * @throws {NotFound} the token names no invitation, or one into a deleted
 * coven.
 * @throws {Forbidden} the invitation is already accepted, withdrawn or
 * expired; it was sent to another address; the address is not yet verified;
 * or admin changes are paused and another admin than the primary one sent it.
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
 * Accepts the coven invitation `id` names, as `/coven` lists it, as the
 * session's user: `acceptInvitation` for a person who never opened the mailed
 * link. The same checks and the same acceptance, and the address match is the
 * session's own, in SQL, so an id sent to another account is as good as none.
 * Coven invitations only: an admin invitation is accepted by its link alone.
 *
 * @throws {NotFound} the id names no coven invitation to this account: a
 * malformed one, another address's, an unverified account's, an admin
 * invitation's, a deleted row's or one into a deleted coven.
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
 * Declines the coven invitation `id` names, as the account page lists it, as
 * the session's user (M10.34): the invitation is dead from now on, its link
 * reports it declined, and the coven's owner sees it marked declined until
 * they remove it. The same checks as `acceptInvitationById`, the address
 * match the session's own, in SQL, and nothing is granted or seated.
 *
 * @throws {NotFound} the id names no coven invitation to this account: a
 * malformed one, another address's, an unverified account's, an admin
 * invitation's, a deleted row's or one into a deleted coven.
 * @throws {Forbidden} the invitation is already accepted, declined, withdrawn
 * or expired.
 */
export async function declineInvitationById(session: Session, id: string): Promise<InvitationRow> {
  const standing = await standingById(session, id);
  if (standing.refusal) throw refusalError(standing.refusal, true);
  // The received read never reaches the site tier; this only narrows the type.
  if (standing.tier !== 'workspace') throw refusalError('invalid', true);

  // The writer's own match is the last word: an accept, a revoke or a second
  // decline that committed since the checks leaves nothing to stamp.
  const [declined] = await withAudit(session, (write) => write.declineReceivedInvitation(id));
  if (!declined) {
    const again = await standingById(session, id);
    throw refusalError(again.refusal ?? 'invalid', true);
  }
  return declined;
}

/**
 * The acceptance both ways in share, given the checks' answer: seat or revive,
 * stamp `invited_by`, grant the creation flag, all in one transaction, then
 * re-check if the writer's own match found the row gone since.
 */
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
      // The writer's own match is the last word: a revoke or a second accept
      // that committed since the checks above leaves nothing to stamp.
      const [stamped] = await stamp(write);
      if (!stamped) return undefined;
      if (standing.tier === 'site') {
        if (user.role !== 'admin') {
          const [granted] = await writeAdminGrant(write, user.id);
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
