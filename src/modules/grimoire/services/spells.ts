import 'server-only';
import { NO_SUCH_SPELL } from './spell-not-found';
import { findManyByIds, findManyInSpell, findOneSpell, withAudit } from '../../../db/repository';
import { spells } from '../schema/spells';
import { spellSteps } from '../schema/spell-steps';
import { checkRecipe, writeRecipe } from './recipe';
import { checkCategories, heldCategories, writeCategories } from './spell-categories';
import { assertWidens } from './visibility-rule';
import {
  SpellInput as SpellInputSchema,
  UpdateSpellInput as UpdateSpellInputSchema,
} from '../validation/spell';
import { amountOf } from '../../../lib/quantity';
import { Forbidden, NotFound } from '../../../lib/errors';
import { isRowId, parseInput } from '../../../lib/validation';
import type { Session } from '../../../lib/session';
import { assertMembership, type Membership } from '@/modules/coven';
import { categories } from '@/modules/vocabulary/schema/categories';
import type { SpellInput, SpellRow, SpellStepInput, SpellStepRow, SpellUpdate } from '../types';

// The grimoire's service. Stewards and practitioners create and edit, observers read. A private spell is its author's alone, which the
// finders enforce: a hidden spell is `NotFound`, never confirmed to exist (claude-docs/db/spell-visibility.md).

async function readableSpell(membership: Membership, spellId: string): Promise<SpellRow> {
  const spell = await findOneSpell(membership, spellId);
  if (!spell) throw new NotFound(NO_SUCH_SPELL);
  return spell;
}

/** The spell columns a save writes; the rest of a spell (its steps, categories and revision) have their own writes. */
const SPELL_COLUMNS = [
  'title',
  'intent',
  'jarDescription',
  'sealWaxColor',
  'moonPhase',
  'dayOfWeek',
  'note',
  'status',
  'visibility',
] as const;

type SpellColumns = Partial<Pick<SpellRow, (typeof SPELL_COLUMNS)[number]>>;

/** The columns of `input` that are given. Left out is unchanged: a key whose value is `undefined` is not written. */
function spellColumns(input: SpellColumns): SpellColumns {
  return Object.fromEntries(
    SPELL_COLUMNS.map((key) => [key, input[key]]).filter(([, value]) => value !== undefined),
  ) as SpellColumns;
}

/**
 * @throws {Forbidden} the caller may not write this coven's grimoire.
 * @throws {ValidationError} the input breaks a rule, a step links an ingredient this coven may not lay, or a category id names no live category.
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
 * A complete spell's visibility only widens and it never goes back to a draft; a change to it goes through `duplicateSpell`.
 *
 * @throws {Forbidden} the caller may not write this coven's grimoire, or the save narrows a shared complete spell or names a complete spell a draft.
 * @throws {NotFound} no such spell here, or none this caller may read.
 * @throws {ValidationError} the input breaks a rule, names a step this spell has no live row for, links an ingredient this coven may not lay, or names no live category.
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
  if (current.status === 'complete' && parsed.status === 'draft') {
    throw new Forbidden(
      'A complete spell cannot go back to a draft. Duplicate it to get a draft copy.',
    );
  }

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
    if (!spell) throw new NotFound(NO_SUCH_SPELL);
    if (parsed.steps) await writeRecipe(write, spellId, parsed.steps, existing);
    if (categoryIds) await writeCategories(write, spellId, categoryIds, held);
    return spell;
  });
}

/**
 * Writable exactly when its spell is: the step has no scope of its own, so the spell is read first, as the caller.
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
 * @throws {Forbidden} the caller may not write this coven's grimoire.
 * @throws {NotFound} no such spell here or none this caller may read, or no such step in it.
 */
export async function updateSpellStep(
  session: Session,
  workspaceId: string,
  spellId: string,
  stepId: string,
  input: SpellStepInput,
): Promise<SpellStepRow> {
  const membership = await assertMembership(session, workspaceId, { spell: ['update'] });
  await readableSpell(membership, spellId);
  const steps = await findManyInSpell(membership, spellSteps, spellId);
  if (!steps.some((step) => step.id === stepId)) throw new NotFound('No such step in this spell');
  const [step] = await withAudit(session, (write) => write.updateById(spellSteps, stepId, input));
  return step;
}

/**
 * The visibility lock governs widening, not existence. Stock is never touched.
 *
 * @throws {Forbidden} the caller may not delete in this coven's grimoire.
 * @throws {NotFound} no such spell here, or none this caller may read.
 */
export async function deleteSpell(
  session: Session,
  workspaceId: string,
  spellId: string,
): Promise<void> {
  const membership = await assertMembership(session, workspaceId, { spell: ['delete'] });
  if (!isRowId(spellId)) throw new NotFound(NO_SUCH_SPELL);
  await readableSpell(membership, spellId);
  await withAudit(session, async (write) => {
    // The steps first: they are reached through their live spell, which the next write takes away.
    await write.softDeleteStepsOfSpell(membership, spellId);
    // The workings the same way; their participant and deduction rows have no tombstone and go hidden with them.
    await write.softDeleteWorkingsOfSpell(membership, spellId);
    const [spell] = await write.softDeleteSpell(membership, spellId);
    if (!spell) throw new NotFound(NO_SUCH_SPELL);
  });
}

const COPY_SUFFIX = ' (Copy)';

/**
 * Workings, the revision count and history stay behind. The recipe is copied as it stands and not checked again
 * (claude-docs/db/spell-visibility.md, "What a spell holds"); a category deleted since is not carried over.
 *
 * @throws {Forbidden} the caller may not create in this coven's grimoire.
 * @throws {NotFound} no such spell here, or none this caller may read.
 */
export async function duplicateSpell(
  session: Session,
  workspaceId: string,
  spellId: string,
): Promise<SpellRow> {
  const membership = await assertMembership(session, workspaceId, { spell: ['create'] });
  if (!isRowId(spellId)) throw new NotFound(NO_SUCH_SPELL);
  const source = await readableSpell(membership, spellId);
  const steps = await findManyInSpell(membership, spellSteps, spellId);
  const liveCategories = await findManyByIds(categories, await heldCategories(membership, spellId));

  return withAudit(session, async (write) => {
    const [spell] = await write.insertInWorkspace(
      membership,
      spells,
      spellColumns({
        ...source,
        title: source.title === null ? null : `${source.title}${COPY_SUFFIX}`,
        status: 'draft',
        visibility: 'private',
      }),
    );
    await writeRecipe(
      write,
      spell.id,
      [...steps]
        .sort((a, b) => a.position - b.position)
        .map((step) => ({
          body: step.body,
          ingredientId: step.ingredientId,
          variantId: step.variantId,
          name: step.name,
          form: step.form,
          quantity: amountOf(step.quantity),
          unit: step.unit,
        })),
      [],
    );
    await writeCategories(
      write,
      spell.id,
      liveCategories.map((category) => category.id),
      [],
    );
    return spell;
  });
}
