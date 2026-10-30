'use client';

import type { ReactElement } from 'react';
import BusyButton from '../BusyButton';
import { useClickFeedback } from '../ClickFeedback';
import { ModalButton } from '../Modal';
import { RenameFields } from './rename-fields';
import { passkeyAdded, passkeyLabel } from './label';
import type { PasskeyRowProps } from './types';

// One passkey: its name and the day it was added, then Rename (a dialog) and Remove. A refused removal is a callout
// under Remove, as a sign-in method's is (claude-docs/components/passkeys.md).
export function PasskeyRow({
  passkey,
  pending,
  busy,
  onRename,
  onRemove,
}: PasskeyRowProps): ReactElement {
  const label = passkeyLabel(passkey.name);
  const { anchorRef, report, feedback } = useClickFeedback({ name: `Remove ${label}` });
  const remove = async (): Promise<void> => {
    report(undefined);
    report(await onRemove());
  };

  return (
    <li className="passkeys__item">
      <span className="passkeys__label">{label}</span>
      <span className="meta passkeys__added">Added {passkeyAdded(passkey.createdAt)}</span>
      <ModalButton
        label="Rename"
        className="btn btn--quiet btn--small"
        ariaLabel={`Rename ${label}`}
        title="Rename Passkey"
      >
        {(close) => <RenameFields name={passkey.name ?? ''} onRename={onRename} close={close} />}
      </ModalButton>
      {/* The pressed one is `aria-disabled` and keeps the focus; the others wait for it, disabled. */}
      <BusyButton
        ref={anchorRef}
        className="btn btn--destructive btn--small"
        aria-label={`Remove ${label}`}
        busy={busy}
        busyLabel="Removing"
        aria-disabled={busy || undefined}
        disabled={pending && !busy}
        onClick={busy ? undefined : () => void remove()}
      >
        Remove
      </BusyButton>
      {feedback}
    </li>
  );
}
