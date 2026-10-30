import { BINOMIAL_KINDS } from '@/modules/ingredients/schema/ingredient-enums';
import type { ModalHeading } from '../Modal/types';

// An entry's edit dialog head, built in one place for the page (which opens the dialog from the address)
// and for client code that opens it first: a plain function with no server-only import.

/**
 * An entry's edit dialog head: the name it was saved under, not the
 * Name field's, and its formal name after it, as the list's rows name it.
 * A missing formal name is `null`.
 */
export function editHeading(
  {
    name,
    canonicalName,
    nomenclature,
  }: {
    name: string;
    canonicalName: string | null;
    nomenclature: string;
  },
  eyebrow = 'Edit Ingredient',
): ModalHeading {
  const formal = (canonicalName ?? '').trim();
  const set = BINOMIAL_KINDS.has(nomenclature) ? (
    <span className="binomial">{formal}</span>
  ) : (
    formal
  );
  return { eyebrow, title: name, qualifier: formal ? set : undefined };
}
