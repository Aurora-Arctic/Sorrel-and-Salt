import type { NomenclatureKind } from '@/modules/ingredients/schema/ingredient-enums';
import type { ModalHeading } from '../Modal/types';

// An entry's edit dialog head, built in one place for the page (which opens
// the dialog from the address) and the client code that opens it before the
// page answers: a row's Edit link and the search box's pick (M9.18, M8.10).
// A plain function with no server-only import, so either side can call it.

/**
 * The nomenclatures whose formal name is a binomial, set in italics; a
 * mineral's or a chemical's is set upright (claude-docs/styling.md, "Type").
 */
const BINOMIAL_KINDS: ReadonlySet<string> = new Set<NomenclatureKind>([
  'botanical',
  'fungal',
  'zoological',
]);

/**
 * An entry's edit dialog head (MB.115): the name it was saved under, not the
 * Name field's, and its formal name after it, as the list's rows name it.
 * A missing formal name is `null`.
 */
export function editHeading({
  name,
  canonicalName,
  nomenclature,
}: {
  name: string;
  canonicalName: string | null;
  nomenclature: string;
}): ModalHeading {
  const formal = (canonicalName ?? '').trim();
  const set = BINOMIAL_KINDS.has(nomenclature) ? (
    <span className="binomial">{formal}</span>
  ) : (
    formal
  );
  return { eyebrow: 'Edit Ingredient', title: name, qualifier: formal ? set : undefined };
}
