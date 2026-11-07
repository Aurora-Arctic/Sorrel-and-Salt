import type { ReactElement } from 'react';

const BRAND = 'Sorrel & Salt';

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
