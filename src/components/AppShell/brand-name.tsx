import type { ReactElement } from 'react';

const BRAND = 'Sorrel & Salt';

// The site name in the bar, as both frames (AppShell, PublicFrame) draw it: the full name, and
// the initials that stand in at a narrow phone's width (the stylesheet swaps them, _frame-bar.scss).
// `block` is the frame's class, which the stylesheet's `__brand-full` and `__brand-short` hang from.
export default function BrandName({
  block,
}: {
  block: 'app-shell' | 'public-frame';
}): ReactElement {
  return (
    <>
      <span className={`${block}__brand-full`}>{BRAND}</span>
      {/* The initials stand in at a phone's width; the full name above stays
          for a screen reader, which is why this one is hidden from it. */}
      <span className={`${block}__brand-short`} aria-hidden="true">
        S&amp;S
      </span>
    </>
  );
}
