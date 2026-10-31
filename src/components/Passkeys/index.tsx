'use client';

import { useRouter } from 'next/navigation';
import { type ReactElement, useState } from 'react';
import { passkey as passkeyActions } from '../../lib/auth-client';
import type { AccountPasskey } from '../../lib/types';
import BusyButton from '../BusyButton';
import { useClickFeedback } from '../ClickFeedback';
import { useAnnounce } from '../ClickFeedback/status-region';
import { passkeyLabel } from './label';
import { PasskeyRow } from './passkey-row';
import { GENERIC, LAST_WAY_IN, refusal } from './refusal';
import type { PasskeysProps } from './types';
import './index.scss';

// The account page's list of this account's passkeys, each renamable and removable, and Add a Passkey beneath.
// Every call is the passkey plugin's own route; the heading and intro are the page's
// (claude-docs/components/passkeys.md).

const ADD = 'Add a Passkey';
export const ADD_FAILED = 'No passkey was added. Try again, or add one from another device.';
export { LAST_WAY_IN };

/** The plugin's rows as the list holds them. */
const listed = (rows: readonly { id: string; name?: string | null; createdAt: Date | string }[]) =>
  rows.map(({ id, name, createdAt }): AccountPasskey => ({
    id,
    name: name ?? null,
    createdAt: new Date(createdAt).toISOString(),
  }));

const Passkeys = ({ passkeys }: PasskeysProps): ReactElement => {
  // Seeded from the server's list; each change answers in place, then refreshes the page's server-rendered sections.
  const [rows, setRows] = useState(passkeys);
  const [adding, setAdding] = useState(false);
  const router = useRouter();
  const announce = useAnnounce();
  const add = useClickFeedback({ name: ADD });

  const handleAdd = async (): Promise<void> => {
    if (adding) return;
    add.report(undefined);
    setAdding(true);
    // A cancelled prompt answers `error`; a dropped connection throws. Both say so.
    const result = await passkeyActions
      .addPasskey()
      .catch((thrown: unknown) => ({ error: thrown }));
    const fresh = result?.error
      ? undefined
      : await passkeyActions.listUserPasskeys().catch(() => undefined);
    setAdding(false);
    if (!fresh?.data) {
      add.report(result?.error ? ADD_FAILED : GENERIC);
      return;
    }
    setRows(listed(fresh.data));
    router.refresh();
    announce('A passkey was added to your account.');
  };

  const handleRename = async (target: AccountPasskey, name: string) => {
    const result = await passkeyActions
      .updatePasskey({ id: target.id, name })
      .catch(() => ({ error: { code: undefined } }));
    if (result?.error) return refusal(result.error.code);
    setRows((current) => current.map((row) => (row.id === target.id ? { ...row, name } : row)));
    router.refresh();
    announce(`${passkeyLabel(target.name)} was renamed ${name}.`);
    return undefined;
  };

  // A refusal rejects with its sentence, which the row's confirm shows under Remove.
  const handleRemove = async (target: AccountPasskey): Promise<void> => {
    const result = await passkeyActions
      .deletePasskey({ id: target.id })
      .catch(() => ({ error: { code: undefined } }));
    if (result?.error) throw new Error(refusal(result.error.code));
    setRows((current) => current.filter((row) => row.id !== target.id));
    router.refresh();
    announce(`${passkeyLabel(target.name)} was removed from your passkeys.`);
  };

  return (
    <div className="passkeys">
      {rows.length === 0 ? (
        <p className="meta">No passkeys yet.</p>
      ) : (
        <ul className="passkeys__list" aria-label="Passkeys">
          {rows.map((row) => (
            <PasskeyRow
              key={row.id}
              passkey={row}
              onRename={(name) => handleRename(row, name)}
              onRemove={() => handleRemove(row)}
            />
          ))}
        </ul>
      )}
      <div className="passkeys__add">
        {/* Not `disabled` while busy, which would drop the focus a failure's callout is placed against. */}
        <BusyButton
          ref={add.anchorRef}
          className="btn"
          busy={adding}
          busyLabel="Adding"
          aria-disabled={adding || undefined}
          onClick={() => void handleAdd()}
        >
          {ADD}
        </BusyButton>
        {/* oxlint-disable-next-line react/refs -- the callback ref and handlers come from a hook and are only handed to the DOM, never read while rendering */}
        {add.feedback}
      </div>
    </div>
  );
};

export default Passkeys;
