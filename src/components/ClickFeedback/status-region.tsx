'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { Announce } from './types';

// The page's one polite status region: an `<output>`, whose role is `status`,
// mounted with the page so a screen reader is already listening to it when the
// first sentence arrives (a live region added with its text is often not
// read). A control says what its click did through `announce`, rather than
// each control keeping a region of its own (claude-docs/components/click-feedback.md,
// "The status region").

const NOTHING: Announce = () => undefined;

// Without a provider, `announce` does nothing rather than throw: a component
// drawn alone in a test or a story still works, and says nothing.
const StatusRegionContext = createContext<Announce>(NOTHING);

interface Said {
  text: string;
  /** Whether the text carries the trailing no-break space this time. */
  marked: boolean;
}

export function StatusRegionProvider({ children }: { children: ReactNode }): ReactElement {
  const [said, setSaid] = useState<Said>({ text: '', marked: false });

  // The same sentence twice is the same text node to a screen reader, which
  // then says nothing. Each repeat alternates a trailing no-break space, so the
  // text changes and is read, as discard.tsx's unsaved-changes line does.
  const announce = useCallback<Announce>((text) => {
    setSaid((last) => ({ text, marked: last.text === text ? !last.marked : false }));
  }, []);

  return (
    <StatusRegionContext.Provider value={announce}>
      <output className="visually-hidden">{said.text + (said.marked ? ' ' : '')}</output>
      {children}
    </StatusRegionContext.Provider>
  );
}

/** Says a sentence in the page's status region. */
export function useAnnounce(): Announce {
  return useContext(StatusRegionContext);
}
