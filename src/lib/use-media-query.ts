import { useEffect, useRef, useSyncExternalStore } from 'react';

// Whether a CSS media query matches, kept current as it changes. The server's snapshot is `false`, so a
// component that reads it draws the same markup on the server and on first client render, then updates.
// `onChange` runs on each change event itself, for a caller that acts on the crossing, not the value.

// Wider than the phone (`$shell-phone-width`, 40rem; scss/_variables.scss): the one place the tablet band's
// edge is written in script.
export const TABLET_BAND = '(min-width: 40.01rem)';

export function useMediaQuery(query: string, onChange?: () => void): boolean {
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  });
  return useSyncExternalStore(
    (notify) => {
      if (typeof window.matchMedia !== 'function') return () => undefined;
      const list = window.matchMedia(query);
      const heard = () => {
        notify();
        latest.current?.();
      };
      list.addEventListener('change', heard);
      return () => list.removeEventListener('change', heard);
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  );
}
