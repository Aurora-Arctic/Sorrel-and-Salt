'use client';

import { type ReactElement, useEffect, useState } from 'react';
import './navigation-bar.scss';
import { BAR_FADE_MS, LOADING_DELAY_MS } from './timing';
import { useNavigationState } from './use-navigation';

type Phase = 'hidden' | 'shown' | 'leaving';

/**
 * The page part of every wait: a thin `aria-hidden` bar that appears once a navigation has lasted 100ms and fades when it settles. A timer, not a CSS
 * `animation-delay`, so a navigation settling first cancels it. While fading it carries `hidden` and `data-leaving`: drawn for the fade, but on its way out to readers.
 */
export function NavigationBar(): ReactElement {
  const { busy } = useNavigationState();
  const [phase, setPhase] = useState<Phase>('hidden');

  useEffect(() => {
    if (busy) {
      const timer = setTimeout(() => setPhase('shown'), LOADING_DELAY_MS);
      return () => clearTimeout(timer);
    }
    // oxlint-disable-next-line react/set-state-in-effect -- the state follows an outside value (a timer, a measurement or a focus request), so it can only be set from an effect
    setPhase((current) => (current === 'shown' ? 'leaving' : 'hidden'));
  }, [busy]);

  useEffect(() => {
    if (phase !== 'leaving') return;
    const timer = setTimeout(() => setPhase('hidden'), BAR_FADE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  return (
    <div
      className="navigation-bar"
      aria-hidden="true"
      hidden={phase !== 'shown'}
      data-leaving={phase === 'leaving' ? '' : undefined}
    />
  );
}
