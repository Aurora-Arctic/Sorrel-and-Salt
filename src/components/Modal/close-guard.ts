import { createContext } from 'react';
import type { CloseGuard, CloseGuardSlot } from './types';

// The slot a modal's contents put their close guard in, read before the Close button, Escape or a
// click outside closes it (claude-docs/components/modal.md, "Unsaved changes"). Null outside a
// modal: a form there guards its own Cancel alone.
export const CloseGuardContext = createContext<CloseGuardSlot | null>(null);

export function closeGuardSlot(): CloseGuardSlot {
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
