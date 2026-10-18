import 'server-only';
import type { IngredientRow, AuditWriter, VariantRow } from '../../../db/repository';
import { ingredientVariants } from '../schema/ingredient-variants';
import { foldForm } from './ingredient-rows';
import type { Membership } from '@/modules/coven';

// The helpers the `createStock` redirect uses when a form of a hidden
// compendium entry is asked for: the coven's own form of it, and which of the
// coven's entries it goes to. The save-time jar follow that once lived here is
// gone (M12.27); the redirect goes in M12.28.

/**
 * The local's live form of `source`'s folded name, made from `source` if it
 * has none: the form `createStock` stores a jar on when the compendium form it
 * was asked for is hidden.
 */
export async function localFormFor(
  write: AuditWriter,
  membership: Membership,
  local: IngredientRow,
  source: VariantRow,
): Promise<VariantRow> {
  const wanted = foldForm(source.form);
  const forms = await write.lockLiveVariants(membership, local.id);
  return (
    forms.find((form) => foldForm(form.form) === wanted) ??
    (await createLocalForm(write, local.id, source))
  );
}

/**
 * Of the coven's ingredients that hide the entry, the one a jar goes to: the
 * one sharing the entry's identity, else the oldest. Both unique indexes
 * allow at most two (one by identity, one by label), so the age rule only
 * keeps the answer defined should a third way to hide ever be added.
 */
export function chooseHidingLocal(
  locals: readonly IngredientRow[],
  entry: Pick<IngredientRow, 'identityKey'>,
): IngredientRow | undefined {
  return [...locals].sort(
    (a, b) =>
      Number(b.identityKey === entry.identityKey) - Number(a.identityKey === entry.identityKey) ||
      a.createdAt.getTime() - b.createdAt.getTime() ||
      a.id.localeCompare(b.id),
  )[0];
}

/**
 * A new form of the local carrying the facts the compendium form holds of
 * itself, and nothing a child table keeps: its references, substitutes and
 * categories are the compendium's to cite and the coven's to add.
 */
async function createLocalForm(
  write: AuditWriter,
  ingredientId: string,
  source: VariantRow,
): Promise<VariantRow> {
  const [form] = await write.insert(ingredientVariants, {
    ingredientId,
    form: source.form,
    formId: source.formId,
    description: source.description,
    safetyNotes: source.safetyNotes,
    toxic: source.toxic,
    elements: source.elements,
    celestialBodies: source.celestialBodies,
    zodiacSigns: source.zodiacSigns,
    colors: source.colors,
  });
  return form;
}
