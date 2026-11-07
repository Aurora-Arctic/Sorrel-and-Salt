import type { ReactElement } from 'react';
import { UNAVAILABLE_NOTE } from '../../lib/social-providers';
import type { ProviderUnavailableNoteProps } from './types';

// Stays in the tab order with `aria-disabled`, so the note is its accessible description (claude-docs/components/provider-mark.md, "The unavailable note").
export function ProviderUnavailableNote({
  id,
  className,
}: ProviderUnavailableNoteProps): ReactElement {
  return (
    <p id={id} className={className ? `meta ${className}` : 'meta'}>
      {UNAVAILABLE_NOTE}
    </p>
  );
}
