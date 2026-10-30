import 'server-only';
import {
  type AuditWriter,
  type ReferenceLinkRow,
  findManyByIds,
  findManyOfIngredients,
  findManyOfVariants,
  findManyReferences,
  findOneIngredient,
  findReferencesOf,
  findWorkspaceIngredientByIdentity,
  withAudit,
} from '../../../db/repository';
import { Forbidden, NotFound, ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { ingredientSlug } from '../../../lib/slugify';
import { addressTaken } from '../../../lib/text';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { RowId } from '../../../lib/validation';
import { ingredients } from '../schema/ingredients';
import { ingredientCategories } from '../schema/ingredient-categories';
import { ingredientDeities } from '../schema/ingredient-deities';
import { ingredientFolkNames } from '../schema/ingredient-folk-names';
import { ingredientSubstitutes } from '../schema/ingredient-substitutes';
import { ingredientVariants } from '../schema/ingredient-variants';
import { referenceLinks } from '../schema/reference-links';
import { type Membership, assertMembership } from '@/modules/coven';
import type { Curator } from '@/modules/identity';
import { curatedNames, describeEntry, foldVocabularyValue } from '@/modules/vocabulary';
import { categories } from '@/modules/vocabulary/schema/categories';
import type { ValidationIssue } from '../../../lib/types';
import type {
  ChildOwner,
  DeityRecord,
  IngredientChildren,
  IngredientFields,
  IssuePath,
  PickedDeity,
  PickedLists,
  PickedVariant,
  Tier,
  VariantEntry,
  VariantRecord,
} from '../types';
import type { LocalIngredientInput } from '../validation/ingredient';
import type { ReferenceLinkEntry, SubstituteEntry } from '../validation/types';

// What an ingredient write does the same way in either tier, shared by the two services
// (claude-docs/db/ingredient-children.md, "Ingredient row writes"). `memberships` is none for a compendium entry.

/** The proof that `session` may read coven `workspaceId`'s ingredients, or `undefined` so a batch skips that coven. */
export async function proofFor(
  session: Session | null,
  workspaceId: string,
): Promise<Membership | undefined> {
  if (!session) return undefined;
  try {
    return await assertMembership(session, workspaceId, { ingredient: ['read'] });
  } catch (error) {
    if (error instanceof Forbidden) return undefined;
    throw error;
  }
}

/** The parsed input as columns, every optional one written (`null` for none) so an update replaces the row. */
export function ingredientColumns(fields: IngredientFields) {
  return {
    name: fields.name,
    canonicalName: fields.canonicalName ?? null,
    nomenclature: fields.nomenclature,
    description: fields.description ?? null,
    elements: fields.elements ?? null,
    celestialBodies: fields.celestialBodies ?? null,
    zodiacSigns: fields.zodiacSigns ?? null,
    colors: fields.colors ?? null,
    safetyNotes: fields.safetyNotes ?? null,
    toxic: fields.toxic ?? false,
    slug: ingredientSlug(fields.name, fields.canonicalName),
  };
}

/** The parsed input split into row fields, the lists `resolvePicks` checks, and the child lists as sent. */
export function splitChildren<P extends LocalIngredientInput>(parsed: P) {
  const { folkNames, substitutes, references, deities, variants, ...fields } = parsed;
  return {
    fields,
    lists: { folkNames, substitutes, references },
    picked: { deities: deities ?? [], variants } satisfies PickedLists,
  };
}

type IngredientRecord = typeof ingredients.$inferSelect;

/**
 * Writes an ingredient's child rows beside it, in its `withAudit` (claude-docs/db/ingredient-children.md,
 * "Ingredient row writes"): `'add'` for a new row, `'replace'` to bring each list to the input's. A replace that changed a list answers
 * the parent row as the touch left it, whose revision is the one the save ends at.
 *
 * @throws {ValidationError} a forbidden link or reference, a repeated form, or a substitute form of the wrong ingredient.
 */
export async function writeChildren(
  write: AuditWriter,
  memberships: readonly Membership[],
  ingredientId: string,
  children: IngredientChildren,
  mode: 'add',
): Promise<undefined>;
export async function writeChildren(
  write: AuditWriter,
  memberships: readonly Membership[],
  ingredientId: string,
  children: IngredientChildren,
  mode: 'replace',
  proof: Curator | Membership,
): Promise<IngredientRecord | undefined>;
export async function writeChildren(
  write: AuditWriter,
  memberships: readonly Membership[],
  ingredientId: string,
  children: IngredientChildren,
  mode: 'add' | 'replace',
  proof?: Curator | Membership,
): Promise<IngredientRecord | undefined> {
  const folkNames = children.folkNames ?? [];
  const substitutes = children.substitutes ?? [];
  const references = children.references ?? [];
  const categoryIds = children.categoryIds ?? [];
  const variants = children.variants ?? [];
  // The ingredient's own rows, beside its forms'.
  const parent: ChildOwner = { ingredientId, variantId: null, at: [] };

  if (mode === 'add') {
    await addFolkNames(write, ingredientId, folkNames);
    await addSubstitutes(write, memberships, parent, substitutes);
    await replaceDeities(write, ingredientId, children.deities, []);
    await addReferenceLinks(write, memberships, parent, references);
    await addCategories(write, parent, categoryIds);
    await addVariants(write, memberships, ingredientId, variants);
    return undefined;
  }
  if (!proof) throw new Error("writeChildren replaces under a proof of the ingredient's tier");
  const changes = watchWrites(write);
  await replaceFolkNames(changes.write, memberships, ingredientId, folkNames);
  await replaceSubstitutes(changes.write, memberships, parent, substitutes);
  await replaceDeities(changes.write, ingredientId, children.deities, children.heldDeities ?? []);
  await replaceReferenceLinks(changes.write, memberships, parent, references);
  await replaceCategories(changes.write, memberships, parent, categoryIds);
  await replaceVariants(changes.write, memberships, ingredientId, variants);
  // A changed child list moves the parent's `updated_at`; a save that changed nothing leaves it.
  if (!changes.changed()) return undefined;
  const [touched] =
    'workspaceId' in proof
      ? await write.touchByIdInWorkspace(proof, ingredients, ingredientId)
      : await write.touchByIdInCompendium(proof, ingredients, ingredientId);
  return touched;
}

/** `write` that notes whether any write through it answered a row. */
function watchWrites(write: AuditWriter): { write: AuditWriter; changed: () => boolean } {
  let changed = false;
  const watched = new Proxy(write, {
    get(target, name, receiver) {
      const member: unknown = Reflect.get(target, name, receiver);
      if (typeof member !== 'function') return member;
      return async (...args: unknown[]) => {
        const rows: unknown = await member.apply(target, args);
        if (Array.isArray(rows) && rows.length > 0) changed = true;
        return rows;
      };
    },
  });
  return { write: watched, changed: () => changed };
}

/**
 * Soft-deletes one ingredient through `remove`, leaving its children for spells that hold it
 * (claude-docs/db/spell-visibility.md, "What a spell holds").
 *
 * @throws {NotFound} `missing`, when `remove` finds no live row or `id` is not a uuid.
 */
export async function softDeleteIngredient(
  session: Session,
  id: string,
  missing: string,
  remove: (write: AuditWriter) => Promise<readonly unknown[]>,
): Promise<void> {
  if (!RowId.safeParse(id).success) throw new NotFound(missing);
  await withAudit(session, async (write) => {
    const [row] = await remove(write);
    if (!row) throw new NotFound(missing);
  });
}

/** The tier's own wording of a refusal: none in `memberships` is a compendium write. */
function inTierWords(memberships: readonly Membership[], words: Record<Tier, string>): string {
  return memberships.length === 0 ? words.compendium : words.coven;
}

/** The live deity rows an ingredient holds, which a save keeps where it lists them again. */
export function heldDeities(
  memberships: readonly Membership[],
  ingredientId: string,
): Promise<DeityRecord[]> {
  return findManyOfIngredients(memberships, ingredientDeities, [ingredientId]);
}

/**
 * The input's picks checked against the vocabularies, and its forms and deities as written (claude-docs/db/ingredient-children.md, "Ingredient row writes").
 * @returns the fields, the checked lists `writeChildren` takes, and every issue found, pathed to the sent entry.
 */
export async function resolvePicks(
  tier: Tier,
  fields: IngredientFields,
  picked: PickedLists,
  held: readonly DeityRecord[],
): Promise<{
  fields: IngredientFields;
  children: Required<Pick<IngredientChildren, 'categoryIds' | 'deities' | 'variants'>>;
  issues: ValidationIssue[];
}> {
  const { deities } = picked;
  const variants = (picked.variants ?? []).map((variant, index) =>
    asPicked(variant, ['variants', index]),
  );
  const heldLinks = held.flatMap((row) => (row.deityId === null ? [] : [row]));
  const categoryIds = [...new Set(fields.categoryIds ?? [])];
  const [forms, deityNames, filed] = await Promise.all([
    curatedNames(
      'form',
      variants.flatMap((variant) => variant.formId ?? []),
    ),
    curatedNames('deities', [
      ...deities.flatMap((entry) => entry.deityId ?? []),
      ...heldLinks.map((row) => row.deityId as string),
    ]),
    findManyByIds(categories, [
      ...new Set([...categoryIds, ...variants.flatMap((variant) => variant.categoryIds)]),
    ]),
  ]);
  const issues: ValidationIssue[] = [];
  const live = new Set(filed.map((category) => category.id));

  const resolved = variants.map((variant) => {
    const form = pickedForm(tier, variant, forms, issues);
    refuseDeadCategories(variant.categoryIds, live, [...variant.at, 'categoryIds'], issues);
    return { ...variant, form, categoryIds: [...new Set(variant.categoryIds)] };
  });

  // Picks first, so a typed name can claim only a retired pick no entry sent by id.
  const pickedDeities: (PickedDeity | undefined)[] = deities.map(() => undefined);
  const claimed = new Set<string>();
  deities.forEach((entry, index) => {
    if (entry.deityId === null) return;
    const name = deityNames.get(entry.deityId);
    const kept = heldLinks.find((row) => row.deityId === entry.deityId);
    if (name !== undefined) pickedDeities[index] = { deityId: entry.deityId, name };
    else if (kept && tier === 'coven')
      pickedDeities[index] = { deityId: entry.deityId, name: kept.name };
    else
      issues.push({
        path: ['deities', index],
        message: 'No such deity to pick — choose one from the list',
      });
    if (kept) claimed.add(kept.id);
  });
  deities.forEach((entry, index) => {
    if (entry.deityId !== null) return;
    if (tier === 'compendium') {
      issues.push({
        path: ['deities', index],
        message: `Pick "${entry.name}" from the deity list — add it there first if it is missing`,
      });
      return;
    }
    const retired = heldLinks.find(
      (row) =>
        row.name === entry.name &&
        !claimed.has(row.id) &&
        !deityNames.has(row.deityId as string) &&
        !held.some((other) => other.deityId === null && other.name === entry.name),
    );
    if (retired) claimed.add(retired.id);
    pickedDeities[index] = { deityId: retired?.deityId ?? null, name: entry.name };
  });

  refuseDeadCategories(fields.categoryIds ?? [], live, ['categoryIds'], issues);

  return {
    fields: { ...fields, categoryIds },
    children: {
      categoryIds,
      deities: pickedDeities.filter((entry) => entry !== undefined),
      variants: resolved,
    },
    issues,
  };
}

/** One form as sent, with each `""` and `[]` the whole-row input sends for none read as none. */
function asPicked(variant: VariantEntry, at: IssuePath): PickedVariant {
  const listOrNone = <T>(list: T[]) => (list.length > 0 ? list : null);
  return {
    ...variant,
    id: variant.id ?? null,
    formId: variant.formId || null,
    description: variant.description || null,
    safetyNotes: variant.safetyNotes || null,
    elements: listOrNone(variant.elements),
    celestialBodies: listOrNone(variant.celestialBodies),
    zodiacSigns: listOrNone(variant.zodiacSigns),
    colors: listOrNone(variant.colors),
    at,
  };
}

/** One form's text as written, its pick checked against `forms`; a refusal is pushed onto `issues` beneath `at`. */
function pickedForm(
  tier: Tier,
  { form, formId, at }: PickedVariant,
  forms: ReadonlyMap<string, string>,
  issues: ValidationIssue[],
): string {
  if (formId == null) {
    if (tier === 'compendium') {
      issues.push({
        path: [...at, 'form'],
        message: `Pick "${form}" from the form list — add it there first if it is missing`,
      });
    }
    return form;
  }
  const name = forms.get(formId);
  if (name === undefined) {
    issues.push({
      path: [...at, 'formId'],
      message: 'No such form to pick — choose one from the list',
    });
    return form;
  }
  if (foldVocabularyValue(form) !== foldVocabularyValue(name)) {
    issues.push({
      path: [...at, 'form'],
      message: `The form picked is "${name}" — pick another, or clear the pick to type one`,
    });
    return form;
  }
  return name;
}

/** Pushes an issue at `path`, beside the entry, for each id naming no live category. */
function refuseDeadCategories(
  ids: readonly string[],
  live: ReadonlySet<string>,
  path: IssuePath,
  issues: ValidationIssue[],
) {
  ids.forEach((id, index) => {
    if (live.has(id)) return;
    issues.push({
      path: [...path, index],
      message: 'No such category to file it under — choose one from the list',
    });
  });
}

/**
 * Brings the live deity rows to exactly `deities`, in order, moving positions through a scratch offset
 * (claude-docs/db/ingredient-children.md, "Ingredient row writes").
 */
async function replaceDeities(
  write: AuditWriter,
  ingredientId: string,
  deities: readonly PickedDeity[],
  held: readonly DeityRecord[],
) {
  const keyOf = (deityId: string | null, name: string) =>
    deityId ? `link:${deityId}` : `name:${name}`;
  const heldByKey = new Map(held.map((row) => [keyOf(row.deityId, row.name), row]));
  const listed = new Set(deities.map((entry) => keyOf(entry.deityId, entry.name)));
  const places = deities.map((entry, position) => ({
    entry,
    position,
    row: heldByKey.get(keyOf(entry.deityId, entry.name)),
  }));

  await write.softDeleteByIds(
    ingredientDeities,
    held.filter((row) => !listed.has(keyOf(row.deityId, row.name))).map((row) => row.id),
  );

  const moving = places.filter(({ row, position }) => row && row.position !== position);
  const scratch = Math.max(-1, ...held.map((row) => row.position)) + 1;
  for (const { row, position } of moving) {
    await write.updateById(ingredientDeities, (row as DeityRecord).id, {
      position: scratch + position,
    });
  }
  for (const { row, entry, position } of places) {
    if (!row || (row.position === position && row.name === entry.name)) continue;
    await write.updateById(ingredientDeities, row.id, { position, name: entry.name });
  }

  for (const { row, entry, position } of places) {
    if (row) continue;
    await write.insert(ingredientDeities, {
      ingredientId,
      deityId: entry.deityId,
      name: entry.name,
      position,
    });
  }
}

/** The live rows `owner` holds of a form-naming child table: the ingredient's own, or one form's. */
function heldBy<TTable extends typeof ingredientCategories | typeof ingredientSubstitutes>(
  memberships: readonly Membership[],
  owner: ChildOwner,
  table: TTable,
): Promise<TTable['$inferSelect'][]> {
  return owner.variantId === null
    ? findManyOfIngredients(memberships, table, [owner.ingredientId])
    : findManyOfVariants(memberships, table, [owner.variantId]);
}

async function addCategories(
  write: AuditWriter,
  owner: ChildOwner,
  categoryIds: readonly string[],
) {
  const { ingredientId, variantId } = owner;
  for (const categoryId of categoryIds) {
    await write.insert(ingredientCategories, { ingredientId, variantId, categoryId });
  }
}

/** Brings the owner's categories to exactly `categoryIds` (claude-docs/db/ingredient-children.md, "Ingredient row writes"). */
async function replaceCategories(
  write: AuditWriter,
  memberships: readonly Membership[],
  owner: ChildOwner,
  categoryIds: readonly string[],
) {
  const { ingredientId, variantId } = owner;
  const held = (await heldBy(memberships, owner, ingredientCategories)).map(
    (pair) => pair.categoryId,
  );
  const shown = new Set((await findManyByIds(categories, held)).map((category) => category.id));
  const listed = new Set(categoryIds);

  await write.delete(ingredientCategories, {
    ingredientId,
    variantId,
    categoryId: held.filter((id) => shown.has(id) && !listed.has(id)),
  });
  await addCategories(
    write,
    owner,
    categoryIds.filter((id) => !held.includes(id)),
  );
}

async function addFolkNames(write: AuditWriter, ingredientId: string, names: readonly string[]) {
  for (const name of names) await write.insert(ingredientFolkNames, { ingredientId, name });
}

/** Brings the live folk names to exactly `names`, compared as written, dropped rows first. */
async function replaceFolkNames(
  write: AuditWriter,
  memberships: readonly Membership[],
  ingredientId: string,
  names: readonly string[],
) {
  const current = await findManyOfIngredients(memberships, ingredientFolkNames, [ingredientId]);
  const listed = new Set(names);
  const kept = new Set(current.map((row) => row.name));

  await write.softDeleteByIds(
    ingredientFolkNames,
    current.filter((row) => !listed.has(row.name)).map((row) => row.id),
  );
  await addFolkNames(
    write,
    ingredientId,
    names.filter((name) => !kept.has(name)),
  );
}

/**
 * Writes a new owner's substitutes, each held to `refuseUnlinkable`.
 *
 * @throws {ValidationError} a link the tier rule forbids, pathed to its entry.
 */
async function addSubstitutes(
  write: AuditWriter,
  memberships: readonly Membership[],
  owner: ChildOwner,
  entries: readonly SubstituteEntry[],
) {
  await bringSubstitutesTo(write, memberships, owner, entries, []);
}

/**
 * Brings the owner's live substitutes to exactly `entries` (claude-docs/db/ingredient-children.md, "Ingredient row writes").
 *
 * @throws {ValidationError} a new link the tier rule forbids, pathed to its entry.
 */
async function replaceSubstitutes(
  write: AuditWriter,
  memberships: readonly Membership[],
  owner: ChildOwner,
  entries: readonly SubstituteEntry[],
) {
  const current = await heldBy(memberships, owner, ingredientSubstitutes);
  await bringSubstitutesTo(write, memberships, owner, entries, current);
}

/** The diff both writes share; dropped rows go first so a re-cased name clears the case-folded index. */
async function bringSubstitutesTo(
  write: AuditWriter,
  memberships: readonly Membership[],
  owner: ChildOwner,
  entries: readonly SubstituteEntry[],
  current: readonly (typeof ingredientSubstitutes.$inferSelect)[],
) {
  const listed = new Set(entries.map((entry) => keyOf(entry.ingredientId, entry.name)));
  const held = new Map(current.map((row) => [keyOf(row.substituteId, row.name), row]));

  await refuseUnlinkable(memberships, owner, entries, held);
  await write.softDeleteByIds(
    ingredientSubstitutes,
    current.filter((row) => !listed.has(keyOf(row.substituteId, row.name))).map((row) => row.id),
  );
  const { ingredientId, variantId } = owner;
  for (const { ingredientId: substituteId, name, ...entry } of entries) {
    const substituteVariantId = entry.substituteVariantId ?? null;
    const row = held.get(keyOf(substituteId, name));
    if (!row) {
      await write.insert(ingredientSubstitutes, {
        ingredientId,
        variantId,
        substituteId,
        substituteVariantId,
        name,
      });
    } else if (row.substituteVariantId !== substituteVariantId) {
      await write.updateById(ingredientSubstitutes, row.id, { substituteVariantId });
    }
  }
}

/** What makes two substitutes one: the ingredient linked, or else the name as written. */
function keyOf(linkedId: string | null, name: string | null): string {
  return linkedId ? `link:${linkedId}` : `name:${name}`;
}

/**
 * Refuses each new substitute link the tier rule forbids (claude-docs/db/ingredient-children.md, "Ingredient row writes").
 *
 * @throws {ValidationError} one issue per refused entry, pathed to it or to its `substituteVariantId`.
 */
async function refuseUnlinkable(
  memberships: readonly Membership[],
  owner: ChildOwner,
  entries: readonly SubstituteEntry[],
  held: ReadonlyMap<string, typeof ingredientSubstitutes.$inferSelect>,
): Promise<void> {
  const unlinkable = inTierWords(memberships, {
    compendium:
      'No compendium entry to link — a compendium entry’s substitute links only the compendium',
    coven: 'No ingredient to link — choose one from the compendium or this coven',
  });
  const changed = entries.flatMap((entry, index) => {
    if (entry.ingredientId === null) return [];
    const form = entry.substituteVariantId ?? null;
    const row = held.get(keyOf(entry.ingredientId, null));
    if (row && row.substituteVariantId === form) return [];
    return [{ index, linked: entry.ingredientId, form, isNew: !row }];
  });
  const formsOfLinked = new Set(
    (
      await findManyOfIngredients(memberships, ingredientVariants, [
        ...new Set(changed.flatMap(({ linked, form }) => (form === null ? [] : [linked]))),
      ])
    ).map((variant) => `${variant.ingredientId}:${variant.id}`),
  );

  const checks = changed.map(async ({ index, linked, form, isNew }) => {
    const path = [...owner.at, 'substitutes', index];
    if (linked === owner.ingredientId && form === owner.variantId) {
      const itself = owner.variantId === null ? 'An ingredient' : 'A form';
      return { path, message: `${itself} cannot be its own substitute` };
    }
    if (isNew && !(await findOneIngredient(memberships, linked))) {
      return { path, message: unlinkable };
    }
    if (form !== null && !formsOfLinked.has(`${linked}:${form}`)) {
      return {
        path: [...path, 'substituteVariantId'],
        message: 'No such form of that ingredient — choose one of its forms',
      };
    }
    return undefined;
  });
  const issues = (await Promise.all(checks)).filter((issue) => issue !== undefined);
  if (issues.length > 0) throw new ValidationError(issues);
}

/**
 * Writes a new owner's references, each held to `refuseUncitable`.
 *
 * @throws {ValidationError} a reference the tier rule forbids, pathed to its entry.
 */
async function addReferenceLinks(
  write: AuditWriter,
  memberships: readonly Membership[],
  owner: ChildOwner,
  entries: readonly ReferenceLinkEntry[],
) {
  await bringReferencesTo(write, memberships, owner, entries, []);
}

/**
 * Brings the owner's references to exactly `entries` (claude-docs/db/ingredient-children.md, "Ingredient row writes").
 *
 * @throws {ValidationError} a new reference the tier rule forbids, pathed to its entry.
 */
async function replaceReferenceLinks(
  write: AuditWriter,
  memberships: readonly Membership[],
  owner: ChildOwner,
  entries: readonly ReferenceLinkEntry[],
) {
  const current =
    owner.variantId === null
      ? await findReferencesOf(memberships, 'ingredientId', [owner.ingredientId])
      : await findReferencesOf(memberships, 'ingredientVariantId', [owner.variantId]);
  await bringReferencesTo(
    write,
    memberships,
    owner,
    entries,
    current.map(({ link }) => link),
  );
}

/** The diff both writes share. */
async function bringReferencesTo(
  write: AuditWriter,
  memberships: readonly Membership[],
  owner: ChildOwner,
  entries: readonly ReferenceLinkEntry[],
  current: readonly ReferenceLinkRow[],
) {
  const held = new Map(current.map((link) => [link.referenceId, link]));
  const listed = new Set(entries.map((entry) => entry.referenceId));
  // A link names one sourced row: the ingredient, or one of its forms.
  const cites =
    owner.variantId === null
      ? { ingredientId: owner.ingredientId }
      : { ingredientVariantId: owner.variantId };

  await refuseUncitable(memberships, owner, entries, held);
  await write.softDeleteByIds(
    referenceLinks,
    current.filter((link) => !listed.has(link.referenceId)).map((link) => link.id),
  );
  for (const { referenceId, locator } of entries) {
    const link = held.get(referenceId);
    if (!link) await write.insert(referenceLinks, { referenceId, ...cites, locator });
    else if (link.locator !== locator) await write.updateById(referenceLinks, link.id, { locator });
  }
}

/**
 * Refuses each new reference the tier rule forbids, in one read for the list (claude-docs/db/ingredient-children.md, "Ingredient row writes").
 *
 * @throws {ValidationError} one issue per refused entry, pathed to it.
 */
async function refuseUncitable(
  memberships: readonly Membership[],
  owner: ChildOwner,
  entries: readonly ReferenceLinkEntry[],
  held: ReadonlyMap<string, ReferenceLinkRow>,
): Promise<void> {
  const unchecked = entries.filter((entry) => !held.has(entry.referenceId));
  const found = await findManyReferences(
    memberships,
    unchecked.map((entry) => entry.referenceId),
  );
  const citable = new Set(found.map((reference) => reference.id));
  const message = inTierWords(memberships, {
    compendium:
      'No compendium source to cite — a compendium entry cites only the compendium’s sources',
    coven: 'No source to cite — choose one from the compendium or this coven',
  });

  const issues = entries.flatMap((entry, index): ValidationIssue[] =>
    held.has(entry.referenceId) || citable.has(entry.referenceId)
      ? []
      : [{ path: [...owner.at, 'references', index], message }],
  );
  if (issues.length > 0) throw new ValidationError(issues);
}

/**
 * Writes a new ingredient's forms, each with its own children, in the order sent.
 *
 * @throws {ValidationError} as `writeVariant` and each child's writer do.
 */
async function addVariants(
  write: AuditWriter,
  memberships: readonly Membership[],
  ingredientId: string,
  variants: readonly PickedVariant[],
) {
  for (const variant of variants) {
    const variantId = await writeVariant(write, ingredientId, variant);
    const owner = { ingredientId, variantId, at: variant.at };
    await addSubstitutes(write, memberships, owner, variant.substitutes);
    await addReferenceLinks(write, memberships, owner, variant.references);
    await addCategories(write, owner, variant.categoryIds);
  }
}

/**
 * Brings the ingredient's live forms to exactly `variants`: kept by `id`, else by folded form, dropped first
 * (claude-docs/db/ingredient-children.md, "Ingredient row writes").
 *
 * @throws {ValidationError} as `writeVariant` and each child's writer do.
 */
async function replaceVariants(
  write: AuditWriter,
  memberships: readonly Membership[],
  ingredientId: string,
  variants: readonly PickedVariant[],
) {
  const current = await findManyOfIngredients(memberships, ingredientVariants, [ingredientId]);
  const rows = matchVariants(variants, current);
  const kept = new Set(rows.flatMap((row) => (row ? [row.id] : [])));

  await write.softDeleteByIds(
    ingredientVariants,
    current.filter((row) => !kept.has(row.id)).map((row) => row.id),
  );
  const ids: string[] = [];
  for (const [index, variant] of variants.entries()) {
    const row = rows[index];
    if (row) ids[index] = await writeVariant(write, ingredientId, variant, row);
  }
  for (const [index, variant] of variants.entries()) {
    if (!rows[index]) ids[index] = await writeVariant(write, ingredientId, variant);
  }

  for (const [index, variant] of variants.entries()) {
    const owner = { ingredientId, variantId: ids[index], at: variant.at };
    if (rows[index]) {
      await replaceSubstitutes(write, memberships, owner, variant.substitutes);
      await replaceReferenceLinks(write, memberships, owner, variant.references);
      await replaceCategories(write, memberships, owner, variant.categoryIds);
    } else {
      await addSubstitutes(write, memberships, owner, variant.substitutes);
      await addReferenceLinks(write, memberships, owner, variant.references);
      await addCategories(write, owner, variant.categoryIds);
    }
  }
}

/** One live form row per entry, or none for an entry that is new: by id first, then by folded form. */
function matchVariants(variants: readonly PickedVariant[], current: readonly VariantRecord[]) {
  const byId = new Map(current.map((row) => [row.id, row]));
  const claimed = new Set<string>();
  const byIds = variants.map((variant) => {
    const row = variant.id ? byId.get(variant.id) : undefined;
    if (row) claimed.add(row.id);
    return row;
  });
  return byIds.map((row, index) => {
    if (row) return row;
    const fold = foldForm(variants[index].form);
    const match = current.find((other) => !claimed.has(other.id) && foldForm(other.form) === fold);
    if (match) claimed.add(match.id);
    return match;
  });
}

/** A form as `ingredient_variants_form_unique` folds it, `lower(btrim(form))`. */
export function foldForm(form: string): string {
  return form.trim().toLowerCase();
}

/**
 * Inserts `variant` as a form of the ingredient, or rewrites `row` where a column differs, and answers the row's id.
 *
 * @throws {ValidationError} another live form folds alike, reported on that entry's `form`.
 */
async function writeVariant(
  write: AuditWriter,
  ingredientId: string,
  variant: PickedVariant,
  row?: VariantRecord,
): Promise<string> {
  const {
    form,
    formId,
    description,
    safetyNotes,
    toxic,
    elements,
    celestialBodies,
    zodiacSigns,
    colors,
  } = variant;
  const columns = {
    form,
    formId,
    description,
    safetyNotes,
    toxic,
    elements,
    celestialBodies,
    zodiacSigns,
    colors,
  };
  const refuse = (error: unknown): never => {
    if (violatedUniqueIndex(error) !== 'ingredient_variants_form_unique') throw error;
    throw new ValidationError([
      {
        path: [...variant.at, 'form'],
        message: `This ingredient already has the form "${variant.form}"`,
      },
    ]);
  };
  if (!row) {
    const [inserted] = await write
      .insert(ingredientVariants, { ingredientId, ...columns })
      .catch(refuse);
    return inserted.id;
  }
  // `undefined` and `null` are the same answer here; read as different, every save would rewrite every form.
  const differs = (Object.keys(columns) as (keyof typeof columns)[]).some(
    (key) => JSON.stringify(columns[key] ?? null) !== JSON.stringify(row[key] ?? null),
  );
  if (differs) await write.updateById(ingredientVariants, row.id, columns).catch(refuse);
  return row.id;
}

/**
 * The folk name `folkNameId` of ingredient `ingredientId` and the ingredient's other live folk names, read before a promotion.
 *
 * @throws {NotFound} the ingredient holds no live folk name with this id.
 */
export async function readPromotedFolkName(
  memberships: readonly Membership[],
  ingredientId: string,
  folkNameId: string,
): Promise<{ promoted: { id: string; name: string }; others: string[] }> {
  const notFound = () => new NotFound('No such common name on this ingredient');
  if (!RowId.safeParse(folkNameId).success) throw notFound();
  const live = await findManyOfIngredients(memberships, ingredientFolkNames, [ingredientId]);
  const promoted = live.find((row) => row.id === folkNameId);
  if (!promoted) throw notFound();
  return {
    promoted,
    others: live.filter((row) => row.id !== folkNameId).map((row) => row.name),
  };
}

/** The folk-name half of a promotion: soft-deletes the promoted row, then writes the old display name as a folk name unless one matches in any case. */
export async function swapFolkName(
  write: AuditWriter,
  ingredientId: string,
  promotedId: string,
  previousName: string,
  others: readonly string[],
) {
  await write.softDeleteByIds(ingredientFolkNames, [promotedId]);
  const folded = previousName.toLowerCase();
  if (others.some((name) => name.toLowerCase() === folded)) return;
  await write.insert(ingredientFolkNames, { ingredientId, name: previousName });
}

/** What a collision is reported from: the label and the formal name alone. */
type NameFields = Pick<IngredientFields, 'name' | 'canonicalName'>;

/**
 * A write that broke one of the coven's unique indexes, as a `ValidationError` on the field that caused it;
 * any other error unchanged (claude-docs/db/ingredient-children.md, "Ingredient row writes").
 */
export async function refuseCollision(
  error: unknown,
  membership: Membership,
  fields: NameFields,
  slug: string,
  id: string | undefined,
): Promise<never> {
  const refuse = (path: string, message: string) => {
    throw new ValidationError([{ path: [path], message }]);
  };
  const { name, canonicalName } = fields;
  const index = violatedUniqueIndex(error);
  if (
    index === 'ingredients_workspace_identity_key_unique' ||
    index === 'ingredients_workspace_label_unique' ||
    index === 'ingredients_workspace_slug_unique'
  ) {
    const holder = await findWorkspaceIngredientByIdentity(membership, fields);
    if (holder && holder.id !== id) {
      refuse(
        canonicalName == null ? 'name' : 'canonicalName',
        `This coven already has ${describeEntry(holder)} — add this form to it instead`,
      );
    }
  }

  switch (index) {
    case 'ingredients_workspace_label_unique':
      return refuse('name', `This coven already has an ingredient called "${name}"`);
    case 'ingredients_workspace_identity_key_unique':
      return refuse(
        canonicalName == null ? 'name' : 'canonicalName',
        `This coven already has an ingredient that is ${canonicalName ?? name}`,
      );
    case 'ingredients_workspace_slug_unique':
      return refuse(
        'name',
        addressTaken('Another ingredient in this coven', slug, 'change the name or formal name'),
      );
  }
  throw error;
}
