import { entryRecency } from '@/lib/entry-recency';
import type { IngredientDetail, IngredientRow } from '@/modules/ingredients';
import { applyCupboardEntry, isAnnotated } from '@/modules/ingredients/validation/cupboard-merge';
import type { ModalHeading } from '../Modal/types';
import FormalName from './formal-name';
import { reviewedAtOf } from './review-date';
import type { DetailsMarks } from './types';

// The details modal an ingredient's name opens over a list (M12.5): the
// summary of its entry page, with a link through to the page. Plain values
// and a plain function, so the server page that renders the modal and the
// client link that opens it at once build the same head.

/**
 * The list's modal place the details modal shows in (`RouteModalProps.place`),
 * apart from the edit modal's, which an Edit in the details opens over it.
 */
export const DETAILS_PLACE = 'details';

/**
 * The details modal's head: the entry's name, and over it the formal name the entry page draws
 * over its own heading, with its tip and its states (the owner's call, 2026-10-20). There is no
 * eyebrow: the formal name takes its place, so the dialog is named by the entry's name alone.
 */
export const detailsHeading = (
  entry: Pick<IngredientRow, 'name' | 'canonicalName' | 'nomenclature'>,
): ModalHeading => ({
  title: entry.name,
  formalName: <FormalName entry={entry} />,
});

/**
 * The head's marks, worked out as the entry page works its own out, so the two
 * cannot differ: whose entry it is, whether the viewing coven holds it, annotated
 * or retired, New or Updated off the compendium entry's stamps, and what the safety
 * badge reads. `inCoven` is true on a coven's list, where Compendium tells a
 * compendium entry from the coven's own.
 */
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
