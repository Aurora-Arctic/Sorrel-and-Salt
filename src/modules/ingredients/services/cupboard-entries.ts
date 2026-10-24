import 'server-only';
import {
  type CupboardEntryRow,
  type IngredientRow,
  findCupboardEntriesOf,
  findCupboardEntry,
  findCompendiumMatchPage,
  findCupboardEntryByLabel,
  findCupboardEntryIncludingSoftDeleted,
  findManyOfIngredients,
  findOneIngredient,
  findStockOfIngredients,
  findSubstitutesIncludingSoftDeleted,
  findWorkspaceIngredientByName,
  withAudit,
} from '../../../db/repository';
import { Forbidden, NotFound, ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import type { PageEntry, PageRequest } from '../../../lib/types';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { RowId, parseInput } from '../../../lib/validation';
import { ingredientSubstitutes } from '../schema/ingredient-substitutes';
import { ingredientVariants } from '../schema/ingredient-variants';
import { ingredients } from '../schema/ingredients';
import { inventoryItems } from '../schema/inventory-items';
import { workspaceCompendiumEntries } from '../schema/workspace-compendium-entries';
import { CupboardEntryInput, type CupboardEntryValues } from '../validation/cupboard-entry';
import { applyCupboardEntry } from '../validation/cupboard-merge';
import { LocalIngredientInput } from '../validation/ingredient';
import type { SubstituteFields } from '../validation/types';
import type {
  CitedReference,
  ConvertedCompendium,
  CupboardEntryKey,
  HoldingCoven,
  IngredientValues,
  VariantKey,
} from '../types';
import {
  categoriesOf,
  categoriesOfVariants,
  deitiesOf,
  folkNamesOf,
  referencesOf,
  referencesOfVariants,
  variantsOf,
} from './ingredient-children';
import {
  foldForm,
  ingredientColumns,
  refuseCollision,
  resolvePicks,
  splitChildren,
  writeChildren,
} from './ingredient-rows';
import { type Membership, assertMembership, byCovenName, membershipsOf } from '@/modules/coven';
import { curatedNames } from '@/modules/vocabulary';

// A compendium entry in a coven's cupboard (M12.14): the coven's row naming
// it, read by anyone in the coven, and the merge that lays the row's seven
// overrides over the entry. Forms, folk names, substitutes, categories,
// references and `toxic` are never overridden, so they always read as the
// compendium has them (claude-docs/db/workspace-compendium-entries.md,
// "Reading it").

/**
 * Whether `row` is a compendium entry the curators have retired (M12.24):
 * soft-deleted, and still read by the covens whose cupboard names it. A
 * coven's own ingredient once deleted is gone, not retired.
 */
export function isRetired(row: Pick<IngredientRow, 'workspaceId' | 'deletedAt'>): boolean {
  return row.workspaceId === null && row.deletedAt !== null;
}

/**
 * The compendium entry with this id, retired or not, and `membership`'s
 * coven's live cupboard entry naming it, or `undefined` when that cupboard
 * names no such entry: how a coven goes on reading an entry the compendium
 * has retired (claude-docs/db/workspace-compendium-entries.md, "When the
 * compendium retires the entry"). The caller has checked the proof's
 * permission.
 */
export async function heldCompendiumEntry(
  membership: Membership,
  ingredientId: string,
): Promise<{ entry: IngredientRow; cupboardEntry: CupboardEntryRow } | undefined> {
  // An id that is not a uuid names nothing, and would be a driver error at the comparison.
  if (!RowId.safeParse(ingredientId).success) return undefined;
  return findCupboardEntryIncludingSoftDeleted(membership, ingredientId);
}

/**
 * The coven's live cupboard entry for this compendium entry, or null: none
 * for an entry it does not hold, an id that is not one, or a coven's own
 * ingredient, which has no cupboard entry. Any member, viewers included.
 *
 * @throws {Forbidden} the caller may not read this coven's ingredients.
 */
export async function getCupboardEntry(
  session: Session,
  workspaceId: string,
  ingredientId: string,
): Promise<CupboardEntryRow | null> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['read'] });
  // An id that is not a uuid names nothing, and would be a driver error at the comparison.
  if (!RowId.safeParse(ingredientId).success) return null;
  return (await findCupboardEntry(membership, ingredientId)) ?? null;
}

