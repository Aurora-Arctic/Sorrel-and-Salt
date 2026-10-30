import 'server-only';
import { findManyByIds } from '../../../db/repository';
import type { Session } from '../../../lib/session';
import { inIdOrder } from '../../../lib/in-id-order';
import { users } from '../schema/users';
import { assertCurator } from './site-admin';
import type { EditorName } from '../types';

// The "last edited by" names of the admin curated lists. Every
// curation screen shows them, so a curator reads them too, which
// `usersForAdmin` refuses: it hands back whole rows for the privilege
// ledger. This read answers an id and a name and nothing else.

/**
 * The live user behind each id, as the id and display name an Updated stamp
 * shows: one answer per id in the order given, null where no live user holds
 * it. One query whatever the batch size.
 *
 * @throws {Forbidden} the session's role is neither `curator` nor `admin`.
 */
export async function editorNamesForCurator(
  session: Session,
  userIds: readonly string[],
): Promise<(EditorName | null)[]> {
  assertCurator(session, 'Only a curator may read editor names');
  const rows = await findManyByIds(users, [...new Set(userIds)]);
  return inIdOrder(userIds, rows, () => null).map((row) =>
    row ? { id: row.id, name: row.name } : null,
  );
}
