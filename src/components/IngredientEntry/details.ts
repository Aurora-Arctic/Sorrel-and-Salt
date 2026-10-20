import { editHeading } from '../CompendiumList/heading';
import type { ModalHeading } from '../Modal/types';

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

/** The details modal's head: the entry's name and its formal name, as the list names it. */
export const detailsHeading = (entry: Parameters<typeof editHeading>[0]): ModalHeading =>
  editHeading(entry, DETAILS_EYEBROW);
