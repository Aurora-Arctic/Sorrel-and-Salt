import type { ReactElement } from 'react';
import { isRosterProvider, SOCIAL_PROVIDERS } from '../../lib/social-providers';
import ProviderMark from '../ProviderMark';
import { CheckIcon, CrossIcon } from './icons';
import type { MarkProps, ProviderLogoProps } from './types';
import './index.scss';

// The table's two drawn facts, shared with the user's modal (M9.19) so the
// two cannot drift. Their styles are the list's own, imported here so a
// caller outside the list draws them styled; Sass bundles the file once.

/** A provider by its roster label, or by its id when the roster has none. */
function providerLabel(id: string): string {
  return SOCIAL_PROVIDERS.find((provider) => provider.id === id)?.label ?? id;
}

/**
 * A linked provider as its logo on its brand's ground, on the owner's call,
 * named in a tip bubble on hover and in hidden text for a screen reader. A
 * provider with no logo, one since dropped from the roster, keeps its id as
 * text, so the account still says it is linked.
 */
export const ProviderLogo = ({ id }: ProviderLogoProps): ReactElement => {
  const label = providerLabel(id);
  if (!isRosterProvider(id)) return <span className="user-list__provider-text">{label}</span>;
  return (
    <span className="user-list__hint">
      <ProviderMark id={id} />
      <span className="visually-hidden">{label}</span>
      <span className="user-list__tip" aria-hidden="true">
        {label}
      </span>
    </span>
  );
};

/**
 * A yes-or-no as a mark, on the owner's call: a green check or a red cross,
 * its word in the page for a screen reader since the mark is drawn alone, and
 * where `hint` asks, in a tip bubble on hover too, since the column's heading
 * does not say it. The bubble is the eye's copy, hidden from the reader.
 */
export const Mark = ({ value, label, hint = false }: MarkProps): ReactElement => (
  <span
    className={[
      'user-list__mark',
      `user-list__mark--${value ? 'yes' : 'no'}`,
      hint && 'user-list__hint',
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {value ? <CheckIcon /> : <CrossIcon />}
    <span className="visually-hidden">{label}</span>
    {hint && (
      <span className="user-list__tip" aria-hidden="true">
        {label}
      </span>
    )}
  </span>
);
