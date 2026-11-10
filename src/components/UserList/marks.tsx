import type { ReactElement } from 'react';
import { isRosterProvider, SOCIAL_PROVIDERS } from '../../lib/social-providers';
import ProviderMark from '../ProviderMark';
import Hint from './hint';
import { CheckIcon, CrossIcon } from '../IconTip/icons';
import { EmailPasswordIcon, PasskeyIcon } from './icons';
import type { MarkProps, OwnLoginMarkProps, ProviderLogoProps, SignInMarksProps } from './types';
import './index.scss';

// The table's two drawn facts, shared with the user's modal so the
// two cannot drift. Their styles are the list's own, imported here so a
// caller outside the list draws them styled; Sass bundles the file once.

function providerLabel(id: string): string {
  return SOCIAL_PROVIDERS.find((provider) => provider.id === id)?.label ?? id;
}

export const ProviderLogo = ({ id }: ProviderLogoProps): ReactElement => {
  const label = providerLabel(id);
  if (!isRosterProvider(id)) return <span>{label}</span>;
  return (
    <Hint className="user-list__hint" label={label}>
      <ProviderMark id={id} />
      <span className="visually-hidden">{label}</span>
    </Hint>
  );
};

// Better Auth's provider id for an email & password account.
const CREDENTIAL = 'credential';

const OwnLoginMark = ({ label, icon }: OwnLoginMarkProps): ReactElement => (
  <Hint className="user-list__hint" label={label}>
    <span className="provider-mark provider-mark--own" aria-hidden="true">
      {icon}
    </span>
    <span className="visually-hidden">{label}</span>
  </Hint>
);

/** Whether a user has any way in to draw; the modal says None when not. */
export function hasSignInMarks({ providers, hasPasskey }: SignInMarksProps): boolean {
  return hasPasskey || providers.length > 0;
}

/** A user's ways in: each linked social provider's mark, then email & password, then a passkey. */
export const SignInMarks = ({ providers, hasPasskey }: SignInMarksProps): ReactElement => (
  <>
    {providers
      .filter((id) => id !== CREDENTIAL)
      .map((id) => (
        <ProviderLogo key={id} id={id} />
      ))}
    {providers.includes(CREDENTIAL) && (
      <OwnLoginMark label="Email & Password" icon={<EmailPasswordIcon />} />
    )}
    {hasPasskey && <OwnLoginMark label="Passkey" icon={<PasskeyIcon />} />}
  </>
);

/**
 * A yes-or-no as a green check or a red cross, its word in the page for a screen reader since the mark is drawn alone.
 * The tip bubble is the eye's copy, hidden from the reader.
 */
export const Mark = ({ value, label, hint = false, tip }: MarkProps): ReactElement => {
  const icon = value ? <CheckIcon /> : <CrossIcon />;
  const bubble = tip ?? (hint ? label : undefined);
  const className = ['user-list__mark', `user-list__mark--${value ? 'yes' : 'no'}`]
    .concat(bubble ? ['user-list__hint'] : [])
    .join(' ');
  const body = (
    <>
      {icon}
      <span className="visually-hidden">{label}</span>
    </>
  );
  return bubble ? (
    <Hint className={className} label={bubble}>
      {body}
    </Hint>
  ) : (
    <span className={className}>{body}</span>
  );
};
