import type { ReactElement } from 'react';
import type { SpinnerProps } from './types';
import './index.scss';

// The one spinner every wait on the site uses: a ring the size of the text, open on one side,
// turning. Decorative: `aria-hidden`, because the control that holds it carries `aria-busy`
// and the label saying what is happening. It shows only after `$loading-delay`, by the
// stylesheet, so a quick answer never flashes it. claude-docs/components/spinner.md
const Spinner = ({ className }: SpinnerProps): ReactElement => (
  <span className={className ? `spinner ${className}` : 'spinner'} aria-hidden="true" />
);

export default Spinner;
