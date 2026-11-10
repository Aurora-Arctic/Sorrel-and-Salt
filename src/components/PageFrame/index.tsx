import type { ReactElement } from 'react';
import type { PageFrameProps } from './types';
import { cx } from '@/lib/class-names';

// The standard page frame, and its narrow variant for the forms. A page and its skeleton draw the
// same one, so the skeleton's head and body land where the page's do.
const PageFrame = ({
  as: Tag = 'main',
  narrow,
  className,
  children,
}: PageFrameProps): ReactElement => (
  <Tag className={cx('page-frame', narrow && 'page-frame--narrow', className)}>{children}</Tag>
);

export default PageFrame;
