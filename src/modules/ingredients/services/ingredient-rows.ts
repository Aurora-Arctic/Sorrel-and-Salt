import 'server-only';
import {
  type AuditWriter,
  type ReferenceLinkRow,
  findManyByIds,
  findManyOfIngredients,
  findManyReferences,
  findOneIngredient,
  findReferencesOfIngredients,
} from '../../../db/repository';
import { ValidationError } from '../../../lib/errors';
import { ingredientCategories } from '../schema/ingredient-categories';
import { ingredientDeities } from '../schema/ingredient-deities';
import { ingredientFolkNames } from '../schema/ingredient-folk-names';
import { ingredientSubstitutes } from '../schema/ingredient-substitutes';
import { referenceLinks } from '../schema/reference-links';
import type { Membership } from '@/modules/coven';
import { curatedNames, foldVocabularyValue } from '@/modules/vocabulary';
import { categories } from '@/modules/vocabulary/schema/categories';
import type { ValidationIssue } from '../../../lib/types';
import type { DeityRecord, IngredientFields, PickedDeity, Tier } from '../types';
import type { DeityEntry, ReferenceLinkEntry, SubstituteEntry } from '../validation/types';

// What an ingredient write does the same way in either tier: the parsed
// input as columns, the picks it records checked against the vocabularies,
// and the folk names, substitutes, deities, references and categories written
// beside the row. Internal to the module — the two services import it, and the index
// does not.

/**
 * The parsed input as columns, every optional one written — `null` where the
 * input has nothing — so an update replaces the row rather than merging into it.
 */
export function columnsOf(fields: IngredientFields) {
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
  };
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
 * The input's picks checked against the vocabularies, and its form and
 * deities as they are written (DESIGN.md §5; MB.167). Read before the write,
 * on another connection, as MB.162's check is: an admin retiring a row at the
 * instant a member picks it can see the pick written.
 *
 * A `formId` must name a curated form — live, under a live group — and the
 * text beside it fold to that form's name, written in its spelling. A deity
 * picked anew must name a curated deity, its name written in that deity's
 * spelling. A pick the ingredient already `held` is kept on a coven's
 * ingredient once its deity is retired, under the name it was saved with,
 * and so is the typed name a member sends back for it, having read it as one,
 * as MB.138 keeps a substitute's link; a form's pick is a column, so one sent
 * without its id is cleared and its text kept. A compendium entry's form and
 * every deity must be a curated pick, held or not, since the compendium holds
 * curated values alone (MB.162).
 *
 * Each category must name a live one, in either tier and held or not, and
 * one named twice is filed once (MB.125).
 *
 * @returns the fields with the form resolved and the categories each once,
 * each deity to write in order, and every issue found, each pathed to the
 * entry the caller sent, for the caller to throw beside its own.
 */
