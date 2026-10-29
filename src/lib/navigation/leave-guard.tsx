'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import type { LeaveGuard, LeaveGuardOptions, LeaveGuardSlot } from './types';

// A form's unsaved changes, kept from leaving the page: closing the tab or reloading raises the browser's own question, and an in-app navigation waits on the
// form's own. Back is not held, as the App Router cannot cancel a history move (claude-docs/components/modal.md, "Unsaved changes").

/** The provider's slot. Null outside it, where nothing holds a navigation. */
export const LeaveGuardContext = createContext<LeaveGuardSlot | null>(null);

/** A slot for the provider to own: the mounted guards, in the order they came. */
export function leaveGuardSlot(): LeaveGuardSlot {
  const guards = new Set<LeaveGuard>();
  return {
    put: (guard) => {
      guards.add(guard);
      return () => {
        guards.delete(guard);
      };
    },
    leave: (go) => {
      // One question at a time: the first form with changes asks, and its
      // yes goes, whatever the others hold.
      for (const guard of guards) {
        if (guard.dirty()) {
          guard.ask(go);
          return;
        }
      }
      go();
    },
  };
}

/**
 * Guards leaving the page while `dirty`. Closing the tab or reloading asks the
 * browser's question; an in-app navigation calls `ask` with the navigation,
 * held until `ask` calls it. `onHide` is called as the page is hidden.
 */
export function useLeaveGuard(
  dirty: boolean,
  ask: (proceed: () => void) => void,
  { onHide, holdNavigation = true }: LeaveGuardOptions = {},
): void {
  const slot = useContext(LeaveGuardContext);

  // The provider reads the guard when a navigation starts, which is after
  // this render: the latest one's, through a ref, so the slot is filled once.
  const latest = useRef({ dirty, ask, onHide });
  useEffect(() => {
    latest.current = { dirty, ask, onHide };
  });

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older browsers ask only when this is set as well.
      event.returnValue = true;
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const hides = onHide !== undefined;
  useEffect(() => {
    if (!hides) return;
    const hidden = () => {
      if (document.visibilityState === 'hidden') latest.current.onHide?.();
    };
    document.addEventListener('visibilitychange', hidden);
    return () => document.removeEventListener('visibilitychange', hidden);
  }, [hides]);

  useEffect(() => {
    if (!slot || !holdNavigation) return;
    return slot.put({
      dirty: () => latest.current.dirty,
      ask: (proceed) => latest.current.ask(proceed),
    });
  }, [slot, holdNavigation]);
}
