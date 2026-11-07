import type { ReactElement } from 'react';
import type { SpinnerProps } from './types';
import './index.scss';

// The one spinner every wait uses. Decorative: `aria-hidden`, since the control holding it carries `aria-busy` and
// the label. It shows only after `$loading-delay`, so a quick answer never flashes it (claude-docs/components/spinner.md).
const Spinner = ({ className }: SpinnerProps): ReactElement => (
  <span className={className ? `spinner ${className}` : 'spinner'} aria-hidden="true" />
);

export default Spinner;
