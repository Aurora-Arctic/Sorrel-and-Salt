'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import type { LeaveGuard, LeaveGuardOptions, LeaveGuardSlot } from './types';

// A form's unsaved changes, kept from leaving the page: closing the tab or reloading raises the browser's own question, and an in-app navigation waits on the
// form's own. Back and Forward are held through the Navigation API where the browser has it (claude-docs/components/modal.md, "Unsaved changes").

export const LeaveGuardContext = createContext<LeaveGuardSlot | null>(null);

export function leaveGuardSlot(): LeaveGuardSlot {
  const guards = new Set<LeaveGuard>();
  return {
    put: (guard) => {
      guards.add(guard);
      return () => {
        guards.delete(guard);
      };
    },
    held: () => [...guards].some((guard) => guard.dirty()),
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

/** Marks the traversal a guard let go, so the hold does not ask about it again. */
const RELEASED = 'leave-guard-released';

/** An enhancement: a browser without the Navigation API keeps today's behaviour. Reads `event.cancelable` and lets anything else through. */
export function holdTraversals(slot: LeaveGuardSlot): () => void {
  const nav = 'navigation' in window ? window.navigation : undefined;
  if (!nav) return () => {};
  const onNavigate = (event: NavigateEvent) => {
    if (event.navigationType !== 'traverse' || !event.cancelable) return;
    if (event.info === RELEASED || !slot.held()) return;
    const key = event.destination?.key;
    if (key === undefined) return;
    event.preventDefault();
    slot.leave(() => {
      void nav.traverseTo(key, { info: RELEASED }).finished?.catch(() => undefined);
    });
  };
  nav.addEventListener('navigate', onNavigate);
  return () => nav.removeEventListener('navigate', onNavigate);
}

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
