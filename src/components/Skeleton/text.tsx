import type { ReactElement, ReactNode } from 'react';
import './index.scss';

// Real words drawn as a skeleton: the text keeps its own size and wrapping but is transparent, and an
// inline fill behind it paints each wrapped line as its own bar as wide as that line. For a skeleton
// whose text is known and only its box matters; the page it stands for carries the readable copy.
const SkeletonText = ({ children }: { children: ReactNode }): ReactElement => (
  <span className="skeleton-run">{children}</span>
);

export default SkeletonText;
