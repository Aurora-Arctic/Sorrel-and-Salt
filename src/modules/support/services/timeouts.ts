import 'server-only';
import { findOneById, findSupportTimeoutById, withAudit } from '../../../db/repository';
import { NotFound, fieldRefusal } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { RowId, parseInput } from '../../../lib/validation';
import { assertSiteAdmin } from '../../identity';
import { users } from '../../identity/schema/users';
import { supportTimeouts } from '../schema/support-timeouts';
import type { SupportTimeoutRow } from '../types';

const REFUSAL = 'Only a site admin may time out or restore a support sender';
const NOTE_MAX_LENGTH = 500;
const PAST_END = 'Choose a time in the future';
const NO_NOTE = 'Write a note saying why';
const LONG_NOTE = `Keep the note to ${NOTE_MAX_LENGTH} characters`;

/**
 * Stops a user sending support requests until `until`, or with no end date when `until` is `null`, for the reason `note`
 * gives. Their earlier requests stay, and staff may still reply to them. Each refusal's sentence is also the error's message,
 * which is what the panel shows.
 *
 * @throws {Forbidden} the session is not an admin.
 * @throws {NotFound} no live user has this id.
 * @throws {ValidationError} `until` is not in the future, or the note is missing, blank or over 500 characters.
 */
export async function timeOutSupportSender(
  session: Session,
  userId: string,
  until: Date | null | undefined,
  note: string,
): Promise<SupportTimeoutRow> {
  assertSiteAdmin(session, REFUSAL);
  const id = parseInput(RowId, userId);
  const trimmed = typeof note === 'string' ? note.trim() : '';
  if (
    until != null &&
    (!(until instanceof Date) || Number.isNaN(until.getTime()) || until.getTime() <= Date.now())
  ) {
    throw fieldRefusal('until', PAST_END);
  }
  if (!trimmed) throw fieldRefusal('note', NO_NOTE);
  if (trimmed.length > NOTE_MAX_LENGTH) throw fieldRefusal('note', LONG_NOTE);
  if (!(await findOneById(users, id))) throw new NotFound('No such user');
  return withAudit(session, async (write) => {
    const [row] = await write.insert(supportTimeouts, {
      userId: id,
      until: until ?? null,
      note: trimmed,
    });
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
