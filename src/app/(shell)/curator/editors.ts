import 'server-only';
import type { UpdatedStamp } from '../../../components/DataTable/types';
import type { Session } from '../../../lib/session';
import { editorNamesForCurator, listedOnUserList } from '@/modules/identity';

// The Updated column of every keeper curated list: each row's last editor by name and when. The
// names are read by `editorNamesForCurator`, which refuses anyone but a curator or keeper and shows
// no ledger field, in one lookup for the whole page.

const REMOVED_EDITOR = 'Unknown';

/**
 * The Updated stamp of each row, in order. A gone editor reads Unknown; a seed-written row has none.
 *
 * @throws {Forbidden} the session's role is neither `curator` nor `admin`.
 */
export async function editorStamps(
  session: Session,
  rows: readonly { updatedBy: string; updatedAt: Date }[],
): Promise<UpdatedStamp[]> {
  const ids = rows.map(({ updatedBy }) => updatedBy);
  const found = await editorNamesForCurator(session, ids);
  return rows.map(({ updatedBy, updatedAt }, i) => {
    if (!listedOnUserList(updatedBy)) return { updatedBy: null, updatedAt: null };
    const user = found[i];
    return { updatedBy: user?.name ?? REMOVED_EDITOR, updatedAt };
  });
}
