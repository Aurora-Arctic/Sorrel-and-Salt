import { BINOMIAL_KINDS } from '@/modules/ingredients/schema/ingredient-enums';
import type { ModalHeading } from '../Modal/types';

// A plain function with no server-only import, so client code that opens the dialog first can
// call it.
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
