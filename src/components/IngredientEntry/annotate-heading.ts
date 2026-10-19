import type { ModalHeading } from '../Modal/types';

/**
 * The Annotate dialog's head. It is a constant because two route modals share
 * this page's one press-to-open skeleton (the Edit dialog and this one), and
 * each draws that skeleton only for its own head.
 */
export const ANNOTATE_HEADING: ModalHeading = { title: 'Annotate This Entry' };
