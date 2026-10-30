'use client';

import { useId, useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import { ChevronIcon } from '../IconTip/icons';

// The details modal's description: the page's paragraph cut to its first six lines, Show More
// opening the rest in place. The cut is the script's, so without JavaScript the whole text shows
// (claude-docs/components/ingredient-entry.md, "Structure").

const LINES = 6;

/** One line of the paragraph, in pixels: the computed `line-height`, or a guess from its size. */
function lineHeightOf(element: HTMLElement): number {
  const style = getComputedStyle(element);
  return parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.65 || 0;
}

/** Whether the element moves on a transition: not under reduced motion, which sets none. */
function transitions(element: HTMLElement): boolean {
  return parseFloat(getComputedStyle(element).transitionDuration) > 0;
}

export default function SummaryDescription({ text }: { text: string }): ReactElement {
  const id = useId();
  const clip = useRef<HTMLDivElement>(null);
  const paragraph = useRef<HTMLParagraphElement>(null);
  const [mounted, setMounted] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const [open, setOpen] = useState(false);

  // Measured before paint, so the bar and the cut arrive together.
  useLayoutEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- the state follows an outside value (a timer, a measurement or a focus request), so it can only be set from an effect
    setMounted(true);
  }, []);
  useLayoutEffect(() => {
    const box = clip.current;
    const element = paragraph.current;
    if (!mounted || open || !box || !element) return;
    const cutHeight = lineHeightOf(element) * LINES;
    const tooLong = element.scrollHeight > cutHeight + 1;
    setOverflows(tooLong);
    box.style.height = tooLong ? `${cutHeight}px` : '';
  }, [mounted, open, text]);

  function toggle(): void {
    const box = clip.current;
    const element = paragraph.current;
    if (box && element) {
      if (open) {
        // From where it stands (`auto` or mid-opening) to a pixel height, which
        // must be laid out before the cut height is set for it to move.
        box.style.height = `${box.offsetHeight}px`;
        void box.offsetHeight;
        box.style.height = `${lineHeightOf(element) * LINES}px`;
      } else {
        box.style.height = `${box.scrollHeight}px`;
        // Nothing moves where there is no transition, so nothing would end it.
        if (!transitions(box)) box.style.height = '';
      }
    }
    setOpen(!open);
  }

  const cut = overflows && !open;
  return (
    <div
      className={
        cut
          ? 'ingredient-summary__description ingredient-summary__description--cut'
          : 'ingredient-summary__description'
      }
    >
      <div
        ref={clip}
        className="ingredient-summary__description-clip"
        onTransitionEnd={(event) => {
          // Once open the box no longer holds the height, so the text can reflow.
          if (open && event.target === event.currentTarget && event.propertyName === 'height') {
            event.currentTarget.style.height = '';
          }
        }}
      >
        <p ref={paragraph} id={id} className="ingredient-entry__description">
          {text}
        </p>
      </div>
      {(overflows || open) && (
        <button
          type="button"
          className="ingredient-summary__more"
          aria-expanded={open}
          aria-controls={id}
          onClick={toggle}
        >
          {open ? 'Show Less' : 'Show More'}
          <ChevronIcon className="ingredient-summary__more-chevron" textSized />
        </button>
      )}
    </div>
  );
}
