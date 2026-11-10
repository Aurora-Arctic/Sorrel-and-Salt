import { type ReactElement, useId } from 'react';
import type { ErrorDetailsProps } from './types';

// Read-only, so a group with a label rather than a disabled box: the sender cannot change what is sent.
export function ErrorDetails({ detail }: ErrorDetailsProps): ReactElement {
  const id = useId();
  return (
    <div className="field" role="group" aria-labelledby={id}>
      <span className="field__label" id={id}>
        Error Details
      </span>
      <p className="field__hint">
        <code>{detail}</code>
      </p>
    </div>
  );
}
