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
  withAudit,
} from '../../../db/repository';
import { NotFound, ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { ingredientSlug } from '../../../lib/slugify';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { RowId } from '../../../lib/validation';
import { ingredientCategories } from '../schema/ingredient-categories';
import { ingredientDeities } from '../schema/ingredient-deities';
import { ingredientFolkNames } from '../schema/ingredient-folk-names';
import { ingredientSubstitutes } from '../schema/ingredient-substitutes';
import { ingredientVariants } from '../schema/ingredient-variants';
import { referenceLinks } from '../schema/reference-links';
import type { Membership } from '@/modules/coven';
import { curatedNames, foldVocabularyValue } from '@/modules/vocabulary';
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

// What an ingredient write does the same way in either tier: the parsed
// input as columns, the picks it records checked against the vocabularies,
// the folk names, substitutes, deities, references, categories and forms
// written beside the row, and the soft delete. Internal to the module — the two
// services import it, and the index does not. A tier is told by
// `memberships`, as the repository's two-tier finders take it: none for a
// compendium entry, the proof's coven for a coven's.

/**
 * The parsed input as columns, every optional one written — `null` where the
 * input has nothing — so an update replaces the row rather than merging into
 * it; and the slug, derived from the label, the form and the formal name
 * (M4.3) rather than sent beside them.
 *
 * `form` and `formId` are the first form's once `resolvePicks` has run, so
 * the row mirrors a variant while the columns last: the dual write MB.222
 * removes, once nothing reads them.
 */
export function ingredientColumns(fields: IngredientFields) {
  return {
    name: fields.name,
    canonicalName: fields.canonicalName ?? null,
    nomenclature: fields.nomenclature,
    form: fields.form ?? null,
    formId: fields.formId ?? null,
    description: fields.description ?? null,
    elements: fields.elements ?? null,
    planets: fields.planets ?? null,
    zodiacSigns: fields.zodiacSigns ?? null,
    colors: fields.colors ?? null,
    safetyNotes: fields.safetyNotes ?? null,
    slug: ingredientSlug(fields.name, fields.form, fields.canonicalName),
  };
}

/**
 * The parsed input split into the row's fields, the lists `resolvePicks`
 * checks — the deities and the forms — and the child lists written as sent,
 * so a service passes each on without naming them. Either tier's parse.
 */
export function splitChildren<P extends LocalIngredientInput>(parsed: P) {
  const { folkNames, substitutes, references, deities, variants, ...fields } = parsed;
  return {
    fields,
    lists: { folkNames, substitutes, references },
    picked: { deities: deities ?? [], variants } satisfies PickedLists,
  };
}

/**
 * Writes an ingredient's child rows beside it, in its `withAudit`: its folk
 * names, substitutes, deities, references, categories and forms, in that
 * order, each form with its own substitutes, references and categories.
 * `'add'` is a new row's, which holds nothing yet, so nothing is read first;
 * `'replace'` brings each list to exactly the input's, as each `replace…`
 * below says. The one child write both tiers' create and update make, so the
 * compendium's and a coven's cannot write different children: a seventh child
 * table is its writers here, a line in each branch, and its list in
 * `splitChildren` and `IngredientChildren`, and neither service is edited.
 *
 * @throws {ValidationError} a substitute link or a reference the tier rule
 * forbids, a form the ingredient already holds, or a substitute's form not of
 * the ingredient it links, pathed to its entry.
 */
export async function writeChildren(
  write: AuditWriter,
  memberships: readonly Membership[],
  ingredientId: string,
  children: IngredientChildren,
  mode: 'add' | 'replace',
): Promise<void> {
  const folkNames = children.folkNames ?? [];
  const substitutes = children.substitutes ?? [];
  const references = children.references ?? [];
  const categoryIds = children.categoryIds ?? [];
  const variants = children.variants ?? [];
  // The ingredient's own rows, beside its forms' (MB.217).
  const parent: ChildOwner = { ingredientId, variantId: null, at: [] };

  if (mode === 'add') {
    await addFolkNames(write, ingredientId, folkNames);
    await addSubstitutes(write, memberships, parent, substitutes);
    await replaceDeities(write, ingredientId, children.deities, []);
    await addReferenceLinks(write, memberships, parent, references);
    await addCategories(write, parent, categoryIds);
    await addVariants(write, memberships, ingredientId, variants);
    return;
  }
  await replaceFolkNames(write, memberships, ingredientId, folkNames);
  await replaceSubstitutes(write, memberships, parent, substitutes);
  await replaceDeities(write, ingredientId, children.deities, children.heldDeities ?? []);
  await replaceReferenceLinks(write, memberships, parent, references);
  await replaceCategories(write, memberships, parent, categoryIds);
  await replaceVariants(write, memberships, ingredientId, variants);
}

/**
 * Soft-deletes one ingredient through `remove`, its tier's writer, stamping
 * who deleted it. Its children stay, so a spell holding it still reaches them
 * (claude-docs/db/spell-visibility.md, "What a spell holds").
 *
 * @throws {NotFound} `missing`, when `remove` finds no live row — and before
 * the write when `id` is not a uuid, which names nothing and would be a
 * driver error at the comparison.
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

/**
 * The live deity rows an ingredient holds, which a save keeps where it lists
 * them again. `memberships` is the tier the parent is read in, as
 * `findManyOfIngredients` takes it: none for a compendium entry.
 */
export function heldDeities(
  memberships: readonly Membership[],
  ingredientId: string,
): Promise<DeityRecord[]> {
  return findManyOfIngredients(memberships, ingredientDeities, [ingredientId]);
}

/**
 * The input's picks checked against the vocabularies, and its forms and
 * deities as they are written (DESIGN.md §5; MB.167). Read before the write,
 * on another connection, as MB.162's check is: an admin retiring a row at the
 * instant a member picks it can see the pick written.
 *
 * The forms are `variants` (MB.219), each held to the rule one form was held
 * to: a `formId` must name a curated form — live, under a live group — and
 * the text beside it fold to that form's name, written in its spelling; on
 * the compendium every form must be such a pick. A form's pick is a column,
 * so one sent without its id is kept as its text. With no list sent, the
 * top-level `form` and `formId` are the one form, its issues on those two
 * fields as before (the shim MB.222 removes).
 *
 * A deity picked anew must name a curated deity, its name written in that
 * deity's spelling. A pick the ingredient already `held` is kept on a coven's
 * ingredient once its deity is retired, under the name it was saved with,
 * and so is the typed name a member sends back for it, having read it as one,
 * as MB.138 keeps a substitute's link. Every deity on a compendium entry must
 * be a curated pick, held or not, since the compendium holds curated values
 * alone (MB.162).
 *
 * Each category, the ingredient's and each form's, must name a live one, in
 * either tier and held or not, and one named twice is filed once (MB.125).
 *
 * The fields come back with `form` and `formId` the first form's, as written,
 * so the row's columns mirror a variant until MB.222 (the dual write).
 *
 * @returns the fields; the lists `writeChildren` takes that were checked here
 * — the categories each once, each deity to write in order, and the forms —
 * and every issue found, each pathed to the entry the caller sent, for the
 * caller to throw beside its own.
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
  const variants: PickedVariant[] = picked.variants
    ? picked.variants.map((variant, index) => asPicked(variant, ['variants', index]))
    : formAsVariant(fields);
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

  const [first] = resolved;
  return {
    fields: { ...fields, categoryIds, form: first?.form ?? null, formId: first?.formId ?? null },
    children: {
      categoryIds,
      deities: pickedDeities.filter((entry) => entry !== undefined),
      variants: resolved,
    },
    issues,
  };
}

/**
 * One form as the input sent it, at `at`, with each `""` and `[]` the
 * whole-row input type sends for none read as the none the row holds.
 */
function asPicked(variant: VariantEntry, at: IssuePath): PickedVariant {
  const listOrNone = <T>(list: T[]) => (list.length > 0 ? list : null);
  return {
    ...variant,
    id: variant.id ?? null,
    formId: variant.formId || null,
    description: variant.description || null,
    safetyNotes: variant.safetyNotes || null,
    elements: listOrNone(variant.elements),
    planets: listOrNone(variant.planets),
    zodiacSigns: listOrNone(variant.zodiacSigns),
    colors: listOrNone(variant.colors),
    at,
  };
}

/**
 * The one form the top-level `form` and `formId` stand for when an input
 * sends no `variants` (MB.219's shim, until MB.222): none when there is no
 * form, so a stub saves bare. At `[]`, so its issues land on `form` and
 * `formId`, the fields the caller sent.
 */
function formAsVariant(fields: IngredientFields): PickedVariant[] {
  if (fields.form == null) return [];
  return [
    {
      id: null,
      form: fields.form,
      formId: fields.formId ?? null,
      description: null,
      safetyNotes: null,
      elements: null,
      planets: null,
      zodiacSigns: null,
      colors: null,
      categoryIds: [],
      substitutes: [],
      references: [],
      at: [],
    },
  ];
}

/**
 * One form's text as it is written, its pick checked against `forms`, the
 * curated names by id: a pick's text folds to the pick's name and takes its
 * spelling; on the compendium a form must be picked. A refusal is pushed onto
 * `issues` beneath the form's `at`, and the text is kept as sent.
 */
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
 * Brings the live deity rows to exactly `deities`, in order (DESIGN.md §5,
 * `ingredient_deities`): a pick is matched by the deity it links and a name
 * as written, so an entry still listed keeps its row and takes its new
 * `position`, one dropped is soft-deleted, and a new one is inserted. Dropped
 * rows go first, so a name re-added in another case clears the case-folded
 * index. `ingredient_deities_position_unique` is checked per row, so the rows
 * that move go through a scratch offset above every live position, then to
 * their own, as a spell's layers do (claude-docs/db/grimoire.md) — never a
 * tombstone and re-add. A kept pick takes its curated row's spelling now, if
 * it was renamed since. A list that changes nothing writes nothing.
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

/**
 * The live rows `owner` holds of a child table that names a form (MB.217):
 * the ingredient's own, which `findManyOfIngredients` keeps to those naming
 * no form, or one form's, read beneath the form (MB.218). Either is read under
 * `memberships`, the tier the parent is read in: none for a compendium entry.
 */
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

/**
 * Brings the owner's categories to exactly `categoryIds` (MB.125): a pair
 * still listed is left as it is, its stamps the first filer's; one dropped is
 * hard-deleted, as a chip toggled off leaves no row (MB.34); a new one is
 * inserted, stamped from the session; and a set that changes nothing writes
 * nothing. The pairs compared are the ones the owner shows, as
 * `replaceReferenceLinks` compares links, so a pair whose category is
 * soft-deleted is left in place for a restore to return. A form's pairs carry
 * its ingredient too, so the delete names the owner's variant, null for the
 * ingredient's own, and neither touches the other's (MB.217). `memberships` is the tier the parent
 * is read in, as `findManyOfIngredients` takes it: none for a compendium entry.
 */
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

/**
 * Brings the live folk names to exactly `names`, compared as written: a change
 * of case is a new name. Dropped rows go first, so a name re-added in another
 * case clears the case-folded unique index. `memberships` is the tier the
 * parent is read in, as `findManyOfIngredients` takes it: none for a
 * compendium entry.
 */
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
 * Writes a new owner's substitutes, each new link held to `refuseUnlinkable`.
 * `memberships` is the tier the ingredient is written in: none for a
 * compendium entry.
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
 * Brings the owner's live substitutes to exactly `entries`, as
 * `replaceFolkNames` brings folk names (DESIGN.md §5, `ingredient_substitutes`):
 * a link is matched by the ingredient it links and a name as written, so an
 * entry still listed keeps its row, and takes the linked form sent; one
 * dropped is soft-deleted, a new one is inserted, and a list that changes
 * nothing writes nothing. A link already held is kept whether or not its
 * ingredient is deleted; a new one, or a new form on a held one, is held to
 * `refuseUnlinkable`. The ingredient's own list and each form's are kept
 * apart (MB.217). `memberships` is the tier the parent is read in, as
 * `findManyOfIngredients` takes it: none for a compendium entry.
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

/**
 * The diff both writes share. Dropped rows go first, so a name re-added in
 * another case clears the case-folded unique index.
 */
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
  for (const { ingredientId: substituteId, substituteVariantId = null, name } of entries) {
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
 * Refuses each new link the tier rule forbids (DESIGN.md §5, "A substitute
 * links only what its ingredient's readers may read"): the linked id must be
 * a live ingredient the writer's own scope reads — the compendium, and the
 * proof's coven for a coven write — and not the owner itself, the same
 * ingredient and the same form, while a sibling form may stand in (MB.217).
 * A form a link names, new or changed, must be a live form of the ingredient
 * it links (MB.219), read in the same scope. An id that names nothing reads
 * as one in another coven does, since that coven's contents are private. A
 * link already `held` with the form it had is not checked again.
 *
 * @throws {ValidationError} one issue per refused entry, pathed to it, or to
 * its `substituteVariantId` when the form is what is refused.
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
 * `memberships` is the tier the ingredient is written in: none for a
 * compendium entry.
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
 * Brings the owner's references to exactly `entries`, as
 * `replaceSubstitutes` brings substitutes (DESIGN.md §5, `reference_links`):
 * a link is matched by the reference it cites, so one still listed keeps its
 * row and takes the locator sent, one dropped is soft-deleted, a new one is
 * inserted, and a list that changes nothing writes nothing. The links compared
 * are the ones the owner shows, so a link to a soft-deleted reference is
 * left in place for a restore to return. A new one is held to
 * `refuseUncitable`; one already held is not checked again. A form's links
 * name it alone, through `ingredient_variant_id` (MB.217).
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
 * Refuses each new reference the tier rule forbids (DESIGN.md §5, "A link
 * names only what its row's readers may read"): the id must be a live
 * reference the writer's own scope reads — the compendium's, and the proof's
 * coven's for a coven write. An id naming nothing reads as one in another
 * coven does, since that coven's contents are private. One read for the list.
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
 * Writes a new ingredient's forms (MB.219), each with its own substitutes,
 * references and categories, in the order sent.
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
 * Brings the ingredient's live forms to exactly `variants` (DESIGN.md §5,
 * "Variants are written inside the ingredient's save"; MB.219). An entry
 * keeps the row its `id` names when the ingredient holds it, and otherwise
 * the row its form folds to, `lower(btrim(form))` as the unique index folds
 * it, so a form can be respelt in place under its id. A row no entry keeps is
 * soft-deleted, its children left for a restore; a kept row is rewritten only
 * where it differs, then its children are brought to the entry's; a new one
 * is inserted with its children. An id the ingredient does not hold is not a
 * row to write, so it falls back to the form. Dropped rows go first, then the
 * kept, then the new, so a form handed from one row to another clears the
 * unique index before it is taken. `memberships` is the tier the parent is
 * read in: none for a compendium entry.
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
function foldForm(form: string): string {
  return form.trim().toLowerCase();
}

/**
 * Inserts `variant` as a form of the ingredient, or rewrites `row` with it
 * where any column differs, so a form saved unchanged is not written. Answers
 * the row's id.
 *
 * @throws {ValidationError} the ingredient already holds another live form
 * folding alike — `ingredient_variants_form_unique`, which the schema's own
 * repeat rule leaves to a concurrent save, or a form handed between two kept
 * rows in one save — on that entry's `form`. Mapped here rather than in
 * the services' `refuseCollision`, since only this write knows which entry
 * it was writing.
 */
async function writeVariant(
  write: AuditWriter,
  ingredientId: string,
  variant: PickedVariant,
  row?: VariantRecord,
): Promise<string> {
  const { form, formId, description, safetyNotes, elements, planets, zodiacSigns, colors } =
    variant;
  const columns = {
    form,
    formId,
    description,
    safetyNotes,
    elements,
    planets,
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
  const differs = (Object.keys(columns) as (keyof typeof columns)[]).some(
    (key) => JSON.stringify(columns[key]) !== JSON.stringify(row[key]),
  );
  if (differs) await write.updateById(ingredientVariants, row.id, columns).catch(refuse);
  return row.id;
}
