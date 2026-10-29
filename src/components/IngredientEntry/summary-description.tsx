'use client';

import { useId, useLayoutEffect, useRef, useState, type ReactElement } from 'react';

// The details modal's description (M12.5): the page's own paragraph, cut to its
// first six lines, up from four, with Show More opening the rest in place (the owner's
// calls, 2026-10-20; claude-docs/components/ingredient-entry.md, "The details modal").
// The cut is the script's: without JavaScript there is no clip and the whole
// text shows, and the toggle shows only when the text overflows six lines, so
// a short description stands whole with no button. Not a `<details>`: its
// summary would stand above the text, where this bar follows the lines it opens.
//
// A clip box round the paragraph holds the cut. Its height is set in pixels, from
// six of the paragraph's own line heights, and moves to the text's full height
// and back on a transition (summary.scss), because `auto` cannot be animated and
// the grid-rows trick cannot stop short of the whole text. It is let go to
// `auto` once open, so the text reflows freely. The bar is the one button the
// whole way, so a press leaves the focus where it was.

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
          <svg
            className="ingredient-summary__more-chevron"
            viewBox="0 0 16 16"
            width="1em"
            height="1em"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M3.5 6l4.5 4.5L12.5 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