/**
 * Each key's cupboard entry in the coven it names, or null, one answer per
 * key in the order given: `Ingredient.cupboardEntry`'s batch. One read per
 * coven named, whatever the batch size, plus a role lookup each. A key naming
 * a coven the caller may not read gets a `Forbidden` in its slot while the
 * rest of the batch stands, as `stockOf` answers.
 */
export async function cupboardEntriesOf(
  session: Session,
  keys: readonly CupboardEntryKey[],
): Promise<(CupboardEntryRow | null | Forbidden)[]> {
  const covens = [...new Set(keys.map((key) => key.workspaceId))];
  const rows = new Map(
    await Promise.all(
      covens.map(async (workspaceId) => {
        const ids = [
          ...new Set(
            keys.filter((key) => key.workspaceId === workspaceId).map((key) => key.ingredientId),
          ),
        ];
        return [workspaceId, await entriesOf(session, workspaceId, ids)] as const;
      }),
    ),
  );
  return keys.map((key) => {
    const held = rows.get(key.workspaceId);
    if (held instanceof Forbidden) return held;
    return held?.find((row) => row.ingredientId === key.ingredientId) ?? null;
  });
}

/** One coven's live cupboard entries for these ingredients, or the refusal its proof threw. */
async function entriesOf(
  session: Session,
  workspaceId: string,
  ingredientIds: string[],
): Promise<CupboardEntryRow[] | Forbidden> {
  let membership: Membership;
  try {
    membership = await assertMembership(session, workspaceId, { ingredient: ['read'] });
  } catch (error) {
    if (error instanceof Forbidden) return error;
    throw error;
  }
  return findCupboardEntriesOf(membership, ingredientIds);
}

/**
 * One page of the compendium entries whose name or formal name is exactly
 * `name` but for case: the Add flow's question, "The compendium has Rosemary"
 * (M12.20). A near spelling is `findPossibleDuplicates`', not this. The
 * entries are public, so the coven is named for the member check alone, which
 * a reader of its ingredients passes; whether it holds each is
 * `Ingredient.inCupboard`'s, through the cupboard-entry loader.
 *
 * @throws {Forbidden} the caller may not read this coven's ingredients.
 */
export async function findCompendiumMatches(
  session: Session,
  workspaceId: string,
  name: string,
  page: PageRequest,
): Promise<PageEntry<IngredientRow, {}>[]> {
  await assertMembership(session, workspaceId, { ingredient: ['read'] });
  const trimmed = name.trim();
  if (!trimmed) return [];
  return findCompendiumMatchPage(trimmed, page);
}

// The three writes (M12.15). Each opens with the coven's own check and writes
// through `withAudit`. A cupboard entry never creates or removes a jar or a
// form; the one write that adds a row without these is `createStock`, which
// inserts the entry beside a first jar (claude-docs/db/workspace-compendium-entries.md,
// "Writing it").

const NO_ENTRY = 'No such compendium entry';
const NO_ROW = 'This coven does not hold that compendium entry';
const HELD = 'Your coven already holds this entry';
const ENTRY_INDEX = 'workspace_compendium_entries_workspace_ingredient_unique';
const LABEL_INDEX = 'workspace_compendium_entries_workspace_label_unique';

/** The seven overrides the input sets, leaving out the keys it does not mention. */
function setColumns(input: CupboardEntryInput): Partial<CupboardEntryInput> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<CupboardEntryInput>;
}

/**
 * Refuses a label the coven already uses: one of its own ingredients' names,
 * or another cupboard entry's label (`exceptId` is the entry being written,
 * which may have its own). Compared case folded, as both unique indexes are.
 * The two tables cannot share one index, so this read before the write is the
 * check, and a race between a cupboard save and an own-ingredient save can
 * slip past it, as `refuseEndingARedirect` in `services/compendium.ts`
 * accepts its own; the cupboard's index still catches two cupboard saves.
 */
