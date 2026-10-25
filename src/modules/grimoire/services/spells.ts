import 'server-only';
import {
  findIngredientsInSpellsIncludingSoftDeleted,
  findManyInSpell,
  findManySpells,
  findOneSpell,
  withAudit,
} from '../../../db/repository';
import { spells } from '../schema/spells';
import { spellSteps } from '../schema/spell-steps';
import { NotFound } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { assertMembership, type Membership } from '@/modules/coven';
import type {
  SpellDetail,
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
 * `note` is written to `instructions` too, until M13.9 drops the old column:
 * the deploy before this one writes only `instructions`.
 */
function withInstructionsMirror<T extends { note?: string | null }>(
  values: T,
): T & { instructions?: string | null } {
  return 'note' in values ? { ...values, instructions: values.note } : values;
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
    write.insertInWorkspace(membership, spells, withInstructionsMirror(input)),
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
    write.updateByIdInWorkspace(membership, spells, spellId, withInstructionsMirror(input)),
  );
  return spell;
}

/**
 * Every spell of the coven this caller may read: the shared ones and their own
 * private ones. Not paged: the paged list is M10.9's.
 *
 * @throws {Forbidden} the caller is not a member of this coven.
 */
export async function listSpells(session: Session, workspaceId: string): Promise<SpellRow[]> {
  const membership = await assertMembership(session, workspaceId, { spell: ['read'] });
  return findManySpells(membership);
}

/**
 * One spell with its live steps in order. A linked step carries its
 * ingredient, read through the finder that keeps a deleted one, marked
 * `deleted`: a spell records a working, so what went into the jar stays in it
 * (M5.3). A one-off row and an instruction have `ingredient: null`, and so
 * does a link to another coven's ingredient, which the finder withholds.
 *
 * @throws {Forbidden} the caller is not a member of this coven.
 * @throws {NotFound} no such spell here, or none this caller may read.
 */
export async function getSpell(
  session: Session,
  workspaceId: string,
  spellId: string,
): Promise<SpellDetail> {
  const membership = await assertMembership(session, workspaceId, { spell: ['read'] });
  const spell = await readableSpell(membership, spellId);

  const rows = await findManyInSpell(membership, spellSteps, spellId);
  const linked = rows.flatMap((step) => (step.ingredientId === null ? [] : [step.ingredientId]));
  const held = await findIngredientsInSpellsIncludingSoftDeleted(membership, [...new Set(linked)]);
  const byId = new Map(held.map((row) => [row.id, row]));

  const steps = rows
    .sort((a, b) => (a.position ?? a.layerOrder) - (b.position ?? b.layerOrder))
    .map((step) => {
      const row = step.ingredientId === null ? undefined : byId.get(step.ingredientId);
      return { ...step, ingredient: row ? { ...row, deleted: row.deletedAt !== null } : null };
    });
  return { spell, steps };
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
