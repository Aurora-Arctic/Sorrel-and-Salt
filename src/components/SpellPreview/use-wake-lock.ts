import { useCallback, useEffect, useRef, useState } from 'react';

// 'idle': not asked for; 'held': the browser is keeping the screen on; 'dropped': the browser took the lock
// back (the tab was hidden) and it is asked for again on return; 'off': turned off by the person; 'asking':
// turned on again and not yet answered, so the sign stays and its eye can open; 'failed':
// the browser refused, so there is nothing to show.
type WakeLockStatus = 'idle' | 'held' | 'dropped' | 'off' | 'asking' | 'failed';

export type WakeLock = {
  // False where there is nothing to show: no API, a refused request, or the pane closed.
  shown: boolean;
  held: boolean;
  toggle: () => void;
};

// Keeps the screen on while `active` (the Screen Wake Lock API, past the browser floor on some engines, so
// a pure enhancement behind an `in` check). The browser drops the lock when the tab is hidden, so it is
// asked for again when the tab is visible, unless the person turned it off.
export function useWakeLock(active: boolean): WakeLock {
  const [status, setStatus] = useState<WakeLockStatus>('idle');
  const [wanted, setWanted] = useState(true);
  // A closed pane starts over: the next opening asks again, even after the sign was turned off.
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    setWasActive(active);
    if (!active) {
      setWanted(true);
      setStatus('idle');
    }
  }
  const lock = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || !wanted || typeof navigator === 'undefined' || !('wakeLock' in navigator))
      return;
    let cancelled = false;
    const acquire = (): void => {
      if (lock.current) return;
      navigator.wakeLock.request('screen').then(
        (sentinel) => {
          if (cancelled) {
            sentinel.release().catch(() => undefined);
            return;
          }
          lock.current = sentinel;
          setStatus('held');
          sentinel.addEventListener('release', () => {
            if (lock.current !== sentinel) return;
            lock.current = null;
            setStatus('dropped');
          });
        },
        () => {
          if (!cancelled) setStatus('failed');
        },
      );
    };
    const onVisible = (): void => {
      if (document.visibilityState !== 'hidden') acquire();
    };
    acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      const held = lock.current;
      lock.current = null;
      held?.release().catch(() => undefined);
    };
  }, [active, wanted]);

  const toggle = useCallback((): void => {
    setWanted((was) => !was);
    setStatus((was) => (was === 'off' ? 'asking' : 'off'));
  }, []);

  return {
    shown: active && status !== 'idle' && status !== 'failed',
    held: status === 'held',
    toggle,
  };
}
