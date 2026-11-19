'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react';
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

/** Lends the region a place to stand; the returned function takes it back. */
type ClaimSlot = (slot: HTMLElement) => () => void;
const SlotContext = createContext<ClaimSlot>(() => () => undefined);

interface Said {
  text: string;
  count: number;
}

export function StatusRegionProvider({ children }: { children: ReactNode }): ReactElement {
  const [said, setSaid] = useState<Said>({ text: '', count: 0 });
  const home = useRef<HTMLSpanElement>(null);
  const region = useRef<HTMLOutputElement>(null);
  const slots = useRef<HTMLElement[]>([]);

  // The same sentence twice is the same text node to a screen reader, which then says nothing,
  // so `repeatable` alternates a trailing no-break space on each repeat.
  const announce = useCallback<Announce>((text) => {
    setSaid((last) => ({ text, count: last.text === text ? last.count + 1 : 1 }));
  }, []);

  // The one element is moved, never redrawn: a new `<output>` that arrives already holding its sentence may never be
  // read, and a portal given a new target mounts a new element. A slot's cleanup runs before React removes its dialog,
  // so the region is out of it first.
  const claim = useCallback<ClaimSlot>((slot) => {
    const place = () => {
      const target = slots.current[slots.current.length - 1] ?? home.current;
      const node = region.current;
      if (target && node && node.parentNode !== target) target.appendChild(node);
    };
    slots.current = [...slots.current, slot];
    place();
    return () => {
      slots.current = slots.current.filter((each) => each !== slot);
      place();
    };
  }, []);

  return (
    <StatusRegionContext.Provider value={announce}>
      <SlotContext.Provider value={claim}>
        {/* The region's parent as React knows it, which never moves, so React never looks for the region elsewhere. */}
        <span ref={home}>
          <output ref={region} className="visually-hidden">
            {repeatable(said.text, said.count)}
          </output>
        </span>
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
