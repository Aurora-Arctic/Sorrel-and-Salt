import { editHeading } from '../CompendiumList/heading';
import { entryRecency } from '@/lib/entry-recency';
import type { IngredientDetail } from '@/modules/ingredients';
import { applyCupboardEntry, isAnnotated } from '@/modules/ingredients/validation/cupboard-merge';
import type { ModalHeading } from '../Modal/types';
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

/** The small line over the details modal's title. */
export const DETAILS_EYEBROW = 'Ingredient';

/**
 * The details modal's head: the entry's name, and its formal name on a line of its
 * own below it (the owner's call, 2026-10-20), as the list names it.
 */
export const detailsHeading = (entry: Parameters<typeof editHeading>[0]): ModalHeading => ({
  ...editHeading(entry, DETAILS_EYEBROW),
  qualifierBelow: true,
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
