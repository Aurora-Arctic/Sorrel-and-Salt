import 'server-only';
import {
  type CupboardEntryRow,
  type IngredientRow,
  type StockRow,
  findCupboardEntriesOf,
  findCupboardEntry,
  findCompendiumMatchPage,
  findCupboardEntryByLabel,
  findCupboardEntryIncludingSoftDeleted,
  findManyOfIngredients,
  findOneByIdInWorkspace,
  findOneIngredient,
  findStockOfIngredients,
  findWorkspaceIngredientByName,
  withAudit,
} from '../../../db/repository';
import { Forbidden, NotFound, ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import type { PageEntry, PageRequest } from '../../../lib/types';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { citationText } from '../../../lib/citation';
import { RowId, parseInput } from '../../../lib/validation';
import { ingredientVariants } from '../schema/ingredient-variants';
import { ingredients } from '../schema/ingredients';
import { inventoryItems } from '../schema/inventory-items';
import { workspaceCompendiumEntries } from '../schema/workspace-compendium-entries';
import { CupboardEntryInput, type CupboardEntryValues } from '../validation/cupboard-entry';
import type {
  ConvertedLocal,
  CupboardEntryKey,
  DroppedOnConvert,
  VariantKey,
  VariantRecord,
} from '../types';
import {
  categoriesOf,
  categoriesOfVariants,
  deitiesOf,
  folkNamesOf,
  referencesOf,
  referencesOfVariants,
  substitutesOf,
  substitutesOfVariants,
} from './ingredient-children';
import { foldForm } from './ingredient-rows';
import { type Membership, assertMembership } from '@/modules/coven';

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

/**
 * What converting an own entry asks of a role (M12.21): it deletes the own
 * entry, writes a cupboard entry and moves jars. Exported so the entry page
 * offers This Is It on exactly the permission the service then checks.
 */
export const CONVERT_PERMISSION = {
  ingredient: ['create', 'delete'],
  inventory: ['update'],
} as const;

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
 * which may have its own, and `exceptOwnId` the own ingredient a convert
 * soft-deletes, whose name the label takes over). Compared case folded, as
 * both unique indexes are.
 * The two tables cannot share one index, so this read before the write is the
 * check, and a race between a cupboard save and an own-ingredient save can
 * slip past it, as `refuseEndingARedirect` in `services/compendium.ts`
 * accepts its own; the cupboard's index still catches two cupboard saves.
 */
