import { type ReactElement, useRef } from 'react';
import BusyButton from '../BusyButton';
import { useClickFeedback } from '../ClickFeedback';
import ConfirmedAction from '../ConfirmedAction';
import Notice from '../Notice';
import ProviderMark from '../ProviderMark';
import { ProviderUnavailableNote } from '../ProviderMark/unavailable-note';
import { GENERIC_FAILURE } from '../../lib/graphql-failure';
import type { ProviderRowProps } from './types';

// One provider as linked (Remove, which asks first), addable (Add) or unavailable (greyed Add
// with a note), told apart by control and words, not hue. A press's failure is a callout under
// the control (claude-docs/components/sign-in-methods.md, "Contracts").
export function ProviderRow({
  provider,
  state,
  removal,
  pending,
  busy,
  error,
  onAdd,
  onRemove,
}: ProviderRowProps): ReactElement {
  const noteId = `sign-in-methods__note-${provider.id}`;
  const reasonId = `sign-in-methods__reason-${provider.id}`;
  const unavailable = state === 'unavailable';
  // Named as the control is, so the badge reads "Show the error for Add Discord".
  // The row's one control: once Remove has gone, the focus comes back to the Add that replaced it.
  const control = useRef<HTMLButtonElement | null>(null);
  const { anchorRef, report, feedback } = useClickFeedback({
    name: `Add ${provider.label}`,
    ref: control,
  });
  const run = async (action: () => Promise<string | undefined>): Promise<void> => {
    report(undefined);
    report(await action());
  };
  return (
    <li
      className={
        unavailable
          ? 'sign-in-methods__item sign-in-methods__item--unavailable'
          : 'sign-in-methods__item'
      }
    >
      <ProviderMark id={provider.id} />
      <span className="sign-in-methods__label">{provider.label}</span>
      {state === 'linked' ? (
        // Better Auth refuses the last one, and any from a stale session; this only keeps the
        // offer honest.
        removal === 'offered' ? (
          // A refusal is a callout under Remove; the others are disabled while one answers.
          <ConfirmedAction
            label="Remove"
            accessibleName={`Remove ${provider.label}`}
            openClass="btn btn--quiet btn--small"
            disabled={pending}
            returnTo={() => control.current}
            title="Remove Sign-In Method"
            question={
              <>
                Remove <strong>{provider.label}</strong> from your sign-in methods? You can no
                longer sign in with it until you add it again.
              </>
            }
            busy="Removing"
            confirmClass="btn btn--destructive"
            send={async () => {
              const failure = await onRemove();
              if (failure) throw new Error(failure);
            }}
            onSent={() => undefined}
            refusal={(error) => (error instanceof Error ? error.message : GENERIC_FAILURE)}
          />
        ) : removal === 'last' ? (
          // Greyed rather than gone, as an unavailable Add is: the reason beneath it then
          // sits under the control it explains, and a screen reader hears it as the
          // button's description.
          <button
            type="button"
            className="btn btn--quiet btn--small"
            aria-label={`Remove ${provider.label}`}
            aria-disabled="true"
            aria-describedby={reasonId}
          >
            Remove
          </button>
        ) : null
      ) : (
        <BusyButton
          ref={anchorRef}
          // Small and quiet, as Remove is: a row's action, not a page's.
          className="btn btn--quiet btn--small"
          aria-label={`Add ${provider.label}`}
          // Not `disabled`, as on /sign-in: it stays in the tab order.
          aria-disabled={unavailable || undefined}
          aria-describedby={unavailable ? noteId : undefined}
          busy={busy}
          busyLabel="Adding"
          onClick={busy ? undefined : () => void run(onAdd)}
        >
          Add
        </BusyButton>
      )}
      {feedback}
      {unavailable && <ProviderUnavailableNote id={noteId} className="sign-in-methods__line" />}
      {state === 'linked' && removal === 'last' && (
        <p id={reasonId} className="meta sign-in-methods__line">
          Your only sign-in method
        </p>
      )}
      {error && (
        <Notice kind="error" className="sign-in-methods__error">
          {error}
        </Notice>
      )}
    </li>
  );
}
