import { createContext } from 'react';
import type { CloseGuard, CloseGuardSlot } from './types';

// The slot a modal's contents put their close guard in, read before the Close button, Escape or a
// click outside closes it (claude-docs/components/modal.md, "Unsaved changes"). Null outside a
// modal: a form there guards its own Cancel alone.
export const CloseGuardContext = createContext<CloseGuardSlot | null>(null);

/** An empty slot, for a modal to provide and consult. */
export function closeGuardSlot(): CloseGuardSlot {
  // Several forms in one modal each put a guard; the first that holds the close back asks.
  const guards = new Set<CloseGuard>();
  return {
    put: (guard) => {
      guards.add(guard);
      return () => {
        guards.delete(guard);
      };
    },
    consult: (close) => [...guards].every((guard) => guard(close)),
  };
}
