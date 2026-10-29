import { entryRecency } from '@/lib/entry-recency';
import type { IngredientDetail, IngredientRow } from '@/modules/ingredients';
import { applyCupboardEntry, isAnnotated } from '@/modules/ingredients/validation/cupboard-merge';
import type { ModalHeading } from '../Modal/types';
import FormalName from './formal-name';
import { reviewedAtOf } from './review-date';
import type { DetailsMarks } from './types';

// The details modal an ingredient's name opens over a list: the summary of its entry page, with a
// link to the page. Plain values and a plain function, so the server page and the client link build
// the same head.

/** The list's modal place the details modal shows in (`RouteModalProps.place`), apart from the edit modal's that an Edit opens over it. */
export const DETAILS_PLACE = 'details';

/** The details modal's head: the entry's name, and over it the formal name with its tip and states; no eyebrow, so the entry's name alone names the dialog. */
export const detailsHeading = (
  entry: Pick<IngredientRow, 'name' | 'canonicalName' | 'nomenclature'>,
): ModalHeading => ({
  title: entry.name,
  formalName: <FormalName entry={entry} />,
});

/** The head's marks, worked out as the entry page works its own so the two cannot differ; `inCoven` is true on a coven's list, where Compendium tells a compendium entry from the coven's own. */
export function detailsMarks(detail: IngredientDetail, inCoven = false): DetailsMarks {
  const { entry, cupboardEntry, retired, variants } = detail;
  const local = entry.workspaceId !== null;
  const held = !local && cupboardEntry != null;
  return {
    kind: local ? 'own' : held ? 'cupboard' : 'compendium',
    inCoven,
    annotated: held && isAnnotated(cupboardEntry),
    retired,
    reviewedAt: reviewedAtOf(detail),
    recency: local ? null : entryRecency(entry.createdAt, entry.updatedAt),
    toxic: entry.toxic,
    safetyNotes: applyCupboardEntry(entry, cupboardEntry).safetyNotes,
    variants: variants.map(({ variant: { form, safetyNotes, toxic } }) => ({
      form,
      safetyNotes,
      toxic,
    })),
  };
}
