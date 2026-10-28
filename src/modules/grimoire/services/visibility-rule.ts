import 'server-only';
import { Forbidden } from '../../../lib/errors';
import type { SpellStatus, SpellVisibility } from '../types';

// Apart from spell-visibility.ts so the module's index, which re-exports that
// file whole, does not make the rule part of the grimoire's surface.

/**
 * The one-way rule itself, for every write that names a visibility: this one
 * and a save (`updateSpell`). It holds for a complete spell only: while a
 * spell is a draft it may be made private again (the owner, 2026-10-28;
 * claude-docs/design-decisions/m13.17-draft-unshare.md).
 *
 * Both statuses are read: `current.status` is the stored one, and `nextStatus`
 * is the status the same write sets, when it names one. A write that completes
 * the spell is the write that would lock it, so it may not also narrow it.
 *
 * @throws {Forbidden} `next` narrows a spell the coven can already read, and
 * the spell is complete or this write completes it.
 */
export function assertWidens(
  current: { visibility: SpellVisibility; status: SpellStatus },
  next: SpellVisibility,
  nextStatus?: SpellStatus,
): void {
  const { visibility: held, status } = current;
  const complete = status === 'complete' || nextStatus === 'complete';
  if (held === 'workspace' && next === 'private' && complete) {
    throw new Forbidden(
      'This spell has been shared with the coven and cannot be made private again. ' +
        'Delete it instead if it should not be there.',
    );
  }
}
