'use client';

import type { ReactElement } from 'react';
import { ModalButton } from '../Modal';
import ConfirmedAction from '../UserList/confirmed-action';
import { RenameFields } from './rename-fields';
import { passkeyAdded, passkeyLabel } from './label';
import { GENERIC } from './refusal';
import type { PasskeyRowProps } from './types';

// A refused removal is a callout under Remove (claude-docs/components/passkeys.md).
export function PasskeyRow({ passkey, onRename, onRemove }: PasskeyRowProps): ReactElement {
  const label = passkeyLabel(passkey.name);

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
      <ConfirmedAction
        label="Remove"
        accessibleName={`Remove ${label}`}
        openClass="btn btn--quiet btn--small"
        title="Remove Passkey"
        question={
          <>
            Remove <strong>{label}</strong>? You will need another passkey or your password to sign
            in from that device.
          </>
        }
        busy="Removing"
        confirmClass="btn btn--destructive"
        send={onRemove}
        onSent={() => undefined}
        refusal={(error) => (error instanceof Error ? error.message : GENERIC)}
      />
    </li>
  );
}
