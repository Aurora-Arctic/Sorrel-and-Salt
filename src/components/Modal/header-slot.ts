import { createContext, useContext } from 'react';

// The place in a modal's header where its contents may put a control of
// their own: the ingredient form's Open All / Close All, the owner's call at
// MB.115. The modal draws the element and hands it down; the contents portal
// into it, since they sit inside the modal's render prop, out of its owner's
// reach (claude-docs/components/modal.md, "A control in the header"). Null
// outside a modal, or before the element is drawn: the contents then keep the
// control in their own flow.
export const HeaderSlotContext = createContext<HTMLElement | null>(null);

/** The element in the modal's header, or null where there is none. */
export const useModalHeaderSlot = (): HTMLElement | null => useContext(HeaderSlotContext);

// A line under the title, above that row, where the contents may put a
// sentence about the whole dialog: the compendium edit's notice, the owner's
// call of 2026-10-19 (M8.17). A slot of its own rather than the row's first
// child, since the row is a line of controls that never wraps. Null outside a
// modal, as the row's is, and the contents then keep the sentence in their
// flow.
export const HeaderNoteContext = createContext<HTMLElement | null>(null);

/** The line under the modal's title, or null where there is none. */
export const useModalHeaderNote = (): HTMLElement | null => useContext(HeaderNoteContext);
