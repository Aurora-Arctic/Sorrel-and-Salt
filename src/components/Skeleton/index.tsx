import type { ReactElement } from 'react';
import type { SkeletonProps } from './types';
import './index.scss';

// The one skeleton every region wait uses: a line of text or a control-sized block, each repeated
// `count` times. The bars are `aria-hidden`; the `<output>` saying "Loading" is the only
// announcement. Shown at once, never held by `$loading-delay` (claude-docs/components/skeleton.md).
const Skeleton = ({ shape, count = 1, quiet = false }: SkeletonProps): ReactElement => (
  <div className={`skeleton skeleton--${shape}`}>
    {!quiet && <output className="visually-hidden">Loading</output>}
    <div className="skeleton__shapes" aria-hidden="true">
      {Array.from({ length: count }, (_, at) => (
        <span key={at} className={shape === 'line' ? 'skeleton__line' : 'skeleton__box'} />
      ))}
    </div>
  </div>
);

export default Skeleton;
