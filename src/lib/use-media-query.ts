import { useSyncExternalStore } from 'react';

// Whether a CSS media query matches, kept current as it changes. The server's snapshot is `false`, so a
// component that reads it draws the same markup on the server and on first client render, then updates.

// Wider than the phone (`$shell-phone-width`, 40rem; scss/_variables.scss): the one place the tablet band's
// edge is written in script.
export const TABLET_BAND = '(min-width: 40.01rem)';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (typeof window.matchMedia !== 'function') return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  );
}
