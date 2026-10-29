'use client';

import { type ReactElement, useEffect, useRef } from 'react';

// Marks the search row `data-stuck` while it is stuck to the top, so its shadow can fade in, by a
// sentinel and an IntersectionObserver. A client child, so `IngredientSearch` stays a server
// component (claude-docs/components/ingredient-search.md).

const StuckMark = (): ReactElement => {
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mark = sentinel.current;
    const row = mark?.parentElement?.querySelector(':scope > search');
    // Past the browser floor, a pure enhancement: without the observer the row has no shadow.
    if (!mark || !row || !('IntersectionObserver' in window)) return;

    const top = Number.parseFloat(getComputedStyle(row).top) || 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const stuck = !entry.isIntersecting && entry.boundingClientRect.top < top;
        if (stuck) row.setAttribute('data-stuck', 'true');
        else row.removeAttribute('data-stuck');
      },
      // The root's top edge is moved down to where the row sticks.
      { rootMargin: `-${top}px 0px 0px 0px`, threshold: 0 },
    );
    observer.observe(mark);
    return () => {
      observer.disconnect();
      row.removeAttribute('data-stuck');
    };
  }, []);

  return <div ref={sentinel} className="ingredient-search__mark" aria-hidden="true" />;
};

export default StuckMark;
