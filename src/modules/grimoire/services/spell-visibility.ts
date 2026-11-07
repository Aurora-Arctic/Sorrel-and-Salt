import 'server-only';
import { findOneSpell, withAudit } from '../../../db/repository';
import { spells } from '../schema/spells';
import { NotFound } from '../../../lib/errors';
import { assertWidens } from './visibility-rule';
import type { Session } from '../../../lib/session';
import { assertMembership } from '@/modules/coven';
import type { SpellVisibility } from '../types';

/**
 * The one-way rule (DESIGN.md §5): a complete spell may be widened from `private` to `workspace` and never narrowed back; a
 * draft moves either way.
 *
 * **There is no author clause here, and none is missing.** A private spell is readable by its author alone, so `findOneSpell`
 * has already answered `undefined` to anyone else, and the refusal they get says the spell is not there.
 *
 * @throws {Forbidden} the caller may not write this coven's grimoire, or asked to narrow a spell the coven can already read.
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

  assertWidens(spell, visibility);

  const [updated] = await withAudit(session, (write) =>
    write.updateByIdInWorkspace(membership, spells, spellId, { visibility }),
  );
  return updated;
}
