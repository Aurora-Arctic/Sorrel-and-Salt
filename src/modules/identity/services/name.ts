import 'server-only';
import { withAudit } from '../../../db/repository';
import { Forbidden, NotFound } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { parseInput } from '../../../lib/validation';
import { users } from '../schema/users';
import { NameInput } from '../validation/name';
import { getMe } from './profile';
import type { UserRow } from '../types';

// The name the site shows for an account (MB.88): its owner's to change, on
// the account page, through `withAudit`. Better Auth's `/update-user` would
// write it too, outside the audit, so `src/lib/auth.ts` disables that path
// and this is the name's one write (claude-docs/auth/admin-bootstrap.md,
// "The account page").

/**
 * Renames the session's own row to `input`, trimmed. It takes no id, so the
 * only row a caller can name is their own. A provisional account is refused,
 * as it is by every service but `me` and `setEmail`: its one task is to prove
 * its address.
 *
 * @throws {Forbidden} the account's address is not yet verified — checked
 * before the input is read.
 * @throws {ValidationError} on `name`: blank, or longer than `NAME_MAX_LENGTH`.
 * @throws {NotFound} the row is gone, though the session outlives it.
 */
export async function setName(session: Session, input: string): Promise<UserRow> {
  const me = await getMe(session);
  if (!me.emailVerified) throw new Forbidden('Confirm your email address first');
  const { name } = parseInput(NameInput, { name: input });

  const [row] = await withAudit(session, (write) =>
    write.updateById(users, session.userId, { name }),
  );
  if (!row) throw new NotFound();
  return row;
}
