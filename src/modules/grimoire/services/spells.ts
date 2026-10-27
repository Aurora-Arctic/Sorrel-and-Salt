import 'server-only';
import { findManyInSpell, findOneSpell, withAudit } from '../../../db/repository';
import { spells } from '../schema/spells';
import { spellSteps } from '../schema/spell-steps';
import { NotFound } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { assertMembership, type Membership } from '@/modules/coven';
import type {
  SpellInput,
  SpellRow,
  SpellStepInput,
  SpellStepRow,
  SpellStepUpdate,
  SpellUpdate,
} from '../types';

// The grimoire's service (M10.5). Owners and members create and edit, viewers
// read. A private spell is its author's alone, and that is the finders' work:
// `findOneSpell` answers `undefined` to anyone else, so every call below that
// names a spell turns it into `NotFound` and never confirms a hidden one
// exists. See claude-docs/db/spell-visibility.md.

/** The spell, or the `NotFound` that is also the answer for one this reader may not see. */
async function readableSpell(membership: Membership, spellId: string): Promise<SpellRow> {
  const spell = await findOneSpell(membership, spellId);
  if (!spell) throw new NotFound('No such spell in this coven');
  return spell;
}

/**
 * Makes a spell in the coven. It starts a draft, and shared unless the author
 * says `private`.
 *
 * @throws {Forbidden} the caller may not write this coven's grimoire.
 */
export async function createSpell(
  session: Session,
  workspaceId: string,
  input: SpellInput,
): Promise<SpellRow> {
  const membership = await assertMembership(session, workspaceId, { spell: ['create'] });
  const [spell] = await withAudit(session, (write) =>
    write.insertInWorkspace(membership, spells, input),
  );
  return spell;
}

/**
 * Edits a spell's own fields. Never its visibility, which only
 * `setSpellVisibility` changes, and never its steps.
 *
 * @throws {Forbidden} the caller may not write this coven's grimoire.
 * @throws {NotFound} no such spell here, or none this caller may read.
 */
export async function updateSpell(
  session: Session,
  workspaceId: string,
  spellId: string,
  input: SpellUpdate,
): Promise<SpellRow> {
  const membership = await assertMembership(session, workspaceId, { spell: ['update'] });
  await readableSpell(membership, spellId);
  const [spell] = await withAudit(session, (write) =>
    write.updateByIdInWorkspace(membership, spells, spellId, input),
  );
  return spell;
}

/**
 * Adds a one-off ingredient or an instruction at the end of a spell's recipe.
 * Writable exactly when its spell is: the step has no scope of its own, so the
 * spell is read first, as the caller.
 *
 * @throws {Forbidden} the caller may not write this coven's grimoire.
 * @throws {NotFound} no such spell here, or none this caller may read.
 */
export async function addSpellStep(
  session: Session,
  workspaceId: string,
  spellId: string,
  input: SpellStepInput,
): Promise<SpellStepRow> {
  const membership = await assertMembership(session, workspaceId, { spell: ['update'] });
  await readableSpell(membership, spellId);
  const existing = await findManyInSpell(membership, spellSteps, spellId);
  const next = Math.max(0, ...existing.map((step) => step.position ?? step.layerOrder)) + 1;
  const [step] = await withAudit(session, (write) =>
    write.insert(spellSteps, { ...input, spellId, position: next, layerOrder: next }),
  );
  return step;
}

/**
 * Edits one step of a spell, in place. The step must be one of this spell's.
 *
 * @throws {Forbidden} the caller may not write this coven's grimoire.
 * @throws {NotFound} no such spell here or none this caller may read, or no such step in it.
 */
export async function updateSpellStep(
  session: Session,
  workspaceId: string,
  spellId: string,
  stepId: string,
  input: SpellStepUpdate,
): Promise<SpellStepRow> {
  const membership = await assertMembership(session, workspaceId, { spell: ['update'] });
  await readableSpell(membership, spellId);
  const steps = await findManyInSpell(membership, spellSteps, spellId);
  if (!steps.some((step) => step.id === stepId)) throw new NotFound('No such step in this spell');
  const [step] = await withAudit(session, (write) => write.updateById(spellSteps, stepId, input));
  return step;
}
