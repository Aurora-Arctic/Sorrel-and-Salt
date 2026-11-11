import type { ReactElement } from 'react';
import type { PageColumnProps } from './types';
import { cx } from '@/lib/class-names';

// The wide page column the lists and the entry pages stand in. A page and its skeleton draw the same
// one, so the skeleton's head and body land where the page's do.
const PageColumn = ({ as: Tag = 'main', className, children }: PageColumnProps): ReactElement => (
  <Tag className={cx('page-column', className)}>{children}</Tag>
);

export default PageColumn;
