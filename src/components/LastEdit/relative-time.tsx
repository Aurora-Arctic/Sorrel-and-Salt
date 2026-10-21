'use client';

import type { ReactElement } from 'react';
import { useHydrated } from '@/lib/hydrated';
import { relativePhrase } from './relative';

// The relative phrase beside an absolute date. It depends on the reader's clock and
// time, which the server cannot know, so it draws nothing in the server's render and
// the render that hydrates it, and the phrase only afterwards (`useHydrated`): the
// HTML the server sent and the first client render never disagree.

export default function RelativeTime({ at }: { at: string }): ReactElement | null {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return <> ({relativePhrase(new Date(at))})</>;
}
