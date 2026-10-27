import 'server-only';
import { Forbidden } from '../../../lib/errors';
import type { SpellVisibility } from '../types';

// Apart from spell-visibility.ts so the module's index, which re-exports that
// file whole, does not make the rule part of the grimoire's surface.

/**
 * The one-way rule itself, for every write that names a visibility: this one
 * and a save (`updateSpell`).
 *
 * @throws {Forbidden} `next` narrows a spell the coven can already read.
 */
export function assertWidens(current: SpellVisibility, next: SpellVisibility): void {
  if (current === 'workspace' && next === 'private') {
    throw new Forbidden(
      'This spell has been shared with the coven and cannot be made private again. ' +
        'Delete it instead if it should not be there.',
    );
  }
}
