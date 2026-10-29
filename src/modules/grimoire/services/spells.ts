import 'server-only';
import { findManyInSpell, findOneSpell, withAudit } from '../../../db/repository';
import { spells } from '../schema/spells';
import { spellSteps } from '../schema/spell-steps';
import { checkRecipe, writeRecipe } from './recipe';
import { checkCategories, heldCategories, writeCategories } from './spell-categories';
import { assertWidens } from './visibility-rule';
import {
  SpellInput as SpellInputSchema,
  UpdateSpellInput as UpdateSpellInputSchema,
} from '../validation/spell';
import { NotFound } from '../../../lib/errors';
import { parseInput } from '../../../lib/validation';
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
 * The spell row's own columns a save names (DESIGN.md §5, `spells`).
 */
function spellColumns(input: {
  title?: string | null;
  intent?: string | null;
  jarDescription?: string | null;
  sealWaxColor?: string | null;
  moonPhase?: string | null;
  dayOfWeek?: string | null;
  note?: string | null;
  status?: SpellRow['status'];
  visibility?: SpellRow['visibility'];
}) {
  const {
    title,
    intent,
    jarDescription,
    sealWaxColor,
    moonPhase,
    dayOfWeek,
    note,
    status,
    visibility,
  } = input;
  const columns = {
    title,
    intent,
    jarDescription,
    sealWaxColor,
    moonPhase,
    dayOfWeek,
    note,
    status,
    visibility,
  };
  // Left out is unchanged: a key whose value is `undefined` is not written.
  return Object.fromEntries(
    Object.entries(columns).filter(([, value]) => value !== undefined),
  ) as Partial<typeof columns>;
}

/**
 * Makes a spell in the coven, with its recipe. It starts a draft, and shared
 * unless the author says `private`. Only a complete spell needs a title.
 *
 * @throws {Forbidden} the caller may not write this coven's grimoire.
 * @throws {ValidationError} the input breaks a rule, a step links an
 * ingredient this coven may not lay, or a category id names no live category.
 */
export async function createSpell(
  session: Session,
  workspaceId: string,
  input: SpellInput,
): Promise<SpellRow> {
  const membership = await assertMembership(session, workspaceId, { spell: ['create'] });
  const parsed = parseInput(SpellInputSchema, input);
  await checkRecipe(membership, parsed.steps, []);
  const categoryIds = parsed.categoryIds ?? [];
  await checkCategories(categoryIds);
  return withAudit(session, async (write) => {
    const [spell] = await write.insertInWorkspace(membership, spells, spellColumns(parsed));
    await writeRecipe(write, spell.id, parsed.steps, []);
    await writeCategories(write, spell.id, categoryIds, []);
    return spell;
  });
}

/**
 * Saves a spell: the fields it names, each left out unchanged, and when it
 * names its steps, the whole recipe in order; when it names its categories,
 * the whole set it is assigned. A save written against a
 * revision the spell has moved past is refused, and null overwrites (M13.15).
 * A complete spell's visibility only widens, as `setSpellVisibility` holds it;
 * a draft's moves either way (M10.20).
 *
 * @throws {Forbidden} the caller may not write this coven's grimoire, or the
 * save narrows a shared complete spell.
 * @throws {NotFound} no such spell here, or none this caller may read.
 * @throws {ValidationError} the input breaks a rule, names a step this spell
 * has no live row for, links an ingredient this coven may not lay, or names
 * no live category.
 * @throws {StaleWrite} `expectedRevision` is not the spell's revision.
 */
export async function updateSpell(
  session: Session,
  workspaceId: string,
  spellId: string,
  input: SpellUpdate,
): Promise<SpellRow> {
  const membership = await assertMembership(session, workspaceId, { spell: ['update'] });
  const parsed = parseInput(UpdateSpellInputSchema, input);
  const current = await readableSpell(membership, spellId);
  if (parsed.visibility) assertWidens(current, parsed.visibility);

  const existing = parsed.steps ? await findManyInSpell(membership, spellSteps, spellId) : [];
  if (parsed.steps) await checkRecipe(membership, parsed.steps, existing);
  const { categoryIds } = parsed;
  if (categoryIds) await checkCategories(categoryIds);
  const held = categoryIds ? await heldCategories(membership, spellId) : [];

  return withAudit(session, async (write) => {
    const [spell] = await write.updateRevisioned(
      membership,
      spells,
      spellId,
      parsed.expectedRevision,
      spellColumns(parsed),
    );
    // Read a moment ago, so only a delete in between leaves nothing here.
    if (!spell) throw new NotFound('No such spell in this coven');
    if (parsed.steps) await writeRecipe(write, spellId, parsed.steps, existing);
    if (categoryIds) await writeCategories(write, spellId, categoryIds, held);
    return spell;
  });
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
  const next = Math.max(0, ...existing.map((step) => step.position)) + 1;
  const [step] = await withAudit(session, (write) =>
    write.insert(spellSteps, { ...input, spellId, position: next }),
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
