import 'server-only';
import { Forbidden, NotFound } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { getCupboardEntry, heldCompendiumEntry, isRetired } from './cupboard-entries';
import {
  categoriesOf,
  categoriesOfVariants,
  deitiesOf,
  folkNamesOf,
  referencesOf,
  referencesOfVariants,
  substitutesOf,
  substitutesOfVariants,
  variantsOf,
} from './ingredient-children';
import {
  categoryGroupsOf,
  deityOtherNamesOf,
  deityTraditionsOf,
  formChoicesOf,
  formGroupsOf,
} from '@/modules/vocabulary';
import { type Membership, assertMembership } from '@/modules/coven';
import type {
  CategoryDetail,
  CupboardEntryRow,
  CategoryRow,
  DeityDetail,
  IngredientDetail,
  IngredientRow,
  SubstituteDetail,
  SubstituteRow,
  VariantDetail,
} from '../types';

// An ingredient as its page shows it: the one assembly both the public compendium page and a coven's own end in. Each child kind is read once
// for every ref that needs it, through the readers the GraphQL `Ingredient` uses. A coven entry's children answer `Forbidden` outside it; the compendium's answer anyone.

/** A batch answer for one ref, which a refusal turns into the error it is. */
function only<T>([answer]: readonly (T | Error)[]): T {
  if (answer === undefined || answer instanceof Error) throw answer ?? new Error('No answer');
  return answer;
}

/**
 * `entry` with everything its page lists beneath it: folk names, categories
 * with their groups, deities with their traditions, substitutes,
 * references, one detail per live form in form order, and the cupboard entry
 * of `workspaceId`, the coven the page is read in, when it holds this
 * compendium entry. No `workspaceId` is the public page, which
 * reads no cupboard. A compendium entry the curators have retired is read
 * only in a coven whose cupboard names it, and marked `retired`; its
 * children are read on that coven's proof.
 *
 * @throws {Forbidden} `entry` is a coven's and `session` is not in that coven,
 * or `session` is not in `workspaceId`.
 * @throws {NotFound} `entry` is retired and `workspaceId`'s cupboard does not
 * name it, or no coven is named.
 */
