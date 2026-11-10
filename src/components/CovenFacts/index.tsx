'use client';

import { createContext, useContext, type ReactElement, type ReactNode } from 'react';
import { covenSlugOf } from '../../lib/coven-path';
import { useNavigationState } from '../../lib/navigation';
import type { CovenFacts } from './types';

// The coven layout hands its coven's name and the viewer's role down, so a skeleton drawn inside it
// can use the real words. A move to another coven reads none: the facts are the layout's coven's alone.
const Facts = createContext<CovenFacts | null>(null);

export function CovenFactsProvider({
  facts,
  children,
}: {
  facts: CovenFacts;
  children: ReactNode;
}): ReactElement {
  return <Facts.Provider value={facts}>{children}</Facts.Provider>;
}

/** The layout's coven facts when the navigation under way ends in that same coven, else `null`. */
export function useCovenFactsOfDestination(): CovenFacts | null {
  const facts = useContext(Facts);
  const { href } = useNavigationState();
  if (!facts || href === undefined) return null;
  return covenSlugOf(href.split(/[?#]/)[0] ?? href) === facts.slug ? facts : null;
}
