import type { ModalHeading } from '../Modal/types';

/**
 * The Link dialog's title (M8.17). A constant for the reason Annotate's head
 * is one: the Edit, Annotate and Link dialogs share a page's one
 * press-to-open skeleton, and each draws it only for its own title.
 */
export const LINK_HEADING_TITLE = 'Link to the Compendium';

/** The Link dialog's head: the title, under the entry's name. */
export const linkHeading = (name?: string): ModalHeading => ({
  title: LINK_HEADING_TITLE,
  ...(name !== undefined && { eyebrow: name }),
});
