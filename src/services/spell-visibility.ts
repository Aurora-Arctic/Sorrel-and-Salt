import { findOneSpell, withAudit } from '../db/repository';
import { spells } from '../db/schema/spells';
import { Forbidden, NotFound } from '../lib/errors';
import type { Session } from '../lib/session';
import { assertMembership } from './membership';

/** `'private' | 'workspace'`, read off the column rather than restated. */
export type SpellVisibility = (typeof spells.$inferSelect)['visibility'];

/**
 * DESIGN.md §5's one-way rule, as the caller meets it. Widening is a gift and
 * narrowing is a retraction: once the coven has read a spell and built on it,
 * hiding it takes back something they were relying on, so `private` may be
 * widened to `workspace` and `workspace` may never go back.
 *
 * **There is no author clause here, and none is missing.** A private spell is
 * readable by its author alone, so `findOneSpell` has already answered
 * `undefined` to anyone else — a member who cannot see the spell cannot widen
 * it either, and the refusal they get says the spell is not there rather than
 * confirming one exists.
 *
 * @throws {Forbidden} the caller may not write this coven's grimoire, or asked
 * to narrow a spell the coven can already read.
 * @throws {NotFound} no such spell here, or none this caller may read.
 */
export async function setSpellVisibility(
  session: Session,
  workspaceId: string,
  spellId: string,
  visibility: SpellVisibility,
): Promise<typeof spells.$inferSelect> {
  const membership = await assertMembership(session, workspaceId, { spell: ['update'] });

  const spell = await findOneSpell(membership, spellId);
  if (!spell) throw new NotFound('No such spell in this coven');

  if (spell.visibility === 'workspace' && visibility === 'private') {
    throw new Forbidden(
      'This spell has been shared with the coven and cannot be made private again. ' +
        'Delete it instead if it should not be there.',
    );
  }

  const [updated] = await withAudit(session, (write) =>
    write.updateByIdInWorkspace(membership, spells, spellId, { visibility }),
  );
  return updated;
}
