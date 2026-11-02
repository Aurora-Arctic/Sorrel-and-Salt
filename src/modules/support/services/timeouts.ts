import 'server-only';
import { findOneById, findSupportTimeoutById, withAudit } from '../../../db/repository';
import { NotFound, ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { RowId, parseInput } from '../../../lib/validation';
import { assertSiteAdmin } from '../../identity';
import { users } from '../../identity/schema/users';
import { supportTimeouts } from '../schema/support-timeouts';
import type { SupportTimeoutRow } from '../types';

const REFUSAL = 'Only a site admin may time out or restore a support sender';
const NOTE_MAX_LENGTH = 500;

/**
 * Stops a user sending support requests until `until`. Their earlier requests stay, and staff may still reply to them.
 *
 * @throws {Forbidden} the session is not an admin.
 * @throws {NotFound} no live user has this id.
 * @throws {ValidationError} `until` is not in the future, or the note is over 500 characters.
 */
export async function timeOutSupportSender(
  session: Session,
  userId: string,
  until: Date,
  note: string | null | undefined,
): Promise<SupportTimeoutRow> {
  assertSiteAdmin(session, REFUSAL);
  const id = parseInput(RowId, userId);
  const trimmed = note?.trim() || null;
  if (!(until instanceof Date) || Number.isNaN(until.getTime()) || until.getTime() <= Date.now()) {
    throw new ValidationError([{ path: ['until'], message: 'Choose a time in the future' }]);
  }
  if (trimmed && trimmed.length > NOTE_MAX_LENGTH) {
    throw new ValidationError([
      { path: ['note'], message: `Keep the note to ${NOTE_MAX_LENGTH} characters` },
    ]);
  }
  if (!(await findOneById(users, id))) throw new NotFound('No such user');
  return withAudit(session, async (write) => {
    const [row] = await write.insert(supportTimeouts, { userId: id, until, note: trimmed });
    return row as SupportTimeoutRow;
  });
}

/**
 * Ends a time-out now. Lifting one already lifted leaves it as it was.
 *
 * @throws {Forbidden} the session is not an admin.
 * @throws {NotFound} no time-out has this id.
 */
export async function liftSupportTimeout(session: Session, id: string): Promise<SupportTimeoutRow> {
  assertSiteAdmin(session, REFUSAL);
  const existing = await findSupportTimeoutById(parseInput(RowId, id));
  if (!existing) throw new NotFound('No such time-out');
  if (existing.liftedAt) return existing;
  return withAudit(session, async (write) => {
    const [row] = await write.updateById(supportTimeouts, existing.id, { liftedAt: new Date() });
    return row as SupportTimeoutRow;
  });
}
