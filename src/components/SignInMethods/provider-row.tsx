import { type ReactElement, useCallback, useRef, useState } from 'react';
import BusyButton from '../BusyButton';
import { useClickFeedback } from '../ClickFeedback';
import Modal from '../Modal';
import Notice from '../Notice';
import ProviderMark from '../ProviderMark';
import { ProviderUnavailableNote } from '../ProviderMark/unavailable-note';
import type { ProviderRowProps } from './types';

// One provider as linked (Remove, which asks first), addable (Add) or unavailable (greyed Add
// with a note), told apart by control and words, not hue. A press's failure is a callout under
// the control (claude-docs/components/sign-in-methods.md, "The rows").
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
  // The row's one control, Remove or Add: the focus comes back to it as the question closes,
  // to the Add that replaced a Remove once one is removed.
  const control = useRef<HTMLButtonElement | null>(null);
  const controlRef = useCallback(
    (node: HTMLButtonElement | null) => {
      control.current = node;
      anchorRef(node);
    },
    [anchorRef],
  );
  const [asking, setAsking] = useState(false);
  const run = async (action: () => Promise<string | undefined>): Promise<void> => {
    report(undefined);
    report(await action());
  };
  // The question stays open, its Remove busy, until the answer; a refusal is then said under the
  // row's Remove, as any other press's failure is.
  const remove = async (): Promise<void> => {
    const failure = await onRemove();
    setAsking(false);
    report(failure);
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
            ref={controlRef}
            className="btn btn--quiet btn--small"
            aria-label={`Remove ${provider.label}`}
            busy={busy}
            busyLabel="Removing"
            aria-disabled={busy || undefined}
            disabled={pending && !busy}
            onClick={
              busy
                ? undefined
                : () => {
                    report(undefined);
                    setAsking(true);
                  }
            }
          >
            Remove
          </BusyButton>
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
          ref={controlRef}
          // Small and quiet, as Remove is: a row's action, not a page's.
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
      {asking && (
        <Modal
          title="Remove Sign-In Method"
          onClose={() => setAsking(false)}
          returnTo={() => control.current}
        >
          {(close) => (
            <>
              <p>
                Remove <strong>{provider.label}</strong> from your sign-in methods? You can no
                longer sign in with it until you add it again.
              </p>
              <div className="modal__actions">
                <BusyButton
                  className="btn btn--destructive"
                  busy={busy}
                  busyLabel="Removing"
                  disabled={busy}
                  onClick={() => void remove()}
                >
                  Remove
                </BusyButton>
                <button type="button" className="btn btn--quiet" disabled={busy} onClick={close}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
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
