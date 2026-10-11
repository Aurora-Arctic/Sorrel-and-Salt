import { createContext, useContext } from 'react';

// The place beside a modal's title where its contents may put a control of
// their own: the ingredient form's Open All / Close All, the owner's call at
// MB.115. The modal draws the element and hands it down; the contents portal
// into it, since they sit inside the modal's render prop, out of its owner's
// reach (claude-docs/components/modal.md, "Beside the title"). Null outside a
// modal, or before the element is drawn: the contents then keep the control
// in their own flow.
export const HeaderSlotContext = createContext<HTMLElement | null>(null);

/** The element beside the modal's title, or null where there is none. */
export const useModalHeaderSlot = (): HTMLElement | null => useContext(HeaderSlotContext);
