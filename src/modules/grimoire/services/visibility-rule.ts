import 'server-only';
import { Forbidden } from '../../../lib/errors';
import type { SpellStatus, SpellVisibility } from '../types';

// Apart from spell-visibility.ts so the module's index, which re-exports that
// file whole, does not make the rule part of the grimoire's surface.

/**
 * The one-way rule itself, for every write that names a visibility: this one
 * and a save (`updateSpell`). It binds a **complete** spell only: a
 * draft is shared and made private again as often as its author likes, and the
 * lock starts once the spell is complete. It reads the status the row holds
 * before the write, so the save that completes a shared draft is the one that
 * starts the lock, and that save itself may still name any visibility.
 *
 * `subject` names what is being narrowed in the refusal: a working's own column follows the same rule.
 *
 * @throws {Forbidden} `next` narrows a complete spell the coven can already read.
 */
export function assertWidens(
  { visibility: current, status }: { visibility: SpellVisibility; status: SpellStatus },
  next: SpellVisibility,
  subject: 'spell' | 'working' = 'spell',
): void {
  if (status === 'complete' && current === 'workspace' && next === 'private') {
    throw new Forbidden(
      `This ${subject} has been shared with the coven and cannot be made private again. ` +
        (subject === 'spell'
          ? 'Duplicate it to get a private copy you can change, or delete it if it should not be there.'
          : 'Delete it instead if it should not be there.'),
    );
  }
}
