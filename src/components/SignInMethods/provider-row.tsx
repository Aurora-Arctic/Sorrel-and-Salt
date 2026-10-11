import type { ReactElement } from 'react';
import Notice from '../Notice';
import ProviderMark from '../ProviderMark';
import { ProviderUnavailableNote } from '../ProviderMark/unavailable-note';
import type { ProviderRowProps } from './types';

// One provider in the account's list of sign-in methods, in one of three
// states, each told apart by its control and its words rather than by hue:
// linked has Remove (or, the only method left, a line saying why it has
// none), addable has Add, and unavailable has a greyed Add with the note
// saying why. A failure about this provider sits in its row, beneath the
// controls. claude-docs/components/sign-in-methods.md, "The rows".
export function ProviderRow({
  provider,
  state,
  removable,
  pending,
  error,
  onAdd,
  onRemove,
}: ProviderRowProps): ReactElement {
  const noteId = `sign-in-methods__note-${provider.id}`;
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
        // Better Auth refuses the last one too; this only keeps the offer
        // honest, and the line says why there is nothing to press.
        removable ? (
          <button type="button" className="btn" disabled={pending} onClick={onRemove}>
            Remove {provider.label}
          </button>
        ) : (
          <p className="meta sign-in-methods__line">Your only sign-in method</p>
        )
      ) : (
        <button
          type="button"
          className="btn"
          // Not `disabled`, as on /sign-in: it stays in the tab order.
          aria-disabled={unavailable || undefined}
          aria-describedby={unavailable ? noteId : undefined}
          onClick={onAdd}
        >
          Add {provider.label}
        </button>
      )}
      {unavailable && <ProviderUnavailableNote id={noteId} className="sign-in-methods__line" />}
      {error && (
        <Notice kind="error" className="sign-in-methods__error">
          {error}
        </Notice>
      )}
    </li>
  );
}
