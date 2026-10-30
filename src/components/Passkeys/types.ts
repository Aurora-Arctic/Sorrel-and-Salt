import type { AccountPasskey } from '../../lib/types';

export interface PasskeysProps {
  /** The signed-in user's passkeys, from `accountPasskeys()`. */
  passkeys: readonly AccountPasskey[];
}

export interface PasskeyRowProps {
  passkey: AccountPasskey;
  /** A removal is in flight somewhere in the list, so every Remove waits for it. */
  pending: boolean;
  /** This row's removal is in flight. */
  busy: boolean;
  /** Each answers the failure to say under its control, or nothing on success. */
  onRename: (name: string) => Promise<string | undefined>;
  onRemove: () => Promise<string | undefined>;
}

export interface RenameFieldsProps {
  /** The passkey's name now, or empty for one never named. */
  name: string;
  onRename: (name: string) => Promise<string | undefined>;
  close: () => void;
}
