import 'server-only';
import { findManyByIds } from '../../../db/repository';
import type { Session } from '../../../lib/session';
import { inIdOrder } from '../../../lib/in-id-order';
import { users } from '../schema/users';
import { assertCurator } from './site-admin';
import type { EditorName } from '../types';

// `usersForAdmin` refuses a curator; this read answers an id and a name and nothing else.

/**
 * One answer per id in the order given, null where none; one query whatever the batch size.
 *
 * @throws {Forbidden} not a curator or keeper.
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
