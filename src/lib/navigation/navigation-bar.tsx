'use client';

import { type ReactElement, useEffect, useState } from 'react';
import './navigation-bar.scss';
import { BAR_FADE_MS, LOADING_DELAY_MS } from './timing';
import { useNavigationState } from './use-navigation';

type Phase = 'hidden' | 'shown' | 'leaving';

/**
 * The page part of every wait: a thin bar that appears once a navigation has
 * lasted 100ms, so a quick one never flashes it, and fades when it settles.
 * It is only a visual cue, so it is `aria-hidden`. The delay is a timer
 * rather than a CSS `animation-delay` because a timer can be cancelled by a
 * navigation that settles first. While fading it carries `hidden` as well as
 * `data-leaving`: the stylesheet keeps it drawn for the fade, and anything
 * reading `hidden` sees a bar that is on its way out.
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
