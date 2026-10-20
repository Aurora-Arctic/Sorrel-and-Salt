'use client';

import { useId, useLayoutEffect, useRef, useState, type ReactElement } from 'react';

// The details modal's description (M12.5): the page's own paragraph, cut to its
// first three lines with Show More opening the rest in place (the owner's call,
// 2026-10-20; claude-docs/components/ingredient-entry.md, "The details modal").
// The cut is a class added once mounted, so without JavaScript the whole text
// shows; the toggle shows only when the cut text overflows, so a short
// description stands whole with no button. Not a `<details>`: its summary would
// stand above the text, where this button follows the lines it opens.

export default function SummaryDescription({ text }: { text: string }): ReactElement {
  const id = useId();
  const paragraph = useRef<HTMLParagraphElement>(null);
  const [mounted, setMounted] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const [open, setOpen] = useState(false);

  // Measured while cut, before paint, so the button and the cut arrive together.
  useLayoutEffect(() => {
    setMounted(true);
  }, []);
  useLayoutEffect(() => {
    const element = paragraph.current;
    if (!mounted || open || !element) return;
    setOverflows(element.scrollHeight > element.clientHeight);
  }, [mounted, open, text]);

  const cut = mounted && !open;
  return (
    <div className="ingredient-summary__description">
      <p
        ref={paragraph}
        id={id}
        className={
          cut
            ? 'ingredient-entry__description ingredient-summary__description-text--cut'
            : 'ingredient-entry__description'
        }
      >
        {text}
      </p>
      {(overflows || open) && (
        <button
          type="button"
          className="btn btn--quiet btn--small"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
        >
          {open ? 'Show Less' : 'Show More'}
        </button>
      )}
    </div>
  );
}