async function refuseLabelTaken(
  membership: Membership,
  label: string | null | undefined,
  exceptId?: string,
): Promise<void> {
  if (label == null) return;
  const own = await findWorkspaceIngredientByName(membership, label);
  if (own) {
    throw new ValidationError([
      { path: ['label'], message: `This coven already has an ingredient called "${label}"` },
    ]);
  }
  const other = await findCupboardEntryByLabel(membership, label);
  if (other && other.id !== exceptId) {
    throw new ValidationError([
      { path: ['label'], message: `This coven already calls another entry "${label}"` },
    ]);
  }
}

/**
 * The own-ingredient side of the same rule: refuses a name that a cupboard
 * entry of this coven carries as its label. A cupboard entry with no label
 * reserves nothing.
 *
 * @throws {ValidationError} on `name`.
 */
export async function refuseCupboardLabelAsName(
  membership: Membership,
  name: string,
): Promise<void> {
  if (await findCupboardEntryByLabel(membership, name)) {
    throw new ValidationError([
      { path: ['name'], message: `This coven already calls a compendium entry "${name}"` },
    ]);
  }
}

/** A write that broke one of the table's unique indexes, as a `ValidationError`; any other error unchanged. */
function refuseRace(error: unknown): never {
  switch (violatedUniqueIndex(error)) {
    case ENTRY_INDEX:
      throw new ValidationError([{ path: ['ingredientId'], message: HELD }]);
    case LABEL_INDEX:
      throw new ValidationError([
        { path: ['label'], message: 'This coven already uses that label for another entry' },
      ]);
  }
  throw error;
}

/**
 * Adds a compendium entry to this coven's cupboard: one row naming it, with
 * whatever overrides `input` carries and none by default. It creates no jar
 * and no form.
 *
 * @throws {Forbidden} the caller may not create this coven's ingredients.
 * @throws {NotFound} no live compendium entry has this id: a coven's own
 * ingredient, a deleted entry and an id that is not one included.
 * @throws {ValidationError} the coven already holds the entry, beside
 * `ingredientId`; the input breaks `CupboardEntryInput`; or the label is
 * already used in this coven, beside `label`.
 */
export async function addCupboardEntry(
  session: Session,
  workspaceId: string,
  ingredientId: string,
  input: CupboardEntryValues = {},
): Promise<CupboardEntryRow> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['create'] });
  const parsed = parseInput(CupboardEntryInput, input);
  if (!RowId.safeParse(ingredientId).success) throw new NotFound(NO_ENTRY);
  // No proofs reads the compendium alone, so a coven's own row is never found.
  const entry = await findOneIngredient([], ingredientId);
  if (!entry) throw new NotFound(NO_ENTRY);
  if (await findCupboardEntry(membership, ingredientId)) {
    throw new ValidationError([{ path: ['ingredientId'], message: HELD }]);
  }
  await refuseLabelTaken(membership, parsed.label);

  try {
    const [row] = await withAudit(session, (write) =>
      write.insertInWorkspace(membership, workspaceCompendiumEntries, {
        ingredientId,
        ...setColumns(parsed),
      }),
    );
    return row;
  } catch (error) {
    return refuseRace(error);
  }
}

/**
 * Changes this coven's overrides of a compendium entry it holds. A key the
 * patch leaves out keeps its value, `null` hands the column back to the
 * compendium's, and a value, a list even when empty, is the coven's own.
 *
 * A retired entry the coven still holds is annotated the same way, by the
 * owner's decision (claude-docs/db/workspace-compendium-entries.md, "When
 * the compendium retires the entry"); the compendium entry is not written.
 *
 * @throws {Forbidden} the caller may not update this coven's ingredients.
 * @throws {NotFound} this coven holds no live cupboard entry for this id.
 * @throws {ValidationError} the patch breaks `CupboardEntryInput`, or the
 * label is already used in this coven, beside `label`.
 */
