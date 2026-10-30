import type { ReactElement } from 'react';
import { PROVIDER_MARKS } from '../SignInPanel/icons';
import type { ProviderMarkProps } from './types';

// A provider's mark on the small circle of its brand's ground (`.provider-mark`). Hidden from
// assistive technology, since the caller always prints the provider's name
// (claude-docs/components/provider-mark.md).

const ProviderMark = ({ id, chip }: ProviderMarkProps): ReactElement => {
  const Mark = PROVIDER_MARKS[id];
  return (
    <span className={`provider-mark provider-mark--${id}`} aria-hidden="true">
      <Mark chip={chip} />
    </span>
  );
};

export default ProviderMark;
