import { createContext, useContext } from 'react';

// The place in a modal's header where its contents may put a control of their own: the ingredient
// form's Open All / Close All. The modal hands the element down and the contents portal into it
// (claude-docs/components/modal.md, "A control in the header"). Null outside a modal.
export const HeaderSlotContext = createContext<HTMLElement | null>(null);

/** The element in the modal's header, or null where there is none. */
export const useModalHeaderSlot = (): HTMLElement | null => useContext(HeaderSlotContext);

// A line under the title, above that row, where the contents may put a sentence about the whole
// dialog: the compendium edit's notice. A slot of its own, since the row never wraps. Null outside
// a modal, as the row's is.
export const HeaderNoteContext = createContext<HTMLElement | null>(null);

/** The line under the modal's title, or null where there is none. */
export const useModalHeaderNote = (): HTMLElement | null => useContext(HeaderNoteContext);