export async function annotateCupboardEntry(
  session: Session,
  workspaceId: string,
  ingredientId: string,
  patch: CupboardEntryValues,
): Promise<CupboardEntryRow> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['update'] });
  const parsed = parseInput(CupboardEntryInput, patch);
  // Read through the retired-entry hatch, as Make It Ours reads it, so a
  // retired entry the coven still holds is found; Remove reads it the same way.
  const held = await heldCompendiumEntry(membership, ingredientId);
  if (!held) throw new NotFound(NO_ROW);
  const row = held.cupboardEntry;
  await refuseLabelTaken(membership, parsed.label, row.id);

  const values = setColumns(parsed);
  if (Object.keys(values).length === 0) return row;
  try {
    const [updated] = await withAudit(session, (write) =>
      write.updateByIdInWorkspace(membership, workspaceCompendiumEntries, row.id, values),
    );
    if (!updated) throw new NotFound(NO_ROW);
    return updated;
  } catch (error) {
    return refuseRace(error);
  }
}

/**
 * Takes a compendium entry out of this coven's cupboard, stamping who removed
 * it. Refused while the coven holds a jar of any of its forms, so no stock is
 * left that nothing lists. Its spell layers are untouched. A retired entry the
 * coven still holds is removed the same way, by the owner's decision
 * (claude-docs/db/workspace-compendium-entries.md, "When the compendium
 * retires the entry"); the compendium entry is not written.
 *
 * @throws {Forbidden} the caller may not delete this coven's ingredients.
 * @throws {NotFound} this coven holds no live cupboard entry for this id.
 * @throws {ValidationError} the coven holds jars of it, beside `ingredientId`.
 */
export async function removeCupboardEntry(
  session: Session,
  workspaceId: string,
  ingredientId: string,
): Promise<void> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['delete'] });
  await withAudit(session, async (write) => {
    // A first jar is created under this lock, so the count below is not
    // stale by the time the row goes.
    await write.lockCovenStock(membership);
    // Read through the retired-entry hatch, so a retired entry the coven
    // still holds can be taken out of its cupboard as a live one can.
    const held = await heldCompendiumEntry(membership, ingredientId);
    if (!held) throw new NotFound(NO_ROW);
    const row = held.cupboardEntry;
    const jars = await findStockOfIngredients(membership, [ingredientId]);
    if (jars.length > 0) {
      throw new ValidationError([
        {
          path: ['ingredientId'],
          message: `This coven holds ${jars.length} ${jars.length === 1 ? 'jar' : 'jars'} of this entry — empty its jars first`,
        },
      ]);
    }
    const [removed] = await write.softDeleteByIdInWorkspace(
      membership,
      workspaceCompendiumEntries,
      row.id,
    );
    if (!removed) throw new NotFound(NO_ROW);
  });
}

/** The names, sorted and without repeats. */
const sortedNames = (names: readonly string[]) =>
  [...new Set(names)].sort((a, b) => a.localeCompare(b));

/** One batch read's answers, flattened; a `Forbidden` slot is the caller's own refusal. */
function answered<T>(slots: readonly (T[] | Forbidden)[]): T[] {
  return slots.flatMap((slot) => {
    if (slot instanceof Forbidden) throw slot;
    return slot;
  });
}

// Making a compendium entry the coven holds into the coven's own (M12.23),
// the other way round: a new own entry is written from what the coven reads
// — the compendium's values with the cupboard row's overrides over them — and
// copies of the entry's children, the coven's jars and spell layers move to
// its forms, and the cupboard row is soft-deleted. The compendium entry is
// never written (claude-docs/db/workspace-compendium-entries.md, "Converting
// a compendium entry into our own").

/**
 * What making a compendium entry the coven's own asks of a role: it creates
 * an ingredient, removes a cupboard entry and moves jars. Exported so the
 * entry page offers Make It Ours on exactly the permission the service then
 * checks, never on a role.
 */
export const MAKE_IT_OURS_PERMISSION = {
  ingredient: ['create', 'delete'],
  inventory: ['update'],
} as const;

/** A substitute of the entry naming the entry itself, whose link the copy points at itself. */
interface SelfLink {
  variantId: string | null;
  substituteVariantId: string | null;
}