export async function ingredientDetailOf(
  session: Session | null,
  entry: IngredientRow,
  workspaceId?: string,
): Promise<IngredientDetail> {
  const refs = [{ id: entry.id, workspaceId: entry.workspaceId }];
  const retired = isRetired(entry);
  // A retired entry's cupboard entry is its proof of use, read first: every
  // child read below admits the entry only on it.
  const held = retired ? await retiredEntryHeld(session, entry, workspaceId) : undefined;
  const heldBy = held?.membership;
  // The cupboard read runs beside the children but is awaited after them: its
  // refusal is the quickest answer, and settling first would leave the
  // children's reads running behind a request that has already failed.
  const cupboard = held
    ? Promise.resolve(held.cupboardEntry)
    : cupboardEntryOf(session, entry, workspaceId);
  cupboard.catch(() => {});
  const [folkNames, categories, deities, substitutes, references, variants] = await Promise.all([
    folkNamesOf(session, refs, heldBy).then(only),
    categoriesOf(session, refs, heldBy).then(only),
    deitiesOf(session, refs, heldBy).then(only),
    substitutesOf(session, refs, heldBy).then(only),
    referencesOf(session, refs, heldBy).then(only),
    variantsOf(session, refs, heldBy).then(only),
  ]);
  const cupboardEntry = await cupboard;

  // Each form's own children, one batch over the forms.
  const variantRefs = variants.map(({ id, ingredientId, workspaceId }) => ({
    id,
    ingredientId,
    workspaceId,
  }));
  const picked = deities.flatMap(({ deity }) => deity ?? []);
  const [variantCategories, variantSubstitutes, variantReferences, traditions, otherNames, forms] =
    await Promise.all([
      categoriesOfVariants(session, variantRefs, heldBy).then((answers) =>
        answers.map((a) => only([a])),
      ),
      substitutesOfVariants(session, variantRefs, heldBy).then((answers) =>
        answers.map((a) => only([a])),
      ),
      referencesOfVariants(session, variantRefs, heldBy).then((answers) =>
        answers.map((a) => only([a])),
      ),
      deityTraditionsOf(picked.map((deity) => deity.traditionId)),
      deityOtherNamesOf(picked.map((deity) => deity.id)),
      formChoicesOf(variants.flatMap(({ formId }) => formId ?? [])),
    ]);

  // What the second batch names: the groups of every category and of every
  // curated form, and the forms of every ingredient a substitute links.
  const filed = [categories, ...variantCategories].flat();
  const live = forms.flatMap((form) => form ?? []);
  const linked = [
    ...new Map(
      [...substitutes, ...variantSubstitutes.flat()]
        .flatMap(({ ingredient }) => ingredient ?? [])
        .map((ingredient) => [ingredient.id, ingredient]),
    ).values(),
  ];
  const [categoryGroups, formGroups, linkedForms] = await Promise.all([
    categoryGroupsOf([...new Set(filed.map(({ groupId }) => groupId))]),
    formGroupsOf([...new Set(live.map(({ groupId }) => groupId))]),
    variantsOf(session, linked),
  ]);

  const groupOf = new Map(
    [...new Set(filed.map(({ groupId }) => groupId))].flatMap((id, i) => {
      const group = categoryGroups[i];
      // A group retired between the two reads: its category shows nowhere
      // rather than with a chip that has no colours.
      return group instanceof Error ? [] : [[id, group] as const];
    }),
  );
  const withGroup = (rows: readonly CategoryRow[]): CategoryDetail[] =>
    rows.flatMap((category) => {
      const group = groupOf.get(category.groupId);
      return group ? [{ category, group }] : [];
    });

  const traditionOf = new Map(picked.map((deity, i) => [deity.id, nameOf(traditions[i])]));
  const otherNamesOf = new Map(picked.map((deity, i) => [deity.id, otherNames[i]]));

  // A form's icon is its curated form's group's; an uncurated form has none,
  // and neither does one whose form or group has since been retired.
  const iconGroupOf = new Map(
    [...new Set(live.map(({ groupId }) => groupId))].flatMap((id, i) => {
      const group = formGroups[i];
      return group instanceof Error ? [] : [[id, group] as const];
    }),
  );
  const formOf = new Map(live.map((form) => [form.id, form]));

  // The name of the form a link names, read beneath the ingredient it links
  // and never by the form's id alone. A link the reader may not
  // follow shows no form.
  const formsOfLinked = new Map(
    linked.map(({ id }, i) => {
      const forms = linkedForms[i];
      return [id, forms instanceof Error ? [] : forms] as const;
    }),
  );
  const toSubstitute = ({ name, ingredient, variantId }: SubstituteRow): SubstituteDetail => ({
    name,
    ingredient: ingredient
      ? { id: ingredient.id, slug: ingredient.slug, workspaceId: ingredient.workspaceId }
      : null,
    form:
      (ingredient &&
        variantId &&
        formsOfLinked.get(ingredient.id)?.find((variant) => variant.id === variantId)?.form) ||
      null,
  });

  return {
    entry,
    retired,
    cupboardEntry,
    folkNames: folkNames.map(({ name }) => name),
    categories: withGroup(categories),
    deities: deities.map(({ name, deity }): DeityDetail => ({
      name,
      tradition: deity ? (traditionOf.get(deity.id) ?? null) : null,
      otherNames: deity ? (otherNamesOf.get(deity.id) ?? []) : [],
    })),
    substitutes: substitutes.map(toSubstitute),
    references,
    variants: variants.map((variant, i): VariantDetail => {
      const curated = variant.formId ? formOf.get(variant.formId) : undefined;
      return {
        variant,
        icon: (curated && iconGroupOf.get(curated.groupId)?.icon) || null,
        categories: withGroup(variantCategories[i]),
        substitutes: variantSubstitutes[i].map(toSubstitute),
        references: variantReferences[i],
      };
    }),
  };
}

/** The cupboard entry `workspaceId`'s page reads beside `entry`: none without a coven, and none for a coven's own entry. */
async function cupboardEntryOf(
  session: Session | null,
  entry: IngredientRow,
  workspaceId: string | undefined,
): Promise<CupboardEntryRow | null> {
  if (workspaceId === undefined || entry.workspaceId !== null) return null;
  if (!session) throw new Forbidden();
  return getCupboardEntry(session, workspaceId, entry.id);
}

/** The proof and cupboard entry by which `workspaceId` reads a retired compendium entry: none for the public page or a coven that does not name it, each a `NotFound`. */
async function retiredEntryHeld(
  session: Session | null,
  entry: IngredientRow,
  workspaceId: string | undefined,
): Promise<{ membership: Membership; cupboardEntry: CupboardEntryRow }> {
  if (workspaceId === undefined) throw new NotFound('No such ingredient');
  if (!session) throw new Forbidden();
  const membership = await assertMembership(session, workspaceId, { ingredient: ['read'] });
  const held = await heldCompendiumEntry(membership, entry.id);
  if (!held) throw new NotFound('No such ingredient');
  return { membership, cupboardEntry: held.cupboardEntry };
}

/** The name of a group or tradition, or null once it is gone. */
function nameOf(group: { name: string } | Error | undefined): string | null {
  return group === undefined || group instanceof Error ? null : group.name;
}
