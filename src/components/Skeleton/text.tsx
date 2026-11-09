import type { ReactElement, ReactNode } from 'react';
import './index.scss';

// Real words drawn as a skeleton: the text keeps its own size and wrapping but is transparent, and an
// inline fill behind it paints each wrapped line as its own bar as wide as that line. For a skeleton
// whose text is known and only its box matters; the page it stands for carries the readable copy.
const SkeletonText = ({ children }: { children: ReactNode }): ReactElement => (
  <span className="skeleton-run">{children}</span>
);

const FILLER = 'Sorrel and salt gathered at dusk for a quiet working beneath the waning moon'.split(
  ' ',
);

/**
 * Text still to come, as `count` stand-in words drawn as bars: they take the type and the wrapping of the element they
 * sit in, so a title or a paragraph holds about its own height. Hidden from assistive technology, being no one's words.
 */
export const SkeletonWords = ({ count }: { count: number }): ReactElement => (
  <span aria-hidden="true">
    <SkeletonText>
      {Array.from({ length: count }, (_, at) => FILLER[at % FILLER.length]).join(' ')}
    </SkeletonText>
  </span>
);

export default SkeletonText;
