import { createContext } from 'react';
import type { CloseGuard, CloseGuardSlot } from './types';

// The slot a modal's contents put their close guard in, read by the modal
// before its Close button, Escape or a click outside closes it. A slot rather
// than a callback prop, since the form that knows whether anything would be
// lost sits inside the modal's render prop, out of its owner's reach
// (claude-docs/components/modal.md, "Unsaved changes"). Null outside a modal:
// a form there guards its own Cancel alone.
export const CloseGuardContext = createContext<CloseGuardSlot | null>(null);

/** An empty slot, for a modal to provide and consult. */
export function closeGuardSlot(): CloseGuardSlot {
  let current: CloseGuard | null = null;
  return {
    put: (guard) => {
      current = guard;
      return () => {
        if (current === guard) current = null;
      };
    },
    consult: (close) => current?.(close) ?? true,
  };
}
