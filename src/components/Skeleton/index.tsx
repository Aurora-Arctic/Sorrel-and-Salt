import type { ReactElement } from 'react';
import type { SkeletonProps } from './types';
import './index.scss';

// The one skeleton every region wait uses: a line of text or a control-sized block, repeated `count` times. The bars are
// `aria-hidden` and the `<output>` saying "Loading" is the one announcement. Phrasing elements only, and shown at once, never
// held by `$loading-delay` (claude-docs/components/skeleton.md).
const Skeleton = ({ shape, count = 1, quiet = false }: SkeletonProps): ReactElement => (
  <span className={`skeleton skeleton--${shape}`}>
    {!quiet && <output className="visually-hidden">Loading</output>}
    <span className="skeleton__shapes" aria-hidden="true">
      {Array.from({ length: count }, (_, at) => (
        <span key={at} className={shape === 'line' ? 'skeleton__line' : 'skeleton__box'} />
      ))}
    </span>
  </span>
);

export default Skeleton;