/**
 * The entry as a coven write's input, read through the readers the entry
 * page uses, so a retired entry reads through `heldBy` as the page reads it.
 * A form keeps its curated pick while the curated form is live and still
 * spelt as the form is, and a deity its pick while the deity is live; any
 * other is kept as its text. A substitute linking a live ingredient keeps
 * the link, and the form it names while that form is live; one whose
 * ingredient is gone is kept as the name it reads as; and one linking the
 * entry itself is left out, to be written against the copy once it exists.
 * A folk name the new name takes is left out, and listed.
 */
async function ownValuesOf(
  session: Session,
  merged: IngredientRow,
  heldBy: Membership | undefined,
): Promise<{ values: IngredientValues; selfLinks: SelfLink[]; folkNamesLost: string[] }> {
  const refs = [{ id: merged.id, workspaceId: null }];
  const forms = answered(await variantsOf(session, refs, heldBy));
  const formRefs: VariantKey[] = forms.map((form) => ({
    id: form.id,
    ingredientId: merged.id,
    workspaceId: null,
  }));
  const [
    folkNames,
    substitutes,
    formSubstitutes,
    categories,
    formCategories,
    references,
    formReferences,
    deities,
    curatedForms,
  ] = await Promise.all([
    folkNamesOf(session, refs, heldBy),
    findSubstitutesIncludingSoftDeleted([], 'ingredient', [merged.id], heldBy),
    findSubstitutesIncludingSoftDeleted(
      [],
      'variant',
      forms.map((form) => form.id),
      heldBy,
    ),
    categoriesOf(session, refs, heldBy),
    categoriesOfVariants(session, formRefs, heldBy),
    referencesOf(session, refs, heldBy),
    referencesOfVariants(session, formRefs, heldBy),
    deitiesOf(session, refs, heldBy),
    curatedNames(
      'form',
      forms.flatMap((form) => form.formId ?? []),
    ),
  ]);
  const linkedForms = new Set(
    (
      await findManyOfIngredients([], ingredientVariants, [
        ...new Set(
          [...substitutes, ...formSubstitutes].flatMap(({ row, joined }) =>
            joined?.deletedAt === null && row.substituteId !== merged.id ? [joined.id] : [],
          ),
        ),
      ])
    ).map((form) => form.id),
  );

  const selfLinks: SelfLink[] = [];
  const copied = (rows: typeof substitutes): SubstituteFields[] => {
    const typed = new Set<string>();
    return rows.flatMap<SubstituteFields>(({ row, joined: linked }) => {
      if (row.substituteId === merged.id) {
        selfLinks.push({ variantId: row.variantId, substituteVariantId: row.substituteVariantId });
        return [];
      }
      if (linked && linked.deletedAt === null) {
        const form = row.substituteVariantId;
        return [
          {
            ingredientId: linked.id,
            substituteVariantId: form !== null && linkedForms.has(form) ? form : null,
          },
        ];
      }
      // A typed name, or a link whose ingredient is gone, which reads as its last name.
      const name = linked?.name ?? row.name ?? '';
      if (typed.has(name.toLowerCase())) return [];
      typed.add(name.toLowerCase());
      return [{ name }];
    });
  };
  const cited = (rows: CitedReference[]) =>
    rows.map(({ reference, locator }) => ({ referenceId: reference.id, locator }));
  const filed = (rows: readonly { id: string }[]) => rows.map((category) => category.id);
  const ownedBy = <T>(rows: readonly (T[] | Forbidden)[], index: number) => answered([rows[index]]);

  const nameKey = merged.name.toLowerCase();
  const allFolkNames = answered(folkNames).map((row) => row.name);
  const values: IngredientValues = {
    name: merged.name,
    canonicalName: merged.canonicalName,
    nomenclature: merged.nomenclature,
    description: merged.description,
    safetyNotes: merged.safetyNotes,
    toxic: merged.toxic,
    elements: merged.elements,
    celestialBodies: merged.celestialBodies,
    zodiacSigns: merged.zodiacSigns,
    colors: merged.colors,
    folkNames: allFolkNames.filter((name) => name.toLowerCase() !== nameKey),
    substitutes: copied(substitutes),
    deities: answered(deities).map(({ name, deity }) => (deity ? { deityId: deity.id } : { name })),
    references: cited(answered(references)),
    categoryIds: filed(answered(categories)),
    variants: forms.map((form, index) => {
      const curated = form.formId === null ? undefined : curatedForms.get(form.formId);
      return {
        form: form.form,
        formId:
          curated !== undefined && foldForm(curated) === foldForm(form.form) ? form.formId! : '',
        description: form.description ?? '',
        safetyNotes: form.safetyNotes ?? '',
        toxic: form.toxic,
        elements: form.elements ?? [],
        celestialBodies: form.celestialBodies ?? [],
        zodiacSigns: form.zodiacSigns ?? [],
        colors: form.colors ?? [],
        categoryIds: filed(ownedBy(formCategories, index)),
        substitutes: copied(formSubstitutes.filter(({ row }) => row.variantId === form.id)),
        references: cited(ownedBy(formReferences, index)),
      };
    }),
  };
  return {
    values,
    selfLinks,
    folkNamesLost: sortedNames(allFolkNames.filter((name) => name.toLowerCase() === nameKey)),
  };
}

