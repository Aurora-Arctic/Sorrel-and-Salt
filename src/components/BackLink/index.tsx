import type { Route } from 'next';
import type { ReactElement } from 'react';
import { cx } from '@/lib/class-names';
import { PendingLink } from '../../lib/navigation';
import { BackChevron } from './chevron';
import type { BackToProps } from './types';

/** The "Back to …" link, chevron and look, with no history reading: `IngredientEntry/back-link.tsx` adds that, and a server page draws this as it is. */
export function BackTo({ href, label, className, onClick, children }: BackToProps): ReactElement {
  return (
    <PendingLink className={cx('back-link', className)} href={href as Route} onClick={onClick}>
      <BackChevron />
      Back to {label}
      {children && <> {children}</>}
    </PendingLink>
  );
}
