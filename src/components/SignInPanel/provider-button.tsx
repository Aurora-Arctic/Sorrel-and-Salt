'use client';

import type { ReactElement } from 'react';
import BusyButton from '../BusyButton';
import { useClickFeedback } from '../ClickFeedback';
import { ProviderUnavailableNote } from '../ProviderMark/unavailable-note';
import { PROVIDER_MARKS } from './icons';
import type { ProviderButtonProps } from './types';

// One provider's "Continue with X", with its own click feedback: a sign-in
// that fails before the redirect says so in a callout under the button that
// was pressed, with the focus kept on it (claude-docs/components/sign-in-panel.md).
const ProviderButton = ({
  provider,
  available,
  lastUsed,
  signingIn,
  onSignIn,
}: ProviderButtonProps): ReactElement => {
  const name = `Continue with ${provider.label}`;
  const { anchorRef, report, feedback } = useClickFeedback({ name });
  const busy = signingIn === provider.id;
  const noteId = `sign-in-panel__note-${provider.id}`;
  // The familiar per-provider "Continue with X" mark, matched to each provider's own brand
  // button rather than the app's icon set (claude-docs/components/sign-in-panel.md, "Provider
  // branding"). Facebook's white "f" sits on its blue chip on a button.
  const Mark = PROVIDER_MARKS[provider.id];

  const press = async (): Promise<void> => {
    // `aria-disabled` lets a press through, unavailable or busy: refused here.
    if (!available || signingIn) return;
    report(undefined);
    report(await onSignIn(provider.id));
  };

  return (
    <div className="sign-in-panel__provider">
      <BusyButton
        ref={anchorRef}
        busy={busy}
        busyLabel="Signing In"
        // The brand colour class is dropped entirely once unavailable, rather than layered
        // under a disabled modifier: `.btn[aria-disabled='true']` (_primitives.scss) styles
        // this state, and a brand-colour class alongside it would tie in specificity, the
        // winner then depending on which stylesheet loads second.
        className={
          available
            ? `btn sign-in-panel__button sign-in-panel__button--${provider.id}`
            : 'btn sign-in-panel__button'
        }
        // Not `disabled`, unavailable or pressed: that removes the button from
        // the tab order, and every provider must stay keyboard-reachable, and
        // would drop the focus a pressed one holds for a failure's callout.
        aria-disabled={!available || busy || undefined}
        aria-describedby={available ? undefined : noteId}
        // The others wait for the pressed one; `disabled`, since a page being
        // left has no use for their tab stops.
        disabled={signingIn !== null && !busy}
        onClick={() => void press()}
      >
        <Mark chip />
        {name}
        {lastUsed && (
          <>
            {' '}
            <span className="badge badge--last-used sign-in-panel__last-used">Last Used</span>
          </>
        )}
      </BusyButton>
      {feedback}
      {!available && <ProviderUnavailableNote id={noteId} />}
    </div>
  );
};

export default ProviderButton;
