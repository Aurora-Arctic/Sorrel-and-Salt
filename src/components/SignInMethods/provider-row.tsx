import type { ReactElement } from 'react';
import BusyButton from '../BusyButton';
import { useClickFeedback } from '../ClickFeedback';
import Notice from '../Notice';
import ProviderMark from '../ProviderMark';
import { ProviderUnavailableNote } from '../ProviderMark/unavailable-note';
import type { ProviderRowProps } from './types';

// One provider in the account's sign-in methods, in one of three states told apart by control and
// words, not hue: linked (Remove, greyed with a reason for the only method left), addable (Add),
// unavailable (greyed Add with a note). A press's failure is a callout under the control; a failed
// link's callback error sits beneath the controls as a `Notice`.
// claude-docs/components/sign-in-methods.md, "The rows".
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
  // Named as the control is, so the badge reads "Show the error for Remove Discord".
  const { anchorRef, report, feedback } = useClickFeedback({
    name: `${state === 'linked' ? 'Remove' : 'Add'} ${provider.label}`,
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
        // Better Auth refuses the last one, and any from a stale session, too;
        // this only keeps the offer honest. The last says why in its row; a
        // withheld one is explained once, above the list.
        removal === 'offered' ? (
          // The name stays "Remove Discord" while busy: the aria-label holds it.
          // The pressed one is `aria-disabled` and keeps the focus, refusing a
          // second press itself; the others are disabled until it answers.
          <BusyButton
            ref={anchorRef}
            className="btn btn--destructive btn--small"
            aria-label={`Remove ${provider.label}`}
            busy={busy}
            busyLabel="Removing"
            aria-disabled={busy || undefined}
            disabled={pending && !busy}
            onClick={busy ? undefined : () => void run(onRemove)}
          >
            Remove
          </BusyButton>
        ) : removal === 'last' ? (
          // Greyed rather than gone, as an unavailable Add is: the reason beneath it then
          // sits under the control it explains, and a screen reader hears it as the
          // button's description.
          <button
            type="button"
            className="btn btn--destructive btn--small"
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
          // Small and quiet, as Remove is small and in the wax: a row's action, not a
          // page's.
          className="btn btn--quiet btn--small"
          aria-label={`Add ${provider.label}`}
          // Not `disabled`, as on /sign-in: it stays in the tab order.
          aria-disabled={unavailable || undefined}
          aria-describedby={unavailable ? noteId : undefined}
          busy={busy}
          busyLabel="Adding"
          // Once pressed, the button waits out the hop and a second press does nothing.
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
