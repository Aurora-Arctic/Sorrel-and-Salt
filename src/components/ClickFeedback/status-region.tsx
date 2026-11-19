'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { repeatable } from '@/lib/repeat-announcement';
import type { Announce } from './types';

// The page's one polite status region, an `<output>` mounted with the page so a screen reader is
// already listening when the first sentence arrives. Controls speak through `announce`
// (claude-docs/components/click-feedback.md, "Contracts").

const NOTHING: Announce = () => undefined;

// Without a provider, `announce` does nothing rather than throw: a component
// drawn alone in a test or a story still works, and says nothing.
const StatusRegionContext = createContext<Announce>(NOTHING);

/** Lends the region a place to stand; the returned function takes it back. */
type ClaimSlot = (slot: HTMLElement) => () => void;
const SlotContext = createContext<ClaimSlot>(() => () => undefined);

interface Said {
  text: string;
  count: number;
}

export function StatusRegionProvider({ children }: { children: ReactNode }): ReactElement {
  const [said, setSaid] = useState<Said>({ text: '', count: 0 });
  const [slots, setSlots] = useState<HTMLElement[]>([]);

  // The same sentence twice is the same text node to a screen reader, which then says nothing,
  // so `repeatable` alternates a trailing no-break space on each repeat.
  const announce = useCallback<Announce>((text) => {
    setSaid((last) => ({ text, count: last.text === text ? last.count + 1 : 1 }));
  }, []);

  const claim = useCallback<ClaimSlot>((slot) => {
    setSlots((now) => [...now, slot]);
    return () => setSlots((now) => now.filter((each) => each !== slot));
  }, []);

  const region = <output className="visually-hidden">{repeatable(said.text, said.count)}</output>;
  const slot = slots[slots.length - 1];
  return (
    <StatusRegionContext.Provider value={announce}>
      <SlotContext.Provider value={claim}>
        {slot ? createPortal(region, slot) : region}
        {children}
      </SlotContext.Provider>
    </StatusRegionContext.Provider>
  );
}

export function useAnnounce(): Announce {
  return useContext(StatusRegionContext);
}

/**
 * Where the page's region stands while this is drawn: a modal dialog draws one, since `showModal()` makes the rest of
 * the page inert, a region in it too. The latest drawn wins, and the region goes back as each is taken away.
 */
export function StatusRegionSlot(): ReactElement {
  const claim = useContext(SlotContext);
  const ref = useRef<HTMLDivElement>(null);
  // Before paint, so the region is in the dialog before anything in it can speak.
  useLayoutEffect(() => (ref.current ? claim(ref.current) : undefined), [claim]);
  return <div ref={ref} />;
}