/**
 * Makes the compendium entry `ingredientId`, which this coven holds, the
 * coven's own, in one transaction: a new own entry carrying the label as its
 * name, the compendium's formal name and nomenclature, the coven's overrides
 * over the rest, and copies of the entry's forms, folk names, substitutes,
 * categories, references and deities. Each of the coven's jars and spell
 * layers of a form moves to the copy's form of the same folded name, ids and
 * amounts unchanged; the cupboard row is soft-deleted. A retired entry the
 * coven still holds converts the same way. The compendium entry is not
 * written, and another coven's cupboard is untouched.
 *
 * @throws {Forbidden} the caller may not create and delete this coven's
 * ingredients and update its stock.
 * @throws {NotFound} this coven holds no cupboard entry for this id.
 * @throws {ValidationError} another entry of the coven already uses the
 * label, beside `label`; or the coven already has its own entry of this
 * formal name, beside `canonicalName`, or of this name, beside `name`.
 */
export async function convertCompendiumEntryToLocal(
  session: Session,
  workspaceId: string,
  ingredientId: string,
): Promise<ConvertedCompendium> {
  const membership = await assertMembership(session, workspaceId, MAKE_IT_OURS_PERMISSION);
  const held = await heldCompendiumEntry(membership, ingredientId);
  if (!held) throw new NotFound(NO_ROW);
  const { entry, cupboardEntry } = held;
  const heldBy = isRetired(entry) ? membership : undefined;
  const { values, selfLinks, folkNamesLost } = await ownValuesOf(
    session,
    applyCupboardEntry(entry, cupboardEntry),
    heldBy,
  );
  const { fields: parsed, lists, picked } = splitChildren(parseInput(LocalIngredientInput, values));
  const picks = await resolvePicks('coven', parsed, picked, []);
  if (picks.issues.length > 0) throw new ValidationError(picks.issues);
  const { fields } = picks;
  const columns = ingredientColumns(fields);
  // The cupboard row's own label is the one the new entry takes over.
  await refuseLabelTaken(membership, fields.name, cupboardEntry.id);
  const entryForms = answered(await variantsOf(session, [entry], heldBy));

  try {
    const row = await withAudit(session, async (write) => {
      // The lock `createStock` takes, so no jar of the entry appears between
      // the read below and the moves.
      await write.lockCovenStock(membership);
      const [own] = await write.insertInWorkspace(membership, ingredients, columns);
      await writeChildren(write, [membership], own.id, { ...lists, ...picks.children }, 'add');
      const forms = await write.lockLiveVariants(membership, own.id);
      const copyOf = new Map(
        entryForms.flatMap((form) => {
          const copy = forms.find((candidate) => foldForm(candidate.form) === foldForm(form.form));
          return copy ? [[form.id, copy.id] as const] : [];
        }),
      );

      for (const link of selfLinks) {
        const variantId = link.variantId === null ? null : copyOf.get(link.variantId);
        const substituteVariantId =
          link.substituteVariantId === null ? null : copyOf.get(link.substituteVariantId);
        // A link from or to a form that was not copied has no copy to name.
        if (variantId === undefined || substituteVariantId === undefined) continue;
        await write.insert(ingredientSubstitutes, {
          ingredientId: own.id,
          variantId,
          substituteId: own.id,
          substituteVariantId,
          name: null,
        });
      }

      // A jar of a form deleted since is in no read and has nowhere to go.
      const jars = (await write.lockJarsOfIngredient(membership, entry.id)).filter((jar) =>
        copyOf.has(jar.variantId),
      );
      for (const jar of jars) {
        await write.updateByIdInWorkspace(membership, inventoryItems, jar.id, {
          ingredientId: own.id,
          variantId: copyOf.get(jar.variantId)!,
        });
      }
      const steps = await write.lockStepsOfVariants(membership, [...copyOf.keys()]);
      for (const [formId, copy] of copyOf) {
        await write.moveSteps(
          membership,
          steps.filter((step) => step.variantId === formId).map((step) => step.id),
          { ingredientId: own.id, variantId: copy },
        );
      }

      const [removed] = await write.softDeleteByIdInWorkspace(
        membership,
        workspaceCompendiumEntries,
        cupboardEntry.id,
      );
      if (!removed) throw new NotFound(NO_ROW);
      return own;
    });
    return {
      entry: row,
      dropped: {
        forms: [],
        folkNames: folkNamesLost,
        substitutes: [],
        categories: [],
        references: [],
        deities: [],
      },
    };
  } catch (error) {
    return refuseCollision(error, membership, fields, columns.slug, undefined);
  }
}

