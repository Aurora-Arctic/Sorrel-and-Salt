'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { repeatable } from '@/lib/repeat-announcement';
import type { Announce } from './types';

// The page's one polite status region, an `<output>` mounted with the page so a screen reader is
// already listening when the first sentence arrives. Controls speak through `announce`
// (claude-docs/components/click-feedback.md, "Contracts").

const NOTHING: Announce = () => undefined;

// Without a provider, `announce` does nothing rather than throw: a component
// drawn alone in a test or a story still works, and says nothing.
const StatusRegionContext = createContext<Announce>(NOTHING);

interface Said {
  text: string;
  count: number;
}

export function StatusRegionProvider({ children }: { children: ReactNode }): ReactElement {
  const [said, setSaid] = useState<Said>({ text: '', count: 0 });

  // The same sentence twice is the same text node to a screen reader, which then says nothing,
  // so `repeatable` alternates a trailing no-break space on each repeat.
  const announce = useCallback<Announce>((text) => {
    setSaid((last) => ({ text, count: last.text === text ? last.count + 1 : 1 }));
  }, []);

  return (
    <StatusRegionContext.Provider value={announce}>
      <output className="visually-hidden">{repeatable(said.text, said.count)}</output>
      {children}
    </StatusRegionContext.Provider>
  );
}

export function useAnnounce(): Announce {
  return useContext(StatusRegionContext);
}
