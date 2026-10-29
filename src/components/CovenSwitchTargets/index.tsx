'use client';

import { useEffect } from 'react';
import { useRegisterCovenSwitch } from './context';
import type { CovenSwitchTargetsProps } from './types';

/**
 * Renders nothing. Tells the coven switcher, while this page is shown, which of the
 * viewer's covens the page also opens in, so a switch can stay on it. The server page
 * works the slugs out per viewer; this only carries them to the layout's switcher.
 */
export default function CovenSwitchTargets({ path, slugs }: CovenSwitchTargetsProps): null {
  const register = useRegisterCovenSwitch();
  // A slug holds no space, and a joined string is a value, where a prop array is new on every
  // render.
  const joined = slugs.join(' ');
  useEffect(() => {
    register({ path, slugs: joined ? joined.split(' ') : [] });
    // Clears only its own: a page that mounted first and went later must not wipe its successor's.
    return () => register((current) => (current?.path === path ? null : current));
  }, [register, path, joined]);
  return null;
}