/**
 * Which of these compendium entries the coven's cupboard holds, as a set of
 * their ids: the compendium page's question for the check icon (M9.12). Read
 * for the viewer's own coven and never cached, so it sits beside the cached
 * compendium read rather than inside it (CLAUDE.md rule 6). Any member,
 * viewers included; whether to offer them an icon is the page's call.
 *
 * @throws {Forbidden} the caller may not read this coven's ingredients.
 */
export async function heldCompendiumEntryIds(
  session: Session,
  workspaceId: string,
  ingredientIds: readonly string[],
): Promise<ReadonlySet<string>> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['read'] });
  const rows = await findCupboardEntriesOf(membership, ingredientIds);
  return new Set(rows.map(({ ingredientId }) => ingredientId));
}

/**
 * The same question across several covens, for a viewer in more than one: each coven's held
 * ids by its id, so the compendium's plus can ask which coven and mark the ones that already
 * hold the entry (M9.12). One `Membership` proof per coven, each finder scoped by its own, so
 * a coven the caller is not in refuses the whole read. A coven holding none of them maps to an
 * empty set, never a missing key.
 *
 * @throws {Forbidden} the caller may not read one of these covens' ingredients.
 */
export async function heldCompendiumEntryIdsIn(
  session: Session,
  workspaceIds: readonly string[],
  ingredientIds: readonly string[],
): Promise<ReadonlyMap<string, ReadonlySet<string>>> {
  // One coven after another, not at once: a refusal then leaves no read still running behind it.
  const held = new Map<string, ReadonlySet<string>>();
  for (const workspaceId of workspaceIds)
    held.set(workspaceId, await heldCompendiumEntryIds(session, workspaceId, ingredientIds));
  return held;
}

/**
 * The viewer's own covens that hold this compendium entry, by name: the details modal's In
 * Your Covens links (M12.5, the owner's call of 2026-10-20). The covens come from the viewer's
 * own memberships, never from who holds the entry, so a coven they are not in never appears,
 * and an admin or curator gets only the covens they belong to (M6.6). Each is read under its own
 * `Membership` proof, filtered in SQL; viewers count. Per viewer, so never cached (rule 6).
 */
export async function covensHoldingEntry(
  session: Session,
  ingredientId: string,
): Promise<readonly HoldingCoven[]> {
  const [memberships] = await membershipsOf(session, [session.userId]);
  if (!memberships || memberships instanceof Error) return [];
  const held = await heldCompendiumEntryIdsIn(
    session,
    memberships.map(({ workspace }) => workspace.id),
    [ingredientId],
  );
  return memberships
    .filter(({ workspace }) => held.get(workspace.id)?.has(ingredientId))
    .map(({ workspace: { id, slug, name } }) => ({ id, slug, name }))
    .sort(byCovenName);
}