export async function resolvePicks(
  tier: Tier,
  fields: IngredientFields,
  deities: readonly DeityEntry[],
  held: readonly DeityRecord[],
): Promise<{ fields: IngredientFields; deities: PickedDeity[]; issues: ValidationIssue[] }> {
  const heldLinks = held.flatMap((row) => (row.deityId === null ? [] : [row]));
  const categoryIds = [...new Set(fields.categoryIds ?? [])];
  const [forms, deityNames, filed] = await Promise.all([
    curatedNames('form', fields.formId == null ? [] : [fields.formId]),
    curatedNames('deities', [
      ...deities.flatMap((entry) => entry.deityId ?? []),
      ...heldLinks.map((row) => row.deityId as string),
    ]),
    findManyByIds(categories, categoryIds),
  ]);
  const issues: ValidationIssue[] = [];

  let form = fields.form;
  if (fields.formId != null) {
    const name = forms.get(fields.formId);
    if (name === undefined) {
      issues.push({ path: ['formId'], message: 'No such form to pick — choose one from the list' });
    } else if (form != null && foldVocabularyValue(form) !== foldVocabularyValue(name)) {
      issues.push({
        path: ['form'],
        message: `The form picked is "${name}" — pick another, or clear the pick to type one`,
      });
    } else {
      form = name;
    }
  } else if (tier === 'compendium' && form != null) {
    issues.push({
      path: ['form'],
      message: `Pick "${form}" from the form list — add it there first if it is missing`,
    });
  }

  // Picks first, so a typed name can claim only a retired pick no entry sent by id.
  const picked: (PickedDeity | undefined)[] = deities.map(() => undefined);
  const claimed = new Set<string>();
  deities.forEach((entry, index) => {
    if (entry.deityId === null) return;
    const name = deityNames.get(entry.deityId);
    const kept = heldLinks.find((row) => row.deityId === entry.deityId);
    if (name !== undefined) picked[index] = { deityId: entry.deityId, name };
    else if (kept && tier === 'coven') picked[index] = { deityId: entry.deityId, name: kept.name };
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
    picked[index] = { deityId: retired?.deityId ?? null, name: entry.name };
  });

  const live = new Set(filed.map((category) => category.id));
  (fields.categoryIds ?? []).forEach((id, index) => {
    if (live.has(id)) return;
    issues.push({
      path: ['categoryIds', index],
      message: 'No such category to file it under — choose one from the list',
    });
  });

  return {
    fields: { ...fields, form, categoryIds },
    deities: picked.filter((entry) => entry !== undefined),
    issues,
  };
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
export async function replaceDeities(
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

export async function addCategories(
  write: AuditWriter,
  ingredientId: string,
  categoryIds: readonly string[],
) {
  for (const categoryId of categoryIds) {
    await write.insert(ingredientCategories, { ingredientId, categoryId });
  }
}

/**
 * Brings the ingredient's categories to exactly `categoryIds` (MB.125): a
 * pair still listed is left as it is, its stamps the first filer's; one
 * dropped is hard-deleted, as a chip toggled off leaves no row (MB.34); a new
 * one is inserted, stamped from the session; and a set that changes nothing
 * writes nothing. The pairs compared are the ones the ingredient shows, as
 * `replaceReferenceLinks` compares links, so a pair whose category is
 * soft-deleted is left in place for a restore to return. `memberships` is
 * the tier the parent is read in, as `findManyOfIngredients` takes it: none
 * for a compendium entry.
 */
export async function replaceCategories(
  write: AuditWriter,
  memberships: readonly Membership[],
  ingredientId: string,
  categoryIds: readonly string[],
) {
  const held = (await findManyOfIngredients(memberships, ingredientCategories, [ingredientId])).map(
    (pair) => pair.categoryId,
  );
  const shown = new Set((await findManyByIds(categories, held)).map((category) => category.id));
  const listed = new Set(categoryIds);

  await write.delete(ingredientCategories, {
    ingredientId,
    categoryId: held.filter((id) => shown.has(id) && !listed.has(id)),
  });
  await addCategories(
    write,
    ingredientId,
    categoryIds.filter((id) => !held.includes(id)),
  );
}

export async function addFolkNames(
  write: AuditWriter,
  ingredientId: string,
  names: readonly string[],
) {
  for (const name of names) await write.insert(ingredientFolkNames, { ingredientId, name });
}

/**
 * Brings the live folk names to exactly `names`, compared as written: a change
 * of case is a new name. Dropped rows go first, so a name re-added in another
 * case clears the case-folded unique index. `memberships` is the tier the
 * parent is read in, as `findManyOfIngredients` takes it: none for a
 * compendium entry.
 */
export async function replaceFolkNames(
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
 * Writes a new ingredient's substitutes, each new link held to
 * `refuseUnlinkable`. `memberships` is the tier the ingredient is written in:
 * none for a compendium entry.
 *
 * @throws {ValidationError} a link the tier rule forbids, pathed to its entry.
 */
export async function addSubstitutes(
  write: AuditWriter,
  memberships: readonly Membership[],
  ingredientId: string,
  entries: readonly SubstituteEntry[],
) {
  await bringSubstitutesTo(write, memberships, ingredientId, entries, []);
}

/**
 * Brings the live substitutes to exactly `entries`, as `replaceFolkNames`
 * brings folk names (DESIGN.md §5, `ingredient_substitutes`): a link is
 * matched by the ingredient it links and a name as written, so an entry still
 * listed keeps its row, one dropped is soft-deleted, a new one is inserted, and
 * a list that changes nothing writes nothing. A link already held is kept
 * whether or not its ingredient is deleted; a new one is held to
 * `refuseUnlinkable`. `memberships` is the tier the parent is read in, as
 * `findManyOfIngredients` takes it: none for a compendium entry.
 *
 * @throws {ValidationError} a new link the tier rule forbids, pathed to its entry.
 */
export async function replaceSubstitutes(
  write: AuditWriter,
  memberships: readonly Membership[],
  ingredientId: string,
  entries: readonly SubstituteEntry[],
) {
  const current = await findManyOfIngredients(memberships, ingredientSubstitutes, [ingredientId]);
  await bringSubstitutesTo(write, memberships, ingredientId, entries, current);
}

/**
 * The diff both writes share. Dropped rows go first, so a name re-added in
 * another case clears the case-folded unique index.
 */
async function bringSubstitutesTo(
  write: AuditWriter,
  memberships: readonly Membership[],
  ingredientId: string,
  entries: readonly SubstituteEntry[],
  current: readonly (typeof ingredientSubstitutes.$inferSelect)[],
) {
  const listed = new Set(entries.map((entry) => keyOf(entry.ingredientId, entry.name)));
  const kept = new Set(current.map((row) => keyOf(row.substituteId, row.name)));

  await refuseUnlinkable(memberships, ingredientId, entries, kept);
  await write.softDeleteByIds(
    ingredientSubstitutes,
    current.filter((row) => !listed.has(keyOf(row.substituteId, row.name))).map((row) => row.id),
  );
  for (const { ingredientId: substituteId, name } of entries) {
    if (kept.has(keyOf(substituteId, name))) continue;
    await write.insert(ingredientSubstitutes, { ingredientId, substituteId, name });
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
 * proof's coven for a coven write — and not the ingredient itself. An id that
 * names nothing reads as one in another coven does, since that coven's
 * contents are private. A link already in `kept` is not checked again.
 *
 * @throws {ValidationError} one issue per refused entry, pathed to it.
 */
async function refuseUnlinkable(
  memberships: readonly Membership[],
  ingredientId: string,
  entries: readonly SubstituteEntry[],
  kept: ReadonlySet<string>,
): Promise<void> {
  const unlinkable =
    memberships.length === 0
      ? 'No compendium entry to link — a compendium entry’s substitute links only the compendium'
      : 'No ingredient to link — choose one from the compendium or this coven';
  const checks = entries.map(async (entry, index): Promise<ValidationIssue | undefined> => {
    if (entry.ingredientId === null || kept.has(keyOf(entry.ingredientId, null))) return undefined;
    const path = ['substitutes', index];
    if (entry.ingredientId === ingredientId) {
      return { path, message: 'An ingredient cannot be its own substitute' };
    }
    const target = await findOneIngredient(memberships, entry.ingredientId);
    return target ? undefined : { path, message: unlinkable };
  });
  const issues = (await Promise.all(checks)).filter((issue) => issue !== undefined);
  if (issues.length > 0) throw new ValidationError(issues);
}

/**
 * Writes a new ingredient's references, each held to `refuseUncitable`.
 * `memberships` is the tier the ingredient is written in: none for a
 * compendium entry.
 *
 * @throws {ValidationError} a reference the tier rule forbids, pathed to its entry.
 */
export async function addReferenceLinks(
  write: AuditWriter,
  memberships: readonly Membership[],
  ingredientId: string,
  entries: readonly ReferenceLinkEntry[],
) {
  await bringReferencesTo(write, memberships, ingredientId, entries, []);
}

/**
 * Brings the ingredient's references to exactly `entries`, as
 * `replaceSubstitutes` brings substitutes (DESIGN.md §5, `reference_links`):
 * a link is matched by the reference it cites, so one still listed keeps its
 * row and takes the locator sent, one dropped is soft-deleted, a new one is
 * inserted, and a list that changes nothing writes nothing. The links compared
 * are the ones the ingredient shows, so a link to a soft-deleted reference is
 * left in place for a restore to return. A new one is held to
 * `refuseUncitable`; one already held is not checked again.
 *
 * @throws {ValidationError} a new reference the tier rule forbids, pathed to its entry.
 */
export async function replaceReferenceLinks(
  write: AuditWriter,
  memberships: readonly Membership[],
  ingredientId: string,
  entries: readonly ReferenceLinkEntry[],
) {
  const current = await findReferencesOfIngredients(memberships, [ingredientId]);
  await bringReferencesTo(
    write,
    memberships,
    ingredientId,
    entries,
    current.map(({ link }) => link),
  );
}

/** The diff both writes share. */
async function bringReferencesTo(
  write: AuditWriter,
  memberships: readonly Membership[],
  ingredientId: string,
  entries: readonly ReferenceLinkEntry[],
  current: readonly ReferenceLinkRow[],
) {
  const held = new Map(current.map((link) => [link.referenceId, link]));
  const listed = new Set(entries.map((entry) => entry.referenceId));

  await refuseUncitable(memberships, entries, held);
  await write.softDeleteByIds(
    referenceLinks,
    current.filter((link) => !listed.has(link.referenceId)).map((link) => link.id),
  );
  for (const { referenceId, locator } of entries) {
    const link = held.get(referenceId);
    if (!link) await write.insert(referenceLinks, { referenceId, ingredientId, locator });
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
  entries: readonly ReferenceLinkEntry[],
  held: ReadonlyMap<string, ReferenceLinkRow>,
): Promise<void> {
  const unchecked = entries.filter((entry) => !held.has(entry.referenceId));
  const found = await findManyReferences(
    memberships,
    unchecked.map((entry) => entry.referenceId),
  );
  const citable = new Set(found.map((reference) => reference.id));
  const message =
    memberships.length === 0
      ? 'No compendium source to cite — a compendium entry cites only the compendium’s sources'
      : 'No source to cite — choose one from the compendium or this coven';

  const issues = entries.flatMap((entry, index): ValidationIssue[] =>
    held.has(entry.referenceId) || citable.has(entry.referenceId)
      ? []
      : [{ path: ['references', index], message }],
  );
  if (issues.length > 0) throw new ValidationError(issues);
}
