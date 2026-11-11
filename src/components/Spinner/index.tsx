import type { ReactElement } from 'react';
import type { SpinnerProps } from './types';
import './index.scss';
import { cx } from '@/lib/class-names';

// Decorative: `aria-hidden`, as the holding control carries `aria-busy`. Shows only after `$loading-delay` (claude-docs/components/busy-button.md).
const Spinner = ({ className }: SpinnerProps): ReactElement => (
  <span className={cx('spinner', className)} aria-hidden="true" />
);

export default Spinner;