async function refuseLabelTaken(
  membership: Membership,
  label: string | null | undefined,
  exceptId?: string,
  exceptOwnId?: string,
): Promise<void> {
  if (label == null) return;
  const own = await findWorkspaceIngredientByName(membership, label);
  if (own && own.id !== exceptOwnId) {
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
  const row = await readHeld(membership, ingredientId);
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
 * left that nothing lists. Its spell layers are untouched.
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
    const row = await readHeld(membership, ingredientId);
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

/** This coven's live cupboard entry for the id. */
async function readHeld(membership: Membership, ingredientId: string): Promise<CupboardEntryRow> {
  if (!RowId.safeParse(ingredientId).success) throw new NotFound(NO_ROW);
  const row = await findCupboardEntry(membership, ingredientId);
  if (!row) throw new NotFound(NO_ROW);
  return row;
}

// Turning one of the coven's own entries into the compendium entry it
// duplicates (M12.21). Nothing is copied: the coven's jars and spell layers
// move to the compendium's forms, the cupboard row says what the coven had
// said differently, and the own entry is soft-deleted with its children as
// they were (claude-docs/db/workspace-compendium-entries.md, "Converting an
// own entry").

const NO_LOCAL = 'No such ingredient in this coven';

/** A list of names as a sentence reads it: "A", "A and B", "A, B and C". */
function listed(names: readonly string[]): string {
  if (names.length < 2) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The names, sorted and without repeats. */
const sortedNames = (names: readonly string[]) =>
  [...new Set(names)].sort((a, b) => a.localeCompare(b));

/** Two lists hold the same values, whatever their order. */
function sameValues(a: readonly string[], b: readonly string[] | null): boolean {
  const theirs = new Set(b ?? []);
  return a.length === theirs.size && a.every((value) => theirs.has(value));
}

/**
 * The cupboard row's overrides for an own entry becoming `entry`: each column
 * where the own entry says something the compendium does not. An own entry
 * has nothing to inherit, so an empty note or list there is nothing said, and
 * never an override that would hide the compendium's.
 */
function differingColumns(own: IngredientRow, entry: IngredientRow): Partial<CupboardEntryInput> {
  const columns: Partial<CupboardEntryInput> = {};
  if (own.name !== entry.name) columns.label = own.name;
  if (own.description && own.description !== entry.description) {
    columns.description = own.description;
  }
  if (own.safetyNotes && own.safetyNotes !== entry.safetyNotes) {
    columns.safetyNotes = own.safetyNotes;
  }
  if (own.elements?.length && !sameValues(own.elements, entry.elements)) {
    columns.elements = own.elements;
  }
  if (own.celestialBodies?.length && !sameValues(own.celestialBodies, entry.celestialBodies)) {
    columns.celestialBodies = own.celestialBodies;
  }
  if (own.zodiacSigns?.length && !sameValues(own.zodiacSigns, entry.zodiacSigns)) {
    columns.zodiacSigns = own.zodiacSigns;
  }
  if (own.colors?.length && !sameValues(own.colors, entry.colors)) columns.colors = own.colors;
  return columns;
}

/** One batch read's answers, flattened; a `Forbidden` slot is the caller's own refusal. */
function answered<T>(slots: readonly (T[] | Forbidden)[]): T[] {
  return slots.flatMap((slot) => {
    if (slot instanceof Forbidden) throw slot;
    return slot;
  });
}

/**
 * What the own entry and its forms carry that a compendium entry's cupboard
 * row cannot, by name. Read before the write, through the readers the entry
 * page uses, since once the entry is deleted they read nothing of it.
 */
async function childrenLost(
  session: Session,
  own: IngredientRow,
  forms: readonly VariantRecord[],
): Promise<Omit<DroppedOnConvert, 'forms'>> {
  const refs = [{ id: own.id, workspaceId: own.workspaceId }];
  const formRefs: VariantKey[] = forms.map((form) => ({
    id: form.id,
    ingredientId: own.id,
    workspaceId: own.workspaceId,
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
  ] = await Promise.all([
    folkNamesOf(session, refs),
    substitutesOf(session, refs),
    substitutesOfVariants(session, formRefs),
    categoriesOf(session, refs),
    categoriesOfVariants(session, formRefs),
    referencesOf(session, refs),
    referencesOfVariants(session, formRefs),
    deitiesOf(session, refs),
  ]);
  return {
    folkNames: sortedNames(answered(folkNames).map((row) => row.name)),
    substitutes: sortedNames(answered([...substitutes, ...formSubstitutes]).map((row) => row.name)),
    categories: sortedNames(answered([...categories, ...formCategories]).map((row) => row.name)),
    references: sortedNames(
      answered([...references, ...formReferences]).map((cited) => citationText(cited.reference)),
    ),
    deities: sortedNames(answered(deities).map((row) => row.name)),
  };
}

/**
 * Turns this coven's own ingredient `localId` into the compendium entry
 * `compendiumId`, in one transaction. Each live form of the own entry is
 * matched to the compendium form it folds to; the coven's jars and the layers
 * of its spells, private ones included, move to the matched form with their
 * ids and amounts unchanged. A form that matches nothing and holds nothing is
 * dropped. The cupboard row carries the label, notes and lists the own entry
 * had that the compendium's differ from, and the own entry is soft-deleted,
 * its forms, folk names, substitutes, categories, references and deities
 * left on it as they were, which is how a spell layer laid before the
 * convert on a form already deleted still reads it. Nothing is merged: a
 * jar or a layer that would meet one of the compendium's is refused.
 *
 * @throws {Forbidden} the caller may not create and delete this coven's
 * ingredients and update its stock.
 * @throws {NotFound} `localId` is not a live ingredient of this coven, or
 * `compendiumId` not a live compendium entry.
 * @throws {ValidationError} the coven already holds the entry, beside
 * `ingredientId`; another entry of the coven already uses the label, beside
 * `label`; a form that holds a jar or a spell layer matches no compendium
 * form, beside `forms`; the coven holds a jar of a matched compendium form
 * already, beside `jars`; or a spell lays both a form and its match, beside
 * `layers`.
 */
export async function convertLocalToCompendiumEntry(
  session: Session,
  workspaceId: string,
  localId: string,
  compendiumId: string,
): Promise<ConvertedLocal> {
  const membership = await assertMembership(session, workspaceId, CONVERT_PERMISSION);
  if (!RowId.safeParse(localId).success) throw new NotFound(NO_LOCAL);
  if (!RowId.safeParse(compendiumId).success) throw new NotFound(NO_ENTRY);
  const own = await findOneByIdInWorkspace(membership, ingredients, localId);
  if (!own) throw new NotFound(NO_LOCAL);
  const entry = await findOneIngredient([], compendiumId);
  if (!entry) throw new NotFound(NO_ENTRY);
  if (await findCupboardEntry(membership, compendiumId)) {
    throw new ValidationError([{ path: ['ingredientId'], message: HELD }]);
  }
  const columns = differingColumns(own, entry);
  await refuseLabelTaken(membership, columns.label, undefined, own.id);

  const ownForms = await findManyOfIngredients([membership], ingredientVariants, [localId]);
  const lost = await childrenLost(session, own, ownForms);
  // No proofs reads the compendium's forms alone.
  const entryForms = await findManyOfIngredients([], ingredientVariants, [compendiumId]);

  try {
    const { row, droppedForms } = await withAudit(session, async (write) => {
      // The lock `createStock` takes, so no jar of either entry appears
      // between the checks below and the moves.
      await write.lockCovenStock(membership);
      const forms = await write.lockLiveVariants(membership, localId);
      const matchOf = new Map(
        forms.flatMap((form) => {
          const match = entryForms.find(
            (candidate) => foldForm(candidate.form) === foldForm(form.form),
          );
          return match ? [[form.id, match] as const] : [];
        }),
      );
      const formIds = new Set(forms.map((form) => form.id));
      // A jar of a form deleted since is in no read and has nowhere to go.
      const jars = (await write.lockJarsOfIngredient(membership, localId)).filter((jar) =>
        formIds.has(jar.variantId),
      );
      const layers = await write.lockLayersOfVariants(membership, [...formIds]);
      const holds = (formId: string) =>
        jars.some((jar) => jar.variantId === formId) ||
        layers.some((layer) => layer.variantId === formId);

      const missing = forms.filter((form) => !matchOf.has(form.id) && holds(form.id));
      if (missing.length > 0) {
        const names = sortedNames(missing.map((form) => form.form));
        throw new ValidationError([
          {
            path: ['forms'],
            message: `The compendium entry has no ${listed(names)} form, which this coven's jars or spells hold`,
          },
        ]);
      }

      const theirJars = await write.lockJarsOfIngredient(membership, compendiumId);
      const meeting = (jar: StockRow) =>
        theirJars.some((theirs) => theirs.variantId === matchOf.get(jar.variantId)?.id);
      const jarClashes = jars.filter(meeting);
      if (jarClashes.length > 0) {
        const names = sortedNames(jarClashes.map((jar) => matchOf.get(jar.variantId)!.form));
        throw new ValidationError([
          {
            path: ['jars'],
            message: `This coven already holds a jar of the compendium's ${listed(names)} — combine the two jars first`,
          },
        ]);
      }

      const matchedIds = [...new Set([...matchOf.values()].map((match) => match.id))];
      const theirLayers = await write.lockLayersOfVariants(membership, matchedIds);
      const layerClashes = layers.filter((layer) =>
        theirLayers.some(
          (theirs) =>
            theirs.spellId === layer.spellId &&
            theirs.variantId === matchOf.get(layer.variantId!)?.id,
        ),
      );
      if (layerClashes.length > 0) {
        const names = sortedNames(layerClashes.map((layer) => matchOf.get(layer.variantId!)!.form));
        throw new ValidationError([
          {
            path: ['layers'],
            message: `A spell of this coven already lays the compendium's ${listed(names)} beside this entry's — take one layer out first`,
          },
        ]);
      }

      for (const jar of jars) {
        await write.updateByIdInWorkspace(membership, inventoryItems, jar.id, {
          ingredientId: compendiumId,
          variantId: matchOf.get(jar.variantId)!.id,
        });
      }
      for (const [formId, match] of matchOf) {
        await write.moveLayers(
          membership,
          layers.filter((layer) => layer.variantId === formId).map((layer) => layer.id),
          { ingredientId: compendiumId, variantId: match.id },
        );
      }
      const [inserted] = await write.insertInWorkspace(membership, workspaceCompendiumEntries, {
        ingredientId: compendiumId,
        ...columns,
      });
      const [removed] = await write.softDeleteByIdInWorkspace(membership, ingredients, localId);
      if (!removed) throw new NotFound(NO_LOCAL);
      return {
        row: inserted,
        droppedForms: forms.filter((form) => !matchOf.has(form.id)).map((form) => form.form),
      };
    });
    return { entry: row, dropped: { forms: sortedNames(droppedForms), ...lost } };
  } catch (error) {
    return refuseRace(error);
  }
}
