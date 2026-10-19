import type { ReactElement } from 'react';
import BusyButton from '../BusyButton';
import Notice from '../Notice';
import ProviderMark from '../ProviderMark';
import { ProviderUnavailableNote } from '../ProviderMark/unavailable-note';
import type { ProviderRowProps } from './types';

// One provider in the account's list of sign-in methods, in one of three
// states, each told apart by its control and its words rather than by hue:
// linked has Remove (greyed for the only method left, with a line saying why;
// or, from a stale session, nothing, since the list says why once),
// addable has Add, and unavailable has a greyed Add with the note saying why. A failure about this provider sits in its row, beneath the
// controls. claude-docs/components/sign-in-methods.md, "The rows".
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
          <BusyButton
            className="btn btn--destructive btn--small"
            aria-label={`Remove ${provider.label}`}
            busy={busy}
            busyLabel="Removing"
            disabled={pending}
            onClick={onRemove}
          >
            Remove
          </BusyButton>
        ) : removal === 'last' ? (
          // Greyed rather than gone, as an unavailable Add is: the reason
          // beneath it then sits under the control it explains (the owner,
          // 2026-10-11), and a screen reader hears it as the button's description.
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
          // Small and quiet, as Remove is small and in the wax: a row's action,
          // not a page's (the owner, 2026-10-11).
          className="btn btn--quiet btn--small"
          aria-label={`Add ${provider.label}`}
          // Not `disabled`, as on /sign-in: it stays in the tab order.
          aria-disabled={unavailable || undefined}
          aria-describedby={unavailable ? noteId : undefined}
          busy={busy}
          busyLabel="Adding"
          // Once pressed, the button waits out the hop and a second press does nothing.
          onClick={busy ? undefined : onAdd}
        >
          Add
        </BusyButton>
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
