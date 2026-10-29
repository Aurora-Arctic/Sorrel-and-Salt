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

// A compendium entry in a coven's cupboard: the coven's row naming it and the merge laying its overrides over the entry
// (claude-docs/db/workspace-compendium-entries.md, "Reading it").

/** Whether `row` is a compendium entry the curators retired: soft-deleted, yet read by covens whose cupboard names it. */
export function isRetired(row: Pick<IngredientRow, 'workspaceId' | 'deletedAt'>): boolean {
  return row.workspaceId === null && row.deletedAt !== null;
}

/**
 * The compendium entry with this id, retired or not, and `membership`'s cupboard entry naming it, or `undefined`
 * (claude-docs/db/workspace-compendium-entries.md, "When the compendium retires the entry"). The caller has checked the proof.
 */
export async function heldCompendiumEntry(
  membership: Membership,
  ingredientId: string,
): Promise<{ entry: IngredientRow; cupboardEntry: CupboardEntryRow } | undefined> {
  // An id that is not a uuid names nothing and would be a driver error at the comparison.
  if (!RowId.safeParse(ingredientId).success) return undefined;
  return findCupboardEntryIncludingSoftDeleted(membership, ingredientId);
}

/**
 * The coven's live cupboard entry for this compendium entry, or null (claude-docs/db/workspace-compendium-entries.md,
 * "Cupboard entry service details"). Any member, viewers included.
 *
 * @throws {Forbidden} the caller may not read this coven's ingredients.
 */
export async function getCupboardEntry(
  session: Session,
  workspaceId: string,
  ingredientId: string,
): Promise<CupboardEntryRow | null> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['read'] });
  // An id that is not a uuid names nothing and would be a driver error at the comparison.
  if (!RowId.safeParse(ingredientId).success) return null;
  return (await findCupboardEntry(membership, ingredientId)) ?? null;
}

/** Each key's cupboard entry in its coven, or null, in key order: `Ingredient.cupboardEntry`'s batch; a refused coven gets a `Forbidden` in its slot. */
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
 * One page of the compendium entries named exactly `name` but for case: the Add flow's question.
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

// The three writes, each opening with the coven's own check and writing through `withAudit`
// (claude-docs/db/workspace-compendium-entries.md, "Writing it").

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

/** Refuses a label the coven already uses, case folded; `exceptId` is the entry being written (claude-docs/db/workspace-compendium-entries.md, "Cupboard entry service details"). */
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
 * The own-ingredient side of the label rule: refuses a name a cupboard entry of this coven carries as its label.
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
 * Adds a compendium entry to this coven's cupboard: one row naming it, with the overrides `input` carries; no jar, no form.
 *
 * @throws {Forbidden} the caller may not create this coven's ingredients.
 * @throws {NotFound} no live compendium entry has this id.
 * @throws {ValidationError} the coven already holds the entry, the input breaks `CupboardEntryInput`, or the label is used.
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
 * Changes this coven's overrides of a compendium entry it holds, retired or not
 * (claude-docs/db/workspace-compendium-entries.md, "Cupboard entry service details").
 *
 * @throws {Forbidden} the caller may not update this coven's ingredients.
 * @throws {NotFound} this coven holds no live cupboard entry for this id.
 * @throws {ValidationError} the patch breaks `CupboardEntryInput`, or the label is used.
 */
export async function annotateCupboardEntry(
  session: Session,
  workspaceId: string,
  ingredientId: string,
  patch: CupboardEntryValues,
): Promise<CupboardEntryRow> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['update'] });
  const parsed = parseInput(CupboardEntryInput, patch);
  // Read through the retired-entry hatch, so a retired entry the coven holds is found; Remove reads it the same way.
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
 * Takes a compendium entry out of this coven's cupboard, refused while the coven holds a jar of any of its forms
 * (claude-docs/db/workspace-compendium-entries.md, "Cupboard entry service details").
 *
 * @throws {Forbidden} the caller may not delete this coven's ingredients.
 * @throws {NotFound} this coven holds no live cupboard entry for this id.
 * @throws {ValidationError} the coven holds jars of it.
 */
export async function removeCupboardEntry(
  session: Session,
  workspaceId: string,
  ingredientId: string,
): Promise<void> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['delete'] });
  await withAudit(session, async (write) => {
    // A first jar is created under this lock, so the count below is not stale by the time the row goes.
    await write.lockCovenStock(membership);
    // Read through the retired-entry hatch, so a retired entry can be removed like a live one.
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

// Making a held compendium entry the coven's own (claude-docs/db/workspace-compendium-entries.md,
// "Converting a compendium entry into our own" and "Cupboard entry service details").

/** What making an entry the coven's own asks of a role; exported so the entry page offers it on exactly this permission. */
export const MAKE_IT_OURS_PERMISSION = {
  ingredient: ['create', 'delete'],
  inventory: ['update'],
} as const;

/** A substitute of the entry naming the entry itself, whose link the copy points at itself. */
interface SelfLink {
  variantId: string | null;
  substituteVariantId: string | null;
}

/** The entry as a coven write's input, read as the entry page reads it (claude-docs/db/workspace-compendium-entries.md, "Cupboard entry service details"). */
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
 * Makes the compendium entry `ingredientId`, which this coven holds, the coven's own, in one transaction
 * (claude-docs/db/workspace-compendium-entries.md, "Cupboard entry service details").
 *
 * @throws {Forbidden} the caller may not create and delete this coven's ingredients and update its stock.
 * @throws {NotFound} this coven holds no cupboard entry for this id.
 * @throws {ValidationError} the label, formal name or name is already used by another entry of the coven.
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
      // The lock `createStock` takes, so no jar of the entry appears between the read and the moves.
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
 * Which of these compendium entries the coven's cupboard holds, as a set of ids, uncached (CLAUDE.md rule 6).
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
 * The same question across several covens: each coven's held ids by its id, one proof per coven.
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

/** The viewer's own covens that hold this compendium entry, by name; per viewer, so never cached (claude-docs/db/workspace-compendium-entries.md, "Cupboard entry service details"). */
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
